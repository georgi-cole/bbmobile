import { PauseManager } from './pause-manager.js';

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

  function onOpen() { PauseManager.open(id); }
  function onClose() { PauseManager.close(id); }

  function toggle() {
    if (!el) return;
    if (el.classList.contains('visible')) close(); else open();
  }

  function open() { if (el) el.classList.add('visible'); PauseManager.open(id); }
  function close() { if (el) el.classList.remove('visible'); PauseManager.close(id); }

  return { init, open, close, toggle };
})();
