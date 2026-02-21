# Changelog

## [Unreleased]

### Added — Modular Competition System (`js/competition/`)

A new rankings-only competition system has been added under `js/competition/`. Raw numeric
scores are **never persisted**; only ordered placements (1st, 2nd, …) are stored.

#### New files

| File | Purpose |
|------|---------|
| `js/competition/competition-manager.js` | Lifecycle orchestration (phases: lobby → play → reveal → results) |
| `js/competition/results-calculator.js`  | Converts performance records to ordered placements with seeded tie-breaking |
| `js/competition/ai-player.js`           | Simulates AI performance with seeded/non-seeded RNG |
| `js/competition/storage-adapter.js`     | Persists placements to `game.competitionHistory` / `localStorage` |
| `js/competition/legacy-adapter.js`      | Backward-compatible shims for legacy function names |

#### New tests

| File | Coverage |
|------|---------|
| `test/competition/results-calculator.test.mjs` | Ordering, tie-breaking, edge cases |
| `test/competition/ai-player.test.mjs`           | Distribution, seeded determinism |
| `test/competition/storage-adapter.test.mjs`     | Persistence, bestPlacement tracking |

#### New CI workflow

`.github/workflows/test-competition.yml` — runs all three test suites on PRs touching
`js/competition/**` or `test/competition/**`.

---

### Migration Notes

#### New API (`global.game.competition`)

```js
// Start a round
game.competition.start({ roundId: 'hoh_week3', order: 'desc' });

// Each player/AI submits their performance metric
game.competition.submitPerformance('alice', 82);
game.competition.submitPerformance('bob',   77);

// Finalize: computes placements, persists them, emits events
const placements = game.competition.finalizeRound();
// => [{ playerId: 'alice', placement: 1 }, { playerId: 'bob', placement: 2 }]

// Read placements at any time
const p = game.competition.getPlacements();

// Reset for next round without re-configuring
game.competition.resetRound();
```

#### Events

```js
game.competition.on('roundStarted',        ({ config }) => { … });
game.competition.on('placementsUpdated',   ({ placements }) => { … });
game.competition.on('roundFinished',       ({ placements, config }) => { … });
game.competition.on('competitionFinished', ({ placements }) => { … });
```

#### Legacy adapter functions (kept for backward compatibility)

The following global functions are still available but emit a deprecation warning:

- `fillMissingScores(ids, opts)` — delegates to `submitPerformance` if round is active
- `logScoreboard(title, scoresMap, ids)` — logs placement-ordered summary
- `finishCompPhase()` — finalizes round if active, then calls original implementation
- `showCompetitionReveal(title, scoresMap, ids)` — delegates to original reveal UI
- `showResultsPopup(options)` — delegates to original popup or logs placements

**Migrate callers to the new API when safe.**

#### What is NOT stored

Raw performance metrics (numeric scores) are stripped before persistence.
`game.competitionHistory` entries contain only `{ timestamp, roundId, placements, config }`.
`game.playerStats[id].bestPlacement` tracks the lowest (best) placement number per player.
