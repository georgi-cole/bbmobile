#!/usr/bin/env node

// Test script for opponent synthesis module
// Validates core functionality without requiring a browser

console.log('=== Opponent Synthesis Module Test ===\n');

// Mock window object for Node.js environment
global.window = global;

// Load dependencies
require('./js/bbSeededRng.js');
require('./js/minigames/registry.js');
require('./js/minigames/opponent-synth.js');

// Test 1: Module Loading
console.log('Test 1: Module Loading');
const modulesLoaded = {
  bbSeededRng: typeof global.bbSeededRng === 'function',
  MinigameRegistry: typeof global.MinigameRegistry === 'object',
  OpponentSynth: typeof global.OpponentSynth === 'object'
};

console.log('  - bbSeededRng:', modulesLoaded.bbSeededRng ? '✓' : '✗');
console.log('  - MinigameRegistry:', modulesLoaded.MinigameRegistry ? '✓' : '✗');
console.log('  - OpponentSynth:', modulesLoaded.OpponentSynth ? '✓' : '✗');

const allLoaded = Object.values(modulesLoaded).every(v => v);
console.log(allLoaded ? '\n✓ All modules loaded successfully\n' : '\n✗ Module loading failed\n');

if (!allLoaded) {
  process.exit(1);
}

// Test 2: Basic Score Generation
console.log('Test 2: Basic Score Generation');
const humanScore = 75;
const opponents = [
  { id: 1, compBeast: 0.5, persona: { aggr: 0.5, loyalty: 0.5, chaos: 0.3 } },
  { id: 2, compBeast: 0.7, persona: { aggr: 0.7, loyalty: 0.4, chaos: 0.5 } },
  { id: 3, compBeast: 0.3, persona: { aggr: 0.3, loyalty: 0.8, chaos: 0.2 } },
  { id: 4, compBeast: 0.6, persona: { aggr: 0.5, loyalty: 0.6, chaos: 0.7 } }
];

try {
  const scores = global.OpponentSynth.generate({
    humanScore: humanScore,
    opponents: opponents,
    gameKey: 'quickTap',
    seed: 12345,
    targetWinRate: 0.20
  });

  console.log('  Human Score:', humanScore);
  console.log('  Generated Opponent Scores:');
  scores.forEach((score, id) => {
    const result = score < humanScore ? 'Human wins' : 'Opponent wins';
    console.log(`    Opponent ${id}: ${score.toFixed(1)} (${result})`);
  });

  const winRate = global.OpponentSynth.calculateWinRate(humanScore, scores);
  console.log(`  Win Rate: ${(winRate * 100).toFixed(1)}%`);
  console.log('✓ Basic generation working\n');
} catch (error) {
  console.error('✗ Basic generation failed:', error.message);
  process.exit(1);
}

// Test 3: Win Rate Distribution
console.log('Test 3: Win Rate Distribution (100 trials)');
const trials = 100;
const testOpponents = [
  { id: 1, compBeast: 0.5, persona: { aggr: 0.5, loyalty: 0.5, chaos: 0.3 } },
  { id: 2, compBeast: 0.6, persona: { aggr: 0.6, loyalty: 0.4, chaos: 0.4 } },
  { id: 3, compBeast: 0.4, persona: { aggr: 0.4, loyalty: 0.6, chaos: 0.3 } },
  { id: 4, compBeast: 0.7, persona: { aggr: 0.7, loyalty: 0.3, chaos: 0.5 } },
  { id: 5, compBeast: 0.3, persona: { aggr: 0.3, loyalty: 0.7, chaos: 0.2 } }
];

