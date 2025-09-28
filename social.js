// MODULE: social.js
// Social intermission: queued single-card decisions, ambient interactions,
// alliance accept updates allies immediately, and robust progression to nominations
// or callback continuation (legacy startSocial('src', cb) support).
// Enhanced: human‑sounding logs, strictly 3 prompts per intermission, throttle ambient logs,
// and pacing guards so reveal cards never overlap social decision cards.

(function(global){
  'use strict';

  const $ = (sel)=>document.querySelector(sel);

  function pick(arr){ return arr[Math.floor((global.rng?.()||Math.random())*arr.length)]; }
  function sample(arr, k){
    const a=[...arr];
    for(let i=a.length-1;i>0;i--){
      const j=Math.floor((global.rng?.()||Math.random())*(i+1));
      [a[i],a[j]]=[a[j],a[i]];
    }
    return a.slice(0, Math.min(k, a.length));
  }
  function ensure(v, def){ return (v===undefined||v===null)?def:v; }

  function ensureSocialState(){
    const g=global.game||{};
    if(!g.__weekPosInteractions) g.__weekPosInteractions = new Map();
    if(!g.__weekNegInteractions) g.__weekNegInteractions = new Map();
    if(!g.__floatersWeek) g.__floatersWeek = new Set();
    if(!g.__decisionQueue) g.__decisionQueue = [];
    if(!g.__decisionActive) g.__decisionActive = false;
    if(typeof g.__socialShown!=='number') g.__socialShown = 0;
    if(typeof g.__socialLogBudget!=='number') g.__socialLogBudget = 0;
    if(!(g.__actionCounts instanceof Map)) g.__actionCounts = new Map();
  }
  function weekKey(actorId,targetId){ return `${actorId}-${targetId}`; }
  function actionKey(actorId,targetId,action){ return `${actorId}|${targetId}|${action}`; }
  function resetWeeklyCounters(){
    const g=global.game; if(!g) return;
    g.__weekPosInteractions = new Map();
    g.__weekNegInteractions = new Map();
    g.__actionCounts = new Map();
  }
  global.socialOnNewWeek = resetWeeklyCounters;

  // Human copy
  const HUMAN_POS = [
    (A,B)=>`${A} and ${B} shared a calm chat about the week.`,
    (A,B)=>`${A} checked in on ${B}. The vibe felt easy.`,
    (A,B)=>`${A} and ${B} mapped out a few scenarios.`,
    (A,B)=>`${A} hyped up ${B} — a genuine compliment.`,
    (A,B)=>`${A} brought ${B} a small gesture of goodwill.`
  ];
  const HUMAN_NEG = [
    (A,B)=>`${A} confronted ${B} — grievances aired.`,
    (A,B)=>`${A} threw a little shade at ${B}.`,
    (A,B)=>`${A} pressed ${B} on broken promises.`,
    (A,B)=>`${A} questioned ${B}’s honesty.`,
    (A,B)=>`${A} and ${B} had a tense exchange.`
  ];

  function logHuman(kind, Aname, Bname, explicitText){
    const line = explicitText
      ? explicitText
      : (kind==='positive' ? pick(HUMAN_POS) : pick(HUMAN_NEG))(Aname, Bname);
    global.addLog?.(line, kind==='positive' ? 'ok' : 'danger');
  }

  function applyInteraction(actorId, targetId, kind){
    ensureSocialState();
    const g=global.game; if(!g) return;
    const A=global.getP?.(actorId), B=global.getP?.(targetId); if(!A||!B||A.id===B.id) return;

    const damp = (A.floater||B.floater) ? 0.7 : 1.0;

    if(kind==='positive'){
      const k=weekKey(actorId,targetId);
      const used=g.__weekPosInteractions.get(k)||0;
      let baseDelta=0;
      if(used<2){
        baseDelta = 0.10 + Math.random()*0.06;
        g.__weekPosInteractions.set(k, used+1);
      }else{
        const good = Math.random()<0.5;
        baseDelta = good ? (0.05+Math.random()*0.04) : -(0.05+Math.random()*0.04);
      }
      const deltaA = baseDelta*damp;
      const deltaB = (baseDelta*0.65)*damp;

      A.affinity[B.id]= (A.affinity?.[B.id]??0) + deltaA;
      B.affinity[A.id]= (B.affinity?.[A.id]??0) + deltaB;

      if(g.__socialLogBudget>0){ logHuman('positive', A.name, B.name); g.__socialLogBudget--; }
      try{
        global.addLog?.(`Δ ${A.name}→${B.name} ${(deltaA>=0?'+':'')}${deltaA.toFixed(2)}; ${B.name}→${A.name} ${(deltaB>=0?'+':'')}${deltaB.toFixed(2)}`,'tiny');
      }catch{}
    }else if(kind==='negative'){
      const k=weekKey(actorId,targetId);
      const used=g.__weekNegInteractions.get(k)||0;
      g.__weekNegInteractions.set(k, used+1);

      let baseDelta;
      if(used>=2){
        // 50/50 swing after more than twice in the same week
        baseDelta = (Math.random()<0.5)
          ? -(0.08 + Math.random()*0.06)
          : (0.04 + Math.random()*0.04);
      }else{
        // original distribution, mostly negative
        const roll=Math.random();
        baseDelta = roll<0.8 ? -(0.10+Math.random()*0.08) : (Math.random()<0.5?0: (0.02+Math.random()*0.02));
      }

      const deltaA = baseDelta*damp;
      const deltaB = (baseDelta*0.35)*damp;

      A.affinity[B.id]= (A.affinity?.[B.id]??0) + deltaA;
      B.affinity[A.id]= (B.affinity?.[A.id]??0) + deltaB;

      if(g.__socialLogBudget>0){ logHuman('negative', A.name, B.name); g.__socialLogBudget--; }
      try{
        global.addLog?.(`Δ ${A.name}→${B.name} ${(deltaA>=0?'+':'')}${deltaA.toFixed(2)}; ${B.name}→${A.name} ${(deltaB>=0?'+':'')}${deltaB.toFixed(2)}`,'tiny');
      }catch{}
    }

    global.updateHud?.();
  }
  global.socialApplyInteraction = applyInteraction;

  // Expanded quick actions
  function applyAction(actorId, targetId, action){
    ensureSocialState();
    const g=global.game; if(!g) return;
    const actor = global.getP?.(actorId), target = global.getP?.(targetId);
    if(!actor || !target || actor.id===target.id) return;

    const ALLY_T = ensure(global.ALLY_T, 0.28);

    // Repetition tracking for Gift backfire
    const aKey = actionKey(actorId, targetId, action);
    const used = g.__actionCounts.get(aKey) || 0;
    g.__actionCounts.set(aKey, used+1);

    if(action==='alliance'){
      const bumpA = 0.14 + Math.random()*0.08;
      const bumpB = 0.12 + Math.random()*0.07;
      actor.affinity[target.id] = (actor.affinity?.[target.id]??0) + bumpA;
      target.affinity[actor.id] = (target.affinity?.[actor.id]??0) + bumpB;
      if(actor.affinity[target.id] < ALLY_T) actor.affinity[target.id] = ALLY_T + 0.02*Math.random();
      if(target.affinity[actor.id] < ALLY_T-0.05) target.affinity[actor.id] = (ALLY_T-0.05) + 0.02*Math.random();
      global.addLog?.(`You and ${target.name} discussed an alliance.`, 'ok');
    } else if(action==='apologize'){
      const base = (actor.affinity?.[target.id]??0) < 0 ? 0.14 : 0.08;
      const bump = base + Math.random()*0.06;
      actor.affinity[target.id] = (actor.affinity?.[target.id]??0) + bump*0.9;
      target.affinity[actor.id] = (target.affinity?.[actor.id]??0) + bump;
      global.addLog?.(`You apologized to ${target.name}.`, 'ok');
    } else if(action==='gift'){
      const backfire = used >= 2 && Math.random()<0.55;
      if(backfire){
        applyInteraction(actorId, targetId, 'negative');
        logHuman('negative', actor.name, target.name, `${actor.name} overdid it — ${target.name} felt the gesture was insincere.`);
      } else {
        applyInteraction(actorId, targetId, 'positive');
        global.addLog?.(`You gave a small gift to ${target.name}.`, 'ok');
      }
    } else if(action==='taunt'){
      applyInteraction(actorId, targetId, 'negative');
      global.addLog?.(`You taunted ${target.name}.`, 'danger');
    } else if(action==='confront'){
      applyInteraction(actorId, targetId, 'negative');
      global.addLog?.(`You confronted ${target.name}.`, 'danger');
    }

    global.updateHud?.();
  }

  function simulateHouseSocial(){
    ensureSocialState();
    const g=global.game; if(!g) return;
    const alive = global.alivePlayers?.()||[];
    if(alive.length<3) return;

    g.__floatersWeek.clear();
    const floaterCount = Math.max(1, Math.round(alive.length*0.20));
    const floaterIds = sample(alive.map(p=>p.id), floaterCount);
    for(const id of floaterIds){ g.__floatersWeek.add(id); }
    g.players.forEach(p=>{ p.floater = g.__floatersWeek.has(p.id); });

    const ALLY_T = ensure(global.ALLY_T, 0.28);
    const ENEMY_T = ensure(global.ENEMY_T, -0.28);

    for(const A of alive){
      if(A.floater && Math.random()<0.7) continue;
      const others = alive.filter(p=>p.id!==A.id && !p.evicted)
        .sort((x,y)=> (A.affinity?.[y.id]??0) - (A.affinity?.[x.id]??0));
      const pickAllies = others.slice(0, 2 + (Math.random()<0.25?1:0));
      for(const B of pickAllies){
        const cur = A.affinity?.[B.id]??0;
        if(cur < ALLY_T){
          const boost = 0.12 + Math.random()*0.08;
          A.affinity[B.id] = cur + boost;
          B.affinity[A.id] = (B.affinity?.[A.id]??0) + boost*0.8;
        }
      }
      const low = others.slice(-2);
      for(const B of low){
        const cur = A.affinity?.[B.id]??0;
        if(cur > ENEMY_T){
          const down = -(0.10 + Math.random()*0.06);
          A.affinity[B.id] = cur + down;
          B.affinity[A.id] = (B.affinity?.[A.id]??0) + down*0.7;
        }
      }
    }

    const ticks = Math.max(3, Math.round(alive.length*1.2));
    for(let i=0;i<ticks;i++){
      const A = pick(alive);
      const pool = alive.filter(p=>p.id!==A.id);
      if(!pool.length) break;
      const B = pick(pool);
      const kind = Math.random()<0.62 ? 'positive' : 'negative';
      applyInteraction(A.id, B.id, kind);
    }
  }

  function ensureDecisionDeck(){
    let deck=document.getElementById('decisionDeck');
    if(deck) return deck;
    const tv=document.getElementById('tv');
    deck=document.createElement('div');
    deck.id = 'decisionDeck';
    tv?.appendChild(deck);
    return deck;
  }
  function clearDecisionDeck(){ const d=document.getElementById('decisionDeck'); if(d) d.remove(); }

  // Hide/show reveal overlay while social decisions are on screen to guarantee zero visual overlap
  function maskRevealOverlay(mask){
    const ov=document.getElementById('tvOverlay'); if(!ov) return;
    ov.__maskedBySocial = mask ? (ov.__maskedBySocial||0)+1 : Math.max(0,(ov.__maskedBySocial||0)-1);
    if(ov.__maskedBySocial>0){ ov.style.visibility='hidden'; }
    else { ov.style.visibility=''; }
  }

  function queueDecision(item){
    ensureSocialState();
    const g=global.game; g.__decisionQueue.push(item);
  }

  async function showNextDecision(){
    ensureSocialState();
    const g=global.game; if(!g) return;
    if(g.__decisionActive) return;
    const next = g.__decisionQueue.shift();
    if(!next){ clearDecisionDeck(); maskRevealOverlay(false); return; }

    // Ensure reveal cards have completely finished before showing any decision
    try{ await global.cardQueueWaitIdle?.(); }catch{}

    g.__decisionActive = true;
    maskRevealOverlay(true);

    const deck=ensureDecisionDeck();
    deck.innerHTML='';

    const card=document.createElement('div');
    card.className='revealCard decisionCard';
    const h=document.createElement('h3'); h.textContent=next.title; card.appendChild(h);
    for(const l of next.lines){ const d=document.createElement('div'); d.textContent=l; card.appendChild(d); }

    const bar=document.createElement('div'); bar.className='decisionActions';
    next.actions.forEach(act=>{
      const b=document.createElement('button'); b.className='btn small'; b.textContent=act.label;
      b.onclick=()=>{
        try{ act.onChoose?.(); }catch(e){ console.error(e); }
        card.remove();
        g.__decisionActive = false;
        // Small pause between prompts to keep pacing humane
        if(g.__decisionQueue.length){
          setTimeout(()=>showNextDecision(), 420);
        } else {
          clearDecisionDeck(); maskRevealOverlay(false);
        }
      };
      bar.appendChild(b);
    });
    card.appendChild(bar);

    deck.appendChild(card);
    card.style.animation='popIn .45s ease forwards';
  }

  function buildSocialDecisions(){
    ensureSocialState();
    const g=global.game; if(!g) return;
    const alive=global.alivePlayers?.()||[];
    const you=global.getP?.(g.humanId);
    if(!you || you.evicted) return;

    // Cap hard at 3 prompts per session (reset each intermission)
    g.__socialShown = 0;

    const others=alive.filter(p=>p.id!==you.id);
    if(!others.length) return;

    const allyTarget = pick(others);
    if(g.__socialShown<3){
      queueDecision({
        title: 'Alliance Offer',
        lines: [
          `${allyTarget.name} wants an alliance with you.`,
          'Do you accept?'
        ],
        actions: [
          { label:'Accept', onChoose:()=>{
            const AL = (global.ALLY_T ?? 0.28);
            const curY = you.affinity?.[allyTarget.id]??0;
            const curT = allyTarget.affinity?.[you.id]??0;
            const bumpY = Math.max(AL+0.07 - curY, 0.18);
            const bumpT = Math.max(AL+0.05 - curT, 0.14);
            you.affinity[allyTarget.id] = curY + bumpY;
            allyTarget.affinity[you.id] = curT + bumpT;
            global.addLog?.(`You and ${allyTarget.name} made a safety pact.`, 'ok');
            global.updateHud?.();
          }},
          { label:'Decline', onChoose:()=>{
            you.affinity[allyTarget.id]=(you.affinity?.[allyTarget.id]??0)-0.06;
            allyTarget.affinity[you.id]=(allyTarget.affinity?.[you.id]??0)-0.10;
            global.addLog?.(`You turned down an alliance with ${allyTarget.name}.`,'muted');
            global.updateHud?.();
          }},
        ]
      });
      g.__socialShown++;
    }

    const instigator = pick(others);
    const possibleTargets = others.filter(p=>p.id!==instigator.id);
    const tgt = possibleTargets.length ? pick(possibleTargets) : null;
    if(g.__socialShown<3){
      queueDecision({
        title: 'Target Talk',
        lines: [
          `${instigator.name} suggests targeting ${tgt?.name||'someone'}.`,
          'Do you agree to target them this week?'
        ],
        actions: [
          { label:'Agree', onChoose:()=>{
            applyInteraction(you.id, instigator.id, 'positive');
            if(tgt){
              you.affinity[tgt.id]=(you.affinity?.[tgt.id]??0)-0.12;
              global.addLog?.(`You quietly agreed to push ${tgt.name}.`,'warn');
              global.updateHud?.();
            }
          }},
          { label:'Refuse', onChoose:()=>{ applyInteraction(you.id, instigator.id, 'negative'); }},
        ]
      });
      g.__socialShown++;
    }

    if(others.length>=3 && Math.random()<0.6 && g.__socialShown<3){
      const press = pick(others);
      queueDecision({
        title: 'Flip Plan',
        lines: [
          `${press.name} asks you to consider flipping a vote later.`,
          'How do you respond?'
        ],
        actions: [
          { label:'Promise', onChoose:()=>{ applyInteraction(you.id, press.id, 'positive'); }},
          { label:'Reject', onChoose:()=>{ applyInteraction(you.id, press.id, 'negative'); }},
        ]
      });
      g.__socialShown++;
    }

    showNextDecision();
  }

  function renderSocialPhase(panel){
    const g=global.game; if(!panel || !g) return;

    panel.innerHTML='';
    const box=document.createElement('div'); box.className='minigame-host';
    box.innerHTML=`<h3>Social Intermission</h3>
      <div class="tiny muted">House interactions, alliances, and rivalries are evolving…</div>`;
    panel.appendChild(box);

    // New: small log budget per intermission to avoid ambient spam
    ensureSocialState();
    g.__socialLogBudget = 6;

    simulateHouseSocial();

    const fWrap=document.createElement('div'); fWrap.className='tiny';
    const floaters=[...g.__floatersWeek].map(id=>global.safeName(id));
    fWrap.textContent = floaters.length ? `Floaters this week: ${floaters.join(', ')}` : 'Floaters this week: none';
    box.appendChild(fWrap);

    const you=global.getP?.(g.humanId);
    if(you && !you.evicted){
      const row=document.createElement('div'); row.className='row'; row.style.marginTop='8px';
      const sel=document.createElement('select');
      const alive=global.alivePlayers?.()||[];
      alive.filter(p=>p.id!==you.id).forEach(p=>{
        const opt=document.createElement('option'); opt.value=p.id; opt.textContent=p.name; sel.appendChild(opt);
      });

      // Action selector (all actions in dropdown)
      const act=document.createElement('select');
      ['alliance','apologize','gift','taunt','confront'].forEach(k=>{
        const o=document.createElement('option'); o.value=k; o.textContent=k[0].toUpperCase()+k.slice(1); act.appendChild(o);
      });

      const bDo=document.createElement('button'); bDo.className='btn small'; bDo.textContent='Do Action';
      bDo.onclick=()=>{ const tid=+sel.value; const a=act.value; applyAction(you.id, tid, a); };

      row.append(sel, act, bDo);
      box.appendChild(row);

      buildSocialDecisions();
    }

    const hint=document.createElement('div'); hint.className='tiny muted'; hint.style.marginTop='6px';
    hint.textContent='Tip: Allies and enemies shift with interactions; nominations naturally follow relations.';
    box.appendChild(hint);
  }
  global.renderSocialPhase = renderSocialPhase;

  function resolveStartNominations(){
    const cands = [
      'startNominations','startNomination','startNoms',
      'startNominationsPhase','startNomsPhase','startNominationsFlow'
    ];
    for(const name of cands){
      const fn = global[name];
      if(typeof fn==='function') return fn.bind(global);
    }
    return function fallbackStartNominations(){
      const g=global.game; if(!g) return;
      global.tv?.say?.('Nominations');
      global.setPhase?.('nominations', g.cfg?.tNoms||25, ()=>{
        if(typeof global.startVeto==='function'){ global.startVeto(); }
        else if(typeof global.startVetoComp==='function'){ global.startVetoComp(); }
      });
      global.renderPanel?.();
    };
  }

  function endSocialPhaseCleanup(){
    const g=global.game; if(!g) return;
    g.__decisionQueue = [];
    g.__decisionActive = false;
    clearDecisionDeck();
    // Unmask overlay
    const ov=document.getElementById('tvOverlay'); if(ov){ ov.__maskedBySocial = 0; ov.style.visibility=''; }
  }

  // Public entry
  global.startSocialIntermission = async function(source, callback){
    const g=global.game; if(!g) return;
    ensureSocialState();
    g.__socialShown = 0;        // reset per intermission (max 3 prompts)
    g.__socialLogBudget = 6;    // reset ambient budget

    global.tv?.say?.('Social Intermission');

    // Ensure prior reveal cards have finished before starting prompts
    try{ await global.cardQueueWaitIdle?.(); }catch{}

    const onDone = ()=>{
      try{ endSocialPhaseCleanup(); }catch(e){ console.error(e); }
      if(typeof callback === 'function'){
        try{ callback(); }catch(e){ console.error(e); }
      } else {
        const startNoms = resolveStartNominations();
        try{ startNoms(); }catch(e){ console.error(e); }
      }
    };
    global.setPhase?.('social_intermission', g.cfg?.tComms||30, onDone);
    const panel=document.getElementById('panel'); if(panel) renderSocialPhase(panel);
  };

  // Back-compat alias used by competitions.js
  global.startSocial = global.startSocialIntermission;
  global.renderSocial = renderSocialPhase;

})(window);