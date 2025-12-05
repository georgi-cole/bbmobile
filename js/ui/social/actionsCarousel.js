// MODULE: ui/social/actionsCarousel.js
// Actions carousel for Social Maneuvers phase with snap scroll, navigation controls, 
// dot indicators, and keyboard support

export const ActionsCarousel = (() => {
  'use strict';

  // Constants
  const MAX_DOTS = 5; // Maximum dot indicators to prevent clutter
  const CARDS_PER_PAGE = 3; // Approximate cards visible at once

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
    cards: [],
    navPrev: null,
    navNext: null,
    dotsContainer: null,
    currentIndex: 0,
    selectedActionId: null,
    onSelect: null,
    isKeyboardEnabled: true
  };

  /**
   * Initialize the actions carousel
   * @param {Object} options - Configuration options
   * @param {HTMLElement} options.container - Container element for the carousel
   * @param {Array} options.actions - Array of action objects
   * @param {Function} options.onSelect - Callback when an action is selected
   * @param {boolean} options.enableKeyboard - Enable keyboard navigation (default: true)
   * @returns {Object} Public API
   */
  function init(options) {
    if (!options || !options.container) {
      console.warn('[ActionsCarousel] init: container is required');
      return null;
    }

    state.container = options.container;
    state.onSelect = options.onSelect || (() => {});
    state.isKeyboardEnabled = options.enableKeyboard !== false;
    state.selectedActionId = null;

    // Render the carousel structure
    render(options.actions || []);

    // Set up event listeners
    attachEventListeners();

    console.info('[ActionsCarousel] Initialized with', state.cards.length, 'actions');

    return getPublicAPI();
  }

  /**
   * Render the carousel HTML structure
   */
  function render(actions) {
    if (!state.container) return;

    // Build HTML
    const html = `
      <div class="social-actions-carousel" role="region" aria-label="Choose Action">
        <div class="social-actions-carousel-header">
          <h2 class="social-actions-carousel-title">Choose Action</h2>
        </div>
        
        <div class="social-actions-scroll-wrapper" style="position: relative;">
          <button class="social-carousel-nav prev" 
                  aria-label="Previous actions"
                  data-carousel-nav="prev">
            ←
          </button>
          
          <div class="social-actions-scroll" 
               role="list"
               aria-label="Available actions"
               tabindex="0">
            ${actions.map((action, index) => renderActionCard(action, index)).join('')}
          </div>
          
          <button class="social-carousel-nav next" 
                  aria-label="Next actions"
                  data-carousel-nav="next">
            →
          </button>
        </div>
        
        <div class="social-carousel-dots" role="tablist" aria-label="Action pages"></div>
      </div>
    `;

    state.container.innerHTML = html;

    // Get DOM references
    state.scrollContainer = state.container.querySelector('.social-actions-scroll');
    state.navPrev = state.container.querySelector('[data-carousel-nav="prev"]');
    state.navNext = state.container.querySelector('[data-carousel-nav="next"]');
    state.dotsContainer = state.container.querySelector('.social-carousel-dots');
    state.cards = Array.from(state.container.querySelectorAll('.social-action-card'));

    // Initialize dots
    initializeDots();

    // Update navigation state
    updateNavigation();
  }

  /**
   * Render individual action card
   */
  function renderActionCard(action, index) {
    const cost = action.cost || action.costs?.energy || 1;
    const category = action.category || 'friendly';
    const isDisabled = action.canAfford === false;
    const isLocked = action.locked === true;
    
    // Escape user-provided content to prevent XSS
    const safeLabel = escapeHtml(action.label || '');
    const safeDescription = escapeHtml(action.description || '');
    const safeCategory = escapeHtml(category);
    const safeId = escapeHtml(action.id || '');
    
    return `
      <div class="social-action-card ${isDisabled ? 'disabled' : ''} ${isLocked ? 'locked' : ''}"
           role="listitem"
           tabindex="${index === 0 ? '0' : '-1'}"
           data-action-id="${safeId}"
           data-action-index="${index}"
           aria-label="${safeLabel}: ${safeDescription}. Cost: ${cost} energy"
           ${isDisabled ? 'aria-disabled="true"' : ''}>
        
        <div class="social-action-card-header">
          <span class="social-action-card-name">${safeLabel}</span>
          <span class="social-action-card-cost" aria-label="Energy cost: ${cost}">
            ⚡ ${cost}
          </span>
        </div>
        
        <p class="social-action-card-description">${safeDescription}</p>
        
        <span class="social-action-card-category ${safeCategory}">
          ${safeCategory}
        </span>
      </div>
    `;
  }

  /**
   * Initialize dot indicators
   */
  function initializeDots() {
    if (!state.dotsContainer || !state.cards.length) return;

    // Calculate number of pages (assuming ~3 cards visible at once on mobile)
    const numDots = Math.min(state.cards.length, MAX_DOTS);
    
    const dotsHtml = Array.from({ length: numDots }, (_, i) => {
      return `
        <button class="social-carousel-dot ${i === 0 ? 'active' : ''}"
                role="tab"
                aria-label="Page ${i + 1} of ${numDots}"
                aria-selected="${i === 0}"
                data-dot-index="${i}">
        </button>
      `;
    }).join('');

    state.dotsContainer.innerHTML = dotsHtml;
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

    // Card clicks
    state.cards.forEach(card => {
      card.addEventListener('click', handleCardClick);
    });

    // Dot clicks
    const dots = state.dotsContainer?.querySelectorAll('.social-carousel-dot');
    dots?.forEach(dot => {
      dot.addEventListener('click', handleDotClick);
    });

    // Scroll events
    if (state.scrollContainer) {
      state.scrollContainer.addEventListener('scroll', handleScroll);
    }

    // Keyboard navigation
    if (state.isKeyboardEnabled && state.scrollContainer) {
      state.scrollContainer.addEventListener('keydown', handleKeydown);
    }
  }

  /**
   * Handle previous button click
   */
  function handlePrevClick(e) {
    e.preventDefault();
    if (state.currentIndex > 0) {
      scrollToIndex(state.currentIndex - 1);
    }
  }

  /**
   * Handle next button click
   */
  function handleNextClick(e) {
    e.preventDefault();
    if (state.currentIndex < state.cards.length - 1) {
      scrollToIndex(state.currentIndex + 1);
    }
  }

  /**
   * Handle card click
   */
  function handleCardClick(e) {
    const card = e.currentTarget;
    const actionId = card.dataset.actionId;
    const index = parseInt(card.dataset.actionIndex, 10);

    // Don't select disabled or locked cards
    if (card.classList.contains('disabled') || card.classList.contains('locked')) {
      return;
    }

    selectAction(actionId, index);
  }

  /**
   * Handle dot indicator click
   */
  function handleDotClick(e) {
    const dot = e.currentTarget;
    const index = parseInt(dot.dataset.dotIndex, 10);
    
    // Map dot index to card index (approximate)
    const cardIndex = Math.floor((state.cards.length / state.dotsContainer.children.length) * index);
    scrollToIndex(Math.min(cardIndex, state.cards.length - 1));
  }

  /**
   * Handle scroll event
   */
  function handleScroll() {
    updateNavigation();
    updateDots();
  }

  /**
   * Handle keyboard navigation
   */
  function handleKeydown(e) {
    if (!state.isKeyboardEnabled) return;

    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        if (state.currentIndex > 0) {
          scrollToIndex(state.currentIndex - 1);
        }
        break;
      
      case 'ArrowRight':
        e.preventDefault();
        if (state.currentIndex < state.cards.length - 1) {
          scrollToIndex(state.currentIndex + 1);
        }
        break;
      
      case 'Home':
        e.preventDefault();
        scrollToIndex(0);
        break;
      
      case 'End':
        e.preventDefault();
        scrollToIndex(state.cards.length - 1);
        break;
      
      case 'Enter':
      case ' ':
        e.preventDefault();
        const focusedCard = state.cards[state.currentIndex];
        if (focusedCard && !focusedCard.classList.contains('disabled') && !focusedCard.classList.contains('locked')) {
          const actionId = focusedCard.dataset.actionId;
          selectAction(actionId, state.currentIndex);
        }
        break;
    }
  }

  /**
   * Scroll to a specific card index
   */
  function scrollToIndex(index) {
    if (!state.scrollContainer || index < 0 || index >= state.cards.length) return;

    const card = state.cards[index];
    if (!card) return;

    // Smooth scroll to card
    card.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'start'
    });

    // Update current index
    state.currentIndex = index;

    // Update tabindex for accessibility
    state.cards.forEach((c, i) => {
      c.setAttribute('tabindex', i === index ? '0' : '-1');
    });

    // Focus the card
    setTimeout(() => {
      card.focus({ preventScroll: true });
    }, 300);
  }

  /**
   * Select an action
   */
  function selectAction(actionId, index) {
    // Update selection state
    state.selectedActionId = actionId;
    state.currentIndex = index;

    // Update UI
    state.cards.forEach((card, i) => {
      if (i === index) {
        card.classList.add('selected');
        card.setAttribute('aria-selected', 'true');
      } else {
        card.classList.remove('selected');
        card.setAttribute('aria-selected', 'false');
      }
    });

    // Call callback
    if (state.onSelect) {
      state.onSelect(actionId, index);
    }

    console.info('[ActionsCarousel] Selected action:', actionId);
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
   * Update dot indicators based on scroll position
   */
  function updateDots() {
    if (!state.dotsContainer || !state.scrollContainer) return;

    const dots = state.dotsContainer.querySelectorAll('.social-carousel-dot');
    if (!dots.length) return;

    // Calculate which dot should be active based on scroll position
    const scrollPercent = state.scrollContainer.scrollLeft / (state.scrollContainer.scrollWidth - state.scrollContainer.clientWidth);
    const activeDotIndex = Math.min(Math.floor(scrollPercent * dots.length), dots.length - 1);

    dots.forEach((dot, i) => {
      if (i === activeDotIndex) {
        dot.classList.add('active');
        dot.setAttribute('aria-selected', 'true');
      } else {
        dot.classList.remove('active');
        dot.setAttribute('aria-selected', 'false');
      }
    });
  }

  /**
   * Get selected action ID
   */
  function getSelectedAction() {
    return state.selectedActionId;
  }

  /**
   * Update actions (refresh the carousel with new data)
   */
  function updateActions(actions) {
    const previouslySelected = state.selectedActionId;
    render(actions);
    attachEventListeners();
    
    // Try to restore selection
    if (previouslySelected) {
      const index = state.cards.findIndex(card => card.dataset.actionId === previouslySelected);
      if (index >= 0) {
        selectAction(previouslySelected, index);
      }
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
    Object.keys(state).forEach(key => {
      state[key] = null;
    });
    state.currentIndex = 0;
    state.isKeyboardEnabled = true;

    console.info('[ActionsCarousel] Destroyed');
  }

  /**
   * Public API
   */
  function getPublicAPI() {
    return {
      scrollToIndex,
      selectAction,
      getSelectedAction,
      updateActions,
      destroy
    };
  }

  return {
    init
  };
})();

// Export for global access (if not using ES modules)
if (typeof window !== 'undefined') {
  window.ActionsCarousel = ActionsCarousel;
}
