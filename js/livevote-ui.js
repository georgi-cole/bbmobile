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
    overlay.className = 'lv2-overlay';
    
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
    container.className = 'lv2-panel';

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
    
    // Inline CTA: Instruction text (below grid, before CTA dock)
    if (state.useCarousel) {
      const instructionText = document.createElement('div');
      instructionText.className = 'lv2-instruction-text';
      instructionText.textContent = 'Tap on the photo of the person you want to evict.';
      instructionText.setAttribute('role', 'status');
      instructionText.setAttribute('aria-live', 'polite');
      container.appendChild(instructionText);
    }
    
    // Mobile Carousel 2.0: Status Row (below stage, above CTA dock)
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
    
    // Mobile Carousel 2.0: CTA Dock (positioned INSIDE overlay, directly under carousel)
    // NOTE: Hidden by default in carousel mode - inline CTA on nominee tile is used instead
    if (state.useCarousel) {
      const ctaDock = document.createElement('div');
      ctaDock.classList.add('lv2-cta-dock', 'lv2-cta-dock-inline', 'lv2-cta-dock-hidden');
      
      // Position inline within the overlay structure, not fixed
      // This ensures it's contained within the faux TV overlay
      Object.assign(ctaDock.style, {
        position: 'relative',
        width: '100%',
        padding: '16px',
        justifyContent: 'center',
        gap: '12px',
        marginTop: '8px'
      });
      
      const mainButton = document.createElement('button');
      mainButton.className = 'lv2-cta-main';
      mainButton.disabled = true; // Initially disabled until selection
      mainButton.textContent = 'Select a Nominee';
      mainButton.setAttribute('aria-label', 'Select a nominee to evict');
      mainButton.dataset.pick = '';
      
      ctaDock.appendChild(mainButton);
      
      // Insert dock immediately after the grid (carousel/header section)
      const gridIndex = Array.from(container.children).findIndex(child => 
        child.classList.contains('lv2-grid')
      );
      if (gridIndex !== -1) {
        container.insertBefore(ctaDock, container.children[gridIndex + 1]);
      } else {
        container.appendChild(ctaDock);
      }
    } else {
      // Desktop mode: Add confirm button under the grid
      const ctaDock = document.createElement('div');
      ctaDock.classList.add('lv2-cta-dock', 'lv2-cta-dock-inline', 'lv2-cta-dock-desktop');
      
      Object.assign(ctaDock.style, {
        position: 'relative',
        width: '100%',
        padding: '16px',
        display: 'flex',
        justifyContent: 'center',
        gap: '12px',
        marginTop: '8px'
      });
      
      const mainButton = document.createElement('button');
      mainButton.className = 'lv2-cta-main';
      mainButton.disabled = true; // Initially disabled until selection
      mainButton.textContent = 'Select a Nominee';
      mainButton.setAttribute('aria-label', 'Select a nominee to evict');
      mainButton.dataset.pick = '';
      
      ctaDock.appendChild(mainButton);
      container.appendChild(ctaDock);
    }

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

    // CTA footer row (legacy, now hidden by default)
    const ctaRow = document.createElement('div');
    ctaRow.className = 'lv2-cta-row';
    container.appendChild(ctaRow);

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
  }

  // Create contestant card (left or right)
  function createContestant(side, name, playerId) {
    const contestant = document.createElement('div');
    contestant.className = `lv2-contestant ${side}`;
    contestant.dataset.side = side;
    contestant.dataset.playerId = playerId;

    // Make contestant clickable to select nominee (both carousel and desktop modes)
    contestant.style.cursor = 'pointer';
    contestant.onclick = (e) => {
      // Check if inline evict button was clicked
      if (isEvictButtonClick(e) && state.useCarousel) {
        // Inline CTA: Evict button was clicked - trigger evict action
        triggerEvictAction(playerId);
      } else {
        // Normal selection (clicking photo or nominee card)
        selectNominee(playerId, name);
      }
    };
    contestant.setAttribute('role', 'button');
    contestant.setAttribute('tabindex', '0');
    contestant.setAttribute('aria-label', `Select ${name} for eviction`);
    
    // Add keyboard support
    contestant.onkeydown = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        // Check if the event target is the inline evict button
        if (isEvictButtonClick(e) && state.useCarousel) {
          // Inline CTA: Evict button activated via keyboard - trigger evict action
          triggerEvictAction(playerId);
        } else {
          // Normal selection
          selectNominee(playerId, name);
        }
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

    // Name
    const nameEl = document.createElement('div');
    nameEl.className = 'lv2-name';
    nameEl.textContent = name;
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

    // CTA pill container under the nominee (v2.1.1)
    const ctaSide = document.createElement('div');
    ctaSide.className = 'lv2-cta-side';
    ctaSide.dataset.side = side;
    ctaSide.dataset.playerId = playerId;
    contestant.appendChild(ctaSide);

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
  
  // Select a nominee (enables confirm button and updates label)
  function selectNominee(playerId, playerName) {
    state.selectedNominee = playerId;
    
    // Update the confirm button (legacy path for non-carousel mode)
    const ctaDock = state.container?.querySelector('.lv2-cta-dock');
    if (ctaDock && !state.useCarousel) {
      const mainBtn = ctaDock.querySelector('.lv2-cta-main');
      if (mainBtn) {
        mainBtn.disabled = false;
        mainBtn.textContent = `Evict ${playerName}`;
        mainBtn.setAttribute('aria-label', `Confirm eviction of ${playerName}`);
        mainBtn.dataset.pick = playerId;
      }
    }
    
    // Add visual selection indicator to the contestant
    const contestants = state.container?.querySelectorAll('.lv2-contestant');
    let hasSelection = false;
    
    contestants?.forEach(c => {
      if (c.dataset.playerId === String(playerId)) {
        c.classList.add('selected');
        hasSelection = true;
        
        // Inline CTA: Transform name area into evict button in carousel mode
        if (state.useCarousel) {
          const nameEl = c.querySelector('.lv2-name');
          if (nameEl) {
            nameEl.textContent = `Evict ${playerName}`;
            nameEl.classList.add('lv2-name-button');
            nameEl.setAttribute('role', 'button');
            nameEl.setAttribute('tabindex', '0');
            nameEl.setAttribute('aria-label', `Evict ${playerName}`);
            nameEl.dataset.action = 'evict'; // Data attribute for robust detection
          }
        }
      } else {
        c.classList.remove('selected');
        
        // Inline CTA: Restore name area to normal state in carousel mode
        if (state.useCarousel) {
          const nameEl = c.querySelector('.lv2-name');
          const contestantName = c.dataset.side === 'left' ? state.leftName : state.rightName;
          if (nameEl && contestantName) {
            nameEl.textContent = contestantName;
            nameEl.classList.remove('lv2-name-button');
            nameEl.removeAttribute('role');
            nameEl.removeAttribute('tabindex');
            nameEl.removeAttribute('aria-label');
            nameEl.removeAttribute('data-action');
          }
        }
      }
    });
    
    // Inline CTA: Show/hide instruction text based on selection state
    if (state.useCarousel) {
      const instructionText = state.container?.querySelector('.lv2-instruction-text');
      if (instructionText) {
        instructionText.style.display = hasSelection ? 'none' : '';
      }
    }
  }
  
  // Mobile Carousel 2.0: Update the CTA dock button to target the currently shown nominee
  function updateCarouselCTADock() {
    if (!state.useCarousel) return;
    
    const currentSide = state.carouselIndex === 0 ? 'left' : 'right';
    const currentName = state.carouselIndex === 0 ? state.leftName : state.rightName;
    const currentId = state.carouselIndex === 0 ? state.leftId : state.rightId;
    
    // Find CTA dock button
    const ctaDock = state.container?.querySelector('.lv2-cta-dock');
    if (!ctaDock) return;
    
    const btn = ctaDock.querySelector('.lv2-cta-main');
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

  // Create voting CTA pills under each nominee (v2.1.1)
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
    
    // Store tie-break and final4 flags for carousel CTA updates
    state.isTieBreak = isTieBreak;
    state.isFinal4 = isFinal4;

    // If using carousel mode, create single large contextual button
    if (state.useCarousel) {
      return createCarouselCTA({ enabled, isTieBreak, isFinal4, onVote });
    }

    // Find CTA side containers under each contestant
    const leftCtaSide = state.container?.querySelector('.lv2-cta-side[data-side="left"]');
    const rightCtaSide = state.container?.querySelector('.lv2-cta-side[data-side="right"]');
    
    if (!leftCtaSide || !rightCtaSide) return;

    // Clear existing pills
    leftCtaSide.innerHTML = '';
    rightCtaSide.innerHTML = '';

    if (isFinal4) {
      // Final 4: Show prompt on both sides but only allow one vote
      const infoText = document.createElement('div');
      infoText.className = 'tiny muted';
      infoText.textContent = 'Cast sole vote';
      infoText.style.textAlign = 'center';
      leftCtaSide.appendChild(infoText);
      
      const infoText2 = document.createElement('div');
      infoText2.className = 'tiny muted';
      infoText2.textContent = 'Cast sole vote';
      infoText2.style.textAlign = 'center';
      rightCtaSide.appendChild(infoText2);
      
      // Add onclick to the contestant areas for Final 4
      const leftContestant = state.container?.querySelector('.lv2-contestant.left');
      const rightContestant = state.container?.querySelector('.lv2-contestant.right');
      if (enabled && onVote) {
        if (leftContestant) {
          leftContestant.style.cursor = 'pointer';
          leftContestant.onclick = () => onVote(leftId);
        }
        if (rightContestant) {
          rightContestant.style.cursor = 'pointer';
          rightContestant.onclick = () => onVote(rightId);
        }
      }
    } else if (isTieBreak) {
      // Tie-break: HOH wording
      const btnLeft = document.createElement('button');
      btnLeft.className = 'lv2-cta-pill';
      btnLeft.textContent = 'Break Tie';
      btnLeft.disabled = !enabled;
      btnLeft.setAttribute('aria-label', `Break tie by evicting ${leftName}`);
      btnLeft.dataset.pick = leftId;
      btnLeft.dataset.key = '1';
      btnLeft.onclick = () => {
        if (onVote) onVote(leftId);
      };
      leftCtaSide.appendChild(btnLeft);

      const btnRight = document.createElement('button');
      btnRight.className = 'lv2-cta-pill';
      btnRight.textContent = 'Break Tie';
      btnRight.disabled = !enabled;
      btnRight.setAttribute('aria-label', `Break tie by evicting ${rightName}`);
      btnRight.dataset.pick = rightId;
      btnRight.dataset.key = '2';
      btnRight.onclick = () => {
        if (onVote) onVote(rightId);
      };
      rightCtaSide.appendChild(btnRight);
    } else {
      // Normal vote: Pill under each nominee
      const btnLeft = document.createElement('button');
      btnLeft.className = 'lv2-cta-pill';
      btnLeft.textContent = 'Evict';
      btnLeft.disabled = !enabled;
      btnLeft.setAttribute('aria-label', `Vote to evict ${leftName}. Press 1 to select.`);
      btnLeft.dataset.pick = leftId;
      btnLeft.dataset.key = '1';
      btnLeft.onclick = () => {
        if (onVote) onVote(leftId);
      };
      leftCtaSide.appendChild(btnLeft);

      const btnRight = document.createElement('button');
      btnRight.className = 'lv2-cta-pill';
      btnRight.textContent = 'Evict';
      btnRight.disabled = !enabled;
      btnRight.setAttribute('aria-label', `Vote to evict ${rightName}. Press 2 to select.`);
      btnRight.dataset.pick = rightId;
      btnRight.dataset.key = '2';
      btnRight.onclick = () => {
        if (onVote) onVote(rightId);
      };
      rightCtaSide.appendChild(btnRight);
    }

    // Store reference for later updates
    state.ctaBar = { leftCtaSide, rightCtaSide };
    return { leftCtaSide, rightCtaSide };
  }
  
  // Create single large contextual CTA button for carousel mode
  function createCarouselCTA(options = {}) {
    const { enabled = false, isTieBreak = false, isFinal4 = false, onVote = null } = options;
    
    // Mobile Carousel 2.0: Wire up the CTA dock button
    const ctaDock = state.container?.querySelector('.lv2-cta-dock');
    if (ctaDock) {
      const mainBtn = ctaDock.querySelector('.lv2-cta-main');
      if (mainBtn && onVote) {
        mainBtn.disabled = !enabled;
        mainBtn.onclick = () => {
          const targetId = mainBtn.dataset.pick;
          if (onVote && targetId) {
            onVote(targetId);
          }
        };
      }
      
      // Store reference to CTA dock and onVote callback (for inline CTA)
      state.ctaBar = { ctaDock, onVote };
      return { ctaDock };
    }
    
    // Legacy carousel CTA (for backwards compatibility)
    // Remove any existing carousel CTA
    const existingCTA = state.container?.querySelector('.lv2-carousel-cta');
    if (existingCTA) existingCTA.remove();
    
    // Create carousel CTA container
    const carouselCTA = document.createElement('div');
    carouselCTA.className = 'lv2-carousel-cta';
    
    // Create large button
    const btn = document.createElement('button');
    btn.className = 'lv2-carousel-btn';
    btn.disabled = !enabled;
    
    // Initial text for first nominee
    const currentName = state.carouselIndex === 0 ? state.leftName : state.rightName;
    const currentId = state.carouselIndex === 0 ? state.leftId : state.rightId;
    
    if (isTieBreak) {
      btn.textContent = 'Break Tie';
      btn.setAttribute('aria-label', `Break tie by evicting ${currentName}`);
    } else if (isFinal4) {
      btn.textContent = 'Cast Sole Vote';
      btn.setAttribute('aria-label', `Cast sole vote to evict ${currentName}`);
    } else {
      btn.textContent = `Evict ${currentName}`;
      btn.setAttribute('aria-label', `Vote to evict ${currentName}`);
    }
    
    btn.dataset.pick = currentId;
    btn.onclick = () => {
      if (onVote) {
        const targetId = btn.dataset.pick;
        onVote(targetId);
      }
    };
    
    carouselCTA.appendChild(btn);
    
    // Insert after status element
    const status = state.container?.querySelector('.lv2-status');
    if (status && status.parentNode) {
      status.parentNode.insertBefore(carouselCTA, status.nextSibling);
    } else {
      state.container?.appendChild(carouselCTA);
    }
    
    // Store reference and onVote callback (for inline CTA)
    state.ctaBar = { carouselCTA, onVote };
    
    return { carouselCTA };
  }

  // Update CTA bar state
  function updateCtaBar(options = {}) {
    if (!state.ctaBar) return;

    const { enabled = false } = options;
    
    // Handle carousel mode with CTA dock
    if (state.useCarousel) {
      // Mobile Carousel 2.0: Update CTA dock button
      const { ctaDock, carouselCTA } = state.ctaBar;
      
      if (ctaDock) {
        const mainBtn = ctaDock.querySelector('.lv2-cta-main');
        if (mainBtn) {
          mainBtn.disabled = !enabled;
        }
        return;
      }
      
      // Legacy carousel CTA (backwards compatibility)
      if (carouselCTA) {
        const btn = carouselCTA.querySelector('.lv2-carousel-btn');
        if (btn) {
          btn.disabled = !enabled;
        }
        return;
      }
    }
    
    // Handle normal mode
    const { leftCtaSide, rightCtaSide } = state.ctaBar;
    
    const buttons = [
      ...(leftCtaSide?.querySelectorAll('.lv2-cta-pill') || []),
      ...(rightCtaSide?.querySelectorAll('.lv2-cta-pill') || [])
    ];
    
    buttons.forEach(btn => {
      btn.disabled = !enabled;
    });
  }

  // Hide CTA bar (when voting phase begins)
  function hideCtaBar() {
    if (!state.ctaBar) return;
    
    // Handle carousel mode with CTA dock
    if (state.useCarousel) {
      const { ctaDock, carouselCTA } = state.ctaBar;
      
      if (ctaDock) {
        ctaDock.style.display = 'none';
        return;
      }
      
      // Legacy carousel CTA
      if (carouselCTA) {
        carouselCTA.style.display = 'none';
        return;
      }
    }
    
    // Handle normal mode - hide pill containers
    const { leftCtaSide, rightCtaSide } = state.ctaBar;
    if (leftCtaSide) leftCtaSide.style.display = 'none';
    if (rightCtaSide) rightCtaSide.style.display = 'none';
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
    
    // Mobile Carousel 2.0: Handle CTA dock
    if (state.useCarousel && state.ctaBar.ctaDock) {
      const mainBtn = state.ctaBar.ctaDock.querySelector('.lv2-cta-main');
      if (mainBtn) {
        if (active && !mainBtn.disabled) {
          mainBtn.classList.add('highlight');
        } else {
          mainBtn.classList.remove('highlight');
        }
      }
      return;
    }
    
    // Legacy carousel mode (backwards compatibility)
    if (state.useCarousel && state.ctaBar.carouselCTA) {
      const btn = state.ctaBar.carouselCTA.querySelector('.lv2-carousel-btn');
      if (btn) {
        if (active && !btn.disabled) {
          btn.classList.add('highlight');
        } else {
          btn.classList.remove('highlight');
        }
      }
      return;
    }
    
    // Normal mode: handle left/right pills
    const { leftCtaSide, rightCtaSide } = state.ctaBar;
    const pills = [
      ...(leftCtaSide?.querySelectorAll('.lv2-cta-pill') || []),
      ...(rightCtaSide?.querySelectorAll('.lv2-cta-pill') || [])
    ];
    
    if (active) {
      pills.forEach(pill => {
        if (!pill.disabled) {
          pill.classList.add('active');
        }
      });
    } else {
      pills.forEach(pill => {
        pill.classList.remove('active');
      });
    }
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
    
    // Carousel mode: arrow keys for navigation, Enter/Space to vote
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
      if (key === 'Enter' || key === ' ') {
        // Try CTA dock first (Mobile Carousel 2.0)
        const { ctaDock, carouselCTA } = state.ctaBar;
        
        if (ctaDock) {
          const btn = ctaDock.querySelector('.lv2-cta-main');
          if (btn && !btn.disabled) {
            btn.click();
            e.preventDefault();
            return;
          }
        }
        
        // Fallback to legacy carousel CTA
        if (carouselCTA) {
          const btn = carouselCTA.querySelector('.lv2-carousel-btn');
          if (btn && !btn.disabled) {
            btn.click();
            e.preventDefault();
            return;
          }
        }
      }
      return;
    }
    
    // Normal mode: 1 and 2 keys
    if (key !== '1' && key !== '2') return;

    const { leftCtaSide, rightCtaSide } = state.ctaBar;
    const pills = [
      ...(leftCtaSide?.querySelectorAll('.lv2-cta-pill') || []),
      ...(rightCtaSide?.querySelectorAll('.lv2-cta-pill') || [])
    ];
    
    pills.forEach(pill => {
      if (pill.dataset.key === key && !pill.disabled) {
        pill.click();
        e.preventDefault();
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

    // Remove any existing inline card
    const existing = tv.querySelector('.lv2-inline-card');
    if (existing) existing.remove();

    // Create inline card
    const card = document.createElement('div');
    card.className = 'lv2-inline-card';
    
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

    // Append to TV
    tv.appendChild(card);

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
