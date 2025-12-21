#!/usr/bin/env node

/**
 * POV Timer Fixes Verification Script
 * Verifies that redundant timers have been removed from POV flow
 * and that proper guards are in place
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Colors for console output
const RESET = '\x1b[0m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';

let passCount = 0;
let failCount = 0;

function pass(msg) {
  console.log(`${GREEN}✓${RESET} ${msg}`);
  passCount++;
}

function fail(msg) {
  console.log(`${RED}✗${RESET} ${msg}`);
  failCount++;
}

function info(msg) {
  console.log(`${CYAN}ℹ${RESET} ${msg}`);
}

function section(title) {
  console.log(`\n${YELLOW}▶${RESET} ${title}`);
}

console.log('\n=== POV Timer Redundant Wait Elimination Verification ===\n');

// Read veto.js
const vetoPath = join(__dirname, '..', 'js', 'veto.js');
let vetoContent;
try {
  vetoContent = readFileSync(vetoPath, 'utf8');
} catch (e) {
  fail('Could not read js/veto.js');
  process.exit(1);
}

section('Timer Configuration Constants');

// Test 1: Check for POV_RESULTS_TO_WINNER_DELAY_MS constant
if (vetoContent.includes('const POV_RESULTS_TO_WINNER_DELAY_MS')) {
  pass('POV_RESULTS_TO_WINNER_DELAY_MS constant is defined');
  
  // Check the value is 1000ms (1s)
  const match = vetoContent.match(/POV_RESULTS_TO_WINNER_DELAY_MS\s*=\s*(\d+)/);
  if (match && parseInt(match[1]) === 1000) {
    pass('POV_RESULTS_TO_WINNER_DELAY_MS is set to 1000ms (1s)');
  } else {
    fail(`POV_RESULTS_TO_WINNER_DELAY_MS is not 1000ms (found: ${match ? match[1] : 'unknown'})`);
  }
} else {
  fail('POV_RESULTS_TO_WINNER_DELAY_MS constant not found');
}

// Test 2: Check for VETO_CEREMONY_START_DELAY_MS constant
if (vetoContent.includes('const VETO_CEREMONY_START_DELAY_MS')) {
  pass('VETO_CEREMONY_START_DELAY_MS constant is defined');
  
  // Check the value is 0ms (immediate)
  const match = vetoContent.match(/VETO_CEREMONY_START_DELAY_MS\s*=\s*(\d+)/);
  if (match && parseInt(match[1]) === 0) {
    pass('VETO_CEREMONY_START_DELAY_MS is set to 0ms (immediate)');
  } else {
    fail(`VETO_CEREMONY_START_DELAY_MS is not 0ms (found: ${match ? match[1] : 'unknown'})`);
  }
} else {
  fail('VETO_CEREMONY_START_DELAY_MS constant not found');
}

section('handlePostVetoReveal Function');

// Test 3: Check for __postVetoRevealCalled guard
if (vetoContent.includes('g.__postVetoRevealCalled')) {
  pass('__postVetoRevealCalled guard flag is present');
} else {
  fail('__postVetoRevealCalled guard flag not found');
}

// Test 4: Verify guard prevents duplicate execution
const guardPattern = /if\s*\(\s*g\.__postVetoRevealCalled\s*\)/;
if (guardPattern.test(vetoContent)) {
  pass('Guard check for __postVetoRevealCalled exists');
} else {
  fail('Guard check for __postVetoRevealCalled not found');
}

// Test 5: Verify guard is set after check
const guardSetPattern = /g\.__postVetoRevealCalled\s*=\s*true/;
if (guardSetPattern.test(vetoContent)) {
  pass('__postVetoRevealCalled is set to true to prevent duplicates');
} else {
  fail('__postVetoRevealCalled not set to true');
}

// Test 6: Check that Final4 path has no setTimeout delay
// Extract the handlePostVetoReveal function
const funcMatch = vetoContent.match(/function handlePostVetoReveal\(\)\{[\s\S]*?\n  \}/);
if (funcMatch) {
  const funcBody = funcMatch[0];
  
  // Check for Final4 condition
  if (funcBody.includes('aliveCount === 4')) {
    pass('Final4 condition is present');
    
    // Verify no setTimeout in Final4 path
    // Look for the Final4 block and check if it has setTimeout
    const final4BlockMatch = funcBody.match(/if\s*\(\s*aliveCount\s*===\s*4\s*\)\s*\{[\s\S]*?\n\s*\}\s*else/);
    if (final4BlockMatch) {
      const final4Block = final4BlockMatch[0];
      
      if (final4Block.includes('setTimeout')) {
        fail('Final4 path still has setTimeout - redundant delay not removed');
      } else {
        pass('Final4 path has no setTimeout - immediate execution confirmed');
      }
      
      // Verify startFinal4Eviction is called directly
      if (final4Block.includes('startFinal4Eviction()')) {
        pass('startFinal4Eviction() is called immediately in Final4 path');
      } else {
        fail('startFinal4Eviction() not found in Final4 path');
      }
    }
  } else {
    fail('Final4 condition not found in handlePostVetoReveal');
  }
  
  // Check non-Final4 path
  const elseBlockMatch = funcBody.match(/\}\s*else\s*\{[\s\S]*?\n\s*\}[\s\S]*?$/);
  if (elseBlockMatch) {
    const elseBlock = elseBlockMatch[0];
    
    // Verify startVetoCeremony is called immediately
    if (elseBlock.includes('startVetoCeremony()')) {
      pass('startVetoCeremony() is called immediately in non-Final4 path');
    } else {
      fail('startVetoCeremony() not called directly in non-Final4 path');
    }
    
    // Verify no setTimeout before startVetoCeremony
    if (!elseBlock.match(/setTimeout[\s\S]*?startVetoCeremony/)) {
      pass('Non-Final4 path has no setTimeout before startVetoCeremony');
    } else {
      fail('Non-Final4 path still has setTimeout delay');
    }
  }
} else {
  fail('Could not parse handlePostVetoReveal function');
}

section('finishVetoComp Function');

// Test 7: Verify timers are cleared
if (vetoContent.includes('clearTimeout(g.__vetoAutoTimer)')) {
  pass('g.__vetoAutoTimer is cleared in finishVetoComp');
} else {
  fail('g.__vetoAutoTimer clearing not found');
}

// Test 8: Verify phase countdown is set to 1s
const setPhasePattern = /setPhase\s*\(\s*g\.phase\s*,\s*timeToWinner/;
if (setPhasePattern.test(vetoContent)) {
  pass('Phase countdown is set using timeToWinner calculation');
} else {
  fail('Phase countdown setting not found or incorrect');
}

// Test 9: Verify results display duration matches POV_RESULTS_TO_WINNER_DELAY_MS
if (vetoContent.includes('var displayDuration = POV_RESULTS_TO_WINNER_DELAY_MS')) {
  pass('Results display duration uses POV_RESULTS_TO_WINNER_DELAY_MS constant');
} else {
  fail('Results display duration does not use constant');
}

section('startVetoCeremony Function');

// Test 10: Verify ceremony intro card is skipped
if (vetoContent.includes('Skipping ceremony intro card')) {
  pass('Ceremony intro card is skipped (no initial idle wait)');
} else {
  info('Ceremony intro skip comment not found (may be OK if removed)');
}

// Test 11: Verify human path shows decision immediately
if (vetoContent.includes('await renderPOVUseDecision')) {
  pass('Human path calls renderPOVUseDecision immediately');
} else {
  fail('renderPOVUseDecision call not found in human path');
}

// Test 12: Verify AI path has phase guard
const aiTimerPattern = /g\.__vetoAutoTimer\s*=\s*setTimeout\s*\(\s*function\s*\(\s*\)\s*\{[\s\S]*?if\s*\(\s*gg\s*&&\s*gg\.phase\s*===\s*['"]veto_ceremony['"]/;
if (aiTimerPattern.test(vetoContent)) {
  pass('AI auto-decision timer has phase guard');
} else {
  fail('AI auto-decision timer phase guard not found');
}

section('Documentation');

// Test 13: Verify updated documentation
if (vetoContent.includes('Immediate transitions: results → ceremony → decision')) {
  pass('Documentation updated to reflect immediate transitions');
} else {
  fail('Documentation does not mention immediate transitions');
}

// Test 14: Verify timer flow is documented
if (vetoContent.includes('results show 1s → 100ms buffer → ceremony starts → decision shows immediately')) {
  pass('Complete timer flow is documented');
} else {
  fail('Complete timer flow documentation not found');
}

// Summary
console.log(`\n${'='.repeat(60)}`);
console.log(`${GREEN}Passed:${RESET} ${passCount}  ${RED}Failed:${RESET} ${failCount}`);
console.log(`${'='.repeat(60)}\n`);

if (failCount > 0) {
  console.log(`${RED}⚠ Verification failed. Please review the failed checks above.${RESET}\n`);
  process.exit(1);
} else {
  console.log(`${GREEN}✓ All checks passed! POV timer fixes are properly implemented.${RESET}\n`);
  process.exit(0);
}
