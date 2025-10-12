// MODULE: popup/PopupMigrationHelpers.js
// Helper functions to migrate from showCard to BasePopup/PopupManager

(function(global){
  'use strict';

  /**
   * Create a simple info popup from showCard-like parameters
   * @param {string} title - Popup title
   * @param {Array<string>} lines - Content lines
   * @param {string} tone - Visual tone (neutral, good, bad, etc.)
   * @param {number} duration - Auto-close duration (ms, 0 = no auto-close)
   * @param {Object} options - Additional options
   * @returns {HTMLElement} Popup element
   */
  function createInfoPopupFromCard(title, lines = [], tone = 'neutral', duration = 0, options = {}){
    // Build body content from lines
    const bodyContent = lines.map(line => `<p style="margin: 0.5em 0;">${line}</p>`).join('');
    
    // Determine theme styling based on tone
    let headerStyle = '';
    if(tone === 'good' || tone === 'winner'){
      headerStyle = 'background: var(--good); color: #0d151f;';
    } else if(tone === 'bad' || tone === 'danger'){
      headerStyle = 'background: var(--bad); color: #fff;';
    } else if(tone === 'live'){
      headerStyle = 'background: var(--live); color: #fff;';
    } else if(tone === 'noms'){
      headerStyle = 'background: var(--accent); color: #0d151f;';
    }
    
    // Create popup
    const popup = global.createBasePopup({
      id: options.id || 'info-popup-' + Date.now(),
      headerText: title,
      bodyContent: bodyContent,
      footerContent: duration > 0 ? '' : '<button class="btn" onclick="PopupManager.close()">OK</button>',
      closeOnBackdrop: true,
      closeOnEsc: true,
      showCloseButton: duration === 0,
      onClose: options.onClose
    });
    
    // Apply custom header styling if tone specified
    if(headerStyle){
      const header = popup.querySelector('.base-popup-header');
      if(header){
        header.style.cssText += headerStyle;
      }
    }
    
    // Auto-close after duration
    if(duration > 0){
      setTimeout(() => {
        if(popup.__closePopup){
          popup.__closePopup('auto');
        }
      }, duration);
    }
    
    return popup;
  }

  /**
   * Migration wrapper for showCard that uses new popup system when enabled
   * @param {string} title - Popup title
   * @param {Array<string>} lines - Content lines
   * @param {string} tone - Visual tone
   * @param {number} duration - Auto-close duration (ms)
   * @param {boolean} uniform - Ignored (legacy parameter)
   * @param {Object} options - Additional options (popupType for telemetry)
   */
  function migratedShowCard(title, lines = [], tone = 'neutral', duration = 4200, uniform = false, options = {}){
    const cfg = global.game?.cfg || {};
    
    // Check feature flag
    if(!cfg.popup_refresh_enabled){
      // Fall back to legacy showCard
      if(typeof global.UI?.showCard === 'function'){
        global.UI.showCard(title, lines, tone, duration, uniform);
      } else if(typeof global.showCard === 'function'){
        global.showCard(title, lines, tone, duration, uniform);
      }
      return;
    }
    
    // Use new popup system
    if(global.PopupManager && global.createBasePopup){
      global.PopupManager.enqueue(() => {
        return createInfoPopupFromCard(title, lines, tone, duration, options);
      }, {
        popupType: options.popupType || 'info_card',
        id: options.id
      });
    } else {
      console.warn('[PopupMigrationHelpers] PopupManager or createBasePopup not available');
      // Fallback to legacy
      if(typeof global.UI?.showCard === 'function'){
        global.UI.showCard(title, lines, tone, duration, uniform);
      } else if(typeof global.showCard === 'function'){
        global.showCard(title, lines, tone, duration, uniform);
      }
    }
  }

  /**
   * Migration wrapper for showBigCard
   * @param {string} title - Popup title
   * @param {Array<string>} lines - Content lines
   * @param {number} duration - Auto-close duration (ms)
   * @param {Object} options - Additional options
   * @returns {Promise} Resolves when popup closes
   */
  function migratedShowBigCard(title, lines = [], duration = 2600, options = {}){
    return new Promise(resolve => {
      const cfg = global.game?.cfg || {};
      
      // Check feature flag
      if(!cfg.popup_refresh_enabled){
        // Fall back to legacy showBigCard
        if(typeof global.UI?.showBigCard === 'function'){
          global.UI.showBigCard(title, lines, duration).then(resolve);
        } else if(typeof global.showBigCard === 'function'){
          global.showBigCard(title, lines, duration).then(resolve);
        } else {
          resolve();
        }
        return;
      }
      
      // Use new popup system with larger styling
      if(global.PopupManager && global.createBasePopup){
        global.PopupManager.enqueue(() => {
          const popup = createInfoPopupFromCard(title, lines, 'neutral', duration, {
            ...options,
            onClose: () => {
              if(options.onClose) options.onClose();
              resolve();
            }
          });
          
          // Make it bigger
          const popupCard = popup.querySelector('.base-popup');
          if(popupCard){
            popupCard.style.fontSize = '1.2rem';
            popupCard.style.maxWidth = 'min(900px, 94vw)';
          }
          
          return popup;
        }, {
          popupType: options.popupType || 'big_card',
          id: options.id
        });
      } else {
        console.warn('[PopupMigrationHelpers] PopupManager or createBasePopup not available');
        resolve();
      }
    });
  }

  /**
   * Create a decision popup with multiple action buttons
   * @param {Object} options - Configuration
   * @param {string} options.title - Popup title
   * @param {string} options.message - Body message
   * @param {Array<Object>} options.actions - Action buttons [{label, theme, callback}]
   * @param {string} options.popupType - Type for telemetry
   * @returns {HTMLElement} Popup element
   */
  function createDecisionPopup(options = {}){
    const {
      title = 'Decision',
      message = '',
      actions = [],
      popupType = 'decision'
    } = options;
    
    // Create footer with action buttons
    const footer = document.createElement('div');
    footer.style.cssText = `
      display: flex;
      gap: 12px;
      justify-content: center;
      flex-wrap: wrap;
    `;
    
    actions.forEach(action => {
      const button = document.createElement('button');
      button.className = 'btn';
      button.textContent = action.label || 'OK';
      button.setAttribute('type', 'button');
      
      // Apply theme-based styling using tokens
      let bgColor = 'var(--primary-3)';
      let textColor = 'var(--ink)';
      let hoverColor = 'var(--accent)';
      
      if(action.theme === 'accept' || action.theme === 'good'){
        bgColor = 'var(--good)';
        textColor = '#0d151f';
        hoverColor = '#5ec276';
      } else if(action.theme === 'refuse' || action.theme === 'bad'){
        bgColor = 'var(--bad)';
        textColor = '#fff';
        hoverColor = '#ff5555';
      }
      
      button.style.cssText = `
        background: ${bgColor};
        color: ${textColor};
        border: none;
        padding: 12px 28px;
        border-radius: 10px;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        min-width: 120px;
      `;
      
      button.addEventListener('mouseenter', () => {
        button.style.background = hoverColor;
        button.style.transform = 'translateY(-2px)';
        button.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
      });
      
      button.addEventListener('mouseleave', () => {
        button.style.background = bgColor;
        button.style.transform = 'translateY(0)';
        button.style.boxShadow = 'none';
      });
      
      button.addEventListener('click', () => {
        // Log telemetry
        if(global.PopupTelemetry){
          global.PopupTelemetry.logPopupDecision(popupType, action.label || 'unknown');
        }
        
        // Execute callback
        if(typeof action.callback === 'function'){
          action.callback();
        }
        
        // Close popup
        if(global.PopupManager){
          global.PopupManager.close();
        }
      });
      
      footer.appendChild(button);
    });
    
    // Create popup
    return global.createBasePopup({
      id: 'decision-popup-' + Date.now(),
      headerText: title,
      bodyContent: `<p style="margin: 0;">${message}</p>`,
      footerContent: footer,
      closeOnBackdrop: false,
      closeOnEsc: true,
      showCloseButton: false
    });
  }

  // Export to global
  global.PopupMigrationHelpers = {
    createInfoPopupFromCard,
    migratedShowCard,
    migratedShowBigCard,
    createDecisionPopup
  };

})(window);
