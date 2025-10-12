# Theatrical Intro Sequence - Asset Requirements

## Overview
The theatrical intro sequence provides a reality-TV style animated introduction for contestants with music, visual effects, and live reactions.

## Required Assets

### Audio Assets

#### 1. Premiere Music (Primary)
**File:** `/audio/premiere.mp4`
**Type:** Video file (audio track will be used)
**Purpose:** Main theatrical intro music for contestant introductions
**Fallback:** If missing, system will gracefully fall back to `intro.mp3`

**Recommendations:**
- Duration: 2-5 minutes (to cover full cast intro)
- Format: MP4 video file with audio track
- Style: Dramatic, upbeat, reality-TV theme music
- Volume: Pre-normalized to avoid clipping

**Implementation Notes:**
- Audio system supports MP4 video files and will extract/play the audio track
- Automatically fades out (800ms) when intro is skipped or completes
- Falls back to `intro.mp3` if `premiere.mp4` is not found

### Visual Assets

#### 2. Studio Background (Optional but Recommended)
**File:** `/img/studio_bg.jpg`
**Type:** JPEG image
**Purpose:** TV studio/Big Brother house background for intro sequence
**Fallback:** If missing, system will use LED-style animated gradient

**Recommendations:**
- Dimensions: 1920x1080 or higher (16:9 aspect ratio)
- Style: TV studio set, Big Brother house interior, or stage setup
- Lighting: Well-lit, vibrant, professional studio look
- File size: Under 500KB (optimize for web)

**Implementation Notes:**
- Applied at 40% opacity over base gradient
- Background-size: cover (scales to fill viewport)
- Background-position: center
- If file is missing, LED gradient animation provides dynamic fallback

## Fallback Behavior

### Audio Fallback Chain
1. **premiere.mp4** (preferred) → Main theatrical intro music
2. **intro.mp3** (fallback) → Standard opening theme
3. **Silent** (last resort) → Intro plays without music

### Visual Fallback
1. **studio_bg.jpg** (preferred) → Professional studio background
2. **LED Gradient** (automatic) → Animated multi-color gradient with pulse effect

## Installation Instructions

### Adding Assets Manually

1. **Add premiere.mp4:**
   ```bash
   # Place your premiere.mp4 file in the audio directory
   cp /path/to/your/premiere.mp4 /audio/premiere.mp4
   ```

2. **Add studio_bg.jpg:**
   ```bash
   # Create img directory if it doesn't exist
   mkdir -p /img
   
   # Place your studio background image
   cp /path/to/your/studio_bg.jpg /img/studio_bg.jpg
   ```

### Asset Verification

You can verify assets are properly loaded by:

1. **Check Console Logs:**
   - Open browser DevTools (F12)
   - Navigate to Console tab
   - Look for `[audio]` and `[introShow]` messages
   - Success: "successfully started music, file=premiere.mp4"
   - Fallback: "premiere.mp4 failed; fell back to intro.mp3"

2. **Visual Inspection:**
   - Run the intro sequence
   - Check if studio background is visible (should have photo texture)
   - If you see animated gradient only, studio_bg.jpg is missing

## File Structure

```
bbmobile/
├── audio/
│   ├── premiere.mp4          ← Add this file (primary intro music)
│   ├── intro.mp3             ✓ Exists (fallback music)
│   ├── competition.mp3       ✓ Exists
│   └── ...other tracks...
├── img/
│   └── studio_bg.jpg         ← Add this file (studio background)
├── js/
│   ├── introShow.js          ✓ Updated with new features
│   └── audio.js              ✓ Updated to support .mp4
└── styles-intro-show.css     ✓ Updated with studio background styles
```

## Technical Details

### Audio System Support
- **Formats:** MP3, MP4, OGG, WAV, M4A
- **Playback:** HTML5 Audio element with loop support
- **Fade Out:** 800ms smooth fade when skipping or completing
- **Mute State:** Respects global mute settings

### CSS Background Handling
- **Studio BG:** Applied via `background-image: url('/img/studio_bg.jpg')`
- **LED Fallback:** Applied via `::after` pseudo-element with animated gradient
- **Opacity:** Studio background at 40% to maintain card visibility
- **Animation:** LED fallback includes 8s pulse animation with hue rotation

## Browser Support

All features work on modern browsers:
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Testing

Test the intro sequence:
1. Open `test_intro_show.html` in a browser
2. Click "Test (3 Players)" to run a quick test
3. Verify music plays (should be premiere.mp4 or fallback to intro.mp3)
4. Verify background appears (studio photo or LED gradient)
5. Test skip button (music should fade out)

## Troubleshooting

### Music Not Playing
- **Check:** Is `premiere.mp4` in `/audio/` directory?
- **Check:** Browser console for 404 errors
- **Try:** Fallback to `intro.mp3` is automatic
- **Check:** Browser autoplay policy (may require user gesture)

### Studio Background Not Showing
- **Check:** Is `studio_bg.jpg` in `/img/` directory?
- **Check:** File path is `/img/studio_bg.jpg` (not `img/` or `/images/`)
- **Check:** File permissions are readable
- **Fallback:** LED gradient will show automatically

### Skip Button Not Fading Music
- **Check:** `fadeOutMusic()` function exists in audio.js
- **Check:** Browser console for fade-out errors
- **Fallback:** Music will stop immediately if fade fails

## Credits

Intro sequence features:
- ✓ Robust avatar resolution with fallback chain
- ✓ Studio background with LED gradient fallback
- ✓ Expanded reaction pool (25 spicy/funny comments)
- ✓ Premier music support with fade-out
- ✓ GSAP animations (optional, graceful fallback)
- ✓ Mobile responsive design
- ✓ Skip button with smooth transitions
