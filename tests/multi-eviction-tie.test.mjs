/**
 * Unit tests for multi-eviction cutoff tie detection
 * Tests the determineMultiEvictees logic
 */

import { strict as assert } from 'assert';

// Mock the determineMultiEvictees function logic
function determineMultiEvictees(counts, evictCount, nominees) {
  if (!counts || !(counts instanceof Map) || evictCount < 1 || !Array.isArray(nominees)) {
    return { tie: false, evictees: [] };
  }

  // Sort nominees by votes DESC, then by ID for determinism
  const sorted = [...counts.entries()]
    .sort((a, b) => {
      // Sort by votes descending
      if (b[1] !== a[1]) return b[1] - a[1];
      // Tiebreak by ID ascending for determinism
      return a[0] - b[0];
    });

  // If fewer nominees than evictCount, evict all
  if (sorted.length <= evictCount) {
    return { tie: false, evictees: sorted.map(([id]) => id) };
  }

  // Get top K nominees
  const topK = sorted.slice(0, evictCount);
  const cutoffVotes = topK[evictCount - 1][1]; // Votes of last evictee

  // Check if any nominees OUTSIDE top K have the same vote count as cutoff
  const outsideTopK = sorted.slice(evictCount);
  const tiedOutside = outsideTopK.filter(([_, votes]) => votes === cutoffVotes);

  if (tiedOutside.length > 0) {
    // Cutoff tie detected
    // Collect all nominees at cutoff vote level (inside and outside top K)
    const allAtCutoff = sorted.filter(([_, votes]) => votes === cutoffVotes);

    return {
      tie: true,
      tiedPlayers: allAtCutoff.map(([id]) => id),
      cutoffVotes: cutoffVotes,
      // Also return the non-tied evictees (those with more votes than cutoff)
      confirmedEvictees: topK.filter(([_, votes]) => votes > cutoffVotes).map(([id]) => id)
    };
  }

  // No tie, return top K
  return { tie: false, evictees: topK.map(([id]) => id) };
}

// Test suite
console.log('🧪 Running multi-eviction tie detection tests...\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (error) {
    console.log(`❌ FAIL: ${name}`);
    console.log(`   ${error.message}\n`);
    failed++;
  }
}

// Test 1: No tie scenario (problem statement original example)
test('Problem scenario - no cutoff tie (A:3, B:2, C:1, D:1, K=2)', () => {
  const counts = new Map([
    [1, 3], // Alice: 3 votes
    [2, 2], // Bob: 2 votes
    [3, 1], // Charlie: 1 vote
    [4, 1]  // Diana: 1 vote
  ]);
  
  const result = determineMultiEvictees(counts, 2, [1, 2, 3, 4]);
  
  assert.equal(result.tie, false, 'Should NOT detect tie (cutoff is 2, outside have 1)');
  assert.deepEqual(result.evictees, [1, 2], 'Should evict Alice and Bob');
});

// Test 2: Cutoff tie scenario (corrected example)
test('Cutoff tie detected (A:3, B:2, C:2, D:1, K=2)', () => {
  const counts = new Map([
    [1, 3], // Alice: 3 votes
    [2, 2], // Bob: 2 votes
    [3, 2], // Charlie: 2 votes (TIED with Bob at cutoff!)
    [4, 1]  // Diana: 1 vote
  ]);
  
  const result = determineMultiEvictees(counts, 2, [1, 2, 3, 4]);
  
  assert.equal(result.tie, true, 'Should detect cutoff tie');
  assert.deepEqual(result.tiedPlayers.sort(), [2, 3].sort(), 'Bob and Charlie should be tied');
  assert.equal(result.cutoffVotes, 2, 'Cutoff should be at 2 votes');
  assert.deepEqual(result.confirmedEvictees, [1], 'Alice should be confirmed (more votes than cutoff)');
});

// Test 3: Triple eviction with cutoff tie
test('Triple eviction cutoff tie (A:4, B:3, C:2, D:2, E:1, K=3)', () => {
  const counts = new Map([
    [1, 4], // Alice: 4 votes
    [2, 3], // Bob: 3 votes
    [3, 2], // Charlie: 2 votes
    [4, 2], // Diana: 2 votes (TIED with Charlie)
    [5, 1]  // Eve: 1 vote
  ]);
  
  const result = determineMultiEvictees(counts, 3, [1, 2, 3, 4, 5]);
  
  assert.equal(result.tie, true, 'Should detect cutoff tie');
  assert.deepEqual(result.tiedPlayers.sort(), [3, 4].sort(), 'Charlie and Diana should be tied');
  assert.equal(result.cutoffVotes, 2, 'Cutoff should be at 2 votes');
  assert.deepEqual(result.confirmedEvictees.sort(), [1, 2].sort(), 'Alice and Bob confirmed');
});

