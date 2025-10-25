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
    isFinal4: false
  };

  // Default pacing
  const DEFAULT_HOLD_MS = 500;
  const DEFAULT_GAP_MS = 250;

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

    // Read pacing from settings if available
    const cfg = global.game?.cfg || {};
    state.cardHoldMs = config.pacing?.holdMs ?? cfg.cardHoldMs ?? DEFAULT_HOLD_MS;
    state.cardGapMs = config.pacing?.gapMs ?? cfg.cardGapMs ?? DEFAULT_GAP_MS;

    renderPanel();
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

    // Left contestant with drop anchor
    const leftSide = createContestant('left', state.leftName, state.leftId);
    grid.appendChild(leftSide);

    // Right contestant with drop anchor
    const rightSide = createContestant('right', state.rightName, state.rightId);
    grid.appendChild(rightSide);
    
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

    // Count capsule
    const count = document.createElement('div');
    count.className = 'lv2-count';
    count.dataset.count = '0';
    count.textContent = '0';
    count.setAttribute('aria-label', `${name}: 0 votes`);
    contestant.appendChild(count);

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

  // Update CTA bar state
  function updateCtaBar(options = {}) {
    if (!state.ctaBar) return;

    const { enabled = false } = options;
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

  // Keyboard shortcuts for voting (1 and 2 keys)
  document.addEventListener('keydown', (e) => {
    if (!state.ctaBar) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
    
    const key = e.key;
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
