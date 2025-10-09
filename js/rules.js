// MODULE: rules.js
// Clean, persistent Game Rules modal with scrollable body and auto-wiring.
// Appears after intro video ends and stays until OK or ESC is pressed.

(function (global) {
  'use strict';

  let lastFocusEl = null;
  let modalShown = false;
  let introFinishedReceived = false;

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
        e.preventDefault();
        e.stopPropagation();
        // Focus the OK button to guide the user
        try { ok.focus(); } catch {}
      }
    });

    // Handle ESC key to close
    dim.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        hideRulesModal();
        return;
      }
      // Minimal focus trap between panel elements
      if (e.key === 'Tab') {
        const focusables = panel.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        const list = Array.from(focusables).filter(el => !el.hasAttribute('disabled'));
        if (list.length) {
          const first = list[0];
          const last = list[list.length - 1];
          const active = document.activeElement;
          if (e.shiftKey && (active === first || active === panel)) {
            e.preventDefault(); 
            last.focus();
          } else if (!e.shiftKey && (active === last)) {
            e.preventDefault(); 
            first.focus();
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

  function buildRulesContent() {
    const container = document.createElement('div');
    container.style.cssText = 'text-align:left;line-height:1.6;';

    const intro = document.createElement('p');
    intro.innerHTML = '<strong>Welcome to Big Brother!</strong>';
    container.appendChild(intro);

    const desc = document.createElement('p');
    desc.textContent = 'Step inside the house and get ready for the ultimate social strategy game. Before you dive in, here\'s how it all works:';
    container.appendChild(desc);

    // Section 1
    const h1 = document.createElement('h3');
    h1.textContent = '1. Weekly Cycle';
    h1.style.cssText = 'margin-top:16px;margin-bottom:6px;color:#ffdc8b;font-weight:700;';
    container.appendChild(h1);

    const p1a = document.createElement('p');
    p1a.textContent = 'Every "week" follows the classic Big Brother rhythm: HOH → Nominations → Veto → Eviction.';
    container.appendChild(p1a);

    const p1b = document.createElement('p');
    p1b.textContent = 'The system handles the competitions, nominations, and votes — but social dynamics shape the outcomes.';
    container.appendChild(p1b);

    // Section 2
    const h2 = document.createElement('h3');
    h2.textContent = '2. Competitions';
    h2.style.cssText = 'margin-top:16px;margin-bottom:6px;color:#ffdc8b;font-weight:700;';
    container.appendChild(h2);

    const p2a = document.createElement('p');
    p2a.innerHTML = 'HOH &amp; Veto challenges are decided by competition scores (some houseguests are stronger in certain areas, others weaker).';
    container.appendChild(p2a);

    const p2b = document.createElement('p');
    p2b.textContent = 'Scores are influenced by luck, traits, and sometimes twists.';
    container.appendChild(p2b);

    const p2c = document.createElement('p');
    p2c.textContent = 'Winning matters, but so does staying on good terms with others — power can make you a target.';
    container.appendChild(p2c);

    // Section 3
    const h3 = document.createElement('h3');
    h3.textContent = '3. Social Interactions';
    h3.style.cssText = 'margin-top:16px;margin-bottom:6px;color:#ffdc8b;font-weight:700;';
    container.appendChild(h3);

    const p3a = document.createElement('p');
    p3a.textContent = 'Houseguests form friendships, rivalries, and alliances that shift week to week.';
    container.appendChild(p3a);

    const p3b = document.createElement('p');
    p3b.textContent = 'Votes are not random — they reflect these relationships.';
    container.appendChild(p3b);

    const p3c = document.createElement('p');
    p3c.textContent = 'Don\'t underestimate social influence: even a weak competitor can survive if they\'re well-connected.';
    container.appendChild(p3c);

    // Section 4
    const h4 = document.createElement('h3');
    h4.textContent = '4. Eviction & Jury';
    h4.style.cssText = 'margin-top:16px;margin-bottom:6px;color:#ffdc8b;font-weight:700;';
    container.appendChild(h4);

    const p4a = document.createElement('p');
    p4a.textContent = 'Each week, one nominee is evicted by a house vote.';
    container.appendChild(p4a);

    const p4b = document.createElement('p');
    p4b.textContent = 'Once the Jury phase begins, evicted houseguests don\'t leave for good — they\'ll vote for the winner at the finale.';
    container.appendChild(p4b);

    const p4c = document.createElement('p');
    p4c.textContent = 'Even if you\'re out, your influence on the game continues.';
    container.appendChild(p4c);

    // Section 4b: Final Week
    const h4b = document.createElement('h3');
    h4b.textContent = '4b. Final Week & Three-Part Final Competition';
    h4b.style.cssText = 'margin-top:16px;margin-bottom:6px;color:#ffdc8b;font-weight:700;';
    container.appendChild(h4b);

    const p4d = document.createElement('p');
    p4d.textContent = 'When only three houseguests remain, the endgame unfolds with a special three-part competition.';
    container.appendChild(p4d);

    const p4e = document.createElement('p');
    p4e.innerHTML = '<strong>Part 1:</strong> All three compete. The houseguest with the highest score advances directly to Part 3.';
    container.appendChild(p4e);

    const p4f = document.createElement('p');
    p4f.innerHTML = '<strong>Part 2:</strong> The two losers from Part 1 face off head-to-head. The winner advances to Part 3.';
    container.appendChild(p4f);

    const p4f2 = document.createElement('p');
    p4f2.innerHTML = '<strong>Part 3:</strong> The winners of Parts 1 and 2 compete in the final showdown. The winner becomes the Final HOH.';
    container.appendChild(p4f2);

    const p4f3 = document.createElement('p');
    p4f3.textContent = 'The Final HOH then holds a live eviction ceremony in the living room, choosing which of the other two houseguests to evict. The evicted houseguest joins the jury, while the Final 2 await the jury\'s vote.';
    container.appendChild(p4f3);

    const p4g = document.createElement('p');
    p4g.textContent = 'This format ensures that competition performance matters right up until the very end.';
    container.appendChild(p4g);

    // Section 5
    const h5 = document.createElement('h3');
    h5.textContent = '5. Twists & Surprises';
    h5.style.cssText = 'margin-top:16px;margin-bottom:6px;color:#ffdc8b;font-weight:700;';
    container.appendChild(h5);

    const p5a = document.createElement('p');
    p5a.textContent = 'This isn\'t just a straight line to the end — expect twists that may shake the house.';
    container.appendChild(p5a);

    const p5b = document.createElement('p');
    p5b.textContent = 'Evicted? Don\'t give up. Some twists may bring players back or change the course of the game.';
    container.appendChild(p5b);

    // Section 6
    const h6 = document.createElement('h3');
    h6.textContent = '6. Progress & Scoreboard';
    h6.style.cssText = 'margin-top:16px;margin-bottom:6px;color:#ffdc8b;font-weight:700;';
    container.appendChild(h6);

    const p6a = document.createElement('p');
    p6a.textContent = 'Finishing a game adds to your scoreboard.';
    container.appendChild(p6a);

    const p6b = document.createElement('p');
    p6b.textContent = 'Higher scores unlock new levels, enhancements, and extra twists in future games.';
    container.appendChild(p6b);

    const p6c = document.createElement('p');
    p6c.textContent = 'Every game you play helps you grow stronger and adds replay value.';
    container.appendChild(p6c);

    // Section 7
    const h7 = document.createElement('h3');
    h7.textContent = '7. Customization & Settings';
    h7.style.cssText = 'margin-top:16px;margin-bottom:6px;color:#ffdc8b;font-weight:700;';
    container.appendChild(h7);

    const p7a = document.createElement('p');
    p7a.textContent = 'Before starting, you may customize the cast (names, looks, personalities).';
    container.appendChild(p7a);

    const p7b = document.createElement('p');
    p7b.textContent = 'Settings allow you to adjust options such as competition randomness, difficulty, and enabled twists.';
    container.appendChild(p7b);

    const p7c = document.createElement('p');
    p7c.textContent = 'Once the game starts, the house runs on its own — sit back and see how the story unfolds.';
    container.appendChild(p7c);

    return container;
  }

  function showRulesModal() {
    const dim = ensureModal();
    const panel = dim.querySelector('.rulesPanel');
    const body = dim.querySelector('.rulesBody');
    const ok = dim.querySelector('#rulesOkBtn');

    // Replace content
    body.innerHTML = '';
    body.appendChild(buildRulesContent());

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
    setTimeout(() => { try { ok.focus(); } catch {} }, 100);

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

    // Small delay for CSS transition, then hide
    setTimeout(() => {
      dim.style.display = 'none';
      // Restore scroll
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      // Restore focus
      try { lastFocusEl && lastFocusEl.focus && lastFocusEl.focus(); } catch {}
      
      // Dispatch event that rules were acknowledged
      try {
        const evt = new CustomEvent('bb:rules:acknowledged', { detail: {} });
        window.dispatchEvent(evt);
        console.info('[rules] dispatched bb:rules:acknowledged');
      } catch(e) {
        console.warn('[rules] failed to dispatch bb:rules:acknowledged', e);
      }
    }, 200);
  }

  // Listen for intro finished event
  function setupIntroListener() {
    // Only set up listener if autoShowRulesOnStart is enabled
    const cfg = (global.game && global.game.cfg) || {};
    if (!cfg.autoShowRulesOnStart) {
      console.info('[rules] autoShowRulesOnStart is false — skipping intro listener');
      return;
    }
    
    window.addEventListener('bb:intro:finished', function(e) {
      console.info('[rules] bb:intro:finished received');
      introFinishedReceived = true;
      modalShown = true;
      // Show modal immediately
      setTimeout(() => showRulesModal(), 100);
    }, { once: true });
  }

  // Fallback: wrap startOpeningSequence and show rules if no event arrives
  function setupFallback() {
    // Only set up fallback if autoShowRulesOnStart is enabled
    const cfg = (global.game && global.game.cfg) || {};
    if (!cfg.autoShowRulesOnStart) {
      console.info('[rules] autoShowRulesOnStart is false — skipping fallback');
      return;
    }
    
    const origStart = global.startOpeningSequence;
    if (typeof origStart !== 'function') {
      console.warn('[rules] startOpeningSequence not found — fallback inactive');
      return;
    }

    let wrapped = false;
    global.startOpeningSequence = function wrappedOpeningForRules() {
      if (wrapped) {
        return origStart.apply(this, arguments);
      }
      wrapped = true;

      const result = origStart.apply(this, arguments);

      // If no custom event arrived within a short delay, show the modal
      setTimeout(() => {
        if (!introFinishedReceived && !modalShown) {
          console.info('[rules] fallback: showing rules modal after delay');
          modalShown = true;
          showRulesModal();
        }
      }, 2000);

      return result;
    };
  }

  // Wire Rules buttons (e.g., manual trigger)
  function wireRulesButtons() {
    const btns = [
      document.getElementById('btnRules'),
      ...document.querySelectorAll('button[data-action="rules"]')
    ].filter(Boolean);

    btns.forEach((btn) => {
      if (btn.__rulesWired) return;
      btn.__rulesWired = true;
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        // Allow re-showing the modal when manually triggered
        showRulesModal();
      });
    });
  }

  // Expose to global
  global.showRulesModal = showRulesModal;
  global.hideRulesModal = hideRulesModal;

  // Initialize
  function init() {
    setupIntroListener();
    setupFallback();
    wireRulesButtons();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

})(window);
