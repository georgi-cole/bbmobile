/* Nomination Intro Modal - simplified risk + guaranteed plea flow hookup
   - Risk = statistical base chance (1 / #eligible) + 2x HOH relationship effect
   - Categories: low / medium / high
   - Plea button shown when category === 'high'
   - Attempts to open global.NominationPlea.show(...) and logs diagnostics
   - Keeps pause/watchdog behavior from previous implementation (90s)
*/

const CONFIG = {
  NOMS_MODAL_MAX_PAUSE_MS: 90000, // 90 seconds watchdog
};

let pauseHandle = null;
let pauseWatchTimeout = null;
let abortController = null;
let modalShown = false;

function safeNum(v, fallback = 0) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * computeRiskSimple(playerId, game)
 * - baseChance = 100 / eligibleCount
 * - hohAffinity in 0..1 (default 0.5)
 * - risk = clamp( baseChance + (1 - hohAffinity) * 100 * 2, 0, 100 )
 * - category: low / medium / high
 */
function computeRiskSimple(playerId, game) {
  try {
    const players = (game && (game.players || game.playerList)) || (window.game && window.game.players) || [];
    if (!players || !players.length) {
      console.warn('[NominationIntroModal] computeRiskSimple: no players in game context');
      return { risk: 0, category: 'low', details: {} };
    }

    // Find player
    const player = players.find(p => String(p.id) === String(playerId));
    if (!player) {
      console.warn('[NominationIntroModal] computeRiskSimple: player not found', playerId);
      return { risk: 0, category: 'low', details: {} };
    }

    // Determine eligible set: prefer explicit flag; otherwise exclude hoh and those flagged dead/evicted
    const hohId = (game && game.hohId) || (window.game && window.game.hohId) || null;
    const eligibleList = players.filter(p => {
      if (String(p.id) === String(hohId)) return false;
      if (p.isEvicted || p.evicted || p.isDead || p.dead) return false;
      // if explicit eligibility flag exists and is false -> exclude
      if (typeof p.isEligibleForNomination !== 'undefined') return !!p.isEligibleForNomination;
      return true;
    });
    const eligibleCount = Math.max(1, eligibleList.length);

    // Base statistical chance
    const baseChance = 100 / eligibleCount; // e.g., 10 players -> 10%

    // HOH affinity / relationship - try multiple property names defensively
    let hoh = null;
    if (hohId) hoh = players.find(p => String(p.id) === String(hohId));
    // affinity pulled from game.hohAffinityMap or hoh.affinity or game.affinities
    let affinity = 0.5;
    if (game && game.hohAffinity && typeof game.hohAffinity[playerId] !== 'undefined') {
      affinity = safeNum(game.hohAffinity[playerId], 0.5);
    } else if (hoh && hoh.affinity && typeof hoh.affinity[playerId] !== 'undefined') {
      affinity = safeNum(hoh.affinity[playerId], 0.5);
    } else if (game && game.affinities && game.affinities[hohId] && typeof game.affinities[hohId][playerId] !== 'undefined') {
      affinity = safeNum(game.affinities[hohId][playerId], 0.5);
    } else {
      // fallback to neutral 0.5
      affinity = 0.5;
    }
    affinity = Math.min(1, Math.max(0, affinity));

    // Per your request: 2x the relationship effect (ranges 0..200; clamped to 0..100 below)
    const hohEffect = (1 - affinity) * 100 * 2;

    let numericRisk = baseChance + hohEffect;
    numericRisk = Math.min(100, Math.max(0, numericRisk));
    const rounded = Math.round(numericRisk);

    // Categories (simple three-level):
    // low: <=20, medium: 21..60, high: >=61
    let category = 'low';
    if (rounded > 60) category = 'high';
    else if (rounded > 20) category = 'medium';

    const details = {
      eligibleCount,
      baseChance: Number(baseChance.toFixed(2)),
      affinity: Number(affinity.toFixed(3)),
      hohEffect: Number(hohEffect.toFixed(2)),
      numericRisk: rounded,
      hohId
    };

    console.info('[NominationIntroModal] computeRiskSimple', { playerId, ...details, category });

    return { risk: rounded, category, details, player, hoh };
  } catch (err) {
    console.error('[NominationIntroModal] computeRiskSimple error', err);
    return { risk: 0, category: 'low', details: {} };
  }
}

