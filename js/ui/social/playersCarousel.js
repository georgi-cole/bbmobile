// MODULE: ui/social/playersCarousel.js
// Players horizontal carousel for Social Maneuvers phase with paging by visible stride
// and prev/next navigation

export const PlayersCarousel = (() => {
  'use strict';

  // Helper to escape HTML to prevent XSS
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // State management
  const state = {
    container: null,
    scrollContainer: null,
    avatarCards: [],
    navPrev: null,
    navNext: null,
    selectedPlayerIds: new Set(),
    onSelect: null,
    multiSelect: false,
    maxVisible: 8,
    excludeIds: new Set()
  };

  /**
   * Initialize the players carousel
   * @param {Object} options - Configuration options
   * @param {HTMLElement} options.container - Container element for the carousel
   * @param {Array} options.players - Array of player objects
   * @param {Function} options.onSelect - Callback when a player is selected
   * @param {boolean} options.multiSelect - Enable multi-select mode (default: false)
   * @param {number} options.maxVisible - Maximum visible avatars at once (default: 8)
   * @param {Array} options.excludeIds - Player IDs to exclude from the carousel
   * @returns {Object} Public API
   */
  function init(options) {
    if (!options || !options.container) {
      console.warn('[PlayersCarousel] init: container is required');
      return null;
    }

    state.container = options.container;
    state.onSelect = options.onSelect || (() => {});
    state.multiSelect = options.multiSelect === true;
    state.maxVisible = options.maxVisible || 8;
    state.excludeIds = new Set(options.excludeIds || []);
    state.selectedPlayerIds.clear();

    // Filter out excluded players
    const players = (options.players || []).filter(p => !state.excludeIds.has(p.id));

    // Render the carousel structure
    render(players);

    // Set up event listeners
    attachEventListeners();

    console.info('[PlayersCarousel] Initialized with', state.avatarCards.length, 'players');

    return getPublicAPI();
  }

  /**
   * Render the carousel HTML structure
   */
  function render(players) {
    if (!state.container) return;

    // Build HTML
    const html = `
      <div class="social-players-carousel ${state.multiSelect ? 'multi-select' : ''}"
           role="region"
           aria-label="Select Players"
           aria-live="polite">
        <div class="social-players-carousel-header">
          <h2 class="social-players-carousel-title">Select Players</h2>
          <span class="social-players-carousel-count">${players.length} Available</span>
        </div>
        
        <div class="social-players-scroll-wrapper" style="position: relative;">
          <button class="social-players-nav prev" 
                  aria-label="Previous players"
                  data-players-nav="prev">
            ←
          </button>
          
          <div class="social-players-scroll" 
               role="list"
               aria-label="Available players">
            ${players.map((player, index) => renderPlayerCard(player, index)).join('')}
          </div>
          
          <button class="social-players-nav next" 
                  aria-label="Next players"
                  data-players-nav="next">
            →
          </button>
          
          <!-- Scroll indicators -->
          <div class="social-players-scroll-indicator left" aria-hidden="true"></div>
          <div class="social-players-scroll-indicator right" aria-hidden="true"></div>
        </div>
      </div>
    `;

    state.container.innerHTML = html;

    // Get DOM references
    state.scrollContainer = state.container.querySelector('.social-players-scroll');
    state.navPrev = state.container.querySelector('[data-players-nav="prev"]');
    state.navNext = state.container.querySelector('[data-players-nav="next"]');
    state.avatarCards = Array.from(state.container.querySelectorAll('.social-player-avatar-card'));

    // Update navigation state
    updateNavigation();
  }

  /**
   * Render individual player avatar card
   */
  function renderPlayerCard(player, index) {
    const isDisabled = player.disabled === true || player.evicted === true;
    const avatarUrl = resolveAvatar(player);
    
    // Escape user-provided content to prevent XSS
    const safeName = escapeHtml(player.name || 'Unknown');
    const safeAvatarUrl = escapeHtml(avatarUrl);
    
    // Get relationship/affinity information if available
    const relationshipInfo = getRelationshipInfo(player);
    
    return `
      <div class="social-player-avatar-card ${isDisabled ? 'disabled' : ''}"
           role="listitem"
           tabindex="${isDisabled ? '-1' : '0'}"
           data-player-id="${player.id}"
           data-player-index="${index}"
           aria-label="${safeName} ${relationshipInfo.ariaLabel}"
           ${isDisabled ? 'aria-disabled="true"' : ''}>
        
        <div class="social-player-avatar-img">
          <img src="${safeAvatarUrl}" 
               alt="${safeName}"
               loading="lazy">
        </div>
        
        <span class="social-player-avatar-name">${safeName}</span>
        
        ${relationshipInfo.html}
        
        <div class="social-player-selection-badge" aria-hidden="true">✓</div>
      </div>
    `;
  }
  
  /**
   * Get relationship/affinity information for a player
   */
  function getRelationshipInfo(player) {
    // Check if we have affinity data
    if (!player.affinity || typeof player.affinity !== 'object') {
      return { html: '', ariaLabel: '' };
    }
    
    // Get human player ID from global context
    const humanId = (typeof window !== 'undefined' && window.game?.humanId) || state.excludeIds.values().next().value || 1;
    
    // Get affinity value with the human player
    const affinityValue = player.affinity[humanId] || player.affinityToHuman || 0;
    
    // Calculate percentage (affinity is typically -1 to 1, convert to percentage)
    const percentage = Math.round(affinityValue * 100);
    
    // Determine relationship status
    let status = 'NEUTRAL';
    let statusClass = 'neutral';
    
    if (percentage < -10) {
      status = 'STRAINED';
      statusClass = 'strained';
    } else if (percentage > 10) {
      status = 'FRIENDLY';
      statusClass = 'friendly';
    }
    
    // Format percentage display
    const percentageDisplay = percentage >= 0 ? `+${percentage}%` : `${percentage}%`;
    
    const html = `
      <div class="social-player-relationship">
        <div class="social-player-relationship-status ${statusClass}">${status}</div>
        <div class="social-player-relationship-percentage">${percentageDisplay}</div>
      </div>
    `;
    
    const ariaLabel = `${status} relationship: ${percentageDisplay}`;
    
    return { html, ariaLabel };
  }

  /**
   * Resolve player avatar URL
   */
  function resolveAvatar(player) {
    // Use global resolveAvatar if available
    if (typeof window !== 'undefined' && typeof window.resolveAvatar === 'function') {
      return window.resolveAvatar(player.id);
    }

    // Fallback logic
    if (player.avatar) return player.avatar;
    if (player.img) return player.img;
    if (player.photo) return player.photo;
    
    // Fallback to dicebear
    if (player.name) {
      return 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(player.name);
    }
    return 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(String(player.id));
  }

  /**
   * Attach event listeners
   */
  function attachEventListeners() {
    if (!state.container) return;

    // Navigation buttons
    if (state.navPrev) {
      state.navPrev.addEventListener('click', handlePrevClick);
    }
    if (state.navNext) {
      state.navNext.addEventListener('click', handleNextClick);
    }

    // Avatar card clicks
    state.avatarCards.forEach(card => {
      card.addEventListener('click', handleCardClick);
      card.addEventListener('keydown', handleCardKeydown);
    });

    // Scroll events
    if (state.scrollContainer) {
      state.scrollContainer.addEventListener('scroll', handleScroll);
    }
  }

  /**
   * Handle previous button click - page by visible stride
   */
  function handlePrevClick(e) {
    e.preventDefault();
    if (!state.scrollContainer) return;

    const cardWidth = state.avatarCards[0]?.offsetWidth || 80;
    const gap = 12; // Match CSS gap
    const stride = (cardWidth + gap) * state.maxVisible;

    state.scrollContainer.scrollBy({
      left: -stride,
      behavior: 'smooth'
    });
  }

  /**
   * Handle next button click - page by visible stride
   */
  function handleNextClick(e) {
    e.preventDefault();
    if (!state.scrollContainer) return;

    const cardWidth = state.avatarCards[0]?.offsetWidth || 80;
    const gap = 12; // Match CSS gap
    const stride = (cardWidth + gap) * state.maxVisible;

    state.scrollContainer.scrollBy({
      left: stride,
      behavior: 'smooth'
    });
  }

  /**
   * Handle card click
   */
  function handleCardClick(e) {
    const card = e.currentTarget;
    const playerId = parseInt(card.dataset.playerId, 10);
    const index = parseInt(card.dataset.playerIndex, 10);

    // Don't select disabled cards
    if (card.classList.contains('disabled')) {
      return;
    }

    togglePlayerSelection(playerId, index, card);
  }

  /**
   * Handle card keyboard navigation
   */
  function handleCardKeydown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleCardClick(e);
    }
  }

  /**
   * Toggle player selection
   */
  function togglePlayerSelection(playerId, index, card) {
    if (state.multiSelect) {
      // Multi-select mode
      if (state.selectedPlayerIds.has(playerId)) {
        state.selectedPlayerIds.delete(playerId);
        card.classList.remove('selected');
        card.setAttribute('aria-selected', 'false');
      } else {
        state.selectedPlayerIds.add(playerId);
        card.classList.add('selected');
        card.setAttribute('aria-selected', 'true');
        
        // Update badge with selection order
        const badge = card.querySelector('.social-player-selection-badge');
        if (badge && state.selectedPlayerIds.size > 1) {
          badge.textContent = state.selectedPlayerIds.size;
        }
      }
    } else {
      // Single-select mode
      const wasSelected = state.selectedPlayerIds.has(playerId);
      
      // Clear all selections
      state.selectedPlayerIds.clear();
      state.avatarCards.forEach(c => {
        c.classList.remove('selected');
        c.setAttribute('aria-selected', 'false');
      });

      // Select current if it wasn't selected before
      if (!wasSelected) {
        state.selectedPlayerIds.add(playerId);
        card.classList.add('selected');
        card.setAttribute('aria-selected', 'true');
      }
    }

    // Call callback
    if (state.onSelect) {
      state.onSelect(Array.from(state.selectedPlayerIds));
    }

    console.info('[PlayersCarousel] Selected players:', Array.from(state.selectedPlayerIds));
  }

  /**
   * Handle scroll event
   */
  function handleScroll() {
    updateNavigation();
    updateScrollIndicators();
  }

  /**
   * Update navigation button states
   */
  function updateNavigation() {
    if (!state.scrollContainer || !state.navPrev || !state.navNext) return;

    const isAtStart = state.scrollContainer.scrollLeft <= 10;
    const isAtEnd = state.scrollContainer.scrollLeft + state.scrollContainer.clientWidth >= state.scrollContainer.scrollWidth - 10;

    state.navPrev.disabled = isAtStart;
    state.navNext.disabled = isAtEnd;
  }

  /**
   * Update scroll indicators
   */
  function updateScrollIndicators() {
    if (!state.scrollContainer) return;

    const leftIndicator = state.container.querySelector('.social-players-scroll-indicator.left');
    const rightIndicator = state.container.querySelector('.social-players-scroll-indicator.right');

    if (!leftIndicator || !rightIndicator) return;

    const isAtStart = state.scrollContainer.scrollLeft <= 10;
    const isAtEnd = state.scrollContainer.scrollLeft + state.scrollContainer.clientWidth >= state.scrollContainer.scrollWidth - 10;

    if (isAtStart) {
      leftIndicator.classList.remove('visible');
    } else {
      leftIndicator.classList.add('visible');
    }

    if (isAtEnd) {
      rightIndicator.classList.remove('visible');
    } else {
      rightIndicator.classList.add('visible');
    }
  }

  /**
   * Get selected player IDs
   */
  function getSelectedPlayers() {
    return Array.from(state.selectedPlayerIds);
  }

  /**
   * Set selected players programmatically
   */
  function setSelectedPlayers(playerIds) {
    state.selectedPlayerIds.clear();
    
    playerIds.forEach(id => {
      state.selectedPlayerIds.add(id);
    });

    // Update UI
    state.avatarCards.forEach(card => {
      const playerId = parseInt(card.dataset.playerId, 10);
      if (state.selectedPlayerIds.has(playerId)) {
        card.classList.add('selected');
        card.setAttribute('aria-selected', 'true');
      } else {
        card.classList.remove('selected');
        card.setAttribute('aria-selected', 'false');
      }
    });
  }

  /**
   * Clear all selections
   */
  function clearSelection() {
    state.selectedPlayerIds.clear();
    
    state.avatarCards.forEach(card => {
      card.classList.remove('selected');
      card.setAttribute('aria-selected', 'false');
    });
  }

  /**
   * Update players (refresh the carousel with new data)
   */
  function updatePlayers(players, excludeIds = []) {
    state.excludeIds = new Set(excludeIds);
    const previouslySelected = Array.from(state.selectedPlayerIds);
    
    // Filter out excluded players
    const filteredPlayers = players.filter(p => !state.excludeIds.has(p.id));
    
    render(filteredPlayers);
    attachEventListeners();
    
    // Try to restore selection
    if (previouslySelected.length > 0) {
      setSelectedPlayers(previouslySelected.filter(id => !state.excludeIds.has(id)));
    }
  }

  /**
   * Destroy the carousel
   */
  function destroy() {
    if (state.container) {
      state.container.innerHTML = '';
    }
    
    // Reset state
    state.selectedPlayerIds.clear();
    Object.keys(state).forEach(key => {
      if (key !== 'selectedPlayerIds' && key !== 'excludeIds') {
        state[key] = null;
      }
    });
    state.multiSelect = false;
    state.maxVisible = 8;

    console.info('[PlayersCarousel] Destroyed');
  }

  /**
   * Public API
   */
  function getPublicAPI() {
    return {
      getSelectedPlayers,
      setSelectedPlayers,
      clearSelection,
      updatePlayers,
      destroy
    };
  }

  return {
    init
  };
})();

// Export for global access (if not using ES modules)
if (typeof window !== 'undefined') {
  window.PlayersCarousel = PlayersCarousel;
}
