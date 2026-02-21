/**
 * Unit tests for AIPlayer
 * Checks distribution stability and seeded determinism.
 */

import { strict as assert } from 'assert';

// ── Inline implementation ─────────────────────────────────────────────────

function makeRng(seed) {
  var state = (seed !== undefined && seed !== null) ? (seed >>> 0) : Math.floor(Math.random() * 4294967296);
  return function () {
    state = ((state * 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function normalApprox(rng, mean, sigma) {
  var sum = 0;
  for (var i = 0; i < 6; i++) sum += rng();
  var z = (sum - 3) / 0.707;
  return mean + z * sigma;
}

const DIFFICULTY_PROFILES = {
  easy:   { mean: 75, sigma: 10 },
  medium: { mean: 55, sigma: 15 },
  hard:   { mean: 35, sigma: 12 }
};

function hashId(id) {
  var str = String(id);
  var h = 0;
  for (var i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return (h >>> 0);
}

const AIPlayer = {
  generatePerformance(options) {
    const opts = options || {};
    const playerId = opts.playerId !== undefined ? opts.playerId : ('ai_' + Math.floor(Math.random() * 10000));
    const difficulty = DIFFICULTY_PROFILES[opts.difficulty] || DIFFICULTY_PROFILES.medium;
    const rng = makeRng(opts.rngSeed);
    const raw = normalApprox(rng, difficulty.mean, difficulty.sigma);
    const performance = Math.max(0, Math.min(100, Math.round(raw)));
    return { playerId, performance };
  },

  generatePerformances(playerIds, options) {
    const opts = options || {};
    if (!Array.isArray(playerIds) || playerIds.length === 0) return [];
    return playerIds.map(id => {
      const playerSeed = (opts.rngSeed !== undefined && opts.rngSeed !== null)
        ? (opts.rngSeed ^ hashId(id))
        : undefined;
      return AIPlayer.generatePerformance({ playerId: id, difficulty: opts.difficulty, rngSeed: playerSeed });
    });
  }
};

// ── Test helpers ──────────────────────────────────────────────────────────

console.log('🧪 Running AIPlayer tests...\n');

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

test('generatePerformance returns playerId and numeric performance', () => {
  const result = AIPlayer.generatePerformance({ playerId: 'ai1', rngSeed: 1 });
  assert.equal(result.playerId, 'ai1');
  assert.equal(typeof result.performance, 'number');
});

test('performance is clamped to [0, 100]', () => {
  for (let seed = 0; seed < 200; seed++) {
    const { performance } = AIPlayer.generatePerformance({ playerId: 'p', rngSeed: seed });
    assert.ok(performance >= 0 && performance <= 100,
      `performance ${performance} out of range [0,100] at seed ${seed}`);
  }
});

test('seeded output is deterministic', () => {
  const r1 = AIPlayer.generatePerformance({ playerId: 'bot', rngSeed: 99 });
  const r2 = AIPlayer.generatePerformance({ playerId: 'bot', rngSeed: 99 });
  assert.equal(r1.performance, r2.performance);
});

test('different seeds produce varied performance values', () => {
  const values = new Set();
  for (let seed = 0; seed < 100; seed++) {
    values.add(AIPlayer.generatePerformance({ playerId: 'p', rngSeed: seed }).performance);
  }
  assert.ok(values.size > 10, `Expected >10 distinct values across 100 seeds, got ${values.size}`);
});

test('easy difficulty has higher average than hard', () => {
  const N = 200;
  let easySum = 0, hardSum = 0;
  for (let s = 0; s < N; s++) {
    easySum += AIPlayer.generatePerformance({ playerId: 'p', difficulty: 'easy', rngSeed: s }).performance;
    hardSum += AIPlayer.generatePerformance({ playerId: 'p', difficulty: 'hard', rngSeed: s }).performance;
  }
  assert.ok(easySum / N > hardSum / N,
    `Easy avg (${(easySum/N).toFixed(1)}) should be > hard avg (${(hardSum/N).toFixed(1)})`);
});

test('generatePerformances returns one entry per player', () => {
  const ids = ['a', 'b', 'c', 'd'];
  const results = AIPlayer.generatePerformances(ids, { rngSeed: 7 });
  assert.equal(results.length, 4);
  const returnedIds = results.map(r => r.playerId);
  assert.deepEqual(returnedIds, ids);
});

test('generatePerformances is deterministic with seed', () => {
  const ids = ['x', 'y', 'z'];
  const r1 = AIPlayer.generatePerformances(ids, { rngSeed: 123 });
  const r2 = AIPlayer.generatePerformances(ids, { rngSeed: 123 });
  assert.deepEqual(r1.map(r => r.performance), r2.map(r => r.performance));
});

test('generatePerformances with empty array returns empty', () => {
  assert.deepEqual(AIPlayer.generatePerformances([], { rngSeed: 1 }), []);
});

test('result objects do NOT include a raw performance key named score', () => {
  // The stored result should use "performance" (transient), not "score"
  const result = AIPlayer.generatePerformance({ playerId: 'p1', rngSeed: 5 });
  assert.ok(!Object.prototype.hasOwnProperty.call(result, 'score'),
    'Result must not expose a "score" field');
  assert.ok(Object.prototype.hasOwnProperty.call(result, 'performance'),
    'Result must expose "performance" field');
});

// ── Summary ───────────────────────────────────────────────────────────────

console.log('\n' + '='.repeat(60));
console.log(`Test Results: ${passed} passed, ${failed} failed`);
console.log('='.repeat(60));

if (failed > 0) process.exit(1);
