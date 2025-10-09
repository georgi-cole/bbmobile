/**
 * IndexedDB persistence with schemaVersion (v2)
 */
import type { XPEvent, XPRuleSet, Snapshot, MetaEntry } from './types.js';
/**
 * Open or upgrade the database
 */
export declare function openDB(): Promise<IDBDatabase>;
/**
 * Close database
 */
export declare function closeDB(): void;
/**
 * Read a meta entry
 */
export declare function readMetaEntry(key: string): Promise<MetaEntry | null>;
/**
 * Save an event
 */
export declare function saveEvent(event: XPEvent): Promise<void>;
/**
 * Get all events
 */
export declare function getAllEvents(): Promise<XPEvent[]>;
/**
 * Save a snapshot
 */
export declare function saveSnapshot(snapshot: Snapshot): Promise<void>;
/**
 * Get all snapshots
 */
export declare function getAllSnapshots(): Promise<Snapshot[]>;
/**
 * Save a rule set
 */
export declare function saveRuleSet(ruleSet: XPRuleSet): Promise<void>;
/**
 * Get all rule sets
 */
export declare function getAllRuleSets(): Promise<XPRuleSet[]>;
/**
 * Clear all data (for testing/reset)
 */
export declare function clearAllData(): Promise<void>;
