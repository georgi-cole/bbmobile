/**
 * tests/scripts/test-score-pipeline-v2.mjs
 *
 * Node.js unit-test suite for Score Pipeline v2:
 *  - ScorePipeline.normalizeScore() — all GAME_TYPES
 *  - ScorePipeline.toDisplayScore() — conversion and edge cases
 *  - ScorePipeline.generateCompetitionScores() — determinism, authoritativeWinner
 *  - ScorePipeline.buildStandings() — sorting, endurance flag, maxResults
 *
 * Run: node tests/scripts/test-score-pipeline-v2.mjs
 */

// ─── Minimal browser-like globals ───────────────────────────────────────────

const window = {};

// ─── Load dependencies inline ────────────────────────────────────────────────

// SeededRNG (mirrors js/utils/seeded-rng.js)
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
    return { next, range, choice, shuffle };
  }
  g.SeededRNG = { create, seedFrom };
})(window);

// MinigameScoring (mirrors js/minigames/central-scoring.js — subset)
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
    normalizeTime(timeMs, targetTimeMs=1000, maxTimeMs=5000){
      if(timeMs <= targetTimeMs) return SCALE;
      if(timeMs >= maxTimeMs) return Math.round(SCALE*0.20);
      const k = Math.log(SCALE/(SCALE*0.20))/(maxTimeMs-targetTimeMs);
      return Math.round(Math.max(SCALE*0.20, Math.min(SCALE, SCALE*Math.exp(-k*(timeMs-targetTimeMs)))));
    },
    normalizeAccuracy(correct, total, penalize=false, incorrect=0){
      if(total===0) return 0;
      let base = (correct/total)*SCALE;
      if(penalize && incorrect>0) base = Math.max(0, base-(incorrect/total)*SCALE*0.20);
      return Math.round(Math.max(0, Math.min(SCALE, base)));
    },
    normalizeHybrid({correct, total, timeMs, targetTimeMs=1000, accuracyWeight=0.6}){
      const acc = this.normalizeAccuracy(correct, total);
      const t   = this.normalizeTime(timeMs, targetTimeMs*total, targetTimeMs*total*2);
      return Math.round(Math.max(0, Math.min(SCALE, acc*accuracyWeight + t*(1-accuracyWeight))));
    },
    normalizeEndurance(durationMs, targetDurationMs=30000, minDurationMs=1000){
      if(durationMs<=minDurationMs) return Math.round(Math.max(0,(durationMs/minDurationMs)*SCALE*0.10));
      if(durationMs>=targetDurationMs) return SCALE;
      const progress = (durationMs-minDurationMs)/(targetDurationMs-minDurationMs);
      return Math.round(Math.max(0, Math.min(SCALE, SCALE*0.10 + progress*(SCALE*0.90))));
    },
    mapCentralToCompScale(c){ return Math.round(Math.max(0, Math.min(150, c*150/SCALE))); },
    mapCompToCentral(c){ return Math.round(Math.max(0, Math.min(SCALE, c*SCALE/150))); },
    generateOpponentScoresForCompetition(humanScore, humanId, opponents, opts={}){
      const { seedParts=[Date.now()], compType='hoh', authoritativeWinnerId=null,
              authoritativeWinnerScore=null, difficultyMultiplier=1.0, humanSkipped=false } = opts;
      if(!opponents||opponents.length===0) return [];
      const cfg = (g.game&&g.game.cfg)||g.cfg||{};
      const humanBias = (cfg.competitions&&cfg.competitions.humanBias)||{enabled:false,chance:0.20};
      const rng = g.SeededRNG ? g.SeededRNG.create(seedParts) : {next:Math.random};
      const random = ()=>rng.next();
      const wc = cfg.playerWinChances||DEFAULT_WIN_CHANCES;
      const base = compType.startsWith('final3')?'hoh':compType;
      const twr = wc[base]||DEFAULT_WIN_CHANCES.hoh;
      const perP = Math.pow(twr,1/opponents.length);
      const biasActive = humanBias.enabled && random()<humanBias.chance;
      const biasMult = biasActive?0.85:1.0;
      const effHuman = humanSkipped?SCALE*0.45:humanScore;
      const results=[];
      for(const opp of opponents){
        const id=opp.id;
        if(authoritativeWinnerId!==null&&String(id)===String(authoritativeWinnerId)) continue;
        const cb = opp.compBeast||0.5;
        const ncb = cb>1?cb/10:cb;
        const hbo = random()<perP;
        let os;
        if(hbo){ const m=0.05+random()*0.15; os=effHuman*(1-m); }
        else   { const m=0.05+random()*0.15; os=effHuman*(1+m); }
        const v=(random()-0.5)*0.08;
        os*=(0.90+ncb*0.20+v)*difficultyMultiplier*biasMult;
        const persona=opp.persona||null;
        if(persona){
          if(persona.chaos>0.7) os+=(random()-0.5)*SCALE*0.10;
          else if(persona.chaos<0.3) os=os*0.95+(SCALE/2)*0.05;
          if(persona.aggr>0.7) os+=(random()-0.5)*SCALE*0.06;
        }
        if(authoritativeWinnerId!==null&&authoritativeWinnerScore!==null) os=Math.min(os,authoritativeWinnerScore-1);
        results.push([id, Math.round(Math.max(1,Math.min(SCALE*1.5,os)))]);
      }
      return results;
    }
  };
  g.MinigameScoring = MinigameScoring;
})(window);

