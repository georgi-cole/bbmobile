# Custom ESLint Rules for Minigame System

This directory contains custom ESLint rules to enforce best practices in the minigame system.

## Rules

### no-legacy-minigame-map

Prevents direct use of legacy minigame key maps. All game selection should go through `MinigameSelector` or `MinigameRegistry`.

**❌ Bad:**
```javascript
const games = ['clicker', 'memory', 'math'];
const legacyMap = { 'clicker': 'quickTap' };
renderMinigame('clicker', container, onComplete);
```

**✅ Good:**
```javascript
const games = MinigameRegistry.getImplementedGames();
const key = MinigameCompatBridge.resolveKey('clicker');
const selected = MinigameSelector.selectNext();
```

**Exceptions:**
- `compat-bridge.js` - Contains the actual legacy map
- `index.js` - Legacy bridge implementation
- `minigames.js` - Legacy stub

### require-registry-registration

Ensures all minigame modules follow the required contract:
1. Export a `render()` function
2. Accept at least 2 parameters (container, onComplete)
3. Register to `window.MiniGames[key]`

**Example compliant module:**
```javascript
(function(g){
  'use strict';
  
  function render(container, onComplete){
    // Game logic...
    onComplete(score);
  }
  
  if(!g.MiniGames) g.MiniGames = {};
  g.MiniGames.quickTap = { render };
  
})(window);
```

## Usage

### With ESLint Config

Add to `.eslintrc.json`:

```json
{
  "plugins": ["minigame"],
  "rules": {
    "minigame/no-legacy-minigame-map": "error",
    "minigame/require-registry-registration": "warn"
  }
}
```

### Standalone

```bash
# Check a specific file
eslint --rulesdir eslint-rules js/minigames/my-game.js

# Check all minigame files
eslint --rulesdir eslint-rules js/minigames/*.js
```

## Integration

These rules are automatically checked by:
- Pre-commit hooks (if configured)
- CI/CD pipeline
- Readiness checklist script

## Disabling Rules

If you need to temporarily disable a rule (e.g., during migration):

```javascript
/* eslint-disable minigame/no-legacy-minigame-map */
const legacyKeys = ['clicker', 'memory'];
/* eslint-enable minigame/no-legacy-minigame-map */
```

Use sparingly and document why the exception is needed.

## Development

To test a rule:

```bash
# Create test file
echo "const games = ['clicker', 'memory'];" > test.js

# Run ESLint with custom rules
eslint --rulesdir eslint-rules test.js

# Should output:
# error  Direct legacy minigame maps are not allowed  minigame/no-legacy-minigame-map
```

## Contributing

When adding a new rule:
1. Create `rule-name.js` in this directory
2. Add documentation to this README
3. Add tests to `tests/eslint/`
4. Update `.eslintrc.json` if needed
