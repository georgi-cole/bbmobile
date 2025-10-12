# Reality-TV Style Intro Show - Implementation Guide

## Overview

This implementation adds a dynamic, reality-TV style animated contestant introduction sequence to replace the static dual-card intro. The new intro features:

- **GSAP-powered animations**: Camera pans, zooms, depth-of-field effects, parallax backgrounds
- **Dynamic lighting**: Animated lighting sweeps and color transitions across themed backgrounds
- **Live reactions overlay**: Simulated floating comments and emoji bursts as each contestant is introduced
- **Music & SFX integration**: Hooks into the existing audio system with placeholder SFX triggers
- **Skippable sequence**: Full-width skip button that allows users to jump ahead
- **Backward compatible**: Falls back to the classic dual-card intro if GSAP is unavailable or disabled

## Files Added

### 1. `/js/introShow.js`
The main animation module that orchestrates the reality-TV intro sequence.

**Key Functions:**
- `IntroShow.play(players, onComplete)` - Start the intro sequence for an array of players
- `IntroShow.stop()` - Stop/skip the current sequence
- `IntroShow.isActive()` - Check if intro is currently playing
- `IntroShow.hasGsap()` - Check if GSAP is available

**Configuration:**
```javascript
const CONFIG = {
  cardDuration: 3500,         // ms per contestant
  transitionDuration: 800,    // ms between contestants
  reactionsPerCard: 8,        // number of floating reactions per contestant
  enableParallax: true,
  enableLighting: true,
  enableReactions: true,
  musicKey: 'theme_opening'   // audio track key
};
```

### 2. `/styles-intro-show.css`
Complete styling for the intro sequence including:
- Overlay and background layers
- Contestant card styling with glassmorphism effects
- Animated parallax backgrounds
- Lighting sweep effects
- Floating reactions (emojis and comments)
- Skip button styling
- Responsive breakpoints for mobile, tablet, and desktop
- Reduced motion preferences support

### 3. Modified Files

**`/index.html`:**
- Added GSAP 3.12.5 from CDN (cdnjs.cloudflare.com)
- Linked `styles-intro-show.css`
- Loaded `js/introShow.js` before `ui.hud-and-router.js`
- Added settings toggle: `<input id="useRealityIntro" type="checkbox" checked/> Reality-TV Intro (GSAP)`

**`/js/ui.hud-and-router.js`:**
- Modified `startOpeningSequence()` to check for reality-TV intro availability
- Automatically falls back to classic intro if GSAP unavailable or setting disabled
- Updated `skipIntro()` to handle both intro types

**`/js/ui.config-and-settings.js`:**
- Added `useRealityIntro: true` to default configuration

## How It Works

### Activation Flow

1. When `startOpeningSequence()` is called (typically after player profile creation)
2. Checks if `game.cfg.useRealityIntro` is enabled (default: true)
3. Checks if GSAP is loaded and `IntroShow` module is available
4. If both checks pass, uses reality-TV intro; otherwise falls back to classic

### Animation Sequence

For each contestant:
1. **Build card** with avatar, name, age, location, occupation
2. **Entrance animation** (0.8s): Card zooms in with 3D rotation effect
3. **Display period** (3.5s total):
   - Spotlight pulses on card
   - Avatar glow pulses
   - Camera subtly zooms
   - Reactions spawn (emojis float up, comments appear and fade)
4. **Exit animation** (0.8s): Card fades out with rotation
5. **Transition** to next contestant

**Parallel effects:**
- Background parallax layers continuously animate
- Lighting sweeps cross the screen periodically
- Music plays throughout (uses existing audio system)

### Skip Functionality

- Skip button appears in bottom-right corner throughout sequence
- Clicking skip:
  - Stops all animations
  - Clears timeouts
  - Removes overlay
  - Triggers `onComplete` callback to continue game flow

## Testing Instructions

### Method 1: In-Game Testing

1. **Start fresh game:**
   - Open the game in browser
   - Click Settings (⚙️) button
   - Go to "Manage" tab → "Restart Season"
   
2. **Create player profile:**
   - Fill in name, age, location, occupation
   - Click "Start New Season"
   
3. **Observe intro:**
   - Reality-TV intro should play automatically
   - Each contestant appears with animations
   - Reactions and comments appear
   - Background animates with parallax and lighting

4. **Test skip button:**
   - Click "⏩ SKIP INTRO" button during sequence
   - Should immediately skip to next phase

### Method 2: Toggle Between Intro Types

1. **Disable reality-TV intro:**
   - Open Settings
   - Go to "Features" tab
   - Uncheck "Reality-TV Intro (GSAP)"
   - Restart game
   - Should see classic dual-card intro

2. **Re-enable reality-TV intro:**
   - Open Settings
   - Check "Reality-TV Intro (GSAP)"
   - Restart game
   - Should see animated reality-TV intro

### Method 3: Direct API Testing

Open browser console during game and run:

