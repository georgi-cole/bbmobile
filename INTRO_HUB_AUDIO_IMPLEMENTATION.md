# Intro Hub Audio Implementation

## Overview
This document describes the improved audio behavior for the Intro Hub, ensuring consistent and intuitive music and sound effects across all platforms.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Intro Hub Shows                        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
        ┌────────────────────────┐
        │  syncQuickIconStates() │
        │  (Initialize from cfg) │
        └────────────┬───────────┘
                     │
                     ▼
        ┌────────────────────────┐
        │  ensureLobbyMusic()    │
        │  Request intro_hub     │
        └────────────┬───────────┘
                     │
         ┌───────────┴──────────┐
         │                      │
         ▼                      ▼
    ┌────────┐          ┌──────────────┐
    │ Allowed│          │   Blocked    │
    │        │          │ (NotAllowed) │
    └───┬────┘          └──────┬───────┘
        │                      │
        ▼                      ▼
┌───────────────┐    ┌──────────────────────┐
│ Music plays   │    │ Emit Event:          │
│ immediately   │    │ bb:audio:autoplay-   │
└───────────────┘    │ blocked              │
                     └──────┬───────────────┘
                            │
                            ▼
                ┌───────────────────────┐
                │ Show Consent Overlay  │
                │ "Enable sound?"       │
                └─────┬───────────┬─────┘
                      │           │
              ┌───────┘           └────────┐
              ▼                            ▼
        ┌──────────┐              ┌────────────┐
        │  Allow   │              │ Mute for   │
        │          │              │    now     │
        └────┬─────┘              └─────┬──────┘
             │                          │
             ▼                          ▼
    ┌────────────────┐        ┌─────────────────┐
    │ Set musicOn=   │        │ Set musicOn=    │
    │ true, sfxOn=   │        │ false, sfxOn=   │
    │ true           │        │ false           │
    │                │        │                 │
    │ Start music    │        │ Stop music      │
    │                │        │                 │
    │ Emit: bb:sound-│        │ Update icons    │
    │ consent-granted│        │                 │
    └────────────────┘        └─────────────────┘
```

## Key Components

### 1. audio.js
**Responsibilities:**
- Map phase names to audio files
- Play/stop music with autoplay detection
- Emit `bb:audio:autoplay-blocked` event when blocked
- Provide toggle APIs (setMusicEnabled, setSfxEnabled)

**Key Functions:**
```javascript
attemptPlay(audioEl)
  → plays audio
  → catches NotAllowedError
  → dispatches bb:audio:autoplay-blocked event

setMusicEnabled(enabled)
  → toggles music on/off
  → resumes last track or defaults to intro_hub
  → persists to config
```

### 2. IntroScreen.js
**Responsibilities:**
- Build and show consent overlay
- Sync icon states from config
- Request lobby music on hub show
- Handle user consent choices

**Key Functions:**
```javascript
buildConsentOverlay()
  → creates overlay DOM with Allow/Mute buttons

syncQuickIconStates()
  → reads cfg.musicOn and cfg.sfxOn
  → updates icon appearance (🎵/🔇, 🔊/🔇)
  → sets is-off class and aria-pressed

ensureLobbyMusic()
  → listens for bb:audio:autoplay-blocked
  → requests intro_hub music
  → shows consent overlay if blocked

handleConsentAllow()
  → enables music and SFX
  → starts intro_hub music
  → dispatches bb:sound-consent-granted
  → syncs icon states

handleConsentMute()
  → disables music and SFX
  → syncs icon states
```

### 3. introHubSfx.js
**Responsibilities:**
- Preload click/hover SFX assets
- Attach listeners to hub buttons
- Respect sfxOn config and mute state
- Resume WebAudio context on consent

**Key Functions:**
```javascript
init()
  → creates Audio elements for hover/click
  → preloads mouse-click-290204.mp3
  → listens for bb:sound-consent-granted
  → syncs enabled state

attach(root)
  → finds all buttons in root
  → adds mouseenter/focus → playHover()
  → adds click/touchend → playClick()
```

### 4. intro.css
**New Styles:**
- `.sound-consent-overlay` - Full-screen backdrop with blur
- `.sound-consent-content` - Glass-morphism card
- `.sound-consent-btn` - Button styles
- Mobile responsive: stacked buttons

## Event Flow

### Event: bb:audio:autoplay-blocked
**Emitted by:** `audio.js` (attemptPlay function)  
**Listened by:** `IntroScreen.js` (ensureLobbyMusic function)  
**Payload:** `{ error: 'NotAllowedError' }`  
**Action:** Show consent overlay

### Event: bb:sound-consent-granted
**Emitted by:** `IntroScreen.js` (handleConsentAllow function)  
**Listened by:** `introHubSfx.js` (init function)  
**Payload:** None  
**Action:** Resume WebAudio context

### Event: introHubSfx
**Emitted by:** `IntroScreen.js` (handleAudioToggle function)  
**Listened by:** `introHubSfx.js` (wireBridge function)  
**Payload:** `{ enabled: boolean }`  
**Action:** Sync SFX enabled state

## Configuration

### Config Keys
```javascript
cfg.musicOn: boolean (default: true)
  - Controls whether music plays
  - Toggled by Music quick icon
  
