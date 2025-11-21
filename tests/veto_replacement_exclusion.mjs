#!/usr/bin/env node
/**
 * Test Suite: Veto Replacement Nominee HOH Exclusion
 * 
 * Validates that the HOH is ALWAYS excluded from replacement nominee pools
 * across all POV types (Standard, Golden, Diamond) and scenarios.
 * 
 * Tests defense-in-depth layers:
 * 1. Pool building (buildReplacementPool)
 * 2. Pre-commit validation (validateReplacementNominee)
 * 3. Post-commit integrity (integrityCheckNominees)
 */

import { readFileSync } from 'fs';
import { JSDOM } from 'jsdom';

// Load veto.js module
const vetoCode = readFileSync('./js/veto.js', 'utf8');

// Create a minimal DOM environment
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
const { window } = dom;

// Set up global environment
global.window = window;
global.document = window.document;

// Mock game state
window.game = {
  players: [
    { id: 1, name: 'Alice', human: true, evicted: false, nominated: false, hoh: true },
    { id: 2, name: 'Bob', human: false, evicted: false, nominated: true, hoh: false },
    { id: 3, name: 'Charlie', human: false, evicted: false, nominated: true, hoh: false },
    { id: 4, name: 'Diana', human: false, evicted: false, nominated: false, hoh: false },
    { id: 5, name: 'Eve', human: false, evicted: false, nominated: false, hoh: false },
    { id: 6, name: 'Frank', human: false, evicted: false, nominated: false, hoh: false },
    { id: 7, name: 'Grace', human: false, evicted: false, nominated: false, hoh: false }
  ],
  hohId: 1,
  humanId: 1,
  vetoHolder: 4, // Diana won veto
  vetoSavedId: 2, // Bob was saved
  nominees: [2, 3], // Bob and Charlie nominated
  phase: 'veto_ceremony',
  cfg: { tVeto: 40 },
  week: 5
};

// Mock helper functions
window.getP = function(id) {
  return window.game.players.find(p => p.id == id) || null;
};

window.alivePlayers = function() {
  return window.game.players.filter(p => !p.evicted);
};

window.safeName = function(id) {
  const p = window.getP(id);
  return p ? p.name : String(id);
};

window.rng = Math.random;

// Execute veto.js in this context
eval(vetoCode);

// Test utilities
const results = [];

function log(message, type = 'info') {
  const prefix = type === 'pass' ? '✓' : type === 'fail' ? '✗' : 'ℹ';
  console.log(`${prefix} ${message}`);
}

function assert(condition, testName, details = '') {
  const result = {
    name: testName,
    passed: condition,
    details: details
  };
  results.push(result);
  log(`${condition ? 'PASS' : 'FAIL'}: ${testName} ${details}`, condition ? 'pass' : 'fail');
  return condition;
}

// ===== Test Cases =====

function test1_normalizeIds() {
  log('Running test: normalizeIds converts string IDs to numbers');
  
  const input = ['1', '2', 3, '4', 5];
  const output = window.normalizeIds(input);
  
  const allNumbers = output.every(id => typeof id === 'number');
  const correctValues = JSON.stringify(output) === JSON.stringify([1, 2, 3, 4, 5]);
  
  return assert(allNumbers && correctValues, 
    'normalizeIds converts all IDs to numbers',
    `Input: [${input}], Output: [${output}]`);
}

function test2_buildReplacementPool_excludes_hoh() {
  log('Running test: buildReplacementPool excludes HOH');
  
  // Standard veto scenario: savedId = 2 (Bob)
  const pool = window.buildReplacementPool({ savedId: 2 });
  
  const hohId = window.game.hohId; // 1 (Alice)
  const hohInPool = pool.includes(hohId);
  
  return assert(!hohInPool, 
    'buildReplacementPool excludes HOH',
    `HOH ID: ${hohId}, Pool: [${pool}], HOH in pool: ${hohInPool}`);
}

