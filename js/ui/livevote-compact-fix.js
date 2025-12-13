// MODULE: livevote-compact-fix.js
// Runtime shim to adjust existing livevote overlays for compact layout
// Uses MutationObserver to detect overlays and apply compact positioning
// Moves the global Evict CTA inline under selected items

(function(global) {
  'use strict';

  const STATE = {
    observer: null,
    globalCTA: null,
    lastSelectedItem: null,
    inlineButtons: new Map() // Track inline fallback buttons per item
  };

  /**
   * Compact a nominee item to fixed height with relative positioning
   * @param {HTMLElement} item - Nominee item element
   */
  function compactNomineeItem(item) {
    if (!item || item.dataset.compacted === 'true') return;

    // Apply compact styles
    item.style.position = 'relative';
    item.style.height = '120px';
    item.style.display = 'flex';
    item.style.flexDirection = 'column';
    item.style.alignItems = 'center';
    item.style.gap = '4px';
    item.style.padding = '6px';
    
    // Mark as compacted
    item.dataset.compacted = 'true';
    
    console.debug('[livevote-compact-fix] Compacted nominee item:', item);
  }

  /**
   * Move the global Evict CTA inline under the selected item
   * @param {HTMLElement} selectedItem - Selected nominee item
   * @param {HTMLElement} globalCTA - Global Evict button
   */
  function moveGlobalCTAInline(selectedItem, globalCTA) {
    if (!selectedItem || !globalCTA) return;

    // If CTA is already inline with this item, skip
    if (globalCTA.parentElement === selectedItem && globalCTA.dataset.inline === 'true') {
      return;
    }

    // Position CTA inline at bottom of selected item
    globalCTA.style.position = 'absolute';
    globalCTA.style.bottom = '8px';
    globalCTA.style.left = '50%';
    globalCTA.style.transform = 'translateX(-50%)';
    globalCTA.style.width = 'calc(100% - 12px)';
    globalCTA.style.minWidth = '60px';
    globalCTA.style.marginTop = '0';
    globalCTA.dataset.inline = 'true';

    // Move CTA into selected item
    selectedItem.appendChild(globalCTA);
    
    console.debug('[livevote-compact-fix] Moved global CTA inline:', selectedItem);
  }

  /**
   * Create an inline fallback button for an item
   * @param {HTMLElement} item - Nominee item element
   * @param {string} nomineeId - Nominee ID
   * @returns {HTMLElement} Created button
   */
  function createInlineFallbackButton(item, nomineeId) {
    const btn = document.createElement('button');
    btn.className = 'eviction-manager-evict-btn lv-compact-fallback-btn';
    btn.textContent = 'Evict';
    btn.style.display = 'none'; // Hidden until item is selected
    btn.style.position = 'absolute';
    btn.style.bottom = '8px';
    btn.style.left = '50%';
    btn.style.transform = 'translateX(-50%)';
    btn.style.width = 'calc(100% - 12px)';
    btn.style.minWidth = '60px';
    btn.style.padding = '4px 8px';
    btn.style.fontSize = '0.7rem';
    btn.style.fontWeight = '700';
    btn.style.textTransform = 'uppercase';
    btn.style.background = 'var(--danger-color, #dc3545)';
    btn.style.color = 'white';
    btn.style.border = 'none';
    btn.style.borderRadius = '6px';
    btn.style.cursor = 'pointer';
    btn.style.transition = 'all 0.2s ease';
    btn.style.marginTop = '0';
    btn.dataset.nomineeId = nomineeId;
    btn.dataset.fallback = 'true';

    // Add click handler
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      
      if (btn.disabled) return;
      
      console.debug('[livevote-compact-fix] Fallback button clicked:', nomineeId);
      
      // Disable button
      btn.disabled = true;
      btn.textContent = 'Voting...';
      
      try {
        // Emit event
        if (global.game?.bus?.emit) {
          global.game.bus.emit('eviction:vote', { nomineeId });
        }
        
        // Call onVote callback if available
        if (global.EvictionManager?.state?.onVote) {
          await global.EvictionManager.state.onVote(nomineeId);
        } else if (global.LiveVoteOverlay?.onVote) {
          await global.LiveVoteOverlay.onVote(nomineeId);
        }
        
        // Close UI on success
        setTimeout(() => {
          if (global.closeAllVoteUI) {
            global.closeAllVoteUI();
          }
        }, 300);
      } catch (err) {
        console.error('[livevote-compact-fix] Fallback button vote error:', err);
        
        // Re-enable on error
        btn.disabled = false;
        btn.textContent = 'Evict';
        
        // Show inline error
        showInlineError(item, 'Vote failed. Please try again.');
      }
    });

    item.appendChild(btn);
    STATE.inlineButtons.set(nomineeId, btn);
    
    console.debug('[livevote-compact-fix] Created inline fallback button:', nomineeId);
    
    return btn;
  }

  /**
   * Show inline error message
   * @param {HTMLElement} item - Item to show error near
   * @param {string} message - Error message
   */
  function showInlineError(item, message) {
    const error = document.createElement('div');
    error.className = 'lv-compact-inline-error';
    error.textContent = message;
    error.style.position = 'absolute';
    error.style.bottom = '-24px';
    error.style.left = '50%';
    error.style.transform = 'translateX(-50%)';
    error.style.background = 'var(--error-bg, #dc3545)';
    error.style.color = 'white';
    error.style.padding = '4px 8px';
    error.style.borderRadius = '4px';
    error.style.fontSize = '0.65rem';
    error.style.whiteSpace = 'nowrap';
    error.style.zIndex = '1000';
    
    item.style.position = 'relative';
    item.appendChild(error);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      if (error.parentElement) {
        error.remove();
      }
    }, 3000);
  }

  /**
   * Handle nominee item selection
   * @param {HTMLElement} item - Selected item
   */
  function handleItemSelection(item) {
    if (!item) return;

    const nomineeId = item.dataset.nomineeId || item.dataset.playerId;
    if (!nomineeId) {
      console.warn('[livevote-compact-fix] Item has no nominee ID:', item);
      return;
    }

    console.debug('[livevote-compact-fix] Item selected:', nomineeId);

    // Hide all inline buttons first
    STATE.inlineButtons.forEach(btn => {
      btn.style.display = 'none';
    });

    // Try to find and move global CTA
    const overlay = item.closest('.lv-overlay, .lv-root, .lv-choice-card');
    if (overlay) {
      // Look for global CTA
      const globalCTA = overlay.querySelector('.lv-cta-btn, .lv2-cta-btn, .lv-vote-btn, .eviction-manager-evict-btn:not([data-fallback])');
      
      if (globalCTA && !globalCTA.dataset.fallback) {
        STATE.globalCTA = globalCTA;
        moveGlobalCTAInline(item, globalCTA);
      } else {
        // No global CTA found, show or create inline fallback
        let inlineBtn = STATE.inlineButtons.get(nomineeId);
        
        if (!inlineBtn) {
          inlineBtn = createInlineFallbackButton(item, nomineeId);
        }
        
        inlineBtn.style.display = 'block';
      }
    }

    STATE.lastSelectedItem = item;
  }

  /**
   * Process a livevote overlay
   * @param {HTMLElement} overlay - Overlay element
   */
  function processOverlay(overlay) {
    if (!overlay || overlay.dataset.compactProcessed === 'true') return;

    console.debug('[livevote-compact-fix] Processing overlay:', overlay);

    // Mark as processed
    overlay.dataset.compactProcessed = 'true';

    // Compact all nominee items
    const itemSelectors = [
      '.lv2-contestant',
      '.lv-choice-card__nominee',
      '.eviction-manager-item',
      '.lv-nominee-item',
      '[data-nominee-id]',
      '[data-player-id]'
    ];

    itemSelectors.forEach(selector => {
      const items = overlay.querySelectorAll(selector);
      items.forEach(item => {
        compactNomineeItem(item);
        
        // Add selection listener
        if (!item.dataset.selectionListener) {
          item.addEventListener('click', () => {
            // Mark all items as unselected
            items.forEach(i => i.classList.remove('selected'));
            // Mark this item as selected
            item.classList.add('selected');
            
            handleItemSelection(item);
          });
          item.dataset.selectionListener = 'true';
        }
      });
    });

    // Set up observer for selection changes
    const selectionObserver = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const item = mutation.target;
          if (item.classList.contains('selected')) {
            handleItemSelection(item);
          }
        }
      });
    });

    // Observe all nominee items for class changes
    itemSelectors.forEach(selector => {
      const items = overlay.querySelectorAll(selector);
      items.forEach(item => {
        selectionObserver.observe(item, { attributes: true, attributeFilter: ['class'] });
      });
    });

    console.debug('[livevote-compact-fix] Overlay processed with compact layout');
  }

  /**
   * Start observing for livevote overlays
   */
  function startObserving() {
    if (STATE.observer) {
      console.debug('[livevote-compact-fix] Observer already running');
      return;
    }

    console.info('[livevote-compact-fix] Starting MutationObserver');

    STATE.observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType !== Node.ELEMENT_NODE) return;

          // Check if added node is a livevote overlay
          const overlaySelectors = [
            '.lv-overlay',
            '.lv-root',
            '.lv-choice-card',
            '.eviction-manager-root',
            '.lv2-3up',
            '[data-livevote-overlay]'
          ];

          for (const selector of overlaySelectors) {
            if (node.matches && node.matches(selector)) {
              processOverlay(node);
              break;
            }
            
            // Also check children
            const overlays = node.querySelectorAll && node.querySelectorAll(selector);
            if (overlays) {
              overlays.forEach(overlay => processOverlay(overlay));
            }
          }
        });
      });
    });

    STATE.observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Process any existing overlays
    const existingOverlays = document.querySelectorAll('.lv-overlay, .lv-root, .lv-choice-card, .eviction-manager-root, .lv2-3up, [data-livevote-overlay]');
    existingOverlays.forEach(overlay => processOverlay(overlay));
  }

  /**
   * Stop observing
   */
  function stopObserving() {
    if (STATE.observer) {
      STATE.observer.disconnect();
      STATE.observer = null;
      console.info('[livevote-compact-fix] Observer stopped');
    }
  }

  /**
   * Cleanup all inline buttons and state
   */
  function cleanup() {
    STATE.inlineButtons.forEach(btn => {
      if (btn.parentElement) {
        btn.remove();
      }
    });
    STATE.inlineButtons.clear();
    STATE.globalCTA = null;
    STATE.lastSelectedItem = null;
    
    console.debug('[livevote-compact-fix] Cleanup complete');
  }

  // Public API
  const LiveVoteCompactFix = {
    start: startObserving,
    stop: stopObserving,
    cleanup,
    processOverlay, // Expose for manual processing
    isActive: () => STATE.observer !== null
  };

  // Export to global scope
  global.LiveVoteCompactFix = LiveVoteCompactFix;

  // Auto-start on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startObserving);
  } else {
    startObserving();
  }

  console.info('[livevote-compact-fix] Module initialized');

})(window);
