// MODULE: social/social-ui-adapter.js
// ROBUST UI adapter for spend-to-reveal feature in Diary Room
// Listens for enriched social.action:result and social.entry:story events
// Adds inline CTAs for spending Social Energy to reveal hidden details
// Gated by: game.cfg.socialSpendingEnabled
// Debug HUD gated by: game.cfg.debugSocialHUD

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
    maxRetries: 10,          // Increased from 5
    retryIntervalMs: 300,    // Increased from 200ms
    totalWindowMs: 3000      // Increased from 2000ms (3 second window)
  };

  // Expanded selectors for Diary Room container
  const DR_CONTAINER_SELECTORS = [
    '#logSocial',                          // Primary
    '.diary-log',                          // Common class
    '[data-category="social"]',            // Data attribute
    '.dr-container',                       // Alternative class
    '#diaryRoom .log-container',           // Nested selector
    '.social-log-container',               // Alternative naming
    '[data-log-type="social"]',            // Additional data attribute
    '.log-pane[data-pane="social"]'        // Specific pane selector
  ];

  // Expanded selectors for Diary Room entries
  const DR_ENTRY_SELECTORS = [
    '.diary-entry',                        // Primary
    '.log-entry',                          // Alternative
    '.dr-entry',                           // Short form
    '[data-entry-id]',                     // Any with entry ID
    '.social-entry',                       // Social-specific
    '[data-log-entry]',                    // Generic entry marker
    '.dr-log-item'                         // Additional alternative
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
    cost = cost || 1;
    
    // Try SocialManeuvers bank if available
    if (global.SocialManeuvers?.Bank) {
      const balance = global.SocialManeuvers.Bank.getEnergy(playerId);
      return balance >= cost;
    }
    
    // Fallback to mock bank
    const mockBalance = global.__smDebug.fakeBank.get(playerId) || 0;
    return mockBalance >= cost;
  }

  /**
   * Deduct energy from player's bank
   */
  function deductEnergy(playerId, cost) {
    cost = cost || 1;
    
    // Try SocialManeuvers bank if available
    if (global.SocialManeuvers?.Bank) {
      const success = global.SocialManeuvers.Bank.deduct(playerId, cost);
      if (success) {
        console.info('[social-ui-adapter] Deducted', cost, 'energy from', playerId);
        return true;
      }
      return false;
    }
    
    // Fallback to mock bank
    const mockBalance = global.__smDebug.fakeBank.get(playerId) || 0;
    if (mockBalance >= cost) {
      global.__smDebug.fakeBank.set(playerId, mockBalance - cost);
      console.info('[social-ui-adapter] Deducted', cost, 'energy from mock bank for', playerId);
      return true;
    }
    
    return false;
  }

  /**
   * Find Diary Room container using expanded selectors
   */
  function findDRContainer() {
    for (const selector of DR_CONTAINER_SELECTORS) {
      const el = document.querySelector(selector);
      if (el) {
        return el;
      }
    }
    return null;
  }

  /**
   * Find entry element by ID with expanded selectors
   */
  function findEntryElement(entryId) {
    for (const selector of DR_ENTRY_SELECTORS) {
      const entries = document.querySelectorAll(selector);
      for (const entry of entries) {
        if (entry.dataset.entryId === entryId || 
            entry.id === entryId ||
            entry.dataset.id === entryId) {
          return entry;
        }
      }
    }
    return null;
  }

  // ============================================================================
  // CTA ATTACHMENT WITH RETRY
  // ============================================================================

  /**
   * Attach CTA to entry with retry logic
   */
  function attachCTAToEntryWithRetry(entryId, spendPrompt, detailedText) {
    let attempts = 0;
    const startTime = Date.now();
    
    function tryAttach() {
      attempts++;
      const elapsed = Date.now() - startTime;
      
      // Check if we've exceeded retry window
      if (elapsed > RETRY_CONFIG.totalWindowMs) {
        console.warn('[social-ui-adapter] Retry window exceeded for', entryId, 'after', attempts, 'attempts');
        // Create fallback entry if nothing was found
        createFallbackEntry(entryId, spendPrompt, detailedText);
        return;
      }
      
      // Try to find entry
      const entryEl = findEntryElement(entryId);
      
      if (entryEl) {
        // Found! Attach CTA
        attachCTAToEntry(entryEl, entryId, spendPrompt, detailedText);
        console.info('[social-ui-adapter] ✓ Attached CTA to', entryId, 'after', attempts, 'attempts');
      } else if (attempts < RETRY_CONFIG.maxRetries) {
        // Retry after interval
        setTimeout(tryAttach, RETRY_CONFIG.retryIntervalMs);
      } else {
        // Max retries reached
        console.warn('[social-ui-adapter] Max retries reached for', entryId);
        createFallbackEntry(entryId, spendPrompt, detailedText);
      }
    }
    
    // Start attachment process
    tryAttach();
  }

  /**
   * Attach CTA directly to entry element
   */
  function attachCTAToEntry(entryEl, entryId, spendPrompt, detailedText) {
    // Check if already has CTA
    if (entryEl.querySelector('.social-spend-cta')) {
      console.debug('[social-ui-adapter] Entry already has CTA:', entryId);
      return;
    }
    
    // Create CTA button
    const cta = document.createElement('button');
    cta.className = 'social-spend-cta';
    cta.textContent = spendPrompt.text || '💎 Reveal details';
    cta.title = `Cost: ${spendPrompt.cost || 1} energy`;
    cta.dataset.entryId = entryId;
    cta.dataset.cost = spendPrompt.cost || 1;
    
    // Add click handler
    cta.addEventListener('click', () => handleSpendClick(entryId, entryEl, spendPrompt, detailedText));
    
    // Append to entry
    entryEl.appendChild(cta);
    
    // Style the CTA (inline for safety)
    cta.style.cssText = `
      display: inline-block;
      margin-top: 4px;
      padding: 4px 8px;
      font-size: 0.75rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s ease;
    `;
    
    cta.addEventListener('mouseenter', () => {
      cta.style.transform = 'scale(1.05)';
      cta.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.4)';
    });
    
    cta.addEventListener('mouseleave', () => {
      cta.style.transform = 'scale(1)';
      cta.style.boxShadow = 'none';
    });
  }

  /**
   * Create minimal fallback entry when no real entry found
   */
  function createFallbackEntry(entryId, spendPrompt, detailedText) {
    const container = findDRContainer();
    
    if (!container) {
      console.warn('[social-ui-adapter] Cannot create fallback - no DR container found');
      if (hudElement) updateHUDMessage('⚠️ No Diary Room container found');
      return;
    }
    
    // Create fallback entry
    const fallback = document.createElement('div');
    fallback.className = 'diary-entry social-entry fallback-entry';
    fallback.dataset.entryId = entryId;
    fallback.dataset.fallback = 'true';
    
    // Create content using DOM methods (safer than innerHTML)
    const content = document.createElement('div');
    content.className = 'entry-content';
    
    const icon = document.createElement('span');
    icon.className = 'entry-icon';
    icon.textContent = '🔒';
    
    const text = document.createElement('span');
    text.className = 'entry-text';
    text.textContent = 'Hidden social interaction (entry not found in standard location)';
    
    content.appendChild(icon);
    content.appendChild(text);
    fallback.appendChild(content);
    
    // Add CTA
    attachCTAToEntry(fallback, entryId, spendPrompt, detailedText);
    
    // Append to container
    container.appendChild(fallback);
    
    console.info('[social-ui-adapter] Created fallback entry for', entryId);
    if (hudElement) updateHUDMessage(`✓ Created fallback entry: ${entryId}`);
  }

  /**
   * Handle spend button click
   */
  function handleSpendClick(entryId, entryEl, spendPrompt, detailedText) {
    const playerId = getLocalPlayerId();
    const cost = spendPrompt.cost || 1;
    
    if (!playerId) {
      console.warn('[social-ui-adapter] No local player ID found');
      if (hudElement) updateHUDMessage('⚠️ No local player ID');
      return;
    }
    
    // Check if already revealed
    if (revealedEntries.has(entryId)) {
      console.warn('[social-ui-adapter] Entry already revealed:', entryId);
      return;
    }
    
    // Emit attempt event
    emitEvent('social.spend:attempt', { entryId, playerId, cost });
    
    // Check affordability
    if (!canAfford(playerId, cost)) {
      console.warn('[social-ui-adapter] Cannot afford:', cost, 'energy');
      if (hudElement) updateHUDMessage(`⚠️ Not enough energy (need ${cost})`);
      emitEvent('social.spend:fail', { entryId, playerId, cost, reason: 'insufficient_funds' });
      
      // Visual feedback
      const cta = entryEl.querySelector('.social-spend-cta');
      if (cta) {
        cta.style.background = 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
        cta.textContent = '❌ Not enough energy';
        setTimeout(() => {
          cta.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
          cta.textContent = spendPrompt.text || '💎 Reveal details';
        }, 1500);
      }
      return;
    }
    
    // Deduct energy
    const success = deductEnergy(playerId, cost);
    
    if (!success) {
      console.error('[social-ui-adapter] Failed to deduct energy');
      if (hudElement) updateHUDMessage('⚠️ Deduction failed');
      emitEvent('social.spend:fail', { entryId, playerId, cost, reason: 'deduction_failed' });
      return;
    }
    
    // Mark as revealed
    revealedEntries.add(entryId);
    
    // Emit success event
    emitEvent('social.spend:success', { entryId, playerId, cost });
    
    // Reveal detailed text
    revealDetailedText(entryEl, detailedText);
    
    // Update HUD
    if (hudElement) updateHUDMessage(`✅ Revealed: ${entryId} (-${cost} energy)`);
    
    console.info('[social-ui-adapter] ✓ Spent', cost, 'energy to reveal', entryId);
  }

  /**
   * Reveal detailed text in entry
   */
  function revealDetailedText(entryEl, detailedText) {
    // Remove CTA
    const cta = entryEl.querySelector('.social-spend-cta');
    if (cta) {
      cta.remove();
    }
    
    // Create revealed content container using DOM methods
    const revealedDiv = document.createElement('div');
    revealedDiv.className = 'social-revealed-content';
    
    const label = document.createElement('div');
    label.className = 'revealed-label';
    label.textContent = '💎 Revealed Details:';
    
    const text = document.createElement('div');
    text.className = 'revealed-text';
    text.textContent = detailedText || 'No additional details available.';
    
    revealedDiv.appendChild(label);
    revealedDiv.appendChild(text);
    
    // Style
    revealedDiv.style.cssText = `
      margin-top: 8px;
      padding: 8px 12px;
      background: rgba(102, 126, 234, 0.1);
      border-left: 3px solid #667eea;
      border-radius: 4px;
      font-size: 0.85rem;
      line-height: 1.4;
    `;
    
    label.style.cssText = `
      font-weight: 600;
      color: #667eea;
      margin-bottom: 4px;
    `;
    
    text.style.cssText = `
      white-space: pre-wrap;
      color: var(--ink, #333);
    `;
    
    // Append to entry
    entryEl.appendChild(revealedDiv);
    
    // Emit reveal event
    emitEvent('social.reveal:exposed', { 
      entryId: entryEl.dataset.entryId, 
      detailedText 
    });
    
    // Animate reveal
    revealedDiv.style.opacity = '0';
    revealedDiv.style.transform = 'translateY(-10px)';
    
    requestAnimationFrame(() => {
      revealedDiv.style.transition = 'all 0.3s ease';
      revealedDiv.style.opacity = '1';
      revealedDiv.style.transform = 'translateY(0)';
    });
  }

  // ============================================================================
  // EVENT EMISSION
  // ============================================================================

  /**
   * Emit events on both bus and window
   */
  function emitEvent(eventName, data) {
    // Emit on game bus if available
    if (global.game?.bus && typeof global.game.bus.emit === 'function') {
      global.game.bus.emit(eventName, data);
    }
    
    // Emit on window for broader compatibility
    const event = new CustomEvent(eventName, { detail: data });
    window.dispatchEvent(event);
    
    console.debug('[social-ui-adapter] Emitted:', eventName, data);
  }

  // ============================================================================
  // EVENT LISTENERS
  // ============================================================================

  /**
   * Listen for enriched social events
   */
  function setupEventListeners() {
    // Listen on game bus if available
    if (global.game?.bus && typeof global.game.bus.on === 'function') {
      global.game.bus.on('social.action:result', handleSocialActionResult);
      global.game.bus.on('social.entry:story', handleSocialEntryStory);
      console.info('[social-ui-adapter] Listening on game.bus');
    }
    
    // Also listen on window for broader compatibility
    window.addEventListener('social.action:result', (e) => handleSocialActionResult(e.detail));
    window.addEventListener('social.entry:story', (e) => handleSocialEntryStory(e.detail));
    console.info('[social-ui-adapter] Listening on window events');
  }

  /**
   * Handle social.action:result event
   */
  function handleSocialActionResult(payload) {
    console.debug('[social-ui-adapter] social.action:result:', payload);
    
    if (!payload) return;
    
    const { entryId, spendPrompt, detailedText } = payload;
    
    if (!spendPrompt || !entryId) {
      console.debug('[social-ui-adapter] No spendPrompt or entryId in payload');
      return;
    }
    
    // Track for HUD
    recentSpendables.push({
      entryId,
      spendPrompt,
      detailedText,
      timestamp: Date.now()
    });
    
    // Keep only last 10
    if (recentSpendables.length > 10) {
      recentSpendables.shift();
    }
    
    // Attach CTA with retry
    attachCTAToEntryWithRetry(entryId, spendPrompt, detailedText);
    
    // Update HUD
    if (hudElement) updateHUDMessage(`🔔 New spendable: ${entryId}`);
  }

  /**
   * Handle social.entry:story event
   */
  function handleSocialEntryStory(payload) {
    console.debug('[social-ui-adapter] social.entry:story:', payload);
    
    if (!payload) return;
    
    const { entryId, spendPrompt, detailedText } = payload;
    
    if (!spendPrompt || !entryId) {
      console.debug('[social-ui-adapter] No spendPrompt or entryId in story payload');
      return;
    }
    
    // Track for HUD
    recentSpendables.push({
      entryId,
      spendPrompt,
      detailedText,
      timestamp: Date.now()
    });
    
    // Keep only last 10
    if (recentSpendables.length > 10) {
      recentSpendables.shift();
    }
    
    // Attach CTA with retry
    attachCTAToEntryWithRetry(entryId, spendPrompt, detailedText);
    
    // Update HUD
    if (hudElement) updateHUDMessage(`🔔 New story entry: ${entryId}`);
  }

  // ============================================================================
  // DEBUG HUD (COLLAPSIBLE, NON-BLOCKING)
  // ============================================================================

  let hudElement = null;
  let hudVisible = false;
  let hudExpanded = false;

  /**
   * Create debug HUD (only if debugSocialHUD is enabled)
   */
  function createDebugHUD() {
    // Check if HUD should be visible
    if (!cfg.debugSocialHUD) {
      // Remove HUD if it exists
      if (hudElement) {
        hudElement.remove();
        hudElement = null;
      }
      return;
    }
    
    // Don't recreate if already exists
    if (hudElement) {
      hudElement.style.display = 'block';
      return;
    }
    
    // Create HUD container
    hudElement = document.createElement('div');
    hudElement.id = 'socialSpendDebugHUD';
    hudElement.className = 'social-spend-debug-hud';
    
    hudElement.innerHTML = `
      <div class="hud-toggle" id="hudToggle">
        <span class="hud-toggle-icon">🔧</span>
        <span class="hud-toggle-label">Social Spend Debug</span>
        <span class="hud-toggle-arrow">▼</span>
      </div>
      <div class="hud-panel" id="hudPanel" style="display: none;">
        <div class="hud-section">
          <div class="hud-section-title">Status</div>
          <div class="hud-message" id="hudMessage">Ready</div>
        </div>
        <div class="hud-section">
          <div class="hud-section-title">Mock Bank Controls</div>
          <div class="hud-controls">
            <label>
              Player ID: <input type="text" id="hudPlayerId" placeholder="p1" style="width: 80px;">
            </label>
            <label>
              Energy: <input type="number" id="hudEnergy" value="10" min="0" max="100" style="width: 60px;">
            </label>
            <button id="hudSetEnergy" class="hud-btn">Set Energy</button>
          </div>
        </div>
        <div class="hud-section">
          <div class="hud-section-title">Debug Actions</div>
          <div class="hud-controls">
            <button id="hudTestAttach" class="hud-btn">Test CTA Attach</button>
            <button id="hudClearRevealed" class="hud-btn">Clear Revealed</button>
            <button id="hudRefresh" class="hud-btn">Refresh HUD</button>
          </div>
        </div>
        <div class="hud-section">
          <div class="hud-section-title">Recent Spendables (${recentSpendables.length})</div>
          <div class="hud-spendables" id="hudSpendables"></div>
        </div>
      </div>
    `;
    
    // Style the HUD
    hudElement.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: rgba(20, 20, 30, 0.95);
      color: #fff;
      border: 1px solid rgba(102, 126, 234, 0.5);
      border-radius: 8px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
      z-index: 10000;
      font-family: monospace;
      font-size: 12px;
      max-width: 400px;
      min-width: 250px;
    `;
    
    // Append to body
    document.body.appendChild(hudElement);
    
    // Setup toggle behavior
    const toggle = hudElement.querySelector('#hudToggle');
    const panel = hudElement.querySelector('#hudPanel');
    const arrow = hudElement.querySelector('.hud-toggle-arrow');
    
    toggle.style.cssText = `
      padding: 8px 12px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      user-select: none;
    `;
    
    toggle.addEventListener('click', () => {
      hudExpanded = !hudExpanded;
      panel.style.display = hudExpanded ? 'block' : 'none';
      arrow.textContent = hudExpanded ? '▲' : '▼';
    });
    
    // Setup controls
    setupHUDControls();
    
    console.info('[social-ui-adapter] Debug HUD created');
  }

  /**
   * Setup HUD control handlers
   */
  function setupHUDControls() {
    if (!hudElement) return;
    
    // Set energy button
    const setEnergyBtn = hudElement.querySelector('#hudSetEnergy');
    if (setEnergyBtn) {
      setEnergyBtn.addEventListener('click', () => {
        const playerId = hudElement.querySelector('#hudPlayerId').value || 'p1';
        const energy = parseInt(hudElement.querySelector('#hudEnergy').value) || 0;
        global.__smDebug.fakeBank.set(playerId, energy);
        updateHUDMessage(`✓ Set ${playerId} energy to ${energy}`);
      });
    }
    
    // Test attach button
    const testAttachBtn = hudElement.querySelector('#hudTestAttach');
    if (testAttachBtn) {
      testAttachBtn.addEventListener('click', () => {
        const testId = 'test-' + Date.now();
        attachCTAToEntryWithRetry(testId, { text: '💎 Test CTA', cost: 1 }, 'Test detailed text');
        updateHUDMessage(`🔧 Testing CTA attach: ${testId}`);
      });
    }
    
    // Clear revealed button
    const clearBtn = hudElement.querySelector('#hudClearRevealed');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        revealedEntries.clear();
        updateHUDMessage('✓ Cleared revealed entries');
      });
    }
    
    // Refresh button
    const refreshBtn = hudElement.querySelector('#hudRefresh');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        refreshHUD();
      });
    }
    
    // Style buttons
    const buttons = hudElement.querySelectorAll('.hud-btn');
    buttons.forEach(btn => {
      btn.style.cssText = `
        padding: 4px 8px;
        font-size: 11px;
        background: rgba(102, 126, 234, 0.8);
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        margin: 2px;
      `;
      
      btn.addEventListener('mouseenter', () => {
        btn.style.background = 'rgba(102, 126, 234, 1)';
      });
      
      btn.addEventListener('mouseleave', () => {
        btn.style.background = 'rgba(102, 126, 234, 0.8)';
      });
    });
  }

  /**
   * Update HUD status message
   */
  function updateHUDMessage(message) {
    if (!hudElement) return;
    
    const msgEl = hudElement.querySelector('#hudMessage');
    if (msgEl) {
      msgEl.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    }
    
    // Update spendables list using DOM methods to avoid XSS
    const spendablesEl = hudElement.querySelector('#hudSpendables');
    if (spendablesEl) {
      // Clear existing content
      spendablesEl.innerHTML = '';
      
      if (recentSpendables.length === 0) {
        const emptyDiv = document.createElement('div');
        emptyDiv.style.cssText = 'padding: 4px; opacity: 0.5;';
        emptyDiv.textContent = 'No recent spendables';
        spendablesEl.appendChild(emptyDiv);
      } else {
        recentSpendables.forEach((s, i) => {
          const itemDiv = document.createElement('div');
          itemDiv.style.cssText = 'padding: 4px; border-bottom: 1px solid rgba(255,255,255,0.1);';
          // Use textContent to safely render user data
          itemDiv.textContent = `${i + 1}. ${s.entryId} - ${s.spendPrompt.text || 'Reveal'} (${s.spendPrompt.cost || 1} energy)`;
          spendablesEl.appendChild(itemDiv);
        });
      }
    }
  }

  /**
   * Refresh HUD visibility and content
   */
  function refreshHUD() {
    if (cfg.debugSocialHUD) {
      createDebugHUD();
      if (hudElement) updateHUDMessage('🔄 HUD refreshed');
    } else {
      if (hudElement) {
        hudElement.remove();
        hudElement = null;
      }
    }
    
    console.info('[social-ui-adapter] HUD refreshed, debugSocialHUD=', cfg.debugSocialHUD);
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  const SocialUIAdapter = {
    /**
     * Reset adapter state
     */
    reset() {
      revealedEntries.clear();
      recentSpendables.length = 0;
      console.info('[social-ui-adapter] Reset');
    },
    
    /**
     * Set mock energy for testing
     */
    setMockEnergy(playerId, amount) {
      global.__smDebug.fakeBank.set(playerId, amount);
      console.info('[social-ui-adapter] Set mock energy:', playerId, '=', amount);
      if (hudElement) updateHUDMessage(`✓ Mock energy: ${playerId} = ${amount}`);
    },
    
    /**
     * Get list of revealed entries
     */
    getRevealed() {
      return Array.from(revealedEntries);
    },
    
    /**
     * Refresh HUD
     */
    refreshHUD() {
      refreshHUD();
    },
    
    /**
     * Get recent spendables
     */
    getRecentSpendables() {
      return [...recentSpendables];
    }
  };

  // Expose globally
  global.SocialUIAdapter = SocialUIAdapter;

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  // Setup event listeners
  setupEventListeners();

  // Create HUD if enabled
  if (cfg.debugSocialHUD) {
    // Delay HUD creation slightly to ensure DOM is ready
    setTimeout(() => {
      createDebugHUD();
      if (hudElement) updateHUDMessage('✓ Social UI Adapter ready');
    }, 500);
  }

  console.info('[social-ui-adapter] ✓ Initialization complete');

})(window);
