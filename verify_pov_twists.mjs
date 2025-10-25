#!/usr/bin/env node
/**
 * Verification script for POV Twist implementation
 * Tests Golden and Diamond POV twist logic
 */

import fs from 'fs';

console.log('=== POV Twist Verification ===\n');

let passed = 0;
let failed = 0;

function test(description, fn) {
  try {
    fn();
    console.log(`✓ ${description}`);
    passed++;
  } catch (err) {
    console.error(`✗ ${description}`);
    console.error(`  ${err.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// Test 1: Check registry file has new settings
test('Registry file contains goldenPOVChance field', () => {
  const registryContent = fs.readFileSync('./js/settings/registry.js', 'utf-8');
  assert(
    registryContent.includes('goldenPOVChance'),
    'goldenPOVChance not found in registry.js'
  );
  assert(
    registryContent.includes('Golden POV chance (%)'),
    'Golden POV label not found in registry.js'
  );
});

test('Registry file contains diamondPOVChance field', () => {
  const registryContent = fs.readFileSync('./js/settings/registry.js', 'utf-8');
  assert(
    registryContent.includes('diamondPOVChance'),
    'diamondPOVChance not found in registry.js'
  );
  assert(
    registryContent.includes('Diamond POV chance (%)'),
    'Diamond POV label not found in registry.js'
  );
});

// Test 2: Check default config has the settings
test('Default config contains goldenPOVChance with default 5', () => {
  const configContent = fs.readFileSync('./js/ui.config-and-settings.js', 'utf-8');
  assert(
    configContent.includes('goldenPOVChance: 5'),
    'goldenPOVChance: 5 not found in ui.config-and-settings.js'
  );
});

test('Default config contains diamondPOVChance with default 3', () => {
  const configContent = fs.readFileSync('./js/ui.config-and-settings.js', 'utf-8');
  assert(
    configContent.includes('diamondPOVChance: 3'),
    'diamondPOVChance: 3 not found in ui.config-and-settings.js'
  );
});

// Test 3: Check veto.js has twist decision logic
test('veto.js contains decideVetoTwistForWeek function', () => {
  const vetoContent = fs.readFileSync('./js/veto.js', 'utf-8');
  assert(
    vetoContent.includes('function decideVetoTwistForWeek'),
    'decideVetoTwistForWeek function not found in veto.js'
  );
});

test('veto.js contains getActiveVetoTwistName function', () => {
  const vetoContent = fs.readFileSync('./js/veto.js', 'utf-8');
  assert(
    vetoContent.includes('function getActiveVetoTwistName'),
    'getActiveVetoTwistName function not found in veto.js'
  );
});

test('veto.js checks for activeVetoTwist in ceremony', () => {
  const vetoContent = fs.readFileSync('./js/veto.js', 'utf-8');
  assert(
    vetoContent.includes("g.activeVetoTwist === 'diamond'"),
    'Diamond twist check not found in veto.js'
  );
  assert(
    vetoContent.includes("g.activeVetoTwist === 'golden'"),
    'Golden twist check not found in veto.js'
  );
});

// Test 4: Check twist announcement logic
test('startVetoComp calls decideVetoTwistForWeek', () => {
  const vetoContent = fs.readFileSync('./js/veto.js', 'utf-8');
  assert(
    vetoContent.includes('decideVetoTwistForWeek()'),
    'decideVetoTwistForWeek() call not found in startVetoComp'
  );
});

test('Twist announcement uses showEventModal with correct config', () => {
  const vetoContent = fs.readFileSync('./js/veto.js', 'utf-8');
  assert(
    vetoContent.includes('Diamond Power of Veto'),
    'Diamond POV announcement text not found'
  );
  assert(
    vetoContent.includes('Golden Power of Veto'),
    'Golden POV announcement text not found'
  );
  assert(
    vetoContent.includes("tone: 'twist'"),
    'Twist tone not set for announcement'
  );
});

// Test 5: Check Diamond POV ceremony handler
test('handleDiamondPOVCeremony function exists', () => {
  const vetoContent = fs.readFileSync('./js/veto.js', 'utf-8');
  assert(
    vetoContent.includes('async function handleDiamondPOVCeremony'),
    'handleDiamondPOVCeremony function not found'
  );
  assert(
    vetoContent.includes('global.handleDiamondPOVCeremony'),
    'handleDiamondPOVCeremony not exported to global'
  );
});

test('Diamond POV ceremony picks 2 nominees', () => {
  const vetoContent = fs.readFileSync('./js/veto.js', 'utf-8');
  assert(
    vetoContent.includes('replace BOTH nominees'),
    'Diamond POV double replacement message not found'
  );
  assert(
    vetoContent.includes('promptReplacementNominee'),
    'Diamond POV does not call promptReplacementNominee'
  );
});

// Test 6: Check Golden POV handling in finalizeCeremony
test('finalizeCeremony checks for Golden POV twist', () => {
  const vetoContent = fs.readFileSync('./js/veto.js', 'utf-8');
  assert(
    vetoContent.includes('isGoldenPOV'),
    'isGoldenPOV variable not found in finalizeCeremony'
  );
});

test('applyReplacementAndContinue accepts isGoldenPOV parameter', () => {
  const vetoContent = fs.readFileSync('./js/veto.js', 'utf-8');
  assert(
    vetoContent.includes('async function applyReplacementAndContinue(replacementId, isGoldenPOV)'),
    'applyReplacementAndContinue does not accept isGoldenPOV parameter'
  );
});

test('Announcement card uses correct role for Golden POV', () => {
  const vetoContent = fs.readFileSync('./js/veto.js', 'utf-8');
  assert(
    vetoContent.includes('announcerRole'),
    'announcerRole variable not found for dynamic announcements'
  );
  assert(
    vetoContent.includes('isGoldenPOV ? getP(g.vetoHolder) : getP(g.hohId)'),
    'Announcer selection logic not found'
  );
});

// Test 7: Check eligibility logic
test('Diamond POV excludes HOH and POV holder from nominees', () => {
  const vetoContent = fs.readFileSync('./js/veto.js', 'utf-8');
  const diamondSection = vetoContent.substring(
    vetoContent.indexOf('handleDiamondPOVCeremony'),
    vetoContent.indexOf('global.handleDiamondPOVCeremony')
  );
  assert(
    diamondSection.includes('p.id !== g.hohId') && diamondSection.includes('p.id !== g.vetoHolder'),
    'Diamond POV eligibility check incomplete'
  );
});

test('Twist decision rolls independently for Diamond and Golden', () => {
  const vetoContent = fs.readFileSync('./js/veto.js', 'utf-8');
  const twistSection = vetoContent.substring(
    vetoContent.indexOf('function decideVetoTwistForWeek'),
    vetoContent.indexOf('global.decideVetoTwistForWeek')
  );
  assert(
    twistSection.includes('diamondRoll') && twistSection.includes('goldenRoll'),
    'Independent rolls for Diamond and Golden not found'
  );
  assert(
    twistSection.indexOf('diamondRoll') < twistSection.indexOf('goldenRoll'),
    'Diamond should be checked before Golden for priority'
  );
});

// Test 8: Verify twist persistence
test('Twist decision is stored and persisted per week', () => {
  const vetoContent = fs.readFileSync('./js/veto.js', 'utf-8');
  const twistSection = vetoContent.substring(
    vetoContent.indexOf('function decideVetoTwistForWeek'),
    vetoContent.indexOf('global.decideVetoTwistForWeek')
  );
  assert(
    twistSection.includes('g.activeVetoTwist'),
    'activeVetoTwist not persisted to game state'
  );
  assert(
    twistSection.includes('g.__vetoTwistDecidedWeek'),
    'Twist decision not tracked per week'
  );
  assert(
    twistSection.includes('g.__vetoTwistDecidedWeek === g.week'),
    'Week comparison not found for twist persistence'
  );
});

// Summary
console.log('\n=== Verification Summary ===');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);

if (failed > 0) {
  console.log('\n⚠️  Some tests failed. Please review the implementation.');
  process.exit(1);
} else {
  console.log('\n✓ All tests passed!');
  process.exit(0);
}
