// Canonical idle card modal used across the game.
// Usage: IdleCard.show({ title, message, gameName, onYes, onNo })
(function(global) {
  'use strict';

  const IdleCard = (() => {
  // Private DOM references
  let container = null;

  function createModal() {
    if (container) return container;
    container = document.createElement('div');
    container.className = 'game-modal idle-modal standard-idle';
    container.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="modal-panel" role="dialog" aria-modal="true" aria-label="You cannot compete">
        <header class="modal-header"><h2 class="modal-title"></h2></header>
        <div class="modal-body"><p class="modal-message"></p></div>
        <div class="modal-actions action-row">
          <button class="btn btn-primary btn-yes"><span class="btn-label"></span></button>
          <button class="btn btn-secondary btn-no"><span class="btn-label"></span></button>
        </div>
      </div>
    `;
    // Append to body
    document.body.appendChild(container);

    // Accessibility: close on backdrop click (optional)
    container.querySelector('.modal-backdrop').addEventListener('click', () => {
      hide();
    });

    // Hook up buttons
    const yesBtn = container.querySelector('.btn-yes');
    const noBtn = container.querySelector('.btn-no');

    yesBtn.addEventListener('click', () => {
      try {
        // Emit a semantic event for other systems to listen to
        if (window.game && window.game.bus) window.game.bus.emit && window.game.bus.emit('idle:choice', { choice: 'yes' });
      } catch (err) { console.error('[IdleCard] emit yes failed', err); }
      hide();
    });

    noBtn.addEventListener('click', () => {
      try {
        // Emit a specific event requesting the clock to speed up.
        if (window.game && window.game.bus && window.game.bus.emit) {
          window.game.bus.emit('clock:request-fast-forward', { reason: 'idle_no_choice' });
        }
        // Defensive direct API call if clock object exposes helpers (backwards compatibility)
        if (window.game && window.game.clock) {
          if (typeof window.game.clock.fastForward === 'function') {
            window.game.clock.fastForward();
          } else if (typeof window.game.clock.setSpeed === 'function') {
            // as a fallback, bump speed temporarily
            try { window.game.clock.setSpeed(5); } catch (e) { /* swallow */ }
          }
        }
      } catch (err) { console.error('[IdleCard] fast-forward request failed', err); }
      // Keep modal open briefly to show feedback? Current behaviour hides it.
      hide();
    });

    return container;
  }

  function show({ title = 'You cannot compete', message = '', yesLabel = 'Yes', noLabel = 'No', onYes = null, onNo = null } = {}) {
    const modal = createModal();
    modal.querySelector('.modal-title').textContent = title;
    modal.querySelector('.modal-message').textContent = message;

    const yesBtn = modal.querySelector('.btn-yes');
    const noBtn = modal.querySelector('.btn-no');

    yesBtn.querySelector('.btn-label').textContent = yesLabel;
    noBtn.querySelector('.btn-label').textContent = noLabel;

    // attach optional callbacks (wrapping existing listeners)
    const origYes = () => {
      try { if (typeof onYes === 'function') onYes(); } catch (err) { console.error('[IdleCard] onYes callback error', err); }
      if (window.game && window.game.bus && window.game.bus.emit) window.game.bus.emit('idle:choice:callback', { choice: 'yes' });
    };
    const origNo = () => {
      try { if (typeof onNo === 'function') onNo(); } catch (err) { console.error('[IdleCard] onNo callback error', err); }
      if (window.game && window.game.bus && window.game.bus.emit) window.game.bus.emit('idle:choice:callback', { choice: 'no' });
    };

    // Show modal
    modal.classList.add('visible');

    // Hook just-once callbacks to bus so they run after internal emission
    if (window.game && window.game.bus && window.game.bus.on) {
      const cbYes = () => { origYes(); window.game.bus.off && window.game.bus.off('idle:choice:callback', cbYes); };
      const cbNo  = () => { origNo();  window.game.bus.off && window.game.bus.off('idle:choice:callback', cbNo); };
      window.game.bus.on && window.game.bus.on('idle:choice:callback', cbYes);
      window.game.bus.on && window.game.bus.on('idle:choice:callback', cbNo);
    }

    return {
      hide: hide
    };
  }

  function hide() {
    if (!container) return;
    container.classList.remove('visible');
  }

  return {
    show,
    hide
  };
})();

  // Export to global namespace
  global.IdleCard = IdleCard;

})(window);
