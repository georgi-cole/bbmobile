// MODULE: results-popup.js
// Unified competition results popup with preloading, skeleton states, and 1-decimal formatting

(function(global){
  'use strict';

  // Import centralized avatar constants
  const getDicebearUrl = global.getDicebearUrl || function(seed) {
    return `https://api.dicebear.com/6.x/bottts/svg?seed=${encodeURIComponent(seed || 'player')}`;
  };

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
      minDisplayTime = 5000,
      rawScoreMode = false,           // If true, display raw scores instead of normalized
      isNewPersonalBest = false       // If true, show personal best indicator
    } = options;
    
    // Log that this function is being used as fallback (deprecated as primary path)
    console.warn(`[results-popup][${phase || 'unknown'}][FallbackPath] showResultsPopup called - this is a fallback path, not the primary inline reveal`);
    console.info(`[results-popup][${phase || 'unknown'}] Title: ${title}, TopThree count: ${topThree.length}`);
    
    if(!topThree || topThree.length === 0) return;
    
    // Check for fast-forward mode and legacy skip mode
    const cfg = global.game?.cfg || {};
    const ffActive = global.game?.__ffActive || false;
    const skipActive = global.SkipController?.isActive() || false;
    const preserveModal = cfg.fastForwardPreserveResultsModal !== false; // default true
    
    // Legacy skip mode (quarantine/skip entire sequences): suppress modal
    // But FFWD mode with preserveModal: always show modal (inline in TV)
    if(skipActive && !ffActive){
      const winner = topThree[0];
      const winnerId = (typeof winner === 'object') ? winner.id : null;
      const winnerName = (typeof winner === 'object') ? winner.name : winner;
      console.info(`[results-popup][${phase || 'unknown'}] Suppressed under legacy skip - winner=${winnerId || winnerName}`);
      return; // Do not render popup
    }
    
    // Determine rendering mode: inline TV (FFWD) vs fullscreen overlay (normal)
    let renderInlineTV = ffActive && preserveModal;
    console.info(`[results-popup][${phase || 'unknown'}] Render mode: ${renderInlineTV ? 'inline TV' : 'fullscreen overlay'}`);
    
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
      let rawScoreDisplay = null;
      let id = null;
      
      if(typeof entry === 'object'){
        id = entry.id || null;
        if(id) player = global.getP?.(id);
        name = entry.name || player?.name || 'Player';
        scoreRaw = entry.score !== undefined ? entry.score : (entry.sc !== undefined ? entry.sc : '');
        rawScoreDisplay = entry.rawScoreDisplay || null;
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
          getDicebearUrl(name);
        console.info(`[results-popup] avatar url=${avatarUrl} player=${id || name} (no resolver)`);
      }
      
      // Determine score display based on mode
      let scoreFormatted;
      if(rawScoreMode && rawScoreDisplay){
        scoreFormatted = rawScoreDisplay;
      } else {
        scoreFormatted = formatCompetitionScoreInt(scoreRaw); // Use integer formatting
      }
      
      return { id, name, scoreRaw, scoreFormatted, rawScoreDisplay, avatarUrl };
    }
    
    // Log popup display
    const winner = getPlayerData(topThree[0]);
    const mode = renderInlineTV ? 'inline-tv' : 'fullscreen';
    console.info(`[results] show mode=${mode} phase=${phase || 'unknown'} winner=${winner.id || winner.name} scoreRaw=${winner.scoreRaw} shown=${winner.scoreFormatted}`);
    
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
      
      // Detect TV viewport container for inline rendering
      let tvContainer = null;
      if(renderInlineTV){
        tvContainer = document.querySelector('[data-sm-faux-tv]') ||
                      document.querySelector('[data-faux-tv]') ||
                      document.querySelector('.tvViewport') ||
                      document.getElementById('tv');
        
        if(!tvContainer){
          console.warn('[results] FFWD active but TV container not found, falling back to fullscreen');
          renderInlineTV = false; // Update flag to match actual behavior
        }
      }
      
      // Create modal overlay
      const modal = document.createElement('div');
      modal.className = 'results-modal-overlay';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-labelledby', 'resultsModalTitle');
      modal.setAttribute('aria-modal', 'true');
      
      // Inline TV rendering: no backdrop, position within TV
      // Fullscreen rendering: backdrop blur, fixed positioning
      if(renderInlineTV && tvContainer){
        modal.style.cssText = `
          position: absolute;
          inset: 0;
          z-index: 100;
          display: grid;
          place-items: center;
          animation: resultsModalFadeIn 0.2s ease;
          cursor: default;
          pointer-events: auto;
        `;
        console.info('[results] Rendering inline in TV viewport (FFWD mode)');
      } else {
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
        console.info('[results] Rendering fullscreen overlay (normal mode)');
      }
      
      // Create card
      const card = document.createElement('div');
      card.className = 'results-card';
      
      // Reduce padding for inline TV rendering to fit better
      const cardPadding = renderInlineTV ? '20px 16px' : '32px 28px';
      const cardMaxWidth = renderInlineTV ? 'min(450px, 90vw)' : 'min(500px, 92vw)';
      const titleMarginBottom = renderInlineTV ? '18px' : '26px';
      
      card.style.cssText = `
        background: linear-gradient(135deg, #1a2937 0%, #0f1a28 100%);
        border: 1px solid rgba(120,180,240,0.35);
        border-radius: 20px;
        padding: ${cardPadding};
        box-shadow: 0 20px 60px -20px rgba(0,0,0,0.95);
        max-width: ${cardMaxWidth};
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
        margin-bottom: ${titleMarginBottom};
        text-shadow: 0 2px 10px rgba(0,0,0,0.6);
      `;
      card.appendChild(titleEl);
      
      // Determine layout: horizontal for inline TV, vertical for fullscreen
      const useHorizontalLayout = renderInlineTV && tvContainer;
      
      if (useHorizontalLayout) {
        // HORIZONTAL LAYOUT: All 3 players in a single row (for inline TV rendering)
        const horizontalContainer = document.createElement('div');
        horizontalContainer.style.cssText = `
          display: flex;
          justify-content: center;
          gap: 16px;
          flex-wrap: wrap;
        `;
        
        topThree.forEach((entry, idx) => {
          if (!entry) return;
          
          const player = getPlayerData(entry);
          const avatarUrl = loadedAvatars[idx] || player.avatarUrl;
          const isWinner = idx === 0;
          
          const playerCard = document.createElement('div');
          playerCard.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            flex: 0 1 auto;
            min-width: 90px;
            max-width: 120px;
          `;
          
          // Avatar with container div for proper aspect ratio handling
          const avatarContainer = document.createElement('div');
          avatarContainer.style.cssText = `
            width: ${isWinner ? '90px' : '75px'};
            height: ${isWinner ? '90px' : '75px'};
            border-radius: 50%;
            border: ${isWinner ? '3px solid #ffd96b' : '2px solid #7cffad'};
            box-shadow: ${isWinner ? '0 4px 20px rgba(255,217,107,0.4)' : '0 2px 12px rgba(124,255,173,0.3)'};
            overflow: hidden;
            background: linear-gradient(90deg, #2a3f54 0%, #1a2f44 50%, #2a3f54 100%);
            background-size: 200% 100%;
            animation: skeleton-shimmer 1.5s infinite;
            flex-shrink: 0;
          `;
          
          const avatarEl = document.createElement('img');
          avatarEl.src = avatarUrl;
          avatarEl.alt = player.name;
          avatarEl.style.cssText = `
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
          `;
          // Remove shimmer when image loads
          avatarEl.onload = () => {
            avatarContainer.style.background = '';
            avatarContainer.style.animation = '';
          };
          // Handle avatar load failure
          avatarEl.onerror = function(){
            console.info(`[results-popup] avatar fallback used for player=${player.id || player.name}`);
            this.onerror = null;
            if(global.getAvatarFallback){
              this.src = global.getAvatarFallback(player.name, this.src);
            } else {
              this.src = getDicebearUrl(player.name);
            }
          };
          avatarContainer.appendChild(avatarEl);
          playerCard.appendChild(avatarContainer);
          
          // Place badge (1st, 2nd, 3rd)
          const placeBadge = document.createElement('div');
          const placeText = idx === 0 ? '1st' : (idx === 1 ? '2nd' : '3rd');
          placeBadge.textContent = `${placeText} ${isWinner ? '👑' : ''}`;
          placeBadge.style.cssText = `
            font-size: ${isWinner ? '0.85rem' : '0.75rem'};
            font-weight: 700;
            color: ${isWinner ? '#ffd96b' : '#96cfff'};
            text-transform: uppercase;
            letter-spacing: 0.5px;
            text-align: center;
          `;
          playerCard.appendChild(placeBadge);
          
          const playerName = document.createElement('div');
          playerName.textContent = player.name;
          playerName.style.cssText = `
            font-size: ${isWinner ? '1rem' : '0.9rem'};
            font-weight: ${isWinner ? '700' : '600'};
            color: ${isWinner ? '#ffffff' : '#cedbeb'};
            text-align: center;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            max-width: 100%;
          `;
          playerCard.appendChild(playerName);
          
          if(player.scoreFormatted !== undefined && player.scoreFormatted !== null && player.scoreFormatted !== ''){
            const playerScore = document.createElement('div');
            playerScore.textContent = player.scoreFormatted;
            playerScore.style.cssText = `
              font-size: ${isWinner ? '0.95rem' : '0.85rem'};
              color: #88e6a0;
              font-weight: ${isWinner ? '600' : '500'};
              text-align: center;
            `;
            playerCard.appendChild(playerScore);
          }
          
          horizontalContainer.appendChild(playerCard);
        });
        
        card.appendChild(horizontalContainer);
      } else {
        // VERTICAL LAYOUT: Winner on top, runners-up horizontal below (for fullscreen rendering)
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
      
      // Winner avatar with container div for proper aspect ratio handling
      const winnerAvatarContainer = document.createElement('div');
      winnerAvatarContainer.style.cssText = `
        width: 120px;
        height: 120px;
        border-radius: 50%;
        border: 3px solid #ffd96b;
        box-shadow: 0 4px 24px rgba(255,217,107,0.5);
        overflow: hidden;
        background: linear-gradient(90deg, #2a3f54 0%, #1a2f44 50%, #2a3f54 100%);
        background-size: 200% 100%;
        animation: skeleton-shimmer 1.5s infinite;
        flex-shrink: 0;
      `;
      
      const winnerAvatarEl = document.createElement('img');
      winnerAvatarEl.src = winnerAvatar;
      winnerAvatarEl.alt = winnerData.name;
      winnerAvatarEl.style.cssText = `
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      `;
      // Remove shimmer when image loads
      winnerAvatarEl.onload = () => {
        winnerAvatarContainer.style.background = '';
        winnerAvatarContainer.style.animation = '';
      };
      // Handle avatar load failure
      winnerAvatarEl.onerror = function(){
        console.info(`[results-popup] avatar fallback used for player=${winnerData.id || winnerData.name}`);
        this.onerror = null;
        if(global.getAvatarFallback){
          this.src = global.getAvatarFallback(winnerData.name, this.src);
        } else {
          this.src = getDicebearUrl(winnerData.name);
        }
      };
      winnerAvatarContainer.appendChild(winnerAvatarEl);
      winnerSection.appendChild(winnerAvatarContainer);
      
      const winnerName = document.createElement('div');
      winnerName.textContent = winnerData.name;
      winnerName.style.cssText = `
        font-size: 1.35rem;
        font-weight: 700;
        color: #ffffff;
        text-align: center;
      `;
      winnerSection.appendChild(winnerName);
      
      if(winnerData.scoreFormatted !== undefined && winnerData.scoreFormatted !== null && winnerData.scoreFormatted !== ''){
        const winnerScore = document.createElement('div');
        
        // For raw scores, don't add "Score:" prefix as the display is self-descriptive
        const scorePrefix = (rawScoreMode && winnerData.rawScoreDisplay) ? '' : 'Score: ';
        winnerScore.textContent = `${scorePrefix}${winnerData.scoreFormatted}`;
        winnerScore.style.cssText = `
          font-size: 1.05rem;
          font-weight: 600;
          color: #88e6a0;
          text-align: center;
        `;
        winnerSection.appendChild(winnerScore);
        
        // Add personal best indicator if applicable
        if(isNewPersonalBest){
          const pbIndicator = document.createElement('div');
          pbIndicator.textContent = '🏆 New Personal Best!';
          pbIndicator.style.cssText = `
            font-size: 0.95rem;
            font-weight: 700;
            color: #ffd96b;
            text-align: center;
            margin-top: 8px;
            text-shadow: 0 2px 8px rgba(255,217,107,0.4);
            animation: personalBestPulse 1.5s ease-in-out infinite;
          `;
          winnerSection.appendChild(pbIndicator);
        }
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
          
          // Runner-up avatar with container div for proper aspect ratio handling
          const runnerAvatarContainer = document.createElement('div');
          runnerAvatarContainer.style.cssText = `
            width: 70px;
            height: 70px;
            border-radius: 50%;
            border: 2px solid #7cffad;
            box-shadow: 0 2px 14px rgba(124,255,173,0.35);
            overflow: hidden;
            background: linear-gradient(90deg, #2a3f54 0%, #1a2f44 50%, #2a3f54 100%);
            background-size: 200% 100%;
            animation: skeleton-shimmer 1.5s infinite;
            flex-shrink: 0;
          `;
          
          const runnerAvatar = document.createElement('img');
          runnerAvatar.src = avatarUrl;
          runnerAvatar.alt = player.name;
          runnerAvatar.style.cssText = `
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
          `;
          // Remove shimmer when image loads
          runnerAvatar.onload = () => {
            runnerAvatarContainer.style.background = '';
            runnerAvatarContainer.style.animation = '';
          };
          // Handle avatar load failure
          runnerAvatar.onerror = function(){
            console.info(`[results-popup] avatar fallback used for player=${player.id || player.name}`);
            this.onerror = null;
            if(global.getAvatarFallback){
              this.src = global.getAvatarFallback(player.name, this.src);
            } else {
              this.src = getDicebearUrl(player.name);
            }
          };
          runnerAvatarContainer.appendChild(runnerAvatar);
          runnerUp.appendChild(runnerAvatarContainer);
          
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
          
          if(player.scoreFormatted !== undefined && player.scoreFormatted !== null && player.scoreFormatted !== ''){
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
      } // End of vertical layout else block
      
      modal.appendChild(card);
      
      // Append to TV container (inline) or body (fullscreen)
      if(renderInlineTV && tvContainer){
        tvContainer.appendChild(modal);
      } else {
        document.body.appendChild(modal);
      }
      
      // Compute effective duration and min display time
      let effectiveDuration = duration;
      let effectiveMinDisplay = minDisplayTime;
      
      if(ffActive){
        // Under FFWD, use compressed durations
        const ffMinMs = cfg.fastForwardResultsMinMs || 1500;
        const compressedDuration = duration * (cfg.fastForwardMultiplier || 0.1);
        // Use the maximum of: config min, requested min, and compressed duration
        effectiveDuration = Math.max(ffMinMs, minDisplayTime, compressedDuration);
        effectiveMinDisplay = Math.max(ffMinMs, minDisplayTime);
        console.info(`[results] FFWD active: duration=${effectiveDuration}ms min=${effectiveMinDisplay}ms`);
      }
      
      // Enable dismissal after 500ms
      setTimeout(() => {
        dismissible = true;
        dismissHint.style.opacity = '1';
      }, 500);
      
      // Click/tap to dismiss (after 500ms)
      let dismissHandler;
      
      // ESC to dismiss
      const keyHandler = (e) => {
        if(e.key === 'Escape') dismissHandler(e);
      };
      
      dismissHandler = (_e) => {
        if(!dismissible || dismissed) return;
        const elapsed = Date.now() - startTime;
        if(elapsed < effectiveMinDisplay) return; // Force minimum display time
        dismissed = true;
        modal.removeEventListener('click', dismissHandler);
        modal.removeEventListener('keydown', keyHandler);
        modal.style.animation = 'resultsModalFadeOut 0.25s ease';
        setTimeout(() => {
          if(modal.parentNode) modal.remove();
        }, 250);
      };
      
      modal.addEventListener('click', dismissHandler);
      modal.addEventListener('keydown', keyHandler);
      
      // Auto-remove after duration
      await sleep(effectiveDuration);
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
  
  // Drainer for SkipController integration
  function resultsPopupDrainer(){
    let didWork = false;
    
    // Remove any results modal overlays
    const modals = document.querySelectorAll('.results-modal-overlay');
    if(modals.length > 0){
      modals.forEach(modal => modal.remove());
      didWork = true;
    }
    
    return didWork;
  }
  
  // Export
  global.showResultsPopup = showResultsPopup;
  
  // Register drainer with SkipController
  if(global.SkipController){
    global.SkipController.registerDrainer('resultsPopup', resultsPopupDrainer);
  }
  
})(window);
