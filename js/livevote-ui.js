// MODULE: livevote-ui.js
// Modern "Live Vote 2.0" UI system for eviction phase
// Provides a cinematic versus layout with flip cards, animated meter, and smooth transitions
// Accessible with ARIA live regions and prefers-reduced-motion support

(function(global) {
  'use strict';

  // Check for reduced motion preference
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // State
  let state = {
    leftName: '',
    rightName: '',
    leftId: null,
    rightId: null,
    leftCount: 0,
    rightCount: 0,
    voteQueue: [],
    cardHoldMs: 500,
    cardGapMs: 250,
    isProcessing: false,
    container: null,
    stage: null,
    ctaBar: null,
    resizeObserver: null,
    humanTurn: false,
    isTieBreak: false,
    isFinal4: false,
    isResponsive: false,
    carouselIndex: 0, // Current nominee shown in carousel (0=left, 1=right)
    useCarousel: false, // Whether to use carousel layout
    selectedNominee: null, // Currently selected nominee ID (for confirm button)
    _externalOverlayActive: false, // External overlay (e.g., rollout) is showing
    _hiddenChildren: [] // Array of { el, display } for elements hidden during external overlay
  };

  // Default pacing
  const DEFAULT_HOLD_MS = 500;
  const DEFAULT_GAP_MS = 250;

  // Evictee final portrait timing constants
  const EVICTEE_FADE_IN_WAIT = 800; // Time to show portrait before B&W animation
  const EVICTEE_REDUCED_MOTION_FACTOR = 0.6; // Factor for reduced motion timing
  const EVICTEE_MIN_REDUCED_HOLD = 1000; // Minimum hold time in reduced motion mode
  const EVICTEE_MIN_NORMAL_HOLD = 1200; // Minimum hold time in normal mode

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

  // Initialize the modern Live Vote UI
  function init(config) {
    if (!config || !config.leftName || !config.rightName) {
      console.warn('[lv2] Invalid init config', config);
      return;
    }

    state.leftName = config.leftName;
    state.rightName = config.rightName;
    state.leftId = config.leftId;
    state.rightId = config.rightId;
    state.leftCount = 0;
    state.rightCount = 0;
    state.voteQueue = [];
    state.isProcessing = false;
    state.carouselIndex = 0; // Reset carousel to first nominee

    // Read pacing from settings if available
    const cfg = global.game?.cfg || {};
    state.cardHoldMs = config.pacing?.holdMs ?? cfg.cardHoldMs ?? DEFAULT_HOLD_MS;
    state.cardGapMs = config.pacing?.gapMs ?? cfg.cardGapMs ?? DEFAULT_GAP_MS;

    // Detect responsive mode (narrow/portrait viewports)
    state.isResponsive = detectResponsiveMode();

    renderPanel();
  }

  // Detect responsive mode (narrow/portrait viewports)
  function detectResponsiveMode() {
    let isResponsive;
    
    // Use TVFit engine if available
    if (global.TVFit) {
      isResponsive = global.TVFit.isNarrow() || global.TVFit.isMobile();
      // Also determine if we should use carousel mode (single-item pagination)
      state.useCarousel = global.TVFit.shouldUseCarousel();
    } else {
      // Fallback to existing logic
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isPortrait = height > width;
      const isNarrow = width < 820;
      
      // Use carousel on very narrow or portrait screens
      const useCarousel = isNarrow || isPortrait;
      state.useCarousel = useCarousel;
      isResponsive = isNarrow || isPortrait;
    }
    
    return isResponsive;
  }

  // Render the modern panel inside #tv with fixed canvas and ResizeObserver scaling
  function renderPanel() {
    const tv = document.querySelector('#tv');
    if (!tv) {
      console.warn('[lv2] #tv element not found');
      return;
    }
    
    // Ensure TV element has fauxTv class for proper styling
    tv.classList.add('fauxTv');

    // Clean up any existing rollout overlay before rendering lv2 UI
    try {
      if (global.LiveVoteRollout?.hide) {
        global.LiveVoteRollout.hide();
        console.debug('[lv2] Cleaned up rollout overlay before init');
      }
    } catch (e) {
      console.warn('[lv2] Error hiding rollout:', e);
    }

    // Remove any existing lv2 overlays before creating new one
    const existingLv2 = tv.querySelector('.lv2-overlay');
    if (existingLv2) {
      existingLv2.remove();
      console.debug('[lv2] Removed existing lv2 overlay');
    }

    // Hide #panel content during lv2 mode
    const panel = document.querySelector('#panel');
    if (panel) {
      panel.style.display = 'none';
    }

    // Create overlay wrapper with overflow:hidden
    const overlay = document.createElement('div');
    overlay.className = 'lv2-overlay voteOverlay';
    
    // Add responsive class if needed
    if (state.isResponsive) {
      overlay.classList.add('lv2-responsive');
    }
    
    // Add carousel-on class if using carousel mode (Mobile Carousel 2.0)
    if (state.useCarousel) {
      overlay.classList.add('lv2-carousel-on');
    }
    
    // Apply TV safe area constraints using TVFit if available
    if (global.TVFit) {
      global.TVFit.applySafeAreaConstraints(overlay);
    }
    
    overlay.setAttribute('role', 'region');
    overlay.setAttribute('aria-label', 'Live Vote');

    // Create fixed-size fit wrapper (1200x560) that will be scaled
    const fitWrapper = document.createElement('div');
    fitWrapper.className = 'lv2-fit';

    // Create main grid container
    const container = document.createElement('div');
    container.className = 'lv2-panel votePanel';

    // Header
    const header = document.createElement('div');
    header.className = 'lv2-header';
    header.innerHTML = '<h3>Live Vote</h3>';
    container.appendChild(header);

    // Main content grid (left contestant | right contestant) - V2.2.1: Removed center stage
    const grid = document.createElement('div');
    grid.className = 'lv2-grid';
    
    // Add carousel class if using carousel mode
    if (state.useCarousel) {
      grid.classList.add('lv2-carousel');
    }

    // Left contestant with drop anchor
    const leftSide = createContestant('left', state.leftName, state.leftId);
    grid.appendChild(leftSide);

    // Right contestant with drop anchor
    const rightSide = createContestant('right', state.rightName, state.rightId);
    grid.appendChild(rightSide);
    
    container.appendChild(grid);
    
    // Mobile Carousel 2.0: Add arrows hugging the portrait (inside grid)
    if (state.useCarousel) {
      const prevArrow = document.createElement('button');
      prevArrow.className = 'lv2-arrow prev';
      prevArrow.setAttribute('aria-label', 'Show previous nominee');
      prevArrow.innerHTML = '◀';
      prevArrow.onclick = () => {
        navigateCarousel('prev');
        // Inline CTA: Don't auto-select when navigating - let user tap to select
      };
      grid.appendChild(prevArrow);
      
      const nextArrow = document.createElement('button');
      nextArrow.className = 'lv2-arrow next';
      nextArrow.setAttribute('aria-label', 'Show next nominee');
      nextArrow.innerHTML = '▶';
      nextArrow.onclick = () => {
        navigateCarousel('next');
        // Inline CTA: Don't auto-select when navigating - let user tap to select
      };
      grid.appendChild(nextArrow);
    }
    
    // Hidden stage for vote announcements (only for ARIA)
    const stage = document.createElement('div');
    stage.className = 'lv2-stage';
    stage.setAttribute('role', 'log');
    stage.setAttribute('aria-live', 'polite');
    stage.setAttribute('aria-atomic', 'false');
    stage.setAttribute('aria-label', 'Vote announcements');
    stage.style.display = 'none'; // Hidden, only for ARIA
    container.appendChild(stage);
    
    // Inline CTA: Instruction element below grid (for all 2-nominee flows)
    const instructions = document.createElement('div');
    instructions.className = 'lv2-instructions';
    instructions.textContent = 'Tap on the photo of the person you want to evict.';
    instructions.setAttribute('role', 'status');
    instructions.setAttribute('aria-live', 'polite');
    container.appendChild(instructions);
    
    // Mobile Carousel 2.0: Status Row (below instruction text)
    if (state.useCarousel) {
      const statusRow = document.createElement('div');
      statusRow.className = 'lv2-status-row';
      
      // YOUR TURN pill - visible only when voting is enabled
      const yourTurnPill = document.createElement('div');
      yourTurnPill.className = 'lv2-your-turn-pill';
      yourTurnPill.textContent = 'Your Turn';
      yourTurnPill.setAttribute('role', 'status');
      yourTurnPill.setAttribute('aria-live', 'polite');
      statusRow.appendChild(yourTurnPill);
      
      // Waiting status - visible after user's vote until all votes are in
      const waitingStatus = document.createElement('div');
      waitingStatus.className = 'lv2-waiting-status';
      waitingStatus.textContent = 'Waiting for votes... ';
      const progressSpan = document.createElement('span');
      progressSpan.className = 'progress';
      progressSpan.textContent = '0';
      waitingStatus.appendChild(progressSpan);
      waitingStatus.setAttribute('role', 'status');
      waitingStatus.setAttribute('aria-live', 'polite');
      statusRow.appendChild(waitingStatus);
      
      container.appendChild(statusRow);
    }
    
    // Legacy CTA dock removed for 2-nominee flows
    // All 2-nominee flows now use inline evict button on nominee tile

    // V2.2.1: Voter feed area - centered below the two photos
    const voterFeed = document.createElement('div');
    voterFeed.className = 'lv2-voter-feed';
    voterFeed.setAttribute('role', 'log');
    voterFeed.setAttribute('aria-live', 'polite');
    voterFeed.setAttribute('aria-label', 'Voter feed');
    container.appendChild(voterFeed);

    // Status text area
    const status = document.createElement('div');
    status.className = 'lv2-status tiny muted';
    status.textContent = 'Waiting for votes...';
    container.appendChild(status);

    // Legacy CTA footer row removed for 2-nominee flows
    // All 2-nominee flows now use inline evict button on nominee tile

    fitWrapper.appendChild(container);
    overlay.appendChild(fitWrapper);
    
    state.container = container;
    state.stage = stage;
    
    // Append to TV (existing lv2 already removed at start of renderPanel)
    tv.appendChild(overlay);

    // Setup ResizeObserver for responsive scaling
    setupResizeObserver(tv, fitWrapper);
    
    // Initialize carousel view if in carousel mode
    if (state.useCarousel) {
      // Set initial carousel index to 0 (left nominee)
      state.carouselIndex = 0;
      // Use setTimeout to ensure DOM is ready
      setTimeout(() => {
        updateCarouselView();
        // Inline CTA: Don't auto-select on initialization - let user tap to select
        // (removed updateSelectionFromCarousel() call)
      }, 50);
    }
    
    // Ensure inline CTA guard is installed
    ensureInlineCtaGuard();
    
    // Remove any duplicate evict buttons to ensure only one exists
    removeDuplicateEvictButtons();
    
    // Install MutationObserver to handle dynamic re-renders
    installLayoutObserver();
  }
  
  // Helper: Remove duplicate evict buttons and ensure only one exists in the panel
  function removeDuplicateEvictButtons() {
    const tv = document.querySelector('#tv');
    if (!tv) return;
    
    // Find the main panel (prefer .votePanel or .intermission-card-container)
    const panel = tv.querySelector('.votePanel, .intermission-card-container, .lv2-panel');
    if (!panel) return;
    
    // Find all elements that could be evict buttons
    const possibleButtons = tv.querySelectorAll(
      '.evictBtn, .lv2-cta-btn, .lv-overlay__evict-btn, .debug-evict-btn, button[data-action="evict"]'
    );
    
    // Count visible buttons to ensure we don't remove the only one
    let visibleButtons = [];
    possibleButtons.forEach(btn => {
      const isVisible = btn.offsetParent !== null && 
                       !btn.classList.contains('lv2-name-btn') && 
                       !btn.classList.contains('lv2-name-btn-selected');
      if (isVisible) {
        visibleButtons.push(btn);
      }
    });
    
    // If there are multiple visible standalone buttons, keep only the first one inside panel
    if (visibleButtons.length > 1) {
      const buttonInPanel = visibleButtons.find(btn => panel.contains(btn));
      visibleButtons.forEach(btn => {
        if (btn !== buttonInPanel) {
          btn.remove();
          console.debug('[lv2] Removed duplicate standalone evict button');
        }
      });
    }
    
    // Also remove any orphaned CTA rows that might have been created
    const ctaRows = tv.querySelectorAll('.lv2-cta-row, .debug-cta-row');
    ctaRows.forEach((row, index) => {
      if (index > 0) { // Keep only the first one (if any)
        row.remove();
        console.debug('[lv2] Removed duplicate CTA row');
      }
    });
    
    // Ensure all vote elements are inside the panel
    ensureElementsInPanel();
    
    // Remove problematic inline styles with vertical anchoring
    removeVerticalAnchoringStyles();
  }
  
  // Helper: Ensure all vote UI elements are inside the panel (not scattered)
  function ensureElementsInPanel() {
    const tv = document.querySelector('#tv');
    if (!tv) return;
    
    const overlay = tv.querySelector('.lv2-overlay, .voteOverlay, .tv-intermission-overlay');
    const panel = tv.querySelector('.votePanel, .intermission-card-container, .lv2-panel');
    
    if (!overlay || !panel) return;
    
    // Find any vote elements that are direct children of overlay but should be in panel
    const elementsToMove = overlay.querySelectorAll(':scope > .lv2-header, :scope > .lv2-grid, :scope > .lv2-instructions, :scope > .lv2-cta-row, :scope > .evictBtn');
    
    elementsToMove.forEach(el => {
      if (!panel.contains(el)) {
        console.debug('[lv2] Moving element into panel:', el.className);
        panel.appendChild(el);
      }
    });
  }
  
  // Helper: Remove inline styles that include vertical anchoring
  function removeVerticalAnchoringStyles() {
    const tv = document.querySelector('#tv');
    if (!tv) return;
    
    const overlay = tv.querySelector('.lv2-overlay, .voteOverlay, .tv-intermission-overlay');
    const panel = tv.querySelector('.lv2-panel, .votePanel, .intermission-card-container');
    
    if (!overlay && !panel) return;
    
    const elements = [overlay, panel].filter(Boolean);
    
    // Also check all children
    elements.forEach(parent => {
      const allChildren = parent?.querySelectorAll('*') || [];
      [parent, ...allChildren].forEach(el => {
        if (!el) return;
        
        // Remove problematic inline transform/positioning styles
        const style = el.style;
        if (style.transform && style.transform.includes('translateY')) {
          console.debug('[lv2] Removed translateY from inline style:', el.className);
          // Keep other transforms, just remove translateY
          const transforms = style.transform.split(/\s+/).filter(t => !t.includes('translateY'));
          style.transform = transforms.join(' ') || '';
        }
        
        // Remove explicit top/bottom positioning if found on vote elements
        const isVoteElement = el.classList.contains('lv2-overlay') || 
                             el.classList.contains('voteOverlay') ||
                             el.classList.contains('tv-intermission-overlay') ||
                             el.classList.contains('lv2-panel') || 
                             el.classList.contains('votePanel') ||
                             el.classList.contains('intermission-card-container') ||
                             el.classList.contains('lv2-cta-row');
        
        if (isVoteElement) {
          if (style.top && style.top !== 'unset' && style.top !== 'auto' && style.top !== '') {
            console.debug('[lv2] Removed top from inline style:', el.className);
            style.top = '';
          }
          if (style.bottom && style.bottom !== 'unset' && style.bottom !== 'auto' && style.bottom !== '') {
            console.debug('[lv2] Removed bottom from inline style:', el.className);
            style.bottom = '';
          }
          if (style.left && style.left !== 'unset' && style.left !== 'auto' && style.left !== '') {
            console.debug('[lv2] Removed left from inline style:', el.className);
            style.left = '';
          }
          if (style.right && style.right !== 'unset' && style.right !== 'auto' && style.right !== '') {
            console.debug('[lv2] Removed right from inline style:', el.className);
            style.right = '';
          }
          // Also remove margin-top: auto which can push content down
          if (style.marginTop === 'auto') {
            console.debug('[lv2] Removed margin-top:auto from inline style:', el.className);
            style.marginTop = '';
          }
          // Remove justify-content: flex-end which pushes content to bottom
          if (style.justifyContent === 'flex-end') {
            console.debug('[lv2] Removed justify-content:flex-end from inline style:', el.className);
            style.justifyContent = '';
          }
          // Remove align-items: flex-end which can affect positioning
          if (style.alignItems === 'flex-end') {
            console.debug('[lv2] Removed align-items:flex-end from inline style:', el.className);
            style.alignItems = '';
          }
        }
      });
    });
  }
  
  // Install MutationObserver to re-apply fixes when DOM changes
  let layoutObserver = null;
  function installLayoutObserver() {
    // Don't install multiple observers
    if (layoutObserver) {
      layoutObserver.disconnect();
      layoutObserver = null;
    }
    
    const tv = document.querySelector('#tv');
    if (!tv) return;
    
    // Debounce function to avoid excessive re-runs
    let debounceTimer = null;
    function debouncedFix() {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        console.debug('[lv2] MutationObserver detected changes, re-applying fixes');
        removeVerticalAnchoringStyles();
        removeDuplicateEvictButtons();
      }, 100);
    }
    
    layoutObserver = new MutationObserver((mutations) => {
      // Check if mutations affect our vote UI
      for (const mutation of mutations) {
        if (mutation.type === 'childList' || mutation.type === 'attributes') {
          const target = mutation.target;
          // Only react to changes in TV or overlay
          if (target.id === 'tv' || 
              target.classList?.contains('lv2-overlay') || 
              target.classList?.contains('voteOverlay') ||
              target.classList?.contains('lv2-panel') || 
              target.classList?.contains('votePanel')) {
            debouncedFix();
            break;
          }
        }
      }
    });
    
    layoutObserver.observe(tv, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class']
    });
    
    console.debug('[lv2] MutationObserver installed for layout fixes');
  }

  // Create contestant card (left or right)
  function createContestant(side, name, playerId) {
    const contestant = document.createElement('div');
    contestant.className = `lv2-contestant ${side}`;
    contestant.dataset.side = side;
    contestant.dataset.playerId = playerId;

    // Make contestant clickable to select nominee (clicking photo or container)
    contestant.style.cursor = 'pointer';
    contestant.onclick = (e) => {
      // Only handle clicks on the photo/container, not the button
      // Button has its own event handlers
      if (!e.target.closest('.lv2-name-btn')) {
        selectNominee(playerId, name);
      }
    };

    // Avatar with gradient ring
    const avatarWrapper = document.createElement('div');
    avatarWrapper.className = 'lv2-avatar';
    const avatar = document.createElement('img');
    avatar.src = getAvatarUrl(playerId);
    avatar.alt = name;
    avatar.loading = 'lazy';
    avatarWrapper.appendChild(avatar);
    contestant.appendChild(avatarWrapper);

    // Name - as semantic button for inline evict action (2-nominee flows only)
    const nameEl = document.createElement('button');
    nameEl.className = 'lv2-name-btn';
    nameEl.type = 'button';
    nameEl.textContent = name;
    nameEl.setAttribute('aria-label', `Select ${name} for eviction`);
    
    // Add click handler to name button
    nameEl.onclick = (e) => {
      e.stopPropagation(); // Prevent parent contestant click handler
      // Check if this is a selected button (evict action) or initial selection
      if (nameEl.classList.contains('lv2-name-btn-selected')) {
        // Button is in evict state - trigger evict action
        triggerEvictAction(playerId);
      } else {
        // Initial selection
        selectNominee(playerId, name);
      }
    };
    
    // Add keyboard handler to name button
    nameEl.onkeydown = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        // Same logic as click
        if (nameEl.classList.contains('lv2-name-btn-selected')) {
          triggerEvictAction(playerId);
        } else {
          selectNominee(playerId, name);
        }
      }
    };
    
    contestant.appendChild(nameEl);
    
    // Mobile Carousel 2.0: Index label ("1 of 2")
    if (state.useCarousel) {
      const indexLabel = document.createElement('div');
      indexLabel.className = 'lv2-index';
      const index = side === 'left' ? 1 : 2;
      indexLabel.textContent = `${index} of 2`;
      contestant.appendChild(indexLabel);
    }

    // Count capsule
    const count = document.createElement('div');
    count.className = 'lv2-count';
    count.dataset.count = '0';
    count.textContent = '0';
    count.setAttribute('aria-label', `${name}: 0 votes`);
    contestant.appendChild(count);
    
    // Mobile Carousel 2.0: Dots under portrait
    if (state.useCarousel) {
      const dots = document.createElement('div');
      dots.className = 'lv2-dots';
      
      const dot1 = document.createElement('span');
      dot1.className = side === 'left' ? 'dot active' : 'dot';
      dots.appendChild(dot1);
      
      const dot2 = document.createElement('span');
      dot2.className = side === 'right' ? 'dot active' : 'dot';
      dots.appendChild(dot2);
      
      contestant.appendChild(dots);
      
      // Swipe hint
      const hint = document.createElement('div');
      hint.className = 'lv2-hint';
      hint.textContent = 'Swipe to switch';
      contestant.appendChild(hint);
    }

    // Legacy CTA pill container removed for 2-nominee flows
    // All 2-nominee flows now use inline evict button on nominee tile

    // Drop anchor for vote pip animation
    const anchor = document.createElement('div');
    anchor.className = `lv2-drop-anchor ${side}`;
    contestant.appendChild(anchor);

    return contestant;
  }

  // Navigate carousel (prev/next)
  function navigateCarousel(direction) {
    if (!state.useCarousel) return;
    
    if (direction === 'prev') {
      state.carouselIndex = state.carouselIndex === 0 ? 1 : 0;
    } else if (direction === 'next') {
      state.carouselIndex = state.carouselIndex === 1 ? 0 : 1;
    }
    
    updateCarouselView();
  }
  
  // Update carousel view based on current index
  function updateCarouselView() {
    if (!state.container) return;
    
    const grid = state.container.querySelector('.lv2-grid');
    if (!grid) return;
    
    const contestants = grid.querySelectorAll('.lv2-contestant');
    
    // Update visibility of contestants
    contestants.forEach((contestant, idx) => {
      if (idx === state.carouselIndex) {
        contestant.classList.add('active');
        contestant.classList.remove('hidden');
        
        // Mobile Carousel 2.0: Update dots within the active contestant
        const dots = contestant.querySelectorAll('.lv2-dots .dot');
        dots.forEach((dot, dotIdx) => {
          if (dotIdx === state.carouselIndex) {
            dot.classList.add('active');
          } else {
            dot.classList.remove('active');
          }
        });
      } else {
        contestant.classList.remove('active');
        contestant.classList.add('hidden');
      }
    });
    
    // Update legacy carousel indicators if they exist (for backwards compatibility)
    const indicators = state.container.querySelectorAll('.lv2-carousel-dot');
    indicators.forEach((dot, idx) => {
      if (idx === state.carouselIndex) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    });
    
    // Mobile Carousel 2.0: Update CTA dock button
    updateCarouselCTADock();
    
    // Update legacy contextual CTA button (for backwards compatibility)
    updateCarouselCTA();
  }
  
  // Update the CTA button to target the currently shown nominee
  function updateCarouselCTA() {
    if (!state.useCarousel || !state.ctaBar) return;
    
    const currentSide = state.carouselIndex === 0 ? 'left' : 'right';
    const currentName = state.carouselIndex === 0 ? state.leftName : state.rightName;
    const currentId = state.carouselIndex === 0 ? state.leftId : state.rightId;
    
    // Find carousel CTA button
    const carouselCTA = state.container?.querySelector('.lv2-carousel-cta');
    if (!carouselCTA) return;
    
    const btn = carouselCTA.querySelector('button');
    if (!btn) return;
    
    // Update button text and data
    if (state.isTieBreak) {
      btn.textContent = 'Break Tie';
      btn.setAttribute('aria-label', `Break tie by evicting ${currentName}`);
    } else if (state.isFinal4) {
      btn.textContent = 'Cast Sole Vote';
      btn.setAttribute('aria-label', `Cast sole vote to evict ${currentName}`);
    } else {
      btn.textContent = `Evict ${currentName}`;
      btn.setAttribute('aria-label', `Vote to evict ${currentName}`);
    }
    
    btn.dataset.pick = currentId;
    btn.dataset.side = currentSide;
  }
  
  // Helper: Check if event target is the evict button (inline CTA)
  // Uses direct check first for performance, falls back to closest() for nested elements
  function isEvictButtonClick(event) {
    return event.target.dataset.action === 'evict' || 
           event.target.closest('[data-action="evict"]') !== null;
  }
  
  // Trigger evict action (called when inline evict button is clicked)
  function triggerEvictAction(playerId) {
    // Find the onVote callback from the CTA bar state
    if (state.ctaBar && state.ctaBar.onVote) {
      state.ctaBar.onVote(playerId);
    } else {
      console.warn('[lv2] triggerEvictAction: No onVote callback found');
    }
  }
  
  // Ensure inline CTA exists + helper to reveal CTA inside the faux TV
  function ensureInlineCtaGuard() {
    try {
      const overlay = document.querySelector('#tv .lv2-overlay') || document.querySelector('#tv .lv-overlay') || document.querySelector('#tvOverlay');
      if (!overlay) return;
      if (overlay.__inlineCtaGuardInstalled) return;
      overlay.__inlineCtaGuardInstalled = true;

      async function tryCreateCanonical() {
        const ev = global.game?.eviction;
        const noms = ev?.nominees || [];
        if (!global.lv2 || typeof global.lv2.createCtaBar !== 'function') return false;
        if (!noms || noms.length < 2) return false;
        try {
          global.lv2.createCtaBar({
            enabled: true,
            isTieBreak: !!ev.isTieBreak,
            isFinal4: !!ev.isFinal4,
            leftName: global.safeName ? global.safeName(noms[0]) : String(noms[0]),
            rightName: global.safeName ? global.safeName(noms[1]) : String(noms[1]),
            leftId: Number(noms[0]),
            rightId: Number(noms[1]),
            onVote: (playerId) => {
              if (typeof global.handleHumanVote === 'function') return global.handleHumanVote(Number(playerId));
              if (global.lv2 && typeof global.lv2.pushVote === 'function') {
                const pick = (Number(playerId) === Number(noms[0])) ? 'left' : 'right';
                global.lv2.pushVote({ voterId: global.game?.humanId || 0, voterName: global.safeName?.(global.game?.humanId) || 'You', pick });
              }
            }
          });
          if (typeof global.lv2.setTurn === 'function') global.lv2.setTurn(true);
          return true;
        } catch (e) {
          console.warn('[lv2-guard] createCtaBar failed', e);
          return false;
        }
      }

      function insertDebugCta() {
        // STRONG GUARD: Check for any existing CTA buttons in entire TV container
        const existingCta = document.querySelector('#tv .debug-cta-row') || 
                           document.querySelector('#tv .lv2-cta-row') || 
                           document.querySelector('#tv .lv-overlay__confirm-container');
        if (existingCta) {
          console.debug('[lv2-guard] CTA already exists, skipping debug CTA insertion');
          return;
        }
        
        const cta = document.createElement('div');
        cta.className = 'debug-cta-row';
        cta.dataset.guardInstalled = 'true'; // Mark as guard-created
        cta.style.cssText = 'display:flex;justify-content:center;margin:8px auto 0 auto;width:100%;z-index:9999;';
        const btn = document.createElement('button');
        btn.textContent = 'Evict';
        btn.className = 'debug-evict-btn';
        btn.style.cssText = 'background:linear-gradient(135deg,#e44,#c21);color:#fff;padding:12px 28px;border-radius:28px;border:none;font-weight:700;cursor:pointer;';
        cta.appendChild(btn);
        const panel = document.querySelector('#tv .lv2-panel .panel-content') || document.querySelector('#tv .lv2-panel');
        if (panel) {
          panel.appendChild(cta);
        } else {
          overlay.appendChild(cta);
        }
        btn.addEventListener('click', () => {
          const selected = document.querySelector('.lv2-name-btn-selected')?.closest('.lv2-contestant')?.dataset?.playerId ||
                           document.querySelector('.lv2-contestant.selected')?.dataset?.playerId;
          if (!selected) { alert('Select a nominee first.'); return; }
          if (typeof global.handleHumanVote === 'function') return global.handleHumanVote(Number(selected));
          if (global.lv2 && typeof global.lv2.pushVote === 'function') {
            const ev = global.game?.eviction; const noms = ev?.nominees || [];
            const pick = (Number(selected) === Number(noms[0])) ? 'left' : 'right';
            global.lv2.pushVote({ voterId: global.game?.humanId||0, voterName: global.safeName?.(global.game?.humanId)||'You', pick });
          }
        });
        console.debug('[lv2-guard] Debug CTA inserted as fallback');
      }

      tryCreateCanonical().then(created => {
        if (!created) {
          setTimeout(() => tryCreateCanonical(), 200);
          setTimeout(() => tryCreateCanonical(), 600);
          setTimeout(() => {
            const exists = overlay.querySelector('.lv2-cta-row, .lv-overlay__confirm-container, .debug-cta-row');
            if (!exists) insertDebugCta();
          }, 800);
        }
      });

      const mo = new MutationObserver(() => {
        const exists = overlay.querySelector('.lv2-cta-row, .lv-overlay__confirm-container, .debug-cta-row');
        if (!exists) tryCreateCanonical().then(created => { if (!created) insertDebugCta(); });
      });
      mo.observe(overlay, { childList: true, subtree: true });

    } catch (err) {
      console.error('[lv2-guard] unexpected', err);
    }
  }

  // Helper to ensure CTA is visible inside the faux TV after a selection
  function revealCtaInView() {
    const cta = document.querySelector('#tv .lv2-cta-row') || document.querySelector('#tv .lv-overlay__confirm-container') || document.querySelector('#tv .debug-cta-row');
    if (!cta) return;
    const tvEl = document.querySelector('#tv');
    if (!tvEl) return;
    const tvRect = tvEl.getBoundingClientRect();
    const cRect = cta.getBoundingClientRect();
    if (cRect.bottom > tvRect.bottom || cRect.top < tvRect.top) {
      const panel = document.querySelector('#tv .lv2-panel .panel-content') || document.querySelector('#tv .lv2-panel');
      if (panel) {
        panel.appendChild(cta);
        try { cta.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch(e) { /* scrollIntoView may not be supported */ }
      }
    }
  }
  
  // Select a nominee (transforms name button and updates instructions)
  function selectNominee(playerId, playerName) {
    state.selectedNominee = playerId;
    
    // GUARD: Remove all existing selected states first to prevent duplicates
    const allContestants = state.container?.querySelectorAll('.lv2-contestant');
    allContestants?.forEach(c => {
      c.classList.remove('selected');
      const btn = c.querySelector('.lv2-name-btn');
      if (btn) {
        btn.classList.remove('lv2-name-btn-selected');
        delete btn.dataset.action;
      }
    });
    
    // Add visual selection indicator and transform name button
    const contestants = state.container?.querySelectorAll('.lv2-contestant');
    let hasSelection = false;
    
    contestants?.forEach(c => {
      if (c.dataset.playerId === String(playerId)) {
        c.classList.add('selected');
        hasSelection = true;
        
        // Inline CTA: Transform name button into evict action button
        const nameBtn = c.querySelector('.lv2-name-btn');
        if (nameBtn) {
          // Apply tie-break or Final 4 wording if applicable
          let buttonText = `Evict ${playerName}`;
          let ariaLabel = `Tap again to confirm eviction of ${playerName}`;
          
          if (state.isTieBreak) {
            buttonText = 'Break Tie';
            ariaLabel = `Tap again to break tie by evicting ${playerName}`;
          } else if (state.isFinal4) {
            buttonText = 'Cast Sole Vote';
            ariaLabel = `Tap again to cast sole vote to evict ${playerName}`;
          }
          
          nameBtn.textContent = buttonText;
          nameBtn.classList.add('lv2-name-btn-selected');
          nameBtn.setAttribute('aria-label', ariaLabel);
          nameBtn.dataset.action = 'evict'; // Data attribute for robust detection
        }
      } else {
        c.classList.remove('selected');
        
        // Inline CTA: Restore name button to normal state
        const nameBtn = c.querySelector('.lv2-name-btn');
        const contestantName = c.dataset.side === 'left' ? state.leftName : state.rightName;
        if (nameBtn && contestantName) {
          nameBtn.textContent = contestantName;
          nameBtn.classList.remove('lv2-name-btn-selected');
          nameBtn.setAttribute('aria-label', `Select ${contestantName} for eviction`);
          delete nameBtn.dataset.action;
        }
      }
    });
    
    // Update instruction text based on selection state
    const instructions = state.container?.querySelector('.lv2-instructions');
    if (instructions) {
      if (hasSelection) {
        // Show confirmation message
        let confirmText = `You are about to evict ${playerName}. Tap again to confirm.`;
        if (state.isTieBreak) {
          confirmText = `You are about to break the tie by evicting ${playerName}. Tap again to confirm.`;
        } else if (state.isFinal4) {
          confirmText = `You are about to cast your sole vote to evict ${playerName}. Tap again to confirm.`;
        }
        instructions.textContent = confirmText;
      } else {
        // Show initial instruction
        instructions.textContent = 'Tap on the photo of the person you want to evict.';
      }
    }
    
    // Reveal CTA inside faux TV after selection (with small delay for DOM updates)
    setTimeout(() => { try { revealCtaInView(); } catch(e){ /* ignore */ } }, 60);
  }
  
  // Mobile Carousel 2.0: Update the CTA dock button (deprecated - no longer used)
  // This function is kept for backwards compatibility with existing call sites
  // In modern carousel mode, no separate CTA dock exists - inline CTA on nominee tile is used instead
  // DEPRECATED: This is a no-op function maintained only for backwards compatibility
  function updateCarouselCTADock() {
    // No-op: Modern carousel mode uses inline CTA only
    return;
  }


  // Push a new vote to the queue
  function pushVote(vote) {
    if (!vote || !vote.voterId || !vote.voterName || !vote.pick) {
      console.warn('[lv2] Invalid vote', vote);
      return;
    }

    state.voteQueue.push(vote);
    
    // Start processing if not already
    if (!state.isProcessing) {
      processNextVote();
    }
  }

  // Process votes from the queue
  async function processNextVote() {
    if (state.voteQueue.length === 0) {
      state.isProcessing = false;
      return;
    }

    state.isProcessing = true;
    const vote = state.voteQueue.shift();

    // V2.2.1: Show chip, hold, fade out, THEN update counts
    await revealVoteCard(vote);

    // After chip fades out, update counts
    if (vote.pick === 'left') {
      state.leftCount++;
    } else if (vote.pick === 'right') {
      state.rightCount++;
    }

    updateCounts();

    // Wait for gap before next vote
    await sleep(state.cardGapMs);

    // Process next
    processNextVote();
  }

  // Reveal a vote card - V2.2.1: Show chip in voter feed, hold ~1.2-1.5s, fade out
  async function revealVoteCard(vote) {
    const voterFeed = state.container?.querySelector('.lv2-voter-feed');
    if (!voterFeed) return;
    
    // Determine target nominee name
    const targetName = vote.pick === 'left' ? state.leftName : state.rightName;
    
    // Announce vote to screen readers
    const announcement = `${vote.voterName} voted to evict ${targetName}`;
    const ariaAnnounce = document.createElement('div');
    ariaAnnounce.setAttribute('role', 'status');
    ariaAnnounce.setAttribute('aria-live', 'polite');
    ariaAnnounce.setAttribute('aria-label', announcement);
    ariaAnnounce.style.display = 'none';
    voterFeed.appendChild(ariaAnnounce);
    
    // V2.2.1: Create voter chip with avatar and text
    const chip = document.createElement('div');
    chip.className = 'lv2-voter-chip';
    
    // Add voter avatar
    const avatar = document.createElement('img');
    avatar.className = 'lv2-voter-chip-avatar';
    avatar.src = getAvatarUrl(vote.voterId);
    avatar.alt = `${vote.voterName}'s avatar`;
    avatar.loading = 'eager';
    // Handle image load errors gracefully
    avatar.onerror = () => {
      avatar.src = getDicebearUrl(vote.voterName);
    };
    chip.appendChild(avatar);
    
    // Add vote text - shorter format: "Alex: I vote to evict Mimi"
    const text = document.createElement('div');
    text.className = 'lv2-voter-chip-text';
    text.textContent = `${vote.voterName}: I vote to evict ${targetName}`;
    chip.appendChild(text);
    
    // Add chip to voter feed
    voterFeed.appendChild(chip);

    if (!reducedMotion) {
      // Fade in
      await sleep(50); // Small delay for DOM to settle
      chip.style.opacity = '1';
      
      // Hold chip on screen for 1.2-1.5 seconds (using 1.3s average)
      await sleep(1300);
      
      // Fade out
      chip.style.transition = 'opacity 0.4s ease-out';
      chip.style.opacity = '0';
      await sleep(400); // Wait for fade out to complete
      
      // Remove chip after fade out completes
      chip.remove();
    } else {
      // Reduced motion: just show and hide with shorter duration
      chip.style.opacity = '1';
      await sleep(state.cardHoldMs);
      chip.style.opacity = '0';
      await sleep(300);
      chip.remove();
    }
    
    // Clean up aria announcement
    setTimeout(() => ariaAnnounce.remove(), 1000);
  }

  // Update contestant counts with animation
  function updateCounts() {
    const leftCountEl = state.container?.querySelector('.lv2-contestant.left .lv2-count');
    const rightCountEl = state.container?.querySelector('.lv2-contestant.right .lv2-count');

    if (leftCountEl) {
      animateCount(leftCountEl, state.leftCount, state.leftName);
    }
    if (rightCountEl) {
      animateCount(rightCountEl, state.rightCount, state.rightName);
    }
    
    // Update waiting status in carousel mode
    updateWaitingStatus();
  }
  
  // Update waiting status with vote progress (carousel mode)
  function updateWaitingStatus() {
    if (!state.useCarousel) return;
    
    const statusRow = state.container?.querySelector('.lv2-status-row');
    if (!statusRow) return;
    
    const waitingStatus = statusRow.querySelector('.lv2-waiting-status');
    if (!waitingStatus) return;
    
    // Calculate total votes cast
    const totalVotes = state.leftCount + state.rightCount;
    
    // If user has voted and votes are still being cast, show waiting status
    if (!state.humanTurn && totalVotes > 0) {
      const progressSpan = waitingStatus.querySelector('.progress');
      if (progressSpan) {
        // For now, we don't know the total expected votes, so just show current count
        // This can be enhanced later if we track expected voter count
        progressSpan.textContent = `${totalVotes}`;
      }
      waitingStatus.classList.add('visible');
    } else {
      waitingStatus.classList.remove('visible');
    }
  }

  // Animate count with odometer effect and V2.1 bump animation
  function animateCount(element, targetValue, name) {
    const currentValue = parseInt(element.dataset.count || '0', 10);
    if (currentValue === targetValue) return;

    element.dataset.count = String(targetValue);
    
    // V2.1: Add bump animation to capsule
    element.classList.remove('bump');
    void element.offsetWidth; // Force reflow
    element.classList.add('bump');
    
    if (reducedMotion) {
      // No animation, just update
      element.textContent = String(targetValue);
      element.setAttribute('aria-label', `${name}: ${targetValue} votes`);
      return;
    }

    // Odometer animation using requestAnimationFrame
    const duration = 400;
    const startTime = performance.now();
    const delta = targetValue - currentValue;

    function animate(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutQuad(progress);
      const value = Math.round(currentValue + (delta * eased));
      
      element.textContent = String(value);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        element.textContent = String(targetValue);
        element.setAttribute('aria-label', `${name}: ${targetValue} votes`);
      }
    }

    requestAnimationFrame(animate);
  }

  // Mark the winner/leader at the end
  function finish() {
    // Determine winner
    let winner = null;
    if (state.leftCount > state.rightCount) {
      winner = 'left';
    } else if (state.rightCount > state.leftCount) {
      winner = 'right';
    }

    if (!winner) {
      // Tie
      const status = state.container?.querySelector('.lv2-status');
      if (status) status.textContent = "It's a tie!";
      return;
    }

    // Highlight winner
    const winnerEl = state.container?.querySelector(`.lv2-contestant.${winner}`);
    if (winnerEl) {
      winnerEl.classList.add('winner');
    }

    const status = state.container?.querySelector('.lv2-status');
    if (status) {
      const winnerName = winner === 'left' ? state.leftName : state.rightName;
      status.textContent = `${winnerName} leads with ${winner === 'left' ? state.leftCount : state.rightCount} votes!`;
      status.classList.remove('muted');
      status.classList.add('ok');
    }
  }

  // Create voting CTA for 2-nominee flows (inline button pattern)
  function createCtaBar(options = {}) {
    const {
      enabled = false,
      isTieBreak = false,
      isFinal4 = false,
      leftName = state.leftName,
      rightName = state.rightName,
      leftId = state.leftId,
      rightId = state.rightId,
      onVote = null
    } = options;
    
    // Store tie-break and final4 flags for inline CTA
    state.isTieBreak = isTieBreak;
    state.isFinal4 = isFinal4;
    state.humanTurn = enabled;
    
    // Store onVote callback for inline CTA to use
    state.ctaBar = { onVote };
    
    // For 2-nominee flows, inline CTA pattern is used
    // Name button becomes the evict button when selected
    // No separate CTA dock or pills needed
    return { inlineEvictionActive: true };
  }


  // Update CTA bar state (inline eviction pattern)
  function updateCtaBar(options = {}) {
    if (!state.ctaBar) return;

    const { enabled = false } = options;
    
    // Update humanTurn state for inline CTA pattern
    state.humanTurn = enabled;
    
    // For 2-nominee flows, inline CTA pattern is always active
    // Name buttons remain clickable throughout the voting process
  }

  // Hide CTA bar (not applicable for inline CTA pattern)
  function hideCtaBar() {
    // For 2-nominee flows, inline CTA pattern doesn't need hiding
    // Name buttons remain visible as part of the nominee display
  }

  // V2.1: Set turn state - shows subtle tag and highlights CTA bar
  function setTurn(isActive) {
    state.humanTurn = isActive;
    
    if (isActive) {
      showTurnTag();
      highlightCtaBar(true);
    } else {
      hideTurnTag();
      highlightCtaBar(false);
    }
  }

  // V2.1: Show subtle top-center turn tag (or YOUR TURN pill in carousel mode)
  function showTurnTag() {
    // In carousel mode, show YOUR TURN pill in status row
    if (state.useCarousel) {
      const statusRow = state.container?.querySelector('.lv2-status-row');
      if (statusRow) {
        const yourTurnPill = statusRow.querySelector('.lv2-your-turn-pill');
        if (yourTurnPill) {
          yourTurnPill.classList.add('visible');
        }
        // Hide waiting status when showing your turn
        const waitingStatus = statusRow.querySelector('.lv2-waiting-status');
        if (waitingStatus) {
          waitingStatus.classList.remove('visible');
        }
      }
      return;
    }
    
    // Legacy mode: show turn tag at top
    const tv = document.querySelector('#tv');
    if (!tv) return;

    // Remove existing tag
    const existing = tv.querySelector('.lv2-turn-tag');
    if (existing) existing.remove();

    const tag = document.createElement('div');
    tag.className = 'lv2-turn-tag';
    tag.textContent = 'Your Turn';
    tag.setAttribute('role', 'status');
    tag.setAttribute('aria-live', 'polite');
    tag.setAttribute('aria-label', 'It is your turn to vote');

    tv.appendChild(tag);
  }

  // V2.1: Hide turn tag (or YOUR TURN pill in carousel mode)
  function hideTurnTag() {
    // In carousel mode, hide YOUR TURN pill in status row
    if (state.useCarousel) {
      const statusRow = state.container?.querySelector('.lv2-status-row');
      if (statusRow) {
        const yourTurnPill = statusRow.querySelector('.lv2-your-turn-pill');
        if (yourTurnPill) {
          yourTurnPill.classList.remove('visible');
        }
      }
      return;
    }
    
    // Legacy mode: remove turn tag
    const tv = document.querySelector('#tv');
    const tag = tv?.querySelector('.lv2-turn-tag');
    if (tag) tag.remove();
  }

  // V2.1.1: Highlight CTA pills when it's user's turn
  function highlightCtaBar(active) {
    if (!state.ctaBar) return;
    
    // For 2-nominee flows with inline CTA pattern
    // Visual highlighting is handled by the selected state and turn indicator
    // No additional highlighting needed on name buttons
  }

  // Show "Your turn" indicator (legacy - kept for backward compatibility)
  function showTurnIndicator() {
    setTurn(true);
  }

  // Hide "Your turn" indicator (legacy - kept for backward compatibility)
  function hideTurnIndicator() {
    setTurn(false);
  }

  // Clean up lv2 UI and restore panel visibility
  function cleanup() {
    // Clean up any rollout overlay that may be showing
    try {
      if (global.LiveVoteRollout?.hide) {
        global.LiveVoteRollout.hide();
        console.debug('[lv2] Cleaned up rollout overlay during cleanup');
      }
    } catch (e) {
      console.warn('[lv2] Error hiding rollout during cleanup:', e);
    }
    
    // Exit external overlay mode if active (restore any hidden children)
    if (state._externalOverlayActive) {
      exitExternalOverlayMode();
    }

    // Disconnect ResizeObserver
    if (state.resizeObserver) {
      state.resizeObserver.disconnect();
      state.resizeObserver = null;
    }
    
    // Disconnect MutationObserver
    if (layoutObserver) {
      layoutObserver.disconnect();
      layoutObserver = null;
      console.debug('[lv2] MutationObserver disconnected');
    }

    // Remove lv2 UI from TV
    const tv = document.querySelector('#tv');
    const existingOverlay = tv?.querySelector('.lv2-overlay');
    if (existingOverlay) existingOverlay.remove();

    // Remove turn indicator (legacy)
    const existingIndicator = tv?.querySelector('.lv2-turn-indicator');
    if (existingIndicator) existingIndicator.remove();
    
    // V2.1: Remove turn tag
    const existingTag = tv?.querySelector('.lv2-turn-tag');
    if (existingTag) existingTag.remove();

    // Remove any evictee visuals
    const evicteeVisuals = tv?.querySelectorAll('.lv2-evictee');
    evicteeVisuals?.forEach(el => el.remove());

    // Restore panel visibility
    const panel = document.querySelector('#panel');
    if (panel) {
      panel.style.display = '';
    }

    // Reset state
    state.container = null;
    state.stage = null;
    state.ctaBar = null;
    state.humanTurn = false;
    state.isTieBreak = false;
    state.isFinal4 = false;
    state.carouselIndex = 0;
    state.useCarousel = false;
    state.selectedNominee = null;
  }

  // Helper: sleep
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Easing function
  function easeOutQuad(t) {
    return t * (2 - t);
  }

  // Setup ResizeObserver for responsive scaling (fixed 1200x560 canvas)
  function setupResizeObserver(tv, fitWrapper) {
    // In responsive mode, skip transform scaling
    if (state.isResponsive) {
      return;
    }
    
    const CANVAS_WIDTH = 1200;
    const CANVAS_HEIGHT = 560;

    function updateScale() {
      const tvRect = tv.getBoundingClientRect();
      const scaleX = tvRect.width / CANVAS_WIDTH;
      const scaleY = tvRect.height / CANVAS_HEIGHT;
      const scale = Math.min(scaleX, scaleY, 1); // Never scale up beyond 100%

      fitWrapper.style.width = `${CANVAS_WIDTH}px`;
      fitWrapper.style.height = `${CANVAS_HEIGHT}px`;
      fitWrapper.style.transform = `scale(${scale})`;
    }

    // Initial scale
    updateScale();

    // Setup observer
    const observer = new ResizeObserver(() => {
      updateScale();
    });

    observer.observe(tv);
    state.resizeObserver = observer;
  }

  // Keyboard shortcuts for voting (1 and 2 keys, arrow keys for carousel)
  document.addEventListener('keydown', (e) => {
    if (!state.ctaBar) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
    
    const key = e.key;
    
    // Carousel mode: arrow keys for navigation
    if (state.useCarousel) {
      if (key === 'ArrowLeft') {
        navigateCarousel('prev');
        e.preventDefault();
        return;
      }
      if (key === 'ArrowRight') {
        navigateCarousel('next');
        e.preventDefault();
        return;
      }
      // Enter/Space handled by name button's own keyboard handlers
      return;
    }
    
    // Normal/Desktop mode: 1 and 2 keys for direct selection
    if (key !== '1' && key !== '2') return;

    const contestants = state.container?.querySelectorAll('.lv2-contestant');
    contestants?.forEach((contestant, index) => {
      const targetKey = String(index + 1);
      if (key === targetKey && state.humanTurn) {
        const nameBtn = contestant.querySelector('.lv2-name-btn');
        if (nameBtn) {
          nameBtn.click();
          e.preventDefault();
        }
      }
    });
  });

  // Result sequence functions for eviction flow
  
  /**
   * Begin result card phase: fade out nominees/feed and lower overlay z-index
   * so the Eviction Result card can appear on top
   */
  function beginResultCardPhase() {
    const tv = document.querySelector('#tv');
    const overlay = tv?.querySelector('.lv2-overlay');
    
    if (!overlay || !state.container) {
      console.warn('[lv2] beginResultCardPhase: overlay or container not found');
      return;
    }
    
    // Add result-phase class to fade out nominees and feed
    state.container.classList.add('lv2-result-phase');
    
    // Lower overlay z-index so cards appear on top
    overlay.classList.remove('above-cards');
    overlay.classList.add('below-cards');
  }

  /**
   * End result card phase: restore overlay z-index to normal
   * (after Eviction Result card has displayed)
   */
  function endResultCardPhase() {
    const tv = document.querySelector('#tv');
    const overlay = tv?.querySelector('.lv2-overlay');
    
    if (!overlay) {
      console.warn('[lv2] endResultCardPhase: overlay not found');
      return;
    }
    
    // Restore overlay z-index
    overlay.classList.remove('below-cards');
    overlay.classList.add('above-cards');
  }

  /**
   * Show centered final evictee portrait with black-and-white fade
   * @param {Object} options - { evictedId, evictedName, holdMs }
   */
  async function showEvicteeFinal(options = {}) {
    const { evictedId, evictedName, holdMs = 3500 } = options;
    
    if (!evictedId || !evictedName) {
      console.warn('[lv2] showEvicteeFinal: missing evictedId or evictedName');
      return;
    }

    const tv = document.querySelector('#tv');
    if (!tv) {
      console.warn('[lv2] showEvicteeFinal: TV element not found');
      return;
    }

    // Create evictee visual container
    const evicteeEl = document.createElement('div');
    evicteeEl.className = 'lv2-evictee';

    // Portrait container
    const portraitEl = document.createElement('div');
    portraitEl.className = 'lv2-evictee-portrait';

    // Portrait image
    const img = document.createElement('img');
    img.src = getAvatarUrl(evictedId);
    img.alt = evictedName;
    img.onerror = function() {
      console.warn(`[lv2] failed to load evictee avatar for ${evictedName}`);
      this.onerror = null;
      this.src = getDicebearUrl(evictedName);
    };
    portraitEl.appendChild(img);

    // Name label
    const nameEl = document.createElement('div');
    nameEl.className = 'lv2-evictee-name';
    nameEl.textContent = evictedName;

    evicteeEl.appendChild(portraitEl);
    evicteeEl.appendChild(nameEl);

    // Append to TV (above overlay)
    tv.appendChild(evicteeEl);

    // Fade in
    await sleep(100); // Allow DOM to settle
    evicteeEl.classList.add('visible');

    // Wait for portrait to be visible (part of the total hold time)
    await sleep(EVICTEE_FADE_IN_WAIT);

    // Animate to black-and-white
    portraitEl.classList.add('grayscale');

    // Hold the portrait (total hold time minus fade-in wait)
    // In reduced motion, use shorter duration
    const remainingHold = reducedMotion 
      ? Math.max(holdMs * EVICTEE_REDUCED_MOTION_FACTOR, EVICTEE_MIN_REDUCED_HOLD)
      : Math.max(holdMs - EVICTEE_FADE_IN_WAIT, EVICTEE_MIN_NORMAL_HOLD);
    await sleep(remainingHold);

    // Fade out
    evicteeEl.style.transition = 'opacity 0.8s ease-out';
    evicteeEl.style.opacity = '0';

    await sleep(800);

    // Remove from DOM
    evicteeEl.remove();
  }

  /**
   * Check if inline card is supported (responsive mode)
   * Uses TVFit engine if available, otherwise falls back to state.isResponsive
   * @returns {boolean}
   */
  function supportsInlineCard() {
    // Use TVFit engine if available
    if (global.TVFit) {
      return global.TVFit.isMobile() || global.TVFit.isNarrow();
    }
    
    // Fallback to state-based detection
    return state.isResponsive === true;
  }

  /**
   * Show inline summary card inside the TV overlay (for mobile)
   * @param {Object} options - { title, body, duration, tone }
   */
  async function showInlineCard(options = {}) {
    const { 
      title = 'Result', 
      body = [], 
      duration = 3800,
      tone = 'neutral'
    } = options;

    const tv = document.querySelector('#tv');
    if (!tv) {
      console.warn('[lv2] showInlineCard: TV element not found');
      return;
    }

    // Prefer tvOverlay for proper centering within safe areas
    const container = document.querySelector('#tvOverlay') || tv;

    // Remove any existing inline card
    const existing = container.querySelector('.lv2-inline-card');
    if (existing) existing.remove();
    // Also check parent TV for lingering cards
    const tvExisting = tv.querySelector('.lv2-inline-card');
    if (tvExisting) tvExisting.remove();

    // Create inline card with TV inline card class for consistent styling
    const card = document.createElement('div');
    card.className = 'lv2-inline-card tv-inline-card';
    
    // Add tone class
    if (tone === 'evict' || tone === 'live') {
      card.classList.add(`tone-${tone}`);
    }

    // Title
    const h3 = document.createElement('h3');
    h3.textContent = title;
    card.appendChild(h3);

    // Body content
    const bodyDiv = document.createElement('div');
    bodyDiv.className = 'lv2-inline-card-body';
    const bodyLines = Array.isArray(body) ? body : [body];
    bodyLines.forEach(line => {
      const lineDiv = document.createElement('div');
      lineDiv.textContent = line;
      bodyDiv.appendChild(lineDiv);
    });
    card.appendChild(bodyDiv);

    // Append to container (tvOverlay if available for proper centering)
    container.appendChild(card);

    // Fade in
    await sleep(50);
    card.classList.add('visible');

    // Hold for duration
    await sleep(duration);

    // Fade out
    card.classList.remove('visible');
    await sleep(500);

    // Remove from DOM
    card.remove();
  }

  /**
   * Enter external overlay mode: hide all lv2 children except the background stage
   * Used when a full-screen overlay (e.g., rollout) is shown to prevent doubled UI
   */
  function enterExternalOverlayMode() {
    try {
      if (!state.container) {
        console.debug('[lv2] enterExternalOverlayMode: no container mounted');
        return;
      }

      if (state._externalOverlayActive) {
        console.debug('[lv2] enterExternalOverlayMode: already active');
        return;
      }

      console.debug('[lv2] Entering external overlay mode - hiding children except stage');
      state._externalOverlayActive = true;
      state._hiddenChildren = [];

      // Hide all children except the stage (background)
      Array.from(state.container.children).forEach(child => {
        // Keep the stage visible (it's the background/log element)
        if (child === state.stage) {
          return;
        }

        // Record current display style and hide element
        const currentDisplay = child.style.display || '';
        state._hiddenChildren.push({ el: child, display: currentDisplay });
        child.style.display = 'none';
      });

      console.debug(`[lv2] Hidden ${state._hiddenChildren.length} child elements`);
    } catch (err) {
      console.error('[lv2] enterExternalOverlayMode failed:', err);
    }
  }

  /**
   * Exit external overlay mode: restore all previously hidden lv2 children
   */
  function exitExternalOverlayMode() {
    try {
      if (!state._externalOverlayActive) {
        console.debug('[lv2] exitExternalOverlayMode: not active');
        return;
      }

      console.debug('[lv2] Exiting external overlay mode - restoring children');
      state._externalOverlayActive = false;

      // Restore all previously hidden elements
      state._hiddenChildren.forEach(({ el, display }) => {
        if (el && el.parentNode) {
          el.style.display = display;
        }
      });

      console.debug(`[lv2] Restored ${state._hiddenChildren.length} child elements`);
      state._hiddenChildren = [];
    } catch (err) {
      console.error('[lv2] exitExternalOverlayMode failed:', err);
    }
  }

  // Public API exposed on window.lv2
  const lv2 = {
    init: init,
    pushVote: pushVote,
    finish: finish,
    cleanup: cleanup,
    createCtaBar: createCtaBar,
    updateCtaBar: updateCtaBar,
    hideCtaBar: hideCtaBar,
    setTurn: setTurn,
    showTurnIndicator: showTurnIndicator,
    hideTurnIndicator: hideTurnIndicator,
    beginResultCardPhase: beginResultCardPhase,
    endResultCardPhase: endResultCardPhase,
    showEvicteeFinal: showEvicteeFinal,
    supportsInlineCard: supportsInlineCard,
    showInlineCard: showInlineCard,
    enterExternalOverlayMode: enterExternalOverlayMode,
    exitExternalOverlayMode: exitExternalOverlayMode,
    get enabled() {
      // Read from config if available
      return global.game?.cfg?.modernLiveVoteUI !== false;
    },
    set enabled(val) {
      // Allow manual override
      if (global.game?.cfg) {
        global.game.cfg.modernLiveVoteUI = !!val;
      }
    },
    reducedMotion: reducedMotion
  };

  // Expose on global
  global.lv2 = lv2;

})(window);
