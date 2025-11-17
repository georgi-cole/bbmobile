#!/usr/bin/env node
/**
 * Verification Script: Intro Hub Audio & SFX Enhancements
 * 
 * This script validates the implementation of:
 * 1. IntroHubSfx module using mouse-click-290204.mp3
 * 2. IntroScreen ensureLobbyMusic() function
 * 3. Audio.js intro_hub fallback and lastRequestedPhaseOrFile tracking
 * 4. Toggle button CSS class changes
 * 5. CSS styling for is-off state
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

let passed = 0;
let failed = 0;
let warnings = 0;

function log(message, type = 'info') {
  const prefix = type === 'pass' ? `${GREEN}✓${RESET}` :
                 type === 'fail' ? `${RED}✗${RESET}` :
                 type === 'warn' ? `${YELLOW}⚠${RESET}` : ' ';
  console.log(`${prefix} ${message}`);
}

function test(description, callback) {
  try {
    const result = callback();
    if (result) {
      log(description, 'pass');
      passed++;
    } else {
      log(`${description} - Failed`, 'fail');
      failed++;
    }
  } catch (e) {
    log(`${description} - Error: ${e.message}`, 'fail');
    failed++;
  }
}

function warn(message) {
  log(message, 'warn');
  warnings++;
}

console.log('\n=== Intro Hub Audio & SFX Verification ===\n');

// Test 1: Check IntroHubSfx.js changes
console.log('1. Verifying IntroHubSfx.js...');
const introHubSfxPath = join(__dirname, 'js/ui/introHubSfx.js');
const introHubSfx = readFileSync(introHubSfxPath, 'utf8');

test('Uses mouse-click-290204.mp3 for click sound', () => {
  return introHubSfx.includes("CLICK_SRC = 'audio/mouse-click-290204.mp3'");
});

test('Reuses click sound for hover', () => {
  return introHubSfx.includes('HOVER_SRC = CLICK_SRC');
});

test('Hover volume set to 0.35', () => {
  return introHubSfx.includes('hoverEl.volume = 0.35');
});

test('Click volume set to 0.85', () => {
  return introHubSfx.includes('clickEl.volume = 0.85');
});

test('Has beep() function for fallback', () => {
  return introHubSfx.includes('function beep(') && introHubSfx.includes('createOscillator');
});

test('Has getCtx() for WebAudio context', () => {
  return introHubSfx.includes('function getCtx()');
});

test('Uses tryPlay() with fallback logic', () => {
  return introHubSfx.includes('function tryPlay(el, label)');
});

test('Calls beep fallback on error', () => {
  return introHubSfx.includes('beep(1200') && introHubSfx.includes('beep(600');
});

// Test 2: Check IntroScreen.js changes
console.log('\n2. Verifying IntroScreen.js...');
const introScreenPath = join(__dirname, 'src/ui/IntroScreen.js');
const introScreen = readFileSync(introScreenPath, 'utf8');

test('Has ensureLobbyMusic() function', () => {
  return introScreen.includes('function ensureLobbyMusic()');
});

test('Checks musicOn and muted in ensureLobbyMusic', () => {
  return introScreen.includes("musicOn !== false") && 
         introScreen.includes("g.getMuted()");
});

test('Calls playMusicForPhase with intro_hub', () => {
  return introScreen.includes("playMusicForPhase('intro_hub')");
});

test('Has gesture unlock retry logic', () => {
  return introScreen.includes('const unlockOnce') && 
         introScreen.includes("addEventListener('pointerdown'") &&
         introScreen.includes("addEventListener('touchend'");
});

test('Calls ensureLobbyMusic in afterIntroScreenVisible', () => {
  return introScreen.includes('ensureLobbyMusic()');
});

test('Toggle adds/removes is-off class', () => {
  return introScreen.includes("classList.toggle('is-off', !enabled)");
});

test('Dispatches introHubSfx CustomEvent on sound toggle', () => {
  return introScreen.includes("CustomEvent('introHubSfx'") &&
         introScreen.includes("detail: { enabled }");
});

// Test 3: Check audio.js changes
console.log('\n3. Verifying audio.js...');
const audioPath = join(__dirname, 'js/audio.js');
const audio = readFileSync(audioPath, 'utf8');

test('Tracks lastRequestedPhaseOrFile', () => {
  return audio.includes('let lastRequestedPhaseOrFile = null');
});

test('Sets lastRequestedPhaseOrFile in playMusicForPhase', () => {
  return audio.includes('lastRequestedPhaseOrFile = nameOrFilename');
});

test('Has intro_hub fallback in resolveToFile', () => {
  return audio.includes("s === 'intro_hub'") &&
         audio.includes("'Intro Hub music.mp3'");
});

test('Checks musicEnabled before playing', () => {
  return audio.includes('if (!musicEnabled)') &&
         audio.includes("ignoring', nameOrFilename");
});

test('Resumes last track in setMusicEnabled', () => {
  return audio.includes('else if (lastRequestedPhaseOrFile)') &&
         audio.includes('playMusicForPhase(lastRequestedPhaseOrFile)');
});

test('Falls back to intro_hub if no last track', () => {
  return audio.includes("playMusicForPhase('intro_hub')");
});

test('Logs resolve steps for debugging', () => {
  return audio.includes("[audio] resolveToFile phase:") &&
         audio.includes("[audio] resolveToFile event:");
});

test('setSfxEnabled dispatches introHubSfx event', () => {
  return audio.includes("CustomEvent('introHubSfx'");
});

// Test 4: Check CSS changes
console.log('\n4. Verifying intro.css...');
const introCssPath = join(__dirname, 'css/intro.css');
const introCss = readFileSync(introCssPath, 'utf8');

test('Has is-off style definition', () => {
  return introCss.includes('.intro-screen__icon-btn.is-off');
});

test('is-off reduces opacity', () => {
  return introCss.includes('opacity: 0.45') || introCss.includes('opacity:0.45');
});

test('is-off applies grayscale filter', () => {
  return introCss.includes('grayscale(0.4)') || introCss.includes('grayscale(.4)');
});

// Test 5: Check audio file exists
console.log('\n5. Verifying audio assets...');
try {
  const audioFilePath = join(__dirname, 'audio/mouse-click-290204.mp3');
  const stats = readFileSync(audioFilePath);
  if (stats.length > 0) {
    log('audio/mouse-click-290204.mp3 exists and has content', 'pass');
    passed++;
  } else {
    log('audio/mouse-click-290204.mp3 exists but is empty', 'fail');
    failed++;
  }
} catch (e) {
  log('audio/mouse-click-290204.mp3 does not exist', 'fail');
  failed++;
}

try {
  const audioFilePath = join(__dirname, 'audio/Intro Hub music.mp3');
  const stats = readFileSync(audioFilePath);
  if (stats.length > 0) {
    log('audio/Intro Hub music.mp3 exists and has content', 'pass');
    passed++;
  } else {
    log('audio/Intro Hub music.mp3 exists but is empty', 'fail');
    failed++;
  }
} catch (e) {
  log('audio/Intro Hub music.mp3 does not exist', 'fail');
  failed++;
}

// Test 6: Check index.html script order
console.log('\n6. Verifying index.html script loading order...');
const indexPath = join(__dirname, 'index.html');
const indexHtml = readFileSync(indexPath, 'utf8');

test('audio.js loads before audio-bridge.js', () => {
  const audioPos = indexHtml.indexOf('src="js/audio.js');
  const bridgePos = indexHtml.indexOf('src="js/audio-bridge.js');
  return audioPos !== -1 && bridgePos !== -1 && audioPos < bridgePos;
});

test('audio-bridge.js is loaded', () => {
  return indexHtml.includes('src="js/audio-bridge.js"');
});

test('introHubSfx.js is referenced in test file', () => {
  const testPath = join(__dirname, 'test_intro_hub_music_sfx.html');
  const testHtml = readFileSync(testPath, 'utf8');
  return testHtml.includes('src="js/ui/introHubSfx.js"');
});

// Summary
console.log('\n=== Summary ===');
console.log(`${GREEN}Passed:${RESET} ${passed}`);
console.log(`${RED}Failed:${RESET} ${failed}`);
if (warnings > 0) {
  console.log(`${YELLOW}Warnings:${RESET} ${warnings}`);
}

if (failed === 0) {
  console.log(`\n${GREEN}✓ All verification tests passed!${RESET}\n`);
  process.exit(0);
} else {
  console.log(`\n${RED}✗ Some verification tests failed${RESET}\n`);
  process.exit(1);
}
