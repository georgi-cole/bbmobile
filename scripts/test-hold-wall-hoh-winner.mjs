#!/usr/bin/env node

/**
 * Hold The Wall HOH Winner Test
 * Tests the authoritative winner propagation from Hold The Wall minigame to HOH assignment
 * 
 * Tests:
 * 1. Authoritative winner is set by Hold The Wall
 * 2. Authoritative winner is used BEFORE score-based determination
 * 3. Authoritative winner is cleared after use
 * 4. game.hohId matches the minigame winner
 * 5. AFK human is dropped and cannot win
 * 
 * Usage:
 *   node scripts/test-hold-wall-hoh-winner.mjs
 */

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

console.log('='.repeat(70));
console.log('Hold The Wall HOH Winner Test');
console.log('='.repeat(70));
console.log('');

let testsPassed = 0;
let testsFailed = 0;
const errors = [];

// Test 1: Verify authoritative winner logic exists in Hold The Wall
console.log('🧪 Test 1: Authoritative winner logic in Hold The Wall');
try {
  const holdWallContent = readFileSync(
    join(rootDir, 'js/minigames/hold-wall.js'),
    'utf8'
  );
  
  // Check for authoritative winner assignment – either via new API or legacy flag
  const usesNewAPI = holdWallContent.includes('authoritativeResolveCompetition');
  const usesLegacyFlag = holdWallContent.includes('g.game.__authoritativeWinner') || holdWallContent.includes('g.__authoritativeWinner');
  if (!usesNewAPI && !usesLegacyFlag) {
    throw new Error('Neither authoritativeResolveCompetition call nor g.__authoritativeWinner found in Hold The Wall');
  }
  
  if (!holdWallContent.includes('playerId:') && !holdWallContent.includes('winnerId')) {
    throw new Error('Winner ID field not set in authoritative winner logic');
  }
  
  if (!holdWallContent.includes('compType')) {
    throw new Error('compType not referenced in Hold The Wall winner logic');
  }
  
  // Check for AFK detection
  if (!holdWallContent.includes('hasHumanStartedHolding')) {
    throw new Error('hasHumanStartedHolding variable not found');
  }
  
  if (!holdWallContent.includes('GRACE_PERIOD_MS')) {
    throw new Error('GRACE_PERIOD_MS constant not found');
  }
  
  // Verify grace period is 3 seconds
  const gracePeriodMatch = holdWallContent.match(/GRACE_PERIOD_MS\s*=\s*(\d+)/);
  if (!gracePeriodMatch || parseInt(gracePeriodMatch[1]) !== 3000) {
    throw new Error(`Grace period should be 3000ms, found: ${gracePeriodMatch ? gracePeriodMatch[1] : 'not found'}`);
  }
  
  // Check for wall disabling after AFK drop
  if (!holdWallContent.includes('pointerEvents') && !holdWallContent.includes('pointer-events')) {
    throw new Error('Wall pointer-events not disabled after AFK drop');
  }
  
  console.log('  ✅ Authoritative winner logic present' + (usesNewAPI ? ' (via authoritativeResolveCompetition API)' : ' (legacy flag)'));
  console.log('  ✅ AFK detection implemented');
  console.log('  ✅ Grace period is 3 seconds');
  console.log('  ✅ Wall disabling logic present');
  testsPassed++;
} catch (error) {
  console.error(`  ❌ FAILED: ${error.message}`);
  errors.push(`Test 1: ${error.message}`);
  testsFailed++;
}
console.log('');

