#!/usr/bin/env node
/**
 * Smoke test for GameTimer implementation
 * Tests basic timer functionality without browser DOM
 * 
 * Usage: node scripts/test-game-timer.mjs
 */

import { performance } from 'perf_hooks';

console.log('🎮 GameTimer Smoke Test\n');

// Mock minimal window.game structure for Node.js testing
const mockGame = {};

// Load timer-config module
const timerConfigCode = `
(function(g){
  'use strict';
  const TIMER_CONFIG = {
    arcade: {
      default: 60000,
      min: 30000,
      max: 90000,
      showTimer: true,
      countDirection: 'down'
    },
    endurance: {
      default: null,
      hiddenMax: 180000,
      showTimer: false,
      countDirection: 'up'
    },
    logic: {
      default: 120000,
      min: 60000,
      max: 180000,
      showTimer: true,
      countDirection: 'down'
    },
    trivia: {
      perQuestion: 15000,
      showTimer: true,
      countDirection: 'down'
    }
  };

  function getTimerConfig(category){
    const config = TIMER_CONFIG[category];
    if(!config){
      console.warn(\`[TimerConfig] Unknown category "\${category}", using logic defaults\`);
      return TIMER_CONFIG.logic;
    }
    return { ...config };
  }

  function getDefaultDuration(category, fallback = 60000){
    const config = getTimerConfig(category);
    return config.default !== undefined ? config.default : fallback;
  }

  function shouldShowTimer(category){
    const config = getTimerConfig(category);
    return config.showTimer !== false;
  }

  function getCountDirection(category){
    const config = getTimerConfig(category);
    return config.countDirection || 'down';
  }

  g.TimerConfig = {
    TIMER_CONFIG,
    getTimerConfig,
    getDefaultDuration,
    shouldShowTimer,
    getCountDirection
  };
})(mockGame);
`;
eval(timerConfigCode);

// Load GameTimer class (simplified for Node.js, without DOM)
class GameTimer {
  constructor(category, options = {}){
    this.category = category;
    this.options = options;
    
    const categoryConfig = mockGame.TimerConfig ? mockGame.TimerConfig.getTimerConfig(category) : {};
    
    this.duration = options.duration !== undefined ? options.duration : categoryConfig.default;
    this.countDirection = options.countDirection || categoryConfig.countDirection || 'down';
    this.showTimer = options.showTimer !== undefined ? options.showTimer : (categoryConfig.showTimer !== false);
    
    this.startTimeMs = null;
    this.pausedTimeMs = null;
    this.elapsedMs = 0;
    this.isRunning = false;
    this.isPaused = false;
    this.rafId = null;
    
    this.tickCallbacks = [];
    this.completeCallbacks = [];
    
    if(options.autoStart){
      this.start();
    }
  }

  start(){
    if(this.isRunning){
      return;
    }
    this.startTimeMs = performance.now();
    this.isRunning = true;
    this.isPaused = false;
    this._tick();
  }

  pause(){
    if(!this.isRunning || this.isPaused){
      return;
    }
    this.isPaused = true;
    this.pausedTimeMs = performance.now();
    if(this.rafId){
      clearTimeout(this.rafId);
      this.rafId = null;
    }
  }

  resume(){
    if(!this.isRunning || !this.isPaused){
      return;
    }
    const pauseDuration = performance.now() - this.pausedTimeMs;
    this.startTimeMs += pauseDuration;
    this.pausedTimeMs = null;
    this.isPaused = false;
    this._tick();
  }

  stop(triggerComplete = false){
    if(!this.isRunning){
      return;
    }
    this.isRunning = false;
    this.isPaused = false;
    if(this.rafId){
      clearTimeout(this.rafId);
      this.rafId = null;
    }
    if(triggerComplete){
      this._triggerComplete();
    }
  }

  getRemaining(){
    if(this.duration === null){
      return 0;
    }
    const remaining = this.duration - this.elapsedMs;
    return Math.max(0, remaining);
  }

  getElapsed(){
    return this.elapsedMs;
  }

  onTick(callback){
    if(typeof callback === 'function'){
      this.tickCallbacks.push(callback);
    }
  }

