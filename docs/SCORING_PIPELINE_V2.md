# SCORING_PIPELINE_V2

## Overview

Score Pipeline v2 introduces a **canonical scoring pipeline** (`js/minigames/score-pipeline.js`) and a **unified results modal** (`js/competition-results.js`).  Both are gated behind a feature flag and are fully backward-compatible: all existing behaviour is preserved when the flag is disabled.

---

## Feature Flag

```javascript
// Enable v2 pipeline (in config or via browser console):
window.game.cfg.scoringPipeline = window.game.cfg.scoringPipeline || {};
window.game.cfg.scoringPipeline.useV2 = true;
```

**Default:** `false` — legacy paths unchanged.

---

## Modules

### `js/minigames/score-pipeline.js` — `window.ScorePipeline`

Central scoring API.  Wraps the existing `window.MinigameScoring` (central-scoring.js) so no logic is duplicated.

#### Constants

| Name | Value | Description |
|------|-------|-------------|
| `INTERNAL_SCALE` | `1000` | All pipeline scores are in 0–1000. |
| `DISPLAY_SCALE`  | `100.0` | `toDisplayScore()` converts to 0.0–100.0. |
| `GAME_TYPES`     | `{ ACCURACY, TIME, HYBRID, ENDURANCE }` | Canonical type strings. |

#### `normalizeScore(raw, gameConfig) → number`

Normalises a raw game score to the internal scale (0–1000).

| `gameConfig` field | Type | Default | Description |
|--------------------|------|---------|-------------|
| `scoring` / `type` | string | `'accuracy'` | One of `GAME_TYPES`. |
| `minScore` | number | `0` | Raw minimum. |
| `maxScore` | number | `100` | Raw maximum. |
| `targetTimeMs` | number | `1000` | Ideal time for `TIME`/`HYBRID`. |
| `maxTimeMs` | number | `5000` | Ceiling for `TIME`. |
| `targetDurationMs` | number | `30000` | Full-endurance duration. |
| `minDurationMs` | number | `1000` | Minimum endurance floor. |
| `accuracyWeight` | number | `0.6` | Weight for accuracy in `HYBRID`. |

```javascript
// Accuracy (default)
ScorePipeline.normalizeScore(75, { minScore: 0, maxScore: 100 });  // → 750

// Endurance
ScorePipeline.normalizeScore(20000, { scoring: 'endurance', targetDurationMs: 30000 }); // → ~717

// Time (lower is better)
ScorePipeline.normalizeScore(800, { scoring: 'time', targetTimeMs: 1000, maxTimeMs: 5000 }); // → 1000

// Hybrid
ScorePipeline.normalizeScore({ correct: 8, total: 10, timeMs: 3000 },
  { scoring: 'hybrid', targetTimeMs: 300, accuracyWeight: 0.6 });
```

#### `toDisplayScore(internalScore) → number`

Converts an internal score (0–1000) to display format (0.0–100.0, 1 decimal place).

```javascript
ScorePipeline.toDisplayScore(873);  // → 87.3
ScorePipeline.toDisplayScore(0);    // → 0.0
ScorePipeline.toDisplayScore(1000); // → 100.0
```

#### `generateCompetitionScores(params) → Array`

Deterministic opponent score generation.  Delegates to `MinigameScoring.generateOpponentScoresForCompetition`.

| `params` field | Type | Default | Description |
|----------------|------|---------|-------------|
| `humanScore` | number | `0` | Human score, internal scale. |
| `humanId` | any | — | Human player ID. |
| `opponents` | Array | `[]` | `[{id, compBeast?, persona?}, …]` |
| `compType` | string | `'hoh'` | `'hoh'`, `'pov'`, `'final3_comp1'`, … |
| `seedParts` | Array | derived | Seed array for SeededRNG.  Defaults to `[compType, week, humanId]`. |
| `authoritativeWinnerId` | any | `null` | Endurance winner ID — skipped in generation. |
| `authoritativeWinnerScore` | number | `null` | Other opponents are capped below this value. |
| `difficultyMultiplier` | number | `1.0` | AI difficulty scalar. |
| `humanSkipped` | boolean | `false` | Use neutral baseline when human didn't play. |

Returns `[[id, internalScore], …]` for each non-authoritative opponent.

```javascript
const scores = ScorePipeline.generateCompetitionScores({
  humanScore: 600, humanId: 1,
  opponents: [{ id: 2, compBeast: 0.7 }, { id: 3, compBeast: 0.4 }],
  compType: 'hoh',
  seedParts: ['hoh', game.week, game.humanId]
});
// → [[2, 543], [3, 487]] (deterministic)
```

#### `buildStandings(scoresMap, opts?) → Array`

