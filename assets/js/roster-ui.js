// Lightweight roster UI helper (opt-in). Safe, additive — does not change game logic.
// Usage (recommended):
//  - Call BBMobile.setRosterCardSelectedById(playerId, true/false) from existing selection code.
//  - Or call BBMobile.setRosterCardSelected(el, true/false) where el is the roster-card element.
//
// By default, autoAttach is disabled. To enable automatic click-to-toggle behavior (not recommended
// until verified), set BBMobile.enableNewRosterUI = { autoAttach: true } before DOM ready.
//
// This file intentionally keeps responsibilities limited: toggle class + emit a custom event
// so existing game logic can also listen if desired.

(function () {
  if (window.BBMobile && window.BBMobile.__rosterUiInstalled) return;
  window.BBMobile = window.BBMobile || {};
  window.BBMobile.__rosterUiInstalled = true;

  /**
   * Find roster card element from various inputs:
   * - element node that already is the roster-card
   * - element node inside the card
   * - player id string (data-player-id)
   */
  function findRosterCard(input) {
    if (!input) return null;
    if (typeof input === 'string') {
      // treat as player id
      return document.querySelector('.roster-card[data-player-id="' + CSS.escape(input) + '"]');
    }
    if (input instanceof Element) {
      if (input.classList.contains('roster-card')) return input;
      return input.closest('.roster-card');
    }
    return null;
  }

  function setRosterCardSelected(target, isSelected) {
    var card = findRosterCard(target);
    if (!card) return false;
    if (isSelected) card.classList.add('is-selected');
    else card.classList.remove('is-selected');

    // Emit a small custom event so other code/analytics can react (non-blocking).
    try {
      var ev = new CustomEvent('bb:roster-selection-changed', {
        detail: {
          playerId: card.getAttribute('data-player-id') || null,
          isSelected: !!isSelected,
          card: card
        }
      });
      card.dispatchEvent(ev);
      // Also emit on document for global listeners
      document.dispatchEvent(ev);
    } catch (e) {
      // CustomEvent might fail in some older environments — ignore.
    }
    return true;
  }

  function setRosterCardSelectedById(playerId, isSelected) {
    return setRosterCardSelected(playerId, isSelected);
  }

  // Optional: small convenience that toggles (if you want toggle semantics)
  function toggleRosterCardSelected(target) {
    var card = findRosterCard(target);
    if (!card) return false;
    return setRosterCardSelected(card, !card.classList.contains('is-selected'));
  }

  // Minimal autoAttach behavior — only enabled if user explicitly sets BBMobile.enableNewRosterUI = true
  function autoAttachClicks() {
    // Attach a delegated click handler that toggles visuals only (does not stop propagation).
    document.addEventListener('click', function (e) {
      var card = e.target.closest && e.target.closest('.roster-card');
      if (!card) return;
      // If you want selection only via a specific control inside the card, adapt here.
      toggleRosterCardSelected(card);
    }, false);
  }

  // Public API
  window.BBMobile.setRosterCardSelected = setRosterCardSelected;
  window.BBMobile.setRosterCardSelectedById = setRosterCardSelectedById;
  window.BBMobile.toggleRosterCardSelected = toggleRosterCardSelected;

  // Config holder. Default: disabled. Consumers may set BBMobile.enableNewRosterUI = { autoAttach: true }
  window.BBMobile.enableNewRosterUI = window.BBMobile.enableNewRosterUI || { autoAttach: false };

  // If pre-configured to autoAttach, do it now.
  try {
    if (window.BBMobile.enableNewRosterUI && window.BBMobile.enableNewRosterUI.autoAttach) {
      autoAttachClicks();
      window.BBMobile.__rosterUiAutoAttached = true;
    }
  } catch (e) {
    // ignore
  }

  // export a small init in case other code wants to explicitly enable later
  window.BBMobile._rosterUi = {
    autoAttach: autoAttachClicks,
    findRosterCard: findRosterCard
  };
})();
