// End Credits — Cinema Mode with per-letter animation (no eyes/zaps)
// - Full-screen dim, centered two-row slides (Title + Body)
// - Letters animate in with stagger; animate out with a cinematic drift
// - Fits to music duration but capped at 50s total
// - Only "Skip" control; autoplay best-effort (YouTube-nocookie)

(function(g){
  'use strict';

  const YT_ID = 'J9c-KrYjy44';
  const MAX_TOTAL = 50;  // seconds
  const FALLBACK_TOTAL = 50;

  let installed = false;
  let running = false;

  const CREDITS = [
    ['CREDITS', ''],
    ['Game Concept', 'GEORGI COLE'],
    ['Development', 'GEORGI COLE'],
    ['Inspired By', '"BIG BROTHER"'],
    ['Format created by:', '© Endemol Shine Group\nBanijay'],
    ['Music', 'Selections from Big Brother (U.S., Canada, Europe editions)'],
    ['Note', 'All rights belong to their respective copyright owners.'],
    ['SPECIAL THANKS TO', 'JOHN DE MOL'],
    ['Disclaimer:', 'This is a non-commercial fan project.\nAll trademarks, logos, and audio materials related to Big Brother are the property of Endemol Shine Group (Banijay) and their respective licensees.\n\nNo copyright infringement intended.'],
    ['THANK YOU FOR PLAYING', ''],
    ['STAY TUNED FOR MORE', ''],
  ];

  const sleep = (ms)=> new Promise(r=>setTimeout(r, ms));

  function buildRoot(){
    const root=document.createElement('div'); root.id='creditsRoot';
    root.className='creditsCinema';
    root.innerHTML=`
      <div class="creditsCinemaStage" id="creditsStage"></div>
      <div class="creditsCinemaControls">
        <button class="btn small outline" id="creditsSkipBtn">Skip</button>
      </div>
      <iframe id="creditsYT"
        title="credits music"
        allow="autoplay; encrypted-media; picture-in-picture; clipboard-write; accelerometer; gyroscope; web-share"
        referrerpolicy="strict-origin-when-cross-origin"
        style="position:absolute; width:1px; height:1px; left:-5000px; top:-5000px; border:0;"
        src="about:blank"></iframe>
    `;
    return root;
  }

  function toPerLetter(text, sparkEvery = 0){
    const wrap = document.createElement('span');
    wrap.className='cTextRow';
    [...text].forEach((ch, i)=>{
      const s = document.createElement('span');
      s.className='ch';
      if (sparkEvery && i % sparkEvery === 0) s.classList.add('spark');
      s.style.animationDelay = `${40 + (i*18)}ms`;
      s.textContent = ch;
      wrap.appendChild(s);
    });
    return wrap;
  }

  function slide(title, body){
    const s=document.createElement('div'); s.className='cslide';
    const inner=document.createElement('div'); inner.className='cslideInner';

    // Title line (no wrap)
    const t=document.createElement('div'); t.className='cTitle';
    t.appendChild(toPerLetter(title, 7));  // tiny sparking every ~7th char
    inner.appendChild(t);

    // Body: preserve intended breaks; each line gets its own row with per-letter spans
    if(body && body.trim()){
      body.split('\n').forEach(line=>{
        const b=document.createElement('div'); b.className='cBody';
        b.appendChild(toPerLetter(line, 9));
        inner.appendChild(b);
      });
    }

    s.appendChild(inner);
    return s;
  }

  function playMusic(){
    const yf=document.getElementById('creditsYT'); if(!yf) return;
    const url=`https://www.youtube-nocookie.com/embed/${YT_ID}?autoplay=1&controls=0&modestbranding=1&rel=0&loop=1&playlist=${YT_ID}`;
    try{ yf.src=url; }catch{}
  }
  function stopMusic(){ try{ const yf=document.getElementById('creditsYT'); if(yf) yf.src='about:blank'; }catch{} }

  function detectDuration(cb){
    if (location.protocol === 'file:') return cb(FALLBACK_TOTAL);
    const ensureApi=()=>{
      if(!(window.YT && YT.Player)){
        const s=document.createElement('script'); s.src='https://www.youtube.com/iframe_api';
        s.onload=()=> setTimeout(ensureApi, 80);
        document.head.appendChild(s); return;
      }
      const tmp=document.createElement('div'); tmp.id='creditsDurProbe'; tmp.style.cssText='position:absolute;left:-9999px;top:-9999px;width:0;height:0;overflow:hidden;';
      document.body.appendChild(tmp);
      // eslint-disable-next-line no-undef
      const p = new YT.Player('creditsDurProbe', {
        width:0,height:0, videoId:YT_ID,
        events:{ onReady: (e)=> {
          let d=0; try{ d = Math.floor(e.target.getDuration?.() || 0); }catch{}
          try{ e.target.destroy?.(); }catch{}
          try{ tmp.remove(); }catch{}
          cb(Math.max(10, Math.min(MAX_TOTAL, d || FALLBACK_TOTAL)));
        }}
      });
    };
    ensureApi();
  }

  async function runSlides(totalSec){
    const stage=document.getElementById('creditsStage'); if(!stage) return;
    const N = CREDITS.length;

    const FADE_IN=220, FADE_OUT=220, GAP=40;
    const PAD=0.8;
    const alloc = Math.max(6, totalSec - PAD);
    const per = Math.max(1.2, (alloc - (N*(FADE_IN+FADE_OUT+GAP)/1000)) / N);

    for(let i=0;i<N;i++){
      const old=stage.querySelector('.cslide.show');
      if(old){ old.classList.add('hide'); await sleep(FADE_OUT); old.remove(); await sleep(GAP); }

      const [title, body] = CREDITS[i];
      const el=slide(title, body);
      stage.appendChild(el);
      await sleep(16);
      el.classList.add('show');

      const linger = (i>=N-2) ? Math.min(per+0.5, 4.5) : per;
      await sleep(Math.floor(linger*1000));
    }
  }

  async function startCredits(){
    if(running) return; running=true;

    const root = buildRoot();
    document.body.appendChild(root);
    root.querySelector('#creditsSkipBtn').addEventListener('click', finish);

    setTimeout(()=> playMusic(), 120);

    detectDuration(async (dur)=>{
      await runSlides(dur);
      setTimeout(finish, 200);
    });
  }

  function finish(){
    stopMusic();
    try{
      const r=document.getElementById('creditsRoot') || document.querySelector('.creditsCinema');
      if(r){ r.classList.add('hide'); setTimeout(()=> r.remove(), 180); }
    }catch{}
    running=false;
  }

  function installHook(){
    if(installed) return; installed=true;

    if(typeof g.showFinaleCinematic==='function'){
      const orig=g.showFinaleCinematic;
      g.showFinaleCinematic=function wrapped(winnerId){
        try{ orig.apply(this, arguments); }catch(e){ console.warn('[credits] finale call error', e); }
        setTimeout(()=> startCredits(), 1500);
      };
      console.info('[credits] cinema mode (per-letter) installed');
    }
  }

  g.startCreditsSequence = startCredits;
  g.stopCreditsSequence = finish;

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', installHook, { once:true });
  } else {
    installHook();
  }

})(window);