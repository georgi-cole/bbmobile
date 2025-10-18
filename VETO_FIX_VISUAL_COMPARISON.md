# Veto Flow Fix - Visual Comparison

## Before vs After

### 1. computeVetoParticipants() - ID Type Fix

**BEFORE:**
```javascript
var unique = [];
for(i=0;i<finalSet.length;i++){
  id = finalSet[i];
  if(!seen[id]){ seen[id]=true; unique.push(id); }
}
return unique;  // ❌ Could be mixed types: [1, "2", 3, "4"]
```

**AFTER:**
```javascript
var unique = [];
for(i=0;i<finalSet.length;i++){
  id = finalSet[i];
  if(!seen[id]){ seen[id]=true; unique.push(id); }
}
// Ensure all IDs are numeric to avoid string/number mismatches downstream
return unique.map(function(x){ return +x; });  // ✅ Always [1, 2, 3, 4]
```

---

### 2. submitGuarded() - Input Normalization

**BEFORE:**
```javascript
function submitGuarded(id, base, mult, label){
  var g = global.game;
  g.lastCompScores = g.lastCompScores || new Map();
  if(g.lastCompScores.has(id)) return false;  // ❌ Might miss duplicates if types differ
  
  var finalScore = base * mult;  // ❌ Might produce NaN if strings
  g.lastCompScores.set(id, finalScore);  // ❌ Key might be string
```

**AFTER:**
```javascript
function submitGuarded(id, base, mult, label){
  var g = global.game;
  g.lastCompScores = g.lastCompScores || new Map();
  // Normalize inputs to numeric and guard duplicate submissions
  id = +id;  // ✅ "2" → 2
  base = +base;  // ✅ "10" → 10
  mult = (mult==null ? 1 : +mult) || 1;  // ✅ null → 1, "1.5" → 1.5
  if(g.lastCompScores.has(id)) return false;  // ✅ Always numeric comparison
  
  var finalScore = base * mult;  // ✅ Always numeric
  g.lastCompScores.set(id, finalScore);  // ✅ Always numeric key
```

---

### 3. startVetoComp() - Double Normalization

**BEFORE:**
```javascript
g.__vetoPlayers = computeVetoParticipants();
// ❌ No guarantee IDs stay numeric if modified elsewhere
```

**AFTER:**
```javascript
g.__vetoPlayers = computeVetoParticipants();
// Normalize to numeric again in case upstream changed shape
if(Array.isArray(g.__vetoPlayers)){
  g.__vetoPlayers = g.__vetoPlayers.map(function(x){ return +x; }); }
// ✅ Defense-in-depth normalization
```

---

### 4. startVetoComp() - Human Minigame Fallback

**BEFORE:**
```javascript
if(typeof global.runHumanMinigameWithGuards === 'function'){
  // Modern flow
} else if(typeof global.renderMinigame==='function'){
  // Legacy flow
}
// ❌ If both unavailable, game stalls waiting for human score
```

**AFTER:**
```javascript
if(typeof global.runHumanMinigameWithGuards === 'function'){
  // Modern flow
} else if(typeof global.renderMinigame==='function'){
  // Legacy flow
}
else {
  // Last-resort fallback: if no modern or legacy renderer is available,
  // auto-submit a zero so the flow cannot stall.
  setTimeout(function(){ submitGuarded(you.id, 0, 1, 'Veto/AutoFallback'); }, 200);
}
// ✅ Game always progresses even if minigame fails
```

---

### 5. finishVetoComp() - Robust Winner Selection

**BEFORE:**
```javascript
var eligible = g.__vetoPlayers.slice();  // ❌ Might be mixed types

// Synthesize scores
for(var i=0;i<eligible.length;i++){
  var id = eligible[i];  // ❌ Might be string
  if(!g.lastCompScores.has(id)){  // ❌ Might miss if types differ
    g.lastCompScores.set(id, 5 + rng()*5);
  }
}

var arr = [];
g.lastCompScores.forEach(function(score, pid){
  if(eligible.indexOf(pid)!==-1){  // ❌ Might fail if types differ
    arr.push([pid, score]);
  }
});
// ❌ arr could be empty if all IDs are wrong type

arr.sort(function(a,b){ return b[1]-a[1]; });
global.game.vetoHolder = arr[0][0];  // ❌ Crashes if arr is empty
```

