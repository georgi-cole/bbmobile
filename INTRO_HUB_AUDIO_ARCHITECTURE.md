# Intro Hub Audio Architecture Diagram

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         BBMobile Application                             │
│                                                                          │
│  ┌────────────────┐        ┌──────────────┐       ┌─────────────────┐  │
│  │  index.html    │───────→│ Audio System │       │  Intro Hub UI   │  │
│  │                │        │              │       │                 │  │
│  │  - Loads deps  │        │ js/audio.js  │       │ IntroScreen.js  │  │
│  │  - Bootstrap   │        │              │       │                 │  │
│  └────────────────┘        └──────────────┘       └─────────────────┘  │
│         │                         │                        │             │
│         │                         │                        │             │
│         └─────────────────────────┴────────────────────────┘             │
│                                   │                                      │
│                                   ▼                                      │
│         ┌──────────────────────────────────────────────────┐            │
│         │         Startup Flow Orchestration               │            │
│         │                                                  │            │
│         │  src/startup/flow.js                             │            │
│         │  - Coordinates intro sequence                    │            │
│         │  - Plays lobby music on hub show                 │            │
│         │  - Stops/fades music on game start               │            │
│         └──────────────────────────────────────────────────┘            │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Audio System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Audio System (js/audio.js)                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  PHASE_TO_TRACK = {                                              │
│    opening: 'intro.mp3',                                         │
│    social: 'social.mp3',                                         │
│    competition: 'competition.mp3',                               │
│    // ... other phases                                           │
│  }                                                               │
│                                                                  │
│  EVENT_TO_TRACK = {                                              │
│    eviction: 'eviction.mp3',                                     │
│    twist: 'twist.mp3',                                           │
│    intro_hub: 'Intro Hub music.mp3',  ◄─── NEW                  │
│    // ... other events                                           │
│  }                                                               │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  Public API:                                                     │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  g.playMusicForPhase(nameOrFilename)                      │ │
│  │  g.stopMusic()                                             │ │
│  │  g.fadeOutMusic(duration)                                  │ │
│  │  g.setMuted(muted)                                         │ │
│  │  g.getMuted()                                              │ │
│  │  g.toggleMute()                                            │ │
│  │                                                            │ │
│  │  g.playIntroHubMusic(volume)  ◄─── NEW                    │ │
│  │  g.stopIntroHubMusic()        ◄─── NEW                    │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## SFX Module Architecture

```
┌───────────────────────────────────────────────────────────────────┐
│                  UI SFX Module (js/ui/introHubSfx.js)              │
├───────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Audio Elements:                                                   │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  hoverEl = new Audio('audio/ui_hover.mp3')  [volume: 0.75]  │ │
│  │  clickEl = new Audio('audio/ui_click.mp3')  [volume: 0.9]   │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  State Management:                                                 │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  enabled = sfxOn && !muted                                   │ │
│  │  syncEnabled() ───→ Checks cfg.sfxOn + g.getMuted()         │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  Event Listeners:                                                  │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  document.on('introHubSfx')  ───→  syncEnabled()            │ │
│  │  setInterval(syncEnabled, 4000)  (cheap fallback)            │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  Public API:                                                       │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  window.IntroHubSfx = {                                      │ │
│  │    attach(root),  // Attach to buttons                       │ │
│  │    sync()         // Sync enabled state                      │ │
│  │  }                                                            │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
└───────────────────────────────────────────────────────────────────┘
```

## Event Flow Sequence

### 1. Intro Hub Display Flow

```
User loads app
    │
    ▼
bootstrap.js initializes
    │
    ▼
StartupFlow.init()
    │
    ├─→ initCoreServices()
    │   └─→ IntroScreen.init()
    │
    ├─→ Video plays (or skips if disabled)
    │
    └─→ StartupFlow.showIntroHub()
            │
            ▼
        IntroScreen.showWithPreload()
            │
            ├─→ preloadBackground()
            │
            └─→ IntroScreen.show()
                    │
                    ├─→ Display hub (classList.add('visible'))
                    │
                    ├─→ afterIntroScreenVisible()
                    │   └─→ IntroHubSfx.attach(#introScreen)
                    │       └─→ Attaches hover/click listeners to buttons
                    │
                    └─→ [Back to StartupFlow]
                        │
                        ▼
                    Check musicOn && !muted
                        │
                        └─→ YES: g.playIntroHubMusic()
                                 │
                                 └─→ Audio element plays "Intro Hub music.mp3"
```

