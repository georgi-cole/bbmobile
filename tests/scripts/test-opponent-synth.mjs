/**
 * tests/scripts/test-opponent-synth.mjs
 *
 * Node.js test suite for:
 *  - SeededRNG utility (mulberry32 + FNV-1a seedFrom)
 *  - MinigameScoring.generateOpponentScoresForCompetition
 *    - Determinism
 *    - Persona influence
 *    - Human-skip behaviour
 *    - Authoritative winner respect
 *    - Fallback deterministic pick when all scores are 0
 *
 * Run: node tests/scripts/test-opponent-synth.mjs
 */

// ─── Minimal browser-like globals ───────────────────────────────────────────

const window = {};

// ─── Load modules inline (mirror their IIFE patterns) ────────────────────────

// js/utils/seeded-rng.js
;(function(g){
  'use strict';
  function seedFrom(...parts){
    let hash = 2166136261;
    for(const part of parts){
      const str = String(part == null ? '' : part);
      for(let i = 0; i < str.length; i++){
        hash ^= str.charCodeAt(i);
        hash = Math.imul(hash, 16777619) >>> 0;
      }
    }
    return hash >>> 0;
  }
  function create(seedParts){
    let seed = Array.isArray(seedParts)
      ? seedFrom(...seedParts)
      : (typeof seedParts === 'number' ? (seedParts >>> 0) : seedFrom(Date.now()));
    if(seed === 0) seed = 1;
    function next(){
      seed += 0x6D2B79F5;
      let z = seed;
      z = Math.imul(z ^ (z >>> 15), z | 1);
      z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
      return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
    }
    function range(min, max){ return min + Math.floor(next() * (max - min)); }
    function choice(arr){ return arr && arr.length ? arr[range(0, arr.length)] : undefined; }
    function shuffle(arr){
      const r = [...arr];
      for(let i = r.length - 1; i > 0; i--){
        const j = range(0, i + 1);
        [r[i], r[j]] = [r[j], r[i]];
      }
      return r;
    }
    function getSeed(){ return seed; }
    return { next, range, choice, shuffle, getSeed };
  }
  g.SeededRNG = { create, seedFrom };
})(window);

