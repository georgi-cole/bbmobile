#!/usr/bin/env node
/**
 * SM Bank Watchers - Node.js Validation Test
 * Tests the key functionality of the SM Bank system with property watchers
 */

console.log('🏦 SM Bank Watchers - Node.js Validation Test\n');

// Mock browser environment
global.window = global;
global.document = {
  getElementById: () => null,
  createElement: () => ({ appendChild: () => {}, style: {} }),
  body: { appendChild: () => {} }
};

// Setup game object
global.game = {
  week: 1,
  phase: 'pre_hoh',
  humanId: 1,
  cfg: { enableSocialManeuvers: true }
};

global.alivePlayers = () => [
  { id: 1, name: 'Player 1' },
  { id: 2, name: 'Player 2' },
  { id: 3, name: 'Player 3' }
];

global.getP = (id) => global.alivePlayers().find(p => p.id === id);
global.safeName = (id) => global.getP(id)?.name || `Player ${id}`;

// Mock console methods for cleaner output
const originalConsoleInfo = console.info;
const logs = [];
console.info = (...args) => {
  logs.push(args.join(' '));
};

// Load the module by evaluating it
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const moduleCode = fs.readFileSync(path.join(__dirname, 'js/social-maneuvers.js'), 'utf8');

try {
  eval(moduleCode);
} catch(e) {
  console.error('Failed to load module:', e);
  process.exit(1);
}

// Restore console.info for test output
console.info = originalConsoleInfo;

console.log('✓ Module loaded successfully\n');

// Test suite
let passCount = 0;
let failCount = 0;

function test(name, fn) {
  console.log(`\n=== ${name} ===`);
  try {
    const result = fn();
    if(result) {
      console.log('✓ PASS');
      passCount++;
    } else {
      console.log('✗ FAIL');
      failCount++;
    }
  } catch(e) {
    console.log('✗ FAIL:', e.message);
    failCount++;
  }
}

// Test 1: Module exports
test('Module Exports', () => {
  const hasExports = global.SocialManeuvers && 
                     global.SocialManeuvers.SocialEnergyBank &&
                     global.SocialManeuvers.SocialResources;
  console.log('  SocialManeuvers exported:', !!global.SocialManeuvers);
  console.log('  SocialEnergyBank exported:', !!global.SocialManeuvers?.SocialEnergyBank);
  console.log('  SocialResources exported:', !!global.SocialManeuvers?.SocialResources);
  console.log('  SM_BANK_CONFIG exported:', !!global.SocialManeuvers?.SM_BANK_CONFIG);
  return hasExports;
});

// Test 2: Bank initialization to 0
test('Bank Initialization to 0', () => {
  global.SocialManeuvers.SocialEnergyBank.init(1);
  const bank = global.SocialManeuvers.SocialEnergyBank.get(1);
  console.log('  Bank for Player 1:', bank);
  return bank === 0;
});

// Test 3: CONFIG.baseWeeklyAdd exists
test('CONFIG.baseWeeklyAdd', () => {
  const config = global.SocialManeuvers.SocialResources.CONFIG;
  console.log('  CONFIG:', config);
  console.log('  baseWeeklyAdd:', config?.baseWeeklyAdd);
  return config && config.baseWeeklyAdd === 5;
});

// Test 4: Property watchers installed
test('Property Watchers Installed', () => {
  const g = global.game;
  const hohDesc = Object.getOwnPropertyDescriptor(g, 'hohId');
  const weekDesc = Object.getOwnPropertyDescriptor(g, 'week');
  
  console.log('  hohId has getter/setter:', !!(hohDesc && hohDesc.get && hohDesc.set));
  console.log('  week has getter/setter:', !!(weekDesc && weekDesc.get && weekDesc.set));
  
  return hohDesc && hohDesc.get && hohDesc.set && weekDesc && weekDesc.get && weekDesc.set;
});

