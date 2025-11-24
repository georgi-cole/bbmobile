# TV Sequence Quick Start Guide

## What is TV Sequence?

TV Sequence is a system for displaying long narrative content on the faux TV area using auto-advancing cards. Instead of overwhelming users with a wall of text, it breaks content into digestible chunks and displays them one at a time with smooth transitions.

## When to Use TV Sequence

Use TV Sequence when you have:

- **Long narratives**: Social interactions, game recaps, story events
- **Multiple paragraphs**: Content that would require scrolling
- **Important information**: That needs to be read carefully, not skimmed
- **Dramatic moments**: Where pacing matters (nominations, twists, etc.)

## Basic Usage

### 1. Simple Text Sequence

```javascript
TVSequence.start(
  `The house is in chaos tonight.
  
  Alice and Bob have formed an alliance.
  
  Charlie is playing both sides.`,
  {
    title: 'House Update'
  }
);
```

### 2. With Player Avatars

```javascript
TVSequence.start(
  `Alice has made her nominations for the week. 
  The house is shocked by her choices.`,
  {
    title: 'Nomination Ceremony',
    actorIds: [1], // Alice's player ID
    tone: 'dramatic'
  }
);
```

### 3. With Custom End Card

```javascript
TVSequence.start(
  longNarrativeText,
  {
    title: 'Week 3 Recap',
    endTitle: 'That\'s All for Now!',
    endMessage: 'Stay tuned for more drama next week.'
  }
);
```

## Common Patterns

### Pattern 1: Social Interaction Narrative

```javascript
function showSocialNarrative(actorId, targetId, action) {
  const actor = getP(actorId);
  const target = getP(targetId);
  
  const narrative = `
    ${actor.name} approached ${target.name} for a private conversation.
    
    They discussed game strategy and potential alliances.
    
    ${target.name} seemed receptive to ${actor.name}'s proposal.
  `;
  
  TVSequence.start(narrative, {
    title: 'Social Interaction',
    actorIds: [actorId, targetId],
    tone: 'casual'
  });
}
```

### Pattern 2: Competition Recap

```javascript
function showCompetitionRecap(winnerId, losers) {
  const winner = getP(winnerId);
  const loserNames = losers.map(id => getP(id).name).join(', ');
  
  const narrative = `
    The competition was intense from start to finish.
    
    ${winner.name} pulled ahead in the final moments.
    
    ${loserNames} fought hard but came up short.
    
    ${winner.name} is now Head of Household!
  `;
  
  TVSequence.start(narrative, {
    title: 'Head of Household Competition',
    actorIds: [winnerId],
    tone: 'exciting',
    endTitle: 'New HOH Crowned!',
    endMessage: 'Nominations are coming soon.'
  });
}
```

### Pattern 3: Week Recap

```javascript
function showWeeklyRecap(weekNum, events) {
  const narrative = events.map(event => event.description).join('\n\n');
  
  TVSequence.start(narrative, {
    title: `Week ${weekNum} Recap`,
    tone: 'neutral',
    endTitle: 'Week Complete',
    endMessage: 'A new week begins tomorrow.'
  });
}
```

### Pattern 4: Abort on Phase Change

```javascript
// Start a sequence
TVSequence.start(longText, { title: 'Story' });

// Abort when game phase changes
game.bus.on('phaseChange', (newPhase) => {
  TVSequence.abort();
  // Show new phase content
  showPhaseIntro(newPhase);
});
```

### Pattern 5: Manual Control

```javascript
// Show initial sequence
TVSequence.start(content, { title: 'Tutorial' })
  .then(() => {
    console.log('Tutorial sequence finished');
    // Continue with game
  });

// Give user manual control
document.getElementById('skipBtn').onclick = () => {
  TVSequence.abort();
};

document.getElementById('replayBtn').onclick = () => {
  TVSequence.replay();
};

document.getElementById('showAllBtn').onclick = () => {
  TVSequence.showAll();
};
```

## Tips and Best Practices

### Writing Good Content

1. **Use Paragraphs**: Separate ideas with blank lines
   ```javascript
   // Good
   const text = `First idea here.
   
   Second idea here.
   
   Third idea here.`;
   
   // Bad
   const text = `First idea here. Second idea here. Third idea here.`;
   ```

2. **Keep Sentences Reasonable**: Aim for 15-30 words per sentence
   ```javascript
   // Good
   "Alice nominated Bob for eviction. The house was shocked."
   
   // Bad (too long)
   "Alice nominated Bob for eviction and the house was shocked because they thought Alice and Bob were close allies but apparently Alice had other plans."
   ```

3. **Use Natural Breaks**: Let paragraphs represent scene changes or topic shifts

### Choosing Tones

Available tone options:
- `'neutral'`: Default, balanced style
- `'positive'`: Celebratory, upbeat
- `'negative'`: Somber, serious
- `'dramatic'`: Intense, high-stakes
- `'casual'`: Relaxed, informal

```javascript
// Match tone to content
TVSequence.start(evictionText, { tone: 'dramatic' });
TVSequence.start(socialChat, { tone: 'casual' });
TVSequence.start(competition, { tone: 'exciting' });
```

