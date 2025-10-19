#!/bin/bash

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║     Eviction Sequence Swap - Requirements Verification        ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

pass_count=0
total_count=0

check_requirement() {
  local req_num="$1"
  local description="$2"
  local check_cmd="$3"
  
  total_count=$((total_count + 1))
  echo -n "[$req_num] $description ... "
  
  if eval "$check_cmd" > /dev/null 2>&1; then
    echo "✓ PASS"
    pass_count=$((pass_count + 1))
  else
    echo "✗ FAIL"
  fi
}

echo "=== IMPLEMENTATION REQUIREMENTS ==="
echo ""

# Requirement 1: notifyEvictedForVisual exists
check_requirement "R1" "notifyEvictedForVisual function exists" \
  "grep -q 'function notifyEvictedForVisual' js/eviction-visuals.js"

# Requirement 2: Sets __pendingEvictionVisuals
check_requirement "R2" "__pendingEvictionVisuals Set created" \
  "grep -q '__pendingEvictionVisuals' js/eviction-visuals.js"

# Requirement 3: Sets suppression flag
check_requirement "R3" "__suppressEvictedHudUntilVisualDone flag set" \
  "grep -q '__suppressEvictedHudUntilVisualDone = true' js/eviction-visuals.js"

# Requirement 4: Called in handleEvictionLegacy
check_requirement "R4" "notifyEvictedForVisual called in handleEvictionLegacy" \
  "grep -q 'notifyEvictedForVisual(evId)' js/eviction.js"

# Requirement 5: updateHud called after animation
check_requirement "R5" "updateHud called after animation completes" \
  "grep -A 5 'runEvictionVisual' js/eviction.js | grep -q 'updateHud'"

# Requirement 6: Suppression flag cleared after animation
check_requirement "R6" "Suppression flag cleared after animation" \
  "grep -q '__suppressEvictedHudUntilVisualDone = false' js/eviction.js"

# Requirement 7: Red X rendering guarded
check_requirement "R7" "Red X rendering has suppression guard" \
  "grep -q 'isSuppressed.*__suppressEvictedHudUntilVisualDone' js/ui.hud-and-router.js"

# Requirement 8: Uses Set.has() for check
check_requirement "R8" "Uses Set.has() for player check" \
  "grep -q '__pendingEvictionVisuals.*has' js/ui.hud-and-router.js"

# Requirement 9: Multi-eviction support
check_requirement "R9" "Multi-eviction calls notifyEvictedForVisual" \
  "grep -A 3 'multiEvictFinalize' js/eviction.js | grep -q 'notifyEvictedForVisual'"

# Requirement 10: No global CSS changes
check_requirement "R10" "No global CSS classes added to styles.css" \
  "! grep -q 'suppressEvicted\|pendingVisual' styles.css"

echo ""
echo "=== TEST FILES ==="
echo ""

# Requirement 11: Test file exists
check_requirement "R11" "Browser test file created" \
  "test -f test_eviction_sequence_swap.html"

# Requirement 12: Verification script exists
check_requirement "R12" "Automated verification script exists" \
  "test -f verify_eviction_sequence.mjs"

# Requirement 13: Tests pass
check_requirement "R13" "Automated tests pass" \
  "node verify_eviction_sequence.mjs"

echo ""
echo "=== ACCEPTANCE CRITERIA ==="
echo ""

# AC 1: Announcement card unchanged
check_requirement "AC1" "Eviction announcement unchanged" \
  "grep -q 'showCard.*Evicted' js/eviction.js"

# AC 2: TV animation plays before red X
check_requirement "AC2" "TV animation called before HUD update" \
  "grep -B 3 'updateHud' js/eviction.js | grep -q 'runEvictionVisual'"

# AC 3: Red X suppressed during animation
check_requirement "AC3" "Red X suppressed when flag active" \
  "grep -q '!isSuppressed' js/ui.hud-and-router.js"

# AC 4: Names unchanged
check_requirement "AC4" "No name changes in roster rendering" \
  "! grep -q 'safeName.*EVICTED\|name.*EVICT' js/ui.hud-and-router.js"

# AC 5: No ordinal badges added
check_requirement "AC5" "No ordinal badges in eviction code" \
  "! grep -q '1st\|2nd\|3rd\|4th.*place' js/eviction.js"

echo ""
echo "=== SUMMARY ==="
echo ""
echo "Tests Passed: $pass_count / $total_count"

if [ $pass_count -eq $total_count ]; then
  echo "Status: ✅ ALL REQUIREMENTS MET"
  exit 0
else
  echo "Status: ⚠️  SOME REQUIREMENTS NOT MET"
  exit 1
fi
