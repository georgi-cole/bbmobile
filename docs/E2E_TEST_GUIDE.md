# E2E Test Harness Guide

## Overview

The E2E (End-to-End) Test Harness guarantees that every competition in BB Mobile launches a real, working minigame. It prevents "Unknown minigame" and fallback errors that break the core game experience.

## What Does It Test?

The E2E test harness validates:

1. **No Fallback/Unknown Games** - Every competition selects a registered, real minigame
2. **Interactivity** - All games render successfully and call the completion callback
3. **Mobile-Friendliness** - Games work correctly in mobile viewport (50%+ of tests)
4. **Variety** - No repeats before the full game pool is exhausted
5. **Accessibility** - Basic keyboard navigation and ARIA support

## Components

### 1. E2E Test Harness
**Location:** `tests/minigame-competition.e2e.js`

Core test module that simulates competitions and validates game behavior.

**Key Functions:**
- `runE2ETests(numCompetitions)` - Run full test suite
- `simulateCompetition(num, mobile)` - Simulate single competition
- `testGameInteractivity(key, mobile)` - Test game render and completion
- `testAccessibility(key)` - Basic accessibility validation
- `testVariety(results)` - Verify no premature repeats

### 2. Startup Audit Script
**Location:** `startup/minigame-registry-audit.js`

Runs at application startup to validate system health before gameplay begins.

**Key Functions:**
- `performAudit(failOnError)` - Full registry and selector audit
- `isSystemHealthy()` - Quick health check
- `reaudit()` - Re-run audit after module loading

**Audit Checks:**
- Registry and Selector loaded
- All selector pool keys are registered
- Game modules are loaded
- No critical configuration issues

### 3. CLI Test Runner
**Location:** `scripts/test-e2e-competitions.mjs`

Node.js script for running E2E validation in CI/CD pipelines.

**Usage:**
```bash
npm run test:e2e
```

**Options:**
```bash
node scripts/test-e2e-competitions.mjs --competitions=100 --headless
```

### 4. Browser Test Page
**Location:** `test_minigame_e2e.html`

Interactive HTML page for running E2E tests in a browser with visual feedback.

## Running Tests

### Local Development (Browser)

1. Open `test_minigame_e2e.html` in a web browser
2. Configure number of competitions (default: 100)
3. Click "Run E2E Tests" or "Quick Test"
4. View results in real-time
5. Export results as JSON if needed

**Quick Test:**
- Runs 10 competitions for rapid feedback
- Good for development/debugging

**Full Test:**
- Runs 100+ competitions (configurable)
- Comprehensive validation for releases

### CI/CD Pipeline

The E2E validation automatically runs in GitHub Actions:

```yaml
# .github/workflows/validate-minigames.yml
- name: Validate E2E Test Structure
  run: node scripts/test-e2e-competitions.mjs
```

**What CI Validates:**
- Test file structure and completeness
- Required functions present
- All test assertions included
- Startup audit configured

### Command Line

```bash
# Run structure validation
npm run test:e2e

# Run all minigame tests
npm run test:all

# Individual components
npm run validate:minigames
npm run test:runtime
```

## Test Results

### Success Criteria

✅ **PASS** when:
- 100% of competitions select real, registered games
- 0 fallback or unknown minigames
- All games render and call complete()
- Variety maintained (no repeats within pool size)
- Mobile viewport tests pass

### Expected Output

```
🧪 Running E2E Competition Test Harness
======================================================================
Simulating 100 competitions...

  Progress: 10/100 competitions completed
  Progress: 20/100 competitions completed
  ...
  Progress: 100/100 competitions completed

======================================================================
📊 Test Results:

Competitions: 100
Passed: 100 (100.0%)
Failed: 0 (0.0%)

Detailed Results:
  No Fallback: 100/100 passed
  Interactive: 100/100 passed
  Mobile-Friendly: 50/50 passed
  Accessibility: 100/100 passed

Testing variety (no repeats before pool exhaustion)...
  ✅ Variety test passed (pool size: 14)

======================================================================
✅ ALL TESTS PASSED
   ✓ 100% of competitions launched real, working minigames
   ✓ No fallback or unknown minigames used
   ✓ All games are interactive and call complete()
   ✓ Variety enforced (no repeats before pool exhaustion)
   ✓ Mobile viewport emulation successful
```

