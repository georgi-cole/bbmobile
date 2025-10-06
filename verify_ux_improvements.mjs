#!/usr/bin/env node
// Verification script for UX improvements

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = __dirname;

let allPassed = true;

function test(name, condition, message) {
  if (condition) {
    console.log(`✓ ${name}`);
  } else {
    console.log(`✗ ${name}: ${message}`);
    allPassed = false;
  }
}

console.log('=== UX Improvements Verification ===\n');

// Test 1: Check autoShowRulesOnStart in settings.js
console.log('1. Checking autoShowRulesOnStart config...');
try {
  const settingsContent = readFileSync(join(rootDir, 'js/settings.js'), 'utf-8');
  test(
    'autoShowRulesOnStart exists in DEFAULT_CFG',
    settingsContent.includes('autoShowRulesOnStart'),
    'Config flag not found in settings.js'
  );
  test(
    'autoShowRulesOnStart defaults to false',
    settingsContent.match(/autoShowRulesOnStart:\s*false/),
    'Config flag should default to false'
  );
} catch (err) {
  console.log(`✗ Failed to read settings.js: ${err.message}`);
  allPassed = false;
}
console.log('');

// Test 2: Check rules.js guards
console.log('2. Checking rules.js auto-trigger guards...');
try {
  const rulesContent = readFileSync(join(rootDir, 'js/rules.js'), 'utf-8');
  test(
    'setupIntroListener checks autoShowRulesOnStart',
    rulesContent.includes('cfg.autoShowRulesOnStart') && 
    rulesContent.includes('setupIntroListener'),
    'setupIntroListener should check config flag'
  );
  test(
    'setupFallback checks autoShowRulesOnStart',
    rulesContent.includes('cfg.autoShowRulesOnStart') && 
    rulesContent.includes('setupFallback'),
    'setupFallback should check config flag'
  );
  test(
    'showRulesModal still exposed globally',
    rulesContent.includes('global.showRulesModal = showRulesModal'),
    'Manual rules function should still be exposed'
  );
} catch (err) {
  console.log(`✗ Failed to read rules.js: ${err.message}`);
  allPassed = false;
}
console.log('');

// Test 3: Check ui.hud-and-router.js early completion
console.log('3. Checking early opening completion logic...');
try {
  const hudContent = readFileSync(join(rootDir, 'js/ui.hud-and-router.js'), 'utf-8');
  test(
    '__introPairsTotal tracking exists',
    hudContent.includes('__introPairsTotal'),
    'Should track total intro pairs'
  );
  test(
    '__introPairsShown tracking exists',
    hudContent.includes('__introPairsShown'),
    'Should track shown intro pairs'
  );
  test(
    '__introEarlyFinished flag exists',
    hudContent.includes('__introEarlyFinished'),
    'Should have early finish guard flag'
  );
  test(
    'Early finish logic checks all pairs shown',
    hudContent.includes('__introPairsShown >= game.__introPairsTotal'),
    'Should check if all pairs are shown'
  );
  test(
    'finishOpening called early',
    hudContent.includes('g.finishOpening()') && 
    hudContent.includes('All intro pairs shown'),
    'Should call finishOpening early'
  );
} catch (err) {
  console.log(`✗ Failed to read ui.hud-and-router.js: ${err.message}`);
  allPassed = false;
}
console.log('');

// Test 4: Check ui.week-intro.js exists and is correct
console.log('4. Checking week intro modal module...');
try {
  const weekIntroContent = readFileSync(join(rootDir, 'js/ui.week-intro.js'), 'utf-8');
  test(
    'ui.week-intro.js file exists',
    weekIntroContent.length > 0,
    'File should exist'
  );
  test(
    'showWeekIntroModal function exists',
    weekIntroContent.includes('function showWeekIntroModal'),
    'Main function should be defined'
  );
  test(
    'Modal has eye emoji',
    weekIntroContent.includes('👁️') || weekIntroContent.includes('\\u{1F441}'),
    'Should have eye emoji'
  );
  test(
    'Modal has "Get Ready for Week" text',
    weekIntroContent.includes('Get Ready for Week'),
    'Should have correct title text'
  );
  test(
    'Auto-dismiss after ~2300ms',
    weekIntroContent.includes('2300'),
    'Should auto-dismiss after 2300ms'
  );
  test(
    'High z-index for overlay',
    weekIntroContent.includes('999999'),
    'Should have high z-index'
  );
  test(
    'Function exposed globally',
    weekIntroContent.includes('global.showWeekIntroModal'),
    'Function should be exposed to window'
  );
  test(
    'startHOH wrapper exists',
    weekIntroContent.includes('wrapStartHOH'),
    'Should wrap startHOH function'
  );
  test(
    'Week tracking with __weekIntroShownFor',
    weekIntroContent.includes('__weekIntroShownFor'),
    'Should track which weeks have shown intro'
  );
} catch (err) {
  console.log(`✗ Failed to read ui.week-intro.js: ${err.message}`);
  allPassed = false;
}
console.log('');

// Test 5: Check jury_return.js modifications
console.log('5. Checking jury_return.js week intro integration...');
try {
  const juryReturnContent = readFileSync(join(rootDir, 'js/jury_return.js'), 'utf-8');
  test(
    'proceedToHOH shows week intro',
    juryReturnContent.includes('showWeekIntroModal') && 
    juryReturnContent.includes('proceedToHOH'),
    'proceedToHOH should show week intro modal'
  );
  test(
    'Guards against finale/jury phases',
    juryReturnContent.includes('jury') && 
    juryReturnContent.includes('finale'),
    'Should check phase guards'
  );
  test(
    'Checks alivePlayers count',
    juryReturnContent.includes('alivePlayers') && 
    juryReturnContent.includes('> 2'),
    'Should check alive players count'
  );
} catch (err) {
  console.log(`✗ Failed to read jury_return.js: ${err.message}`);
  allPassed = false;
}
console.log('');

// Test 6: Check index.html includes new script
console.log('6. Checking index.html script loading...');
try {
  const indexContent = readFileSync(join(rootDir, 'index.html'), 'utf-8');
  test(
    'ui.week-intro.js loaded in index.html',
    indexContent.includes('ui.week-intro.js'),
    'Script should be included'
  );
  test(
    'jury_return.js loaded in index.html',
    indexContent.includes('jury_return.js'),
    'Script should be included'
  );
  test(
    'ui.week-intro.js loaded after rules.js',
    indexContent.indexOf('ui.week-intro.js') > indexContent.indexOf('rules.js'),
    'Should be loaded in correct order'
  );
} catch (err) {
  console.log(`✗ Failed to read index.html: ${err.message}`);
  allPassed = false;
}
console.log('');

// Summary
console.log('=== Summary ===');
if (allPassed) {
  console.log('✓ All verification checks passed!');
  process.exit(0);
} else {
  console.log('✗ Some checks failed. Please review the output above.');
  process.exit(1);
}
