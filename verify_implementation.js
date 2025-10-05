#!/usr/bin/env node
// Verification script for Minigame Refactor PR 5-7
// Validates that all modules are present and properly structured

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Minigame Refactor PR 5-7 Implementation\n');

const baseDir = __dirname;
const checks = [];

// Helper function to check file exists
function checkFile(filepath, description) {
  const fullPath = path.join(baseDir, filepath);
  const exists = fs.existsSync(fullPath);
  checks.push({
    status: exists ? '✅' : '❌',
    description,
    detail: exists ? 'File exists' : 'File missing: ' + filepath
  });
  return exists;
}

// Helper function to check file contains text
function checkFileContains(filepath, searchText, description) {
  const fullPath = path.join(baseDir, filepath);
  if (!fs.existsSync(fullPath)) {
    checks.push({
      status: '❌',
      description,
      detail: 'File not found: ' + filepath
    });
    return false;
  }
  
  const content = fs.readFileSync(fullPath, 'utf8');
  const contains = content.includes(searchText);
  checks.push({
    status: contains ? '✅' : '❌',
    description,
    detail: contains ? 'Contains: ' + searchText.substring(0, 50) : 'Missing: ' + searchText.substring(0, 50)
  });
  return contains;
}

// Check new modules exist
console.log('📦 Checking New Modules...\n');

checkFile('js/minigames/telemetry.js', 'Telemetry module');
checkFile('js/minigames/error-handler.js', 'Error handler module');
checkFile('js/minigames/debug-panel.js', 'Debug panel module');
checkFile('js/minigames/accessibility.js', 'Accessibility module');

// Check test pages exist
console.log('\n🧪 Checking Test Pages...\n');

checkFile('test_minigame_telemetry.html', 'Telemetry test page');
checkFile('test_scoring_simulation.html', 'Scoring simulation test page');

// Check documentation exists
console.log('\n📚 Checking Documentation...\n');

checkFile('MINIGAME_REFACTOR_PR5-7.md', 'Implementation documentation');

// Check integrations
console.log('\n🔗 Checking Integrations...\n');

checkFileContains('index.html', 'js/minigames/telemetry.js', 'Telemetry loaded in index.html');
checkFileContains('index.html', 'js/minigames/error-handler.js', 'Error handler loaded in index.html');
checkFileContains('index.html', 'js/minigames/debug-panel.js', 'Debug panel loaded in index.html');
checkFileContains('index.html', 'js/minigames/accessibility.js', 'Accessibility loaded in index.html');

checkFileContains('js/competitions.js', 'MinigameTelemetry.logComplete', 'Telemetry in competitions.js');
checkFileContains('js/minigames/selector.js', 'MinigameTelemetry.logSelection', 'Telemetry in selector.js');
checkFileContains('js/minigames/index.js', 'MinigameErrorHandler', 'Error handler in index.js');

// Check module exports
console.log('\n🔌 Checking Module Exports...\n');

checkFileContains('js/minigames/telemetry.js', 'g.MinigameTelemetry', 'Telemetry exports API');
checkFileContains('js/minigames/error-handler.js', 'g.MinigameErrorHandler', 'Error handler exports API');
checkFileContains('js/minigames/debug-panel.js', 'g.MinigameDebugPanel', 'Debug panel exports API');
checkFileContains('js/minigames/accessibility.js', 'g.MinigameAccessibility', 'Accessibility exports API');

// Check enhanced minigames
console.log('\n✨ Checking Enhanced Minigames...\n');

checkFileContains('js/minigames/quick-tap.js', 'MinigameAccessibility', 'Quick Tap uses accessibility');
checkFileContains('js/minigames/quick-tap.js', 'MinigameMobileUtils', 'Quick Tap uses mobile utils');
checkFileContains('js/minigames/timing-bar.js', 'MinigameAccessibility', 'Timing Bar uses accessibility');
checkFileContains('js/minigames/timing-bar.js', 'reducedMotion', 'Timing Bar supports reduced motion');

// Check scoring system
console.log('\n🎯 Checking Scoring System...\n');

checkFileContains('js/minigames/scoring.js', 'normalizeTime', 'Time-based normalization');
checkFileContains('js/minigames/scoring.js', 'normalizeAccuracy', 'Accuracy-based normalization');
checkFileContains('js/minigames/scoring.js', 'normalizeHybrid', 'Hybrid normalization');
checkFileContains('js/minigames/scoring.js', 'normalizeEndurance', 'Endurance normalization');

// Print results
console.log('\n' + '='.repeat(60));
console.log('VERIFICATION RESULTS');
console.log('='.repeat(60) + '\n');

const passed = checks.filter(c => c.status === '✅').length;
const failed = checks.filter(c => c.status === '❌').length;

checks.forEach(check => {
  console.log(`${check.status} ${check.description}`);
  if (check.status === '❌') {
    console.log(`   ↳ ${check.detail}`);
  }
});

console.log('\n' + '='.repeat(60));
console.log(`Total Checks: ${checks.length}`);
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log('='.repeat(60));

if (failed === 0) {
  console.log('\n🎉 All verification checks passed!');
  console.log('\n📋 Next Steps:');
  console.log('  1. Open test_minigame_telemetry.html in a browser');
  console.log('  2. Test telemetry features and debug panel (Ctrl+Shift+D)');
  console.log('  3. Open test_scoring_simulation.html');
  console.log('  4. Run scoring simulations and verify fairness');
  console.log('  5. Start a game in index.html and test live integration');
  process.exit(0);
} else {
  console.log('\n⚠️  Some checks failed. Review the errors above.');
  process.exit(1);
}
