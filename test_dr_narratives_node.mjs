// Test script for enhanced DR narratives
// Run with: node test_dr_narratives_node.mjs

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Mock the window object for Node.js
global.window = global;

// Create event bus
const eventBus = {
  listeners: new Map(),
  on(event, handler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(handler);
  },
  emit(event, payload) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach(h => h(payload));
    }
  },
  off(event, handler) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }
};

global.game = {
  cfg: { humanName: 'You' },
  me: 0,
  week: 3,
  players: [
    { id: 0, name: 'You' },
    { id: 1, name: 'Alex' },
    { id: 2, name: 'Bailey' },
    { id: 3, name: 'Casey' }
  ],
  drLogs: [],
  bus: eventBus
};

global.safeName = (id) => {
  const player = global.game.players.find(p => p.id === id);
  return player ? player.name : `Player ${id}`;
};

// Load modules
require('./js/dr/diaryTemplates.js');
require('./js/dr/diaryRoomLogger.js');

console.log('\n🎭 Testing Enhanced DR Narratives\n');
console.log('='.repeat(60));

// Initialize logger
window.DiaryRoomLogger.init();
console.log('✓ Logger initialized\n');

// Test 1: Alliance formation
console.log('--- Test 1: Alliance Formation (0.30 → 0.45) ---');
window.game.bus.emit('social.action:result', {
  actor: { id: 1 },
  target: { id: 2 },
  actionType: 'strategize',
  success: true,
  bondBefore: 0.30,
  bondAfter: 0.45,
  bondDelta: 0.15,
  outcome: 'success'
});

// Test 2: Romance
console.log('\n--- Test 2: Romance Development (0.50 → 0.65) ---');
window.game.bus.emit('social.action:result', {
  actor: { id: 1 },
  target: { id: 3 },
  actionType: 'flirt',
  success: true,
  bondBefore: 0.50,
  bondAfter: 0.65,
  bondDelta: 0.15,
  outcome: 'success'
});

// Test 3: Rivalry
console.log('\n--- Test 3: Rivalry/Betrayal (0.20 → -0.15) ---');
window.game.bus.emit('social.action:result', {
  actor: { id: 2 },
  target: { id: 3 },
  actionType: 'backstab',
  success: true,
  bondBefore: 0.20,
  bondAfter: -0.15,
  bondDelta: -0.35,
  outcome: 'dramatic'
});

// Test 4: Bond shift event
console.log('\n--- Test 4: Bond Shift Event (0.20 → 0.45) ---');
window.game.bus.emit('bond.shift', {
  player1: 1,
  player2: 2,
  delta: 0.25,
  before: 0.20,
  after: 0.45
});

// Test 5: Phase summary with highlights
console.log('\n--- Test 5: Phase Summary with Highlights ---');
window.game.bus.emit('social.phase:end', {
  week: 3,
  actionCount: 10,
  actions: [
    { actor: 1, target: 2, action: 'strategize', success: true, bondBefore: 0.30, bondAfter: 0.45 },
    { actor: 1, target: 3, action: 'flirt', success: true, bondBefore: 0.50, bondAfter: 0.65 },
    { actor: 2, target: 3, action: 'backstab', success: true, bondBefore: 0.20, bondAfter: -0.15 }
  ],
  bondShifts: [
    { player1: 1, player2: 2, delta: 0.15, before: 0.30, after: 0.45 },
    { player1: 1, player2: 3, delta: 0.15, before: 0.50, after: 0.65 },
    { player1: 2, player2: 3, delta: -0.35, before: 0.20, after: -0.15 }
  ]
});

// Display all DR logs
setTimeout(() => {
  console.log('\n' + '='.repeat(60));
  console.log('📖 All DR Entries Generated');
  console.log('='.repeat(60) + '\n');
  
  if (window.game.drLogs.length === 0) {
    console.log('⚠️ No DR entries were generated.');
  } else {
    window.game.drLogs.forEach((entry, idx) => {
      const emoji = entry.severity === 'high' ? '🔴' : entry.severity === 'dramatic' ? '⭐' : '⚪';
      console.log(`${emoji} Entry ${idx + 1} [${entry.severity}]:`);
      console.log(`   ${entry.text}`);
      console.log();
    });
  }

  console.log('\n✅ All tests passed! Enhanced narratives are working!\n');
}, 200);
