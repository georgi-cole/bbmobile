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

  // Create and show the Choice Card
  async function show(options = {}) {
    const {
      nominees = [],
      onVoteClick = null,
      container = null
    } = options;

    if (!Array.isArray(nominees) || nominees.length === 0) {
      console.warn('[ChoiceCard] No nominees provided');
      return null;
    }

    // Find container (either provided or default to TV viewport)
    const targetContainer = container || document.querySelector('#tv .tvViewport') || document.querySelector('#tv');
    if (!targetContainer) {
      console.warn('[ChoiceCard] No container found');
      return null;
    }

    // Center TV in viewport before locking scroll
    // If scroll is already locked, temporarily unlock it
    const tvElement = document.querySelector('#tv');
    const wasLocked = document.body.dataset.scrollLocked === 'true';
    if (wasLocked && global.unlockBodyScroll) {
      global.unlockBodyScroll();
    }
    
    // Wait for TV to be centered
    if (global.centerTVInViewport) {
      await global.centerTVInViewport(tvElement);
    }
    
    // Now lock body scroll when choice card is shown
    lockBodyScroll();

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

    // Add to container
    targetContainer.appendChild(card);

    return card;
  }

  // Remove the Choice Card
  function hide() {
    const card = document.querySelector('.lv-choice-card');
    if (card) {
      card.remove();
    }
    
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
    if (!body) return;
    
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
    if (!body) return;
    
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
    hide
  };

})(window);
