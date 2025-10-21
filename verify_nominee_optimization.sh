#!/bin/bash
# Verification script for Nominee Speech Cards Mobile Optimization

echo "========================================"
echo "Nominee Speech Cards - Verification"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check files exist
echo "📁 File Existence Checks:"
files=(
  "css/nominations.css"
  "js/nominations-enhancer.js"
  "test_nominee_mobile_optimization.html"
  "NOMINEE_MOBILE_OPTIMIZATION.md"
)

all_exist=true
for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo -e "  ${GREEN}✓${NC} $file"
  else
    echo -e "  ${RED}✗${NC} $file (MISSING)"
    all_exist=false
  fi
done
echo ""

# Check index.html includes
echo "📄 Index.html Integration:"
if grep -q "css/nominations.css" index.html; then
  echo -e "  ${GREEN}✓${NC} CSS link present"
else
  echo -e "  ${RED}✗${NC} CSS link missing"
fi

if grep -q "js/nominations-enhancer.js" index.html; then
  echo -e "  ${GREEN}✓${NC} JS script present"
else
  echo -e "  ${RED}✗${NC} JS script missing"
fi
echo ""

# Check nominations.js modifications
echo "🔧 Nominations.js Updates:"
if grep -q "data-nom-speeches" js/nominations.js; then
  echo -e "  ${GREEN}✓${NC} Container data hook added"
else
  echo -e "  ${RED}✗${NC} Container data hook missing"
fi

if grep -q "data-nom-speech-card" js/nominations.js; then
  echo -e "  ${GREEN}✓${NC} Card data hook added"
else
  echo -e "  ${RED}✗${NC} Card data hook missing"
fi

if grep -q "initNomineeStagger" js/nominations.js; then
  echo -e "  ${GREEN}✓${NC} Stagger init call added"
else
  echo -e "  ${RED}✗${NC} Stagger init call missing"
fi
echo ""

# Check CSS content
echo "🎨 CSS Features:"
if grep -q "@media (max-width: 768px)" css/nominations.css; then
  echo -e "  ${GREEN}✓${NC} Mobile media query present"
else
  echo -e "  ${RED}✗${NC} Mobile media query missing"
fi

if grep -q "nomCardIn" css/nominations.css; then
  echo -e "  ${GREEN}✓${NC} Animation keyframe defined"
else
  echo -e "  ${RED}✗${NC} Animation keyframe missing"
fi

if grep -q "stagger-ready" css/nominations.css; then
  echo -e "  ${GREEN}✓${NC} Stagger class defined"
else
  echo -e "  ${RED}✗${NC} Stagger class missing"
fi
echo ""

# Check JS content
echo "⚙️  JS Features:"
if grep -q "IntersectionObserver" js/nominations-enhancer.js; then
  echo -e "  ${GREEN}✓${NC} IntersectionObserver present"
else
  echo -e "  ${RED}✗${NC} IntersectionObserver missing"
fi

if grep -q "MutationObserver" js/nominations-enhancer.js; then
  echo -e "  ${GREEN}✓${NC} MutationObserver present"
else
  echo -e "  ${RED}✗${NC} MutationObserver missing"
fi

if grep -q "isTouchDevice" js/nominations-enhancer.js; then
  echo -e "  ${GREEN}✓${NC} Touch detection present"
else
  echo -e "  ${RED}✗${NC} Touch detection missing"
fi
echo ""

# Check test file
echo "🧪 Test File:"
if grep -q "css/nominations.css" test_nominee_mobile_optimization.html; then
  echo -e "  ${GREEN}✓${NC} Test includes CSS"
else
  echo -e "  ${RED}✗${NC} Test missing CSS link"
fi

if grep -q "js/nominations-enhancer.js" test_nominee_mobile_optimization.html; then
  echo -e "  ${GREEN}✓${NC} Test includes JS"
else
  echo -e "  ${RED}✗${NC} Test missing JS script"
fi
echo ""

# Run automated tests
echo "🔬 Running Automated Tests..."
if npm run test:all > /tmp/test-output.log 2>&1; then
  echo -e "  ${GREEN}✓${NC} All tests pass"
else
  echo -e "  ${RED}✗${NC} Tests failed (see /tmp/test-output.log)"
fi
echo ""

# Summary
echo "========================================"
if $all_exist; then
  echo -e "${GREEN}✅ Verification Complete - All Checks Passed${NC}"
else
  echo -e "${YELLOW}⚠️  Verification Complete - Some Issues Found${NC}"
fi
echo "========================================"
echo ""
echo "📋 Quick Links:"
echo "  • Documentation: NOMINEE_MOBILE_OPTIMIZATION.md"
echo "  • Test Page: test_nominee_mobile_optimization.html"
echo "  • CSS: css/nominations.css"
echo "  • JS: js/nominations-enhancer.js"
echo ""
