# Social HUD Unification Implementation Summary

## Overview
This PR unifies the Social HUD with canonical mechanics and merges action catalogs into a single, deduped modal. The changes fix two root causes:
1. **Divergent resource stores**: Local HUD store vs. mechanics seed causing 0 Energy starts
2. **Hard-coded modal action list**: Missing legacy actions in the TV modal

## Commits

### Commit 1: Canonical Resources Wiring
**File**: `js/socialize-mobile.js`

**Changes**:
- Removed hard-coded `game.__socialResources` (default 3) fallback
- Wired `getResourceState()` to read exclusively from `SocialManeuvers.SocialResources` store
- Updated `updateResourceState()` to use `SocialResources.spend()` and `SocialResources.earn()` methods
- Changed `resetWeeklyResources()` to defer to canonical store (handled by `onSocialPhaseStart`)
- Updated default energy display from 3 to 5 in launcher HTML
- Updated help text to reflect "Start with 5 per week (+ weekly bonuses)"
- Added event listener for `social-resources-changed` events to enable live HUD updates

**Impact**:
- TV HUD now shows ≥5 Energy at phase start (5 + weekly bonuses/penalties from mechanics)
- No more 0 Energy starts due to divergent stores
- HUD updates live when resources change

### Commit 2: Action Catalog Unification + Aliases
**File**: `js/socialize-mobile.js`

**Changes**:
- Replaced hard-coded action array in `populateActionMenu()` with canonical `SocialManeuvers.SOCIAL_ACTIONS`
- Added fallback unified catalog with all required actions:
  - **Added legacy actions**: Small Talk, Confide, Interrogate, Compliment, Mediate
  - **Deduped synonyms**: 
    - Strategy Chat/Late Night Talk → **Strategize** (cost: 2 energy)
    - Workout Together → **Workout** (cost: 1 energy)
    - Cook Meal → **Cook** (cost: 1 energy)
- Updated action costs to match canonical mechanics:
  - Small Talk: 1 Energy
  - Strategize: 2 Energy
  - Confide: 2 Energy
  - Interrogate: 2 Energy
  - Compliment: 1 Energy
  - Mediate: 2 Energy (+ 1 Influence + 1 Information)
  - Observe: 1 Energy
  - Confront: 3 Energy
- Added `getActionIcon()` helper function for consistent action icons
- Integrated action evaluation from `SocialActionConfig.getActionEvaluation()` to show requirements and gates
- Refreshed action menu when player target changes to recompute evaluations

**Impact**:
- Modal now shows unified, deduped action grid with all legacy-only actions
- No duplicate actions (Strategy Chat + Late Night Talk merged to Strategize)
- Action costs/requirements match canonical mechanics
- Real-time evaluation of action availability based on target and resources

### Commit 3: Under-Avatar Labels + %
**File**: `js/socialize-mobile.js` (already implemented)

**Verification**:
- `getRelationshipLabel()` function matches `getRelationshipState()` from `social.js` exactly
- Relationship labels rendered under avatars in player grid: `Friendly`, `Neutral`, `Allies`, etc.
- Affinity percentage displayed with sign: `+15%`, `-20%`, `0%`
- Uses same affinity thresholds as legacy module:
  - ≥0.65: Romance/Bromance
  - ≥0.48: Ride or Die
  - ≥0.28: Allies
  - ≥0.12: Friendly
  - ≥-0.12: Neutral
  - ≥-0.28: Strained
  - ≥-0.48: Enemies
  - <-0.48: Arch Enemies

**Impact**:
- Full-screen modal player grid shows relationship status clearly
- Matches legacy module UX exactly

### Commit 4: Execute Action Plumbing + Dev Telemetry
**File**: `js/socialize-mobile.js`

**Changes**:
- Replaced `executeAction()` to use canonical `SocialManeuvers.executeAction()` instead of legacy `socialApplyAction()`
- Actions now spend Energy via canonical `SocialResources.spend()` API
- Hand off to mechanics engine for:
  - Success probability computation (with modifiers from traits, memory, context)
  - Influence/Information changes
  - Affinity delta calculation
  - Session tracking for end-of-phase summary
- Added `executeLegacyAction()` fallback for when SocialManeuvers not available
- Added `addFeedbackEntry()` helper to show action outcomes with icons (✓, ✗, →, ⚠)
- Implemented light dev telemetry (localhost/127.0.0.1 only):
  - Console group logging for each action execution
  - Actor/Target names and IDs
  - Success/failure with probability breakdown
  - Affinity changes
  - Resource state after action

**Impact**:
- Actions spend from canonical store (at 0 Energy, Social auto-advances via existing wiring)
- Success computation uses full mechanics engine (traits, memory, context)
- Dev builds show detailed telemetry for debugging
- Better feedback to player about action outcomes

## Out of Scope
- ✓ No visual redesign beyond adding labels under avatars and updating resource badges
- ✓ No changes to the phase timer (3 minutes default, configurable)
- ✓ Legacy below-TV panel hidden (already implemented in `social.js`)

## Acceptance Criteria
✅ Starting a Social phase shows ≥5 Energy (5 + weekly deltas, clamped to max 10)
✅ Socialize button enabled when Energy > 0
✅ Legacy below-TV panel does not appear (only TV HUD + full-screen modal)
✅ Modal shows under-avatar labels + % for all players
✅ Modal shows unified, deduped action grid:
   - Includes legacy-only actions: Small Talk, Confide, Interrogate, Compliment, Mediate
   - No duplicates: Strategize (not Strategy Chat + Late Night Talk), Workout (not Workout Together), Cook (not Cook Meal)
✅ Actions spend from canonical store via `SocialManeuvers.executeAction()`
✅ At 0 Energy, Social auto-advances (existing wiring in `social-maneuvers.js`)

## Testing
Run `test_social_hud_unification.html` to validate:
1. Canonical resources wiring (reads from SocialManeuvers.SocialResources)
2. Action catalog unification (uses SOCIAL_ACTIONS, includes all legacy actions)
3. Under-avatar labels (relationship state + affinity %)
4. Execute action plumbing (spends via canonical store, uses mechanics engine)

## Files Modified
- `js/socialize-mobile.js`: 4 commits with focused changes

## Files Added
- `test_social_hud_unification.html`: Validation test suite

## Backward Compatibility
- Fallback to legacy `socialApplyAction()` if `SocialManeuvers.executeAction()` not available
- Fallback action catalog if `SocialManeuvers.SOCIAL_ACTIONS` not available
- No breaking changes to existing social.js or social-maneuvers.js

## Developer Notes
- Dev telemetry enabled only for localhost/127.0.0.1 (no production overhead)
- Resource-changed events allow other systems to react to social resource changes
- Action evaluation integration enables dynamic gating based on context
- All changes follow existing patterns and coding style
