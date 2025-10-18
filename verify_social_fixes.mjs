#!/usr/bin/env node

/**
 * Static verification script for Social Maneuvers fixes
 * Checks that all required changes are present in the codebase
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CHECKS = {
  'scheduleFastAdvance shim': {
    file: 'js/social-maneuvers.js',
    patterns: [
      /function\s+scheduleFastAdvanceFallback/,
      /function\s+installScheduleFastAdvanceShim/,
      /installScheduleFastAdvanceShim\(\)/,
      /window\.scheduleFastAdvance\s*=\s*scheduleFastAdvanceFallback/,
      /Installed scheduleFastAdvance shim/
    ]
  },
  'checkEnergyDepletionAndAdvance uses guarded shim': {
    file: 'js/social-maneuvers.js',
    patterns: [
      /window\.scheduleFastAdvance\s*\|\|\s*scheduleFastAdvanceFallback/,
      /Scheduled fast advance via/
    ]
  },
  'Resource change events': {
    file: 'js/social-maneuvers.js',
    patterns: [
      /_dispatchResourceChangedEvent/,
      /CustomEvent\('social-resources-changed'/,
      /window\.dispatchEvent\(event\)/,
      /Dispatched social-resources-changed event/
    ]
  },
  'SocializeMobile.updateHUD defensive calls': {
    file: 'js/social-maneuvers.js',
    patterns: [
      /SocializeMobile\?\.updateHUD/,
      /Failed to update HUD/
    ]
  },
  'Logging for spend/earn': {
    file: 'js/social-maneuvers.js',
    patterns: [
      /Player.*spent:/,
      /Player.*earned:/
    ]
  },
  'Weekly reset guard': {
    file: 'js/social.js',
    patterns: [
      /__socialWeeklyResetWeek/,
      /Weekly reset already done for week/,
      /g\.__socialWeeklyResetWeek\s*=\s*currentWeek/
    ]
  },
  'Weekly reset logging': {
    file: 'js/social.js',
    patterns: [
      /Social Maneuvers enabled - forwarding weekly reset/,
      /Weekly reset complete.*week/
    ]
  },
  'Skip legacy summary': {
    file: 'js/social.js',
    patterns: [
      /Skipping legacy summary - Social Maneuvers handles phase summary/
    ]
  },
  'Phase start/end logging': {
    file: 'js/social-maneuvers.js',
    patterns: [
      /onSocialPhaseStart.*entering social_intermission/,
      /onSocialPhaseEnd.*leaving social_intermission/
    ]
  }
};

let allPassed = true;

console.log('🔍 Verifying Social Maneuvers fixes...\n');

for (const [checkName, checkConfig] of Object.entries(CHECKS)) {
  const filePath = join(__dirname, checkConfig.file);
  let content;
  
  try {
    content = readFileSync(filePath, 'utf-8');
  } catch (err) {
    console.error(`❌ ${checkName}: Cannot read ${checkConfig.file}`);
    allPassed = false;
    continue;
  }
  
  const results = checkConfig.patterns.map(pattern => pattern.test(content));
  const passed = results.every(r => r);
  
  if (passed) {
    console.log(`✅ ${checkName}`);
  } else {
    console.error(`❌ ${checkName}`);
    checkConfig.patterns.forEach((pattern, idx) => {
      if (!results[idx]) {
        console.error(`   Missing: ${pattern}`);
      }
    });
    allPassed = false;
  }
}

console.log('');

if (allPassed) {
  console.log('✅ All checks passed!');
  console.log('\n📋 Summary of changes:');
  console.log('  1. scheduleFastAdvance shim installed to prevent ReferenceError');
  console.log('  2. Resource change events dispatched for live HUD updates');
  console.log('  3. Weekly reset uses one-per-week guard');
  console.log('  4. Enhanced logging for debugging');
  console.log('  5. Legacy summary skipped when Social Maneuvers enabled');
  process.exit(0);
} else {
  console.error('❌ Some checks failed. Review the output above.');
  process.exit(1);
}
