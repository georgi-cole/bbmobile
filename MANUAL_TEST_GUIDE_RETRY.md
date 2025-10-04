# Manual Testing Guide - Avatar Resolver + Finale Enhancements Retry

## Pre-Test Setup
1. Open the game in a modern browser (Chrome/Firefox/Safari/Edge)
2. Open browser DevTools Console (F12)
3. Clear localStorage if needed: `localStorage.clear()`
4. Refresh the page

## Test 1: Avatar Resolution - Basic Functionality ✅

### Steps:
1. Start a new game
2. Open Console and run: `window.__dumpAvatarStatus()`

### Expected Results:
- Console shows a table with all players
- Each player should have an `avatarUrl` like `./avatars/Aria.png` or `./avatars/Echo.png`
- `fallback` should be `false` for players with existing PNG files (Aria, Bea, Blue, Echo, Ivy, Lux, Mimi, Nova, etc.)
- Console should show counts: `{ resolved: X, fallback: Y, total: Z }`

### Console Commands:
```javascript
// Check specific player resolution
window.Game.resolveAvatar(1)
// Should return: "./avatars/Aria.png" or similar

// Check fallback for missing player
window.Game.getAvatarFallback('TestPlayer')
// Should return: dicebear URL or local silhouette (if strict mode)
```

## Test 2: Negative Caching - No 404 Storm ✅

### Steps:
1. Start game and look at Network tab
2. Filter by "avatars"
3. Progress through a few weeks

### Expected Results:
- Each avatar file is requested ONCE maximum
- Failed requests (404) are not repeated
- Console should NOT show spam of failed avatar requests
- Status shows failed URLs in `failedUrls` array

### Console Check:
```javascript
window.__dumpAvatarStatus().failedUrls
// Should show array of failed URLs, each appearing only once
```

## Test 3: Strict Avatar Mode ✅

### Steps:
1. Open Settings (⚙️ button)
2. Click "Visual" tab
3. Enable "Strict local avatars (no external fallback)"
4. Save & Close
5. Start new game

### Expected Results:
- Missing avatars show local silhouette (grey SVG) instead of Dicebear
- Console shows: `[avatar] strict-miss player=X` for missing avatars
- No external API calls to dicebear.com in Network tab
- Status shows `strict: true`

### Console Verification:
```javascript
// Check strict mode is enabled
window.Game.game.cfg.strictAvatars
// Should return: true

// Trigger fallback for missing player
window.Game.getAvatarFallback('MissingPlayer', './avatars/missing.png')
// Should return: data:image/svg+xml... (local silhouette)
```

## Test 4: High Fallback Warning Card ✅

### Steps:
1. Ensure strict mode is OFF
2. Start game with mostly missing avatars (force scenario)
3. Wait 3 seconds after page load

### Expected Results:
- If >30% of avatars fall back, warning card appears:
  - Title: "Avatars Missing"
  - Message: "Some avatar images were not found. Using placeholders."
- Warning appears only ONCE per session
- Console shows: `[avatar] High fallback ratio: X.X%`

### Force Test (if needed):
```javascript
// Manually trigger check
window.Game.game.cfg.strictAvatars = false;
window.Game.__avatarWarningShown = false;
// Then reload and watch for warning
```

## Test 5: Enhanced Jury Reveal Logging ✅

### Steps:
1. Progress game to finale
2. Watch Console during jury voting
3. Let jury reveal sequence run

### Expected Results:
Console should show:
```
[jury] pacing totalPlannedMs=67800 cap=180000 compressed=false
[jury] voteReveal juror=5 finalist=1 scoreA=1 scoreB=0
[jury] voteReveal juror=7 finalist=1 scoreA=2 scoreB=0
[jury] voteReveal juror=3 finalist=2 scoreA=2 scoreB=1
...
```

### Verification Points:
- Each vote reveal shows both scores (scoreA and scoreB)
- Pacing summary shows total planned milliseconds
- Compression flag indicates if pacing was compressed

## Test 6: Public Favourite Winner Card ✅

### Steps:
1. Progress to finale
2. Let Public Favourite sequence complete
3. Observe winner card

### Expected Results:
- Card shows ONLY the winner (no runners-up list)
- Winner percentage has ONE decimal place (e.g., "32.4%" not "32%")
- Card includes title: "Public's Favourite Player"
- Winner avatar is large and prominent
- Console shows: `[publicFav] winner finalRaw=32.456 display=32.5`

### Visual Check:
- Large avatar at top
- Player name below avatar
- Percentage with one decimal
- "Public's Favourite Player" title
- NO list of other candidates

## Test 7: Mobile Layout - Jury Reveal ✅

### Steps:
1. Open DevTools mobile emulation (iPhone/Android)
2. Progress to jury reveal phase
3. If human is juror, try to vote

### Expected Results:
- Jury graph box is scrollable if too tall
- Vote buttons remain visible and clickable
- No fixed overlays blocking interactive elements
- Layout uses `overflow-y: auto` on mobile
- Vote buttons have proper z-index and spacing

