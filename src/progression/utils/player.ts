/**
 * Player-specific progression utilities
 * Provides helpers for computing per-player XP (seasonal vs aggregate)
 */

import type { XPEvent, XPRule, PlayerState } from '../types.js';
import { DEFAULT_LEVEL_THRESHOLDS } from '../constants.js';
import { computeLevel } from '../reducer.js';

/**
 * Filter events for a specific player
 */
export function filterEventsByPlayer(events: XPEvent[], playerId: string): XPEvent[] {
  return events.filter(e => e.meta?.playerId === playerId);
}

/**
 * Filter events for a specific season
 */
export function filterEventsBySeason(events: XPEvent[], seasonId: number): XPEvent[] {
  return events.filter(e => e.season === seasonId);
}

/**
 * Compute XP total from events (with cap enforcement)
 */
export function computeXPFromEvents(
  events: XPEvent[],
  rules: XPRule[]
): number {
  const ruleMap = new Map(rules.map(r => [r.id, r]));
  
  // Track caps
  const weekCounts = new Map<string, number>();
  const seasonCounts = new Map<string, number>();
  
  let totalXP = 0;
  
  for (const event of events) {
    const rule = ruleMap.get(event.ruleId);
    if (!rule) continue;
    
    let canApply = true;
    
    // Check per-week cap
    if (rule.perWeek !== undefined && event.week !== undefined) {
      const weekKey = `${event.ruleId}:${event.week}`;
      const weekCount = weekCounts.get(weekKey) || 0;
      if (weekCount >= rule.perWeek) {
        canApply = false;
      } else {
        weekCounts.set(weekKey, weekCount + 1);
      }
    }
    
    // Check per-season cap
    if (canApply && rule.perSeason !== undefined && event.season !== undefined) {
      const seasonKey = `${event.ruleId}:${event.season}`;
      const seasonCount = seasonCounts.get(seasonKey) || 0;
      if (seasonCount >= rule.perSeason) {
        canApply = false;
      } else {
        seasonCounts.set(seasonKey, seasonCount + 1);
      }
    }
    
    if (canApply) {
      totalXP += event.amount;
    }
  }
  
  return Math.max(0, totalXP); // Floor at 0
}

/**
 * Compute player progression state
 * @param aggregateXP - Total XP across all seasons (determines level)
 * @param seasonXP - XP for current season only (for ranking)
 * @param eventsCount - Total number of events
 */
export function computePlayerState(
  aggregateXP: number,
  seasonXP: number,
  eventsCount: number
): PlayerState {
  const { level, nextLevelXP, currentLevelXP, isMax } = computeLevel(
    aggregateXP,
    DEFAULT_LEVEL_THRESHOLDS
  );
  
  // Calculate progress percent with max level clamping
  let progressPercent = 0;
  if (isMax) {
    progressPercent = 100;
  } else if (currentLevelXP > 0 && nextLevelXP > currentLevelXP) {
    progressPercent = Math.round(
      ((aggregateXP - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100
    );
    progressPercent = Math.min(100, progressPercent);
  }
  
  return {
    totalXP: aggregateXP,
    level,
    nextLevelXP,
    currentLevelXP,
    progressPercent,
    eventsCount,
    isMax,
    seasonXP
  };
}

/**
 * Compute both seasonal and aggregate XP for a player
 */
export function computePlayerXP(
  allEvents: XPEvent[],
  playerId: string,
  currentSeasonId: number | undefined,
  rules: XPRule[]
): { aggregateXP: number; seasonXP: number; eventsCount: number } {
  const playerEvents = filterEventsByPlayer(allEvents, playerId);
  const aggregateXP = computeXPFromEvents(playerEvents, rules);
  
  let seasonXP = 0;
  if (currentSeasonId !== undefined) {
    const seasonEvents = filterEventsBySeason(playerEvents, currentSeasonId);
    seasonXP = computeXPFromEvents(seasonEvents, rules);
  }
  
  return {
    aggregateXP,
    seasonXP,
    eventsCount: playerEvents.length
  };
}
