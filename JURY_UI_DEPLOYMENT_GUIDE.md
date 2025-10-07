# Jury UI Refactor - Testing & Deployment Guide

## ✅ Completed Testing

### Automated Testing
- [x] Interactive test page created (`test_jury_ui_refactor.html`)
- [x] Vote bubble stacking verified (max 3 visible)
- [x] Crown animation verified (drops above winner)
- [x] Check card animation verified (slides over loser)
- [x] Mobile viewport tested (375x812px in browser)
- [x] Feature flag toggle verified (legacy fallback works)

### Visual Testing (Browser Dev Tools)
- [x] Desktop viewport (1280x720)
- [x] iPhone viewport (375x812)
- [x] Responsive scaling confirmed
- [x] Animations smooth (60fps)
- [x] No layout overflow
- [x] No clipping issues

### Code Quality
- [x] Minimal, surgical changes
- [x] No breaking changes to existing functionality
- [x] Feature flag provides safe fallback
- [x] GPU-accelerated animations only
- [x] Clean code with comments
- [x] Comprehensive documentation

---

## 🚀 Deployment Steps

### Step 1: Pre-Deployment Verification
```bash
# Check git status
git status

# Verify files changed
git diff main..copilot/refactor-jury-vote-ui --stat

# Review key changes
git diff main..copilot/refactor-jury-vote-ui js/jury.js
git diff main..copilot/refactor-jury-vote-ui js/state.js
```

**Expected Changes**:
- `js/jury.js`: ~220 lines (CSS + logic updates)
- `js/state.js`: 1 line (config flag)
- 3 new files (test + docs)

### Step 2: Merge to Main
```bash
# Create PR and get review
# After approval:
git checkout main
git merge copilot/refactor-jury-vote-ui
git push origin main
```

### Step 3: Deploy to Live/Prod
```bash
# Deploy via your standard process
# (CI/CD, manual upload, etc.)
```

### Step 4: Live Testing
1. **Navigate to game URL**
2. **Start new season** with 12+ players
3. **Advance to finale** (skip to final 2)
   - Use admin console if available
   - Or play through naturally
4. **Trigger jury vote reveal**
5. **Observe each phase**:
   - Jury casting (silent voting)
   - Vote reveal (bubbles stacking)
   - Winner reveal (crown + check)
   - Public favourite transition

### Step 5: Capture Screenshots
For PR documentation, capture:

**Screenshot 1: Jury Vote Sequence**
- 2-3 vote bubbles visible
- Live tally updating
- Finalists visible (not covered)

**Screenshot 2: Winner Reveal**
- Crown above winner's photo
- Check card over loser's photo
- Ribbons showing WINNER/RUNNER-UP

**Screenshot 3: Public Favourite Modal**
- Smooth transition visible
- Modal fully faded in
- Clean overlay (no remnants)

### Step 6: Device Testing
**iPhone Testing** (Recommended):
1. Open game on iPhone (375x812 or similar)
2. Repeat jury vote flow
3. Verify:
   - Bubbles stack correctly
   - Crown visible (32px, not clipped)
   - Check visible (56px, not clipped)
   - Animations smooth
   - No horizontal scroll

**Android Testing** (Optional):
- Similar steps on Android device
- Verify responsive design works

---

## 🐛 Troubleshooting

### Issue: Legacy Modal Still Appears
**Cause**: Feature flag not set or set to false  
**Solution**:
```javascript
// In browser console before finale:
game.cfg.useNewJuryRevealUI = true;
```

Or check `js/state.js`:
```javascript
cfg: {
  // ... other config
  useNewJuryRevealUI: true  // ← Should be true
}
```

### Issue: Crown Not Visible
**Cause**: CSS not loaded or z-index conflict  
**Solution**:
1. Check browser console for CSS errors
2. Verify `injectFaceoffCSS()` ran (should see style tag in `<head>`)
3. Inspect winner slot: should have `.fo-crown` child element
4. Check CSS: `position: absolute; top: -45px; z-index: 5;`

### Issue: Check Card Not Animating
**Cause**: Animation conflict or CSS override  
**Solution**:
1. Inspect loser slot: should have `.fo-check-card` child element
2. Check CSS animation: `animation: checkSlideIn 0.8s ...`
3. Verify `position: relative` on loser slot
4. Check browser console for animation errors

### Issue: Bubbles Not Stacking
**Cause**: `.fo-belt` CSS not applied  
**Solution**:
1. Inspect vote belt: `#foBelt` or `.fo-belt` element
2. Check CSS: `flex-direction: column; gap: 6px;`
3. Verify bubbles have `.fo-bubble.show` class
4. Check max-height: `180px` with `overflow: hidden`

