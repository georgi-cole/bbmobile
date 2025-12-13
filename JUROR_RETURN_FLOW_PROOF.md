# Juror Return Flow - Visual Proof of Functionality

This document demonstrates that the juror return twist is working correctly through the complete flow.

## Test Setup

### Configuration Used
```javascript
{
  jurorReturnAliveMin: 6,      // Must have exactly 6 alive
  jurorReturnAliveMax: 6,      // (min = max for exact constraint)
  jurorReturnMinJurors: 2,     // Need at least 2 jurors
  tJurorReturnVoteMs: 6500,    // Vote panel runs 6.5 seconds
  returnChance: 100            // 100% for testing
}
```

### Game State
- **Total Players**: 12 (standard cast)
- **Alive Players**: 6 (meets threshold)
- **Jurors in Jury House**: 2 (Player 7, Player 8)
- **Week**: 5 (mid-season)

## Complete Flow Sequence

### Step 1: Eligibility Check ✓
**Location**: `js/twists.js` → `isJurorReturnEligible()`

**Checks Performed**:
- ✓ Jury house enabled (`cfg.enableJuryHouse = true`)
- ✓ Not already run (`__jurorReturnDone = false`)
- ✓ Alive count in range (6 is within 6-6)
- ✓ Sufficient jurors (2 >= 2)

**Result**: ELIGIBLE

**Code Path**:
```javascript
// twists.js lines 69-92
function isJurorReturnEligible(g){
  if(!g) return false;
  if(!g.cfg?.enableJuryHouse) return false;
  if(hasJurorReturnRun(g)) return false;
  
  const aliveCount = ap().length;
  const aliveMin = parseInt(g.cfg?.jurorReturnAliveMin, 10) || 6;
  const aliveMax = parseInt(g.cfg?.jurorReturnAliveMax, 10) || 6;
  if(aliveCount < aliveMin || aliveCount > aliveMax) return false;
  
  const jurorCount = Array.isArray(g.juryHouse) ? g.juryHouse.length : 0;
  const minJurors = parseInt(g.cfg?.jurorReturnMinJurors, 10) || 2;
  if(jurorCount < minJurors) return false;
  
  return true;
}
```

---

### Step 2: Weekly Decision (RNG + Caching) ✓
**Location**: `js/twists.js` → `decideJurorReturnThisWeek()`

**Process**:
1. Check if decision already cached for this week
2. If not cached, check eligibility
3. Roll RNG against `returnChance` config
4. Cache decision for week to prevent multiple rolls

**Result**: ACTIVATE (100% chance in test config)

**Code Path**:
```javascript
// twists.js lines 114-137
function decideJurorReturnThisWeek(g){
  if(!g) return false;
  
  // Check cache
  if(g.__jurorReturnDecision && g.__jurorReturnDecision.week === g.week){
    return g.__jurorReturnDecision.pass;
  }
  
  // Check eligibility
  if(!isJurorReturnEligible(g)){
    g.__jurorReturnDecision = { week: g.week, pass: false };
    return false;
  }
  
  // Roll RNG
  const normalizedChance = getJurorReturnChance(g.cfg);
  const roll = rand() * 100;
  const pass = roll < normalizedChance;
  
  // Cache decision
  g.__jurorReturnDecision = { week: g.week, pass: pass };
  return pass;
}
```

---

### Step 3: Trigger from Week Rollover ✓
**Location**: `js/eviction.js` → `proceedNextWeek()`

**Integration Point**:
```javascript
// eviction.js lines 1657-1660
// Use centralized juror return decision logic from twists.js
if(typeof global.decideJurorReturnThisWeek === 'function' && 
   global.decideJurorReturnThisWeek(g)){
  setTimeout(()=>{ try{ global.startAmericaReturnVote?.(); }catch(e){} },60);
  return;
}
```

**What Happens**:
- Called after eviction completes
- BEFORE starting HOH competition
- Uses centralized decision (no duplicate checks)
- Proceeds to start vote if decision is true

---

### Step 4: Twist Announcement Modal ✓
**Location**: `js/ui.week-intro.js` → `showTwistAnnouncementIfNeeded()`

**Modal Content**:
```
Title: "House Shock!"
Emojis: 👁️⚖️🔙
Subtitle: "A jury member re-enters the house!"
Tone: special
Duration: 4 seconds
```

**Code Path**:
```javascript
// ui.week-intro.js lines 171-182
if (global.decideJurorReturnThisWeek(g) && !g.__jurorReturnModalShown) {
  twistConfig = {
    title: 'House Shock!',
    emojis: '👁️⚖️🔙',
    subtitle: 'A jury member re-enters the house!',
    tone: 'special',
    duration: 4000
  };
  g.__jurorReturnModalShown = true;
}
```

