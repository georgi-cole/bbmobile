// MODULE: minigames/hold_wall.js
// Hold the Wall v2 — Authoritative Endurance Competition
//
// Authoritative contract:
//   - Last person standing is ALWAYS the competition winner (HOH or POV).
//   - Winner score = 1000, all others = 0.
//   - No fixed countdown timer; the game ends only when one participant remains.
//   - Sets window.game.__authoritativeWinner = { compType, playerId, score:1000, gameKey:'hold_wall' }
//     before calling onComplete(1000).
//   - AI elimination uses seeded RNG (week + compType + playerId) when a game context is present,
//     so results are reproducible but variable across weeks.

(function(g){
  'use strict';

  const GAME_KEY = 'hold_wall';
  const WINNER_SCORE = 1000;

  // Seeded mulberry32 PRNG (inline, no external dependency)
  function mulberry32(seed){
    return function(){
      seed = (seed + 0x6D2B79F5) >>> 0;
      var z = seed;
      z = Math.imul(z ^ (z >>> 15), z | 1) >>> 0;
      z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
      return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
    };
  }

  // FNV-1a hash for seed generation
  function fnv1a(parts){
    var hash = 2166136261;
    for(var i = 0; i < parts.length; i++){
      var str = String(parts[i] === null || parts[i] === undefined ? '' : parts[i]);
      for(var c = 0; c < str.length; c++){
        hash ^= str.charCodeAt(c);
        hash = Math.imul(hash, 16777619) >>> 0;
      }
    }
    return hash >>> 0;
  }

  function render(container, onComplete, options){
    options = options || {};

    var root = document.createElement('div');
    root.style.cssText = 'position:relative;display:flex;flex-direction:column;height:100%;min-height:480px;background:linear-gradient(180deg,#0d1424,#0f1a2e);color:#e8f3ff;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;overflow:hidden;';

    // ─── Game state ────────────────────────────────────────────────────────────
    var state = 'instructions'; // instructions | playing | end
    var startTime = 0;
    var hasEnded = false;
    var animFrame = null;
    var participants = [];
    var eliminationOrder = []; // eliminated first → last
    var aiTimers = [];
    var narrativeTimer = null;

    // Competition context
    var gameCtx = (g.game) || {};
    var compType = 'hoh';
    if(gameCtx.phase){
      compType = (gameCtx.phase === 'veto_comp' || gameCtx.phase === 'veto' || gameCtx.phase === 'pov') ? 'pov' : 'hoh';
    }
    var week = gameCtx.week || 1;

    // Seeded RNG: deterministic when game context is available
    var seed = fnv1a([week, compType, 'hold_wall', options.seed || 0]);
    var rng = mulberry32(seed);

    // AI drop timing: 8 – 90 s (spread across the range deterministically per player)
    var AI_MIN_MS = 8000;
    var AI_MAX_MS = 90000;

    // ─── Setup participants ────────────────────────────────────────────────────
    function setupParticipants(){
      var allPlayers = (gameCtx.players || []).filter(function(p){ return !p.evicted; });

      var eligible = allPlayers;
      if(compType === 'hoh' && eligible.length > 3 && week > 1 && gameCtx.lastHOHId && gameCtx.lastHOHWeek === (week - 1)){
        eligible = eligible.filter(function(p){ return p.id !== gameCtx.lastHOHId; });
      }

      if(eligible.length === 0){
        // Standalone / test mode: create placeholder participants
        eligible = [
          { id: 0, name: 'You', human: true },
          { id: 1, name: 'Alex' },
          { id: 2, name: 'Riley' },
          { id: 3, name: 'Morgan' }
        ];
      }

      participants = eligible.map(function(p, idx){
        var isHuman = !!(p.human || p.isPlayer);
        // Each AI gets a seeded personal drop time
        var dropMs = isHuman ? null : AI_MIN_MS + rng() * (AI_MAX_MS - AI_MIN_MS);
        return {
          id: p.id,
          name: p.name || ('Player ' + (idx + 1)),
          isPlayer: isHuman,
          dropped: false,
          dropTimeMs: null,
          scheduledDropMs: dropMs,
          avatarUrl: (g.resolveAvatar ? g.resolveAvatar(p) : null)
        };
      });

      console.info('[HoldWall v2] ' + participants.length + ' participants for ' + compType + ' (week ' + week + ', seed ' + seed + ')');
    }

    setupParticipants();

    // ─── Narrative lines ───────────────────────────────────────────────────────
    var LINES = {
      start: [
        'Grip that wall — last person holding wins! 💪',
        'Endurance test begins NOW. Don\'t let go! 🏋️',
        'Your arms may fail you. Your spirit cannot. 🔥'
      ],
      drop: [
        '{name} has dropped! 💥',
        '{name} is out! 🪂',
        'And {name} falls! The wall is unforgiving. 😱'
      ],
      two_left: [
        'We\'re down to TWO! Who wants it more?! 🔥',
        'Final two! No mercy now. 💪',
        'One will win. One will fall. Who survives? 👑'
      ],
      win_human: [
        '🏆 YOU DID IT! You are the last one standing!',
        '👑 INCREDIBLE! You have conquered the wall!',
        '🎉 WINNER! Your endurance cannot be beaten!'
      ],
      win_ai: [
        '{name} is the last one standing! 🏆',
        '{name} outlasted everyone! What a competitor! 👑',
        'The wall belongs to {name}! 🎉'
      ]
    };

    function pickLine(arr, vars){
      var line = arr[Math.floor(rng() * arr.length)];
      if(vars){ Object.keys(vars).forEach(function(k){ line = line.replace('{' + k + '}', vars[k]); }); }
      return line;
    }

    // ─── DOM ───────────────────────────────────────────────────────────────────

    // Instructions screen
    var instrOverlay = document.createElement('div');
    instrOverlay.style.cssText = 'position:absolute;inset:0;background:rgba(10,15,30,0.96);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;z-index:100;text-align:center;';
    instrOverlay.innerHTML = '<h2 style="margin:0 0 16px;font-size:1.8rem;color:#83bfff;">Hold the Wall</h2>' +
      '<p style="max-width:380px;line-height:1.6;color:#95a9c0;margin:0 0 10px;">Press and hold the wall. <strong style="color:#e8f3ff;">Last person standing wins</strong>.</p>' +
      '<p style="max-width:380px;line-height:1.6;color:#95a9c0;margin:0 0 24px;"><em>Releasing = you drop. No timer. The competition ends only when one person remains.</em></p>' +
      '<button id="hw2StartBtn" style="padding:14px 40px;font-size:1.1rem;background:#83bfff;color:#0b1020;border:none;border-radius:8px;cursor:pointer;font-weight:700;touch-action:manipulation;">START</button>';
    root.appendChild(instrOverlay);

    // HUD
    var hud = document.createElement('div');
    hud.style.cssText = 'display:flex;gap:16px;justify-content:center;padding:14px;background:rgba(10,15,30,0.7);backdrop-filter:blur(4px);font-size:0.85rem;';
    hud.innerHTML = '<span style="color:#95a9c0;">Elapsed: <strong id="hw2Elapsed" style="color:#83bfff;">0s</strong></span>' +
      '<span style="color:#95a9c0;">Remaining: <strong id="hw2Remaining" style="color:#83bfff;">' + participants.length + '</strong></span>';
    root.appendChild(hud);

    // Narrative box
    var narrativeBox = document.createElement('div');
    narrativeBox.style.cssText = 'padding:10px 16px;background:rgba(131,191,255,0.1);border-left:3px solid #83bfff;margin:8px 16px;font-size:0.9rem;color:#e8f3ff;font-style:italic;min-height:44px;display:flex;align-items:center;';
    narrativeBox.textContent = 'Get ready to hold on for dear life…';
    root.appendChild(narrativeBox);

    // Participants grid
    var grid = document.createElement('div');
    grid.style.cssText = 'display:flex;flex-wrap:wrap;gap:12px;justify-content:center;padding:16px;';
    root.appendChild(grid);

    // Wall panel (hold target)
    var wallWrap = document.createElement('div');
    wallWrap.style.cssText = 'display:flex;justify-content:center;padding:0 16px 16px;';

    var wallPanel = document.createElement('div');
    wallPanel.id = 'hw2Wall';
    wallPanel.style.cssText = 'width:100%;max-width:380px;height:180px;background:linear-gradient(135deg,#2a4a5a,#3a5a6a,#2a3a4a);border:5px solid #3a5a6a;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:3rem;cursor:grab;user-select:none;-webkit-user-select:none;touch-action:none;transition:background 0.25s,box-shadow 0.25s;box-shadow:0 8px 24px rgba(0,0,0,0.6);';
    wallPanel.textContent = '🧱';
    wallWrap.appendChild(wallPanel);
    root.appendChild(wallWrap);

    // End screen (hidden initially)
    var endScreen = document.createElement('div');
    endScreen.style.cssText = 'display:none;position:absolute;inset:0;background:rgba(10,15,30,0.95);flex-direction:column;align-items:center;justify-content:center;padding:24px;z-index:101;text-align:center;';
    root.appendChild(endScreen);

    container.appendChild(root);

    // ─── Rendering helpers ─────────────────────────────────────────────────────
    function renderGrid(){
      grid.innerHTML = '';
      participants.forEach(function(p){
        var active = !p.dropped;
        var div = document.createElement('div');
        div.style.cssText = 'text-align:center;transition:opacity 0.4s;' + (active ? '' : 'opacity:0.3;filter:grayscale(1);');
        var avatar = document.createElement('div');
        avatar.style.cssText = 'width:54px;height:54px;border-radius:50%;border:3px solid ' + (p.isPlayer ? '#83bfff' : (active ? '#4a7a9a' : '#444')) + ';overflow:hidden;background:#1a2a3a;margin:0 auto;display:flex;align-items:center;justify-content:center;font-size:1.4rem;color:#83bfff;';
        if(p.avatarUrl){
          avatar.innerHTML = '<img src="' + p.avatarUrl + '" alt="' + p.name + '" style="width:100%;height:100%;object-fit:cover;">';
        } else {
          avatar.textContent = p.name.charAt(0);
        }
        var label = document.createElement('div');
        label.style.cssText = 'font-size:0.7rem;margin-top:4px;color:' + (active ? '#c0d4e8' : '#555') + ';max-width:60px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
        label.textContent = p.name;
        div.appendChild(avatar);
        div.appendChild(label);
        grid.appendChild(div);
      });
    }

    renderGrid();

    // ─── Hold state ────────────────────────────────────────────────────────────
    var isHolding = false;
    var humanDropped = false;

    function startHold(){
      if(state !== 'playing' || humanDropped) return;
      isHolding = true;
      wallPanel.style.background = 'linear-gradient(135deg,#3a6a8a,#4a7a9a,#3a5a7a)';
      wallPanel.style.boxShadow = '0 8px 32px rgba(131,191,255,0.4)';
      wallPanel.style.cursor = 'grabbing';
    }

    function endHold(){
      if(!isHolding) return;
      isHolding = false;
      wallPanel.style.background = 'linear-gradient(135deg,#2a4a5a,#3a5a6a,#2a3a4a)';
      wallPanel.style.boxShadow = '0 8px 24px rgba(0,0,0,0.6)';
      wallPanel.style.cursor = 'grab';
      if(state === 'playing' && !humanDropped){
        dropParticipant(getHuman(), true);
      }
    }

    function getHuman(){
      return participants.find(function(p){ return p.isPlayer; }) || null;
    }

    // ─── Game loop ─────────────────────────────────────────────────────────────
    function gameLoop(){
      if(state !== 'playing' || hasEnded) return;
      var elapsed = Date.now() - startTime;
      var elapsedS = (elapsed / 1000).toFixed(1);
      var remaining = participants.filter(function(p){ return !p.dropped; }).length;
      var elapsedEl = root.querySelector('#hw2Elapsed');
      var remainEl = root.querySelector('#hw2Remaining');
      if(elapsedEl) elapsedEl.textContent = elapsedS + 's';
      if(remainEl) remainEl.textContent = remaining;
      animFrame = requestAnimationFrame(gameLoop);
    }

    // ─── Drop logic ────────────────────────────────────────────────────────────
    function dropParticipant(p, isHumanDrop){
      if(!p || p.dropped) return;
      p.dropped = true;
      p.dropTimeMs = Date.now() - startTime;
      eliminationOrder.push(p.id);
      renderGrid();

      var remaining = participants.filter(function(q){ return !q.dropped; });
      if(isHumanDrop){
        humanDropped = true;
        wallPanel.style.opacity = '0.4';
        wallPanel.style.cursor = 'default';
        setNarrative(pickLine(LINES.drop, { name: 'You' }) + ' Keep watching!');
      } else {
        setNarrative(pickLine(LINES.drop, { name: p.name }));
      }

      if(remaining.length === 2){
        setNarrative(pickLine(LINES.two_left));
      }

      if(remaining.length === 1){
        finishGame(remaining[0]);
      }
    }

    function scheduleAIDrops(){
      participants.forEach(function(p){
        if(p.isPlayer || p.dropped) return;
        var ms = p.scheduledDropMs;
        var t = setTimeout(function(){
          if(state === 'playing' && !p.dropped){
            dropParticipant(p, false);
          }
        }, ms);
        aiTimers.push(t);
      });
    }

    // ─── Narrative helpers ─────────────────────────────────────────────────────
    function setNarrative(text){
      narrativeBox.textContent = text;
    }

    function scheduleNarrativeUpdates(){
      function tick(){
        if(state !== 'playing' || hasEnded) return;
        var remaining = participants.filter(function(p){ return !p.dropped; });
        if(remaining.length > 1){
          setNarrative(pickLine(LINES.start));
        }
        narrativeTimer = setTimeout(tick, 10000 + rng() * 8000);
      }
      narrativeTimer = setTimeout(tick, 12000);
    }

    // ─── Finish game ───────────────────────────────────────────────────────────
    function finishGame(winner){
      if(hasEnded) return;
      hasEnded = true;
      state = 'end';

      if(animFrame){ cancelAnimationFrame(animFrame); animFrame = null; }
      aiTimers.forEach(function(t){ clearTimeout(t); });
      aiTimers = [];
      if(narrativeTimer){ clearTimeout(narrativeTimer); narrativeTimer = null; }

      var durationMs = Date.now() - startTime;
      var winnerId = winner.id;
      var isHumanWinner = winner.isPlayer;

      // Build scores map: winner=1000, others=0
      var scores = {};
      participants.forEach(function(p){
        scores[p.id] = (p.id === winnerId) ? WINNER_SCORE : 0;
      });

      // Set lastCompScores in game context
      if(g.game && g.game.lastCompScores){
        participants.forEach(function(p){
          g.game.lastCompScores.set(p.id, scores[p.id]);
        });
      }

      // Set authoritative winner flag
      if(g.game){
        g.game.__authoritativeWinner = {
          compType: compType,
          playerId: winnerId,
          score: WINNER_SCORE,
          gameKey: GAME_KEY,
          timestamp: Date.now()
        };
        console.info('[HoldWall v2] ✓ Authoritative winner set: player ' + winnerId + ' (' + winner.name + ') — ' + compType.toUpperCase() + ', score=' + WINNER_SCORE);
      }

      // Show end screen
      showEndScreen(winner, isHumanWinner, durationMs);

      // Call onComplete after brief display
      setTimeout(function(){
        if(typeof onComplete === 'function'){
          onComplete(WINNER_SCORE);
        }
      }, 3000);
    }

    function showEndScreen(winner, isHumanWinner, durationMs){
      var compLabel = compType === 'pov' ? 'Power of Veto' : 'Head of Household';
      var title, subtitle, bgColor;
      if(isHumanWinner){
        title = '🏆 You have won ' + compLabel + '!';
        subtitle = pickLine(LINES.win_human);
        bgColor = 'linear-gradient(135deg,rgba(60,100,60,0.95),rgba(40,80,40,0.95))';
      } else {
        title = winner.name + ' wins ' + compLabel + '!';
        subtitle = pickLine(LINES.win_ai, { name: winner.name });
        bgColor = 'linear-gradient(135deg,rgba(10,15,30,0.97),rgba(20,30,50,0.97))';
      }

      endScreen.style.display = 'flex';
      endScreen.style.background = bgColor;
      endScreen.innerHTML = '<div style="max-width:420px;">' +
        '<div style="font-size:2rem;font-weight:800;color:#e8f3ff;margin-bottom:12px;">' + title + '</div>' +
        '<div style="font-size:1rem;color:#95a9c0;margin-bottom:24px;">' + subtitle + '</div>' +
        '<div style="font-size:0.85rem;color:#666;margin-bottom:20px;">Duration: ' + (durationMs / 1000).toFixed(1) + 's</div>' +
        '<div id="hw2Standings" style="width:100%;max-width:340px;margin:0 auto;">' + buildStandingsHTML(winner) + '</div>' +
        '</div>';
    }

    function buildStandingsHTML(winner){
      // Sort: winner first, then by dropTimeMs descending (lasted longer = higher)
      var sorted = participants.slice().sort(function(a, b){
        if(a.id === winner.id) return -1;
        if(b.id === winner.id) return 1;
        return (b.dropTimeMs || 0) - (a.dropTimeMs || 0);
      });
      return sorted.map(function(p, i){
        var medal = i === 0 ? '🥇' : (i === 1 ? '🥈' : (i === 2 ? '🥉' : ''));
        var score = p.id === winner.id ? WINNER_SCORE : 0;
        var timeStr = p.dropTimeMs ? (p.dropTimeMs / 1000).toFixed(1) + 's' : 'Winner';
        return '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;margin:4px 0;background:rgba(255,255,255,0.05);border-radius:6px;' + (p.isPlayer ? 'border:1px solid #83bfff;' : '') + '">' +
          '<span style="color:#e8f3ff;">' + medal + ' ' + (i + 1) + '. ' + p.name + '</span>' +
          '<span style="color:#95a9c0;">' + score + ' pts · ' + timeStr + '</span>' +
          '</div>';
      }).join('');
    }

    // ─── Start game ────────────────────────────────────────────────────────────
    function startGame(){
      instrOverlay.style.display = 'none';
      state = 'playing';
      startTime = Date.now();

      setNarrative(pickLine(LINES.start));
      scheduleAIDrops();
      scheduleNarrativeUpdates();
      gameLoop();

      // If there's only one participant (edge case), they win immediately
      var active = participants.filter(function(p){ return !p.dropped; });
      if(active.length === 1){
        setTimeout(function(){ finishGame(active[0]); }, 500);
      }
    }

    // ─── Event wiring ───────────────────────────────────────────────────────────
    var startBtn = instrOverlay.querySelector('#hw2StartBtn');
    if(startBtn){
      startBtn.addEventListener('click', startGame);
      startBtn.addEventListener('touchstart', function(e){ e.preventDefault(); startGame(); }, { passive: false });
    }

    wallPanel.addEventListener('mousedown', function(e){ e.preventDefault(); startHold(); });
    wallPanel.addEventListener('touchstart', function(e){ e.preventDefault(); startHold(); }, { passive: false });
    document.addEventListener('mouseup', endHold);
    document.addEventListener('touchend', endHold);

    // Cleanup on overlay close
    return {
      cleanup: function(){
        if(animFrame){ cancelAnimationFrame(animFrame); }
        aiTimers.forEach(function(t){ clearTimeout(t); });
        if(narrativeTimer){ clearTimeout(narrativeTimer); }
        document.removeEventListener('mouseup', endHold);
        document.removeEventListener('touchend', endHold);
      }
    };
  }

  // ─── Export ────────────────────────────────────────────────────────────────
  if(!g.MiniGames) g.MiniGames = {};
  g.MiniGames[GAME_KEY] = { render: render };

  console.info('[HoldWall v2] Module loaded — key: ' + GAME_KEY);

})(window);
