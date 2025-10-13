// MODULE: popup/PopupIntegration.js
// Integration hooks for popup system with main game

(function(global){
  'use strict';

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

  // Export functions
  global.showInfoPopup = showInfoPopup;
  global.showConfirmPopup = showConfirmPopup;

})(window);
