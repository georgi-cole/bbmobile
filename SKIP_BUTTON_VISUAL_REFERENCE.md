# Skip Button Visual Reference

## What Was REMOVED ❌

### 1. Legacy Skip Intro Button (ui.hud-and-router.js)
```javascript
// ❌ REMOVED - No longer exists
function ensureSkipIntroButton(){
  let btn=document.getElementById('btnSkipIntro');
  if(btn) return btn;
  const tv=document.getElementById('tv'); if(!tv) return null;
  btn=document.createElement('button');
  btn.id='btnSkipIntro'; btn.className='btn small';
  btn.textContent='Skip';
  btn.title='Fast-forward this phase';
  btn.style.cssText='position:absolute;top:10px;right:12px;z-index:11;pointer-events:auto;';
  tv.appendChild(btn);
  btn.onclick=()=>fastForwardPhase();
  return btn;
}

function removeSkipIntroButton(){ 
  const b=document.getElementById('btnSkipIntro'); 
  if(b) b.remove(); 
}
```

### 2. Legacy Skip Timer Button (bootstrap.js)
```javascript
// ❌ REMOVED - No longer exists
function ensureSkipTimerButton(){
  const c=document.getElementById('countdown'); if(!c) return;
  if(document.getElementById('btnFastForward')) return;
  const btn=document.createElement('button');
  btn.id='btnFastForward'; btn.className='btn small'; btn.textContent='⏩ Skip';
  btn.style.marginLeft='8px';
  btn.style.display='none'; // Hide legacy skip button
  c.parentElement && c.parentElement.appendChild(btn);
  btn.addEventListener('click',()=>global.fastForwardPhase?.());
}
```

### 3. Legacy Skip Button Hiding Logic (index.html)
```javascript
// ❌ REMOVED - No longer exists
function hideLegacySkipButtons(){
  // Hide any skip buttons outside the progress bar
  const legacyButtons = Array.from(document.querySelectorAll('button, .btn'))
    .filter(el => {
      const text = el.textContent || '';
      return (/^\s*skip\s*$/i.test(text) || /⏩/.test(text)) && 
             el.id !== 'timerSkipProgressBar' &&
             !el.closest('#timerSkipProgressBar');
    });
  
  legacyButtons.forEach(btn => {
    btn.style.display = 'none';
  });
  
  // Also hide btnFastForward if it exists
  const btnFastForward = document.getElementById('btnFastForward');
  if(btnFastForward){
    btnFastForward.style.display = 'none';
  }
}

// Periodically hide legacy skip buttons (in case they're added dynamically)
setInterval(hideLegacySkipButtons, 1000);
```

---

## What REMAINS ✅

### 1. Progress Bar Skip Button (index.html) - KEPT
```html
<!-- ✅ KEPT - This is the valid House skip button -->
<div 
  id="timerSkipProgressBar" 
  class="timer-skip-progress-bar" 
  role="button" 
  tabindex="0"
  aria-label="Skip to next phase"
  title="Skip to next phase"
>
  <div id="timerSkipProgressFill" class="timer-skip-progress-fill"></div>
  <span class="timer-skip-label">⏩ Skip</span>
</div>
```

**Purpose:** Skip any phase during normal gameplay  
**Visual:** Depleting progress bar with "⏩ Skip" label  
**Location:** Timer area in dashboard (House section)  
**Interaction:** Click/tap or press Enter/Space to skip  

### 2. Video Overlay Skip Button (intro-outro-video.js) - KEPT
```javascript
// ✅ KEPT - This is the valid video skip button
function buildOverlay() {
  // ... video setup ...
  
  const skip = document.createElement('button');
  skip.textContent = 'Skip';
  skip.style.cssText = 'position:absolute;top:calc(env(safe-area-inset-top, 0px) + 12px);right:calc(env(safe-area-inset-right, 0px) + 14px);z-index:10;background:#1f344d;color:#d8e6f5;border:1px solid #2b4767;border-radius:10px;padding:8px 14px;font-weight:700;letter-spacing:.6px;cursor:pointer;opacity:1;pointer-events:auto;';
  skip.setAttribute('aria-label', 'Skip video');
  skip.setAttribute('title', 'Skip video');
  
  // ...
  
  skip.onclick = () => finish('skip');
  
  // ...
}
```

**Purpose:** Skip intro.mp4 or outro.mp4 videos  
**Visual:** Blue "Skip" button in top-right corner  
**Location:** Video overlay (full-screen)  
**Interaction:** Always visible, click/tap to skip  
**Styling:** `opacity:1;pointer-events:auto` ensures it's always visible and interactive  

### 3. Core Skip Function (ui.hud-and-router.js) - KEPT
```javascript
// ✅ KEPT - Core skip functionality used by progress bar
function fastForwardPhase(){
  const game=g.game; if(!game) return;
  
  // Log fast-forward activation
  console.info(`[ff] activate phase=${game.phase}`);
  
  // Stop audio and clear overlays
  cancelAllPhaseAudio();
  flushPhaseCards();
  
  // Activate skip cascade for turbo card display
  try{ UI.activateSkipCascade?.(game.cfg?.skipTurboWindowMs || 4500); }catch{}
  
  const now=Date.now();
  if(game.endAt && game.endAt-now>1200){
    game.endAt = now + 1000;
    // Keep phaseEndsAt in sync for modules relying on it
    game.phaseEndsAt = game.endAt;
  }

  // Special handling for different phases...
}
g.fastForwardPhase = fastForwardPhase;
```

**Purpose:** Core skip logic that advances the game phase  
**Used by:** Progress bar skip button  
**Exposed as:** `window.fastForwardPhase()` and `g.fastForwardPhase`  

---

## Summary

**Removed:** 57 lines of legacy code across 3 files  
**Kept:** 2 valid skip button implementations  
- Progress bar skip (House section)  
- Video overlay skip (intro/outro videos)  

**Result:** Clean, maintainable skip button logic with no conflicts or redundant code.