// Test 2: Verify finishCompPhase uses authoritative winner FIRST
console.log('🧪 Test 2: finishCompPhase authoritative winner priority');
try {
  const competitionsContent = readFileSync(
    join(rootDir, 'js/competitions.js'),
    'utf8'
  );
  
  // Check that authoritative winner is checked and used
  if (!competitionsContent.includes('g.__authoritativeWinner')) {
    throw new Error('g.__authoritativeWinner check not found in competitions.js');
  }
  
  // Verify that the authoritative winner is checked with compType === 'hoh'
  if (!competitionsContent.includes("g.__authoritativeWinner.compType === 'hoh'")) {
    throw new Error('Authoritative winner compType check not found');
  }
  
  // Verify that the authoritative winner is directly assigned to winner variable
  if (!competitionsContent.includes('winner = g.__authoritativeWinner.playerId')) {
    throw new Error('Authoritative winner not directly assigned to winner variable');
  }
  
  // Verify check happens before score-based determination comment
  const authWinnerIndex = competitionsContent.indexOf('winner = g.__authoritativeWinner.playerId');
  const scoredEntriesIndex = competitionsContent.indexOf('const scoredEntries = [...g.lastCompScores.entries()]');
  
  if (authWinnerIndex === -1) {
    throw new Error('Authoritative winner assignment not found');
  }
  
  if (scoredEntriesIndex === -1) {
    throw new Error('Score-based determination not found');
  }
  
  // The authoritative winner should be checked in an if statement that comes before or contains the scoredEntries logic
  // We verify this by checking that the auth winner code appears in the else branch
  if (!competitionsContent.includes('} else {\n        // No authoritative winner - use score-based determination')) {
    throw new Error('Authoritative winner not checked BEFORE score-based determination in proper branching');
  }
  
  console.log('  ✅ Authoritative winner checked in competitions.js');
  console.log('  ✅ CompType hoh check present');
  console.log('  ✅ Direct assignment to winner variable');
  console.log('  ✅ Checked before score-based determination');
  testsPassed++;
} catch (error) {
  console.error(`  ❌ FAILED: ${error.message}`);
  errors.push(`Test 2: ${error.message}`);
  testsFailed++;
}
console.log('');

// Test 3: Verify authoritative winner is cleared immediately after use
console.log('🧪 Test 3: Authoritative winner cleared after use');
try {
  const competitionsContent = readFileSync(
    join(rootDir, 'js/competitions.js'),
    'utf8'
  );
  
  // Check for deletion of authoritative winner
  if (!competitionsContent.includes('delete g.__authoritativeWinner')) {
    throw new Error('g.__authoritativeWinner not deleted in competitions.js');
  }
  
  // Verify it's deleted right after use (should be within the authoritative winner branch)
  // Look for the pattern where we set winner and then delete (allowing for comments/whitespace)
  const authBranchPattern = /winner = g\.__authoritativeWinner\.playerId[\s\S]{0,2000}delete g\.__authoritativeWinner/;
  if (!authBranchPattern.test(competitionsContent)) {
    throw new Error('Authoritative winner not deleted shortly after assignment');
  }
  
  // Verify the comment about clearing the flag exists
  if (!competitionsContent.includes('Clear authoritative winner flag immediately after use')) {
    throw new Error('Missing comment about clearing authoritative winner flag');
  }
  
  console.log('  ✅ Authoritative winner deleted in competitions.js');
  console.log('  ✅ Deletion happens shortly after assignment');
  console.log('  ✅ Proper documentation comment present');
  testsPassed++;
} catch (error) {
  console.error(`  ❌ FAILED: ${error.message}`);
  errors.push(`Test 3: ${error.message}`);
  testsFailed++;
}
console.log('');

// Test 4: Verify AFK drop prevents human from winning
console.log('🧪 Test 4: AFK drop prevents human from winning');
try {
  const holdWallContent = readFileSync(
    join(rootDir, 'js/minigames/hold-wall.js'),
    'utf8'
  );
  
  // Check that AFK drop marks player as dropped
  if (!holdWallContent.includes('dropTimeMs = dropTime')) {
    throw new Error('Player not marked as dropped in AFK handler');
  }
  
  // Check that elimination log is updated
  if (!holdWallContent.includes('eliminationLog.push')) {
    throw new Error('Elimination log not updated in AFK handler');
  }
  
  // Check for handleMouseDown AFK check
  const handleMouseDownMatch = holdWallContent.match(/function handleMouseDown\([^)]*\)\s*\{[\s\S]*?\n\s*\}/);
  if (!handleMouseDownMatch) {
    throw new Error('handleMouseDown function not found');
  }
  
  const handleMouseDownCode = handleMouseDownMatch[0];
  
  // Verify that handleMouseDown checks if player is already dropped
  if (!handleMouseDownCode.includes('dropTimeMs !== null')) {
    throw new Error('handleMouseDown does not check if player is already dropped');
  }
  
  // Verify early return if player is dropped
  if (!handleMouseDownCode.includes('return')) {
    throw new Error('handleMouseDown does not return early if player is dropped');
  }
  
  console.log('  ✅ AFK drop marks player as dropped');
  console.log('  ✅ Elimination log updated');
  console.log('  ✅ handleMouseDown prevents interaction after drop');
  testsPassed++;
} catch (error) {
  console.error(`  ❌ FAILED: ${error.message}`);
  errors.push(`Test 4: ${error.message}`);
  testsFailed++;
}
console.log('');

