/**
 * Reducer: compute player state from events with caps enforcement
 */

import type { XPEvent, XPRule, PlayerState, LevelThreshold, ReducerOptions } from './types.js';
import { DEFAULT_LEVEL_THRESHOLDS } from './constants.js';

/**
 * Compute player state from a list of events
 */
export function reduceEvents(
  events: XPEvent[],
  rules: XPRule[],
  options: ReducerOptions = {}
): PlayerState {
  const { clampMinXP = 0, levelThresholds = DEFAULT_LEVEL_THRESHOLDS } = options;
  
  const ruleMap = new Map(rules.map(r => [r.id, r]));
  
  // Track caps
  const weekCounts = new Map<string, number>(); // ruleId:week -> count
  const seasonCounts = new Map<string, number>(); // ruleId:season -> count
  
  let totalXP = 0;
  
  // Process events in order
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
    
    // Apply XP
    if (canApply) {
      totalXP += event.amount;
    }
  }
  
  // Floor negative totals
  if (totalXP < clampMinXP) {
    totalXP = clampMinXP;
  }
  
  // Compute level
  const { level, nextLevelXP, currentLevelXP } = computeLevel(totalXP, levelThresholds);
  const progressPercent = currentLevelXP > 0 
    ? Math.round(((totalXP - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100)
    : 0;
  
  return {
    totalXP,
    level,
    nextLevelXP,
    currentLevelXP,
    progressPercent,
    eventsCount: events.length
  };
}

/**
 * Compute level from total XP
 */
function computeLevel(
  totalXP: number,
  thresholds: LevelThreshold[]
): { level: number; nextLevelXP: number; currentLevelXP: number } {
  if (!Array.isArray(thresholds) || thresholds.length === 0) {
    throw new Error("Level thresholds must be a non-empty array.");
  }
  let level = 1;
  let currentLevelXP = 0;
  let nextLevelXP;
  if (thresholds[1] && typeof thresholds[1].xpRequired === 'number') {
    nextLevelXP = thresholds[1].xpRequired;
  } else if (thresholds[0] && typeof thresholds[0].xpRequired === 'number') {
    nextLevelXP = thresholds[0].xpRequired + 1000;
  } else {
    throw new Error("Invalid level thresholds: missing xpRequired for next level.");
  }
  
  for (let i = 0; i < thresholds.length; i++) {
    if (totalXP >= thresholds[i].xpRequired) {
      level = thresholds[i].level;
      currentLevelXP = thresholds[i].xpRequired;
      if (thresholds[i + 1] && typeof thresholds[i + 1].xpRequired === 'number') {
        nextLevelXP = thresholds[i + 1].xpRequired;
      } else {
        nextLevelXP = currentLevelXP + 1000;
      }
    } else {
      break;
    }
  }
  
  return { level, nextLevelXP, currentLevelXP };
}

/**
 * Compute breakdown by rule
 */
export function computeBreakdown(
  events: XPEvent[],
  rules: XPRule[]
): Map<string, { count: number; totalXP: number; ruleName: string }> {
  const breakdown = new Map<string, { count: number; totalXP: number; ruleName: string }>();
  const ruleMap = new Map(rules.map(r => [r.id, r]));
  
  // Track caps for accurate breakdown
  const weekCounts = new Map<string, number>();
  const seasonCounts = new Map<string, number>();
  
  for (const event of events) {
    const rule = ruleMap.get(event.ruleId);
    if (!rule) continue;
    
    let canApply = true;
    
    // Check caps (same logic as reduceEvents)
    if (rule.perWeek !== undefined && event.week !== undefined) {
      const weekKey = `${event.ruleId}:${event.week}`;
      const weekCount = weekCounts.get(weekKey) || 0;
      if (weekCount >= rule.perWeek) {
        canApply = false;
      } else {
        weekCounts.set(weekKey, weekCount + 1);
      }
    }
    
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
      const current = breakdown.get(event.ruleId) || { count: 0, totalXP: 0, ruleName: rule.name };
      breakdown.set(event.ruleId, {
        count: current.count + 1,
        totalXP: current.totalXP + event.amount,
        ruleName: rule.name
      });
    }
  }
  
  return breakdown;
}
