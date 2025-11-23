// MODULE: tv-inline-cards.js
// Utility API for creating ad-hoc inline cards in the TV overlay
// Provides spawnInlineCard() function for programmatic card creation
// with theme-aware styling, accessibility, and optional CardManager integration
//
// PR: Inline Card Standardization
// Created: 2025-11-23

(function(global){
  'use strict';

  /**
   * Ensure TV overlay scaffold exists.
   * Reuses ensureTVOverlay from TVCards if available, otherwise creates locally.
   * @returns {HTMLElement|null} The tvOverlayContent element
   */
  function ensureTVOverlayLocal(){
    // Try to use TVCards.ensureTVOverlay if available
    if(global.TVCards && global.TVCards.ensureTVOverlay){
      return global.TVCards.ensureTVOverlay();
    }
    
    // Fallback: create locally
    var tv = document.getElementById('tv');
    if(!tv){
      console.error('[TVInlineCards] Cannot ensure TV overlay - #tv element not found');
      return null;
    }
    
    var tvOverlay = document.getElementById('tvOverlay');
    if(!tvOverlay){
      tvOverlay = document.createElement('div');
      tvOverlay.id = 'tvOverlay';
      var viewport = tv.querySelector('.tvViewport');
      if(viewport){
        viewport.appendChild(tvOverlay);
      } else {
        tv.appendChild(tvOverlay);
      }
    }
    
    if(!tv.classList.contains('tvTall')){
      tv.classList.add('tvTall');
    }
    
    var content = tvOverlay.querySelector('.tvOverlayContent');
    if(!content){
      content = document.createElement('div');
      content.className = 'tvOverlayContent';
      tvOverlay.appendChild(content);
    }
    
    return content;
  }

  /**
   * Calculate luminance of a color to determine if text should be light or dark
   * @param {string} color - CSS color value
   * @returns {number} Relative luminance (0-1)
   */
  function getRelativeLuminance(color){
    // Simple approximation - for more accuracy, parse RGB and apply formula
    // This is a simplified check; for production, use proper color parsing
    return 0.5; // Default to medium luminance (use dark text)
  }

  /**
   * Spawn an inline card in the TV overlay
   * @param {Object} options - Card configuration
   * @param {string} options.title - Card title (required)
   * @param {string|string[]} [options.body] - Card body content (string or array of strings)
   * @param {Array<{label: string, onClick: Function, primary?: boolean}>} [options.actions] - Action buttons
   * @param {string} [options.kind='info'] - Card kind: 'info', 'warning', 'success', 'error'
   * @param {boolean} [options.managed=false] - Whether to use CardManager for lifecycle
   * @param {boolean} [options.dismissible=true] - Whether card can be dismissed with ESC
   * @param {number} [options.duration] - Auto-dismiss duration in ms (0 = no auto-dismiss)
   * @returns {Object} { element: HTMLElement, dismiss: Function }
   */
  function spawnInlineCard(options){
    if(!options || !options.title){
      console.error('[TVInlineCards] spawnInlineCard requires options.title');
      return null;
    }

    var container = ensureTVOverlayLocal();
    if(!container){
      console.error('[TVInlineCards] Could not ensure TV overlay');
      return null;
    }

    var kind = options.kind || 'info';
    var managed = options.managed !== undefined ? options.managed : false;
    var dismissible = options.dismissible !== undefined ? options.dismissible : true;
    var duration = options.duration || 0;

    // Create card element
    var card = document.createElement('div');
    card.className = 'tv-inline-card';
    card.setAttribute('data-ephemeral', 'true');
    card.setAttribute('data-ui-card', 'true');
    card.setAttribute('tabindex', '0');
    
    // Set ARIA role based on content
    if(options.actions && options.actions.length > 0){
      card.setAttribute('role', 'dialog');
      card.setAttribute('aria-label', options.title);
    } else {
      card.setAttribute('role', 'status');
      card.setAttribute('aria-live', 'polite');
      card.setAttribute('aria-atomic', 'true');
    }
    
    if(dismissible){
      card.setAttribute('data-dismissible', 'true');
    }

    // Add title
    var title = document.createElement('h3');
    title.className = 'title';
    title.textContent = options.title;
    card.appendChild(title);

    // Add body content if provided
    if(options.body){
      var bodyArray = Array.isArray(options.body) ? options.body : [options.body];
      for(var i = 0; i < bodyArray.length; i++){
        var p = document.createElement('p');
        p.className = 'body';
        if(i === 0) p.classList.add('big');
        p.textContent = bodyArray[i];
        card.appendChild(p);
      }
    }

    // Add actions if provided
    if(options.actions && options.actions.length > 0){
      var actionsDiv = document.createElement('div');
      actionsDiv.className = 'actions';
      
      for(var j = 0; j < options.actions.length; j++){
        (function(action, index){
          var btn = document.createElement('button');
          btn.textContent = action.label;
          if(action.primary) btn.classList.add('primary');
          btn.setAttribute('tabindex', '0');
          btn.onclick = function(){
            if(action.onClick){
              action.onClick();
            }
          };
          actionsDiv.appendChild(btn);
        })(options.actions[j], j);
      }
      
      card.appendChild(actionsDiv);
    }

    // Dismiss function
    var dismissCallback = null;
    var dismissed = false;
    
    function dismiss(){
      if(dismissed) return;
      dismissed = true;
      
      card.style.opacity = '0';
      card.style.transform = 'translateY(-8px) scale(0.98)';
      card.style.transition = 'all 0.2s ease';
      
      setTimeout(function(){
        if(card.parentNode){
          card.remove();
        }
        
        var tv = document.getElementById('tv');
        if(tv && container && container.childElementCount === 0){
          tv.classList.remove('tvTall');
        }
        
        if(dismissCallback){
          dismissCallback();
        }
      }, 200);
    }

    // ESC key handler for dismissible cards
    if(dismissible){
      var escHandler = function(e){
        if(e.key === 'Escape' || e.key === 'Esc'){
          dismiss();
          document.removeEventListener('keydown', escHandler);
        }
      };
      document.addEventListener('keydown', escHandler);
      
      // Store handler for cleanup
      card._escHandler = escHandler;
    }

    // Auto-dismiss timeout if duration specified
    var timeoutId = null;
    if(duration > 0){
      var normalizedDuration = global.normalizeDuration ? global.normalizeDuration(duration) : duration;
      timeoutId = setTimeout(function(){
        dismiss();
      }, normalizedDuration);
    }

    // Integrate with CardManager if requested and available
    if(managed && global.CardManager){
      global.CardManager.show(function(){
        container.innerHTML = ''; // Clear existing content
        container.appendChild(card);
        
        var tv = document.getElementById('tv');
        if(tv) tv.classList.add('tvTall');
        
        return { card: card, timeout: timeoutId };
      });
    } else {
      // Direct append without CardManager
      container.appendChild(card);
      
      var tv = document.getElementById('tv');
      if(tv) tv.classList.add('tvTall');
    }

    // Focus the card for accessibility
    setTimeout(function(){
      card.focus();
    }, 100);

    // Return card element and dismiss function
    return {
      element: card,
      dismiss: dismiss,
      onDismiss: function(callback){
        dismissCallback = callback;
      }
    };
  }

  /**
   * Clear all inline cards from the TV overlay
   */
  function clearAllInlineCards(){
    var content = document.querySelector('.tvOverlayContent');
    if(content){
      // Remove all cards with ESC handlers
      var cards = content.querySelectorAll('.tv-inline-card[data-dismissible="true"]');
      for(var i = 0; i < cards.length; i++){
        if(cards[i]._escHandler){
          document.removeEventListener('keydown', cards[i]._escHandler);
        }
      }
      
      content.innerHTML = '';
      
      var tv = document.getElementById('tv');
      if(tv) tv.classList.remove('tvTall');
    }
  }

  // Export to global namespace
  global.spawnInlineCard = spawnInlineCard;
  global.clearAllInlineCards = clearAllInlineCards;

  // Also export as module-style object
  if(!global.TVInlineCards){
    global.TVInlineCards = {
      spawn: spawnInlineCard,
      clearAll: clearAllInlineCards
    };
  }

  console.info('[TVInlineCards] Module loaded');

})(typeof window !== 'undefined' ? window : global);
