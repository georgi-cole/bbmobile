# TV Sequence API Reference

## Overview

The TV Sequence module (`js/tv-sequence.js`) provides a Sequential Replace Auto-Advancing Cards system for displaying lengthy narrative content on the faux TV area. It automatically splits content into digestible chunks and displays them one at a time with smooth fade transitions.

## Features

- **Smart Content Splitting**: Automatically splits long text into chunks that fit the viewport
  - Splits by paragraphs first
  - Falls back to sentences if paragraphs are too long
  - Falls back to word batches (22-28 words) if sentences are too long
  - Merges short sentences (< 30 words) to avoid rapid sequences

- **Auto-Advancing**: Each chunk displays for a calculated dwell time, then fades to the next
  - Dwell time formula: `base 3.0s + (words / 40 * 2.0s)`
  - Clamped between 3s and 8s

- **Progress Indicators**:
  - Part counter (e.g., "Part 2/5") in top-right
  - Animated progress bar that fills over dwell time

- **User Controls**:
  - Skip button (top-left) to advance immediately
  - End card with Replay and Show All buttons

- **Interruption Handling**:
  - `abort()` API to cleanly stop sequences for higher-priority events

- **Accessibility**:
  - ARIA roles and labels
  - Keyboard navigation support
  - Reduced motion support

## API Reference

### `TVSequence.start(rawText, options)`

Start a sequential card sequence.

**Parameters:**

- `rawText` (string, required): The raw narrative/content text to display
- `options` (object, optional): Configuration options
  - `title` (string): Card title
  - `tone` (string): Card tone/style (e.g., 'positive', 'dramatic', 'neutral')
  - `actorIds` (number|number[]): Actor player ID(s) for avatars
  - `avatarUrl` (string): Direct avatar URL (alternative to actorIds)
  - `showAvatar` (boolean): Whether to show avatars (default: only on first chunk)
  - `endTitle` (string): End card title (default: 'Sequence Complete')
  - `endMessage` (string): End card message

**Returns:** `Promise` - Resolves when sequence completes or is aborted

**Example:**

```javascript
TVSequence.start(
  `This is the first paragraph of content.
  
  This is the second paragraph.
  
  And here is the third paragraph.`,
  {
    title: 'Week 3 Recap',
    tone: 'dramatic',
    actorIds: [1, 2],
    endTitle: 'Recap Complete',
    endMessage: 'Check back next week!'
  }
).then(() => {
  console.log('Sequence finished');
});
```

### `TVSequence.abort()`

Abort the current sequence immediately.

**Parameters:** None

**Returns:** `undefined`

**Example:**

```javascript
// Start a sequence
TVSequence.start(longText, { title: 'Story' });

// Later, abort if a phase change occurs
game.bus.on('phaseChange', () => {
  TVSequence.abort();
});
```

### `TVSequence.replay()`

Replay the current sequence from the beginning.

**Parameters:** None

**Returns:** `undefined`

**Notes:** 
- Only works if a sequence is currently active or just completed
- Automatically called by the Replay button on the end card

**Example:**

```javascript
TVSequence.replay();
```

### `TVSequence.showAll()`

Show all content at once in a scrollable stacked view.

**Parameters:** None

**Returns:** `undefined`

**Notes:**
- Only works if a sequence is currently active or just completed
- Automatically called by the Show All button on the end card
- Displays all chunks in a single scrollable card

**Example:**

```javascript
TVSequence.showAll();
```

## Configuration

The module exposes a `CONFIG` object for testing and debugging:

```javascript
TVSequence.CONFIG = {
  BASE_DWELL_MS: 3000,          // Base dwell time
  WORDS_PER_SECOND: 40,          // Words read per second (for calculation)
  WORD_TIME_MULTIPLIER: 2000,    // Multiplier for word-based time
  MIN_DWELL_MS: 3000,            // Minimum dwell time
  MAX_DWELL_MS: 8000,            // Maximum dwell time
  MIN_SENTENCE_WORDS: 30,        // Merge sentences shorter than this
  WORD_BATCH_SIZE: 25,           // Average words per batch
  WORD_BATCH_VARIANCE: 3,        // +/- variance for batches
  FADE_DURATION_MS: 400,         // Fade transition duration
  SHOW_AVATAR_FIRST_ONLY: true  // Show avatars only on first chunk
};
```