```javascript
// Test with current players
const players = window.game?.players || [];
if (players.length > 0) {
  window.IntroShow.play(players.slice(0, 3), () => {
    console.log('Intro completed!');
  });
}

// Check if GSAP is available
console.log('GSAP available:', window.IntroShow.hasGsap());

// Stop current intro
window.IntroShow.stop();

// Check if intro is active
console.log('Intro active:', window.IntroShow.isActive());
```

### Method 4: Test Page (Create your own)

Create `test_intro_show.html` in project root:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Intro Show Test</title>
  <link rel="stylesheet" href="styles-intro-show.css">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
</head>
<body>
  <button id="testBtn" style="position:fixed;top:20px;left:20px;z-index:10000;padding:10px 20px;">
    Test Intro
  </button>
  
  <script src="js/introShow.js"></script>
  <script>
    const mockPlayers = [
      { name: 'Alice', age: '25', location: 'New York', occupation: 'Designer', avatar: 'https://api.dicebear.com/6.x/bottts/svg?seed=Alice' },
      { name: 'Bob', age: '28', location: 'Los Angeles', occupation: 'Developer', avatar: 'https://api.dicebear.com/6.x/bottts/svg?seed=Bob' },
      { name: 'Charlie', age: '30', location: 'Chicago', occupation: 'Teacher', avatar: 'https://api.dicebear.com/6.x/bottts/svg?seed=Charlie' }
    ];
    
    document.getElementById('testBtn').addEventListener('click', () => {
      window.IntroShow.play(mockPlayers, () => {
        alert('Intro completed!');
      });
    });
  </script>
</body>
</html>
```

Then open in browser and click "Test Intro" button.

## Customization

### Adjust Animation Timing

Edit `/js/introShow.js`:

```javascript
const CONFIG = {
  cardDuration: 3500,      // Change per-contestant display time
  transitionDuration: 800, // Change transition speed
  reactionsPerCard: 8,     // Change number of reactions
  // ... other settings
};
```

### Modify Reactions

**Add more emojis:**
```javascript
const EMOJI_POOL = ['🔥', '❤️', '👏', '😍', '🎉', '⭐', '💯', '👑', '🎊', '✨', '💪', '🙌', /* add more here */];
```

**Add more comment templates:**
```javascript
const COMMENT_TEMPLATES = [
  'OMG {name}!',
  '{name} is amazing!',
  /* add more templates here */
];
```

### Change Colors/Themes

Edit `/styles-intro-show.css`:

- Background gradients: `.intro-show-overlay`
- Card colors: `.intro-contestant-card`
- Lighting color: `.intro-lighting-sweep`
- Button styling: `.intro-skip-btn`

### Add Sound Effects

The module has placeholders for SFX. To implement:

1. Create `window.playSFX(key)` function in audio system
2. Add sound files to `/audio/` directory
3. The intro will automatically call:
   - `playSFX('intro_whoosh')` at sequence start
   - `playSFX('card_whoosh')` for each card reveal

## Browser Compatibility

- **GSAP**: Works in all modern browsers (Chrome, Firefox, Safari, Edge)
- **CSS**: Uses modern CSS features (backdrop-filter, CSS gradients)
- **Fallback**: Classic intro used if GSAP unavailable
- **Mobile**: Fully responsive with specific breakpoints
- **Performance**: Optimized for 60fps on desktop, smooth on mobile

## Accessibility

- **Reduced motion**: Respects `prefers-reduced-motion` media query
- **Skip button**: Always accessible via keyboard (focusable, ARIA label)
- **Semantic HTML**: Proper button element with ARIA attributes
- **Color contrast**: Meets WCAG AA standards

## Troubleshooting

### Intro doesn't start
1. Check browser console for errors
2. Verify GSAP loaded: `typeof gsap !== 'undefined'`
3. Check setting enabled: Open Settings → Features → "Reality-TV Intro (GSAP)" checked
4. Verify players exist: `window.game?.players?.length > 0`

### Skip button not working
1. Check if button is visible: Look for `intro-skip-btn` element
2. Check console for click handler errors
3. Try pressing it multiple times (debouncing may be needed)

### Animations laggy
1. Close other browser tabs
2. Check device performance (mobile may be slower)
3. Disable parallax: Set `CONFIG.enableParallax = false` in introShow.js
4. Reduce reactions: Set `CONFIG.reactionsPerCard = 3` in introShow.js

### GSAP not loading
1. Check network connectivity
2. Check browser console for CDN errors
3. Try different CDN or download GSAP locally
4. Fallback to classic intro should work automatically

## Future Enhancements

Potential additions (not implemented):
- Per-contestant theme music snippets
- More animation variations (slide from sides, spiral, etc.)
- Interactive reactions (let users click to add emoji)
- Video background support
- Integration with player stats/achievements display
- Smooth transition to HOH competition preview

## Credits

- **GSAP**: GreenSock Animation Platform (https://greensock.com/gsap/)
- **Dicebear**: Avatar API for fallback avatars
- **Emoji**: Unicode emoji from standard emoji sets

---

**Last Updated:** 2025-10-12  
**Module Version:** 1.0.0  
**GSAP Version:** 3.12.5
