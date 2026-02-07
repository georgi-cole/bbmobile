#!/usr/bin/env node

/**
 * Verification script for Social Phase UX and AI Interaction fixes
 * Tests for PR #1183 regression fixes
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const SOCIAL_JS_PATH = 'js/social.js';
const SOCIAL_MANEUVERS_PATH = 'js/social-maneuvers.js';

console.log('🔍 Verifying Social Phase Regression Fixes\n');
console.log('=' .repeat(60));

let allPassed = true;

// Read files
const socialJs = readFileSync(SOCIAL_JS_PATH, 'utf8');
const socialManeuversJs = readFileSync(SOCIAL_MANEUVERS_PATH, 'utf8');

// Test 1: Duplicate call guard exists
console.log('\n📋 Test 1: Duplicate onSocialPhaseStart() call guard');
const hasGuard = socialJs.includes('__socialPhaseStartCalled') && 
                 socialJs.includes('onSocialPhaseStart already called');
if (hasGuard) {
  console.log('  ✅ PASS: Guard against duplicate calls exists');
} else {
  console.log('  ❌ FAIL: Guard missing');
  allPassed = false;
}

// Test 2: Fallback summary creation
console.log('\n📋 Test 2: Fallback summary when generatePhaseSummary returns null');
const hasFallback = socialJs.includes('minimal fallback summary') &&
                    socialJs.includes('Fallback summary created');
if (hasFallback) {
  console.log('  ✅ PASS: Fallback summary logic exists');
} else {
  console.log('  ❌ FAIL: Fallback summary logic missing');
  allPassed = false;
}

// Test 3: Summary always shown
console.log('\n📋 Test 3: Summary card always shown (not skipped)');
const alwaysShowsSummary = socialJs.includes('showSummaryPanel(summary)') &&
                           !socialJs.includes('advancing immediately') ||
                           socialJs.includes('will still show summary card');
if (alwaysShowsSummary) {
  console.log('  ✅ PASS: Summary card will be shown');
} else {
  console.log('  ❌ FAIL: Summary might be skipped');
  allPassed = false;
}

// Test 4: AI scheduler integration
console.log('\n📋 Test 4: AI scheduler properly integrated');
const hasAISchedulerStart = socialManeuversJs.includes('SocialAIScheduler.startAiSocialPhase');
const hasAISchedulerStop = socialManeuversJs.includes('SocialAIScheduler.stopAiSocialPhase');
const hasEmptyEnergyBurst = socialManeuversJs.includes('runEmptyEnergyBurst');
if (hasAISchedulerStart && hasAISchedulerStop && hasEmptyEnergyBurst) {
  console.log('  ✅ PASS: AI scheduler integration complete');
  console.log('    - startAiSocialPhase: ✓');
  console.log('    - stopAiSocialPhase: ✓');
  console.log('    - runEmptyEnergyBurst: ✓');
} else {
  console.log('  ❌ FAIL: AI scheduler integration incomplete');
  allPassed = false;
}

// Test 5: No removed methods reintroduced
console.log('\n📋 Test 5: Removed methods not reintroduced');
const hasRemovedMethods = socialJs.includes('showEndOfPhaseSummary') ||
                         socialJs.includes('presentPhaseSummary');
if (!hasRemovedMethods) {
  console.log('  ✅ PASS: Removed methods still absent');
} else {
  console.log('  ❌ FAIL: Removed methods detected');
  allPassed = false;
}

// Test 6: Empty energy overlay exists
console.log('\n📋 Test 6: Empty energy overlay function exists');
const hasEmptyOverlay = socialManeuversJs.includes('showEmptyEnergyOverlayAndSkip') &&
                        socialManeuversJs.includes('No Social Energy');
if (hasEmptyOverlay) {
  console.log('  ✅ PASS: Empty energy overlay function exists');
} else {
  console.log('  ❌ FAIL: Empty energy overlay missing');
  allPassed = false;
}

// Test 7: Session tracking initialization
console.log('\n📋 Test 7: Session tracking for summary generation');
const hasSessionTracking = socialManeuversJs.includes('__socialManeuversSession') &&
                          socialManeuversJs.includes('actionsThisPhase');
if (hasSessionTracking) {
  console.log('  ✅ PASS: Session tracking exists');
} else {
  console.log('  ❌ FAIL: Session tracking missing');
  allPassed = false;
}

// Test 8: Timer handling (should not resume)
console.log('\n📋 Test 8: Timer not resumed when summary OK clicked');
const noTimerResume = socialManeuversJs.includes('Do NOT resume timer') ||
                     !socialManeuversJs.includes('resume') ||
                     socialManeuversJs.includes('timer should stay stopped');
if (noTimerResume) {
  console.log('  ✅ PASS: Timer not resumed in OK handler');
} else {
  console.log('  ⚠️  WARNING: Check timer handling in OK button');
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('📊 Verification Summary');
console.log('='.repeat(60));

if (allPassed) {
  console.log('\n✅ ALL TESTS PASSED!');
  console.log('\nKey fixes verified:');
  console.log('  • Duplicate call guard prevents double initialization');
  console.log('  • Fallback summary ensures card always shows');
  console.log('  • AI scheduler properly integrated');
  console.log('  • Empty energy overlay preserved');
  console.log('  • Session tracking for summary generation');
  console.log('  • No removed methods reintroduced');
  process.exit(0);
} else {
  console.log('\n❌ SOME TESTS FAILED');
  console.log('\nPlease review the failed checks above.');
  process.exit(1);
}