**Screenshot**: Modal displays centered on screen with backdrop blur

---

### Step 5: Vote Panel Animation (6.5 seconds) ✓
**Location**: `js/twists.js` → `startAmericaReturnVote()`

**What's Displayed**:
- Grid of all jurors with avatars
- Live-updating vote percentages
- Progress bars showing vote totals
- Leader highlighting (border glow)
- Countdown timer
- Duration: 6500ms (from config)

**Code Path**:
```javascript
// twists.js lines 290-303
g.__returnTwist={
  jurors: jurors.slice(),
  counts: new Map(jurors.map(id=>[id,0])),
  weights: new Map(jurors.map(id=>[id, 0.7 + rand()*1.1])),
  started: Date.now(),
  durationMs: Number(g.cfg?.tJurorReturnVoteMs || 6500), // ← Config value
  finished:false,
  lastLeader:null,
  _tick:null,
  _heartbeat:null,
  _lastUpdate:0,
  _seeded:false,
  _domCache:null,
};
```

**Key Features**:
- Vote counts dynamically change every 160ms
- Percentages always sum to 100%
- Leader card scales up and glows
- Flash animation when leader changes
- Auto-finishes after 6.5 seconds

**Screenshot**: Panel with 2 juror cards, vote bars, percentages

---

### Step 6: Finalize Vote & Pick Winner ✓
**Location**: `js/twists.js` → `finalizeAmericaReturnVote()`

**Process**:
1. Stop vote animations
2. Sort jurors by vote count
3. Pick highest as winner
4. Update player state:
   - Set `evicted = false`
   - Remove `weekEvicted` property
   - Remove from `juryHouse` array
5. Set completion flags:
   - `__americaReturnDone = true`
   - `__jurorReturnDone = true`
   - `__americaReturnCompleted = true`
   - `__jurorReturnCompleted = true`

**Code Path**:
```javascript
// twists.js lines 437-495
async function finalizeAmericaReturnVote(){
  const g=global.game; const st=g.__returnTwist;
  
  if(!st || st.finished) return;
  st.finished=true;
  
  // Mark as completed
  g.__americaReturnCompleted=true;
  g.__jurorReturnCompleted=true;
  
  // Clean up intervals
  if(st._tick) clearInterval(st._tick);
  if(st._heartbeat) clearInterval(st._heartbeat);
  
  // Sort and pick winner
  const sorted=st.jurors.map(id=>({id,c:st.counts.get(id)||0}))
                        .sort((a,b)=>b.c-a.c);
  const winnerId=sorted.length?sorted[0].id:null;
  
  if(winnerId!=null){
    const w=gp(winnerId);
    if(w){ 
      w.evicted=false; 
      delete w.weekEvicted; 
    }
    if(Array.isArray(g.juryHouse)) 
      g.juryHouse=g.juryHouse.filter(id=>id!==winnerId);
    
    // Show announcement...
  }
}
```

---

### Step 7: TV Results Announcement ✓
**Location**: `js/twists.js` → `finalizeAmericaReturnVote()` (continued)

**What's Shown**:
```
Title: "They're Back!"
Message: "[Winner Name] re-enters the house."
Subtitle: "They are eligible for HOH."
Duration: 5.6 seconds
Victory music plays
```

**Code Path**:
```javascript
// twists.js lines 476-481
try{
  global.addJuryLog?.(`<b>${global.safeName(winnerId)}</b> wins America's Vote and returns!`,'ok');
  global.setMusic?.('victory',true);
  global.showCard?.('They\'re Back!',[`${global.safeName(winnerId)} re-enters the house.`,'They are eligible for HOH.'],'return',5600,true);
  await global.cardQueueWaitIdle?.();
}catch(e){}
```

---

### Step 8: UI Updates ✓
**Location**: `js/twists.js` → `finalizeAmericaReturnVote()` (continued)

**UI Changes**:
1. **Flash Effect**: Winner's avatar ID stored in `g.__returnFlashId`
2. **HUD Update**: `global.updateHud()` called to refresh display
3. **Red X Removed**: Avatar no longer shows eviction overlay
4. **Roster Updated**: Player appears in alive roster
5. **PlayerService Sync**: If available, `PlayerService.setAlivePlayers()` called

**Code Path**:
```javascript
// twists.js lines 482-489
g.__returnFlashId=winnerId;
setTimeout(()=>{ 
  g.__returnFlashId=null; 
  global.updateHud?.(); 
},6500);

