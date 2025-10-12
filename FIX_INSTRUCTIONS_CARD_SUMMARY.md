# Fix: instructionsCard Reference Issue

## Issue Description

**Original Problem:** The `instructionsCard` variable could be referenced inside its own assignment callback before it's assigned, creating a potential undefined reference that could cause runtime errors when the Play button is clicked.

**Root Cause:** Temporal Dead Zone (TDZ) error pattern where a callback references a variable before its assignment completes.

## The Problematic Pattern

```javascript
// WITHOUT FIX - This would cause an error:
const instructionsCard = showInstructionsInTV(gameKey, container, () => {
  // Trying to use instructionsCard here fails because:
  // 1. This callback is defined DURING the showInstructionsInTV call
  // 2. instructionsCard is assigned AFTER showInstructionsInTV returns
  // 3. Therefore, instructionsCard is undefined when callback is defined
  instructionsCard.remove(); // ERROR: Cannot read property 'remove' of undefined
});
```

## Solution Implemented

Modified `showInstructionsInTV` to pass the card element as a parameter to the `onPlay` callback, eliminating the need to reference an outer variable that hasn't been assigned yet.

### Changes Made

**File:** `js/competitions-flow.js`

1. **Updated JSDoc comment** (line 14):
   ```javascript
   // Before:
   @param {Function} onPlay - Callback when Play button is clicked
   
   // After:
   @param {Function} onPlay - Callback when Play button is clicked, receives card element as parameter
   ```

2. **Modified play button event handler** (line 121):
   ```javascript
   // Before:
   onPlay();
   
   // After:
   onPlay(card);
   ```

3. **Updated runCompetitionFlow** (line 269):
   ```javascript
   // Before:
   () => {
   
   // After:
   (card) => {
   ```

### The Fix in Action

```javascript
// WITH FIX - This works correctly:
const instructionsCard = showInstructionsInTV(gameKey, container, (card) => {
  // Now we receive the card as a parameter!
  // No need to reference the outer instructionsCard variable
  card.remove(); // ✓ Works perfectly
});
```

## Benefits

✅ **Eliminates TDZ errors** - No more referencing variables before assignment  
✅ **Better callback pattern** - Follows JavaScript best practices  
✅ **Backward compatible** - Existing code without the parameter still works  
✅ **More flexible** - Callback can now directly manipulate the card element  
✅ **Clearer intent** - Documents what the callback receives

## Testing

Created comprehensive test file: `test_competition_flow_fix.html`

### Test Coverage

1. **Test 1: Card Parameter in Callback**
   - Verifies the callback receives the card element as a parameter
   - Confirms the parameter matches the returned card element
   - ✅ PASS

2. **Test 2: No Reference Error Pattern**
   - Simulates the problematic pattern to ensure it's fixed
   - Confirms card is available via parameter (not outer variable)
   - ✅ PASS

3. **Test 3: Backward Compatibility**
   - Verifies existing code without parameter still works
   - Ensures callbacks can ignore the parameter if not needed
   - ✅ PASS

### Test Results

![All tests passing](https://github.com/user-attachments/assets/3063b3be-7069-46f5-99cb-497348e769a9)

## Impact

**Files Modified:** 1  
- `js/competitions-flow.js` (4 lines changed)

**Files Added:** 1  
- `test_competition_flow_fix.html` (comprehensive test suite)

**Breaking Changes:** None  
**Backward Compatibility:** Fully maintained

## Code Diff

```diff
@@ -11,7 +11,7 @@
    * 
    * @param {string} gameKey - The minigame key
    * @param {HTMLElement} container - Container element (typically the panel div)
-   * @param {Function} onPlay - Callback when Play button is clicked
+   * @param {Function} onPlay - Callback when Play button is clicked, receives card element as parameter
    * @returns {HTMLElement} The instructions card element
    */
   function showInstructionsInTV(gameKey, container, onPlay){
@@ -118,7 +118,7 @@
     });
     playButton.addEventListener('click', () => {
       if(typeof onPlay === 'function'){
-        onPlay();
+        onPlay(card);
       }
     });
 
@@ -265,8 +265,8 @@
     showInstructionsInTV(
       gameKey,
       container,
-      // On Play button click
-      () => {
+      // On Play button click - card parameter available if needed
+      (card) => {
         // Step 2: Launch fullscreen minigame
         launchFullscreenMinigame(gameKey, onComplete, options);
       }
```

## Verification Steps

1. ✅ Code changes are minimal and surgical
2. ✅ JSDoc updated to reflect new parameter
3. ✅ All existing usages updated for consistency
4. ✅ Comprehensive tests created and passing
5. ✅ No breaking changes introduced
6. ✅ Backward compatibility maintained

## Related

- **Issue:** #196 (PR review comment)
- **Original Discussion:** https://github.com/georgi-cole/bbmobile/pull/196#discussion_r2423384265
- **Branch:** `copilot/fix-instructions-card-reference`
