# Social HUD Unification - Visual Reference

## Before (Divergent Stores + Hard-coded Actions)

### Resource Management (BEFORE)
```javascript
// socialize-mobile.js (OLD)
function getResourceState() {
  // Fallback to local state
  if (!g.__socialResources) {
    g.__socialResources = {
      energy: 3,        // ❌ Hard-coded to 3
      influence: 0,
      information: 0
    };
  }
  return g.__socialResources;
}
```

**Problem**: Local store with hard-coded default 3 diverged from mechanics store (5 + weekly bonuses), causing 0 Energy starts.

### Action Catalog (BEFORE)
```javascript
// socialize-mobile.js (OLD)
const actions = [
  { id: 'alliance', label: 'Form Alliance', ... },
  { id: 'strategize', label: 'Strategize', ... },  // Only 1 strategic action
  { id: 'gift', label: 'Give Gift', ... },
  // ❌ Missing: Small Talk, Confide, Interrogate, Compliment, Mediate
  { id: 'workout', label: 'Workout Together', ... },  // ❌ Not deduped
  { id: 'cook', label: 'Cook Meal', ... },            // ❌ Not deduped
];
```

**Problem**: Hard-coded list missing 5 legacy actions used in legacy module.

---

## After (Unified Canonical Store + Merged Catalog)

### Resource Management (AFTER)
```javascript
// socialize-mobile.js (NEW)
function getResourceState() {
  // Always use canonical SocialManeuvers resource system
  if (global.SocialManeuvers?.SocialResources) {
    const resources = global.SocialManeuvers.SocialResources.getAll(humanId);
    return {
      energy: resources.energy || 0,      // ✅ Reads from canonical store
      influence: resources.influence || 0,
      information: resources.information || 0
    };
  }
  // No fallback - always require canonical store
  return { energy: 0, influence: 0, information: 0 };
}
```

**Solution**: TV HUD is now a thin view over canonical mechanics store. Energy seeded to 5 + weekly bonuses/penalties.

### Action Catalog (AFTER)
```javascript
// socialize-mobile.js (NEW)
function populateActionMenu() {
  // Use canonical action catalog from SocialManeuvers
  let actions = [];
  if (global.SocialManeuvers?.SOCIAL_ACTIONS) {
    // ✅ Use canonical catalog from social-maneuvers.js
    actions = global.SocialManeuvers.SOCIAL_ACTIONS.map(action => ({ ... }));
  } else {
    // Fallback unified catalog (merged + deduped)
    actions = [
      { id: 'smalltalk', label: 'Small Talk', ... },       // ✅ Added
      { id: 'strategize', label: 'Strategize', ... },      // ✅ Deduped (was Strategy Chat + Late Night Talk)
      { id: 'confide', label: 'Confide', ... },            // ✅ Added
      { id: 'interrogate', label: 'Interrogate', ... },    // ✅ Added
      { id: 'compliment', label: 'Compliment', ... },      // ✅ Added
      { id: 'mediate', label: 'Mediate', ... },            // ✅ Added
      { id: 'workout', label: 'Workout', ... },            // ✅ Deduped (was Workout Together)
      { id: 'cook', label: 'Cook', ... },                  // ✅ Deduped (was Cook Meal)
      // ... plus all other actions
    ];
  }
}
```

**Solution**: Modal uses canonical SOCIAL_ACTIONS catalog with all legacy actions included and synonyms deduped.

---

## Visual Comparison

### TV HUD - Energy Display

**BEFORE:**
```
┌─────────────────────────┐
│  Social Phase           │
│  ⚡ 3  🤝 0  💡 0       │  ← Hard-coded 3 Energy
│  [Socialize]            │
└─────────────────────────┘
```

**AFTER:**
```
┌─────────────────────────┐
│  Social Phase           │
│  ⚡ 5  🤝 0  💡 0       │  ← Canonical store (5 + bonuses)
│  [Socialize]            │
└─────────────────────────┘
```

### Full-Screen Modal - Action Grid

**BEFORE:**
```
Actions:
┌──────────┬──────────┬──────────┐
│ Alliance │ Gift     │ Flirt    │
│ Strategy │ Workout  │ Cook     │  ← 6 actions (missing 5 legacy)
│          │ Together │ Meal     │
└──────────┴──────────┴──────────┘
```

