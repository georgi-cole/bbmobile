/**
 * Unit tests for CompetitionStorageAdapter
 * Ensures placements persist correctly and bestPlacement is tracked.
 * Raw performance metrics must NOT appear in stored entries.
 */

import { strict as assert } from 'assert';

// ── Minimal localStorage shim ─────────────────────────────────────────────

function makeLocalStorageShim() {
  const store = {};
  return {
    getItem(key)        { return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null; },
    setItem(key, value) { store[key] = String(value); },
    removeItem(key)     { delete store[key]; },
    clear()             { Object.keys(store).forEach(k => delete store[k]); }
  };
}

// ── Inline the implementation under a fake `global` ──────────────────────

function buildAdapter(ls) {
  const HISTORY_KEY = 'bb_competition_history';
  const STATS_KEY   = 'bb_player_stats';
  const fakeGlobal  = { game: {}, localStorage: ls };

  function safeLS() { try { return fakeGlobal.localStorage || null; } catch { return null; } }

  function loadHistory() {
    const g = fakeGlobal.game;
    if (!Array.isArray(g.competitionHistory)) {
      const stored = safeLS()?.getItem(HISTORY_KEY);
      try { g.competitionHistory = JSON.parse(stored || 'null') || []; }
      catch { g.competitionHistory = []; }
    }
    return g.competitionHistory;
  }

  function loadStats() {
    const g = fakeGlobal.game;
    if (!g.playerStats || typeof g.playerStats !== 'object') {
      const stored = safeLS()?.getItem(STATS_KEY);
      try { g.playerStats = JSON.parse(stored || 'null') || {}; }
      catch { g.playerStats = {}; }
    }
    return g.playerStats;
  }

  function persistHistory(h) {
    try { safeLS()?.setItem(HISTORY_KEY, JSON.stringify(h)); } catch { /* ignore */ }
  }
  function persistStats(s) {
    try { safeLS()?.setItem(STATS_KEY, JSON.stringify(s)); } catch { /* ignore */ }
  }

  const adapter = {
    saveRound(roundData) {
      if (!roundData || !Array.isArray(roundData.placements)) return;
      const entry = {
        timestamp: roundData.timestamp || new Date().toISOString(),
        roundId:   roundData.roundId   || ('round_' + Date.now()),
        placements: roundData.placements.map(p => ({ playerId: p.playerId, placement: p.placement })),
        config: roundData.config ? { order: roundData.config.order, isFinal: !!roundData.config.isFinal } : {}
      };
      const history = loadHistory();
      history.push(entry);
      persistHistory(history);

      const stats = loadStats();
      entry.placements.forEach(p => {
        const pid = String(p.playerId);
        if (!stats[pid]) stats[pid] = {};
        const current = stats[pid].bestPlacement;
        if (current === undefined || current === null || p.placement < current) {
          stats[pid].bestPlacement = p.placement;
        }
      });
      persistStats(stats);
    },
    getHistory()          { return loadHistory().slice(); },
    getPlayerStats(id)    { return loadStats()[String(id)] || {}; },
    clearAll() {
      fakeGlobal.game.competitionHistory = [];
      fakeGlobal.game.playerStats = {};
      try { safeLS()?.removeItem(HISTORY_KEY); safeLS()?.removeItem(STATS_KEY); } catch { /* ignore */ }
    },
    _game: fakeGlobal.game
  };

  return adapter;
}

// ── Test helpers ──────────────────────────────────────────────────────────

