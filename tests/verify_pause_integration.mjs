#!/usr/bin/env node

/**
 * Verify PauseManager Integration
 * Tests that PauseManager is properly integrated with HubModalBridge and settings
 */

import { readFileSync } from 'fs';

console.log('\n=== PauseManager Integration Verification ===\n');

let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    testsPassed++;
    return true;
  } catch (e) {
    console.error(`✗ ${name}`);
    console.error(`  ${e.message}`);
    testsFailed++;
    return false;
  }
}

// Test 1: Verify PauseManager code structure
console.log('Test 1: Verifying PauseManager code structure...');
const globalPauseCode = readFileSync('./js/ui/global-pause.js', 'utf8');

test('PauseManager file exists', () => {
  if (!globalPauseCode || globalPauseCode.length === 0) {
    throw new Error('PauseManager file not found or empty');
  }
});

test('PauseManager has open function', () => {
  if (!globalPauseCode.includes('function open(id)')) {
    throw new Error('open function not found');
  }
});

test('PauseManager has close function', () => {
  if (!globalPauseCode.includes('function close(id)')) {
    throw new Error('close function not found');
  }
});

test('PauseManager has isPaused function', () => {
  if (!globalPauseCode.includes('function isPaused()')) {
    throw new Error('isPaused function not found');
  }
});

test('PauseManager has getOpenModals function', () => {
  if (!globalPauseCode.includes('function getOpenModals()')) {
    throw new Error('getOpenModals function not found');
  }
});

test('PauseManager has reset function', () => {
  if (!globalPauseCode.includes('function reset()')) {
    throw new Error('reset function not found');
  }
});

test('PauseManager attaches to window.game.pauseManager', () => {
  if (!globalPauseCode.includes('window.game.pauseManager')) {
    throw new Error('window.game.pauseManager not set up');
  }
});

test('PauseManager emits game:pause event', () => {
  if (!globalPauseCode.includes("emit('game:pause')") && !globalPauseCode.includes("'game:pause'")) {
    throw new Error('game:pause event not emitted');
  }
});

test('PauseManager emits game:resume event', () => {
  if (!globalPauseCode.includes("emit('game:resume')") && !globalPauseCode.includes("'game:resume'")) {
    throw new Error('game:resume event not emitted');
  }
});

// Test 2: Verify HubModalBridge integration
console.log('\nTest 2: Verifying HubModalBridge integration...');
const hubModalBridgeCode = readFileSync('./src/ui/hubModalBridge.js', 'utf8');

test('getModalId function exists', () => {
  if (!hubModalBridgeCode.includes('function getModalId')) {
    throw new Error('getModalId function not found');
  }
});

test('Modal ID patterns are correct', () => {
  const patterns = [
    'modal:hub:rules',
    'modal:hub:profile',
    'modal:hub:settings',
    'modal:hub:credits',
    'modal:hub:leaderboard',
    'modal:hub:help',
    'modal:hub:xp',
    'modal:hub:socialize'
  ];
  
  for (const pattern of patterns) {
    if (!hubModalBridgeCode.includes(pattern)) {
      throw new Error(`Modal ID pattern '${pattern}' not found in code`);
    }
  }
});

// Test 3: Verify integration points
console.log('\nTest 3: Verifying integration points...');

test('HubModalBridge checks for pauseManager', () => {
  if (!hubModalBridgeCode.includes('g.game.pauseManager')) {
    throw new Error('HubModalBridge does not check for g.game.pauseManager');
  }
});

test('HubModalBridge calls pauseManager.open', () => {
  if (!hubModalBridgeCode.includes('g.game.pauseManager.open')) {
    throw new Error('HubModalBridge does not call g.game.pauseManager.open');
  }
});

test('HubModalBridge calls pauseManager.close', () => {
  if (!hubModalBridgeCode.includes('g.game.pauseManager.close')) {
    throw new Error('HubModalBridge does not call g.game.pauseManager.close');
  }
});

test('previousModals tracking is implemented', () => {
  if (!hubModalBridgeCode.includes('previousModals')) {
    throw new Error('previousModals tracking not found');
  }
});

test('Modal state change detection is implemented', () => {
  const hasOpened = hubModalBridgeCode.includes('Modal opened') || hubModalBridgeCode.includes('opened, pausing');
  const hasClosed = hubModalBridgeCode.includes('Modal closed') || hubModalBridgeCode.includes('closed, resuming');
  if (!hasOpened || !hasClosed) {
    throw new Error('Modal state change detection not properly implemented');
  }
});

// Test 3b: Verify settings/render.js integration
console.log('\nTest 3b: Verifying settings/render.js integration...');
const renderCode = readFileSync('./js/settings/render.js', 'utf8');

test('Settings render calls pauseManager.open', () => {
  if (!renderCode.includes("global.game.pauseManager.open('modal:settings')")) {
    throw new Error('Settings render does not call pauseManager.open');
  }
});

test('Settings render calls pauseManager.close', () => {
  if (!renderCode.includes("global.game.pauseManager.close('modal:settings')")) {
    throw new Error('Settings render does not call pauseManager.close');
  }
});

test('Settings render has defensive checks', () => {
  const hasCheck = renderCode.includes('global.game && global.game.pauseManager && typeof global.game.pauseManager');
  if (!hasCheck) {
    throw new Error('Settings render missing defensive checks for pauseManager');
  }
});

test('Settings render has error handling', () => {
  const hasErrorHandling = renderCode.includes('try') && renderCode.includes('catch(err)');
  if (!hasErrorHandling) {
    throw new Error('Settings render missing error handling for pauseManager calls');
  }
});

// Test 4: Verify bootstrap.js loads global-pause.js
console.log('\nTest 4: Verifying bootstrap.js integration...');

const bootstrapCode = readFileSync('./js/bootstrap.js', 'utf8');

test('bootstrap.js loads global-pause.js', () => {
  if (!bootstrapCode.includes('js/ui/global-pause.js')) {
    throw new Error('bootstrap.js does not load global-pause.js');
  }
});

// Test 5: Verify CSS is loaded
console.log('\nTest 5: Verifying CSS integration...');

const indexHtml = readFileSync('./index.html', 'utf8');

test('pause-overlay.css is loaded in index.html', () => {
  if (!indexHtml.includes('pause-overlay.css')) {
    throw new Error('pause-overlay.css not loaded in index.html');
  }
});

// Test 6: Verify timer integration
console.log('\nTest 6: Verifying timer integration...');

const hudRouterCode = readFileSync('./js/ui.hud-and-router.js', 'utf8');

test('Timer tick checks pauseManager', () => {
  if (!hudRouterCode.includes('pauseManager?.isPaused()')) {
    throw new Error('Timer tick does not check pauseManager.isPaused()');
  }
});

// Summary
console.log('\n=== Verification Summary ===');
console.log(`Passed: ${testsPassed}`);
console.log(`Failed: ${testsFailed}`);

if (testsFailed === 0) {
  console.log('\n✓ All tests passed!\n');
  process.exit(0);
} else {
  console.log(`\n✗ ${testsFailed} test(s) failed\n`);
  process.exit(1);
}
