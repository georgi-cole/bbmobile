/**
 * IndexedDB persistence with schemaVersion (v2)
 */

import type { XPEvent, XPRuleSet, Snapshot, MetaEntry } from './types.js';
import { DB_NAME, DB_VERSION } from './constants.js';

let dbInstance: IDBDatabase | null = null;

/**
 * Open or upgrade the database
 */
export async function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;
  
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      dbInstance = request.result;
      
      // Write schemaVersion to meta store
      writeMetaEntry({ key: 'schemaVersion', value: DB_VERSION }).catch(console.error);
      
      resolve(dbInstance);
    };
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Create or upgrade stores
      if (!db.objectStoreNames.contains('events')) {
        const eventsStore = db.createObjectStore('events', { keyPath: 'id' });
        eventsStore.createIndex('timestamp', 'timestamp', { unique: false });
        eventsStore.createIndex('ruleId', 'ruleId', { unique: false });
      }
      
      if (!db.objectStoreNames.contains('snapshots')) {
        const snapshotsStore = db.createObjectStore('snapshots', { keyPath: 'id' });
        snapshotsStore.createIndex('timestamp', 'timestamp', { unique: false });
        snapshotsStore.createIndex('eventId', 'eventId', { unique: false });
      }
      
      if (!db.objectStoreNames.contains('ruleSets')) {
        const ruleSetsStore = db.createObjectStore('ruleSets', { keyPath: 'id' });
        ruleSetsStore.createIndex('version', 'version', { unique: false });
      }
      
      // New in v2: meta store
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' });
      }
    };
  });
}

/**
 * Close database
 */
export function closeDB(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

/**
 * Write a meta entry
 */
async function writeMetaEntry(entry: MetaEntry): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('meta', 'readwrite');
    const store = tx.objectStore('meta');
    const request = store.put(entry);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Read a meta entry
 */
export async function readMetaEntry(key: string): Promise<MetaEntry | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('meta', 'readonly');
    const store = tx.objectStore('meta');
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save an event
 */
export async function saveEvent(event: XPEvent): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('events', 'readwrite');
    const store = tx.objectStore('events');
    const request = store.put(event);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get all events
 */
export async function getAllEvents(): Promise<XPEvent[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('events', 'readonly');
    const store = tx.objectStore('events');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save a snapshot
 */
export async function saveSnapshot(snapshot: Snapshot): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('snapshots', 'readwrite');
    const store = tx.objectStore('snapshots');
    const request = store.put(snapshot);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get all snapshots
 */
export async function getAllSnapshots(): Promise<Snapshot[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('snapshots', 'readonly');
    const store = tx.objectStore('snapshots');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save a rule set
 */
export async function saveRuleSet(ruleSet: XPRuleSet): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('ruleSets', 'readwrite');
    const store = tx.objectStore('ruleSets');
    const request = store.put(ruleSet);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get all rule sets
 */
export async function getAllRuleSets(): Promise<XPRuleSet[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('ruleSets', 'readonly');
    const store = tx.objectStore('ruleSets');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Clear all data (for testing/reset)
 */
export async function clearAllData(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['events', 'snapshots', 'ruleSets', 'meta'], 'readwrite');
    const promises: Promise<void>[] = [
      new Promise((res, rej) => {
        const req = tx.objectStore('events').clear();
        req.onsuccess = () => res();
        req.onerror = () => rej(req.error);
      }),
      new Promise((res, rej) => {
        const req = tx.objectStore('snapshots').clear();
        req.onsuccess = () => res();
        req.onerror = () => rej(req.error);
      }),
      new Promise((res, rej) => {
        const req = tx.objectStore('ruleSets').clear();
        req.onsuccess = () => res();
        req.onerror = () => rej(req.error);
      }),
      new Promise((res, rej) => {
        const req = tx.objectStore('meta').clear();
        req.onsuccess = () => res();
        req.onerror = () => rej(req.error);
      })
    ];
    
    Promise.all(promises)
      .then(() => resolve())
      .catch(reject);
  });
}
