// Opt-in integration shim to connect the roster UI helper (roster-ui.js)
// to existing DOM selection events with minimal changes.
//
// Usage patterns:
//
// 1) Manual: call
//      BBMobile.attachRosterSelectionIntegration({ selector: '.player', idAttr: 'data-player-id' });
//    - This will attach a delegated click handler that calls
//      BBMobile.setRosterCardSelectedById(playerId, true/false).
//
// 2) Auto-enable via config (NOT enabled by default):
//    window.BBMobile = window.BBMobile || {};
//    window.BBMobile.enableNewRosterUI = window.BBMobile.enableNewRosterUI || {};
//    window.BBMobile.enableNewRosterUI.autoAttachSelection = {
//      selector: '.player',
//      idAttr: 'data-player-id',
//      toggle: true
//    };
//
// Safety:
// - No changes to game logic. This only toggles the visual (.is-selected) via the existing roster-ui helper.
// - Default: disabled. You must explicitly opt in via the API or the global config before it binds.

(function () {
  if (!window.BBMobile) window.BBMobile = {};
  if (window.BBMobile.__rosterSelectionIntegrationInstalled) return;
  window.BBMobile.__rosterSelectionIntegrationInstalled = true;

  function defaultOptions() {
    return {
      selector: '.player',
      idAttr: 'data-player-id',
      event: 'click',
      toggle: true,
      delegationRoot: document
    };
  }

  function getPlayerIdFromElement(el, idAttr) {
    if (!el) return null;
    if (el.hasAttribute && el.hasAttribute(idAttr)) return el.getAttribute(idAttr);
    if (idAttr.indexOf('data-') === 0) {
      var dataKey = idAttr.slice(5).toLowerCase().replace(/-([a-z])/g, function (m, c) { return c.toUpperCase(); });
      return el.dataset ? el.dataset[dataKey] : null;
    }
    return null;
  }

  function attachIntegration(opts) {
    opts = Object.assign(defaultOptions(), opts || {});
    if (!window.BBMobile || typeof window.BBMobile.setRosterCardSelectedById !== 'function') {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
          if (window.BBMobile && typeof window.BBMobile.setRosterCardSelectedById === 'function') {
            attachIntegration(opts);
          }
        }, { once: true });
      }
      return;
    }

    // Use a simple string-based marker to avoid btoa compatibility issues
    var marker = '__rosterSelectionAttached_' + (opts.selector + '|' + opts.idAttr).replace(/[^a-zA-Z0-9]/g, '_');
    if (opts.delegationRoot[marker]) return;
    opts.delegationRoot[marker] = true;

    opts.delegationRoot.addEventListener(opts.event, function (ev) {
      var el = ev.target && ev.target.closest && ev.target.closest(opts.selector);
      if (!el) return;
      var playerId = getPlayerIdFromElement(el, opts.idAttr);
      if (!playerId) return;
      if (opts.toggle) {
        if (el.classList.contains('is-selected')) {
          window.BBMobile.setRosterCardSelectedById(playerId, false);
        } else {
          window.BBMobile.setRosterCardSelectedById(playerId, true);
        }
      } else {
        window.BBMobile.setRosterCardSelectedById(playerId, true);
      }
      // Do not preventDefault or stopPropagation so existing handlers still run.
    }, false);
  }

  // Public helper
  window.BBMobile.attachRosterSelectionIntegration = attachIntegration;

  // Auto-attach if pre-configured
  try {
    var cfg = window.BBMobile.enableNewRosterUI && window.BBMobile.enableNewRosterUI.autoAttachSelection;
    if (cfg) {
      attachIntegration(cfg);
      window.BBMobile.__rosterSelectionIntegrationAutoAttached = true;
    }
  } catch (e) {
    // ignore
  }
})();