  onComplete(callback){
    if(typeof callback === 'function'){
      this.completeCallbacks.push(callback);
    }
  }

  formatTime(ms, showDecimal = true){
    const totalSeconds = Math.max(0, ms) / 1000;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    if(showDecimal){
      const sec = Math.floor(seconds);
      const dec = Math.floor((seconds - sec) * 10);
      return `${minutes}:${sec.toString().padStart(2, '0')}.${dec}`;
    } else {
      return `${minutes}:${Math.floor(seconds).toString().padStart(2, '0')}`;
    }
  }

  _tick(){
    if(!this.isRunning || this.isPaused){
      return;
    }
    
    this.elapsedMs = performance.now() - this.startTimeMs;
    const remainingMs = this.getRemaining();
    
    this.tickCallbacks.forEach(cb => {
      try {
        cb(this.elapsedMs, remainingMs);
      } catch(err){
        console.error('[GameTimer] Tick callback error:', err);
      }
    });
    
    if(this.duration !== null && this.elapsedMs >= this.duration){
      this.stop(true);
      return;
    }
    
    // Use setTimeout instead of requestAnimationFrame for Node.js
    this.rafId = setTimeout(() => this._tick(), 16);
  }

  _triggerComplete(){
    this.completeCallbacks.forEach(cb => {
      try {
        cb();
      } catch(err){
        console.error('[GameTimer] Complete callback error:', err);
      }
    });
  }

  destroy(){
    this.stop();
    this.tickCallbacks = [];
    this.completeCallbacks = [];
  }
}

// Test utilities
let testsPassed = 0;
let testsFailed = 0;

function test(name, fn){
  return new Promise((resolve) => {
    console.log(`\n🧪 Test: ${name}`);
    try {
      fn(resolve);
    } catch(err){
      console.error(`❌ FAILED: ${err.message}`);
      testsFailed++;
      resolve();
    }
  });
}

function assert(condition, message){
  if(!condition){
    throw new Error(message || 'Assertion failed');
  }
  console.log(`  ✓ ${message}`);
  testsPassed++;
}

