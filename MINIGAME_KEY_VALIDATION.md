# Minigame Key Validation System

This document describes the minigame key validation system that ensures all selector pool keys are properly registered, preventing "Unknown minigame" errors at runtime.

## Problem Statement

The minigame system uses a selector that chooses games from a pool of implemented, non-retired games. For each game to load correctly:
1. The game must be registered in `MinigameRegistry` (registry.js)
2. The game's canonical key must be registered in `MGKeyResolver` (via registry-bootstrap.js)
3. Any aliases must also be registered and point to valid canonical keys

If a selector pool key is not registered, it will cause "Unknown minigame" errors and fall back to quickTap.

## Architecture

### Registry (js/minigames/registry.js)
- Contains metadata for all minigames (implemented and planned)
- Each entry has: key, name, type, scoring, implemented, retired flags
- The selector uses `getImplementedGames(true)` to get non-retired, implemented games

### Key Resolver (js/minigames/core/key-resolver.js)
- Resolves aliases to canonical keys
- Tracks unknown keys for audit
- Provides validation methods

### Bootstrap (js/minigames/core/registry-bootstrap.js)
- Registers all canonical keys from the registry
- Registers legacy and descriptive aliases
- Performs startup audit to detect mismatches
- Has a fallback list in case registry isn't loaded yet

### Selector (js/minigames/selector.js)
- Builds a shuffled pool from `MinigameRegistry.getImplementedGames(true)`
- Uses `MGKeyResolver.resolveGameKey()` to validate each selection
- Falls back to quickTap if a key is unknown

## Validation Scripts

### validate-minigame-keys.mjs
**Purpose:** CI/startup validation to ensure all selector pool keys are registered

**Checks:**
1. ✅ All selector pool keys (implemented, non-retired) are registered
2. ✅ All aliases point to valid canonical keys
3. ✅ All registry keys are in bootstrap fallback (informational)

**Usage:**
```bash
npm run validate:minigames
# or
node scripts/validate-minigame-keys.mjs
```

**Exit codes:**
- 0 = Validation passed
- 1 = Validation failed (unregistered keys detected)

### audit-minigame-keys.mjs
**Purpose:** Detailed audit of key registration for debugging

**Checks:**
1. Registry → Bootstrap coverage
2. Bootstrap → Registry coverage
3. Alias validity
4. Expected selector pool composition
5. Pool key registration status

**Usage:**
```bash
npm run audit:minigames
# or
node scripts/audit-minigame-keys.mjs
```

## CI Integration

The GitHub Actions workflow (`.github/workflows/validate-minigames.yml`) runs on every push/PR that modifies:
- `js/minigames/**`
- `scripts/validate-minigame-keys.mjs`

It ensures that:
- All new games are properly registered
- No unregistered keys enter the codebase
- Aliases are always valid

## Startup Audit

The bootstrap automatically performs a startup audit after page load:
1. Checks canonical keys registered
2. Checks aliases registered
3. Checks unknown keys encountered
4. **NEW:** Validates all expected selector pool keys
5. **NEW:** Validates actual pool if it exists

If any unregistered keys are detected, errors are logged to console:
```
❌ CRITICAL: Selector pool contains unregistered keys!
   These keys will cause "Unknown minigame" errors: ['someKey']
   FIX: Add aliases for these keys in registry-bootstrap.js
```

## Adding New Minigames

When adding a new minigame:

1. **Add to registry.js:**
   ```javascript
   newGame: {
     key: 'newGame',
     name: 'New Game',
     description: 'Description',
     type: 'reaction',
     scoring: 'accuracy',
     mobileFriendly: true,
     implemented: true,  // Set to true when ready
     module: 'new-game.js',
     minScore: 0,
     maxScore: 100,
     retired: false
   }
   ```

2. **The bootstrap will automatically register it** (it pulls from registry dynamically)

3. **Run validation:**
   ```bash
   npm run validate:minigames
   ```

4. **If you want to add aliases**, edit `registry-bootstrap.js`:
   ```javascript
   const legacyAliases = {
     // ...existing aliases
     'ng': 'newGame'  // Add your alias
   };
   ```

5. **The selector will automatically include it** (if implemented and not retired)

## Troubleshooting

### "Unknown minigame" errors
1. Check console for startup audit output
2. Look for unregistered keys in the error logs
3. Run `npm run audit:minigames` to see detailed status
4. Add missing keys or aliases to registry-bootstrap.js

### Validation fails in CI
1. Check which keys are unregistered
2. Ensure the key exists in registry.js
3. Ensure bootstrap fallbackKeys includes the key (or registry is loaded)
4. Ensure any aliases point to valid canonical keys

### Game not appearing in selector
1. Check `implemented: true` in registry.js
2. Check `retired: false` in registry.js
3. Run selector and check logs for why it was filtered out
4. Check that the game module is loaded (script tag in index.html)

## Testing

### Browser Console Testing
```javascript
// Check registration status
window.__mgTestKeys()
// → {registered: [...], aliasCount: 51, sampleSelection: 'mathBlitz'}

// Test a specific key
window.__mgForceKey('bar')
// → {requestedKey: 'bar', resolvedKey: 'timingBar', registered: true}

// Get audit summary
MGKeyResolver.getAuditSummary()
// → {canonicalCount: 23, aliasCount: 51, unknownCount: 0}
```

### Manual Testing
1. Open any test page (e.g., test_minigame_stabilization.html)
2. Check browser console for startup audit output
3. Select games and verify no "Unknown minigame" warnings
4. Use dev utilities to test specific keys

## Acceptance Criteria (from issue)

- ✅ Selector pool only contains registered keys/aliases
- ✅ No "Unknown minigame" errors logged (if keys are properly registered)
- ✅ All minigames load and play, not just quickTap
- ✅ Startup audit shows zero missing keys
- ✅ This is enforced on every startup and in CI

## Files Modified/Created

**Modified:**
- `js/minigames/core/registry-bootstrap.js` - Enhanced startup audit, updated fallback keys

**Created:**
- `scripts/validate-minigame-keys.mjs` - CI validation script
- `scripts/audit-minigame-keys.mjs` - Detailed audit script
- `package.json` - npm scripts for validation
- `.github/workflows/validate-minigames.yml` - CI workflow
- `MINIGAME_KEY_VALIDATION.md` - This documentation

## Summary

The validation system ensures that:
1. All selector pool keys are registered (enforced in CI)
2. Runtime validation catches issues immediately (startup audit)
3. Developers get clear error messages when adding games
4. "Unknown minigame" errors are impossible with valid configuration

The system is self-documenting and provides tools at every stage:
- Development: npm scripts
- Runtime: startup audit + dev utilities
- CI: automated validation on every PR
