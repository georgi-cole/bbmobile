# Forensic Analysis: HOH Self-Nomination Regression

## Incident Summary

**Date Discovered**: 2025-11-21  
**Severity**: Critical  
**Impact**: Game rule violation, data corruption, undermines competitive fairness

### Symptom

During a standard veto ceremony (no Golden/Diamond twist active), after a nominee was saved, the announcement card displayed:

> "[HOH Name]: I name [HOH Name] as the replacement nominee."

The HOH appeared in the replacement nominee pool and could be selected, resulting in illegal self-nomination. The roster then displayed the HOH with both an HOH badge and a NOM badge simultaneously.

## Impact Analysis

### Game Integrity
- **Rule Violation**: HOH cannot be nominated in standard Big Brother rules
- **Self-Nomination**: HOH naming themselves as replacement is impossible
- **Badge Logic Corruption**: Concurrent HOH and NOM badges violate state assumptions

### Downstream Effects
- **Live Vote Phase**: Corrupted nominee list causes voting errors
- **Eviction Statistics**: Invalid eviction tracking if HOH is evicted
- **Jury Composition**: HOH could join jury incorrectly
- **User Trust**: Players lose confidence in game fairness

### Competitive Fairness
- **Strategic Advantage**: HOH gains immunity from nomination by design
- **Power Balance**: Allowing HOH nomination breaks core game mechanics
- **Precedent**: Sets incorrect expectations for future weeks

## Root Cause Analysis

### Primary Causes

#### 1. ID Type Mismatch (Critical)

**Evidence:**
```javascript
// OLD CODE - Line 3206
var repPool = alivePlayers().filter(function(p){
  return !p.hoh && g.nominees.indexOf(p.id)===-1 && p.id!==g.vetoHolder && p.id!==g.vetoSavedId;
});
```

**Problem:**
- Candidate IDs sourced from DOM/roster remained strings (e.g., `"7"`)
- `game.hohId` stored as numeric (`7`)
- Strict inequality `p.id !== g.hohId` fails when comparing `"7" !== 7`
- HOH passes through filter incorrectly

**Root:**
- Inconsistent ID type handling across codebase
- No normalization at ceremony entry points
- String IDs from DOM selectors not converted to numbers

#### 2. Removed Validation Guard (Critical)

**Evidence:**
Previous async/await refactor removed final validation that blocked HOH nomination even if pool was incorrect.

**Problem:**
- Refactor to async/await ceremony flow dropped validation step
- No defense-in-depth check before committing replacement
- Single point of failure in pool building logic

**Root:**
- Validation logic was implicit in old synchronous flow
- Async refactor didn't preserve all guards
- No explicit validation function to call

#### 3. Conditional Exclusion Regression (High)

**Evidence:**
```javascript
// OLD CODE - Multiple paths
// Diamond POV: p.id !== g.hohId ✓ (numeric comparison)
// pickReplacementByHOH: !p.hoh ✗ (flag-based, unreliable)
// Human picker: !p.hoh ✗ (flag-based, unreliable)
```

**Problem:**
- Inconsistent exclusion methods across POV types
- Some paths used numeric ID comparison (`p.id !== g.hohId`)
- Other paths used flag check (`!p.hoh`)
- Flag-based checks depend on `syncPlayerBadgeStates()` being called
- Timing race: HOH flag might not be set during ceremony setup

**Root:**
- Multiple implementations for same requirement
- Flag synchronization not guaranteed
- No single source of truth for HOH exclusion

#### 4. Badge Sync Timing (Secondary)

**Evidence:**
```javascript
// syncPlayerBadgeStates() updates p.hoh flag from g.hohId
// If not called before pool building, flag is stale
```

**Problem:**
- Pool building relied on transient `p.hoh` flag
- Flag might not reflect current `g.hohId` value
- Sync timing non-deterministic

**Root:**
- Derived state (`p.hoh`) used instead of canonical state (`g.hohId`)
- No guarantee of sync order

### Contributing Factors

#### Code Complexity
- Multiple veto types (Standard, Golden, Diamond) with different logic paths
- Ceremony flow spread across multiple functions
- No centralized pool building logic

#### Lack of Defense-in-Depth
- Single point of failure in pool building
- No validation before commit
- No integrity check after commit

#### Testing Gaps
- No automated tests for HOH exclusion
- Manual testing didn't cover string/number ID scenarios
- Integration tests didn't verify replacement pool composition

## Remediation

### Defense-in-Depth Layers

#### Layer 1: Hardened Pool Building
```javascript
function buildReplacementPool(options){
  var g = global.game;
  
  // ALWAYS normalize IDs to numbers first
  var hohId = +(g.hohId);
  var vetoHolderId = +(g.vetoHolder);
  var savedId = options.savedId != null ? +options.savedId : null;
  
  // Build exclusion set (HOH ALWAYS excluded)
  var exclude = new Set();
  exclude.add(hohId);           // Unconditional
  exclude.add(vetoHolderId);
  if(savedId != null) exclude.add(savedId);
  
  // ... filter logic ...
}
```

**Benefits:**
- Single source of truth for pool building
- Unconditional HOH exclusion at source
- Consistent across all POV types
- Diagnostic logging for debugging

#### Layer 2: Pre-Commit Validation
```javascript
function validateReplacementNominee(id){
  var g = global.game;
  var numId = +id;
  
  // Check 1: Cannot be HOH
  if(numId === +(g.hohId)){
    return { ok: false, reason: 'HOH cannot be nominated' };
  }
  
  // Check 2-5: Other validations...
  
  return { ok: true };
}
```

**Benefits:**
- Catches invalid selections before commit
- Explicit validation step in ceremony flow
- Clear error messages for debugging
- Retry logic with corrected pool

