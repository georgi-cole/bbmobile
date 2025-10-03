// MODULE: eviction.js (Consolidated)
// Combines advanced multi-eviction & tie handling + per-voter Diary Room sequence & early reveal,
// plus auto default human vote if not cast by their turn.
// Retains jury integration, double/triple eviction logic, and social routing.
//
// Remove/delete eviction_Version2.js after adding this file.

(function(global){
  const JURY_START_AT=9;

  function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }

  // Eviction result phrase variants
  const EVICTION_PHRASES = [
    'you have been evicted.',
    'you are evicted from the Big Brother house.',
    'your time in the house has come to an end.',
    'you must leave the Big Brother house.',
    'you have been eliminated.',
    'your journey ends here.',
    'you are leaving the house tonight.'
  ];

  function pickEvictionPhrase(){
    return EVICTION_PHRASES[Math.floor(Math.random()*EVICTION_PHRASES.length)];
  }

  function startLiveVote(){
    const g=global.game;
    g.eviction={
      nominees:[...g.nominees],
      votes:[],
      evicted:null,
      voters:[],
      planned:[],
      sequenceStarted:false,
      sequenceDone:false,
      revealed:false,
      revealing:false
    };
    g.__human_vote=null;

    global.tv.say('Live Vote'); global.phaseMusic?.('livevote');

    const voters=eligibleVoters();
    g.eviction.voters=voters.map(v=>v.id);

    // Pre-plan AI target choices
    g.eviction.planned=voters.map(v=>{
      if(v.id===g.humanId) return {voter:v.id, evict:null};
      return {
        voter:v.id,
        evict:(g.eviction.nominees.length===2
          ? voteFor2(v.id,g.eviction.nominees)
          : voteForMulti(v.id,g.eviction.nominees))
      };
    });

    renderLiveVotePanel();

    global.setPhase('livevote', g.cfg.tVote, async ()=>{
      const gg=global.game;
      if(!gg?.eviction) return;

      if(!gg.eviction.sequenceStarted) beginDiaryRoomSequence();
      const start=Date.now();
      while(!gg.eviction.sequenceDone && Date.now()-start<90000){
        await sleep(250);
      }
      if(!gg.eviction.revealed && !gg.eviction.revealing){
        try{ await revealVotes(false); }catch(e){}
      }
    });

    // Start DR quickly to avoid dead air
    setTimeout(()=>{ if(!g.eviction.sequenceStarted) beginDiaryRoomSequence(); }, 700);
  }
  global.startLiveVote=startLiveVote;

  function renderLiveVotePanel(){
    const g=global.game; const panel=document.querySelector('#panel'); if(!panel) return;
    panel.innerHTML='';
    if(!g.eviction){
      panel.innerHTML='<div class="tiny muted">Eviction flow not initialized.</div>';
      return;
    }
    const box=document.createElement('div'); box.className='minigame-host'; box.innerHTML='<h3>Live Vote</h3>';
    const remain=global.alivePlayers().length;

    const info=document.createElement('div'); info.className='tiny';
    info.textContent=`Nominees: ${global.fmtList(g.eviction.nominees)}. HOH: ${global.safeName(g.hohId)}${remain===4?' (does not vote at Final 4)':' (votes in tie only)'}.`;
    box.appendChild(info);

    const voters=eligibleVoters();
    const list=document.createElement('div'); list.className='tiny muted'; list.style.marginTop='6px';
    list.textContent=`Voters: ${voters.length? voters.map(p=>p.name).join(', ') : 'none'}`;
    box.appendChild(list);

    if(remain===4){
      const note=document.createElement('div'); note.className='tiny warn';
      note.textContent='Final 4: The Veto winner casts the sole vote to evict.';
      box.appendChild(note);
    }

    // Live tally (handles 2 or >2 automatically)
    if(g.eviction.nominees.length===2){
      const [A,B]=g.eviction.nominees;
      const tally=document.createElement('div');
      tally.innerHTML=`
        <div class="tiny" style="margin-top:8px;margin-bottom:4px">Live Tally</div>
        <div style="display:flex; gap:8px; align-items:flex-end">
          <div class="lvCol">
            <div class="tiny muted" id="lvNameA">${global.safeName(A)}</div>
            <div class="lvBarWrap"><div id="lvBarA" class="lvBar"></div></div>
            <div class="tiny" id="lvCountA">0</div>
          </div>
          <div class="lvCol">
            <div class="tiny muted" id="lvNameB">${global.safeName(B)}</div>
            <div class="lvBarWrap"><div id="lvBarB" class="lvBar alt"></div></div>
            <div class="tiny" id="lvCountB">0</div>
          </div>
        </div>`;
      box.appendChild(tally);
    } else {
      const hdr=document.createElement('div');
      hdr.className='tiny'; hdr.style.margin='8px 0 4px';
      hdr.textContent='Live Tally';
      box.appendChild(hdr);
      const ul=document.createElement('ul'); ul.id='lvMultiList'; ul.className='tiny';
      g.eviction.nominees.forEach(id=>{
        const li=document.createElement('li'); li.dataset.candId=String(id);
        li.textContent=`${global.safeName(id)} — 0`;
        ul.appendChild(li);
      });
      box.appendChild(ul);
    }

    // Voter checklist
    const ul=document.createElement('ul'); ul.id='liveVoteList'; ul.className='tiny'; ul.style.marginTop='6px';
    voters.forEach(v=>{
      const li=document.createElement('li'); li.dataset.voterId=String(v.id);
      li.textContent=`${v.name} — waiting`;
      ul.appendChild(li);
    });
    box.appendChild(ul);

    // Human voting UI (2-nom or multi-nom), locked after vote
    const you=global.getP?.(g.humanId);
    const humanIsVoter = !!(you && voters.some(v=>v.id===you.id));
    const hasVoted = g.__human_vote != null;
    const votedName = hasVoted ? global.safeName(g.__human_vote) : null;

    if(you && humanIsVoter){
      if(g.eviction.nominees.length===2){
        const row=document.createElement('div'); row.className='row'; row.style.marginTop='8px';
        if(!hasVoted){
          g.eviction.nominees.forEach(nid=>{
            const btn=document.createElement('button'); btn.className='btn danger';
            btn.textContent=`Evict ${global.safeName(nid)}`;
            btn.onclick=()=>{ lockHumanVote(nid); row.querySelectorAll('button').forEach(b=>b.disabled=true); };
            row.appendChild(btn);
          });
          box.appendChild(row);
          const hint=document.createElement('div'); hint.className='tiny muted';
          hint.textContent='Vote before your Diary Room turn. The sequence will pause for you.';
          box.appendChild(hint);
        } else {
          const ok=document.createElement('div'); ok.className='tiny ok'; ok.textContent=`Your vote is recorded: Evict ${votedName}.`;
          box.appendChild(ok);
        }
      } else {
        const row=document.createElement('div'); row.className='row'; row.style.marginTop='8px';
        if(!hasVoted){
          const sel=document.createElement('select');
          g.eviction.nominees.forEach(id=>{
            const o=document.createElement('option'); o.value=id; o.textContent=global.safeName(id);
            sel.appendChild(o);
          });
          const btn=document.createElement('button'); btn.className='btn danger'; btn.textContent='Cast Vote';
          btn.onclick=()=>{ lockHumanVote(+sel.value); btn.disabled=true; sel.disabled=true; };
          row.append(sel,btn); box.appendChild(row);
          const hint=document.createElement('div'); hint.className='tiny muted';
          hint.textContent='Pick who to evict. The sequence will pause for you.';
          box.appendChild(hint);
        } else {
          const ok=document.createElement('div'); ok.className='tiny ok'; ok.textContent=`Your vote is recorded: Evict ${votedName}.`;
          box.appendChild(ok);
        }
      }
    }

    panel.appendChild(box);
  }
  global.renderLiveVotePanel=renderLiveVotePanel;

  /* ----- Tally Helpers ----- */
  function updateLiveVoteGraph(aCount,bCount){
    const total=aCount+bCount;
    const barA=document.getElementById('lvBarA');
    const barB=document.getElementById('lvBarB');
    const countA=document.getElementById('lvCountA');
    const countB=document.getElementById('lvCountB');
    if(barA) barA.style.width=total? ((aCount/total)*100).toFixed(1)+'%':'0%';
    if(barB) barB.style.width=total? ((bCount/total)*100).toFixed(1)+'%':'0%';
    if(countA) countA.textContent=String(aCount);
    if(countB) countB.textContent=String(bCount);
  }
  function updateLiveVoteMulti(counts){
    const ul=document.getElementById('lvMultiList'); if(!ul) return;
    ul.querySelectorAll('li').forEach(li=>{
      const id=+li.dataset.candId;
      li.textContent=`${global.safeName(id)} — ${counts.get(id)||0}`;
    });
  }

  /* ----- Voting Logic ----- */
  function lockHumanVote(targetId){
    const g=global.game;
    if(g.__human_vote!=null) return;
    g.__human_vote=targetId;
    const idx=(g.eviction.planned||[]).findIndex(p=>p.voter===g.humanId);
    if(idx>=0) g.eviction.planned[idx].evict=targetId;
    global.addLog?.(`You voted to evict ${global.safeName(targetId)}.`,'ok');
    try{ renderLiveVotePanel(); }catch{}
    try{ window.dispatchEvent(new CustomEvent('bb:livevote:humanVoted', { detail: { targetId } })); }catch{}
  }

  function eligibleVoters(){
    const g=global.game;
    const remain=global.alivePlayers().length;
    if(remain===4){
      const holder=global.getP(g.vetoHolder);
      if(holder && !g.eviction.nominees.includes(holder.id)) return [holder];
      return global.alivePlayers().filter(p=>p.id!==g.hohId && !g.eviction.nominees.includes(p.id)).slice(0,1);
    }
    return global.alivePlayers().filter(p=>p.id!==g.hohId && !g.eviction.nominees.includes(p.id));
  }

  function voteFor2(voterId,[a,b]){
    const va=(global.getP(voterId).affinity[a]??0), vb=(global.getP(voterId).affinity[b]??0);
    if(va<vb-0.05) return a; if(vb<va-0.05) return b;
    const ta=global.getP(a).threat||0.5, tb=global.getP(b).threat||0.5;
    return ta>tb? a : b;
  }
  function voteForMulti(voterId,candidates){
    let bestId=null, bestScore=Infinity;
    for(const id of candidates){
      const rel=(global.getP(voterId).affinity[id] ?? 0);
      const threat=global.getP(id)?.threat ?? 0.5;
      const score=rel - 0.06*threat;
      if(score<bestScore){ bestScore=score; bestId=id; }
    }
    return bestId ?? candidates[0];
  }

  function waitForHumanVote(){
    const g=global.game||{};
    return new Promise(resolve=>{
      if(g.__human_vote!=null) return resolve();
      const handler=()=>{ window.removeEventListener('bb:livevote:humanVoted', handler); resolve(); };
      window.addEventListener('bb:livevote:humanVoted', handler, { once:true });
    });
  }

  /* ----- Diary Room Sequence (Animated / Per Voter) ----- */
  async function beginDiaryRoomSequence(){
    const g=global.game; if(!g) return;
    if(g.eviction.sequenceStarted) return;
    g.eviction.sequenceStarted=true;

    const noms=g.eviction.nominees.slice();
    const twoMode = noms.length===2;
    let tallyA=0, tallyB=0;
    const counts = new Map(noms.map(id=>[id,0]));

    function markVoter(vId,text){
      const li=document.querySelector(`#liveVoteList li[data-voter-id="${vId}"]`);
      if(li) li.textContent=`${global.safeName(vId)} — ${text}`;
    }

    for(let i=0;i<(g.eviction.planned||[]).length;i++){
      const entry=g.eviction.planned[i];

      // Pause on human turn until they actually vote (no auto vote)
      if(entry.voter===g.humanId && entry.evict==null){
        markVoter(entry.voter,'your turn…');
        global.showCard?.('Diary Room',['It’s your turn. Please cast your vote now.'],'live',2000,true);
        try{ await waitForHumanVote(); }catch{}
        entry.evict = g.__human_vote;
      }

      const pick=entry.evict;
      const nameV=global.safeName(entry.voter), namePick=global.safeName(pick);
      markVoter(entry.voter,'voting…');
      global.showCard('Diary Room',[`${nameV}: I vote to evict ${namePick}.`],'live',3000,true);
      try{ await global.cardQueueWaitIdle?.(); }catch{}

      if(twoMode){
        const [A,B]=noms;
        if(pick===A) tallyA++; else tallyB++;
        updateLiveVoteGraph(tallyA,tallyB);
      } else {
        counts.set(pick,(counts.get(pick)||0)+1);
        updateLiveVoteMulti(counts);
      }
      markVoter(entry.voter,`voted (${namePick})`);
      await sleep(180);
    }

    g.eviction.sequenceDone=true;
    if(twoMode) await revealVotes(true,tallyA,tallyB);
    else await revealVotes(true,counts);
  }
  global.beginDiaryRoomSequence=beginDiaryRoomSequence;

  /* ----- Tie Break (2 noms) ----- */
  async function tieBreakTwo([a,b],ca,cb){
    const hoh=global.getP(global.game.hohId);
    global.showCard('Tiebreak',['We have a tie! The HOH must break it.'],'live',3000,true);
    try{ await global.cardQueueWaitIdle?.(); }catch{}
    if(hoh?.human){
      const pick = await awaitHumanTieBreakPick([a,b],'Tiebreak — Choose who to evict');
      if(pick===a) ca++; else cb++;
      global.showCard('HOH',[`${hoh.name}: I choose to evict ${global.safeName(pick)}.`],'live',3000,true);
      try{ await global.cardQueueWaitIdle?.(); }catch{}
      return {evId:pick,ca,cb};
    }
    const ha=(hoh.affinity[a]??0), hb=(hoh.affinity[b]??0);
    const evId = ha < hb ? a : b;
    global.showCard('HOH',[`${hoh.name}: I choose to evict ${global.safeName(evId)}.`],'live',3000,true);
    try{ await global.cardQueueWaitIdle?.(); }catch{}
    if(evId===a) ca++; else cb++;
    return {evId,ca,cb};
  }

  function awaitHumanTieBreakPick(cIds,title){
    return new Promise(resolve=>{
      try{
        const panel=document.querySelector('#panel');
        const host=panel?.querySelector('.minigame-host')||panel||document.body;
        const box=document.createElement('div'); box.className='col'; box.style.marginTop='8px';
        const h=document.createElement('div'); h.className='tiny'; h.textContent=title||'Tiebreak';
        const row=document.createElement('div'); row.className='row'; row.style.marginTop='6px';
        cIds.forEach(id=>{
          const b=document.createElement('button'); b.className='btn danger'; b.textContent=`Evict ${global.safeName(id)}`;
          b.onclick=()=>{ cleanup(); resolve(id); };
          row.appendChild(b);
        });
        box.appendChild(h); box.appendChild(row); host.appendChild(box);
        function cleanup(){ try{ row.querySelectorAll('button').forEach(btn=>btn.disabled=true); box.remove(); }catch{} }
      }catch(e){ resolve(cIds[0]); }
    });
  }

  /* ----- Reveal Votes (2 or multi) ----- */
  async function revealVotes(alreadyTallied=false, preAorCounts=0, preB=0){
    const g=global.game;
    if(!g.eviction) return;
    if(g.eviction.revealed || g.eviction.revealing) return;
    g.eviction.revealing=true;

    const noms=g.eviction.nominees.slice();
    const twoMode = noms.length===2;

    if(twoMode){
      let ca=preAorCounts, cb=preB;
      if(!alreadyTallied){
        g.eviction.votes=[];
        const voters=eligibleVoters();
        for(const v of voters){
          if(v.id===g.humanId){
            // Require manual vote; if still not present, wait here
            if(g.__human_vote==null){
              try{ await waitForHumanVote(); }catch{}
            }
            const target=g.__human_vote;
            g.eviction.votes.push({voter:v.id,evict:target});
          } else {
            g.eviction.votes.push({voter:v.id,evict:voteFor2(v.id,noms)});
          }
        }
        const [a,b]=noms; const tally=new Map([[a,0],[b,0]]);
        g.eviction.votes.forEach(v=>tally.set(v.evict,(tally.get(v.evict)||0)+1));
        ca=tally.get(noms[0])||0; cb=tally.get(noms[1])||0;
        updateLiveVoteGraph(ca,cb);
      }
      const [a,b]=noms;
      let evId, finalA=ca, finalB=cb;
      if(ca===cb){
        const res=await tieBreakTwo([a,b],ca,cb);
        evId=res.evId; finalA=res.ca; finalB=res.cb;
      } else evId = (ca>cb? a : b);

      const evName=global.safeName(evId);
      global.showCard('Eviction Result',[`By a vote of ${finalA} to ${finalB}, ${evName}, ${pickEvictionPhrase()}`],'evict',3800,true);
      try{ await global.cardQueueWaitIdle?.(); }catch{}
      global.addLog?.(`Evicted: ${evName} (${finalA}–${finalB}).`,'danger');
      g.eviction.revealed=true; g.eviction.revealing=false; g.eviction.evicted=evId;
      setTimeout(()=>finalizeEviction(),220);
    } else {
      let counts=preAorCounts;
      if(!alreadyTallied || !(counts instanceof Map)){
        counts=new Map(noms.map(id=>[id,0]));
        g.eviction.votes=[];
        const voters=eligibleVoters();
        for(const v of voters){
          if(v.id===g.humanId){
            if(g.__human_vote==null){
              try{ await waitForHumanVote(); }catch{}
            }
            const target=g.__human_vote;
            g.eviction.votes.push({voter:v.id,evict:target});
          } else g.eviction.votes.push({voter:v.id,evict:voteForMulti(v.id,noms)});
        }
        g.eviction.votes.forEach(v=>counts.set(v.evict,(counts.get(v.evict)||0)+1));
        updateLiveVoteMulti(counts);
      }

      const K = (g.__twistMode==='double')?2: (g.__twistMode==='triple')?3:1;

      if(K<=1){
        const sorted=[...counts.entries()].sort((a,b)=>b[1]-a[1]);
        const top=sorted.length?sorted[0][1]:0;
        const topIds=sorted.filter(([_,c])=>c===top).map(([id])=>id);
        let evId;
        if(topIds.length>1){
          // HOH tiebreak among multiple
          const hoh=global.getP(g.hohId);
          if(hoh?.human){
            const pick=await awaitHumanTieBreakPick(topIds,'Tiebreak — Select single eviction');
            counts.set(pick,(counts.get(pick)||0)+1);
            evId=pick;
          } else {
            // AI HOH breaks tie by lower affinity
            const pick=pickByHohAffinity(hoh, topIds);
            counts.set(pick,(counts.get(pick)||0)+1);
            evId=pick;
          }
        } else evId=topIds[0];
        const parts=noms.map(id=>`${global.safeName(id)} ${counts.get(id)||0}`).join(' — ');
        global.showCard('Eviction Result',[`Votes: ${parts}`,`${global.safeName(evId)}, ${pickEvictionPhrase()}`],'evict',3800,true);
        try{ await global.cardQueueWaitIdle?.(); }catch{}
        global.addLog?.(`Evicted: ${global.safeName(evId)}. Votes — ${parts}`,'danger');
        g.eviction.revealed=true; g.eviction.revealing=false; g.eviction.evicted=evId;
        setTimeout(()=>finalizeEviction(),220);
        return;
      }

      // Multi (double/triple) eviction
      const selected=[];
      const work=new Map(counts);
      const hoh = global.getP(g.hohId);

      while(selected.length<K && work.size){
        let max=-Infinity;
        work.forEach(v=>{ if(v>max) max=v; });
        const tied=[...work.entries()].filter(([_,c])=>c===max).map(([id])=>id);
        const remaining=K-selected.length;

        if(tied.length<=remaining){
          tied.forEach(id=>{ selected.push(id); work.delete(id); });
        } else {
          // Fill remaining slots via HOH tiebreak logic
          if(hoh?.human){
            const picks=[];
            for(let i=0;i<remaining;i++){
              const pick=await awaitHumanTieBreakPick(tied,`Tiebreak — Pick ${i+1} of ${remaining}`);
              picks.push(pick);
              tied.splice(tied.indexOf(pick),1);
            }
            picks.forEach(id=>{ selected.push(id); work.delete(id); });
          } else {
            for(let i=0;i<remaining;i++){
              const pick=pickByHohAffinity(hoh, tied);
              selected.push(pick);
              work.delete(pick);
              const idx=tied.indexOf(pick);
              if(idx>=0) tied.splice(idx,1);
              if(!tied.length) break;
            }
          }
        }
      }

      await multiEvictFinalize(selected,counts,K);
    }
  }

  function pickByHohAffinity(hoh, candidates){
    if(!hoh || !Array.isArray(candidates) || !candidates.length) return candidates[0];
    let best=null, bestRel=Infinity;
    for(const id of candidates){
      const rel=(hoh.affinity?.[id]??0);
      if(rel<bestRel){ bestRel=rel; best=id; }
    }
    return best ?? candidates[0];
  }

  async function multiEvictFinalize(evictedIds,counts,K){
    const g=global.game;
    const modeLabel=(K===3)?'Triple Eviction':'Double Eviction';
    for(const id of evictedIds){
      const p=global.getP(id); if(!p) continue;
      p.evicted=true; p.weekEvicted=g.week;
      if(global.alivePlayers().length<=JURY_START_AT && g.cfg.enableJuryHouse){
        if(!g.juryHouse?.includes(id)) g.juryHouse=(g.juryHouse||[]).concat([id]);
      }
      try{ global.juryOnEviction?.(id); }catch{}
    }
    g.nominees=[]; g.vetoHolder=null; g.nomsLocked=false;
    if(Array.isArray(g.players)) g.players.forEach(p=>p.nominated=false);
    global.updateHud?.();

    const parts=[...counts.keys()].map(id=>`${global.safeName(id)} ${counts.get(id)||0}`).join(' — ');
    const names=evictedIds.map(global.safeName).join(', ');
    global.showCard('Eviction Results',[`${modeLabel}: ${names}`,`Final votes: ${parts}`],'evict',4200,true);
    try{ await global.cardQueueWaitIdle?.(); }catch{}
    global.addLog?.(`${modeLabel}: ${names}. Votes — ${parts}`,'danger');

    g.__twistMode=null;
    g.__twistPlannedEvictions=1;
    g.__twistEvictedThisNight=0;
    g.__twistNomineeSnapshot=null;

    postEvictionRouting();
  }

  /* ----- Eviction Finalization & Routing ----- */
  function finalizeEviction(){
    const g=global.game; const evId=g.eviction.evicted;
    handleSelfEviction(evId,'vote');
  }

  function handleSelfEviction(evId,reason='self'){
    const g=global.game; const ev=global.getP(evId); if(!ev) return;
    ev.evicted=true; ev.weekEvicted=g.week;
    if(Array.isArray(g.players)) g.players.forEach(p=>p.nominated=false);

    if(reason==='self'){
      global.showCard('Self-Evicted',[ev.name],'evict',3800,true);
      global.addLog?.(`Self-eviction: <b>${ev.name}</b> has left the game.`,'danger');
    } else {
      global.showCard('Evicted',[ev.name],'evict',3600,true);
      global.addLog?.(`Evicted: <b>${ev.name}</b>.`,'danger');
    }

    if(global.alivePlayers().length<=JURY_START_AT && g.cfg.enableJuryHouse){
      if(!g.juryHouse?.includes(evId)) g.juryHouse=(g.juryHouse||[]).concat([evId]);
    }
    try{ global.juryOnEviction?.(evId); }catch{}

    g.nominees=[]; g.vetoHolder=null; g.nomsLocked=false;

    if(!g.__twistMode) global.twists?.afterPhase?.('eviction');

    postEvictionRouting();
  }
  global.handleSelfEviction=handleSelfEviction;

  function postEvictionRouting(){
    const g=global.game;
    const remain=global.alivePlayers();
    if(remain.length===2){ setTimeout(()=>global.startJuryVote?.(),700); global.updateHud?.(); return; }
    if(remain.length===3){ setTimeout(()=>global.startFinal3Flow?.(),700); global.updateHud?.(); return; }

    proceedNextWeek();
  }

  function proceedNextWeek(){
    const g=global.game;
    if(Array.isArray(g.players)) g.players.forEach(p=>p.nominated=false);
    g.__nomsCommitInProgress=false;
    g.__nomsCommitted=false;
    g._pendingNoms=null;
    g.week++;
    global.updateHud?.();

    if(shouldRunAmericaReturn()){
      setTimeout(()=>{ try{ global.startAmericaReturnVote?.(); }catch(e){} },60);
      return;
    }

    global.tv.say(`Week ${g.week} — Intermission`);
    global.setPhase('intermission',4,()=>global.startHOH?.());
    global.updateHud?.();
  }
  global.proceedNextWeek=proceedNextWeek;

  function shouldRunAmericaReturn(){
    const g=global.game||{};
    if(!g.cfg || g.cfg.enableJuryHouse===false) return false;
    if(g.__americaReturnDone) return false;
    const jurors=Array.isArray(g.juryHouse)?g.juryHouse.length:0;
    if(jurors<4 || jurors>6) return false;
    return Math.random()<0.5;
  }

})(window);