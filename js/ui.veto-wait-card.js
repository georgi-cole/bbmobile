// MODULE: ui.veto-wait-card.js
// Compact inline card for veto non-participants offering optional intermission game
// Renders inside TV container for mobile-friendly UX
// API:
//   - window.showVetoWaitCard() - Display card with game offer
//   - window.dismissVetoWaitCard() - Remove card

(function(global){
  'use strict';

  // Configuration constants
  const FOCUS_DELAY_MS = 100;
  const FADE_OUT_DURATION_MS = 180;

  /**
   * Show veto wait card in TV container
   * Offers optional intermission game (Dots and Boxes) for non-participants
   * @param {Object} options - Configuration options (reserved for future use)
   */
  function showVetoWaitCard(options){
    const g = global.game;
    if(!g){
      console.warn('[veto-wait] game object not available');
      return;
    }

    // Prevent duplicate cards
    if(global.__vetoWaitCard){
      console.info('[veto-wait] Card already exists, skipping duplicate');
      return;
    }

    // Resolve TV container using centralized utility
    let tvContainer = null;
    if(global.TvContainer && typeof global.TvContainer.getTvContainer === 'function'){
      tvContainer = global.TvContainer.getTvContainer();
    } else {
      // Fallback: manual resolution
      tvContainer = document.querySelector('[data-faux-tv]') || 
                    document.querySelector('.tvViewport') || 
                    document.querySelector('#tv') ||
                    document.querySelector('#panel');
    }

    if(!tvContainer){
      console.warn('[veto-wait] TV container not found');
      return;
    }

    // Create card element
    const card = document.createElement('div');
    card.className = 'veto-wait-card';
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-labelledby', 'vetoWaitHeading');
    card.setAttribute('aria-describedby', 'vetoWaitDesc');

    // Build card content - keep it simple and compact
    card.innerHTML = `
      <div class="vwc-inner">
        <p id="vetoWaitHeading" class="vwc-heading">You are ineligible to compete.</p>
        <p id="vetoWaitDesc" class="vwc-desc">Play Dots and Boxes instead?</p>
        <div class="vwc-buttons">
          <button type="button" class="btn primary" aria-label="Yes, play game">Yes</button>
          <button type="button" class="btn" aria-label="No, just wait">No</button>
        </div>
      </div>
    `;

    // Append to TV container
    tvContainer.appendChild(card);
    global.__vetoWaitCard = card;

    // Wire up button event handlers
    const yesBtn = card.querySelector('.btn.primary');
    const noBtn = card.querySelector('.btn:not(.primary)');

    // Yes button: launch intermission game
    if(yesBtn){
      yesBtn.addEventListener('click', function(){
        console.info('[veto-wait] User chose to play intermission game');
        
        // Try multiple game launch strategies
        let gameLaunched = false;

        // Strategy 1: Use IntermissionFlow if available (preferred)
        if(global.IntermissionFlow && typeof global.IntermissionFlow.start === 'function'){
          console.info('[veto-wait] Launching via IntermissionFlow');
          global.IntermissionFlow.start({
            compType: 'Veto',
            gameType: 'dotsandboxes',
            onComplete: function(){
              console.info('[veto-wait] Intermission game completed');
            }
          });
          gameLaunched = true;
        }
        // Strategy 2: Try direct game start function
        else if(typeof global.startDotsAndBoxes === 'function'){
          console.info('[veto-wait] Launching via startDotsAndBoxes');
          global.startDotsAndBoxes();
          gameLaunched = true;
        }
        // Strategy 3: Try generic sidebar minigame launcher
        else if(typeof global.startSidebarMinigame === 'function'){
          console.info('[veto-wait] Launching via startSidebarMinigame');
          global.startSidebarMinigame('dots-and-boxes');
          gameLaunched = true;
        }

        if(!gameLaunched){
          console.warn('[veto-wait] No game launch method available');
          // Show user-friendly message
          if(typeof global.showCard === 'function'){
            global.showCard('Game Unavailable', ['Intermission game could not be started. Please wait for the competition to complete.'], 'info', 3000, true);
          }
        }

        // Dismiss the card regardless
        dismissVetoWaitCard();
      });
    }

    // No button: just dismiss card
    if(noBtn){
      noBtn.addEventListener('click', function(){
        console.info('[veto-wait] User chose to skip game');
        dismissVetoWaitCard();
      });
    }

    // Focus management: move focus to first button
    if(yesBtn){
      // Delay focus slightly to ensure card is rendered
      setTimeout(function(){
        yesBtn.focus();
      }, FOCUS_DELAY_MS);
    }

    console.info('[veto-wait] Card displayed');
  }

  /**
   * Dismiss veto wait card with fade-out animation
   */
  function dismissVetoWaitCard(){
    const card = global.__vetoWaitCard;
    if(!card){
      console.info('[veto-wait] No card to dismiss');
      return;
    }

    console.info('[veto-wait] Dismissing card');

    // Apply fade-out animation
    card.style.animation = 'vwcFadeOut ' + FADE_OUT_DURATION_MS + 'ms ease';

    // Remove from DOM after animation
    setTimeout(function(){
      if(card.parentNode){
        card.remove();
      }
      global.__vetoWaitCard = null;
    }, FADE_OUT_DURATION_MS);
  }

  // Export to global namespace
  global.showVetoWaitCard = showVetoWaitCard;
  global.dismissVetoWaitCard = dismissVetoWaitCard;

  console.info('[veto-wait] Module loaded');

})(window);