### 2. Button Interaction Flow

```
User hovers over button
    │
    ▼
'mouseenter' event fires
    │
    ▼
IntroHubSfx.playHover()
    │
    ├─→ Check enabled (sfxOn && !muted)
    │
    └─→ YES: play(hoverEl)
             └─→ hoverEl.play() ───→ "ui_hover.mp3" plays

─────────────────────────────────────────────────────────

User clicks button
    │
    ▼
'click' event fires (capture phase)
    │
    ▼
IntroHubSfx.playClick()
    │
    ├─→ Check enabled (sfxOn && !muted)
    │
    └─→ YES: play(clickEl)
             └─→ clickEl.play() ───→ "ui_click.mp3" plays
```

### 3. Sound Toggle Flow

```
User clicks Sound icon (🔊)
    │
    ▼
handleSoundToggle(btn)
    │
    ├─→ handleAudioToggle('sound', btn)
    │   └─→ Update button text (🔊 ↔ 🔇)
    │       Update aria-pressed attribute
    │
    └─→ Dispatch CustomEvent('introHubSfx')
            │
            ▼
        IntroHubSfx listener receives event
            │
            ▼
        IntroHubSfx.syncEnabled()
            │
            ├─→ Read cfg.sfxOn
            ├─→ Read g.getMuted()
            │
            └─→ enabled = sfxOn && !muted
                    │
                    └─→ Future button interactions respect new state
```

### 4. Game Start Flow

```
User clicks Play button
    │
    ▼
'click' event fires
    │
    ├─→ IntroHubSfx.playClick() (click sound)
    │
    └─→ bus.emit('intro:play')
            │
            ▼
        StartupFlow.enterGame()
            │
            └─→ StartupFlow.buildMainScreen()
                    │
                    ├─→ Try: g.fadeOutMusic(600)
                    │   └─→ Lobby music fades over 600ms
                    │
                    ├─→ Fallback: g.stopIntroHubMusic()
                    │   └─→ Lobby music stops immediately
                    │
                    ├─→ IntroScreen.hide()
                    │   └─→ Hub hidden
                    │
                    └─→ buildCast() / startOpeningSequence()
                            │
                            └─→ Phase music starts (normal game flow)
```

## Data Flow Diagram

```
┌──────────────┐
│  User Input  │
│   (Browser)  │
└──────┬───────┘
       │
       ▼
┌────────────────────────────────────────────┐
│         Intro Hub UI Layer                 │
│  ┌────────────────────────────────────┐    │
│  │  Quick Icons  │  Column Buttons    │    │
│  │  ───────────  │  ──────────────    │    │
│  │  Help (?)     │  Play/Continue     │    │
│  │  Music (🎵)   │  Rules             │    │
│  │  Sound (🔊)   │  Profile           │    │
│  │  Settings (⚙)│  Leaderboard       │    │
│  │               │  Credits           │    │
│  └────────────────────────────────────┘    │
└────────────┬───────────────────────────────┘
             │
             ├─→ Hover ─────→ IntroHubSfx.playHover() ──→ ui_hover.mp3
             │
             ├─→ Click ─────→ IntroHubSfx.playClick() ──→ ui_click.mp3
             │
             ├─→ Sound Toggle → CustomEvent('introHubSfx') → syncEnabled()
             │
             └─→ Play Button → StartupFlow.enterGame() → fadeOutMusic()
                                                          │
                                                          └─→ Phase music

┌─────────────────────────────────────────────────────────────────┐
│                    Configuration Layer                           │
├─────────────────────────────────────────────────────────────────┤
│  window.game.cfg = {                                             │
│    musicOn: true/false,    ◄─── Controls lobby music            │
│    sfxOn: true/false       ◄─── Controls SFX                    │
│  }                                                               │
│                                                                  │
│  window.getMuted() ────────◄─── Master mute (affects both)      │
└─────────────────────────────────────────────────────────────────┘
```

