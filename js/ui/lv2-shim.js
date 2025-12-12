// MODULE: lv2-shim.js
// Minimal compatibility shim for window.lv2 API
// Routes createCtaBar to EvictionCarousel when available; otherwise provides fallback UI
// Prevents runtime errors if legacy livevote files are absent

(function(global) {
  'use strict';

  // State for tracking active UI
  const state = {
    container: null,
    nominees: [],
    onVoteCallback: null,
    isActive: false,
    voteFeed: [], // Track incoming votes for display
    userCanVote: true // Track if user's turn to vote
  };

  /**
   * Helper to get Dicebear avatar URL (safe fallback for external service)
   */
  function getDicebearUrl(seed) {
    try {
      const safeSeed = String(seed || 'player').replace(/[^\w\s-]/g, '').substring(0, 50);
      return `https://api.dicebear.com/6.x/bottts/svg?seed=${encodeURIComponent(safeSeed)}`;
    } catch (e) {
      // Fallback to data URI if external service fails
      return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ccc" width="100" height="100"/%3E%3C/svg%3E';
    }
  }

  /**
   * Initialize lv2 with nominees
   * @param {Object} config - Configuration object with leftName, rightName, leftId, rightId
   */
  function init(config) {
    if (!config || (!config.leftName && !config.rightName)) {
      console.warn('[lv2-shim] Invalid init config', config);
      return;
    }

    // Build nominees array from config
    state.nominees = [];
    if (config.leftName && config.leftId !== null && config.leftId !== undefined) {
      const leftPlayer = global.getP ? global.getP(config.leftId) : null;
      state.nominees.push({
        id: config.leftId,
        name: config.leftName,
        photo: leftPlayer?.avatar || getDicebearUrl(config.leftName)
      });
    }
    if (config.rightName && config.rightId !== null && config.rightId !== undefined) {
      const rightPlayer = global.getP ? global.getP(config.rightId) : null;
      state.nominees.push({
        id: config.rightId,
        name: config.rightName,
        photo: rightPlayer?.avatar || getDicebearUrl(config.rightName)
      });
    }

    console.debug('[lv2-shim] Initialized with nominees:', state.nominees);
  }

  /**
   * Initialize triple nominee UI (3-up view)
   * @param {Object} config - Configuration with nominees array and onVote callback
   */
  function initTriple(config) {
    if (!config || !Array.isArray(config.nominees) || config.nominees.length !== 3) {
      console.warn('[lv2-shim] Invalid initTriple config', config);
      return;
    }

    // Store nominees and callback
    state.nominees = config.nominees.map(n => ({
      id: n.id,
      name: n.name || 'Unknown',
      photo: n.photo || getDicebearUrl(n.name || n.id)
    }));
    state.onVoteCallback = config.onVote;

    // Find container
    const container = findContainer();
    if (!container) {
      console.warn('[lv2-shim] No container found for initTriple');
      return;
    }

    state.container = container;

    // Render triple nominee UI
    renderTripleUI(container);
    
    console.debug('[lv2-shim] Initialized triple UI with nominees:', state.nominees);
  }

  /**
   * Render triple nominee UI (3-up view)
   * Uses fixed positioning for visibility
   */
  function renderTripleUI(container) {
    cleanup(); // Clear any existing UI

    const tripleRoot = document.createElement('div');
    tripleRoot.className = 'lv2-shim-triple';
    tripleRoot.style.cssText = `
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 20px;
      gap: 16px;
      background: rgba(0, 0, 0, 0.95);
      border-top: 3px solid #d9534f;
      z-index: 9999;
      pointer-events: auto;
      box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.5);
      max-height: 60vh;
      overflow-y: auto;
    `;

    const title = document.createElement('div');
    title.textContent = 'Vote to Evict';
    title.style.cssText = `
      font-size: 24px;
      font-weight: bold;
      color: white;
      margin-bottom: 8px;
      text-align: center;
    `;
    tripleRoot.appendChild(title);

    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
      display: flex;
      gap: 16px;
      justify-content: center;
      flex-wrap: wrap;
      width: 100%;
      max-width: 800px;
    `;

    state.nominees.forEach(nominee => {
      const card = document.createElement('div');
      card.className = 'lv2-nominee-card';
      card.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 16px;
        background: rgba(255, 255, 255, 0.1);
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-radius: 12px;
        transition: all 0.3s ease;
        min-width: 150px;
        flex: 1;
        max-width: 200px;
      `;
      
      card.addEventListener('mouseenter', () => {
        if (state.userCanVote) {
          card.style.background = 'rgba(255, 255, 255, 0.2)';
          card.style.borderColor = '#d9534f';
        }
      });
      
      card.addEventListener('mouseleave', () => {
        card.style.background = 'rgba(255, 255, 255, 0.1)';
        card.style.borderColor = 'rgba(255, 255, 255, 0.3)';
      });

      const nameEl = document.createElement('div');
      nameEl.textContent = nominee.name;
      nameEl.style.cssText = `
        font-size: 18px;
        font-weight: 600;
        color: white;
        margin-bottom: 12px;
        text-align: center;
      `;
      card.appendChild(nameEl);

      const btn = document.createElement('button');
      btn.className = 'lv2-vote-btn';
      btn.dataset.nomineeId = nominee.id;
      btn.textContent = 'Evict';
      btn.style.cssText = `
        padding: 10px 24px;
        font-size: 16px;
        font-weight: bold;
        cursor: pointer;
        border: 2px solid #d9534f;
        background: #d9534f;
        color: white;
        border-radius: 8px;
        transition: all 0.3s ease;
        width: 100%;
      `;
      
      if (!state.userCanVote) {
        btn.disabled = true;
        btn.style.opacity = '0.5';
        btn.style.cursor = 'not-allowed';
      }
      
      btn.addEventListener('mouseenter', () => {
        if (!btn.disabled) {
          btn.style.background = '#c9302c';
          btn.style.borderColor = '#c9302c';
        }
      });
      
      btn.addEventListener('mouseleave', () => {
        if (!btn.disabled) {
          btn.style.background = '#d9534f';
          btn.style.borderColor = '#d9534f';
        }
      });
      
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!state.userCanVote) return;
        
        // Disable all buttons
        tripleRoot.querySelectorAll('.lv2-vote-btn').forEach(b => {
          b.disabled = true;
          b.style.opacity = '0.5';
          b.style.cursor = 'not-allowed';
        });
        
        state.userCanVote = false;
        console.debug('[lv2-shim] Triple vote:', nominee.id);
        
        if (state.onVoteCallback) {
          await state.onVoteCallback(nominee.id);
        }
      });
      
      card.addEventListener('click', () => {
        if (!btn.disabled) {
          btn.click();
        }
      });
      
      card.appendChild(btn);
      buttonContainer.appendChild(card);
    });

    tripleRoot.appendChild(buttonContainer);

    // Vote feed section
    const voteFeedSection = document.createElement('div');
    voteFeedSection.className = 'lv2-vote-feed';
    voteFeedSection.style.cssText = `
      width: 100%;
      max-width: 800px;
      margin-top: 8px;
    `;

    const feedTitle = document.createElement('div');
    feedTitle.textContent = 'Live Votes';
    feedTitle.style.cssText = `
      font-size: 14px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.7);
      margin-bottom: 8px;
      text-align: center;
    `;
    voteFeedSection.appendChild(feedTitle);

    const feedList = document.createElement('div');
    feedList.className = 'lv2-vote-feed-list';
    feedList.id = 'lv2VoteFeedList';
    feedList.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 4px;
      max-height: 120px;
      overflow-y: auto;
      padding: 8px;
      background: rgba(0, 0, 0, 0.3);
      border-radius: 8px;
    `;
    voteFeedSection.appendChild(feedList);

    tripleRoot.appendChild(voteFeedSection);

    container.appendChild(tripleRoot);
    state.container = tripleRoot;
    state.isActive = true;

    console.debug('[lv2-shim] Rendered triple UI with vote feed');
  }

  /**
   * Create CTA bar for voting
   * Routes to EvictionCarousel if available; otherwise shows fallback UI
   * @param {Object} config - Optional configuration object with onVote callback
   */
  function createCtaBar(config) {
    // Backward compatibility: handle being called without config
    config = config || {};
    
    if (!state.nominees.length) {
      console.warn('[lv2-shim] No nominees available for createCtaBar');
      return;
    }

    // Store callback from config if provided
    if (config.onVote) {
      state.onVoteCallback = config.onVote;
    }

    // Find container (TV or panel)
    const container = findContainer();
    if (!container) {
      console.warn('[lv2-shim] No container found for createCtaBar');
      return;
    }

    state.container = container;

    // Try to use EvictionCarousel if available
    if (global.EvictionCarousel && typeof global.EvictionCarousel.render === 'function') {
      try {
        global.EvictionCarousel.render(container, state.nominees, {
          onVote: async (nomineeId) => {
            console.debug('[lv2-shim] Vote triggered via EvictionCarousel:', nomineeId);
            if (state.onVoteCallback) {
              await state.onVoteCallback(nomineeId);
            }
          }
        });
        state.isActive = true;
        console.debug('[lv2-shim] Rendered EvictionCarousel');
        return;
      } catch (err) {
        console.error('[lv2-shim] Error rendering EvictionCarousel:', err);
      }
    }

    // Fallback: simple button UI
    renderFallbackUI(container);
  }

  /**
   * Always render to document.body with fixed positioning
   * This prevents the UI from being hidden/detached when panels change
   */
  function findContainer() {
    return document.body;
  }

  /**
   * Render fallback UI when EvictionCarousel is not available
   * Renders to document.body with fixed positioning at bottom for visibility
   */
  function renderFallbackUI(container) {
    cleanup(); // Clear any existing UI

    const fallbackRoot = document.createElement('div');
    fallbackRoot.className = 'lv2-shim-fallback';
    fallbackRoot.style.cssText = `
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 20px;
      background: rgba(0, 0, 0, 0.95);
      border-top: 3px solid #d9534f;
      z-index: 9999;
      pointer-events: auto;
      box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.5);
      max-height: 50vh;
      overflow-y: auto;
    `;

    const title = document.createElement('div');
    title.textContent = 'Vote to Evict';
    title.style.cssText = `
      font-size: 24px;
      font-weight: bold;
      color: white;
      margin-bottom: 16px;
      text-align: center;
    `;
    fallbackRoot.appendChild(title);

    // Nominee cards container
    const cardsContainer = document.createElement('div');
    cardsContainer.className = 'lv2-nominee-cards';
    cardsContainer.style.cssText = `
      display: flex;
      gap: 16px;
      justify-content: center;
      flex-wrap: wrap;
      margin-bottom: 16px;
      width: 100%;
      max-width: 600px;
    `;

    state.nominees.forEach(nominee => {
      const card = document.createElement('div');
      card.className = 'lv2-nominee-card';
      card.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 16px;
        background: rgba(255, 255, 255, 0.1);
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-radius: 12px;
        min-width: 150px;
        flex: 1;
        max-width: 250px;
        transition: all 0.3s ease;
      `;
      
      card.addEventListener('mouseenter', () => {
        if (state.userCanVote) {
          card.style.background = 'rgba(255, 255, 255, 0.2)';
          card.style.borderColor = '#d9534f';
        }
      });
      
      card.addEventListener('mouseleave', () => {
        card.style.background = 'rgba(255, 255, 255, 0.1)';
        card.style.borderColor = 'rgba(255, 255, 255, 0.3)';
      });

      // Avatar image
      const avatar = document.createElement('img');
      avatar.src = nominee.photo;
      avatar.alt = nominee.name;
      avatar.style.cssText = `
        width: 80px;
        height: 80px;
        border-radius: 50%;
        margin-bottom: 12px;
        border: 3px solid rgba(255, 255, 255, 0.3);
      `;
      avatar.onerror = () => {
        // Fallback to initials if image fails
        avatar.style.display = 'none';
        const initials = document.createElement('div');
        initials.textContent = nominee.name.substring(0, 2).toUpperCase();
        initials.style.cssText = `
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: #d9534f;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
          font-weight: bold;
          margin-bottom: 12px;
        `;
        card.insertBefore(initials, card.firstChild);
      };
      card.appendChild(avatar);

      // Name
      const nameEl = document.createElement('div');
      nameEl.textContent = nominee.name;
      nameEl.style.cssText = `
        font-size: 18px;
        font-weight: 600;
        color: white;
        margin-bottom: 12px;
        text-align: center;
      `;
      card.appendChild(nameEl);

      // Vote button
      const btn = document.createElement('button');
      btn.className = 'lv2-vote-btn';
      btn.dataset.nomineeId = nominee.id;
      btn.textContent = 'Evict';
      btn.style.cssText = `
        padding: 10px 24px;
        font-size: 16px;
        font-weight: bold;
        cursor: pointer;
        border: 2px solid #d9534f;
        background: #d9534f;
        color: white;
        border-radius: 8px;
        transition: all 0.3s ease;
        pointer-events: auto;
        width: 100%;
      `;
      
      if (!state.userCanVote) {
        btn.disabled = true;
        btn.style.opacity = '0.5';
        btn.style.cursor = 'not-allowed';
      }
      
      btn.addEventListener('mouseenter', () => {
        if (!btn.disabled) {
          btn.style.background = '#c9302c';
          btn.style.borderColor = '#c9302c';
          btn.style.transform = 'scale(1.05)';
        }
      });
      
      btn.addEventListener('mouseleave', () => {
        if (!btn.disabled) {
          btn.style.background = '#d9534f';
          btn.style.borderColor = '#d9534f';
          btn.style.transform = 'scale(1)';
        }
      });
      
      btn.addEventListener('click', async () => {
        if (!state.userCanVote) return;
        
        // Disable all vote buttons
        fallbackRoot.querySelectorAll('.lv2-vote-btn').forEach(b => {
          b.disabled = true;
          b.style.opacity = '0.5';
          b.style.cursor = 'not-allowed';
        });
        
        state.userCanVote = false;
        console.debug('[lv2-shim] Fallback vote:', nominee.id);
        
        if (state.onVoteCallback) {
          await state.onVoteCallback(nominee.id);
        }
      });
      
      card.appendChild(btn);
      cardsContainer.appendChild(card);
    });

    fallbackRoot.appendChild(cardsContainer);

    // Vote feed section
    const voteFeedSection = document.createElement('div');
    voteFeedSection.className = 'lv2-vote-feed';
    voteFeedSection.style.cssText = `
      width: 100%;
      max-width: 600px;
      margin-top: 8px;
    `;

    const feedTitle = document.createElement('div');
    feedTitle.textContent = 'Live Votes';
    feedTitle.style.cssText = `
      font-size: 14px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.7);
      margin-bottom: 8px;
      text-align: center;
    `;
    voteFeedSection.appendChild(feedTitle);

    const feedList = document.createElement('div');
    feedList.className = 'lv2-vote-feed-list';
    feedList.id = 'lv2VoteFeedList';
    feedList.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 4px;
      max-height: 150px;
      overflow-y: auto;
      padding: 8px;
      background: rgba(0, 0, 0, 0.3);
      border-radius: 8px;
    `;
    voteFeedSection.appendChild(feedList);

    fallbackRoot.appendChild(voteFeedSection);

    container.appendChild(fallbackRoot);
    state.container = fallbackRoot;
    state.isActive = true;

    console.debug('[lv2-shim] Rendered fallback UI with vote feed');
  }

  /**
   * Set whether it's the user's turn to vote
   * @param {boolean} isActive - Whether user can vote now
   */
  function setTurn(isActive) {
    state.userCanVote = isActive;
    console.debug('[lv2-shim] setTurn:', isActive);
    
    // Update button states if UI is active
    if (state.container) {
      const buttons = state.container.querySelectorAll('.lv2-vote-btn');
      buttons.forEach(btn => {
        btn.disabled = !isActive;
        btn.style.opacity = isActive ? '1' : '0.5';
        btn.style.cursor = isActive ? 'pointer' : 'not-allowed';
      });
    }
  }

  /**
   * Push a vote (for AI/other players)
   * @param {Object} vote - Vote data with voterId, voterName, pick
   */
  function pushVote(vote) {
    console.debug('[lv2-shim] pushVote:', vote);
    
    // Store vote in feed
    state.voteFeed.push(vote);
    
    // Update vote feed UI if container exists
    if (state.container) {
      const feedList = state.container.querySelector('#lv2VoteFeedList');
      if (feedList) {
        const voteItem = document.createElement('div');
        voteItem.className = 'lv2-vote-item';
        voteItem.style.cssText = `
          padding: 6px 12px;
          background: rgba(255, 255, 255, 0.05);
          border-left: 3px solid #d9534f;
          border-radius: 4px;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.9);
          animation: slideIn 0.3s ease-out;
        `;
        
        const voterName = vote.voterName || 'Unknown';
        const targetName = vote.pick != null 
          ? (state.nominees.find(n => n.id === vote.pick)?.name || 'Unknown')
          : 'Unknown';
        
        voteItem.textContent = `${voterName} voted to evict ${targetName}`;
        
        // Add to top of feed
        feedList.insertBefore(voteItem, feedList.firstChild);
        
        // Limit feed to last 10 votes
        while (feedList.children.length > 10) {
          feedList.removeChild(feedList.lastChild);
        }
      }
    }
    
    // Emit event for compatibility
    try {
      if (global.game?.bus?.emit) {
        global.game.bus.emit('eviction:vote', { 
          nomineeId: vote.pick, 
          voterId: vote.voterId,
          isAI: true 
        });
      }
    } catch (e) {
      console.debug('[lv2-shim] Could not emit vote event:', e);
    }
  }

  /**
   * Finish voting phase
   */
  function finish() {
    console.debug('[lv2-shim] finish called');
    cleanup();
  }

  /**
   * Clean up and remove UI
   */
  function cleanup() {
    if (global.EvictionCarousel && typeof global.EvictionCarousel.teardown === 'function') {
      try {
        global.EvictionCarousel.teardown();
      } catch (err) {
        console.error('[lv2-shim] Error tearing down EvictionCarousel:', err);
      }
    }

    if (state.container && state.container.parentNode) {
      try {
        state.container.remove();
      } catch (e) {
        console.debug('[lv2-shim] Could not remove container:', e);
      }
    }

    state.container = null;
    state.isActive = false;
    state.voteFeed = [];
    state.userCanVote = true;
    console.debug('[lv2-shim] Cleanup complete');
  }

  // Stub methods for backward compatibility (do nothing in shim)
  function updateCtaBar() { console.debug('[lv2-shim] updateCtaBar (stub)'); }
  function showCtaBar() {
    console.debug('[lv2-shim] showCtaBar');
    if (state.container) {
      state.container.style.display = 'flex';
    }
  }
  function hideCtaBar() { 
    console.debug('[lv2-shim] hideCtaBar'); 
    cleanup();
  }
  function hideCtasTriple() {
    console.debug('[lv2-shim] hideCtasTriple');
    cleanup();
  }
  function showTurnIndicator() { setTurn(true); }
  function hideTurnIndicator() { setTurn(false); }
  function beginResultCardPhase() { 
    console.debug('[lv2-shim] beginResultCardPhase'); 
    cleanup();
  }
  function endResultCardPhase() { console.debug('[lv2-shim] endResultCardPhase (stub)'); }
  function showEvicteeFinal() { 
    console.debug('[lv2-shim] showEvicteeFinal (stub)'); 
    return Promise.resolve();
  }
  function supportsInlineCard() { return false; }
  function showInlineCard() { 
    console.debug('[lv2-shim] showInlineCard (stub)');
    return Promise.resolve();
  }
  function enterExternalOverlayMode() { console.debug('[lv2-shim] enterExternalOverlayMode (stub)'); }
  function exitExternalOverlayMode() { console.debug('[lv2-shim] exitExternalOverlayMode (stub)'); }

  // Public API compatible with window.lv2
  const lv2 = {
    init: init,
    initTriple: initTriple,
    createCtaBar: createCtaBar,
    setTurn: setTurn,
    pushVote: pushVote,
    finish: finish,
    cleanup: cleanup,
    updateCtaBar: updateCtaBar,
    showCtaBar: showCtaBar,
    hideCtaBar: hideCtaBar,
    hideCtasTriple: hideCtasTriple,
    showTurnIndicator: showTurnIndicator,
    hideTurnIndicator: hideTurnIndicator,
    beginResultCardPhase: beginResultCardPhase,
    endResultCardPhase: endResultCardPhase,
    showEvicteeFinal: showEvicteeFinal,
    supportsInlineCard: supportsInlineCard,
    showInlineCard: showInlineCard,
    enterExternalOverlayMode: enterExternalOverlayMode,
    exitExternalOverlayMode: exitExternalOverlayMode,
    
    // Expose onVoteCallback setter for external integration
    setOnVote: function(callback) {
      state.onVoteCallback = callback;
    },
    
    // Read-only properties
    get enabled() {
      return true; // Shim is always enabled
    },
    set enabled(val) {
      console.debug('[lv2-shim] enabled setter (ignored):', val);
    },
    get reducedMotion() {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
  };

  // Expose on global only if not already defined
  if (!global.lv2) {
    global.lv2 = lv2;
    console.debug('[lv2-shim] Shim API exposed on window.lv2');
  } else {
    console.debug('[lv2-shim] window.lv2 already exists, skipping shim');
  }

})(window);
