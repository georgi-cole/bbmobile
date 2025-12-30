// MODULE: evictionModal.js
// Dramatic eviction results modal with animations, particles, and optional audio
// Provides EvictionModal.show() API for rich eviction reveals

(function(global) {
  'use strict';

  // State
  let currentModal = null;
  let previousFocus = null;
  const audioContext = {
    tickSound: null,
    revealSound: null,
    loaded: false
  };

  // Constants
  const PARTICLE_COUNT = 50; // Increased from 30
  const ANIMATION_DURATION = 2500; // Increased from 2000ms - longer vote count animation
  const REVEAL_DELAY = 4000; // Increased from 2200ms - longer dramatic pause (3-4 seconds)

  /**
   * Preload audio files (graceful failure if files don't exist)
   */
  function preloadAudio() {
    if (audioContext.loaded) return;

    try {
      // Load tick sound
      audioContext.tickSound = new Audio('/assets/audio/tick.wav');
      audioContext.tickSound.volume = 0.3;
      audioContext.tickSound.preload = 'auto';
    } catch (err) {
      console.debug('[EvictionModal] Tick audio not available:', err);
    }

    try {
      // Load reveal sound
      audioContext.revealSound = new Audio('/assets/audio/reveal.wav');
      audioContext.revealSound.volume = 0.5;
      audioContext.revealSound.preload = 'auto';
    } catch (err) {
      console.debug('[EvictionModal] Reveal audio not available:', err);
    }

    audioContext.loaded = true;
  }

  /**
   * Play audio safely (fails silently if not available)
   */
  function playAudio(audioElement) {
    if (!audioElement) return;
    
    try {
      audioElement.currentTime = 0;
      audioElement.play().catch(() => {
        // Audio play failed (likely no user interaction yet), ignore
      });
    } catch (err) {
      // Audio not available or error, ignore
    }
  }

  /**
   * Check if user prefers reduced motion
   */
  function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /**
   * Animate vote count from 0 to target
   */
  function animateVoteCount(element, target, duration, onTick) {
    if (prefersReducedMotion()) {
      // Skip animation, show final value immediately
      element.textContent = target;
      return;
    }

    const startTime = performance.now();
    const startValue = 0;

    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (ease-out cubic)
      const eased = 1 - Math.pow(1 - progress, 3);
      const currentValue = Math.round(startValue + (target - startValue) * eased);
      
      element.textContent = currentValue;

      // Play tick sound on value change
      if (currentValue !== startValue && onTick) {
        onTick();
      }

      if (progress < 1) {
        requestAnimationFrame(update);
      }
    }

    requestAnimationFrame(update);
  }

  /**
   * Create particle burst effect
   */
  function createParticleBurst(container) {
    if (prefersReducedMotion()) {
      return; // Skip particles if reduced motion
    }

    const particlesContainer = document.createElement('div');
    particlesContainer.className = 'eviction-particles';
    container.appendChild(particlesContainer);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const particle = document.createElement('div');
      particle.className = 'eviction-particle';
      
      // Random angle and distance
      const angle = (Math.PI * 2 * i) / PARTICLE_COUNT;
      const distance = 100 + Math.random() * 100;
      const tx = Math.cos(angle) * distance;
      const ty = Math.sin(angle) * distance;
      
      particle.style.setProperty('--tx', `${tx}px`);
      particle.style.setProperty('--ty', `${ty}px`);
      particle.style.setProperty('--delay', `${Math.random() * 200}ms`);
      
      particlesContainer.appendChild(particle);
    }

    // Remove particles after animation
    setTimeout(() => {
      if (particlesContainer.parentNode) {
        particlesContainer.parentNode.removeChild(particlesContainer);
      }
    }, 2000);
  }

  /**
   * Lock body scroll
   */
  function lockBodyScroll() {
    document.body.classList.add('eviction-modal-open');
  }

  /**
   * Unlock body scroll
   */
  function unlockBodyScroll() {
    document.body.classList.remove('eviction-modal-open');
  }

  /**
   * Show dramatic eviction modal
   * @param {Object} options - Configuration
   * @param {string} options.name - Name of evicted player
   * @param {number} options.votesFor - Votes to evict
   * @param {number} options.votesAgainst - Votes to keep
   * @param {Function} [options.onClose] - Callback when modal closes
   * @returns {Promise<void>}
   */
  function show(options = {}) {
    return new Promise((resolve) => {
      // Close existing modal if any
      if (currentModal) {
        hide();
      }

      const {
        name = 'Player',
        votesFor = 0,
        votesAgainst = 0,
        onClose = null
      } = options;

      // Determine if evicted (red) or survived (green)
      const isEvicted = votesFor > votesAgainst;
      const accentColor = isEvicted ? '#ef4444' : '#10b981';

      // Preload audio
      preloadAudio();

      // Store previous focus
      previousFocus = document.activeElement;

      // Lock body scroll
      lockBodyScroll();

      // Create modal overlay
      const overlay = document.createElement('div');
      overlay.className = 'eviction-modal-overlay';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-labelledby', 'eviction-modal-title');

      // Create backdrop
      const backdrop = document.createElement('div');
      backdrop.className = 'eviction-modal-backdrop';
      overlay.appendChild(backdrop);

      // Create card
      const card = document.createElement('div');
      card.className = 'eviction-modal-card';
      card.style.setProperty('--accent', accentColor);
      card.setAttribute('tabindex', '-1');

      // Create spotlight effect
      const spotlight = document.createElement('div');
      spotlight.className = 'eviction-modal-spotlight';
      card.appendChild(spotlight);

      // Title
      const title = document.createElement('h2');
      title.id = 'eviction-modal-title';
      title.className = 'eviction-modal-title';
      title.textContent = 'Eviction Results';
      card.appendChild(title);

      // Vote counts container
      const votesContainer = document.createElement('div');
      votesContainer.className = 'eviction-modal-votes';

      const votesForEl = document.createElement('div');
      votesForEl.className = 'eviction-modal-vote-item';
      votesForEl.innerHTML = `
        <span class="eviction-modal-vote-label">Votes to Evict</span>
        <span class="eviction-modal-vote-count votes-for">0</span>
      `;
      votesContainer.appendChild(votesForEl);

      const votesAgainstEl = document.createElement('div');
      votesAgainstEl.className = 'eviction-modal-vote-item';
      votesAgainstEl.innerHTML = `
        <span class="eviction-modal-vote-label">Votes to Keep</span>
        <span class="eviction-modal-vote-count votes-against">0</span>
      `;
      votesContainer.appendChild(votesAgainstEl);

      card.appendChild(votesContainer);

      // Evicted name (hidden initially)
      const nameReveal = document.createElement('div');
      nameReveal.className = 'eviction-modal-name-reveal';
      nameReveal.style.opacity = '0';
      
      const nameText = document.createElement('div');
      nameText.className = 'eviction-modal-name';
      nameText.textContent = name;
      nameReveal.appendChild(nameText);

      const statusText = document.createElement('div');
      statusText.className = 'eviction-modal-status';
      statusText.textContent = isEvicted ? 'You have been evicted' : 'You are safe';
      nameReveal.appendChild(statusText);

      card.appendChild(nameReveal);

      // Screen reader live region (hidden visually)
      const liveRegion = document.createElement('div');
      liveRegion.setAttribute('role', 'status');
      liveRegion.setAttribute('aria-live', 'polite');
      liveRegion.className = 'sr-only';
      card.appendChild(liveRegion);

      overlay.appendChild(card);
      document.body.appendChild(overlay);

      currentModal = overlay;

      // Focus card for keyboard access
      setTimeout(() => card.focus(), 100);

      // Animate vote counts
      let tickCount = 0;
      const votesForCount = card.querySelector('.votes-for');
      const votesAgainstCount = card.querySelector('.votes-against');

      animateVoteCount(votesForCount, votesFor, ANIMATION_DURATION, () => {
        if (tickCount % 3 === 0) { // Play sound every 3 ticks to avoid spam
          playAudio(audioContext.tickSound);
        }
        tickCount++;
      });

      setTimeout(() => {
        animateVoteCount(votesAgainstCount, votesAgainst, ANIMATION_DURATION, () => {
          if (tickCount % 3 === 0) {
            playAudio(audioContext.tickSound);
          }
          tickCount++;
        });
      }, 200);

      // Reveal name after vote animation
      setTimeout(() => {
        if (!prefersReducedMotion()) {
          nameReveal.classList.add('revealed');
          nameReveal.style.opacity = '1';
          
          // Add camera shake effect to card
          card.classList.add('shake');
          setTimeout(() => {
            card.classList.remove('shake');
          }, 500);
          
          // Play reveal sound
          playAudio(audioContext.revealSound);
          
          // Create particle burst
          createParticleBurst(card);
        } else {
          // Just fade in for reduced motion
          nameReveal.style.opacity = '1';
        }

        // Announce result to screen reader
        const announcement = `${name}, by a vote of ${votesFor} to ${votesAgainst}, you have been ${isEvicted ? 'evicted' : 'saved'}`;
        liveRegion.textContent = announcement;
      }, REVEAL_DELAY);

      // Keyboard handler
      const handleKeydown = (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          hide();
          if (onClose) onClose();
          resolve();
        }
      };
      overlay.addEventListener('keydown', handleKeydown);

      // Backdrop click to close
      backdrop.addEventListener('click', () => {
        hide();
        if (onClose) onClose();
        resolve();
      });

      // Store resolve for external hide calls
      overlay._resolvePromise = () => {
        if (onClose) onClose();
        resolve();
      };
    });
  }

  /**
   * Hide current modal
   */
  function hide() {
    if (!currentModal) return;

    const modal = currentModal;
    
    // Add leaving animation
    modal.classList.add('leaving');

    setTimeout(() => {
      if (modal.parentNode) {
        modal.parentNode.removeChild(modal);
      }
      
      // Unlock scroll
      unlockBodyScroll();

      // Restore focus
      if (previousFocus && typeof previousFocus.focus === 'function') {
        try {
          previousFocus.focus();
        } catch (e) {
          // Focus restore failed, ignore
        }
      }
      previousFocus = null;

      // Call stored resolve
      if (modal._resolvePromise) {
        modal._resolvePromise();
      }

      currentModal = null;
    }, 300);
  }

  // Public API
  const EvictionModal = {
    show,
    hide
  };

  // Export to global scope
  global.EvictionModal = EvictionModal;

  console.info('[evictionModal] Dramatic eviction modal initialized');

})(window);
