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
    ctaBar: null,
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

  // Render the modern panel inside #tv
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

    // Create fit wrapper for responsive scaling inside TV
    const fitWrapper = document.createElement('div');
    fitWrapper.className = 'lv2-fit';
    fitWrapper.setAttribute('role', 'region');
    fitWrapper.setAttribute('aria-label', 'Live Vote');

    // Create container
    const container = document.createElement('div');
    container.className = 'lv2-panel';

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

    fitWrapper.appendChild(container);
    state.container = container;
    
    // Clear any existing lv2 UI
    const existingLv2 = tv.querySelector('.lv2-fit');
    if (existingLv2) existingLv2.remove();
    
    // Append to TV
    tv.appendChild(fitWrapper);
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

  // Create voting CTA bar inside TV
  function createCtaBar(options = {}) {
    const tv = document.querySelector('#tv');
    if (!tv) return;

    // Remove existing CTA bar
    const existingCta = tv.querySelector('.lv2-cta');
    if (existingCta) existingCta.remove();

    const ctaBar = document.createElement('div');
    ctaBar.className = 'lv2-cta';
    ctaBar.setAttribute('role', 'group');
    ctaBar.setAttribute('aria-label', 'Voting controls');

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

    if (isFinal4) {
      // Final 4: Single vote button (sole vote)
      const btn = document.createElement('button');
      btn.textContent = `Cast Sole Vote`;
      btn.disabled = !enabled;
      btn.setAttribute('aria-label', 'Cast your sole vote');
      btn.onclick = () => {
        if (onVote) onVote(null); // Let the caller handle the UI for picking
      };
      ctaBar.appendChild(btn);
    } else if (isTieBreak) {
      // Tie-break: HOH wording
      const btnLeft = document.createElement('button');
      btnLeft.textContent = `Break Tie: Evict ${leftName}`;
      btnLeft.disabled = !enabled;
      btnLeft.setAttribute('aria-label', `Break tie by evicting ${leftName}`);
      btnLeft.dataset.pick = leftId;
      btnLeft.onclick = () => {
        if (onVote) onVote(leftId);
      };
      ctaBar.appendChild(btnLeft);

      const btnRight = document.createElement('button');
      btnRight.textContent = `Break Tie: Evict ${rightName}`;
      btnRight.disabled = !enabled;
      btnRight.setAttribute('aria-label', `Break tie by evicting ${rightName}`);
      btnRight.dataset.pick = rightId;
      btnRight.onclick = () => {
        if (onVote) onVote(rightId);
      };
      ctaBar.appendChild(btnRight);
    } else {
      // Normal vote: Two buttons
      const btnLeft = document.createElement('button');
      btnLeft.textContent = `Evict ${leftName}`;
      btnLeft.disabled = !enabled;
      btnLeft.setAttribute('aria-label', `Vote to evict ${leftName}`);
      btnLeft.dataset.pick = leftId;
      btnLeft.dataset.key = '1';
      btnLeft.onclick = () => {
        if (onVote) onVote(leftId);
      };
      ctaBar.appendChild(btnLeft);

      const btnRight = document.createElement('button');
      btnRight.textContent = `Evict ${rightName}`;
      btnRight.disabled = !enabled;
      btnRight.setAttribute('aria-label', `Vote to evict ${rightName}`);
      btnRight.dataset.pick = rightId;
      btnRight.dataset.key = '2';
      btnRight.onclick = () => {
        if (onVote) onVote(rightId);
      };
      ctaBar.appendChild(btnRight);
    }

    tv.appendChild(ctaBar);
    state.ctaBar = ctaBar;
    return ctaBar;
  }

  // Update CTA bar state
  function updateCtaBar(options = {}) {
    if (!state.ctaBar) return;

    const { enabled = false } = options;
    const buttons = state.ctaBar.querySelectorAll('button');
    buttons.forEach(btn => {
      btn.disabled = !enabled;
    });
  }

  // Show "Your turn" indicator
  function showTurnIndicator() {
    const tv = document.querySelector('#tv');
    if (!tv) return;

    // Remove existing indicator
    const existing = tv.querySelector('.lv2-turn-indicator');
    if (existing) existing.remove();

    const indicator = document.createElement('div');
    indicator.className = 'lv2-turn-indicator';
    indicator.textContent = 'Your Turn';
    indicator.setAttribute('role', 'status');
    indicator.setAttribute('aria-live', 'assertive');
    indicator.setAttribute('aria-label', 'It is your turn to vote');

    tv.appendChild(indicator);

    // Auto-remove after 3 seconds
    setTimeout(() => {
      indicator.remove();
    }, 3000);
  }

  // Hide "Your turn" indicator
  function hideTurnIndicator() {
    const tv = document.querySelector('#tv');
    const indicator = tv?.querySelector('.lv2-turn-indicator');
    if (indicator) indicator.remove();
  }

  // Clean up lv2 UI and restore panel visibility
  function cleanup() {
    // Remove lv2 UI from TV
    const tv = document.querySelector('#tv');
    const existingLv2 = tv?.querySelector('.lv2-fit');
    if (existingLv2) existingLv2.remove();

    // Remove CTA bar
    const existingCta = tv?.querySelector('.lv2-cta');
    if (existingCta) existingCta.remove();

    // Remove turn indicator
    const existingIndicator = tv?.querySelector('.lv2-turn-indicator');
    if (existingIndicator) existingIndicator.remove();

    // Restore panel visibility
    const panel = document.querySelector('#panel');
    if (panel) {
      panel.style.display = '';
    }

    // Reset state
    state.container = null;
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

  // Keyboard shortcuts for voting (1 and 2 keys)
  document.addEventListener('keydown', (e) => {
    if (!state.ctaBar) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
    
    const key = e.key;
    if (key !== '1' && key !== '2') return;

    const buttons = state.ctaBar.querySelectorAll('button');
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
