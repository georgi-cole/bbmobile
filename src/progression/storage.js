// MODULE: src/progression/storage.js
// IndexedDB storage wrapper with in-memory fallback.

const DB_NAME = 'bbmobile-progression';
const DB_VERSION = 1;
const STORE_EVENTS = 'events';

let idb = null;
let useMemory = false;

// In-memory fallback
const mem = {
  events: [],
  autoId: 1
};

function openIDB() {
  return new Promise((resolve, reject) => {
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (ev) => {
        const db = ev.target.result;
        if (!db.objectStoreNames.contains(STORE_EVENTS)) {
          const store = db.createObjectStore(STORE_EVENTS, { keyPath: 'id', autoIncrement: true });
          // Useful indexes
          try {
            store.createIndex('by_player', ['meta.playerId'], { unique: false });
            store.createIndex('by_type', ['type'], { unique: false });
            store.createIndex('by_season', ['meta.season'], { unique: false });
            store.createIndex('by_timestamp', ['ts'], { unique: false });
            store.createIndex('by_player_week_type', ['meta.playerId', 'meta.season', 'meta.week', 'type'], { unique: false });
          } catch (_e) {
            // Some browsers may not support compound keys robustly
          }
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    } catch (e) {
      reject(e);
    }
  });
}

async function ensureDB() {
  if (idb || useMemory) return;
  try {
    idb = await openIDB();
    idb.onclose = () => { idb = null; };
  } catch (_e) {
    // Fallback to memory if IDB fails
    useMemory = true;
  }
}

function tx(storeName, mode = 'readonly') {
  const t = idb.transaction(storeName, mode);
  return t.objectStore(storeName);
}

export async function initializeDB() {
  await ensureDB();
  return true;
}

export async function addEvent(event) {
  await ensureDB();
  const record = { ...event };
  if (useMemory) {
    record.id = mem.autoId++;
    mem.events.push(record);
    return record;
  }
  return new Promise((resolve, reject) => {
    const store = tx(STORE_EVENTS, 'readwrite');
    const req = store.add(record);
    req.onsuccess = () => {
      record.id = req.result;
      resolve(record);
    };
    req.onerror = () => reject(req.error);
  });
}

function matchesFilter(ev, filter) {
  if (!filter) return true;
  if (filter.playerId && ev.meta?.playerId !== filter.playerId) return false;
  if (filter.season != null && ev.meta?.season !== filter.season) return false;
  if (filter.week != null && ev.meta?.week !== filter.week) return false;
  if (filter.type && ev.type !== filter.type) return false;
  return true;
}

export async function getEvents(filter = null) {
  await ensureDB();
  if (useMemory) {
    return mem.events.filter(ev => matchesFilter(ev, filter));
  }
  return new Promise((resolve, reject) => {
    const result = [];
    const store = tx(STORE_EVENTS, 'readonly');
    const req = store.openCursor();
    req.onsuccess = (ev) => {
      const cursor = ev.target.result;
      if (cursor) {
        const value = cursor.value;
        if (matchesFilter(value, filter)) result.push(value);
        cursor.continue();
      } else {
        resolve(result);
      }
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getEventsByWeekType(playerId, season, week, type) {
  // Optimized scan if index exists; fallback to filtering
  await ensureDB();
  if (useMemory) {
    return mem.events.filter(ev =>
      ev.meta?.playerId === playerId &&
      ev.meta?.season === season &&
      ev.meta?.week === week &&
      ev.type === type
    );
  }
  return new Promise((resolve, reject) => {
    const result = [];
    const store = tx(STORE_EVENTS, 'readonly');
    let usedIndex = false;
    try {
      const idx = store.index('by_player_week_type');
      const key = [playerId, season, week, type];
      const req = idx.getAll(key);
      usedIndex = true;
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    } catch (_e) {
      // Fallback full scan
    }
    if (usedIndex) return;
    const req = store.openCursor();
    req.onsuccess = (ev) => {
      const cursor = ev.target.result;
      if (cursor) {
        const value = cursor.value;
        if (
          value.meta?.playerId === playerId &&
          value.meta?.season === season &&
          value.meta?.week === week &&
          value.type === type
        ) {
          result.push(value);
        }
        cursor.continue();
      } else {
        resolve(result);
      }
    };
    req.onerror = () => reject(req.error);
  });
}