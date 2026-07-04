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
    
    // Track game key for opponent synthesis
    if (label && label.includes('/')) {
      const gameKey = label.split('/')[1];
      if (gameKey && gameKey !== 'AI') {
        if (g.phase === 'hoh') g.__hohGameKey = gameKey;
        else if (g.phase === 'final3_comp1') g.__f3p1GameKey = gameKey;
        else if (g.phase === 'final3_comp2') g.__f3p2GameKey = gameKey;
        else if (g.phase === 'final3_comp3') g.__f3p3GameKey = gameKey;
      }
    }

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
    
    // NEW: Generate synthetic opponent scores after human submission
    const player = global.getP(id);
    if (player && player.human && global.OpponentSynth) {
      generateSyntheticOpponents(id, final);
    }
    
    return true;
  }

  /**
   * Generate synthetic opponent scores after human submission
   * Uses OpponentSynth module to create plausible AI scores
   * Targets ~20% human win rate per session
   */
  function generateSyntheticOpponents(humanId, humanScore) {
    const g = global.game;
    if (!global.OpponentSynth) return;

    // Determine which phase we're in and get eligible opponents
    let eligibleOpponents = [];
    let gameKey = 'unknown';
    
    if (g.phase === 'hoh') {
      const alive = global.alivePlayers();
      const blocked = (alive.length !== 4 && g.week > 1) ? g.lastHOHId : null;
      eligibleOpponents = alive.filter(p => !p.human && p.id !== blocked);
      gameKey = g.__hohGameKey || 'unknown';
    } else if (g.phase === 'final3_comp1') {
      eligibleOpponents = global.alivePlayers().filter(p => !p.human);
      gameKey = g.__f3p1GameKey || 'unknown';
    } else if (g.phase === 'final3_comp2') {
      const duo = g.__f3_duo || [];
      eligibleOpponents = duo.map(id => global.getP(id)).filter(p => p && !p.human);
      gameKey = g.__f3p2GameKey || 'unknown';
    } else if (g.phase === 'final3_comp3') {
      const finalists = g.__f3_finalists || [];
      eligibleOpponents = finalists.map(id => global.getP(id)).filter(p => p && !p.human);
      gameKey = g.__f3p3GameKey || 'unknown';
    }

    if (eligibleOpponents.length === 0) {
      return; // No opponents to generate for
    }

    // Prepare opponent data
    const opponents = eligibleOpponents.map(p => ({
      id: p.id,
      compBeast: p.compBeast || 0.5,
      persona: p.persona || { aggr: 0.5, loyalty: 0.5, chaos: 0.5 }
    }));

    // Generate synthetic scores using seeded RNG
    const seed = g.rngSeed + g.week * 1000 + humanId;
    const syntheticScores = global.OpponentSynth.generate({
      humanScore: humanScore,
      opponents: opponents,
      gameKey: gameKey,
      seed: seed,
      targetWinRate: 0.20 // 20% win rate
    });

    // Apply synthetic scores to competition
    for (const [opponentId, score] of syntheticScores) {
      if (!g.lastCompScores.has(opponentId)) {
        g.lastCompScores.set(opponentId, score);
      }
    }

    // Trigger finish check
    maybeFinishComp();
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

      // Use new Social Intermission system, with a comment refresh so the branch
      // clearly marks this merge-resolution path.
      if (typeof global.startSocialIntermission === 'function') {
        global.startSocialIntermission('hoh', () => {
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