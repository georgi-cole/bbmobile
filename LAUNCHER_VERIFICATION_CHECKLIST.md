# Launcher Auto-Remount Verification Checklist

## Pre-flight Checks

- [x] Bootstrap module created (`js/social-maneuvers-launcher-bootstrap.js`)
- [x] Bootstrap loaded in index.html (after socialize-mobile.js, before social.js)
- [x] social.js updated to use bootstrap
- [x] CSS updated with high z-index (2147483000)
- [x] No syntax errors in JS files
- [x] Tests created (Playwright + Manual)
- [x] Documentation created

## Functional Verification

### 1. Launcher Initial Mount
- [ ] Open game (index.html or test page)
- [ ] Start social intermission phase
- [ ] Verify launcher appears in TV overlay
- [ ] Check console for: `[social-launcher] observer started`
- [ ] Verify only ONE launcher instance exists

### 2. Auto-Remount After Removal
- [ ] With social phase active
- [ ] Manually remove launcher from DOM (via DevTools or test button)
- [ ] Wait 1-2 seconds
- [ ] Verify launcher re-appears automatically
- [ ] Check console for: `[social-launcher] re-mounted after DOM change`
- [ ] Verify only ONE launcher instance exists (no duplicates)

### 3. Overlay Rebuild Resilience
- [ ] With social phase active
- [ ] Remove and recreate TV overlay element
- [ ] Wait 1-2 seconds
- [ ] Verify launcher re-appears in new overlay
- [ ] Check console for re-mount message
- [ ] Verify only ONE launcher instance exists

### 4. Observer Cleanup
- [ ] With social phase active
- [ ] End social phase (fast-forward time or wait)
- [ ] Check console for: `[social-launcher] observer stopped`
- [ ] Verify no observer errors in console
- [ ] Verify launcher removed with phase end (expected behavior)

### 5. Visibility and Interaction
- [ ] Launcher is visible (not hidden behind other elements)
- [ ] Launcher is clickable (pointer-events working)
- [ ] Launcher positioned correctly (top-right of overlay)
- [ ] HUD displays resources correctly
- [ ] "Socialize" button works when clicked

## Testing with Manual Test Page

1. Open `test_launcher_auto_remount_manual.html` in browser
2. Open DevTools console
3. Follow numbered test buttons:
   - Click "1. Initialize Game" → Should show success
   - Click "2. Start Social Phase" → Should show launcher appears
   - Click "3. Check Launcher" → Should show 1 launcher found
   - Click "4. Remove Launcher" → Should auto-remount within 1-2 seconds
   - Click "5. Rebuild Overlay" → Should survive rebuild
   - Click "6. Stop Observer" → Should show observer stopped
4. Check test results panel shows all green checkmarks
5. Review console log for proper sequence of messages

## Console Log Expected Output

```
[social-launcher] observer started
[social] ✓ Entering social_intermission phase
[social] Mounting Socialize launcher...
[Socialize] tvOverlay found
[social-launcher] re-mounted after DOM change (only if launcher removed)
...
[social-launcher] observer stopped
```

## Edge Cases to Test

- [ ] Start social phase with no TV overlay (should wait and mount when available)
- [ ] Multiple rapid removals/rebuilds (should not create duplicates)
- [ ] Phase end during remount (should cleanup cleanly)
- [ ] Social Maneuvers disabled (should not throw errors)
- [ ] SocializeMobile not loaded (should log warning, no crash)

## Browser Compatibility

Test in:
- [ ] Chrome/Chromium (primary target)
- [ ] Firefox
- [ ] Safari
- [ ] Edge

## Performance Checks

- [ ] No console errors
- [ ] No memory leaks (check DevTools Memory profiler)
- [ ] Observer disconnects properly (no lingering listeners)
- [ ] Page remains responsive during remounting
- [ ] No excessive DOM queries (< 10 queries per remount)

## Final Sign-off

- [ ] All functional tests pass
- [ ] No console errors or warnings
- [ ] Documentation is accurate
- [ ] Code follows project style
- [ ] Tests are comprehensive
- [ ] Ready for merge to feature/social-maneuvers

## Notes

Use this checklist for manual QA before merging. Automated tests cover most scenarios, but manual verification ensures the UX is smooth and performant.

For issues, check:
1. Console logs for diagnostic messages
2. DevTools Elements panel for DOM structure
3. DevTools Network panel for script loading
4. DevTools Performance panel for observer overhead
