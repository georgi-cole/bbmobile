# Twist Badge Timing Fix - Quick Reference

## 🎯 Goal
Prevent twist badge from flashing on TV before the "House Shock!" modal appears.

## 📝 Changes Made (3 files)

### 1️⃣ js/twists.js (Line 223)
```diff
  g.__twistDecidedWeek=g.week;
+ g.__twistBadgeShown=false;
```
**Purpose:** Reset badge visibility flag when twist state resets

---

### 2️⃣ js/ui.week-intro.js (Lines 206-223)
```diff
  try {
    await global.showEventModal(twistConfig);
    
-   // After modal, update the twist badge in TV area
-   if(typeof global.TV?.updateTwistBadge === 'function'){
-     global.TV.updateTwistBadge();
-   }
+   // After modal completes, enable badge display
+   const g = global.game || {};
+   g.__twistBadgeShown = true;
+   
+   // Update HUD to trigger badge display
+   if(typeof global.updateHud === 'function'){
+     global.updateHud();
+   }
  } catch (e) {
    console.error('[ui.week-intro] Error showing twist modal:', e);
+   // Still enable badge even if modal throws
+   const g = global.game || {};
+   g.__twistBadgeShown = true;
+   if(typeof global.updateHud === 'function'){
+     global.updateHud();
+   }
  }
```
**Purpose:** Set flag to true and trigger HUD update after modal completes

---

### 3️⃣ js/tv.js (Lines 171-180)
```diff
  const isDouble = game.__twistMode === 'double' || game.doubleEvictionWeek === true;
  const isTriple = game.__twistMode === 'triple' || game.tripleEvictionWeek === true;
  
+ // Only show badge if twist is active AND badge has been shown (modal completed)
+ const badgeAllowed = game.__twistBadgeShown === true;
+ 
- if(isTriple){
+ if(isTriple && badgeAllowed){
    setTwistBadge('triple', true);
- } else if(isDouble){
+ } else if(isDouble && badgeAllowed){
    setTwistBadge('double', true);
  } else if(twistBadgeVisible){
-   // Clear badge if no twist is active
+   // Clear badge if no twist is active or badge not allowed yet
    setTwistBadge(null, false);
  }
```
**Purpose:** Gate badge display on both twist active AND flag true

---

## 🔄 Flow

```
decideForWeek() → __twistBadgeShown = false → Badge HIDDEN
                ↓
        Modal appears & displays
                ↓
        Modal completes/closes
                ↓
     __twistBadgeShown = true → updateHud() → Badge VISIBLE ✓
```

## ✅ Testing

### Quick Test
```javascript
// Setup
game.cfg.doubleChance = 100;
game.week = 2;

// Trigger
window.twists.decideForWeek();
console.log('Badge shown:', game.__twistBadgeShown); // false ✓
console.log('Twist mode:', game.__twistMode); // 'double' ✓

// After modal
game.__twistBadgeShown = true;
window.updateHud();
// Badge now visible on TV ✓
```

### Test Files
- **test_twist_badge_timing.html** - Automated + manual tests
- **TWIST_BADGE_TIMING_TEST_GUIDE.md** - Step-by-step instructions
- **TWIST_BADGE_FIX_SUMMARY.md** - Full implementation details

## 🎨 Result

**Before:** Badge flashes → Modal shows → Badge stays
**After:** No badge → Modal shows → Badge appears ✓

## 🔍 Key State Variable

**`game.__twistBadgeShown`**
- `false` = Badge hidden (before modal)
- `true` = Badge allowed (after modal)
- Reset to `false` each week
- Set to `true` after modal completes

## 📊 Success Criteria

- ✅ No flash before modal
- ✅ Badge appears immediately after modal
- ✅ Badge persists across HUD updates
- ✅ Badge persists across phase changes
- ✅ Badge clears on week change
- ✅ Works with double & triple evictions
- ✅ Handles modal errors gracefully