### Handling Avatars

```javascript
// Single actor
{ actorIds: 1 }

// Multiple actors (alliance)
{ actorIds: [1, 2, 3] }

// Direct URL (for special characters)
{ avatarUrl: 'path/to/avatar.png' }

// Show on all chunks (not just first)
{ actorIds: [1], showAvatar: true }

// Hide avatars
{ showAvatar: false }
```

### Managing Sequence Lifecycle

```javascript
// Store reference to check if sequence is active
let sequenceActive = false;

TVSequence.start(text, options)
  .then(() => {
    sequenceActive = false;
    console.log('Sequence finished');
  });

sequenceActive = true;

// Later, check before starting new sequence
if (sequenceActive) {
  TVSequence.abort();
}
TVSequence.start(newText, newOptions);
```

## Common Mistakes to Avoid

### ❌ Don't: Start sequence without checking if one is active

```javascript
// Bad
TVSequence.start(text1, options);
TVSequence.start(text2, options); // Overlapping!
```

```javascript
// Good
TVSequence.abort(); // Clear any existing sequence
TVSequence.start(text, options);
```

### ❌ Don't: Use very short content

```javascript
// Bad - not worth sequencing
TVSequence.start('Alice wins!', { title: 'Result' });
```

```javascript
// Good - use regular TV card
TVCards.showTVCard({
  title: 'Result',
  lines: ['Alice wins!'],
  duration: 2000
});
```

### ❌ Don't: Use HTML in text

```javascript
// Bad
TVSequence.start('<b>Bold text</b> here', options);
// Will display as: <b>Bold text</b> here
```

```javascript
// Good - use plain text
TVSequence.start('Bold text here', options);
```

### ❌ Don't: Forget to handle abort

```javascript
// Bad - sequence continues after phase change
game.bus.on('phaseChange', () => {
  showNewPhase();
  // Old sequence still playing!
});
```

```javascript
// Good
game.bus.on('phaseChange', () => {
  TVSequence.abort();
  showNewPhase();
});
```

### ❌ Don't: Create extremely long sequences

```javascript
// Bad - 20+ chunks is too many
const hugeText = /* 5000 word essay */;
TVSequence.start(hugeText, options);
```

```javascript
// Good - split into sections with end cards
const section1 = /* first part */;
const section2 = /* second part */;

TVSequence.start(section1, {
  title: 'Part 1',
  endTitle: 'Part 1 Complete',
  endMessage: 'Click to continue to Part 2'
}).then(() => {
  // User clicked "Show All" or "Replay", or sequence ended
  // Optionally show section 2
});
```

## Testing Your Integration

### Manual Test Checklist

- [ ] Short content displays correctly
- [ ] Long content splits into multiple chunks
- [ ] Progress indicator updates on each chunk
- [ ] Skip button advances to next chunk
- [ ] End card appears after final chunk
- [ ] Replay button restarts sequence
- [ ] Show All button displays all content
- [ ] Abort() stops sequence cleanly
- [ ] Avatars display on first chunk
- [ ] Content fits in viewport without scrolling

### Test Code

```javascript
// Quick test in browser console
TVSequence.start(
  `First paragraph.
  
  Second paragraph.
  
  Third paragraph.`,
  {
    title: 'Quick Test',
    endMessage: 'Test successful!'
  }
);
```

## Debugging

### Check Module Loaded

```javascript
console.log('TVSequence:', window.TVSequence);
// Should output: Object with start, abort, replay, showAll methods
```

### Check TV Container

```javascript
const tv = document.getElementById('tv');
const viewport = document.querySelector('.tvViewport');
const overlay = document.getElementById('tvOverlay');

console.log('TV:', tv);
console.log('Viewport:', viewport);
console.log('Overlay:', overlay);
// All should exist
```

### Watch Console Logs

The module logs helpful information:

```
[TVSequence] Module loaded
[TVSequence] Starting sequence with 5 chunks
[TVSequence] Aborting sequence
```

### Test Dwell Time

```javascript
// Calculate for specific text
const text = 'Your test content here';
const words = text.trim().split(/\s+/).length;
const dwell = 3000 + (words / 40 * 2000);
const clamped = Math.max(3000, Math.min(8000, dwell));
console.log(`Words: ${words}, Dwell: ${clamped}ms`);
```

## Performance Tips

1. **Avoid Starting Sequences Rapidly**: Wait for current sequence to finish
2. **Use Abort Before New Sequence**: Clear old sequence before starting new one
3. **Limit Content Length**: Keep sequences under 1000 words
4. **Consider User's Reading Speed**: Default timing is conservative

## Getting Help

1. Check `docs/tv-sequence-api.md` for full API reference
2. Review `test_tv_sequence.html` for examples
3. Check browser console for error messages
4. Ensure CSS file is loaded (`css/tv-sequence.css`)

## Next Steps

- Read the [Full API Reference](./tv-sequence-api.md)
- Review the [Test Suite](../test_tv_sequence.html)
- Integrate with your game events
- Customize styling to match your theme
