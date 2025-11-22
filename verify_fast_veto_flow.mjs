#!/usr/bin/env node

/**
 * Verification script for fast veto flow implementation
 * Checks that all requirements from the problem statement are met
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read source files
const vetoPath = join(__dirname, 'js', 'veto.js');
const configPath = join(__dirname, 'js', 'config', 'defaults.js');

const vetoContent = readFileSync(vetoPath, 'utf-8');
const configContent = readFileSync(configPath, 'utf-8');

let passed = 0;
let failed = 0;

function check(description, condition) {
  if (condition) {
    console.log(`✅ PASS: ${description}`);
    passed++;
  } else {
    console.log(`❌ FAIL: ${description}`);
    failed++;
  }
}

console.log('=== Fast Veto Flow Implementation Verification ===\n');

// 1. Configuration Flags
console.log('1. Configuration Flags:');
check('fastVetoFlow config flag exists', configContent.includes('fastVetoFlow:'));
check('showExtendedVetoReveal config flag exists', configContent.includes('showExtendedVetoReveal:'));
check('skipVetoIntroCard config flag exists', configContent.includes('skipVetoIntroCard:'));
check('fastVetoFlow default is true', /fastVetoFlow:\s*true/.test(configContent));

// 2. Helper Functions
console.log('\n2. Helper Functions:');
check('fastVetoEnabled() function exists', /function fastVetoEnabled\(\)/.test(vetoContent));
check('extendedRevealEnabled() function exists', /function extendedRevealEnabled\(\)/.test(vetoContent));
check('allVetoScoresSubmitted() function exists', /function allVetoScoresSubmitted\(\)/.test(vetoContent));
check('accelerateVetoCompCompletion() function exists', /function accelerateVetoCompCompletion\(\)/.test(vetoContent));
check('proceedAfterVetoResults() function exists', /function proceedAfterVetoResults\(\)/.test(vetoContent));

// 3. Early Completion Mechanism
console.log('\n3. Early Completion Mechanism:');
check('__vetoEarlyFinished guard flag set', /g\.__vetoEarlyFinished\s*=\s*true/.test(vetoContent));
check('allVetoScoresSubmitted checks __vetoPlayers', /g\.__vetoPlayers/.test(vetoContent));
check('accelerateVetoCompCompletion has guard', /if\s*\(\s*g\.__vetoEarlyFinished\s*\)/.test(vetoContent));
check('submitGuarded triggers early completion', /if\s*\(\s*g\.phase\s*===\s*['"]veto_comp['"].*fastVetoEnabled\(\).*allVetoScoresSubmitted\(\)/.test(vetoContent));
check('Early finish log message present', /Fast path: all scores submitted/.test(vetoContent));

// 4. Fast Reveal Implementation
console.log('\n4. Fast Reveal Implementation:');
check('Fast reveal path condition exists', /if\s*\(\s*fastVetoEnabled\(\)/.test(vetoContent));
check('Fast reveal shows single card (1200ms)', /duration:\s*1200/.test(vetoContent));
check('Extended reveal check exists', /if\s*\(\s*!extendedRevealEnabled\(\)/.test(vetoContent));
check('Fast reveal calls proceedAfterVetoResults', /proceedAfterVetoResults\(\)/.test(vetoContent));

// 5. Social Phase Insertion
console.log('\n5. Social Phase Insertion:');
check('proceedAfterVetoResults calls startSocial', /startSocial\s*\(\s*['"]veto_comp['"]/.test(vetoContent));
check('Final 4 bypass preserved', /if\s*\(\s*alivePlayers\(\)\.length\s*===\s*4/.test(vetoContent));
check('Social phase log message exists', /Transitioning to social phase before ceremony/.test(vetoContent));
check('__socialInsertedAfterVeto guard exists', /__socialInsertedAfterVeto/.test(vetoContent));

// 6. Ceremony Intro Optimization
console.log('\n6. Ceremony Intro Optimization:');
check('INTRO_DURATION variable exists', /INTRO_DURATION/.test(vetoContent));
check('Fast intro is 600ms', /INTRO_DURATION\s*=\s*600/.test(vetoContent));
check('Skip intro option exists', /skipVetoIntroCard/.test(vetoContent));
check('Intro can be 0ms when skipped', /INTRO_DURATION\s*=\s*0/.test(vetoContent));
check('Fast ceremony intro log exists', /Fast ceremony intro/.test(vetoContent));

// 7. AI Decision Delay
console.log('\n7. AI Decision Delay:');
check('AI delay variable exists', /aiDelayMs/.test(vetoContent));
check('Fast mode AI delay is 50ms', /aiDelayMs\s*=\s*fastVetoEnabled\(\)\s*\?\s*50/.test(vetoContent));
check('Legacy AI delay is 1200ms', /:\s*1200/.test(vetoContent));

// 8. Compressed Card Durations
console.log('\n8. Compressed Card Durations:');
check('CARD_DUR variable for veto decision', /CARD_DUR\s*=\s*fastVetoEnabled\(\)\s*\?\s*1400\s*:\s*3200/.test(vetoContent));
check('REPLACEMENT_CARD_DUR exists', /REPLACEMENT_CARD_DUR/.test(vetoContent));
check('NOT_USED_DUR exists', /NOT_USED_DUR/.test(vetoContent));
check('ADJOURN_DUR exists', /ADJOURN_DUR/.test(vetoContent));
check('REPLACEMENT_NOM_DUR exists', /REPLACEMENT_NOM_DUR/.test(vetoContent));
check('ANNOUNCE_TITLE_DUR exists', /ANNOUNCE_TITLE_DUR/.test(vetoContent));
check('ANNOUNCE_MSG_DUR exists', /ANNOUNCE_MSG_DUR/.test(vetoContent));

// 9. Logging
console.log('\n9. Diagnostic Logging:');
check('Early finish log present', /\[veto\] Fast path: all scores submitted/.test(vetoContent));
check('Fast reveal log present', /\[veto\] Fast reveal path/.test(vetoContent));
check('Social transition log present', /\[veto\] Transitioning to social phase before ceremony/.test(vetoContent));
check('Fast ceremony intro log present', /\[veto\] Fast ceremony intro/.test(vetoContent));
check('AI decision delay log present', /AI POV holder - scheduling auto-decision in/.test(vetoContent));

// 10. Safeguards
console.log('\n10. Safeguards:');
check('Final 4 bypass check in proceedAfterVetoResults', /if\s*\(\s*alivePlayers\(\)\.length\s*===\s*4/.test(vetoContent));
check('handlePostVetoReveal still exists', /function handlePostVetoReveal/.test(vetoContent));
check('integrityCheckNominees call preserved', /integrityCheckNominees\(\)/.test(vetoContent));
check('Diamond POV logic preserved', /handleDiamondPOVCeremony/.test(vetoContent));
check('Golden POV check preserved', /isGoldenPOV/.test(vetoContent));

// 11. Backward Compatibility
console.log('\n11. Backward Compatibility:');
check('Legacy reveal path still exists (ffActive)', /if\s*\(\s*ffActive\s*&&\s*g\.__humanPlayedVeto\s*\)/.test(vetoContent));
check('Legacy ceremony path exists', /else\s*\{[\s\S]*showVetoRevealSequence/.test(vetoContent));
check('Config defaults exist for all new flags', /fastVetoFlow:.*showExtendedVetoReveal:.*skipVetoIntroCard:/s.test(configContent));

// Summary
console.log('\n=== Verification Summary ===');
console.log(`Total checks: ${passed + failed}`);
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);

if (failed === 0) {
  console.log('\n🎉 All verification checks passed!');
  process.exit(0);
} else {
  console.log(`\n⚠️  ${failed} verification check(s) failed.`);
  process.exit(1);
}
