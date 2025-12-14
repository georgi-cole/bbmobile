#!/usr/bin/env node
/**
 * Verification script for Social Strategy v2 implementation
 * Checks that all v2 features are properly integrated
 */

import { readFileSync } from 'fs';

const SOCIAL_MANEUVERS_PATH = 'js/social-maneuvers.js';

console.log('🔍 Social Strategy v2 Implementation Verification\n');
console.log('═'.repeat(60));

let passCount = 0;
let failCount = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passCount++;
  } catch (error) {
    console.log(`❌ ${name}`);
    console.log(`   ${error.message}`);
    failCount++;
  }
}

// Read the file
const content = readFileSync(SOCIAL_MANEUVERS_PATH, 'utf-8');

// Test 1: New v2 constants exist
test('v2 constants defined', () => {
  const constants = [
    'INFLUENCE_POSITIVE_ACTION_THRESHOLD',
    'INFLUENCE_PER_TARGET_PHASE_CAP',
    'INFLUENCE_DIMINISHING_RETURNS_THRESHOLD',
    'INFLUENCE_DIMINISHING_RETURNS_RATE',
    'INFORMATION_HIGH_THRESHOLD',
    'INFORMATION_HIGH_CARRYOVER',
    'INFORMATION_UNUSED_DECAY_RATE',
    'INFORMATION_PER_PHASE_CAP',
    'INFORMATION_SECRECY_MULTIPLIERS'
  ];
  
  for (const constant of constants) {
    if (!content.includes(`const ${constant}`)) {
      throw new Error(`Missing constant: ${constant}`);
    }
  }
});

// Test 2: New v2 tracking structures initialized
test('v2 tracking structures initialized', () => {
  const structures = [
    '__influenceActions',
    '__survivalStreaks',
    '__phaseInfluenceGains',
    '__phaseInformationGains',
    '__informationUsageTracking'
  ];
  
  for (const structure of structures) {
    if (!content.includes(`g.${structure}`)) {
      throw new Error(`Missing tracking structure: ${structure}`);
    }
  }
});

// Test 3: New v2 helper functions exist
test('v2 helper functions defined', () => {
  const functions = [
    'function scaleWeeklyBonus(',
    'function calculateInfoGain(',
    'function attributeResourcesPostEvent(',
    'function reconcilePhaseEnd(',
    'function calculateAverageInfluence('
  ];
  
  for (const func of functions) {
    if (!content.includes(func)) {
      throw new Error(`Missing function: ${func}`);
    }
  }
});

// Test 4: adjustInfluence updated with v2 logic
test('adjustInfluence includes v2 logic', () => {
  const checks = [
    'INFLUENCE_DIMINISHING_RETURNS_THRESHOLD',
    'INFLUENCE_DIMINISHING_RETURNS_RATE',
    'INFLUENCE_PER_TARGET_PHASE_CAP',
    '__influenceActions',
    '__phaseInfluenceGains',
    'Diminishing returns'
  ];
  
  const adjustInfluenceSection = content.substring(
    content.indexOf('adjustInfluence(actorId, targetId, delta)'),
    content.indexOf('adjustInfluence(actorId, targetId, delta)') + 2000
  );
  
  for (const check of checks) {
    if (!adjustInfluenceSection.includes(check)) {
      throw new Error(`adjustInfluence missing v2 check: ${check}`);
    }
  }
});

// Test 5: Information gain uses calculateInfoGain
test('Information gain uses v2 scaling', () => {
  const checks = [
    'calculateInfoGain(actorId, targetId',
    'INFORMATION_EARNINGS.STRATEGY_CHAT_REVEAL',
    'INFORMATION_EARNINGS.INTERROGATE_SUCCESS',
    'INFORMATION_EARNINGS.EAVESDROP_SUCCESS'
  ];
  
  for (const check of checks) {
    if (!content.includes(check)) {
      throw new Error(`Information gain missing v2 check: ${check}`);
    }
  }
});

