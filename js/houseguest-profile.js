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
    // Try to get enhanced data from intro hub sources
    let enhancedData = null;
    let dataSource = 'player object';
    
    // 1. Try global.houseguestsData
    if (global.houseguestsData && global.houseguestsData[player.id]) {
      enhancedData = global.houseguestsData[player.id];
      dataSource = 'global.houseguestsData';
      console.debug('[houseguest-profile] Using data from global.houseguestsData');
    }
    
    // 2. Try querying intro hub DOM
    if (!enhancedData) {
      try {
        const introHubElement = document.querySelector('#introHub .houseguest[data-player-id="' + player.id + '"]');
        if (introHubElement) {
          enhancedData = {
            bio: introHubElement.dataset.bio || introHubElement.getAttribute('data-bio'),
            story: introHubElement.dataset.story || introHubElement.getAttribute('data-story'),
            age: introHubElement.dataset.age || introHubElement.getAttribute('data-age'),
            location: introHubElement.dataset.location || introHubElement.getAttribute('data-location'),
            occupation: introHubElement.dataset.occupation || introHubElement.getAttribute('data-occupation'),
            trait: introHubElement.dataset.trait || introHubElement.getAttribute('data-trait'),
            motto: introHubElement.dataset.motto || introHubElement.getAttribute('data-motto')
          };
          dataSource = 'intro hub DOM';
          console.debug('[houseguest-profile] Using data from intro hub DOM element');
        }
      } catch (e) {
        console.debug('[houseguest-profile] Could not query intro hub DOM:', e);
      }
    }
    
    // 3. Merge with player object (player object as fallback)
    const data = Object.assign({}, player, enhancedData || {});
    
    console.debug('[houseguest-profile] Basic Info data source:', dataSource);
    
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

    // Story (prioritized from intro hub)
    if (data.story) {
      html += `<div class="hg-profile-story">${data.story}</div>`;
    }

    // Bio (if available and different from story)
    if (data.bio && data.bio !== data.story) {
      html += `<div class="hg-profile-bio">${data.bio}</div>`;
    }

    // Additional fields from player object or intro hub
    html += '<div class="hg-profile-fields">';
    
    if (data.age !== undefined && data.age !== null) {
      html += `<div class="hg-profile-field"><span class="field-label">Age:</span> ${data.age}</div>`;
    }
    
    if (data.location) {
      html += `<div class="hg-profile-field"><span class="field-label">Location:</span> ${data.location}</div>`;
    }
    
    if (data.occupation) {
      html += `<div class="hg-profile-field"><span class="field-label">Occupation:</span> ${data.occupation}</div>`;
    }
    
    if (data.trait) {
      html += `<div class="hg-profile-field"><span class="field-label">Trait:</span> ${data.trait}</div>`;
    }
    
    if (data.motto) {
      html += `<div class="hg-profile-field"><span class="field-label">Motto:</span> "${data.motto}"</div>`;
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
        
        // Parse entry events/details with enhanced formatting
        if (typeof entry === 'string') {
          html += `<div class="history-event">• ${entry}</div>`;
        } else if (entry.events && Array.isArray(entry.events)) {
          entry.events.forEach(event => {
            html += `<div class="history-event">• ${event}</div>`;
          });
        } else if (entry.summary) {
          html += `<div class="history-event">• ${entry.summary}</div>`;
        } else if (entry.detail) {
          html += `<div class="history-event">• ${entry.detail}</div>`;
        } else {
          // Try to build a detailed summary from entry properties
          const details = [];
          
          // Competition results
          if (entry.hoh) {
            details.push('🏆 Won Head of Household competition');
          } else if (entry.hohNominee === false) {
            details.push('❌ Did not win HOH');
          }
          
          if (entry.pov) {
            details.push('⭐ Won Power of Veto competition');
          } else if (entry.povCompeted) {
            details.push('🎯 Competed in Power of Veto');
          }
          
          // Nomination status
          if (entry.nominated) {
            const nominatedBy = entry.nominatedBy ? ` by ${entry.nominatedBy}` : '';
            details.push(`📛 Nominated for eviction${nominatedBy}`);
          }
          
          if (entry.vetoed) {
            const vetoedBy = entry.vetoedBy ? ` by ${entry.vetoedBy}` : '';
            details.push(`🛡️ Saved with Power of Veto${vetoedBy}`);
          }
          
          // Social gameplay
          if (entry.alliance) {
            details.push(`🤝 ${entry.alliance}`);
          }
          
          if (entry.votes !== undefined) {
            details.push(`🗳️ Received ${entry.votes} vote${entry.votes !== 1 ? 's' : ''} to evict`);
          }
          
          // Final outcome
          if (entry.evicted) {
            details.push('❌ Evicted from the house');
          } else if (entry.safe) {
            details.push('✅ Safe this week');
          }
          
          // Additional notes
          if (entry.notes) {
            details.push(`💭 ${entry.notes}`);
          }
          
          if (details.length > 0) {
            details.forEach(detail => {
              html += `<div class="history-event">${detail}</div>`;
            });
          } else {
            html += `<div class="history-event">• No significant events this week</div>`;
          }
        }
        
        html += `</div></div>`; // .history-events, .history-entry
      });
      
      html += '</div>'; // .hg-profile-history
    }

    html += '</div>'; // .hg-profile-game

    return html;
  }

  /**
   * Hide/close all houseguest profile modals
   * Safe to call even if no modal is open
   */
  function hideHouseguestProfile() {
    const modals = document.querySelectorAll('.houseguest-profile-modal');
    modals.forEach(modal => {
      modal.classList.add('closing');
      setTimeout(() => {
        if (modal.parentNode) {
          modal.parentNode.removeChild(modal);
        }
      }, 200);
    });
    
    if (modals.length > 0) {
      console.debug('[houseguest-profile] Closed ' + modals.length + ' modal(s)');
    }
  }

  // Export to global
  global.showHouseguestProfile = showHouseguestProfile;
  global.hideHouseguestProfile = hideHouseguestProfile;

  // Export as module object
  global.HouseguestProfile = {
    show: showHouseguestProfile,
    hide: hideHouseguestProfile
  };

  console.info('[houseguest-profile] Module initialized');

})(window);
