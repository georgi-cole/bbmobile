# Inline Evict Refactor - Implementation Summary

## Overview

This refactor eliminates the separate bottom CTA for ALL 2-nominee Live Vote 2.0 flows and converts each nominee's name label into a semantic inline button that supports a select → confirm vote pattern with dynamic instructions.

## Visual Comparison

### Before (Legacy Implementation)

```
┌─────────────────────────────────────────────────┐
│  Live Vote                                      │
│  ┌──────────────┐         ┌──────────────┐    │
│  │   [Avatar]   │         │   [Avatar]   │    │
│  │              │         │              │    │
│  │    Alice     │  VS     │     Bob      │    │  <-- Static div
│  │   0 votes    │         │   0 votes    │    │
│  │              │         │              │    │
│  └──────────────┘         └──────────────┘    │
│                                                 │
│  Vote feed area...                             │
│                                                 │
│  ┌─────────────────────────────────────────┐  │
│  │  [Evict Alice]      [Evict Bob]         │  │  <-- Legacy CTA dock
│  └─────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

**Issues:**
- Separate CTA buttons far below avatars
- Disconnect between nominee display and action
- Extra UI elements clutter the layout
- On some viewports, button appears too far down

### After (Inline CTA Implementation)

```
┌─────────────────────────────────────────────────┐
│  Live Vote                                      │
│  ┌──────────────┐         ┌──────────────┐    │
│  │   [Avatar]   │         │   [Avatar]   │    │
│  │              │         │              │    │
│  │   [Alice]    │  VS     │    [Bob]     │    │  <-- Button (initial)
│  │   0 votes    │         │   0 votes    │    │
│  │              │         │              │    │
│  └──────────────┘         └──────────────┘    │
│                                                 │
│  Tap on the photo of the person you want       │  <-- Dynamic instructions
│  to evict.                                     │
│                                                 │
│  Vote feed area...                             │
└─────────────────────────────────────────────────┘

After Selection:
┌─────────────────────────────────────────────────┐
│  Live Vote                                      │
│  ┌──────────────┐         ┌──────────────┐    │
│  │   [Avatar]   │         │   [Avatar]   │    │
│  │   SELECTED   │         │              │    │
│  │ [Evict Alice]│  VS     │    [Bob]     │    │  <-- Red button (confirm)
│  │   0 votes    │         │   0 votes    │    │
│  │              │         │              │    │
│  └──────────────┘         └──────────────┘    │
│                                                 │
│  You are about to evict Alice.                 │  <-- Confirmation message
│  Tap again to confirm.                         │
│                                                 │
│  Vote feed area...                             │
└─────────────────────────────────────────────────┘
```

**Benefits:**
- Direct action on nominee element
- Clear visual feedback of selection
- Dynamic instructions guide user
- Cleaner, more compact layout
- Better mobile UX (no separate dock)

## Technical Changes

### 1. DOM Structure

#### Before:
```html
<div class="lv2-contestant left">
  <div class="lv2-avatar">...</div>
  <div class="lv2-name">Alice</div>  <!-- Static div -->
  <div class="lv2-count">0</div>
  <div class="lv2-cta-side">        <!-- Legacy CTA -->
    <button class="lv2-cta-pill">Evict</button>
  </div>
</div>
<!-- ... -->
<div class="lv2-cta-dock">           <!-- Legacy bottom dock -->
  <button>Evict Alice</button>
  <button>Evict Bob</button>
</div>
```

#### After:
```html
<div class="lv2-contestant left">
  <div class="lv2-avatar">...</div>
  <button class="lv2-name-btn" type="button">  <!-- Semantic button -->
    Alice
  </button>
  <div class="lv2-count">0</div>
</div>
<!-- ... -->
<div class="lv2-instructions">      <!-- Dynamic instructions -->
  Tap on the photo of the person you want to evict.
</div>
```

### 2. CSS Classes

#### New Classes Added:

```css
/* Base button state */
.lv2-name-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  /* Hover effects for accessibility */
}

