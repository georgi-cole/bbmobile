# Social Phase Controller - Quick Reference

## Usage

### For Social Phase Implementation

```javascript
// Start phase - automatically handled by onSocialPhaseStart()
// Controller transitions: idle → running

// Show summary - automatically handled by showSummaryPanel()
// Controller transitions: running → summarizing
// Side effect: ALL timers cancelled atomically

// OK button - automatically handled by continueBtn.onclick
// Controller transitions: summarizing → advanced
// Side effect: Advance callback executed, phase moves forward
```

### For External Modules

#### Check if you should start the scheduler:

```javascript
// In social-ai-scheduler.js, social-ai-autostart.js, etc.
if (window.SocialManeuvers?.SocialPhaseController?.shouldBlockSchedulerStart?.()) {
  console.info('Controller blocked start - phase is summarizing or advanced');
  return;
}

// Safe to start scheduler
SocialAIScheduler.startAiSocialPhase();
```

#### Access controller state:

```javascript
const controller = window.SocialManeuvers.SocialPhaseController;

// Check current state
const state = controller.getState(); // 'idle', 'running', 'summarizing', 'advanced'

// Check specific states
if (controller.isRunning()) { /* ... */ }
if (controller.isSummarizing()) { /* ... */ }
if (controller.isAdvanced()) { /* ... */ }

// Check if phase can start
if (controller.canStart()) { /* ... */ }

// Check if scheduler start should be blocked
if (controller.shouldBlockSchedulerStart()) { /* ... */ }
```

## State Machine

```
┌──────────────────────────────────────────────────────────┐
│ State: idle                                              │
│ Can start: ✅ Yes                                        │
│ Block scheduler: ❌ No                                   │
│ Timers active: ❌ No                                     │
└──────────────────────────────────────────────────────────┘
                       ↓ startPhase()
┌──────────────────────────────────────────────────────────┐
│ State: running                                           │
│ Can start: ❌ No (already started)                       │
│ Block scheduler: ❌ No (scheduler should run)            │
│ Timers active: ✅ Yes (phase timer, scheduler, etc.)    │
└──────────────────────────────────────────────────────────┘
                    ↓ beginSummarizing()
┌──────────────────────────────────────────────────────────┐
│ State: summarizing                                       │
│ Can start: ❌ No                                         │
│ Block scheduler: ✅ YES (prevent restarts)               │
│ Timers active: ❌ No (ALL cancelled)                     │
│ Summary shown: ✅ Yes                                    │
└──────────────────────────────────────────────────────────┘
                      ↓ advancePhase()
┌──────────────────────────────────────────────────────────┐
│ State: advanced                                          │
│ Can start: ❌ No                                         │
│ Block scheduler: ✅ YES (phase ended)                    │
│ Timers active: ❌ No                                     │
│ Callback executed: ✅ Yes                                │
│ Next phase started: ✅ Yes                               │
└──────────────────────────────────────────────────────────┘
                        ↓ reset()
                    (back to idle)
```

## API Reference

### Controller Methods

```javascript
// State transitions
controller.startPhase()         // idle → running, returns boolean
controller.beginSummarizing()   // running → summarizing, returns boolean
controller.advancePhase()       // summarizing → advanced, returns boolean
controller.reset()              // any → idle

// State queries
controller.getState()                    // Returns: 'idle'|'running'|'summarizing'|'advanced'
controller.isRunning()                   // Returns: boolean
controller.isSummarizing()              // Returns: boolean
controller.isAdvanced()                  // Returns: boolean
controller.canStart()                    // Returns: boolean
controller.shouldBlockSchedulerStart()  // Returns: boolean (true if summarizing or advanced)

// Timer management
controller.cancelAllTimers()    // Clears ALL timer handles + stops scheduler

// Timer handles (read/write)
controller.phaseTimerHandle      // setTimeout handle from setPhase()
controller.schedulerTimerHandle  // AI scheduler tick timeout
controller.schedulerRAFHandle    // RAF pump for scheduler
controller.watchdogTimerHandle   // Watchdog timer
controller.fastAdvanceHandle     // Fast-advance timeout

// Callback (read/write)
controller.advanceCallback       // Function to call when advancing phase
```

## Common Patterns

### Pattern 1: Start scheduler safely

```javascript
function startScheduler() {
  // Check controller first
  if (window.SocialManeuvers?.SocialPhaseController?.shouldBlockSchedulerStart?.()) {
    console.info('Blocked by controller - phase ending or ended');
    return;
  }
  
  // Check if already running
  if (isRunning) {
    console.warn('Already running');
    return;
  }
  
  // Safe to start
  isRunning = true;
  scheduleNextTick();
}
```

