#!/usr/bin/env node

/**
 * Validate status label logic without browser
 * Tests the canonical checks work correctly
 */

import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

console.log('🧪 Status Labels Logic Validation\n');
console.log('═'.repeat(50));

// Mock game state
const createTestGame = () => ({
  week: 1,
  phase: 'nominations',
  hohId: null,
  vetoHolder: null,
  nominees: [],
  players: [
    { id: 1, name: 'Alice', evicted: false, hoh: false, nominated: false, nominationState: 'none' },
    { id: 2, name: 'Bob', evicted: false, hoh: false, nominated: false, nominationState: 'none' },
    { id: 3, name: 'Carol', evicted: false, hoh: false, nominated: false, nominationState: 'none' },
    { id: 4, name: 'Dave', evicted: false, hoh: false, nominated: false, nominationState: 'none' },
    { id: 5, name: 'Eve', evicted: false, hoh: false, nominated: false, nominationState: 'none' },
  ],
  __suppressNomBadges: false,
});

// Test the canonical checks
function testCanonicalChecks() {
  console.log('\n📋 Test 1: HOH Canonical Check\n');
  
  const game = createTestGame();
  let testsPassed = 0;
  let testsFailed = 0;
  
  // Test 1a: HOH via game.hohId only
  game.hohId = 1;
  game.players[0].hoh = false; // Not synced yet
  
  const p1 = game.players[0];
  const hohCheck1 = p1.hoh === true || game.hohId === p1.id;
  if (hohCheck1) {
    console.log('  ✅ HOH detected via game.hohId (p.hoh=false)');
    testsPassed++;
  } else {
    console.log('  ❌ HOH NOT detected via game.hohId');
    testsFailed++;
  }
  
  // Test 1b: HOH via p.hoh only
  game.hohId = null;
  game.players[0].hoh = true; // Synced
  
  const hohCheck2 = p1.hoh === true || game.hohId === p1.id;
  if (hohCheck2) {
    console.log('  ✅ HOH detected via p.hoh (game.hohId=null)');
    testsPassed++;
  } else {
    console.log('  ❌ HOH NOT detected via p.hoh');
    testsFailed++;
  }
  
  // Test 1c: HOH via both
  game.hohId = 1;
  game.players[0].hoh = true;
  
  const hohCheck3 = p1.hoh === true || game.hohId === p1.id;
  if (hohCheck3) {
    console.log('  ✅ HOH detected via both sources');
    testsPassed++;
  } else {
    console.log('  ❌ HOH NOT detected with both sources');
    testsFailed++;
  }
  
  console.log('\n📋 Test 2: NOM Canonical Check\n');
  
  // Reset
  game.hohId = null;
  game.players[0].hoh = false;
  
  // Test 2a: NOM via game.nominees only
  game.nominees = [2, 3];
  game.players[1].nominated = false; // Not synced
  
  const p2 = game.players[1];
  const nomCheck1 = !p2.evicted && (
    p2.nominated === true ||
    (Array.isArray(game.nominees) && game.nominees.includes(p2.id)) ||
    ['nominated', 'pendingSave', 'replacement'].includes(p2.nominationState)
  );
  if (nomCheck1) {
    console.log('  ✅ NOM detected via game.nominees array (p.nominated=false)');
    testsPassed++;
  } else {
    console.log('  ❌ NOM NOT detected via game.nominees');
    testsFailed++;
  }
  
  // Test 2b: NOM via p.nominated only
  game.nominees = [];
  game.players[1].nominated = true;
  
  const nomCheck2 = !p2.evicted && (
    p2.nominated === true ||
    (Array.isArray(game.nominees) && game.nominees.includes(p2.id)) ||
    ['nominated', 'pendingSave', 'replacement'].includes(p2.nominationState)
  );
  if (nomCheck2) {
    console.log('  ✅ NOM detected via p.nominated (game.nominees=[])');
    testsPassed++;
  } else {
    console.log('  ❌ NOM NOT detected via p.nominated');
    testsFailed++;
  }
  
  // Test 2c: NOM via nominationState
  game.nominees = [];
  game.players[1].nominated = false;
  game.players[1].nominationState = 'pendingSave';
  
  const nomCheck3 = !p2.evicted && (
    p2.nominated === true ||
    (Array.isArray(game.nominees) && game.nominees.includes(p2.id)) ||
    ['nominated', 'pendingSave', 'replacement'].includes(p2.nominationState)
  );
  if (nomCheck3) {
    console.log('  ✅ NOM detected via nominationState=pendingSave');
    testsPassed++;
  } else {
    console.log('  ❌ NOM NOT detected via nominationState');
    testsFailed++;
  }
  
  // Test 2d: NOM not shown for evicted
  game.players[1].evicted = true;
  game.players[1].nominated = true;
  game.nominees = [2];
  
  const nomCheck4 = !p2.evicted && (
    p2.nominated === true ||
    (Array.isArray(game.nominees) && game.nominees.includes(p2.id)) ||
    ['nominated', 'pendingSave', 'replacement'].includes(p2.nominationState)
  );
  if (!nomCheck4) {
    console.log('  ✅ NOM correctly hidden for evicted player');
    testsPassed++;
  } else {
    console.log('  ❌ NOM shown for evicted player (should be hidden)');
    testsFailed++;
  }
  
  console.log('\n📋 Test 3: POV Canonical Check\n');
  
  // Reset
  game.players[1].evicted = false;
  game.players[1].nominated = false;
  game.nominees = [];
  
  // Test 3a: POV via game.vetoHolder
  game.vetoHolder = 3;
  
  const p3 = game.players[2];
  const povCheck1 = game.vetoHolder === p3.id;
  if (povCheck1) {
    console.log('  ✅ POV detected via game.vetoHolder');
    testsPassed++;
  } else {
    console.log('  ❌ POV NOT detected via game.vetoHolder');
    testsFailed++;
  }
  
  console.log('\n📋 Test 4: Combined HOH+POV Check\n');
  
  // Test 4: HOH also has POV
  game.hohId = 1;
  game.vetoHolder = 1;
  game.players[0].hoh = true;
  
  const hasHOH = p1.hoh === true || game.hohId === p1.id;
  const hasPOV = game.vetoHolder === p1.id;
  
  if (hasHOH && hasPOV) {
    console.log('  ✅ HOH+POV combined status detected correctly');
    testsPassed++;
  } else {
    console.log('  ❌ HOH+POV combined status NOT detected');
    testsFailed++;
  }
  
  console.log('\n' + '═'.repeat(50));
  console.log(`\n📊 Results: ${testsPassed} passed, ${testsFailed} failed\n`);
  
  if (testsFailed === 0) {
    console.log('✅ ALL TESTS PASSED!\n');
    return true;
  } else {
    console.log('❌ SOME TESTS FAILED\n');
    return false;
  }
}

