// MODULE: results-popup.js
// Unified competition results popup with preloading, skeleton states, and 1-decimal formatting

(function(global){
  'use strict';

  // Central score formatting helper (1 decimal)
  function formatCompetitionScore(value){
    if(value == null || value === '') return '';
    const num = Number(value);
    if(isNaN(num)) return String(value);
    return num.toFixed(1);
  }
  
  // Integer score formatting helper (Issue 5)
  function formatCompetitionScoreInt(value){
    if(value == null || value === '') return '';
    const num = Number(value);
    if(isNaN(num)) return String(value);
    return Math.round(num).toString();
  }
  
  // Expose globally
  global.formatCompetitionScore = formatCompetitionScore;
  global.formatCompetitionScoreInt = formatCompetitionScoreInt;

  // Preload image with skeleton fallback
  function preloadAvatar(url, timeoutMs = 3000){
    return new Promise((resolve) => {
      const img = new Image();
      const timer = setTimeout(() => {
        img.src = ''; // Cancel load
        resolve(null); // Fallback
      }, timeoutMs);
      
      img.onload = () => {
        clearTimeout(timer);
        resolve(url);
      };
      img.onerror = () => {
        clearTimeout(timer);
        resolve(null);
      };
      img.src = url;
    });
  }

  // Main results popup function
  async function showResultsPopup(options){
    const {
      title = 'Results',
      phase = '',
      topThree = [],
      winnerEmoji = '👑',
      duration = 5000,
      minDisplayTime = 5000
    } = options;
    
    if(!topThree || topThree.length === 0) return;
    
    const startTime = Date.now();
    let dismissible = false;
    let dismissed = false;
    const dismissToken = {}; // Token to guard against late injection after dismiss
    
    function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }
    
    // Helper to get player data
    function getPlayerData(entry){
      let player = null;
      let name = '';
      let scoreRaw = '';
      let id = null;
      
      if(typeof entry === 'object'){
        id = entry.id || null;
        if(id) player = global.getP?.(id);
        name = entry.name || player?.name || 'Player';
        scoreRaw = entry.score !== undefined ? entry.score : (entry.sc !== undefined ? entry.sc : '');
      } else {
        name = entry || 'Player';
      }
      
      // Use centralized avatar resolver
      let avatarUrl;
      if(global.resolveAvatar){
        // Pass player object if available, otherwise pass id or name
        avatarUrl = global.resolveAvatar(player || id || name);
        console.info(`[results-popup] avatar url=${avatarUrl} player=${id || name}`);
      } else {
        // Fallback if resolveAvatar not available
        avatarUrl = player?.avatar || player?.img || player?.photo || 
          `https://api.dicebear.com/6.x/bottts/svg?seed=${encodeURIComponent(name)}`;
        console.info(`[results-popup] avatar url=${avatarUrl} player=${id || name} (no resolver)`);
      }
      
      const scoreFormatted = formatCompetitionScoreInt(scoreRaw); // Use integer formatting
      
      return { id, name, scoreRaw, scoreFormatted, avatarUrl };
    }
    
    // Log popup display
    const winner = getPlayerData(topThree[0]);
    console.info(`[results] show phase=${phase || 'unknown'} winner=${winner.id || winner.name} scoreRaw=${winner.scoreRaw} shown=${winner.scoreFormatted}`);
    
    try {
      // Preload all avatars
      const avatarPromises = topThree.map(entry => {
        const data = getPlayerData(entry);
        return preloadAvatar(data.avatarUrl);
      });
      
      const loadedAvatars = await Promise.all(avatarPromises);
      
      // Log avatar load status
      topThree.forEach((entry, idx) => {
        const data = getPlayerData(entry);
        const loaded = !!loadedAvatars[idx];
        console.info(`[results] avatar player=${data.id || data.name} ${loaded ? 'loaded' : 'fallbackUsed'}`);
      });
      
      // Check if already dismissed during avatar loading
      if(dismissed) return;
      
      // Create modal overlay
      const modal = document.createElement('div');
      modal.className = 'results-modal-overlay';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-labelledby', 'resultsModalTitle');
      modal.setAttribute('aria-modal', 'true');
      modal.style.cssText = `
        position: fixed;
        inset: 0;
        z-index: 9999;
        background: rgba(0,0,0,0.9);
        backdrop-filter: blur(4px);
        display: grid;
        place-items: center;
        animation: resultsModalFadeIn 0.3s ease;
        cursor: default;
      `;
      
      // Create card
      const card = document.createElement('div');
      card.className = 'results-card';
      card.style.cssText = `
        background: linear-gradient(135deg, #1a2937 0%, #0f1a28 100%);
        border: 1px solid rgba(120,180,240,0.35);
        border-radius: 20px;
        padding: 32px 28px;
        box-shadow: 0 20px 60px -20px rgba(0,0,0,0.95);
        max-width: min(500px, 92vw);
        width: 100%;
        animation: resultsCardSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        position: relative;
      `;
      
      // Dismiss hint (shown after 500ms)
      const dismissHint = document.createElement('div');
      dismissHint.className = 'results-dismiss-hint';
      dismissHint.textContent = 'Click to dismiss';
      dismissHint.style.cssText = `
        position: absolute;
        top: 8px;
        right: 12px;
        font-size: 0.7rem;
        color: rgba(255,255,255,0.4);
        opacity: 0;
        transition: opacity 0.3s ease;
        pointer-events: none;
      `;
      card.appendChild(dismissHint);
      
      // Title
      const titleEl = document.createElement('div');
      titleEl.id = 'resultsModalTitle';
      titleEl.textContent = `${title} ${winnerEmoji}`;
      titleEl.style.cssText = `
        font-size: 1.5rem;
        font-weight: 800;
        letter-spacing: 0.6px;
        color: #ffd96b;
        text-align: center;
        margin-bottom: 26px;
        text-shadow: 0 2px 10px rgba(0,0,0,0.6);
      `;
      card.appendChild(titleEl);
      
      // Winner section (large, centered)
      const winnerData = getPlayerData(topThree[0]);
      const winnerAvatar = loadedAvatars[0] || winnerData.avatarUrl;
      
      const winnerSection = document.createElement('div');
      winnerSection.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 14px;
        margin-bottom: 22px;
        padding-bottom: 22px;
        border-bottom: 1px solid rgba(120,180,240,0.25);
      `;
      
      const winnerAvatarEl = document.createElement('img');
      winnerAvatarEl.src = winnerAvatar;
      winnerAvatarEl.alt = winnerData.name;
      // Always start with shimmer, remove when image loads
      winnerAvatarEl.style.cssText = `
        width: 120px;
        height: 120px;
        border-radius: 50%;
        border: 3px solid #ffd96b;
        box-shadow: 0 4px 24px rgba(255,217,107,0.5);
        object-fit: cover;
        background: linear-gradient(90deg, #2a3f54 0%, #1a2f44 50%, #2a3f54 100%);
        background-size: 200% 100%;
        animation: skeleton-shimmer 1.5s infinite;
      `;
      // Remove shimmer when image loads
      winnerAvatarEl.onload = () => {
        winnerAvatarEl.style.background = '';
        winnerAvatarEl.style.animation = '';
      };
      // Handle avatar load failure
      winnerAvatarEl.onerror = function(){
        console.info(`[results-popup] avatar fallback used for player=${winnerData.id || winnerData.name}`);
        this.onerror = null;
        if(global.getAvatarFallback){
          this.src = global.getAvatarFallback(winnerData.name, this.src);
        } else {
          this.src = `https://api.dicebear.com/6.x/bottts/svg?seed=${encodeURIComponent(winnerData.name)}`;
        }
      };
      winnerSection.appendChild(winnerAvatarEl);
      
      const winnerName = document.createElement('div');
      winnerName.textContent = winnerData.name;
      winnerName.style.cssText = `
        font-size: 1.35rem;
        font-weight: 700;
        color: #ffffff;
        text-align: center;
      `;
      winnerSection.appendChild(winnerName);
      
      if(winnerData.scoreFormatted !== ''){
        const winnerScore = document.createElement('div');
        winnerScore.textContent = `Score: ${winnerData.scoreFormatted}`;
        winnerScore.style.cssText = `
          font-size: 1.05rem;
          font-weight: 600;
          color: #88e6a0;
          text-align: center;
        `;
        winnerSection.appendChild(winnerScore);
      }
      
      card.appendChild(winnerSection);
      
      // Runners-up section (2nd and 3rd in horizontal row)
      if(topThree[1] || topThree[2]){
        const runnersUpSection = document.createElement('div');
        runnersUpSection.style.cssText = `
          display: flex;
          justify-content: center;
          gap: 24px;
          flex-wrap: wrap;
        `;
        
        [topThree[1], topThree[2]].forEach((entry, idx) => {
          if(!entry) return;
          
          const player = getPlayerData(entry);
          const place = idx === 0 ? '2nd' : '3rd';
          const avatarUrl = loadedAvatars[idx + 1] || player.avatarUrl;
          
          const runnerUp = document.createElement('div');
          runnerUp.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 9px;
            flex: 0 0 auto;
          `;
          
          const runnerAvatar = document.createElement('img');
          runnerAvatar.src = avatarUrl;
          runnerAvatar.alt = player.name;
          // Always start with shimmer, remove when image loads
          runnerAvatar.style.cssText = `
            width: 70px;
            height: 70px;
            border-radius: 50%;
            border: 2px solid #7cffad;
            box-shadow: 0 2px 14px rgba(124,255,173,0.35);
            object-fit: cover;
            background: linear-gradient(90deg, #2a3f54 0%, #1a2f44 50%, #2a3f54 100%);
            background-size: 200% 100%;
            animation: skeleton-shimmer 1.5s infinite;
          `;
          // Remove shimmer when image loads
          runnerAvatar.onload = () => {
            runnerAvatar.style.background = '';
            runnerAvatar.style.animation = '';
          };
          // Handle avatar load failure
          runnerAvatar.onerror = function(){
            console.info(`[results-popup] avatar fallback used for player=${player.id || player.name}`);
            this.onerror = null;
            if(global.getAvatarFallback){
              this.src = global.getAvatarFallback(player.name, this.src);
            } else {
              this.src = `https://api.dicebear.com/6.x/bottts/svg?seed=${encodeURIComponent(player.name)}`;
            }
          };
          runnerUp.appendChild(runnerAvatar);
          
          const runnerPlace = document.createElement('div');
          runnerPlace.textContent = place;
          runnerPlace.style.cssText = `
            font-size: 0.78rem;
            font-weight: 700;
            color: #96cfff;
            text-transform: uppercase;
            letter-spacing: 0.6px;
          `;
          runnerUp.appendChild(runnerPlace);
          
          const runnerName = document.createElement('div');
          runnerName.textContent = player.name;
          runnerName.style.cssText = `
            font-size: 0.98rem;
            font-weight: 600;
            color: #cedbeb;
            text-align: center;
          `;
          runnerUp.appendChild(runnerName);
          
          if(player.scoreFormatted !== ''){
            const runnerScore = document.createElement('div');
            runnerScore.textContent = player.scoreFormatted;
            runnerScore.style.cssText = `
              font-size: 0.88rem;
              color: #88e6a0;
              font-weight: 500;
            `;
            runnerUp.appendChild(runnerScore);
          }
          
          runnersUpSection.appendChild(runnerUp);
        });
        
        card.appendChild(runnersUpSection);
      }
      
      modal.appendChild(card);
      document.body.appendChild(modal);
      
      // Enable dismissal after 500ms
      setTimeout(() => {
        dismissible = true;
        dismissHint.style.opacity = '1';
      }, 500);
      
      // Click/tap to dismiss (after 500ms)
      const dismissHandler = (e) => {
        if(!dismissible || dismissed) return;
        const elapsed = Date.now() - startTime;
        if(elapsed < minDisplayTime) return; // Force minimum display time
        dismissed = true;
        modal.removeEventListener('click', dismissHandler);
        modal.removeEventListener('keydown', keyHandler);
        modal.style.animation = 'resultsModalFadeOut 0.25s ease';
        setTimeout(() => {
          if(modal.parentNode) modal.remove();
        }, 250);
      };
      
      // ESC to dismiss
      const keyHandler = (e) => {
        if(e.key === 'Escape') dismissHandler(e);
      };
      
      modal.addEventListener('click', dismissHandler);
      modal.addEventListener('keydown', keyHandler);
      
      // Auto-remove after duration
      await sleep(duration);
      if(!dismissed){
        dismissed = true;
        modal.removeEventListener('click', dismissHandler);
        modal.removeEventListener('keydown', keyHandler);
        modal.style.animation = 'resultsModalFadeOut 0.25s ease';
        await sleep(250);
        modal.remove();
      }
    } catch(e) {
      console.warn('[resultsPopup] error', e);
    }
  }
  
  // Export
  global.showResultsPopup = showResultsPopup;
  
})(window);