function sleep(ms){
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run tests
(async function runTests(){
  console.log('Testing TimerConfig...\n');
  
  // Test 1: TimerConfig exports
  await test('TimerConfig exports exist', (done) => {
    assert(mockGame.TimerConfig, 'TimerConfig should be exported');
    assert(typeof mockGame.TimerConfig.getTimerConfig === 'function', 'getTimerConfig should be a function');
    assert(typeof mockGame.TimerConfig.getDefaultDuration === 'function', 'getDefaultDuration should be a function');
    done();
  });
  
  // Test 2: Category configurations
  await test('Category configurations', (done) => {
    const arcadeConfig = mockGame.TimerConfig.getTimerConfig('arcade');
    assert(arcadeConfig.default === 60000, 'Arcade default should be 60000ms');
    assert(arcadeConfig.countDirection === 'down', 'Arcade should count down');
    
    const enduranceConfig = mockGame.TimerConfig.getTimerConfig('endurance');
    assert(enduranceConfig.default === null, 'Endurance default should be null');
    assert(enduranceConfig.countDirection === 'up', 'Endurance should count up');
    
    done();
  });
  
  console.log('\nTesting GameTimer...\n');
  
  // Test 3: GameTimer construction
  await test('GameTimer construction', (done) => {
    const timer = new GameTimer('arcade');
    assert(timer.category === 'arcade', 'Timer category should be arcade');
    assert(timer.duration === 60000, 'Timer duration should be 60000ms');
    assert(timer.countDirection === 'down', 'Timer should count down');
    assert(!timer.isRunning, 'Timer should not be running initially');
    timer.destroy();
    done();
  });
  
  // Test 4: Timer start and elapsed time
  await test('Timer start and elapsed time', async (done) => {
    const timer = new GameTimer('arcade', { duration: 1000 });
    timer.start();
    assert(timer.isRunning, 'Timer should be running after start');
    
    await sleep(200);
    const elapsed = timer.getElapsed();
    assert(elapsed >= 190 && elapsed <= 250, `Elapsed time should be around 200ms (got ${elapsed}ms)`);
    
    timer.stop();
    assert(!timer.isRunning, 'Timer should not be running after stop');
    timer.destroy();
    done();
  });
  
  // Test 5: Timer completion callback
  await test('Timer completion callback', async (done) => {
    let completeCalled = false;
    const timer = new GameTimer('arcade', { duration: 100 });
    
    timer.onComplete(() => {
      completeCalled = true;
    });
    
    timer.start();
    
    await sleep(200);
    assert(completeCalled, 'Complete callback should have been called');
    assert(!timer.isRunning, 'Timer should not be running after completion');
    timer.destroy();
    done();
  });
  
  // Test 6: Timer pause and resume
  await test('Timer pause and resume', async (done) => {
    const timer = new GameTimer('arcade', { duration: 5000 });
    timer.start();
    
    await sleep(100);
    timer.pause();
    assert(timer.isPaused, 'Timer should be paused');
    
    const elapsedAtPause = timer.getElapsed();
    await sleep(100);
    const elapsedAfterPause = timer.getElapsed();
    
    assert(Math.abs(elapsedAtPause - elapsedAfterPause) < 10, 'Elapsed time should not change while paused');
    
    timer.resume();
    assert(!timer.isPaused, 'Timer should not be paused after resume');
    assert(timer.isRunning, 'Timer should be running after resume');
    
    await sleep(100);
    const elapsedAfterResume = timer.getElapsed();
    assert(elapsedAfterResume > elapsedAtPause, 'Elapsed time should increase after resume');
    
    timer.stop();
    timer.destroy();
    done();
  });
  
  // Test 7: Tick callbacks
  await test('Tick callbacks', async (done) => {
    let tickCount = 0;
    const timer = new GameTimer('arcade', { duration: 200 });
    
    timer.onTick((elapsed, remaining) => {
      tickCount++;
      assert(elapsed >= 0, 'Elapsed should be non-negative');
      assert(remaining >= 0, 'Remaining should be non-negative');
    });
    
    timer.start();
    await sleep(150);
    timer.stop();
    
    assert(tickCount > 5, `Tick callback should be called multiple times (got ${tickCount} ticks)`);
    timer.destroy();
    done();
  });
  
  // Test 8: Countdown timer (getRemaining)
  await test('Countdown timer (getRemaining)', async (done) => {
    const timer = new GameTimer('arcade', { duration: 500 });
    timer.start();
    
    await sleep(200);
    const remaining = timer.getRemaining();
    assert(remaining >= 250 && remaining <= 350, `Remaining time should be around 300ms (got ${remaining}ms)`);
    
    timer.stop();
    timer.destroy();
    done();
  });
  
  // Test 9: Count-up timer (endurance)
  await test('Count-up timer (endurance)', async (done) => {
    const timer = new GameTimer('endurance');
    assert(timer.countDirection === 'up', 'Endurance timer should count up');
    assert(timer.duration === null, 'Endurance timer should have no duration limit');
    
    timer.start();
    await sleep(100);
    const elapsed = timer.getElapsed();
    assert(elapsed >= 90 && elapsed <= 150, `Elapsed time should be around 100ms (got ${elapsed}ms)`);
    
    timer.stop();
    timer.destroy();
    done();
  });
  
  // Test 10: Format time
  await test('Format time', (done) => {
    const timer = new GameTimer('arcade');
    
    const formatted1 = timer.formatTime(0);
    assert(formatted1 === '0:00.0', `Format 0ms should be '0:00.0' (got '${formatted1}')`);
    
    const formatted2 = timer.formatTime(65000);
    assert(formatted2 === '1:05.0', `Format 65000ms should be '1:05.0' (got '${formatted2}')`);
    
    const formatted3 = timer.formatTime(12345);
    assert(formatted3.startsWith('0:12.'), `Format 12345ms should start with '0:12.' (got '${formatted3}')`);
    
    timer.destroy();
    done();
  });
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('Test Summary:');
  console.log(`  ✅ Passed: ${testsPassed}`);
  console.log(`  ❌ Failed: ${testsFailed}`);
  console.log('='.repeat(50));
  
  if(testsFailed > 0){
    console.log('\n❌ Some tests failed\n');
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed!\n');
    process.exit(0);
  }
})();