### Pattern 2: Store advance callback

```javascript
function onPhaseStart(callback) {
  const controller = window.SocialManeuvers?.SocialPhaseController;
  
  if (!controller) {
    throw new Error('Controller not available');
  }
  
  // Store callback in controller
  controller.advanceCallback = () => {
    console.info('Advancing phase');
    callback();
  };
}
```

### Pattern 3: Show summary and cancel timers

```javascript
function showSummary(data) {
  const controller = window.SocialManeuvers?.SocialPhaseController;
  
  // Transition to summarizing (cancels all timers)
  if (!controller.beginSummarizing()) {
    console.warn('Cannot show summary - wrong state');
    return;
  }
  
  // Controller already cancelled all timers
  // Safe to show modal
  showModal(data);
}
```

### Pattern 4: OK button handler

```javascript
okButton.onclick = () => {
  const controller = window.SocialManeuvers?.SocialPhaseController;
  
  // Advance phase (calls callback, transitions to advanced)
  if (!controller.advancePhase()) {
    console.warn('Cannot advance - wrong state');
    return;
  }
  
  // Controller already:
  // 1. Called advance callback
  // 2. Cleared callback reference
  // 3. Cancelled any remaining timers
  // 4. Transitioned to 'advanced' state
  
  // Just cleanup UI
  removeModal();
};
```

## Debugging

### Enable debug logging

```javascript
window.game.cfg.debugSocialAI = true;
```

### Check controller state

```javascript
// In browser console
const ctrl = window.SocialManeuvers.SocialPhaseController;
console.log('State:', ctrl.getState());
console.log('Running?', ctrl.isRunning());
console.log('Summarizing?', ctrl.isSummarizing());
console.log('Advanced?', ctrl.isAdvanced());
console.log('Block scheduler?', ctrl.shouldBlockSchedulerStart());
```

### Check timer handles

```javascript
const ctrl = window.SocialManeuvers.SocialPhaseController;
console.log('Phase timer:', ctrl.phaseTimerHandle);
console.log('Scheduler timer:', ctrl.schedulerTimerHandle);
console.log('RAF:', ctrl.schedulerRAFHandle);
console.log('Watchdog:', ctrl.watchdogTimerHandle);
console.log('Fast-advance:', ctrl.fastAdvanceHandle);
```

### Manual state transitions (testing only)

```javascript
const ctrl = window.SocialManeuvers.SocialPhaseController;

// Reset to idle
ctrl.reset();

// Start phase
ctrl.startPhase();

// Simulate summary
ctrl.beginSummarizing();

// Simulate OK click
ctrl.advanceCallback = () => console.log('Advanced!');
ctrl.advancePhase();
```

## Console Log Patterns

### ✅ Expected (normal flow)

```
[SocialPhaseController] ▶️ Starting phase (idle -> running)
[social.js] ✓ Phase advancement callback stored in controller
[SocialPhaseController] 📊 Begin summarizing (running -> summarizing)
[SocialPhaseController] ❌ Canceling all timers
[SocialPhaseController] ✅ Advancing phase (summarizing -> advanced)
```

### ❌ Errors to investigate

```
[SocialPhaseController] Cannot start - current state: running
[SocialPhaseController] Cannot summarize - current state: idle
[SocialPhaseController] Already advanced - ignoring duplicate
[social.js] ❌ SocialPhaseController not found
```

## Migration Notes

### Old code (before controller)

```javascript
// Multiple places managing state
game.__socialPhaseAdvanced = false;
game.__socialSummaryGenerated = false;
game.__socialPhaseAdvanceCallback = callback;
socialSummaryOpen = false;

// Timers scattered
const timer = setTimeout(...);
clearTimeout(game.__socialFastAdvanceTimeout);
PauseController.pause('social-summary');
```

### New code (with controller)

```javascript
// Single source of truth
controller.startPhase();           // Manages all state
controller.advanceCallback = cb;   // Single callback storage
controller.beginSummarizing();     // Cancels ALL timers
controller.advancePhase();         // Executes callback once
```

## Files Using Controller

- `js/social-maneuvers.js` - Owner/implementer
- `js/social.js` - Stores advance callback
- `js/social-ai-scheduler.js` - Checks before start
- `js/social/social-ai-autostart.js` - Checks before start
- `js/phase-terminator.js` - Checks before delayed stop

## Tests

- Unit tests: `test_social_phase_controller.html`
- Integration: `npm run test:social`
- Manual: See `SOCIAL_PHASE_CONTROLLER_FIX_SUMMARY.md`
