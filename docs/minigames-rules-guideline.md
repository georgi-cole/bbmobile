# Minigame Rules Authoring Guidelines

## Overview

This document defines the mandatory standards for authoring minigame rules content. All new minigames **MUST** have rules entries added to the rules registry as part of their Definition of Done.

## Rules Registry Location

Rules are stored in: `js/minigames/rules-registry.js`

## Required Structure

Each minigame must have a rules entry with the following structure:

```javascript
gameKey: {
  title: 'Display Name',
  sections: [
    // Array of section objects
  ]
}
```

### Section Object Structure

Each section must contain:
- `h` (string): Section heading
- `p` (array, optional): Array of paragraph strings
- `list` (array, optional): Array of bullet point strings

At least one of `p` or `list` must be provided for each section.

## Mandatory Sections

Every minigame rules entry **MUST** include these five sections in order:

### 1. Goal
**Purpose**: Explain the primary objective of the game in 1-2 sentences.

**Format**: Use `p` array with a single concise paragraph.

**Example**:
```javascript
{
  h: 'Goal',
  p: ['Quickly and accurately count the number of objects appearing on screen.']
}
```

### 2. How to Play
**Purpose**: Provide step-by-step gameplay instructions.

**Format**: Use `list` array with 3-6 bullet points explaining the game flow.

**Example**:
```javascript
{
  h: 'How to Play',
  list: [
    'Objects appear briefly on screen',
    'Count how many you see',
    'Enter your count using the number pad',
    'Submit before time expires'
  ]
}
```

### 3. Controls
**Purpose**: Explain the input methods and control scheme.

**Format**: Use `p` array with clear, concise control instructions.

**Example**:
```javascript
{
  h: 'Controls',
  p: ['Use the on-screen number pad to enter your count, then tap Submit.']
}
```

### 4. Scoring
**Purpose**: Explain how points are awarded and what affects the score.

**Format**: Use `list` array for multiple scoring factors, or `p` array for simple scoring.

**Example (list)**:
```javascript
{
  h: 'Scoring',
  list: [
    'Points for each correctly placed shape',
    'Bonus for perfect patterns',
    'Fewer mistakes = higher score'
  ]
}
```

**Example (paragraph)**:
```javascript
{
  h: 'Scoring',
  p: ['Score is based on total number of taps. More taps = higher score.']
}
```

### 5. Tips
**Purpose**: Provide 2-4 helpful strategies for players.

**Format**: Use `list` array with actionable advice.

**Example**:
```javascript
{
  h: 'Tips',
  list: [
    'Focus on grouping objects mentally',
    'Practice quick counting techniques',
    'Don\'t spend too long recounting'
  ]
}
```

## Content Guidelines

### Writing Style
- **Clear and concise**: Use simple, direct language
- **Action-oriented**: Start instructions with verbs (Tap, Watch, Count, etc.)
- **Consistent terminology**: Use the same terms throughout (e.g., "tap" not "click" for mobile)
- **No jargon**: Avoid technical terms; assume player knows nothing about the game

### Length Guidelines
- **Goal**: 1-2 sentences maximum
- **How to Play**: 3-6 bullet points
- **Controls**: 1-2 sentences
- **Scoring**: 2-4 bullet points or 1-2 sentences
- **Tips**: 2-4 bullet points

### Accessibility Considerations
- Describe controls in both visual and functional terms
- Mention alternative input methods if available
- Avoid color-only descriptions (e.g., "red button" → "red stop button")

## Integration Steps

### 1. Add Rules Entry
Add your rules object to `RULES` in `js/minigames/rules-registry.js`:

```javascript
const RULES = {
  // ... existing entries
  
  yourGameKey: {
    title: 'Your Game Name',
    sections: [
      { h: 'Goal', p: ['...'] },
      { h: 'How to Play', list: ['...'] },
      { h: 'Controls', p: ['...'] },
      { h: 'Scoring', list: ['...'] },
      { h: 'Tips', list: ['...'] }
    ]
  }
};
```

