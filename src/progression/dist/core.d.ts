/**
 * Core progression API
 */
import type { XPEvent, XPRule, XPRuleSet, PlayerState, Snapshot } from './types.js';
/**
 * Check if currently in guest mode (no XP persistence)
 */
export declare function isGuestMode(): boolean;
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
 * Get current player state (aggregate across all players)
 */
export declare function getCurrentState(): Promise<PlayerState>;
/**
 * Get player-specific progression state
 * @param playerId - Player ID
 * @param currentSeasonId - Optional current season ID for seasonal XP
 */
export declare function getPlayerState(playerId: string, currentSeasonId?: number): Promise<PlayerState>;
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
export { computeLevel } from './reducer.js';
export * from './utils/player.js';
