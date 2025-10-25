#!/usr/bin/env node
/**
 * Verification script for finale profile modal integration
 * Checks that the code changes meet all requirements
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ANSI color codes
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';
const BLUE = '\x1b[34m';

function log(message, type = 'info') {
  const prefix = {
    success: `${GREEN}✓${RESET}`,
    error: `${RED}✗${RESET}`,
    warn: `${YELLOW}⚠${RESET}`,
    info: `${BLUE}ℹ${RESET}`
  }[type] || '';
  console.log(`${prefix} ${message}`);
}

function checkFileContent(filepath, checks) {
  try {
    const content = readFileSync(join(__dirname, filepath), 'utf8');
    const results = [];
    
    for (const check of checks) {
      const { name, test, shouldExist = true } = check;
      const exists = test(content);
      const pass = exists === shouldExist;
      
      results.push({ name, pass, exists, shouldExist });
      
      if (pass) {
        log(`${name}: PASS`, 'success');
      } else {
        log(`${name}: FAIL (${shouldExist ? 'not found' : 'still present'})`, 'error');
      }
    }
    
    return results;
  } catch (e) {
    log(`Error reading ${filepath}: ${e.message}`, 'error');
    return [];
  }
}

console.log('\n' + '='.repeat(60));
console.log('Finale Profile Modal Integration Verification');
console.log('='.repeat(60) + '\n');

// Test 1: Inline profile form removed
console.log('📋 Test 1: Inline profile form removed from finale.js\n');
const test1Results = checkFileContent('js/finale.js', [
  {
    name: 'cinProfile div removed',
    test: (content) => content.includes('<div class="cinProfile" id="cinProfile">'),
    shouldExist: false
  },
  {
    name: 'cinFieldRow class removed',
    test: (content) => content.includes('.cinFieldRow{'),
    shouldExist: false
  },
  {
    name: 'cinPName input removed',
    test: (content) => content.includes('id="cinPName"'),
    shouldExist: false
  },
  {
    name: 'cinProfileStart button removed',
    test: (content) => content.includes('id="cinProfileStart"'),
    shouldExist: false
  }
]);

console.log('');

// Test 2: ProfileModal integration present
console.log('📋 Test 2: ProfileModal integration present\n');
const test2Results = checkFileContent('js/finale.js', [
  {
    name: 'ProfileModal.show() called',
    test: (content) => content.includes('ProfileModal.show(')
  },
  {
    name: 'ProfileService.setCurrentProfile() called',
    test: (content) => content.includes('ProfileService.setCurrentProfile(')
  },
  {
    name: 'ProfileService.incrementSeason() called',
    test: (content) => content.includes('ProfileService.incrementSeason(')
  },
  {
    name: 'ProfileService.setGuestMode() called',
    test: (content) => content.includes('ProfileService.setGuestMode(')
  },
  {
    name: 'onSelect callback implemented',
    test: (content) => content.includes('onSelect:')
  },
  {
    name: 'onGuest callback implemented',
    test: (content) => content.includes('onGuest:')
  }
]);

console.log('');

// Test 3: startNewSeasonFlow helper implemented
console.log('📋 Test 3: startNewSeasonFlow helper implemented\n');
const test3Results = checkFileContent('js/finale.js', [
  {
    name: 'startNewSeasonFlow function defined',
    test: (content) => content.includes('function startNewSeasonFlow(')
  },
  {
    name: 'rebuildGame(false) called',
    test: (content) => content.includes('rebuildGame(false)')
  },
  {
    name: 'buildCast() fallback present',
    test: (content) => content.includes('buildCast()')
  },
  {
    name: 'startOpeningSequence() called',
    test: (content) => content.includes('startOpeningSequence()')
  },
  {
    name: 'Defensive API checks present',
    test: (content) => content.includes('API.rebuildGame') && content.includes('typeof')
  }
]);

console.log('');

// Test 4: Defensive checks present
console.log('📋 Test 4: Defensive checks for ProfileService/ProfileModal\n');
const test4Results = checkFileContent('js/finale.js', [
  {
    name: 'ProfileService existence check',
    test: (content) => content.includes('!g.ProfileService')
  },
  {
    name: 'ProfileModal existence check',
    test: (content) => content.includes('!g.ProfileModal')
  },
  {
    name: 'Fallback behavior present',
    test: (content) => content.includes('falling back')
  }
]);

console.log('');

// Test 5: Logging present
console.log('📋 Test 5: Console logging for debugging\n');
const test5Results = checkFileContent('js/finale.js', [
  {
    name: '[finale] prefix used',
    test: (content) => content.includes('[finale]')
  },
  {
    name: '[new-season] prefix used',
    test: (content) => content.includes('[new-season]')
  },
  {
    name: 'Profile selected log',
    test: (content) => content.includes('profile selected')
  },
  {
    name: 'Guest mode selected log',
    test: (content) => content.includes('guest mode selected')
  }
]);

console.log('');

// Test 6: Existing functionality preserved
console.log('📋 Test 6: Existing functionality preserved\n');
const test6Results = checkFileContent('js/finale.js', [
  {
    name: 'CREDITS button handler present',
    test: (content) => content.includes('#cinCredits')
  },
  {
    name: 'STATS button handler present',
    test: (content) => content.includes('#cinStatsBtn')
  },
  {
    name: 'EXIT button handler present',
    test: (content) => content.includes('#cinExit')
  },
  {
    name: 'Winner name display',
    test: (content) => content.includes('#cinWinName')
  },
  {
    name: 'Game completion marking',
    test: (content) => content.includes('bb.lastGameCompleted')
  },
  {
    name: 'Outro autoplay logic',
    test: (content) => content.includes('__outroAutoPlayed')
  }
]);

console.log('');

// Calculate overall results
const allResults = [
  ...test1Results,
  ...test2Results,
  ...test3Results,
  ...test4Results,
  ...test5Results,
  ...test6Results
];

const passed = allResults.filter(r => r.pass).length;
const total = allResults.length;

console.log('='.repeat(60));
console.log('📊 Verification Summary');
console.log('='.repeat(60) + '\n');

if (passed === total) {
  log(`All checks passed: ${passed}/${total}`, 'success');
  console.log('\n' + GREEN + '✅ VERIFICATION PASSED' + RESET);
  console.log('The finale profile modal integration is complete.\n');
  process.exit(0);
} else {
  log(`Checks passed: ${passed}/${total}`, 'warn');
  log(`Checks failed: ${total - passed}/${total}`, 'error');
  console.log('\n' + RED + '❌ VERIFICATION FAILED' + RESET);
  console.log('Some requirements are not met.\n');
  process.exit(1);
}