### 2. Test Rules Display
1. Load the game in the browser
2. Start a competition or open the debug panel (Ctrl+Shift+D)
3. Select your game
4. Click the "Rules" button
5. Verify all sections display correctly
6. Test ESC key, close button, and outside click

### 3. Verify Accessibility
- Tab through the modal with keyboard
- Verify focus trap works (Tab cycles within modal)
- Verify ESC key closes modal
- Verify focus returns to Rules button after closing
- Test with screen reader if possible

## Runtime API

The rules system provides these global functions:

### `window.showMinigameRules(key)`
Opens the rules modal for the specified minigame key.

**Parameters**:
- `key` (string): Minigame registry key

**Example**:
```javascript
window.showMinigameRules('quickTap');
```

### `window.attachRulesButton(playButton, key)`
Attaches a Rules button next to an existing Play button.

**Parameters**:
- `playButton` (HTMLElement): The Play button element
- `key` (string): Minigame registry key

**Example**:
```javascript
const playBtn = document.querySelector('.play-button');
window.attachRulesButton(playBtn, 'quickTap');
```

**Note**: This function defends against duplicate injection by checking for existing Rules buttons with `data-role="rules-btn"`.

## Definition of Done

A minigame is **NOT** considered complete until:

1. ✅ Rules entry exists in `js/minigames/rules-registry.js`
2. ✅ All five mandatory sections are present (Goal, How to Play, Controls, Scoring, Tips)
3. ✅ Rules display correctly in the modal
4. ✅ Rules button appears next to Play button in competition UI
5. ✅ Rules button appears in debug panel test tab
6. ✅ Accessibility features work (ESC key, focus trap, ARIA labels)
7. ✅ No console errors when opening/closing rules
8. ✅ Fallback message displays if rules are missing (tested by temporarily removing entry)

## Examples

See the existing entries in `js/minigames/rules-registry.js` for complete examples:
- `quickTap` - Simple scoring game
- `memoryMatch` - Memory-based game
- `tetris` - Complex puzzle game
- `minesweeps` - Logic puzzle with multiple control types
- `hangman` - Word game with keyboard interaction

## Testing Checklist

Use this checklist when adding new rules:

- [ ] Rules entry added to registry with correct key
- [ ] Title matches game display name
- [ ] All five mandatory sections present
- [ ] Content follows length guidelines
- [ ] No spelling or grammar errors
- [ ] Rules button appears in competition UI
- [ ] Rules button appears in debug panel
- [ ] Modal opens with correct content
- [ ] ESC key closes modal
- [ ] Close button (×) closes modal
- [ ] Clicking outside modal closes it
- [ ] Focus returns to Rules button after closing
- [ ] No duplicate Rules buttons appear
- [ ] Fallback tested (temporarily remove entry)
- [ ] No console errors

## Troubleshooting

### Rules Button Not Appearing
- Verify scripts are loaded in correct order in `index.html`
- Check browser console for JavaScript errors
- Verify `window.attachRulesButton` is defined

### Modal Not Opening
- Check that rules entry exists with correct key
- Verify `window.showMinigameRules` is defined
- Check browser console for errors

### Missing Rules Fallback
- If no rules entry exists, modal shows "Rules Not Available" message
- This is by design - add the rules entry to fix

### Duplicate Rules Buttons
- Should not happen due to `data-role="rules-btn"` check
- If it does, check that `attachRulesButton` is not called multiple times with force parameter

## Best Practices

1. **Write rules first**: Author rules while developing the game, not after
2. **Test early**: Verify rules display as soon as you add them
3. **Get feedback**: Have someone unfamiliar with the game read your rules
4. **Be consistent**: Follow the same structure and tone as existing entries
5. **Update as needed**: If gameplay changes, update rules immediately

## Questions?

If you have questions about rules authoring:
1. Check existing rules entries for examples
2. Review this guideline document
3. Test in the browser with the debug panel
4. Consult the main minigames documentation (`docs/minigames.md`)

---

**Remember**: Rules are part of the user experience. Clear, helpful rules make games more enjoyable and reduce player frustration. Take the time to write them well!
