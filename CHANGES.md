# Changelog

## [Unreleased] - 2025-12-06

### Removed - Loading Screen and Intro Sequence
**Breaking Change**: Permanently removed the loading screen (eye icon with progress bar) and intro audience-reactions sequence that appeared after pressing PLAY button.

**Rationale**: Streamline gameplay experience by advancing immediately to the game after pressing PLAY button. Removes 30-60 second delay before gameplay starts. Avatars now load on-demand as they are rendered in the UI.

**Files Removed:**
- `js/introShow.js` (789 lines) - Reality-TV style intro sequence with GSAP animations
- `styles-intro-show.css` - Intro sequence CSS and animations
- `test_intro_show.html` - Intro sequence test page

**Files Modified:**
- `js/ui.hud-and-router.js`:
  - `startOpeningSequence()` now skips directly to `finishOpening()` after 500ms
  - Removed reality-TV intro (IntroShow) logic
  - Removed classic dual-card intro logic
  - Simplified `skipIntro()` function to no-op placeholder
- `src/startup/flow.js`:
  - `enterGameFromIntro()` now proceeds directly to `buildMainScreen()`
  - Removed LoadingOverlay display and avatar preloading logic
  - Avatars now load on-demand as rendered in UI
  - Removed error retry flow (errors handled gracefully with fallbacks)
- `index.html`:
  - Removed `<link>` tag for `styles-intro-show.css`
  - Removed `<script>` tag for `js/introShow.js`

**New Files:**
- `tests/test_play_no_intro.html` - Sanity test verifying PLAY proceeds directly to gameplay without loading screen or intro

**Note:** LoadingOverlay module and CSS remain in codebase for potential future use in other contexts (e.g., manual avatar preload, settings, etc.) but are no longer invoked during PLAY transition.

**Testing:**
✅ All test suites pass (test:all)
- test:minigames ✅
- test:runtime-helpers ✅
- test:e2e ✅
- test:social ✅
- test:pov-carousel ✅
- test:pause-integration ✅
- test:background-theme ✅

**Migration Notes:**
- Config option `useRealityIntro` is now ignored (deprecated)
- Config option `skipIntros` is now redundant (intros always skipped)
- No user-visible settings changes required
- Existing game saves remain compatible

---

## [Previous] - Status Label Rendering Fix

### Fixed
Fixed issue where HOH and NOM badges were missing despite correct game state.

**Problem:**
- Only POV badge appeared
- Logs showed hohId and nominees set correctly
- Root cause: Renderers only checked per-player flags, not canonical state

**Solution:**
Updated all renderers to check canonical game state:
- HOH: `p.hoh === true || game.hohId === p.id`
- POV: `game.vetoHolder === p.id` (already correct)
- NOM: `p.nominated || game.nominees.includes(p.id) || nominationState`

**Files Changed:**
- js/ui.hud-and-router.js (78 lines)
- test_status_labels.html (updated)
- scripts/validate-status-labels.mjs (new, 297 lines)
- STATUS_LABELS_FIX_SUMMARY.md (new, 339 lines)
- STATUS_LABELS_VISUAL_GUIDE.md (new, 422 lines)

**Tests:**
✅ All validation tests pass (9/9)
✅ All existing tests pass
✅ Code review completed
✅ Security verified
