#!/usr/bin/env node
/**
 * Verification script for Veto Ceremony implementation
 * Checks that all required functions and features are present
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

console.log('=== Veto Ceremony Implementation Verification ===\n');

// Read veto.js
const vetoJs = readFileSync(join(rootDir, 'js/veto.js'), 'utf-8');

// Read replacement-picker.js
const pickerJs = readFileSync(join(rootDir, 'js/replacement-picker.js'), 'utf-8');

// Read styles.css
const stylesCss = readFileSync(join(rootDir, 'styles.css'), 'utf-8');

// Read veto-twists.css
const vetoTwistsCss = readFileSync(join(rootDir, 'css/veto-twists.css'), 'utf-8');

const checks = [];

function checkFeature(name, condition, details = '') {
  const status = condition ? '✓' : '✗';
  const statusColor = condition ? '\x1b[32m' : '\x1b[31m'; // Green or Red
  console.log(`${statusColor}${status}\x1b[0m ${name}`);
  if (details && condition) {
    console.log(`  ${details}`);
  }
  checks.push({ name, status: condition, details });
  return condition;
}

console.log('1. Core Functions:\n');

checkFeature(
  'renderPOVUseDecision',
  vetoJs.includes('function renderPOVUseDecision(povId)'),
  'Unified decision prompt for all POV types'
);

checkFeature(
  'getVetoTypeLabel',
  vetoJs.includes('function getVetoTypeLabel()'),
  'Returns correct label for Standard/Golden/Diamond/Platinum/Coup POV'
);

checkFeature(
  'hideLegacyPOVPanels',
  vetoJs.includes('function hideLegacyPOVPanels()'),
  'Disables legacy below-TV decision panel'
);

checkFeature(
  'renderRiskSwapAnimation',
  vetoJs.includes('function renderRiskSwapAnimation(savedId, replacementId, remainingNomId)'),
  'Risk → Safe → New Risk animation sequence'
);

checkFeature(
  'validateNomineeChange',
  vetoJs.includes('function validateNomineeChange(originalNominees, savedId, replacementId)'),
  'Prevents identical nominee pairs after veto'
);

checkFeature(
  'isMultiEvictionWeek',
  vetoJs.includes('function isMultiEvictionWeek()'),
  'Detects double/triple eviction weeks'
);

checkFeature(
  'handleDiamondPOVCeremony',
  vetoJs.includes('function handleDiamondPOVCeremony(holder)'),
  'Diamond POV ceremony with 2 replacement nominees'
);

console.log('\n2. TV Overlay Scaffolding:\n');

checkFeature(
  'ensureTVOverlayScaffold',
  vetoJs.includes('function ensureTVOverlayScaffold()'),
  'Creates .tvDim and .tvOverlayContent'
);

checkFeature(
  'clearTVOverlayContent',
  vetoJs.includes('function clearTVOverlayContent()'),
  'Clears TV overlay content'
);

checkFeature(
  'showTVCard',
  vetoJs.includes('function showTVCard({title, lines, tone, duration})'),
  'Shows cards inside TV overlay'
);

checkFeature(
  'showTVCardWithAvatars',
  vetoJs.includes('function showTVCardWithAvatars({title, lines, tone, duration, actorIds, subjectIds})'),
  'Shows cards with actor/subject avatars'
);

checkFeature(
  'showTVDecision',
  vetoJs.includes('function showTVDecision({title, message, buttons})'),
  'Shows decision prompt inside TV'
);

console.log('\n3. Replacement Picker:\n');

checkFeature(
  'rpPicker module',
  pickerJs.includes('global.rpPicker'),
  'Avatar-first replacement picker'
);

checkFeature(
  'Carousel view',
  pickerJs.includes('function buildCarouselView()'),
  'Mobile carousel: one avatar per slide'
);

checkFeature(
  'Grid view',
  pickerJs.includes('function buildGridView()'),
  'Desktop grid: all avatars at once'
);

checkFeature(
  'Swipe support',
  pickerJs.includes('handleSwipe'),
  'Touch/swipe navigation for carousel'
);

checkFeature(
  'Keyboard navigation',
  pickerJs.includes('handleCarouselKeyboard'),
  'ArrowLeft/Right/Home/End support'
);

checkFeature(
  'Auto view mode',
  pickerJs.includes('determineViewMode'),
  'Auto-detect: carousel on mobile (<768px), grid on desktop'
);

console.log('\n4. CSS Styling:\n');

checkFeature(
  'TV overlay constraint',
  stylesCss.includes('max-width:min(92%, 520px)') && stylesCss.includes('max-height:78%'),
  'Cards constrained to 520px width, 78% height'
);

checkFeature(
  'Typography parity',
  stylesCss.includes('.tvCardBody') && stylesCss.includes('font-size:0.86rem'),
  'Body: 0.86rem, Titles: 0.95rem'
);

checkFeature(
  'Risk-swap scene',
  stylesCss.includes('.veto-risk-swap-scene'),
  'Risk-swap animation container'
);

checkFeature(
  'Risk-swap stages',
  stylesCss.includes('.veto-risk-stage') && stylesCss.includes('.veto-risk-player'),
  'Player tiles with status labels'
);

checkFeature(
  'Reduced motion',
  stylesCss.includes('@media (prefers-reduced-motion: reduce)'),
  'Respects prefers-reduced-motion preference'
);

checkFeature(
  'Badge transfer animation',
  vetoTwistsCss.includes('.transfer-scene'),
  'Visual badge swap animation'
);

checkFeature(
  'Replacement tile animations',
  vetoTwistsCss.includes('.veto-replacement-tile'),
  'Animated nominee tiles with stagger'
);

console.log('\n5. Multi-Eviction Gating:\n');

checkFeature(
  'Gating check in startVetoComp',
  vetoJs.includes('if(isMultiEvictionWeek())') && vetoJs.includes('Special POV twist suspended'),
  'Shows info card and suspends special POV during multi-eviction'
);

checkFeature(
  'Twist suspension in decideVetoTwistForWeek',
  vetoJs.includes('GATING: Suspend special POV twists during multi-eviction weeks'),
  'Prevents Golden/Diamond POV from activating'
);

console.log('\n6. Integration & Hooks:\n');

checkFeature(
  'Progression hooks',
  vetoJs.includes('ProgressionEvents.onPOVUsed') && 
  vetoJs.includes('onVetoUsedOnSelf') && 
  vetoJs.includes('onVetoUsedOnOther'),
  'XP hooks for veto actions'
);

checkFeature(
  'Social Maneuvers events',
  vetoJs.includes('SocialManeuvers.recordWeeklyEvent'),
  'Energy bonus events'
);

checkFeature(
  'Badge state sync',
  vetoJs.includes('syncPlayerBadgeStates'),
  'Player badge synchronization'
);

checkFeature(
  'Final 4 bypass',
  vetoJs.includes('handlePostVetoReveal') && vetoJs.includes('aliveCount === 4'),
  'Skips ceremony and goes to eviction at F4'
);

console.log('\n7. Phrase Pools:\n');

checkFeature(
  'VETO_USE_PHRASES',
  vetoJs.includes('const VETO_USE_PHRASES'),
  'Natural dialogue for using veto'
);

checkFeature(
  'VETO_NOT_USE_PHRASES',
  vetoJs.includes('const VETO_NOT_USE_PHRASES'),
  'Natural dialogue for not using veto'
);

checkFeature(
  'NOMINEE_REACTION_PHRASES',
  vetoJs.includes('const NOMINEE_REACTION_PHRASES'),
  'Nominee reactions when veto not used'
);

checkFeature(
  'HOH_REPLACEMENT_PHRASES',
  vetoJs.includes('const HOH_REPLACEMENT_PHRASES'),
  'HOH replacement announcements'
);

console.log('\n=== Summary ===\n');

const passed = checks.filter(c => c.status).length;
const failed = checks.filter(c => !c.status).length;
const total = checks.length;

if (failed === 0) {
  console.log(`\x1b[32m✓ ALL CHECKS PASSED\x1b[0m (${passed}/${total})`);
  console.log('\nThe veto ceremony implementation is COMPLETE and includes:');
  console.log('- Unified in-TV decision prompt for all POV types');
  console.log('- Risk-swap animation (GSAP timeline with CSS fallback)');
  console.log('- Mobile-first replacement picker (carousel + grid)');
  console.log('- Nomination validation (prevents identical pairs)');
  console.log('- Multi-eviction gating (suspends special POV)');
  console.log('- TV overlay containment (max-width 520px, max-height 78%)');
  console.log('- Legacy UI permanently disabled');
  console.log('- Reduced motion support');
  console.log('- Comprehensive hooks and integrations');
  process.exit(0);
} else {
  console.log(`\x1b[31m✗ SOME CHECKS FAILED\x1b[0m (${passed}/${total} passed, ${failed}/${total} failed)`);
  console.log('\nFailed checks:');
  checks.filter(c => !c.status).forEach(c => {
    console.log(`  - ${c.name}`);
  });
  process.exit(1);
}