/* Selected/evict state */
.lv2-name-btn-selected {
  background: linear-gradient(135deg, #e63946, #c1121f);
  color: #ffffff;
  font-weight: 700;
  box-shadow: 0 4px 16px rgba(230, 57, 70, 0.4);
}

/* Dynamic instruction text */
.lv2-instructions {
  text-align: center;
  font-size: 1rem;
  color: rgba(232, 244, 255, 0.8);
}
```

#### Legacy Classes Removed:
- `.lv2-cta-dock` - No longer created
- `.lv2-cta-side` - No longer created  
- `.lv2-cta-row` - No longer created
- `.lv2-cta-pill` - No longer used for 2-nominee flows

### 3. JavaScript Behavior

#### Event Flow:

1. **Initial Click on Name Button:**
   ```javascript
   nameBtn.onclick = (e) => {
     if (nameBtn.classList.contains('lv2-name-btn-selected')) {
       // Already selected - trigger evict action
       triggerEvictAction(playerId);
     } else {
       // First click - select nominee
       selectNominee(playerId, name);
     }
   };
   ```

2. **Selection Updates:**
   ```javascript
   function selectNominee(playerId, playerName) {
     // Update button visual state
     nameBtn.classList.add('lv2-name-btn-selected');
     nameBtn.textContent = 'Evict Alice';
     
     // Update instructions
     instructions.textContent = 
       'You are about to evict Alice. Tap again to confirm.';
   }
   ```

3. **Confirmation (Second Click):**
   ```javascript
   // Button is already selected, so trigger evict
   triggerEvictAction(playerId);
   // Calls the onVote callback registered in createCtaBar
   ```

### 4. Simplified Function Signatures

#### Before:
```javascript
function createCtaBar(options) {
  // Create separate CTA dock or pills
  // Different logic for carousel vs desktop
  // ~120 lines of code
}
```

#### After:
```javascript
function createCtaBar(options) {
  // Just store flags and callback
  state.isTieBreak = isTieBreak;
  state.isFinal4 = isFinal4;
  state.ctaBar = { onVote };
  return { inlineEvictionActive: true };
  // ~10 lines of code
}
```

## Accessibility Features

### 1. Semantic HTML
- Name is a `<button type="button">` element
- Proper ARIA labels for screen readers
- Focus states for keyboard navigation

### 2. Keyboard Support
- Tab to focus name button
- Enter or Space to activate
- Arrow keys for carousel navigation
- 1/2 keys for direct selection

### 3. Visual Feedback
- Hover states on buttons
- Focus outlines for keyboard users
- Color contrast for selected state
- Reduced motion support preserved

## Wording Variants

### Standard Vote
- Initial: "Tap on the photo of the person you want to evict."
- Selected: "You are about to evict [Name]. Tap again to confirm."
- Button: "Evict [Name]"

### Tie-Break (HOH)
- Initial: Same as standard
- Selected: "You are about to break the tie by evicting [Name]. Tap again to confirm."
- Button: "Break Tie"

### Final 4 Sole Vote
- Initial: Same as standard
- Selected: "You are about to cast your sole vote to evict [Name]. Tap again to confirm."
- Button: "Cast Sole Vote"

## Testing Coverage

### Automated Tests (15 checks)
✅ Creates .lv2-name-btn instead of .lv2-name  
✅ Creates .lv2-instructions element  
✅ Does NOT create .lv2-cta-dock for 2-nominee flows  
✅ Does NOT create .lv2-cta-side for 2-nominee flows  
✅ Does NOT create .lv2-cta-row for 2-nominee flows  
✅ CSS defines .lv2-name-btn styling  
✅ CSS defines .lv2-name-btn-selected styling  
✅ CSS defines .lv2-instructions styling  
✅ selectNominee function updates instructions text  
✅ createCtaBar uses inline button pattern  
✅ Name button has proper semantic attributes  
✅ CSS has responsive styling for new classes  
✅ Keyboard shortcuts work with name buttons  
✅ Supports tie-break wording  
✅ Supports Final 4 sole vote wording  

### Manual Test Interface
- `test_inline_evict_refactor.html` provides:
  - Standard vote scenario
  - Tie-break scenario
  - Final 4 scenario
  - Verification checklist
  - Console logging for debugging

## Backwards Compatibility

### Multi-Nominee Flows (≥3)
- Triple eviction and other multi-nominee flows **unchanged**
- Use different code paths (livevote-v2-triple.js)
- Legacy CTA elements still created for those flows

### Legacy CSS Classes
- Old classes kept in CSS for backwards compatibility
- `.lv2-name`, `.lv2-name-button`, `.lv2-instruction-text` remain
- Responsive variants preserved

## Code Quality

### Security
- ✅ CodeQL analysis: 0 alerts
- No XSS vulnerabilities introduced
- Proper event handler cleanup

### Performance
- Fewer DOM elements created
- Simplified event delegation
- No layout thrashing

### Maintainability
- Reduced code complexity (~300 lines removed)
- Clearer separation of concerns
- Better documented with inline comments

## Files Modified

1. **js/livevote-ui.js** (Major refactor)
   - 426 lines removed
   - 183 lines added
   - Net: -243 lines (36% reduction)

2. **styles.css** (Additions)
   - Added 80+ lines for new classes
   - Preserved legacy classes

3. **Test files** (New)
   - test_inline_evict_refactor.html (483 lines)
   - scripts/test-inline-evict-refactor.mjs (130 lines)

## Summary

This refactor successfully achieves the goal of eliminating separate CTAs for 2-nominee flows while:
- ✅ Improving UX with inline actions
- ✅ Maintaining accessibility standards
- ✅ Supporting all vote variants (standard, tie-break, Final 4)
- ✅ Preserving backwards compatibility
- ✅ Reducing code complexity
- ✅ Passing all validation tests
- ✅ No security vulnerabilities

The result is a cleaner, more intuitive UI that works seamlessly across all viewport sizes and device types.