## Integration Guide

### Basic Integration

1. **Include the CSS and JS in your HTML:**

```html
<!-- In <head> -->
<link rel="stylesheet" href="css/tv-sequence.css">

<!-- Before closing </body> -->
<script defer src="js/tv-sequence.js"></script>
```

2. **Ensure TV container exists:**

```html
<div class="tv tv-screen" id="tv">
  <div class="tvViewport" data-sm-faux-tv>
    <div id="tvOverlay" class="tvOverlay">
      <div class="tvOverlayContent"></div>
    </div>
  </div>
</div>
```

3. **Start a sequence:**

```javascript
// Wait for module to load
document.addEventListener('DOMContentLoaded', () => {
  const narrative = `
    The house is buzzing with activity tonight.
    
    Alice and Bob have formed a strong alliance.
    
    Meanwhile, Charlie is playing both sides.
  `;
  
  TVSequence.start(narrative, {
    title: 'House Update',
    tone: 'dramatic'
  });
});
```

### Integration with Game Events

```javascript
// Display narrative on phase changes
game.bus.on('phaseChange', (phase) => {
  if (phase === 'social') {
    const narrative = generateSocialNarrative();
    TVSequence.start(narrative, {
      title: 'Social Hour',
      tone: 'casual'
    });
  }
});

// Abort sequence on competition start
game.bus.on('competitionStart', () => {
  TVSequence.abort();
});
```

### Integration with Player Data

```javascript
// Show narrative with player avatars
function showNominationNarrative(hohId, nomineeIds) {
  const hoh = getP(hohId);
  const nominees = nomineeIds.map(getP);
  
  const narrative = `
    ${hoh.name} has made the difficult decision to nominate 
    ${nominees.map(p => p.name).join(' and ')} for eviction.
    
    The house is shocked by these nominations.
    
    The Power of Veto competition will be crucial this week.
  `;
  
  TVSequence.start(narrative, {
    title: 'Nomination Ceremony',
    actorIds: [hohId],
    tone: 'dramatic',
    endTitle: 'Nominations Complete',
    endMessage: 'The Power of Veto competition is next.'
  });
}
```

## Content Splitting Logic

The module uses a sophisticated multi-level splitting algorithm:

### Level 1: Paragraphs

1. Split text by double newlines (`\n\n+`)
2. Check if each paragraph fits in viewport
3. If fits, use as-is; if not, proceed to Level 2

### Level 2: Sentences

1. Split paragraph into sentences (by `.`, `!`, `?`)
2. Merge consecutive short sentences (< 30 words combined)
3. Check if each sentence fits in viewport
4. If fits, use as-is; if not, proceed to Level 3

### Level 3: Word Batches

1. Split sentence into batches of ~25 words (22-28 range)
2. Randomize batch size slightly for natural pacing
3. Each batch guaranteed to be a separate chunk

### Fallback: Overflow Handling

If a single chunk still doesn't fit after all splitting:
- Show truncated preview (first 200 characters)
- Display "Show All" button immediately
- Bypass sequence mode

## Dwell Time Calculation

Dwell time is calculated based on word count to give users adequate reading time:

```
dwell_time = BASE_DWELL_MS + (word_count / WORDS_PER_SECOND * WORD_TIME_MULTIPLIER)
```

Where:
- `BASE_DWELL_MS = 3000` (3 seconds)
- `WORDS_PER_SECOND = 40`
- `WORD_TIME_MULTIPLIER = 2000` (2 seconds)

Result is clamped between 3-8 seconds.

### Examples:

| Word Count | Calculated | Clamped | Final |
|------------|------------|---------|-------|
| 10         | 3500ms     | -       | 3500ms |
| 40         | 5000ms     | -       | 5000ms |
| 80         | 7000ms     | -       | 7000ms |
| 120        | 9000ms     | 8000ms  | 8000ms |
| 200        | 13000ms    | 8000ms  | 8000ms |

## Styling Customization

The module uses CSS custom properties for theming:

