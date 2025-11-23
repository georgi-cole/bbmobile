# Intermission Card UI Updates

## Summary
Updated the intermission card visual appearance and positioning based on user feedback.

## Changes Made

### 1. Vertical Centering
**Before:** Card appeared at the bottom of the TV area (`justify-content: flex-end`)  
**After:** Card is centered vertically (`justify-content: center`)

**Files Changed:**
- `js/tv-container.js` - Updated `getOrCreateTvOverlay()` to use `justify-content: center`
- `js/ui/intermissionCard.js` - Added dynamic update for existing overlays, removed `margin-bottom`

### 2. Increased Transparency
**Before:** Background opacity 0.95 (nearly opaque)  
**After:** Background opacity 0.75 (more glassy/see-through effect)

**Change:**
```javascript
// Before
background: linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(51, 65, 85, 0.95));

// After
background: linear-gradient(135deg, rgba(30, 41, 59, 0.75), rgba(51, 65, 85, 0.75));
```

### 3. Border Removal
**Before:** `border: 2px solid rgba(96, 165, 250, 0.5);`  
**After:** `border: none;`

### 4. Updated Title Text
**Before:** `"${compType} Competition In Progress"`  
**After:**
- HOH: `"As the outgoing HOH, you cannot compete"`
- Veto: `"You were not drawn to play this week"`

**Implementation:**
```javascript
const titleText = compType === 'Veto' 
  ? 'You were not drawn to play this week'
  : 'As the outgoing HOH, you cannot compete';
title.textContent = titleText;
```

## Visual Comparison

### HOH Card
![HOH Card - Centered, No Border, Transparent](https://github.com/user-attachments/assets/6b312e16-1d6a-4b75-9189-abf7bfec54c1)

**Features:**
- ✓ Centered vertically in TV area
- ✓ No visible border
- ✓ Semi-transparent background (can see through slightly)
- ✓ Title: "As the outgoing HOH, you cannot compete"
- ✓ Body text describes Tic Tac Toe game option

### Veto Card
![Veto Card - Updated Title](https://github.com/user-attachments/assets/48259d45-9dbc-4bfc-83d6-e92cbc4e9988)

**Features:**
- ✓ Centered vertically in TV area
- ✓ No visible border
- ✓ Semi-transparent background
- ✓ Title: "You were not drawn to play this week"
- ✓ Body text describes Dots and Boxes game option

## Technical Details

### Overlay Positioning
The overlay container now uses centered flex layout with padding:
```css
position: absolute;
inset: 0;
pointer-events: none;
z-index: 100;
display: flex;
flex-direction: column;
align-items: center;
justify-content: center;  /* Changed from flex-end */
padding: 20px;  /* Added for safe area */
```

### Card Container
Removed bottom margin since centering handles positioning:
```css
pointer-events: auto;
padding: 0 16px;
max-width: 500px;
width: 100%;
animation: slideUpFade 0.4s ease-out;
/* margin-bottom: 24px; REMOVED */
```

### Dynamic Updates
For overlays created before this update, the code now dynamically applies the new positioning:
```javascript
if (overlay) {
  overlay.innerHTML = '';
  overlay.style.pointerEvents = 'none';
  overlay.style.justifyContent = 'center';  // Dynamic update
  overlay.style.padding = '20px';  // Dynamic update
}
```

## Testing

### Manual Testing
Created `test_intermission_ui_updates.html` for visual verification:
- Shows both HOH and Veto cards
- Validates centering, transparency, border removal
- Verifies correct title text for each type

### Automated Testing
- ✅ All existing tests pass
- ✅ ESLint clean (no new errors)
- ✅ No functionality broken
- ✅ Backwards compatible

## Files Modified

1. **js/ui/intermissionCard.js** (3 changes)
   - Updated card background opacity (0.95 → 0.75)
   - Removed border styling
   - Added conditional title text based on `compType`
   - Removed `margin-bottom` from card container
   - Added dynamic overlay positioning update

2. **js/tv-container.js** (2 changes)
   - Changed overlay `justify-content` from `flex-end` to `center`
   - Added `padding: 20px` for safe area spacing

3. **test_intermission_ui_updates.html** (NEW)
   - Visual test page for UI verification
   - Interactive buttons to show HOH/Veto cards
   - Checklist of expected changes

## Commit
Commit hash: `1b26121`  
Message: "Update intermission card UI: center positioning, transparency, and updated titles"

## Related
- Parent PR: Fix HOH Intermission Prompt Persistence Issue (#650)
- Original issue: Intermission prompt persisting across phases
- User feedback: Requested centered position, no border, more transparent, updated titles
