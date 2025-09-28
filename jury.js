// Finale jury vote — human ballot + animated live graph + better labels
// - Replaces "Final 3 Decision" ticker with "Voting the Winner"
// - If human is a juror, shows a manual vote UI (two buttons) and waits for your pick
// - Shows a live, animated bar graph that updates on each ballot and celebrates majority clinch

(function(g){
  'use strict';

  function ap(){ return (g.alivePlayers?.()||[]).slice(); }
  function gp(id){ return g.getP?.(id); }
  function safeName(id){ return g.safeName?.(id) || (gp(id)?.name ?? String(id)); }
  function rng(){ return (g.rng?.()||Math.random()); }
  function setTvNow(txt){
    try{
      const el=document.getElementById('tvNow'); if(el) el.textContent=txt;
      g.tv?.say?.(txt);
    }catch{}
  }

  function finalists(){
    // Prefer game.finalTwo if provided; otherwise pick top two remaining
    if(Array.isArray(g.game?.finalTwo) && g.game.finalTwo.length>=2) return g.game.finalTwo.slice(0,2);
    const alive = ap().filter(p=>!p.evicted);
    if(alive.length>=2) return [alive[0].id, alive[1].id];
    const all = (g.game?.players||[]).filter(p=>!p.evicted).sort((a,b)=>(b.threat||0.5)-(a.threat||0.5));
    return all.slice(0,2).map(p=>p.id);
  }

  // Simple AI ballot logic
  function ballotPick(jurorId, A, B){
    const j = gp(jurorId); if(!j) return (rng()<0.5?A:B);
    const affA = j.affinity?.[A] ?? 0, affB = j.affinity?.[B] ?? 0;
    if(Math.abs(affA-affB) > 0.08) return affA>affB ? A : B;
    const thA = gp(A)?.threat ?? 0.5, thB = gp(B)?.threat ?? 0.5;
    return thA>thB ? B : A; // vote against bigger threat when affinities are close
  }

  // Panelized ballot tiles (kept, but optional)
  function renderJuryBallotsPanel(jurors, A, B){
    const panel = document.getElementById('panel'); if(!panel) return;
    // host
    const host=document.createElement('div'); host.className='juryPanelHost';
    host.innerHTML = `<h3>Jury Ballots</h3><div class="juryGrid" id="juryGrid"></div>`;
    panel.prepend(host); // show tally first, then tiles (graph will sit above)
    const grid=host.querySelector('#juryGrid');
    jurors.forEach(id=>{
      const tile=document.createElement('div'); tile.className='jpTile'; tile.dataset.jid=String(id);
      const j=gp(id);
      tile.innerHTML = `
        <div class="jpHead">
          <img class="jpJuror" src="${j?.avatar||j?.img||j?.photo||''}" alt="${safeName(id)}" onerror="this.onerror=null;this.src='https://api.dicebear.com/6.x/bottts/svg?seed=${encodeURIComponent(safeName(id))}'">
          <div class="jpName">${safeName(id)}</div>
        </div>
        <div class="jpRow">
          <img class="jpFace finalist" data-fid="${A}" src="${gp(A)?.avatar||''}" alt="${safeName(A)}" onerror="this.onerror=null;this.src='https://api.dicebear.com/6.x/bottts/svg?seed=${encodeURIComponent(safeName(A))}'">
          <div class="jpArrow">→</div>
          <img class="jpFace finalist" data-fid="${B}" src="${gp(B)?.avatar||''}" alt="${safeName(B)}" onerror="this.onerror=null;this.src='https://api.dicebear.com/6.x/bottts/svg?seed=${encodeURIComponent(safeName(B))}'">
        </div>
        <div class="jpMeta"><span class="tiny muted">Waiting…</span></div>
      `;
      grid.appendChild(tile);
    });
  }
  function juryPanelOnBallot(jurorId, pickId){
    const tile = document.querySelector(`.jpTile[data-jid="${jurorId}"]`);
    if(!tile) return;
    tile.classList.add('jpPick');
    tile.querySelectorAll('.jpFace.finalist').forEach(img=>{
      const fid = +img.getAttribute('data-fid');
      img.classList.toggle('picked', fid===pickId);
    });
    const meta = tile.querySelector('.jpMeta');
    if(meta) meta.innerHTML = `<span class="tiny ok">Voted: ${safeName(pickId)}</span>`;
  }

  // Live finale graph (animated)
  function renderFinaleGraph(A, B, totalJurors){
    const panel = document.getElementById('panel'); if(!panel) return;
    const box=document.createElement('div'); box.className='minigame-host'; box.id='juryGraphBox';
    box.innerHTML = `
      <h3>Voting the Winner — Live Tally</h3>
      <div class="tiny muted">First to ${Math.floor(totalJurors/2)+1} clinches the win.</div>
      <div class="juryGraphBars">
        <div class="jgCol">
          <div class="jgName">${safeName(A)}</div>
          <div class="jgBarWrap"><div id="jgBarA" class="jgBar"></div></div>
          <div class="jgCount"><span id="jgCountA">0</span> votes</div>
        </div>
        <div class="jgCol">
          <div class="jgName">${safeName(B)}</div>
          <div class="jgBarWrap"><div id="jgBarB" class="jgBar alt"></div></div>
          <div class="jgCount"><span id="jgCountB">0</span> votes</div>
        </div>
      </div>
    `;
    panel.prepend(box);
  }
  function updateFinaleGraph(aCount,bCount){
    const total = aCount+bCount || 1;
    const barA=document.getElementById('jgBarA');
    const barB=document.getElementById('jgBarB');
    const cA=document.getElementById('jgCountA');
    const cB=document.getElementById('jgCountB');
    if(barA) barA.style.width=((aCount/total)*100).toFixed(1)+'%';
    if(barB) barB.style.width=((bCount/total)*100).toFixed(1)+'%';
    if(cA) cA.textContent=String(aCount);
    if(cB) cB.textContent=String(bCount);
    // pulse the leading bar
    if(barA && barB){
      barA.classList.toggle('lead', aCount>bCount);
      barB.classList.toggle('lead', bCount>aCount);
    }
  }
  function celebrateMajority(name){
    try{
      g.showBigCard?.('Majority Clinched', [name+' has secured the majority!'], 2200);
      // Optional confetti if your build supports it
      g.victory?.(); // no-op if not present
    }catch{}
  }

  // Human vote UI (if human is a juror)
  function renderHumanJuryUI(A,B){
    const panel=document.getElementById('panel'); if(!panel) return;
    const box=document.createElement('div'); box.className='minigame-host'; box.id='humanJuryVote';
    box.innerHTML=`
      <h3>Your Jury Vote</h3>
      <div class="row" style="gap:8px; margin-top:8px">
        <button class="btn ok" id="btnVoteA">Vote ${safeName(A)}</button>
        <button class="btn danger" id="btnVoteB">Vote ${safeName(B)}</button>
      </div>
      <div class="tiny muted" style="margin-top:6px">Cast your vote for the winner.</div>
    `;
    panel.prepend(box);
    return box;
  }
  function waitForHumanJuryVote(A,B){
    return new Promise(resolve=>{
      const box = renderHumanJuryUI(A,B);
      const kill = (choice)=>{
        try{
          const txt = document.createElement('div');
          txt.className='tiny ok'; txt.style.marginTop='6px';
          txt.textContent=`Your ballot: ${safeName(choice)}.`;
          box.appendChild(txt);
          box.querySelectorAll('button').forEach(b=>b.disabled=true);
        }catch{}
        resolve(choice);
      };
      box.querySelector('#btnVoteA').onclick=()=>kill(A);
      box.querySelector('#btnVoteB').onclick=()=>kill(B);
    });
  }

  async function startJuryVote(){
    const gg=g.game||{};
    const jurors = Array.isArray(gg.juryHouse) ? gg.juryHouse.slice() : [];

    // Label the segment correctly
    setTvNow('Voting the Winner');

    // Edge: if no jury somehow, pick winner quickly
    if(!jurors.length){
      const [A,B]=finalists(); const winner = rng()<0.5?A:B;
      g.showCard?.('Winner',['By default decision, '+safeName(winner)],'jury',2600,true);
      setTimeout(()=>g.showFinaleCinematic?.(winner), 1200);
      return;
    }

    const [A,B]=finalists();

    // Render the live graph first
    renderFinaleGraph(A,B,jurors.length);

    // Render ballots panel (tiles)
    try{ renderJuryBallotsPanel(jurors,A,B); }catch{}

    // Phase/timer (keep your existing config if present)
    const secs = Number(gg.cfg?.tJuryFinale ?? gg.cfg?.tJury ?? 42) || 42;
    g.setPhase?.('jury', secs, null);

    // If human is a juror, collect their vote manually
    let humanPick=null;
    const humanIsJuror = jurors.includes(gg.humanId);
    if(humanIsJuror){
      try{
        humanPick = await waitForHumanJuryVote(A,B);
      }catch{}
    }

    // Live vote loop with spacing and graph updates
    const votes = new Map([[A,0],[B,0]]);
    const step = Math.max(900, (secs*1000 - 2600) / Math.max(1,jurors.length));
    let t=700;
    const need = Math.floor(jurors.length/2)+1;
    let majorityAnnounced=false;

    // Shuffle jurors a bit so the human isn't always last/first
    const order = jurors.slice().sort(()=>rng()-.5);

    order.forEach((jid,i)=>{
      setTimeout(async ()=>{
        let pick;
        if(jid===gg.humanId && humanPick!=null){
          pick = humanPick;
        }else{
          pick = ballotPick(jid, A, B);
        }
        votes.set(pick,(votes.get(pick)||0)+1);

        // Update visuals
        try{ juryPanelOnBallot(jid, pick); }catch{}
        const a=votes.get(A)||0, b=votes.get(B)||0;
        updateFinaleGraph(a,b);

        // Show card for the ballot
        g.showCard?.('Jury Ballot', [`${safeName(jid)}: I vote for ${safeName(pick)} to win.`],'jury',3000,true);

        // Majority clinch moment
        const leaderName = (a>b? safeName(A) : b>a? safeName(B) : null);
        const leadCount = Math.max(a,b);
        if(!majorityAnnounced && leaderName && leadCount>=need){
          majorityAnnounced=true;
          setTimeout(()=>celebrateMajority(leaderName), 300);
        }
      }, t + Math.floor(rng()*500));
      t += step;
    });

    // Wrap up and announce final
    setTimeout(async ()=>{
      const a=votes.get(A)||0, b=votes.get(B)||0;
      await g.cardQueueWaitIdle?.();
      try{
        await g.showBigCard?.('Final Vote', [`${safeName(A)} ${a} — ${b} ${safeName(B)}`], 3000);
      }catch(e){
        g.showCard?.('Jury Results',[`${safeName(A)} ${a} — ${b} ${safeName(B)}`],'jury',3000,true);
      }
      const winner = (a===b) ? (rng()<0.5?A:B) : (a>b?A:B);
      g.showFinaleCinematic?.(winner);
    }, Math.max(4200, secs*1000 + 400));
  }

  // Export
  g.startJuryVote = startJuryVote;

})(window);