// Test 5: Verify UI feedback for AFK drop
console.log('🧪 Test 5: UI feedback for AFK drop');
try {
  const holdWallContent = readFileSync(
    join(rootDir, 'js/minigames/hold-wall.js'),
    'utf8'
  );
  
  // Find the AFK drop section
  const afkDropMatch = holdWallContent.match(/AFK DETECTION[\s\S]*?checkGameEnd\(\)/);
  if (!afkDropMatch) {
    throw new Error('AFK drop section not found');
  }
  
  const afkDropCode = afkDropMatch[0];
  
  // Check for cursor change
  if (!afkDropCode.includes('cursor') && !afkDropCode.includes('not-allowed')) {
    throw new Error('Cursor not changed to not-allowed after AFK drop');
  }
  
  // Check for opacity change
  if (!afkDropCode.includes('opacity')) {
    throw new Error('Opacity not changed after AFK drop');
  }
  
  // Check for visual feedback (grayscale or similar)
  if (!afkDropCode.includes('grayscale') && !afkDropCode.includes('filter')) {
    throw new Error('Visual filter not applied after AFK drop');
  }
  
  // Check for pointer-events disabled
  if (!afkDropCode.includes('pointerEvents') && !afkDropCode.includes('pointer-events')) {
    throw new Error('Pointer events not disabled after AFK drop');
  }
  
  // Check for status message update
  if (!afkDropCode.includes('statusMsg')) {
    throw new Error('Status message not updated after AFK drop');
  }
  
  console.log('  ✅ Cursor changed to not-allowed');
  console.log('  ✅ Opacity reduced');
  console.log('  ✅ Visual filter applied');
  console.log('  ✅ Pointer events disabled');
  console.log('  ✅ Status message updated');
  testsPassed++;
} catch (error) {
  console.error(`  ❌ FAILED: ${error.message}`);
  errors.push(`Test 5: ${error.message}`);
  testsFailed++;
}
console.log('');

// Test 6: Verify canonical key is hold_wall in registry
console.log('🧪 Test 6: Canonical key is hold_wall in registry');
try {
  const registryContent = readFileSync(
    join(rootDir, 'js/minigames/registry.js'),
    'utf8'
  );

  if (!registryContent.includes("key: 'hold_wall'")) {
    throw new Error("registry.js does not have key: 'hold_wall'");
  }

  if (!/hold_wall\s*:/.test(registryContent)) {
    throw new Error('registry.js does not have hold_wall: entry');
  }

  console.log("  ✅ hold_wall is the canonical registry key");
  testsPassed++;
} catch (error) {
  console.error(`  ❌ FAILED: ${error.message}`);
  errors.push(`Test 6: ${error.message}`);
  testsFailed++;
}
console.log('');

// Test 7: Verify legacy aliases map to hold_wall in compat-bridge
console.log('🧪 Test 7: Legacy aliases resolve to hold_wall in compat-bridge');
try {
  const compatContent = readFileSync(
    join(rootDir, 'js/minigames/core/compat-bridge.js'),
    'utf8'
  );

  const aliases = ['holdWall', 'hold-wall', 'holdwall', 'holdthewall'];
  for (const alias of aliases) {
    const pattern = new RegExp(`['"]${alias}['"]\\s*:\\s*['"]hold_wall['"]`);
    if (!pattern.test(compatContent)) {
      throw new Error(`Alias '${alias}' does not map to 'hold_wall' in compat-bridge.js`);
    }
  }

  console.log("  ✅ All legacy aliases (holdWall, hold-wall, holdwall, holdthewall) map to hold_wall");
  testsPassed++;
} catch (error) {
  console.error(`  ❌ FAILED: ${error.message}`);
  errors.push(`Test 7: ${error.message}`);
  testsFailed++;
}
console.log('');