function test3_buildReplacementPool_excludes_veto_holder() {
  log('Running test: buildReplacementPool excludes veto holder');
  
  const pool = window.buildReplacementPool({ savedId: 2 });
  
  const vetoHolderId = window.game.vetoHolder; // 4 (Diana)
  const vetoHolderInPool = pool.includes(vetoHolderId);
  
  return assert(!vetoHolderInPool,
    'buildReplacementPool excludes veto holder',
    `Veto holder ID: ${vetoHolderId}, Pool: [${pool}], In pool: ${vetoHolderInPool}`);
}

function test4_buildReplacementPool_excludes_saved_nominee() {
  log('Running test: buildReplacementPool excludes saved nominee');
  
  const savedId = 2; // Bob
  const pool = window.buildReplacementPool({ savedId });
  
  const savedInPool = pool.includes(savedId);
  
  return assert(!savedInPool,
    'buildReplacementPool excludes saved nominee',
    `Saved ID: ${savedId}, Pool: [${pool}], In pool: ${savedInPool}`);
}

function test5_buildReplacementPool_excludes_current_nominees() {
  log('Running test: buildReplacementPool excludes current nominees');
  
  const pool = window.buildReplacementPool({ savedId: 2 });
  
  const nominees = window.game.nominees; // [2, 3]
  const nominee3InPool = pool.includes(3); // Charlie
  
  return assert(!nominee3InPool,
    'buildReplacementPool excludes remaining nominees',
    `Nominees: [${nominees}], Pool: [${pool}], Nominee 3 in pool: ${nominee3InPool}`);
}

function test6_buildReplacementPool_diamond_second_pick() {
  log('Running test: buildReplacementPool Diamond POV second pick excludes first');
  
  const firstReplacement = 4; // Diana
  const pool = window.buildReplacementPool({ 
    savedId: null, 
    alreadyPicked: firstReplacement 
  });
  
  const firstInPool = pool.includes(firstReplacement);
  const hohInPool = pool.includes(window.game.hohId);
  
  return assert(!firstInPool && !hohInPool,
    'buildReplacementPool Diamond 2nd pick excludes HOH and 1st pick',
    `First pick: ${firstReplacement}, HOH: ${window.game.hohId}, Pool: [${pool}]`);
}

function test7_buildReplacementPool_string_id_handling() {
  log('Running test: buildReplacementPool handles string IDs in game state');
  
  // Simulate string IDs in game state (regression scenario)
  const originalHohId = window.game.hohId;
  const originalVetoHolder = window.game.vetoHolder;
  const originalNominees = window.game.nominees;
  
  window.game.hohId = '1'; // String HOH ID
  window.game.vetoHolder = '4'; // String veto holder ID
  window.game.nominees = ['2', '3']; // String nominee IDs
  
  const pool = window.buildReplacementPool({ savedId: '2' });
  
  // Check that HOH is still excluded despite string/number mismatch
  const hohInPool = pool.includes(1) || pool.includes('1');
  const vetoHolderInPool = pool.includes(4) || pool.includes('4');
  
  // Restore original state
  window.game.hohId = originalHohId;
  window.game.vetoHolder = originalVetoHolder;
  window.game.nominees = originalNominees;
  
  return assert(!hohInPool && !vetoHolderInPool,
    'buildReplacementPool handles string IDs correctly',
    `HOH in pool: ${hohInPool}, Veto holder in pool: ${vetoHolderInPool}, Pool: [${pool}]`);
}

function test8_validateReplacementNominee_rejects_hoh() {
  log('Running test: validateReplacementNominee rejects HOH');
  
  const hohId = window.game.hohId; // 1 (Alice)
  const validation = window.validateReplacementNominee(hohId);
  
  const rejected = !validation.ok;
  const correctReason = validation.reason && validation.reason.includes('HOH');
  
  return assert(rejected && correctReason,
    'validateReplacementNominee rejects HOH',
    `HOH ID: ${hohId}, Valid: ${validation.ok}, Reason: ${validation.reason}`);
}