/* Pause helpers (same pattern as earlier) */
function requestPause() {
  try {
    console.info('[NominationIntroModal] Requesting timer pause...');
    const handle = (typeof requestTimerPause === 'function') ? requestTimerPause() : null;
    pauseHandle = handle;
    console.info('[NominationIntroModal] Pause handle:', handle);

    if (pauseWatchTimeout) clearTimeout(pauseWatchTimeout);
    pauseWatchTimeout = setTimeout(() => {
      console.warn('[NominationIntroModal] Pause watchdog expired after', CONFIG.NOMS_MODAL_MAX_PAUSE_MS, 'ms');
      try {
        if (pauseHandle && typeof releaseTimerPause === 'function') {
          releaseTimerPause(pauseHandle);
          console.info('[NominationIntroModal] Watchdog released pause handle');
        }
      } catch (e) {
        console.error('[NominationIntroModal] Error releasing pause on watchdog', e);
      } finally {
        pauseHandle = null;
      }
    }, CONFIG.NOMS_MODAL_MAX_PAUSE_MS);
    return handle;
  } catch (err) {
    console.error('[NominationIntroModal] requestPause failed', err);
    return null;
  }
}

function releasePause() {
  try {
    if (pauseWatchTimeout) {
      clearTimeout(pauseWatchTimeout);
      pauseWatchTimeout = null;
    }
    if (pauseHandle) {
      console.info('[NominationIntroModal] Releasing pause handle', pauseHandle);
      if (typeof releaseTimerPause === 'function') {
        releaseTimerPause(pauseHandle);
        console.info('[NominationIntroModal] releaseTimerPause called');
      } else {
        console.warn('[NominationIntroModal] releaseTimerPause not available');
      }
      pauseHandle = null;
    } else {
      console.info('[NominationIntroModal] No pause handle to release');
    }
  } catch (err) {
    console.error('[NominationIntroModal] releasePause error', err);
    pauseHandle = null;
  }
}

/* Render modal content & plea button wiring */
function renderModalContent(modalEl, playerId, game) {
  modalEl.innerHTML = ''; // clear
  const { risk, category, details, player, hoh } = computeRiskSimple(playerId, game);

  const h = document.createElement('h3');
  h.textContent = 'Nomination Risk';
  modalEl.appendChild(h);

  const p = document.createElement('p');
  p.textContent = `Chance: ${risk}% — ${category.toUpperCase()}`;
  p.style.fontWeight = '700';
  modalEl.appendChild(p);

  const info = document.createElement('pre');
  info.textContent = `Details: ${JSON.stringify(details, null, 2)}`;
  info.style.fontSize = '12px';
  info.style.opacity = '0.9';
  modalEl.appendChild(info);

  // Show plea button only for 'high' category
  if (category === 'high') {
    const pleaWrap = document.createElement('div');
    pleaWrap.style.marginTop = '12px';

    const pleaBtn = document.createElement('button');
    pleaBtn.className = 'nom-plea-btn';
    pleaBtn.textContent = '🙏 Make a Plea to HOH';
    pleaBtn.style.cssText = 'padding:10px 18px;border-radius:8px;background:#ffcc00;border:none;cursor:pointer;font-weight:600';

    pleaBtn.addEventListener('click', async (ev) => {
      ev.stopPropagation();
      console.info('[NominationIntroModal] Plea button clicked', { playerId, hohId: details.hohId });
      await openPleaModalOrFlow(playerId, details.hohId, modalEl, game);
    });

    pleaWrap.appendChild(pleaBtn);
    modalEl.appendChild(pleaWrap);
  } else {
    const note = document.createElement('small');
    note.textContent = 'Plea available only for HIGH risk candidates.';
    note.style.display = 'block';
    note.style.marginTop = '10px';
    modalEl.appendChild(note);
  }
}

/**
 * openPleaModalOrFlow(playerId, hohId, modalEl, game)
 * - tries global.NominationPlea.show(playerId, hohId)
 * - if not available, falls back to a simulated plea flow UI so you can test local behavior
 * - after plea completes, re-render risk (modal remains open)
 */
