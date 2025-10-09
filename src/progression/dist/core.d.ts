/**
 * Core progression API
 */
import type { XPEvent, XPRule, XPRuleSet, PlayerState, Snapshot } from './types.js';
/**
 * Initialize the progression system
 */
export declare function initialize(): Promise<void>;
/**
 * Record an XP event
 */
export declare function recordEvent(ruleId: string, amount: number, meta?: {
    week?: number;
    season?: number;
    [key: string]: unknown;
}): Promise<XPEvent>;
/**
 * Get current player state
 */
export declare function getCurrentState(): Promise<PlayerState>;
/**
 * Get XP breakdown by rule
 */
export declare function getBreakdown(): Promise<Map<string, {
    count: number;
    totalXP: number;
    ruleName: string;
}>>;
/**
 * Get all events
 */
export declare function getEvents(): Promise<XPEvent[]>;
/**
 * Get all snapshots
 */
export declare function getSnapshots(): Promise<Snapshot[]>;
/**
 * Update rule set (for testing/customization)
 */
export declare function updateRuleSet(rules: XPRule[]): Promise<void>;
/**
 * Get current rule set
 */
export declare function getCurrentRuleSet(): Promise<XPRuleSet | null>;
/**
 * Reset all data
 */
export declare function reset(): Promise<void>;
/**
 * Close database connection
 */
export declare function close(): void;
export * from './types.js';
export * from './constants.js';
export { reduceEvents, computeBreakdown } from './reducer.js';
