# New Features Guide

## 🎯 Status Labels

Player statuses are now shown as colored labels beneath avatars instead of overlapping badges.

**Labels:**
- **HOH** (gold) - Head of Household
- **POV** (green) - Power of Veto holder
- **NOM** (red) - Nominated for eviction
- **HOH·POV** (gradient) - When HOH wins veto

**Note:** Nominees cannot be HOH (NOM is always exclusive)

## 🏆 Competition Results Popup

After each competition, a sleek modal displays:
- Winner with large avatar
- 2nd and 3rd place with smaller avatars
- All scores shown with exactly 1 decimal place
- Dismissible after 0.5s by clicking or pressing ESC
- Auto-dismisses after 5 seconds

## 💭 Social Narrative Engine

Social interactions now tell a story instead of showing raw numbers.

**Narrative Stages:**
- **Positive:** "met" → "strategizing" → "working as allies" → "tight alliance"
- **Negative:** "tension" → "disagreement" → "open conflict" → "feuding intensely"

**Special Events:**
- Alliance hint when relationship crosses +0.55
- Feud warning when relationship drops below -0.55

**Debug Mode:** Run `window.toggleSocialDebugNumbers()` in console to show/hide raw affinity numbers

## 🎵 Audio Mute Toggle

Click the speaker icon (🔊/🔇) in the top bar to:
- Mute/unmute all game audio
- Persists across page refreshes
- Smooth fade-out when muting

## ⚡ Enhanced Fast-Forward

The Skip button now:
- Stops audio smoothly
- Cancels pending animations
- Clears overlays cleanly
- Prevents ghost operations

## 🔧 Debug Tools

Open the browser console and use these commands:

```javascript
// Test competition fairness (run 100 simulations)
window.__dumpCompStats(100)

// Show current game phase and state
window.__dumpPhaseState()

// View social relationship memory
window.__dumpSocialMemory()

// Jump to final two scenario
window.__simulateFinalTwo()

// Toggle reduced motion mode
window.__toggleReducedMotion()
```

## 🎬 Auto-Detection of Game End

The game now automatically detects terminal states:
- **1 player left:** Declares winner immediately
- **2 players left:** Jumps to jury vote
- **3 players left:** Starts Final HOH sequence
- **4 players left:** Standard Final 4 HOH
- **5+ players:** Normal weekly cycle

## ♿ Accessibility Improvements

- Status labels include descriptive text for screen readers
- Results popup supports keyboard navigation
- ESC key closes modals
- Mute button announces its state
- Hover tooltips provide context

## 📱 Mobile Optimizations

- Results popups scale properly on small screens
- Cards scroll internally when content is tall
- Touch targets are adequately sized
- No horizontal scrolling or content cut-off

## 🎨 Reduced Motion Support

Users who prefer reduced motion will experience:
- Minimal animations
- No pulsing effects
- Faster transitions

Enable in your OS accessibility settings or run `window.__toggleReducedMotion()` in console.

## 📊 Enhanced Logging

Game events now have clear prefixes in the console:
- `[results]` - Competition results
- `[phase]` - Phase transitions
- `[ff]` - Fast-forward actions
- `[social]` - Social interactions
- `[audio]` - Audio operations
- `[badges]` - Status badge updates

## 🚀 Performance Improvements

- Phase token system prevents memory leaks
- Card queue cleanup stops accumulation
- Audio fade-out prevents track overlap
- Efficient avatar preloading with skeleton states

## 🎯 Quick Start

1. **Start a new game** - All features work automatically
2. **Try the mute toggle** - Click 🔊 in the top bar
3. **Watch status labels** - Progress through HOH/Veto to see them
4. **Use fast-forward** - Click Skip to test enhanced cleanup
5. **Open console** - Try debug commands to explore

## 💡 Tips

- **Status labels** automatically update as game progresses
- **Results popup** can be dismissed immediately by clicking anywhere
- **Social narrative** becomes richer over multiple weeks
- **Debug tools** are great for testing edge cases
- **Mute state** persists, so you won't need to mute again after refresh

## 🐛 Reporting Issues

If you encounter any issues with these features:

1. Open browser console (F12)
2. Look for red error messages
3. Check for relevant logging prefixes
4. Note which feature was affected
5. Report with steps to reproduce

## 📚 Technical Details

For developers and advanced users, see:
- `ENHANCEMENT_PR_SUMMARY.md` - Full implementation details
- `ENHANCEMENT_VERIFICATION.md` - Testing checklist
- Source files in `js/` directory

## 🎊 Enjoy!

These enhancements make the game more polished, accessible, and reliable. Have fun playing!
