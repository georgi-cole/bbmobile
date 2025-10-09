/**
 * Core progression API
 */
import { DEFAULT_RULES, DEFAULT_LEVEL_THRESHOLDS } from './constants.js';
import { reduceEvents, computeBreakdown } from './reducer.js';
import * as db from './db.js';
/**
 * Generate a unique ID
 */
function generateId() {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}
/**
 * Initialize the progression system
 */
export async function initialize() {
    await db.openDB();
    // Check if we have a default rule set
    const ruleSets = await db.getAllRuleSets();
    if (ruleSets.length === 0) {
        const defaultRuleSet = {
            id: 'default',
            version: 1,
            rules: DEFAULT_RULES,
            createdAt: Date.now()
        };
        await db.saveRuleSet(defaultRuleSet);
    }
}
/**
 * Record an XP event
 */
export async function recordEvent(ruleId, amount, meta) {
    const event = {
        id: generateId(),
        timestamp: Date.now(),
        ruleId,
        amount,
        week: meta?.week,
        season: meta?.season,
        meta
    };
    await db.saveEvent(event);
    // Create snapshot
    const state = await getCurrentState();
    const snapshot = {
        id: generateId(),
        timestamp: event.timestamp,
        eventId: event.id,
        state
    };
    await db.saveSnapshot(snapshot);
    return event;
}
/**
 * Get current player state
 */
export async function getCurrentState() {
    const events = await db.getAllEvents();
    const ruleSets = await db.getAllRuleSets();
    const rules = ruleSets[0]?.rules || DEFAULT_RULES;
    return reduceEvents(events, rules, {
        clampMinXP: 0,
        levelThresholds: DEFAULT_LEVEL_THRESHOLDS
    });
}
/**
 * Get XP breakdown by rule
 */
export async function getBreakdown() {
    const events = await db.getAllEvents();
    const ruleSets = await db.getAllRuleSets();
    const rules = ruleSets[0]?.rules || DEFAULT_RULES;
    return computeBreakdown(events, rules);
}
/**
 * Get all events
 */
export async function getEvents() {
    return db.getAllEvents();
}
/**
 * Get all snapshots
 */
export async function getSnapshots() {
    return db.getAllSnapshots();
}
/**
 * Update rule set (for testing/customization)
 */
export async function updateRuleSet(rules) {
    const ruleSets = await db.getAllRuleSets();
    const currentVersion = ruleSets[0]?.version || 0;
    const newRuleSet = {
        id: generateId(),
        version: currentVersion + 1,
        rules,
        createdAt: Date.now()
    };
    await db.saveRuleSet(newRuleSet);
}
/**
 * Get current rule set
 */
export async function getCurrentRuleSet() {
    const ruleSets = await db.getAllRuleSets();
    if (!ruleSets || ruleSets.length === 0)
        return null;
    return ruleSets.reduce((max, curr) => (curr.version > max.version ? curr : max), ruleSets[0]);
}
/**
 * Reset all data
 */
export async function reset() {
    await db.clearAllData();
    await initialize();
}
/**
 * Close database connection
 */
export function close() {
    db.closeDB();
}
// Export types and constants for convenience
export * from './types.js';
export * from './constants.js';
// Internal reducer functions are not exported to preserve encapsulation.
