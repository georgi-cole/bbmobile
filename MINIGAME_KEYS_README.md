# Minigame Key Validation - Quick Start

This directory contains a comprehensive validation system for minigame key registration.

## Quick Commands

```bash
# Run full validation suite
npm run test:minigames

# Individual tests
npm run validate:minigames  # Static validation
npm run test:runtime        # Runtime simulation
npm run audit:minigames     # Detailed audit
```

## What This System Does

✅ Ensures all selector pool keys are properly registered  
✅ Prevents "Unknown minigame" errors  
✅ Validates aliases point to valid canonical keys  
✅ Runs in CI on every PR  
✅ Runs on every startup in browser  

## Current Status

```
✅ 23 canonical keys registered
✅ 51 aliases registered
✅ 14 selector pool keys (all validated)
✅ 0 unknown keys
✅ 100% resolution rate
```

## For Developers

### Adding a New Minigame

1. Add to `js/minigames/registry.js`:
   ```javascript
   newGame: {
     key: 'newGame',
     name: 'New Game',
     implemented: true,
     retired: false,
     // ... other metadata
   }
   ```

2. Bootstrap automatically registers it (pulls from registry)

3. Run validation:
   ```bash
   npm run test:minigames
   ```

4. Done! ✅

### Optional: Add Aliases

Edit `js/minigames/core/registry-bootstrap.js`:
```javascript
const legacyAliases = {
  'ng': 'newGame'  // Add your alias here
};
```

## Testing

- **Browser Test:** Open `test_key_validation.html`
- **CLI Test:** Run `npm run test:minigames`
- **CI:** Automatically runs on every PR

## Documentation

- `MINIGAME_KEY_VALIDATION.md` - Comprehensive documentation
- `MINIGAME_KEY_FIX_SUMMARY.md` - Complete implementation summary

## Architecture

```
Registry (23 games)
    ↓
Bootstrap (auto-registers)
    ↓
KeyResolver (23 keys + 51 aliases)
    ↓
Selector (14 implemented games)
    ↓
All keys resolve ✅
```

## Acceptance Criteria (All Met ✅)

- ✅ Selector pool only contains registered keys/aliases
- ✅ No "Unknown minigame" errors logged
- ✅ All minigames load and play
- ✅ Startup audit shows zero missing keys
- ✅ Enforced on every startup and in CI

## Questions?

See the detailed documentation files for more information.