function test9_validateReplacementNominee_rejects_veto_holder() {
  log('Running test: validateReplacementNominee rejects veto holder');
  
  const vetoHolderId = window.game.vetoHolder; // 4 (Diana)
  const validation = window.validateReplacementNominee(vetoHolderId);
  
  const rejected = !validation.ok;
  const correctReason = validation.reason && validation.reason.includes('Veto holder');
  
  return assert(rejected && correctReason,
    'validateReplacementNominee rejects veto holder',
    `Veto holder ID: ${vetoHolderId}, Valid: ${validation.ok}, Reason: ${validation.reason}`);
}

function test10_validateReplacementNominee_rejects_evicted() {
  log('Running test: validateReplacementNominee rejects evicted player');
  
  // Mark player 7 as evicted
  const player7 = window.getP(7);
  player7.evicted = true;
  
  const validation = window.validateReplacementNominee(7);
  
  const rejected = !validation.ok;
  const correctReason = validation.reason && validation.reason.includes('evicted');
  
  // Restore state
  player7.evicted = false;
  
  return assert(rejected && correctReason,
    'validateReplacementNominee rejects evicted player',
    `Player 7 evicted, Valid: ${validation.ok}, Reason: ${validation.reason}`);
}

function test11_validateReplacementNominee_rejects_existing_nominee() {
  log('Running test: validateReplacementNominee rejects existing nominee');
  
  const existingNominee = 3; // Charlie
  const validation = window.validateReplacementNominee(existingNominee);
  
  const rejected = !validation.ok;
  const correctReason = validation.reason && validation.reason.includes('already-nominee');
  
  return assert(rejected && correctReason,
    'validateReplacementNominee rejects existing nominee',
    `Nominee ID: ${existingNominee}, Valid: ${validation.ok}, Reason: ${validation.reason}`);
}

function test12_validateReplacementNominee_accepts_valid() {
  log('Running test: validateReplacementNominee accepts valid replacement');
  
  const validId = 5; // Eve - not HOH, not veto holder, not nominee, not evicted
  const validation = window.validateReplacementNominee(validId);
  
  return assert(validation.ok,
    'validateReplacementNominee accepts valid replacement',
    `Player ID: ${validId}, Valid: ${validation.ok}`);
}

function test13_integrityCheckNominees_removes_hoh() {
  log('Running test: integrityCheckNominees removes HOH if present');
  
  // Artificially inject HOH into nominees (simulating bug)
  const originalNominees = window.game.nominees;
  window.game.nominees = [1, 3, 5]; // 1 = HOH (Alice)
  
  // Mock showCard to prevent errors
  const originalShowCard = window.showCard;
  window.showCard = function() {};
  
  const correctionApplied = window.integrityCheckNominees();
  
  const hohRemoved = !window.game.nominees.includes(1);
  const remainingValid = window.game.nominees.every(id => id !== 1);
  
  // Restore state
  window.game.nominees = originalNominees;
  window.showCard = originalShowCard;
  
  return assert(correctionApplied && hohRemoved && remainingValid,
    'integrityCheckNominees removes HOH from nominees',
    `Correction applied: ${correctionApplied}, HOH removed: ${hohRemoved}, Final nominees: [${window.game.nominees}]`);
}

function test14_integrityCheckNominees_no_correction_needed() {
  log('Running test: integrityCheckNominees no correction when valid');
  
  // Set valid nominees (no HOH)
  const originalNominees = window.game.nominees;
  window.game.nominees = [3, 5]; // Charlie and Eve
  
  const correctionApplied = window.integrityCheckNominees();
  
  // Restore state
  window.game.nominees = originalNominees;
  
  return assert(!correctionApplied,
    'integrityCheckNominees no correction when nominees are valid',
    `Correction applied: ${correctionApplied}`);
}

function test15_golden_pov_scenario() {
  log('Running test: Golden POV excludes HOH from replacement pool');
  
  // Golden POV: POV holder picks replacement (not HOH)
  window.game.activeVetoTwist = 'golden';
  
  const pool = window.buildReplacementPool({ savedId: 2 });
  
  const hohInPool = pool.includes(window.game.hohId);
  
  // Restore state
  window.game.activeVetoTwist = null;
  
  return assert(!hohInPool,
    'Golden POV excludes HOH from replacement pool',
    `HOH ID: ${window.game.hohId}, Pool: [${pool}], HOH in pool: ${hohInPool}`);
}

