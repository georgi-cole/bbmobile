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
    container: null
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

  // Render the modern panel inside #panel
  function renderPanel() {
    const panel = document.querySelector('#panel');
    if (!panel) {
      console.warn('[lv2] #panel element not found');
      return;
    }

    // Create container
    const container = document.createElement('div');
    container.className = 'lv2-panel';
    container.setAttribute('role', 'region');
    container.setAttribute('aria-label', 'Live Vote');

    // Header
    const header = document.createElement('div');
    header.className = 'lv2-header';
    header.innerHTML = '<h3>Live Vote</h3>';
    container.appendChild(header);

    // Versus layout container
    const versus = document.createElement('div');
    versus.className = 'lv2-versus';

    // Left contestant
    const leftSide = createContestant('left', state.leftName, state.leftId);
    versus.appendChild(leftSide);

    // Central meter
    const meter = createMeter();
    versus.appendChild(meter);

    // Right contestant
    const rightSide = createContestant('right', state.rightName, state.rightId);
    versus.appendChild(rightSide);

    container.appendChild(versus);

    // Reveal area for flip cards
    const reveal = document.createElement('div');
    reveal.className = 'lv2-reveal';
    reveal.setAttribute('role', 'log');
    reveal.setAttribute('aria-live', 'polite');
    reveal.setAttribute('aria-atomic', 'false');
    container.appendChild(reveal);

    // Status text area
    const status = document.createElement('div');
    status.className = 'lv2-status tiny muted';
    status.textContent = 'Waiting for votes...';
    container.appendChild(status);

    state.container = container;
    
    // Clear panel and add new UI
    const existingLv2 = panel.querySelector('.lv2-panel');
    if (existingLv2) existingLv2.remove();
    
    // Append at the beginning of panel
    panel.insertBefore(container, panel.firstChild);
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

  // Create central meter
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

  // Reveal a vote card with flip animation
  async function revealVoteCard(vote) {
    const reveal = state.container?.querySelector('.lv2-reveal');
    if (!reveal) return;

    // Create card
    const card = document.createElement('div');
    card.className = 'lv2-card';
    card.setAttribute('role', 'status');
    card.setAttribute('aria-live', 'polite');

    const inner = document.createElement('div');
    inner.className = 'lv2-card-inner';

    // Front (hidden)
    const front = document.createElement('div');
    front.className = 'lv2-face front';
    front.textContent = '?';
    inner.appendChild(front);

    // Back (revealed)
    const back = document.createElement('div');
    back.className = 'lv2-face back';
    back.innerHTML = `<div class="voter-name">${vote.voterName}</div><div class="vote-arrow">→ ${vote.pick === 'left' ? state.leftName : state.rightName}</div>`;
    inner.appendChild(back);

    card.appendChild(inner);
    reveal.appendChild(card);

    // Trigger flip animation
    if (!reducedMotion) {
      await sleep(50); // Small delay for DOM to settle
      card.classList.add('revealed');
      await sleep(state.cardHoldMs);

      // Fly to target side
      const targetSide = vote.pick;
      const targetEl = state.container?.querySelector(`.lv2-contestant.${targetSide}`);
      
      if (targetEl) {
        const cardRect = card.getBoundingClientRect();
        const targetRect = targetEl.getBoundingClientRect();
        const deltaX = targetRect.left - cardRect.left + (targetRect.width / 2) - (cardRect.width / 2);
        const deltaY = targetRect.top - cardRect.top - 20;

        card.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(0.3)`;
        card.style.opacity = '0';
        await sleep(600); // Travel animation duration
      }

      // Remove card after animation
      card.remove();
    } else {
      // Reduced motion: just fade in and show
      card.classList.add('revealed');
      card.style.opacity = '1';
      await sleep(state.cardHoldMs);
      card.style.opacity = '0';
      await sleep(300);
      card.remove();
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

  // Animate count with odometer effect
  function animateCount(element, targetValue, name) {
    const currentValue = parseInt(element.dataset.count || '0', 10);
    if (currentValue === targetValue) return;

    element.dataset.count = String(targetValue);
    
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

  // Helper: sleep
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Easing function
  function easeOutQuad(t) {
    return t * (2 - t);
  }

  // Public API exposed on window.lv2
  const lv2 = {
    init: init,
    pushVote: pushVote,
    finish: finish,
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
