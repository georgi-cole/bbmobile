#!/usr/bin/env node
// Verification script for theatrical intro sequence implementation

const fs = require('fs');
const path = require('path');

console.log('='.repeat(60));
console.log('Theatrical Intro Sequence - Implementation Verification');
console.log('='.repeat(60));
console.log();

const checks = [];

// Check 1: IntroShow.js exists and has required functions
function checkIntroShow() {
  const file = 'js/introShow.js';
  const content = fs.readFileSync(file, 'utf8');
  
  const required = [
    'resolveAvatarForPlayer',
    'getAvatarFallback',
    'buildContestantCard',
    'fadeOutMusic',
    'COMMENT_TEMPLATES',
    'intro-studio-bg'
  ];
  
  const results = required.map(item => ({
    item,
    found: content.includes(item)
  }));
  
  const allFound = results.every(r => r.found);
  
  return {
    name: 'IntroShow.js enhancements',
    passed: allFound,
    details: results.filter(r => !r.found).map(r => `Missing: ${r.item}`)
  };
}

// Check 2: Expanded reactions
function checkReactions() {
  const file = 'js/introShow.js';
  const content = fs.readFileSync(file, 'utf8');
  
  const spicyReactions = [
    'came to SLAY',
    'serving looks',
    'DRAMA',
    'chaos energy',
    'TV GOLD'
  ];
  
  const results = spicyReactions.map(reaction => ({
    reaction,
    found: content.includes(reaction)
  }));
  
  const allFound = results.every(r => r.found);
  
  return {
    name: 'Spicy/funny reactions added',
    passed: allFound,
    details: results.filter(r => !r.found).map(r => `Missing: ${r.reaction}`)
  };
}

// Check 3: CSS studio background
function checkCSS() {
  const file = 'styles-intro-show.css';
  const content = fs.readFileSync(file, 'utf8');
  
  const required = [
    '.intro-studio-bg',
    'studio_bg.jpg',
    'studioLEDPulse',
    'display: block'
  ];
  
  const results = required.map(item => ({
    item,
    found: content.includes(item)
  }));
  
  const allFound = results.every(r => r.found);
  
  return {
    name: 'CSS studio background styles',
    passed: allFound,
    details: results.filter(r => !r.found).map(r => `Missing: ${r.item}`)
  };
}

// Check 4: Audio.js premiere support
function checkAudio() {
  const file = 'js/audio.js';
  const content = fs.readFileSync(file, 'utf8');
  
  const required = [
    'premiere.mp4',
    'premiere:',
    '.mp4',
    'fadeOut',
    'fell back to intro.mp3'
  ];
  
  const results = required.map(item => ({
    item,
    found: content.includes(item)
  }));
  
  const allFound = results.every(r => r.found);
  
  return {
    name: 'Audio.js premiere.mp4 support',
    passed: allFound,
    details: results.filter(r => !r.found).map(r => `Missing: ${r.item}`)
  };
}

// Check 5: Documentation exists
function checkDocs() {
  const files = [
    'INTRO_SEQUENCE_ASSETS.md',
    'THEATRICAL_INTRO_IMPLEMENTATION.md'
  ];
  
  const results = files.map(file => ({
    file,
    exists: fs.existsSync(file)
  }));
  
  const allExist = results.every(r => r.exists);
  
  return {
    name: 'Documentation files',
    passed: allExist,
    details: results.filter(r => !r.exists).map(r => `Missing: ${r.file}`)
  };
}

// Check 6: ESLint config updated
function checkESLint() {
  const file = '.eslintrc.json';
  const content = fs.readFileSync(file, 'utf8');
  
  const hasGsap = content.includes('"gsap"');
  
  return {
    name: 'ESLint config has gsap global',
    passed: hasGsap,
    details: hasGsap ? [] : ['gsap not in globals']
  };
}

// Run all checks
checks.push(checkIntroShow());
checks.push(checkReactions());
checks.push(checkCSS());
checks.push(checkAudio());
checks.push(checkDocs());
checks.push(checkESLint());

// Display results
let allPassed = true;
checks.forEach((check, idx) => {
  const status = check.passed ? '✓' : '✗';
  const color = check.passed ? '\x1b[32m' : '\x1b[31m';
  console.log(`${color}${status}\x1b[0m ${idx + 1}. ${check.name}`);
  
  if (!check.passed) {
    allPassed = false;
    check.details.forEach(detail => {
      console.log(`   ${detail}`);
    });
  }
});

console.log();
console.log('='.repeat(60));

if (allPassed) {
  console.log('\x1b[32m✓ All checks passed!\x1b[0m');
  console.log();
  console.log('Implementation complete. Next steps:');
  console.log('1. Add audio/premiere.mp4 (optional, falls back to intro.mp3)');
  console.log('2. Add img/studio_bg.jpg (optional, uses LED gradient fallback)');
  console.log('3. Open test_intro_show.html in browser to test');
  console.log('4. Verify skip button fades out music smoothly');
  process.exit(0);
} else {
  console.log('\x1b[31m✗ Some checks failed\x1b[0m');
  console.log();
  console.log('Please review the implementation.');
  process.exit(1);
}
