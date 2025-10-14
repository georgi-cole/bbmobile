# PopupManager.show() Migration Guide

## Overview

This guide provides step-by-step instructions for migrating from legacy `showCard()` calls to the centralized `PopupManager.show()` API.

## Why Migrate?

**Benefits:**
- ✅ Centralized management of all standard game popups
- ✅ Consistent styling across all popup types
- ✅ Automatic theme adaptation
- ✅ Built-in telemetry tracking
- ✅ Future-proof architecture (changes propagate automatically)
- ✅ Better accessibility features
- ✅ Queue management (no overlapping popups)

## Migration Strategy

### Safe Migration Pattern

All migrations should include a feature flag check with legacy fallback:

```javascript
if(global.PopupManager && global.game?.cfg?.popup_refresh_enabled){
  // New system
  global.PopupManager.show({
    type: 'type',
    variant: 'variant',
    title: 'Title',
    lines: ['Content'],
    tone: 'tone',
    duration: 3000
  });
} else {
  // Legacy fallback
  global.showCard('Title', ['Content'], 'tone', 3000, true);
}
```

This ensures:
1. The new system is only used when available
2. The feature flag can disable the new system
3. Legacy functionality remains intact

## Migration Examples

### 1. Nomination Ceremony

**Before:**
```javascript
global.showCard('Nomination Ceremony', [`${hoh?.name || 'HOH'} addresses the house.`], 'noms', 2400, true);
```

**After:**
```javascript
if(global.PopupManager && g.cfg?.popup_refresh_enabled){
  global.PopupManager.show({
    type: 'nominations',
    variant: 'nominations',
    title: 'Nomination Ceremony',
    lines: [`${hoh?.name || 'HOH'} addresses the house.`],
    tone: 'noms',
    duration: 2400
  });
} else {
  global.showCard('Nomination Ceremony', [`${hoh?.name || 'HOH'} addresses the house.`], 'noms', 2400, true);
}
```

### 2. Nominee Reveals

**Before:**
```javascript
global.showCard('First Nominee', ['?'], 'noms', 1800, true);
// ... later ...
global.showCard('First Nominee', [global.safeName(nomineeId)], 'noms', 2600, true);
```

**After:**
```javascript
if(global.PopupManager && g.cfg?.popup_refresh_enabled){
  global.PopupManager.show({
    type: 'nominations',
    variant: 'nominations',
    title: 'First Nominee',
    lines: ['?'],
    tone: 'noms',
    duration: 1800
  });
} else {
  global.showCard('First Nominee', ['?'], 'noms', 1800, true);
}

// ... later ...

if(global.PopupManager && g.cfg?.popup_refresh_enabled){
  global.PopupManager.show({
    type: 'nominations',
    variant: 'nominations',
    title: 'First Nominee',
    lines: [global.safeName(nomineeId)],
    tone: 'noms',
    duration: 2600
  });
} else {
  global.showCard('First Nominee', [global.safeName(nomineeId)], 'noms', 2600, true);
}
```

### 3. POV Competition Results

**Before:**
```javascript
global.showCard('Veto Results', ['Revealing top 3...'], 'veto', 2000);
// ... later ...
global.showCard('3rd Place', [safeName(playerId)], 'neutral', 2000);
// ... later ...
global.showCard('Veto Winner 🛡️', [safeName(winnerId)], 'veto', 3200);
```

**After:**
```javascript
if(global.PopupManager && global.game?.cfg?.popup_refresh_enabled){
  global.PopupManager.show({
    type: 'pov',
    variant: 'pov',
    title: 'Veto Results',
    lines: ['Revealing top 3...'],
    tone: 'veto',
    duration: 2000
  });
} else {
  global.showCard('Veto Results', ['Revealing top 3...'], 'veto', 2000);
}

// ... later ...

if(global.PopupManager && global.game?.cfg?.popup_refresh_enabled){
  global.PopupManager.show({
    type: 'pov',
    variant: 'pov',
    title: '3rd Place',
    lines: [safeName(playerId)],
    tone: 'neutral',
    duration: 2000
  });
} else {
  global.showCard('3rd Place', [safeName(playerId)], 'neutral', 2000);
}

// ... later ...

if(global.PopupManager && global.game?.cfg?.popup_refresh_enabled){
  global.PopupManager.show({
    type: 'pov',
    variant: 'pov',
    title: 'Veto Winner 🛡️',
    lines: [safeName(winnerId)],
    tone: 'veto',
    duration: 3200
  });
} else {
  global.showCard('Veto Winner 🛡️', [safeName(winnerId)], 'veto', 3200);
}
```

