/**
 * Player-specific progression utilities
 * Provides helpers for computing per-player XP (seasonal vs aggregate)
 */
import type { XPEvent, XPRule, PlayerState } from '../types.js';
/**
 * Filter events for a specific player
 */
export declare function filterEventsByPlayer(events: XPEvent[], playerId: string): XPEvent[];
/**
 * Filter events for a specific season
 */
export declare function filterEventsBySeason(events: XPEvent[], seasonId: number): XPEvent[];
/**
 * Compute XP total from events (with cap enforcement)
 */
export declare function computeXPFromEvents(events: XPEvent[], rules: XPRule[]): number;
/**
 * Compute player progression state
 * @param aggregateXP - Total XP across all seasons (determines level)
 * @param seasonXP - XP for current season only (for ranking)
 * @param eventsCount - Total number of events
 */
export declare function computePlayerState(aggregateXP: number, seasonXP: number, eventsCount: number): PlayerState;
/**
 * Compute both seasonal and aggregate XP for a player
 */
export declare function computePlayerXP(allEvents: XPEvent[], playerId: string, currentSeasonId: number | undefined, rules: XPRule[]): {
    aggregateXP: number;
    seasonXP: number;
    eventsCount: number;
};
