# iOS Sound Consent Flow - Visual Guide

## User Experience Flow

### iOS Safari / Standalone Flow

```
┌─────────────────────────────────────────┐
│     User Opens Game on iOS Device       │
└─────────────┬───────────────────────────┘
              │
              v
┌─────────────────────────────────────────┐
│      Intro Hub Screen Appears           │
│  ┌───────────────────────────────────┐  │
│  │  Background: Daily Theme Image    │  │
│  │                                   │  │
│  │      ┌─────────────────┐         │  │
│  │      │   🔊 Enable     │         │  │
│  │      │     sound?      │         │  │
│  │      │                 │         │  │
│  │      │  Allow audio    │         │  │
│  │      │  to play music  │         │  │
│  │      │  and sound FX.  │         │  │
│  │      │                 │         │  │
│  │      │  ┌───────────┐ │         │  │
│  │      │  │  Allow    │ │ ← Primary │
│  │      │  └───────────┘ │         │  │
│  │      │  ┌───────────┐ │         │  │
│  │      │  │Mute for now│ │ ← Mute │
│  │      │  └───────────┘ │         │  │
│  │      └─────────────────┘         │  │
│  │                                   │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### User Clicks "Allow"

```
┌─────────────────────────────────────────┐
│   Consent Granted - Overlay Fades Out   │
└─────────────┬───────────────────────────┘
              │
              v
┌─────────────────────────────────────────┐
│     Intro Hub with Audio Enabled        │
│  ┌───────────────────────────────────┐  │
│  │  ? 🎵 🔊 ⚙️ ← Quick Icons        │  │
│  │                                   │  │
│  │      [Glass Buttons Column]       │  │
│  │       ┌─────────────┐            │  │
│  │       │    Play     │ ← Glowing  │  │
│  │       └─────────────┘            │  │
│  │       ┌─────────────┐            │  │
│  │       │    Rules    │            │  │
│  │       └─────────────┘            │  │
│  │       ┌─────────────┐            │  │
│  │       │   Profile   │            │  │
│  │       └─────────────┘            │  │
│  │                                   │  │
│  │  🎵 Intro Hub Music Playing...   │  │
│  │  🔊 Button clicks have SFX        │  │
│  │                                   │  │
│  │              📅 📰 ← Chips        │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### User Clicks "Mute for now"

```
┌─────────────────────────────────────────┐
│   Consent Denied - Overlay Fades Out    │
└─────────────┬───────────────────────────┘
              │
              v
┌─────────────────────────────────────────┐
│     Intro Hub with Audio Disabled       │
│  ┌───────────────────────────────────┐  │
│  │  ? 🔇 🔇 ⚙️ ← Icons (crossed)    │  │
│  │                                   │  │
│  │      [Glass Buttons Column]       │  │
│  │       ┌─────────────┐            │  │
│  │       │    Play     │            │  │
│  │       └─────────────┘            │  │
│  │       ┌─────────────┐            │  │
│  │       │    Rules    │            │  │
│  │       └─────────────┘            │  │
│  │                                   │  │
│  │  🔇 Music: OFF                    │  │
│  │  🔇 SFX: OFF                      │  │
│  │                                   │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

## Desktop / Non-iOS Flow

### Autoplay Allowed (No Prompt)

```
┌─────────────────────────────────────────┐
│   User Opens Game on Desktop            │
└─────────────┬───────────────────────────┘
              │
              v
┌─────────────────────────────────────────┐
│     Intro Hub with Music Playing        │
│  ┌───────────────────────────────────┐  │
│  │  ? 🎵 🔊 ⚙️                       │  │
│  │                                   │  │
│  │      [Buttons]                    │  │
│  │                                   │  │
│  │  🎵 Intro Hub Music Auto-Playing │  │
│  │  No Prompt Needed                │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### Autoplay Blocked (Shows Prompt)

```
┌─────────────────────────────────────────┐
│   User Opens Game on Desktop            │
│   (Autoplay Blocked by Browser)         │
└─────────────┬───────────────────────────┘
              │
              v
┌─────────────────────────────────────────┐
│     Consent Overlay Appears             │
│  (Same as iOS flow)                     │
│                                          │
│  bb:audio:autoplay-blocked event        │
│  triggered NotAllowedError              │
└─────────────────────────────────────────┘
```

## Icon States

### Music Icon (Top-Right)
```
ON:  🎵  (no class)
OFF: 🔇  (.is-off class → opacity: 0.45)
```

### Sound Icon (Top-Right)
```
ON:  🔊  (no class)
OFF: 🔇  (.is-off class → opacity: 0.45)
```

## Technical Flow Diagram