### 4. Eviction Results

**Before:**
```javascript
global.showCard('Tiebreak', ['We have a tie! The HOH must break it.'], 'live', 3000, true);
// ... later ...
global.showCard('HOH', [`${hoh.name}: I choose to evict ${global.safeName(evicteeId)}.`], 'live', 3000, true);
// ... later ...
global.showCard('Eviction Result', [`By a vote of ${countA} to ${countB}, ${evicteeName}, you have been evicted.`], 'evict', 3800, true);
```

**After:**
```javascript
if(global.PopupManager && global.game?.cfg?.popup_refresh_enabled){
  global.PopupManager.show({
    type: 'eviction',
    variant: 'eviction',
    title: 'Tiebreak',
    lines: ['We have a tie! The HOH must break it.'],
    tone: 'live',
    duration: 3000
  });
} else {
  global.showCard('Tiebreak', ['We have a tie! The HOH must break it.'], 'live', 3000, true);
}

// ... later ...

if(global.PopupManager && global.game?.cfg?.popup_refresh_enabled){
  global.PopupManager.show({
    type: 'eviction',
    variant: 'eviction',
    title: 'HOH',
    lines: [`${hoh.name}: I choose to evict ${global.safeName(evicteeId)}.`],
    tone: 'live',
    duration: 3000
  });
} else {
  global.showCard('HOH', [`${hoh.name}: I choose to evict ${global.safeName(evicteeId)}.`], 'live', 3000, true);
}

// ... later ...

if(global.PopupManager && global.game?.cfg?.popup_refresh_enabled){
  global.PopupManager.show({
    type: 'eviction',
    variant: 'eviction',
    title: 'Eviction Result',
    lines: [`By a vote of ${countA} to ${countB}, ${evicteeName}, you have been evicted.`],
    tone: 'evict',
    duration: 3800
  });
} else {
  global.showCard('Eviction Result', [`By a vote of ${countA} to ${countB}, ${evicteeName}, you have been evicted.`], 'evict', 3800, true);
}
```

### 5. Diary Room / Live Vote

**Before:**
```javascript
global.showCard('Diary Room', ['Please cast your vote to evict.'], 'live', 2000, true);
// ... later ...
global.showCard('Diary Room', ["It's your turn. Please cast your vote now."], 'live', 2000, true);
```

**After:**
```javascript
if(global.PopupManager && global.game?.cfg?.popup_refresh_enabled){
  global.PopupManager.show({
    type: 'live-vote',
    variant: 'live-vote',
    title: 'Diary Room',
    lines: ['Please cast your vote to evict.'],
    tone: 'live',
    duration: 2000
  });
} else {
  global.showCard('Diary Room', ['Please cast your vote to evict.'], 'live', 2000, true);
}

// ... later ...

if(global.PopupManager && global.game?.cfg?.popup_refresh_enabled){
  global.PopupManager.show({
    type: 'live-vote',
    variant: 'live-vote',
    title: 'Diary Room',
    lines: ["It's your turn. Please cast your vote now."],
    tone: 'live',
    duration: 2000
  });
} else {
  global.showCard('Diary Room', ["It's your turn. Please cast your vote now."], 'live', 2000, true);
}
```

### 6. Social Events

**Before:**
```javascript
// No standard pattern existed - typically used addLog or showCard
global.addLog('Taylor and Joseph shared a calm chat about the week.', 'ok');
```

**After:**
```javascript
if(global.PopupManager && global.game?.cfg?.popup_refresh_enabled){
  global.PopupManager.show({
    type: 'social',
    variant: 'social',
    title: 'Social Update',
    lines: ['Taylor and Joseph shared a calm chat about the week.'],
    tone: 'good',
    duration: 2800
  });
} else {
  global.addLog('Taylor and Joseph shared a calm chat about the week.', 'ok');
}
```

## Popup Type Mapping

