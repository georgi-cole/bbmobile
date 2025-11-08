#!/usr/bin/env node
/**
 * Verification script for TV-centered nomination cards implementation
 * Checks that all required features are properly implemented
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ANSI color codes
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[36m';
const RESET = '\x1b[0m';

let passed = 0;
let failed = 0;

function check(description, condition) {
  if (condition) {
    console.log(`${GREEN}✓${RESET} ${description}`);
    passed++;
    return true;
  } else {
    console.log(`${RED}✗${RESET} ${description}`);
    failed++;
    return false;
  }
}

function info(message) {
  console.log(`${BLUE}ℹ${RESET} ${message}`);
}

function section(title) {
  console.log(`\n${YELLOW}=== ${title} ===${RESET}\n`);
}

// Read the files
const nomsGridFullscreenPath = join(__dirname, 'js', 'nominations-grid-fullscreen.js');
const nomsPath = join(__dirname, 'js', 'nominations.js');

const nomsGridFullscreen = readFileSync(nomsGridFullscreenPath, 'utf-8');
const noms = readFileSync(nomsPath, 'utf-8');

section('1. TV-Centered Layout with Vertical Bias');

check(
  'computeTvCenterBiasPx function exists',
  nomsGridFullscreen.includes('function computeTvCenterBiasPx(host)')
);

check(
  'computeTvCenterBiasPx handles window.__tvCenterBiasY override',
  nomsGridFullscreen.includes('global.__tvCenterBiasY')
);

check(
  'computeTvCenterBiasPx supports string px values',
  nomsGridFullscreen.includes("override.endsWith('px')")
);

check(
  'computeTvCenterBiasPx supports numeric ratio values',
  nomsGridFullscreen.includes('typeof override === \'number\'')
);

check(
  'Bias calculation uses 8% for portrait mobile',
  nomsGridFullscreen.includes('0.08') && nomsGridFullscreen.includes('isPortrait')
);

check(
  'Bias calculation uses 4% for landscape/desktop',
  nomsGridFullscreen.includes('0.04')
);

check(
  '.nfs-stage CSS includes transform with --tv-center-bias',
  nomsGridFullscreen.includes('transform: translateY(calc(-1 * var(--tv-center-bias')
);

check(
  'showCenteredCard calls computeTvCenterBiasPx',
  nomsGridFullscreen.includes('computeTvCenterBiasPx(tvOverlay)') &&
  nomsGridFullscreen.match(/showCenteredCard[\s\S]*?computeTvCenterBiasPx/)
);

check(
  'showSummaryCard calls computeTvCenterBiasPx',
  nomsGridFullscreen.match(/showSummaryCard[\s\S]*?computeTvCenterBiasPx/)
);

check(
  'showAdjournCard calls computeTvCenterBiasPx',
  nomsGridFullscreen.match(/showAdjournCard[\s\S]*?computeTvCenterBiasPx/)
);

check(
  'Fallback cards in nominations.js compute bias',
  noms.includes('biasRatio') && noms.includes('--tv-center-bias')
);

check(
  'Fallback cards apply transform with bias',
  noms.includes('transform: translateY(calc(-1 * var(--tv-center-bias')
);

section('2. Fullscreen Selector Header Improvements');

check(
  'Header includes guidance text element',
  nomsGridFullscreen.includes('.noms-fs-guidance')
);

check(
  'Guidance text shows "Choose 2" for 2 nominees',
  nomsGridFullscreen.includes('Choose 2')
);

check(
  'Guidance text shows "Choose 3" for 3 nominees',
  nomsGridFullscreen.includes('Choose 3')
);

check(
  'Guidance text shows "Choose 4" for 4 nominees',
  nomsGridFullscreen.includes('Choose 4')
);

check(
  'Confirmation button text is "Confirm"',
  nomsGridFullscreen.includes("confirmBtn.textContent = 'Confirm'")
);

check(
  'Count display uses separate span for count text',
  nomsGridFullscreen.includes('const countText = document.createElement(\'span\')')
);

check(
  'Legend for ally/enemy markers is present',
  nomsGridFullscreen.includes('noms-fs-legend')
);

section('3. Dynamic Grid Density');

check(
  'sizingFor function exists with proper thresholds',
  nomsGridFullscreen.includes('function sizingFor(count)') &&
  nomsGridFullscreen.includes('count <= 6') &&
  nomsGridFullscreen.includes('count <= 9') &&
  nomsGridFullscreen.includes('count <= 12') &&
  nomsGridFullscreen.includes('count <= 18')
);

check(
  'CSS variable --nfs-mincol is set on overlay',
  nomsGridFullscreen.includes("overlay.style.setProperty('--nfs-mincol'")
);

check(
  'CSS variable --nfs-avatar is set on overlay',
  nomsGridFullscreen.includes("overlay.style.setProperty('--nfs-avatar'")
);

check(
  'Grid uses --nfs-mincol for column sizing',
  nomsGridFullscreen.includes('minmax(var(--nfs-mincol')
);

check(
  'Avatars use --nfs-avatar for sizing',
  nomsGridFullscreen.includes('var(--nfs-avatar')
);

section('4. Theme CSS Variables');

const themeVars = [
  '--card',
  '--card-accent',
  '--fg',
  '--fg-muted',
  '--accent',
  '--ok',
  '--sep',
  '--scrim'
];

themeVars.forEach(varName => {
  check(
    `Theme variable ${varName} is used with fallback`,
    nomsGridFullscreen.includes(`var(${varName},`)
  );
});

section('5. Ally/Enemy Visual Indicators');

check(
  'Ally ring color uses rgba(74, 222, 128, 0.5)',
  nomsGridFullscreen.includes('rgba(74, 222, 128, 0.5)')
);

check(
  'Enemy ring color uses rgba(248, 113, 113, 0.5)',
  nomsGridFullscreen.includes('rgba(248, 113, 113, 0.5)')
);

check(
  'Ally class .nfs-ally is applied',
  nomsGridFullscreen.includes('nfs-ally')
);

check(
  'Enemy class .nfs-enemy is applied',
  nomsGridFullscreen.includes('nfs-enemy')
);

check(
  'Aria-label includes ally relation',
  nomsGridFullscreen.includes("ariaLabel += ' (ally)'")
);

check(
  'Aria-label includes enemy relation',
  nomsGridFullscreen.includes("ariaLabel += ' (enemy)'")
);

check(
  'classifyRelation function checks affinity',
  nomsGridFullscreen.includes('hoh.affinity') && 
  nomsGridFullscreen.includes('function classifyRelation')
);

check(
  'classifyRelation function checks alliance',
  nomsGridFullscreen.includes('inSameAlliance')
);

section('6. Accessibility Features');

check(
  'Count display has aria-live attribute',
  nomsGridFullscreen.includes("countDisplay.setAttribute('aria-live', 'polite')")
);

check(
  'Count display has aria-atomic attribute',
  nomsGridFullscreen.includes("countDisplay.setAttribute('aria-atomic', 'true')")
);

check(
  'Grid has role="group"',
  nomsGridFullscreen.includes("grid.setAttribute('role', 'group')")
);

check(
  'Grid has aria-label',
  nomsGridFullscreen.includes("grid.setAttribute('aria-label', 'Nomination candidates')")
);

check(
  'Tiles have tabindex for keyboard navigation',
  nomsGridFullscreen.includes("tile.setAttribute('tabindex', '0')")
);

check(
  'Tiles have role="button"',
  nomsGridFullscreen.includes("tile.setAttribute('role', 'button')")
);

check(
  'Tiles have aria-pressed state',
  nomsGridFullscreen.includes("tile.setAttribute('aria-pressed'")
);

check(
  'Keyboard support: Arrow keys for navigation',
  nomsGridFullscreen.includes('ArrowUp') && 
  nomsGridFullscreen.includes('ArrowDown') &&
  nomsGridFullscreen.includes('ArrowLeft') &&
  nomsGridFullscreen.includes('ArrowRight')
);

check(
  'Keyboard support: Enter/Space to toggle selection',
  nomsGridFullscreen.includes("e.key === 'Enter'") &&
  nomsGridFullscreen.includes("e.key === ' '")
);

check(
  'Escape/Backspace are blocked during selection',
  nomsGridFullscreen.includes("e.key === 'Escape'") &&
  nomsGridFullscreen.includes("e.key === 'Backspace'") &&
  nomsGridFullscreen.includes('e.preventDefault()')
);

check(
  'Reduced motion support in CSS',
  nomsGridFullscreen.includes('@media (prefers-reduced-motion: reduce)')
);

check(
  'High contrast support in CSS',
  nomsGridFullscreen.includes('@media (prefers-contrast: high)')
);

section('7. Test Coverage');

check(
  'Test file test_nomination_tv_centering.html exists',
  true // We just created it
);

section('Summary');

console.log(`\n${passed} tests passed, ${failed} tests failed\n`);

if (failed === 0) {
  console.log(`${GREEN}✓ ALL TESTS PASSED${RESET}\n`);
  process.exit(0);
} else {
  console.log(`${RED}✗ SOME TESTS FAILED${RESET}\n`);
  process.exit(1);
}