// Test 5: HOH win adds +5 to bank
test('HOH Win Event (+5 to bank)', () => {
  const bankBefore = global.SocialManeuvers.SocialEnergyBank.get(1);
  global.game.hohId = 1;
  const bankAfter = global.SocialManeuvers.SocialEnergyBank.get(1);
  
  console.log('  Bank before:', bankBefore);
  console.log('  Bank after:', bankAfter);
  console.log('  Delta:', bankAfter - bankBefore);
  
  return (bankAfter - bankBefore) === 5;
});

// Test 6: POV win adds +3 to bank
test('POV Win Event (+3 to bank)', () => {
  const bankBefore = global.SocialManeuvers.SocialEnergyBank.get(2);
  global.game.vetoHolder = 2;
  const bankAfter = global.SocialManeuvers.SocialEnergyBank.get(2);
  
  console.log('  Bank before:', bankBefore);
  console.log('  Bank after:', bankAfter);
  console.log('  Delta:', bankAfter - bankBefore);
  
  return (bankAfter - bankBefore) === 3;
});

// Test 7: Nomination adds +4 to bank
test('Nomination Event (+4 to bank)', () => {
  const bankBefore = global.SocialManeuvers.SocialEnergyBank.get(3);
  global.game.nominees = [3];
  const bankAfter = global.SocialManeuvers.SocialEnergyBank.get(3);
  
  console.log('  Bank before:', bankBefore);
  console.log('  Bank after:', bankAfter);
  console.log('  Delta:', bankAfter - bankBefore);
  
  return (bankAfter - bankBefore) === 4;
});

// Test 8: Week rollover adds +5 to all
test('Week Rollover (+5 to all alive)', () => {
  const alivePlayers = global.alivePlayers();
  const banksBefore = alivePlayers.map(p => ({
    id: p.id,
    bank: global.SocialManeuvers.SocialEnergyBank.get(p.id)
  }));
  
  global.game.week = 2;
  
  const banksAfter = alivePlayers.map(p => ({
    id: p.id,
    bank: global.SocialManeuvers.SocialEnergyBank.get(p.id)
  }));
  
  let allCorrect = true;
  for(let i = 0; i < alivePlayers.length; i++) {
    const delta = banksAfter[i].bank - banksBefore[i].bank;
    console.log(`  Player ${alivePlayers[i].id}: ${banksBefore[i].bank} → ${banksAfter[i].bank} (+${delta})`);
    if(delta !== 5) allCorrect = false;
  }
  
  return allCorrect;
});

// Test 9: Phase seeding from bank
test('Phase Seeding from Bank', () => {
  const bank1 = global.SocialManeuvers.SocialEnergyBank.get(1);
  global.SocialManeuvers.SocialResources.recomputePhaseEnergy(1);
  const phaseEnergy = global.SocialManeuvers.SocialResources.get(1, 'energy');
  
  console.log('  Bank balance:', bank1);
  console.log('  Phase energy:', phaseEnergy);
  
  return phaseEnergy === bank1;
});

// Test 10: No double-application (idempotency)
test('Event Idempotency (no double-application)', () => {
  const bankBefore = global.SocialManeuvers.SocialEnergyBank.get(1);
  
  // Try to trigger HOH win again for same player/week
  global.game.hohId = 1;
  
  const bankAfter = global.SocialManeuvers.SocialEnergyBank.get(1);
  const delta = bankAfter - bankBefore;
  
  console.log('  Bank before re-trigger:', bankBefore);
  console.log('  Bank after re-trigger:', bankAfter);
  console.log('  Delta:', delta);
  console.log('  Should be 0 (already applied)');
  
  return delta === 0;
});

// Summary
console.log('\n' + '='.repeat(50));
console.log('Test Summary');
console.log('='.repeat(50));
console.log(`✓ Passed: ${passCount}`);
console.log(`✗ Failed: ${failCount}`);
console.log('='.repeat(50));

if(failCount === 0) {
  console.log('\n✅ ALL TESTS PASSED!\n');
  process.exit(0);
} else {
  console.log('\n❌ SOME TESTS FAILED\n');
  process.exit(1);
}