console.log('🧪 Running CompetitionStorageAdapter tests...\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (error) {
    console.log(`❌ FAIL: ${name}`);
    console.log(`   ${error.message}`);
    failed++;
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────

test('saveRound stores entry in history', () => {
  const adapter = buildAdapter(makeLocalStorageShim());
  adapter.saveRound({
    timestamp: '2026-01-01T00:00:00.000Z',
    roundId: 'r1',
    placements: [{ playerId: 'alice', placement: 1 }, { playerId: 'bob', placement: 2 }],
    config: { order: 'desc' }
  });
  const history = adapter.getHistory();
  assert.equal(history.length, 1);
  assert.equal(history[0].roundId, 'r1');
  assert.equal(history[0].placements.length, 2);
});

test('stored placements contain only playerId and placement (no performance/score)', () => {
  const adapter = buildAdapter(makeLocalStorageShim());
  adapter.saveRound({
    roundId: 'r2',
    placements: [
      { playerId: 'alice', placement: 1, performance: 99 },  // performance must be stripped
      { playerId: 'bob',   placement: 2, performance: 45 }
    ],
    config: {}
  });
  const entry = adapter.getHistory()[0];
  entry.placements.forEach(p => {
    assert.ok(!Object.prototype.hasOwnProperty.call(p, 'performance'),
      `Placement entry for ${p.playerId} must not expose "performance"`);
    assert.ok(!Object.prototype.hasOwnProperty.call(p, 'score'),
      `Placement entry for ${p.playerId} must not expose "score"`);
    assert.ok(Object.prototype.hasOwnProperty.call(p, 'playerId'), 'Must have playerId');
    assert.ok(Object.prototype.hasOwnProperty.call(p, 'placement'), 'Must have placement');
  });
});

test('bestPlacement is tracked per player', () => {
  const adapter = buildAdapter(makeLocalStorageShim());
  adapter.saveRound({
    roundId: 'r1',
    placements: [{ playerId: 'alice', placement: 2 }],
    config: {}
  });
  assert.equal(adapter.getPlayerStats('alice').bestPlacement, 2);

  // Alice does better in round 2
  adapter.saveRound({
    roundId: 'r2',
    placements: [{ playerId: 'alice', placement: 1 }],
    config: {}
  });
  assert.equal(adapter.getPlayerStats('alice').bestPlacement, 1);
});

test('bestPlacement does NOT update if new placement is worse', () => {
  const adapter = buildAdapter(makeLocalStorageShim());
  adapter.saveRound({
    roundId: 'r1',
    placements: [{ playerId: 'alice', placement: 1 }],
    config: {}
  });
  adapter.saveRound({
    roundId: 'r2',
    placements: [{ playerId: 'alice', placement: 3 }],
    config: {}
  });
  assert.equal(adapter.getPlayerStats('alice').bestPlacement, 1);
});

test('multiple players get individual bestPlacement tracking', () => {
  const adapter = buildAdapter(makeLocalStorageShim());
  adapter.saveRound({
    roundId: 'r1',
    placements: [
      { playerId: 'alice', placement: 1 },
      { playerId: 'bob',   placement: 2 },
      { playerId: 'carol', placement: 3 }
    ],
    config: {}
  });
  assert.equal(adapter.getPlayerStats('alice').bestPlacement, 1);
  assert.equal(adapter.getPlayerStats('bob').bestPlacement,   2);
  assert.equal(adapter.getPlayerStats('carol').bestPlacement, 3);
});

test('history persists to localStorage and can be reloaded', () => {
  const ls = makeLocalStorageShim();
  const adapter1 = buildAdapter(ls);
  adapter1.saveRound({
    roundId: 'persisted',
    placements: [{ playerId: 'dave', placement: 1 }],
    config: {}
  });

  // New adapter instance using the same localStorage
  const adapter2 = buildAdapter(ls);
  const history = adapter2.getHistory();
  assert.equal(history.length, 1);
  assert.equal(history[0].roundId, 'persisted');
});

test('getPlayerStats returns empty object for unknown player', () => {
  const adapter = buildAdapter(makeLocalStorageShim());
  assert.deepEqual(adapter.getPlayerStats('nobody'), {});
});

test('clearAll empties history and stats', () => {
  const adapter = buildAdapter(makeLocalStorageShim());
  adapter.saveRound({
    roundId: 'x',
    placements: [{ playerId: 'p', placement: 1 }],
    config: {}
  });
  adapter.clearAll();
  assert.equal(adapter.getHistory().length, 0);
  assert.deepEqual(adapter.getPlayerStats('p'), {});
});

test('saveRound with invalid data is a no-op', () => {
  const adapter = buildAdapter(makeLocalStorageShim());
  adapter.saveRound(null);
  adapter.saveRound({ roundId: 'bad' }); // missing placements
  assert.equal(adapter.getHistory().length, 0);
});

test('multiple rounds accumulate in history', () => {
  const adapter = buildAdapter(makeLocalStorageShim());
  for (let i = 1; i <= 5; i++) {
    adapter.saveRound({
      roundId: `r${i}`,
      placements: [{ playerId: 'p1', placement: i % 3 + 1 }],
      config: {}
    });
  }
  assert.equal(adapter.getHistory().length, 5);
});

// ── Summary ───────────────────────────────────────────────────────────────

console.log('\n' + '='.repeat(60));
console.log(`Test Results: ${passed} passed, ${failed} failed`);
console.log('='.repeat(60));

if (failed > 0) process.exit(1);
