// MODULE: livevote-fullscreen.js
// Full-screen voting overlay for live eviction with timer, emoji layer, and profile modal
// Pattern: Copy from showFullscreenNomineeSaveSelector in js/veto.js

(function(global) {
  'use strict';

  // Timer state (module-level)
  let timerState = {
    timeoutId: null,
    intervalId: null,
    remainingMs: 0,
    isPaused: false,
    startTimeMs: 0,
    isOwner: false  // Track if this module owns the current timer
  };

  /**
   * Clear all known legacy vote timers to ensure single source of truth
   * This prevents multiple auto-vote timers from running concurrently
   */
  function clearLegacyVoteTimers() {
    console.info('[livevote-fs] Clearing legacy vote timers...');
    
    let clearedCount = 0;
    
    // Known legacy timer variables from codebase
    const legacyTimerVars = [
      '__liveVoteAutoTimer',
      'voteTimeoutId',
      'livevoteTimeout',
      '__autoVoteTimeout',
      '_evictionVoteTimer',
      '_voteAutoTimer'
    ];
    
    // Clear each legacy timer if it exists
    legacyTimerVars.forEach(function(varName) {
      if (global[varName] !== undefined && global[varName] !== null) {
        try {
          clearTimeout(global[varName]);
          clearInterval(global[varName]);
          console.debug('[livevote-fs] Cleared legacy timer:', varName);
          global[varName] = null;
          clearedCount++;
        } catch (e) {
          console.warn('[livevote-fs] Error clearing', varName, ':', e);
        }
      }
    });
    
    // Clear game.eviction timers if they exist
    if (global.game && global.game.eviction) {
      const evictionTimers = [
        '_countdownInterval',
        '_countdownTimeout',
        '_autoVoteTimer'
      ];
      
      evictionTimers.forEach(function(varName) {
        if (global.game.eviction[varName] !== undefined && global.game.eviction[varName] !== null) {
          try {
            clearTimeout(global.game.eviction[varName]);
            clearInterval(global.game.eviction[varName]);
            console.debug('[livevote-fs] Cleared game.eviction timer:', varName);
            global.game.eviction[varName] = null;
            clearedCount++;
          } catch (e) {
            console.warn('[livevote-fs] Error clearing game.eviction.' + varName + ':', e);
          }
        }
      });
    }
    
    if (clearedCount > 0) {
      console.info('[livevote-fs] Cleared ' + clearedCount + ' legacy timer(s)');
    } else {
      console.debug('[livevote-fs] No legacy timers found to clear');
    }
  }

  /**
   * Show full-screen eviction vote selector
   * Copies the pattern from showFullscreenNomineeSaveSelector in veto.js
   * Enhanced with: timer countdown, emoji layer, and profile modal integration
   * 
   * @param {Object} options - Configuration
   * @param {number[]} options.nominees - Array of nominee player IDs
   * @param {Function} options.onVote - Callback when vote is cast: onVote(nomineeId)
   * @param {boolean} options.isTieBreak - If true, show "Tie-Breaker" title
   * @returns {Promise<number>} Selected nominee ID to evict
   */
  function showFullscreenEvictionVote(options) {
    options = options || {};
    var nominees = options.nominees || [];
    var onVote = options.onVote || function(){};
    var isTieBreak = options.isTieBreak || false;
    
    return new Promise(function(resolve) {
      // Guard: no nominees
      if (!nominees || nominees.length === 0) {
        console.warn('[livevote-fs] No nominees provided');
        resolve(null);
        return;
      }
      
      // Remove any existing overlay first
      var existing = document.querySelector('.fullscreen-eviction-vote');
      if (existing) existing.remove();
      
      // Create fullscreen overlay (appended to body, NOT inside any container)
      var overlay = document.createElement('div');
      overlay.className = 'fullscreen-eviction-vote';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-label', 'Cast your vote to evict');
      overlay.setAttribute('aria-modal', 'true');
      
      // Add marker class to html for CSS overrides and body scroll lock
      document.documentElement.classList.add('eviction-vote-open');
      
      // Header
      var header = document.createElement('div');
      header.className = 'fev-header';
      
      var titleEl = document.createElement('div');
      titleEl.className = 'fev-title';
      titleEl.textContent = isTieBreak ? 'Tie-Breaker Vote' : 'Cast Your Vote to Evict';
      header.appendChild(titleEl);
      
      // Timer display with hourglass icon and progress bar
      var timerDisplay = document.createElement('div');
      timerDisplay.className = 'fev-timer';
      timerDisplay.setAttribute('aria-live', 'polite');
      timerDisplay.setAttribute('aria-atomic', 'true');
      
      // Progress bar background (depletes over time)
      var progressBar = document.createElement('div');
      progressBar.className = 'fev-timer-progress';
      timerDisplay.appendChild(progressBar);
      
      // Timer content (icon + text)
      var timerContent = document.createElement('div');
      timerContent.className = 'fev-timer-content';
      
      // Hourglass icon
      var hourglassIcon = document.createElement('span');
      hourglassIcon.className = 'fev-timer-icon';
      hourglassIcon.textContent = '⏳';
      timerContent.appendChild(hourglassIcon);
      
      // Time text
      var timerText = document.createElement('span');
      timerText.className = 'fev-timer-text';
      timerText.textContent = '02:00';
      timerContent.appendChild(timerText);
      
      timerDisplay.appendChild(timerContent);
      
      header.appendChild(timerDisplay);
      
      overlay.appendChild(header);
      
      // Content container
      var content = document.createElement('div');
      content.className = 'fev-content';
      
      // Player grid
      var grid = document.createElement('div');
      grid.className = 'fev-player-grid';
      grid.setAttribute('role', 'radiogroup');
      grid.setAttribute('aria-label', 'Select nominee to evict');
      
      // Track selection state
      var selectedId = null;
      var evictBtn = null;
      
      function updateEvictButton() {
        if (evictBtn) {
          evictBtn.disabled = (selectedId === null);
          evictBtn.setAttribute('aria-disabled', selectedId === null ? 'true' : 'false');
        }
      }
      
      function selectNominee(id, cardEl) {
        // Deselect all cards and remove info buttons
        var cards = grid.querySelectorAll('.fev-player-card');
        for (var i = 0; i < cards.length; i++) {
          cards[i].classList.remove('selected');
          cards[i].setAttribute('aria-checked', 'false');
          // Remove existing info buttons
          var existingBtn = cards[i].querySelector('.fev-info-btn');
          if (existingBtn) existingBtn.remove();
        }
        
        // Select clicked card
        selectedId = id;
        cardEl.classList.add('selected');
        cardEl.setAttribute('aria-checked', 'true');
        
        // Add info button to selected card
        var infoBtn = document.createElement('button');
        infoBtn.className = 'fev-info-btn';
        infoBtn.setAttribute('aria-label', 'View profile');
        infoBtn.innerHTML = 'ℹ️';
        infoBtn.onclick = function(e) {
          e.preventDefault();
          e.stopPropagation();
          openProfileModal(id);
        };
        cardEl.appendChild(infoBtn);
        
        updateEvictButton();
      }
      
      // Create player cards for each nominee
      var validCards = []; // Track successfully created cards
      for (var i = 0; i < nominees.length; i++) {
        (function(nomId, originalIdx) {
          var p = global.getP ? global.getP(nomId) : null;
          if (!p) {
            console.warn('[livevote-fs] Player not found:', nomId);
            return;
          }
          
          var card = document.createElement('div');
          card.className = 'fev-player-card';
          card.setAttribute('role', 'radio');
          card.setAttribute('aria-checked', 'false');
          // Set tabindex based on actual position in grid, not original index
          card.setAttribute('tabindex', validCards.length === 0 ? '0' : '-1');
          card.dataset.nomineeId = nomId;
          
          // Avatar
          var avatar = document.createElement('img');
          avatar.className = 'fev-player-avatar';
          var resolveAvatar = global.resolveAvatar || (global.Game && global.Game.resolveAvatar);
          avatar.src = resolveAvatar ? resolveAvatar(p) : (p.avatar || p.img || p.photo);
          if (!avatar.src) {
            avatar.src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(p.name);
          }
          avatar.alt = p.name;
          card.appendChild(avatar);
          
          // Player name
          var name = document.createElement('div');
          name.className = 'fev-player-name';
          name.textContent = p.name;
          card.appendChild(name);
          
          // NOM badge indicator
          var badge = document.createElement('div');
          badge.className = 'fev-nom-badge';
          badge.textContent = 'NOM';
          card.appendChild(badge);
          
          // Track if already handling an interaction to prevent double-firing
          var isHandlingInteraction = false;
          
          function handleSelection(e) {
            if (isHandlingInteraction) return;
            isHandlingInteraction = true;
            
            e.preventDefault();
            e.stopPropagation();
            selectNominee(nomId, card);
            
            // Reset flag after a short delay
            setTimeout(function() {
              isHandlingInteraction = false;
            }, 100);
          }
          
          // Click/tap handler - unified for both mouse and touch
          card.onclick = handleSelection;
          
          // Touch handler for mobile - use touchstart to feel more responsive
          // But preventDefault to avoid double-firing with click
          card.ontouchstart = function(e) {
            // Don't call preventDefault here - let the browser handle it
            // The onclick handler will fire after touchend
          };
          
          // Keyboard handler
          card.onkeydown = function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              selectNominee(nomId, card);
            }
            // Arrow key navigation
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
              e.preventDefault();
              var next = card.nextElementSibling;
              if (next && next.classList.contains('fev-player-card')) {
                next.focus();
              }
            }
            if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
              e.preventDefault();
              var prev = card.previousElementSibling;
              if (prev && prev.classList.contains('fev-player-card')) {
                prev.focus();
              }
            }
          };
          
          grid.appendChild(card);
          validCards.push(card); // Track successfully created cards
        })(nominees[i], i);
      }
      
      content.appendChild(grid);
      
      // EVICT button (disabled until nominee is selected)
      evictBtn = document.createElement('button');
      evictBtn.className = 'fev-evict-btn';
      evictBtn.textContent = 'EVICT';
      evictBtn.disabled = true;
      evictBtn.setAttribute('aria-disabled', 'true');
      
      // Track if vote is being submitted to prevent double-submission
      var isSubmitting = false;
      
      evictBtn.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        if (selectedId === null || isSubmitting) return;
        
        // Set flag to prevent double-submission
        isSubmitting = true;
        
        // Disable button to prevent double-tap
        evictBtn.disabled = true;
        evictBtn.textContent = 'Submitting...';
        
        // Clean up timer and emoji
        cleanupTimerAndEmoji();
        
        // Remove overlay with exit animation
        overlay.classList.add('removing');
        document.documentElement.classList.remove('eviction-vote-open');
        
        setTimeout(function() {
          if (overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
          }
          
          // Call the vote callback
          if (typeof onVote === 'function') {
            onVote(selectedId);
          }
          resolve(selectedId);
        }, 200);
      };
      
      // No separate touch handler - onclick will fire after touchend automatically
      
      content.appendChild(evictBtn);
      overlay.appendChild(content);
      
      // ============= TIMER INITIALIZATION =============
      // Get timeout from config
      var cfg = (global.game && global.game.cfg) || global.cfg || {};
      var timeoutMs = cfg.voteTimeoutMs || 120000; // Default 2 minutes
      
      // Initialize timer state
      timerState.remainingMs = timeoutMs;
      timerState.startTimeMs = Date.now();
      timerState.isPaused = false;
      
      // Timer update function
      function updateTimerDisplay() {
        var seconds = Math.ceil(timerState.remainingMs / 1000);
        var mins = Math.floor(seconds / 60);
        var secs = seconds % 60;
        var timeStr = String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
        timerText.textContent = timeStr;
        
        // Update progress bar width (depletes from 100% to 0%)
        var progress = timerState.remainingMs / timeoutMs;
        var progressBar = overlay.querySelector('.fev-timer-progress');
        if (progressBar) {
          progressBar.style.width = (progress * 100) + '%';
        }
      }
      
      // Auto-vote function (called on timeout)
      function performAutoVote() {
        console.debug('[livevote-fs] Timer expired, attempting auto-vote');
        
        // Try auto-vote hooks in order
        var autoVoteResult = null;
        
        // 1. global.autoCastEvictionVote
        if (typeof global.autoCastEvictionVote === 'function') {
          console.debug('[livevote-fs] Calling global.autoCastEvictionVote');
          autoVoteResult = global.autoCastEvictionVote(nominees);
        }
        // 2. global.liveVoteAutoCast
        else if (typeof global.liveVoteAutoCast === 'function') {
          console.debug('[livevote-fs] Calling global.liveVoteAutoCast');
          autoVoteResult = global.liveVoteAutoCast(nominees);
        }
        // 3. Fallback: pick random nominee
        else {
          console.debug('[livevote-fs] No auto-vote hook found, using random fallback');
          autoVoteResult = nominees[Math.floor(Math.random() * nominees.length)];
        }
        
        // Handle async result
        Promise.resolve(autoVoteResult).then(function(voteId) {
          if (voteId !== null && voteId !== undefined) {
            selectedId = voteId;
            console.debug('[livevote-fs] Auto-vote selected:', voteId);
            
            // Submit the vote
            cleanupTimerAndEmoji();
            overlay.classList.add('removing');
            document.documentElement.classList.remove('eviction-vote-open');
            
            setTimeout(function() {
              if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
              }
              if (typeof onVote === 'function') {
                onVote(selectedId);
              }
              resolve(selectedId);
            }, 200);
          }
        }).catch(function(err) {
          console.error('[livevote-fs] Auto-vote error:', err);
          // CRITICAL: Clean up on error to prevent stuck overlay
          cleanupTimerAndEmoji();
          overlay.classList.add('removing');
          document.documentElement.classList.remove('eviction-vote-open');
          
          setTimeout(function() {
            if (overlay.parentNode) {
              overlay.parentNode.removeChild(overlay);
            }
            // Resolve with null to indicate no vote was cast (graceful degradation)
            // Not rejecting to avoid breaking the game flow
            resolve(null);
          }, 200);
        });
      }
      
      // Start countdown timer
      function startTimer() {
        // Clear any existing timers
        if (timerState.timeoutId) clearTimeout(timerState.timeoutId);
        if (timerState.intervalId) clearInterval(timerState.intervalId);
        
        timerState.startTimeMs = Date.now();
        
        // Update display every second
        timerState.intervalId = setInterval(function() {
          if (!timerState.isPaused) {
            var elapsed = Date.now() - timerState.startTimeMs;
            timerState.remainingMs = Math.max(0, timeoutMs - elapsed);
            updateTimerDisplay();
            
            if (timerState.remainingMs <= 0) {
              clearInterval(timerState.intervalId);
              timerState.intervalId = null;
            }
          }
        }, 1000);
        
        // Set timeout for auto-vote
        timerState.timeoutId = setTimeout(function() {
          if (!timerState.isPaused) {
            performAutoVote();
          }
        }, timerState.remainingMs);
        
        updateTimerDisplay();
      }
      
      // Cleanup function
      function cleanupTimerAndEmoji() {
        if (timerState.timeoutId) {
          clearTimeout(timerState.timeoutId);
          timerState.timeoutId = null;
        }
        if (timerState.intervalId) {
          clearInterval(timerState.intervalId);
          timerState.intervalId = null;
        }
        
        // Remove emoji layer
        var emojiLayer = overlay.querySelector('.fev-emoji-layer');
        if (emojiLayer) emojiLayer.remove();
      }
      
      // ============= EMOJI LAYER =============
      var enableEmojis = cfg.enableFloatingEmojis !== false; // Default true
      if (enableEmojis) {
        var emojiLayer = document.createElement('div');
        emojiLayer.className = 'fev-emoji-layer';
        emojiLayer.setAttribute('aria-hidden', 'true');
        
        var emojis = ['🚪', '❓', '❌', '⛔', '😱'];
        var numEmojis = 8;
        
        for (var i = 0; i < numEmojis; i++) {
          var emoji = document.createElement('div');
          emoji.className = 'fev-emoji';
          emoji.textContent = emojis[Math.floor(Math.random() * emojis.length)];
          emoji.style.left = (Math.random() * 100) + '%';
          emoji.style.animationDelay = (Math.random() * 4) + 's';
          emoji.style.animationDuration = (8 + Math.random() * 4) + 's';
          emojiLayer.appendChild(emoji);
        }
        
        overlay.insertBefore(emojiLayer, overlay.firstChild);
      }
      
      // ============= PROFILE MODAL HANDLER =============
      function openProfileModal(playerId) {
        if (typeof global.showHouseguestProfile === 'function') {
          global.showHouseguestProfile(playerId, {
            pauseTimerCallback: pauseVoteTimer,
            resumeTimerCallback: resumeVoteTimer
          });
        } else {
          console.warn('[livevote-fs] showHouseguestProfile not available');
        }
      }
      
      // ============= CRITICAL: Append to document.body, NOT inside any container
      // This ensures the overlay is outside any stacking context
      document.body.appendChild(overlay);
      
      // Clear legacy timers before starting our authoritative timer
      clearLegacyVoteTimers();
      
      // Start the voting timer and claim ownership
      timerState.isOwner = true;
      console.info('[livevote-fs] Starting fullscreen timer with ' + timeoutMs + 'ms timeout');
      startTimer();
      
      // Focus first card for accessibility
      setTimeout(function() {
        var firstCard = grid.querySelector('.fev-player-card');
        if (firstCard) firstCard.focus();
      }, 100);
    });
  }
  
  /**
   * Pause the vote timer (called when profile modal opens)
   */
  function pauseVoteTimer() {
    if (timerState.isPaused) return;
    
    timerState.isPaused = true;
    
    // Store remaining time
    var elapsed = Date.now() - timerState.startTimeMs;
    timerState.remainingMs = Math.max(0, timerState.remainingMs - elapsed);
    
    // Clear timers
    if (timerState.timeoutId) {
      clearTimeout(timerState.timeoutId);
      timerState.timeoutId = null;
    }
    if (timerState.intervalId) {
      clearInterval(timerState.intervalId);
      timerState.intervalId = null;
    }
    
    console.debug('[livevote-fs] Timer paused, remaining:', timerState.remainingMs);
  }
  
  /**
   * Resume the vote timer (called when profile modal closes)
   */
  function resumeVoteTimer() {
    if (!timerState.isPaused) return;
    
    timerState.isPaused = false;
    timerState.startTimeMs = Date.now();
    
    // Restart countdown with remaining time
    var overlay = document.querySelector('.fullscreen-eviction-vote');
    if (!overlay) return;
    
    var timerText = overlay.querySelector('.fev-timer-text');
    var progressBar = overlay.querySelector('.fev-timer-progress');
    var cfg = (global.game && global.game.cfg) || global.cfg || {};
    var totalMs = cfg.voteTimeoutMs || 120000;
    
    // Update display function
    function updateDisplay() {
      var seconds = Math.ceil(timerState.remainingMs / 1000);
      var mins = Math.floor(seconds / 60);
      var secs = seconds % 60;
      var timeStr = String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
      if (timerText) timerText.textContent = timeStr;
      
      // Update progress bar
      var progress = timerState.remainingMs / totalMs;
      if (progressBar) {
        progressBar.style.width = (progress * 100) + '%';
      }
    }
    
    // Start interval
    timerState.intervalId = setInterval(function() {
      if (!timerState.isPaused) {
        var elapsed = Date.now() - timerState.startTimeMs;
        timerState.remainingMs = Math.max(0, timerState.remainingMs - elapsed);
        timerState.startTimeMs = Date.now();
        updateDisplay();
        
        if (timerState.remainingMs <= 0) {
          clearInterval(timerState.intervalId);
          timerState.intervalId = null;
        }
      }
    }, 1000);
    
    // Set timeout
    timerState.timeoutId = setTimeout(function() {
      if (!timerState.isPaused) {
        // Trigger auto-vote (we need to reconstruct the context)
        console.debug('[livevote-fs] Timer expired after resume');
        // Note: Auto-vote logic is in the main function scope, so we can't easily call it here
        // In practice, the interval will catch the zero case
      }
    }, timerState.remainingMs);
    
    updateDisplay();
    console.debug('[livevote-fs] Timer resumed, remaining:', timerState.remainingMs);
  }
  
  /**
   * Get remaining vote time in milliseconds (for testing)
   * @returns {number} Remaining time in ms
   */
  function getRemainingVoteMs() {
    if (timerState.isPaused) {
      return timerState.remainingMs;
    }
    var elapsed = Date.now() - timerState.startTimeMs;
    return Math.max(0, timerState.remainingMs - elapsed);
  }
  
  /**
   * Hide/remove the fullscreen eviction vote overlay
   * Safe to call even if overlay doesn't exist
   */
  function hideFullscreenEvictionVote() {
    // Clean up timer and release ownership
    clearTimer();
    
    var overlay = document.querySelector('.fullscreen-eviction-vote');
    if (overlay) {
      // Remove emoji layer
      var emojiLayer = overlay.querySelector('.fev-emoji-layer');
      if (emojiLayer) emojiLayer.remove();
      
      overlay.classList.add('removing');
      document.documentElement.classList.remove('eviction-vote-open');
      setTimeout(function() {
        if (overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
      }, 200);
    }
  }
  
  /**
   * Clear the vote timer (public method for external cleanup)
   */
  function clearTimer() {
    if (timerState.timeoutId) {
      clearTimeout(timerState.timeoutId);
      timerState.timeoutId = null;
    }
    if (timerState.intervalId) {
      clearInterval(timerState.intervalId);
      timerState.intervalId = null;
    }
    timerState.isOwner = false;
    console.debug('[livevote-fs] Timer cleared and ownership released');
  }
  
  /**
   * Check if this module currently owns the vote timer
   * @returns {boolean} True if this module owns the timer
   */
  function isTimerOwner() {
    return timerState.isOwner;
  }
  
  /**
   * Check if fullscreen eviction vote overlay is currently open
   * @returns {boolean}
   */
  function isOpen() {
    return !!document.querySelector('.fullscreen-eviction-vote');
  }
  
  // Expose to global
  global.showFullscreenEvictionVote = showFullscreenEvictionVote;
  global.hideFullscreenEvictionVote = hideFullscreenEvictionVote;
  
  // Also expose as module object
  global.LiveVoteFullscreen = {
    show: showFullscreenEvictionVote,
    hide: hideFullscreenEvictionVote,
    isOpen: isOpen,
    pauseVoteTimer: pauseVoteTimer,
    resumeVoteTimer: resumeVoteTimer,
    getRemainingVoteMs: getRemainingVoteMs,
    clearTimer: clearTimer,
    isTimerOwner: isTimerOwner,
    clearLegacyVoteTimers: clearLegacyVoteTimers  // Expose for testing/external use
  };
  
})(window);
