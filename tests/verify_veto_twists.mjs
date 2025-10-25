#!/usr/bin/env node

/**
 * POV Twist Verification Script
 * Verifies that the POV twist regression fixes are implemented correctly
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
  console.log(`${YELLOW}ℹ${RESET} ${msg}`);
}

console.log('\n=== POV Twist Regression Fixes Verification ===\n');

// Read veto.js
const vetoPath = join(__dirname, '..', 'js', 'veto.js');
let vetoContent;
try {
  vetoContent = readFileSync(vetoPath, 'utf8');
} catch (e) {
  fail('Could not read js/veto.js');
  process.exit(1);
}

// Test 1: Check for __useTVCeremonyUI guard flag
if (vetoContent.includes('g.__useTVCeremonyUI')) {
  pass('__useTVCeremonyUI guard flag is present');
} else {
  fail('__useTVCeremonyUI guard flag not found');
}

// Test 2: Check that __useTVCeremonyUI is set to true for human POV holder
if (vetoContent.includes('g.__useTVCeremonyUI = true')) {
  pass('__useTVCeremonyUI is set to true for human POV holder');
} else {
  fail('__useTVCeremonyUI not set to true');
}

// Test 3: Check that renderVetoCeremonyPanel uses the guard flag
if (vetoContent.includes('if(g.__useTVCeremonyUI)')) {
  pass('renderVetoCeremonyPanel checks __useTVCeremonyUI flag');
} else {
  fail('renderVetoCeremonyPanel does not check __useTVCeremonyUI flag');
}

// Test 4: Check for renderReplacementChoiceBy function
if (vetoContent.includes('function renderReplacementChoiceBy(')) {
  pass('renderReplacementChoiceBy function exists');
} else {
  fail('renderReplacementChoiceBy function not found');
}

// Test 5: Check for multi-select support in renderReplacementChoiceBy
if (vetoContent.includes('var multi = options.multi')) {
  pass('renderReplacementChoiceBy supports multi-select parameter');
} else {
  fail('renderReplacementChoiceBy does not support multi-select');
}

// Test 6: Check for grid layout in renderReplacementChoiceBy
if (vetoContent.includes('veto-replacement-grid') && vetoContent.includes('grid.className')) {
  pass('renderReplacementChoiceBy uses CSS grid layout with proper class');
} else {
  fail('renderReplacementChoiceBy does not use CSS grid layout properly');
}

// Test 7: Check for confirm button logic
if (vetoContent.includes('confirmBtn.disabled = (selectedIds.length !== multi)')) {
  pass('Confirm button is disabled until correct number of selections');
} else {
  fail('Confirm button logic not found');
}

// Test 8: Check for "Select two replacement nominees" title
if (vetoContent.includes('Select two replacement nominees')) {
  pass('Title "Select two replacement nominees" is present');
} else {
  fail('Title "Select two replacement nominees" not found');
}

// Test 9: Check for applyReplacementAndContinueMulti function
if (vetoContent.includes('function applyReplacementAndContinueMulti(')) {
  pass('applyReplacementAndContinueMulti function exists');
} else {
  fail('applyReplacementAndContinueMulti function not found');
}

// Test 10: Check that applyReplacementAndContinueMulti is exported
if (vetoContent.includes('global.applyReplacementAndContinueMulti')) {
  pass('applyReplacementAndContinueMulti is exported to global');
} else {
  fail('applyReplacementAndContinueMulti is not exported');
}

// Test 11: Check that Diamond POV uses renderReplacementChoiceBy
if (vetoContent.includes('renderReplacementChoiceBy(eligibleIds, {')) {
  pass('Diamond POV uses renderReplacementChoiceBy');
} else {
  fail('Diamond POV does not use renderReplacementChoiceBy');
}

// Test 12: Check for multi: 2 in Diamond POV ceremony
if (vetoContent.includes('multi: 2')) {
  pass('Diamond POV ceremony requests 2 selections');
} else {
  fail('Diamond POV ceremony does not request 2 selections');
}

// Test 13: Check that Golden POV uses renderReplacementChoiceBy with multi: 1
if (vetoContent.includes('multi: 1')) {
  pass('Golden POV uses single-select mode');
} else {
  fail('Golden POV single-select mode not found');
}

// Test 14: Check that Diamond POV uses applyReplacementAndContinueMulti
if (vetoContent.includes('applyReplacementAndContinueMulti(newNominees')) {
  pass('Diamond POV calls applyReplacementAndContinueMulti');
} else {
  fail('Diamond POV does not call applyReplacementAndContinueMulti');
}

// Test 15: Check that __useTVCeremonyUI is reset after ceremony
const resetMatches = vetoContent.match(/g\.__useTVCeremonyUI = false/g);
if (resetMatches && resetMatches.length >= 2) {
  pass('__useTVCeremonyUI is reset after ceremony completes');
} else {
  fail('__useTVCeremonyUI reset not found or insufficient');
}

// Test 16: Check that Golden POV replacement picker is shown for POV holder
if (vetoContent.includes('isGoldenPOV')) {
  pass('Golden POV twist check is present in finalizeCeremony');
} else {
  fail('Golden POV twist check not found');
}

// Test 17: Check for announcer parameter in applyReplacementAndContinueMulti
if (vetoContent.includes('var announcer = options.announcer')) {
  pass('applyReplacementAndContinueMulti accepts announcer parameter');
} else {
  fail('applyReplacementAndContinueMulti announcer parameter not found');
}

// Read CSS files - check both nominations.css and veto-twists.css
const nominationsCssPath = join(__dirname, '..', 'css', 'nominations.css');
const vetoTwistsCssPath = join(__dirname, '..', 'css', 'veto-twists.css');
let nominationsCssContent = '';
let vetoTwistsCssContent = '';

try {
  nominationsCssContent = readFileSync(nominationsCssPath, 'utf8');
} catch (e) {
  // nominations.css is optional for veto twists tests
}

try {
  vetoTwistsCssContent = readFileSync(vetoTwistsCssPath, 'utf8');
} catch (e) {
  fail('Could not read css/veto-twists.css');
  process.exit(1);
}

// Combine CSS content for checking
const cssContent = nominationsCssContent + vetoTwistsCssContent;

// Test 18: Check for veto-replacement-grid CSS class
if (cssContent.includes('.veto-replacement-grid')) {
  pass('CSS for .veto-replacement-grid is present');
} else {
  fail('CSS for .veto-replacement-grid not found');
}

// Test 19: Check for veto-replacement-tile CSS class
if (cssContent.includes('.veto-replacement-tile')) {
  pass('CSS for .veto-replacement-tile is present');
} else {
  fail('CSS for .veto-replacement-tile not found');
}

// Test 20: Check for selected state CSS
if (cssContent.includes('.veto-replacement-tile.selected')) {
  pass('CSS for selected state is present');
} else {
  fail('CSS for selected state not found');
}

// Test 21: Check for responsive breakpoints
if (cssContent.includes('@media (max-width: 767px)') || cssContent.includes('@media (max-width: 768px)')) {
  pass('CSS has mobile breakpoints');
} else {
  fail('CSS mobile breakpoints not found');
}

// Test 22: Check for desktop breakpoints
if (cssContent.includes('@media (min-width: 1025px)') || cssContent.includes('@media (min-width: 1024px)')) {
  pass('CSS has desktop breakpoints');
} else {
  fail('CSS desktop breakpoints not found');
}

// Test 23: Check for veto-selection-counter class
if (cssContent.includes('.veto-selection-counter')) {
  pass('CSS for .veto-selection-counter is present');
} else {
  fail('CSS for .veto-selection-counter not found');
}

// Test 24: Check for veto-confirm-btn class
if (cssContent.includes('.veto-confirm-btn')) {
  pass('CSS for .veto-confirm-btn is present');
} else {
  fail('CSS for .veto-confirm-btn not found');
}

// Test 25: Check for fadeSlideIn animation
if (cssContent.includes('@keyframes fadeSlideIn') || cssContent.includes('animation: fadeSlideIn')) {
  pass('CSS has fadeSlideIn animation');
} else {
  fail('CSS fadeSlideIn animation not found');
}

// Test 26: Check for showTVCardWithAvatars function
if (vetoContent.includes('function showTVCardWithAvatars(')) {
  pass('showTVCardWithAvatars function exists');
} else {
  fail('showTVCardWithAvatars function not found');
}

// Test 27: Check that showTVCardWithAvatars is exported
if (vetoContent.includes('global.showTVCardWithAvatars')) {
  pass('showTVCardWithAvatars is exported to global');
} else {
  fail('showTVCardWithAvatars is not exported');
}

// Test 28: Check that avatar-enhanced cards are used in veto decision
if (vetoContent.includes('showTVCardWithAvatars({') && vetoContent.includes('actorIds')) {
  pass('Veto ceremony uses avatar-enhanced cards');
} else {
  fail('Veto ceremony does not use avatar-enhanced cards');
}

// Test 29: Check for avatar row rendering
if (vetoContent.includes('tv-card-avatars') || vetoContent.includes('avatarRow')) {
  pass('Avatar row rendering logic is present');
} else {
  fail('Avatar row rendering logic not found');
}

// Test 30: Check for subject avatars support
if (vetoContent.includes('subjectIds')) {
  pass('Subject avatars parameter is supported');
} else {
  fail('Subject avatars parameter not found');
}

// Test 31: Check for animateNominationTransfer function
if (vetoContent.includes('function animateNominationTransfer(')) {
  pass('animateNominationTransfer function exists');
} else {
  fail('animateNominationTransfer function not found');
}

// Test 32: Check that animateNominationTransfer is exported
if (vetoContent.includes('global.animateNominationTransfer')) {
  pass('animateNominationTransfer is exported to global');
} else {
  fail('animateNominationTransfer is not exported');
}

// Test 33: Check for badge transfer animation usage in Golden POV
if (vetoContent.includes('animateNominationTransfer({')) {
  pass('Badge transfer animation is called in veto ceremony');
} else {
  fail('Badge transfer animation not called');
}

// Test 34: Check for arrowPulse animation
if (cssContent.includes('@keyframes arrowPulse')) {
  pass('CSS has arrowPulse animation');
} else {
  fail('CSS arrowPulse animation not found');
}

// Test 35: Check for badgeSwapOut animation
if (cssContent.includes('@keyframes badgeSwapOut')) {
  pass('CSS has badgeSwapOut animation');
} else {
  fail('CSS badgeSwapOut animation not found');
}

// Test 36: Check for badgeSwapIn animation
if (cssContent.includes('@keyframes badgeSwapIn')) {
  pass('CSS has badgeSwapIn animation');
} else {
  fail('CSS badgeSwapIn animation not found');
}

// Test 37: Check for transfer-scene CSS class
if (cssContent.includes('.transfer-scene')) {
  pass('CSS for .transfer-scene is present');
} else {
  fail('CSS for .transfer-scene not found');
}

// Test 38: Check for transfer-player CSS class
if (cssContent.includes('.transfer-player')) {
  pass('CSS for .transfer-player is present');
} else {
  fail('CSS for .transfer-player not found');
}

// Test 39: Check that animation follows announcement
const animationAfterAnnouncementPattern = /Announcement[\s\S]{1,1500}animateNominationTransfer/;
if (animationAfterAnnouncementPattern.test(vetoContent)) {
  pass('Badge animation called after announcement (correct flow)');
} else {
  fail('Badge animation flow may be incorrect');
}

// Test 40: Check Diamond POV uses multi-nominee animation
if (vetoContent.includes('oldNominees') && vetoContent.includes('diamondPOVApplied')) {
  pass('Diamond POV captures old nominees for animation');
} else {
  fail('Diamond POV old nominee capture not found');
}

// Summary
console.log('\n=== Verification Summary ===');
console.log(`Passed: ${GREEN}${passCount}${RESET}`);
console.log(`Failed: ${RED}${failCount}${RESET}`);

if (failCount === 0) {
  console.log(`\n${GREEN}✓ All tests passed!${RESET}\n`);
  process.exit(0);
} else {
  console.log(`\n${RED}✗ Some tests failed${RESET}\n`);
  process.exit(1);
}
