(function(g){
  'use strict';
  const UI = g.UI || (g.UI = {});

  function ensureCfg(){
    g.game = g.game || {};
    g.game.cfg = g.game.cfg || {};
    if(typeof g.game.cfg.fxCards === 'undefined') g.game.cfg.fxCards = true;
    if(typeof g.game.cfg.cardAvatars === 'undefined') g.game.cfg.cardAvatars = true;
    if(typeof g.game.cfg.cardAvatarsAlways === 'undefined') g.game.cfg.cardAvatarsAlways = true;
    return g.game.cfg;
  }

  // === Card Queue Flush Infrastructure ===
  // Global generation token and timeout tracking
  g.__cardGen = g.__cardGen || 1;
  g.__cardTimeouts = g.__cardTimeouts || [];

  // TV helpers
  g.tv = g.tv || {};
  g.tv.say = function(txt){
    const el=document.getElementById('tvNow');
    if(el) el.textContent=txt;
  };

  // Overlay host
  function uiEnsureTvOverlay(){
    let ov=document.getElementById('tvOverlay');
    if(!ov){
      const tv=document.getElementById('tv');
      if(tv){
        ov=document.createElement('div');
        ov.id='tvOverlay';
        tv.appendChild(ov);
      }
    }
    return ov;
  }

  // Dashboard heading guard
  function fixTimerHeading(){
    const dash=document.getElementById('dashboardCard'); if(!dash) return;
    const th=dash.querySelector('#timerHeading');
    if(th && th.getAttribute('data-fixed')==='timer'){
      if(/^Week\s+\d+/i.test(th.textContent.trim())) th.textContent='Timer';
    }
    dash.querySelectorAll('h2').forEach(h=>{
      if(h.id!=='timerHeading' && /^Week\s+\d+/i.test(h.textContent.trim())){
        h.classList.add('week-duplicate-heading');
      }
    });
  }
  const dashObserver=new MutationObserver(fixTimerHeading);
  function observeDashboard(){
    const dash=document.getElementById('dashboardCard');
    if(dash && !dash.__weekGuard){
      dashObserver.observe(dash,{childList:true,subtree:true,characterData:true});
      dash.__weekGuard=true;
      fixTimerHeading();
    }
  }

  // Minimal log-tabs
  function ensureLogTabs(){
    const allPane=document.getElementById('log'); if(!allPane) return null;
    const parent=allPane.parentElement||document.body;
    let bar=document.getElementById('logTabs')||parent.querySelector('#logTabs')||document.querySelector('.log-tabs');
    if(!bar){
      bar=document.createElement('div'); bar.id='logTabs'; bar.className='log-tabs'; bar.style.margin='8px 0';
      bar.innerHTML=[
        '<button class="tab-btn active" data-tab="all">All</button>',
        '<button class="tab-btn" data-tab="game">Game</button>',
        '<button class="tab-btn" data-tab="social">Social</button>',
        '<button class="tab-btn" data-tab="vote">Vote</button>',
        '<button class="tab-btn" data-tab="jury">Jury</button>'
      ].join('');
      parent.insertBefore(bar,allPane);
    }
    function ensurePane(id){
      let el=document.getElementById(id);
      if(!el){
        el=document.createElement('div');
        el.id=id; el.style.display='none';
        parent.insertBefore(el,allPane.nextSibling);
      }
      return el;
    }
    ensurePane('logGame'); ensurePane('logSocial'); ensurePane('logVote'); ensurePane('logJury');
    return bar;
  }
  function writeToPane(pane,msg,cls){
    if(!pane) return; const d=document.createElement('div');
    if(cls) d.className=cls; d.innerHTML=msg; pane.prepend(d);
  }
  function getLogPaneByKey(k){
    const map={all:'log',game:'logGame',social:'logSocial',vote:'logVote',jury:'logJury'};
    return document.getElementById(map[k]||'log');
  }
  function routeForPhase(phase){
    if(!phase) return 'game';
    if(phase.startsWith('social')) return 'social';
    if(phase==='livevote'||phase==='tiebreak') return 'vote';
    if(phase.startsWith('jury')||phase==='jury'||phase==='finale') return 'jury';
    return 'game';
  }
  function selectLogTab(key){
    ensureLogTabs();
    const bar=document.getElementById('logTabs')||document.querySelector('.log-tabs');
    const panes=['all','game','social','vote','jury'];
    if(bar){
      bar.querySelectorAll('.tab-btn').forEach(btn=>{
        const k=btn.getAttribute('data-tab')||btn.getAttribute('data-logtab');
        btn.classList.toggle('active',k===key);
      });
    }
    panes.forEach(k=>{
      const el=getLogPaneByKey(k); if(!el) return;
      const on=(k===key);
      el.style.display=on?'':'none'; el.classList.toggle?.('active',on);
    });
  }
  function selectLogTabForPhase(phase){ selectLogTab(routeForPhase(phase)); }

  // CardQueue with avatar logic
  const CardQueue = (function(){
    const q=[]; let busy=false; let turboUntil=0;

    function now(){ return Date.now(); }
    function inTurbo(){ return now()<turboUntil; }
    function pacing(){
      const cfg=ensureCfg();
      return {
        hold: cfg.cardHoldMs||3000,
        gap: cfg.cardGapMs||2000,
        turboHold: cfg.skipTurboHoldMs||450,
        turboGap: cfg.skipTurboGapMs||100
      };
    }

    // Helpers
    function safePlayers(){ return Array.isArray(g.game?.players)? g.game.players : []; }
    function getP(id){ try{ return g.getP?.(id)||null; }catch{ return null; } }
    function byName(name){
      const n=(name||'').trim().toLowerCase();
      return safePlayers().find(p=> (p?.name||'').toLowerCase()===n) || null;
    }
    function nameFromTextStart(s){
      const m = /^([A-Za-z][\w .'\-]{1,28})\s*:/.exec(s||''); // "Name: ..."
      return m ? m[1] : null;
    }
    function firstNameInWinsText(text){
      const m = /([A-Za-z][\w .'\-]{1,28})\s+win[s]?/i.exec(text||'');
      return m ? m[1] : null;
    }
    function extractNamesFromText(text){
      const names=[]; const set=new Set();
      const list=safePlayers();
      const hay=(text||'');
      for(const p of list){
        if(!p?.name) continue;
        const re=new RegExp(`\\b${p.name.replace(/[.*+?^${}()|[\\]\\\\]/g,'\\$&')}\\b`,'i');
        if(re.test(hay) && !set.has(p.name)){ set.add(p.name); names.push(p.name); }
      }
      return names;
    }

    function attachFaceRow(card, ids, opts={}){
      if(!ids || !ids.length) return;
      const row=document.createElement('div'); row.className='rc-face-row';
      const size = ids.length>=4 ? 'xs' : ids.length>=3 ? 'small' : '';
      const toImg = (id)=>{
        const p=getP(id);
        const img=document.createElement('img');
        img.className='rc-face'+(size?(' '+size):'');
        img.alt=p?.name||'Player';
        img.src=p?.avatar||p?.img||p?.photo||`https://api.dicebear.com/6.x/bottts/svg?seed=${encodeURIComponent(p?.name||String(id))}`;
        return img;
      };
      if(opts.arrow && ids.length===2){
        row.appendChild(toImg(ids[0]));
        const arrow=document.createElement('div'); arrow.className='rc-arrow'; arrow.textContent='→';
        row.appendChild(arrow);
        row.appendChild(toImg(ids[1]));
      } else {
        ids.forEach(id=> row.appendChild(toImg(id)));
      }
      card.appendChild(row);
    }

    // Decide if a card should show faces; no avatars for generic announcements
    function deduceAvatarSpec(title, lines){
      const spec = { ids:[], arrow:false };
      const t=(title||'').toLowerCase();
      const text=(Array.isArray(lines)?lines:[]).join('\n');
      const game=g.game||{};
      const n = Array.isArray(game.nominees) ? game.nominees.slice() : [];
      const dbl = game.__twistMode==='double';
      const tpl = game.__twistMode==='triple';

      // Heuristics for general announcements: no avatars
      const generic = (
        /intermission|coming up|next|starting soon|competition (next|up)|house network live|stand by/i.test(t+' '+text)
      );
      if(generic) return spec; // no faces

      // DR / Jury ballots ("Name: I vote for X to win/evict")
      const firstLine = (Array.isArray(lines) && lines[0]) ? String(lines[0]) : '';
      const speakerName = nameFromTextStart(firstLine);
      const voteTargetMatch = /(?:vote(?:s)?\s+(?:to\s+evict|for|to\s+win)\s+)([A-Za-z][\w .'\-]{1,28})/i.exec(text);
      if(/diary\s*room/i.test(t) || /jury/.test(t) || (speakerName && voteTargetMatch)){
        const voter = speakerName ? byName(speakerName) : null;
        const target = voteTargetMatch ? byName(voteTargetMatch[1]) : null;
        if(voter && target){ spec.ids=[voter.id,target.id]; spec.arrow=true; return spec; }
      }

      // Nominations (explicit)
      if(/nomination|nominees|on\s+the\s+block/i.test(t)){
        spec.ids = tpl ? n.slice(0,4) : dbl ? n.slice(0,3) : n.slice(0,2);
        return spec;
      }

      // Eviction result
      if(/eviction\s*result|evicted/i.test(t)){
        const found = extractNamesFromText(text).map(nm=>byName(nm)?.id).filter(Boolean);
        spec.ids = tpl ? found.slice(0,3) : dbl ? found.slice(0,2) : found.slice(0,1);
        if(spec.ids.length) return spec;
        if(!dbl && !tpl && game.eviction?.evicted){ spec.ids=[game.eviction.evicted]; return spec; }
      }

      // HOH / Veto winners (1 face)
      if(/hoh/.test(t) && /win/i.test(text+t)){
        if(game.hohId){ spec.ids=[game.hohId]; return spec; }
        const nm=firstNameInWinsText(text); const p=nm && byName(nm); if(p){ spec.ids=[p.id]; return spec; }
      }
      if(/veto/.test(t) && /win/i.test(text+t)){
        if(game.vetoHolder){ spec.ids=[game.vetoHolder]; return spec; }
        const nm=firstNameInWinsText(text); const p=nm && byName(nm); if(p){ spec.ids=[p.id]; return spec; }
      }

      // Social: "X had a fight with Y"
      const social = /([A-Za-z][\w .'\-]{1,28})\s+(?:had\s+a\s+fight|fought|argues?|clashes?)\s+with\s+([A-Za-z][\w .'\-]{1,28})/i.exec(text);
      if(social){
        const a=byName(social[1]), b=byName(social[2]);
        if(a&&b){ spec.ids=[a.id,b.id]; spec.arrow=true; return spec; }
      }

      // Otherwise: no avatars
      return spec;
    }

    function renderCard({title,lines,tone,dur,uniform},hold){
      const cfg=ensureCfg(); if(!cfg.fxCards) return;
      const host=uiEnsureTvOverlay(); if(!host) return;
      host.style.visibility='';
      const card=document.createElement('div');
      card.className='revealCard'+((tone==='big'||tone==='announce')?' bigAnnounce':'');
      card.setAttribute('data-bb-card', 'true'); // Mark for flush system
      const h=document.createElement('h3'); h.textContent=title; card.appendChild(h);
      (lines||[]).forEach((txt,i)=>{
        const d=document.createElement('div'); if(!uniform && i===0) d.className='big';
        d.textContent=txt; card.appendChild(d);
      });

      // Faces when appropriate
      const spec = deduceAvatarSpec(title, lines);
      if(spec.ids && spec.ids.length){
        attachFaceRow(card, spec.ids, {arrow:spec.arrow});
      }

      host.innerHTML=''; host.appendChild(card);

      // TV grow while visible
      document.getElementById('tv')?.classList.add('tvTall');

      const delayOut=Math.max(0,(hold/1000)-0.65);
      card.style.animation=(tone==='big'||tone==='announce')
        ? 'twistIntro .8s cubic-bezier(.23,.9,.25,1), holdOut .6s ease-in '+delayOut+'s forwards'
        : 'cardFloatIn .65s cubic-bezier(.25,.9,.25,1) forwards, holdOut .6s ease-in '+delayOut+'s forwards';
    }

    function next(){
      if(!q.length){
        document.getElementById('tv')?.classList.remove('tvTall');
        return void(busy=false);
      }
      busy=true;
      const job=q.shift();
      try{
        const p=pacing();
        const baseHold=Math.max(+job.dur||0,p.hold);
        const hold=inTurbo()?Math.min(baseHold,p.turboHold):baseHold;
        renderCard(job,hold);
        const gap=inTurbo()?p.turboGap:p.gap;
        setTimeout(()=>{
          try{
            const host=uiEnsureTvOverlay();
            if(host && host.firstChild && host.firstChild.classList.contains('revealCard')) host.removeChild(host.firstChild);
            if(!q.length) document.getElementById('tv')?.classList.remove('tvTall');
          }catch{}
          setTimeout(()=>{ busy=false; next(); },gap);
        },hold);
      }catch(e){
        console.error('[CardQueue] render fail',e);
        busy=false; setTimeout(next,120);
      }
    }

    function push(job){ q.push(job); if(!busy) next(); }
    function waitIdle(){ return new Promise(res=>{ const t=()=>{ if(!busy && !q.length) res(); else setTimeout(t,60); }; t(); }); }
    function setTurboMs(ms){ turboUntil=Date.now()+Math.max(200,+ms||0); }

    return {push,waitIdle,setTurboMs};
  })();

  // Public APIs
  function showCard(title,lines=[],tone='neutral',dur=4200,uniform=false){
    if(!ensureCfg().fxCards) return;
    CardQueue.push({title,lines,tone,dur,uniform});
  }
  function showBigCard(title,lines=[],dur=2600){
    return new Promise(resolve=>{
      if(!ensureCfg().fxCards){ resolve(); return; }
      CardQueue.push({title,lines,tone:'big',dur});
      setTimeout(()=>resolve(),dur);
    });
  }
  function activateSkipCascade(ms){
    CardQueue.setTurboMs(ms ?? (ensureCfg().skipTurboWindowMs||4500));
  }

  // Logs
  function addLog(msg,cls=''){
    ensureLogTabs();
    writeToPane(document.getElementById('log'),msg,cls);
    const key=routeForPhase(g.game?.phase);
    const pane=getLogPaneByKey(key);
    if(pane && pane.id!=='log') writeToPane(pane,msg,cls);
  }
  function addJuryLog(msg,cls=''){
    ensureLogTabs();
    writeToPane(getLogPaneByKey('jury'),msg,cls);
  }

  // === Card Flush System ===
  function flushAllCards(reason){
    // Increment generation token
    g.__cardGen = (g.__cardGen || 0) + 1;
    
    // Clear all tracked timeouts
    if(Array.isArray(g.__cardTimeouts)){
      g.__cardTimeouts.forEach(id => {
        try { clearTimeout(id); } catch(e){}
      });
      g.__cardTimeouts.length = 0;
    }
    
    // Remove any active card DOM nodes
    try {
      // Remove cards with bb-card-host class or data-bb-card attribute
      const cards = document.querySelectorAll('.bb-card-host, [data-bb-card], .revealCard');
      cards.forEach(card => {
        try { card.remove(); } catch(e){}
      });
      
      // Clear tvOverlay if present
      const host = uiEnsureTvOverlay();
      if(host) host.innerHTML = '';
      
      // Remove tvTall class
      document.getElementById('tv')?.classList.remove('tvTall');
    } catch(e){
      console.error('[cards] flush DOM cleanup error:', e);
    }
    
    console.info(`[cards] flushed (reason=${reason||'unspecified'})`);
  }
  
  // Safe wrapper for showCard with generation token tracking
  function safeShowCard(title, lines=[], tone='neutral', dur=4200, uniform=false){
    // Capture current generation token
    const myGen = g.__cardGen || 1;
    
    // Check if original showCard is available
    if(typeof showCard === 'function'){
      try {
        // Call showCard (it will queue the card)
        showCard(title, lines, tone, dur, uniform);
        
        // Register any follow-up timeout (card display timeout)
        const timeoutId = setTimeout(() => {
          // Before executing, check if generation still matches
          if((g.__cardGen || 1) === myGen){
            // Card display completed normally
          } else {
            // Aborted due to flush
            console.info('[cards] card aborted due to flush:', title);
          }
          
          // Remove from tracking
          const idx = (g.__cardTimeouts || []).indexOf(timeoutId);
          if(idx >= 0) g.__cardTimeouts.splice(idx, 1);
        }, dur || 4200);
        
        // Track timeout with generation token
        if(!Array.isArray(g.__cardTimeouts)) g.__cardTimeouts = [];
        g.__cardTimeouts.push(timeoutId);
        
        return timeoutId;
      } catch(e){
        console.warn('[cards] safeShowCard error:', e);
      }
    } else {
      // Fallback: update tvNow text
      try {
        const tvNow = document.getElementById('tvNow');
        if(tvNow){
          const msg = [title || 'Update'].concat(Array.isArray(lines) ? lines : []).join(' — ');
          tvNow.textContent = msg;
        }
      } catch(e){}
    }
    return undefined;
  }

  // Exports
  UI.showCard=showCard; UI.showBigCard=showBigCard;
  UI.cardQueueWaitIdle=CardQueue.waitIdle; UI.activateSkipCascade=activateSkipCascade;
  UI.addLog=addLog; UI.addJuryLog=addJuryLog; UI.selectLogTabForPhase=selectLogTabForPhase;
  UI.flushAllCards=flushAllCards; UI.safeShowCard=safeShowCard;
  g.showCard=showCard; g.showBigCard=showBigCard; g.cardQueueWaitIdle=CardQueue.waitIdle; g.activateSkipCascade=activateSkipCascade;
  g.flushAllCards=flushAllCards; g.safeShowCard=safeShowCard;
  g.addLog=addLog; g.addJuryLog=addJuryLog; g.selectLogTabForPhase=selectLogTabForPhase;

  document.addEventListener('DOMContentLoaded',()=>{
    observeDashboard();
    ensureLogTabs();
    fixTimerHeading();
  },{once:true});
})(window);