**AFTER:**
```
Actions:
┌──────────┬──────────┬──────────┬──────────┐
│ Alliance │ Gift     │ Flirt    │ Small    │
│ Strategy │ Workout  │ Cook     │ Talk     │  ← 16 actions (all legacy included)
│ Confide  │ Compli-  │ Mediate  │ Interro- │
│          │ ment     │          │ gate     │
└──────────┴──────────┴──────────┴──────────┘
```

### Player Grid - Relationship Labels

**BEFORE:**
```
┌─────────────┐
│   [Avatar]  │
│   Alice     │
└─────────────┘
```

**AFTER:**
```
┌─────────────┐
│   [Avatar]  │
│   Alice     │
│  Friendly   │  ← Relationship label
│   +15%      │  ← Affinity percentage
└─────────────┘
```

---

## Action Execution Flow

### BEFORE (Legacy System)
```
User clicks "Execute"
  ↓
socialize-mobile.js: executeAction()
  ↓
Manually deduct energy from local store
  ↓
Call legacy socialApplyAction(actorId, targetId, actionId)
  ↓
Update affinities (no success computation)
```

### AFTER (Canonical Mechanics)
```
User clicks "Execute"
  ↓
socialize-mobile.js: executeAction()
  ↓
Call SocialManeuvers.executeAction(actorId, targetId, actionId)
  ↓
Mechanics engine:
  - Pre-check affordability (energy, influence, information)
  - Compute success chance (base + modifiers from traits, memory, context)
  - Roll for success/failure
  - Apply outcomes (affinity, influence, information)
  - Spend resources via canonical SocialResources.spend()
  - Track in session log for end-of-phase summary
  ↓
Return result with full telemetry
  ↓
Update HUD (resources-changed event)
  ↓
Show feedback in modal
```

---

## Key Benefits

### 1. Resource Consistency
- ✅ Single source of truth for Energy/Influence/Information
- ✅ No more 0 Energy starts
- ✅ Weekly bonuses/penalties from mechanics layer applied correctly
- ✅ HUD updates live when resources change

### 2. Complete Action Coverage
- ✅ All 16 actions available (8 legacy + 8 TV-only)
- ✅ No duplicates (deduped synonyms)
- ✅ Costs match mechanics exactly
- ✅ Dynamic evaluation based on target and context

### 3. Better UX
- ✅ Relationship labels + % under avatars (consistent with legacy module)
- ✅ Clear action costs with badges (⚡ Energy, 🤝 Influence, 💡 Information)
- ✅ Real-time feedback on action outcomes
- ✅ Dev telemetry for debugging (localhost only)

### 4. Maintainability
- ✅ Single canonical action catalog (no drift between modules)
- ✅ All logic centralized in social-maneuvers.js
- ✅ TV HUD is now a thin view (no business logic)
- ✅ Backward compatible with fallbacks

---

## Testing

Run `test_social_hud_unification.html` to validate:

1. **Canonical Resources Test**
   - ✓ Energy starts at 5 (not 3)
   - ✓ SocializeMobile reads from SocialManeuvers.SocialResources

2. **Action Catalog Test**
   - ✓ All 5 legacy actions present (Small Talk, Confide, Interrogate, Compliment, Mediate)
   - ✓ Synonyms deduped (Strategize, not Strategy Chat + Late Night Talk)

3. **Under-Avatar Labels Test**
   - ✓ getRelationshipLabel() matches social.js thresholds

4. **Execute Action Test**
   - ✓ Actions execute via SocialManeuvers.executeAction()
   - ✓ Energy spent from canonical store

---

## Implementation Summary

### Files Modified
- `js/socialize-mobile.js` (4 focused commits)

### Files Added
- `test_social_hud_unification.html` (validation test)
- `SOCIAL_HUD_UNIFICATION_SUMMARY.md` (full documentation)
- `SOCIAL_HUD_VISUAL_REFERENCE.md` (this file)

### Lines Changed
- +915 insertions
- -186 deletions
- Net: +729 lines (includes test + docs)

### Commits
1. Wire TV HUD to canonical mechanics store
2. Unify action catalog with canonical provider
3. Verify under-avatar labels + % implementation
4. Execute actions via canonical mechanics engine
5. Add validation test and implementation summary
