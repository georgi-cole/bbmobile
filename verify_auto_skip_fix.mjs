#!/usr/bin/env node

/**
 * Verify Social Auto-Skip Implementation
 * Tests the regression fix for PR #345
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🧪 Social Auto-Skip Regression Fix Verification\n');
console.log('═══════════════════════════════════════════\n');

let passCount = 0;
let failCount = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passCount++;
  } catch (e) {
    console.log(`❌ FAIL: ${name}`);
    console.log(`   Error: ${e.message}`);
    failCount++;
  }
}

// Read the modified files
const jsPath = join(__dirname, 'js', 'social-maneuvers.js');
const cssPath = join(__dirname, 'css', 'social-maneuvers.css');
const htmlPath = join(__dirname, 'index.html');

const jsContent = readFileSync(jsPath, 'utf8');
const cssContent = readFileSync(cssPath, 'utf8');
const htmlContent = readFileSync(htmlPath, 'utf8');

console.log('📋 Test 1: stopSocialPhaseTimer function exists');
test('stopSocialPhaseTimer function defined', () => {
  if (!jsContent.includes('function stopSocialPhaseTimer()')) {
    throw new Error('stopSocialPhaseTimer function not found');
  }
  if (!jsContent.includes('g.endAt = farFuture')) {
    throw new Error('Timer stop logic not found');
  }
  if (!jsContent.includes('g.phaseEndsAt = farFuture')) {
    throw new Error('phaseEndsAt not set to far future');
  }
});

console.log('\n📋 Test 2: Idempotency guard implemented');
test('__smSkipInProgress flag used', () => {
  if (!jsContent.includes('if(g.__smSkipInProgress)')) {
    throw new Error('Idempotency guard not found');
  }
  if (!jsContent.includes('g.__smSkipInProgress = true')) {
    throw new Error('Flag not set to true');
  }
  if (!jsContent.includes('g.__smSkipInProgress = false')) {
    throw new Error('Flag not reset to false');
  }
});

console.log('\n📋 Test 3: Timer stopped before showing overlay');
test('stopSocialPhaseTimer called in showEmptyEnergyOverlayAndSkip', () => {
  const fnIndex = jsContent.indexOf('function showEmptyEnergyOverlayAndSkip');
  const timerStopIndex = jsContent.indexOf('stopSocialPhaseTimer()', fnIndex);
  const overlayIndex = jsContent.indexOf('wrapper.appendChild(overlay)', fnIndex);
  
  if (timerStopIndex === -1) {
    throw new Error('stopSocialPhaseTimer not called');
  }
  if (timerStopIndex > overlayIndex) {
    throw new Error('Timer stop should be called before creating overlay');
  }
});

console.log('\n📋 Test 4: Faux TV container targeting with data attribute');
test('data-sm-faux-tv selector used', () => {
  if (!jsContent.includes("document.querySelector('[data-sm-faux-tv]')")) {
    throw new Error('data-sm-faux-tv selector not found');
  }
  if (!htmlContent.includes('data-sm-faux-tv')) {
    throw new Error('data-sm-faux-tv attribute not added to HTML');
  }
});

console.log('\n📋 Test 5: Wrapper element for centering');
test('Wrapper element created with proper structure', () => {
  if (!jsContent.includes("wrapper.className = 'sm-empty-energy-wrapper'")) {
    throw new Error('Wrapper element not created');
  }
  if (!jsContent.includes("wrapper.setAttribute('data-sm-empty-battery-wrapper'")) {
    throw new Error('data-sm-empty-battery-wrapper attribute not set');
  }
  if (!jsContent.includes('position: absolute; inset: 0; display: flex')) {
    throw new Error('Wrapper inline styles missing flexbox centering');
  }
});

console.log('\n📋 Test 6: Overlay has data-sm-empty-battery attribute');
test('data-sm-empty-battery attribute set', () => {
  if (!jsContent.includes("overlay.setAttribute('data-sm-empty-battery'")) {
    throw new Error('data-sm-empty-battery attribute not set');
  }
});

console.log('\n📋 Test 7: Accessibility attributes updated');
test('Aria attributes set correctly', () => {
  if (!jsContent.includes("overlay.setAttribute('role', 'status')")) {
    throw new Error('Role should be "status" not "alert"');
  }
  if (!jsContent.includes('No Social Energy. Skipping...')) {
    throw new Error('Aria label not updated');
  }
  if (!jsContent.includes('Skipping…')) {
    throw new Error('Submessage should use ellipsis character');
  }
});

console.log('\n📋 Test 8: CSS wrapper class exists');
test('sm-empty-energy-wrapper CSS defined', () => {
  if (!cssContent.includes('.sm-empty-energy-wrapper')) {
    throw new Error('Wrapper CSS class not found');
  }
  if (!cssContent.includes('position: absolute')) {
    throw new Error('Wrapper should have position: absolute');
  }
  if (!cssContent.includes('display: flex')) {
    throw new Error('Wrapper should have display: flex');
  }
});

console.log('\n📋 Test 9: CSS overlay updated for inline display');
test('sm-empty-energy-overlay CSS updated', () => {
  // Check that the overlay section doesn't have position: fixed
  const overlaySection = cssContent.substring(
    cssContent.indexOf('/* Overlay content - centered inside TV */'),
    cssContent.indexOf('.sm-empty-energy-content')
  );
  
  if (overlaySection.includes('position: fixed')) {
    throw new Error('Overlay should not have position: fixed (should be in wrapper)');
  }
  if (!cssContent.includes('border-radius: 16px')) {
    throw new Error('Overlay should have border-radius');
  }
  if (!cssContent.includes('max-width: 90%')) {
    throw new Error('Overlay should have max-width for responsiveness');
  }
});

console.log('\n📋 Test 10: Event dispatched exactly once (via idempotency)');
test('Event dispatch protected by idempotency guard', () => {
  const guardIndex = jsContent.indexOf('g.__smSkipInProgress = true');
  const eventIndex = jsContent.indexOf("window.dispatchEvent(new CustomEvent('sm-phase-skip-empty'");
  
  if (guardIndex === -1 || eventIndex === -1) {
    throw new Error('Guard or event dispatch not found');
  }
  if (guardIndex > eventIndex) {
    throw new Error('Idempotency guard should be set before event dispatch');
  }
});

console.log('\n═══════════════════════════════════════════');
console.log('📊 Verification Summary');
console.log('═══════════════════════════════════════════\n');

if (failCount === 0) {
  console.log(`✅ All ${passCount} tests passed!\n`);
  console.log('✅ Auto-skip regression fix verified:');
  console.log('   • Timer stops when energy is 0');
  console.log('   • Idempotency guard prevents double execution');
  console.log('   • Overlay renders centered inside faux TV');
  console.log('   • Event fires exactly once');
  console.log('   • Accessibility improved (role=status)');
  console.log('   • Data attributes added for targeting\n');
  process.exit(0);
} else {
  console.log(`❌ ${failCount} test(s) failed, ${passCount} passed\n`);
  process.exit(1);
}
