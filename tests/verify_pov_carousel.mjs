#!/usr/bin/env node

/**
 * POV Carousel Picker Verification Script
 * Verifies that the carousel picker is implemented correctly for Golden and Diamond POV flows
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

console.log('\n=== POV Carousel Picker Verification ===\n');

// Read carousel-picker.js
const carouselPickerPath = join(__dirname, '..', 'js', 'ui', 'carousel-picker.js');
let carouselPickerContent;
try {
  carouselPickerContent = readFileSync(carouselPickerPath, 'utf8');
} catch (e) {
  fail('Could not read js/ui/carousel-picker.js');
  process.exit(1);
}

// Read veto.js
const vetoPath = join(__dirname, '..', 'js', 'veto.js');
let vetoContent;
try {
  vetoContent = readFileSync(vetoPath, 'utf8');
} catch (e) {
  fail('Could not read js/veto.js');
  process.exit(1);
}

// Test 1: Check for openCarouselPicker function
if (carouselPickerContent.includes('function openCarouselPicker(')) {
  pass('openCarouselPicker function exists');
} else {
  fail('openCarouselPicker function not found');
}

// Test 2: Check that openCarouselPicker is exported
if (carouselPickerContent.includes('global.openCarouselPicker')) {
  pass('openCarouselPicker is exported to global');
} else {
  fail('openCarouselPicker is not exported');
}

// Test 3: Check for Promise-based API
if (carouselPickerContent.includes('return new Promise')) {
  pass('openCarouselPicker returns a Promise');
} else {
  fail('openCarouselPicker does not return a Promise');
}

// Test 4: Check for carousel rendering functions (refactored to prevent flicker)
if (carouselPickerContent.includes('function buildOverlayOnce(') && carouselPickerContent.includes('function updateUI(')) {
  pass('Carousel rendering function exists');
} else {
  fail('Carousel rendering function not found');
}

// Test 5: Check for left/right arrow buttons
if (carouselPickerContent.includes('carousel-picker-arrow-left') && carouselPickerContent.includes('carousel-picker-arrow-right')) {
  pass('Left/Right arrow buttons are present');
} else {
  fail('Arrow buttons not found');
}

// Test 6: Check for keyboard navigation
if (carouselPickerContent.includes('ArrowLeft') && carouselPickerContent.includes('ArrowRight')) {
  pass('Keyboard arrow navigation is implemented');
} else {
  fail('Keyboard arrow navigation not found');
}

// Test 7: Check for Enter key support
if (carouselPickerContent.includes('Enter')) {
  pass('Enter key support is present');
} else {
  fail('Enter key support not found');
}

// Test 8: Check for Escape key support
if (carouselPickerContent.includes('Escape') || carouselPickerContent.includes('Esc')) {
  pass('Escape key support is present');
} else {
  fail('Escape key support not found');
}

// Test 9: Check for blockIds parameter
if (carouselPickerContent.includes('blockIds')) {
  pass('blockIds parameter is supported');
} else {
  fail('blockIds parameter not found');
}

// Test 10: Check for confirm button
if (carouselPickerContent.includes('carousel-picker-confirm')) {
  pass('Confirm button is present');
} else {
  fail('Confirm button not found');
}

// Test 11: Check for cancel button
if (carouselPickerContent.includes('carousel-picker-cancel')) {
  pass('Cancel button is present');
} else {
  fail('Cancel button not found');
}

// Test 12: Check for counter display
if (carouselPickerContent.includes('carousel-picker-counter')) {
  pass('Counter display is present');
} else {
  fail('Counter display not found');
}

// Test 13: Check that Golden POV uses openCarouselPicker
if (vetoContent.includes('openCarouselPicker({')) {
  pass('Golden/Standard POV uses openCarouselPicker');
} else {
  fail('Golden/Standard POV does not use openCarouselPicker');
}

// Test 14: Check for immediate badge update after save
const badgeUpdateAfterSave = /savedP\.nominated = false[\s\S]{1,500}syncPlayerBadgeStates/;
if (badgeUpdateAfterSave.test(vetoContent)) {
  pass('Badge is updated immediately after save selection');
} else {
  fail('Badge update after save not found');
}

// Test 15: Check for immediate badge update after replacement
const badgeUpdateAfterReplace = /repP\.nominated = true[\s\S]{1,500}syncPlayerBadgeStates/;
if (badgeUpdateAfterReplace.test(vetoContent)) {
  pass('Badge is updated immediately after replacement selection');
} else {
  fail('Badge update after replacement not found');
}

// Test 16: Check that Diamond POV uses openCarouselPicker twice
const diamondCarouselCalls = vetoContent.match(/openCarouselPicker\(\{[\s\S]*?title:\s*['"]Select (first|second) replacement nominee['"]/g);
if (diamondCarouselCalls && diamondCarouselCalls.length >= 2) {
  pass('Diamond POV uses openCarouselPicker for multiple selections');
} else {
  fail('Diamond POV does not use openCarouselPicker correctly');
}

// Test 17: Check for "Select first replacement nominee" title
if (vetoContent.includes('Select first replacement nominee')) {
  pass('Diamond POV first nominee selection title is present');
} else {
  fail('Diamond POV first nominee title not found');
}

// Test 18: Check for "Select second replacement nominee" title
if (vetoContent.includes('Select second replacement nominee')) {
  pass('Diamond POV second nominee selection title is present');
} else {
  fail('Diamond POV second nominee title not found');
}

// Test 19: Check for cancel handling
if (vetoContent.includes('User cancelled')) {
  pass('Cancel handling is implemented');
} else {
  fail('Cancel handling not found');
}

// Test 20: Check for blocked IDs construction
if (vetoContent.includes('var blockedIds = [g.hohId]')) {
  pass('Blocked IDs list is constructed correctly');
} else {
  fail('Blocked IDs construction not found');
}

// Read carousel-picker CSS
const carouselPickerCssPath = join(__dirname, '..', 'css', 'carousel-picker.css');
let carouselPickerCss;
try {
  carouselPickerCss = readFileSync(carouselPickerCssPath, 'utf8');
} catch (e) {
  fail('Could not read css/carousel-picker.css');
  process.exit(1);
}

// Test 21: Check for overlay CSS
if (carouselPickerCss.includes('.carousel-picker-overlay')) {
  pass('CSS for .carousel-picker-overlay is present');
} else {
  fail('CSS for .carousel-picker-overlay not found');
}

// Test 22: Check for arrow CSS
if (carouselPickerCss.includes('.carousel-picker-arrow')) {
  pass('CSS for .carousel-picker-arrow is present');
} else {
  fail('CSS for .carousel-picker-arrow not found');
}

// Test 23: Check for avatar container CSS
if (carouselPickerCss.includes('.carousel-picker-avatar-container')) {
  pass('CSS for .carousel-picker-avatar-container is present');
} else {
  fail('CSS for .carousel-picker-avatar-container not found');
}

// Test 24: Check for avatar selectable CSS
if (carouselPickerCss.includes('.carousel-picker-avatar-selectable')) {
  pass('CSS for .carousel-picker-avatar-selectable is present');
} else {
  fail('CSS for .carousel-picker-avatar-selectable not found');
}

// Test 25: Check for blocked state CSS
if (carouselPickerCss.includes('.carousel-picker-avatar-blocked')) {
  pass('CSS for .carousel-picker-avatar-blocked is present');
} else {
  fail('CSS for .carousel-picker-avatar-blocked not found');
}

// Test 26: Check for confirm button CSS
if (carouselPickerCss.includes('.carousel-picker-confirm')) {
  pass('CSS for .carousel-picker-confirm is present');
} else {
  fail('CSS for .carousel-picker-confirm not found');
}

// Test 27: Check for cancel button CSS
if (carouselPickerCss.includes('.carousel-picker-cancel')) {
  pass('CSS for .carousel-picker-cancel is present');
} else {
  fail('CSS for .carousel-picker-cancel not found');
}

// Test 28: Check for responsive breakpoints
if (carouselPickerCss.includes('@media (max-width: 768px)')) {
  pass('CSS has mobile breakpoints');
} else {
  fail('CSS mobile breakpoints not found');
}

// Test 29: Check for title CSS
if (carouselPickerCss.includes('.carousel-picker-title')) {
  pass('CSS for .carousel-picker-title is present');
} else {
  fail('CSS for .carousel-picker-title not found');
}

// Test 30: Check for name label CSS
if (carouselPickerCss.includes('.carousel-picker-name')) {
  pass('CSS for .carousel-picker-name is present');
} else {
  fail('CSS for .carousel-picker-name not found');
}

// Test 31: Check for counter CSS
if (carouselPickerCss.includes('.carousel-picker-counter')) {
  pass('CSS for .carousel-picker-counter is present');
} else {
  fail('CSS for .carousel-picker-counter not found');
}

// Test 32: Check for animation
if (carouselPickerCss.includes('@keyframes') || carouselPickerCss.includes('animation:')) {
  pass('CSS has animation support');
} else {
  fail('CSS animation not found');
}

// Test 33: Check for accessibility focus styles
if (carouselPickerCss.includes(':focus')) {
  pass('CSS has accessibility focus styles');
} else {
  fail('CSS focus styles not found');
}

// Test 34: Check for disabled state
if (carouselPickerCss.includes(':disabled')) {
  pass('CSS has disabled state styles');
} else {
  fail('CSS disabled state not found');
}

// Test 35: Check that TV cards are still used for confirmation
if (vetoContent.includes('showTVCard({') && vetoContent.includes('is safe')) {
  pass('TV cards are used for confirmation between steps');
} else {
  fail('TV confirmation cards not found');
}

// Test 36: Check for onIndexChange callback support
if (carouselPickerContent.includes('onIndexChange')) {
  pass('onIndexChange callback is supported');
} else {
  fail('onIndexChange callback not found');
}

// Test 37: Check for aria labels
if (carouselPickerContent.includes('aria-label')) {
  pass('ARIA labels are present for accessibility');
} else {
  fail('ARIA labels not found');
}

// Test 38: Check for role attributes
if (carouselPickerContent.includes('setAttribute(\'role\'')) {
  pass('Role attributes are present for accessibility');
} else {
  fail('Role attributes not found');
}

// Test 39: Check that carousel handles empty/null cancellation
if (vetoContent.includes('if(savedId == null)') || vetoContent.includes('if(replacementId == null)')) {
  pass('Carousel handles null/cancelled selections');
} else {
  fail('Null selection handling not found');
}

// Test 40: Check for carousel animation class
if (carouselPickerContent.includes('carousel-picker-visible')) {
  pass('Carousel animation class is present');
} else {
  fail('Carousel animation class not found');
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