cfg.sfxOn: boolean (default: true)
  - Controls whether SFX play
  - Toggled by Sound quick icon
```

### Persistence
- Stored in `localStorage` via `Config.saveStoredCfg()`
- Key: `bb_cfg_v2`
- Survives page reloads

## UI Elements

### Quick Icons (Top-Right)
```
┌─────┬─────┬─────┬─────┐
│  ?  │ 🎵  │ 🔊  │ ⚙️  │
└─────┴─────┴─────┴─────┘
```

**Music Icon (🎵/🔇):**
- ON: 🎵 (not crossed), no `is-off` class
- OFF: 🔇 (crossed), has `is-off` class
- aria-pressed: "true" when ON, "false" when OFF

**Sound Icon (🔊/🔇):**
- ON: 🔊 (not crossed), no `is-off` class
- OFF: 🔇 (crossed), has `is-off` class
- aria-pressed: "true" when ON, "false" when OFF

### Consent Overlay
```
┌─────────────────────────────────┐
│     Enable sound?               │
│                                 │
│  Enable music and sound         │
│  effects for the full Big       │
│  Brother experience.            │
│                                 │
│  ┌────────┐    ┌─────────────┐ │
│  │ Allow  │    │ Mute for now│ │
│  └────────┘    └─────────────┘ │
└─────────────────────────────────┘
```

## Testing

### Manual Test Checklist
- [ ] Load Intro Hub → icons show correct state (from config)
- [ ] If autoplay blocked → consent overlay appears
- [ ] Click "Allow" → music starts, icons enabled
- [ ] Click "Mute for now" → music stops, icons disabled
- [ ] Toggle Music OFF → music stops, icon crossed
- [ ] Toggle Music ON → music resumes, icon uncrossed
- [ ] Toggle Sound OFF → icon crossed, SFX silent
- [ ] Toggle Sound ON → icon uncrossed, SFX audible
- [ ] Hover/click buttons → hear SFX when Sound ON

### Browser Autoplay Policies
**Always Allowed:**
- Firefox (default)
- Playwright/automated browsers

**May Block:**
- Chrome (if site muted or no user interaction)
- Safari (default blocks autoplay with sound)
- Mobile browsers (iOS Safari, Chrome Mobile)

To test consent flow:
1. Open Chrome → Settings → Site Settings → Sound → Mute site
2. Load page → autoplay blocked → consent shows
3. Click Allow → music starts

## Logs

### Expected Console Logs

**On Hub Show:**
```
[IntroHub] Quick icon states synced: {musicOn: true, sfxOn: true}
[IntroHub] UI SFX attached
[IntroHub] Lobby music requested
[audio] resolveToFile phase: intro_hub -> Intro Hub music.mp3
[audio] playing file: Intro Hub music.mp3
```

**If Autoplay Blocked:**
```
[audio] Autoplay blocked; notifying listeners
[IntroHub] Autoplay blocked; showing sound consent prompt
```

**On Consent Allow:**
```
[IntroHub] User allowed sound
[audio] setMusicEnabled -> true
[audio] setSfxEnabled -> true
[audio] playing file: Intro Hub music.mp3
```

**On Toggle:**
```
[audio] setMusicEnabled -> false
[audio] stopped music, file=Intro Hub music.mp3
```

## Backward Compatibility

### Preserved Behaviors
- Music stops when transitioning away from hub
- Fade-out before starting phase music
- Mute state persists across reloads
- audio-bridge.js proxies window.game.audio → g.audio

### No Breaking Changes
- Existing code that calls `window.playIntroHubMusic()` still works
- Config flags remain the same (`musicOn`, `sfxOn`)
- Event bus integration unchanged

## Future Enhancements

Possible improvements:
- [ ] Remember user consent choice (localStorage)
- [ ] Add volume slider to consent overlay
- [ ] Preview sound samples in consent dialog
- [ ] Animate consent overlay entrance
- [ ] Add keyboard shortcuts for toggles

## References

- Problem Statement: Issue description
- Test Page: `test_intro_hub_audio_consent.html`
- Audio Asset: `audio/mouse-click-290204.mp3`
- Config Defaults: `js/config/defaults.js`