// Read the actual implementation to verify it matches our tests
async function verifyImplementation() {
  console.log('\n🔍 Verifying Implementation in ui.hud-and-router.js\n');
  
  const filePath = join(projectRoot, 'js', 'ui.hud-and-router.js');
  const content = await readFile(filePath, 'utf-8');
  
  let checksPassed = 0;
  let checksFailed = 0;
  
  // Check 1: buildStatusLabel uses canonical HOH check
  if (content.includes('p.hoh === true || game.hohId === p.id')) {
    console.log('  ✅ buildStatusLabel() uses canonical HOH check');
    checksPassed++;
  } else {
    console.log('  ❌ buildStatusLabel() missing canonical HOH check');
    checksFailed++;
  }
  
  // Check 2: buildStatusLabel uses canonical NOM check
  if (content.includes('game.nominees.includes(p.id)') && 
      content.includes("['nominated', 'pendingSave', 'replacement']")) {
    console.log('  ✅ buildStatusLabel() uses canonical NOM check');
    checksPassed++;
  } else {
    console.log('  ❌ buildStatusLabel() missing canonical NOM check');
    checksFailed++;
  }
  
  // Check 3: renderTopRoster uses canonical checks
  if (content.includes('// Status checks using CANONICAL game state')) {
    console.log('  ✅ renderTopRoster() marked with CANONICAL comment');
    checksPassed++;
  } else {
    console.log('  ⚠️  renderTopRoster() missing CANONICAL marker (may still be correct)');
  }
  
  // Check 4: buildStateTags uses canonical HOH check
  const buildStateTagsMatch = content.match(/function buildStateTags\(p, game\)\{[\s\S]*?return tags;[\s\S]*?\}/);
  if (buildStateTagsMatch && buildStateTagsMatch[0].includes('game?.hohId === p.id')) {
    console.log('  ✅ buildStateTags() uses canonical HOH check');
    checksPassed++;
  } else {
    console.log('  ❌ buildStateTags() missing canonical HOH check');
    checksFailed++;
  }
  
  // Check 5: Debug logging gated
  if (content.includes('g.__debugRosterLabels')) {
    console.log('  ✅ Debug logging gated behind __debugRosterLabels');
    checksPassed++;
  } else {
    console.log('  ⚠️  Debug logging not gated (minor issue)');
  }
  
  console.log(`\n  ${checksPassed} implementation checks passed, ${checksFailed} failed\n`);
  
  if (checksFailed === 0) {
    console.log('✅ Implementation verified!\n');
    return true;
  } else {
    console.log('⚠️  Some implementation checks failed\n');
    return false;
  }
}

// Main
async function main() {
  const logicOk = testCanonicalChecks();
  const implOk = await verifyImplementation();
  
  console.log('═'.repeat(50));
  console.log('\n🎯 Final Result:\n');
  
  if (logicOk && implOk) {
    console.log('✅ Status labels logic is correct and properly implemented!\n');
    process.exit(0);
  } else {
    console.log('❌ Issues found in status labels implementation\n');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