| Event Type | `type` Value | `variant` Value | Common `tone` Values |
|-----------|-------------|----------------|---------------------|
| Head of Household | `'hoh'` | `'hoh'` | `'good'`, `'noms'` |
| Power of Veto | `'pov'` | `'pov'` | `'veto'`, `'good'`, `'neutral'` |
| Nominations | `'nominations'` | `'nominations'` | `'noms'` |
| Eviction | `'eviction'` | `'eviction'` | `'evict'`, `'live'` |
| Social Events | `'social'` | `'social'` | `'good'`, `'bad'`, `'neutral'` |
| Live Vote | `'live-vote'` | `'live-vote'` | `'live'`, `'good'` |
| General Info | `'info'` | `null` | `'neutral'`, `'good'`, `'bad'` |

## Tone Color Mapping

| `tone` Value | Header Color | Use Case |
|-------------|-------------|----------|
| `'good'` / `'winner'` | Green (var(--good)) | Wins, positive outcomes |
| `'bad'` / `'danger'` | Red (var(--bad)) | Losses, negative outcomes |
| `'live'` | Live color (var(--live)) | Live voting, diary room |
| `'noms'` | Accent color (var(--accent)) | Nominations, HOH ceremony |
| `'veto'` | Veto color (var(--veto)) | POV events |
| `'evict'` | Red (var(--bad)) | Evictions |
| `'neutral'` | Default | General information |

## Files Requiring Migration

### Priority 1 (Completed)
- ✅ `js/nominations.js` - Nomination ceremony popups
- ✅ `js/veto.js` - POV competition results (partial)
- ✅ `js/eviction.js` - Tiebreak and HOH vote (partial)

### Priority 2 (To Do)
- ⏳ `js/eviction.js` - Remaining eviction popups (diary room messages)
- ⏳ `js/social.js` - Social event popups
- ⏳ `js/jury.js` - Jury voting popups
- ⏳ `js/jury_return.js` - Jury return announcements
- ⏳ `js/jury_return_vote.js` - Jury return voting

### Priority 3 (Optional)
- ⏳ `js/twists.js` - Twist reveals (consider keeping special overlay)
- ⏳ `js/self-eviction.js` - Self-eviction notifications
- ⏳ `js/competitions.js` - Competition results (partial - already migrated some)

## Testing Checklist

After migrating a file:

1. ✅ **Feature Flag ON**: Test with `popup_refresh_enabled: true`
   - Popups should use new `PopupManager.show()` system
   - Check styling (border colors, header colors, animations)
   - Check auto-close timing
   - Check queue management (no overlaps)

2. ✅ **Feature Flag OFF**: Test with `popup_refresh_enabled: false`
   - Popups should fall back to legacy `showCard()`
   - Functionality should remain identical
   - No errors in console

3. ✅ **Theme Compatibility**: Test with all themes
   - Default theme
   - TV Studio
   - Modern House
   - Midnight

4. ✅ **Sequence Testing**: Test full event sequences
   - Full nomination ceremony (ceremony → wildcards → reveals → adjourned)
   - Full POV sequence (reveal → 3rd → 2nd → winner)
   - Full eviction sequence (voting → results → evicted)

5. ✅ **Visual Verification**: Use `test_popup_manager.html`
   - Verify all popup types display correctly
   - Check animations and transitions
   - Verify text readability in all themes

## Rollback Strategy

If issues arise:

1. **Disable Feature Flag**:
   ```javascript
   game.cfg.popup_refresh_enabled = false;
   ```
   This immediately reverts all popups to legacy system.

2. **Per-File Rollback**:
   Revert individual file changes while keeping the system in place.

3. **Complete Rollback**:
   Revert commits containing PopupManager.show() changes.

## Best Practices

1. **Always include feature flag check**
   - Never assume PopupManager is available
   - Always provide legacy fallback

2. **Use appropriate type and variant**
   - Match the event type to the popup type
   - This ensures correct styling and telemetry

3. **Choose correct tone**
   - Tone determines header color
   - Use consistent tones for similar events

4. **Set appropriate duration**
   - Brief info: 2000-2500ms
   - Important updates: 2800-3200ms
   - Critical events: 3600-4200ms
   - User decisions: 0 (manual close)

5. **Test thoroughly**
   - Test with feature flag on AND off
   - Test in all themes
   - Test full event sequences

## Support

For questions or issues:
- See `POPUP_MANAGER_README.md` - Complete PopupManager documentation
- See `test_popup_manager.html` - Visual examples
- See `POPUP_SYSTEM_README.md` - Overall popup system documentation
- See `docs/popup-refresh-migration-guide.md` - Original migration guide