async function openPleaModalOrFlow(playerId, hohId, modalEl, game) {
  try {
    // If there's an exported global plea module
    if (globalThis.NominationPlea && typeof globalThis.NominationPlea.show === 'function') {
      console.info('[NominationIntroModal] Calling global.NominationPlea.show');
      try {
        await globalThis.NominationPlea.show(playerId, hohId);
        console.info('[NominationIntroModal] global.NominationPlea.show completed');
      } catch (err) {
        console.error('[NominationIntroModal] global.NominationPlea.show threw', err);
      }
      // Re-render risk after plea
      renderModalContent(modalEl, playerId, game);
      return;
    }

    // Fallback: show a simple simulated plea modal (for local testing)
    console.warn('[NominationIntroModal] global.NominationPlea.show not available — showing local simulated plea UI');
    const sim = document.createElement('div');
    sim.style.border = '1px dashed #999';
    sim.style.padding = '10px';
    sim.style.marginTop = '12px';
    sim.innerHTML = `<div><strong>Simulated Plea</strong></div>
                     <div style="margin-top:8px">Do you want to attempt a plea to the HOH for player ${playerId}?</div>`;
    const ok = document.createElement('button');
    ok.textContent = 'Send Plea';
    ok.style.marginRight = '8px';
    const cancel = document.createElement('button');
    cancel.textContent = 'Cancel';
    sim.appendChild(ok);
    sim.appendChild(cancel);
    modalEl.appendChild(sim);

    const cleanup = () => { try { if (sim.parentNode) sim.parentNode.removeChild(sim); } catch(e){ console.warn('[NominationIntroModal] cleanup error', e); } };

    return new Promise((resolve) => {
      ok.addEventListener('click', async () => {
        console.info('[NominationIntroModal] Simulated plea sent for', playerId);
        // Simulate async work & effect: e.g., reduce energy or mark plea sent
        await new Promise(r => setTimeout(r, 700));
        // Optionally mutate player state for testing (if available)
        const players = (game && (game.players || game.playerList)) || (window.game && window.game.players) || [];
        const pl = players.find(x => String(x.id) === String(playerId));
        if (pl) { pl.lastPleaAttempt = Date.now(); } // mark plea attempt timestamp for downstream logic
        cleanup();
        renderModalContent(modalEl, playerId, game);
        resolve();
      }, { once: true });

      cancel.addEventListener('click', () => {
        console.info('[NominationIntroModal] Simulated plea canceled');
        cleanup();
        resolve();
      }, { once: true });
    });
  } catch (err) {
    console.error('[NominationIntroModal] openPleaModalOrFlow error', err);
  }
}

/**
 * show(playerId)
 * - builds modal, requests pause, renders content
 */
function show(playerId) {
  try {
    if (modalShown) {
      console.info('[NominationIntroModal] show: modal already open');
      return;
    }
    modalShown = true;
    abortController = new AbortController();

    const game = globalThis.game || window.game || {};

    // build overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;left:0;top:0;right:0;bottom:0;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;z-index:9999;';
    overlay.className = 'nom-overlay';

    const modalEl = document.createElement('div');
    modalEl.style.cssText = 'width:520px;max-width:96%;background:white;padding:18px;border-radius:10px;box-shadow:0 8px 30px rgba(0,0,0,0.35);';
    modalEl.className = 'nom-modal-inner';

    overlay.appendChild(modalEl);
    document.body.appendChild(overlay);

    // request pause for the phase timer
    requestPause();

    // render initial content
    renderModalContent(modalEl, playerId, game);

    // close on outside click
    const outsideHandler = (e) => {
      if (e.target === overlay) {
        dismiss(overlay);
      }
    };
    overlay.addEventListener('click', outsideHandler, { signal: abortController.signal });

    // escape to close
    const onKey = (ev) => {
      if (ev.key === 'Escape') dismiss(overlay);
    };
    window.addEventListener('keydown', onKey, { signal: abortController.signal });

  } catch (err) {
    console.error('[NominationIntroModal] show error', err);
    modalShown = false;
  }
}

/* dismiss - final close and release pause */
function dismiss(overlay) {
  try {
    console.info('[NominationIntroModal] dismiss called');
    if (abortController) {
      try { abortController.abort(); } catch (e) { /* ignore */ }
      abortController = null;
    }
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    // release pause
    releasePause();
  } catch (err) {
    console.error('[NominationIntroModal] dismiss error', err);
  } finally {
    modalShown = false;
  }
}

/* Export attach to global for runtime usage */
const NominationIntroModal = {
  show,
  computeRiskSimple // for tests
};

if (!globalThis.NominationIntroModal) globalThis.NominationIntroModal = NominationIntroModal;
export default NominationIntroModal;
