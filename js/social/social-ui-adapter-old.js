// MODULE: social/social-ui-adapter.js
// ROBUST UI adapter for spend-to-reveal feature in Diary Room
// Listens for enriched social.action:result and social.entry:story events
// Adds inline CTAs for spending Social Energy to reveal hidden details
// Gated by: game.cfg.socialSpendingEnabled
// Debug HUD gated by: game.cfg.debugSocialAI

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

  console.info('[social-ui-adapter] ✓ Installed (robust, socialSpendingEnabled=true)');

  // ============================================================================
  // CONFIGURATION - RETRY & SELECTORS
  // ============================================================================
  
  const RETRY_CONFIG = {
    maxRetries: 5,           // Number of retry attempts
    retryIntervalMs: 200,    // Time between retries
    totalWindowMs: 2000      // Total retry window (expanded from 100ms)
  };

  // Expanded selectors for Diary Room container
  const DR_CONTAINER_SELECTORS = [
    '#logSocial',                          // Primary
    '.diary-log',                          // Common class
    '[data-category="social"]',            // Data attribute
    '.dr-container',                       // Alternative class
    '#diaryRoom .log-container',           // Nested selector
    '.social-log-container',               // Alternative naming
    '[data-log-type="social"]'             // Additional data attribute
  ];

  // Expanded selectors for Diary Room entries
  const DR_ENTRY_SELECTORS = [
    '.diary-entry',                        // Primary
    '.log-entry',                          // Alternative
    '.dr-entry',                           // Short form
    '[data-entry-id]',                     // Any with entry ID
    '.social-entry',                       // Social-specific
    '[data-log-entry]'                     // Generic entry marker
  ];

  // ============================================================================
  // STATE & TRACKING
  // ============================================================================
  
  // Track which entries have been revealed to prevent duplicate spending
  const revealedEntries = new Set();
  
  // Track recent spendable events for debug HUD
  const recentSpendables = [];
  
  // Mock bank for testing when SocialManeuvers not available
  if (!global.__smDebug) {
    global.__smDebug = {};
  }
  if (!global.__smDebug.fakeBank) {
    global.__smDebug.fakeBank = new Map();
  }
  if (!global.__smDebug.recentSpendables) {
    global.__smDebug.recentSpendables = recentSpendables;
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
    if (global.SocialManeuvers?.SocialResources?.get) {
      const energy = global.SocialManeuvers.SocialResources.get(playerId, 'energy');
      return energy >= cost;
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

  /**
   * Find Diary Room container with expanded selectors
   */
  function findDRContainer() {
    for (const selector of DR_CONTAINER_SELECTORS) {
      const container = document.querySelector(selector);
      if (container) {
        return container;
      }
    }
    return null;
  }

  /**
   * Find all Diary Room entries with expanded selectors
   */
  function findDREntries(container) {
    const allEntries = [];
    for (const selector of DR_ENTRY_SELECTORS) {
      const entries = container.querySelectorAll(selector);
      entries.forEach(entry => {
        if (!allEntries.includes(entry)) {
          allEntries.push(entry);
        }
      });
    }
    return allEntries;
  }

  /**
   * Create a fallback DR-style entry when real entry not found
   */
  function createFallbackEntry(container, payload) {
    console.info('[social-ui-adapter] Creating fallback DR entry for:', payload.id);
    
    const entryElement = document.createElement('div');
    entryElement.className = 'diary-entry fallback-entry';
    entryElement.dataset.entryId = payload.id;
    entryElement.dataset.fallback = 'true';
    
    // Create entry text
    const textDiv = document.createElement('div');
    textDiv.className = 'entry-text';
    textDiv.textContent = payload.text || payload.raw?.flavorText || 'Social interaction recorded';
    entryElement.appendChild(textDiv);
    
    // Create metadata
    const metaDiv = document.createElement('div');
    metaDiv.className = 'entry-meta';
    metaDiv.textContent = `Entry ${payload.id} • Fallback`;
    entryElement.appendChild(metaDiv);
    
    // Append to container
    container.appendChild(entryElement);
    
    return entryElement;
  }

  /**
   * Attach CTA to entry with retry mechanism
   */
  async function attachCTAToEntryWithRetry(payload) {
    const entryId = payload.id || `entry-${Date.now()}`;
    let retryCount = 0;
    let entryElement = null;
    let logContainer = null;
    
    while (retryCount < RETRY_CONFIG.maxRetries) {
      // Find container
      logContainer = findDRContainer();
      
      if (logContainer) {
        // Try to find the entry by ID first
        if (entryId) {
          entryElement = logContainer.querySelector(`[data-entry-id="${entryId}"]`);
        }
        
        // Fallback: Find most recent entry
        if (!entryElement) {
          const entries = findDREntries(logContainer);
          if (entries.length > 0) {
            entryElement = entries[entries.length - 1];
            console.info('[social-ui-adapter] Using most recent entry as fallback');
          }
        }
        
        if (entryElement) {
          break; // Found it!
        }
      }
      
      // Wait and retry
      retryCount++;
      if (retryCount < RETRY_CONFIG.maxRetries) {
        await new Promise(resolve => setTimeout(resolve, RETRY_CONFIG.retryIntervalMs));
      }
    }
    
    // If still no container after retries, can't proceed
    if (!logContainer) {
      console.warn('[social-ui-adapter] No DR container found after retries');
      emitAnalytics('social.cta:fail', {
        entryId,
        reason: 'no_container',
        retriesAttempted: retryCount,
        timestamp: Date.now()
      });
      return;
    }
    
    // If no entry found after retries, create fallback
    if (!entryElement) {
      console.info('[social-ui-adapter] No entry found after retries, creating fallback');
      entryElement = createFallbackEntry(logContainer, payload);
      emitAnalytics('social.cta:fallback_created', {
        entryId,
        retriesAttempted: retryCount,
        timestamp: Date.now()
      });
    } else {
      console.info(`[social-ui-adapter] ✓ Found entry after ${retryCount} retries`);
    }
    
    // Check if already has CTA
    if (entryElement.querySelector('.social-spend-cta-container')) {
      console.info('[social-ui-adapter] Entry already has CTA, skipping');
      return;
    }

    // Create and append CTA
    const cta = createSpendCTA(entryElement, payload);
    if (cta) {
      entryElement.appendChild(cta);
      console.info('[social-ui-adapter] ✓ Attached CTA to entry');
      
      emitAnalytics('social.cta:attached', {
        entryId,
        retriesAttempted: retryCount,
        isFallback: entryElement.dataset.fallback === 'true',
        timestamp: Date.now()
      });
    }
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

      // Track in debug list
      const spendableItem = {
        id: payload.id,
        timestamp: Date.now(),
        cost: spendPrompt.cost,
        label: spendPrompt.label || `Spend ${spendPrompt.cost} energy`,
        payload: payload
      };
      recentSpendables.unshift(spendableItem);
      if (recentSpendables.length > 10) {
        recentSpendables.pop(); // Keep last 10
      }

      // Update debug HUD if visible
      updateDebugHUD();

      // Use new retry mechanism (wait slightly longer for DR to render)
      setTimeout(() => {
        attachCTAToEntryWithRetry(payload);
      }, 150);

    } catch (err) {
      console.error('[social-ui-adapter] Error handling story entry:', err);
    }
  }

  // ============================================================================
  // DEBUG HUD (gated by debugSocialAI flag)
  // ============================================================================

  let debugHUDElement = null;

  /**
   * Create debug HUD element
   */
  function createDebugHUD() {
    if (debugHUDElement) return debugHUDElement;

    const hud = document.createElement('div');
    hud.id = 'social-spend-debug-hud';
    hud.style.cssText = `
      position: fixed;
      bottom: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.9);
      color: #fff;
      border: 2px solid #667eea;
      border-radius: 8px;
      padding: 12px;
      font-family: monospace;
      font-size: 12px;
      z-index: 999999;
      max-width: 350px;
      max-height: 400px;
      overflow-y: auto;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
    `;

    const header = document.createElement('div');
    header.style.cssText = `
      font-weight: bold;
      margin-bottom: 8px;
      color: #667eea;
      border-bottom: 1px solid #667eea;
      padding-bottom: 4px;
    `;
    header.textContent = '🎭 Social Spend Debug HUD';
    hud.appendChild(header);

    const content = document.createElement('div');
    content.id = 'debug-hud-content';
    hud.appendChild(content);

    debugHUDElement = hud;
    document.body.appendChild(hud);

    return hud;
  }

  /**
   * Update debug HUD content
   */
  function updateDebugHUD() {
    if (!global.game?.cfg?.debugSocialAI) {
      // Remove HUD if debug flag is off
      if (debugHUDElement) {
        debugHUDElement.remove();
        debugHUDElement = null;
      }
      return;
    }

    // Create HUD if needed
    if (!debugHUDElement) {
      createDebugHUD();
    }

    const content = document.getElementById('debug-hud-content');
    if (!content) return;

    // Clear content
    content.innerHTML = '';

    // Show current energy
    const playerId = getLocalPlayerId();
    const energy = playerId ? getPlayerEnergy(playerId) : 0;
    const energyDiv = document.createElement('div');
    energyDiv.style.cssText = 'margin-bottom: 8px; color: #90caf9;';
    energyDiv.textContent = `⚡ Energy: ${energy}`;
    content.appendChild(energyDiv);

    // Show recent spendables
    if (recentSpendables.length === 0) {
      const emptyDiv = document.createElement('div');
      emptyDiv.style.cssText = 'color: #999; font-style: italic;';
      emptyDiv.textContent = 'No recent spendable events';
      content.appendChild(emptyDiv);
    } else {
      const listTitle = document.createElement('div');
      listTitle.style.cssText = 'margin-top: 8px; margin-bottom: 4px; color: #a5d6a7;';
      listTitle.textContent = `Recent Spendables (${recentSpendables.length}):`;
      content.appendChild(listTitle);

      recentSpendables.forEach((item, idx) => {
        const itemDiv = document.createElement('div');
        itemDiv.style.cssText = `
          background: rgba(102, 126, 234, 0.1);
          border-left: 3px solid #667eea;
          padding: 6px;
          margin-bottom: 4px;
          border-radius: 3px;
        `;

        const itemHeader = document.createElement('div');
        itemHeader.style.cssText = 'color: #90caf9; margin-bottom: 2px;';
        itemHeader.textContent = `#${idx + 1} - Cost: ${item.cost} ⚡`;
        itemDiv.appendChild(itemHeader);

        const itemTime = document.createElement('div');
        itemTime.style.cssText = 'color: #999; font-size: 10px;';
        const elapsed = Math.round((Date.now() - item.timestamp) / 1000);
        itemTime.textContent = `${elapsed}s ago • ID: ${item.id}`;
        itemDiv.appendChild(itemTime);

        // Debug spend button
        const spendBtn = document.createElement('button');
        spendBtn.style.cssText = `
          background: #667eea;
          color: white;
          border: none;
          padding: 4px 8px;
          margin-top: 4px;
          border-radius: 3px;
          cursor: pointer;
          font-size: 10px;
        `;
        spendBtn.textContent = 'Debug Spend';
        spendBtn.onclick = async () => {
          if (!playerId) {
            alert('No player ID found');
            return;
          }
          
          const canPay = canAfford(playerId, item.cost);
          if (!canPay) {
            alert(`Not enough energy! Have: ${energy}, Need: ${item.cost}`);
            return;
          }

          const success = spendEnergy(playerId, item.cost);
          if (success) {
            alert(`✓ Spent ${item.cost} energy (Debug mode)`);
            revealedEntries.add(item.id);
            updateDebugHUD();
          } else {
            alert('Failed to spend energy');
          }
        };
        itemDiv.appendChild(spendBtn);

        content.appendChild(itemDiv);
      });
    }

    // Add revealed count
    const revealedDiv = document.createElement('div');
    revealedDiv.style.cssText = 'margin-top: 8px; color: #a5d6a7; border-top: 1px solid #444; padding-top: 4px;';
    revealedDiv.textContent = `✓ Revealed: ${revealedEntries.size}`;
    content.appendChild(revealedDiv);
  }

  // Initialize debug HUD if flag is enabled
  if (global.game?.cfg?.debugSocialAI) {
    setTimeout(() => updateDebugHUD(), 500);
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
      recentSpendables.length = 0;
      if (debugHUDElement) {
        updateDebugHUD();
      }
      console.info('[social-ui-adapter] State reset');
    },
    
    setMockEnergy(playerId, amount) {
      global.__smDebug.fakeBank.set(playerId, amount);
      if (debugHUDElement) {
        updateDebugHUD();
      }
      console.info(`[social-ui-adapter] Mock energy set: ${playerId} = ${amount}`);
    },
    
    getRevealed() {
      return Array.from(revealedEntries);
    },
    
    // Debug HUD controls
    showDebugHUD() {
      if (!debugHUDElement) {
        createDebugHUD();
      }
      updateDebugHUD();
    },
    
    hideDebugHUD() {
      if (debugHUDElement) {
        debugHUDElement.remove();
        debugHUDElement = null;
      }
    }
  };

  global.SocialUIAdapter = SocialUIAdapter;

})(window);