```css
:root {
  --tv-seq-fade-duration: 400ms;
  --tv-seq-progress-bg: rgba(255, 255, 255, 0.15);
  --tv-seq-progress-fill: rgba(255, 255, 255, 0.9);
  --tv-seq-skip-bg: rgba(0, 0, 0, 0.4);
  --tv-seq-skip-hover-bg: rgba(0, 0, 0, 0.6);
}
```

Override these in your custom CSS to match your theme.

## Accessibility Features

### ARIA Roles and Labels

- Chunk cards: `role="article"` with `aria-label="Part X of Y"`
- Progress bar: `role="progressbar"` with `aria-valuenow`
- Skip button: `aria-label="Skip to next part"`
- End card: `role="article"` with descriptive labels

### Keyboard Navigation

- All interactive elements (cards, buttons) are keyboard accessible
- Tab order follows logical reading flow
- Enter/Space activate buttons
- ESC can be used to dismiss (optional enhancement)

### Reduced Motion Support

```css
@media (prefers-reduced-motion: reduce) {
  .tv-sequence-card {
    animation: none;
    transition: opacity 200ms ease;
  }
}
```

### High Contrast Mode

```css
@media (prefers-contrast: high) {
  .tv-sequence-progress-bar-bg {
    border: 1px solid currentColor;
  }
  
  .tv-sequence-skip-btn {
    border: 2px solid currentColor;
  }
}
```

## Testing

A comprehensive test suite is available in `test_tv_sequence.html`:

- Test 1: Short content (single chunk)
- Test 2: Medium content (multiple paragraphs)
- Test 3: Long content (multiple chunks)
- Test 4: Content with avatars
- Test 5: Skip functionality
- Test 6: Dwell time calculation
- Test 7: End card interactions
- Test 8: Abort/interrupt

Run tests by opening `test_tv_sequence.html` in a browser.

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers (iOS Safari, Chrome Android)
- Requires ES6 support
- Uses CSS custom properties
- Uses Flexbox and CSS Grid

## Performance Considerations

- Chunks are created on-demand (not all at once)
- Fade transitions use CSS transitions (GPU accelerated)
- Old cards are removed from DOM after fade out
- Progress bar animation uses CSS transitions
- No heavy JavaScript animations

## Known Limitations

1. **Viewport Size Changes**: If viewport size changes mid-sequence, cards may not fit properly. Call `TVSequence.abort()` and restart if needed.

2. **Content with HTML**: Raw text only. HTML tags will be displayed as text, not rendered.

3. **Very Long Single Sentences**: Sentences over ~200 words may still overflow even after word batching.

4. **No Pause Feature**: Sequences cannot be paused, only aborted or skipped.

## Troubleshooting

### Problem: Chunks don't fit in viewport

**Solution**: Check viewport height. Module estimates based on character count. For very tall viewports or very small text, manual splitting may be needed.

### Problem: Sequence doesn't start

**Solution**: 
- Ensure TV container exists with correct structure
- Check console for errors
- Verify `TVSequence` is loaded (`console.log(window.TVSequence)`)

### Problem: Skip button not visible

**Solution**:
- Check CSS is loaded (`css/tv-sequence.css`)
- Verify button isn't covered by other elements (z-index issue)
- Check for conflicting CSS

### Problem: Progress bar doesn't animate

**Solution**:
- Check browser supports CSS transitions
- Verify `reduced-motion` preference isn't set
- Check for CSS conflicts

## Future Enhancements

Potential future features:

1. **Pause/Resume**: Allow pausing the sequence
2. **Custom Animations**: Support for different transition effects
3. **Audio Support**: Play sound effects on chunk transitions
4. **Image Support**: Display images within chunks
5. **Interactive Choices**: Allow user to make decisions within sequence
6. **Save Progress**: Remember position in long sequences
7. **Speed Control**: Allow users to adjust dwell time multiplier

## Version History

- **v1.0.0** (2024-11-24): Initial release
  - Content splitting logic
  - Auto-advance with dwell time calculation
  - Progress indicators
  - Skip button
  - End card with Replay/Show All
  - Abort API
  - Accessibility features

## License

See project LICENSE file.
