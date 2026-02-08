# PR Creation Instructions

## Branch Information
- **Source Branch:** `feature/unify-competition-results-inline-hotfix`
- **Target Branch:** `main`
- **PR Title:** Unify competition results — prefer inline faux‑TV reveal for all competitions (hotfix)

## How to Create the PR

### Option 1: Using GitHub Web UI (Recommended)

Since the branch hasn't been pushed to the remote yet due to authentication constraints, you'll need to:

1. **Push the branch manually:**
   ```bash
   cd /path/to/bbmobile
   git checkout feature/unify-competition-results-inline-hotfix
   git push -u origin feature/unify-competition-results-inline-hotfix
   ```

2. **Go to GitHub:**
   - Visit: https://github.com/georgi-cole/bbmobile
   - You should see a banner: "feature/unify-competition-results-inline-hotfix had recent pushes"
   - Click "Compare & pull request"

3. **Fill in PR details:**
   - **Title:** `Unify competition results — prefer inline faux‑TV reveal for all competitions (hotfix)`
   - **Description:** Copy contents from `PR_DESCRIPTION.md` (it's comprehensive!)
   - **Base branch:** `main`
   - **Labels:** Add appropriate labels (e.g., `enhancement`, `hotfix`, `UX`)
   - **Reviewers:** Assign reviewers as needed

4. **Create pull request**

### Option 2: Using GitHub CLI

If you have GitHub CLI installed and authenticated:

```bash
cd /path/to/bbmobile
git checkout feature/unify-competition-results-inline-hotfix

# Push the branch
git push -u origin feature/unify-competition-results-inline-hotfix

# Create PR using gh CLI
gh pr create \
  --title "Unify competition results — prefer inline faux‑TV reveal for all competitions (hotfix)" \
  --body-file PR_DESCRIPTION.md \
  --base main \
  --head feature/unify-competition-results-inline-hotfix
```

## Commits in This Branch

```
33056e2 - Add comprehensive PR description and testing guide
3d40a48 - Unify competition results: prefer inline reveal, add diagnostics
1b981bf - Initial plan
```

## Files Changed

- js/competitions-flow.js (enhanced diagnostics)
- js/competitions.js (removed cinematics from primary flow) 
- js/results-popup.js (marked as fallback)
- js/results-runtime-guard.js (improved diagnostics)
- test_immediate_results.html (added runtime guard)
- test_intermission_ux_integration.html (added runtime guard)
- test_veto_winner_only.html (added runtime guard)
- test_hoh_skip_results.html (added note)
- PR_DESCRIPTION.md (new - comprehensive PR documentation)

## PR Body Preview

The PR description is in `PR_DESCRIPTION.md` and includes:

- 🎯 Summary of changes
- 📋 Problem statement
- ✨ Solution approach
- 📝 Complete file-by-file breakdown
- 🧪 Testing instructions (automated + manual)
- 🔍 Success/warning indicators
- 🔒 Safety verifications
- 🚀 Deployment plan
- 📊 Impact analysis
- 🤝 Review checklist

## Quick Verification Before Creating PR

Run these commands to verify everything is ready:

```bash
# Check branch status
git status
git log --oneline -3

# Verify tests pass
npm run test:minigames
npm run build:progression

# Verify no lint errors
npx eslint js/competitions-flow.js js/competitions.js js/results-popup.js js/results-runtime-guard.js

# All should pass/succeed ✅
```

## After PR is Created

1. Review the PR yourself first
2. Run manual tests as described in PR_DESCRIPTION.md
3. Check that all CI checks pass (if configured)
4. Request reviews from appropriate team members
5. Address any review feedback
6. Merge when approved

## Notes

- The PR implements all requirements from the original problem statement
- All tests pass successfully
- Code is cleaner (net -22 lines despite adding features)
- Comprehensive diagnostics with emoji indicators make debugging easier
- Runtime guard ensures backward compatibility
- FinaleCinematics code preserved for safety (can be removed in future PR)