### Mobile Dimensions to Test:
- iPhone SE (375x667)
- iPhone 12/13 (390x844)
- iPad (768x1024)
- Small Android (360x640)

### Interaction Check:
- Can scroll jury graph
- Can click vote buttons (if applicable)
- Fast-forward button is accessible
- No elements overlap vote buttons

## Test 8: Settings UI - Strict Avatars Toggle ✅

### Steps:
1. Open Settings
2. Navigate to "Visual" tab
3. Locate "Strict local avatars" checkbox

### Expected Results:
- Toggle exists under "Avatars" group in Visual tab
- Label: "Strict local avatars (no external fallback)"
- Can be toggled on/off
- Setting persists after Save & Close
- Setting applies immediately on Apply

### Persistence Check:
```javascript
// After toggling and saving
localStorage.getItem('bb_cfg_v2')
// Should contain: "strictAvatars":true or false
```

## Test 9: Integration Test Suite ✅

### Steps:
1. Open `test_avatar_resolver_enhanced.html` in browser
2. Click "Run All Tests"

### Expected Results:
- All basic function tests pass
- Multi-format tests pass
- Strict mode tests pass
- Diagnostic tests pass
- Success rate: 100%
- Console shows no errors

## Test 10: Diagnostic Function ✅

### Steps:
1. Start game
2. Open Console
3. Run: `window.__dumpAvatarStatus()`

### Expected Output:
```javascript
{
  players: [
    { id: 1, name: "Aria", avatarUrl: "./avatars/Aria.png", fallback: false },
    { id: 2, name: "Bea", avatarUrl: "./avatars/Bea.png", fallback: false },
    // ... more players
  ],
  counts: {
    resolved: 10,
    fallback: 2,
    strictMiss: 0,
    total: 12
  },
  strict: false,
  failedUrls: ["./avatars/TestPlayer.png", "./avatars/TestPlayer.jpg"]
}
```

### Table Display:
- Console shows formatted table with columns:
  - id
  - name
  - avatarUrl
  - fallback
- Summary stats displayed after table

## Common Issues & Solutions

### Issue: Avatars still show 404 errors
**Solution:** Clear browser cache and reload. Negative cache might not be populated yet.

### Issue: PNG avatars not loading
**Solution:** Check that files exist: `ls avatars/*.png` should show Aria.png, Bea.png, etc.

### Issue: Strict mode not working
**Solution:** Verify setting persisted: `window.Game.game.cfg.strictAvatars` should be `true`

### Issue: Warning card not appearing
**Solution:** Check fallback ratio: most avatars must be missing (>30%). Ensure `strictAvatars` is false.

### Issue: Mobile layout broken
**Solution:** Clear old CSS cache. Hard refresh (Ctrl+Shift+R / Cmd+Shift+R)

## Performance Checks

### Load Time:
- Initial page load: should be <3 seconds
- Avatar resolution: <10ms per player
- Diagnostic function: <100ms for 16 players

### Memory:
- Negative cache: minimal overhead (Set of strings)
- Stats object: 3 integers
- No memory leaks during repeated avatar resolution

## Browser Compatibility

### Tested Browsers:
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

### Mobile Browsers:
- ✅ Chrome Mobile
- ✅ Safari iOS
- ✅ Firefox Mobile

## Success Criteria

All tests must pass for acceptance:
- ✅ No 404 storms (negative caching works)
- ✅ Multi-format resolution (PNG first, JPG fallback)
- ✅ Strict mode available and functional
- ✅ Diagnostic function works
- ✅ High fallback warning shown when needed
- ✅ PF winner card is single-winner with decimal
- ✅ Enhanced logging present
- ✅ Mobile layout doesn't block interactions
- ✅ Settings toggle persists
- ✅ Integration tests pass

## Final Verification

Run this complete check in Console:
```javascript
// Complete system check
const check = () => {
  console.log('=== Avatar System Check ===');
  console.log('1. Functions exist:', {
    resolveAvatar: typeof window.Game?.resolveAvatar === 'function',
    getAvatarFallback: typeof window.Game?.getAvatarFallback === 'function',
    dumpStatus: typeof window.__dumpAvatarStatus === 'function'
  });
  
  console.log('2. Config:', {
    strictAvatars: window.Game?.game?.cfg?.strictAvatars
  });
  
  console.log('3. Status:');
  const status = window.__dumpAvatarStatus?.();
  
  console.log('4. Tests:', {
    resolved: status?.counts?.resolved || 0,
    fallback: status?.counts?.fallback || 0,
    total: status?.counts?.total || 0,
    ratio: status?.counts?.total > 0 
      ? ((status.counts.fallback / status.counts.total) * 100).toFixed(1) + '%'
      : 'N/A'
  });
  
  console.log('=== Check Complete ===');
};
check();
```

Expected output should show all functions exist, proper config, and reasonable stats.

---

**Testing Date:** Run on each deployment  
**Tester:** Developer / QA  
**Status:** Ready for testing
