// MODULE: houseguest-profile.js
// Full-screen houseguest profile modal with Basic Info and Game Info tabs
// Used by LiveVoteFullscreen to show detailed player information

(function(global) {
  'use strict';

  /**
   * Show full-screen houseguest profile modal
   * @param {number} playerId - Player ID
   * @param {Object} options - Configuration
   * @param {Function} options.pauseTimerCallback - Function to call to pause vote timer
   * @param {Function} options.resumeTimerCallback - Function to call to resume vote timer
   * @returns {Promise<void>} Resolves when modal is closed
   */
  function showHouseguestProfile(playerId, options = {}) {
    return new Promise((resolve) => {
      // Get player data
      const player = global.getP ? global.getP(playerId) : null;
      if (!player) {
        console.warn('[houseguest-profile] Player not found:', playerId);
        resolve();
        return;
      }

      // Pause timer if callback provided
      if (typeof options.pauseTimerCallback === 'function') {
        options.pauseTimerCallback();
      } else if (global.LiveVoteFullscreen?.pauseVoteTimer) {
        global.LiveVoteFullscreen.pauseVoteTimer();
      }

      // Remove any existing profile modal
      const existing = document.querySelector('.houseguest-profile-modal');
      if (existing) existing.remove();

      // Create modal structure
      const modal = document.createElement('div');
      modal.className = 'houseguest-profile-modal';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-label', `Profile: ${player.name}`);

      // Backdrop
      const backdrop = document.createElement('div');
      backdrop.className = 'hg-profile-backdrop';
      modal.appendChild(backdrop);

      // Modal content
      const content = document.createElement('div');
      content.className = 'hg-profile-content';

      // Header
      const header = document.createElement('div');
      header.className = 'hg-profile-header';

      const title = document.createElement('h2');
      title.className = 'hg-profile-title';
      title.textContent = player.name;
      header.appendChild(title);

      const closeBtn = document.createElement('button');
      closeBtn.className = 'hg-profile-close';
      closeBtn.setAttribute('aria-label', 'Close profile');
      closeBtn.innerHTML = '×';
      closeBtn.onclick = closeModal;
      header.appendChild(closeBtn);

      content.appendChild(header);

      // Tab bar
      const tabBar = document.createElement('div');
      tabBar.className = 'hg-profile-tabs';
      tabBar.setAttribute('role', 'tablist');

      const basicTab = document.createElement('button');
      basicTab.className = 'hg-profile-tab active';
      basicTab.setAttribute('role', 'tab');
      basicTab.setAttribute('aria-selected', 'true');
      basicTab.setAttribute('aria-controls', 'basic-info-panel');
      basicTab.textContent = 'Basic Info';
      basicTab.onclick = () => switchTab('basic');

      const gameTab = document.createElement('button');
      gameTab.className = 'hg-profile-tab';
      gameTab.setAttribute('role', 'tab');
      gameTab.setAttribute('aria-selected', 'false');
      gameTab.setAttribute('aria-controls', 'game-info-panel');
      gameTab.textContent = 'Game Info';
      gameTab.onclick = () => switchTab('game');

      tabBar.appendChild(basicTab);
      tabBar.appendChild(gameTab);
      content.appendChild(tabBar);

      // Tab panels
      const panels = document.createElement('div');
      panels.className = 'hg-profile-panels';

      // Basic Info panel
      const basicPanel = document.createElement('div');
      basicPanel.className = 'hg-profile-panel active';
      basicPanel.id = 'basic-info-panel';
      basicPanel.setAttribute('role', 'tabpanel');
      basicPanel.setAttribute('aria-labelledby', 'basic-tab');
      basicPanel.innerHTML = buildBasicInfoHTML(player);
      panels.appendChild(basicPanel);

      // Game Info panel
      const gamePanel = document.createElement('div');
      gamePanel.className = 'hg-profile-panel';
      gamePanel.id = 'game-info-panel';
      gamePanel.setAttribute('role', 'tabpanel');
      gamePanel.setAttribute('aria-labelledby', 'game-tab');
      gamePanel.setAttribute('aria-hidden', 'true');
      gamePanel.innerHTML = buildGameInfoHTML(player);
      panels.appendChild(gamePanel);

      content.appendChild(panels);
      modal.appendChild(content);

      // Tab switching logic
      function switchTab(tabName) {
        if (tabName === 'basic') {
          basicTab.classList.add('active');
          gameTab.classList.remove('active');
          basicTab.setAttribute('aria-selected', 'true');
          gameTab.setAttribute('aria-selected', 'false');
          basicPanel.classList.add('active');
          gamePanel.classList.remove('active');
          basicPanel.removeAttribute('aria-hidden');
          gamePanel.setAttribute('aria-hidden', 'true');
        } else {
          gameTab.classList.add('active');
          basicTab.classList.remove('active');
          gameTab.setAttribute('aria-selected', 'true');
          basicTab.setAttribute('aria-selected', 'false');
          gamePanel.classList.add('active');
          basicPanel.classList.remove('active');
          gamePanel.removeAttribute('aria-hidden');
          basicPanel.setAttribute('aria-hidden', 'true');
        }
      }

      // Close modal function
      function closeModal() {
        modal.classList.add('closing');
        
        // Resume timer if callback provided
        if (typeof options.resumeTimerCallback === 'function') {
          options.resumeTimerCallback();
        } else if (global.LiveVoteFullscreen?.resumeVoteTimer) {
          global.LiveVoteFullscreen.resumeVoteTimer();
        }

        setTimeout(() => {
          if (modal.parentNode) {
            modal.parentNode.removeChild(modal);
          }
          resolve();
        }, 200);
      }

      // Keyboard handling
      modal.onkeydown = (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          closeModal();
        }
        // Tab key trapping (basic focus management)
        if (e.key === 'Tab') {
          const focusableElements = modal.querySelectorAll(
            'button:not([disabled]), [tabindex]:not([tabindex="-1"])'
          );
          const first = focusableElements[0];
          const last = focusableElements[focusableElements.length - 1];
          
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      };

      // Close on backdrop click
      backdrop.onclick = closeModal;

      // Append to body
      document.body.appendChild(modal);

      // Focus first focusable element
      setTimeout(() => {
        const firstFocusable = modal.querySelector('button:not([disabled])');
        if (firstFocusable) firstFocusable.focus();
      }, 100);
    });
  }

  /**
   * Build Basic Info HTML
   * @param {Object} player - Player object from getP()
   * @returns {string} HTML string
   */
  function buildBasicInfoHTML(player) {
    // Get avatar
    const resolveAvatar = global.resolveAvatar || (global.Game && global.Game.resolveAvatar);
    let avatarSrc = resolveAvatar ? resolveAvatar(player) : (player.avatar || player.img || player.photo);
    if (!avatarSrc) {
      avatarSrc = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(player.name);
    }

    // Build HTML
    let html = '<div class="hg-profile-basic">';
    
    // Avatar
    html += `<div class="hg-profile-avatar-container">
      <img src="${avatarSrc}" alt="${player.name}" class="hg-profile-avatar" />
    </div>`;

    // Name
    html += `<h3 class="hg-profile-name">${player.name}</h3>`;

    // Bio (if available)
    if (player.bio) {
      html += `<div class="hg-profile-bio">${player.bio}</div>`;
    }

    // Additional fields from player object
    html += '<div class="hg-profile-fields">';
    
    if (player.age !== undefined) {
      html += `<div class="hg-profile-field"><span class="field-label">Age:</span> ${player.age}</div>`;
    }
    
    if (player.location) {
      html += `<div class="hg-profile-field"><span class="field-label">Location:</span> ${player.location}</div>`;
    }
    
    if (player.occupation) {
      html += `<div class="hg-profile-field"><span class="field-label">Occupation:</span> ${player.occupation}</div>`;
    }
    
    if (player.trait) {
      html += `<div class="hg-profile-field"><span class="field-label">Trait:</span> ${player.trait}</div>`;
    }
    
    if (player.motto) {
      html += `<div class="hg-profile-field"><span class="field-label">Motto:</span> "${player.motto}"</div>`;
    }

    html += '</div>'; // .hg-profile-fields
    html += '</div>'; // .hg-profile-basic

    return html;
  }

  /**
   * Build Game Info HTML (week-by-week archive)
   * @param {Object} player - Player object from getP()
   * @returns {string} HTML string
   */
  function buildGameInfoHTML(player) {
    // Try to find history from multiple sources (in priority order)
    let history = null;
    
    // 1. player.history or player.archive
    if (player.history && Array.isArray(player.history) && player.history.length > 0) {
      history = player.history;
    } else if (player.archive && Array.isArray(player.archive) && player.archive.length > 0) {
      history = player.archive;
    }
    
    // 2. global.playerHistory[playerId]
    if (!history && global.playerHistory && global.playerHistory[player.id]) {
      history = global.playerHistory[player.id];
    }
    
    // 3. global.game.playerHistory?.[playerId]
    if (!history && global.game?.playerHistory && global.game.playerHistory[player.id]) {
      history = global.game.playerHistory[player.id];
    }
    
    // 4. global.GameHistory?.[playerId]
    if (!history && global.GameHistory && global.GameHistory[player.id]) {
      history = global.GameHistory[player.id];
    }

    let html = '<div class="hg-profile-game">';

    if (!history || !Array.isArray(history) || history.length === 0) {
      html += `<div class="hg-profile-no-data">
        <p>No game archive available for this houseguest.</p>
        <p class="note">Game history is tracked week-by-week and will appear here as the season progresses.</p>
      </div>`;
    } else {
      html += '<div class="hg-profile-history">';
      html += '<h4 class="history-title">Week-by-Week Performance</h4>';
      
      history.forEach((entry, index) => {
        const weekNum = entry.week || (index + 1);
        html += `<div class="history-entry">
          <div class="history-week">Week ${weekNum}</div>
          <div class="history-events">`;
        
        // Parse entry events/details
        if (typeof entry === 'string') {
          html += `<div class="history-event">${entry}</div>`;
        } else if (entry.events && Array.isArray(entry.events)) {
          entry.events.forEach(event => {
            html += `<div class="history-event">${event}</div>`;
          });
        } else if (entry.summary) {
          html += `<div class="history-event">${entry.summary}</div>`;
        } else if (entry.detail) {
          html += `<div class="history-event">${entry.detail}</div>`;
        } else {
          // Try to build a summary from entry properties
          const parts = [];
          if (entry.hoh) parts.push('Won HOH');
          if (entry.pov) parts.push('Won POV');
          if (entry.nominated) parts.push('Nominated');
          if (entry.vetoed) parts.push('Saved with Veto');
          if (entry.evicted) parts.push('Evicted');
          if (parts.length > 0) {
            html += `<div class="history-event">${parts.join(', ')}</div>`;
          } else {
            html += `<div class="history-event">No events recorded</div>`;
          }
        }
        
        html += `</div></div>`; // .history-events, .history-entry
      });
      
      html += '</div>'; // .hg-profile-history
    }

    html += '</div>'; // .hg-profile-game

    return html;
  }

  // Export to global
  global.showHouseguestProfile = showHouseguestProfile;

  // Export as module object
  global.HouseguestProfile = {
    show: showHouseguestProfile
  };

  console.info('[houseguest-profile] Module initialized');

})(window);