```
┌──────────────────────────────────────────────┐
│  IntroScreen.js - afterIntroScreenVisible()  │
└────────────┬─────────────────────────────────┘
             │
             v
       ┌────────────┐
       │  isIOS()?  │
       └─────┬──────┘
             │
     ┌───────┴────────┐
     │                │
    YES              NO
     │                │
     v                v
┌─────────────┐  ┌────────────────┐
│Check consent│  │Try autoplay    │
│  in localStorage│  │ music         │
└────┬────────┘  └────┬───────────┘
     │                │
     │           ┌────┴────┐
     │           │Blocked? │
     │           └────┬────┘
     │                │
     │           ┌────┴─────┐
     │          YES         NO
     │           │          │
     │           v          v
┌────┴──────────────┐  ┌────────┐
│Show consent overlay│  │Play ✓  │
└────┬──────────────┘  └────────┘
     │
     v
┌────────────────┐
│User clicks btn │
└────┬───────────┘
     │
┌────┴─────┐
│          │
Allow     Mute
│          │
v          v
┌──────────────┐  ┌──────────────┐
│Set '1' → LS  │  │Set '0' → LS  │
│Enable audio  │  │Disable audio │
│Start music   │  │Update icons  │
│Dispatch event│  └──────────────┘
└──────────────┘
```

## WebAudio SFX Flow

```
┌──────────────────────────────────────┐
│  IntroHubSfx.attach(hubRoot)         │
└────────────┬─────────────────────────┘
             │
             v
     ┌──────────────┐
     │Find buttons  │
     │in hub root   │
     └──────┬───────┘
            │
            v
    ┌────────────────┐
    │Attach listeners│
    │  pointerdown   │
    └────────┬───────┘
             │
             v
    ┌─────────────────┐
    │User taps button │
    └────────┬────────┘
             │
             v
    ┌─────────────────┐
    │  playClick()    │
    └────────┬────────┘
             │
    ┌────────┴────────┐
    │                 │
    v                 v
┌─────────────┐  ┌─────────────┐
│WebAudio?    │  │HTMLAudio    │
│Buffer ready?│  │Fallback     │
└──────┬──────┘  └─────────────┘
       │
      YES
       │
       v
┌──────────────────┐
│Create source     │
│Connect to gain   │
│Play immediately  │
│(<1ms latency)    │
└──────────────────┘
```

## Event Flow

```
bb:sound-consent-granted
    ├─> IntroHubSfx: Resume AudioContext, load buffer
    ├─> IntroScreen: Update icon states
    └─> audio.js: Enable music, start playback

bb:audio:autoplay-blocked
    └─> IntroScreen: Show consent overlay

introHubSfx (custom event)
    └─> IntroHubSfx: Sync enabled state
```

## LocalStorage Persistence

```
bb_sound_consent
    '1' = Granted  → Auto-enable on next launch
    '0' = Denied   → Auto-disable on next launch
    null/undefined → Show prompt again

bb_settings_cfg (JSON)
    { musicOn: true/false, sfxOn: true/false }
```

## File Sizes & Performance

```
audio/mouse-click.wav
    Size: 484 bytes
    Duration: 10ms
    Format: 22050 Hz, 16-bit mono
    Decode Time: <5ms
    Playback Latency: <1ms

audio/mouse-click-290204.mp3
    Size: 11,702 bytes (fallback)
    Duration: ~30ms
    Decode Time: 20-50ms
    Playback Latency: ~50ms

HTMLAudio Fallback
    Decode Time: N/A (streamed)
    Playback Latency: 50-100ms
```

## CSS Classes

```
.intro-consent-overlay
    Fixed overlay, blur backdrop
    z-index: 9995
    opacity: 0 → 1 (fade in)

.intro-consent-overlay--visible
    Applied when shown

.intro-consent-card
    Glass-morphism card
    Centered with animation

.intro-consent-btn--allow
    Cyan gradient, primary action

.intro-consent-btn--mute
    Subtle gray, secondary action

.intro-screen__icon-btn.is-off
    opacity: 0.45
    filter: grayscale(0.4)
```

## Browser Support Matrix

| Browser/OS | Detection | Consent | WebAudio | HTMLAudio |
|-----------|-----------|---------|----------|-----------|
| iOS Safari 11+ | ✅ | ✅ | ✅ | ✅ |
| iOS Standalone | ✅ | ✅ | ✅ | ✅ |
| Chrome Desktop | ✅ | ✅ | ✅ | ✅ |
| Firefox Desktop | ✅ | ✅ | ✅ | ✅ |
| Edge Desktop | ✅ | ✅ | ✅ | ✅ |
| Android Chrome | ✅ | ✅ | ✅ | ✅ |
| Safari Desktop | ✅ | ✅ | ✅ | ✅ |

## Accessibility

- ✅ Keyboard navigation (Tab, Enter)
- ✅ Focus indicators (3px cyan outline)
- ✅ ARIA labels and pressed states
- ✅ Screen reader announcements
- ✅ Reduced motion support
- ✅ High contrast mode
