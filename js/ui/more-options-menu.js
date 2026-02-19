// More Options Menu - integrates with GlobalPauseController

export const MoreOptionsMenu = (() => {
  const id = 'modal:more-options';
  let el = null;

  function init() {
    el = document.querySelector('#moreOptionsMenu');
    if (!el) return;
    el.addEventListener('open', onOpen);
    el.addEventListener('close', onClose);
    const toggleBtn = document.querySelector('#threeDotsButton');
    if (toggleBtn) toggleBtn.addEventListener('click', toggle);
  }

  function onOpen() { 
    if (window.game?.pauseManager?.open) {
      window.game.pauseManager.open(id);
    }
  }
  
  function onClose() { 
    if (window.game?.pauseManager?.close) {
      window.game.pauseManager.close(id);
    }
  }

  function toggle() {
    if (!el) return;
    if (el.classList.contains('visible')) close(); else open();
  }

  function open() { 
    if (el) el.classList.add('visible'); 
    if (window.game?.pauseManager?.open) {
      window.game.pauseManager.open(id);
    }
  }
  
  function close() { 
    if (el) el.classList.remove('visible'); 
    if (window.game?.pauseManager?.close) {
      window.game.pauseManager.close(id);
    }
  }

  return { init, open, close, toggle };
})();
