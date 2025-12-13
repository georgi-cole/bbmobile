/**
 * MODULE: js/ui/juror-return-overlay.js
 * 
 * Jurors Return Overlay - Fullscreen overlay for the Juror Return twist (America's Vote)
 * 
 * DESIGN:
 * - Clone-first: NEVER moves the original panel DOM node, only clones it for display
 * - Defensive mount: tries known game APIs first, then falls back to Fans' Favorite host selectors
 * - Local-only quick-vote: visual effects only, no network vote submission
 * - Debug hook: shows overlay when ?juror_debug=1 is in URL
 * - ES-safe: works without build tooling, exposes window.JurorReturnOverlay
 * - Minimal inline styles: works without requiring immediate CSS changes
 * 
 * SAFETY:
 * - Original panel node stays in DOM (prevents phase skip bugs)
 * - All game API calls are guarded (won't break if APIs missing)
 * - Quick-vote is local visual only (no vote submission)
 * - Hide cleanup is safe (removes clones, unregisters from APIs)
 */

(function(global) {
  'use strict';

  // State management
  let overlayElement = null;
  let isShowing = false;
  let messageIntervalId = null;
  let emojiIntervalId = null;
  let clonedContent = null;
  let focusedElementBeforeOpen = null;
  let mountMethod = null; // Track which mount method was used

  // Sample public reaction messages
  const sampleMessages = [
    'I voted for {player1}, bring them back! 🔥',
    '{player2} deserves a second chance! 💯',
    '{player3} got robbed, let them return! 😤',
    '{player1} needs to come back and shake things up 🧠',
    "Can't believe {player2} was evicted! Bring them back! 🎉",
    '{player3} deserves to return 100% 👑',
    'My vote is for {player1} all the way! ⭐',
    '{player2} was eliminated too soon 🤝',
    'Nobody played like {player3}! Bring them back! 🏆',
    '{player1} should get another shot ❤️'
  ];

  // Emoji pool for floating effects
  const emojiPool = ['🎉', '🔥', '⭐', '💯', '👑', '❤️', '💪', '✨', '🏆', '🎯', '😍', '🤩'];

  /**
   * Initialize module (called on load)
   */
  function init() {
    console.log('[JurorReturnOverlay] Module initialized');
    
    // Check for debug URL parameter
    const urlParams = new URLSearchParams(global.location.search);
    if (urlParams.get('juror_debug') === '1') {
      console.log('[JurorReturnOverlay] Debug mode detected, auto-showing overlay');
      setTimeout(() => {
        debugShow();
      }, 1000);
    }
  }

  /**
   * Get juror list from window.game with fallback
   */
  function getJurorList() {
    try {
      if (global.game && Array.isArray(global.game.juryHouse) && global.game.juryHouse.length > 0) {
        const jurors = global.game.juryHouse.map(id => {
          const player = global.getP ? global.getP(id) : null;
          if (player) {
            return {
              id: player.id,
              name: player.name || (global.safeName ? global.safeName(id) : `Player ${id}`),
              avatarUrl: player.avatar || getDicebearUrl(player.name || `Player${id}`)
            };
          }
          return {
            id: id,
            name: global.safeName ? global.safeName(id) : `Player ${id}`,
            avatarUrl: getDicebearUrl(`Player${id}`)
          };
        });
        return jurors;
      }

      // Fallback: create sample juror list
      console.warn('[JurorReturnOverlay] No juryHouse found, using sample data');
      const numJurors = 4 + Math.floor(Math.random() * 3); // 4-6 jurors
      const fallbackJurors = [];
      for (let i = 1; i <= numJurors; i++) {
        fallbackJurors.push({
          id: i,
          name: `Juror ${i}`,
          avatarUrl: getDicebearUrl(`Juror${i}`)
        });
      }
      return fallbackJurors;
    } catch (err) {
      console.error('[JurorReturnOverlay] Error getting juror list:', err);
      return [
        { id: 1, name: 'Juror 1', avatarUrl: getDicebearUrl('Juror1') },
        { id: 2, name: 'Juror 2', avatarUrl: getDicebearUrl('Juror2') },
        { id: 3, name: 'Juror 3', avatarUrl: getDicebearUrl('Juror3') },
        { id: 4, name: 'Juror 4', avatarUrl: getDicebearUrl('Juror4') }
      ];
    }
  }

  /**
   * Get Dicebear avatar URL
   */
  function getDicebearUrl(seed) {
    return `https://api.dicebear.com/6.x/bottts/svg?seed=${encodeURIComponent(seed || 'player')}`;
  }

  /**
   * Create overlay DOM structure with minimal inline styles
   */
  function createOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'juror-return-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'juror-return-title');
    
    // Minimal inline styles (works without CSS file)
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(10, 15, 22, 0.92);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      z-index: 9999;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 20px;
      overflow-y: auto;
      animation: overlayFadeIn 0.3s ease;
    `;

    overlay.innerHTML = `
      <button class="juror-return-overlay__close" aria-label="Close overlay" title="Close" style="
        position: absolute;
        top: 20px;
        right: 20px;
        width: 40px;
        height: 40px;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 50%;
        color: #e8f4ff;
        font-size: 1.5rem;
        cursor: pointer;
        z-index: 10;
      ">×</button>
      
      <div class="juror-return-overlay__audience-messages" aria-hidden="true" style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 1;
        pointer-events: none;
        overflow: hidden;
      "></div>
      
      <div class="juror-return-overlay__header" style="
        text-align: center;
        margin-bottom: 20px;
        z-index: 2;
        position: relative;
      ">
        <h2 class="juror-return-overlay__title" id="juror-return-title" style="
          font-size: 2rem;
          font-weight: 800;
          color: #00e0cc;
          text-shadow: 0 2px 10px rgba(0, 224, 204, 0.4);
          margin-bottom: 8px;
        ">🗳️ America's Vote</h2>
        <p class="juror-return-overlay__subtitle" style="
          font-size: 0.9rem;
          color: #a8c5db;
          font-weight: 400;
        ">Which juror deserves a second chance?</p>
      </div>
      
      <div class="juror-return-overlay__content" id="juror-return-content" style="
        position: relative;
        z-index: 2;
        max-width: 1200px;
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: 20px;
      "></div>
      
      <div class="juror-return-overlay__quick-vote" style="
        background: rgba(0, 224, 204, 0.1);
        border: 1px solid rgba(0, 224, 204, 0.3);
        border-radius: 12px;
        padding: 16px;
        margin-top: 12px;
        z-index: 2;
        position: relative;
        max-width: 1200px;
        width: 100%;
      ">
        <h3 style="
          font-size: 1.1rem;
          color: #00e0cc;
          margin-bottom: 12px;
          font-weight: 700;
        ">Quick Vote</h3>
        <form class="juror-return-overlay__quick-vote-form" id="quick-vote-form" style="
          display: flex;
          gap: 8px;
          align-items: flex-start;
          flex-wrap: wrap;
        ">
          <input 
            type="text" 
            class="juror-return-overlay__quick-vote-input" 
            id="quick-vote-input"
            placeholder="Enter juror name..."
            autocomplete="off"
            aria-label="Juror name for quick vote"
            style="
              flex: 1;
              min-width: 200px;
              padding: 10px 14px;
              background: rgba(255, 255, 255, 0.05);
              border: 1px solid rgba(255, 255, 255, 0.2);
              border-radius: 8px;
              color: #e8f4ff;
              font-size: 0.95rem;
              outline: none;
            "
          />
          <button 
            type="submit" 
            class="juror-return-overlay__quick-vote-button"
            id="quick-vote-button"
            style="
              padding: 10px 24px;
              background: linear-gradient(135deg, #00e0cc 0%, #00b8a3 100%);
              color: #001a18;
              border: none;
              border-radius: 8px;
              font-size: 0.95rem;
              font-weight: 700;
              cursor: pointer;
              box-shadow: 0 4px 12px rgba(0, 224, 204, 0.2);
            "
          >Send Vote</button>
        </form>
        <div id="quick-vote-validation" role="alert" aria-live="polite"></div>
      </div>
    `;

    return overlay;
  }

  /**
   * Defensive mount: Try known game APIs, fall back to host selectors
   */
  function mountOverlay(overlay) {
    mountMethod = null;

    // Try method 1: IntermissionCard.showInTv (if available)
    if (global.IntermissionCard && typeof global.IntermissionCard.showInTv === 'function') {
      try {
        console.log('[JurorReturnOverlay] Attempting mount via IntermissionCard.showInTv');
        const tvContainer = global.TvContainer?.getTvContainer() || document.getElementById('panel');
        const tvOverlay = global.TvContainer?.getOrCreateTvOverlay(tvContainer, 'juror-return-tv-overlay');
        if (tvOverlay) {
          tvOverlay.appendChild(overlay);
          mountMethod = 'IntermissionCard.showInTv';
          console.log('[JurorReturnOverlay] ✓ Mounted via IntermissionCard.showInTv');
          return true;
        }
      } catch (err) {
        console.warn('[JurorReturnOverlay] IntermissionCard.showInTv mount failed:', err);
      }
    }

    // Try method 2: livevoteHelpers.enterExternalOverlayMode
    if (global.livevoteHelpers && typeof global.livevoteHelpers.enterExternalOverlayMode === 'function') {
      try {
        console.log('[JurorReturnOverlay] Attempting mount via livevoteHelpers.enterExternalOverlayMode');
        global.livevoteHelpers.enterExternalOverlayMode(overlay);
        mountMethod = 'livevoteHelpers.enterExternalOverlayMode';
        console.log('[JurorReturnOverlay] ✓ Mounted via livevoteHelpers.enterExternalOverlayMode');
        return true;
      } catch (err) {
        console.warn('[JurorReturnOverlay] livevoteHelpers mount failed:', err);
      }
    }

    // Try method 3: CardManager.showInTv
    if (global.CardManager && typeof global.CardManager.showInTv === 'function') {
      try {
        console.log('[JurorReturnOverlay] Attempting mount via CardManager.showInTv');
        global.CardManager.showInTv(overlay);
        mountMethod = 'CardManager.showInTv';
        console.log('[JurorReturnOverlay] ✓ Mounted via CardManager.showInTv');
        return true;
      } catch (err) {
        console.warn('[JurorReturnOverlay] CardManager.showInTv mount failed:', err);
      }
    }

    // Fall back to Fans' Favorite host selectors (in order)
    const hostSelectors = [
      '.tvOverlayContent',
      '[data-sm-faux-tv]',
      '.tvContainer',
      '.tvDim',
      '#tv-overlay'
    ];

    for (const selector of hostSelectors) {
      const host = document.querySelector(selector);
      if (host) {
        console.log('[JurorReturnOverlay] Mounting to host selector:', selector);
        host.appendChild(overlay);
        mountMethod = `host-selector:${selector}`;
        console.log('[JurorReturnOverlay] ✓ Mounted via host selector:', selector);
        return true;
      }
    }

    // Final fallback: append to document.body
    console.log('[JurorReturnOverlay] Falling back to document.body mount');
    document.body.appendChild(overlay);
    mountMethod = 'document.body';
    console.log('[JurorReturnOverlay] ✓ Mounted to document.body');
    return true;
  }

  /**
   * Show overlay
   * SAFETY: Always CLONES the juror panel, never moves it
   */
  function show() {
    if (isShowing) {
      console.warn('[JurorReturnOverlay] Already showing');
      return;
    }

    // Save currently focused element
    focusedElementBeforeOpen = document.activeElement;

    // Create overlay if it doesn't exist
    if (!overlayElement) {
      overlayElement = createOverlay();
      mountOverlay(overlayElement);
      attachEventListeners();
    }

    // Find existing juror panel (from jury_return_vote.js or similar)
    const panel = document.getElementById('panel');
    const existingJurorUI = panel ? panel.children[0] : null;

    // CLONE the juror UI to overlay content (NEVER move it)
    const contentContainer = overlayElement.querySelector('#juror-return-content');
    if (existingJurorUI && contentContainer) {
      // Deep clone for display in overlay
      clonedContent = existingJurorUI.cloneNode(true);
      contentContainer.appendChild(clonedContent);
      console.log('[JurorReturnOverlay] Cloned juror panel (original untouched)');
    } else {
      console.warn('[JurorReturnOverlay] No juror panel found to clone');
    }

    // Show overlay
    overlayElement.style.display = 'flex';
    isShowing = true;

    // Start animations
    startAudienceMessages();
    startFloatingEmojis();

    // Focus management
    const closeButton = overlayElement.querySelector('.juror-return-overlay__close');
    if (closeButton) {
      closeButton.focus();
    }

    console.info('[JurorReturnOverlay] Overlay shown via:', mountMethod);
  }

  /**
   * Hide overlay and clean up
   * SAFETY: Only removes clones, original panel stays intact
   */
  function hide() {
    if (!isShowing || !overlayElement) {
      return;
    }

    // Stop animations
    stopAudienceMessages();
    stopFloatingEmojis();

    // Remove cloned content (original panel was never moved)
    if (clonedContent && clonedContent.parentNode) {
      clonedContent.remove();
    }
    clonedContent = null;

    // Hide overlay
    overlayElement.style.display = 'none';
    isShowing = false;

    // Try to unregister from game APIs (guarded)
    try {
      if (mountMethod && mountMethod.includes('livevoteHelpers')) {
        if (global.livevoteHelpers && typeof global.livevoteHelpers.exitExternalOverlayMode === 'function') {
          global.livevoteHelpers.exitExternalOverlayMode();
          console.log('[JurorReturnOverlay] Unregistered from livevoteHelpers');
        }
      }
    } catch (err) {
      console.warn('[JurorReturnOverlay] Unregister failed:', err);
    }

    // Restore focus
    if (focusedElementBeforeOpen && focusedElementBeforeOpen.focus) {
      focusedElementBeforeOpen.focus();
    }

    console.info('[JurorReturnOverlay] Overlay hidden, original panel intact');
  }

  /**
   * Attach event listeners
   */
  function attachEventListeners() {
    if (!overlayElement) return;

    // Close button
    const closeButton = overlayElement.querySelector('.juror-return-overlay__close');
    if (closeButton) {
      closeButton.addEventListener('click', hide);
    }

    // Quick vote form
    const quickVoteForm = overlayElement.querySelector('#quick-vote-form');
    if (quickVoteForm) {
      quickVoteForm.addEventListener('submit', handleQuickVote);
    }

    // Escape key to close
    document.addEventListener('keydown', handleEscapeKey);
  }

  /**
   * Handle escape key
   */
  function handleEscapeKey(e) {
    if (e.key === 'Escape' && isShowing) {
      hide();
    }
  }

  /**
   * Handle quick vote submission (local visual only, NO network submission)
   */
  function handleQuickVote(e) {
    e.preventDefault();

    const input = overlayElement.querySelector('#quick-vote-input');
    const validationDiv = overlayElement.querySelector('#quick-vote-validation');
    const button = overlayElement.querySelector('#quick-vote-button');

    if (!input || !validationDiv) return;

    const jurorName = input.value.trim();
    
    if (!jurorName) {
      showValidation(validationDiv, 'Please enter a juror name', 'error');
      return;
    }

    // Get juror list and validate
    const jurors = getJurorList();
    const matchedJuror = jurors.find(j => 
      j.name.toLowerCase() === jurorName.toLowerCase()
    );

    if (!matchedJuror) {
      showValidation(
        validationDiv, 
        `Juror "${jurorName}" not found. Try: ${jurors.map(j => j.name).join(', ')}`,
        'error'
      );
      return;
    }

    // Valid vote - trigger LOCAL visual effects only
    showValidation(
      validationDiv,
      `Vote sent for ${matchedJuror.name}! 🎉`,
      'success'
    );

    // Flash avatar if visible
    flashJurorAvatar(matchedJuror);

    // Add custom audience message
    addAudienceMessage(`${matchedJuror.name} got a vote to return! ⭐`, true);

    // Clear input
    input.value = '';

    // Briefly disable button
    if (button) {
      button.disabled = true;
      setTimeout(() => { button.disabled = false; }, 1000);
    }

    console.info('[JurorReturnOverlay] Quick vote (local visual only):', matchedJuror.name);
  }

  /**
   * Show validation message
   */
  function showValidation(container, message, type) {
    container.innerHTML = '';
    const msgEl = document.createElement('div');
    msgEl.className = `juror-return-overlay__validation juror-return-overlay__validation--${type}`;
    msgEl.textContent = message;
    
    // Inline styles for validation
    const bgColor = type === 'error' 
      ? 'rgba(255, 51, 102, 0.15)' 
      : 'rgba(0, 224, 204, 0.15)';
    const borderColor = type === 'error'
      ? 'rgba(255, 51, 102, 0.4)'
      : 'rgba(0, 224, 204, 0.4)';
    const textColor = type === 'error' ? '#ff6b8a' : '#00e0cc';
    
    msgEl.style.cssText = `
      width: 100%;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 0.85rem;
      margin-top: 8px;
      background: ${bgColor};
      border: 1px solid ${borderColor};
      color: ${textColor};
    `;
    
    container.appendChild(msgEl);

    // Auto-clear after 4 seconds
    setTimeout(() => {
      if (container.contains(msgEl)) {
        msgEl.style.opacity = '0';
        setTimeout(() => msgEl.remove(), 300);
      }
    }, 4000);
  }

  /**
   * Flash juror avatar for visual feedback
   */
  function flashJurorAvatar(juror) {
    const contentContainer = overlayElement.querySelector('#juror-return-content');
    if (!contentContainer) return;

    // Look for avatar images
    const avatars = contentContainer.querySelectorAll('img');
    let targetAvatar = null;

    for (const avatar of avatars) {
      const alt = (avatar.alt || '').toLowerCase();
      const src = (avatar.src || '').toLowerCase();
      const jurorNameLower = juror.name.toLowerCase();
      
      if (alt.includes(jurorNameLower) || src.includes(jurorNameLower.replace(/\s/g, ''))) {
        targetAvatar = avatar;
        break;
      }
      
      // Check parent for data-j-id
      const card = avatar.closest('[data-j-id]');
      if (card && String(card.getAttribute('data-j-id')) === String(juror.id)) {
        targetAvatar = avatar;
        break;
      }
    }

    if (targetAvatar) {
      // Add flash animation
      const originalTransform = targetAvatar.style.transform;
      const originalFilter = targetAvatar.style.filter;
      
      targetAvatar.style.transition = 'all 0.2s ease';
      targetAvatar.style.transform = 'scale(1.15)';
      targetAvatar.style.filter = 'brightness(1.5)';
      
      setTimeout(() => {
        targetAvatar.style.transform = originalTransform;
        targetAvatar.style.filter = originalFilter;
      }, 800);
    }
  }

  /**
   * Start audience message animation stream
   */
  function startAudienceMessages() {
    const messagesContainer = overlayElement.querySelector('.juror-return-overlay__audience-messages');
    if (!messagesContainer) return;

    // Create initial messages
    for (let i = 0; i < 3; i++) {
      setTimeout(() => addAudienceMessage(), i * 1000);
    }

    // Continue adding messages periodically
    messageIntervalId = setInterval(() => {
      addAudienceMessage();
    }, 3000);
  }

  /**
   * Add a single audience message
   */
  function addAudienceMessage(customMessage = null, isImportant = false) {
    const messagesContainer = overlayElement.querySelector('.juror-return-overlay__audience-messages');
    if (!messagesContainer) return;

    const jurors = getJurorList();
    if (jurors.length === 0) return;

    const message = document.createElement('div');
    message.className = 'audience-message';
    
    // Use custom message or pick random template
    let messageText;
    if (customMessage) {
      messageText = customMessage;
    } else {
      const template = sampleMessages[Math.floor(Math.random() * sampleMessages.length)];
      messageText = template
        .replace('{player1}', jurors[Math.floor(Math.random() * jurors.length)].name)
        .replace('{player2}', jurors[Math.floor(Math.random() * jurors.length)].name)
        .replace('{player3}', jurors[Math.floor(Math.random() * jurors.length)].name);
    }
    
    message.textContent = messageText;
    
    // Inline styles for message bubble
    const leftPos = 5 + Math.random() * 70;
    const bgColor = isImportant 
      ? 'rgba(0, 224, 204, 0.15)' 
      : 'rgba(255, 255, 255, 0.08)';
    const borderColor = isImportant
      ? 'rgba(0, 224, 204, 0.4)'
      : 'rgba(255, 255, 255, 0.12)';
    
    message.style.cssText = `
      position: absolute;
      background: ${bgColor};
      border: 1px solid ${borderColor};
      border-radius: 12px;
      padding: 8px 14px;
      color: #e0e0e0;
      font-size: 0.85rem;
      max-width: 280px;
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      left: ${leftPos}%;
      bottom: -50px;
      animation: messageSlideUp 8s ease-out forwards;
      opacity: 0;
    `;
    
    messagesContainer.appendChild(message);
    
    // Remove after animation
    setTimeout(() => {
      message.remove();
    }, 8000);
  }

  /**
   * Stop audience messages
   */
  function stopAudienceMessages() {
    if (messageIntervalId) {
      clearInterval(messageIntervalId);
      messageIntervalId = null;
    }
  }

  /**
   * Start floating emoji animations
   */
  function startFloatingEmojis() {
    const messagesContainer = overlayElement.querySelector('.juror-return-overlay__audience-messages');
    if (!messagesContainer) return;

    // Create initial emojis
    for (let i = 0; i < 2; i++) {
      setTimeout(() => addFloatingEmoji(), i * 1500);
    }

    // Continue adding emojis periodically
    emojiIntervalId = setInterval(() => {
      addFloatingEmoji();
    }, 4000);
  }

  /**
   * Add a single floating emoji
   */
  function addFloatingEmoji() {
    const messagesContainer = overlayElement.querySelector('.juror-return-overlay__audience-messages');
    if (!messagesContainer) return;

    const emoji = document.createElement('span');
    emoji.className = 'floating-emoji';
    emoji.textContent = emojiPool[Math.floor(Math.random() * emojiPool.length)];
    
    // Random position
    const leftPos = 10 + Math.random() * 80;
    const bottomPos = 10 + Math.random() * 30;
    const driftX = -20 + Math.random() * 40;
    const driftY = -100 - Math.random() * 50;
    const rotate = -20 + Math.random() * 40;
    
    emoji.style.cssText = `
      position: absolute;
      font-size: 1.5rem;
      pointer-events: none;
      left: ${leftPos}%;
      bottom: ${bottomPos}%;
      animation: emojiFloat 6s ease-in-out forwards;
      opacity: 0;
      --drift-x: ${driftX}px;
      --drift-y: ${driftY}px;
      --rotate: ${rotate}deg;
    `;
    
    messagesContainer.appendChild(emoji);
    
    // Remove after animation
    setTimeout(() => {
      emoji.remove();
    }, 6000);
  }

  /**
   * Stop floating emojis
   */
  function stopFloatingEmojis() {
    if (emojiIntervalId) {
      clearInterval(emojiIntervalId);
      emojiIntervalId = null;
    }
  }

  /**
   * Debug helper: Force-show overlay for testing
   */
  function debugShow() {
    console.log('[JurorReturnOverlay] Debug show triggered');
    
    // Create mock juror panel if none exists
    const panel = document.getElementById('panel');
    if (panel && (!panel.children || panel.children.length === 0)) {
      console.log('[JurorReturnOverlay] Creating mock juror panel for debug');
      const mockPanel = createMockJurorPanel();
      panel.appendChild(mockPanel);
    }
    
    show();
  }

  /**
   * Create mock juror panel for debug mode
   */
  function createMockJurorPanel() {
    const container = document.createElement('div');
    container.style.cssText = `
      background: linear-gradient(135deg, rgba(13,27,42,0.95), rgba(27,38,59,0.95));
      border-radius: 24px;
      padding: 32px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.4);
      border: 1px solid rgba(255,255,255,0.1);
      max-width: 900px;
      margin: 0 auto;
    `;
    
    const header = document.createElement('div');
    header.style.cssText = 'text-align:center;margin-bottom:28px;';
    header.innerHTML = `
      <h2 style="font-size:2rem;font-weight:700;margin:0 0 8px 0;color:#00e0cc;">🗳️ America's Vote</h2>
      <div style="font-size:1.1rem;color:#8fb4d4;font-weight:500;">Which juror deserves a second chance?</div>
    `;
    container.appendChild(header);
    
    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:20px;';
    
    const jurors = getJurorList();
    jurors.forEach(juror => {
      const card = document.createElement('div');
      card.setAttribute('data-j-id', juror.id);
      card.style.cssText = `
        background:rgba(20,35,55,0.8);
        border-radius:16px;
        padding:20px;
        display:flex;
        flex-direction:column;
        align-items:center;
        gap:12px;
        border:1px solid rgba(143,211,255,0.2);
      `;
      
      card.innerHTML = `
        <img src="${juror.avatarUrl}" alt="${juror.name}" style="
          width:120px;
          height:120px;
          border-radius:50%;
          border:3px solid #00e0cc;
        ">
        <div style="font-size:1.1rem;font-weight:700;color:#e8f4ff;">${juror.name}</div>
        <div style="font-size:1.5rem;font-weight:700;color:#00e0cc;">${Math.floor(Math.random() * 30)}%</div>
        <div style="font-size:0.85rem;color:#8fb4d4;">of votes</div>
      `;
      
      grid.appendChild(card);
    });
    
    container.appendChild(grid);
    return container;
  }

  // Add CSS animations to document
  const style = document.createElement('style');
  style.textContent = `
    @keyframes overlayFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes messageSlideUp {
      0% { opacity: 0; transform: translateY(20px); }
      10% { opacity: 0.7; }
      80% { opacity: 0.7; }
      100% { opacity: 0; transform: translateY(-100px); }
    }
    @keyframes emojiFloat {
      0% { opacity: 0; transform: translate(0, 0) rotate(0deg); }
      20% { opacity: 0.8; }
      80% { opacity: 0.6; }
      100% { opacity: 0; transform: translate(var(--drift-x, 30px), var(--drift-y, -120px)) rotate(var(--rotate, 15deg)); }
    }
  `;
  document.head.appendChild(style);

  // Public API
  const JurorReturnOverlay = {
    init,
    show,
    hide,
    debugShow,
    isShowing: () => isShowing
  };

  // Expose globally
  global.JurorReturnOverlay = JurorReturnOverlay;

  // Auto-init on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  console.log('[JurorReturnOverlay] Module loaded');

})(window);
