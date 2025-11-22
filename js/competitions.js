// MODULE: competitions.js
// HOH eligibility, minigames, scoreboards, Final 3 flow, TV updates.
// Enhanced: wait for reveal cards to finish; increment HOH win stats.
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

  // Import centralized avatar constants
  const getDicebearUrl = global.getDicebearUrl || function(seed) {
    return `https://api.dicebear.com/6.x/bottts/svg?seed=${encodeURIComponent(seed || 'Player')}`;
  };

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
      // Use faux TV showCard
      if (typeof global.showCard === 'function') {
        return global.showCard(title, lines, tone, dur, uniform);
      }
      const tvNow = document.getElementById('tvNow');
      if (tvNow) {
        const msg = [title || 'Update'].concat(Array.isArray(lines) ? lines : []).join(' — ');
        tvNow.textContent = msg;
      }
    } catch (e) { /* Non-fatal error, continue */ }
    return undefined;
  }
  async function waitCardsIdle() {
    try {
      if (typeof global.cardQueueWaitIdle === 'function') {
        await global.cardQueueWaitIdle();
      }
    } catch (e) { /* Non-fatal error, continue */ }
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
      const aliveCount = global.alivePlayers().length;
      if (g.week === 1) return true;
      if (aliveCount === 3) return true; // Final 3 exemption
      return g.lastHOHId !== you.id;
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
    let final = Math.max(0, Math.min(150, normalizedBase * mult));
    
    // Debug override: Always win feature - ensure human player gets maximum score
    const cfg = g?.cfg || {};
    if (cfg.debugAlwaysWin === true && id === g.humanId) {
      // Give human player maximum possible score (150) to guarantee competition victory
      final = 150;
      console.info('[Competition] debugAlwaysWin enabled: Human player score set to', final);
    }

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
    // NOTE: Lock is only set here after successful score validation and submission
    // If game is abandoned or incomplete, this code is never reached and no lock is set
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
      const blocked = (alive.length > 3 && g.week > 1) ? g.lastHOHId : null;
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
    if (g.phase === 'hoh' && alive.length > 3 && g.week > 1 && g.lastHOHId) eligible = eligible.filter(id => id !== g.lastHOHId);
    const done = [...g.lastCompScores.keys()].filter(id => eligible.includes(id)).length;
    if (done === eligible.length) { finishCompPhase(); }
  }

  function logScoreboard(title, scoresMap, ids) {
    // Hidden: don't log full scoreboard anymore
    // Full results are shown in reveal card
  }

  /**
   * Get a reliable, attached container for TV instructions
   * Returns the first DOM-attached element from a priority list of selectors
   * Falls back to document.body if no TV container is found or attached
   * 
   * @returns {HTMLElement} An attached DOM element suitable for rendering instructions
   */
  function getTvInstructionsContainer() {
    // Priority list of selectors to try, in order
    const selectors = [
      '[data-faux-tv]',
      '[data-sm-faux-tv]',
      '.tvViewport',
      '#tv',
      '.tv',
      '.faux-tv',
      '.tv-screen',
      '#panel'
    ];

    // Try each selector and return first attached element
    for (const selector of selectors) {
      try {
        const el = document.querySelector(selector);
        if (el && el.isConnected) {
          console.info('[Competition] ✓ Using attached container:', selector);
          return el;
        }
      } catch (e) {
        // Selector failed, continue to next
        console.warn('[Competition] Selector failed:', selector, e);
      }
    }

    // Ultimate fallback: document.body (always attached)
    console.warn('[Competition] ⚠ No TV container found, falling back to document.body');
    return document.body;
  }

  /**
   * Wait for TV viewport to be ready and attached to DOM
   * Retries up to maxAttempts with specified delay between attempts
   * 
   * @param {number} maxAttempts - Maximum number of retry attempts (default: 20)
   * @param {number} delayMs - Delay between attempts in milliseconds (default: 100ms)
   * @returns {Promise<HTMLElement>} Resolves with attached container when ready
   */
  function waitForTvViewportReady(maxAttempts = 20, delayMs = 100) {
    return new Promise((resolve) => {
      let attempts = 0;
      
      function checkReady() {
        attempts++;
        const container = getTvInstructionsContainer();
        
        // Check if we got a real TV container (not document.body fallback)
        const isRealTvContainer = container !== document.body;
        
        if (isRealTvContainer && container.isConnected) {
          console.info(`[Competition] ✓ TV viewport ready after ${attempts} attempt(s)`);
          resolve(container);
        } else if (attempts >= maxAttempts) {
          console.warn(`[Competition] ⚠ TV viewport not ready after ${attempts} attempts, using fallback`);
          resolve(container); // Use fallback container
        } else {
          setTimeout(checkReady, delayMs);
        }
      }
      
      checkReady();
    });
  }

  // Helper: run a human minigame with both replay-lock and anti-cheat
  async function runHumanMinigameWithGuards({ mg, host, player, label, multiplier, onAfterSubmit }) {
    const g = global.game;

    console.info(`[Competition] → runHumanMinigameWithGuards called: week=${g.week}, phase=${g.phase}, mg=${mg}, player=${player.name}(${player.id})`);

    // 1) Block replays for this week/phase/game
    if (global.CompLocks && global.CompLocks.hasSubmittedThisWeek(g.week, g.phase, mg, player.id)) {
      console.warn(`[Competition] ⚠ Replay-lock triggered: week=${g.week}, phase=${g.phase}, mg=${mg}, player=${player.name}(${player.id})`);
      // Use inline status instead of below-TV message
      if (window.TvStatus?.set) {
        window.TvStatus.set('You have already submitted for this competition.');
      }
      return;
    }

    console.info('[Competition] ✓ Replay-lock check passed');

    // Mark human as having played (participation tracking)
    if (g.phase === 'hoh') {
      g.__humanPlayedHOH = true;
      console.info('[Competition] ✓ Human participation flag set for HOH');
    } else if (g.phase === 'veto_comp' || g.phase === 'veto') {
      g.__humanPlayedVeto = true;
      console.info('[Competition] ✓ Human participation flag set for Veto');
    }

    // 2) Check if CompetitionFlow is available for new flow
    if (global.CompetitionFlow && typeof global.CompetitionFlow.runCompetitionFlow === 'function') {
      console.info('[Competition] ✓ Using CompetitionFlow (new flow)');
      
      // Use new competition flow: instructions → fullscreen game → completion
      // Show status in TV header inline status bar
      if (window.TvStatus?.set) {
        window.TvStatus.set('Loading competition…');
      }
      
      // Neutralize empty #tvOverlay if it has no active content (defensive guard)
      (function ensureOverlayNotBlocking(){
        try {
          const ov = document.getElementById('tvOverlay');
          if (!ov) {
            console.info('[Competition] No #tvOverlay found');
            return;
          }
          const content = ov.querySelector('.tvOverlayContent');
          const hasActiveContent = !!(content && content.childElementCount > 0);
          if (!hasActiveContent) {
            ov.style.pointerEvents = 'none';
            console.info('[Competition] ✓ Neutralized empty #tvOverlay (pointer-events: none)');
          } else {
            console.info(`[Competition] #tvOverlay has active content (${content.childElementCount} children), not neutralizing`);
          }
        } catch(e){ 
          console.warn('[Competition] tvOverlay neutralization failed', e); 
        }
      })();
      
      // Wait for TV viewport to be ready and attached (with retry)
      console.info('[Competition] Waiting for TV viewport readiness...');
      const instructionsContainer = await waitForTvViewportReady(20, 100);
      console.info('[Competition] ✓ TV viewport ready, container obtained:', instructionsContainer.tagName, instructionsContainer.className || instructionsContainer.id);
      
      // Start AntiCheat session with minDistinctInputs: 0 to allow low-input games
      // Use the same attached container as instructions to ensure proper tracking
      let antiCheatSessionId = null;
      if (global.AntiCheat) {
        try {
          antiCheatSessionId = global.AntiCheat.startSession({
            container: instructionsContainer,
            gameKey: mg,
            thresholds: { minPlayTime: 3000, maxDuration: 300000, minDistinctInputs: 0 }
          });
          console.info('[Competition] ✓ AntiCheat session started:', antiCheatSessionId);
        } catch (e) {
          // Don't abort flow if AntiCheat fails to start
          console.warn('[Competition] AntiCheat.startSession failed (non-fatal):', e);
        }
      }

      // Run competition flow (pass TV viewport for instructions to appear inside TV)
      console.info('[Competition] → Calling CompetitionFlow.runCompetitionFlow with container and game:', mg);
      global.CompetitionFlow.runCompetitionFlow(mg, instructionsContainer, (base) => {
        console.info(`[Competition] ← Competition completed with score: ${base}`);
        
        // Validate with AntiCheat
        if (antiCheatSessionId && global.AntiCheat) {
          const v = global.AntiCheat.validate(antiCheatSessionId);
          if (!v.valid) {
            console.warn('[Competition] Anti-cheat validation failed:', v.reason);
            host.innerHTML = `<div class="tiny" style="color:#ff6b9d;">⚠️ Submission blocked: ${v.reason}</div>`;
            global.AntiCheat.cleanup(antiCheatSessionId);
            return;
          }
          console.info('[Competition] ✓ AntiCheat validation passed');
          global.AntiCheat.cleanup(antiCheatSessionId);
        }

        // Submit score
        console.info(`[Competition] → Submitting score: player=${player.name}, base=${base}, multiplier=${multiplier}`);
        if (submitScore(player.id, base, multiplier, label)) {
          console.info('[Competition] ✓ Score submitted successfully');
          // Use inline status instead of below-TV message
          if (window.TvStatus?.set) {
            window.TvStatus.set('Submission received. Waiting for others…');
          }
          if (typeof onAfterSubmit === 'function') onAfterSubmit();
          maybeFinishComp();
        } else {
          console.warn('[Competition] ⚠ Score submission failed (duplicate or invalid)');
        }
      });
      
    } else {
      // Fallback to legacy inline rendering
      console.warn('[Competition] CompetitionFlow not available, using legacy rendering');
      
      // Start AntiCheat session
      let antiCheatSessionId = null;
      if (global.AntiCheat) {
        try {
          antiCheatSessionId = global.AntiCheat.startSession({
            container: host,
            gameKey: mg,
            thresholds: { minPlayTime: 3000, maxDuration: 300000, minDistinctInputs: 0 }
          });
          console.info('[Competition] ✓ AntiCheat session started (legacy):', antiCheatSessionId);
        } catch (e) {
          console.warn('[Competition] AntiCheat.startSession failed (non-fatal):', e);
        }
      }

      // Render game inline & validate
      global.renderMinigame?.(mg, host, (base) => {
        console.info(`[Competition] ← Legacy competition completed with score: ${base}`);
        
        if (antiCheatSessionId && global.AntiCheat) {
          const v = global.AntiCheat.validate(antiCheatSessionId);
          if (!v.valid) {
            console.warn('[Competition] Anti-cheat validation failed:', v.reason);
            host.innerHTML = `<div class="tiny" style="color:#ff6b9d;">⚠️ Submission blocked: ${v.reason}</div>`;
            global.AntiCheat.cleanup(antiCheatSessionId);
            return;
          }
          console.info('[Competition] ✓ AntiCheat validation passed (legacy)');
          global.AntiCheat.cleanup(antiCheatSessionId);
        }

        console.info(`[Competition] → Submitting score (legacy): player=${player.name}, base=${base}`);
        if (submitScore(player.id, base, multiplier, label)) {
          console.info('[Competition] ✓ Score submitted successfully (legacy)');
          // Use inline status instead of below-TV message
          if (window.TvStatus?.set) {
            window.TvStatus.set('Submission received. Waiting for others…');
          }
          if (typeof onAfterSubmit === 'function') onAfterSubmit();
          maybeFinishComp();
        } else {
          console.warn('[Competition] ⚠ Score submission failed (duplicate or invalid, legacy)');
        }
      });
    }
  }
  global.runHumanMinigameWithGuards = runHumanMinigameWithGuards;
  global.getTvInstructionsContainer = getTvInstructionsContainer;

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
          avatarUrl = getDicebearUrl(name);
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
            this.src = getDicebearUrl(winner.name);
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
              this.src = getDicebearUrl(player.name);
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
      const cfg = global.game?.cfg || {};
      
      if (showIntro) {
        if (typeof global.showCard === 'function') {
          global.showCard(title, ['Revealing top 3...'], 'neutral', introDuration);
        }
        
        if (typeof global.cardQueueWaitIdle === 'function') {
          await global.cardQueueWaitIdle();
        }
        await sleep(400);
      }

      if (topThree[2]) {
        const lines = [topThree[2].name || topThree[2]];
        
        if (typeof global.showCard === 'function') {
          global.showCard('3rd Place', lines, 'neutral', placeDuration);
        }
        
        if (typeof global.cardQueueWaitIdle === 'function') {
          await global.cardQueueWaitIdle();
        }
        await sleep(1200);
      }

      if (topThree[1]) {
        const lines = [topThree[1].name || topThree[1]];
        
        if (typeof global.showCard === 'function') {
          global.showCard('2nd Place', lines, 'neutral', placeDuration);
        }
        
        if (typeof global.cardQueueWaitIdle === 'function') {
          await global.cardQueueWaitIdle();
        }
        await sleep(1200);
      }

      if (topThree[0]) {
        const winnerTitle = `${title} Winner ${winnerEmoji}`;
        const lines = [topThree[0].name || topThree[0]];
        
        if (typeof global.showCard === 'function') {
          global.showCard(winnerTitle, lines, winnerTone, winnerDuration);
        }
        
        if (typeof global.cardQueueWaitIdle === 'function') {
          await global.cardQueueWaitIdle();
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
    // Use inline status instead of below-TV message
    if (window.TvStatus?.set) {
      window.TvStatus.set('Competition running…');
    }
    panel.innerHTML = '';
  }
  global.renderCompPanel = renderCompPanel;

  /**
   * Helper to derive humanId from players array when g.humanId is null
   * Checks for human flag, guest name, or uses first alive player
   * @returns {number|null} Derived humanId or null if no suitable player found
   */
  function ensureHumanIdFromPlayers() {
    const g = global.game;
    const players = g.players || global.game?.players || global.PlayerService?.players || [];
    
    if (!players || players.length === 0) {
      console.warn('[Competition] No players array available for fallback humanId');
      return null;
    }
    
    // Strategy 1: Find player with human=true flag
    let humanPlayer = players.find(p => p.human === true);
    if (humanPlayer) {
      console.info(`[Competition] 🔄 Fallback: Found human player by flag: ${humanPlayer.name}(${humanPlayer.id})`);
      g.humanId = humanPlayer.id;
      return humanPlayer.id;
    }
    
    // Strategy 2: Find player with name='Guest' (case-insensitive)
    humanPlayer = players.find(p => p.name && p.name.toLowerCase() === 'guest');
    if (humanPlayer) {
      console.info(`[Competition] 🔄 Fallback: Found guest player by name: ${humanPlayer.name}(${humanPlayer.id})`);
      g.humanId = humanPlayer.id;
      return humanPlayer.id;
    }
    
    // Strategy 3: Last resort - use first alive player
    const alivePlayer = players.find(p => !p.evicted);
    if (alivePlayer) {
      console.warn(`[Competition] ⚠ Fallback: Using first alive player as human: ${alivePlayer.name}(${alivePlayer.id})`);
      g.humanId = alivePlayer.id;
      return alivePlayer.id;
    }
    
    console.error('[Competition] ✗ Fallback failed: No suitable player found in players array');
    return null;
  }

  /**
   * Wait for human profile to be ready (g.humanId and profile object available)
   * Retries with exponential backoff up to a timeout, with fallback to derive humanId from players
   * @param {number} maxWaitMs - Maximum time to wait (default: 5000ms, increased from 2000ms)
   * @returns {Promise<Object|null>} Resolves with player object or null on timeout
   */
  async function waitForHumanReady(maxWaitMs = 5000) {
    const g = global.game;
    const startTime = Date.now();
    let attempts = 0;
    
    while (Date.now() - startTime < maxWaitMs) {
      attempts++;
      
      // Check if humanId exists and profile is available
      if (g.humanId !== null && g.humanId !== undefined) {
        const player = global.getP?.(g.humanId);
        if (player) {
          console.info(`[Competition] ✓ Human profile ready after ${attempts} attempt(s), ${Date.now() - startTime}ms`);
          return player;
        }
      }
      
      // Check if players array exists - if so, we can derive humanId as fallback
      const players = g.players || global.PlayerService?.players;
      if (players && players.length > 0 && !g.humanId) {
        console.info(`[Competition] Players array available but humanId null, attempting fallback (attempt ${attempts})`);
        const derivedId = ensureHumanIdFromPlayers();
        if (derivedId !== null) {
          const player = global.getP?.(derivedId);
          if (player) {
            console.info(`[Competition] ✓ Human profile ready via fallback after ${attempts} attempt(s), ${Date.now() - startTime}ms`);
            return player;
          }
        }
      }
      
      // Show status message while waiting
      if (window.TvStatus?.set) {
        window.TvStatus.set('Waiting for player profile…');
      }
      
      // Poll at 250ms intervals
      const delay = 250;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    console.warn(`[Competition] ⚠ Human profile not ready after ${maxWaitMs}ms, ${attempts} attempts`);
    return null;
  }

  function renderHOH(panel) {
    const g = global.game; 
    panel.innerHTML = '';
    
    console.info(`[Competition] ═══ renderHOH called ═══`);
    console.info(`[Competition] Week: ${g.week}, Phase: ${g.phase}, Human ID: ${g.humanId}`);
    
    const host = document.createElement('div'); host.className = 'miniggame-host minigame-host';
    
    // Check if minigame system is ready
    if (!isMinigameSystemReady()) {
      console.warn('[Competition] ⚠ Minigame system not ready, waiting...');
      // Use inline status instead of below-TV message
      if (window.TvStatus?.set) {
        window.TvStatus.set('Loading minigame system…');
      }
      setTimeout(() => {
        if (isMinigameSystemReady()) {
          console.info('[Competition] ✓ Minigame system ready after wait, retrying renderHOH');
          renderHOH(panel);
        } else {
          console.error('[Competition] ✗ Minigame system failed to load after wait');
          if (window.TvStatus?.set) {
            window.TvStatus.set('Error loading minigames. Please refresh the page.');
          }
        }
      }, 500);
      return;
    }

    console.info('[Competition] ✓ Minigame system is ready');

    // Wait for human profile with retry loop (increased to 5s timeout)
    (async () => {
      let you = await waitForHumanReady(5000);
      
      // Immediate fallback: if timeout but players exist, try one more quick derivation
      if (!you) {
        console.warn('[Competition] ⚠ First wait timed out, attempting immediate fallback');
        const players = g.players || global.PlayerService?.players;
        if (players && players.length > 0) {
          console.info('[Competition] Players array exists, attempting to derive humanId');
          const derivedId = ensureHumanIdFromPlayers();
          if (derivedId !== null) {
            you = global.getP?.(derivedId);
            if (you) {
              console.info(`[Competition] ✓ Immediate fallback successful: ${you.name}(${you.id})`);
            }
          }
        }
      }
      
      if (!you) {
        console.error('[Competition] ✗ Human profile not available after waiting and fallback');
        if (window.TvStatus?.set) {
          window.TvStatus.set('Error: Player profile not loaded. Please refresh the page.');
        }
        return;
      }

      if (you.evicted) {
        console.warn(`[Competition] ⚠ Human is evicted and cannot compete`);
        if (window.TvStatus?.set) {
          window.TvStatus.set('You are evicted and cannot compete.');
        }
        return;
      }

      const alive = global.alivePlayers(); 
      const blocked = (alive.length > 3 && g.week > 1) ? g.lastHOHId : null;
      
      console.info(`[Competition] Human player: ${you.name}(${you.id}), evicted=${you.evicted}`);
      console.info(`[Competition] Alive players: ${alive.length}, Blocked player: ${blocked || 'none'}`);
      
      // Check if blocked
      if (you.id === blocked) {
        console.warn(`[Competition] ⚠ Human is blocked (was last HOH): blocked=${blocked}`);
        if (window.TvStatus?.set) {
          window.TvStatus.set('Not eligible this week (you were last HOH).');
        }
        return;
      }
      
      // Check eligibility using lastCompScores first (quick check)
      // CompLocks will be checked in runHumanMinigameWithGuards for replay prevention
      const alreadySubmittedQuick = g.lastCompScores?.has(you.id) || false;
      console.info(`[Competition] Quick eligibility check: alreadySubmitted=${alreadySubmittedQuick}`);
      
      if (alreadySubmittedQuick) {
        console.warn(`[Competition] ⚠ Human already submitted for this competition (quick check)`);
        if (window.TvStatus?.set) {
          window.TvStatus.set('You have already submitted for this competition.');
        }
        return;
      }
      
      console.info('[Competition] ✓ Human is eligible for HOH competition');
      
      const mg = pickMinigameType();
      console.info(`[Competition] ✓ Selected minigame: ${mg}`);

      runHumanMinigameWithGuards({
        mg,
        host,
        player: you,
        label: `HOH/${mg}`,
        multiplier: (0.75 + (you?.compBeast || 0.5) * 0.6),
        onAfterSubmit: () => { /* no-op */ }
      });
    })();
    
    // Only append host if it has content (minigame rendering)
    if(host.childElementCount > 0){
      panel.appendChild(host);
    }
  }

  function startHOH() {
    const g = global.game;
    g.lastCompScores = new Map(); g.hohOrder = [];
    g.__hohResolved = false;
    g.__hohResolving = false;
    g.__humanPlayedHOH = false;
    g.__compRunning = true; // Mark competition as running
    g.__hohGameKey = null; // Track which game was played
    global.markCompPlayed?.('hoh'); // Mark HOH as played
    global.tv.say('HOH Competition'); global.phaseMusic?.('hoh');
    global.setPhase('hoh', g.cfg.tHOH, finishCompPhase);
    const alive = global.alivePlayers(); const blocked = (alive.length > 3 && g.week > 1) ? g.lastHOHId : null;
    const diffMult = getAIDifficultyMultiplier();
    
    // Legacy fallback: generate AI scores immediately if OpponentSynth not available
    if (!global.OpponentSynth) {
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
    // New system: Wait for human submission, then generate synthetic opponents
  }
  global.startHOH = startHOH;

  async function finishCompPhase() {
    const g = global.game; if (g.phase !== 'hoh') return;
    if (g.__hohResolved || g.__hohResolving) return;
    g.__hohResolving = true;
    try {
      g.__hohResolved = true;
      g.__compRunning = false; // Clear competition running flag

      const alive = global.alivePlayers(); let elig = alive.map(p => p.id);
      if (alive.length > 3 && g.week > 1 && g.lastHOHId) elig = elig.filter(id => id !== g.lastHOHId);

      // Apply dampening for consecutive winners
      for (const id of elig) {
        if (!g.lastCompScores.has(id)) {
          // Skip auto-score for human if they didn't play
          if (id === g.humanId && !g.__humanPlayedHOH) {
            console.info('[hoh] Human skipped - no auto-score');
            continue;
          }
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

      // Get participant IDs before reveal
      const participantIds = [...g.lastCompScores.keys()].filter(id => elig.includes(id));
      if (!participantIds.length) {
        console.warn('[hoh] No participants; abort reveal');
        return;
      }

      // Check for fast-forward mode
      const ffActive = g.__ffActive || false;

      // Show top-3 reveal card (condensed if fast-forward, full otherwise)
      if (ffActive && g.__humanPlayedHOH) {
        // Condensed reveal for fast-forward: brief status update
        const scoredParticipants = participantIds.map(id => [id, g.lastCompScores.get(id)]);
        const sortedByScore = scoredParticipants.sort((a, b) => b[1] - a[1]);
        const winner = sortedByScore[0][0];
        console.info(`[hoh] Fast-forward condensed reveal: Winner ${global.safeName(winner)}`);
        if (window.TvStatus?.set) {
          window.TvStatus.set(`HOH Winner: ${global.safeName(winner)}`, 'ok');
        }
        await new Promise(r => setTimeout(r, 600)); // Brief pause
      } else {
        // Full reveal sequence
        await showCompetitionReveal('HOH Competition', g.lastCompScores, elig);
        await waitCardsIdle();
      }

      // Determine winner from eligible participants
      const scoredEntries = [...g.lastCompScores.entries()].filter(([id]) => elig.includes(id));
      const sortedEntries = scoredEntries.sort((a, b) => b[1] - a[1]);
      const winner = sortedEntries[0][0];
      
      // Update HOH state
      for (const p of g.players) p.hoh = false;
      g.hohId = winner;
      g.lastHOHId = winner;
      const W = global.getP(winner);
      W.hoh = true;
      W.stats = W.stats || {};
      W.wins = W.wins || {};
      W.stats.hohWins = (W.stats.hohWins || 0) + 1;
      W.wins.hoh = (W.wins.hoh || 0) + 1;

      // Structured competition summary log
      console.info('[comp-summary]', JSON.stringify({
        phase: 'hoh',
        week: g.week,
        ffActive: ffActive,
        humanPlayed: g.__humanPlayedHOH,
        participants: participantIds,
        winner: winner
      }));

    // Social Maneuvers: Record HOH win event for weekly energy bonus
    if(global.SocialManeuvers?.isEnabled?.() && global.SocialManeuvers?.recordWeeklyEvent){
      try{
        global.SocialManeuvers.recordWeeklyEvent(winner, { hohWin: true });
        console.info('[competitions.js] ✓ Recorded HOH win event for player', winner);
      }catch(e){
        console.error('[competitions.js] Failed to record HOH win event:', e);
      }
    }

    // Sync player badge states after HOH change
    if (typeof global.syncPlayerBadgeStates === 'function') global.syncPlayerBadgeStates();
    
    // Update HUD to render badge changes immediately
    if (typeof global.updateHud === 'function') global.updateHud();

    global.addLog(`HOH: <span class="accent">${global.safeName(winner)}</span>.`);

    // Hook: Log XP for HOH win
    if (global.ProgressionEvents?.onHOHWin) global.ProgressionEvents.onHOHWin(winner, elig);

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
    } finally {
      g.__hohResolving = false;
    }
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
      // Use inline status instead of below-TV message
      if (window.TvStatus?.set) {
        window.TvStatus.set('Loading minigame system…');
      }
      setTimeout(() => {
        if (isMinigameSystemReady()) {
          renderF3P1(panel);
        } else {
          console.error('[Competition] Minigame system failed to load');
          if (window.TvStatus?.set) {
            window.TvStatus.set('Error loading minigames. Please refresh the page.');
          }
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

    } else {
      // Use inline status instead of below-TV message
      if (window.TvStatus?.set) {
        window.TvStatus.set('Waiting for competition to conclude…');
      }
    }
    // Only append host if it has content (minigame rendering)
    if(host.childElementCount > 0){
      panel.appendChild(host);
    }
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
        } catch (e) { /* Non-fatal error, continue */ }
      }
      setTimeout(function () { beginF3P1Competition(); }, 500);
    })();
  }

  function beginF3P1Competition() {
    const g = global.game;
    g.lastCompScores = new Map();
    g.__f3p1GameKey = null; // Track game key
    global.tv.say('Final 3 — Part 1');
    global.phaseMusic?.('hoh');
    global.setPhase('final3_comp1', Math.max(18, Math.floor(g.cfg.tHOH * 0.7)), finishF3P1);
    const diffMult = getAIDifficultyMultiplier();
    
    // Legacy fallback: generate AI scores immediately if OpponentSynth not available
    if (!global.OpponentSynth) {
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
    // New system: Wait for human submission, then generate synthetic opponents
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
    panel.innerHTML = '';
    // Use inline status instead of below-TV message
    if (window.TvStatus?.set) {
      window.TvStatus.set('Final 3 — Part 2 (head-to-head) is running…');
    }
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
        } catch (e) { /* Non-fatal error, continue */ }
      }
      setTimeout(function () { beginF3P2Competition(duo); }, 500);
    })();
  }

  function beginF3P2Competition(duo) {
    const g = global.game;
    g.__f3_duo = duo.slice();
    g.lastCompScores = new Map();
    g.__f3p2GameKey = null; // Track game key
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
            // Use inline status instead of below-TV message
            if (window.TvStatus?.set) {
              window.TvStatus.set('Loading minigame system…');
            }
            const wrap = document.createElement('div'); wrap.className = 'minigame-host'; wrap.style.marginTop = '8px';
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
                if (window.TvStatus?.set) {
                  window.TvStatus.set('Error loading minigames. Please refresh the page.');
                }
              }
            }, 500);
          } else {
            const mg = pickMinigameType();
            const wrap = document.createElement('div'); wrap.className = 'minigame-host'; wrap.style.marginTop = '8px';
            // Use inline status instead of below-TV message
            if (window.TvStatus?.set) {
              window.TvStatus.set('You are in Final 3 — Part 2.');
            }
            host.appendChild(wrap);

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
        // Legacy fallback: generate AI scores immediately if OpponentSynth not available
        if (!global.OpponentSynth) {
          setTimeout(() => {
            if (g.phase !== 'final3_comp2') return;
            const baseScore = 10 + (global.rng?.() || Math.random()) * 25;
            const aiMultiplier = (0.75 + (p.compBeast || 0.5) * 0.65) * diffMult;
            submitScore(p.id, baseScore, aiMultiplier, 'F3-P2/AI');
          }, 300 + (global.rng?.() || Math.random()) * (g.cfg.tHOH * 520));
        }
        // New system: Wait for human submission, then generate synthetic opponents
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
    panel.innerHTML = '';
    // Use inline status instead of below-TV message
    if (window.TvStatus?.set) {
      window.TvStatus.set('Final 3 — Part 3 (final showdown) is running…');
    }
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
        } catch (e) { /* Non-fatal error, continue */ }
      }
      setTimeout(function () { beginF3P3Competition(); }, 500);
    })();
  }

  function beginF3P3Competition() {
    const g = global.game;
    g.lastCompScores = new Map();
    const finalists = [g.__f3p1Winner, g.__f3p2Winner];
    g.__f3_finalists = finalists.slice();
    g.__f3p3GameKey = null; // Track game key
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
            // Use inline status instead of below-TV message
            if (window.TvStatus?.set) {
              window.TvStatus.set('Loading minigame system…');
            }
            const wrap = document.createElement('div'); wrap.className = 'minigame-host'; wrap.style.marginTop = '8px';
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
                if (window.TvStatus?.set) {
                  window.TvStatus.set('Error loading minigames. Please refresh the page.');
                }
              }
            }, 500);
          } else {
            const mg = pickMinigameType();
            const wrap = document.createElement('div'); wrap.className = 'minigame-host'; wrap.style.marginTop = '8px';
            // Use inline status instead of below-TV message
            if (window.TvStatus?.set) {
              window.TvStatus.set('You are in Final 3 — Part 3.');
            }
            host.appendChild(wrap);

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
        // Legacy fallback: generate AI scores immediately if OpponentSynth not available
        if (!global.OpponentSynth) {
          setTimeout(() => {
            if (g.phase !== 'final3_comp3') return;
            const baseScore = 10 + (global.rng?.() || Math.random()) * 25;
            const aiMultiplier = (0.75 + (p.compBeast || 0.5) * 0.65) * diffMult;
            submitScore(p.id, baseScore, aiMultiplier, 'F3-P3/AI');
          }, 300 + (global.rng?.() || Math.random()) * (g.cfg.tHOH * 520));
        }
        // New system: Wait for human submission, then generate synthetic opponents
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
    
    // Lock Final 3 results - removes pending mask and shows HOH/NOM status
    g.__f3ResultsLocked = true;

    if (typeof global.syncPlayerBadgeStates === 'function') global.syncPlayerBadgeStates();
    
    // Update HUD to render badge changes immediately
    if (typeof global.updateHud === 'function') global.updateHud();

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
    ev.finalRank = 3; // Final 3 eviction = 3rd place

    global.addLog(`Final 3 eviction: <b>${hoh.name}</b> has chosen to evict <b>${ev.name}</b>.`, 'danger');

    safeShowCard('🎬 Final Eviction Decision', [`${hoh.name} has chosen to evict`, ev.name, 'to the Jury'], 'evict', 5000, true);

    try { await global.cardQueueWaitIdle?.(); } catch { /* Non-fatal error, continue */ }

    safeShowCard('🥉 Third Place', [ev.name, 'finishes in 3rd place', 'The Bronze Medalist'], 'warn', 4500, true);

    try { await global.cardQueueWaitIdle?.(); } catch { /* Non-fatal error, continue */ }

    // Notify visual system to suppress red X during animation
    if(typeof global.notifyEvictedForVisual === 'function'){
      global.notifyEvictedForVisual(target);
    }

    // Run eviction visual enhancement (avatar animation + roster badge update)
    if(typeof global.runEvictionVisual === 'function'){
      try{
        await global.runEvictionVisual(target, { reason: 'final3' });
      }catch(e){
        console.error('[final3] visual enhancement failed:', e);
      }
    }

    const justification = g.__lastEvictionJustification;
    if (justification) {
      safeShowCard(`💬 ${hoh.name}`, [`"${justification}"`], 'neutral', 4000, true);
      try { await global.cardQueueWaitIdle?.(); } catch { /* Non-fatal error, continue */ }

      const reply = generateEvicteeReply(ev, hoh);
      safeShowCard(`💬 ${ev.name}`, [`"${reply}"`], 'neutral', 4000, true);
      try { await global.cardQueueWaitIdle?.(); } catch { /* Non-fatal error, continue */ }

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

    try { global.updateHud?.(); } catch { /* Non-fatal error, continue */ }
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
