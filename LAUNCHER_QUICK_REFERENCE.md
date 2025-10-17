# Quick Reference: Socialize Launcher Auto-Remount

## 🚀 Quick Start

### For Testing
```bash
# Open manual test page
open test_launcher_auto_remount_manual.html

# Or run automated tests
python3 -m http.server 8080 &
npx playwright test test_launcher_auto_remount.spec.js
```

### For Development
```javascript
// Bootstrap is automatically integrated in social.js
// No changes needed for normal usage

// To manually control observer (advanced):
window.SocialLauncherBootstrap.startLauncherObserver();
window.SocialLauncherBootstrap.stopLauncherObserver();
```

## 📖 Key Concepts

### What It Does
- **Watches** TV overlay for DOM changes
- **Detects** when launcher is removed
- **Re-mounts** launcher automatically
- **Cleans up** when phase ends

### How It Works
```
Phase Start → Observer Start → Monitor DOM
                                    ↓
                            Launcher Removed?
                                    ↓ Yes
                            Re-mount Launcher
                                    ↓ Repeat
Phase End   → Observer Stop → Clean Up
```

## 🔍 Console Messages

```javascript
// Normal flow
"[social-launcher] observer started"           // ✅ Observer active
"[social-launcher] re-mounted after DOM change" // ✅ Auto-remount worked
"[social-launcher] observer stopped"            // ✅ Clean shutdown

// Warnings (not errors, just info)
"[social] SocialLauncherBootstrap not available"  // Module not loaded
"[social] SocializeMobile not available"          // Dependency missing
```

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Launcher doesn't appear | Check console for warnings, verify Social Maneuvers enabled |
| Multiple launchers | Shouldn't happen - report as bug |
| Observer not stopping | Check phase end is called, verify cleanup logs |
| Remount too slow | Normal < 1 second, if slower check browser performance |

## 📝 Files Reference

| File | Purpose |
|------|---------|
| `js/social-maneuvers-launcher-bootstrap.js` | Core observer logic |
| `js/social.js` | Integration point (lines 715-728, 768-772) |
| `socialize-mobile.css` | Styling (z-index line 11) |
| `index.html` | Script loading (lines 341-342) |

## ✅ Quick Test Checklist

- [ ] Launcher appears on social phase start
- [ ] Remove launcher → re-appears within 1-2 seconds
- [ ] Rebuild overlay → launcher survives
- [ ] Phase ends → observer stops (check console)
- [ ] No duplicates (check DOM: should be 1 launcher)

## 🔗 Documentation Links

- **Full Implementation**: `LAUNCHER_AUTO_REMOUNT_IMPLEMENTATION.md`
- **QA Checklist**: `LAUNCHER_VERIFICATION_CHECKLIST.md`
- **Visual Guide**: `LAUNCHER_AUTO_REMOUNT_VISUAL_SUMMARY.md`

## 💡 Tips

1. **Use manual test page** for interactive debugging
2. **Check console** for diagnostic messages
3. **DevTools Elements** to inspect launcher in DOM
4. **Performance tab** if checking observer overhead
5. **Test in multiple browsers** for compatibility

## 📞 Need Help?

1. Check console logs for diagnostic messages
2. Review `LAUNCHER_AUTO_REMOUNT_IMPLEMENTATION.md` for details
3. Run manual test page to isolate issues
4. Check that all required modules are loaded

---

**Status**: ✅ Ready for production
**Version**: 1.0
**Last Updated**: 2025-10-17
