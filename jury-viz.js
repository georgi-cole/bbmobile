// Centered live graph + ballot tiles; serialized tiles (>=3.5s);
// America tiebreak fully announced; show resolved final graph BEFORE winner banner.
// Hides ticker during jury to avoid overlap.

(function(g){
  'use strict';

  const DWELL_MS = 3500;

  const ap = ()=> (g.alivePlayers?.()||[]).slice();
  const gp = (id)=> g.getP?.(id);
  const sName = (id)=> g.safeName?.(id) || (gp(id)?.name ?? 'Player');
  const rng = ()=> (g.rng?.()||Math.random());
  const sleep = (ms)=> new Promise(r=>setTimeout(r, ms));

  function hideTicker(on){
    const el = document.getElementById('tvNow'); if(!el) return;
    if(on){
      if(!el.dataset._prevDisplay) el.dataset._prevDisplay = el.style.display || '';
      el.style.display = 'none';
    }else{
      el.style.display = el.dataset._prevDisplay || '';
      delete el.dataset._prevDisplay;
    }
  }

  function finalists(){
    if(Array.isArray(g.game?.finalTwo) && g.game.finalTwo.length>=2) return g.game.finalTwo.slice(0,2);
    const alive = ap().filter(p=>!p.evicted);
    if(alive.length>=2) return [alive[0].id, alive[1].id];
    const all = (g.game?.players||[]).filter(p=>!p.evicted).sort((a,b)=>(b.threat||0.5)-(a.threat||0.5));
    return all.slice(0,2).map(p=>p.id);
  }

  function ensureVizHost(){
    const overlay = document.getElementById('tvOverlay');
    if(!overlay) return null;
    let host = document.getElementById('juryVizDock');
    if(!host){
      host = document.createElement('div');
      host.id = 'juryVizDock';
      host.className = 'juryVizDock';
      overlay.appendChild(host);
    }
    if(!host.querySelector('.juryGraphOverlay')){
      const graphWrap=document.createElement('div');
      graphWrap.className='juryGraphOverlay';
      graphWrap.style.margin='0 auto';
      graphWrap.innerHTML = `
        <div class="juryGraphWrap" style="width:100%;">
          <div class="jgTitle" style="text-align:center">Voting the Winner — Live Tally</div>
          <div class="jgSub tiny" id="jgSubNote" style="text-align:center"></div>
          <div class="juryGraphBars">
            <div class="jgCol">
              <div class="jgName" id="jgNameA">Finalist A</div>
              <div class="jgBarWrap"><div id="jgBarA" class="jgBar"></div></div>
              <div class="jgCount"><span id="jgCountA">0</span> votes</div>
            </div>
            <div class="jgCol">
              <div class="jgName" id="jgNameB">Finalist B</div>
              <div class="jgBarWrap"><div id="jgBarB" class="jgBar alt"></div></div>
              <div class="jgCount"><span id="jgCountB">0</span> votes</div>
            </div>
          </div>
        </div>
      `;
      host.appendChild(graphWrap);

      const tileSlot=document.createElement('div');
      tileSlot.id='juryBallotTiles';
      tileSlot.className='juryBallotTiles';
      tileSlot.style.margin='0 auto';
      host.appendChild(tileSlot);
    }
    return host;
  }

  function setGraphLabels(A,B,total, note){
    const na=document.getElementById('jgNameA');
    const nb=document.getElementById('jgNameB');
    const sub=document.getElementById('jgSubNote');
    if(na) na.textContent=sName(A);
    if(nb) nb.textContent=sName(B);
    if(sub) sub.textContent = note ?? `First to ${Math.floor(total/2)+1} clinches.`;
  }

  function updateGraph(a,b){
    const t = Math.max(1, a+b);
    const A=document.getElementById('jgBarA'), B=document.getElementById('jgBarB');
    const cA=document.getElementById('jgCountA'), cB=document.getElementById('jgCountB');
    if(A) A.style.width=((a/t)*100).toFixed(1)+'%';
    if(B) B.style.width=((b/t)*100).toFixed(1)+'%';
    if(cA) cA.textContent=String(a);
    if(cB) cB.textContent=String(b);
    if(A && B){
      A.classList.toggle('lead', a>b);
      B.classList.toggle('lead', b>a);
    }
  }

  function celebrateMajority(name){
    try{ g.showBigCard?.('Majority Clinched', [name+' has secured the majority!'], 1800); }catch{}
    try{ g.victory?.(); }catch{}
  }

  function ballotPick(jurorId, A, B){
    const j = gp(jurorId); if(!j) return (rng()<0.5?A:B);
    const affA = j.affinity?.[A] ?? 0, affB = j.affinity?.[B] ?? 0;
    if(Math.abs(affA-affB) > 0.08) return affA>affB ? A : B;
    const thA = gp(A)?.threat ?? 0.5, thB = gp(B)?.threat ?? 0.5;
    return thA>thB ? B : A;
  }

  function showBallotTile(jid, pickId){
    const slot=document.getElementById('juryBallotTiles'); if(!slot) return null;
    slot.querySelectorAll('.ballotTile.live').forEach(n=>{
      n.classList.remove('live'); n.classList.add('hide');
      setTimeout(()=>{ try{ n.remove(); }catch{} }, 220);
    });

    const j=gp(jid), p=gp(pickId);
    const tile=document.createElement('div'); tile.className='ballotTile live';
    tile.style.maxWidth='640px';
    tile.innerHTML=`
      <div class="bt-head" style="text-align:center">${sName(jid)}</div>
      <div class="bt-row">
        <div class="bt-side">
          <img class="bt-face" src="${j?.avatar||j?.img||j?.photo||''}" alt="${sName(jid)}"
               onerror="this.onerror=null;this.src='https://api.dicebear.com/6.x/bottts/svg?seed=${encodeURIComponent(sName(jid))}'">
          <div class="bt-cap">Juror</div>
        </div>
        <div class="bt-arrow">→</div>
        <div class="bt-side">
          <img class="bt-face" src="${p?.avatar||p?.img||p?.photo||''}" alt="${sName(pickId)}"
               onerror="this.onerror=null;this.src='https://api.dicebear.com/6.x/bottts/svg?seed=${encodeURIComponent(sName(pickId))}'">
          <div class="bt-cap">${sName(pickId)}</div>
        </div>
      </div>
      <div class="bt-line tiny" style="text-align:center">I vote for <b>${sName(pickId)}</b> to win.</div>
    `;
    slot.appendChild(tile);
    requestAnimationFrame(()=> tile.classList.add('show'));
    return tile;
  }

  function renderHumanUI(A,B){
    const host=document.getElementById('juryVizDock'); if(!host) return null;
    let box=document.getElementById('humanJuryVoteBox');
    if(box) box.remove();
    box=document.createElement('div');
    box.id='humanJuryVoteBox';
    box.className='humanJuryVoteBox';
    box.style.margin='0 auto';
    box.innerHTML=`
      <div class="hjvCard">
        <div class="hjvTitle">Your Jury Vote</div>
        <div class="row" style="gap:8px; margin-top:6px; justify-content:center">
          <button class="btn ok" id="hjvA">Vote ${sName(A)}</button>
          <button class="btn danger" id="hjvB">Vote ${sName(B)}</button>
        </div>
      </div>
    `;
    host.appendChild(box);
    return box;
  }

  function waitForHumanVote(A,B){
    return new Promise(resolve=>{
      const box = renderHumanUI(A,B);
      const done=(pick)=>{
        try{
          const t=document.createElement('div'); t.className='tiny ok'; t.style.marginTop='6px';
          t.textContent=`Your ballot: ${sName(pick)}.`;
          box.querySelector('.hjvCard').appendChild(t);
          box.querySelectorAll('button').forEach(b=>b.disabled=true);
          setTimeout(()=> box.remove(), 900);
        }catch{}
        resolve(pick);
      };
      box.querySelector('#hjvA').onclick=()=>done(A);
      box.querySelector('#hjvB').onclick=()=>done(B);
    });
  }

  async function americaTiebreak(A,B){
    const host=document.getElementById('juryVizDock'); if(!host) return A;
    let box=document.getElementById('amerVoteBox');
    if(box) box.remove();
    box=document.createElement('div');
    box.id='amerVoteBox';
    box.className='amerVoteBox';
    box.style.margin='0 auto';
    box.innerHTML=`
      <div class="avTitle" style="text-align:center">America Vote — Tiebreak</div>
      <div class="avBars">
        <div class="avRow">
          <div class="avName">${sName(A)}</div>
          <div class="avBarWrap"><div id="avBarA" class="avBar"></div></div>
          <div class="avPct" id="avPctA">0%</div>
        </div>
        <div class="avRow">
          <div class="avName">${sName(B)}</div>
          <div class="avBarWrap"><div id="avBarB" class="avBar alt"></div></div>
          <div class="avPct" id="avPctB">0%</div>
        </div>
      </div>
    `;
    host.appendChild(box);

    const bias = (gp(B)?.threat||0.5) - (gp(A)?.threat||0.5);
    let aPct = Math.max(42, Math.min(58, 50 - bias*18 + (Math.random()-0.5)*8));
    let bPct = 100 - aPct;
    if (aPct === 50) { aPct += 0.7; bPct -= 0.7; }

    await sleep(120);
    const barA=document.getElementById('avBarA');
    const barB=document.getElementById('avBarB');
    const pctA=document.getElementById('avPctA');
    const pctB=document.getElementById('avPctB');
    if(barA) barA.style.width=aPct+'%';
    if(barB) barB.style.width=bPct+'%';
    if(pctA) pctA.textContent=aPct.toFixed(1)+'%';
    if(pctB) pctB.textContent=bPct.toFixed(1)+'%';

    try{
      await g.showBigCard?.('America Vote — Tiebreak', [`${sName(A)} ${aPct.toFixed(1)}% — ${bPct.toFixed(1)}% ${sName(B)}`], 2600);
    }catch{
      g.showCard?.('America Vote — Tiebreak', [`${sName(A)} ${aPct.toFixed(1)}% — ${bPct.toFixed(1)}% ${sName(B)}`],'jury',2600,true);
    }
    await g.cardQueueWaitIdle?.();

    const winner = aPct>bPct ? A : B;

    try{
      await g.showBigCard?.('Tiebreak Result', [`America selects ${sName(winner)} as the winner.`], 2200);
    }catch{
      g.showCard?.('Tiebreak Result', [`America selects ${sName(winner)} as the winner.`],'jury',2200,true);
    }
    await g.cardQueueWaitIdle?.();

    setTimeout(()=>{ try{ box.remove(); }catch{} }, 500);
    return winner;
  }

  async function showFinalGraphMoment(a,b,A,B, note){
    const sub = note ?? null;
    const total = a+b || 1;
    const need = Math.floor(total/2)+1;
    const leader = a>b? sName(A) : b>a? sName(B) : null;
    const txt = leader ? `${leader} leads` : '';
    setGraphLabels(A,B,total, sub || txt);
    updateGraph(a,b);
    try{ const tileSlot=document.getElementById('juryBallotTiles'); if(tileSlot) tileSlot.innerHTML=''; }catch{}
    await sleep(1200);
  }

  async function enhancedStartJuryVote(){
    const gg=g.game||{};
    const jurors = Array.isArray(gg.juryHouse) ? gg.juryHouse.slice() : [];

    hideTicker(true);

    if(!jurors.length){
      const [A,B]=finalists(); const winner = (rng()<0.5?A:B);
      g.showCard?.('Winner',['By default decision, '+sName(winner)],'jury',1800,true);
      setTimeout(()=>{ hideTicker(false); g.showFinaleCinematic?.(winner); }, 900);
      return;
    }

    const [A,B]=finalists();
    const host=ensureVizHost(); if(!host) return;
    setGraphLabels(A,B,jurors.length);

    const secs = Number(gg.cfg?.tJuryFinale ?? gg.cfg?.tJury ?? 42) || 42;
    g.setPhase?.('jury', secs, null);

    let humanPick=null;
    const isHumanJuror = jurors.includes(gg.humanId);
    if(isHumanJuror){
      try{ humanPick = await waitForHumanVote(A,B); }catch{}
    }

    const votes = new Map([[A,0],[B,0]]);
    const need = Math.floor(jurors.length/2)+1;
    let majorityAnnounced=false;
    const order = jurors.slice().sort(()=>Math.random()-.5);

    for(const jid of order){
      const pick = (jid===gg.humanId && humanPick!=null) ? humanPick : ballotPick(jid,A,B);
      votes.set(pick,(votes.get(pick)||0)+1);

      const a=votes.get(A)||0, b=votes.get(B)||0;
      updateGraph(a,b);

      const tile = showBallotTile(jid, pick);

      const leaderName = (a>b? sName(A) : b>a? sName(B) : null);
      const leadCount = Math.max(a,b);
      if(!majorityAnnounced && leaderName && leadCount>=need){
        majorityAnnounced=true;
        setTimeout(()=> celebrateMajority(leaderName), 120);
      }

      await sleep(DWELL_MS);
      if(tile && tile.isConnected){
        tile.classList.remove('live'); tile.classList.add('hide');
        await sleep(220);
        try{ tile.remove(); }catch{}
      }
    }

    let a=votes.get(A)||0, b=votes.get(B)||0;
    await g.cardQueueWaitIdle?.();

    let winner, subNote = null;

    if (a===b){
      try{ await g.showBigCard?.('Tie!', ['The jury is tied. America will decide the winner.'], 1800); }
      catch{ g.showCard?.('Tie!', ['The jury is tied. America will decide the winner.'],'jury',1800,true); }
      await g.cardQueueWaitIdle?.();

      winner = await americaTiebreak(A,B);
      const dispA = winner===A ? a+1 : a;
      const dispB = winner===B ? b+1 : b;
      subNote = 'Includes America tiebreak';
      await showFinalGraphMoment(dispA, dispB, A, B, subNote);

      const parts = `${sName(A)} ${a} — ${b} ${sName(B)}  (America tiebreak → ${sName(winner)})`;
      try{ await g.showBigCard?.('Final Vote', [parts], 2000); }
      catch{ g.showCard?.('Jury Results',[parts],'jury',2000,true); }
      await g.cardQueueWaitIdle?.();
    } else {
      winner = (a>b?A:B);
      await showFinalGraphMoment(a, b, A, B, null);

      const parts = `${sName(A)} ${a} — ${b} ${sName(B)}`;
      try{ await g.showBigCard?.('Final Vote', [parts], 2000); }
      catch{ g.showCard?.('Jury Results',[parts],'jury',2000,true); }
      await g.cardQueueWaitIdle?.();
    }

    await sleep(700);
    hideTicker(false);
    g.showFinaleCinematic?.(winner);
  }

  try{
    g.startJuryVote = enhancedStartJuryVote;
    console.info('[jury-viz] centered + final graph before winner installed');
  }catch(e){
    console.warn('[jury-viz] failed to install', e);
  }

})(window);