// Test 6: Phase-end reconciliation called
test('Phase-end reconciliation integrated', () => {
  if (!content.includes('reconcilePhaseEnd()')) {
    throw new Error('reconcilePhaseEnd() not called in onSocialPhaseEnd');
  }
  if (!content.includes('v2: Phase-end reconciliation')) {
    throw new Error('Phase-end reconciliation comment missing');
  }
});

// Test 7: Weekly reset includes v2 logic
test('Weekly reset includes v2 improvements', () => {
  const checks = [
    'INFORMATION_HIGH_THRESHOLD',
    'INFORMATION_HIGH_CARRYOVER',
    'INFLUENCE_POSITIVE_ACTION_THRESHOLD',
    'v2:'
  ];
  
  const resetSection = content.substring(
    content.indexOf('resetWeekly(playerId)'),
    content.indexOf('resetWeekly(playerId)') + 3000
  );
  
  for (const check of checks) {
    if (!resetSection.includes(check)) {
      throw new Error(`resetWeekly missing v2 check: ${check}`);
    }
  }
});

// Test 8: recordPositiveInteraction tracks counts
test('recordPositiveInteraction tracks counts', () => {
  const posInteractionSection = content.substring(
    content.indexOf('recordPositiveInteraction(actorId, targetId)'),
    content.indexOf('recordPositiveInteraction(actorId, targetId)') + 500
  );
  
  if (!posInteractionSection.includes('count + 1')) {
    throw new Error('recordPositiveInteraction not tracking counts');
  }
  if (!posInteractionSection.includes('[sm-v2]')) {
    throw new Error('recordPositiveInteraction missing v2 logging');
  }
});

// Test 9: Debug API extended
test('Debug API includes v2 methods', () => {
  const debugMethods = [
    'testScaledBonus',
    'testInfoGain',
    'testAttributePost',
    'testReconcile',
    'showV2Stats',
    'showAllV2Stats'
  ];
  
  for (const method of debugMethods) {
    if (!content.includes(`${method}(`)) {
      throw new Error(`Debug API missing method: ${method}`);
    }
  }
});

// Test 10: Exports updated
test('Global exports include v2 functions', () => {
  const exports = [
    'scaleWeeklyBonus',
    'calculateInfoGain',
    'attributeResourcesPostEvent',
    'reconcilePhaseEnd',
    'calculateAverageInfluence',
    'INFLUENCE_DIMINISHING_RETURNS_RATE',
    'INFORMATION_SECRECY_MULTIPLIERS'
  ];
  
  const exportSection = content.substring(
    content.indexOf('global.SocialManeuvers = {'),
    content.indexOf('global.SocialManeuvers = {') + 2000
  );
  
  for (const exp of exports) {
    if (!exportSection.includes(exp)) {
      throw new Error(`Global exports missing: ${exp}`);
    }
  }
});

// Test 11: SM_BANK_CONFIG updated
test('SM_BANK_CONFIG includes v2 settings', () => {
  const bankConfigSection = content.substring(
    content.indexOf('const SM_BANK_CONFIG'),
    content.indexOf('const SM_BANK_CONFIG') + 300
  );
  
  const configs = [
    'phaseEndDecayRate',
    'perWeekEventCap',
    'diversityRequired'
  ];
  
  for (const config of configs) {
    if (!bankConfigSection.includes(config)) {
      throw new Error(`SM_BANK_CONFIG missing: ${config}`);
    }
  }
});

// Test 12: Logging includes v2 tags
test('v2 logging tags present', () => {
  const v2LogCount = (content.match(/\[sm-v2\]/g) || []).length;
  if (v2LogCount < 15) {
    throw new Error(`Insufficient v2 logging (found ${v2LogCount}, expected ≥15)`);
  }
});

// Summary
console.log('═'.repeat(60));
console.log(`\n📊 Verification Summary:`);
console.log(`   ✅ Passed: ${passCount}`);
console.log(`   ❌ Failed: ${failCount}`);
console.log(`   📈 Success Rate: ${((passCount / (passCount + failCount)) * 100).toFixed(1)}%\n`);

if (failCount === 0) {
  console.log('✅ All v2 implementation checks passed!');
  process.exit(0);
} else {
  console.log('❌ Some v2 implementation checks failed');
  process.exit(1);
}
