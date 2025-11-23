/**
 * Constants: XP rules, caps, and level thresholds
 */
import type { XPRule, LevelThreshold } from './types.js';
/**
 * Default XP rules v1 with enforced caps
 */
export declare const DEFAULT_RULES: XPRule[];
/**
 * Default level thresholds (XP required to reach each level)
 */
export declare const DEFAULT_LEVEL_THRESHOLDS: LevelThreshold[];
/**
 * Database name and version
 */
export declare const DB_NAME = "BBProgressionDB";
export declare const DB_VERSION = 2;
