#!/usr/bin/env node
/**
 * Test script for runtime helpers
 * Validates that the new runtime helpers work correctly
 * Simple static analysis without DOM
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

console.log('\n🧪 Testing Minigame Registry Runtime Helpers\n');

let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    testsPassed++;
  } catch (error) {
    console.log(`❌ ${name}`);
    console.log(`   Error: ${error.message}`);
    testsFailed++;
  }
}

// Run static analysis tests
console.log('Running static analysis tests...\n');

// Test 1: Check registry.js contains new functions
test('registry.js contains registerGame', () => {
  const registryPath = path.join(PROJECT_ROOT, 'js/minigames/registry.js');
  const content = fs.readFileSync(registryPath, 'utf8');
  if (!content.includes('function registerGame')) {
    throw new Error('registerGame function not found in registry.js');
  }
});

test('registry.js contains isModuleLoaded', () => {
  const registryPath = path.join(PROJECT_ROOT, 'js/minigames/registry.js');
  const content = fs.readFileSync(registryPath, 'utf8');
  if (!content.includes('function isModuleLoaded')) {
    throw new Error('isModuleLoaded function not found in registry.js');
  }
});

test('registry.js contains loadModule', () => {
  const registryPath = path.join(PROJECT_ROOT, 'js/minigames/registry.js');
  const content = fs.readFileSync(registryPath, 'utf8');
  if (!content.includes('function loadModule')) {
    throw new Error('loadModule function not found in registry.js');
  }
});

test('registry.js contains render function', () => {
  const registryPath = path.join(PROJECT_ROOT, 'js/minigames/registry.js');
  const content = fs.readFileSync(registryPath, 'utf8');
  if (!content.includes('function render')) {
    throw new Error('render function not found in registry.js');
  }
});

// Test 2: Check registry.js exports new functions
test('registry.js exports registerGame', () => {
  const registryPath = path.join(PROJECT_ROOT, 'js/minigames/registry.js');
  const content = fs.readFileSync(registryPath, 'utf8');
  if (!content.includes('registerGame,') && !content.includes('registerGame\n')) {
    throw new Error('registerGame not exported in registry.js');
  }
});

test('registry.js exports isModuleLoaded', () => {
  const registryPath = path.join(PROJECT_ROOT, 'js/minigames/registry.js');
  const content = fs.readFileSync(registryPath, 'utf8');
  if (!content.includes('isModuleLoaded,') && !content.includes('isModuleLoaded\n')) {
    throw new Error('isModuleLoaded not exported in registry.js');
  }
});

test('registry.js exports loadModule', () => {
  const registryPath = path.join(PROJECT_ROOT, 'js/minigames/registry.js');
  const content = fs.readFileSync(registryPath, 'utf8');
  if (!content.includes('loadModule,') && !content.includes('loadModule\n')) {
    throw new Error('loadModule not exported in registry.js');
  }
});

test('registry.js exports render', () => {
  const registryPath = path.join(PROJECT_ROOT, 'js/minigames/registry.js');
  const content = fs.readFileSync(registryPath, 'utf8');
  if (!content.includes('render\n') && !content.includes('render }')) {
    throw new Error('render not exported in registry.js');
  }
});

// Test 3: Check loader.js exists and has required functions
test('loader.js exists', () => {
  const loaderPath = path.join(PROJECT_ROOT, 'js/minigames/loader.js');
  if (!fs.existsSync(loaderPath)) {
    throw new Error('loader.js not found');
  }
});

test('loader.js contains MinigameModules namespace', () => {
  const loaderPath = path.join(PROJECT_ROOT, 'js/minigames/loader.js');
  const content = fs.readFileSync(loaderPath, 'utf8');
  if (!content.includes('MinigameModules')) {
    throw new Error('MinigameModules namespace not found in loader.js');
  }
});

test('loader.js contains register function', () => {
  const loaderPath = path.join(PROJECT_ROOT, 'js/minigames/loader.js');
  const content = fs.readFileSync(loaderPath, 'utf8');
  if (!content.includes('function register')) {
    throw new Error('register function not found in loader.js');
  }
});

// Test 4: Check audit script exists
test('minigames-audit.js exists', () => {
  const auditPath = path.join(PROJECT_ROOT, 'scripts/minigames-audit.js');
  if (!fs.existsSync(auditPath)) {
    throw new Error('minigames-audit.js not found');
  }
});

test('audit script contains MinigameAudit', () => {
  const auditPath = path.join(PROJECT_ROOT, 'scripts/minigames-audit.js');
  const content = fs.readFileSync(auditPath, 'utf8');
  if (!content.includes('MinigameAudit')) {
    throw new Error('MinigameAudit not found in audit script');
  }
});

test('audit script contains performAudit function', () => {
  const auditPath = path.join(PROJECT_ROOT, 'scripts/minigames-audit.js');
  const content = fs.readFileSync(auditPath, 'utf8');
  if (!content.includes('function performAudit')) {
    throw new Error('performAudit function not found in audit script');
  }
});

test('audit script contains run function', () => {
  const auditPath = path.join(PROJECT_ROOT, 'scripts/minigames-audit.js');
  const content = fs.readFileSync(auditPath, 'utf8');
  if (!content.includes('function run')) {
    throw new Error('run function not found in audit script');
  }
});

test('audit script contains getJSON function', () => {
  const auditPath = path.join(PROJECT_ROOT, 'scripts/minigames-audit.js');
  const content = fs.readFileSync(auditPath, 'utf8');
  if (!content.includes('function getJSON')) {
    throw new Error('getJSON function not found in audit script');
  }
});

// Test 5: Check minigames.js forwards to registry.render
test('minigames.js forwards to MinigameRegistry.render', () => {
  const minigamesPath = path.join(PROJECT_ROOT, 'js/minigames.js');
  const content = fs.readFileSync(minigamesPath, 'utf8');
  if (!content.includes('MinigameRegistry.render')) {
    throw new Error('MinigameRegistry.render not found in minigames.js');
  }
});

test('minigames.js maintains backwards compatibility', () => {
  const minigamesPath = path.join(PROJECT_ROOT, 'js/minigames.js');
  const content = fs.readFileSync(minigamesPath, 'utf8');
  if (!content.includes('function renderMinigame')) {
    throw new Error('renderMinigame function not found in minigames.js');
  }
});

// Test 6: Check that existing functionality is preserved
test('registry.js still exports getRegistry', () => {
  const registryPath = path.join(PROJECT_ROOT, 'js/minigames/registry.js');
  const content = fs.readFileSync(registryPath, 'utf8');
  if (!content.includes('getRegistry,') && !content.includes('getRegistry\n')) {
    throw new Error('getRegistry not found in exports (backwards compatibility broken)');
  }
});

test('registry.js still exports getGame', () => {
  const registryPath = path.join(PROJECT_ROOT, 'js/minigames/registry.js');
  const content = fs.readFileSync(registryPath, 'utf8');
  if (!content.includes('getGame,') && !content.includes('getGame\n')) {
    throw new Error('getGame not found in exports (backwards compatibility broken)');
  }
});

test('registry.js still exports getAllKeys', () => {
  const registryPath = path.join(PROJECT_ROOT, 'js/minigames/registry.js');
  const content = fs.readFileSync(registryPath, 'utf8');
  if (!content.includes('getAllKeys,') && !content.includes('getAllKeys\n')) {
    throw new Error('getAllKeys not found in exports (backwards compatibility broken)');
  }
});

// Test 7: Check for defensive programming
test('registerGame has error handling', () => {
  const registryPath = path.join(PROJECT_ROOT, 'js/minigames/registry.js');
  const content = fs.readFileSync(registryPath, 'utf8');
  if (!content.includes('try') || !content.includes('catch')) {
    throw new Error('registerGame lacks try-catch error handling');
  }
});

test('render function has error handling', () => {
  const registryPath = path.join(PROJECT_ROOT, 'js/minigames/registry.js');
  const content = fs.readFileSync(registryPath, 'utf8');
  const renderMatch = content.match(/function render\([^)]*\)\{[\s\S]*?catch/);
  if (!renderMatch) {
    throw new Error('render function lacks try-catch error handling');
  }
});

test('render shows user-visible error messages', () => {
  const registryPath = path.join(PROJECT_ROOT, 'js/minigames/registry.js');
  const content = fs.readFileSync(registryPath, 'utf8');
  if (!content.includes('Unknown minigame')) {
    throw new Error('render function lacks user-visible error message for missing game');
  }
});

// Results
console.log('\n' + '='.repeat(50));
console.log('Test Results:');
console.log(`  Passed: ${testsPassed}`);
console.log(`  Failed: ${testsFailed}`);
console.log('='.repeat(50) + '\n');

if (testsFailed > 0) {
  process.exit(1);
} else {
  console.log('✅ All static analysis tests passed!\n');
  process.exit(0);
}
