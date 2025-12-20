# Audio Assets for Eviction Modal

This directory contains optional audio files used by the dramatic eviction modal.

## Expected Files

### tick.wav
- **Purpose**: Played during vote counting animation
- **Recommended specs**: 
  - Format: WAV (uncompressed)
  - Duration: 50-100ms (short tick/click sound)
  - Sample rate: 44.1kHz or 48kHz
  - Bit depth: 16-bit
  - File size: Should be < 50KB
- **Usage**: Plays every few ticks during the animated vote count to add audio feedback

### reveal.wav
- **Purpose**: Played when the evicted player's name is revealed
- **Recommended specs**:
  - Format: WAV (uncompressed)
  - Duration: 500ms - 1.5s (dramatic reveal sound)
  - Sample rate: 44.1kHz or 48kHz
  - Bit depth: 16-bit
  - File size: Should be < 200KB
- **Usage**: Plays once when the name appears with the scale/glow animation

## Notes

- **Optional**: The eviction modal works perfectly fine without these audio files. If they are not present, the modal will simply display without sound effects.
- **Graceful degradation**: The JavaScript module attempts to load these files but catches errors silently, ensuring the modal always functions.
- **Format**: WAV files are recommended for best compatibility across browsers without needing codec support.
- **Volume**: Audio is pre-configured at reasonable volumes (tick: 0.3, reveal: 0.5) to avoid startling users.

## Installation

1. Obtain or create short audio clips that match the specs above
2. Name them exactly as `tick.wav` and `reveal.wav`
3. Place them in this directory (`/assets/audio/`)
4. Test using the `test_dramatic_eviction.html` page

## Example Sources

If creating your own audio:
- Use audio editing software like Audacity (free)
- For tick: Record a short click, snap, or use a UI click sound
- For reveal: Try a rising tone, whoosh, or dramatic sting

Public domain audio libraries that may have suitable sounds:
- Freesound.org
- Zapsplat.com (free tier)
- BBC Sound Effects Library

## Accessibility Note

Some users may have audio disabled or prefer reduced motion. The eviction modal respects the `prefers-reduced-motion` media query and will skip animations if the user has this preference set. The modal remains fully functional and accessible without audio.