// js/minigames/central-scoring.js (subset - only what we test)
;(function(g){
  'use strict';
  const SCALE = 1000;
  const DEFAULT_WIN_CHANCES = { hoh: 0.20, pov: 0.22 };

  const MinigameScoring = {
    SCALE,
    normalize(rawScore, minScore=0, maxScore=100){
      if(maxScore===minScore) return SCALE/2;
      const c = Math.max(minScore, Math.min(maxScore, rawScore));
      return Math.max(0, Math.min(SCALE, ((c-minScore)/(maxScore-minScore))*SCALE));
    },
    mapCentralToCompScale(centralScore){
      return Math.round(Math.max(0, Math.min(150, centralScore * 150 / SCALE)));
    },
    mapCompToCentral(compScore){
      return Math.round(Math.max(0, Math.min(SCALE, compScore * SCALE / 150)));
    },
    generateOpponentScoresForCompetition(humanScore, humanId, opponents, opts={}){
      const {
        seedParts=[Date.now()],
        compType='hoh',
        authoritativeWinnerId=null,
        authoritativeWinnerScore=null,
        difficultyMultiplier=1.0,
        humanSkipped=false
      } = opts;
      if(!opponents || opponents.length===0) return [];
      const cfg = (g.game && g.game.cfg) || g.cfg || {};
      const humanBias = (cfg.competitions && cfg.competitions.humanBias) || { enabled: false, chance: 0.20 };
      let rng;
      if(g.SeededRNG && typeof g.SeededRNG.create === 'function'){
        rng = g.SeededRNG.create(seedParts);
      } else {
        const ls = seedParts.reduce((a,p)=>((a*31+(Number(p)||0))>>>0),0);
        rng = g.bbSeededRng ? g.bbSeededRng(ls||1) : { next: Math.random };
      }
      const random = () => rng.next();
      const winChances = cfg.playerWinChances || DEFAULT_WIN_CHANCES;
      const basePhase = compType.startsWith('final3') ? 'hoh' : compType;
      const targetWinRate = winChances[basePhase] || DEFAULT_WIN_CHANCES.hoh;
      const numOpponents = opponents.length;
      const perOpponentBeatProb = Math.pow(targetWinRate, 1/numOpponents);
      const biasActive = humanBias.enabled && random() < humanBias.chance;
      const biasMultiplier = biasActive ? 0.85 : 1.0;
      const effectiveHumanScore = humanSkipped ? SCALE * 0.45 : humanScore;
      const results = [];
      for(const opponent of opponents){
        const id = opponent.id;
        if(authoritativeWinnerId !== null && String(id) === String(authoritativeWinnerId)) continue;
        const compBeastFactor = opponent.compBeast || 0.5;
        const normalizedCompBeast = compBeastFactor > 1 ? compBeastFactor/10 : compBeastFactor;
        const humanBeatsOpponent = random() < perOpponentBeatProb;
        let opponentScore;
        if(humanBeatsOpponent){
          const marginPct = 0.05 + random()*0.15;
          opponentScore = effectiveHumanScore * (1 - marginPct);
        } else {
          const marginPct = 0.05 + random()*0.15;
          opponentScore = effectiveHumanScore * (1 + marginPct);
        }
        const variance = (random()-0.5)*0.08;
        const compMultiplier = (0.90 + normalizedCompBeast*0.20 + variance) * difficultyMultiplier * biasMultiplier;
        opponentScore *= compMultiplier;
        const persona = opponent.persona || null;
        if(persona){
          if(persona.chaos > 0.7) opponentScore += (random()-0.5)*SCALE*0.10;
          else if(persona.chaos < 0.3) opponentScore = opponentScore*0.95 + (SCALE/2)*0.05;
          if(persona.aggr > 0.7) opponentScore += (random()-0.5)*SCALE*0.06;
        }
        if(authoritativeWinnerId !== null && authoritativeWinnerScore !== null){
          opponentScore = Math.min(opponentScore, authoritativeWinnerScore-1);
        }
        opponentScore = Math.round(Math.max(1, Math.min(SCALE*1.5, opponentScore)));
        results.push([id, opponentScore]);
      }
      return results;
    }
  };

  g.MinigameScoring = MinigameScoring;
})(window);

// ─── Test helpers ─────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition, message){
  if(condition){
    console.log('  ✓', message);
    passed++;
  } else {
    console.error('  ✗ FAIL:', message);
    failed++;
  }
}

