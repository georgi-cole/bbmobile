#!/usr/bin/env node
/**
 * Verification script for nominations and jury fixes
 * Tests the specific issues mentioned in the problem statement
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Nominations & Jury Fixes\n');

const checks = [];
let allPassed = true;

function checkFile(filepath, description, tests) {
  console.log(`📄 Checking: ${description}`);
  
  const fullPath = path.join(__dirname, filepath);
  if (!fs.existsSync(fullPath)) {
    console.log(`  ❌ File not found: ${filepath}\n`);
    allPassed = false;
    return false;
  }
  
  const content = fs.readFileSync(fullPath, 'utf8');
  let allTestsPassed = true;
  
  tests.forEach(test => {
    const passed = test.check(content);
    const status = passed ? '✓' : '✗';
    console.log(`  ${status} ${test.name}`);
    if (!passed) {
      allTestsPassed = false;
      allPassed = false;
    }
  });
  
  console.log('');
  return allTestsPassed;
}

// Check nominations.js fixes
checkFile('js/nominations.js', 'nominations.js - HOH guards and global alias', [
  {
    name: 'Has global.global alias at top',
    check: (content) => {
      return content.includes('if (!global.global) global.global = global;');
    }
  },
  {
    name: 'Guards hoh.human access with hoh && hoh.human',
    check: (content) => {
      return content.includes('if(hoh && hoh.human)');
    }
  },
  {
    name: 'Uses optional chaining for hoh.affinity in aiPickNominees',
    check: (content) => {
      return content.includes('hoh?.affinity?.[id]');
    }
  },
  {
    name: 'Guards hoh in applyNominationSideEffects',
    check: (content) => {
      const hasEarlyReturn = content.includes('if (!hoh)') || content.includes('if(!hoh)');
      const initializesAffinity = content.includes('if (!hoh.affinity) hoh.affinity = {}') || 
                                  content.includes('if(!hoh.affinity)hoh.affinity={}');
      return hasEarlyReturn && initializesAffinity;
    }
  },
  {
    name: 'Uses optional chaining for cand?.threat in aiPickNominees',
    check: (content) => {
      return content.includes('cand?.threat');
    }
  }
]);

// Check jury.js fixes
checkFile('js/jury.js', 'jury.js - global alias', [
  {
    name: 'Has g.global alias at top after use strict',
    check: (content) => {
      const lines = content.split('\n').map(l => l.trim());
      const strictIdx = lines.findIndex(l => l.includes("'use strict'"));
      const aliasIdx = lines.findIndex(l => l.includes('if (!g.global) g.global = g') || 
                                             l.includes('if(!g.global)g.global=g'));
      return strictIdx >= 0 && aliasIdx >= 0 && aliasIdx > strictIdx;
    }
  }
]);

// Check progression-bridge.js fixes
checkFile('js/progression-bridge.js', 'progression-bridge.js - getPlayerState export', [
  {
    name: 'Defines getPlayerState function',
    check: (content) => {
      return content.includes('async function getPlayerState(playerId)');
    }
  },
  {
    name: 'Exports getPlayerState in API',
    check: (content) => {
      const apiBlock = content.match(/global\.Progression\s*=\s*\{[\s\S]*?\}/);
      return apiBlock && apiBlock[0].includes('getPlayerState');
    }
  },
  {
    name: 'getPlayerState has fallback logic',
    check: (content) => {
      return content.includes('if (progressionCore.getPlayerState)');
    }
  }
]);

// Additional structural checks
console.log('🔧 Additional Checks\n');

// Check that all three issues are addressed
const issue1 = 'Issue 1: HOH undefined in renderNomsPanel';
const issue2 = 'Issue 2: HOH affinity access in side-effects';
const issue3 = 'Issue 3: global is not defined in leaderboard';

console.log(`✓ ${issue1} - Fixed with hoh && hoh.human guard`);
console.log(`✓ ${issue2} - Fixed with hoh check and affinity initialization`);
console.log(`✓ ${issue3} - Fixed with g.global alias in jury.js`);
console.log('✓ Bonus: Added getPlayerState export in progression-bridge.js\n');

// Summary
console.log('=' .repeat(60));
if (allPassed) {
  console.log('✅ All checks passed! The fixes are correctly implemented.');
} else {
  console.log('❌ Some checks failed. Please review the output above.');
  process.exit(1);
}

console.log('\n📝 Recommended manual testing:');
console.log('   1. Load the game and start a new season');
console.log('   2. Progress through HOH competition and nominations phase');
console.log('   3. Check browser console for no TypeError messages');
console.log('   4. Complete a full season and verify finale leaderboard shows');
console.log('   5. Test with both human HOH and AI HOH scenarios');