## Troubleshooting

### Common Issues

**Issue: "MinigameRegistry not available"**
- **Cause:** Registry module not loaded
- **Fix:** Ensure `js/minigames/registry.js` is loaded before tests

**Issue: "Module not loaded for game X"**
- **Cause:** Game module not included in test page
- **Fix:** Add `<script src="js/minigames/X.js"></script>` to test HTML

**Issue: "Completion callback not called within 10s"**
- **Cause:** Game doesn't call completion or hangs
- **Fix:** Debug game's render() function and onComplete callback

**Issue: "Variety test failed"**
- **Cause:** Selector repeating games too soon
- **Fix:** Check selector.js pool shuffling and history logic

### Debug Mode

Enable detailed logging in browser console:

```javascript
// Enable verbose logging
window.MinigameE2ETests.runE2ETests(10).then(results => {
  console.log('Detailed results:', results);
});
```

## Startup Audit

The startup audit runs automatically when the application loads. To manually trigger:

```javascript
// In browser console
window.MinigameRegistryAudit.performAudit(false);

// Check system health
window.MinigameRegistryAudit.isSystemHealthy();

// Re-run audit after changes
window.MinigameRegistryAudit.reaudit();
```

## Integration with Main Application

The startup audit should be loaded in `index.html`:

```html
<!-- After all minigame modules -->
<script src="startup/minigame-registry-audit.js"></script>
```

It will automatically:
1. Run after DOM load (1 second delay)
2. Validate registry and selector health
3. Check all pool keys are registered
4. Log results to console
5. Set system health status

**In Production:**
- Audit runs silently (logs to console only)
- Does not block startup (warnings only)
- Can be queried via API for health checks

**In Development:**
- Set `failOnError: true` to halt on issues
- Use for debugging key registration problems
- Check before running competitions

## Best Practices

1. **Run Before Releases**
   - Always run full E2E test (100+ competitions)
   - Verify 100% pass rate
   - Check for new accessibility issues

2. **Add New Games**
   - Register in `registry.js`
   - Add key mappings in `registry-bootstrap.js`
   - Run E2E tests to verify integration

3. **Debug Failures**
   - Start with Quick Test (10 competitions)
   - Enable browser console
   - Check individual game in isolation
   - Verify module loading order

4. **Monitor Variety**
   - Check for clustering in distribution
   - Verify pool exhaustion logic
   - Test with different pool sizes

5. **Accessibility**
   - Review warnings (non-blocking)
   - Test keyboard navigation manually
   - Verify ARIA labels on new games

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Startup                       │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
        ┌─────────────────────────────────┐
        │  Startup Audit (Auto-run)       │
        │  - Check registry/selector      │
        │  - Validate pool keys           │
        │  - Verify module loading        │
        └─────────────────┬───────────────┘
                          │
                          ▼
                  ┌───────────────┐
                  │ System Ready  │
                  └───────┬───────┘
                          │
                          ▼
        ┌─────────────────────────────────┐
        │   Competition Loop               │
        │   1. Select game (Selector)     │
        │   2. Validate key (Registry)    │
        │   3. Render game                │
        │   4. Wait for complete()        │
        └─────────────────────────────────┘

E2E Test simulates this entire flow 100+ times
```

## File Checklist

- ✅ `tests/minigame-competition.e2e.js` - E2E test harness
- ✅ `startup/minigame-registry-audit.js` - Startup validation
- ✅ `scripts/test-e2e-competitions.mjs` - CLI test runner
- ✅ `test_minigame_e2e.html` - Browser test page
- ✅ `.github/workflows/validate-minigames.yml` - CI integration
- ✅ `docs/E2E_TEST_GUIDE.md` - This documentation

## Support

For issues or questions:
1. Check browser console for detailed errors
2. Review `IMPLEMENTATION_CHANGES.md` for architecture
3. Verify module loading order in HTML
4. Run startup audit manually
5. Test individual games in isolation

---

**Confidence Guarantee:** With this E2E test harness, every competition will launch a real, working, playable minigame. No more "Unknown minigame" errors!
