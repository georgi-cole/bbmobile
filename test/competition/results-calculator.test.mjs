/**
 * Unit tests for ResultsCalculator
 * Tests ordering, tie resolution with seeded RNG, and handling of missing players.
 */

import { strict as assert } from 'assert';

// ── Inline the implementation so tests run without browser globals ────────

function makeRng(seed) {
  var state = (seed !== undefined && seed !== null) ? (seed >>> 0) : Math.floor(Math.random() * 4294967296);
  return function () {
    state = ((state * 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

const ResultsCalculator = {
  calculate(performances, config) {
    if (!Array.isArray(performances) || performances.length === 0) return [];

    const order = (config && config.order === 'asc') ? 'asc' : 'desc';
    const rng = makeRng(config && config.rngSeed);

    const valid = performances.filter(p => p != null && p.playerId !== undefined && p.playerId !== null);
    if (valid.length === 0) return [];

    const tagged = valid.map(p => ({ playerId: p.playerId, performance: p.performance, _r: rng() }));

    tagged.sort((a, b) => {
      const pa = (a.performance === undefined || a.performance === null) ? (order === 'desc' ? -Infinity : Infinity) : a.performance;
      const pb = (b.performance === undefined || b.performance === null) ? (order === 'desc' ? -Infinity : Infinity) : b.performance;
      if (pa !== pb) return order === 'desc' ? pb - pa : pa - pb;
      return a._r - b._r;
    });

    return tagged.map((entry, idx) => ({ playerId: entry.playerId, placement: idx + 1 }));
  }
};

// ── Test helpers ──────────────────────────────────────────────────────────

console.log('🧪 Running ResultsCalculator tests...\n');

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

test('basic descending order (higher score = better)', () => {
  const perfs = [
    { playerId: 'alice', performance: 80 },
    { playerId: 'bob',   performance: 95 },
    { playerId: 'carol', performance: 60 }
  ];
  const result = ResultsCalculator.calculate(perfs, { order: 'desc' });
  assert.equal(result.length, 3);
  assert.equal(result[0].playerId, 'bob');
  assert.equal(result[0].placement, 1);
  assert.equal(result[1].playerId, 'alice');
  assert.equal(result[1].placement, 2);
  assert.equal(result[2].playerId, 'carol');
  assert.equal(result[2].placement, 3);
});

test('ascending order (lower = better, e.g. time-based game)', () => {
  const perfs = [
    { playerId: 'alice', performance: 30 },
    { playerId: 'bob',   performance: 10 },
    { playerId: 'carol', performance: 50 }
  ];
  const result = ResultsCalculator.calculate(perfs, { order: 'asc' });
  assert.equal(result[0].playerId, 'bob');
  assert.equal(result[0].placement, 1);
  assert.equal(result[2].playerId, 'carol');
  assert.equal(result[2].placement, 3);
});

test('tie resolution is deterministic with a seed', () => {
  const perfs = [
    { playerId: 'p1', performance: 50 },
    { playerId: 'p2', performance: 50 },
    { playerId: 'p3', performance: 50 }
  ];
  const r1 = ResultsCalculator.calculate(perfs, { rngSeed: 42 });
  const r2 = ResultsCalculator.calculate(perfs, { rngSeed: 42 });

  // Both calls with the same seed must produce identical ordering
  assert.deepEqual(
    r1.map(e => e.playerId),
    r2.map(e => e.playerId)
  );
  // All must receive placements 1, 2, 3
  const placements = r1.map(e => e.placement).sort((a, b) => a - b);
  assert.deepEqual(placements, [1, 2, 3]);
});

test('different seeds produce potentially different orderings for tied players', () => {
  const perfs = [
    { playerId: 'p1', performance: 50 },
    { playerId: 'p2', performance: 50 },
    { playerId: 'p3', performance: 50 }
  ];
  const orders = new Set();
  for (let seed = 0; seed < 50; seed++) {
    const r = ResultsCalculator.calculate(perfs, { rngSeed: seed });
    orders.add(r.map(e => e.playerId).join(','));
  }
  // With 50 seeds we should see more than one ordering
  assert.ok(orders.size > 1, `Expected >1 unique orderings across seeds, got ${orders.size}`);
});

test('non-tied players retain correct relative placement regardless of tie-breaking', () => {
  const perfs = [
    { playerId: 'winner', performance: 100 },
    { playerId: 'tied1',  performance: 50  },
    { playerId: 'tied2',  performance: 50  },
    { playerId: 'loser',  performance: 10  }
  ];
  for (let seed = 0; seed < 20; seed++) {
    const r = ResultsCalculator.calculate(perfs, { rngSeed: seed });
    const byId = Object.fromEntries(r.map(e => [e.playerId, e.placement]));
    assert.equal(byId['winner'], 1, `seed ${seed}: winner must be #1`);
    assert.equal(byId['loser'],  4, `seed ${seed}: loser must be #4`);
    // tied1 and tied2 must be 2 or 3
    assert.ok([2, 3].includes(byId['tied1']), `seed ${seed}: tied1 must be #2 or #3`);
    assert.ok([2, 3].includes(byId['tied2']), `seed ${seed}: tied2 must be #2 or #3`);
  }
});

test('empty input returns empty array', () => {
  assert.deepEqual(ResultsCalculator.calculate([], {}), []);
});

test('null/undefined input returns empty array', () => {
  assert.deepEqual(ResultsCalculator.calculate(null, {}), []);
  assert.deepEqual(ResultsCalculator.calculate(undefined, {}), []);
});

test('players with null/undefined performance are placed last (desc)', () => {
  const perfs = [
    { playerId: 'good', performance: 70 },
    { playerId: 'dnf',  performance: null }
  ];
  const r = ResultsCalculator.calculate(perfs, { order: 'desc' });
  assert.equal(r.find(e => e.playerId === 'good').placement, 1);
  assert.equal(r.find(e => e.playerId === 'dnf').placement,  2);
});

test('players with null/undefined performance are placed last (asc)', () => {
  const perfs = [
    { playerId: 'good', performance: 10 },
    { playerId: 'dnf',  performance: undefined }
  ];
  const r = ResultsCalculator.calculate(perfs, { order: 'asc' });
  assert.equal(r.find(e => e.playerId === 'good').placement, 1);
  assert.equal(r.find(e => e.playerId === 'dnf').placement,  2);
});

test('filters out entries with null playerId', () => {
  const perfs = [
    { playerId: 'real', performance: 80 },
    { playerId: null,   performance: 90 }
  ];
  const r = ResultsCalculator.calculate(perfs, {});
  assert.equal(r.length, 1);
  assert.equal(r[0].playerId, 'real');
});

test('single player gets placement 1', () => {
  const r = ResultsCalculator.calculate([{ playerId: 'solo', performance: 42 }], {});
  assert.equal(r.length, 1);
  assert.equal(r[0].placement, 1);
});

// ── Summary ───────────────────────────────────────────────────────────────

console.log('\n' + '='.repeat(60));
console.log(`Test Results: ${passed} passed, ${failed} failed`);
console.log('='.repeat(60));

if (failed > 0) process.exit(1);