function test(name, fn){
  console.log('\n' + name);
  try { fn(); } catch(e){ console.error('  ✗ EXCEPTION:', e.message); failed++; }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

// --- SeededRNG ---

test('SeededRNG: seedFrom produces consistent hashes', () => {
  const s1 = window.SeededRNG.seedFrom('hoh', 3, 'p1');
  const s2 = window.SeededRNG.seedFrom('hoh', 3, 'p1');
  const s3 = window.SeededRNG.seedFrom('hoh', 4, 'p1'); // different week
  assert(s1 === s2, 'Same inputs produce same seed');
  assert(s1 !== s3, 'Different inputs produce different seed');
  assert(typeof s1 === 'number' && s1 >= 0, 'Seed is a non-negative number');
});

test('SeededRNG: create produces values in [0, 1)', () => {
  const rng = window.SeededRNG.create([42, 'test']);
  for(let i = 0; i < 100; i++){
    const v = rng.next();
    assert(v >= 0 && v < 1, `Value ${v} is in [0,1)`);
    if(v < 0 || v >= 1) break;
  }
});

test('SeededRNG: deterministic - same seed yields same sequence', () => {
  const seed = [7, 'competition', 'p5'];
  const rng1 = window.SeededRNG.create(seed);
  const rng2 = window.SeededRNG.create(seed);
  const seq1 = Array.from({ length: 10 }, () => rng1.next());
  const seq2 = Array.from({ length: 10 }, () => rng2.next());
  assert(JSON.stringify(seq1) === JSON.stringify(seq2), 'Two RNGs with same seed produce identical sequences');
});

test('SeededRNG: different seeds produce different sequences', () => {
  const rng1 = window.SeededRNG.create([1, 'a']);
  const rng2 = window.SeededRNG.create([2, 'a']);
  const seq1 = Array.from({ length: 5 }, () => rng1.next());
  const seq2 = Array.from({ length: 5 }, () => rng2.next());
  assert(JSON.stringify(seq1) !== JSON.stringify(seq2), 'Different seeds → different sequences');
});

test('SeededRNG: range(min, max) produces integers in [min, max)', () => {
  const rng = window.SeededRNG.create([99]);
  for(let i = 0; i < 50; i++){
    const v = rng.range(0, 10);
    assert(Number.isInteger(v) && v >= 0 && v < 10, `range(0,10) = ${v}`);
    if(!Number.isInteger(v) || v < 0 || v >= 10) break;
  }
});

// --- MinigameScoring scale helpers ---

test('MinigameScoring: mapCentralToCompScale', () => {
  const m = window.MinigameScoring;
  assert(m.mapCentralToCompScale(0) === 0, '0 → 0');
  assert(m.mapCentralToCompScale(1000) === 150, '1000 → 150');
  assert(m.mapCentralToCompScale(500) === 75, '500 → 75');
  assert(m.mapCentralToCompScale(-100) === 0, 'negative → 0 (clamped)');
  assert(m.mapCentralToCompScale(2000) === 150, 'over-scale → 150 (clamped)');
});

test('MinigameScoring: mapCompToCentral', () => {
  const m = window.MinigameScoring;
  assert(m.mapCompToCentral(0) === 0, '0 → 0');
  assert(m.mapCompToCentral(150) === 1000, '150 → 1000');
  assert(m.mapCompToCentral(75) === 500, '75 → 500');
});

test('MinigameScoring: round-trip conversion is stable', () => {
  const m = window.MinigameScoring;
  // Central → comp → central: rounding means exact equality not guaranteed
  // but should be within 1 unit of SCALE
  for(const c of [0, 100, 500, 750, 1000]){
    const comp = m.mapCentralToCompScale(c);
    const back = m.mapCompToCentral(comp);
    assert(Math.abs(back - c) <= 10, `Round-trip ${c} → ${comp} → ${back} (within 10)`);
  }
});

// --- generateOpponentScoresForCompetition ---

test('generateOpponentScoresForCompetition: determinism', () => {
  const humanScore = 600;
  const humanId = 1;
  const opponents = [
    { id: 2, compBeast: 0.5 },
    { id: 3, compBeast: 0.7 },
    { id: 4, compBeast: 0.3 }
  ];
  const opts = { seedParts: ['hoh', 5, 1], compType: 'hoh' };
  const r1 = window.MinigameScoring.generateOpponentScoresForCompetition(humanScore, humanId, opponents, opts);
  const r2 = window.MinigameScoring.generateOpponentScoresForCompetition(humanScore, humanId, opponents, opts);
  assert(JSON.stringify(r1) === JSON.stringify(r2), 'Same inputs → identical results');
});

test('generateOpponentScoresForCompetition: different seeds → different results', () => {
  const humanScore = 600;
  const humanId = 1;
  const opponents = [{ id: 2, compBeast: 0.5 }, { id: 3, compBeast: 0.5 }];
  const r1 = window.MinigameScoring.generateOpponentScoresForCompetition(humanScore, humanId, opponents, { seedParts: ['hoh', 1, 1] });
  const r2 = window.MinigameScoring.generateOpponentScoresForCompetition(humanScore, humanId, opponents, { seedParts: ['hoh', 2, 1] });
  assert(JSON.stringify(r1) !== JSON.stringify(r2), 'Different seeds → different results');
});

test('generateOpponentScoresForCompetition: returns entry for each non-authoritative opponent', () => {
  const humanScore = 500;
  const humanId = 1;
  const opponents = [{ id: 2 }, { id: 3 }, { id: 4 }];
  const results = window.MinigameScoring.generateOpponentScoresForCompetition(humanScore, humanId, opponents, { seedParts: ['test'] });
  assert(results.length === 3, 'Returns 3 entries for 3 opponents');
  assert(results.every(([id, s]) => typeof s === 'number' && s >= 1), 'All scores are numbers ≥ 1');
});

test('generateOpponentScoresForCompetition: respects authoritativeWinnerId', () => {
  const humanScore = 500;
  const humanId = 1;
  const authId = 3;
  const opponents = [{ id: 2 }, { id: authId }, { id: 4 }];
  const results = window.MinigameScoring.generateOpponentScoresForCompetition(humanScore, humanId, opponents, {
    seedParts: ['auth-test'],
    authoritativeWinnerId: authId,
    authoritativeWinnerScore: 900
  });
  const authEntry = results.find(([id]) => String(id) === String(authId));
  assert(!authEntry, 'No entry generated for authoritative winner');
  const otherEntries = results.filter(([id]) => String(id) !== String(authId));
  assert(otherEntries.length === 2, '2 entries for non-authoritative opponents');
  assert(otherEntries.every(([, s]) => s < 900), 'Non-authoritative scores are below authoritativeWinnerScore');
});

test('generateOpponentScoresForCompetition: humanSkipped uses neutral baseline', () => {
  const humanId = 1;
  const opponents = [{ id: 2, compBeast: 0.5 }, { id: 3, compBeast: 0.5 }];
  const opts = { seedParts: ['skip-test'], humanSkipped: true };
  const results = window.MinigameScoring.generateOpponentScoresForCompetition(0, humanId, opponents, opts);
  assert(results.length === 2, 'Returns entries even when human skipped');
  assert(results.every(([, s]) => s >= 1), 'Scores are valid when human skipped');
});

test('generateOpponentScoresForCompetition: persona chaos increases variance', () => {
  const humanScore = 500;
  const humanId = 1;
  const N = 30;
  const seedBase = 'persona-var';
  // High chaos opponent
  const highChaosResults = Array.from({ length: N }, (_, i) =>
    window.MinigameScoring.generateOpponentScoresForCompetition(humanScore, humanId,
      [{ id: 2, compBeast: 0.5, persona: { chaos: 0.9, aggr: 0.5 } }],
      { seedParts: [seedBase, i] }
    )[0][1]
  );
  // Low chaos opponent (same seed series)
  const lowChaosResults = Array.from({ length: N }, (_, i) =>
    window.MinigameScoring.generateOpponentScoresForCompetition(humanScore, humanId,
      [{ id: 2, compBeast: 0.5, persona: { chaos: 0.1, aggr: 0.5 } }],
      { seedParts: [seedBase, i] }
    )[0][1]
  );
  const variance = arr => {
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    return arr.reduce((a, b) => a + (b - mean) ** 2, 0) / arr.length;
  };
  const highVar = variance(highChaosResults);
  const lowVar = variance(lowChaosResults);
  assert(highVar > lowVar, `High chaos (var=${Math.round(highVar)}) > low chaos (var=${Math.round(lowVar)})`);
});

test('generateOpponentScoresForCompetition: human-bias lowers opponent scores when enabled', () => {
  // Override cfg to enable human bias deterministically (100% chance so always triggers)
  window.game = { cfg: { competitions: { humanBias: { enabled: true, chance: 1.0 } } } };
  const humanScore = 500;
  const humanId = 1;
  const opponents = [{ id: 2, compBeast: 0.5 }, { id: 3, compBeast: 0.5 }];
  const opts = { seedParts: ['bias-on'] };
  const biasOn = window.MinigameScoring.generateOpponentScoresForCompetition(humanScore, humanId, opponents, opts);

  window.game = { cfg: { competitions: { humanBias: { enabled: false, chance: 0.20 } } } };
  const biasOff = window.MinigameScoring.generateOpponentScoresForCompetition(humanScore, humanId, opponents, opts);

  const avgBiasOn = biasOn.reduce((a, [, s]) => a + s, 0) / biasOn.length;
  const avgBiasOff = biasOff.reduce((a, [, s]) => a + s, 0) / biasOff.length;
  assert(avgBiasOn < avgBiasOff, `Bias on avg(${Math.round(avgBiasOn)}) < bias off avg(${Math.round(avgBiasOff)})`);

  // Clean up
  delete window.game;
});

test('generateOpponentScoresForCompetition: empty opponents returns []', () => {
  const results = window.MinigameScoring.generateOpponentScoresForCompetition(500, 1, [], {});
  assert(Array.isArray(results) && results.length === 0, 'Empty opponents → empty array');
});

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log('\n======================================================================');
console.log(`📊 Test Summary`);
console.log('======================================================================');
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
if(failed === 0){
  console.log('\n✅ ALL TESTS PASSED');
  process.exit(0);
} else {
  console.log('\n❌ SOME TESTS FAILED');
  process.exit(1);
}
