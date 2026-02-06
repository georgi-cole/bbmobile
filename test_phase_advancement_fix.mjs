#!/usr/bin/env node

/**
 * Test: Social Phase Timer Advancement Fix
 * 
 * Verifies that:
 * 1. showSummaryPanel is called with summary data (not undefined)
 * 2. Callback is stored before summary is shown
 * 3. OK button can retrieve and execute the callback
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🧪 Testing Social Phase Timer Advancement Fix\n');
console.log('═══════════════════════════════════════════\n');

// Test 1: Verify social.js calls generatePhaseSummary before showSummaryPanel
console.log('📋 Test 1: social.js generates summary before showing panel');
const socialJsPath = join(__dirname, 'js', 'social.js');
const socialJsContent = readFileSync(socialJsPath, 'utf-8');

// Check for the pattern: generatePhaseSummary() followed by showSummaryPanel(summary)
const hasGenerateSummaryCall = /generatePhaseSummary\(\)/.test(socialJsContent);
const hasSummaryParamCheck = /if\s*\(\s*summary\s*\)/.test(socialJsContent);
const passesummaryToPanel = /showSummaryPanel\(\s*summary\s*\)/.test(socialJsContent);

if (hasGenerateSummaryCall && passesummaryToPanel) {
  console.log('  ✅ PASS: social.js generates summary and passes it to showSummaryPanel');
} else {
  console.log('  ❌ FAIL: social.js does not properly generate/pass summary');
  console.log('    - Generates summary:', hasGenerateSummaryCall);
  console.log('    - Passes to panel:', passesummaryToPanel);
}

// Test 2: Verify callback is stored before showSummaryPanel is called
console.log('\n📋 Test 2: Callback stored before showing summary');
const callbackStoredBeforeSummary = socialJsContent.indexOf('__socialPhaseAdvanceCallback') < 
                                     socialJsContent.indexOf('showSummaryPanel(summary)');

if (callbackStoredBeforeSummary) {
  console.log('  ✅ PASS: Callback stored before showSummaryPanel called');
} else {
  console.log('  ❌ FAIL: Callback not stored before showSummaryPanel');
}

// Test 3: Verify showSummaryPanel guards against undefined summary
console.log('\n📋 Test 3: showSummaryPanel guards against undefined');
const socialManeuversPath = join(__dirname, 'js', 'social-maneuvers.js');
const socialManeuversContent = readFileSync(socialManeuversPath, 'utf-8');

const hasGuardCheck = /function showSummaryPanel\(summary\)\s*\{[^}]*if\s*\(\s*!summary\s*\)\s*return/.test(socialManeuversContent);

if (hasGuardCheck) {
  console.log('  ✅ PASS: showSummaryPanel has guard against undefined summary');
} else {
  console.log('  ❌ FAIL: showSummaryPanel missing undefined guard');
}

// Test 4: Verify OK button calls stored callback
console.log('\n📋 Test 4: OK button calls stored callback');
const okButtonCallsCallback = /__socialPhaseAdvanceCallback\(\)/.test(socialManeuversContent);
const okButtonDeletesCallback = /delete\s+g\.__socialPhaseAdvanceCallback/.test(socialManeuversContent);

if (okButtonCallsCallback && okButtonDeletesCallback) {
  console.log('  ✅ PASS: OK button calls and cleans up callback');
} else {
  console.log('  ❌ FAIL: OK button callback logic incomplete');
  console.log('    - Calls callback:', okButtonCallsCallback);
  console.log('    - Deletes callback:', okButtonDeletesCallback);
}

// Test 5: Verify zero energy fallback uses callback system
console.log('\n📋 Test 5: Zero energy fallback uses callback system');
// Look for advanceToNextPhase definition within scheduleFastAdvanceFallback
const fallbackDefinesAdvanceFunction = /const\s+advanceToNextPhase\s*=/.test(socialManeuversContent);
const fallbackStoresCallback = /__socialPhaseAdvanceCallback\s*=\s*advanceToNextPhase/.test(socialManeuversContent);

if (fallbackStoresCallback && fallbackDefinesAdvanceFunction) {
  console.log('  ✅ PASS: Zero energy fallback stores callback for OK button');
} else {
  console.log('  ❌ FAIL: Zero energy fallback does not use callback system');
  console.log('    - Stores callback:', fallbackStoresCallback);
  console.log('    - Defines advance function:', fallbackDefinesAdvanceFunction);
}

// Test 6: Verify no duplicate phase advancement
console.log('\n📋 Test 6: No duplicate phase advancement in fallback');
// After storing callback, the fallback should NOT directly advance the phase
// Look for the pattern where after showSummaryPanel, there's no immediate startNominations call
const fallbackPattern = /showSummaryPanel\(generatePhaseSummary\(\)\)[\s\S]{0,200}__socialPhaseAdvanceCallback\s*=\s*advanceToNextPhase[\s\S]{0,400}(startNominations|setPhase\('nominations')/;
const hasDuplicateAdvance = fallbackPattern.test(socialManeuversContent);

// We want this to be FALSE - no duplicate advancement after storing callback
if (!hasDuplicateAdvance) {
  console.log('  ✅ PASS: Fallback does not duplicate phase advancement');
} else {
  console.log('  ⚠️  WARN: Fallback may still have duplicate phase advancement');
}

console.log('\n═══════════════════════════════════════════');
console.log('📊 Test Summary');
console.log('═══════════════════════════════════════════\n');

const allPassed = hasGenerateSummaryCall && passesummaryToPanel && 
                  callbackStoredBeforeSummary && hasGuardCheck && 
                  okButtonCallsCallback && okButtonDeletesCallback &&
                  fallbackStoresCallback && fallbackDefinesAdvanceFunction &&
                  !hasDuplicateAdvance;

if (allPassed) {
  console.log('✅ ALL TESTS PASSED!');
  console.log('\nThe social phase timer advancement fix is correctly implemented:');
  console.log('  • Summary is generated before being shown');
  console.log('  • Callback is stored before summary display');
  console.log('  • OK button properly executes the callback');
  console.log('  • Zero energy flow uses the same callback system');
  console.log('  • No duplicate phase advancements');
  process.exit(0);
} else {
  console.log('⚠️  SOME TESTS FAILED OR HAVE WARNINGS');
  console.log('\nPlease review the test results above.');
  process.exit(1);
}