Build a sorted standings array from a `Map<id, internalScore>` or plain object.

| `opts` field | Type | Default | Description |
|--------------|------|---------|-------------|
| `maxResults` | number | all | Limit to top N. |
| `endurance` | boolean | `false` | Non-winner `displayScore` is forced to `0`. |

Returns `[{ rank, id, score, displayScore }, …]` sorted by score descending.

```javascript
const standings = ScorePipeline.buildStandings(game.lastCompScores);
// → [{ rank:1, id:'p2', score:780, displayScore:78.0 }, …]

// Endurance (winner badge only):
ScorePipeline.buildStandings(scoresMap, { endurance: true, maxResults: 1 });
```

#### Backward-compatibility alias

```javascript
// After score-pipeline.js loads:
window.MinigameScoring = window.MinigameScoring || window.ScorePipeline;
// All existing callers of window.MinigameScoring continue to work unchanged.
```

---

### `js/competition-results.js` — `window.CompetitionResults`

Unified results modal.

#### `CompetitionResults.show(opts) → Promise<void>`

| `opts` field | Type | Default | Description |
|--------------|------|---------|-------------|
| `title` | string | `'Competition Results'` | Modal heading. |
| `standings` | Array | `[]` | Output of `ScorePipeline.buildStandings()`. |
| `compType` | string | — | Used for endurance-layout detection. |
| `autoDismissMs` | number | — | Auto-dismiss after N ms. |
| `maxResults` | number | all | Max rows to render. |

The Promise resolves when the modal is dismissed (user click, keyboard Enter/Escape, or auto-timer).

The button carries class `ffwd-skip` so any existing fast-forward selectors can close it early.

```javascript
await CompetitionResults.show({
  title: 'HOH Competition',
  standings: ScorePipeline.buildStandings(game.lastCompScores),
  compType: 'hoh',
  autoDismissMs: 3000
});
```

---

## Integration Points

### `js/competitions.js` — `finishCompPhase()`

When `window.game.cfg.scoringPipeline.useV2 === true`:

- `showCompetitionReveal()` is **not** called.
- `CompetitionResults.show({ title: 'HOH Competition', standings, compType: 'hoh' })` is awaited instead.
- `g.lastCompScores` (internal Map) is passed directly to `buildStandings()`.

Legacy path (flag off) is completely unchanged.

### `js/veto.js` — `finishVetoComp()`

When flag enabled:

- `VetoResultsUI.renderVetoCompResults()` is **not** called.
- `CompetitionResults.show({ title: 'POV Competition', standings, compType: 'pov', autoDismissMs, maxResults: 1 })` is called.
- `handlePostVetoReveal()` is chained in the `.then()` callback.
- Existing `g.__authoritativeWinner` guard logic and `g.__skipInlineWinner` flag are respected.

### `js/competitions-flow.js` — augmented `runCompetitionFlow()`

When flag enabled:

- The augmented wrapper's `showCompetitionResultsAndFastForward()` call is skipped.
- This prevents a duplicate modal since `CompetitionResults.show()` is already awaited in `finishCompPhase()`.

---

## Score Scales at a Glance

| Layer | Scale | Example |
|-------|-------|---------|
| Raw game score | game-specific | 0–100 pts |
| Internal (pipeline) | 0–1000 | `780` |
| Display | 0.0–100.0 (1dp) | `78.0` |
| Legacy comp store | 0–150 | `117` (via `mapCentralToCompScale`) |

---

## Testing

**Node.js unit tests:**
```bash
node tests/scripts/test-score-pipeline-v2.mjs
```

Covers: all `GAME_TYPES` in `normalizeScore`, `toDisplayScore` edge cases, `generateCompetitionScores` determinism and `authoritativeWinner` handling, `buildStandings` sort / endurance / maxResults.

**Browser smoke test:**

Open `test_score_pipeline_v2.html` in a browser.  Runs all assertions automatically and provides interactive demo buttons to show `CompetitionResults.show()` with HOH standings, POV endurance layout, and auto-dismiss.

---

## Migration Steps

1. **Phase 1 (this PR):** Modules added, flag defaults to `false`.  Zero impact on existing gameplay.
2. **Phase 2 (follow-up PR):** Enable flag in config defaults after QA signoff:
   ```javascript
   // js/config/defaults.js
   scoringPipeline: { useV2: true }
   ```
3. **Phase 3 (cleanup):** Remove legacy `showCompetitionReveal` wrapper and `VetoResultsUI` fallback after one full release cycle.

---

## Security Notes

- No external requests; all logic is client-side.
- No new dependencies introduced.
- `safeName()` is used for all player name rendering to avoid injection.
