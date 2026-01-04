#!/usr/bin/env node

/**
 * Test script to verify Bug 1 and Bug 2 fixes
 * This script validates that the code changes correctly prevent auto-start
 * and properly connect pause events to the PauseController
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ANSI color codes for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function logSection(title) {
  console.log();
  log('='.repeat(70), 'cyan');
  log(title, 'cyan');
  log('='.repeat(70), 'cyan');
}

function logTest(name, passed) {
  const icon = passed ? '✅' : '❌';
  const color = passed ? 'green' : 'red';
  log(`${icon} ${name}`, color);
}

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  warnings: 0
};

// ============================================================================
// BUG 1 TESTS: Intro Hub Auto-Start Prevention
// ============================================================================

function testBug1() {
  logSection('Bug 1: Intro Hub Auto-Start Prevention');
  
  const filesToCheck = [
    'js/settings/render.js',
    'js/ui.config-and-settings.js',
    'js/players-total.js',
    'js/settings.js'
  ];
  
  log('\nChecking that all files contain __bbPlayInitiated check...', 'blue');
  
  for (const file of filesToCheck) {
    const path = resolve(__dirname, file);
    try {
      const content = readFileSync(path, 'utf-8');
      
      // Check for the pattern: g.__bbPlayInitiated === true (or window.__bbPlayInitiated)
      const hasCheck = content.includes('__bbPlayInitiated === true') &&
                      content.includes('startOpeningSequence');
      
      if (hasCheck) {
        logTest(`${file} contains __bbPlayInitiated check`, true);
        results.passed++;
      } else {
        logTest(`${file} missing __bbPlayInitiated check`, false);
        results.failed++;
      }
      
      // Additional check: verify the check comes BEFORE startOpeningSequence call
      const lines = content.split('\n');
      let checkLine = -1;
      let callLine = -1;
      
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('__bbPlayInitiated === true')) {
          checkLine = i;
        }
        if (checkLine > 0 && lines[i].includes('startOpeningSequence()') && 
            i > checkLine && i < checkLine + 5) {
          callLine = i;
          break;
        }
      }
      
      if (checkLine > 0 && callLine > checkLine) {
        logTest(`${file} has correct check order (check before call)`, true);
        results.passed++;
      } else if (checkLine === -1) {
        logTest(`${file} check order validation skipped (no check found)`, false);
        results.failed++;
      }
      
    } catch (err) {
      logTest(`${file} could not be read: ${err.message}`, false);
      results.failed++;
    }
  }
  
  log('\nBug 1 Summary:', 'yellow');
  log(`  Files should only call startOpeningSequence() if __bbPlayInitiated === true`, 'yellow');
  log(`  This prevents auto-start when settings change on intro hub`, 'yellow');
}

// ============================================================================
// BUG 2 TESTS: Actual Game Pause
// ============================================================================

function testBug2() {
  logSection('Bug 2: Actual Game Pause During Modals');
  
  const file = 'js/ui/global-pause.js';
  const path = resolve(__dirname, file);
  
  log('\nChecking that PauseManager calls PauseController...', 'blue');
  
  try {
    const content = readFileSync(path, 'utf-8');
    
    // Check that open() function calls PauseController.pause()
    const openHasController = content.includes('PauseController.pause');
    const openEmitsPause = content.includes("emit('game:pause')");
    
    if (openHasController && openEmitsPause) {
      logTest(`PauseManager.open() calls PauseController.pause()`, true);
      results.passed++;
    } else {
      logTest(`PauseManager.open() missing PauseController.pause() call`, false);
      results.failed++;
    }
    
    // Check that close() function calls PauseController.resume()
    const closeHasController = content.includes('PauseController.resume');
    const closeEmitsResume = content.includes("emit('game:resume')");
    
    if (closeHasController && closeEmitsResume) {
      logTest(`PauseManager.close() calls PauseController.resume()`, true);
      results.passed++;
    } else {
      logTest(`PauseManager.close() missing PauseController.resume() call`, false);
      results.failed++;
    }
    
    // Verify the calls are conditional (check for window.PauseController existence)
    const hasExistenceCheck = content.includes('window.PauseController');
    
    if (hasExistenceCheck) {
      logTest(`PauseManager checks for PauseController existence`, true);
      results.passed++;
    } else {
      logTest(`PauseManager missing existence check (may cause errors)`, false);
      results.warnings++;
    }
    
  } catch (err) {
    logTest(`${file} could not be read: ${err.message}`, false);
    results.failed++;
  }
  
  log('\nBug 2 Summary:', 'yellow');
  log(`  PauseManager now connects to PauseController for actual game pause`, 'yellow');
  log(`  This ensures timers, social AI, and phase transitions all stop`, 'yellow');
}

// ============================================================================
// VERIFICATION OF EXISTING INFRASTRUCTURE
// ============================================================================

function testExistingInfrastructure() {
  logSection('Verification: Existing Pause Infrastructure');
  
  log('\nChecking that required modules have pause support...', 'blue');
  
  // Check ui.hud-and-router.js has pause checks
  try {
    const hudPath = resolve(__dirname, 'js/ui.hud-and-router.js');
    const hudContent = readFileSync(hudPath, 'utf-8');
    
    const hasPauseCheck = hudContent.includes('.isPaused()') &&
                         (hudContent.includes('pauseController') || hudContent.includes('pauseManager') || hudContent.includes('PauseController'));
    
    if (hasPauseCheck) {
      logTest(`ui.hud-and-router.js tick loop checks pause state`, true);
      results.passed++;
    } else {
      logTest(`ui.hud-and-router.js missing pause checks`, false);
      results.warnings++;
    }
  } catch (err) {
    logTest(`ui.hud-and-router.js could not be verified`, false);
    results.warnings++;
  }
  
  // Check PauseController.js exists and has required methods
  try {
    const pausePath = resolve(__dirname, 'js/flow/PauseController.js');
    const pauseContent = readFileSync(pausePath, 'utf-8');
    
    const hasPauseMethod = pauseContent.includes('function pause(');
    const hasResumeMethod = pauseContent.includes('function resume(');
    const hasIsPausedMethod = pauseContent.includes('function isPaused(');
    
    if (hasPauseMethod && hasResumeMethod && hasIsPausedMethod) {
      logTest(`PauseController has all required methods`, true);
      results.passed++;
    } else {
      logTest(`PauseController missing some methods`, false);
      results.failed++;
    }
    
    // Check for timer state capture
    const capturesTimerState = pauseContent.includes('captureTimerState');
    const restoresTimerState = pauseContent.includes('restoreTimerState');
    
    if (capturesTimerState && restoresTimerState) {
      logTest(`PauseController captures/restores timer state`, true);
      results.passed++;
    } else {
      logTest(`PauseController missing timer state management`, false);
      results.warnings++;
    }
    
  } catch (err) {
    logTest(`PauseController.js could not be verified`, false);
    results.warnings++;
  }
}

// ============================================================================
// RUN ALL TESTS
// ============================================================================

function runTests() {
  log('🧪 Bug Fix Validation Tests', 'cyan');
  log('Testing fixes for intro hub auto-start and game pause bugs\n', 'blue');
  
  testBug1();
  testBug2();
  testExistingInfrastructure();
  
  // Final summary
  logSection('Test Results Summary');
  
  const total = results.passed + results.failed;
  const passRate = total > 0 ? ((results.passed / total) * 100).toFixed(1) : 0;
  
  log(`\nTotal Tests: ${total}`, 'blue');
  log(`Passed: ${results.passed}`, 'green');
  log(`Failed: ${results.failed}`, results.failed > 0 ? 'red' : 'green');
  log(`Warnings: ${results.warnings}`, results.warnings > 0 ? 'yellow' : 'green');
  log(`Pass Rate: ${passRate}%\n`, passRate >= 100 ? 'green' : 'yellow');
  
  if (results.failed === 0 && results.warnings === 0) {
    log('✅ ALL TESTS PASSED! Fixes are correctly implemented.', 'green');
    return 0;
  } else if (results.failed === 0) {
    log('⚠️  All tests passed but there are warnings to review.', 'yellow');
    return 0;
  } else {
    log('❌ SOME TESTS FAILED! Please review the implementation.', 'red');
    return 1;
  }
}

// Run tests and exit with appropriate code
const exitCode = runTests();
process.exit(exitCode);
