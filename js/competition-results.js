// MODULE: competition-results.js
// Unified Competition Results modal for Score Pipeline v2.
// Accepts { title, standings, compType, autoDismissMs, maxResults } and returns
// a Promise that resolves when the modal is dismissed (by user, auto-timer, or FFWD).
//
// Usage:
//   await window.CompetitionResults.show({
//     title:        'HOH Competition',
//     standings:    window.ScorePipeline.buildStandings(g.lastCompScores),
//     compType:     'hoh',
//     autoDismissMs: 3000
//   });

(function(g) {
  'use strict';

  // ─── CSS (injected once) ──────────────────────────────────────────────────

  var STYLE_ID = '__compResultsStyles';

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = [
      '.cr-overlay{',
        'position:fixed;inset:0;z-index:99999;',
        'display:flex;align-items:center;justify-content:center;',
        'background:rgba(0,0,0,0.72);',
        'animation:crFadeIn 0.25s ease;',
      '}',
      '@keyframes crFadeIn{from{opacity:0}to{opacity:1}}',
      '.cr-modal{',
        'background:linear-gradient(160deg,#1a1a2e 0%,#16213e 100%);',
        'border:1px solid rgba(0,224,204,0.3);',
        'border-radius:14px;',
        'box-shadow:0 8px 40px rgba(0,0,0,0.6),0 0 20px rgba(0,224,204,0.12);',
        'padding:24px 20px 20px;',
        'min-width:min(320px,90vw);max-width:min(420px,92vw);',
        'font-family:inherit;',
        'animation:crSlideIn 0.3s cubic-bezier(0.25,0.9,0.25,1);',
      '}',
      '@keyframes crSlideIn{from{transform:translateY(24px);opacity:0}to{transform:none;opacity:1}}',
      '.cr-title{',
        'text-align:center;font-size:clamp(16px,3vw,22px);font-weight:800;',
        'color:#00e0cc;letter-spacing:0.04em;margin-bottom:16px;text-transform:uppercase;',
      '}',
      '.cr-standings{list-style:none;margin:0;padding:0;}',
      '.cr-row{',
        'display:flex;align-items:center;gap:10px;',
        'padding:8px 10px;border-radius:8px;margin-bottom:6px;',
        'background:rgba(255,255,255,0.04);',
      '}',
      '.cr-row.cr-winner{',
        'background:rgba(0,224,204,0.12);border:1px solid rgba(0,224,204,0.25);',
      '}',
      '.cr-rank{width:28px;text-align:center;font-weight:700;color:rgba(255,255,255,0.5);font-size:13px;}',
      '.cr-row.cr-winner .cr-rank{color:#00e0cc;}',
      '.cr-name{flex:1;font-size:clamp(13px,2.2vw,16px);color:#f0f0f0;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
      '.cr-row.cr-winner .cr-name{color:#fff;}',
      '.cr-score{font-size:clamp(12px,2vw,15px);color:rgba(255,255,255,0.7);font-weight:700;min-width:48px;text-align:right;}',
      '.cr-row.cr-winner .cr-score{color:#00e0cc;}',
      '.cr-dismiss{',
        'display:block;width:100%;margin-top:14px;',
        'padding:9px;border-radius:8px;',
        'background:rgba(0,224,204,0.15);border:1px solid rgba(0,224,204,0.3);',
        'color:#00e0cc;font-size:14px;font-weight:700;',
        'cursor:pointer;text-align:center;',
        'transition:background 0.2s;',
      '}',
      '.cr-dismiss:hover{background:rgba(0,224,204,0.25);}'
    ].join('');
    document.head.appendChild(style);
  }

  // ─── show() ───────────────────────────────────────────────────────────────

  /**
   * Show competition results modal.
   *
   * @param {Object}  opts
   * @param {string}  opts.title            Modal heading (e.g. "HOH Competition").
   * @param {Array}   opts.standings        [{rank, id, score, displayScore}, …]
   *                                        from ScorePipeline.buildStandings().
   * @param {string}  [opts.compType]       'hoh' | 'pov' | 'final3_comp1' | …
   * @param {number}  [opts.autoDismissMs]  Auto-dismiss after N ms; omit or 0 for no auto.
   * @param {number}  [opts.maxResults]     Max rows to render (default: all).
   * @returns {Promise<void>} Resolves when dismissed.
   */
  function show(opts) {
    return new Promise(function(resolve) {
      if (typeof document === 'undefined') { resolve(); return; }
      injectStyles();

      var standings = (opts.standings || []).slice(0, opts.maxResults || undefined);

      // Detect endurance: only the winner has score > 0
      var isEndurance = standings.length > 1 &&
        standings[0].score > 0 &&
        standings.slice(1).every(function(s) { return s.score === 0; });

      // ── Build DOM ──
      var overlay = document.createElement('div');
      overlay.className = 'cr-overlay';

      var modal = document.createElement('div');
      modal.className = 'cr-modal';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-label', opts.title || 'Competition Results');

      // Title
      var titleEl = document.createElement('div');
      titleEl.className = 'cr-title';
      titleEl.textContent = opts.title || 'Competition Results';
      modal.appendChild(titleEl);

      // Standings list
      var list = document.createElement('ul');
      list.className = 'cr-standings';

      standings.forEach(function(entry, i) {
        var row = document.createElement('li');
        row.className = 'cr-row' + (i === 0 ? ' cr-winner' : '');

        // Rank / winner badge
        var rankEl = document.createElement('span');
        rankEl.className = 'cr-rank';
        rankEl.textContent = (i === 0) ? '👑' : String(entry.rank);
        row.appendChild(rankEl);

        // Player name
        var nameEl = document.createElement('span');
        nameEl.className = 'cr-name';
        nameEl.textContent = (g.safeName ? g.safeName(entry.id) : String(entry.id));
        row.appendChild(nameEl);

        // Score display
        var scoreEl = document.createElement('span');
        scoreEl.className = 'cr-score';
        if (isEndurance && i > 0) {
          scoreEl.textContent = '0.0'; // loser display in endurance
        } else {
          var ds = (typeof entry.displayScore === 'number') ? entry.displayScore : (entry.score / 10);
          scoreEl.textContent = ds.toFixed(1);
        }
        row.appendChild(scoreEl);

        list.appendChild(row);
      });

      modal.appendChild(list);

      // Dismiss button (also carries ffwd-skip class so FFWD selectors can close early)
      var btn = document.createElement('button');
      btn.className = 'cr-dismiss ffwd-skip';
      btn.textContent = 'Continue';
      modal.appendChild(btn);

      overlay.appendChild(modal);
      document.body.appendChild(overlay);

      // ── Dismiss logic ──
      var dismissed = false;
      var autoTimer = null;

      function dismiss() {
        if (dismissed) return;
        dismissed = true;
        clearTimeout(autoTimer);
        document.removeEventListener('keydown', onKey);
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.2s';
        setTimeout(function() {
          if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
          resolve();
        }, 200);
      }

      btn.addEventListener('click', dismiss);

      // Clicking outside the modal also dismisses
      overlay.addEventListener('click', function(e) {
        if (e.target === overlay) dismiss();
      });

      // Keyboard: Enter or Escape dismisses
      function onKey(e) {
        if (e.key === 'Enter' || e.key === 'Escape') dismiss();
      }
      document.addEventListener('keydown', onKey);

      // Auto-dismiss timer
      if (opts.autoDismissMs && opts.autoDismissMs > 0) {
        autoTimer = setTimeout(dismiss, opts.autoDismissMs);
      }
    });
  }

  // ─── Exports ──────────────────────────────────────────────────────────────

  g.CompetitionResults = { show: show };

  console.info('[CompetitionResults] Module loaded');

})(window);
