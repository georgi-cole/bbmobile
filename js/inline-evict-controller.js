// MODULE: inline-evict-controller.js
// New modular inline eviction controller for 2-nominee live vote flows
// Replaces legacy lv2 UI with clean, focused implementation
// Renders inside faux TV with inline result display

(function(global) {
  'use strict';

  /**
   * InlineEvictController - Manages 2-nominee eviction voting UI
   * 
   * Features:
   * - Inline evict buttons (name transforms into actionable button)
   * - Dynamic instruction text lifecycle
   * - Inline result rendering within faux TV
   * - Full keyboard support and accessibility
   * - Reduced motion compliance
   * 
   * Public API:
   * - init(config) - Initialize with nominee data and flags
   * - enableVoting() - Enable user voting
   * - disableVoting() - Disable voting controls
   * - castVote(votedId) - Lock in vote (internal, triggered by second activation)
   * - renderInlineResult(evictedId, survivorId, meta) - Show result inline
   * - cleanup() - Remove UI and reset state
   */
  class InlineEvictController {
    constructor() {
      // State management
      this.state = {
        leftId: null,
        rightId: null,
        leftName: '',
        rightName: '',
        selectedNominee: null,
        voteLocked: false,
        voteCompleted: false,
        resultShown: false,
        votingEnabled: false,
        flags: {
          tieBreak: false,
          final4: false
        }
      };

      // DOM element references
      this.elements = {
        root: null,
        instructions: null,
        nomineeButtons: [],
        resultContainer: null
      };

      // Callbacks
      this.callbacks = {
        onVote: null,
        onResult: null
      };

      // Keyboard handler binding
      this._keyboardHandler = this._handleKeyboard.bind(this);

      // Check for reduced motion
      this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    /**
     * Initialize the controller with nominee data and configuration
     * @param {Object} config - Configuration object
     * @param {string} config.leftId - Left nominee ID
     * @param {string} config.rightId - Right nominee ID  
     * @param {string} config.leftName - Left nominee name
     * @param {string} config.rightName - Right nominee name
     * @param {Object} config.flags - Special mode flags
     * @param {boolean} config.flags.tieBreak - Is this a tie-break vote?
     * @param {boolean} config.flags.final4 - Is this a final 4 sole vote?
     * @param {Function} config.onVote - Callback when vote is cast
     * @param {Function} config.onResult - Optional callback when result is shown
     */
    init(config) {
      if (!config || !config.leftId || !config.rightId || !config.leftName || !config.rightName) {
        console.error('[InlineEvictController] Invalid config', config);
        return false;
      }

      // Store configuration
      this.state.leftId = config.leftId;
      this.state.rightId = config.rightId;
      this.state.leftName = config.leftName;
      this.state.rightName = config.rightName;
      this.state.flags.tieBreak = config.flags?.tieBreak || false;
      this.state.flags.final4 = config.flags?.final4 || false;

      // Store callbacks
      this.callbacks.onVote = config.onVote || null;
      this.callbacks.onResult = config.onResult || null;

      // Reset state
      this.state.selectedNominee = null;
      this.state.voteLocked = false;
      this.state.voteCompleted = false;
      this.state.resultShown = false;
      this.state.votingEnabled = false;

      // Render UI
      this._render();

      // Add keyboard listener
      document.addEventListener('keydown', this._keyboardHandler);

      console.info('[InlineEvictController] Initialized', {
        nominees: [config.leftName, config.rightName],
        flags: this.state.flags
      });

      return true;
    }

    /**
     * Enable voting controls
     */
    enableVoting() {
      this.state.votingEnabled = true;
      this._updateInstructions();
      this._updateButtonStates();
      console.debug('[InlineEvictController] Voting enabled');
    }

    /**
     * Disable voting controls
     */
    disableVoting() {
      this.state.votingEnabled = false;
      this._updateButtonStates();
      console.debug('[InlineEvictController] Voting disabled');
    }

    /**
     * Cast vote (internal - called after second activation)
     * @param {string} votedId - ID of nominee being voted out
     */
    castVote(votedId) {
      if (this.state.voteLocked || this.state.voteCompleted) {
        console.warn('[InlineEvictController] Vote already cast');
        return;
      }

      this.state.voteLocked = true;
      this.state.voteCompleted = true;

      // Update UI to show vote has been cast
      this._updateInstructions('Your vote has been cast.');
      this._disableAllButtons();

      // Invoke callback
      if (this.callbacks.onVote) {
        this.callbacks.onVote(votedId);
      }

      console.info('[InlineEvictController] Vote cast for', votedId);
    }

    /**
     * Render inline result inside faux TV
     * @param {string} evictedId - ID of evicted nominee
     * @param {string} survivorId - ID of surviving nominee
     * @param {Object} meta - Additional metadata (vote counts, etc.)
     */
    renderInlineResult(evictedId, survivorId, meta = {}) {
      if (this.state.resultShown) {
        console.warn('[InlineEvictController] Result already shown, skipping duplicate');
        return;
      }

      this.state.resultShown = true;

      const evictedName = evictedId === this.state.leftId ? this.state.leftName : this.state.rightName;
      const survivorName = survivorId === this.state.leftId ? this.state.leftName : this.state.rightName;

      // Fade out grid
      const grid = this.elements.root?.querySelector('.ievc-grid');
      if (grid) {
        grid.classList.add('ievc-fade-out');
      }

      // Wait for fade, then replace with result
      setTimeout(() => {
        this._renderResult(evictedId, evictedName, survivorId, survivorName, meta);
      }, this.reducedMotion ? 150 : 400);

      console.info('[InlineEvictController] Rendering inline result', {
        evicted: evictedName,
        survivor: survivorName
      });
    }

    /**
     * Update flags (e.g., for tie-break mode)
     * @param {Object} flags - Flags to update
     * @param {boolean} flags.tieBreak - Is this a tie-break vote?
     * @param {boolean} flags.final4 - Is this a final 4 sole vote?
     */
    updateFlags(flags) {
      if (flags.tieBreak !== undefined) {
        this.state.flags.tieBreak = flags.tieBreak;
      }
      if (flags.final4 !== undefined) {
        this.state.flags.final4 = flags.final4;
      }
    }

    /**
     * Update instructions text (public method)
     * @param {string} text - Instructions text to display
     */
    updateInstructions(text) {
      this._updateInstructions(text);
    }

    /**
     * Reset buttons for tie-break or re-vote scenarios
     * Clears selection and enables voting
     */
    resetButtons() {
      this.state.selectedNominee = null;
      this.state.voteLocked = false;
      
      // Reset all buttons to normal state
      this.elements.nomineeButtons.forEach(btn => {
        const btnId = btn.dataset.nomineeId;
        const btnName = btnId === this.state.leftId ? this.state.leftName : this.state.rightName;
        
        btn.classList.remove('selected');
        btn.textContent = btnName;
        btn.disabled = false;
        btn.setAttribute('aria-label', `Select ${btnName} for eviction`);
      });
      
      this._updateInstructions();
    }

    /**
     * Check if inline result rendering is supported
     * @returns {boolean}
     */
    supportsInlineRender() {
      // Always return true for inline eviction controller
      // Inline rendering is the primary purpose of this controller
      return true;
    }

    /**
     * Clean up controller - remove UI and reset state
     */
    cleanup() {
      // Remove keyboard listener
      document.removeEventListener('keydown', this._keyboardHandler);

      // Remove root element
      if (this.elements.root && this.elements.root.parentNode) {
        this.elements.root.parentNode.removeChild(this.elements.root);
      }

      // Reset state
      this.state = {
        leftId: null,
        rightId: null,
        leftName: '',
        rightName: '',
        selectedNominee: null,
        voteLocked: false,
        voteCompleted: false,
        resultShown: false,
        votingEnabled: false,
        flags: { tieBreak: false, final4: false }
      };

      // Clear element references
      this.elements = {
        root: null,
        instructions: null,
        nomineeButtons: [],
        resultContainer: null
      };

      console.debug('[InlineEvictController] Cleaned up');
    }

    // ========== PRIVATE METHODS ==========

    /**
     * Render the main UI
     * @private
     */
    _render() {
      const tv = document.querySelector('#tv');
      if (!tv) {
        console.error('[InlineEvictController] #tv element not found');
        return;
      }

      // Hide #panel during inline eviction mode
      const panel = document.querySelector('#panel');
      if (panel) {
        panel.style.display = 'none';
      }

      // Create root container
      const root = document.createElement('div');
      root.className = 'ievc-root';
      root.setAttribute('role', 'region');
      root.setAttribute('aria-label', 'Live Vote');
      root.setAttribute('data-livevote-root', 'inline');

      // Apply TV safe area constraints if available
      if (global.TVFit) {
        global.TVFit.applySafeAreaConstraints(root);
      }

      // Create header
      const header = document.createElement('h3');
      header.className = 'ievc-header';
      header.textContent = 'Live Vote';
      root.appendChild(header);

      // Create grid container for two nominees
      const grid = document.createElement('div');
      grid.className = 'ievc-grid';

      // Create left nominee
      const leftCard = this._createNomineeCard('left', this.state.leftId, this.state.leftName);
      grid.appendChild(leftCard);

      // Create right nominee
      const rightCard = this._createNomineeCard('right', this.state.rightId, this.state.rightName);
      grid.appendChild(rightCard);

      root.appendChild(grid);

      // Create instructions element
      const instructions = document.createElement('div');
      instructions.className = 'ievc-instructions';
      instructions.setAttribute('role', 'status');
      instructions.setAttribute('aria-live', 'polite');
      instructions.textContent = 'Select a nominee to evict.';
      root.appendChild(instructions);

      // Store references
      this.elements.root = root;
      this.elements.instructions = instructions;

      // Append to TV
      tv.appendChild(root);
    }

    /**
     * Create a nominee card
     * @private
     */
    _createNomineeCard(side, id, name) {
      const card = document.createElement('div');
      card.className = `ievc-nominee ${side}`;
      card.dataset.nomineeId = id;

      // Avatar wrapper
      const avatarWrapper = document.createElement('div');
      avatarWrapper.className = 'ievc-avatar';
      
      const avatar = document.createElement('img');
      avatar.src = this._getAvatarUrl(id);
      avatar.alt = name;
      avatar.loading = 'lazy';
      avatarWrapper.appendChild(avatar);
      
      card.appendChild(avatarWrapper);

      // Name button (actionable element)
      const button = document.createElement('button');
      button.className = 'ievc-btn';
      button.type = 'button';
      button.textContent = name;
      button.dataset.nomineeId = id;
      button.setAttribute('aria-label', `Select ${name} for eviction`);
      
      // Click handler
      button.addEventListener('click', () => this._handleNomineeClick(id, name));
      
      // Keyboard handler for Enter/Space
      button.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this._handleNomineeClick(id, name);
        }
      });

      card.appendChild(button);

      // Store button reference
      this.elements.nomineeButtons.push(button);

      return card;
    }

    /**
     * Handle nominee click/activation
     * @private
     */
    _handleNomineeClick(id, name) {
      // Ignore if voting is disabled or vote is locked
      if (!this.state.votingEnabled || this.state.voteLocked) {
        return;
      }

      // Check if this is the selected nominee
      if (this.state.selectedNominee === id) {
        // Second activation - cast vote
        this.castVote(id);
      } else {
        // First activation - select nominee
        this._selectNominee(id, name);
      }
    }

    /**
     * Select a nominee (first activation)
     * @private
     */
    _selectNominee(id, name) {
      this.state.selectedNominee = id;

      // Update buttons
      this.elements.nomineeButtons.forEach(btn => {
        const btnId = btn.dataset.nomineeId;
        const btnName = btnId === this.state.leftId ? this.state.leftName : this.state.rightName;

        if (btnId === id) {
          // Transform into evict button
          btn.classList.add('selected');
          
          // Update text based on mode
          let buttonText = `Evict ${name}`;
          let ariaLabel = `Confirm eviction of ${name}`;
          
          if (this.state.flags.tieBreak) {
            buttonText = `Break Tie: Evict ${name}`;
            ariaLabel = `Break tie by evicting ${name}`;
          } else if (this.state.flags.final4) {
            buttonText = `Cast Sole Vote: Evict ${name}`;
            ariaLabel = `Cast sole vote to evict ${name}`;
          }
          
          btn.textContent = buttonText;
          btn.setAttribute('aria-label', ariaLabel);
        } else {
          // Reset to normal state
          btn.classList.remove('selected');
          btn.textContent = btnName;
          btn.setAttribute('aria-label', `Select ${btnName} for eviction`);
        }
      });

      // Update instructions
      this._updateInstructions(`You are about to evict ${name}. Click again to confirm.`);

      // Move focus to selected button for accessibility
      const selectedBtn = this.elements.nomineeButtons.find(b => b.dataset.nomineeId === id);
      if (selectedBtn) {
        selectedBtn.focus();
      }
    }

    /**
     * Clear selection (triggered by Escape key)
     * @private
     */
    _clearSelection() {
      if (!this.state.selectedNominee || this.state.voteLocked) {
        return;
      }

      this.state.selectedNominee = null;

      // Reset all buttons to normal state
      this.elements.nomineeButtons.forEach(btn => {
        const btnId = btn.dataset.nomineeId;
        const btnName = btnId === this.state.leftId ? this.state.leftName : this.state.rightName;
        
        btn.classList.remove('selected');
        btn.textContent = btnName;
        btn.setAttribute('aria-label', `Select ${btnName} for eviction`);
      });

      // Reset instructions
      this._updateInstructions('Select a nominee to evict.');
    }

    /**
     * Update instructions text
     * @private
     */
    _updateInstructions(text) {
      if (!text) {
        // Default instruction based on state
        if (this.state.voteCompleted) {
          text = 'Your vote has been cast.';
        } else if (this.state.votingEnabled) {
          text = 'Select a nominee to evict.';
        } else {
          text = 'Waiting for your turn...';
        }
      }

      if (this.elements.instructions) {
        this.elements.instructions.textContent = text;
      }
    }

    /**
     * Update button states based on current state
     * @private
     */
    _updateButtonStates() {
      this.elements.nomineeButtons.forEach(btn => {
        btn.disabled = !this.state.votingEnabled || this.state.voteLocked;
      });
    }

    /**
     * Disable all buttons
     * @private
     */
    _disableAllButtons() {
      this.elements.nomineeButtons.forEach(btn => {
        btn.disabled = true;
        btn.setAttribute('aria-label', `Vote recorded for ${btn.textContent}`);
      });
    }

    /**
     * Handle keyboard shortcuts
     * @private
     */
    _handleKeyboard(e) {
      // Ignore if vote is locked or voting is disabled
      if (this.state.voteLocked || !this.state.votingEnabled) {
        return;
      }

      // 1 or 2 keys - select/vote for nominee
      if (e.key === '1') {
        e.preventDefault();
        this._handleNomineeClick(this.state.leftId, this.state.leftName);
      } else if (e.key === '2') {
        e.preventDefault();
        this._handleNomineeClick(this.state.rightId, this.state.rightName);
      }
      
      // Escape - clear selection (only before vote is cast)
      else if (e.key === 'Escape') {
        e.preventDefault();
        this._clearSelection();
      }
    }

    /**
     * Render result display
     * @private
     */
    _renderResult(evictedId, evictedName, survivorId, survivorName, meta) {
      if (!this.elements.root) return;

      // Remove grid
      const grid = this.elements.root.querySelector('.ievc-grid');
      if (grid) {
        grid.remove();
      }

      // Remove instructions
      if (this.elements.instructions) {
        this.elements.instructions.remove();
      }

      // Create result container
      const resultContainer = document.createElement('div');
      resultContainer.className = 'ievc-result';
      resultContainer.setAttribute('role', 'region');
      resultContainer.setAttribute('aria-label', 'Eviction result');

      // Result header
      const resultHeader = document.createElement('h4');
      resultHeader.className = 'ievc-result-header';
      resultHeader.textContent = 'Eviction Result';
      resultContainer.appendChild(resultHeader);

      // Result grid (both nominees with outcome indicators)
      const resultGrid = document.createElement('div');
      resultGrid.className = 'ievc-result-grid';

      // Evicted nominee
      const evictedCard = this._createResultCard(evictedId, evictedName, 'evicted', meta);
      resultGrid.appendChild(evictedCard);

      // Survivor nominee
      const survivorCard = this._createResultCard(survivorId, survivorName, 'survivor', meta);
      resultGrid.appendChild(survivorCard);

      resultContainer.appendChild(resultGrid);

      // Summary text
      const summary = document.createElement('div');
      summary.className = 'ievc-result-summary';
      summary.textContent = `${evictedName} has been evicted. ${survivorName} remains in the game.`;
      resultContainer.appendChild(summary);

      // ARIA live announcement
      const liveRegion = document.createElement('div');
      liveRegion.setAttribute('role', 'status');
      liveRegion.setAttribute('aria-live', 'polite');
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.style.position = 'absolute';
      liveRegion.style.left = '-10000px';
      liveRegion.textContent = `You voted to evict ${evictedName}. ${survivorName} remains.`;
      resultContainer.appendChild(liveRegion);

      // Store reference
      this.elements.resultContainer = resultContainer;

      // Add to root
      this.elements.root.appendChild(resultContainer);

      // Focus on result container for accessibility
      setTimeout(() => {
        if (resultContainer) {
          resultContainer.tabIndex = -1;
          resultContainer.focus();
        }
      }, 100);

      // Invoke result callback
      if (this.callbacks.onResult) {
        this.callbacks.onResult(evictedId, survivorId);
      }
    }

    /**
     * Create a result card for a nominee
     * @private
     */
    _createResultCard(id, name, outcome, meta) {
      const card = document.createElement('div');
      card.className = `ievc-result-card ${outcome}`;
      card.dataset.outcome = outcome;

      // Avatar
      const avatarWrapper = document.createElement('div');
      avatarWrapper.className = 'ievc-result-avatar';
      
      const avatar = document.createElement('img');
      avatar.src = this._getAvatarUrl(id);
      avatar.alt = name;
      avatarWrapper.appendChild(avatar);
      
      card.appendChild(avatarWrapper);

      // Name
      const nameEl = document.createElement('div');
      nameEl.className = 'ievc-result-name';
      nameEl.textContent = name;
      card.appendChild(nameEl);

      // Outcome label
      const outcomeLabel = document.createElement('div');
      outcomeLabel.className = 'ievc-result-outcome';
      outcomeLabel.textContent = outcome === 'evicted' ? 'EVICTED' : 'SURVIVES';
      outcomeLabel.setAttribute('aria-label', outcome === 'evicted' ? `Evicted: ${name}` : `Survives: ${name}`);
      card.appendChild(outcomeLabel);

      // Vote count if available
      if (meta.voteCounts && meta.voteCounts[id] !== undefined) {
        const voteCount = document.createElement('div');
        voteCount.className = 'ievc-result-votes';
        const count = meta.voteCounts[id];
        voteCount.textContent = `${count} vote${count !== 1 ? 's' : ''}`;
        card.appendChild(voteCount);
      }

      return card;
    }

    /**
     * Get avatar URL for a player
     * @private
     */
    _getAvatarUrl(playerId) {
      // Use global avatar resolver if available
      if (global.resolveAvatar) {
        const player = global.getP?.(playerId);
        if (player) {
          return global.resolveAvatar(player) || this._getDicebearUrl(player.name);
        }
      }
      
      // Fallback to player.avatar or dicebear
      const player = global.getP?.(playerId);
      if (player?.avatar) return player.avatar;
      
      return this._getDicebearUrl(global.safeName?.(playerId) || 'player');
    }

    /**
     * Get dicebear URL
     * @private
     */
    _getDicebearUrl(seed) {
      return `https://api.dicebear.com/6.x/bottts/svg?seed=${encodeURIComponent(seed || 'player')}`;
    }
  }

  // Export to global scope
  global.InlineEvictController = InlineEvictController;

  console.info('[InlineEvictController] Module loaded');

})(window);
