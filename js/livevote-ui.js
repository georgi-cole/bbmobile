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
    useCarousel: false // Whether to use carousel layout
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

  // Detect if we should use responsive mode (mobile/narrow viewport)
  function detectResponsiveMode() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const isPortrait = height > width;
    const isNarrow = width < 820;
    
    // Use carousel on very narrow or portrait screens
    const useCarousel = isNarrow || isPortrait;
    state.useCarousel = useCarousel;
    
    return isNarrow || isPortrait;
  }

  // Render the modern panel inside #tv with fixed canvas and ResizeObserver scaling
  function renderPanel() {
    const tv = document.querySelector('#tv');
    if (!tv) {
      console.warn('[lv2] #tv element not found');
      return;
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
    
    // Mobile Carousel 2.0: Add arrows hugging the portrait (inside grid)
    if (state.useCarousel) {
      const prevArrow = document.createElement('button');
      prevArrow.className = 'lv2-arrow prev';
      prevArrow.setAttribute('aria-label', 'Show previous nominee');
      prevArrow.innerHTML = '◀';
      prevArrow.onclick = () => navigateCarousel('prev');
      grid.appendChild(prevArrow);
      
      const nextArrow = document.createElement('button');
      nextArrow.className = 'lv2-arrow next';
      nextArrow.setAttribute('aria-label', 'Show next nominee');
      nextArrow.innerHTML = '▶';
      nextArrow.onclick = () => navigateCarousel('next');
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

    container.appendChild(grid);
    
    // Mobile Carousel 2.0: CTA Dock (always visible at bottom)
    if (state.useCarousel) {
      const ctaDock = document.createElement('div');
      ctaDock.className = 'lv2-cta-dock';
      
      const mainButton = document.createElement('button');
      mainButton.className = 'lv2-cta-main';
      mainButton.textContent = `Evict ${state.leftName}`;
      mainButton.setAttribute('aria-label', `Vote to evict ${state.leftName}`);
      mainButton.dataset.pick = state.leftId;
      
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
    
    // Clear any existing lv2 UI
    const existingLv2 = tv.querySelector('.lv2-overlay');
    if (existingLv2) existingLv2.remove();
    
    // Append to TV
    tv.appendChild(overlay);

    // Setup ResizeObserver for responsive scaling
    setupResizeObserver(tv, fitWrapper);
    
    // Initialize carousel view if in carousel mode
    if (state.useCarousel) {
      // Set initial carousel index to 0 (left nominee)
      state.carouselIndex = 0;
      // Use setTimeout to ensure DOM is ready
      setTimeout(() => updateCarouselView(), 50);
    }
  }

  // Create contestant card (left or right)
  function createContestant(side, name, playerId) {
    const contestant = document.createElement('div');
    contestant.className = `lv2-contestant ${side}`;
    contestant.dataset.side = side;

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

  // Create carousel navigation controls (prev/next arrows)
  function createCarouselNav() {
    const nav = document.createElement('div');
    nav.className = 'lv2-carousel-nav';
    
    // Previous button (left arrow)
    const prevBtn = document.createElement('button');
    prevBtn.className = 'lv2-carousel-arrow lv2-carousel-prev';
    prevBtn.setAttribute('aria-label', 'Show previous nominee');
    prevBtn.innerHTML = '◀'; // Left triangle
    prevBtn.onclick = () => navigateCarousel('prev');
    nav.appendChild(prevBtn);
    
    // Indicator dots
    const indicators = document.createElement('div');
    indicators.className = 'lv2-carousel-indicators';
    
    const dot1 = document.createElement('span');
    dot1.className = 'lv2-carousel-dot active';
    dot1.setAttribute('aria-label', `Show ${state.leftName}`);
    dot1.onclick = () => setCarouselIndex(0);
    indicators.appendChild(dot1);
    
    const dot2 = document.createElement('span');
    dot2.className = 'lv2-carousel-dot';
    dot2.setAttribute('aria-label', `Show ${state.rightName}`);
    dot2.onclick = () => setCarouselIndex(1);
    indicators.appendChild(dot2);
    
    nav.appendChild(indicators);
    
    // Next button (right arrow)
    const nextBtn = document.createElement('button');
    nextBtn.className = 'lv2-carousel-arrow lv2-carousel-next';
    nextBtn.setAttribute('aria-label', 'Show next nominee');
    nextBtn.innerHTML = '▶'; // Right triangle
    nextBtn.onclick = () => navigateCarousel('next');
    nav.appendChild(nextBtn);
    
    return nav;
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
  
  // Set carousel to specific index
  function setCarouselIndex(index) {
    if (!state.useCarousel) return;
    state.carouselIndex = index;
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
      
      // Store reference to CTA dock
      state.ctaBar = { ctaDock };
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
    
    // Store reference
    state.ctaBar = { carouselCTA };
    
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

  // V2.1: Show subtle top-center turn tag
  function showTurnTag() {
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

  // V2.1: Hide turn tag
  function hideTurnTag() {
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
    
    // Carousel mode: arrow keys for navigation, Enter to vote
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
        const { carouselCTA } = state.ctaBar;
        const btn = carouselCTA?.querySelector('.lv2-carousel-btn');
        if (btn && !btn.disabled) {
          btn.click();
          e.preventDefault();
        }
        return;
      }
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
   * @returns {boolean}
   */
  function supportsInlineCard() {
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

  // Public API exposed on window.lv2
  const lv2 = {
    init: init,
    pushVote: pushVote,
    finish: finish,
    cleanup: cleanup,
    createCtaBar: createCtaBar,
    updateCtaBar: updateCtaBar,
    setTurn: setTurn,
    showTurnIndicator: showTurnIndicator,
    hideTurnIndicator: hideTurnIndicator,
    beginResultCardPhase: beginResultCardPhase,
    endResultCardPhase: endResultCardPhase,
    showEvicteeFinal: showEvicteeFinal,
    supportsInlineCard: supportsInlineCard,
    showInlineCard: showInlineCard,
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