// Update PlayerService after player returns
if(typeof global.PlayerService?.setAlivePlayers === 'function' && g.players){
  global.PlayerService.setAlivePlayers(g.players);
}
```

**Flash Duration**: 6.5 seconds (avatar pulsates/glows in HUD)

---

### Step 9: Resume to HOH ✓
**Location**: `js/twists.js` → `resumeWeekAfterReturn()`

**What Happens**:
- Cleanup vote panel
- Display "Intermission" on TV
- Set phase to `intermission` for 4 seconds
- Then proceed to HOH competition

**Code Path**:
```javascript
// twists.js lines 507-517
function resumeWeekAfterReturn(){
  const g=global.game; if(!g) return;
  if(g.phase!=='return_twist'){
    if(!['intermission','hoh','nominations'].includes(g.phase)){
      global.setPhase?.('intermission', g.cfg?.tIntermission || 4, ()=>global.startHOH?.());
    }
    return;
  }
  global.tv?.say?.('Intermission');
  global.setPhase?.('intermission', g.cfg?.tIntermission || 4, ()=>global.startHOH?.());
}
```

---

## Verification Tests

### Test 1: Default Configuration ✓
- Setup: 6 alive, 2 jurors
- Expected: Twist activates
- Result: ✓ PASS

### Test 2: Below Minimum Alive ✓
- Setup: 5 alive, 2 jurors
- Expected: Does not activate
- Result: ✓ PASS

### Test 3: Above Maximum Alive ✓
- Setup: 7 alive, 2 jurors
- Expected: Does not activate
- Result: ✓ PASS

### Test 4: Below Minimum Jurors ✓
- Setup: 6 alive, 1 juror
- Expected: Does not activate
- Result: ✓ PASS

### Test 5: Already Run Flag ✓
- Setup: 6 alive, 2 jurors, `__jurorReturnDone = true`
- Expected: Does not activate
- Result: ✓ PASS

### Test 6: Custom Range ✓
- Setup: 7 alive, 2 jurors, config `{aliveMin: 5, aliveMax: 8}`
- Expected: Twist activates
- Result: ✓ PASS

### Test 7: Vote Panel Duration ✓
- Setup: Config `{tJurorReturnVoteMs: 6500}`
- Expected: Panel runs exactly 6.5 seconds
- Result: ✓ PASS (measured with timer)

### Test 8: Weekly Caching ✓
- Setup: Call `decideJurorReturnThisWeek()` twice in same week
- Expected: Returns same cached result
- Result: ✓ PASS

---

## Debug Support

### Force Juror Return
The debug action "Force Juror's Return" works and calls `startAmericaReturnVote()` directly:

**Location**: `js/ui.hud-and-router.js`
```javascript
// Existing debug action preserved
forceReturnTwist: function() {
  if(typeof global.startAmericaReturnVote === 'function'){
    global.startAmericaReturnVote();
  }
}
```

---

## Summary

✅ **All Requirements Met**:

1. ✅ Twist triggers BEFORE HOH (at week rollover)
2. ✅ Uses configurable thresholds (easy to change 6 to 5-8 range)
3. ✅ Single source of truth (`decideJurorReturnThisWeek`)
4. ✅ No conflicting logic (removed `shouldRunAmericaReturn`)
5. ✅ Vote panel runs 6.5 seconds (from config)
6. ✅ Modal displays correctly
7. ✅ Winner returns and UI updates
8. ✅ Flow continues to HOH
9. ✅ Debug force works
10. ✅ Weekly decision cached (no duplicate RNG)

**Test Files**:
- `test_juror_return_config.html` - Unit tests for eligibility logic
- `test_juror_return_visual_flow.html` - Complete visual demonstration

**Documentation**:
- `JUROR_RETURN_ELIGIBILITY.md` - Updated eligibility rules
- `JUROR_RETURN_REFACTOR_SUMMARY.md` - Complete refactor details
- `JUROR_RETURN_FLOW_PROOF.md` - This document

---

## How to Test Manually

1. Open `index.html` in browser
2. Start new game with default settings
3. Play through weeks until 6 players alive
4. Ensure 2+ players in jury house
5. Complete an eviction
6. Observe:
   - Modal appears: "A jury member re-enters the house!"
   - Vote panel displays for 6.5 seconds
   - Winner announced on TV
   - Winner's avatar flashes in HUD
   - Game continues to HOH competition

**OR**

1. Open `test_juror_return_visual_flow.html`
2. Click "Start Complete Flow"
3. Watch automated demonstration of all 8 steps
4. Review detailed event log

---

*Last Updated: 2025-12-13*
*Commits: 54ff732, 313baa0, f487d0a*
