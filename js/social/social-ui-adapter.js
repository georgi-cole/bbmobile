// MODULE: social/social-ui-adapter.js
// UI adapter for spend-to-reveal feature in Diary Room
// Listens for enriched social.action:result and social.entry:story events
// Adds inline CTAs for spending Social Energy to reveal hidden details
// Gated by: game.cfg.socialSpendingEnabled

(function(global) {
  'use strict';

  // ============================================================================
  // CONFIGURATION & GATES
  // ============================================================================
  
  const cfg = global.game?.cfg || {};
  
  // Master feature flag
  if (!cfg.socialSpendingEnabled) {
    console.info('[social-ui-adapter] Disabled (socialSpendingEnabled=false)');
    return;
  }

  // Prevent double-installation
  if (global.__socialUiAdapterInstalled) {
    console.warn('[social-ui-adapter] Already installed');
    return;
  }
  global.__socialUiAdapterInstalled = true;

  console.info('[social-ui-adapter] ✓ Installed (socialSpendingEnabled=true)');

  // ============================================================================
  // STATE & TRACKING
  // ============================================================================
  
  // Track which entries have been revealed to prevent duplicate spending
  const revealedEntries = new Set();
  
  // Mock bank for testing when SocialManeuvers not available
  if (!global.__smDebug) {
    global.__smDebug = {};
  }
  if (!global.__smDebug.fakeBank) {
    global.__smDebug.fakeBank = new Map();
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  /**
   * Get player ID for human player
   */
  function getLocalPlayerId() {
    return global.game?.localPlayerId || 
           global.__localPlayerId || 
           global.game?.humanPlayerId || 
           (global.game?.players?.find(p => p.isHuman)?.id) ||
           null;
  }

  /**
   * Check if player can afford the spend
   */
  function canAfford(playerId, cost) {
    // Try SocialManeuvers API first
    if (global.SocialManeuvers?.SocialResources) {
      const resources = global.SocialManeuvers.SocialResources.getAll?.(playerId) || 
                       { energy: global.SocialManeuvers.SocialResources.get?.(playerId, 'energy') || 0 };
      return resources.energy >= cost;
    }
    
    // Fallback to mock bank for testing
    const mockBalance = global.__smDebug.fakeBank.get(playerId) ?? 10; // Default 10 for testing
    return mockBalance >= cost;
  }

  /**
   * Get current player energy
   */
  function getPlayerEnergy(playerId) {
    // Try SocialManeuvers API first
    if (global.SocialManeuvers?.SocialResources?.get) {
      return global.SocialManeuvers.SocialResources.get(playerId, 'energy') || 0;
    }
    
    // Fallback to mock bank
    return global.__smDebug.fakeBank.get(playerId) ?? 10;
  }

  /**
   * Spend player energy
   */
  function spendEnergy(playerId, cost) {
    // Try SocialManeuvers API first
    if (global.SocialManeuvers?.SocialResources?.spend) {
      const result = global.SocialManeuvers.SocialResources.spend(playerId, { energy: cost });
      return result.success;
    }
    
    // Fallback to mock bank
    const current = global.__smDebug.fakeBank.get(playerId) ?? 10;
    if (current >= cost) {
      global.__smDebug.fakeBank.set(playerId, current - cost);
      console.info(`[social-ui-adapter] Mock spend: ${cost} energy (${current} → ${current - cost})`);
      return true;
    }
    return false;
  }

  /**
   * Emit analytics event
   */
  function emitAnalytics(eventName, data) {
    // Emit on game bus
    const bus = global.game?.bus;
    if (bus && typeof bus.emit === 'function') {
      try {
        bus.emit(eventName, data);
      } catch (err) {
        console.warn('[social-ui-adapter] Failed to emit bus event:', err);
      }
    }

    // Emit on window for compatibility
    try {
      window.dispatchEvent(new CustomEvent(eventName, { detail: data }));
    } catch (err) {
      console.warn('[social-ui-adapter] Failed to dispatch window event:', err);
    }
  }

  /**
   * Process truthiness for reveal
   */
  function processTruthiness(detailedText, truthiness) {
    if (!truthiness || truthiness === 'true') {
      return {
        content: detailedText,
        annotation: null
      };
    }

    if (truthiness === 'partial') {
      // Show first sentence plus suffix
      const sentences = detailedText.split(/[.!?]\s+/);
      const firstSentence = sentences[0] || detailedText;
      return {
        content: firstSentence + (firstSentence.endsWith('.') ? '' : '.'),
        annotation: '(uncertain - partial information)'
      };
    }

    if (truthiness === 'lie') {
      return {
        content: detailedText,
        annotation: '⚠️ This might be deceptive'
      };
    }

    return {
      content: detailedText,
      annotation: null
    };
  }

  // ============================================================================
  // CTA RENDERING
  // ============================================================================

  /**
   * Create spend CTA button
   */
  function createSpendCTA(entryElement, payload) {
    const entryId = payload.id || `entry-${Date.now()}`;
    
    // Check if already revealed
    if (revealedEntries.has(entryId)) {
      console.info('[social-ui-adapter] Entry already revealed:', entryId);
      return null;
    }

    // Check for spendPrompt
    const spendPrompt = payload.raw?.spendPrompt || payload.spendPrompt;
    if (!spendPrompt || !spendPrompt.cost) {
      return null;
    }

    const cost = spendPrompt.cost;
    const label = spendPrompt.label || `Spend ${cost} energy to reveal ▶`;
    const playerId = getLocalPlayerId();

    if (!playerId) {
      console.warn('[social-ui-adapter] No local player ID found');
      return null;
    }

    // Create CTA container
    const ctaContainer = document.createElement('div');
    ctaContainer.className = 'social-spend-cta-container';
    ctaContainer.dataset.entryId = entryId;

    // Create CTA button
    const ctaButton = document.createElement('button');
    ctaButton.className = 'social-spend-cta';
    ctaButton.textContent = label;
    ctaButton.dataset.cost = cost;
    ctaButton.dataset.entryId = entryId;
    ctaButton.setAttribute('aria-label', `Spend ${cost} social energy to reveal hidden details`);

    // Check affordability
    const affordable = canAfford(playerId, cost);
    if (!affordable) {
      ctaButton.disabled = true;
      ctaButton.classList.add('disabled');
      ctaButton.title = 'Not enough energy';
      
      const currentEnergy = getPlayerEnergy(playerId);
      ctaButton.innerHTML = `${label} <span class="energy-status">(${currentEnergy}/${cost})</span>`;
    }

    // Click handler
    ctaButton.addEventListener('click', async () => {
      await handleSpendClick(ctaButton, entryElement, payload, playerId);
    });

    ctaContainer.appendChild(ctaButton);
    return ctaContainer;
  }

  /**
   * Handle spend button click
   */
  async function handleSpendClick(button, entryElement, payload, playerId) {
    const entryId = payload.id || `entry-${Date.now()}`;
    const cost = parseInt(button.dataset.cost, 10);

    // Emit attempt event
    emitAnalytics('social.spend:attempt', {
      entryId,
      playerId,
      cost,
      timestamp: Date.now()
    });

    // Validate configuration still enabled
    if (!global.game?.cfg?.socialSpendingEnabled) {
      console.warn('[social-ui-adapter] Spend blocked: feature disabled');
      emitAnalytics('social.spend:fail', {
        entryId,
        playerId,
        cost,
        reason: 'feature_disabled',
        timestamp: Date.now()
      });
      return;
    }

    // Check affordability again
    if (!canAfford(playerId, cost)) {
      console.warn('[social-ui-adapter] Spend blocked: insufficient energy');
      emitAnalytics('social.spend:fail', {
        entryId,
        playerId,
        cost,
        reason: 'insufficient_energy',
        timestamp: Date.now()
      });
      
      // Update button to show insufficient funds
      button.disabled = true;
      button.classList.add('disabled');
      button.textContent = 'Not enough energy';
      return;
    }

    // Show loading state
    button.disabled = true;
    button.classList.add('loading');
    const originalText = button.textContent;
    button.textContent = 'Revealing...';

    // Small delay for visual feedback
    await new Promise(resolve => setTimeout(resolve, 300));

    // Attempt to spend
    const success = spendEnergy(playerId, cost);

    if (!success) {
      console.error('[social-ui-adapter] Failed to deduct energy');
      emitAnalytics('social.spend:fail', {
        entryId,
        playerId,
        cost,
        reason: 'deduction_failed',
        timestamp: Date.now()
      });
      
      button.classList.remove('loading');
      button.textContent = 'Failed to spend';
      setTimeout(() => {
        button.textContent = originalText;
        button.disabled = false;
      }, 2000);
      return;
    }

    // Success! Mark as revealed
    revealedEntries.add(entryId);

    // Emit success event
    emitAnalytics('social.spend:success', {
      entryId,
      playerId,
      cost,
      timestamp: Date.now()
    });

    // Reveal content
    revealContent(button, entryElement, payload);

    // Update energy display if available
    if (global.SocializeMobile?.updateHUD) {
      try {
        global.SocializeMobile.updateHUD();
      } catch (err) {
        console.warn('[social-ui-adapter] Failed to update HUD:', err);
      }
    }
  }

  /**
   * Reveal hidden content
   */
  function revealContent(button, entryElement, payload) {
    // Get detailed text and truthiness
    const detailedText = payload.raw?.detailedText || payload.detailedText || 'No additional details available.';
    const truthiness = payload.raw?.truthiness || payload.truthiness || 'true';

    // Process based on truthiness
    const processed = processTruthiness(detailedText, truthiness);

    // Create reveal container
    const revealContainer = document.createElement('div');
    revealContainer.className = 'social-reveal-content';
    
    // Add content
    const contentDiv = document.createElement('div');
    contentDiv.className = 'reveal-text';
    contentDiv.textContent = processed.content;
    revealContainer.appendChild(contentDiv);

    // Add annotation if present
    if (processed.annotation) {
      const annotationDiv = document.createElement('div');
      annotationDiv.className = `reveal-annotation truthiness-${truthiness}`;
      annotationDiv.textContent = processed.annotation;
      revealContainer.appendChild(annotationDiv);

      // If lie, emit potential expose event for future tracking
      if (truthiness === 'lie') {
        emitAnalytics('social.reveal:exposed', {
          entryId: payload.id,
          timestamp: Date.now(),
          truthiness: 'lie'
        });
      }
    }

    // Replace button with revealed content
    const ctaContainer = button.closest('.social-spend-cta-container');
    if (ctaContainer) {
      ctaContainer.replaceWith(revealContainer);
    } else {
      button.replaceWith(revealContainer);
    }

    // Animate in
    setTimeout(() => {
      revealContainer.classList.add('revealed');
    }, 50);

    console.info('[social-ui-adapter] ✓ Revealed content for entry:', payload.id);
  }

  // ============================================================================
  // EVENT LISTENERS
  // ============================================================================

  /**
   * Handle social.entry:story events
   */
  function handleStoryEntry(event) {
    try {
      const payload = event.detail;
      if (!payload) return;

      // Only process if has spendPrompt
      const spendPrompt = payload.raw?.spendPrompt || payload.spendPrompt;
      if (!spendPrompt) return;

      // Wait a bit for DiaryRoomLogger to create the entry DOM
      setTimeout(() => {
        attachCTAToEntry(payload);
      }, 100);

    } catch (err) {
      console.error('[social-ui-adapter] Error handling story entry:', err);
    }
  }

  /**
   * Attach CTA to diary entry
   */
  function attachCTAToEntry(payload) {
    // Find the entry element in the diary log
    const logContainer = document.querySelector('#logSocial') || 
                        document.querySelector('.diary-log') ||
                        document.querySelector('[data-category="social"]');
    
    if (!logContainer) {
      console.warn('[social-ui-adapter] No diary log container found');
      return;
    }

    // Find the most recent entry (last child)
    const entries = logContainer.querySelectorAll('.diary-entry, .log-entry');
    if (entries.length === 0) {
      console.warn('[social-ui-adapter] No diary entries found');
      return;
    }

    const entryElement = entries[entries.length - 1];
    
    // Check if already has CTA
    if (entryElement.querySelector('.social-spend-cta-container')) {
      return;
    }

    // Create and append CTA
    const cta = createSpendCTA(entryElement, payload);
    if (cta) {
      entryElement.appendChild(cta);
      console.info('[social-ui-adapter] ✓ Attached CTA to entry');
    }
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  // Listen for social.entry:story events
  window.addEventListener('social.entry:story', handleStoryEntry);

  // Also listen on game bus if available
  const bus = global.game?.bus;
  if (bus && typeof bus.on === 'function') {
    bus.on('social.entry:story', (payload) => {
      handleStoryEntry({ detail: payload });
    });
  }

  console.info('[social-ui-adapter] ✓ Event listeners registered');

  // ============================================================================
  // PUBLIC API (for testing)
  // ============================================================================

  const SocialUIAdapter = {
    createSpendCTA,
    canAfford,
    getPlayerEnergy,
    spendEnergy,
    processTruthiness,
    revealedEntries,
    
    // Test helpers
    reset() {
      revealedEntries.clear();
      console.info('[social-ui-adapter] State reset');
    },
    
    setMockEnergy(playerId, amount) {
      global.__smDebug.fakeBank.set(playerId, amount);
      console.info(`[social-ui-adapter] Mock energy set: ${playerId} = ${amount}`);
    }
  };

  global.SocialUIAdapter = SocialUIAdapter;

})(window);
