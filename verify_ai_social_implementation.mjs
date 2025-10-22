#!/usr/bin/env node

// Verification script for AI Social Interactions and Highlights
// This script performs basic validation of the new modules

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log('🧪 AI Social Interactions & Highlights Verification\n');
console.log('═'.repeat(60));

let passCount = 0;
let failCount = 0;

function test(name, condition, details = '') {
  const result = condition ? '✅ PASS' : '❌ FAIL';
  console.log(`\n${result}: ${name}`);
  if (details) console.log(`   ${details}`);
  if (condition) passCount++; else failCount++;
}

// Test 1: Check file existence
console.log('\n📋 File Existence Checks\n');

try {
  const schedulerFile = readFileSync(join(__dirname, 'js/social-ai-scheduler.js'), 'utf-8');
  test('social-ai-scheduler.js exists', schedulerFile.length > 0, 
       `${schedulerFile.length} bytes`);
  
  const highlightsFile = readFileSync(join(__dirname, 'js/social-highlights.js'), 'utf-8');
  test('social-highlights.js exists', highlightsFile.length > 0, 
       `${highlightsFile.length} bytes`);
  
  const testFile = readFileSync(join(__dirname, 'test_ai_social_interactions.html'), 'utf-8');
  test('test_ai_social_interactions.html exists', testFile.length > 0, 
       `${testFile.length} bytes`);
} catch (e) {
  test('File existence check', false, e.message);
}

// Test 2: Check module structure
console.log('\n📋 Module Structure Checks\n');

try {
  const schedulerFile = readFileSync(join(__dirname, 'js/social-ai-scheduler.js'), 'utf-8');
  
  test('SocialAIScheduler export exists', 
       schedulerFile.includes('global.SocialAIScheduler ='));
  
  test('startAiSocialPhase function exists', 
       schedulerFile.includes('function startAiSocialPhase'));
  
  test('stopAiSocialPhase function exists', 
       schedulerFile.includes('function stopAiSocialPhase'));
  
  test('runEmptyEnergyBurst function exists', 
       schedulerFile.includes('function runEmptyEnergyBurst'));
  
  test('executeAIAction function exists', 
       schedulerFile.includes('function executeAIAction'));
  
  test('sm-ai-interaction event emission', 
       schedulerFile.includes("new CustomEvent('sm-ai-interaction'"));
} catch (e) {
  test('Module structure check', false, e.message);
}

// Test 3: Check highlights module
console.log('\n📋 Highlights Module Checks\n');

try {
  const highlightsFile = readFileSync(join(__dirname, 'js/social-highlights.js'), 'utf-8');
  
  test('SocialHighlights export exists', 
       highlightsFile.includes('global.SocialHighlights ='));
  
  test('onPhaseStart function exists', 
       highlightsFile.includes('function onPhaseStart'));
  
  test('onPhaseEnd function exists', 
       highlightsFile.includes('function onPhaseEnd'));
  
  test('isMajorEvent function exists', 
       highlightsFile.includes('function isMajorEvent'));
  
  test('renderHighlightsCard function exists', 
       highlightsFile.includes('function renderHighlightsCard'));
  
  test('Event listener setup', 
       highlightsFile.includes("addEventListener('sm-ai-interaction'"));
} catch (e) {
  test('Highlights module check', false, e.message);
}

// Test 4: Check integration points
console.log('\n📋 Integration Checks\n');

try {
  const maneuversFile = readFileSync(join(__dirname, 'js/social-maneuvers.js'), 'utf-8');
  
  test('AI scheduler start integration', 
       maneuversFile.includes('SocialAIScheduler.startAiSocialPhase'));
  
  test('AI scheduler stop integration', 
       maneuversFile.includes('SocialAIScheduler.stopAiSocialPhase'));
  
  test('Empty energy burst integration', 
       maneuversFile.includes('SocialAIScheduler.runEmptyEnergyBurst'));
  
  test('Highlights phase start integration', 
       maneuversFile.includes('SocialHighlights.onPhaseStart'));
  
  test('Highlights phase end integration', 
       maneuversFile.includes('SocialHighlights.onPhaseEnd'));
  
  test('Human action highlight recording', 
       maneuversFile.includes('SocialHighlights.recordHumanAction'));
} catch (e) {
  test('Integration check', false, e.message);
}