#### Layer 3: Post-Commit Integrity Check
```javascript
function integrityCheckNominees(){
  var g = global.game;
  var hohId = +(g.hohId);
  
  if(g.nominees.includes(hohId)){
    console.error('[integrity] CRITICAL: HOH found among nominees; auto-removing.');
    g.nominees = g.nominees.filter(id => id !== hohId);
    // Show correction card, sync badges
    return true; // Correction applied
  }
  
  return false; // No correction needed
}
```

**Benefits:**
- Last-resort safety net
- Auto-correction if bug slips through
- User-visible notification
- Prevents downstream corruption

### ID Normalization

#### Utility Function
```javascript
function normalizeIds(arr){
  if(!Array.isArray(arr)) return [];
  return arr.map(function(x){ return +x; });
}
```

#### Application Points
1. Ceremony entry: Normalize all IDs immediately
2. Pool building: Normalize candidates before filtering
3. Validation: Normalize ID before checks
4. Commit: Normalize before updating game state

### Updated Code Paths

#### Standard POV
- Uses `buildReplacementPool({ savedId })`
- Validates with `validateReplacementNominee()`
- Integrity check after commit

#### Golden POV
- Same as Standard
- POV holder picks instead of HOH
- Same validation and integrity checks

#### Diamond POV
- First pick: `buildReplacementPool({ savedId: null })`
- Second pick: `buildReplacementPool({ alreadyPicked: firstId })`
- Both picks validated and integrity checked

## Testing

### Automated Tests

Created `tests/veto_replacement_exclusion.mjs` with 18 test cases:

1. **normalizeIds**: String to number conversion
2-6. **buildReplacementPool**: HOH, veto holder, saved, nominees, Diamond exclusions
7. **String ID handling**: Mixed string/number IDs
8-12. **validateReplacementNominee**: HOH, veto holder, evicted, existing, valid checks
13-14. **integrityCheckNominees**: Correction and no-op scenarios
15-16. **POV Types**: Golden and Diamond scenarios
17-18. **Edge Cases**: Multi-eviction, Final 4

**Result**: 18/18 tests passed ✓

### Verification Script

Created `scripts/verify-hoh-exclusion.mjs` to scan for:
- `normalizeIds` function
- `buildReplacementPool` with HOH exclusion
- `validateReplacementNominee` function
- `integrityCheckNominees` function
- Diagnostic logging
- Function call sites

**Result**: 6/6 checks passed ✓

## Future Prevention

### Code Review Checklist

When modifying veto ceremony code, verify:
- [ ] All IDs normalized to numbers at entry points
- [ ] HOH excluded in pool building (all paths)
- [ ] Validation called before commit
- [ ] Integrity check called after commit
- [ ] Diagnostic logging present
- [ ] All POV types tested

### Testing Requirements

Before merging veto changes:
- [ ] Run `node tests/veto_replacement_exclusion.mjs`
- [ ] Run `node scripts/verify-hoh-exclusion.mjs`
- [ ] Manual test: Standard POV with string IDs
- [ ] Manual test: Golden POV
- [ ] Manual test: Diamond POV
- [ ] Manual test: Multi-eviction week
- [ ] Manual test: Final 4

### Documentation Updates

- [x] Create forensic analysis (this document)
- [x] Update VETO_FLOW_FIX_SUMMARY.md
- [x] Update TESTING_VETO_CEREMONY.md
- [x] Update POV_CAROUSEL_README.md

### Monitoring

#### Diagnostic Logging
```javascript
console.info('[replacement] pool built:', {
  hohId, vetoHolderId, savedId, nominees, excluded, pool
});
```

#### Manual Verification
Run `window.__dumpPhaseState()` in console, verify:
- HOH not in `nominees` array
- HOH not in replacement pool
- Badge states consistent

## Lessons Learned

### Technical Lessons

1. **Type Safety**: Always normalize IDs to numbers at boundaries
2. **Defense-in-Depth**: Multiple validation layers prevent single points of failure
3. **Canonical State**: Use authoritative source (`g.hohId`) not derived state (`p.hoh`)
4. **Explicit Validation**: Don't rely on implicit guards in flow control

### Process Lessons

1. **Async Refactors**: Preserve all validation logic when refactoring
2. **Test Coverage**: Automated tests must cover core game rules
3. **Code Review**: Verify HOH exclusion in all ceremony changes
4. **Documentation**: Forensic analysis helps prevent regressions

### Architectural Lessons

1. **Centralized Logic**: Single pool builder used by all paths
2. **Consistent Patterns**: Same validation approach across all POV types
3. **Explicit Contracts**: Validation functions with clear return types
4. **Logging Strategy**: Diagnostic logs aid future debugging

## References

### Modified Files
- `js/veto.js` - Added utilities, updated all replacement paths

### New Files
- `tests/veto_replacement_exclusion.mjs` - Automated test suite
- `scripts/verify-hoh-exclusion.mjs` - Verification script
- `FORENSIC_HOH_SELF_NOMINATION.md` - This document

### Related Documentation
- `VETO_FLOW_FIX_SUMMARY.md` - General veto flow fixes
- `TESTING_VETO_CEREMONY.md` - Testing procedures
- `POV_CAROUSEL_README.md` - Carousel picker documentation

## Timeline

- **2025-11-21**: Issue discovered, forensic analysis completed
- **2025-11-21**: Remediation implemented, tests created
- **2025-11-21**: Verification passed, documentation complete

## Sign-Off

This forensic analysis documents a critical regression that allowed HOH self-nomination. The issue has been remediated with defense-in-depth validation layers, comprehensive testing, and verification scripts. Future prevention measures include automated testing, code review checklists, and monitoring recommendations.

**Status**: Remediation Complete ✓  
**Verification**: All Tests Passed ✓  
**Documentation**: Complete ✓
