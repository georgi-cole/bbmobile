#!/usr/bin/env node

/**
 * Verification test for enhanced Social AI Scheduler
 * Tests that the pause/resume APIs and diagnostics are correctly implemented
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🧪 Testing Enhanced Social AI Scheduler Implementation\n');

// ============================================================================
// TEST 1: Verify scheduler has pause/resume APIs
// ============================================================================
console.log('Test 1: Verifying scheduler pause/resume APIs...');

const schedulerPath = join(__dirname, 'js', 'social-ai-scheduler.js');
const schedulerCode = readFileSync(schedulerPath, 'utf8');

const checks = {
  'pauseAiSocialPhase function': /function pauseAiSocialPhase\(/,
  'resumeAiSocialPhase function': /function resumeAiSocialPhase\(/,
  'isPaused state variable': /let isPaused\s*=\s*false/,
  'pause export': /pauseAiSocialPhase.*\/\/.*pause/i,
  'resume export': /resumeAiSocialPhase.*\/\/.*resume/i,
  'debugLog function': /function debugLog\(/,
  'watchdog timer': /let watchdogTimer/,
  'RAF pump': /function rafPump\(/,
  'getState diagnostic': /__smDebug\.getState\s*=\s*function/,
  'debug reason logging': /reason\s*=\s*['"]/
};

let passed = 0;
let failed = 0;

for (const [name, pattern] of Object.entries(checks)) {
  if (pattern.test(schedulerCode)) {
    console.log(`✅ ${name}`);
    passed++;
  } else {
    console.log(`❌ ${name}`);
    failed++;
  }
}

// ============================================================================
// TEST 2: Verify SocialActionExecutor module
// ============================================================================
console.log('\nTest 2: Verifying SocialActionExecutor module...');

const executorPath = join(__dirname, 'js', 'social', 'socialActionExecutor.js');
const executorCode = readFileSync(executorPath, 'utf8');

const executorChecks = {
  'queueAction function': /function queueAction\(/,
  'flushQueue function': /function flushQueue\(/,
  'runBackgroundTick function': /function runBackgroundTick\(/,
  'emitActionResult function': /function emitActionResult\(/,
  'emitBondShift function': /function emitBondShift\(/,
  'getPlayerEnergy function': /function getPlayerEnergy\(/,
  'config object': /const DEFAULT_CONFIG\s*=/,
  'init function': /function init\(/,
  'getState API': /getState\(\)\s*{/,
  'event emission': /new CustomEvent\('social\.action:result'/
};

for (const [name, pattern] of Object.entries(executorChecks)) {
  if (pattern.test(executorCode)) {
    console.log(`✅ ${name}`);
    passed++;
  } else {
    console.log(`❌ ${name}`);
    failed++;
  }
}

// ============================================================================
// TEST 3: Verify PauseController uses pause/resume
// ============================================================================
console.log('\nTest 3: Verifying PauseController integration...');

const pauseControllerPath = join(__dirname, 'js', 'flow', 'PauseController.js');
const pauseControllerCode = readFileSync(pauseControllerPath, 'utf8');

const pauseControllerChecks = {
  'calls pauseAiSocialPhase': /pauseAiSocialPhase/,
  'calls resumeAiSocialPhase': /resumeAiSocialPhase/,
  'has fallback to stop': /\.stop\(/,
  'checks for pause function': /typeof.*pauseAiSocialPhase/
};

for (const [name, pattern] of Object.entries(pauseControllerChecks)) {
  if (pattern.test(pauseControllerCode)) {
    console.log(`✅ ${name}`);
    passed++;
  } else {
    console.log(`❌ ${name}`);
    failed++;
  }
}

// ============================================================================
// TEST 4: Verify social-maneuvers integration
// ============================================================================
console.log('\nTest 4: Verifying social-maneuvers modal integration...');

const socialManeuversPath = join(__dirname, 'js', 'social-maneuvers.js');
const socialManeuversCode = readFileSync(socialManeuversPath, 'utf8');

const socialManeuversChecks = {
  'pausePhaseTimer calls pauseAiSocialPhase': /pausePhaseTimer[\s\S]*?pauseAiSocialPhase/,
  'resumePhaseTimer calls resumeAiSocialPhase': /resumePhaseTimer[\s\S]*?resumeAiSocialPhase/,
  'resumePhaseTimer calls flushQueue': /resumePhaseTimer[\s\S]*?flushQueue/,
  'checks SocialActionExecutor': /SocialActionExecutor/
};

for (const [name, pattern] of Object.entries(socialManeuversChecks)) {
  if (pattern.test(socialManeuversCode)) {
    console.log(`✅ ${name}`);
    passed++;
  } else {
    console.log(`❌ ${name}`);
    failed++;
  }
}

// ============================================================================
// TEST 5: Verify devtools harness exists
// ============================================================================
console.log('\nTest 5: Verifying devtools test harness...');

const devtoolsPath = join(__dirname, 'devtools', 'social-ai-debug.html');
try {
  const devtoolsCode = readFileSync(devtoolsPath, 'utf8');
  
  const devtoolsChecks = {
    'has start button': /startScheduler/,
    'has pause button': /pauseScheduler/,
    'has resume button': /resumeScheduler/,
    'loads scheduler module': /social-ai-scheduler\.js/,
    'loads executor module': /socialActionExecutor\.js/,
    'has getState display': /getState/,
    'has log display': /id="log"/
  };
  
  for (const [name, pattern] of Object.entries(devtoolsChecks)) {
    if (pattern.test(devtoolsCode)) {
      console.log(`✅ ${name}`);
      passed++;
    } else {
      console.log(`❌ ${name}`);
      failed++;
    }
  }
} catch (e) {
  console.log(`❌ devtools harness file not found: ${e.message}`);
  failed += 7;
}

// ============================================================================
// TEST 6: Verify index.html loads executor
// ============================================================================
console.log('\nTest 6: Verifying index.html integration...');

const indexPath = join(__dirname, 'index.html');
const indexCode = readFileSync(indexPath, 'utf8');

const indexChecks = {
  'loads socialActionExecutor.js': /socialActionExecutor\.js/,
  'loads social-ai-scheduler.js': /social-ai-scheduler\.js/
};

for (const [name, pattern] of Object.entries(indexChecks)) {
  if (pattern.test(indexCode)) {
    console.log(`✅ ${name}`);
    passed++;
  } else {
    console.log(`❌ ${name}`);
    failed++;
  }
}

// ============================================================================
// TEST 7: Verify documentation
// ============================================================================
console.log('\nTest 7: Verifying documentation...');

const docsPath = join(__dirname, 'docs', 'diary-room-logger.md');
const docsCode = readFileSync(docsPath, 'utf8');

const docsChecks = {
  'has troubleshooting section': /Troubleshooting.*Social AI/,
  'documents debugSocialAI flag': /debugSocialAI/,
  'documents __smDebug API': /__smDebug/,
  'documents pause/resume': /pause.*resume/i,
  'has diagnostics examples': /getState/,
  'documents devtools harness': /devtools\/social-ai-debug\.html/
};

for (const [name, pattern] of Object.entries(docsChecks)) {
  if (pattern.test(docsCode)) {
    console.log(`✅ ${name}`);
    passed++;
  } else {
    console.log(`❌ ${name}`);
    failed++;
  }
}

// ============================================================================
// SUMMARY
// ============================================================================
console.log('\n' + '='.repeat(60));
console.log('📊 Test Summary');
console.log('='.repeat(60));
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log('='.repeat(60));

if (failed === 0) {
  console.log('✅ All checks passed! Implementation is complete.');
  process.exit(0);
} else {
  console.log('❌ Some checks failed. Review the output above.');
  process.exit(1);
}