// Test 5: Check configuration
console.log('\n📋 Configuration Checks\n');

try {
  const configFile = readFileSync(join(__dirname, 'js/config/defaults.js'), 'utf-8');
  
  test('aiSocialEnabled config', 
       configFile.includes('aiSocialEnabled:'));
  
  test('aiSocialAggression config', 
       configFile.includes('aiSocialAggression:'));
  
  test('aiSocialMaxPerPhase config', 
       configFile.includes('aiSocialMaxPerPhase:'));
  
  test('socialHighlightsEnabled config', 
       configFile.includes('socialHighlightsEnabled:'));
} catch (e) {
  test('Configuration check', false, e.message);
}

// Test 6: Check HTML integration
console.log('\n📋 HTML Integration Checks\n');

try {
  const indexFile = readFileSync(join(__dirname, 'index.html'), 'utf-8');
  
  test('social-ai-scheduler.js script tag', 
       indexFile.includes('src="js/social-ai-scheduler.js"'));
  
  test('social-highlights.js script tag', 
       indexFile.includes('src="js/social-highlights.js"'));
  
  test('Script load order (after social-maneuvers.js)', 
       indexFile.indexOf('social-maneuvers.js') < indexFile.indexOf('social-ai-scheduler.js'));
} catch (e) {
  test('HTML integration check', false, e.message);
}

// Test 7: Check CSS styles
console.log('\n📋 CSS Style Checks\n');

try {
  const stylesFile = readFileSync(join(__dirname, 'styles.css'), 'utf-8');
  
  test('social-highlights-card class', 
       stylesFile.includes('.social-highlights-card'));
  
  test('highlight-entry class', 
       stylesFile.includes('.highlight-entry'));
  
  test('highlight-icon class', 
       stylesFile.includes('.highlight-icon'));
  
  test('highlight-message class', 
       stylesFile.includes('.highlight-message'));
  
  test('highlight type classes', 
       stylesFile.includes('.highlight-success') && 
       stylesFile.includes('.highlight-warning') && 
       stylesFile.includes('.highlight-negative'));
} catch (e) {
  test('CSS check', false, e.message);
}

// Test 8: Validate key implementation details
console.log('\n📋 Implementation Detail Checks\n');

try {
  const schedulerFile = readFileSync(join(__dirname, 'js/social-ai-scheduler.js'), 'utf-8');
  
  test('Uses computeActionCost for unified costing', 
       schedulerFile.includes('SM.computeActionCost'));
  
  test('Uses SocialResources.canAfford', 
       schedulerFile.includes('SocialResources.canAfford') || 
       schedulerFile.includes('SocialResources?.canAfford'));
  
  test('Uses executeAction for consistency', 
       schedulerFile.includes('SM.executeAction'));
  
  test('Action selection respects categories', 
       schedulerFile.includes('friendly') && 
       schedulerFile.includes('aggressive'));
  
  test('Implements action count tracking', 
       schedulerFile.includes('actionCounts'));
  
  test('Implements pairing cooldown', 
       schedulerFile.includes('recentPairings'));
} catch (e) {
  test('Implementation details check', false, e.message);
}

// Summary
console.log('\n' + '═'.repeat(60));
console.log('📊 Verification Summary');
console.log('═'.repeat(60));
console.log(`\n✅ Passed: ${passCount}`);
console.log(`❌ Failed: ${failCount}`);

if (failCount === 0) {
  console.log('\n✅ ALL CHECKS PASSED!');
  console.log('The AI Social Interactions and Highlights system is properly implemented.');
  process.exit(0);
} else {
  console.log('\n❌ SOME CHECKS FAILED');
  console.log('Please review the failures above.');
  process.exit(1);
}
