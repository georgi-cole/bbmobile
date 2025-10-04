// End Credits — Split-screen (avatars montage + fading credit slides) with robust one-shot audio
// Version: bb-credits-split-r3
//
// Fixes:
// - Handles YouTube error 153 (and others) by trying an audio chain (multiple YT IDs and/or a direct audio URL).
// - No loops; first playable source wins. Clean stop at end.
// - Same 50s total timing and split visuals (avatars + fading credit slides).
//
// Public API:
//   startEndCreditsMontageSplit({ images?, side?, perImageMs?, audioId?, audioIds?, audioUrl?, volume?, totalMs? })
//   startEndCreditsSequence()
//   stopEndCreditsSequence()
// Back-compat: startEndCreditsSplit -> startEndCreditsMontageSplit

(function(g){
  'use strict';

  const VERSION = 'bb-credits-split-r3';

  // Config
  const DEFAULT_YT_ID    = 'J9c-KrYjy44'; // prior credits ID
  const DEFAULT_VOLUME   = 55;            // 0..100
  const DEFAULT_TOTAL_MS = 50000;         // 50 seconds
  const PER_IMAGE_MS     = 3000;          // montage dwell
  const SLIDE_FADE_MS    = 380;           // fade in/out

  // Credit slides (shown once; per-slide visible time computed from total)
  const CREDIT_SLIDES = [
    { title: 'Game Design & Development', body: 'Georgi Cole' },
    { title: 'Format Rights', body: 'Endemol Shine Group, a Banijay company' },
    { title: 'Music & Audio', body:
`Selections from:

Big Brother U.S. (CBS)
Big Brother Canada (Global TV)
Big Brother Europe editions

All music and sound effects are property of their respective copyright holders` },
    { title: 'Special thanks to', body:
`John De Mol` },

{ title: 'Special thanks to', body:
`The global Big Brother fan community` },

{ title: 'And', body:
`Viewers who have kept the show running worldwide for more than two decades.` },


    { title: 'Disclaimer', body:
`This game is a non-commercial fan project 
created purely for entertainment  and educational purposes.

It is not affiliated with, endorsed by, or connected to Endemol Shine Group, Banijay, CBS, Global TV, or any broadcaster or license holder.
All rights to Big Brother, including its name, format, logos, sounds, music, and imagery, remain the sole property of their respective owners.

No copyright infringement intended.` }
  ];

  // CSS (inject once per version)
  (function injectCSS(){
    const id = 'bb-credits-split-css-' + VERSION;
    if (document.getElementById(id)) return;
    const css = `
    .bbCreditsOverlay{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.88);backdrop-filter:blur(2px);display:grid;grid-template-columns:1fr 1fr;gap:0}
    .bbPane{position:relative;height:100%;overflow:hidden;display:flex;flex-direction:column}
    .bbControls{position:absolute;top:8px;right:10px;display:flex;gap:8px;z-index:20}
    .bbBtn{border:none;background:rgba(0,0,0,.45);color:#fff;border-radius:8px;padding:6px 10px;font-weight:800;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.35)}
    .bbCreditsStage{position:relative;width:100%;height:100%;display:grid;place-items:center;padding:24px 18px}
    .bbSlide{position:absolute;inset:0;display:grid;place-items:center;opacity:0;transition:opacity ${SLIDE_FADE_MS}ms ease;padding:24px;box-sizing:border-box}
    .bbSlide.show{opacity:1}
    .bbCard{max-width:min(820px,92%);text-align:center;background:transparent;border:none;border-radius:16px;padding:22px 22px;text-shadow:0 2px 8px rgba(0,0,0,.45)}
    .bbTitle{font-size:clamp(18px,2.4vw,28px);font-weight:900;letter-spacing:.4px;color:#eefdff;margin-bottom:12px}
    .bbBody{white-space:pre-wrap;color:#dffbff;line-height:1.5;font-size:clamp(14px,1.8vw,18px)}
    .bbMontage{position:relative;flex:1;overflow:hidden;background:radial-gradient(ellipse at center,rgba(255,255,255,.06),rgba(0,0,0,.3))}
    .bbMontage img{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) scale(1);will-change:transform,opacity;max-width:none;opacity:0;transition:opacity 900ms ease;filter:drop-shadow(0 10px 30px rgba(0,0,0,.45))}
    .bbMontage img.active{opacity:1}
    @keyframes bbKenIn {0%{transform:translate(-50%,-50%) scale(1)}100%{transform:translate(-50%,-50%) scale(1.12)}}
    @keyframes bbKenOut{0%{transform:translate(-50%,-50%) scale(1.12)}100%{transform:translate(-50%,-50%) scale(1)}}
    .bbKenIn{animation:bbKenIn 2400ms linear forwards}
    .bbKenOut{animation:bbKenOut 2400ms linear forwards}
    .bbCaption{position:absolute;left:16px;bottom:12px;color:#fff;background:rgba(0,0,0,.35);border:none;padding:6px 10px;border-radius:10px;font-weight:800;letter-spacing:.3px;text-shadow:0 2px 8px rgba(0,0,0,.45);max-width:60%}
    #bbCreditsAudioHost{position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;overflow:hidden}
    @media (max-width:900px){.bbCreditsOverlay{grid-template-columns:1fr}}
    `;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = css;
    document.head.appendChild(style);
  })();

  // Utilities
  const sleep = (ms)=> new Promise(r=>setTimeout(r,ms));
  const nextFrame = ()=> new Promise(r=>requestAnimationFrame(()=>r()));
  function el(tag, cls, html){ const n=document.createElement(tag); if(cls) n.className = cls; if(html!=null) n.innerHTML = html; return n; }
  function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }
  function playersImages(){
    const players=(g.game?.players||g.players||[]).slice();
    return players.map(p=>({ url:p?.avatar||p?.img||p?.photo, caption:p?.name||'Houseguest' })).filter(x=>!!x.url);
  }
  function normalizeFrames(arr){ return (arr||[]).map(x=> (typeof x==='string' ? { url:x, caption:'' } : x)).filter(f=>!!f?.url); }
  function isHttpUrl(s){ return /^https?:\/\//i.test(s||''); }
  function isAudioUrl(s){ return /\.(mp3|ogg|aac|m4a|wav)(\?|$)/i.test(s||''); }

  // State
  let overlay=null, playing=false, imageTimer=0, ytPlayer=null, htmlAudio=null, totalStopTimer=0;

  // Audio chain logic ---------------------------------------------------------
  function ensureYTApi(cb){
    if (window.YT && YT.Player) return cb();
    if (!window.__BB_YT_READY_CBS){ window.__BB_YT_READY_CBS=[]; }
    window.__BB_YT_READY_CBS.push(cb);
    if (!document.getElementById('yt-iframe-api')){
      const s=document.createElement('script'); s.src='https://www.youtube.com/iframe_api'; s.id='yt-iframe-api'; s.async=true;
      document.head.appendChild(s);
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = function(){
        try{ prev&&prev(); }catch{} 
        const cbs = window.__BB_YT_READY_CBS||[]; window.__BB_YT_READY_CBS=[];
        cbs.forEach(fn=>{ try{ fn(); }catch{} });
      };
    }
  }

  function stopAllAudio(){
    try{ ytPlayer?.stopVideo?.(); ytPlayer?.destroy?.(); }catch{}
    ytPlayer=null;
    try{
      if (htmlAudio){ htmlAudio.pause(); htmlAudio.src=''; htmlAudio.remove(); }
    }catch{}
    htmlAudio=null;
    try{ document.getElementById('bbCreditsAudioHost')?.remove(); }catch{}
  }

  // Try a chain of audio candidates until one plays; candidates are:
  // - {type:'url', url:'https...mp3'}
  // - {type:'yt', id:'YouTubeID'}
  // If all fail, attempt g.setMusic('victory', true) as a last resort.
  function startAudioChain(candidates, volume=DEFAULT_VOLUME){
    let idx = -1;

    function tryNext(reason){
      idx++;
      const cand = candidates[idx];
      if (!cand){
        console.warn('[credits] all audio candidates failed; fallback to game music', reason);
        try{ g.setMusic?.('victory', true); }catch{}
        return;
      }
      if (cand.type === 'url' && isHttpUrl(cand.url)){
        console.log('[credits] audio try URL', cand.url);
        stopAllAudio();
        htmlAudio = new Audio(cand.url);
        htmlAudio.volume = Math.max(0, Math.min(1, (volume|0)/100));
        htmlAudio.autoplay = true;
        htmlAudio.preload = 'auto';
        htmlAudio.onended = ()=>{}; // no loop
        htmlAudio.onerror = ()=>{ console.warn('[credits] audio url failed', cand.url); tryNext('url-error'); };
        htmlAudio.play().catch(e=>{ console.warn('[credits] audio url play blocked', e); tryNext('url-play-block'); });
        // gesture unlock
        document.addEventListener('click', ()=>{ try{ htmlAudio?.play?.(); }catch{} }, { once:true, capture:true });
      } else if (cand.type === 'yt' && cand.id){
        console.log('[credits] audio try YT', cand.id);
        stopAllAudio();
        const host=document.createElement('div'); host.id='bbCreditsAudioHost';
        document.body.appendChild(host);
        ensureYTApi(()=> {
          // eslint-disable-next-line no-undef
          ytPlayer=new YT.Player('bbCreditsAudioHost',{
            videoId: cand.id,
            host: 'https://www.youtube-nocookie.com',
            playerVars: {
              autoplay: 1, controls: 0, disablekb: 1, modestbranding: 1,
              rel: 0, iv_load_policy: 3, loop: 0, playsinline: 1, origin: location.origin, enablejsapi: 1
            },
            events:{
              onReady: (e)=>{ try{ e.target.setVolume(Math.max(0,Math.min(100, volume))); e.target.playVideo(); }catch{} },
              onError: (e)=>{ console.warn('[credits] audio error', e?.data || e); tryNext('yt-error-'+(e?.data||'x')); }
            }
          });
        });
        // gesture unlock
        document.addEventListener('click', ()=>{ try{ ytPlayer?.playVideo?.(); }catch{} }, { once:true, capture:true });
      } else {
        tryNext('bad-candidate');
      }
    }

    tryNext();
  }

  // Credits slides (play once; auto pace to totalMs)
  async function playSlidesToDuration(stage, slides, totalMs){
    const fades = slides.length;
    const totalFadeMs = fades * (SLIDE_FADE_MS + 40);
    const visiblePerSlide = Math.max(2500, Math.floor((Math.max(3000, totalMs) - totalFadeMs) / slides.length));
    for (let i=0;i<slides.length;i++){
      const prev = stage.querySelector('.bbSlide.show');
      if(prev){ prev.classList.remove('show'); await sleep(SLIDE_FADE_MS+40); prev.remove(); }
      const s = buildSlide(slides[i].title, slides[i].body);
      stage.appendChild(s); await nextFrame(); s.classList.add('show');
      await sleep(visiblePerSlide);
    }
    const last = stage.querySelector('.bbSlide.show');
    if(last){ last.classList.remove('show'); await sleep(SLIDE_FADE_MS+40); last.remove(); }
  }
  function buildSlide(title, body){
    const slide=el('div','bbSlide');
    const card =el('div','bbCard');
    const t    =el('div','bbTitle', escapeHtml(title||''));
    const b    =el('div','bbBody',  escapeHtml(body||''));
    card.appendChild(t); card.appendChild(b); slide.appendChild(card);
    return slide;
  }

  // Montage (loops until credits end)
  function startMontage(mount, captionEl, frames, perMs){
    const imgs=frames.map(f=>{ const i=new Image(); i.src=f.url; i.alt=f.caption||'Moment'; mount.appendChild(i); return i; });
    let idx=-1;
    function step(){
      const prev=(idx>=0)?imgs[idx]:null;
      idx=(idx+1)%imgs.length;
      const cur=imgs[idx];
      imgs.forEach(x=>{ x.classList.remove('active','bbKenIn','bbKenOut'); x.style.zIndex=1; });
      if(prev){ prev.style.zIndex=2; prev.classList.add('bbKenOut'); }
      cur.style.zIndex=3; cur.classList.add('active','bbKenIn');
      captionEl.textContent = frames[idx]?.caption || '';
    }
    step();
    return setInterval(step, Math.max(2200, perMs));
  }

  // Keyboard close
  function onKeyDown(e){ if(e.key==='Escape'){ e.preventDefault(); stopEndCreditsSequence(); } }

  // Core API
  function startEndCreditsMontageSplit({ images, side='right', perImageMs=PER_IMAGE_MS, audioId=DEFAULT_YT_ID, audioIds=[], audioUrl='', volume=DEFAULT_VOLUME, totalMs=DEFAULT_TOTAL_MS } = {}){
    if (overlay || playing){ console.log('[credits] already running – ignored'); return; }
    playing = true;

    overlay=el('div','bbCreditsOverlay');

    const left = el('div','bbPane left');
    const right= el('div','bbPane right');

    const controls = el('div','bbControls');
    const btnSkip  = el('button','bbBtn','Skip'); btnSkip.onclick=()=> stopEndCreditsSequence();
    controls.appendChild(btnSkip);

    const creditStage = el('div','bbCreditsStage');
    const montage     = el('div','bbMontage');
    const caption     = el('div','bbCaption','');

    const creditsOnRight=(side==='right');
    if(creditsOnRight){ left.appendChild(montage); left.appendChild(caption); right.appendChild(creditStage); right.appendChild(controls); }
    else { left.appendChild(creditStage); left.appendChild(controls); right.appendChild(montage); right.appendChild(caption); }

    overlay.appendChild(left); overlay.appendChild(right);
    document.body.appendChild(overlay);
    window.addEventListener('keydown', onKeyDown, true);

    // Build audio candidates chain (YT IDs first, optional URL, then fallback to game music)
    const chain = [];
    const globalIds = Array.isArray(g.CREDITS_AUDIO_CHAIN) ? g.CREDITS_AUDIO_CHAIN : [];
    const seen = new Set();
    const pushYt = id => { if (id && !seen.has('yt:'+id)) { chain.push({ type:'yt', id }); seen.add('yt:'+id); } };
    const pushUrl= u  => { if (u && isHttpUrl(u) && !seen.has('url:'+u)) { chain.push({ type:'url', url:u }); seen.add('url:'+u); } };
    // Order: explicit audioIds -> audioId -> window.CREDITS_AUDIO_CHAIN -> DEFAULT
    (Array.isArray(audioIds) ? audioIds : []).forEach(pushYt);
    pushYt(audioId);
    globalIds.forEach(pushYt);
    pushYt(DEFAULT_YT_ID);
    if (audioUrl && isHttpUrl(audioUrl) && isAudioUrl(audioUrl)) pushUrl(audioUrl);

    startAudioChain(chain, volume);

    // Start montage
    const frames = normalizeFrames(images && images.length ? images : playersImages());
    const finalFrames = frames.length ? frames : [{ url:`https://api.dicebear.com/6.x/bottts/svg?seed=Houseguest`, caption:'Houseguest' }];
    imageTimer = startMontage(montage, caption, finalFrames, perImageMs);

    // Play credit slides to totalMs, then stop cleanly
    (async ()=>{
      try{
        await playSlidesToDuration(creditStage, CREDIT_SLIDES, totalMs);
      } finally {
        // ensure hard stop near totalMs even if slides complete slightly early
        const remain = Math.max(0, totalMs - 2000);
        totalStopTimer = setTimeout(()=> stopEndCreditsSequence(), remain);
      }
    })();

    // Secondary guard: absolute stop at totalMs + small buffer
    setTimeout(()=>{ if (overlay) stopEndCreditsSequence(); }, totalMs + 800);

    console.log('[credits]', VERSION, 'started (credits:', creditsOnRight?'right':'left', ', frames:', finalFrames.length, ', totalMs:', totalMs, ')');
  }

  function startEndCreditsSequence(){
    const imgs = playersImages().map(x=>({ url:x.url, caption:x.caption }));
    startEndCreditsMontageSplit({ images: imgs, side:'right', totalMs: DEFAULT_TOTAL_MS, audioId: DEFAULT_YT_ID });
  }

  function stopEndCreditsSequence(){
    if (!overlay && !playing) return;
    try{
      if (imageTimer) clearInterval(imageTimer);
      imageTimer=0;
      if (totalStopTimer) clearTimeout(totalStopTimer);
      totalStopTimer=0;
      stopAllAudio();
      overlay?.remove?.();
    }catch{}
    overlay=null; playing=false;
    window.removeEventListener('keydown', onKeyDown, true);
    console.log('[credits]', VERSION, 'stopped');
  }

  // Expose
  g.startEndCreditsMontageSplit = startEndCreditsMontageSplit;
  g.startEndCreditsSequence     = startEndCreditsSequence;
  g.stopEndCreditsSequence      = stopEndCreditsSequence;
  g.startEndCreditsSplit        = startEndCreditsMontageSplit; // back-compat

})(window);

// REMOVED: Post-winner Public Favourite integration wrapper per requirements
// Public Favourite now runs PRE-JURY in jury.js (between casting and reveal phases)
// This ensures the correct flow: casting → Public Favourite → jury reveal → outro