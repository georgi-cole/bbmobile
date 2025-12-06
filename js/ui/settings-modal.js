// Settings Modal - integrates with GlobalPauseController

export const SettingsModal = (() => {
  const id = 'modal:settings';
  let el = null;

  function init() {
    el = document.querySelector('#settingsModal');
    if (!el) return;
    el.addEventListener('open', onOpen);
    el.addEventListener('close', onClose);
    const closeBtn = el.querySelector('.close');
    if (closeBtn) closeBtn.addEventListener('click', close);
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

  function open() {
    try {
      if (el) el.classList.add('visible');
      if (window.game?.pauseManager?.open) {
        window.game.pauseManager.open(id);
      }
    } catch (err) { console.error('[SettingsModal] open', err); }
  }

  function close() {
    try {
      if (el) el.classList.remove('visible');
      if (window.game?.pauseManager?.close) {
        window.game.pauseManager.close(id);
      }
    } catch (err) { console.error('[SettingsModal] close', err); }
  }

  return { init, open, close };
})();
