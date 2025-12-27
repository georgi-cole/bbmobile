// MODULE: livevote-fullscreen.js
// Full-screen voting overlay for live eviction
// Pattern: Copy from showFullscreenNomineeSaveSelector in js/veto.js

(function(global) {
  'use strict';

  /**
   * Show full-screen eviction vote selector
   * Copies the pattern from showFullscreenNomineeSaveSelector in veto.js
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
        // Deselect all cards
        var cards = grid.querySelectorAll('.fev-player-card');
        for (var i = 0; i < cards.length; i++) {
          cards[i].classList.remove('selected');
          cards[i].setAttribute('aria-checked', 'false');
        }
        
        // Select clicked card
        selectedId = id;
        cardEl.classList.add('selected');
        cardEl.setAttribute('aria-checked', 'true');
        
        updateEvictButton();
      }
      
      // Create player cards for each nominee
      for (var i = 0; i < nominees.length; i++) {
        (function(nomId, idx) {
          var p = global.getP ? global.getP(nomId) : null;
          if (!p) return;
          
          var card = document.createElement('div');
          card.className = 'fev-player-card';
          card.setAttribute('role', 'radio');
          card.setAttribute('aria-checked', 'false');
          card.setAttribute('tabindex', idx === 0 ? '0' : '-1');
          card.dataset.nomineeId = nomId;
          
          // Avatar
          var avatar = document.createElement('img');
          avatar.className = 'fev-player-avatar';
          var resolveAvatar = (global.Game || global).resolveAvatar;
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
          
          // Click/tap handler
          card.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            selectNominee(nomId, card);
          };
          
          // Touch handler for mobile
          card.ontouchend = function(e) {
            e.preventDefault();
            e.stopPropagation();
            selectNominee(nomId, card);
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
        })(nominees[i], i);
      }
      
      content.appendChild(grid);
      
      // EVICT button (disabled until nominee is selected)
      evictBtn = document.createElement('button');
      evictBtn.className = 'fev-evict-btn';
      evictBtn.textContent = 'EVICT';
      evictBtn.disabled = true;
      evictBtn.setAttribute('aria-disabled', 'true');
      
      evictBtn.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        if (selectedId === null) return;
        
        // Disable button to prevent double-tap
        evictBtn.disabled = true;
        evictBtn.textContent = 'Submitting...';
        
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
      
      // Touch handler for EVICT button
      evictBtn.ontouchend = function(e) {
        if (selectedId === null) return;
        e.preventDefault();
        evictBtn.onclick(e);
      };
      
      content.appendChild(evictBtn);
      overlay.appendChild(content);
      
      // CRITICAL: Append to document.body, NOT inside any container
      // This ensures the overlay is outside any stacking context
      document.body.appendChild(overlay);
      
      // Focus first card for accessibility
      setTimeout(function() {
        var firstCard = grid.querySelector('.fev-player-card');
        if (firstCard) firstCard.focus();
      }, 100);
    });
  }
  
  /**
   * Hide/remove the fullscreen eviction vote overlay
   * Safe to call even if overlay doesn't exist
   */
  function hideFullscreenEvictionVote() {
    var overlay = document.querySelector('.fullscreen-eviction-vote');
    if (overlay) {
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
    isOpen: isOpen
  };
  
})(window);
