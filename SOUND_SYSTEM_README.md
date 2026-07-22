# Sound System Architecture

## Overview
The BBMobile sound system provides comprehensive SFX playback for all game events while maintaining compatibility with the existing background music system.

## Core Components

### 1. Sound Map (`js/config/sound-map.js`)
Central configuration for all audio file mappings.

**Key Features:**
- Maps game events to audio files
- Supports flexible file extensions (mp3, mp4, wav, ogg, m4a)
- Helper functions: `getSfx()`, `getMusicForPhase()`, `playSfx()`
- Automatic settings checks (`cfg.sfxOn`, `g.getMuted()`)

**SFX Categories:**
- `ui`: Click, hover, modal open/close
- `competition`: Start buzzer, countdown, correct/wrong, results drum, winner reveal
- `voting`: Vote cast, tally tick, result drum, tiebreaker, evicted gong
- `social`: Social action, bond increase/decrease, alliance form/break
- `jury`: Member arrives, vote cast/reveal, return twist
- `finale`: Winner fanfare, confetti burst, crown placement, check reveal
- `fan_favorite`: Voting, reveal, winner
- `events`: Twist announce, double/triple eviction, week start, diary room door
- `notifications`: Your turn, timer warning, phase end

### 2. SFX Player (`js/sfx-player.js`)
Lightweight, non-blocking audio player for sound effects.

**Key Features:**
- Fire-and-forget playback (non-blocking)
- Volume control (default 0.7)
- Concurrent sound limit (max 10 sounds)
- Automatic cleanup of finished audio
- Graceful error handling

**API:**
```javascript
// Play a sound effect
SfxPlayer.play(src, volume, options);

// Stop a specific sound
SfxPlayer.stop(audio);

// Stop all active sounds
SfxPlayer.stopAll();

// Get active sound count
SfxPlayer.getActiveCount();
```

## Integration Points

### Competitions (`js/competitions.js`)
- **Start Buzzer**: When competition begins in `runHumanMinigameWithGuards()`
- **Results Drum**: Before leaderboard reveal in `showCompetitionReveal()`
- **Winner Reveal**: After results are shown

### Veto (`js/veto.js`)
- **Start Buzzer**: When veto comp begins
- **Results Drum**: Before veto results in `finishVetoComp()`
- **Winner Reveal**: After veto winner shown

### Eviction (`js/eviction.js`)
- **Vote Cast**: In `lockHumanVote()` when human votes
- **Result Drum**: Before eviction reveal in `revealVotes()`
- **Evicted Gong**: When eviction is announced

### Jury (`js/jury.js`)
- **Vote Reveal**: Each jury vote revealed in `startJuryRevealPhase()`
- **Winner Fanfare**: When winner is announced
- **Confetti Burst**: During winner celebration

### Social Maneuvers (`js/social-maneuvers.js`)
- **Social Action**: On maneuver execution in `executeAction()`
- **Bond Increase**: Significant positive relationship change (delta > 0.05)
- **Bond Decrease**: Significant negative relationship change (delta < -0.05)
- **Alliance Form**: Successful alliance formation

## Usage Examples

### Playing SFX via Sound Map
```javascript
// Play competition start buzzer
if (global.SoundMap && typeof global.SoundMap.playSfx === 'function') {
  global.SoundMap.playSfx('competition', 'start_buzzer', 0.6);
}

// Play vote cast sound
if (global.SoundMap && typeof global.SoundMap.playSfx === 'function') {
  global.SoundMap.playSfx('voting', 'cast', 0.7);
}
```

### Playing SFX Directly
```javascript
// Play from specific path
const audio = SfxPlayer.play('audio/sfx/ui/ui_click.mp3', 0.5);

// Play with callback
SfxPlayer.play('audio/sfx/voting/vote_cast.mp3', 0.7, {
  onEnd: () => console.log('Sound finished')
});
```

## Settings Integration

The sound system respects two settings:

1. **SFX On/Off** (`cfg.sfxOn`):
   - Controls whether SFX plays at all
   - Can be toggled in settings menu
   - Persisted to localStorage

2. **Global Mute** (`g.getMuted()`):
   - Controls both music and SFX
   - Toggled via mute button
   - Persisted to localStorage

Both checks are performed automatically by `SoundMap.playSfx()` and `SfxPlayer.canPlaySfx()`.

## File Organization

Audio files should be organized in the `audio/sfx/` directory:

```
audio/
├── sfx/
│   ├── ui/
│   │   ├── ui_click.mp3
│   │   ├── ui_hover.mp3
│   │   └── ...
│   ├── competition/
│   │   ├── comp_start_buzzer.mp3
│   │   ├── comp_results_drum.mp3
│   │   └── ...
│   ├── voting/
│   ├── social/
│   ├── jury/
│   ├── finale/
│   ├── fan_favorite/
│   ├── events/
│   └── notifications/
└── (background music files)
```

## Testing

### Manual Testing
Open `test_sound_system.html` in a browser to test all SFX categories interactively.

### Integration Testing
The sound system is designed to be non-intrusive:
- If audio files are missing, the system logs a warning but doesn't break
- If SFX is disabled, calls are silently ignored
- All existing tests continue to pass

## Performance Considerations

1. **Non-blocking**: SFX playback never blocks game flow
2. **Concurrent limit**: Max 10 sounds to prevent audio spam
3. **Automatic cleanup**: Finished audio elements are removed from DOM
4. **Graceful degradation**: Missing files don't break the game

## Future Enhancements

Potential future improvements:
- Audio sprite support for faster loading
- Preloading critical SFX on startup
- Spatial audio for positional effects
- Dynamic volume based on game state
- Per-category volume controls
