# Player Profile Modal Implementation

## Overview

This implementation adds a new game start flow that ensures:
1. Intro video plays immediately on app open
2. Rules modal displays after intro video ends
3. Player profile modal appears after rules acknowledgment
4. Cast introduction sequence starts after profile submission

## Files Modified

### 1. `js/settings.js`
- Changed `autoShowRulesOnStart` from `false` to `true` (line 22)
- This enables automatic display of rules modal after intro video

### 2. `js/rules.js`
- Modified `hideRulesModal()` function to dispatch `bb:rules:acknowledged` event (lines 303-310)
- This event signals that the user has acknowledged the rules and triggers the profile modal

### 3. `index.html`
- Added `<script defer src="js/player-profile-modal.js"></script>` after rules.js (line 245)
- This loads the new player profile modal module

### 4. `styles.css`
- Added complete styling for `.profileDim`, `.profilePanel`, `.profileTitle`, `.profileBody`, `.profileBtns` (lines 3046-3100)
- Responsive styles for mobile devices
- Consistent with existing modal design patterns

## New Files Created

### 1. `js/player-profile-modal.js` (359 lines)
A complete modal system for collecting player profile information:

**Features:**
- Photo upload with preview (supports image files, converts to data URL)
- Required name field with validation
- Optional age, location, and occupation fields
- Accessible form with ARIA attributes
- Keyboard navigation and focus trap
- Saves profile to localStorage for persistence
- Updates human player object with profile data
- Triggers opening sequence on submission

**Key Functions:**
- `ensureModal()` - Creates modal DOM structure
- `showProfileModal()` - Displays modal with saved data if available
- `startWithProfile()` - Validates and processes profile submission
- `hideProfileModal()` - Closes modal with animation
- `setupRulesListener()` - Listens for rules acknowledgment event

**Accessibility Features:**
- ARIA roles (`role="dialog"`, `aria-modal="true"`, `aria-labelledby`)
- Focus management (traps focus within modal)
- Keyboard shortcuts (Tab, Shift+Tab, Escape)
- Touch targets meet WCAG 2.1 AA (44px minimum height)
- Screen reader friendly labels

**Integration:**
- Listens for `bb:rules:acknowledged` event from rules.js
- Updates `window.game.cfg.humanName` with profile name
- Updates human player object directly with all profile fields
- Calls `global.updateHud()` and `global.renderPanel()` to refresh UI
- Triggers `global.startOpeningSequence()` after profile submission

### 2. `test_player_profile_flow.html` (130 lines)
A test page for verifying the complete flow:
- Simulates intro finish event
- Simulates rules acknowledge event
- Checks player data in localStorage and game object
- Clears storage for fresh testing
- Event logging for debugging

## Flow Diagram

```
App Start
    ↓
Intro Video Plays
    ↓
[User skips or video ends]
    ↓
Dispatch: bb:intro:finished
    ↓
Rules Modal Shows (autoShowRulesOnStart=true)
    ↓
[User clicks OK]
    ↓
Dispatch: bb:rules:acknowledged
    ↓
Player Profile Modal Shows
    ↓
[User fills profile and clicks Start Game]
    ↓
- Save profile to localStorage
- Update game.cfg.humanName
- Update human player object
- Update HUD and panel
    ↓
Start Opening Sequence
    ↓
Cast Introduction Cards Show on TV
```

## Data Flow

### Profile Storage (localStorage)
```javascript
{
  "name": "Alex",
  "age": "28",
  "location": "New York, USA",
  "occupation": "Software Developer",
  "avatar": "data:image/png;base64,..." // or null
}
```

### Player Object Updates
```javascript
humanPlayer.name = profile.name;
humanPlayer.age = profile.age;
humanPlayer.location = profile.location;
humanPlayer.occupation = profile.occupation;
humanPlayer.meta = {
  age: 28,
  location: "New York, USA",
  occupation: "Software Developer"
};
```

## Testing Instructions

1. **Fresh Start Test:**
   - Clear browser storage (localStorage and sessionStorage)
   - Reload the page
   - Intro video should play
   - Rules modal should appear after intro
   - Profile modal should appear after acknowledging rules
   - Fill in profile and click "Start Game"
   - Verify cast introduction starts
   - Verify player name shows in roster

2. **Saved Profile Test:**
   - Complete flow once
   - Reload page
   - Profile modal should pre-fill with saved data
   - Can modify and resubmit

3. **Accessibility Test:**
   - Tab through form fields
   - Press Escape to close (starts with defaults)
   - Verify focus trap works
   - Test with screen reader

4. **Mobile Test:**
   - Test on mobile device or responsive view
   - Verify touch targets are adequate (44px minimum)
   - Test photo upload from camera
   - Verify modal fits screen properly

## Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- ES6+ features used (arrow functions, template literals, async/await)
- FileReader API for photo upload
- CustomEvent for event dispatching
- localStorage and sessionStorage for persistence

## Future Enhancements

1. Photo cropping/resizing before upload
2. Validation for age (must be 18+)
3. Character limits for text fields
4. Profile editing after game starts
5. Multiple profile presets
6. Social media integration for avatars
7. Profile sharing/export
