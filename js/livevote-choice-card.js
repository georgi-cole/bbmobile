// MODULE: livevote-choice-card.js
// Renders a small centered Choice Card inside the TV showing nominees
// Opens the full voting overlay when the Vote button is clicked

(function(global) {
  'use strict';

  // Get avatar helper (fallback to global if available)
  function getAvatarUrl(playerId) {
    if (global.resolveAvatar) {
      const player = global.getP?.(playerId);
      if (player) {
        return global.resolveAvatar(player) || getDicebearUrl(player.name);
      }
    }
    const player = global.getP?.(playerId);
    if (player?.avatar) return player.avatar;
    return getDicebearUrl(global.safeName?.(playerId) || 'player');
  }

  function getDicebearUrl(seed) {
    return `https://api.dicebear.com/6.x/bottts/svg?seed=${encodeURIComponent(seed || 'player')}`;
  }

  // Singleton state tracking
  let _modalRoot = null;
  let _isOpen = false;

  // Create and show the Choice Card
  async function show(options = {}) {
    // Idempotency guard: if already open, return early (no-op)
    if (_isOpen) {
      console.debug('[ChoiceCard] Already open, skipping duplicate show()');
      return _modalRoot?.querySelector('.lv-choice-card') || null;
    }
    const {
      nominees = [],
      onVoteClick = null
    } = options;

    if (!Array.isArray(nominees) || nominees.length === 0) {
      console.warn('[ChoiceCard] No nominees provided');
      return null;
    }

    // Pre-clean any prior UI using unified cleanup
    if (global.closeAllVoteUI) {
      global.closeAllVoteUI();
    }

    // MOBILE FIX: Skip centerTVInViewport for fixed-position modal
    // The modal uses position:fixed (.lv-root) and covers the entire viewport, so it
    // doesn't need the underlying page to be scrolled to a specific position.
    // Centering the TV before showing a fixed modal can cause the underlying page
    // to be in a suboptimal scroll position, which can block interaction on mobile.
    // Instead, we just lock body scroll directly to prevent background scrolling.

    // Lock body scroll when choice card is shown (using ref-counted helper)
    if (global.lockBodyScroll) {
      global.lockBodyScroll();
    } else {
      // Fallback if helper not loaded yet
      lockBodyScroll();
    }

    // Create modal root container
    const root = document.createElement('div');
    root.className = 'lv-root';
    
    // Store reference and mark as open
    _modalRoot = root;
    _isOpen = true;

    // Create backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'lv-backdrop';
    backdrop.onclick = () => {
      // Optional: close on backdrop click
      // For now, we'll leave this empty to require explicit Vote button interaction
    };
    root.appendChild(backdrop);

    // Create card element
    const card = document.createElement('div');
    card.className = 'lv-choice-card';
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-label', 'Vote to evict');

    // Header
    const header = document.createElement('div');
    header.className = 'lv-choice-card__header';
    header.textContent = 'Make your choice.';
    card.appendChild(header);

    // Nominees grid
    const nomineesContainer = document.createElement('div');
    nomineesContainer.className = 'lv-choice-card__nominees';
    nomineesContainer.setAttribute('role', 'list');

    nominees.forEach(nomineeId => {
      const player = global.getP?.(nomineeId);
      if (!player) return;

      const nomineeEl = document.createElement('div');
      nomineeEl.className = 'lv-choice-card__nominee';
      nomineeEl.setAttribute('role', 'listitem');

      // Avatar
      const avatar = document.createElement('img');
      avatar.className = 'lv-choice-card__avatar';
      avatar.src = getAvatarUrl(nomineeId);
      avatar.alt = `${player.name}'s avatar`;
      avatar.loading = 'eager';
      avatar.onerror = () => {
        avatar.src = getDicebearUrl(player.name);
      };
      nomineeEl.appendChild(avatar);

      // Name
      const name = document.createElement('div');
      name.className = 'lv-choice-card__name';
      name.textContent = player.name;
      nomineeEl.appendChild(name);

      nomineesContainer.appendChild(nomineeEl);
    });

    card.appendChild(nomineesContainer);

    // Vote button
    const voteBtn = document.createElement('button');
    voteBtn.className = 'lv-choice-card__vote-btn';
    voteBtn.textContent = 'Vote';
    voteBtn.setAttribute('aria-label', 'Open voting overlay');
    voteBtn.onclick = () => {
      if (onVoteClick) {
        onVoteClick(nominees);
      }
    };
    card.appendChild(voteBtn);

    // Add card to root
    root.appendChild(card);

    // Mount to document.body (not #tv)
    document.body.appendChild(root);

    return card;
  }

  // Remove the Choice Card
  function hide() {
    // Idempotent: if already closed, return early
    if (!_isOpen && !_modalRoot) {
      console.debug('[ChoiceCard] Already closed, skipping duplicate hide()');
      return;
    }
    
    // Remove the entire modal root (includes backdrop and card)
    if (_modalRoot) {
      _modalRoot.remove();
      console.debug('[ChoiceCard] Modal root removed');
    }
    
    // Fallback: remove any stray elements if modal root reference was lost
    const root = document.querySelector('.lv-root');
    if (root) {
      root.remove();
      console.debug('[ChoiceCard] Stray modal root removed');
    }

    // Fallback: remove legacy card if present (only if new modal system wasn't used)
    // This handles backwards compatibility with older code that may have created cards directly
    const card = document.querySelector('.lv-choice-card');
    if (card && !_modalRoot) {
      card.remove();
      console.debug('[ChoiceCard] Legacy card removed');
    }
    
    // Reset singleton state
    _modalRoot = null;
    _isOpen = false;
    
    // Use global helper to unlock body scroll
    if (global.unlockBodyScroll) {
      global.unlockBodyScroll();
    } else {
      // Fallback if helper not loaded yet
      unlockBodyScroll();
    }
  }

  // Lock body scroll (prevent background scrolling on mobile)
  // iOS-safe: uses overflow:hidden instead of position:fixed
  function lockBodyScroll() {
    const body = document.body;
    const html = document.documentElement;
    if (!body || !html) return;
    
    // Store current scroll position
    const scrollY = window.scrollY;
    body.dataset.scrollY = String(scrollY);
    body.dataset.scrollLocked = 'true';
    
    // Use overflow-based lock (iOS-safe)
    body.style.overflow = 'hidden';
    html.style.overscrollBehavior = 'contain';
  }

  // Unlock body scroll
  function unlockBodyScroll() {
    const body = document.body;
    const html = document.documentElement;
    if (!body || !html) return;
    
    // Restore scroll position if saved
    const scrollY = parseInt(body.dataset.scrollY || '0', 10);
    
    // Clear new overflow-based lock
    body.style.overflow = '';
    html.style.overscrollBehavior = '';
    
    // Clear old position-based lock (backwards compatibility)
    body.style.position = '';
    body.style.top = '';
    body.style.width = '';
    
    // Clear dataset flags
    delete body.dataset.scrollLocked;
    delete body.dataset.scrollY;
    
    // Restore scroll position
    if (scrollY > 0) {
      window.scrollTo(0, scrollY);
    }
  }

  // Export public API
  global.LiveVoteChoiceCard = {
    show,
    hide,
    isOpen: () => _isOpen
  };

})(window);
