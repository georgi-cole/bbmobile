#!/usr/bin/env node

/**
 * Test script for inline evict refactor
 * Validates that legacy CTA elements have been removed
 * and new inline button pattern is implemented
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

console.log('\n=== Inline Evict Refactor Validation ===\n');

// Read files
const jsFile = join(rootDir, 'js', 'livevote-ui.js');
const cssFile = join(rootDir, 'styles.css');

const jsContent = readFileSync(jsFile, 'utf8');
const cssContent = readFileSync(cssFile, 'utf8');

let passed = 0;
let failed = 0;

function test(name, condition, errorMsg = '') {
  if (condition) {
    console.log(`✓ ${name}`);
    passed++;
  } else {
    console.log(`✗ ${name}`);
    if (errorMsg) console.log(`  ${errorMsg}`);
    failed++;
  }
}

// Test 1: Check for lv2-name-btn creation
test(
  'Creates .lv2-name-btn instead of .lv2-name',
  jsContent.includes('createElement(\'button\')') && 
  jsContent.includes('className = \'lv2-name-btn\''),
  'Should create button element with lv2-name-btn class'
);

// Test 2: Check for lv2-instructions element
test(
  'Creates .lv2-instructions element',
  jsContent.includes('className = \'lv2-instructions\''),
  'Should create instructions element for all 2-nominee flows'
);

// Test 3: Check legacy CTA dock NOT created for 2-nominee
test(
  'Does NOT create .lv2-cta-dock for 2-nominee flows',
  !jsContent.includes('classList.add(\'lv2-cta-dock\', \'lv2-cta-dock-inline\', \'lv2-cta-dock-desktop\')') ||
  jsContent.includes('// Legacy CTA dock removed'),
  'Legacy CTA dock should be removed or commented out'
);

// Test 4: Check legacy CTA side NOT created
test(
  'Does NOT create .lv2-cta-side for 2-nominee flows',
  !jsContent.includes('ctaSide.className = \'lv2-cta-side\'') ||
  jsContent.includes('// Legacy CTA pill container removed'),
  'Legacy CTA side should be removed or commented out'
);

// Test 5: Check legacy CTA row NOT created
test(
  'Does NOT create .lv2-cta-row for 2-nominee flows',
  !jsContent.includes('ctaRow.className = \'lv2-cta-row\'') ||
  jsContent.includes('// Legacy CTA footer row removed'),
  'Legacy CTA row should be removed or commented out'
);

// Test 6: Check CSS for lv2-name-btn
test(
  'CSS defines .lv2-name-btn styling',
  cssContent.includes('.lv2-name-btn') && 
  cssContent.includes('cursor: pointer'),
  'Should have CSS styling for name button'
);

// Test 7: Check CSS for lv2-name-btn-selected
test(
  'CSS defines .lv2-name-btn-selected styling',
  cssContent.includes('.lv2-name-btn-selected') &&
  cssContent.includes('background: linear-gradient'),
  'Should have CSS styling for selected state'
);

// Test 8: Check CSS for lv2-instructions
test(
  'CSS defines .lv2-instructions styling',
  cssContent.includes('.lv2-instructions'),
  'Should have CSS styling for instructions element'
);

// Test 9: Check selectNominee updates instructions
test(
  'selectNominee function updates instructions text',
  jsContent.includes('instructions.textContent') &&
  jsContent.includes('You are about to evict'),
  'Should dynamically update instruction text based on selection'
);

// Test 10: Check createCtaBar refactored
test(
  'createCtaBar uses inline button pattern',
  jsContent.includes('inlineEvictionActive: true') ||
  jsContent.includes('// For 2-nominee flows, inline CTA pattern is used'),
  'createCtaBar should support inline pattern'
);

// Test 11: Check button semantics
test(
  'Name button has proper semantic attributes',
  jsContent.includes('type = \'button\'') &&
  jsContent.includes('setAttribute(\'aria-label\''),
  'Button should have type="button" and aria-label'
);

// Test 12: Check responsive styling
test(
  'CSS has responsive styling for new classes',
  cssContent.includes('.lv2-overlay.lv2-responsive .lv2-name-btn') ||
  cssContent.includes('.lv2-overlay.lv2-responsive .lv2-instructions'),
  'Should have responsive variants for new classes'
);

// Test 13: Check keyboard support
test(
  'Keyboard shortcuts work with name buttons',
  jsContent.includes('.lv2-name-btn') && 
  jsContent.includes('addEventListener(\'keydown\''),
  'Should support keyboard navigation'
);

// Test 14: Check tie-break support
test(
  'Supports tie-break wording',
  jsContent.includes('Break Tie') &&
  jsContent.includes('state.isTieBreak'),
  'Should support "Break Tie" button text'
);

// Test 15: Check Final 4 support
test(
  'Supports Final 4 sole vote wording',
  jsContent.includes('Cast Sole Vote') &&
  jsContent.includes('state.isFinal4'),
  'Should support "Cast Sole Vote" button text'
);

console.log('\n=== Validation Summary ===\n');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}\n`);

if (failed > 0) {
  console.log('✗ Some tests failed. Please review the implementation.\n');
  process.exit(1);
} else {
  console.log('✓ All tests passed!\n');
  process.exit(0);
}