// ScorePipeline (mirrors js/minigames/score-pipeline.js)
;(function(g){
  'use strict';
  const INTERNAL_SCALE = 1000;
  const DISPLAY_SCALE  = 100.0;
  const GAME_TYPES = { ACCURACY:'accuracy', TIME:'time', HYBRID:'hybrid', ENDURANCE:'endurance' };

  function makeCompSeed(compType, week, humanId){
    if(g.SeededRNG&&typeof g.SeededRNG.seedFrom==='function') return [g.SeededRNG.seedFrom(compType,week,humanId)];
    const gGame=g.game||{};
    return [String(compType),String(week||gGame.week||1),String(humanId!=null?humanId:(gGame.humanId!=null?gGame.humanId:0))];
  }

  const ScorePipeline = {
    INTERNAL_SCALE, DISPLAY_SCALE, GAME_TYPES,
    normalizeScore(raw, gameConfig){
      const cfg=gameConfig||{};
      const ms=g.MinigameScoring;
      const type=cfg.scoring||cfg.type||GAME_TYPES.ACCURACY;
      if(type===GAME_TYPES.ENDURANCE){
        if(ms&&ms.normalizeEndurance) return ms.normalizeEndurance(raw,cfg.targetDurationMs,cfg.minDurationMs);
        const t=cfg.targetDurationMs||30000;
        return Math.round((Math.max(0,Math.min(t,raw||0))/t)*INTERNAL_SCALE);
      }
      if(type===GAME_TYPES.TIME){
        if(ms&&ms.normalizeTime) return ms.normalizeTime(raw,cfg.targetTimeMs,cfg.maxTimeMs);
        return INTERNAL_SCALE;
      }
      if(type===GAME_TYPES.HYBRID){
        if(ms&&ms.normalizeHybrid){
          const p=(raw&&typeof raw==='object')?raw:{};
          return ms.normalizeHybrid(Object.assign({targetTimeMs:cfg.targetTimeMs,accuracyWeight:cfg.accuracyWeight},p));
        }
        return Math.round(INTERNAL_SCALE/2);
      }
      const minScore=cfg.minScore!==undefined?cfg.minScore:0;
      const maxScore=cfg.maxScore!==undefined?cfg.maxScore:100;
      if(ms&&ms.normalize) return ms.normalize(raw,minScore,maxScore);
      if(maxScore===minScore) return Math.round(INTERNAL_SCALE/2);
      const cl=Math.max(minScore,Math.min(maxScore,raw||0));
      return Math.round(((cl-minScore)/(maxScore-minScore))*INTERNAL_SCALE);
    },
    toDisplayScore(internalScore){
      const c=Math.max(0,Math.min(INTERNAL_SCALE,internalScore||0));
      return Math.round(c/INTERNAL_SCALE*DISPLAY_SCALE*10)/10;
    },
    generateCompetitionScores(params){
      const ms=g.MinigameScoring;
      if(!ms||typeof ms.generateOpponentScoresForCompetition!=='function') return [];
      const p=params||{};
      const gGame=g.game||{};
      const seedParts=p.seedParts||makeCompSeed(p.compType||'hoh',gGame.week,gGame.humanId);
      return ms.generateOpponentScoresForCompetition(p.humanScore||0, p.humanId, p.opponents||[], {
        seedParts,
        compType:p.compType||'hoh',
        authoritativeWinnerId:p.authoritativeWinnerId!=null?p.authoritativeWinnerId:null,
        authoritativeWinnerScore:p.authoritativeWinnerScore!=null?p.authoritativeWinnerScore:null,
        difficultyMultiplier:p.difficultyMultiplier!=null?p.difficultyMultiplier:1.0,
        humanSkipped:!!p.humanSkipped
      });
    },
    buildStandings(scoresMap, opts){
      const options=opts||{};
      let entries;
      if(scoresMap instanceof Map) entries=[...scoresMap.entries()];
      else entries=Object.keys(scoresMap||{}).map(k=>[k,+(scoresMap[k])]);
      entries.sort((a,b)=>b[1]-a[1]);
      const limit=options.maxResults?Math.min(options.maxResults,entries.length):entries.length;
      const standings=[];
      for(let i=0;i<limit;i++){
        const [id,score]=entries[i];
        standings.push({rank:i+1,id,score,displayScore:(options.endurance&&i>0)?0:this.toDisplayScore(score)});
      }
      return standings;
    }
  };
  g.ScorePipeline = ScorePipeline;
  g.MinigameScoring = g.MinigameScoring || ScorePipeline;
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
  try { fn(); } catch(e){ console.error('  ✗ EXCEPTION:', e.message, e.stack); failed++; }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

const SP = window.ScorePipeline;

// === Constants ===

test('Constants: INTERNAL_SCALE, DISPLAY_SCALE, GAME_TYPES exported', () => {
  assert(SP.INTERNAL_SCALE === 1000, 'INTERNAL_SCALE is 1000');
  assert(SP.DISPLAY_SCALE === 100.0, 'DISPLAY_SCALE is 100.0');
  assert(SP.GAME_TYPES.ACCURACY === 'accuracy', 'GAME_TYPES.ACCURACY');
  assert(SP.GAME_TYPES.TIME === 'time', 'GAME_TYPES.TIME');
  assert(SP.GAME_TYPES.HYBRID === 'hybrid', 'GAME_TYPES.HYBRID');
  assert(SP.GAME_TYPES.ENDURANCE === 'endurance', 'GAME_TYPES.ENDURANCE');
});

// === normalizeScore ===

test('normalizeScore: accuracy type — linear mapping', () => {
  assert(SP.normalizeScore(0,   { scoring: 'accuracy', minScore: 0, maxScore: 100 }) === 0,    '0 → 0');
  assert(SP.normalizeScore(100, { scoring: 'accuracy', minScore: 0, maxScore: 100 }) === 1000,  '100 → 1000');
  assert(SP.normalizeScore(50,  { scoring: 'accuracy', minScore: 0, maxScore: 100 }) === 500,   '50 → 500');
  assert(SP.normalizeScore(75,  { scoring: 'accuracy', minScore: 0, maxScore: 100 }) === 750,   '75 → 750');
});

test('normalizeScore: accuracy type — clamping', () => {
  assert(SP.normalizeScore(-10, { scoring: 'accuracy', minScore: 0, maxScore: 100 }) === 0,   'negative clamped to 0');
  assert(SP.normalizeScore(200, { scoring: 'accuracy', minScore: 0, maxScore: 100 }) === 1000, 'over-max clamped to 1000');
});

test('normalizeScore: accuracy type — custom min/max', () => {
  const s = SP.normalizeScore(15, { scoring: 'accuracy', minScore: 10, maxScore: 20 });
  assert(s === 500, 'midpoint of [10,20] → 500');
});

test('normalizeScore: time type — fast time yields high score', () => {
  const perfect = SP.normalizeScore(500, { scoring: 'time', targetTimeMs: 1000, maxTimeMs: 5000 });
  assert(perfect === 1000, 'time ≤ target → 1000');
  const slow = SP.normalizeScore(5000, { scoring: 'time', targetTimeMs: 1000, maxTimeMs: 5000 });
  assert(slow <= 250, 'max time → low score (≤250)');
});

test('normalizeScore: endurance type — longer is better', () => {
  const full = SP.normalizeScore(30000, { scoring: 'endurance', targetDurationMs: 30000, minDurationMs: 1000 });
  assert(full === 1000, 'full duration → 1000');
  const half = SP.normalizeScore(15500, { scoring: 'endurance', targetDurationMs: 30000, minDurationMs: 1000 });
  assert(half > 0 && half < 1000, 'partial duration is 0-1000: ' + half);
});

test('normalizeScore: hybrid type — combined accuracy + time', () => {
  const s = SP.normalizeScore({ correct: 10, total: 10, timeMs: 1000 }, {
    scoring: 'hybrid', targetTimeMs: 100, accuracyWeight: 0.6
  });
  assert(typeof s === 'number' && s >= 0 && s <= 1000, 'hybrid score in 0-1000: ' + s);
});

test('normalizeScore: default config (no config arg) uses accuracy', () => {
  const s = SP.normalizeScore(50); // no gameConfig
  assert(typeof s === 'number' && s >= 0 && s <= 1000, 'returns number in 0-1000');
});

// === toDisplayScore ===

test('toDisplayScore: boundary values', () => {
  assert(SP.toDisplayScore(0)    === 0,   '0 → 0.0');
  assert(SP.toDisplayScore(1000) === 100, '1000 → 100.0');
  assert(SP.toDisplayScore(500)  === 50,  '500 → 50.0');
});

test('toDisplayScore: 1 decimal precision', () => {
  const d = SP.toDisplayScore(873);
  assert(d === 87.3, '873 → 87.3 (got ' + d + ')');
});

test('toDisplayScore: clamping', () => {
  assert(SP.toDisplayScore(-100) === 0,   'negative → 0.0');
  assert(SP.toDisplayScore(9999) === 100, 'over-scale → 100.0');
});

test('toDisplayScore: null/undefined defaults to 0', () => {
  assert(SP.toDisplayScore(null)      === 0, 'null → 0.0');
  assert(SP.toDisplayScore(undefined) === 0, 'undefined → 0.0');
});

test('toDisplayScore: round-trip with normalizeScore', () => {
  for(const raw of [0, 25, 50, 75, 100]){
    const internal = SP.normalizeScore(raw, { scoring: 'accuracy', minScore: 0, maxScore: 100 });
    const display  = SP.toDisplayScore(internal);
    assert(display >= 0 && display <= 100, `raw=${raw} → internal=${internal} → display=${display}`);
  }
});

// === generateCompetitionScores ===

test('generateCompetitionScores: determinism — same seed yields same results', () => {
  const opts = { humanScore: 600, humanId: 1, opponents: [{ id: 2 }, { id: 3 }], seedParts: ['hoh', 5, 1], compType: 'hoh' };
  const r1 = SP.generateCompetitionScores(opts);
  const r2 = SP.generateCompetitionScores(opts);
  assert(JSON.stringify(r1) === JSON.stringify(r2), 'deterministic output');
});

test('generateCompetitionScores: different seeds → different results', () => {
  const base = { humanScore: 600, humanId: 1, opponents: [{ id: 2 }, { id: 3 }], compType: 'hoh' };
  const r1 = SP.generateCompetitionScores({ ...base, seedParts: ['hoh', 1] });
  const r2 = SP.generateCompetitionScores({ ...base, seedParts: ['hoh', 2] });
  assert(JSON.stringify(r1) !== JSON.stringify(r2), 'different seeds → different results');
});

test('generateCompetitionScores: returns entry for each opponent', () => {
  const results = SP.generateCompetitionScores({
    humanScore: 500, humanId: 1,
    opponents: [{ id: 2 }, { id: 3 }, { id: 4 }],
    seedParts: ['test']
  });
  assert(results.length === 3, '3 opponents → 3 entries');
  assert(results.every(([, s]) => typeof s === 'number' && s >= 1), 'all scores ≥ 1');
});

test('generateCompetitionScores: authoritativeWinnerId is skipped and others capped', () => {
  const authId = 3;
  const results = SP.generateCompetitionScores({
    humanScore: 500, humanId: 1,
    opponents: [{ id: 2 }, { id: authId }, { id: 4 }],
    authoritativeWinnerId: authId,
    authoritativeWinnerScore: 900,
    seedParts: ['auth-test']
  });
  const authEntry = results.find(([id]) => String(id) === String(authId));
  assert(!authEntry, 'no entry for authoritative winner');
  assert(results.length === 2, '2 entries for non-authoritative opponents');
  assert(results.every(([, s]) => s < 900), 'non-auth scores < authoritativeWinnerScore');
});

test('generateCompetitionScores: humanSkipped uses neutral baseline', () => {
  const results = SP.generateCompetitionScores({
    humanScore: 0, humanId: 1,
    opponents: [{ id: 2 }, { id: 3 }],
    humanSkipped: true, seedParts: ['skip']
  });
  assert(results.length === 2, 'still generates opponent scores when human skipped');
  assert(results.every(([, s]) => s >= 1), 'scores are valid');
});

test('generateCompetitionScores: empty opponents returns []', () => {
  const results = SP.generateCompetitionScores({ humanScore: 500, humanId: 1, opponents: [] });
  assert(Array.isArray(results) && results.length === 0, 'empty opponents → []');
});

// === buildStandings ===

test('buildStandings: sorts by score descending', () => {
  const map = new Map([[1, 400], [2, 700], [3, 550]]);
  const standings = SP.buildStandings(map);
  assert(standings[0].id === 2, 'rank 1 is id=2 (700)');
  assert(standings[1].id === 3, 'rank 2 is id=3 (550)');
  assert(standings[2].id === 1, 'rank 3 is id=1 (400)');
  assert(standings[0].rank === 1, 'rank field is 1');
  assert(standings[2].rank === 3, 'rank field is 3');
});

test('buildStandings: displayScore is correct', () => {
  const map = new Map([[1, 873]]);
  const s = SP.buildStandings(map);
  assert(s[0].displayScore === 87.3, 'displayScore 873 → 87.3');
});

test('buildStandings: maxResults limits output', () => {
  const map = new Map([[1, 100], [2, 200], [3, 300]]);
  const s = SP.buildStandings(map, { maxResults: 2 });
  assert(s.length === 2, 'maxResults=2 returns 2 entries');
  assert(s[0].score === 300, 'first entry is highest');
});

test('buildStandings: endurance flag zeroes non-winner displayScores', () => {
  const map = new Map([[1, 800], [2, 0], [3, 0]]);
  const s = SP.buildStandings(map, { endurance: true });
  assert(s[0].displayScore === 80,  'winner gets real display score');
  assert(s[1].displayScore === 0,   'non-winner displayScore is 0');
  assert(s[2].displayScore === 0,   'non-winner displayScore is 0');
});

test('buildStandings: plain object input', () => {
  const obj = { a: 300, b: 700, c: 500 };
  const s = SP.buildStandings(obj);
  assert(s[0].id === 'b', 'highest id=b');
  assert(s.length === 3, '3 entries');
});

test('buildStandings: empty map returns []', () => {
  const s = SP.buildStandings(new Map());
  assert(Array.isArray(s) && s.length === 0, 'empty map → []');
});

// === Backward compat alias ===

test('window.MinigameScoring is set (compat alias)', () => {
  assert(typeof window.MinigameScoring !== 'undefined', 'MinigameScoring is defined');
  assert(typeof window.MinigameScoring.normalizeScore === 'function' ||
         typeof window.MinigameScoring.normalize === 'function', 'has normalizeScore or normalize method');
});

test('window.ScorePipeline is exported', () => {
  assert(window.ScorePipeline === SP, 'ScorePipeline is exported on window');
});

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log('\n======================================================================');
console.log('📊 Score Pipeline v2 Test Summary');
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
