// MODULE: competitions.js
// HOH eligibility, minigames, scoreboards, Final 3 flow, TV updates.
// Enhanced: wait for reveal cards to finish; show Strategize card before Social;
// increment HOH win stats.
// New: guard to ensure HOH selection and winner card happen only once.
// Hardened: safe fallbacks if social module name differs.

(function(global){
  const $=global.$;
  // Legacy games (retired in Phase 1, kept for compatibility)
  const LEGACY_MG_LIST=['clicker','memory','math','bar','typing','reaction','numseq','pattern','slider','anagram','path','target','pairs','simon','estimate'];
  
  // Retired legacy games that should not be used
  const RETIRED_GAMES = ['typing', 'reaction', 'slider', 'path', 'simon'];
  
  // Active legacy games (non-retired subset)
  const ACTIVE_LEGACY = LEGACY_MG_LIST.filter(g => !RETIRED_GAMES.includes(g));
  
  // Use active legacy list for now (will be replaced with new games)
  const MG_LIST = ACTIVE_LEGACY;

  function safeShowCard(title, lines=[], tone='neutral', dur=4200, uniform=false){
    try{
      if(typeof global.showCard === 'function'){
        return global.showCard(title, lines, tone, dur, uniform);
      }
      const tvNow = document.getElementById('tvNow');
      if(tvNow){
        const msg = [title || 'Update'].concat(Array.isArray(lines)? lines : []).join(' — ');
        tvNow.textContent = msg;
      }
    }catch(e){}
    return undefined;
  }
  async function waitCardsIdle(){
    try{
      if(typeof global.cardQueueWaitIdle === 'function'){
        await global.cardQueueWaitIdle();
      }
    }catch(e){}
  }

  function pickMinigameType(){
    const g=global.game;
    
    // Legacy mode overrides
    if(g?.cfg?.miniMode==='clicker') return 'clicker';
    if(g?.cfg?.miniMode==='cycle'){ 
      const t=MG_LIST[g.miniIndex%MG_LIST.length]; 
      g.miniIndex++; 
      return t; 
    }
    
    // Use new registry if available (80% of the time)
    if(global.MiniGamesRegistry && Math.random() < 0.8){
      const newGame = global.MiniGamesRegistry.getRandom();
      if(newGame){
        return newGame;
      }
    }
    
    // Fall back to legacy games
    return MG_LIST[Math.floor((global.rng?.()||Math.random())*MG_LIST.length)];
  }
  global.pickMinigameType=pickMinigameType;

  // Calculate AI difficulty adjustment based on recent human win rate
  function getAIDifficultyMultiplier(){
    const g=global.game;
    if(!g || !g.players) return 1.0;
    const humanId = g.humanId;
    if(!humanId) return 1.0;
    
    const human = global.getP?.(humanId);
    if(!human) return 1.0;
    
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


  function isHumanEligible(phase){
    const g=global.game; const you=global.getP?.(g.humanId);
    if(!you||you.evicted) return false;
    if(phase==='hoh'){
      const alive=global.alivePlayers(); const isF4=alive.length===4;
      if(g.week===1) return true;
      return isF4 ? true : (g.lastHOHId!==you.id);
    }
    return true;
  }
  global.isHumanEligible=isHumanEligible;

  function submitScore(id, base, mult, label){
    const g=global.game; g.lastCompScores=g.lastCompScores||new Map();
    if(g.lastCompScores.has(id)) return false;
    
    // Normalize base score to 0-100 if needed (new games already do this)
    let normalizedBase = base;
    if(base > 100){
      // Legacy games might return higher scores, normalize them
      normalizedBase = Math.min(100, (base / 120) * 100);
    }
    
    // Apply compBeast multiplier and clamp to reasonable range
    const final = Math.max(0, Math.min(150, normalizedBase * mult));
    
    g.lastCompScores.set(id, final);
    // Hidden scoring: only log that player completed, not the score
    global.addLog(`${global.safeName(id)} completed the ${g.phase === 'hoh' ? 'HOH' : 'competition'}.`,'tiny');
    return true;
  }

  function maybeFinishComp(){
    const g=global.game; const alive=global.alivePlayers();
    let eligible=alive.map(p=>p.id);
    if(g.phase==='hoh' && alive.length!==4 && g.week>1 && g.lastHOHId) eligible=eligible.filter(id=>id!==g.lastHOHId);
    const done=[...g.lastCompScores.keys()].filter(id=>eligible.includes(id)).length;
    if(done===eligible.length){ finishCompPhase(); }
  }

  function logScoreboard(title, scoresMap, ids){
    // Hidden: don't log full scoreboard anymore
    // Full results are shown in reveal card
  }
  
  // New: Show top-3 reveal card with crown animation
  async function showCompetitionReveal(title, scoresMap, ids){
    const arr=[...scoresMap.entries()]
      .filter(([id])=>ids.includes(id))
      .map(([id,sc])=>({id,sc,name:global.safeName(id)}))
      .sort((a,b)=>b.sc-a.sc);
    
    if(arr.length === 0) return;
    
    const top3 = arr.slice(0, 3);
    const lines = top3.map((x,i)=>{
      const rank = i+1;
      const crown = rank === 1 ? ' 👑' : '';
      return `${rank}. ${x.name}${crown} — ${x.sc.toFixed(1)}`;
    });
    
    if(typeof global.showCard === 'function'){
      await global.showCard(`${title} Results`, lines, 'ok', 5500, true);
    }
    
    // Add crown animation to winner
    setTimeout(()=>{
      const winnerName = top3[0].name;
      document.querySelectorAll('.top-roster-tile').forEach(tile=>{
        const name = tile.querySelector('.top-tile-name')?.textContent;
        if(name === winnerName){
          const crown = tile.querySelector('.badge-crown');
          if(crown) crown.classList.add('crownPulse');
        }
      });
    }, 500);
  }

  function renderCompPanel(panel){
    const g=global.game;
    if(g.phase==='hoh') return renderHOH(panel);
    if(g.phase==='final3_comp1') return renderF3P1(panel);
    if(g.phase==='final3_comp2') return renderF3P2(panel);
    panel.innerHTML='<div class="tiny muted">Competition running…</div>';
  }
  global.renderCompPanel=renderCompPanel;

  function renderHOH(panel){
    const g=global.game; panel.innerHTML='';
    const host=document.createElement('div'); host.className='minigame-host';
    const you=global.getP?.(g.humanId);
    if(you && !you.evicted){
      const alive=global.alivePlayers(); const blocked=(alive.length!==4 && g.week>1)?g.lastHOHId:null;
      if(you.id!==blocked && !g.lastCompScores?.has(you.id)){
        const mg=pickMinigameType();
        global.renderMinigame?.(mg,host,(base)=>{
          // Use compBeast for human too (no guaranteed wins)
          const humanMultiplier = (0.75 + (you?.compBeast||0.5) * 0.6);
          if(submitScore(you.id, base, humanMultiplier, `HOH/${mg}`)){
            host.innerHTML='<div class="tiny muted">Submission received. Waiting for others…</div>'; maybeFinishComp();
          }
        });
      } else {
        host.innerHTML='<div class="tiny muted">Not eligible this week or already submitted.</div>';
      }
    } else {
      host.innerHTML='<div class="tiny muted">You are evicted and cannot compete.</div>';
    }
    panel.appendChild(host);
  }

  function startHOH(){
    const g=global.game;
    g.lastCompScores=new Map(); g.hohOrder=[];
    g.__hohResolved = false;
    g.__compRunning = true; // Mark competition as running
    global.markCompPlayed?.('hoh'); // Mark HOH as played
    global.tv.say('HOH Competition'); global.phaseMusic?.('hoh');
    global.setPhase('hoh', g.cfg.tHOH, finishCompPhase);
    const alive=global.alivePlayers(); const blocked=(alive.length!==4 && g.week>1)?g.lastHOHId:null;
    const diffMult = getAIDifficultyMultiplier();
    for(const p of alive){
      if(p.id===blocked || p.human) continue;
      setTimeout(()=>{ if(g.phase!=='hoh') return;
        // Use compBeast property for fairer AI scoring
        const baseScore = 8+(global.rng?.()||Math.random())*20;
        const aiMultiplier = (0.75 + (p.compBeast || 0.5) * 0.6) * diffMult;
        submitScore(p.id, baseScore, aiMultiplier, 'HOH/AI'); 
        maybeFinishComp();
      }, 300+(global.rng?.()||Math.random())*(g.cfg.tHOH*620));
    }
  }
  global.startHOH=startHOH;

  async function finishCompPhase(){
    const g=global.game; if(g.phase!=='hoh') return;
    if(g.__hohResolved) return;
    g.__hohResolved = true;
    g.__compRunning = false; // Clear competition running flag

    const alive=global.alivePlayers(); let elig=alive.map(p=>p.id);
    if(alive.length!==4 && g.week>1 && g.lastHOHId) elig=elig.filter(id=>id!==g.lastHOHId);
    
    // Apply dampening for consecutive winners
    for(const id of elig){
      if(!g.lastCompScores.has(id)){
        let baseScore = 5 + (global.rng?.()||Math.random())*20;
        const p = global.getP(id);
        if(p){
          // Soft dampening if player won last 2+ comps
          const recentWins = (p.stats?.hohWins || 0) + (p.stats?.vetoWins || 0);
          if(recentWins >= 2){
            baseScore *= (0.85 + Math.random() * 0.15); // Slight reduction
          }
        }
        g.lastCompScores.set(id, baseScore);
      }
    }
    
    // Show top-3 reveal card
    await showCompetitionReveal('HOH Competition', g.lastCompScores, elig);
    await waitCardsIdle();

    const winner=[...g.lastCompScores.entries()].filter(([id])=>elig.includes(id)).sort((a,b)=>b[1]-a[1])[0][0];
    for(const p of g.players) p.hoh=false; g.hohId=winner; g.lastHOHId=winner; const W=global.getP(winner); W.hoh=true; W.stats=W.stats||{}; W.wins=W.wins||{}; W.stats.hohWins=(W.stats.hohWins||0)+1; W.wins.hoh=(W.wins.hoh||0)+1;

    global.addLog(`HOH: <span class="accent">${global.safeName(winner)}</span>.`);

    await waitCardsIdle();

    safeShowCard('Strategize', ['It’s time to strategize before the Nomination Ceremony.'], 'social', 4200, true);

    await waitCardsIdle();

    // Robust social call — prefer startSocial, fall back to startSocialIntermission
    const runSocial = global.startSocial || global.startSocialIntermission;
    if(typeof runSocial === 'function'){
      runSocial('hoh',()=>{
        global.tv.say('Nominations');
        global.setPhase('nominations', g.cfg.tNoms, ()=>global.lockNominationsAndProceed?.());
        setTimeout(()=>global.startNominations?.(),50);
      });
    } else {
      // Ultimate fallback: go straight to nominations
      global.tv.say('Nominations');
      global.setPhase('nominations', g.cfg.tNoms, ()=>global.lockNominationsAndProceed?.());
      setTimeout(()=>global.startNominations?.(),50);
    }

    global.updateHud(); global.renderPanel();
  }

  // Final 3 flow (unchanged from your current file)
  function startFinal3Flow(){ startF3P1(); }
  global.startFinal3Flow=startFinal3Flow;

  function renderF3P1(panel){
    const g=global.game; panel.innerHTML='';
    const host=document.createElement('div'); host.className='minigame-host';
    const you=global.getP?.(g.humanId);
    if(you && !you.evicted && !g.lastCompScores?.has(you.id)){
      const mg=pickMinigameType();
      global.renderMinigame?.(mg,host,(base)=> submitScore(you.id, base, (0.8+(you?.skill||0.5)*0.6), `F3-P1/${mg}`));
    } else host.innerHTML='<div class="tiny muted">Waiting for competition to conclude…</div>';
    panel.appendChild(host);
  }

  function startF3P1(){
    const g=global.game; g.lastCompScores=new Map();
    global.tv.say('Final 3 — Part 1'); global.phaseMusic?.('hoh');
    global.setPhase('final3_comp1', Math.max(18, Math.floor(g.cfg.tHOH*0.7)), finishF3P1);
    const diffMult = getAIDifficultyMultiplier();
    for(const p of global.alivePlayers()){
      if(p.human) continue;
      setTimeout(()=>{ if(g.phase!=='final3_comp1') return;
        const baseScore = 10+(global.rng?.()||Math.random())*25;
        const aiMultiplier = (0.75 + (p.compBeast || 0.5) * 0.65) * diffMult;
        submitScore(p.id, baseScore, aiMultiplier, 'F3-P1/AI');
      }, 300+(global.rng?.()||Math.random())*(g.cfg.tHOH*520));
    }
  }

  function finishF3P1(){
    const g=global.game; if(g.phase!=='final3_comp1') return;
    const ids=global.alivePlayers().map(p=>p.id);
    for(const id of ids) if(!g.lastCompScores.has(id)) g.lastCompScores.set(id,5+(global.rng?.()||Math.random())*5);
    const arr=[...g.lastCompScores.entries()].filter(([id])=>ids.includes(id)).sort((a,b)=>a[1]-b[1]);
    const lowest=arr[0][0];
    const others=ids.filter(id=>id!==lowest);
    global.addLog(`Final 3 Part 1: Lowest is ${global.safeName(lowest)} (Nominee A).`,'warn');
    safeShowCard('F3 Part 1',[`Nominee A: ${global.safeName(lowest)}`],'noms',2800,true);
    global.game.nominees=[lowest]; startF3P2(others);
  }

  function renderF3P2(panel){
    panel.innerHTML=''; const host=document.createElement('div'); host.className='minigame-host';
    host.innerHTML='<div class="tiny muted">Final 3 — Part 2 (head‑to‑head) is running…</div>'; panel.appendChild(host);
  }

  function startF3P2(duo){
    const g=global.game; g.__f3_duo=duo.slice(); g.lastCompScores=new Map();
    global.tv.say('Final 3 — Part 2'); global.phaseMusic?.('hoh');
    global.setPhase('final3_comp2', Math.max(18, Math.floor(g.cfg.tHOH*0.7)), finishF3P2);
    const diffMult = getAIDifficultyMultiplier();
    for(const id of duo){
      const p=global.getP(id);
      if(p.human){
        const host=document.querySelector('#panel .minigame-host')||document.querySelector('#panel');
        if(host){
          const mg=pickMinigameType(); const wrap=document.createElement('div'); wrap.className='minigame-host'; wrap.style.marginTop='8px';
          wrap.innerHTML='<div class="tiny muted">You are in Final 3 — Part 2.</div>'; host.appendChild(wrap);
          global.renderMinigame?.(mg,wrap,(base)=> submitScore(p.id, base, (0.8+(p?.skill||0.5)*0.6), `F3-P2/${mg}`));
        }
      } else {
        setTimeout(()=>{ if(g.phase!=='final3_comp2') return;
          const baseScore = 10+(global.rng?.()||Math.random())*25;
          const aiMultiplier = (0.75 + (p.compBeast || 0.5) * 0.65) * diffMult;
          submitScore(p.id, baseScore, aiMultiplier, 'F3-P2/AI');
        }, 300+(global.rng?.()||Math.random())*(g.cfg.tHOH*520));
      }
    }
  }

  function finishF3P2(){
    const g=global.game; if(g.phase!=='final3_comp2') return;
    const duo=(g.__f3_duo||[]).slice();
    for(const id of duo) if(!g.lastCompScores.has(id)) g.lastCompScores.set(id,5+(global.rng?.()||Math.random())*5);
    const sorted=[...g.lastCompScores.entries()].filter(([id])=>duo.includes(id)).sort((a,b)=>b[1]-a[1]);
    const winner=sorted[0][0], loser=sorted[1][0];
    for(const p of g.players) p.hoh=false; g.hohId=winner; global.getP(winner).hoh=true;
    const nomA=g.nominees[0]; g.nominees=[nomA, loser];
    global.addLog(`Final 3 Part 2: Final HOH is ${global.safeName(winner)}. Nominees: ${global.fmtList(g.nominees)}.`,'ok');
    safeShowCard('Final 3 Winner',[global.safeName(winner)],'hoh',2800);
    global.tv.say('Final 3 Decision');
    global.setPhase('final3_decision', Math.max(16, Math.floor(g.cfg.tVote*0.8)), ()=>global.finalizeFinal3Decision?.());
    setTimeout(()=>global.renderFinal3DecisionPanel?.(),50);
  }

  function renderFinal3DecisionPanel(){
    const g=global.game; const panel=document.querySelector('#panel'); if(!panel) return;
    const hoh=global.getP(g.hohId); const [a,b]=g.nominees.map(global.getP);
    panel.innerHTML='';
    const box=document.createElement('div'); box.className='minigame-host';
    box.innerHTML=`<h3>Final 3 Decision</h3><div class="tiny">HOH ${hoh.name} must evict one houseguest.</div>`;
    if(hoh.human){
      const row=document.createElement('div'); row.className='row'; row.style.marginTop='8px';
      const btnA=document.createElement('button'); btnA.className='btn danger'; btnA.textContent=`Evict ${a.name}`;
      const btnB=document.createElement('button'); btnB.className='btn danger'; btnB.textContent=`Evict ${b.name}`;
      btnA.onclick=()=>global.finalizeFinal3Decision?.(a.id);
      btnB.onclick=()=>global.finalizeFinal3Decision?.(b.id);
      row.append(btnA,btnB); box.appendChild(row);
    } else {
      const note=document.createElement('div'); note.className='tiny muted'; note.textContent='AI will decide at end.'; box.appendChild(note);
    }
    panel.appendChild(box);
  }
  global.renderFinal3DecisionPanel=renderFinal3DecisionPanel;

  function aiPickFinal3Eviction(){
    const g=global.game; const hoh=global.getP(g.hohId); const [a,b]=g.nominees;
    const ha=(hoh.affinity[a]??0), hb=(hoh.affinity[b]??0); if(ha<hb-0.05) return a; if(hb<ha-0.05) return b;
    const ta=global.getP(a).threat||0.5, tb=global.getP(b).threat||0.5; return ta>=tb? a : b;
  }

  function finalizeFinal3Decision(id){
    const g=global.game; const target=id??aiPickFinal3Eviction();
    const ev=global.getP(target); ev.evicted=true; ev.weekEvicted=g.week;
    global.addLog(`Final 3 eviction: <b>${ev.name}</b>.`,'danger');
    safeShowCard('Evicted',[ev.name],'evict',3600,true);
    if(global.alivePlayers().length<=9 && g.cfg.enableJuryHouse && !g.juryHouse.includes(target)) g.juryHouse.push(target);
    setTimeout(()=>global.startJuryVote?.(), 700);
  }
  global.finalizeFinal3Decision=finalizeFinal3Decision;

})(window);