// MODULE: rules.js
// Clean, persistent (OK-only) Game Rules modal with scrollable body and auto-wiring.

(function (global) {
  'use strict';

  const SEL_RULES_BTNS = [
    '#btnRules',
    '#rules',
    'button[data-action="rules"]',
  ];

  function findRulesButtons() {
    const out = new Set();
    for (const sel of SEL_RULES_BTNS) {
      document.querySelectorAll(sel).forEach((el) => out.add(el));
    }
    // Fallback: any button/link with text "Rules"
    document.querySelectorAll('button, a, [role="button"], .btn').forEach((el) => {
      const t = (el.textContent || '').trim().toLowerCase();
      if (t === 'rules') out.add(el);
    });
    return Array.from(out);
  }

  function defaultRulesItems() {
    return [
      { type: 'intro', text: 'Welcome to Big Brother!' },
      { type: 'intro', text: 'Step inside the house and get ready for the ultimate social strategy game. Before you dive in, here's how it all works:' },
      { type: 'heading', text: '1. Weekly Cycle' },
      { type: 'p', text: 'Every "week" follows the classic Big Brother rhythm: HOH → Nominations → Veto → Eviction.' },
      { type: 'p', text: 'The system handles the competitions, nominations, and votes — but social dynamics shape the outcomes.' },
      { type: 'heading', text: '2. Competitions' },
      { type: 'p', text: 'HOH & Veto challenges are decided by competition scores (some houseguests are stronger in certain areas, others weaker).' },
      { type: 'p', text: 'Scores are influenced by luck, traits, and sometimes twists.' },
      { type: 'p', text: 'Winning matters, but so does staying on good terms with others — power can make you a target.' },
      { type: 'heading', text: '3. Social Interactions' },
      { type: 'p', text: 'Houseguests form friendships, rivalries, and alliances that shift week to week.' },
      { type: 'p', text: 'Votes are not random — they reflect these relationships.' },
      { type: 'p', text: 'Don't underestimate social influence: even a weak competitor can survive if they're well-connected.' },
      { type: 'heading', text: '4. Eviction & Jury' },
      { type: 'p', text: 'Each week, one nominee is evicted by a house vote.' },
      { type: 'p', text: 'Once the Jury phase begins, evicted houseguests don't leave for good — they'll vote for the winner at the finale.' },
      { type: 'p', text: 'Even if you're out, your influence on the game continues.' },
      { type: 'heading', text: '5. Twists & Surprises' },
      { type: 'p', text: 'This isn't just a straight line to the end — expect twists that may shake the house.' },
      { type: 'p', text: 'Evicted? Don't give up. Some twists may bring players back or change the course of the game.' },
      { type: 'heading', text: '6. Progress & Scoreboard' },
      { type: 'p', text: 'Finishing a game adds to your scoreboard.' },
      { type: 'p', text: 'Higher scores unlock new levels, enhancements, and extra twists in future games.' },
      { type: 'p', text: 'Every game you play helps you grow stronger and adds replay value.' },
      { type: 'heading', text: '7. Customization & Settings' },
      { type: 'p', text: 'Before starting, you may customize the cast (names, looks, personalities).' },
      { type: 'p', text: 'Settings allow you to adjust options such as competition randomness, difficulty, and enabled twists.' },
      { type: 'p', text: 'Once the game starts, the house runs on its own — sit back and see how the story unfolds.' },
    ];
  }

  function buildRulesList(items) {
    const container = document.createElement('div');
    container.className = 'rulesContent';
    for (const item of items) {
      if (item.type === 'intro') {
        const p = document.createElement('p');
        p.className = 'rulesIntro';
        p.textContent = item.text;
        container.appendChild(p);
      } else if (item.type === 'heading') {
        const h3 = document.createElement('h3');
        h3.className = 'rulesHeading';
        h3.textContent = item.text;
        container.appendChild(h3);
      } else if (item.type === 'p') {
        const p = document.createElement('p');
        p.className = 'rulesPara';
        p.textContent = item.text;
        container.appendChild(p);
      }
    }
    return container;
  }

  function ensureModal() {
    let dim = document.querySelector('.rulesDim');
    if (dim) return dim;

    dim = document.createElement('div');
    dim.className = 'rulesDim';
    dim.setAttribute('role', 'dialog');
    dim.setAttribute('aria-modal', 'true');
    dim.setAttribute('aria-labelledby', 'rulesTitle');

    const panel = document.createElement('div');
    panel.className = 'rulesPanel';

    const title = document.createElement('div');
    title.className = 'rulesTitle';
    title.id = 'rulesTitle';
    title.textContent = 'Game Rules';

    const body = document.createElement('div');
    body.className = 'rulesBody';
    body.tabIndex = 0; // allow keyboard scroll

    const btns = document.createElement('div');
    btns.className = 'rulesBtns';

    const ok = document.createElement('button');
    ok.className = 'btn primary';
    ok.id = 'rulesOkBtn';
    ok.textContent = 'OK';

    btns.appendChild(ok);
    panel.appendChild(title);
    panel.appendChild(body);
    panel.appendChild(btns);
    dim.appendChild(panel);
    document.body.appendChild(dim);

    // Prevent closing by clicking backdrop
    dim.addEventListener('mousedown', (e) => {
      if (e.target === dim) {
        // Eat the click but do nothing
        e.preventDefault();
        e.stopPropagation();
        // Focus the OK button to guide the user
        try { ok.focus(); } catch {}
      }
    });

    // Handle keyboard events
    dim.addEventListener('keydown', (e) => {
      // ESC key closes modal
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        ok.click(); // Trigger the OK button click to close
      }
      // Minimal focus trap between panel and OK button
      if (e.key === 'Tab') {
        const focusables = panel.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        const list = Array.from(focusables).filter(el => !el.hasAttribute('disabled'));
        if (list.length) {
          const first = list[0];
          const last = list[list.length - 1];
          const active = document.activeElement;
          if (e.shiftKey && (active === first || active === panel)) {
            e.preventDefault(); last.focus();
          } else if (!e.shiftKey && (active === last)) {
            e.preventDefault(); first.focus();
          }
        } else {
          // Keep focus in panel
          e.preventDefault();
          try { ok.focus(); } catch {}
        }
      }
    });

    return dim;
  }

  let lastFocusEl = null;

  function showRulesModal(customItems) {
    const dim = ensureModal();
    const panel = dim.querySelector('.rulesPanel');
    const body = dim.querySelector('.rulesBody');
    const ok = dim.querySelector('#rulesOkBtn');

    // Replace content
    body.innerHTML = '';
    const items = Array.isArray(customItems) && customItems.length ? customItems : defaultRulesItems();
    body.appendChild(buildRulesList(items));

    dim.style.display = 'flex';
    requestAnimationFrame(() => {
      dim.classList.add('open');
      panel.classList.add('in');
    });

    // Lock page scroll
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    // Focus handling
    try { lastFocusEl = document.activeElement; } catch { lastFocusEl = null; }
    setTimeout(() => { try { ok.focus(); } catch {} }, 0);

    ok.onclick = () => {
      hideRulesModal();
    };
  }

  function hideRulesModal() {
    const dim = document.querySelector('.rulesDim');
    if (!dim) return;
    const panel = dim.querySelector('.rulesPanel');
    
    dim.classList.remove('open');
    panel.classList.remove('in');
    
    setTimeout(() => {
      dim.style.display = 'none';
      // Restore scroll
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      // Restore focus
      try { lastFocusEl && lastFocusEl.focus && lastFocusEl.focus(); } catch {}
    }, 150);
  }

  function wireRulesButton() {
    const btns = findRulesButtons();
    btns.forEach((btn) => {
      if (btn.__rulesWired) return;
      btn.__rulesWired = true;
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        showRulesModal();
      });
    });
  }

  // Auto-show trigger: listen for intro finished event
  let autoShownOnce = false;
  function handleIntroFinished() {
    if (autoShownOnce) return;
    autoShownOnce = true;
    console.info('[rules] Auto-showing rules modal after intro');
    showRulesModal();
  }

  // Listen for custom event
  document.addEventListener('bb:intro:finished', handleIntroFinished, { once: true });

  // Fallback: wrap startOpeningSequence if event not dispatched
  (function installFallback() {
    if (typeof global.startOpeningSequence !== 'function') {
      // Not available yet, try again shortly
      setTimeout(installFallback, 200);
      return;
    }
    const orig = global.startOpeningSequence;
    if (orig.__rulesWrapped) return;
    
    global.startOpeningSequence = function wrappedForRules() {
      // Only trigger on first call
      if (!autoShownOnce) {
        setTimeout(handleIntroFinished, 100);
      }
      return orig.apply(this, arguments);
    };
    global.startOpeningSequence.__rulesWrapped = true;
  })();

  // Expose and wire
  global.showRulesModal = showRulesModal;
  global.hideRulesModal = hideRulesModal;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireRulesButton, { once: true });
  } else {
    wireRulesButton();
  }

})(window);