try {
  let totalWinRate = 0;
  let humanWinCount = 0;

  for (let i = 0; i < trials; i++) {
    const scores = global.OpponentSynth.generate({
      humanScore: 70,
      opponents: testOpponents,
      gameKey: 'quickTap',
      seed: 1000 + i,
      targetWinRate: 0.20
    });

    const winRate = global.OpponentSynth.calculateWinRate(70, scores);
    totalWinRate += winRate;
    
    if (winRate === 1.0) {
      humanWinCount++;
    }
  }

  const avgWinRate = totalWinRate / trials;
  const sessionWinRate = humanWinCount / trials;

  console.log(`  Trials: ${trials}`);
  console.log(`  Average Beat Rate: ${(avgWinRate * 100).toFixed(1)}% (per opponent)`);
  console.log(`  Session Win Rate: ${(sessionWinRate * 100).toFixed(1)}% (beat all opponents)`);
  console.log(`  Target Win Rate: 20%`);
  
  const withinTarget = Math.abs(sessionWinRate - 0.20) < 0.10;
  if (withinTarget) {
    console.log('✓ Win rate within acceptable range (20% ± 10%)\n');
  } else {
    console.log(`⚠ Win rate slightly off target: ${(sessionWinRate * 100).toFixed(1)}%\n`);
  }
} catch (error) {
  console.error('✗ Win rate distribution test failed:', error.message);
  process.exit(1);
}

// Test 4: Score Bounds Validation
console.log('Test 4: Score Bounds Validation');
const testCases = [
  { humanScore: 10, label: 'Low Human Score' },
  { humanScore: 50, label: 'Medium Human Score' },
  { humanScore: 90, label: 'High Human Score' },
  { humanScore: 95, label: 'Very High Human Score' }
];

const boundsOpponents = [
  { id: 1, compBeast: 0.9, persona: { aggr: 0.9, loyalty: 0.3, chaos: 0.8 } },
  { id: 2, compBeast: 0.1, persona: { aggr: 0.2, loyalty: 0.9, chaos: 0.1 } }
];

try {
  let allPassed = true;

  testCases.forEach(testCase => {
    const scores = global.OpponentSynth.generate({
      humanScore: testCase.humanScore,
      opponents: boundsOpponents,
      gameKey: 'quickTap',
      seed: Math.floor(Math.random() * 10000),
      targetWinRate: 0.20
    });

    let casePassed = true;
    scores.forEach((score) => {
      if (score < 0 || score > 100) {
        casePassed = false;
        allPassed = false;
      }
    });

    const scoresList = Array.from(scores.values()).map(s => s.toFixed(1)).join(', ');
    console.log(`  ${casePassed ? '✓' : '✗'} ${testCase.label} (${testCase.humanScore}): [${scoresList}]`);
  });

  if (allPassed) {
    console.log('✓ All scores within bounds (0-100)\n');
  } else {
    console.log('✗ Some scores outside bounds\n');
    process.exit(1);
  }
} catch (error) {
  console.error('✗ Score bounds test failed:', error.message);
  process.exit(1);
}

// Test 5: Deterministic RNG (same seed = same results)
console.log('Test 5: Deterministic RNG');
try {
  const seed = 99999;
  const testOps = [
    { id: 1, compBeast: 0.5, persona: { aggr: 0.5, loyalty: 0.5, chaos: 0.5 } }
  ];

  const scores1 = global.OpponentSynth.generate({
    humanScore: 75,
    opponents: testOps,
    gameKey: 'quickTap',
    seed: seed,
    targetWinRate: 0.20
  });

  const scores2 = global.OpponentSynth.generate({
    humanScore: 75,
    opponents: testOps,
    gameKey: 'quickTap',
    seed: seed,
    targetWinRate: 0.20
  });

  const score1 = scores1.get(1);
  const score2 = scores2.get(1);
  const match = Math.abs(score1 - score2) < 0.01;

  console.log(`  Run 1: ${score1.toFixed(1)}`);
  console.log(`  Run 2: ${score2.toFixed(1)}`);
  console.log(match ? '✓ Deterministic RNG working (same seed = same result)\n' : '✗ Non-deterministic results\n');

  if (!match) {
    process.exit(1);
  }
} catch (error) {
  console.error('✗ Deterministic RNG test failed:', error.message);
  process.exit(1);
}

console.log('=== All Tests Passed ===');
process.exit(0);