// Test 4: All tied at top (everyone has same votes)
test('All nominees tied (A:2, B:2, C:2, D:2, K=2)', () => {
  const counts = new Map([
    [1, 2],
    [2, 2],
    [3, 2],
    [4, 2]
  ]);
  
  const result = determineMultiEvictees(counts, 2, [1, 2, 3, 4]);
  
  assert.equal(result.tie, true, 'Should detect tie (all at same level)');
  assert.deepEqual(result.tiedPlayers.sort(), [1, 2, 3, 4].sort(), 'All should be tied');
  assert.equal(result.cutoffVotes, 2, 'Cutoff should be at 2 votes');
  assert.deepEqual(result.confirmedEvictees, [], 'No confirmed evictees');
});

// Test 5: No tie - clear winner hierarchy
test('No tie - clear hierarchy (A:5, B:4, C:3, D:2, K=2)', () => {
  const counts = new Map([
    [1, 5],
    [2, 4],
    [3, 3],
    [4, 2]
  ]);
  
  const result = determineMultiEvictees(counts, 2, [1, 2, 3, 4]);
  
  assert.equal(result.tie, false, 'Should NOT detect tie');
  assert.deepEqual(result.evictees, [1, 2], 'Should evict top 2');
});

// Test 6: Exactly K nominees (no tie possible)
test('Exactly K nominees (A:3, B:2, K=2)', () => {
  const counts = new Map([
    [1, 3],
    [2, 2]
  ]);
  
  const result = determineMultiEvictees(counts, 2, [1, 2]);
  
  assert.equal(result.tie, false, 'Should NOT detect tie (no outsiders)');
  assert.deepEqual(result.evictees, [1, 2], 'Should evict both');
});

// Test 7: Triple tie at cutoff (3 way tie)
test('Three-way cutoff tie (A:4, B:2, C:2, D:2, K=2)', () => {
  const counts = new Map([
    [1, 4],
    [2, 2],
    [3, 2],
    [4, 2]
  ]);
  
  const result = determineMultiEvictees(counts, 2, [1, 2, 3, 4]);
  
  assert.equal(result.tie, true, 'Should detect three-way tie');
  assert.deepEqual(result.tiedPlayers.sort(), [2, 3, 4].sort(), 'B, C, D should be tied');
  assert.equal(result.cutoffVotes, 2, 'Cutoff at 2 votes');
  assert.deepEqual(result.confirmedEvictees, [1], 'Only Alice confirmed');
});

// Test 8: Edge case - K=1 (single eviction, should not use this path)
test('Single eviction (K=1) - edge case (A:3, B:2, C:2, K=1)', () => {
  const counts = new Map([
    [1, 3],
    [2, 2],
    [3, 2]
  ]);
  
  const result = determineMultiEvictees(counts, 1, [1, 2, 3]);
  
  assert.equal(result.tie, false, 'Should NOT detect tie (K=1, only taking top)');
  assert.deepEqual(result.evictees, [1], 'Should evict only Alice');
});

// Test 9: Problem statement exact scenario (should NOT trigger tie)
test('Problem statement scenario - verify NO tie (A:3, B:2, C:1, D:1, K=2)', () => {
  // This is the exact scenario from problem statement
  // Expected: Should NOT detect tie because cutoff (Bob with 2) is higher than C/D (1 each)
  const counts = new Map([
    [1, 3], // A: 3 votes
    [2, 2], // B: 2 votes  
    [3, 1], // C: 1 vote
    [4, 1]  // D: 1 vote
  ]);
  
  const result = determineMultiEvictees(counts, 2, [1, 2, 3, 4]);
  
  // The problem statement was WRONG about this being a tie
  // A tie only exists if someone OUTSIDE top K has SAME votes as cutoff
  // Here: cutoff=2 (Bob), outside=[C:1, D:1] - no match, no tie!
  assert.equal(result.tie, false, 'Should NOT detect tie (C and D have fewer votes than cutoff)');
  assert.deepEqual(result.evictees, [1, 2], 'Should evict A and B directly');
  
  console.log('   ℹ️  Note: The problem statement example was incorrect.');
  console.log('   ℹ️  A tie only occurs when nominees OUTSIDE top K have the SAME votes as cutoff.');
  console.log('   ℹ️  In A:3, B:2, C:1, D:1 with K=2: cutoff=2, outside have 1 → no tie!');
});

// Summary
console.log('\n' + '='.repeat(60));
console.log(`Test Results: ${passed} passed, ${failed} failed`);
console.log('='.repeat(60));

if (failed > 0) {
  process.exit(1);
}
