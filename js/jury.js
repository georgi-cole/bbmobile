// Finale jury vote — human ballot + live faceoff + vote belt + auto-fit scaling
// Centered version: faceoff is horizontally centered within its container.

(function(g){
  'use strict';

  // ===== Utilities =====
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
  const sleep = (ms)=>new Promise(r=>setTimeout(r,ms));

  function finalists(){
    if(Array.isArray(g.game?.finalTwo) && g.game.finalTwo.length>=2) return g.game.finalTwo.slice(0,2);
    const alive = ap().filter(p=>!p.evicted);
    if(alive.length>=2) return [alive[0].id, alive[1].id];
    const all = (g.game?.players||[]).filter(p=>!p.evicted).sort((a,b)=>(b.threat||0.5)-(a.threat||0.5));
    return all.slice(0,2).map(p=>p.id);
  }

  // Robust juror resolution
  function getJurors(){
    const gg=g.game||{};
    let list = [];
    if (Array.isArray(gg.juryHouse) && gg.juryHouse.length) list = gg.juryHouse.slice();
    else if (Array.isArray(gg.jury) && gg.jury.length) list = gg.jury.slice();
    else if (Array.isArray(gg.jurors) && gg.jurors.length) list = gg.jurors.slice();
    else {
      const players = gg.players || g.players || [];
      list = players.filter(p=>p?.juror || p?.inJury || p?.in_jury).map(p=>p.id).filter(Boolean);
    }
    list = list.map(x => typeof x==='object' ? x?.id : x).filter(Boolean);
    console.log('[jury] jurors resolved:', list.length, list);
    return list;
  }

  // Simple AI ballot logic
  function ballotPick(jurorId, A, B){
    const j = gp(jurorId); if(!j) return (rng()<0.5?A:B);
    const affA = j.affinity?.[A] ?? 0, affB = j.affinity?.[B] ?? 0;
    if(Math.abs(affA-affB) > 0.08) return affA>affB ? A : B;
    const thA = gp(A)?.threat ?? 0.5, thB = gp(B)?.threat ?? 0.5;
    return thA>thB ? B : A;
  }

  // Resolve eviction week from various field names
  function evictWeekOf(player){
    if(!player) return null;
    return player.weekEvicted ?? player.evictedWeek ?? player.evictionWeek ?? player.evictWeek ?? player.evict_wk ?? null;
  }

  // Ensure odd number of jurors by dropping the earliest-evicted if even
  function ensureOddJurors(list){
    if(!list || !Array.isArray(list) || list.length===0) return list;
    if(list.length % 2 === 1) return list; // already odd

    // Find earliest-evicted juror
    let earliestIdx = 0;
    let earliestWeek = Infinity;
    list.forEach((id, idx)=>{
      const p = gp(id);
      const wk = evictWeekOf(p);
      if(wk != null && wk < earliestWeek){
        earliestWeek = wk;
        earliestIdx = idx;
      }
    });

    const dropped = list[earliestIdx];
    const filtered = list.filter((_, i) => i !== earliestIdx);
    console.warn('[jury] Even juror count detected. Dropping earliest-evicted:', safeName(dropped), 'evicted week', earliestWeek);
    return filtered;
  }

  // B) Jury house entry logging
  function juryOnEviction(evictedId){
    const gg = g.game || {};
    if (!gg.juryHouse || !gg.juryHouse.includes(evictedId)) return;
    
    const position = gg.juryHouse.indexOf(evictedId) + 1;
    const ordinals = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];
    const ordinal = ordinals[position - 1] || `${position}th`;
    const hohName = safeName(gg.hohId) || 'Unknown';
    
    g.addJuryLog?.(`${safeName(evictedId)} is the ${ordinal} juror. They were sent to the jury house by the HOH reign of ${hohName}.`);
  }

  // C) Jury banter templates (shown BEFORE casting - anonymous phase)
  const juryBanterTemplates = [
    "I will vote for the person who never betrayed me.",
    "I respect the strongest strategist.",
    "I value loyalty over anything.",
    "My vote goes to whoever played the best social game.",
    "I'm voting for the competition beast.",
    "I'll vote for who was most honest with me.",
    "I'm choosing the player who made the biggest moves.",
    "My decision is based on who controlled the house.",
    "I vote for who deserves it most.",
    "I'm rewarding the player who outwitted everyone."
  ];

  function getJuryBanter(){
    return juryBanterTemplates[Math.floor(rng() * juryBanterTemplates.length)];
  }

  // NEW: Locked-in jury phrases (during reveal phase)
  const JURY_LOCKED_LINES = [
    "I'm voting for the player who steered the game.",
    "My vote goes to strategic consistency.",
    "I'm rewarding social influence and resilience.",
    "I respect bold moves that landed.",
    "Adaptability mattered most to me.",
    "I value clean, effective gameplay."
  ];
  function getLockedJuryPhrase(){ return JURY_LOCKED_LINES[Math.floor(rng()*JURY_LOCKED_LINES.length)]; }

  // America's Vote tiebreaker (random for now; can be enhanced later)
  function americasVoteWinner(A, B){
    const winner = rng()<0.5 ? A : B;
    console.info('[jury] America\'s Vote tiebreaker:', safeName(winner));
    
    // Show brief "America's Vote" card
    const card = document.createElement('div');
    card.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:999;background:linear-gradient(145deg,#1a2942,#0f1a2f);border:2px solid #3e6ba8;border-radius:16px;padding:24px 32px;text-align:center;color:#eaf4ff;box-shadow:0 12px 36px rgba(0,0,0,.6);animation:popIn 0.3s ease;';
    card.innerHTML = `
      <div style="font-size:1.1rem;font-weight:700;letter-spacing:0.8px;margin-bottom:8px;color:#ffdc8b;">🇺🇸 AMERICA'S VOTE 🇺🇸</div>
      <div style="font-size:0.9rem;color:#cfe0f5;">Breaking the tie...</div>
    `;
    document.body.appendChild(card);
    setTimeout(()=>{ try{card.remove();}catch{} }, 2400);

    return winner;
  }

  // ===== Optional panel tiles (kept) =====
  function renderJuryBallotsPanel(jurors, A, B){
    const panel = document.getElementById('panel'); if(!panel) return;
    const host=document.createElement('div'); host.className='juryPanelHost';
    host.innerHTML = `<h3>Jury Ballots</h3><div class="juryGrid" id="juryGrid"></div>`;
    panel.appendChild(host);
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

  // ===== Faceoff UI and styles (with auto-fit and centered) =====
  (function injectFaceoffCSS(){
    if (document.getElementById('faceoff-css')) return;
    const css = `
    /* Centering wrapper around the scaled block */
    .fo-center{ width:100%; display:flex; justify-content:center; }

    /* Auto-fit wrapper scales content so it never clips inside parent; keep centered */
    .fo-fit{
      position:relative; transform-origin: top center; will-change: transform;
      display:flex; flex-direction:column; align-items:center; gap:8px;
    }

    /* Message belt (fixed above; never overlays portraits) */
    .fo-belt{ width:100%; min-height:46px; display:flex; align-items:center; justify-content:center; pointer-events:none; z-index:1 }
    .fo-bubble{ background:rgba(0,0,0,.45); padding:8px 12px; border-radius:10px; font-size:clamp(13px,1.4vw,17px); line-height:1.25; color:#e8f9ff; text-align:center; max-width:92%; box-shadow:0 6px 18px rgba(0,0,0,.35); opacity:0; transform:translateY(-4px); transition:opacity .22s ease,transform .22s ease }
    .fo-bubble.show{ opacity:1; transform:translateY(0) }

    /* Portrait layout — inline-grid + width:auto so the pair can be truly centered */
    .finalFaceoff{
      position:relative; display:inline-grid; grid-template-columns:1fr 1fr;
      gap:clamp(14px,2vw,24px); align-items:start; justify-items:center;
      width:auto; max-width:100%; padding:12px; box-sizing:border-box; min-height:280px;
    }
    .fo-slot{ position:relative; display:grid; grid-template-rows:auto auto auto; gap:8px; align-items:center; justify-items:center; padding:10px 12px; width:clamp(190px,24vw,280px); border-radius:14px; background:rgba(255,255,255,.04); box-shadow:inset 0 0 0 1px rgba(255,255,255,.06); transition:box-shadow .25s ease; overflow:visible }
    .fo-slot.fo-leader{ box-shadow:inset 0 0 0 2px #4dd, 0 0 24px rgba(0,255,230,.25) }
    .fo-avatar{ width:clamp(108px,15vw,170px); height:clamp(108px,15vw,170px); object-fit:cover; border-radius:12px; background:#111; box-shadow:0 8px 24px rgba(0,0,0,.35) }
    .fo-name{ font-size:clamp(14px,1.4vw,18px); font-weight:700; letter-spacing:.3px; text-align:center }
    .fo-votes{ font-size:clamp(15px,1.6vw,22px); font-weight:800; background:linear-gradient(180deg,rgba(255,255,255,.9),rgba(255,255,255,.65)); -webkit-background-clip:text; color:transparent }

    .fo-badge{ position:absolute; top:8px; left:50%; transform:translateX(-50%); background:#00e0cc; color:#001a18; font-weight:800; font-size:12px; padding:6px 10px; border-radius:999px; box-shadow:0 2px 10px rgba(0,224,204,.3); letter-spacing:.3px; z-index:2; display:none }

    @keyframes foPulse{0%{box-shadow:inset 0 0 0 2px rgba(0,224,204,0),0 0 0 rgba(0,224,204,0)}40%{box-shadow:inset 0 0 0 2px rgba(0,224,204,.8),0 0 24px rgba(0,224,204,.25)}100%{box-shadow:inset 0 0 0 2px rgba(0,224,204,.2),0 0 0 rgba(0,224,204,0)}}
    .fo-pulse{ animation: foPulse 600ms ease }

    .fo-tally,.fo-winner{ position:absolute; left:50%; transform:translateX(-50%); padding:8px 14px; border-radius:10px; background:rgba(0,0,0,.55); border:1px solid rgba(255,255,255,.12); color:#f2feff; font-weight:800; text-align:center; box-shadow:0 8px 24px rgba(0,0,0,.35); z-index:3 }
    .fo-tally{ top:42px; font-size:clamp(13px,1.6vw,18px) }
    .fo-winner{ bottom:16px; font-size:clamp(15px,2.0vw,22px) }

    .fo-medal{ position:absolute; inset:0; display:grid; place-items:center; z-index:4; pointer-events:none }
    .fo-medal .medal-wrap{ display:grid; place-items:center; width:180px; height:180px; border-radius:999px; background:radial-gradient(ellipse at center,rgba(255,255,255,.06),rgba(0,0,0,.3)); border:1px solid rgba(255,255,255,.12); box-shadow:0 20px 60px rgba(0,0,0,.45) }
    .fo-medal .medal{ font-size:72px; animation:spin 2s linear infinite; filter:drop-shadow(0 10px 20px rgba(0,0,0,.45)) }
    @keyframes spin{0%{transform:rotate(0)}100%{transform:rotate(360deg)}}

    .fo-ribbon{ position:absolute; top:-10px; left:12px; background:rgba(0,0,0,.7); border:1px solid rgba(255,255,255,.18); color:#e9fcff; font-weight:800; font-size:11px; padding:6px 8px; border-radius:8px; box-shadow:0 6px 16px rgba(0,0,0,.35); z-index:3 }
    .fo-ribbon.right{ left:auto; right:12px }

    /* Fade out animation for tally removal */
    .fadeOutFast{ opacity:0; transition:opacity .45s ease; }

    @media (max-width: 1120px){ .finalFaceoff{ grid-template-columns:1fr; gap:14px } }
    `;
    const style=document.createElement('style'); style.id='faceoff-css'; style.textContent=css; document.head.appendChild(style);
  })();

  const faceoff = { state: null };

  // Find the nearest ancestor that likely clips (overflow not visible or rounded)
  function findMaskAncestor(el){
    let n = el?.parentElement;
    let depth = 0;
    while(n && depth < 8){
      const cs = getComputedStyle(n);
      const ovY = cs.overflowY || cs.overflow;
      const radius = parseFloat(cs.borderTopLeftRadius) || 0;
      const clips = (ovY && ovY !== 'visible') || radius > 0.1;
      if (clips) return n;
      n = n.parentElement; depth++;
    }
    return el?.parentElement || document.body;
  }

  // Auto-fit scaling so content never clips inside the mask ancestor
  function installAutoFit(box){
    const st = faceoff.state; if(!st) return;

    const fit = st.els.fit;
    const mask = findMaskAncestor(box);
    if (!fit || !mask) return;

    let raf = 0;
    const doFit = ()=>{
      raf = 0;
      try{
        fit.style.transform = 'scale(1)';
        const maskRect = mask.getBoundingClientRect();
        const fitRect  = fit.getBoundingClientRect();
        const avail = Math.max(80, (maskRect.top + maskRect.height) - fitRect.top - 8);
        const need = fit.scrollHeight;
        const scale = Math.max(0.5, Math.min(1, avail / need));
        fit.style.transform = `scale(${scale})`;
      }catch(e){}
    };
    const schedule = ()=>{ if (!raf) raf = requestAnimationFrame(doFit); };

    const ro = new ResizeObserver(schedule);
    try{ ro.observe(mask); ro.observe(fit); }catch{}
    st._fitRO = ro;
    st._fitSchedule = schedule;

    schedule();
    window.addEventListener('resize', schedule);
    st._fitCleanup = ()=>{ try{ ro.disconnect(); }catch{} window.removeEventListener('resize', schedule); };
  }

  // Render the Faceoff (centered + auto-fit)
  function renderFinaleGraph(A, B, totalJurors){
    const tv = document.getElementById('tv');
    const panel = document.getElementById('panel');
    const mountAt = tv || panel || document.body;
    if (!mountAt) { console.warn('[jury] No mount container (#tv/#panel).'); return; }

    try { mountAt.querySelectorAll('#juryGraphBox').forEach(x=>x.remove()); } catch{}

    const box=document.createElement('div'); box.className='minigame-host'; box.id='juryGraphBox';
    box.style.position = 'relative';
    box.style.zIndex = '12';
    box.style.overflow = 'visible';
    box.style.marginBottom = '8px';

    const need = Math.floor(totalJurors/2)+1;

    const Aimg = gp(A)?.avatar || gp(A)?.img || gp(A)?.photo || '';
    const Bimg = gp(B)?.avatar || gp(B)?.img || gp(B)?.photo || '';

    box.innerHTML = `
      <h3>Voting the Winner — Live Tally</h3>
      <div class="tiny muted">First to ${need} clinches the win.</div>
      <div class="fo-center">
        <div class="fo-fit" id="foFit">
          <div class="fo-belt" id="foBelt"></div>
          <div class="finalFaceoff" id="finalFaceoff">
            <div class="fo-slot left" id="foLeft">
              <img class="fo-avatar" id="foLeftImg" src="${Aimg}" alt="${safeName(A)}"
                onerror="this.onerror=null;this.src='https://api.dicebear.com/6.x/bottts/svg?seed=${encodeURIComponent(safeName(A))}'">
              <div class="fo-name" id="foLeftName">${safeName(A)}</div>
              <div class="fo-votes"><span id="foLeftCount">0</span></div>
            </div>
            <div class="fo-slot right" id="foRight">
              <img class="fo-avatar" id="foRightImg" src="${Bimg}" alt="${safeName(B)}"
                onerror="this.onerror=null;this.src='https://api.dicebear.com/6.x/bottts/svg?seed=${encodeURIComponent(safeName(B))}'">
              <div class="fo-name" id="foRightName">${safeName(B)}</div>
              <div class="fo-votes"><span id="foRightCount">0</span></div>
            </div>
            <div class="fo-badge" id="foBadge">Majority clinched</div>
          </div>
        </div>
      </div>
    `;
    if (tv) tv.appendChild(box); else mountAt.prepend(box);

    faceoff.state = {
      A, B, need,
      counts: { a:0, b:0 },
      els: {
        wrap: box,
        fit: box.querySelector('#foFit'),
        belt: box.querySelector('#foBelt'),
        root: box.querySelector('#finalFaceoff'),
        leftSlot: box.querySelector('#foLeft'),
        rightSlot: box.querySelector('#foRight'),
        leftCount: box.querySelector('#foLeftCount'),
        rightCount: box.querySelector('#foRightCount'),
        badge: box.querySelector('#foBadge')
      }
    };

    installAutoFit(box);
    console.log('[jury] Faceoff mounted (auto-fit centered) in', tv ? '#tv' : (panel ? '#panel' : 'body'));
  }

  // Vote message belt
  function addFaceoffVoteCard(jurorName, finalistName){
    const st = faceoff.state; if(!st?.els?.belt) return;
    const text = `${jurorName}: I vote for ${finalistName} to win the Big Brother game.`;
    const bubble = document.createElement('div');
    bubble.className='fo-bubble';
    bubble.textContent = text;
    st.els.belt.innerHTML = '';
    st.els.belt.appendChild(bubble);
    requestAnimationFrame(()=> bubble.classList.add('show'));
    setTimeout(()=>{ try{ bubble.classList.remove('show'); }catch{} }, 1800);
    st._fitSchedule && st._fitSchedule();
  }

  // Update counts / pulse / leader glow / majority badge
  function updateFinaleGraph(aCount,bCount){
    const st = faceoff.state; if(!st) return;
    const prevA = st.counts.a, prevB = st.counts.b;

    st.counts.a = aCount|0;
    st.counts.b = bCount|0;

    if(st.els.leftCount) st.els.leftCount.textContent = String(st.counts.a);
    if(st.els.rightCount) st.els.rightCount.textContent = String(st.counts.b);

    const leftLead = st.counts.a > st.counts.b;
    const rightLead = st.counts.b > st.counts.a;

    if(st.els.leftSlot) st.els.leftSlot.classList.toggle('fo-leader', leftLead);
    if(st.els.rightSlot) st.els.rightSlot.classList.toggle('fo-leader', rightLead);

    if (st.counts.a > prevA && st.els.leftSlot){
      st.els.leftSlot.classList.remove('fo-pulse'); void st.els.leftSlot.offsetWidth; st.els.leftSlot.classList.add('fo-pulse');
      setTimeout(()=>st.els.leftSlot.classList.remove('fo-pulse'), 650);
    }
    if (st.counts.b > prevB && st.els.rightSlot){
      st.els.rightSlot.classList.remove('fo-pulse'); void st.els.rightSlot.offsetWidth; st.els.rightSlot.classList.add('fo-pulse');
      setTimeout(()=>st.els.rightSlot.classList.remove('fo-pulse'), 650);
    }

    const clinched = st.need>0 && (st.counts.a>=st.need || st.counts.b>=st.need);
    if(st.els.badge) st.els.badge.style.display = clinched ? '' : 'none';

    st._fitSchedule && st._fitSchedule();
  }

  function showFinalTallyBanner(){
    const st = faceoff.state; if(!st?.els?.root) return;
    st.els.root.querySelectorAll('.fo-tally').forEach(x=>x.remove());
    const t = document.createElement('div');
    t.className='fo-tally';
    t.textContent = `Final Tally — ${safeName(st.A)}: ${st.counts.a} · ${safeName(st.B)}: ${st.counts.b}`;
    st.els.root.appendChild(t);
    st._fitSchedule && st._fitSchedule();
  }

  function showWinnerMessageBanner(winnerId){
    const st = faceoff.state; if(!st?.els?.root) return;
    st.els.root.querySelectorAll('.fo-winner').forEach(x=>x.remove());
    const w = document.createElement('div');
    w.className='fo-winner';
    w.textContent = `${safeName(winnerId)} has won the Big Brother game!`;
    st.els.root.appendChild(w);
    st._fitSchedule && st._fitSchedule();
  }

  function showPlacementLabels(winnerId){
    const st = faceoff.state; if(!st?.els?.root) return;
    st.els.root.querySelectorAll('.fo-ribbon').forEach(x=>x.remove());
    const leftIsWinner = String(st.A) === String(winnerId);
    const l = document.createElement('div'); l.className='fo-ribbon'; l.textContent = leftIsWinner ? 'Finalist' : 'Runner-up';
    const r = document.createElement('div'); r.className='fo-ribbon right'; r.textContent = leftIsWinner ? 'Runner-up' : 'Finalist';
    st.els.leftSlot.appendChild(l);
    st.els.rightSlot.appendChild(r);
    st._fitSchedule && st._fitSchedule();
  }

  function showMedalOverlayFallback(durationMs=5000){
    const st = faceoff.state; if(!st?.els?.root) return;
    st.els.root.querySelectorAll('.fo-medal').forEach(x=>x.remove());
    const o = document.createElement('div'); o.className='fo-medal';
    const wrap = document.createElement('div'); wrap.className='medal-wrap';
    const medal = document.createElement('div'); medal.className='medal'; medal.textContent='🏅';
    wrap.appendChild(medal); o.appendChild(wrap);
    st.els.root.appendChild(o);
    setTimeout(()=>o.remove(), durationMs);
    st._fitSchedule && st._fitSchedule();
  }

  // Helper to hide and remove the faceoff graph with fade animation
  async function hideFaceoffGraph(){
    console.info('[publicFav] waitForTallyHide');
    const box = document.getElementById('juryGraphBox');
    if(!box) {
      console.info('[publicFav] tallyHidden (not found)');
      return;
    }
    
    // Apply fade out class
    box.classList.add('fadeOutFast');
    
    // Wait for transition to complete (.45s)
    await sleep(450);
    
    // Remove from DOM
    try { box.remove(); } catch(e){}
    
    console.info('[publicFav] tallyHidden');
  }

  function celebrateMajority(name){
    try{ g.showBigCard?.('Majority Clinched', [name+' has secured the majority!'], 2200); g.victory?.(); }catch{}
  }

  // Human vote UI
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
    panel.appendChild(box);
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
      box?.querySelector('#btnVoteA')?.addEventListener('click', ()=>kill(A));
      box?.querySelector('#btnVoteB')?.addEventListener('click', ()=>kill(B));
    });
  }

  // Credits helper: use montage split
  function startCreditsPreferred(images){
    try{
      if (typeof g.startEndCreditsMontageSplit === 'function') return g.startEndCreditsMontageSplit({ images, side:'right', totalMs: 50000 });
      if (typeof g.startEndCreditsSplit === 'function') return g.startEndCreditsSplit({ images, side:'right', totalMs: 50000 });
      if (typeof g.startEndCreditsSequence === 'function') return g.startEndCreditsSequence();
      if (typeof g.startEndCredits === 'function') return g.startEndCredits();
      if (typeof g.playCredits === 'function') return g.playCredits();
      if (typeof g.startCredits === 'function') return g.startCredits();
      if (typeof g.runEndCredits === 'function') return g.runEndCredits();
      if (typeof g.showCredits === 'function') return g.showCredits();
      console.log('[jury] No credits function detected.');
    }catch(e){ console.warn('[jury] credits failed', e); }
  }

  // ===== NEW FINALE FLOW FUNCTIONS =====
  
  // Initialize finale state if not present
  function ensureFinaleState(){
    const gg = g.game || {};
    if(!gg.finale){
      gg.finale = {
        juryVotesRaw: [],
        castingDone: false,
        revealStarted: false
      };
    }
    return gg.finale;
  }

  // Phase 1: Anonymous Jury Casting (blind voting without revealing picks)
  async function startJuryCastingPhase(jurors, A, B){
    const gg = g.game || {};
    const finale = ensureFinaleState();
    
    if(finale.castingDone){
      console.warn('[juryCast] already done, skipping');
      return;
    }
    
    console.info('[juryCast] start');
    
    // Cast votes anonymously
    for(const jid of jurors){
      const pick = ballotPick(jid, A, B);
      finale.juryVotesRaw.push({ jurorId: jid, pick });
      console.info(`[juryCast] vote juror=${jid} stored`);
      
      // Show banter (no finalist names)
      const banter = getJuryBanter();
      g.addJuryLog?.(`${safeName(jid)}: ${banter}`, 'muted');
      
      await sleep(800);
    }
    
    finale.castingDone = true;
    console.info('[juryCast] complete');
  }

  // NEW: Public Favourite Player - Post-Winner, Pre-Finale-Cinematic
  // Runs AFTER winner announced, BEFORE spinning medal overlay
  async function runPublicFavouritePostWinner(winnerId){
    const gg = g.game || {};
    const cfg = gg.cfg || {};
    
    // Guard: check toggle (default ON per spec)
    if(!cfg.enablePublicFav){
      console.info('[publicFav] skipped (toggle false)');
      return;
    }
    
    // Single-run guard
    if(g.__publicFavDone){
      console.info('[publicFav] skipped (already completed)');
      return;
    }
    g.__publicFavDone = true;
    
    // Get all players for selection
    const allPlayers = (gg.players || []).slice();
    if(allPlayers.length < 3){
      console.info('[publicFav] skipped (need at least 3 players)');
      return;
    }
    
    console.info('[publicFav] start');
    
    // Helper
    function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
    
    // Calculate total weeks (current week number)
    const totalWeeks = gg.week || 1;
    
    // Calculate weights for all players based on survival time
    // Weight formula: weight = 1 + 0.10 * normalizedSurvival
    // normalizedSurvival = (weekEvicted ? weekEvicted : totalWeeks) / totalWeeks (clamped 0..1)
    const playersWithWeights = allPlayers.map(p => {
      const survivalWeek = p.weekEvicted != null ? p.weekEvicted : totalWeeks;
      const normalizedSurvival = Math.max(0, Math.min(1, survivalWeek / totalWeeks));
      const weight = 1 + 0.10 * normalizedSurvival;
      return { player: p, weight };
    });
    
    // Weighted sampling without replacement for 3 candidates
    function weightedSample(candidates, count) {
      const selected = [];
      const pool = candidates.slice(); // Copy array
      
      for (let i = 0; i < count && pool.length > 0; i++) {
        // Calculate total weight of remaining candidates
        const totalWeight = pool.reduce((sum, c) => sum + c.weight, 0);
        
        // Pick random value in [0, totalWeight)
        let rand = rng() * totalWeight;
        
        // Find the selected candidate
        let selectedIdx = 0;
        for (let j = 0; j < pool.length; j++) {
          rand -= pool[j].weight;
          if (rand <= 0) {
            selectedIdx = j;
            break;
          }
        }
        
        // Add to selected and remove from pool
        selected.push(pool[selectedIdx]);
        pool.splice(selectedIdx, 1);
      }
      
      return selected;
    }
    
    // Select 3 candidates using weighted sampling
    const selectedCandidates = weightedSample(playersWithWeights, 3);
    
    // Card 1: Intro with corrected spelling
    try{
      if(typeof g.showCard === 'function'){
        g.showCard('Audience Spotlight', [
          'And just before we say goodbye to another amazing season, let\'s see whom you have chosen as the Public\'s favourite player.'
        ], 'neutral', 3500, true);
        if(typeof g.cardQueueWaitIdle === 'function') await g.cardQueueWaitIdle();
      }
    }catch(e){ console.warn('[publicFav] showCard error:', e); }
    await sleep(300);
    
    // Build panel with 3 real player slots (real avatars and names)
    const panel = document.createElement('div');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Public\'s Favourite Player voting simulation');
    panel.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:500;background:linear-gradient(145deg,#0e1622,#0a131f);border:2px solid rgba(110,160,220,.25);border-radius:16px;padding:20px;width:min(560px,90vw);box-shadow:0 10px 40px rgba(0,0,0,.8);';
    
    const title = document.createElement('div');
    title.style.cssText = 'font-size:1.05rem;font-weight:800;letter-spacing:0.6px;margin-bottom:14px;text-align:center;color:#ffdc8b;';
    title.textContent = 'PUBLIC\'S FAVOURITE PLAYER';
    panel.appendChild(title);
    
    // Live region for accessibility
    const liveRegion = document.createElement('div');
    liveRegion.setAttribute('role', 'status');
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.style.cssText = 'position:absolute;left:-10000px;width:1px;height:1px;overflow:hidden;';
    panel.appendChild(liveRegion);
    liveRegion.textContent = 'Live public vote updating';
    
    const container = document.createElement('div');
    container.className = 'pfVotePanel';
    container.style.cssText = 'display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;justify-items:center;margin-top:10px;';
    panel.appendChild(container);
    
    // Create 3 real player slots with avatars and names
    const slots = [];
    for(let i = 0; i < 3; i++){
      const candidate = selectedCandidates[i];
      const player = candidate.player;
      
      const slot = document.createElement('div');
      slot.className = 'pfSlot';
      slot.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:8px;width:100%;';
      
      // Real player avatar (with fallback to dicebear)
      const avatar = document.createElement('img');
      const avatarSrc = player?.avatar || player?.img || player?.photo || `https://api.dicebear.com/6.x/bottts/svg?seed=${encodeURIComponent(player?.name || 'player')}`;
      avatar.src = avatarSrc;
      avatar.alt = player?.name || 'Player';
      avatar.onerror = function() {
        this.onerror = null;
        this.src = `https://api.dicebear.com/6.x/bottts/svg?seed=${encodeURIComponent(player?.name || 'player')}`;
      };
      avatar.style.cssText = 'width:68px;height:68px;border-radius:12px;background:#1b2c3b;border:2px solid #3d5a72;object-fit:cover;';
      slot.appendChild(avatar);
      
      // Player name label
      const nameLabel = document.createElement('div');
      nameLabel.style.cssText = 'font-size:0.85rem;font-weight:700;color:#b8d4f0;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;';
      nameLabel.textContent = player?.name || 'Unknown';
      slot.appendChild(nameLabel);
      
      // Percentage label
      const pctLabel = document.createElement('div');
      pctLabel.className = 'pfPct';
      pctLabel.style.cssText = 'font-size:1.1rem;font-weight:800;color:#eaf4ff;text-align:center;';
      pctLabel.textContent = '0%';
      pctLabel.setAttribute('data-slot', i);
      slot.appendChild(pctLabel);
      
      container.appendChild(slot);
      slots.push({ pctLabel, currentPct: 0, weight: candidate.weight });
    }
    
    document.body.appendChild(panel);
    
    // Helper: Generate Dirichlet distribution (simplified approximation using Gamma distribution)
    function dirichlet(alphas) {
      // Use Gamma(alpha, 1) to generate Dirichlet samples
      const gammas = alphas.map(alpha => {
        // Gamma distribution approximation using rejection sampling
        if (alpha < 1) {
          // For alpha < 1, use a different approach
          const u = rng();
          return Math.pow(u, 1 / alpha);
        }
        // Marsaglia and Tsang method for alpha >= 1
        const d = alpha - 1/3;
        const c = 1 / Math.sqrt(9 * d);
        while (true) {
          let x, v;
          do {
            x = Math.sqrt(-2 * Math.log(rng())) * Math.cos(2 * Math.PI * rng()); // Box-Muller
            v = 1 + c * x;
          } while (v <= 0);
          v = v * v * v;
          const u = rng();
          if (u < 1 - 0.0331 * x * x * x * x) return d * v;
          if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
        }
      });
      const sum = gammas.reduce((a, b) => a + b, 0);
      return gammas.map(g => g / sum);
    }
    
    // Generate start distribution (neutral Dirichlet with alpha=1)
    const startPcts = dirichlet([1, 1, 1]).map(v => v * 100);
    
    // Generate target distribution (biased by weight formula: 1 + 0.20 * normalizedSurvival)
    const targetAlphas = slots.map(slot => {
      const p = selectedCandidates[slots.indexOf(slot)].player;
      const survivalWeek = p.weekEvicted != null ? p.weekEvicted : totalWeeks;
      const normalizedSurvival = Math.max(0, Math.min(1, survivalWeek / totalWeeks));
      return 1 + 0.20 * normalizedSurvival;
    });
    const targetPcts = dirichlet(targetAlphas).map(v => v * 100);
    
    // Initialize current percentages
    slots.forEach((slot, i) => {
      slot.currentPct = startPcts[i];
      slot.pctLabel.textContent = Math.round(startPcts[i]) + '%';
    });
    
    // Simulate live voting for 10 seconds base + possible extensions
    // Capture generation token for abort safety
    const myGen = g.__cardGen || 1;
    let aborted = false;
    
    const startTime = Date.now();
    const baseDuration = 10000; // 10 seconds
    let currentDuration = baseDuration;
    const maxExtension = 5000; // +5 seconds max
    let isFirstUpdate = true;
    let extensionCount = 0;
    
    function updatePercentages(){
      // Check if we should abort (flush happened)
      if((g.__cardGen || 1) !== myGen){
        aborted = true;
        console.info('[publicFav] aborted (flush)');
        return false;
      }
      
      const elapsed = Date.now() - startTime;
      const t = Math.min(1, elapsed / currentDuration); // Progress 0..1
      const eased = Math.pow(t, 0.85); // Eased interpolation
      
      // Interpolate between start and target
      const newPcts = slots.map((slot, i) => {
        const start = startPcts[i];
        const target = targetPcts[i];
        const base = start + (target - start) * eased;
        
        // Add bounded noise: ±(2 * (1 - eased))
        const noiseBound = 2 * (1 - eased);
        const noise = (rng() * 2 - 1) * noiseBound;
        
        return base + noise;
      });
      
      // Cap per-tick swing to ≤4 percentage points
      const cappedPcts = newPcts.map((newPct, i) => {
        const oldPct = slots[i].currentPct;
        const delta = newPct - oldPct;
        if (Math.abs(delta) > 4) {
          return oldPct + Math.sign(delta) * 4;
        }
        return newPct;
      });
      
      // Re-normalize to sum to 100
      const sum = cappedPcts.reduce((a, b) => a + b, 0);
      const normalized = cappedPcts.map(p => (p / sum) * 100);
      
      // Update display
      slots.forEach((slot, i) => {
        slot.currentPct = normalized[i];
        slot.pctLabel.textContent = Math.round(normalized[i]) + '%';
      });
      
      // Log only on first update
      if(isFirstUpdate){
        console.info('[publicFav] updating');
        isFirstUpdate = false;
      }
      
      return true;
    }
    
    // Update every 180-240ms with jitter
    function scheduleNext(){
      const jitter = 180 + rng() * 60;
      setTimeout(() => {
        if(aborted) return;
        if(Date.now() - startTime < currentDuration){
          if(updatePercentages() !== false){
            scheduleNext();
          }
        }
      }, jitter);
    }
    scheduleNext();
    
    // Wait for base duration
    await sleep(baseDuration);
    
    // Check if aborted during base duration
    if(aborted || (g.__cardGen || 1) !== myGen){
      console.info('[publicFav] aborted (flush)');
      try { panel.remove(); } catch(e){}
      return;
    }
    
    // Check if we need to lock or extend
    let locked = false;
    while (!locked && extensionCount < 5) {
      // Check for abort
      if((g.__cardGen || 1) !== myGen){
        aborted = true;
        console.info('[publicFav] aborted (flush)');
        try { panel.remove(); } catch(e){}
        return;
      }
      
      // Get current percentages sorted descending
      const sorted = slots.map(s => s.currentPct).sort((a, b) => b - a);
      const topDiff = sorted[0] - sorted[1];
      
      if (topDiff >= 1.0) {
        // Lock condition met
        locked = true;
        liveRegion.textContent = 'Public vote locked';
        console.info('[publicFav] locked');
      } else {
        // Extend by 1 second
        extensionCount++;
        currentDuration += 1000;
        console.info(`[publicFav] extend(+1000ms diff=${topDiff.toFixed(2)}%)`);
        
        // Add noise ±1 to percentages during extension
        const extendedPcts = slots.map(slot => {
          const noise = (rng() * 2 - 1) * 1;
          return slot.currentPct + noise;
        });
        
        // Re-normalize
        const sum = extendedPcts.reduce((a, b) => a + b, 0);
        slots.forEach((slot, i) => {
          slot.currentPct = (extendedPcts[i] / sum) * 100;
          slot.pctLabel.textContent = Math.round(slot.currentPct) + '%';
        });
        
        await sleep(1000);
      }
    }
    
    // If still tied after max extensions, force tiebreak
    if (!locked) {
      const sorted = slots.map((s, i) => ({ pct: s.currentPct, idx: i })).sort((a, b) => b.pct - a.pct);
      const topDiff = sorted[0].pct - sorted[1].pct;
      
      if (topDiff < 1.0) {
        // Apply tiebreak: +1 to first, -1 to second
        slots[sorted[0].idx].currentPct += 1;
        slots[sorted[1].idx].currentPct -= 1;
        
        // Re-normalize
        const sum = slots.reduce((acc, s) => acc + s.currentPct, 0);
        slots.forEach(slot => {
          slot.currentPct = (slot.currentPct / sum) * 100;
          slot.pctLabel.textContent = Math.round(slot.currentPct) + '%';
        });
        
        console.info('[publicFav] tiebreak applied');
      }
      locked = true;
      liveRegion.textContent = 'Public vote locked';
      console.info('[publicFav] locked');
    }
    
    // Freeze final percentages
    const finalPcts = slots.map(s => s.currentPct);
    
    await sleep(800);
    
    // Check for abort before removing panel
    if((g.__cardGen || 1) !== myGen){
      aborted = true;
      console.info('[publicFav] aborted (flush)');
      try { panel.remove(); } catch(e){}
      return;
    }
    
    panel.remove();
    
    // Card 2: Reveal intro
    try{
      if(typeof g.showCard === 'function'){
        g.showCard('Results', ['let\'s reveal the votes'], 'neutral', 2200, true);
        if(typeof g.cardQueueWaitIdle === 'function') await g.cardQueueWaitIdle();
      }
    }catch(e){ console.warn('[publicFav] showCard error:', e); }
    await sleep(400);
    
    // Check for abort before winner reveal
    if((g.__cardGen || 1) !== myGen){
      aborted = true;
      console.info('[publicFav] aborted (flush)');
      return;
    }
    
    // Randomly select winner from the 3 weighted candidates
    const winnerSlotIdx = Math.floor(rng() * 3);
    const fanFavPlayer = selectedCandidates[winnerSlotIdx].player;
    const fanFavName = safeName(fanFavPlayer.id);
    const winnerPct = Math.round(finalPcts[winnerSlotIdx]);
    
    console.info('[publicFav] winner:', fanFavName);
    
    // Store PF results for future reference
    g.__publicFavResult = {
      winnerId: fanFavPlayer.id,
      winnerPct: winnerPct,
      entries: selectedCandidates.map((c, i) => ({
        id: c.player.id,
        pct: Math.round(finalPcts[i])
      }))
    };
    
    // Enhanced Winner Card with Avatar + %
    try {
      const winnerCard = document.createElement('div');
      winnerCard.className = 'pfWinnerCard';
      winnerCard.setAttribute('data-pf-winner', 'true');
      winnerCard.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:500;background:linear-gradient(145deg,#1a2942,#0f1a2f);border:2px solid #ffdc8b;border-radius:16px;padding:24px;width:min(400px,90vw);box-shadow:0 12px 36px rgba(0,0,0,.8);text-align:center;';
      
      // Title
      const title = document.createElement('div');
      title.style.cssText = 'font-size:1.2rem;font-weight:800;color:#ffdc8b;margin-bottom:16px;letter-spacing:0.6px;';
      title.textContent = 'PUBLIC\'S FAVOURITE 🌟';
      winnerCard.appendChild(title);
      
      // Avatar
      const avatar = document.createElement('img');
      const avatarSrc = fanFavPlayer?.avatar || fanFavPlayer?.img || fanFavPlayer?.photo || `https://api.dicebear.com/6.x/bottts/svg?seed=${encodeURIComponent(fanFavPlayer?.name || 'player')}`;
      avatar.src = avatarSrc;
      avatar.alt = fanFavName;
      avatar.onerror = function() {
        this.onerror = null;
        this.src = `https://api.dicebear.com/6.x/bottts/svg?seed=${encodeURIComponent(fanFavPlayer?.name || 'player')}`;
      };
      avatar.style.cssText = 'width:72px;height:72px;border-radius:12px;object-fit:cover;border:2px solid #3e6ba8;margin:0 auto 12px;display:block;';
      winnerCard.appendChild(avatar);
      
      // Name
      const nameLabel = document.createElement('div');
      nameLabel.style.cssText = 'font-size:1.1rem;font-weight:700;color:#eaf4ff;margin-bottom:8px;';
      nameLabel.textContent = fanFavName;
      winnerCard.appendChild(nameLabel);
      
      // Percentage
      const pctLabel = document.createElement('div');
      pctLabel.style.cssText = 'font-size:1.5rem;font-weight:800;color:#ffdc8b;';
      pctLabel.textContent = `${winnerPct}%`;
      winnerCard.appendChild(pctLabel);
      
      document.body.appendChild(winnerCard);
      
      console.info(`[publicFav] winnerCard shown id=${fanFavPlayer.id} pct=${winnerPct}`);
      
      await sleep(4500);
      winnerCard.remove();
    } catch(e){
      console.warn('[publicFav] winnerCard error:', e);
      // Fallback to regular card
      if(typeof g.showCard === 'function'){
        g.showCard('Congratulations! 🌟', [
          `Congratulations to ${fanFavName} for being your favourite player. Join us again next season when the winner can be YOU!`
        ], 'ok', 4500);
        if(typeof g.cardQueueWaitIdle === 'function') await g.cardQueueWaitIdle();
      }
    }
    
    console.info('[publicFav] done');
  }

  // Phase 3: Jury Reveal with vote tallies
  async function startJuryRevealPhase(jurors, A, B){
    const gg = g.game || {};
    const finale = ensureFinaleState();
    
    if(finale.revealStarted){
      console.warn('[juryReveal] already started, skipping');
      return null;
    }
    
    finale.revealStarted = true;
    console.info('[juryReveal] start');
    
    const votes = new Map([[A,0],[B,0]]);
    
    // Shuffle reveal order
    const order = jurors.slice().sort(()=>rng()-.5);
    
    for(const jid of order){
      await sleep(1800);
      
      // Find this juror's vote
      const voteRecord = finale.juryVotesRaw.find(v => v.jurorId === jid);
      const pick = voteRecord ? voteRecord.pick : ballotPick(jid, A, B);
      
      votes.set(pick, (votes.get(pick)||0)+1);
      
      // Show locked phrase with finalist name
      const phrase = getLockedJuryPhrase();
      g.addJuryLog?.(`${safeName(jid)}: ${phrase}`, 'muted');
      g.addJuryLog?.(`${safeName(jid)} votes for ${safeName(pick)}`, 'jury');
      console.info(`[juryReveal] show juror=${jid} vote=${pick}`);
      
      // Update UI
      try{ juryPanelOnBallot(jid, pick); }catch{}
      const a=votes.get(A)||0, b=votes.get(B)||0;
      updateFinaleGraph(a,b);
      addFaceoffVoteCard(safeName(jid), safeName(pick));
    }
    
    // Determine winner
    const a=votes.get(A)||0, b=votes.get(B)||0;
    let winner;
    
    if(a===b){
      // Tiebreaker: America's Vote
      winner = americasVoteWinner(A, B);
      votes.set(winner, (votes.get(winner)||0)+1);
      await sleep(2400);
      updateFinaleGraph(votes.get(A)||0, votes.get(B)||0);
      await sleep(800);
    } else {
      winner = a>b ? A : B;
    }
    
    const finalA = votes.get(A)||0;
    const finalB = votes.get(B)||0;
    console.info(`[juryReveal] winner=${winner} votes=${finalA}-${finalB}`);
    
    return winner;
  }

  // Main orchestrator for new finale flow
  async function startFinaleRefactorFlow(){
    // Flush all cards before entering finale
    if(typeof g.flushAllCards === 'function'){
      g.flushAllCards('enter-finale');
    }
    
    const gg=g.game||{};
    let jurors = getJurors();
    
    if(!jurors.length){
      // No jurors: default winner
      const [A,B]=finalists();
      const winner = rng()<0.5?A:B;
      g.showCard?.('Winner',['By default decision, '+safeName(winner)],'jury',2600,true);
      setTimeout(()=>g.showFinaleCinematic?.(winner), 1200);
      return;
    }
    
    // Ensure odd jurors
    jurors = ensureOddJurors(jurors);
    const finalJurors = [...new Set(jurors)];
    gg.juryHouse = finalJurors;
    
    const [A,B]=finalists();
    
    renderFinaleGraph(A,B,jurors.length);
    try{ renderJuryBallotsPanel(jurors,A,B); }catch{}
    
    const secs = Number(gg.cfg?.tJuryFinale ?? gg.cfg?.tJury ?? 42) || 42;
    g.setPhase?.('jury', secs, null);
    
    setTvNow('Final Jury Vote');
    
    // PHASE 1: Anonymous casting
    await startJuryCastingPhase(jurors, A, B);
    
    // PHASE 2: Jury reveal (no Public Favourite before jury)
    const winner = await startJuryRevealPhase(jurors, A, B);
    
    if(!winner) return;
    
    // Show winner
    await sleep(1000);
    try{ await g.cardQueueWaitIdle?.(); }catch{}
    
    showFinalTallyBanner();
    showPlacementLabels(winner);
    showWinnerMessageBanner(winner);
    
    // NO CONFETTI per spec
    
    try{ g.setMusic?.('victory', true); }catch(e){}
    
    // Wait 5 seconds for winner display
    await sleep(5000);
    
    // Fade out and remove the tally/faceoff graph
    await hideFaceoffGraph();
    
    // Run Public Favourite AFTER tally hidden, BEFORE cinematic overlay
    try{
      await runPublicFavouritePostWinner(winner);
    }catch(e){
      console.warn('[publicFav] error:', e);
    }
    
    // Show classic cinematic overlay (restored)
    console.info('[jury] showing finale cinematic');
    if(typeof g.showFinaleCinematic === 'function'){
      try{
        g.showFinaleCinematic(winner);
      }catch(e){
        console.warn('[jury] showFinaleCinematic error', e);
      }
    }
  }

  // ===== Main flow (now delegates to new finale flow) =====
  async function startJuryVote(){
    // Simply call the new refactored flow
    return startFinaleRefactorFlow();
  }

  // Export
  g.startJuryVote = startJuryVote;
  g.juryOnEviction = juryOnEviction;

})(window);