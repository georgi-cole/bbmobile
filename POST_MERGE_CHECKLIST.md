# 📋 POST-MERGE VERIFICATION CHECKLIST

## Quick Reference Guide for Testing LV2 Eviction Layout Fix

**After merging to main**, follow this checklist to verify the cache-busting fix is working correctly.

---

## ⏱️ Step 1: Wait for Deployment (1-3 minutes)

After merging PR to main:
- [ ] Wait 1-3 minutes for GitHub Pages to deploy
- [ ] Check GitHub Actions tab (optional) for deployment status

---

## 🌐 Step 2: Open Production Site

1. [ ] Navigate to: **https://georgi-cole.github.io/bbmobile/**
2. [ ] Open DevTools: Press **F12** (Windows) or **Cmd+Option+I** (Mac)
3. [ ] Go to **Network** tab in DevTools
4. [ ] Do a **hard refresh**: **Ctrl+Shift+R** (Windows) or **Cmd+Shift+R** (Mac)

---

## 🔍 Step 3: Network Tab Verification (CRITICAL)

In the Network tab, verify these files load with version parameters:

### CSS Files
- [ ] Find `livevote-compact.css?v=compact-fix-1`
  - Status: **200** ✅ (not 304)
  - Size: ~3.5 KB
  
- [ ] Find `livevote-compact-fullyfit.css?v=compact-fix-1`
  - Status: **200** ✅ (not 304)
  - Size: ~3.4 KB

### JS Files
- [ ] Find `livevote-ui.js?v=compact-fix-1`
  - Status: **200** ✅ (not 304)
  - Size: ~45 KB

**⚠️ IMPORTANT**: If you see these files loading WITHOUT the `?v=compact-fix-1` parameter, it means the HTML hasn't updated yet. Wait 2-3 more minutes and try again.

---

## 🎮 Step 4: Visual Verification (In-Game)

1. [ ] Click **"▶ Start game"** button
2. [ ] Create a new season (or continue if already started)
3. [ ] Progress to **Eviction phase** (Live Vote)
   - You can fast-forward phases if needed

### When LV2 Panel Appears:

#### Layout Check
- [ ] **LV2 panel fills entire #tv area**
  - Bottom edge of blue panel matches faux TV bottom
  - No white space or overflow

#### Headline Check
- [ ] **Headlines have breathing room**
  - "Live Vote" title not cramped
  - Visible spacing between title and avatars

#### Avatar Check
- [ ] **Avatars are centered horizontally**
  - Both avatars appear in middle of faux TV
  - Equal spacing from left and right edges
  - Avatars are larger (not tiny)

#### CTA Button Check
- [ ] Click on one of the avatars to select a nominee
- [ ] **"Evict [Name]" button appears INSIDE visible panel**
  - Button is visible without scrolling
  - Button is not cut off or partially hidden
  - Button is not covered by timer/controls

#### Timer/Controls Check
- [ ] **Timer in top-right is NOT overlapped**
  - "00:00" timer is fully visible
  - TV header "House Network Live" is visible
  - No content covers the top area

---

## 🔬 Step 5: Computed Styles Verification (Optional)

In DevTools Elements tab:

1. [ ] Select the LV2 panel: `#tv .lv2-panel`
2. [ ] Check Computed tab shows:
   ```
   display: grid ✅
   grid-template-rows: auto 1fr auto ✅
   padding: [some value from clamp()] ✅
   gap: [some value from clamp()] ✅
   ```

3. [ ] Select an avatar: `.lv2-avatar`
4. [ ] Check Computed tab shows:
   ```
   width: [value between 80px-160px] ✅
   height: [value between 80px-160px] ✅
   ```

---

## 📱 Step 6: Mobile Testing (Optional)

Test on mobile viewport:

1. [ ] In DevTools, click **device toolbar icon** (Ctrl+Shift+M)
2. [ ] Select **"iPhone 12 Pro"** or similar
3. [ ] Rotate to **portrait** mode (vertical)
4. [ ] Repeat Steps 4 checks above
5. [ ] Verify layout still works on narrow screen

---

## ✅ Success Indicators

### Network Tab
✅ All 3 files load with `?v=compact-fix-1` parameter  
✅ Status 200 responses (fresh files loaded)  

### Visual
✅ Headlines have breathing room (not cramped)  
✅ Avatars centered horizontally (not left-aligned)  
✅ CTA button visible without scrolling  
✅ Timer/controls NOT covered  

### Layout
✅ LV2 panel fills exactly the #tv area  
✅ Bottom edge matches TV bottom  
✅ Balanced spacing between all elements  

---

## ❌ Troubleshooting

### Problem: Files load WITHOUT version parameters
**Solution**: 
- Wait 2-3 more minutes for GitHub Pages to deploy
- Try hard refresh again: Ctrl+Shift+R
- Clear browser cache completely
- Try incognito/private browsing mode

### Problem: Layout still looks crowded
**Solution**:
- Check Network tab - files might not be loading correctly
- Verify Status 200 (not 304 cached)
- Try clearing browser cache completely
- Check Console tab for any errors

### Problem: CTA button still hidden
**Solution**:
- Verify CSS files loaded with version parameters
- Check Computed styles on `.lv2-panel`
- Try refreshing the page
- Check browser console for errors

---

## 📸 Screenshot Opportunity (Optional)

If you want to document the fix:

1. [ ] Take screenshot of Network tab showing version parameters
2. [ ] Take screenshot of LV2 panel with centered layout
3. [ ] Take screenshot of CTA button visible in panel
4. [ ] Add to issue/PR for documentation

---

## 🎉 Success!

If all checks pass:
- ✅ Cache-busting fix is working
- ✅ Optical centering is applied
- ✅ Production site is updated
- ✅ Users will see the improved layout

**Congratulations!** The LV2 eviction layout fix is now live on production.

---

## 📞 Need Help?

If verification fails or you encounter issues:

1. Check **DEPLOYMENT_VERIFICATION.md** for detailed troubleshooting
2. Review **Network tab** for error messages
3. Check **Console tab** for JavaScript errors
4. Verify GitHub Pages deployment succeeded in Actions tab
5. Report findings with screenshots

---

**Estimated Time**: 5-10 minutes for complete verification