**AFTER:**
```javascript
var eligible = g.__vetoPlayers.map(function(x){ return +x; });  // ✅ Always numeric

// Synthesize scores with string key migration
(function ensureScores(){
  for(var i=0;i<eligible.length;i++){
    var id = +eligible[i];  // ✅ Numeric
    // Migrate string keys to numeric
    if(g.lastCompScores.has(String(id)) && !g.lastCompScores.has(id)){
      var v = g.lastCompScores.get(String(id));
      g.lastCompScores.delete(String(id));
      g.lastCompScores.set(id, +v);
    }
    if(!g.lastCompScores.has(id)){
      g.lastCompScores.set(id, 5 + rng()*5);
    }
  }
})();

var arr = [];
g.lastCompScores.forEach(function(score, pid){
  var pidNum = +pid;  // ✅ Normalize for comparison
  if(eligible.indexOf(pidNum)!==-1){
    arr.push([pidNum, +score]);
  }
});

// Fallback 1: Repopulate if empty
if(arr.length === 0 && eligible.length){
  for(var j=0;j<eligible.length;j++){
    var eid = +eligible[j];
    var s = g.lastCompScores.has(eid) ? +g.lastCompScores.get(eid) : (5 + rng()*5);
    g.lastCompScores.set(eid, s);
    arr.push([eid, s]);
  }
}

arr.sort(function(a,b){ return b[1]-a[1]; });

// Fallback 2: Pick random if still empty
if(!arr.length && eligible.length){
  var pick = eligible[Math.floor(rng()*eligible.length)];
  arr = [[pick, 0]];
}

global.game.vetoHolder = arr[0] && arr[0][0];  // ✅ Safe access
```

---

### 6. finishVetoComp() - Top-3 Reveal Defensive Check

**BEFORE:**
```javascript
var top3 = arr.slice(0, Math.min(3, arr.length));
showVetoRevealSequence(top3).then(...)
// ❌ top3 might contain null/undefined if arr was corrupted
```

**AFTER:**
```javascript
var top3 = arr.slice(0, Math.min(3, arr.length));
// Defensive: ensure shape is [id, score]
top3 = top3.filter(function(x){ return x && typeof x[0] !== 'undefined'; });
if(!top3.length && eligible.length){ top3 = [[eligible[0], 0]]; }
// ✅ Always valid entries for reveal

showVetoRevealSequence(top3).then(...)
```

---

## Impact Summary

| Area | Before | After |
|------|--------|-------|
| ID Type Consistency | ❌ Mixed string/number | ✅ Always numeric |
| Human Participation | ❌ Failed with type mismatch | ✅ Correct detection |
| Score Storage | ❌ String keys possible | ✅ Always numeric keys |
| String Key Migration | ❌ No handling | ✅ Automatic migration |
| Winner Selection | ❌ Could fail/crash | ✅ Multiple fallbacks |
| Empty Array Handling | ❌ None | ✅ Two-level fallback |
| Minigame Fallback | ❌ Could stall | ✅ Auto-submit 0 |
| Top-3 Reveal | ❌ Could crash on bad data | ✅ Defensive filtering |

## Code Size Impact

- **Total lines changed**: 64 (53 insertions, 11 deletions)
- **Files modified**: 1 (js/veto.js)
- **Test coverage added**: 415 lines (test_veto_id_normalization.html)
- **Documentation added**: 245 lines (VETO_FLOW_FIX_SUMMARY.md)

## Key Improvements

1. **Type Safety**: All IDs are normalized to numbers at entry points
2. **Resilience**: Multiple fallback layers prevent stalling
3. **Migration**: Handles legacy string keys gracefully
4. **Defensive Programming**: Validates data at critical points
5. **Minimal Changes**: Surgical fixes without refactoring