function test16_diamond_pov_scenario() {
  log('Running test: Diamond POV excludes HOH from both replacement picks');
  
  // Diamond POV: POV holder replaces both nominees
  window.game.activeVetoTwist = 'diamond';
  
  // First pick
  const pool1 = window.buildReplacementPool({ savedId: null, alreadyPicked: null });
  const hohInPool1 = pool1.includes(window.game.hohId);
  
  // Second pick (assume first pick was 4)
  const pool2 = window.buildReplacementPool({ savedId: null, alreadyPicked: 4 });
  const hohInPool2 = pool2.includes(window.game.hohId);
  
  // Restore state
  window.game.activeVetoTwist = null;
  
  return assert(!hohInPool1 && !hohInPool2,
    'Diamond POV excludes HOH from both picks',
    `HOH in 1st pool: ${hohInPool1}, HOH in 2nd pool: ${hohInPool2}`);
}

function test17_multi_eviction_week() {
  log('Running test: HOH excluded during multi-eviction week');
  
  // Simulate double eviction
  window.game.__twistMode = 'double';
  window.game.evictionsThisWeek = 2;
  
  const pool = window.buildReplacementPool({ savedId: 2 });
  const hohInPool = pool.includes(window.game.hohId);
  
  // Restore state
  delete window.game.__twistMode;
  delete window.game.evictionsThisWeek;
  
  return assert(!hohInPool,
    'HOH excluded during multi-eviction week',
    `HOH ID: ${window.game.hohId}, Pool: [${pool}], HOH in pool: ${hohInPool}`);
}

function test18_final_4_scenario() {
  log('Running test: HOH excluded at Final 4');
  
  // Simulate Final 4
  const originalPlayers = window.game.players;
  window.game.players = [
    { id: 1, name: 'Alice', evicted: false, hoh: true },
    { id: 2, name: 'Bob', evicted: false, nominated: true },
    { id: 3, name: 'Charlie', evicted: false, nominated: true },
    { id: 4, name: 'Diana', evicted: false }
  ];
  
  const pool = window.buildReplacementPool({ savedId: 2 });
  const hohInPool = pool.includes(1);
  
  // Restore state
  window.game.players = originalPlayers;
  
  return assert(!hohInPool,
    'HOH excluded at Final 4',
    `HOH ID: 1, Pool: [${pool}], HOH in pool: ${hohInPool}`);
}

// ===== Run All Tests =====

function runAllTests() {
  console.log('\n=== Veto Replacement Nominee HOH Exclusion Tests ===\n');
  
  test1_normalizeIds();
  test2_buildReplacementPool_excludes_hoh();
  test3_buildReplacementPool_excludes_veto_holder();
  test4_buildReplacementPool_excludes_saved_nominee();
  test5_buildReplacementPool_excludes_current_nominees();
  test6_buildReplacementPool_diamond_second_pick();
  test7_buildReplacementPool_string_id_handling();
  test8_validateReplacementNominee_rejects_hoh();
  test9_validateReplacementNominee_rejects_veto_holder();
  test10_validateReplacementNominee_rejects_evicted();
  test11_validateReplacementNominee_rejects_existing_nominee();
  test12_validateReplacementNominee_accepts_valid();
  test13_integrityCheckNominees_removes_hoh();
  test14_integrityCheckNominees_no_correction_needed();
  test15_golden_pov_scenario();
  test16_diamond_pov_scenario();
  test17_multi_eviction_week();
  test18_final_4_scenario();
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  console.log(`\n=== Summary ===`);
  console.log(`${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('✓ ALL TESTS PASSED');
    process.exit(0);
  } else {
    console.log('✗ SOME TESTS FAILED');
    process.exit(1);
  }
}

runAllTests();
