/**
 * Type definitions for the progression system
 */
export interface XPEvent {
    id: string;
    timestamp: number;
    ruleId: string;
    amount: number;
    week?: number;
    season?: number;
    meta?: Record<string, unknown>;
}
export interface XPRule {
    id: string;
    name: string;
    baseXP: number;
    description?: string;
    perWeek?: number;
    perSeason?: number;
}
export interface XPRuleSet {
    id: string;
    version: number;
    rules: XPRule[];
    createdAt: number;
}
export interface LevelThreshold {
    level: number;
    xpRequired: number;
}
export interface PlayerState {
    totalXP: number;
    level: number;
    nextLevelXP: number;
    currentLevelXP: number;
    progressPercent: number;
    eventsCount: number;
}
export interface Snapshot {
    id: string;
    timestamp: number;
    eventId: string;
    state: PlayerState;
}
export interface ReducerOptions {
    clampMinXP?: number;
    levelThresholds?: LevelThreshold[];
}
export interface DBSchema {
    version: number;
    stores: {
        events: {
            keyPath: 'id';
            indexes: {
                timestamp: 'timestamp';
                ruleId: 'ruleId';
            };
        };
        snapshots: {
            keyPath: 'id';
            indexes: {
                timestamp: 'timestamp';
                eventId: 'eventId';
            };
        };
        ruleSets: {
            keyPath: 'id';
            indexes: {
                version: 'version';
            };
        };
        meta: {
            keyPath: 'key';
        };
    };
}
export interface MetaEntry {
    key: string;
    value: unknown;
}
