/**
 * Constants: XP rules, caps, and level thresholds
 */

import type { XPRule, LevelThreshold } from './types.js';

/**
 * Default XP rules v1 with enforced caps
 */
export const DEFAULT_RULES: XPRule[] = [
  {
    id: 'COMP_PARTICIPATE',
    name: 'Competition Participant',
    baseXP: 50,
    description: 'Participated in a competition',
    perWeek: 3  // Cap at 3 per week
  },
  {
    id: 'COMP_WIN',
    name: 'Competition Winner',
    baseXP: 100,
    description: 'Won a competition'
  },
  {
    id: 'HOH_WIN',
    name: 'Head of Household',
    baseXP: 150,
    description: 'Won HOH competition'
  },
  {
    id: 'POV_WIN',
    name: 'Power of Veto',
    baseXP: 125,
    description: 'Won POV competition'
  },
  {
    id: 'NOMINATED',
    name: 'Nominated',
    baseXP: -25,
    description: 'Nominated for eviction'
  },
  {
    id: 'SURVIVED_BLOCK',
    name: 'Survived the Block',
    baseXP: 75,
    description: 'Survived being on the block'
  },
  {
    id: 'SOCIAL_ALLIANCE',
    name: 'Alliance Formed',
    baseXP: 30,
    description: 'Formed an alliance'
  },
  {
    id: 'BETRAYAL',
    name: 'Betrayal',
    baseXP: -50,
    description: 'Betrayed by an ally'
  },
  {
    id: 'CLEAN_WEEK',
    name: 'Clean Week',
    baseXP: 100,
    description: 'Completed a week without being nominated',
    perWeek: 1  // Cap at 1 per week
  },
  {
    id: 'HOH_STREAK_2',
    name: 'HOH Streak (2+)',
    baseXP: 200,
    description: 'Won HOH twice in a row',
    perSeason: 1  // Once per season
  },
  {
    id: 'POV_STREAK_2',
    name: 'POV Streak (2+)',
    baseXP: 175,
    description: 'Won POV twice in a row',
    perSeason: 1  // Once per season
  },
  {
    id: 'JURY_MEMBER',
    name: 'Jury Member',
    baseXP: 80,
    description: 'Made it to jury'
  },
  {
    id: 'FINAL_THREE',
    name: 'Final Three',
    baseXP: 150,
    description: 'Reached final three'
  },
  {
    id: 'FINAL_TWO',
    name: 'Final Two',
    baseXP: 250,
    description: 'Reached final two'
  },
  {
    id: 'WINNER',
    name: 'Winner',
    baseXP: 500,
    description: 'Won the game'
  },
  {
    id: 'SURVIVE_EVICTION',
    name: 'Survived Eviction',
    baseXP: 100,
    description: 'Survived eviction vote'
  },
  {
    id: 'USED_VETO_ON_SELF',
    name: 'Used Veto on Self',
    baseXP: 75,
    description: 'Used Power of Veto to save yourself'
  },
  {
    id: 'USED_VETO_ON_OTHER',
    name: 'Used Veto on Other',
    baseXP: 50,
    description: 'Used Power of Veto to save someone else'
  },
  {
    id: 'REMOVED_FROM_BLOCK',
    name: 'Removed from Block',
    baseXP: 60,
    description: 'Saved from nomination by veto'
  },
  {
    id: 'RECEIVED_VOTES_AGAINST',
    name: 'Received Votes Against',
    baseXP: -10,
    description: 'Received eviction votes'
  },
  {
    id: 'CAST_CORRECT_VOTE',
    name: 'Cast Correct Vote',
    baseXP: 15,
    description: 'Voted with the majority'
  },
  {
    id: 'TIEBREAKER_WIN',
    name: 'Tiebreaker Win',
    baseXP: 75,
    description: 'Broke a tie as HOH'
  },
  {
    id: 'WON_JURY_VOTE',
    name: 'Won Jury Vote',
    baseXP: 50,
    description: 'Received a jury vote in finale'
  },
  {
    id: 'WON_FINAL',
    name: 'Won Final',
    baseXP: 500,
    description: 'Won the game in finale'
  },
  {
    id: 'WON_PUBLIC_FAVORITE',
    name: "Won Public's Favorite",
    baseXP: 100,
    description: "Won public's favorite player award"
  }
];

/**
 * Default level thresholds (XP required to reach each level)
 */
export const DEFAULT_LEVEL_THRESHOLDS: LevelThreshold[] = [
  { level: 1, xpRequired: 0 },
  { level: 2, xpRequired: 100 },
  { level: 3, xpRequired: 250 },
  { level: 4, xpRequired: 500 },
  { level: 5, xpRequired: 850 },
  { level: 6, xpRequired: 1300 },
  { level: 7, xpRequired: 1900 },
  { level: 8, xpRequired: 2600 },
  { level: 9, xpRequired: 3450 },
  { level: 10, xpRequired: 4500 },
  { level: 11, xpRequired: 5800 },
  { level: 12, xpRequired: 7400 },
  { level: 13, xpRequired: 9300 },
  { level: 14, xpRequired: 11500 },
  { level: 15, xpRequired: 14000 },
  { level: 16, xpRequired: 17000 },
  { level: 17, xpRequired: 20500 },
  { level: 18, xpRequired: 24500 },
  { level: 19, xpRequired: 29000 },
  { level: 20, xpRequired: 34000 }
];

/**
 * Database name and version
 */
export const DB_NAME = 'BBProgressionDB';
export const DB_VERSION = 2;