## Module Dependency Graph

```
                    index.html
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
    js/audio.js    IntroScreen.js   introHubSfx.js
         │               │               │
         │               └───────┬───────┘
         │                       │
         ▼                       ▼
    Audio Element      Button Event Listeners
         │                       │
         │                       │
         └───────────┬───────────┘
                     │
                     ▼
            StartupFlow.js (orchestration)
                     │
         ┌───────────┼───────────┐
         │           │           │
         ▼           ▼           ▼
    Play Music   Show Hub   Attach SFX
         │           │           │
         └───────────┴───────────┘
                     │
                     ▼
            User Experience
    🎵 Music + 🔊 SFX + 🎨 Visual Feedback
```

## Audio Asset Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                     Audio Assets                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  audio/                                                      │
│  ├── Intro Hub music.mp3  ────────→  Lobby background music │
│  │   (5.3 MB, full track)                                   │
│  │                                                           │
│  ├── ui_hover.mp3  ───────────────→  Button hover sound     │
│  │   (51 bytes, placeholder)                                │
│  │                                                           │
│  └── ui_click.mp3  ───────────────→  Button click sound     │
│      (51 bytes, placeholder)                                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
         │                       │                │
         │                       │                │
         ▼                       ▼                ▼
    Audio System            IntroHubSfx      IntroHubSfx
    (playIntroHub)         (hover SFX)      (click SFX)
         │                       │                │
         └───────────────────────┴────────────────┘
                                 │
                                 ▼
                    Browser Audio Context
                                 │
                                 ▼
                         🔊 User's Speakers
```

## State Machine

```
┌─────────────────────────────────────────────────────────────────┐
│                    Intro Hub Audio State Machine                 │
└─────────────────────────────────────────────────────────────────┘

    [App Load]
        │
        ▼
    ┌─────────┐
    │  INIT   │  (Audio system loading)
    └────┬────┘
         │
         ▼
    ┌────────────┐
    │ HUB_HIDDEN │  (Before hub display)
    └─────┬──────┘
          │
          │ showIntroHub()
          ▼
    ┌──────────────┐
    │  HUB_VISIBLE │◄──────┐
    │              │       │ SFX sync
    │  • Music ON  │       │
    │  • SFX ready │───────┘
    └──────┬───────┘
           │
           │ Sound toggle
           ├────────────────────┐
           │                    │
           ▼                    ▼
    ┌──────────────┐    ┌──────────────┐
    │ SFX_ENABLED  │    │ SFX_DISABLED │
    │              │    │              │
    │ • Hover ✓    │    │ • Hover ✗    │
    │ • Click ✓    │    │ • Click ✗    │
    └──────┬───────┘    └──────┬───────┘
           │                    │
           └─────────┬──────────┘
                     │
                     │ Play button
                     ▼
              ┌─────────────┐
              │ TRANSITIONING│
              │             │
              │ • Fade out  │
              │   (600ms)   │
              └──────┬──────┘
                     │
                     ▼
              ┌─────────────┐
              │  GAME_MODE  │
              │             │
              │ • Hub music │
              │   stopped   │
              │ • Phase     │
              │   music ON  │
              └─────────────┘
```

## Summary

This architecture provides:
- ✅ **Separation of Concerns**: Audio system, SFX module, UI, and orchestration are separate
- ✅ **Event-Driven**: CustomEvents for loose coupling
- ✅ **Graceful Degradation**: Fallbacks if features unavailable
- ✅ **State Management**: Proper sync between UI state and audio state
- ✅ **Performance**: Minimal overhead, audio elements created once
- ✅ **Maintainability**: Clear module boundaries, well-documented flow
- ✅ **User Experience**: Smooth transitions, respects settings, visual+audio feedback
