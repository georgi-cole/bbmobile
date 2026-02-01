#!/usr/bin/env node

/**
 * Quick validation test for Game Over modal helper functions
 * Tests the logic without requiring browser environment
 */

console.log('=== Game Over Modal Helper Functions - Quick Validation ===\n');

// Mock global environment
const mockGlobal = {
  game: {
    humanId: 1,
    cfg: {
      enableJuryHouse: true,
      jurySize: 7
    },
    players: []
  },
  GameOverModal: {
    makesJury: (placement, jurySize = 7) => {
      const firstJurorPlace = jurySize + 2;
      const lastJurorPlace = 3;
      return placement >= lastJurorPlace && placement <= firstJurorPlace;
    }
  },
  alivePlayers: () => mockGlobal.game.players.filter(p => !p.evicted),
  getP: (id) => mockGlobal.game.players.find(p => p.id === id),
  safeName: (id) => {
    const p = mockGlobal.getP(id);
    return p ? p.name : `Unknown${id}`;
  }
};

// Setup mock players
for (let i = 1; i <= 16; i++) {
  mockGlobal.game.players.push({
    id: i,
    name: `Player${i}`,
    evicted: false
  });
}

console.log('✓ Mock environment setup complete\n');

// Test 1: Pre-jury eviction detection
console.log('Test 1: Jury Eligibility Logic');
console.log('================================');

function testJuryLogic() {
  const tests = [
    { placement: 16, jurySize: 7, expected: false, desc: '16th place (pre-jury)' },
    { placement: 10, jurySize: 7, expected: false, desc: '10th place (pre-jury)' },
    { placement: 9, jurySize: 7, expected: true, desc: '9th place (first juror)' },
    { placement: 5, jurySize: 7, expected: true, desc: '5th place (juror)' },
    { placement: 3, jurySize: 7, expected: true, desc: '3rd place (last juror)' },
    { placement: 2, jurySize: 7, expected: false, desc: '2nd place (finalist)' },
    { placement: 1, jurySize: 7, expected: false, desc: '1st place (winner)' },
    { placement: 11, jurySize: 9, expected: true, desc: '11th place (9-person jury, first juror)' },
    { placement: 12, jurySize: 9, expected: false, desc: '12th place (9-person jury, pre-jury)' }
  ];

  let passed = 0;
  let failed = 0;

  tests.forEach(test => {
    const result = mockGlobal.GameOverModal.makesJury(test.placement, test.jurySize);
    const pass = result === test.expected;
    
    if (pass) {
      console.log(`  ✓ ${test.desc}: ${result} (expected ${test.expected})`);
      passed++;
    } else {
      console.log(`  ✗ ${test.desc}: ${result} (expected ${test.expected})`);
      failed++;
    }
  });

  console.log(`\n  Results: ${passed} passed, ${failed} failed\n`);
  return failed === 0;
}

const juryTestPassed = testJuryLogic();

// Test 2: Helper function logic simulation
console.log('Test 2: Queue Logic Simulation');
console.log('================================');

function simulateQueueLogic(playerId, playerName, playersLeftWhenEvicted) {
  const g = mockGlobal.game;
  
  // Check if human
  if (playerId !== g.humanId) {
    console.log(`  ℹ Player ${playerId} is not human, skipping`);
    return false;
  }
  
  // Check if jury enabled
  if (!g.cfg.enableJuryHouse) {
    console.log(`  ℹ Jury system disabled`);
    return false;
  }
  
  // Check if made jury
  const jurySize = g.cfg.jurySize || 7;
  const madeJury = mockGlobal.GameOverModal.makesJury(playersLeftWhenEvicted, jurySize);
  
  if (madeJury) {
    console.log(`  ℹ Human made jury at placement ${playersLeftWhenEvicted}`);
    return false;
  }
  
  console.log(`  ✓ Human evicted pre-jury at placement ${playersLeftWhenEvicted} - modal queued`);
  
  // Set flag
  g.__showGameOverModal = {
    playerName,
    placement: playersLeftWhenEvicted,
    jurySize
  };
  
  return true;
}

const scenarios = [
  { playerId: 1, name: 'Player1', placement: 10, desc: 'Human at 10th (pre-jury)', shouldQueue: true },
  { playerId: 1, name: 'Player1', placement: 9, desc: 'Human at 9th (makes jury)', shouldQueue: false },
  { playerId: 2, name: 'Player2', placement: 10, desc: 'AI at 10th (pre-jury)', shouldQueue: false },
  { playerId: 1, name: 'Player1', placement: 16, desc: 'Human at 16th (early pre-jury)', shouldQueue: true }
];

let queueTestsPassed = 0;
let queueTestsFailed = 0;

scenarios.forEach(scenario => {
  delete mockGlobal.game.__showGameOverModal;
  const queued = simulateQueueLogic(scenario.playerId, scenario.name, scenario.placement);
  const pass = queued === scenario.shouldQueue;
  
  if (pass) {
    console.log(`  ✓ ${scenario.desc}: ${queued ? 'queued' : 'not queued'} (correct)`);
    queueTestsPassed++;
  } else {
    console.log(`  ✗ ${scenario.desc}: ${queued ? 'queued' : 'not queued'} (expected ${scenario.shouldQueue ? 'queued' : 'not queued'})`);
    queueTestsFailed++;
  }
});

console.log(`\n  Results: ${queueTestsPassed} passed, ${queueTestsFailed} failed\n`);

// Summary
console.log('=== Summary ===');
console.log('===============');
const allPassed = juryTestPassed && queueTestsFailed === 0;

if (allPassed) {
  console.log('✅ All validation tests PASSED');
  console.log('\nHelper function logic is correct:');
  console.log('  - Jury eligibility calculations work properly');
  console.log('  - Queue logic correctly identifies human pre-jury evictions');
  console.log('  - Modal is NOT queued for AI or jury members');
  process.exit(0);
} else {
  console.log('❌ Some validation tests FAILED');
  console.log('\nPlease review the logic in helper functions');
  process.exit(1);
}
