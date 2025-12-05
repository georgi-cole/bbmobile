// Audit tracer for roster/player modules and selection handlers (opt-in)
// Goal: help identify which files are loaded and which handlers actually run
// across pages, to inform consolidation and targeted wiring.
//
// Usage options:
// 1) Manual: call BBMobile.auditTracer.moduleLoaded('assets/js/roster.js') in module init.
//            call BBMobile.auditTracer.handlerFired('onPlayerSelected', { playerId }) inside selection handlers.
// 2) Auto (opt-in via global config before load):
//      window.BBMobile = window.BBMobile || {};
//      window.BBMobile.audit = { autoHookSelections: true };
//    - This will attach a delegated click listener on common selectors to log handler-like activity.
//
// Notes:
// - Non-invasive: does not stop propagation or change logic. Logs only.
// - Safe for production behind a flag; prefer enabling in staging/dev.

(function () {
  if (!window.BBMobile) window.BBMobile = {};
  if (window.BBMobile.auditTracer) return;

  function nowISO() { return new Date().toISOString(); }
  function pageCtx() {
    return {
      path: location.pathname,
      title: document.title || '',
      ua: navigator.userAgent,
    };
  }

  var logs = [];
  function pushLog(type, name, meta) {
    var entry = {
      ts: nowISO(),
      type: type,
      name: String(name || ''),
      meta: meta || {},
      page: pageCtx(),
    };
    logs.push(entry);
    try { console.info('[BBMobile:audit]', entry); } catch (e) { /* ignore */ }
    return entry;
  }

  function moduleLoaded(moduleName) {
    return pushLog('moduleLoaded', moduleName, {});
  }

  function handlerFired(handlerName, meta) {
    return pushLog('handlerFired', handlerName, meta || {});
  }

  function exportLogs() {
    try {
      var blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'bbmobile-audit-' + Date.now() + '.json';
      a.click();
      setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
      return true;
    } catch (e) { console.warn('audit export failed', e); return false; }
  }

  function autoHookSelections() {
    // Delegated listener to log selection-like interactions on common selectors.
    var selectorList = [
      '.player',
      '.roster-card',
      '[data-player-id]'
    ];
    var root = document;
    root.addEventListener('click', function (ev) {
      var sel = null, el = ev.target, matchedSelector = null;
      for (var i = 0; i < selectorList.length; i++) {
        var candidate = el && el.closest ? el.closest(selectorList[i]) : null;
        if (candidate) {
          sel = candidate;
          matchedSelector = selectorList[i];
          break;
        }
      }
      if (!sel) return;
      var pid = sel.getAttribute('data-player-id') || (sel.dataset && (sel.dataset.playerId || sel.dataset.id)) || null;
      handlerFired('delegatedClick', { selectorMatched: matchedSelector, playerId: pid });
    }, false);
    pushLog('autoHookEnabled', 'delegatedClick', { selectors: selectorList });
  }

  function getLogs() {
    return logs.slice(); // Return a copy to prevent external modification
  }

  // Public API
  window.BBMobile.auditTracer = {
    moduleLoaded: moduleLoaded,
    handlerFired: handlerFired,
    exportLogs: exportLogs,
    getLogs: getLogs,
    _logs: logs
  };

  // Auto enable if configured
  try {
    var cfg = window.BBMobile.audit || {};
    if (cfg.autoHookSelections) {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoHookSelections, { once: true });
      } else {
        autoHookSelections();
      }
    }
  } catch (e) { /* ignore */ }
})();
