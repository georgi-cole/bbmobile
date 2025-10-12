// MODULE: popup/ExampleInfoPopup.js
// Example informational popup using BasePopup and PopupManager

(function(global){
  'use strict';

  /**
   * Show welcome info popup using new system
   */
  function showWelcomePopup(){
    const cfg = global.game?.cfg || {};
    
    // Check if new popup system is enabled
    if(!cfg.popup_refresh_enabled){
      // Fall back to legacy system
      if(typeof global.showCard === 'function'){
        global.showCard('Welcome', ['Welcome to Big Brother Mobile!', 'Use the new popup system in Settings.'], 'neutral', 3500);
      }
      return;
    }

    // Use new popup system
    if(!global.createBasePopup || !global.PopupManager){
      console.warn('[ExampleInfoPopup] New popup system not loaded');
      return;
    }

    global.PopupManager.enqueue(() => {
      return global.createBasePopup({
        id: 'welcome-popup',
        headerText: 'Welcome to Big Brother Mobile',
        bodyContent: `
          <div style="text-align: center;">
            <p style="font-size: 1.1rem; margin-bottom: 16px;">🎉 Welcome to the game!</p>
            <p style="margin-bottom: 12px;">
              This is an example of the new popup system with proper queuing, 
              accessibility features, and smooth animations.
            </p>
            <p style="color: var(--muted); font-size: 0.9rem;">
              Enable the new popup system in Settings → Gameplay to see this instead of legacy cards.
            </p>
          </div>
        `,
        footerContent: `
          <button class="btn" id="welcomeOkBtn" style="min-width: 100px;">Got it!</button>
        `,
        onClose: () => {
          console.log('[ExampleInfoPopup] Welcome popup closed');
        }
      });
    });

    // Add click handler for OK button (needs to be done after popup is rendered)
    setTimeout(() => {
      const okBtn = document.getElementById('welcomeOkBtn');
      if(okBtn){
        okBtn.addEventListener('click', () => {
          global.PopupManager.close();
        });
      }
    }, 100);
  }

  /**
   * Show game instructions popup
   */
  function showInstructionsPopup(){
    const cfg = global.game?.cfg || {};
    
    if(!cfg.popup_refresh_enabled){
      if(typeof global.showCard === 'function'){
        global.showCard('Instructions', ['Check the rules for game instructions.'], 'neutral', 3000);
      }
      return;
    }

    if(!global.createBasePopup || !global.PopupManager){
      console.warn('[ExampleInfoPopup] New popup system not loaded');
      return;
    }

    global.PopupManager.enqueue(() => {
      return global.createBasePopup({
        id: 'instructions-popup',
        headerText: 'Game Instructions',
        bodyContent: `
          <div>
            <h3 style="font-size: 1rem; margin-top: 0; color: var(--accent);">How to Play</h3>
            <ul style="text-align: left; line-height: 1.8;">
              <li>Click "Start Game" to begin a new season</li>
              <li>Compete in Head of Household competitions</li>
              <li>Nominate players for eviction</li>
              <li>Win Power of Veto to save players</li>
              <li>Vote to evict during live ceremonies</li>
              <li>Navigate social dynamics and strategic gameplay</li>
            </ul>
            <p style="margin-top: 16px; color: var(--muted); font-size: 0.9rem;">
              Use the Settings panel to customize timers, game rules, and visual options.
            </p>
          </div>
        `,
        footerContent: `
          <button class="btn" id="instructionsCloseBtn">Close</button>
        `,
        onClose: () => {
          console.log('[ExampleInfoPopup] Instructions popup closed');
        }
      });
    });

    setTimeout(() => {
      const closeBtn = document.getElementById('instructionsCloseBtn');
      if(closeBtn){
        closeBtn.addEventListener('click', () => {
          global.PopupManager.close();
        });
      }
    }, 100);
  }

  // Export functions
  global.showWelcomePopup = showWelcomePopup;
  global.showInstructionsPopup = showInstructionsPopup;

})(window);
