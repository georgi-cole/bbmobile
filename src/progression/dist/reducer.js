/**
 * Reducer: compute player state from events with caps enforcement
 */
import { DEFAULT_LEVEL_THRESHOLDS } from './constants.js';
/**
 * Compute player state from a list of events
 */
export function reduceEvents(events, rules, options = {}) {
    const { clampMinXP = 0, levelThresholds = DEFAULT_LEVEL_THRESHOLDS } = options;
    const ruleMap = new Map(rules.map(r => [r.id, r]));
    // Track caps
    const weekCounts = new Map(); // ruleId:week -> count
    const seasonCounts = new Map(); // ruleId:season -> count
    let totalXP = 0;
    // Process events in order
    for (const event of events) {
        const rule = ruleMap.get(event.ruleId);
        if (!rule)
            continue;
        let canApply = true;
        // Check per-week cap
        if (rule.perWeek !== undefined && event.week !== undefined) {
            const weekKey = `${event.ruleId}:${event.week}`;
            const weekCount = weekCounts.get(weekKey) || 0;
            if (weekCount >= rule.perWeek) {
                canApply = false;
            }
            else {
                weekCounts.set(weekKey, weekCount + 1);
            }
        }
        // Check per-season cap
        if (canApply && rule.perSeason !== undefined && event.season !== undefined) {
            const seasonKey = `${event.ruleId}:${event.season}`;
            const seasonCount = seasonCounts.get(seasonKey) || 0;
            if (seasonCount >= rule.perSeason) {
                canApply = false;
            }
            else {
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
    const { level, nextLevelXP, currentLevelXP, isMax } = computeLevel(totalXP, levelThresholds);
    // Calculate progress percent with max level clamping
    let progressPercent = 0;
    if (isMax) {
        // At max level, progress is always 100%
        progressPercent = 100;
    }
    else if (currentLevelXP > 0 && nextLevelXP > currentLevelXP) {
        progressPercent = Math.round(((totalXP - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100);
        // Clamp to 100% just in case
        progressPercent = Math.min(100, progressPercent);
    }
    return {
        totalXP,
        level,
        nextLevelXP,
        currentLevelXP,
        progressPercent,
        eventsCount: events.length,
        isMax
    };
}
/**
 * Compute level from total XP
 */
export function computeLevel(totalXP, thresholds) {
    if (!Array.isArray(thresholds) || thresholds.length === 0) {
        throw new Error("Level thresholds must be a non-empty array.");
    }
    let level = 1;
    let currentLevelXP = 0;
    let nextLevelXP;
    let isMax = false;
    if (thresholds[1] && typeof thresholds[1].xpRequired === 'number') {
        nextLevelXP = thresholds[1].xpRequired;
    }
    else if (thresholds[0] && typeof thresholds[0].xpRequired === 'number') {
        nextLevelXP = thresholds[0].xpRequired + 1000;
    }
    else {
        throw new Error("Invalid level thresholds: missing xpRequired for next level.");
    }
    for (let i = 0; i < thresholds.length; i++) {
        if (totalXP >= thresholds[i].xpRequired) {
            level = thresholds[i].level;
            currentLevelXP = thresholds[i].xpRequired;
            if (thresholds[i + 1] && typeof thresholds[i + 1].xpRequired === 'number') {
                nextLevelXP = thresholds[i + 1].xpRequired;
            }
            else {
                // At max level: set nextLevelXP equal to currentLevelXP to avoid fabricating +1000
                nextLevelXP = currentLevelXP;
                isMax = true;
            }
        }
        else {
            break;
        }
    }
    return { level, nextLevelXP, currentLevelXP, isMax };
}
/**
 * Compute breakdown by rule
 */
export function computeBreakdown(events, rules) {
    const breakdown = new Map();
    const ruleMap = new Map(rules.map(r => [r.id, r]));
    // Track caps for accurate breakdown
    const weekCounts = new Map();
    const seasonCounts = new Map();
    for (const event of events) {
        const rule = ruleMap.get(event.ruleId);
        if (!rule)
            continue;
        let canApply = true;
        // Check caps (same logic as reduceEvents)
        if (rule.perWeek !== undefined && event.week !== undefined) {
            const weekKey = `${event.ruleId}:${event.week}`;
            const weekCount = weekCounts.get(weekKey) || 0;
            if (weekCount >= rule.perWeek) {
                canApply = false;
            }
            else {
                weekCounts.set(weekKey, weekCount + 1);
            }
        }
        if (canApply && rule.perSeason !== undefined && event.season !== undefined) {
            const seasonKey = `${event.ruleId}:${event.season}`;
            const seasonCount = seasonCounts.get(seasonKey) || 0;
            if (seasonCount >= rule.perSeason) {
                canApply = false;
            }
            else {
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
