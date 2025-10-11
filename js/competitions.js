// MODULE: competitions.js
// HOH eligibility, minigames, scoreboards, Final 3 flow, TV updates.
// Enhanced: wait for reveal cards to finish; show Strategize card before Social;
// increment HOH win stats.
// New: guard to ensure HOH selection and winner card happen only once.
// Hardened: safe fallbacks if social module name differs.
//
// PHASE 1 REFACTOR COMPLETE:
// - All legacy minigames migrated to new module pattern (js/minigames/*.js)
// - Non-repeating pool selection enforced via MinigameSelector
// - Legacy renderMinigame function deprecated (bridged in minigames/index.js)
// - All game selection now routes through unified registry and selector
// - Mobile-first design with 11 active games, 4 retired for UX reasons

(function (global) {
  const $ = global.$;

  // Defensive loader for CompLocks module
  // Ensures comp-locks.js is loaded even if not included in index.html
  if (!global.CompLocks) {
    console.warn('[Competition] CompLocks module not found, loading inline fallback');
    global.CompLocks = {
      hasSubmittedThisWeek() { return false; },
      lockSubmission() { /* no-op fallback */ }
    };
  }

  // Legacy game list constants kept for backwards compatibility
  // NOTE: These are no longer used for selection - kept for reference only
  // All selection now happens through MinigameSelector (js/minigames/selector.js)
  const LEGACY_MG_LIST = ['clicker', 'memory', 'math', 'bar', 'typing', 'reaction', 'numseq', 'pattern', 'slider', 'anagram', 'path', 'target', 'pairs', 'simon', 'estimate'];
  const RETIRED_GAMES = ['typing', 'reaction', 'slider', 'path', 'simon'];
  const ACTIVE_LEGACY = LEGACY_MG_LIST.filter(g => !RETIRED_GAMES.includes(g));
  const MG_LIST = ACTIVE_LEGACY;

  function safeShowCard(title, lines = [], tone = 'neutral', dur = 4200, uniform = false) {
    try {
      if (typeof global.showCard === 'function') {
        return global.showCard(title, lines, tone, dur, uniform);
      }
      const tvNow = document.getElementById('tvNow');
      if (tvNow) {
        const msg = [title || 'Update'].concat(Array.isArray(lines) ? lines : []).join(' — ');
        tvNow.textContent = msg;
      }
    } catch (e) { }
    return undefined;
  }
  async function waitCardsIdle() {
    try {
      if (typeof global.cardQueueWaitIdle === 'function') {
        await global.cardQueueWaitIdle();
      }
    } catch (e) { }
  }

  // Fisher-Yates shuffle for legacy pool (one-time per season)
  function shuffleLegacyPool() {
    const g = global.game;
    if (!g.__legacyPoolShuffled) {
      const pool = MG_LIST.slice();
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor((global.rng?.() || Math.random()) * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      g.__shuffledLegacyPool = pool;
      g.__legacyPoolShuffled = true;
      g.__legacyPoolIndex = 0;
    }
    return g.__shuffledLegacyPool || MG_LIST;
  }

  /**
   * Check if minigame system is ready
   * Returns true if all required components are loaded
   * Accept either MinigameRegistry or MiniGamesRegistry naming.
   */
  function isMinigameSystemReady() {
    const registryOk = !!(global.MinigameRegistry || global.MiniGamesRegistry);
    return !!(registryOk && global.MinigameSelector && global.renderMinigame);
  }

  /**
   * Pick the next minigame type using the Phase 1 unified system
   * Uses non-repeating pool selection to ensure variety within a season
   * All games are now routed through the MinigameSelector for consistent behavior
   */
  function pickMinigameType() {
    const g = global.game;

    // Initialize miniHistory if needed (for backwards compatibility tracking)
    if (!g.miniHistory) g.miniHistory = [];

    // Purge stale 'clicker' miniMode when user switches to random
    if (g?.cfg?.miniMode === 'random' && g.__lastMiniMode === 'clicker') {
      delete g.__lastMiniMode;
      console.info('[Minigame] Cleared stale clicker mode');
    } else if (g?.cfg?.miniMode) {
      g.__lastMiniMode = g.cfg.miniMode;
    }

    // Legacy mode override: clicker only (for backwards compatibility)
    if (g?.cfg?.miniMode === 'clicker') {
      g.miniHistory.push('quickTap');
      return 'quickTap'; // Map to new quickTap module
    }

    // Cycle mode: use deterministic cycling through available games
    if (g?.cfg?.miniMode === 'cycle') {
      const Registry = global.MinigameRegistry || global.MiniGamesRegistry;
      if (!Registry) {
        console.warn('[Minigame] Registry not available for cycle mode');
        return 'quickTap';
      }

      const available = Registry.getImplementedGames(true);
      if (available.length === 0) {
        console.warn('[Minigame] No games available for cycle mode');
        return 'quickTap';
      }

      // Initialize cycle index if needed
      if (typeof g.miniIndex !== 'number') g.miniIndex = 0;

      const selected = available[g.miniIndex % available.length];
      g.miniIndex++;
      g.miniHistory.push(selected);

      console.info('[Minigame] Cycle mode selected:', selected);
      return selected;
    }

    // PRIMARY SYSTEM: Use Phase 1 minigame system with non-repeating pool
    const Registry = global.MinigameRegistry || global.MiniGamesRegistry;
    if (!global.MinigameSelector || !Registry) {
      console.error('[Minigame] Phase 1 system not available! MinigameSelector:', !!global.MinigameSelector, 'Registry:', !!Registry);
      // Emergency fallback
      return 'quickTap';
    }

    console.info('[Minigame] Using Phase 1 non-repeating pool system');
    const selectedGame = global.MinigameSelector.selectNext(true);

    if (!selectedGame) {
      console.error('[Minigame] Selector failed to return a game!');
      return 'quickTap'; // Emergency fallback
    }

    // Track in history for backwards compatibility
    g.miniHistory.push(selectedGame);

    console.info('[Minigame] Selected:', selectedGame);

    return selectedGame;
  }
  global.pickMinigameType = pickMinigameType;

  // Calculate AI difficulty adjustment based on recent human win rate
  function getAIDifficultyMultiplier() {
    const g = global.game;
    if (!g || !g.players) return 1.0;
    const humanId = g.humanId;
    if (!humanId) return 1.0;

    const human = global.getP?.(humanId);
    if (!human) return 1.0;

    // Count recent human comp wins (HOH + Veto)
    const humanHohWins = human?.stats?.hohWins || 0;
    const humanVetoWins = human?.stats?.vetoWins || 0;
    const totalHumanWins = humanHohWins + humanVetoWins;

    // If human is winning too much, boost AI slightly
    // If human is losing, reduce AI difficulty slightly
    const week = g.week || 1;
    const expectedWinRate = 0.15; // ~15% win rate is fair for 1 human vs multiple AI
    const actualWinRate = week > 1 ? totalHumanWins / (week * 2) : 0;

    // Adjust AI multiplier: if human wins more than expected, boost AI
    // Range: 0.85 to 1.15 (max 15% adjustment)
    const adjustment = (actualWinRate - expectedWinRate) * 0.5;
    return Math.max(0.85, Math.min(1.15, 1.0 + adjustment));
  }

  function isHumanEligible(phase) {
    const g = global.game; const you = global.getP?.(g.humanId);
    if (!you || you.evicted) return false;
    if (phase === 'hoh') {
      const alive = global.alivePlayers(); const isF4 = alive.length === 4;
      if (g.week === 1) return true;
      return isF4 ? true : (g.lastHOHId !== you.id);
    }
    return true;
  }
  global.isHumanEligible = isHumanEligible;

  function submitScore(id, base, mult, label) {
    const g = global.game; g.lastCompScores = g.lastCompScores || new Map();
    if (g.lastCompScores.has(id)) return false;

    // Use new scoring system if enabled and available
    let normalizedBase = base;
    if (g?.cfg?.useNewMinigames && global.MinigameScoring) {
      // New system: scores should already be 0-100 from games
      // Just ensure they're in valid range
      normalizedBase = Math.max(0, Math.min(100, base));
    } else {
      // Legacy normalization
      if (base > 100) {
        // Legacy games might return higher scores, normalize them
        normalizedBase = Math.min(100, (base / 120) * 100);
      }
    }

    // Apply compBeast multiplier and clamp to reasonable range
    const final = Math.max(0, Math.min(150, normalizedBase * mult));

    g.lastCompScores.set(id, final);

    // Log completion to telemetry
    if (global.MinigameTelemetry && label) {
      const gameKey = label.split('/')[1] || 'unknown';
      global.MinigameTelemetry.logComplete(gameKey, {
        score: base,
        normalizedScore: normalizedBase,
        finalScore: final,
        playerId: id,
        phase: g.phase,
        multiplier: mult
      });
    }

    // Lock submission for this week/phase/game to prevent replay
    if (global.CompLocks && label) {
      const gameKey = label.split('/')[1] || 'unknown';
      global.CompLocks.lockSubmission(g.week, g.phase, gameKey, id);
    }

    // Hidden scoring: only log that player completed, not the score
    global.addLog(`${global.safeName(id)} completed the ${g.phase === 'hoh' ? 'HOH' : 'competition'}.`, 'tiny');
    return true;
  }

  function maybeFinishComp() {
    const g = global.game; const alive = global.alivePlayers();
    let eligible = alive.map(p => p.id);
    if (g.phase === 'hoh' && alive.length !== 4 && g.week > 1 && g.lastHOHId) eligible = eligible.filter(id => id !== g.lastHOHId);
    const done = [...g.lastCompScores.keys()].filter(id => eligible.includes(id)).length;
    if (done === eligible.length) { finishCompPhase(); }
  }

  function logScoreboard(title, scoresMap, ids) {
    // Hidden: don't log full scoreboard anymore
    // Full results are shown in reveal card
  }

  // Helper: run a human minigame with both replay-lock and anti-cheat
  function runHumanMinigameWithGuards({ mg, host, player, label, multiplier, onAfterSubmit }) {
    const g = global.game;

    // 1) Block replays for this week/phase/game
    if (global.CompLocks && global.CompLocks.hasSubmittedThisWeek(g.week, g.phase, mg, player.id)) {
      host.innerHTML = '<div class="tiny muted">You have already submitted for this competition.</div>';
      return;
    }

    // 2) Start AntiCheat session if available
    let antiCheatSessionId = null;
    if (global.AntiCheat) {
      antiCheatSessionId = global.AntiCheat.startSession({
        container: host,
        gameKey: mg,
        thresholds: { minPlayTime: 3000, maxDuration: 300000, minDistinctInputs: 3 }
      });
    }

    // 3) Render game & validate
    global.renderMinigame?.(mg, host, (base) => {
      if (antiCheatSessionId && global.AntiCheat) {
        const v = global.AntiCheat.validate(antiCheatSessionId);
        if (!v.valid) {
          console.warn('[Competition] Anti-cheat validation failed:', v.reason);
          host.innerHTML = `<div class="tiny" style="color:#ff6b9d;">⚠️ Submission blocked: ${v.reason}</div>`;
          global.AntiCheat.cleanup(antiCheatSessionId);
          return;
        }
        global.AntiCheat.cleanup(antiCheatSessionId);
      }

      if (submitScore(player.id, base, multiplier, label)) {
        host.innerHTML = '<div class="tiny muted">Submission received. Waiting for others…</div>';
        if (typeof onAfterSubmit === 'function') onAfterSubmit();
        maybeFinishComp();
      }
    });
  }

  // Reusable tri-slot reveal sequence for competitions
  // Can be used for HOH, Veto, or other top-3 reveals
  // Enhanced with optional avatar display
  // NEW: Show single results popup with winner + top 2 runners-up with avatars
  if (!global.showResultsPopup) {
    global.showResultsPopup = async function showResultsPopup(options) {
      const {
        title = 'Results',
        topThree = [],
        winnerEmoji = '👑',
        duration = 4500
      } = options;

      if (!topThree || topThree.length === 0) return;

      function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

      // Helper to get avatar URL and player data
      function getPlayerData(entry) {
        let player = null;
        let name = '';
        let score = '';

        if (typeof entry === 'object') {
          if (entry.id) {
            player = global.getP?.(entry.id);
          }
          name = entry.name || player?.name || 'Player';
          score = entry.score !== undefined ? entry.score : (entry.sc !== undefined ? entry.sc : '');
        } else {
          name = entry || 'Player';
        }

        let avatarUrl = player?.avatar || player?.img || player?.photo;
        if (!avatarUrl) {
          avatarUrl = `https://api.dicebear.com/6.x/bottts/svg?seed=${encodeURIComponent(name)}`;
        }

        return { name, score, avatarUrl };
      }

      try {
        const modal = document.createElement('div');
        modal.className = 'results-modal-overlay';
        modal.style.cssText = `
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: rgba(0,0,0,0.85);
          backdrop-filter: blur(3px);
          display: grid;
          place-items: center;
          animation: resultsModalFadeIn 0.3s ease;
        `;

        const card = document.createElement('div');
        card.className = 'results-card';
        card.style.cssText = `
          background: linear-gradient(135deg, #1a2937, #0f1a28);
          border: 1px solid rgba(120,180,240,0.3);
          border-radius: 20px;
          padding: 28px 24px;
          box-shadow: 0 20px 50px -20px rgba(0,0,0,0.9);
          max-width: min(480px, 90vw);
          width: 100%;
          animation: resultsCardSlideIn 0.4s ease;
        `;

        const titleEl = document.createElement('div');
        titleEl.textContent = `${title} ${winnerEmoji}`;
        titleEl.style.cssText = `
          font-size: 1.4rem;
          font-weight: 800;
          letter-spacing: 0.5px;
          color: #ffd96b;
          text-align: center;
          margin-bottom: 24px;
          text-shadow: 0 2px 8px rgba(0,0,0,0.5);
        `;
        card.appendChild(titleEl);

        if (topThree[0]) {
          const winner = getPlayerData(topThree[0]);
          const winnerSection = document.createElement('div');
          winnerSection.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 12px;
            margin-bottom: 20px;
            padding-bottom: 20px;
            border-bottom: 1px solid rgba(120,180,240,0.2);
          `;

          const winnerAvatar = document.createElement('img');
          winnerAvatar.src = winner.avatarUrl;
          winnerAvatar.alt = winner.name;
          winnerAvatar.onerror = function () {
            console.warn(`[avatar] failed to load url=${this.src} player=${winner.name}`);
            this.onerror = null;
            this.src = `https://api.dicebear.com/6.x/bottts/svg?seed=${encodeURIComponent(winner.name)}`;
          };
          winnerAvatar.style.cssText = `
            width: 110px;
            height: 110px;
            border-radius: 50%;
            border: 3px solid #ffd96b;
            box-shadow: 0 4px 20px rgba(255,217,107,0.4);
            object-fit: cover;
          `;
          winnerSection.appendChild(winnerAvatar);

          const winnerName = document.createElement('div');
          winnerName.textContent = winner.name;
          winnerName.style.cssText = `
            font-size: 1.3rem;
            font-weight: 700;
            color: #ffffff;
            text-align: center;
          `;
          winnerSection.appendChild(winnerName);

          if (winner.score !== '') {
            const winnerScore = document.createElement('div');
            winnerScore.textContent = `Score: ${winner.score}`;
            winnerScore.style.cssText = `
              font-size: 1rem;
              font-weight: 600;
              color: #88e6a0;
              text-align: center;
            `;
            winnerSection.appendChild(winnerScore);
          }

          card.appendChild(winnerSection);
        }

        if (topThree[1] || topThree[2]) {
          const runnersUpSection = document.createElement('div');
          runnersUpSection.style.cssText = `
            display: flex;
            justify-content: center;
            gap: 20px;
            flex-wrap: wrap;
          `;

          [topThree[1], topThree[2]].forEach((entry, idx) => {
            if (!entry) return;

            const player = getPlayerData(entry);
            const place = idx === 0 ? '2nd' : '3rd';

            const runnerUp = document.createElement('div');
            runnerUp.style.cssText = `
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 8px;
              flex: 0 0 auto;
            `;

            const runnerAvatar = document.createElement('img');
            runnerAvatar.src = player.avatarUrl;
            runnerAvatar.alt = player.name;
            runnerAvatar.onerror = function () {
              console.warn(`[avatar] failed to load url=${this.src} player=${player.name}`);
              this.onerror = null;
              this.src = `https://api.dicebear.com/6.x/bottts/svg?seed=${encodeURIComponent(player.name)}`;
            };
            runnerAvatar.style.cssText = `
              width: 65px;
              height: 65px;
              border-radius: 50%;
              border: 2px solid #7cffad;
              box-shadow: 0 2px 12px rgba(124,255,173,0.3);
              object-fit: cover;
            `;
            runnerUp.appendChild(runnerAvatar);

            const runnerPlace = document.createElement('div');
            runnerPlace.textContent = place;
            runnerPlace.style.cssText = `
              font-size: 0.75rem;
              font-weight: 700;
              color: #96cfff;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            `;
            runnerUp.appendChild(runnerPlace);

            const runnerName = document.createElement('div');
            runnerName.textContent = player.name;
            runnerName.style.cssText = `
              font-size: 0.95rem;
              font-weight: 600;
              color: #cedbeb;
              text-align: center;
            `;
            runnerUp.appendChild(runnerName);

            if (player.score !== '') {
              const runnerScore = document.createElement('div');
              runnerScore.textContent = player.score;
              runnerScore.style.cssText = `
                font-size: 0.85rem;
                color: #88e6a0;
              `;
              runnerUp.appendChild(runnerScore);
            }

            runnersUpSection.appendChild(runnerUp);
          });

          card.appendChild(runnersUpSection);
        }

        modal.appendChild(card);
        document.body.appendChild(modal);

        await sleep(duration);
        modal.style.animation = 'resultsModalFadeOut 0.3s ease';
        await sleep(300);
        modal.remove();
      } catch (e) {
        console.warn('[resultsPopup] error', e);
      }
    };
  }

  async function showTriSlotReveal(options) {
    const {
      title = 'Competition',
      topThree = [],
      winnerEmoji = '👑',
      winnerTone = 'ok',
      introDuration = 2000,
      placeDuration = 2000,
      winnerDuration = 3200,
      showIntro = true,
      showAvatars = false, // kept for API compatibility
      useNewPopup = true // NEW: Use the new popup design
    } = options;

    // Use new results popup if enabled
    if (useNewPopup && typeof global.showResultsPopup === 'function') {
      const formattedTopThree = topThree.map(entry => ({
        id: entry.id,
        name: entry.name,
        score: entry.sc || entry.score
      }));

      return global.showResultsPopup({
        title: title,
        phase: global.game?.phase || '',
        topThree: formattedTopThree,
        winnerEmoji: winnerEmoji,
        duration: winnerDuration
      });
    }

    function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

    try {
      if (showIntro && typeof global.showCard === 'function') {
        global.showCard(title, ['Revealing top 3...'], 'neutral', introDuration);
        if (typeof global.cardQueueWaitIdle === 'function') {
          await global.cardQueueWaitIdle();
        }
        await sleep(400);
      }

      if (topThree[2]) {
        if (typeof global.showCard === 'function') {
          const lines = [topThree[2].name || topThree[2]];
          global.showCard('3rd Place', lines, 'neutral', placeDuration);
          if (typeof global.cardQueueWaitIdle === 'function') {
            await global.cardQueueWaitIdle();
          }
          await sleep(1200);
        }
      }

      if (topThree[1]) {
        if (typeof global.showCard === 'function') {
          const lines = [topThree[1].name || topThree[1]];
          global.showCard('2nd Place', lines, 'neutral', placeDuration);
          if (typeof global.cardQueueWaitIdle === 'function') {
            await global.cardQueueWaitIdle();
          }
          await sleep(1200);
        }
      }

      if (topThree[0]) {
        if (typeof global.showCard === 'function') {
          const winnerTitle = `${title} Winner ${winnerEmoji}`;
          const lines = [topThree[0].name || topThree[0]];
          global.showCard(winnerTitle, lines, winnerTone, winnerDuration);
          if (typeof global.cardQueueWaitIdle === 'function') {
            await global.cardQueueWaitIdle();
          }
        }
      }
    } catch (e) {
      console.warn('[triSlotReveal] sequence error', e);
    }
  }

  // Expose globally for reuse
  global.showTriSlotReveal = showTriSlotReveal;

  // New: Show top-3 reveal card with crown animation
  async function showCompetitionReveal(title, scoresMap, ids) {
    const arr = [...scoresMap.entries()]
      .filter(([id]) => ids.includes(id))
      .map(([id, sc]) => ({ id, sc, name: global.safeName(id) }))
      .sort((a, b) => b.sc - a.sc);

    if (arr.length === 0) return;

    const top3 = arr.slice(0, 3);

    // Use reusable tri-slot reveal with new popup design
    await showTriSlotReveal({
      title: title,
      topThree: top3,
      winnerEmoji: '👑',
      winnerTone: 'ok',
      showIntro: false,
      useNewPopup: true
    });

    // Add crown animation to winner
    setTimeout(() => {
      const winnerName = top3[0].name;
      document.querySelectorAll('.top-roster-tile').forEach(tile => {
        const name = tile.querySelector('.top-tile-name')?.textContent;
        if (name === winnerName) {
          const crown = tile.querySelector('.badge-crown');
          if (crown) crown.classList.add('crownPulse');
        }
      });
    }, 500);
  }

  function renderCompPanel(panel) {
    const g = global.game;
    if (g.phase === 'hoh') return renderHOH(panel);
    if (g.phase === 'final3_comp1') return renderF3P1(panel);
    if (g.phase === 'final3_comp2') return renderF3P2(panel);
    if (g.phase === 'final3_comp3') return renderF3P3(panel);
    panel.innerHTML = '<div class="tiny muted">Competition running…</div>';
  }
  global.renderCompPanel = renderCompPanel;

  function renderHOH(panel) {
    const g = global.game; panel.innerHTML = '';
    const host = document.createElement('div'); host.className = 'miniggame-host minigame-host';
    const you = global.getP?.(g.humanId);

    // Check if minigame system is ready
    if (!isMinigameSystemReady()) {
      host.innerHTML = '<div class="tiny muted">Loading minigame system...</div>';
      panel.appendChild(host);
      setTimeout(() => {
        if (isMinigameSystemReady()) {
          renderHOH(panel);
        } else {
          console.error('[Competition] Minigame system failed to load');
          host.innerHTML = '<div class="tiny muted">Error loading minigames. Please refresh the page.</div>';
        }
      }, 500);
      return;
    }

    if (you && !you.evicted) {
      const alive = global.alivePlayers(); const blocked = (alive.length !== 4 && g.week > 1) ? g.lastHOHId : null;
      if (you.id !== blocked && !g.lastCompScores?.has(you.id)) {
        const mg = pickMinigameType();

        runHumanMinigameWithGuards({
          mg,
          host,
          player: you,
          label: `HOH/${mg}`,
          multiplier: (0.75 + (you?.compBeast || 0.5) * 0.6),
          onAfterSubmit: () => { /* no-op */ }
        });

      } else {
        host.innerHTML = '<div class="tiny muted">Not eligible this week or already submitted.</div>';
      }
    } else {
      host.innerHTML = '<div class="tiny muted">You are evicted and cannot compete.</div>';
    }
    panel.appendChild(host);
  }

  function startHOH() {
    const g = global.game;
    g.lastCompScores = new Map(); g.hohOrder = [];
    g.__hohResolved = false;
    g.__compRunning = true; // Mark competition as running
    global.markCompPlayed?.('hoh'); // Mark HOH as played
    global.tv.say('HOH Competition'); global.phaseMusic?.('hoh');
    global.setPhase('hoh', g.cfg.tHOH, finishCompPhase);
    const alive = global.alivePlayers(); const blocked = (alive.length !== 4 && g.week > 1) ? g.lastHOHId : null;
    const diffMult = getAIDifficultyMultiplier();
    for (const p of alive) {
      if (p.id === blocked || p.human) continue;
      setTimeout(() => {
        if (g.phase !== 'hoh') return;
        const baseScore = 8 + (global.rng?.() || Math.random()) * 20;
        const aiMultiplier = (0.75 + (p.compBeast || 0.5) * 0.6) * diffMult;
        submitScore(p.id, baseScore, aiMultiplier, 'HOH/AI');
        maybeFinishComp();
      }, 300 + (global.rng?.() || Math.random()) * (g.cfg.tHOH * 620));
    }
  }
  global.startHOH = startHOH;

  async function finishCompPhase() {
    const g = global.game; if (g.phase !== 'hoh') return;
    if (g.__hohResolved) return;
    g.__hohResolved = true;
    g.__compRunning = false; // Clear competition running flag

    const alive = global.alivePlayers(); let elig = alive.map(p => p.id);
    if (alive.length !== 4 && g.week > 1 && g.lastHOHId) elig = elig.filter(id => id !== g.lastHOHId);

    // Apply dampening for consecutive winners
    for (const id of elig) {
      if (!g.lastCompScores.has(id)) {
        let baseScore = 5 + (global.rng?.() || Math.random()) * 20;
        const p = global.getP(id);
        if (p) {
          const recentWins = (p.stats?.hohWins || 0) + (p.stats?.vetoWins || 0);
          if (recentWins >= 2) {
            baseScore *= (0.85 + Math.random() * 0.15); // Slight reduction
          }
        }
        g.lastCompScores.set(id, baseScore);
      }
    }

    // Show top-3 reveal card
    await showCompetitionReveal('HOH Competition', g.lastCompScores, elig);
    await waitCardsIdle();

    const winner = [...g.lastCompScores.entries()].filter(([id]) => elig.includes(id)).sort((a, b) => b[1] - a[1])[0][0];
    for (const p of g.players) p.hoh = false; g.hohId = winner; g.lastHOHId = winner; const W = global.getP(winner); W.hoh = true; W.stats = W.stats || {}; W.wins = W.wins || {}; W.stats.hohWins = (W.stats.hohWins || 0) + 1; W.wins.hoh = (W.wins.hoh || 0) + 1;

    // Sync player badge states after HOH change
    if (typeof global.syncPlayerBadgeStates === 'function') global.syncPlayerBadgeStates();

    global.addLog(`HOH: <span class="accent">${global.safeName(winner)}</span>.`);

    // Hook: Log XP for HOH win
    if (global.ProgressionEvents?.onHOHWin) global.ProgressionEvents.onHOHWin(winner, elig);

    await waitCardsIdle();

    safeShowCard('Strategize', ['It’s time to strategize before the Nomination Ceremony.'], 'social', 4200, true);

    await waitCardsIdle();

    // Robust social call — prefer startSocial, fall back to startSocialIntermission
    const runSocial = global.startSocial || global.startSocialIntermission;
    if (typeof runSocial === 'function') {
      runSocial('hoh', () => {
        global.tv.say('Nominations');
        global.setPhase('nominations', g.cfg.tNoms, () => global.lockNominationsAndProceed?.());
        setTimeout(() => global.startNominations?.(), 50);
      });
    } else {
      // Ultimate fallback: go straight to nominations
      global.tv.say('Nominations');
      global.setPhase('nominations', g.cfg.tNoms, () => global.lockNominationsAndProceed?.());
      setTimeout(() => global.startNominations?.(), 50);
    }

    global.updateHud(); global.renderPanel();
  }

  // Final 3 flow with enhanced modals and pacing
  function startFinal3Flow() {
    showFinalWeekAnnouncement();
  }
  global.startFinal3Flow = startFinal3Flow;

  function showFinalWeekAnnouncement() {
    const g = global.game;

    // Prevent duplicate announcement
    if (g.__finalWeekAnnouncementShown) {
      startF3P1();
      return;
    }
    g.__finalWeekAnnouncementShown = true;

    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 999999;
      background: linear-gradient(135deg, rgba(20,20,40,0.97) 0%, rgba(10,10,30,0.98) 100%);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      animation: modalFadeIn 0.4s ease;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
      background: linear-gradient(145deg, rgba(40,40,80,0.95) 0%, rgba(25,25,50,0.95) 100%);
      border: 2px solid #ffdc8b;
      border-radius: 16px;
      padding: 32px;
      max-width: 520px;
      text-align: center;
      box-shadow: 0 12px 40px rgba(0,0,0,0.6);
    `;

    const icon = document.createElement('div');
    icon.textContent = '🎬';
    icon.style.cssText = `
      font-size: 64px;
      margin-bottom: 16px;
      animation: iconPulse 2s ease infinite;
    `;
    content.appendChild(icon);

    const title = document.createElement('h2');
    title.textContent = 'FINAL WEEK';
    title.style.cssText = `
      font-size: 2rem;
      font-weight: 800;
      color: #ffdc8b;
      margin: 0 0 16px 0;
      letter-spacing: 2px;
      text-shadow: 0 2px 8px rgba(255,220,139,0.4);
    `;
    content.appendChild(title);

    const desc = document.createElement('p');
    desc.textContent = 'Three houseguests remain. The endgame begins with a special three-part competition to determine the Final Head of Household.';
    desc.style.cssText = `
      font-size: 1.1rem;
      line-height: 1.6;
      color: #cedbeb;
      margin: 0 0 20px 0;
    `;
    content.appendChild(desc);

    const structure = document.createElement('div');
    structure.style.cssText = `
      background: rgba(255,220,139,0.08);
      border-radius: 12px;
      padding: 20px;
      margin: 20px 0;
      text-align: left;
    `;

    const structureTitle = document.createElement('div');
    structureTitle.textContent = 'Competition Structure:';
    structureTitle.style.cssText = `
      font-weight: 700;
      color: #ffdc8b;
      margin-bottom: 12px;
      font-size: 1rem;
    `;
    structure.appendChild(structureTitle);

    const parts = [
      'Part 1: All three compete → Winner to Part 3',
      'Part 2: Two losers compete → Winner to Part 3',
      'Part 3: Final showdown → Winner becomes Final HOH'
    ];

    parts.forEach(partText => {
      const partLine = document.createElement('div');
      partLine.textContent = '• ' + partText;
      partLine.style.cssText = `
        color: #b8c9e0;
        margin: 8px 0;
        font-size: 0.95rem;
        line-height: 1.5;
      `;
      structure.appendChild(partLine);
    });

    content.appendChild(structure);

    const note = document.createElement('div');
    note.textContent = 'The Final HOH will then choose who to evict in a live ceremony.';
    note.style.cssText = `
      font-style: italic;
      color: #96cfff;
      font-size: 0.95rem;
      margin-top: 16px;
    `;
    content.appendChild(note);

    modal.appendChild(content);
    document.body.appendChild(modal);

    if (!document.getElementById('finalWeekModalStyles')) {
      const style = document.createElement('style');
      style.id = 'finalWeekModalStyles';
      style.textContent = `
        @keyframes modalFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modalFadeOut { from { opacity: 1; } to { opacity: 0; } }
        @keyframes iconPulse { 
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
      `;
      document.head.appendChild(style);
    }

    setTimeout(() => {
      modal.style.animation = 'modalFadeOut 0.4s ease';
      setTimeout(() => {
        modal.remove();
        startF3P1();
      }, 400);
    }, 5000);
  }

  function renderF3P1(panel) {
    const g = global.game; panel.innerHTML = '';
    const host = document.createElement('div'); host.className = 'minigame-host';
    const you = global.getP?.(g.humanId);

    if (!isMinigameSystemReady()) {
      host.innerHTML = '<div class="tiny muted">Loading minigame system...</div>';
      panel.appendChild(host);
      setTimeout(() => {
        if (isMinigameSystemReady()) {
          renderF3P1(panel);
        } else {
          console.error('[Competition] Minigame system failed to load');
          host.innerHTML = '<div class="tiny muted">Error loading minigames. Please refresh the page.</div>';
        }
      }, 500);
      return;
    }

    if (you && !you.evicted && !g.lastCompScores?.has(you.id)) {
      const mg = pickMinigameType();

      runHumanMinigameWithGuards({
        mg,
        host,
        player: you,
        label: `F3-P1/${mg}`,
        multiplier: (0.8 + (you?.skill || 0.5) * 0.6)
      });

    } else host.innerHTML = '<div class="tiny muted">Waiting for competition to conclude…</div>';
    panel.appendChild(host);
  }

  function startF3P1() {
    const g = global.game;

    safeShowCard('🏆 Part 1', [
      'All three houseguests will compete.',
      'The winner advances directly to Part 3.',
      'The two losers will face off in Part 2.'
    ], 'hoh', 4500, true);

    (function waitCards() {
      if (typeof global.cardQueueWaitIdle === 'function') {
        try {
          global.cardQueueWaitIdle().then(function () { beginF3P1Competition(); });
          return;
        } catch (e) { }
      }
      setTimeout(function () { beginF3P1Competition(); }, 500);
    })();
  }

  function beginF3P1Competition() {
    const g = global.game;
    g.lastCompScores = new Map();
    global.tv.say('Final 3 — Part 1');
    global.phaseMusic?.('hoh');
    global.setPhase('final3_comp1', Math.max(18, Math.floor(g.cfg.tHOH * 0.7)), finishF3P1);
    const diffMult = getAIDifficultyMultiplier();
    for (const p of global.alivePlayers()) {
      if (p.human) continue;
      setTimeout(() => {
        if (g.phase !== 'final3_comp1') return;
        const baseScore = 10 + (global.rng?.() || Math.random()) * 25;
        const aiMultiplier = (0.75 + (p.compBeast || 0.5) * 0.65) * diffMult;
        submitScore(p.id, baseScore, aiMultiplier, 'F3-P1/AI');
      }, 300 + (global.rng?.() || Math.random()) * (g.cfg.tHOH * 520));
    }
  }

  function finishF3P1() {
    const g = global.game; if (g.phase !== 'final3_comp1') return;
    const ids = global.alivePlayers().map(p => p.id);
    for (const id of ids) if (!g.lastCompScores.has(id)) g.lastCompScores.set(id, 5 + (global.rng?.() || Math.random()) * 5);
    const arr = [...g.lastCompScores.entries()].filter(([id]) => ids.includes(id)).sort((a, b) => b[1] - a[1]);

    if (arr.length === 0) {
      console.warn('[F3P1] No scores available, cannot determine winner');
      return;
    }

    const winner = arr[0][0];

    const wanted = arr.slice(1, 3).map(e => e && e[0]).filter(Boolean);
    let losers = wanted.slice();

    if (losers.length < 2) {
      const remaining = ids.filter(id => id !== winner && !losers.includes(id));
      while (losers.length < 2 && remaining.length > 0) {
        losers.push(remaining.shift());
      }
    }

    if (losers.length < 2) {
      console.warn(`[F3P1] Only ${losers.length} losers available (expected 2). Continuing with available players.`);
      if (losers.length === 0) {
        console.warn('[F3P1] No losers available, cannot proceed to Part 2');
        return;
      }
    }

    g.__f3p1Winner = winner;
    global.addLog(`Final 3 Part 1: Winner is ${global.safeName(winner)} (advances to Part 3).`, 'ok');
    safeShowCard('🏆 F3 Part 1 Winner', [global.safeName(winner), 'Advances directly to Part 3!'], 'hoh', 4500, true);
    setTimeout(() => startF3P2(losers), 4600);
  }

  function renderF3P2(panel) {
    panel.innerHTML = ''; const host = document.createElement('div'); host.className = 'minigame-host';
    host.innerHTML = '<div class="tiny muted">Final 3 — Part 2 (head-to-head) is running…</div>'; panel.appendChild(host);
  }

  function startF3P2(duo) {
    const g = global.game;

    safeShowCard('🏆 Part 2', [
      'The two losers from Part 1 compete head-to-head.',
      'The winner advances to Part 3.',
      'The loser is out of the running for Final HOH.'
    ], 'hoh', 4500, true);

    (function waitCards() {
      if (typeof global.cardQueueWaitIdle === 'function') {
        try {
          global.cardQueueWaitIdle().then(function () { beginF3P2Competition(duo); });
          return;
        } catch (e) { }
      }
      setTimeout(function () { beginF3P2Competition(duo); }, 500);
    })();
  }

  function beginF3P2Competition(duo) {
    const g = global.game;
    g.__f3_duo = duo.slice();
    g.lastCompScores = new Map();
    global.tv.say('Final 3 — Part 2');
    global.phaseMusic?.('hoh');
    global.setPhase('final3_comp2', Math.max(18, Math.floor(g.cfg.tHOH * 0.7)), finishF3P2);
    const diffMult = getAIDifficultyMultiplier();

    for (const id of duo) {
      const p = global.getP(id);
      if (p.human) {
        const host = document.querySelector('#panel .minigame-host') || document.querySelector('#panel');
        if (host) {
          if (!isMinigameSystemReady()) {
            const wrap = document.createElement('div'); wrap.className = 'minigame-host'; wrap.style.marginTop = '8px';
            wrap.innerHTML = '<div class="tiny muted">Loading minigame system...</div>'; host.appendChild(wrap);
            setTimeout(() => {
              if (isMinigameSystemReady()) {
                const mg = pickMinigameType();
                runHumanMinigameWithGuards({
                  mg,
                  host: wrap,
                  player: p,
                  label: `F3-P2/${mg}`,
                  multiplier: (0.8 + (p?.skill || 0.5) * 0.6)
                });
              } else {
                console.error('[Competition] Minigame system failed to load');
                wrap.innerHTML = '<div class="tiny muted">Error loading minigames. Please refresh the page.</div>';
              }
            }, 500);
          } else {
            const mg = pickMinigameType();
            const wrap = document.createElement('div'); wrap.className = 'minigame-host'; wrap.style.marginTop = '8px';
            wrap.innerHTML = '<div class="tiny muted">You are in Final 3 — Part 2.</div>'; host.appendChild(wrap);

            runHumanMinigameWithGuards({
              mg,
              host: wrap,
              player: p,
              label: `F3-P2/${mg}`,
              multiplier: (0.8 + (p?.skill || 0.5) * 0.6)
            });
          }
        }
      } else {
        setTimeout(() => {
          if (g.phase !== 'final3_comp2') return;
          const baseScore = 10 + (global.rng?.() || Math.random()) * 25;
          const aiMultiplier = (0.75 + (p.compBeast || 0.5) * 0.65) * diffMult;
          submitScore(p.id, baseScore, aiMultiplier, 'F3-P2/AI');
        }, 300 + (global.rng?.() || Math.random()) * (g.cfg.tHOH * 520));
      }
    }
  }

  function finishF3P2() {
    const g = global.game; if (g.phase !== 'final3_comp2') return;
    const duo = (g.__f3_duo || []).slice();
    for (const id of duo) if (!g.lastCompScores.has(id)) g.lastCompScores.set(id, 5 + (global.rng?.() || Math.random()) * 5);
    const sorted = [...g.lastCompScores.entries()].filter(([id]) => duo.includes(id)).sort((a, b) => b[1] - a[1]);
    const winner = sorted[0][0];
    g.__f3p2Winner = winner;
    global.addLog(`Final 3 Part 2: Winner is ${global.safeName(winner)} (advances to Part 3).`, 'ok');
    safeShowCard('🏆 F3 Part 2 Winner', [global.safeName(winner), 'Advances to Part 3!'], 'hoh', 4500);
    setTimeout(() => startF3P3(), 4600);
  }

  function renderF3P3(panel) {
    panel.innerHTML = ''; const host = document.createElement('div'); host.className = 'minigame-host';
    host.innerHTML = '<div class="tiny muted">Final 3 — Part 3 (final showdown) is running…</div>'; panel.appendChild(host);
  }

  function startF3P3() {
    const g = global.game;

    safeShowCard('🏆 Part 3 — Final Showdown', [
      'The winners of Parts 1 and 2 compete.',
      'The winner becomes the Final Head of Household.',
      'The Final HOH will choose who to evict.'
    ], 'hoh', 4500, true);

    (function waitCards() {
      if (typeof global.cardQueueWaitIdle === 'function') {
        try {
          global.cardQueueWaitIdle().then(function () { beginF3P3Competition(); });
          return;
        } catch (e) { }
      }
      setTimeout(function () { beginF3P3Competition(); }, 500);
    })();
  }

  function beginF3P3Competition() {
    const g = global.game;
    g.lastCompScores = new Map();
    const finalists = [g.__f3p1Winner, g.__f3p2Winner];
    g.__f3_finalists = finalists.slice();
    global.tv.say('Final 3 — Part 3');
    global.phaseMusic?.('hoh');
    global.setPhase('final3_comp3', Math.max(18, Math.floor(g.cfg.tHOH * 0.7)), finishF3P3);
    const diffMult = getAIDifficultyMultiplier();
    for (const id of finalists) {
      const p = global.getP(id);
      if (p.human) {
        const host = document.querySelector('#panel .minigame-host') || document.querySelector('#panel');
        if (host) {
          if (!isMinigameSystemReady()) {
            const wrap = document.createElement('div'); wrap.className = 'minigame-host'; wrap.style.marginTop = '8px';
            wrap.innerHTML = '<div class="tiny muted">Loading minigame system...</div>'; host.appendChild(wrap);
            setTimeout(() => {
              if (isMinigameSystemReady()) {
                const mg = pickMinigameType();
                runHumanMinigameWithGuards({
                  mg,
                  host: wrap,
                  player: p,
                  label: `F3-P3/${mg}`,
                  multiplier: (0.8 + (p?.skill || 0.5) * 0.6)
                });
              } else {
                console.error('[Competition] Minigame system failed to load');
                wrap.innerHTML = '<div class="tiny muted">Error loading minigames. Please refresh the page.</div>';
              }
            }, 500);
          } else {
            const mg = pickMinigameType();
            const wrap = document.createElement('div'); wrap.className = 'minigame-host'; wrap.style.marginTop = '8px';
            wrap.innerHTML = '<div class="tiny muted">You are in Final 3 — Part 3.</div>'; host.appendChild(wrap);

            runHumanMinigameWithGuards({
              mg,
              host: wrap,
              player: p,
              label: `F3-P3/${mg}`,
              multiplier: (0.8 + (p?.skill || 0.5) * 0.6)
            });
          }
        }
      } else {
        setTimeout(() => {
          if (g.phase !== 'final3_comp3') return;
          const baseScore = 10 + (global.rng?.() || Math.random()) * 25;
          const aiMultiplier = (0.75 + (p.compBeast || 0.5) * 0.65) * diffMult;
          submitScore(p.id, baseScore, aiMultiplier, 'F3-P3/AI');
        }, 300 + (global.rng?.() || Math.random()) * (g.cfg.tHOH * 520));
      }
    }
  }

  function finishF3P3() {
    const g = global.game; if (g.phase !== 'final3_comp3') return;
    const finalists = (g.__f3_finalists || []).slice();
    for (const id of finalists) if (!g.lastCompScores.has(id)) g.lastCompScores.set(id, 5 + (global.rng?.() || Math.random()) * 5);
    const sorted = [...g.lastCompScores.entries()].filter(([id]) => finalists.includes(id)).sort((a, b) => b[1] - a[1]);
    const winner = sorted[0][0], loser = sorted[1][0];
    for (const p of g.players) p.hoh = false; g.hohId = winner; global.getP(winner).hoh = true;

    const all3 = global.alivePlayers().map(p => p.id);
    const third = all3.find(id => !finalists.includes(id));
    g.nominees = [loser, third];

    g.__f3EvictionResolved = false;
    g.__f3EvictionInProgress = false;

    if (typeof global.syncPlayerBadgeStates === 'function') global.syncPlayerBadgeStates();

    global.addLog(`Final 3 Part 3: Final HOH is ${global.safeName(winner)}. Nominees: ${global.fmtList(g.nominees)}.`, 'ok');
    safeShowCard('👑 Final HOH', [global.safeName(winner), 'Winner of the Final 3 Competition!', 'Must now evict one houseguest'], 'hoh', 5000);
    global.tv.say('Final 3 Eviction Ceremony');
    global.setPhase('final3_decision', Math.max(16, Math.floor(g.cfg.tVote * 0.8)), () => global.finalizeFinal3Decision?.());
    setTimeout(() => global.renderFinal3DecisionPanel?.(), 50);
  }

  function renderFinal3DecisionPanel() {
    const g = global.game; const panel = document.querySelector('#panel'); if (!panel) return;
    const hoh = global.getP(g.hohId); const [a, b] = g.nominees.map(global.getP);
    panel.innerHTML = '';
    const box = document.createElement('div'); box.className = 'minigame-host';
    box.innerHTML = `<h3>🎬 Final 3 Eviction Ceremony</h3><div class="tiny">Final HOH ${hoh.name} must evict one houseguest in this live ceremony.</div>`;

    if (g.__f3EvictionResolved) {
      const done = document.createElement('div'); done.className = 'tiny ok';
      done.textContent = 'Eviction choice locked.';
      box.appendChild(done); panel.appendChild(box); return;
    }

    if (hoh.human) {
      const row = document.createElement('div'); row.className = 'row'; row.style.marginTop = '12px';
      const btnA = document.createElement('button'); btnA.className = 'btn danger'; btnA.textContent = `Evict ${a.name}`;
      const btnB = document.createElement('button'); btnB.className = 'btn danger'; btnB.textContent = `Evict ${b.name}`;

      btnA.disabled = !!g.__f3EvictionInProgress;
      btnB.disabled = !!g.__f3EvictionInProgress;

      const disableAll = () => {
        btnA.disabled = true;
        btnB.disabled = true;
      };

      btnA.onclick = () => {
        if (g.__f3EvictionInProgress) return;
        showEvictionJustificationModal(a, hoh, () => {
          disableAll();
          global.finalizeFinal3Decision?.(a.id);
        });
      };
      btnB.onclick = () => {
        if (g.__f3EvictionInProgress) return;
        showEvictionJustificationModal(b, hoh, () => {
          disableAll();
          global.finalizeFinal3Decision?.(b.id);
        });
      };

      row.append(btnA, btnB); box.appendChild(row);
      const hint = document.createElement('div'); hint.className = 'tiny muted'; hint.style.marginTop = '8px';
      hint.textContent = 'Choose wisely — this decision determines who sits beside you in the Final 2.';
      box.appendChild(hint);
    } else {
      const note = document.createElement('div'); note.className = 'tiny muted'; note.textContent = 'AI will make the decision at end.'; box.appendChild(note);
    }
    panel.appendChild(box);
  }
  global.renderFinal3DecisionPanel = renderFinal3DecisionPanel;

  function showEvictionJustificationModal(evictee, hoh, onConfirm) {
    if (typeof global.pausePhaseTimer === 'function') {
      global.pausePhaseTimer();
    }

    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 999998;
      background: rgba(0,0,0,0.85);
      backdrop-filter: blur(5px);
      display: flex;
      align-items: center;
      justify-content: center;
      animation: modalFadeIn 0.3s ease;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
      background: linear-gradient(145deg, rgba(40,40,80,0.95) 0%, rgba(25,25,50,0.95) 100%);
      border: 2px solid #ff6b6b;
      border-radius: 16px;
      padding: 28px;
      max-width: 480px;
      text-align: center;
      box-shadow: 0 12px 40px rgba(0,0,0,0.6);
    `;

    const title = document.createElement('h3');
    title.textContent = `Evict ${evictee.name}?`;
    title.style.cssText = `
      font-size: 1.5rem;
      font-weight: 700;
      color: #ff6b6b;
      margin: 0 0 16px 0;
    `;
    content.appendChild(title);

    const desc = document.createElement('p');
    desc.textContent = 'You can optionally provide a reason for your decision:';
    desc.style.cssText = `
      color: #cedbeb;
      margin: 0 0 16px 0;
      font-size: 0.95rem;
    `;
    content.appendChild(desc);

    const justifications = [
      'You are the biggest threat to win.',
      'I have a stronger bond with the other finalist.',
      'You\'ve played a stronger game and deserve jury respect.',
      'Strategic choice - I think I can beat the other person.',
      'This is a game move, nothing personal.'
    ];

    const justificationSelect = document.createElement('select');
    justificationSelect.style.cssText = `
      width: 100%;
      padding: 10px;
      margin: 12px 0;
      font-size: 0.95rem;
      border: 1px solid #6b7a99;
      border-radius: 8px;
      background: rgba(20,20,40,0.8);
      color: #cedbeb;
    `;

    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = '(Optional) Select a reason...';
    justificationSelect.appendChild(defaultOption);

    justifications.forEach(just => {
      const opt = document.createElement('option');
      opt.value = just;
      opt.textContent = just;
      justificationSelect.appendChild(opt);
    });

    content.appendChild(justificationSelect);

    const customJust = document.createElement('textarea');
    customJust.placeholder = 'Or write your own reason (optional)...';
    customJust.style.cssText = `
      width: 100%;
      min-height: 70px;
      padding: 10px;
      margin: 12px 0;
      font-size: 0.9rem;
      border: 1px solid #6b7a99;
      border-radius: 8px;
      background: rgba(20,20,40,0.8);
      color: #cedbeb;
      font-family: inherit;
      resize: vertical;
    `;
    content.appendChild(customJust);

    const buttonRow = document.createElement('div');
    buttonRow.style.cssText = `
      display: flex;
      gap: 12px;
      margin-top: 20px;
    `;

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.flex = '1';
    cancelBtn.onclick = () => {
      modal.style.animation = 'modalFadeOut 0.3s ease';
      setTimeout(() => {
        modal.remove();
        if (typeof global.resumePhaseTimer === 'function') {
          global.resumePhaseTimer();
        }
      }, 300);
    };

    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'btn danger';
    confirmBtn.textContent = 'Confirm Eviction';
    confirmBtn.style.flex = '1';
    confirmBtn.onclick = () => {
      const justification = customJust.value.trim() || justificationSelect.value || null;
      if (justification) {
        global.addLog(`${hoh.name}'s reasoning: "${justification}"`, 'muted');
        if (!global.game) global.game = {};
        global.game.__lastEvictionJustification = justification;
      }
      modal.style.animation = 'modalFadeOut 0.3s ease';
      setTimeout(() => {
        modal.remove();
        if (typeof global.resumePhaseTimer === 'function') {
          global.resumePhaseTimer();
        }
        onConfirm();
      }, 300);
    };

    buttonRow.append(cancelBtn, confirmBtn);
    content.appendChild(buttonRow);

    modal.appendChild(content);
    document.body.appendChild(modal);
  }

  function aiPickFinal3Eviction() {
    const g = global.game; const hoh = global.getP(g.hohId); const [a, b] = g.nominees;
    const ha = (hoh.affinity[a] ?? 0), hb = (hoh.affinity[b] ?? 0); if (ha < hb - 0.05) return a; if (hb < ha - 0.05) return b;
    const ta = global.getP(a).threat || 0.5, tb = global.getP(b).threat || 0.5; return ta >= tb ? a : b;
  }

  function generateEvicteeReply(evictee, hoh) {
    const affinity = evictee.affinity?.[hoh.id] ?? 0;

    const unkindReplies = [
      `You made the wrong choice, ${hoh.name}. The jury will remember this.`,
      `I hope you enjoy second place, ${hoh.name}.`,
      `This is a mistake. You should have taken me to the end.`,
      `Good luck winning against them. You're going to need it.`,
      `You're going to regret this decision.`
    ];

    const neutralReplies = [
      `Good game, ${hoh.name}. Best of luck in the finale.`,
      `It's been a journey. May the best player win.`,
      `I respect your decision. Good luck.`,
      `Well played. I'll see you on the other side.`,
      `I understand. It's just a game. Good luck.`
    ];

    const kindReplies = [
      `I'm rooting for you, ${hoh.name}. Go win this!`,
      `You've got this, ${hoh.name}. Make me proud!`,
      `No hard feelings. You played an amazing game.`,
      `I hope you take it all the way. Good luck, friend.`,
      `You deserve to win this. Give them hell!`
    ];

    let replies;
    if (affinity < -0.15) {
      replies = unkindReplies;
    } else if (affinity > 0.15) {
      replies = kindReplies;
    } else {
      replies = neutralReplies;
    }

    return replies[Math.floor(Math.random() * replies.length)];
  }

  async function finalizeFinal3Decision(id) {
    const g = global.game;

    if (g.__f3EvictionResolved) return;
    if (g.__f3EvictionInProgress) return;

    g.__f3EvictionInProgress = true;

    const target = id ?? aiPickFinal3Eviction();
    const ev = global.getP(target); const hoh = global.getP(g.hohId);
    if (!ev) {
      g.__f3EvictionInProgress = false;
      return;
    }

    g.__f3EvictionResolved = true;
    ev.evicted = true; ev.weekEvicted = g.week;

    global.addLog(`Final 3 eviction: <b>${hoh.name}</b> has chosen to evict <b>${ev.name}</b>.`, 'danger');

    safeShowCard('🎬 Final Eviction Decision', [`${hoh.name} has chosen to evict`, ev.name, 'to the Jury'], 'evict', 5000, true);

    try { await global.cardQueueWaitIdle?.(); } catch { }

    safeShowCard('🥉 Third Place', [ev.name, 'finishes in 3rd place', 'The Bronze Medalist'], 'warn', 4500, true);

    try { await global.cardQueueWaitIdle?.(); } catch { }

    const justification = g.__lastEvictionJustification;
    if (justification) {
      safeShowCard(`💬 ${hoh.name}`, [`"${justification}"`], 'neutral', 4000, true);
      try { await global.cardQueueWaitIdle?.(); } catch { }

      const reply = generateEvicteeReply(ev, hoh);
      safeShowCard(`💬 ${ev.name}`, [`"${reply}"`], 'neutral', 4000, true);
      try { await global.cardQueueWaitIdle?.(); } catch { }

      delete g.__lastEvictionJustification;
    }

    if (typeof global.showEventModal === 'function') {
      await global.showEventModal({
        title: 'Time for the Jury Vote',
        emojis: '⚖️',
        subtitle: 'The Jury will now cast their votes one by one.\n\nThe winner of Big Brother will be crowned after all votes are revealed.',
        duration: 5000,
        minDisplayTime: 5000,
        tone: 'special'
      });
    }

    if (global.alivePlayers().length <= 9 && g.cfg.enableJuryHouse && !g.juryHouse.includes(target)) {
      g.juryHouse.push(target);
    }

    g.nominees = []; g.vetoHolder = null; g.nomsLocked = false;
    g.players.forEach(p => {
      p.nominated = false;
      p.hoh = false;
    });
    g.hohId = null;
    console.info('[final3] badges cleared after eviction reveal');

    try { global.updateHud?.(); } catch { }
    setTimeout(() => {
      if (typeof global.postEvictionRouting === 'function') {
        global.postEvictionRouting();
      } else {
        global.startJuryVote?.();
      }
    }, 800);
  }
  global.finalizeFinal3Decision = finalizeFinal3Decision;

})(window);
