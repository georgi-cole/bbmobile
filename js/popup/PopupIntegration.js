// MODULE: popup/PopupIntegration.js
// Integration hooks for popup system with main game

(function(global){
  'use strict';

  // Show welcome popup on game start (if feature enabled)
  function showGameStartWelcome(){
    const cfg = global.game?.cfg || {};
    
    if(!cfg.popup_refresh_enabled){
      return; // Feature disabled, don't show
    }

    if(!global.createBasePopup || !global.PopupManager){
      console.warn('[PopupIntegration] Popup system not loaded');
      return;
    }

    // Check if already shown this session
    if(sessionStorage.getItem('bb_welcome_shown')){
      return;
    }

    // Mark as shown
    sessionStorage.setItem('bb_welcome_shown', 'true');

    // Show welcome popup after a short delay
    setTimeout(() => {
      global.PopupManager.enqueue(() => {
        return global.createBasePopup({
          id: 'game-welcome',
          headerText: '🎉 Welcome to Big Brother Mobile',
          bodyContent: `
            <div style="text-align: center;">
              <p style="font-size: 1.1rem; margin-bottom: 16px;">
                Ready to compete for the grand prize?
              </p>
              <p style="margin-bottom: 12px;">
                • Win competitions as Head of Household<br>
                • Strategize nominations and Power of Veto<br>
                • Navigate social dynamics and alliances<br>
                • Vote to evict and survive to the end
              </p>
              <p style="color: var(--muted); font-size: 0.85rem; margin-top: 16px;">
                Tip: You can customize game settings, timers, and visuals in the Settings panel.
              </p>
            </div>
          `,
          footerContent: `
            <button class="btn" id="welcomeStartBtn" style="min-width: 120px;">Let's Play!</button>
          `,
          onClose: () => {
            console.log('[PopupIntegration] Welcome popup closed');
          }
        });
      });

      // Add click handler for start button
      setTimeout(() => {
        const startBtn = document.getElementById('welcomeStartBtn');
        if(startBtn){
          startBtn.addEventListener('click', () => {
            global.PopupManager.close();
          });
        }
      }, 100);
    }, 500);
  }

  // Hook into game start
  function hookGameStart(){
    const startBtn = document.getElementById('btnStartQuick');
    if(startBtn && !startBtn.__popupHooked){
      startBtn.__popupHooked = true;
      
      // Store original handler
      const originalHandler = startBtn.onclick;
      
      // Wrap with welcome popup
      startBtn.onclick = function(e){
        showGameStartWelcome();
        
        // Call original handler
        if(originalHandler){
          originalHandler.call(this, e);
        }
      };
    }
  }

  // Show info popup (can be called from anywhere)
  function showInfoPopup(title, message){
    const cfg = global.game?.cfg || {};
    
    if(!cfg.popup_refresh_enabled){
      // Fall back to legacy card
      if(typeof global.showCard === 'function'){
        global.showCard(title, [message], 'neutral', 3500);
      }
      return;
    }

    if(!global.createBasePopup || !global.PopupManager){
      console.warn('[PopupIntegration] Popup system not loaded');
      return;
    }

    global.PopupManager.enqueue(() => {
      return global.createBasePopup({
        headerText: title,
        bodyContent: `<p style="text-align: center;">${message}</p>`,
        footerContent: '<button class="btn" onclick="PopupManager.close()">OK</button>'
      });
    });
  }

  // Show confirmation popup
  function showConfirmPopup(title, message, onConfirm, onCancel){
    const cfg = global.game?.cfg || {};
    
    if(!cfg.popup_refresh_enabled){
      // Fall back to built-in confirm
      if(confirm(message)){
        if(onConfirm) onConfirm();
      } else {
        if(onCancel) onCancel();
      }
      return;
    }

    if(!global.createBasePopup || !global.PopupManager){
      console.warn('[PopupIntegration] Popup system not loaded');
      if(confirm(message)){
        if(onConfirm) onConfirm();
      } else {
        if(onCancel) onCancel();
      }
      return;
    }

    global.PopupManager.enqueue(() => {
      const popup = global.createBasePopup({
        headerText: title,
        bodyContent: `<p style="text-align: center;">${message}</p>`,
        footerContent: `
          <button class="btn secondary" id="cancelConfirmBtn">Cancel</button>
          <button class="btn" id="confirmConfirmBtn">Confirm</button>
        `,
        closeOnBackdrop: false,
        closeOnEsc: false
      });

      setTimeout(() => {
        document.getElementById('confirmConfirmBtn')?.addEventListener('click', () => {
          global.PopupManager.close();
          if(onConfirm) onConfirm();
        });
        
        document.getElementById('cancelConfirmBtn')?.addEventListener('click', () => {
          global.PopupManager.close();
          if(onCancel) onCancel();
        });
      }, 100);

      return popup;
    });
  }

  // Initialize on DOM ready
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', hookGameStart);
  } else {
    hookGameStart();
  }

  // Export functions
  global.showInfoPopup = showInfoPopup;
  global.showConfirmPopup = showConfirmPopup;

})(window);