// Test 8: Verify authoritativeResolveCompetition API exists in competitions-flow.js
console.log('🧪 Test 8: authoritativeResolveCompetition API in competitions-flow.js');
try {
  const flowContent = readFileSync(
    join(rootDir, 'js/competitions-flow.js'),
    'utf8'
  );

  if (!flowContent.includes('function authoritativeResolveCompetition')) {
    throw new Error('authoritativeResolveCompetition function not found in competitions-flow.js');
  }

  if (!flowContent.includes('authoritativeResolveCompetition: authoritativeResolveCompetition')) {
    throw new Error('authoritativeResolveCompetition not exposed on CompetitionFlow object');
  }

  if (!flowContent.includes('game.hohId = winnerId')) {
    throw new Error('authoritativeResolveCompetition does not set game.hohId');
  }

  if (!flowContent.includes('game.vetoHolder = winnerId')) {
    throw new Error('authoritativeResolveCompetition does not set game.vetoHolder');
  }

  if (!flowContent.includes('game.__hohResolved = true')) {
    throw new Error('authoritativeResolveCompetition does not set __hohResolved guard');
  }

  if (!flowContent.includes('game.__finishVetoCompCalled = true')) {
    throw new Error('authoritativeResolveCompetition does not set __finishVetoCompCalled guard');
  }

  console.log('  ✅ authoritativeResolveCompetition function defined');
  console.log('  ✅ Exposed on CompetitionFlow object');
  console.log('  ✅ Sets game.hohId for HOH');
  console.log('  ✅ Sets game.vetoHolder for POV');
  console.log('  ✅ Sets __hohResolved guard');
  console.log('  ✅ Sets __finishVetoCompCalled guard');
  testsPassed++;
} catch (error) {
  console.error(`  ❌ FAILED: ${error.message}`);
  errors.push(`Test 8: ${error.message}`);
  testsFailed++;
}
console.log('');

// Test 9: Verify hold_wall timer is disabled in launchFullscreenMinigame
console.log('🧪 Test 9: Timer disabled for hold_wall in launchFullscreenMinigame');
try {
  const flowContent = readFileSync(
    join(rootDir, 'js/competitions-flow.js'),
    'utf8'
  );

  if (!flowContent.includes("gameKey === 'hold_wall'")) {
    throw new Error("No gameKey === 'hold_wall' check found in competitions-flow.js");
  }

  if (!flowContent.includes("timerContainer.style.display = 'none'")) {
    throw new Error('Timer container hide logic not found');
  }

  if (!flowContent.includes('isHoldWall')) {
    throw new Error('isHoldWall variable not found');
  }

  console.log("  ✅ gameKey === 'hold_wall' check present");
  console.log('  ✅ Timer container hidden for hold_wall');
  console.log('  ✅ isHoldWall variable used correctly');
  testsPassed++;
} catch (error) {
  console.error(`  ❌ FAILED: ${error.message}`);
  errors.push(`Test 9: ${error.message}`);
  testsFailed++;
}
console.log('');

// Test 10: Verify hold-wall.js calls authoritativeResolveCompetition
console.log('🧪 Test 10: hold-wall.js calls authoritativeResolveCompetition');
try {
  const holdWallContent = readFileSync(
    join(rootDir, 'js/minigames/hold-wall.js'),
    'utf8'
  );

  if (!holdWallContent.includes('authoritativeResolveCompetition')) {
    throw new Error('hold-wall.js does not call authoritativeResolveCompetition');
  }

  if (!holdWallContent.includes("gameKey: 'hold_wall'")) {
    throw new Error("hold-wall.js does not pass gameKey: 'hold_wall'");
  }

  if (!holdWallContent.includes('You have won Head of Household') && !holdWallContent.includes('You have won the Power of Veto')) {
    throw new Error('hold-wall.js does not show winner title banner');
  }

  if (!holdWallContent.includes('g.MiniGames.hold_wall')) {
    throw new Error('hold-wall.js does not export as hold_wall');
  }

  console.log('  ✅ authoritativeResolveCompetition is called');
  console.log("  ✅ gameKey: 'hold_wall' passed correctly");
  console.log('  ✅ Winner title banner shown for human wins');
  console.log('  ✅ Module exported as hold_wall');
  testsPassed++;
} catch (error) {
  console.error(`  ❌ FAILED: ${error.message}`);
  errors.push(`Test 10: ${error.message}`);
  testsFailed++;
}
console.log('');

// Summary
console.log('='.repeat(70));
console.log('📊 Test Summary');
console.log('='.repeat(70));
console.log(`✅ Tests Passed: ${testsPassed}`);
console.log(`❌ Tests Failed: ${testsFailed}`);
console.log('');

if (testsFailed > 0) {
  console.log('Errors:');
  errors.forEach(error => console.log(`  - ${error}`));
  console.log('');
  console.log('❌ TESTS FAILED');
  console.log('='.repeat(70));
  process.exit(1);
}

console.log('✅ ALL TESTS PASSED');
console.log('');
console.log('Note: These are static code analysis tests.');
console.log('      For runtime tests, open test_hold_wall_hoh_winner.html in a browser');
console.log('='.repeat(70));

process.exit(0);
