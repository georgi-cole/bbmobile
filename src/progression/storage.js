/**
 * Storage wrapper for progression system
 * Provides IndexedDB persistence with in-memory fallback
 */

import * as db from './dist/db.js';

// In-memory fallback storage
let inMemoryMode = false;
let inMemoryStore = {
  events: [],
  snapshots: [],
  ruleSets: [],
  meta: new Map()
};

/**
 * Initialize storage - tries IndexedDB, falls back to in-memory
 */
export async function initialize() {
  try {
    await db.openDB();
    inMemoryMode = false;
    console.log('[Progression Storage] Using IndexedDB');
  } catch (error) {
    console.warn('[Progression Storage] IndexedDB unavailable, using in-memory fallback:', error);
    inMemoryMode = true;
  }
}

/**
 * Save an event
 */
export async function saveEvent(event) {
  if (inMemoryMode) {
    // Remove existing event with same ID if present
    inMemoryStore.events = inMemoryStore.events.filter(e => e.id !== event.id);
    inMemoryStore.events.push(event);
    return Promise.resolve();
  }
  return db.saveEvent(event);
}

/**
 * Get all events
 */
export async function getAllEvents() {
  if (inMemoryMode) {
    return Promise.resolve([...inMemoryStore.events]);
  }
  return db.getAllEvents();
}

/**
 * Save a snapshot
 */
export async function saveSnapshot(snapshot) {
  if (inMemoryMode) {
    // Remove existing snapshot with same ID if present
    inMemoryStore.snapshots = inMemoryStore.snapshots.filter(s => s.id !== snapshot.id);
    inMemoryStore.snapshots.push(snapshot);
    return Promise.resolve();
  }
  return db.saveSnapshot(snapshot);
}

/**
 * Get all snapshots
 */
export async function getAllSnapshots() {
  if (inMemoryMode) {
    return Promise.resolve([...inMemoryStore.snapshots]);
  }
  return db.getAllSnapshots();
}

/**
 * Save a rule set
 */
export async function saveRuleSet(ruleSet) {
  if (inMemoryMode) {
    // Remove existing ruleSet with same ID if present
    inMemoryStore.ruleSets = inMemoryStore.ruleSets.filter(r => r.id !== ruleSet.id);
    inMemoryStore.ruleSets.push(ruleSet);
    return Promise.resolve();
  }
  return db.saveRuleSet(ruleSet);
}

/**
 * Get all rule sets
 */
export async function getAllRuleSets() {
  if (inMemoryMode) {
    return Promise.resolve([...inMemoryStore.ruleSets]);
  }
  return db.getAllRuleSets();
}

/**
 * Read a meta entry
 */
export async function readMetaEntry(key) {
  if (inMemoryMode) {
    return Promise.resolve(inMemoryStore.meta.get(key) || null);
  }
  return db.readMetaEntry(key);
}

/**
 * Write a meta entry
 */
export async function writeMetaEntry(entry) {
  if (inMemoryMode) {
    inMemoryStore.meta.set(entry.key, entry);
    return Promise.resolve();
  }
  // Use internal function from db module
  const dbInstance = await db.openDB();
  return new Promise((resolve, reject) => {
    const tx = dbInstance.transaction('meta', 'readwrite');
    const store = tx.objectStore('meta');
    const request = store.put(entry);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Clear all data
 */
export async function clearAllData() {
  if (inMemoryMode) {
    inMemoryStore.events = [];
    inMemoryStore.snapshots = [];
    inMemoryStore.ruleSets = [];
    inMemoryStore.meta.clear();
    return Promise.resolve();
  }
  return db.clearAllData();
}

/**
 * Close database connection
 */
export function close() {
  if (!inMemoryMode) {
    db.closeDB();
  }
}

/**
 * Check if using in-memory mode
 */
export function isInMemoryMode() {
  return inMemoryMode;
}

/**
 * Export db module functions for backward compatibility
 */
export const openDB = db.openDB;
export const closeDB = db.closeDB;
