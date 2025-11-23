/**
 * Reducer: compute player state from events with caps enforcement
 */
import type { XPEvent, XPRule, PlayerState, LevelThreshold, ReducerOptions } from './types.js';
/**
 * Compute player state from a list of events
 */
export declare function reduceEvents(events: XPEvent[], rules: XPRule[], options?: ReducerOptions): PlayerState;
/**
 * Compute level from total XP
 */
export declare function computeLevel(totalXP: number, thresholds: LevelThreshold[]): {
    level: number;
    nextLevelXP: number;
    currentLevelXP: number;
};
/**
 * Compute breakdown by rule
 */
export declare function computeBreakdown(events: XPEvent[], rules: XPRule[]): Map<string, {
    count: number;
    totalXP: number;
    ruleName: string;
}>;
