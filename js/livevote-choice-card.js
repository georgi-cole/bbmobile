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

    // Create card element (no root/backdrop needed - unified mount provides centering)
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

    // Mount using unified popup system
    const wrapper = global.mountCenteredPopup(card, {
      replace: true,
      className: 'lv-choice-card-wrapper',
      lockScroll: true,
      dialog: true
    });

    if (!wrapper) {
      console.error('[ChoiceCard] Failed to mount popup');
      return null;
    }

    // Store reference and mark as open
    _modalRoot = wrapper;
    _isOpen = true;

    return card;
  }

  // Remove the Choice Card
  function hide() {
    // Idempotent: if already closed, return early
    if (!_isOpen && !_modalRoot) {
      console.debug('[ChoiceCard] Already closed, skipping duplicate hide()');
      return;
    }
    
    // Unmount using unified popup system
    global.unmountPopups({ unlockScroll: true });
    
    // Reset singleton state
    _modalRoot = null;
    _isOpen = false;
    
    console.debug('[ChoiceCard] Choice card hidden');
  }

  // Export public API
  global.LiveVoteChoiceCard = {
    show,
    hide,
    isOpen: () => _isOpen
  };

})(window);
