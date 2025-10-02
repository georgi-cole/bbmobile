// Finale cinematic: lights out, big winner name, rotating cup, and actions.
(function(g){
  'use strict';

  function ensureFinaleStyles(){
    if(document.getElementById('cinStyles')) return;
    const css = `
    .cinDim{position:fixed;inset:0;background:radial-gradient(120% 120% at 50% 10%,rgba(2,6,10,.9),rgba(0,0,0,.98)),#000;
      z-index:400;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;animation:cinFade .45s ease forwards;}
    @keyframes cinFade{from{opacity:0}to{opacity:1}}
    .cinPanel{width:min(820px,90vw);border-radius:18px;padding:24px 24px 20px;background:linear-gradient(145deg,#0e1622,#0a131f);
      border:1px solid rgba(110,160,220,.18);box-shadow:0 18px 48px -20px rgba(0,0,0,.8), inset 0 0 38px -16px rgba(120,180,255,.25);
      text-align:center;color:#eaf4ff;}
    .cinTitle{font-size:1.05rem;letter-spacing:.8px;margin:0 0 10px;color:#ffdc8b;text-shadow:0 0 16px rgba(255,220,140,.5);}
    .cinName{font-size:2.6rem;letter-spacing:1.2px;font-weight:800;background:linear-gradient(90deg,#ffe9a8,#ffd36b 45%,#fff1c9);
      -webkit-background-clip:text;color:transparent;filter:drop-shadow(0 0 16px rgba(255,210,110,.45));margin:4px 0 8px;}
    .cinCupWrap{display:flex;align-items:center;justify-content:center;margin:6px 0 12px;}
    .cinCup{width:88px;height:88px;border-radius:50%;display:flex;align-items:center;justify-content:center;
      background:radial-gradient(circle at 50% 45%,#ffeb9a,#f3d76a 60%,#caa44e 100%);
      box-shadow:0 0 0 2px #6a5320 inset, 0 10px 30px -14px rgba(0,0,0,.8); animation:spinY 4.5s linear infinite;}
    .cinCup::after{content:'🏆';font-size:2.1rem;transform:translateZ(0);}
    @keyframes spinY{0%{transform:rotateY(0)}100%{transform:rotateY(360deg)}}
    .cinBtns{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}
    .cinBtns .btn{background:#1f344d;color:#d8e6f5;border:none;border-radius:10px;padding:8px 14px;font-weight:700;letter-spacing:.6px;}
    .cinBtns .btn.primary{background:#3563a7}
    .cinBtns .btn.danger{background:#993636}
    .cinStats{margin-top:10px;text-align:left;font-size:.78rem;color:#cfe0f5;background:#101a2a;border:1px solid #203347;border-radius:12px;padding:12px;display:none;}
    .cinFieldRow{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:8px;}
    .cinFieldRow label{display:flex;flex-direction:column;gap:4px;font-size:.72rem;color:#cfe0f5}
    .cinFieldRow input{background:#122233;color:#eaf4ff;border:1px solid #2b4767;border-radius:8px;padding:8px 10px;font-size:.86rem;}
    .cinProfile{display:none;margin-top:10px;padding-top:10px;border-top:1px dashed #284058;}
    @media (max-width: 540px) {
      .cinPanel{width:94vw;padding:16px 12px;border-radius:14px;}
      .cinTitle{font-size:.95rem;margin-bottom:8px;}
      .cinName{font-size:2rem;letter-spacing:1px;}
      .cinCup{width:72px;height:72px;}
      .cinCup::after{font-size:1.8rem;}
      .cinBtns{gap:8px;}
      .cinBtns .btn{padding:6px 12px;font-size:.82rem;letter-spacing:.5px;}
      .cinStats{padding:10px;font-size:.74rem;}
      .cinFieldRow{grid-template-columns:1fr;gap:8px;}
      .cinFieldRow label{font-size:.7rem;}
      .cinFieldRow input{width:100%;box-sizing:border-box;padding:7px 9px;font-size:.84rem;}
      .cinProfile{padding-top:8px;}
      #cinProfileStart{display:block;margin:10px auto 0;width:auto;}
    }
    `;
    const tag=document.createElement('style'); tag.id='cinStyles'; tag.textContent=css; document.head.appendChild(tag);
  }

  // UPDATED: Stats come from p.stats.hohWins, p.stats.vetoWins, and p.nominatedCount
  function computeStats(){
    const gme=g.game||{}; const players=(gme.players||[]).slice();
    const stats={
      mostHOH:null, hohMax:-1,
      mostVeto:null, vetoMax:-1,
      mostNoms:null, nomMax:-1,
      compBeast:null, compMax:-1
    };
    players.forEach(p=>{
      const hoh  = +(p.stats?.hohWins || 0);
      const veto = +(p.stats?.vetoWins || 0);
      const noms = +(p.nominatedCount || 0);
      const comps = hoh + veto;
      if(hoh>stats.hohMax){ stats.hohMax=hoh; stats.mostHOH=p; }
      if(veto>stats.vetoMax){ stats.vetoMax=veto; stats.mostVeto=p; }
      if(noms>stats.nomMax){ stats.nomMax=noms; stats.mostNoms=p; }
      if(comps>stats.compMax){ stats.compMax=comps; stats.compBeast=p; }
    });
    return stats;
  }

  function statsHtml(){
    const s=computeStats();
    function line(label,p,val){ if(!p) return `<div>${label}: —</div>`; return `<div>${label}: <b>${p.name}</b> (${val})</div>`; }
    return [
      line('Most HOH', s.mostHOH, s.hohMax),
      line('Most Veto', s.mostVeto, s.vetoMax),
      line('Most times nominated', s.mostNoms, s.nomMax),
      line('Competition Beast (HOH+Veto)', s.compBeast, s.compMax)
    ].join('');
  }

  function ensureOverlay(){
    ensureFinaleStyles();
    let dim=document.querySelector('.cinDim');
    if(dim) return dim;
    dim=document.createElement('div'); dim.className='cinDim';
    const panel=document.createElement('div'); panel.className='cinPanel';
    panel.innerHTML=`
      <div class="cinTitle">WINNER</div>
      <div class="cinName" id="cinWinName">—</div>
      <div class="cinCupWrap"><div class="cinCup"></div></div>
      <div class="cinBtns">
        <button class="btn primary" id="cinNewSeason">New Season</button>
        <button class="btn" id="cinStatsBtn">Stats</button>
        <button class="btn" id="cinCredits">Credits</button>
        <button class="btn danger" id="cinExit">Exit</button>
      </div>
      <div class="cinStats" id="cinStats">${statsHtml()}</div>
      <div class="cinProfile" id="cinProfile">
        <div class="tiny muted">Create your player profile for the next season.</div>
        <div class="cinFieldRow">
          <label>Name<input id="cinPName" placeholder="Your name"/></label>
          <label>Age<input id="cinPAge" placeholder="Age"/></label>
        </div>
        <div class="cinFieldRow">
          <label>Location<input id="cinPLoc" placeholder="City, Country"/></label>
          <label>Occupation<input id="cinPOcc" placeholder="Occupation"/></label>
        </div>
        <div style="margin-top:10px;text-align:right">
          <button class="btn primary" id="cinProfileStart">Start New Season</button>
        </div>
      </div>
    `;
    dim.appendChild(panel);
    document.body.appendChild(dim);

    // wires
    panel.querySelector('#cinExit').onclick=()=>{ dim.remove(); };
    panel.querySelector('#cinStatsBtn').onclick=()=>{
      const s=panel.querySelector('#cinStats'); s.style.display = (s.style.display==='none'||!s.style.display) ? 'block' : 'none';
    };
    panel.querySelector('#cinCredits').onclick=()=>{
      dim.remove();
      if(typeof g.playOutroVideo === 'function'){
        try { g.playOutroVideo(); } catch(e){ console.warn('[finale] playOutroVideo error', e); }
      } else if(typeof g.startCreditsSequence === 'function'){
        try { g.startCreditsSequence(); } catch(e){ console.warn('[finale] startCreditsSequence error', e); }
      }
    };
    panel.querySelector('#cinNewSeason').onclick=()=>{
      const prof=panel.querySelector('#cinProfile'); prof.style.display='block';
      const s=panel.querySelector('#cinStats'); if(s) s.style.display='block';
    };
    panel.querySelector('#cinProfileStart').onclick=()=>{
      const profile={
        name: (panel.querySelector('#cinPName')?.value||'You').trim(),
        age: (panel.querySelector('#cinPAge')?.value||'').trim(),
        location: (panel.querySelector('#cinPLoc')?.value||'').trim(),
        occupation: (panel.querySelector('#cinPOcc')?.value||'').trim()
      };
      try{ localStorage.setItem('bb_human_profile', JSON.stringify(profile)); }catch{}
      // clear logs
      ['log','logGame','logSocial','logVote','logJury'].forEach(id=>{ const el=document.getElementById(id); if(el) el.innerHTML=''; });
      // prefer existing reset/start controls if present
      const hardResetBtn=document.getElementById('btnFinalReset') || document.getElementById('btnReset');
      if(hardResetBtn){ hardResetBtn.click(); setTimeout(()=>location.reload(), 200); }
      else { location.reload(); }
    };

    return dim;
  }

  function applyPreseedProfile(){
    try{
      const raw=localStorage.getItem('bb_human_profile'); if(!raw) return;
      const p=JSON.parse(raw||'{}'); if(!p || !p.name) return;
      const gme=g.game||{}; const humanId=gme.humanId; if(humanId==null) return;
      const me = g.getP?.(humanId); if(!me) return;
      me.name = p.name || me.name;
      me.age = p.age || me.age;
      me.location = p.location || me.location;
      me.occupation = p.occupation || me.occupation;
      g.updateHud?.();
    }catch{}
  }

  function showFinaleCinematic(winnerId){
    // D) Persist winner ID for outro replay
    g.__lastWinnerId = winnerId;
    
    const dim=ensureOverlay();
    const name = g.safeName?.(winnerId) || (g.getP?.(winnerId)?.name ?? 'Winner');
    dim.querySelector('#cinWinName').textContent = name;
  }

  // expose
  g.showFinaleCinematic = showFinaleCinematic;

  // apply preseed profile (after reload/new season)
  document.addEventListener('DOMContentLoaded',()=>{ applyPreseedProfile(); }, {once:true});

})(window);
