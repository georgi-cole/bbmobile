/**
 * Reducer: compute player state from events with caps enforcement
 */
import type { XPEvent, XPRule, PlayerState, ReducerOptions } from './types.js';
/**
 * Compute player state from a list of events
 */
export declare function reduceEvents(events: XPEvent[], rules: XPRule[], options?: ReducerOptions): PlayerState;
/**
 * Compute breakdown by rule
 */
export declare function computeBreakdown(events: XPEvent[], rules: XPRule[]): Map<string, {
    count: number;
    totalXP: number;
    ruleName: string;
}>;
