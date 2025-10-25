# GitHub Copilot Instructions for BBMobile

## Project Overview

BBMobile is a Big Brother mobile game featuring:
- Complex competition system with 37+ minigames
- Social interaction mechanics (Social Maneuvers feature)
- Game progression system with XP and levels
- Ceremony sequences (nominations, evictions, veto, etc.)
- Player profiles and avatar system
- Audio and visual effects
- Mobile-first responsive design

## Technology Stack

- **Frontend**: Vanilla JavaScript (ES modules), HTML5, CSS3
- **Build Tools**: Node.js, npm
- **Testing**: Custom test infrastructure with HTML test files
- **Validation**: ESLint, custom validation scripts
- **CI/CD**: GitHub Actions workflow for minigame validation
- **Dependencies**: Minimal (GSAP for animations, TypeScript for progression module)

## Repository Structure

```
/
├── .github/
│   └── workflows/         # GitHub Actions CI/CD
├── js/                    # Core JavaScript modules
│   ├── minigames/        # Minigame system (37+ games)
│   ├── config/           # Configuration files
│   ├── data/             # Game data
│   └── debug/            # Debug utilities
├── src/                   # Source code (includes TypeScript)
│   ├── progression/      # XP/progression system (TypeScript)
│   └── ui/               # UI components
├── css/                   # Stylesheets
├── docs/                  # Comprehensive documentation
├── scripts/              # Build and validation scripts
├── tests/                # Test files
├── test_*.html           # HTML-based test pages
└── index.html            # Main entry point
```

## Development Guidelines

### Code Style

1. **Follow existing patterns**: This codebase uses consistent patterns established across modules
2. **ES Modules**: Use ES module syntax (`import`/`export`)
3. **Comments**: Add comments for complex logic, but keep them concise
4. **Naming**: Use camelCase for variables/functions, PascalCase for classes
5. **Error Handling**: Always include graceful error recovery

### Testing Requirements

**Always run tests before and after changes:**

```bash
npm run test:all              # Run all tests
npm run test:minigames        # Test minigame system
npm run test:runtime          # Test runtime validation
npm run test:e2e              # Test end-to-end competitions
npm run test:social           # Test social maneuvers
```

**HTML Test Files**: Many features have dedicated `test_*.html` files. When modifying a feature:
1. Find the corresponding `test_*.html` file
2. Open it in a browser to manually verify changes
3. Ensure all test cases pass

### Building

```bash
npm run build:progression     # Build TypeScript progression module
npm run typecheck:progression # Type-check without building
```

### Linting

```bash
npx eslint js/**/*.js         # Lint JavaScript files
```

## Common Tasks

### Adding a New Minigame

1. Create module in `js/minigames/`
2. Register in `js/minigames/registry.js`
3. Add to selector pool if applicable
4. Update legacy map in `js/bootstrap.js`
5. Run `npm run validate:minigames`
6. Create test file `test_[gamename].html`
7. Test manually in browser

See `docs/minigames.md` for detailed guide.

### Modifying Game Logic

1. **Identify affected modules**: Check imports/dependencies
2. **Check for feature flags**: Some features (e.g., Social Maneuvers) have runtime toggles
3. **Test existing functionality**: Run relevant test files
4. **Update documentation**: If changing public APIs or behavior
5. **Validate**: Run appropriate test suite

### Working with the Progression System

- Source: `src/progression/` (TypeScript)
- Must run `npm run build:progression` after changes
- Type-check with `npm run typecheck:progression`
- Integration tests in `test_progression_*.html`

### Modifying UI Components

1. **Check responsive behavior**: Test on mobile viewport
2. **Verify theme compatibility**: Support both light/dark themes
3. **Test accessibility**: Ensure keyboard navigation works
4. **Visual verification**: Use `screenshot_*.html` files or create new ones

## Important Conventions

### Module Pattern

Most modules follow this pattern:
```javascript
export const ModuleName = (() => {
  // Private state
  let privateVar;
  
  // Private functions
  function privateHelper() { }
  
  // Public API
  return {
    publicMethod() { },
    anotherMethod() { }
  };
})();
```

### Event System

- Game events use `window.game.bus` event emitter
- Follow existing event naming conventions
- Document new event types in relevant files

### Feature Flags

Check `window.game.cfg` for feature flags:
```javascript
if (window.game.cfg.enableSocialManeuvers) {
  // New Social Maneuvers implementation
} else {
  // Legacy Social implementation
}
```

### Error Handling

Always include error recovery:
```javascript
try {
  // Operation
} catch (err) {
  console.error('[Context]', err);
  // Graceful fallback
}
```

## Critical Areas (Handle with Care)

1. **Competition Flow** (`js/competitions-flow.js`, `js/competitions.js`) - Complex state machine
2. **Bootstrap** (`js/bootstrap.js`) - Legacy map and initialization
3. **Minigame Registry** (`js/minigames/registry.js`) - Central metadata store
4. **Save System** - Game state persistence (multiple modules)
5. **Social Maneuvers** - Complex resource management system

## Documentation

- **Architecture docs**: See `docs/` directory
- **Inline docs**: Check module headers for API documentation
- **Visual guides**: Many `*_SUMMARY.md` files have flow diagrams
- **Quick references**: Look for `*_QUICK_REF.md` files

## Testing Strategy

1. **Automated Tests**: Run npm test scripts first
2. **Manual Testing**: Open relevant `test_*.html` in browser
3. **Integration Testing**: Test full game flow in `index.html`
4. **Regression Testing**: Check that existing features still work

## CI/CD

GitHub Actions workflow runs on:
- Push to `main` branch
- Pull requests
- Validates minigame keys and dependencies
- Located in `.github/workflows/validate-minigames.yml`

## Common Pitfalls to Avoid

1. **Don't break legacy map**: `js/bootstrap.js` has a legacy key map that must stay in sync with registry
2. **Don't remove feature flags prematurely**: Keep flags until full migration is complete
3. **Don't skip validation**: Always run `npm run test:all` before committing
4. **Don't modify global state carelessly**: Many modules share `window.game`
5. **Don't assume desktop-only**: Always test mobile viewport
6. **Don't remove backwards compatibility**: Game saves from older versions must load

## When Making Changes

✅ **DO:**
- Run tests before and after changes
- Follow existing code patterns
- Add comments for complex logic
- Update relevant documentation
- Test manually in browser
- Check mobile responsiveness
- Validate with ESLint
- Preserve backwards compatibility

❌ **DON'T:**
- Break existing tests without fixing them
- Remove code that appears unused (might be called dynamically)
- Change module APIs without checking all call sites
- Skip running validation scripts
- Make changes without understanding the full context
- Assume code is unused based on static analysis alone

## Getting Help

- **Documentation**: Check `docs/README.md` first
- **Examples**: Look for similar implementations in codebase
- **Test files**: Often contain usage examples
- **Debug tools**: Use `MinigameDebugPanel.show()` for minigame debugging
- **Console**: Check browser console for detailed error messages

## Security Considerations

- No external API calls or data transmission
- Game state stored in localStorage
- No user authentication or sensitive data
- All game logic runs client-side

## Performance Considerations

- Mobile-first optimization required
- Test on lower-end devices
- Minimize DOM manipulations
- Use event delegation where possible
- Lazy load resources when appropriate

---

**Remember**: This is a complex, feature-rich game with many interconnected systems. Always test thoroughly and maintain backwards compatibility with existing game saves.
