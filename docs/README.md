# BBMobile Documentation

This directory contains comprehensive documentation for the BBMobile game system.

## Available Documentation

### [minigames.md](minigames.md)
Complete documentation for the minigame system, including:
- Architecture overview
- API reference for all modules
- Adding new games guide
- Troubleshooting
- Linting rules
- Migration guide

## Quick Links

### For Developers
- **Adding a new minigame**: See [minigames.md - Adding New Games](minigames.md#adding-new-games)
- **Understanding the architecture**: See [minigames.md - Architecture](minigames.md#architecture)
- **Troubleshooting issues**: See [minigames.md - Troubleshooting](minigames.md#troubleshooting)

### For Contributors
- **Code style**: See [../.eslintrc.json](../.eslintrc.json) for linting rules
- **Testing**: See [minigames.md - Testing](minigames.md#testing)
- **Module pattern**: See [minigames.md - Game Module Pattern](minigames.md#game-module-pattern)

## System Overview

The BBMobile minigame system is a modular, mobile-first architecture consisting of:

1. **Registry** (`js/minigames/registry.js`) - Central metadata store
2. **Selector** (`js/minigames/selector.js`) - Non-repeating pool selection
3. **Scoring** (`js/minigames/scoring.js`) - Unified scoring logic
4. **Mobile Utils** (`js/minigames/mobile-utils.js`) - Touch/tap helpers
5. **Error Handler** (`js/minigames/error-handler.js`) - Graceful error recovery
6. **Telemetry** (`js/minigames/telemetry.js`) - Event logging and analytics
7. **Accessibility** (`js/minigames/accessibility.js`) - A11y features

## Phase 8 Changes

As of Phase 8 (cleanup), the following improvements were made:
- ✅ Removed ~430 lines of legacy code
- ✅ Added comprehensive documentation (~550 lines)
- ✅ Implemented linting rules to prevent deprecated patterns
- ✅ Simplified architecture while maintaining backwards compatibility
- ✅ All code is well-commented and maintainable

## Testing

To validate the system after changes:
1. Open `test_phase8_cleanup.html` in a browser
2. Check that all tests pass
3. Test rendering a live minigame

For comprehensive testing, also see:
- `test_minigame_selector.html` - Selector and registry tests
- `test_minigame_telemetry.html` - Telemetry tests

## Contributing

When making changes to the minigame system:
1. Follow the module pattern documented in `minigames.md`
2. Run ESLint to ensure code quality
3. Update documentation if adding new features
4. Test thoroughly before committing
5. Maintain backwards compatibility with legacy code

## Support

For questions or issues:
1. Check the troubleshooting section in `minigames.md`
2. Review browser console for errors
3. Use the debug panel: `MinigameDebugPanel.show()`
4. Check telemetry logs: `MinigameTelemetry.getStats()`
