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

  // C) Jury banter templates
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

  // ===== Main flow =====
  async function startJuryVote(){
    const gg=g.game||{};
    let jurors = getJurors();

    // Ensure odd number of jurors to prevent ties
    const beforeOdd = jurors.slice();
    jurors = ensureOddJurors(jurors);

    // A) Normalize canonical juror list
    // Deduplicate and set as the official jury
    const finalJurors = [...new Set(jurors)];
    gg.juryHouse = finalJurors;
    
    // Update all player juror flags
    const players = gg.players || g.players || [];
    players.forEach(p => {
      if (!p) return;
      p.juror = finalJurors.includes(p.id);
    });
    
    // Log excluded jurors
    const excluded = beforeOdd.filter(id => !finalJurors.includes(id));
    excluded.forEach(id => {
      g.addJuryLog?.(`${safeName(id)} did not make the final jury (odd-size rule).`, 'muted');
    });
    
    // Update HUD to reflect accurate juror badges
    g.updateHud?.();

    setTvNow('Voting the Winner');

    if(!jurors.length){
      const [A,B]=finalists(); const winner = rng()<0.5?A:B;
      g.showCard?.('Winner',['By default decision, '+safeName(winner)],'jury',2600,true);
      setTimeout(()=>g.showFinaleCinematic?.(winner), 1200);
      return;
    }

    const [A,B]=finalists();

    renderFinaleGraph(A,B,jurors.length);
    try{ renderJuryBallotsPanel(jurors,A,B); }catch{}

    const secs = Number(gg.cfg?.tJuryFinale ?? gg.cfg?.tJury ?? 42) || 42;
    g.setPhase?.('jury', secs, null);

    let humanPick=null;
    const humanIsJuror = jurors.includes(gg.humanId);
    if(humanIsJuror){
      try{ humanPick = await waitForHumanJuryVote(A,B); }catch{}
    }

    const votes = new Map([[A,0],[B,0]]);
    const step = Math.max(900, (secs*1000 - 2600) / Math.max(1,jurors.length));
    let t=700;
    const need = Math.floor(jurors.length/2)+1;
    let majorityAnnounced=false;

    const order = jurors.slice().sort(()=>rng()-.5);

    order.forEach((jid,i)=>{
      setTimeout(()=>{
        // C) Add banter before vote
        const banter = getJuryBanter();
        g.addJuryLog?.(`${safeName(jid)}: ${banter}`, 'muted');
        
        const pick = (jid===gg.humanId && humanPick!=null) ? humanPick : ballotPick(jid, A, B);
        votes.set(pick,(votes.get(pick)||0)+1);

        try{ juryPanelOnBallot(jid, pick); }catch{}

        const a=votes.get(A)||0, b=votes.get(B)||0;
        updateFinaleGraph(a,b);

        addFaceoffVoteCard(safeName(jid), safeName(pick));
        
        // C) Add reveal log
        g.addJuryLog?.(`${safeName(jid)} voted for ${safeName(pick)} to win the Big Brother game.`);
      }, t + Math.floor(rng()*500));
      t += step;
    });

    setTimeout(async ()=>{
      let a=votes.get(A)||0, b=votes.get(B)||0;

      try{ await g.cardQueueWaitIdle?.(); }catch{}

      showFinalTallyBanner();

      // Handle tie with America's Vote
      let winner;
      if(a===b){
        winner = americasVoteWinner(A, B);
        // Increment the winner's vote count and update graph
        votes.set(winner, (votes.get(winner)||0)+1);
        a=votes.get(A)||0;
        b=votes.get(B)||0;
        await sleep(2400); // wait for America's Vote card to show
        updateFinaleGraph(a,b);
        await sleep(800);
      } else {
        winner = a>b ? A : B;
      }

      showPlacementLabels(winner);

      showWinnerMessageBanner(winner);
      try{ g.setMusic?.('victory', true); }catch(e){}
      await sleep(5000);
      try{
        if (typeof g.stopMusic === 'function') g.stopMusic();
        else if (typeof g.setMusicEnabled === 'function') g.setMusicEnabled(false);
        else document.getElementById('bgm')?.pause?.();
      }catch(e){}
      await sleep(1000);

      const MEDAL_MS = 8000;
      let usedExternalMedal=false;
      try{
        if(typeof g.playMedalAnimation==='function'){ usedExternalMedal=true; await g.playMedalAnimation({duration:MEDAL_MS, winner}); }
        else if(typeof g.startWinnerMedalAnimation==='function'){ usedExternalMedal=true; await g.startWinnerMedalAnimation(MEDAL_MS, winner); }
        else if(typeof g.showWinnerMedal==='function'){ usedExternalMedal=true; await g.showWinnerMedal(winner, MEDAL_MS); }
        else if(typeof g.showFinaleCinematic==='function'){ usedExternalMedal=true; g.showFinaleCinematic(winner); await sleep(MEDAL_MS); }
      }catch(e){ console.warn('[jury] medal animation error', e); }

      if(!usedExternalMedal){
        showMedalOverlayFallback(MEDAL_MS);
        await sleep(MEDAL_MS);
      }

      const imgs = (g.game?.players || g.players || []).map(p=>p?.avatar || p?.img || p?.photo).filter(Boolean);
      startCreditsPreferred(imgs);

    }, Math.max(4200, secs*1000 + 400));
  }

  // Export
  g.startJuryVote = startJuryVote;
  g.juryOnEviction = juryOnEviction;

})(window);