### Issue: Animations Janky on Mobile
**Cause**: Non-GPU-accelerated properties or too many elements  
**Solution**:
1. Check if other heavy processes running
2. Verify only `transform` and `opacity` animated
3. Reduce `will-change` usage if overused
4. Check for JS layout thrashing in console

### Issue: Public Favourite Doesn't Fade Smoothly
**Cause**: Transition not applied or modal removed too quickly  
**Solution**:
1. Check modal has `transition: opacity 0.6s ease-in-out`
2. Verify fade-out delay: `await sleep(600)` before removal
3. Check for conflicting CSS transitions
4. Verify modal mounted to DOM before opacity change

---

## 📊 Performance Monitoring

### Key Metrics to Watch
1. **Animation FPS**: Should be 60fps (check Chrome DevTools Performance tab)
2. **Memory Usage**: Should not increase during vote reveal (check Memory tab)
3. **DOM Nodes**: Max 3 bubbles at once (check Elements tab)
4. **Paint Times**: Should be < 16ms per frame (60fps = 16.67ms per frame)

### Chrome DevTools Tips
```
1. Open DevTools (F12)
2. Go to Performance tab
3. Start recording
4. Trigger jury vote reveal
5. Stop recording after winner reveal
6. Look for:
   - Green bars (GPU-accelerated)
   - No red triangles (layout thrashing)
   - Consistent frame rate (no drops)
```

---

## 🔄 Rollback Plan

If critical issues arise in production:

### Immediate Rollback (No Deploy)
```javascript
// In browser console:
game.cfg.useNewJuryRevealUI = false;

// Refresh page or restart game
```

### Quick Fix Deploy
```bash
# Edit js/state.js
# Change: useNewJuryRevealUI: true
# To:     useNewJuryRevealUI: false

git add js/state.js
git commit -m "Disable new jury UI (rollback)"
git push origin main

# Deploy via standard process
```

### Full Revert
```bash
# Find commit hash
git log --oneline | grep "jury"

# Revert the commits
git revert <commit-hash-1> <commit-hash-2> <commit-hash-3>
git push origin main

# Deploy via standard process
```

---

## 📝 Post-Deployment Checklist

After deployment to production:

- [ ] Test jury vote flow end-to-end (full game)
- [ ] Capture screenshots of all phases
- [ ] Attach screenshots to PR
- [ ] Test on real iPhone device
- [ ] Test on real Android device (optional)
- [ ] Monitor console for errors (first 48 hours)
- [ ] Monitor user feedback channels
- [ ] Update PR with production screenshots
- [ ] Close issue as resolved

---

## 🎯 Success Criteria

The deployment is successful if:

✅ Vote bubbles stack without blocking finalists  
✅ Crown drops above winner's photo smoothly  
✅ Check card slides over loser's photo smoothly  
✅ Public favourite modal fades in/out smoothly  
✅ No console errors during jury vote  
✅ Animations smooth on mobile devices  
✅ Feature flag toggle works immediately  
✅ No user-reported issues within 48 hours  

---

## 📧 Communication Plan

### Internal Team
- [ ] Notify team of deployment
- [ ] Share test page URL for manual verification
- [ ] Document known issues (if any)
- [ ] Set up monitoring alerts

### Users (If Applicable)
- [ ] No announcement needed (UI improvement, not feature)
- [ ] Monitor feedback channels for organic feedback
- [ ] Be ready to respond to questions about new animations

---

## 🔮 Future Enhancements

Based on feedback and monitoring:

**Phase 2 (Optional)**:
- [ ] Add sound effects (crown drop, check slide)
- [ ] Particle effects for crown
- [ ] Confetti animation option
- [ ] SVG check icon (better cross-platform rendering)
- [ ] Configurable bubble stack size

**Phase 3 (Optional)**:
- [ ] A/B testing between old and new UI
- [ ] Analytics tracking for user engagement
- [ ] Accessibility improvements (ARIA labels, screen reader)
- [ ] Animation customization in settings

---

## 📞 Support Contacts

For issues or questions:
1. Check documentation: `JURY_UI_REFACTOR_README.md`
2. Check visual guide: `JURY_UI_VISUAL_FLOW.md`
3. Test in isolation: `test_jury_ui_refactor.html`
4. Review implementation: `js/jury.js` lines 1152-1250
5. Contact: [Your team communication channel]

---

**Last Updated**: 2024  
**Status**: ✅ Ready for Deployment  
**Version**: 1.0  
