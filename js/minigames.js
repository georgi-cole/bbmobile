// MODULE: minigames.js
// LEGACY MINIGAMES - DEPRECATED IN PHASE 1 REFACTOR
// 
// All 15 minigames have been migrated to individual module files in js/minigames/*.js
// This file is kept for backwards compatibility only.
// 
// The individual game functions below are NO LONGER CALLED directly.
// All routing now happens through:
//   1. js/minigames/registry.js - Game metadata and filtering
//   2. js/minigames/selector.js - Non-repeating pool selection
//   3. js/minigames/index.js - Legacy key mapping bridge
// 
// The renderMinigame() function at the bottom is now a stub that delegates
// to the new system via minigames/index.js bridge.
//
// DO NOT ADD NEW GAMES HERE - Create new modules in js/minigames/ instead.

(function(global){
  const $=global.$;
  function btn(label,cls='btn small'){ const b=document.createElement('button'); b.className=cls; b.textContent=label; return b; }

  // 1) Clicker (5s)
  function mgClicker(host,onSubmit){
    host.innerHTML=`<div class="tiny muted">Click as many times as you can in 5s.</div>`;
    const start=btn('Start'), click=btn('Click'), submit=btn('Submit');
    click.disabled=true; submit.disabled=true;
    const out=document.createElement('div'); out.className='tiny'; out.textContent='Score: 0';
    host.append(start, click, submit, out);
    let clicks=0, end=0, iv=null;
    start.onclick=()=>{ clicks=0; end=Date.now()+5000; click.disabled=false; submit.disabled=true; out.textContent='Score: 0';
      clearInterval(iv); iv=setInterval(()=>{ if(Date.now()>=end){ clearInterval(iv); click.disabled=true; submit.disabled=false; out.textContent=`Score: ${clicks}`; }},60);
    };
    click.onclick=()=>{ if(Date.now()<end) {clicks++; if(clicks%5===0) out.textContent=`Score: ${clicks}`;} };
    submit.onclick=()=>{ start.disabled=true; submit.disabled=true; onSubmit(clicks + global.rng()*0.5); };
  }

  // 2) Memory Colors
  function mgMemoryColors(host,onSubmit){
    const colors=['#ff6b6b','#6fd3ff','#74e48b','#f7b955','#b074ff','#ff9cf1','#9bdc82'];
    const len=4+Math.floor(global.rng()*3);
    const seq=[...Array(len)].map(()=>colors[Math.floor(global.rng()*colors.length)]);
    let idx=0, input=0, accept=false, scoreBase=0;
    host.innerHTML=`<div class="tiny muted">Watch the sequence, then repeat.</div>`;
    const seqDiv=document.createElement('div'); seqDiv.style.cssText='display:flex;gap:6px;margin:6px 0;';
    const btns=document.createElement('div'); btns.style.cssText='display:flex;gap:6px;margin:6px 0;';
    const status=document.createElement('div'); status.className='tiny'; status.textContent='Press Start.';
    const start=btn('Start'), submit=btn('Submit'); submit.disabled=true;
    host.append(seqDiv,btns,status,start,submit);
    seq.forEach(c=>{ const d=document.createElement('div'); d.style.cssText=`width:34px;height:34px;border-radius:8px;background:${c};opacity:.25;`; seqDiv.appendChild(d); });
    colors.forEach(c=>{ const b=btn(''); b.style.cssText=`width:34px;height:34px;border-radius:8px;background:${c};border:2px solid #111a22;`; b.onclick=()=>pick(c); btns.appendChild(b); });
    start.onclick=showSeq; submit.onclick=()=>{ submit.disabled=true; onSubmit((scoreBase*4)+(input/seq.length)*10 + global.rng()*2); };
    function showSeq(){ start.disabled=true; status.textContent='Showing...'; idx=0; accept=false; input=0; scoreBase=0; const nodes=[...seqDiv.children];
      (function step(){ nodes.forEach(n=>n.style.opacity=.25); if(idx===seq.length){ accept=true; status.textContent='Repeat it now.'; return; }
        nodes[idx].style.opacity=1; idx++; setTimeout(step,650); })();
    }
    function pick(c){ if(!accept) return; if(c===seq[input]){ scoreBase++; input++; if(input===seq.length){ accept=false; status.textContent='Complete!'; submit.disabled=false; } }
      else { accept=false; status.textContent='Mistake! Submit.'; submit.disabled=false; } }
  }

  // 3) Math Drill
  function mgMath(host,onSubmit){
    const count=6;
    const probs=[...Array(count)].map(()=>{
      const a=Math.floor(global.rng()*12)+1,b=Math.floor(global.rng()*12)+1;
      const ops=['+','-','×']; const op=ops[Math.floor(global.rng()*ops.length)];
      let ans; if(op==='+') ans=a+b; else if(op==='-') ans=a-b; else ans=a*b;
      return {q:`${a} ${op} ${b}`,ans};
    });
    const start=Date.now();
    const grid=document.createElement('div'); grid.style.cssText='display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:6px;margin:6px 0;';
    host.innerHTML=`<div class="tiny muted">Answer quickly.</div>`;
    host.appendChild(grid);
    probs.forEach((p,i)=>{ const w=document.createElement('div'); w.style.cssText='background:#1d2734;padding:6px 8px;border:1px solid #2c3a4d;border-radius:8px;';
      w.innerHTML=`<div class="tiny">${p.q}=</div><input data-idx="${i}" style="width:60px;margin-top:4px;font-size:.6rem;" class="tiny"/>`; grid.appendChild(w); });
    const info=document.createElement('div'); info.className='tiny'; const submit=btn('Submit'); host.append(info,submit);
    submit.onclick=()=>{ let correct=0; probs.forEach((p,i)=>{ const val=grid.querySelector(`input[data-idx="${i}"]`).value.trim(); if(String(p.ans)===val) correct++; });
      const elapsed=(Date.now()-start)/1000; info.textContent=`Correct ${correct}/${count} in ${elapsed.toFixed(1)}s`; submit.disabled=true;
      onSubmit(correct*12 + Math.max(0,(30-elapsed)) + global.rng()*2); };
  }

  // 4) Timing Bar
  function mgTimingBar(host,onSubmit){
    host.innerHTML=`<div class="tiny muted">Stop the bar near center (3 tries).</div>`;
    const wrap=document.createElement('div'); wrap.style.cssText='height:20px;background:#1d2734;border:1px solid #2c3a4d;border-radius:10px;overflow:hidden;position:relative;margin:6px 0;';
    const bar=document.createElement('div'); bar.style.cssText='position:absolute;top:0;left:0;height:100%;width:12%;background:linear-gradient(90deg,#6fd3ff,#167bb4);box-shadow:0 0 8px -2px #6fd3ff;';
    const mid=document.createElement('div'); mid.style.cssText='position:absolute;left:50%;top:0;transform:translateX(-50%);width:2px;height:100%;background:#fff6;';
    wrap.append(bar,mid); host.appendChild(wrap);
    const start=btn('Start'), stop=btn('Stop'), submit=btn('Submit'); stop.disabled=true; submit.disabled=true;
    const out=document.createElement('div'); out.className='tiny'; out.textContent='Attempts: 0/3'; host.append(start,stop,submit,out);
    let running=false,dir=1,pos=0,raf=null,attempts=0,best=0;
    function frame(){ if(!running) return; pos+=dir*0.0135; if(pos>=0.93){pos=0.93;dir=-1;} if(pos<=0){pos=0;dir=1;} bar.style.left=(pos*100)+'%'; raf=requestAnimationFrame(frame); }
    start.onclick=()=>{ if(attempts>=3) return; start.disabled=true; stop.disabled=false; running=true; dir=1; pos=0; cancelAnimationFrame(raf); frame(); };
    stop.onclick=()=>{ running=false; cancelAnimationFrame(raf); start.disabled=false; stop.disabled=true; attempts++; const dist=Math.abs(pos+0.06-0.5);
      const s=Math.max(0,1-dist*2.1); if(s>best) best=s; out.textContent=`Attempts: ${attempts}/3 | Best ${(best*100).toFixed(1)}%`;
      if(attempts>=3){ start.disabled=true; submit.disabled=false; } };
    submit.onclick=()=>{ submit.disabled=true; onSubmit(best*100 + global.rng()*4); };
  }

  // 5) Typing
  function mgTyping(host,onSubmit){
    const words=['house','alliance','veto','nominee','strategy','social','jury','twist','vote','drama','compete','target','backdoor','double','triple'];
    const text=[...Array(8)].map(()=>words[Math.floor(global.rng()*words.length)]).join(' ');
    host.innerHTML=`<div class="tiny muted">Type the passage in 15s. Accuracy matters.</div>`;
    const p=document.createElement('div'); p.className='tiny'; p.textContent=text; const i=document.createElement('textarea'); i.rows=3; i.style.width='100%';
    const start=btn('Start'), submit=btn('Submit'); submit.disabled=true; const info=document.createElement('div'); info.className='tiny';
    host.append(p,i,start,submit,info);
    let end=0,iv=null;
    start.onclick=()=>{ end=Date.now()+15000; submit.disabled=false; start.disabled=true; i.focus();
      iv=setInterval(()=>{ const rem=end-Date.now(); info.textContent=`Time: ${Math.max(0,Math.ceil(rem/1000))}s`; if(rem<=0){ clearInterval(iv); submit.click(); } },200); };
    submit.onclick=()=>{ clearInterval(iv); submit.disabled=true; const typed=i.value.trim();
      const corr=typed.split(/\s+/).filter((w,idx)=>w===text.split(/\s+/)[idx]).length;
      onSubmit(corr*10 + Math.max(0, (typed.length>0?20- Math.abs(typed.length-text.length)/4:0))); };
  }

  // 6) Reaction
  function mgReaction(host,onSubmit){
    host.innerHTML=`<div class="tiny muted">Click when the circle turns green. Three rounds.</div>`;
    const circle=document.createElement('div'); circle.style.cssText='width:60px;height:60px;border-radius:50%;background:#b44;display:inline-block;margin:6px 0;';
    const start=btn('Start'), info=document.createElement('div'); info.className='tiny';
    host.append(circle,start,info);
    let scores=[], waitHandle=null, startTime=0, active=false;
    function round(){ active=false; circle.style.background='#b44'; const delay=700+Math.random()*1800;
      waitHandle=setTimeout(()=>{ circle.style.background='#4b4'; startTime=performance.now(); active=true; },delay); }
    circle.onclick=()=>{ if(!active) return; active=false; const rt=performance.now()-startTime; scores.push(rt); info.textContent=`RT: ${rt|0}ms`; if(scores.length<3) round(); else finish(); };
    start.onclick=()=>{ scores=[]; info.textContent=''; round(); };
    function finish(){ const best=Math.min(...scores); onSubmit(1000/Math.max(120,best) * 100); }
  }

  // 7) Number Sequence
  function mgNumberSeq(host,onSubmit){
    const len=6+Math.floor(global.rng()*3);
    const seq=[...Array(len)].map(()=>Math.floor(global.rng()*10)).join('');
    host.innerHTML=`<div class="tiny muted">Memorize the sequence.</div>`;
    const disp=document.createElement('div'); disp.className='tiny'; disp.style.fontSize='1rem'; disp.textContent=seq;
    const input=document.createElement('input'); input.placeholder='Enter sequence'; const start=btn('Hide'); const submit=btn('Submit'); submit.disabled=true;
    host.append(disp,start,input,submit);
    start.onclick=()=>{ disp.textContent='(hidden)'; submit.disabled=false; start.disabled=true; };
    submit.onclick=()=>{ const val=input.value.trim(); let sc=0;
      for(let i=0;i<Math.min(val.length,seq.length);i++) if(val[i]===seq[i]) sc+=3;
      if(val===seq) sc+=20; onSubmit(sc); };
  }

  // 8) Pattern Match
  function mgPatternMatch(host,onSubmit){
    const shapes=['▲','■','●','◆','★','✚'];
    const len=5; const seq=[...Array(len)].map(()=>shapes[Math.floor(global.rng()*shapes.length)]);
    const show=document.createElement('div'); show.style.fontSize='1.4rem'; show.textContent=seq.join(' ');
    const options=document.createElement('div'); options.style.cssText='display:flex;gap:6px;margin:6px 0;flex-wrap:wrap;';
    const inputs=seq.map(()=>{ const s=document.createElement('select'); shapes.forEach(sh=>{ const o=document.createElement('option'); o.textContent=sh; s.appendChild(o); }); return s;});
    inputs.forEach(s=>options.appendChild(s));
    const hide=btn('Hide'), submit=btn('Submit'); submit.disabled=true;
    host.innerHTML=`<div class="tiny muted">Match the pattern.</div>`; host.append(show,hide,options,submit);
    hide.onclick=()=>{ show.textContent='(hidden)'; submit.disabled=false; hide.disabled=true; };
    submit.onclick=()=>{ let sc=0; inputs.forEach((s,i)=>{ if(s.value===seq[i]) sc+=6; }); onSubmit(sc); };
  }

  // 9) Slider Precision
  function mgSlider(host,onSubmit){
    const target=(10+Math.floor(global.rng()*80));
    host.innerHTML=`<div class="tiny muted">Set slider to ${target}.</div>`;
    const slider=document.createElement('input'); slider.type='range'; slider.min='0'; slider.max='100'; slider.value='50'; slider.style.width='100%';
    const submit=btn('Submit'); const out=document.createElement('div'); out.className='tiny';
    host.append(slider,submit,out);
    slider.oninput=()=>{ out.textContent=slider.value; };
    submit.onclick=()=>{ const diff=Math.abs(target-+slider.value); onSubmit(Math.max(0, 100-diff*5)); };
  }

  // 10) Anagram
  function mgAnagram(host,onSubmit){
    const words=['alliance','strategy','competition','nominee','eviction','jury','twist','backdoor','target'];
    const word=words[Math.floor(global.rng()*words.length)];
    const scramble=[...word].sort(()=>Math.random()-0.5).join('');
    host.innerHTML=`<div class="tiny muted">Unscramble the word.</div>`;
    const src=document.createElement('div'); src.className='tiny'; src.textContent=scramble;
    const inp=document.createElement('input'); const submit=btn('Submit');
    host.append(src,inp,submit);
    submit.onclick=()=>{ const val=inp.value.trim().toLowerCase();
      let sc=0; if(val===word) sc=100; else { for(let i=0;i<Math.min(val.length,word.length);i++) if(val[i]===word[i]) sc+=5; }
      onSubmit(sc); };
  }

  // 11) Pathfinder
  function mgPathfinder(host,onSubmit){
    const dirs=['↑','→','↓','←']; const len=6;
    const seq=[...Array(len)].map(()=>dirs[Math.floor(Math.random()*4)]);
    const disp=document.createElement('div'); disp.style.fontSize='1.4rem'; disp.textContent=seq.join(' ');
    const hide=btn('Hide'); const wrap=document.createElement('div'); wrap.style.cssText='display:flex;gap:6px;margin:6px 0;';
    const picks=[]; dirs.forEach(d=>{ const b=btn(d); b.onclick=()=>{ picks.push(d); }; wrap.appendChild(b); });
    const submit=btn('Submit'); submit.disabled=true;
    host.innerHTML=`<div class="tiny muted">Memorize path, then input.</div>`;
    host.append(disp,hide,wrap,submit);
    hide.onclick=()=>{ disp.textContent='(hidden)'; submit.disabled=false; hide.disabled=true; };
    submit.onclick=()=>{ let sc=0; for(let i=0;i<len;i++) if(picks[i]===seq[i]) sc+=8; onSubmit(sc); };
  }

  // 12) Target Practice
  function mgTargetPractice(host,onSubmit){
    const area=document.createElement('div'); area.style.cssText='position:relative;height:140px;background:#112;overflow:hidden;border-radius:8px;';
    const tgt=document.createElement('div'); tgt.style.cssText='position:absolute;width:24px;height:24px;border-radius:50%;background:#6fd3ff;box-shadow:0 0 12px #6fd3ff;';
    area.appendChild(tgt); host.innerHTML=`<div class="tiny muted">Click targets (10s).</div>`; host.appendChild(area);
    const start=btn('Start'); const out=document.createElement('div'); out.className='tiny'; host.append(start,out);
    let score=0, end=0, iv=null;
    function move(){ tgt.style.left=(Math.random()* (area.clientWidth-24))+'px'; tgt.style.top=(Math.random()* (area.clientHeight-24))+'px'; }
    tgt.onclick=()=>{ if(Date.now()<end){ score+=10; out.textContent=`Score: ${score}`; move(); } };
    start.onclick=()=>{ score=0; out.textContent='Score: 0'; end=Date.now()+10000; move();
      clearInterval(iv); iv=setInterval(()=>{ if(Date.now()>=end){ clearInterval(iv); onSubmit(score); } else move(); },700); };
  }

  // 13) Find Pair
  function mgFindPair(host,onSubmit){
    const items=['A','A','B','B','C','C']; items.sort(()=>Math.random()-0.5);
    const grid=document.createElement('div'); grid.style.cssText='display:grid;grid-template-columns:repeat(6,1fr);gap:6px;';
    const cards=items.map(ch=>{
      const c=document.createElement('button'); c.className='btn small'; c.textContent='?'; c.dataset.ch=ch; c.disabled=false; return c;
    });
    host.innerHTML=`<div class="tiny muted">Find pairs quickly.</div>`; host.appendChild(grid);
    cards.forEach(c=>grid.appendChild(c));
    let open=[], matched=0, start=Date.now();
    cards.forEach(c=>c.onclick=()=>{ if(open.length<2 && c.textContent==='?'){ c.textContent=c.dataset.ch; open.push(c);
      if(open.length===2){ if(open[0].dataset.ch===open[1].dataset.ch){ matched++; open.forEach(x=>x.disabled=true); open=[]; if(matched===3){ const time=(Date.now()-start)/1000; onSubmit(100 - time*10); } }
        else setTimeout(()=>{ open.forEach(x=>x.textContent='?'); open=[]; },500); } } });
  }

  // 14) Simon
  function mgSimon(host,onSubmit){
    const dirs=['ArrowUp','ArrowRight','ArrowDown','ArrowLeft'];
    const map={ArrowUp:'↑',ArrowRight:'→',ArrowDown:'↓',ArrowLeft:'←'};
    const len=6; const seq=[...Array(len)].map(()=>dirs[Math.floor(Math.random()*4)]);
    const disp=document.createElement('div'); disp.style.fontSize='1.4rem'; disp.textContent=seq.map(d=>map[d]).join(' ');
    const hide=btn('Hide'); const info=document.createElement('div'); info.className='tiny';
    host.innerHTML=`<div class="tiny muted">Press the sequence.</div>`; host.append(disp,hide,info);
    let idx=0, active=false; function key(e){ if(!active) return; if(e.key===seq[idx]){ idx++; if(idx===seq.length){ active=false; window.removeEventListener('keydown',key); onSubmit(100); } }
      else { active=false; window.removeEventListener('keydown',key); onSubmit(idx*12); } }
    hide.onclick=()=>{ disp.textContent='(hidden)'; hide.disabled=true; active=true; window.addEventListener('keydown',key); info.textContent='Now press the keys...'; };
  }

  // 15) Estimation
  function mgEstimation(host,onSubmit){
    const canvas=document.createElement('canvas'); canvas.width=240; canvas.height=120; canvas.style.background='#0008'; canvas.style.borderRadius='8px';
    const ctx=canvas.getContext('2d'); const n=20+Math.floor(Math.random()*40);
    for(let i=0;i<n;i++){ ctx.fillStyle='#6fd3ff'; const x=Math.random()*220+10,y=Math.random()*100+10; ctx.beginPath(); ctx.arc(x,y,3,0,Math.PI*2); ctx.fill(); }
    const inp=document.createElement('input'); inp.type='number'; inp.placeholder='How many dots?';
    const submit=btn('Submit');
    host.innerHTML=`<div class="tiny muted">Look, then guess count.</div>`; host.append(canvas,inp,submit);
    submit.onclick=()=>{ const val=+inp.value||0; const diff=Math.abs(n-val); onSubmit(Math.max(0,100-diff*4)); };
  }

  /**
   * Legacy renderMinigame function - NOW DEPRECATED
   * All minigames have been migrated to the new module system.
   * This function is kept as a stub for backwards compatibility.
   * The actual routing is handled by js/minigames/index.js bridge.
   * 
   * @deprecated Use the new module system via MinigameRegistry and MinigameSelector
   */
  function renderMinigame(type, host, onSubmit){
    // This is now a stub - the bridge in minigames/index.js will override this
    // and handle all routing through the new module system.
    console.warn('[renderMinigame] Legacy function called with type:', type);
    console.info('[renderMinigame] Routing should be handled by minigames/index.js bridge');
    
    // Fallback: try to use new system directly
    if(global.MiniGamesRegistry && typeof global.MiniGamesRegistry.render === 'function'){
      // Map legacy key to new key
      const legacyMap = {
        'clicker': 'quickTap',
        'memory': 'memoryMatch',
        'math': 'mathBlitz',
        'bar': 'timingBar',
        'typing': 'wordTyping',
        'reaction': 'reactionTimer',
        'numseq': 'sequenceMemory',
        'pattern': 'patternMatch',
        'slider': 'sliderPuzzle',
        'anagram': 'wordAnagram',
        'path': 'pathFinder',
        'target': 'targetPractice',
        'pairs': 'memoryPairs',
        'simon': 'simonSays',
        'estimate': 'estimationGame'
      };
      
      const newKey = legacyMap[type] || type;
      global.MiniGamesRegistry.render(newKey, host, onSubmit);
    } else {
      // Emergency fallback
      console.error('[renderMinigame] New system not available! Showing error message.');
      host.innerHTML = '<div style="padding:20px;text-align:center;"><p style="color:#e3ecf5;">Minigame system not loaded. Please refresh the page.</p></div>';
    }
  }

  global.renderMinigame=renderMinigame;

})(window);