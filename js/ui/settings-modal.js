import { PauseManager } from './pause-manager.js';

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

  function onOpen() { PauseManager.open(id); }
  function onClose() { PauseManager.close(id); }

  function open() {
    try {
      if (el) el.classList.add('visible');
      PauseManager.open(id);
    } catch (err) { console.error('[SettingsModal] open', err); }
  }

  function close() {
    try {
      if (el) el.classList.remove('visible');
      PauseManager.close(id);
    } catch (err) { console.error('[SettingsModal] close', err); }
  }

  return { init, open, close };
})();
