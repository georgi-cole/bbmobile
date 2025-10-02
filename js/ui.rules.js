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
      'Objective: Be the last player standing to win Big Brother.',
      'HOH (Head of Household): Wins power to nominate 2 players for eviction.',
      'Nominations: The HOH chooses two players to put on the block.',
      'Veto Competition: Six players compete for the Power of Veto to save a nominee.',
      'Eviction: Houseguests vote to evict one of the final nominees. Majority rules.',
      'Jury Phase: Evicted players become jurors who vote for the winner in the finale.',
      'Finale: Final 2 face the jury. The jury votes, and the winner is crowned!',
    ];
  }

  function buildRulesList(items) {
    const ul = document.createElement('ul');
    ul.className = 'rulesList';
    for (const line of items) {
      const li = document.createElement('li');
      li.textContent = line;
      ul.appendChild(li);
    }
    return ul;
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

    // Prevent ESC from closing
    dim.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
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
      dim.classList.remove('open');
      panel.classList.remove('in');
      // Small delay for CSS transition, then hide
      setTimeout(() => {
        dim.style.display = 'none';
        // Restore scroll
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
        // Restore focus
        try { lastFocusEl && lastFocusEl.focus && lastFocusEl.focus(); } catch {}
      }, 150);
    };
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

  // Expose and wire
  global.showRulesModal = showRulesModal;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireRulesButton, { once: true });
  } else {
    wireRulesButton();
  }

})(window);
