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

    // Main content grid (left contestant | center stage | right contestant)
    const grid = document.createElement('div');
    grid.className = 'lv2-grid';

    // Left contestant with drop anchor
    const leftSide = createContestant('left', state.leftName, state.leftId);
    const leftAnchor = document.createElement('div');
    leftAnchor.className = 'lv2-drop-anchor left';
    leftSide.appendChild(leftAnchor);
    grid.appendChild(leftSide);

    // Center stage for spawning vote cards
    const stage = document.createElement('div');
    stage.className = 'lv2-stage';
    stage.setAttribute('role', 'log');
    stage.setAttribute('aria-live', 'polite');
    stage.setAttribute('aria-atomic', 'false');
    stage.setAttribute('aria-label', 'Vote announcements');
    
    // Add meter in center stage
    const meter = createMeter();
    stage.appendChild(meter);
    
    grid.appendChild(stage);

    // Right contestant with drop anchor
    const rightSide = createContestant('right', state.rightName, state.rightId);
    const rightAnchor = document.createElement('div');
    rightAnchor.className = 'lv2-drop-anchor right';
    rightSide.appendChild(rightAnchor);
    grid.appendChild(rightSide);

    container.appendChild(grid);

    // Status text area
    const status = document.createElement('div');
    status.className = 'lv2-status tiny muted';
    status.textContent = 'Waiting for votes...';
    container.appendChild(status);

    // CTA footer row (reserved for buttons, never overlaps avatars)
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

    // Avatar
    const avatar = document.createElement('img');
    avatar.className = 'lv2-avatar';
    avatar.src = getAvatarUrl(playerId);
    avatar.alt = name;
    avatar.loading = 'lazy';
    contestant.appendChild(avatar);

    // Name
    const nameEl = document.createElement('div');
    nameEl.className = 'lv2-name';
    nameEl.textContent = name;
    contestant.appendChild(nameEl);

    // Count
    const count = document.createElement('div');
    count.className = 'lv2-count';
    count.dataset.count = '0';
    count.textContent = '0';
    count.setAttribute('aria-label', `${name}: 0 votes`);
    contestant.appendChild(count);

    return contestant;
  }

  // Create central meter with V2.1 portal and SVG arcs
  function createMeter() {
    const meterContainer = document.createElement('div');
    meterContainer.className = 'lv2-meter';
    meterContainer.setAttribute('role', 'progressbar');
    meterContainer.setAttribute('aria-label', 'Vote distribution');
    meterContainer.setAttribute('aria-valuenow', '50');
    meterContainer.setAttribute('aria-valuemin', '0');
    meterContainer.setAttribute('aria-valuemax', '100');

    const leftFill = document.createElement('div');
    leftFill.className = 'lv2-fill left';
    leftFill.style.height = '0%';
    meterContainer.appendChild(leftFill);

    const rightFill = document.createElement('div');
    rightFill.className = 'lv2-fill right';
    rightFill.style.width = '0%';
    meterContainer.appendChild(rightFill);

    const glow = document.createElement('div');
    glow.className = 'lv2-meter-glow';
    meterContainer.appendChild(glow);

    // V2.1: Add portal node at center
    const portal = document.createElement('div');
    portal.className = 'lv2-portal';
    meterContainer.appendChild(portal);

    // V2.1: Add SVG arc meter overlay
    const arcContainer = document.createElement('div');
    arcContainer.className = 'lv2-arc';
    
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '200');
    svg.setAttribute('height', '200');
    svg.setAttribute('viewBox', '0 0 200 200');
    
    // Define gradients for arcs
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    
    const leftGrad = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    leftGrad.setAttribute('id', 'leftGradient');
    leftGrad.setAttribute('x1', '0%');
    leftGrad.setAttribute('y1', '0%');
    leftGrad.setAttribute('x2', '100%');
    leftGrad.setAttribute('y2', '0%');
    const leftStop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    leftStop1.setAttribute('offset', '0%');
    leftStop1.setAttribute('style', 'stop-color:#66d9ff;stop-opacity:1');
    const leftStop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    leftStop2.setAttribute('offset', '100%');
    leftStop2.setAttribute('style', 'stop-color:#83bfff;stop-opacity:1');
    leftGrad.appendChild(leftStop1);
    leftGrad.appendChild(leftStop2);
    defs.appendChild(leftGrad);
    
    const rightGrad = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    rightGrad.setAttribute('id', 'rightGradient');
    rightGrad.setAttribute('x1', '0%');
    rightGrad.setAttribute('y1', '0%');
    rightGrad.setAttribute('x2', '100%');
    rightGrad.setAttribute('y2', '0%');
    const rightStop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    rightStop1.setAttribute('offset', '0%');
    rightStop1.setAttribute('style', 'stop-color:#77d58d;stop-opacity:1');
    const rightStop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    rightStop2.setAttribute('offset', '100%');
    rightStop2.setAttribute('style', 'stop-color:#5ec97d;stop-opacity:1');
    rightGrad.appendChild(rightStop1);
    rightGrad.appendChild(rightStop2);
    defs.appendChild(rightGrad);
    
    svg.appendChild(defs);
    
    // Left arc (semicircle on left side)
    const leftArc = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    leftArc.setAttribute('id', 'leftArc');
    leftArc.setAttribute('class', 'lv2-arc-path left');
    leftArc.setAttribute('d', 'M 100,30 A 70,70 0 0,0 100,170');
    const leftLength = 220; // Approximate path length
    leftArc.setAttribute('stroke-dasharray', leftLength);
    leftArc.setAttribute('stroke-dashoffset', leftLength);
    svg.appendChild(leftArc);
    
    // Right arc (semicircle on right side)
    const rightArc = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    rightArc.setAttribute('id', 'rightArc');
    rightArc.setAttribute('class', 'lv2-arc-path right');
    rightArc.setAttribute('d', 'M 100,30 A 70,70 0 0,1 100,170');
    const rightLength = 220; // Approximate path length
    rightArc.setAttribute('stroke-dasharray', rightLength);
    rightArc.setAttribute('stroke-dashoffset', rightLength);
    svg.appendChild(rightArc);
    
    arcContainer.appendChild(svg);
    meterContainer.appendChild(arcContainer);

    return meterContainer;
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

    // Create and animate vote card
    await revealVoteCard(vote);

    // Update counts and meter
    if (vote.pick === 'left') {
      state.leftCount++;
    } else if (vote.pick === 'right') {
      state.rightCount++;
    }

    updateCounts();
    updateMeter();

    // Wait for gap before next vote
    await sleep(state.cardGapMs);

    // Process next
    processNextVote();
  }

  // Reveal a vote card with flip animation - spawn from center stage, then fly to anchor
  async function revealVoteCard(vote) {
    const stage = state.stage;
    if (!stage) return;

    // V2.1: Spawn small pip at portal center
    const pip = document.createElement('div');
    pip.className = 'lv2-pip';
    pip.setAttribute('role', 'status');
    pip.setAttribute('aria-live', 'polite');
    
    // Position pip at center of portal
    pip.style.position = 'absolute';
    pip.style.left = '50%';
    pip.style.top = '50%';
    pip.style.transform = 'translate(-50%, -50%)';
    
    stage.appendChild(pip);

    // Announce vote to screen readers
    const announcement = `${vote.voterName} voted to evict ${vote.pick === 'left' ? state.leftName : state.rightName}`;
    pip.setAttribute('aria-label', announcement);

    if (!reducedMotion) {
      await sleep(50); // Small delay for DOM to settle
      
      // Fly pip to target drop anchor
      const targetSide = vote.pick;
      const targetAnchor = state.container?.querySelector(`.lv2-drop-anchor.${targetSide}`);
      
      if (targetAnchor) {
        const pipRect = pip.getBoundingClientRect();
        const anchorRect = targetAnchor.getBoundingClientRect();
        const deltaX = anchorRect.left - pipRect.left + (anchorRect.width / 2) - (pipRect.width / 2);
        const deltaY = anchorRect.top - pipRect.top + (anchorRect.height / 2) - (pipRect.height / 2);

        // Apply fly animation
        pip.style.transform = `translate(calc(-50% + ${deltaX}px), calc(-50% + ${deltaY}px)) scale(0.3)`;
        pip.style.opacity = '0';
        pip.classList.add('fly');
        await sleep(600); // Travel animation duration
      }

      // Remove pip after animation
      pip.remove();
    } else {
      // Reduced motion: just fade in and out
      pip.style.opacity = '1';
      await sleep(state.cardHoldMs);
      pip.style.opacity = '0';
      await sleep(300);
      pip.remove();
    }
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

  // Update meter fill based on vote distribution
  function updateMeter() {
    const meter = state.container?.querySelector('.lv2-meter');
    if (!meter) return;

    const leftFill = meter.querySelector('.lv2-fill.left');
    const rightFill = meter.querySelector('.lv2-fill.right');

    const total = state.leftCount + state.rightCount;
    if (total === 0) {
      leftFill.style.width = '0%';
      rightFill.style.width = '0%';
      meter.setAttribute('aria-valuenow', '50');
      
      // Reset arcs
      const leftArc = meter.querySelector('#leftArc');
      const rightArc = meter.querySelector('#rightArc');
      if (leftArc) leftArc.setAttribute('stroke-dashoffset', '220');
      if (rightArc) rightArc.setAttribute('stroke-dashoffset', '220');
      return;
    }

    const leftPct = (state.leftCount / total) * 100;
    const rightPct = (state.rightCount / total) * 100;

    leftFill.style.width = `${leftPct}%`;
    rightFill.style.width = `${rightPct}%`;

    // Update ARIA
    const balance = Math.round(leftPct);
    meter.setAttribute('aria-valuenow', String(balance));
    meter.setAttribute('aria-label', `Vote distribution: ${state.leftName} ${leftPct.toFixed(0)}%, ${state.rightName} ${rightPct.toFixed(0)}%`);
    
    // V2.1: Update SVG arcs using strokeDashoffset
    const leftArc = meter.querySelector('#leftArc');
    const rightArc = meter.querySelector('#rightArc');
    const arcLength = 220; // Total arc length
    
    if (leftArc) {
      const leftOffset = arcLength - (arcLength * (leftPct / 100));
      leftArc.setAttribute('stroke-dashoffset', String(leftOffset));
    }
    
    if (rightArc) {
      const rightOffset = arcLength - (arcLength * (rightPct / 100));
      rightArc.setAttribute('stroke-dashoffset', String(rightOffset));
    }
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

  // Create voting CTA bar in reserved footer row (never overlaps avatars)
  function createCtaBar(options = {}) {
    const ctaRow = state.container?.querySelector('.lv2-cta-row');
    if (!ctaRow) return;

    // Clear existing buttons
    ctaRow.innerHTML = '';

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

    ctaRow.setAttribute('role', 'group');
    ctaRow.setAttribute('aria-label', 'Voting controls');

    if (isFinal4) {
      // Final 4: Single vote button (sole vote)
      const btn = document.createElement('button');
      btn.className = 'lv2-cta-btn';
      btn.textContent = `Cast Sole Vote`;
      btn.disabled = !enabled;
      btn.setAttribute('aria-label', 'Cast your sole vote');
      btn.onclick = () => {
        if (onVote) onVote(null); // Let the caller handle the UI for picking
      };
      ctaRow.appendChild(btn);
    } else if (isTieBreak) {
      // Tie-break: HOH wording
      const btnLeft = document.createElement('button');
      btnLeft.className = 'lv2-cta-btn';
      btnLeft.textContent = `Break Tie: Evict ${leftName}`;
      btnLeft.disabled = !enabled;
      btnLeft.setAttribute('aria-label', `Break tie by evicting ${leftName}`);
      btnLeft.dataset.pick = leftId;
      btnLeft.onclick = () => {
        if (onVote) onVote(leftId);
      };
      ctaRow.appendChild(btnLeft);

      const btnRight = document.createElement('button');
      btnRight.className = 'lv2-cta-btn';
      btnRight.textContent = `Break Tie: Evict ${rightName}`;
      btnRight.disabled = !enabled;
      btnRight.setAttribute('aria-label', `Break tie by evicting ${rightName}`);
      btnRight.dataset.pick = rightId;
      btnRight.onclick = () => {
        if (onVote) onVote(rightId);
      };
      ctaRow.appendChild(btnRight);
    } else {
      // Normal vote: Two buttons
      const btnLeft = document.createElement('button');
      btnLeft.className = 'lv2-cta-btn';
      btnLeft.textContent = `Evict ${leftName}`;
      btnLeft.disabled = !enabled;
      btnLeft.setAttribute('aria-label', `Vote to evict ${leftName}. Press 1 to select.`);
      btnLeft.dataset.pick = leftId;
      btnLeft.dataset.key = '1';
      btnLeft.onclick = () => {
        if (onVote) onVote(leftId);
      };
      ctaRow.appendChild(btnLeft);

      const btnRight = document.createElement('button');
      btnRight.className = 'lv2-cta-btn';
      btnRight.textContent = `Evict ${rightName}`;
      btnRight.disabled = !enabled;
      btnRight.setAttribute('aria-label', `Vote to evict ${rightName}. Press 2 to select.`);
      btnRight.dataset.pick = rightId;
      btnRight.dataset.key = '2';
      btnRight.onclick = () => {
        if (onVote) onVote(rightId);
      };
      ctaRow.appendChild(btnRight);
    }

    state.ctaBar = ctaRow;
    return ctaRow;
  }

  // Update CTA bar state
  function updateCtaBar(options = {}) {
    if (!state.ctaBar) return;

    const { enabled = false } = options;
    const buttons = state.ctaBar.querySelectorAll('.lv2-cta-btn');
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

  // V2.1: Highlight CTA bar when it's user's turn
  function highlightCtaBar(active) {
    if (!state.ctaBar) return;
    
    if (active) {
      state.ctaBar.classList.add('active');
      const buttons = state.ctaBar.querySelectorAll('.lv2-cta-btn:not(:disabled)');
      buttons.forEach(btn => btn.classList.add('active'));
    } else {
      state.ctaBar.classList.remove('active');
      const buttons = state.ctaBar.querySelectorAll('.lv2-cta-btn');
      buttons.forEach(btn => btn.classList.remove('active'));
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

    const buttons = state.ctaBar.querySelectorAll('.lv2-cta-btn');
    buttons.forEach(btn => {
      if (btn.dataset.key === key && !btn.disabled) {
        btn.click();
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
