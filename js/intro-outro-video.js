// Intro + Outro video with Skip. Plays intro on load/start; replaces end credits with outro video.
// Files must exist exactly (case-sensitive): assets/videos/intro.mp4 and assets/videos/outro.mp4
(function (g) {
  'use strict';
  console.info('[intro-outro] hook loaded');

  const INTRO_URL = 'assets/videos/intro.mp4';
  const OUTRO_URL = 'assets/videos/outro.mp4';
  const INTRO_URL_MOBILE = 'assets/videos/intro-mobile.mp4';
  const OUTRO_URL_MOBILE = 'assets/videos/outro-mobile.mp4';
  const INTRO_FLAG_KEY = 'bb.introPlayed';

  let outroPlayed = false;

  function isIntroPlayed(){
    try{ return sessionStorage.getItem(INTRO_FLAG_KEY) === '1' || g.__bbIntroPlayed === true; }catch{ return !!g.__bbIntroPlayed; }
  }
  function markIntroPlayed(){
    g.__bbIntroPlayed = true;
    try{ sessionStorage.setItem(INTRO_FLAG_KEY, '1'); }catch{}
  }

  // Check if device is a phone in portrait mode
  function isPhonePortrait(){
    const w = window.innerWidth || 0;
    const h = window.innerHeight || 0;
    // Portrait: height > width, and width suggests mobile (< 768px)
    return h > w && w < 768;
  }

  // Pick video URL: mobile variant on portrait phones if it exists, else desktop
  async function pickVideoUrl(primaryUrl, mobileUrl){
    if(!isPhonePortrait()) return primaryUrl;
    
    // Check if mobile variant exists
    try{
      const r = await fetch(mobileUrl, { method:'HEAD', cache:'no-store' });
      if(r.ok) return mobileUrl;
    }catch{}
    
    return primaryUrl;
  }

  function buildOverlay() {
    const old = document.getElementById('videoCinema');
    if (old) try { old.remove(); } catch {}

    // Lock body scroll
    document.body.style.overflow = 'hidden';

    const root = document.createElement('div');
    root.id = 'videoCinema';
    root.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100dvh;background:#000;z-index:9999;display:flex;align-items:center;justify-content:center;';

    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:relative;width:100%;height:100dvh;display:flex;align-items:center;justify-content:center;background:#000;';

    const vid = document.createElement('video');
    vid.id = 'videoCinemaEl';
    vid.style.cssText = 'width:100%;height:100%;max-width:100vw;max-height:100dvh;object-fit:contain;display:block;background:#000;';
    vid.playsInline = true;
    vid.setAttribute('playsinline', '');
    vid.setAttribute('webkit-playsinline', '');
    vid.controls = false;
    vid.autoplay = true;
    vid.muted = false;

    const skip = document.createElement('button');
    skip.textContent = 'Skip';
    skip.style.cssText = 'position:absolute;top:calc(env(safe-area-inset-top, 0px) + 12px);right:calc(env(safe-area-inset-right, 0px) + 14px);z-index:2;background:#1f344d;color:#d8e6f5;border:1px solid #2b4767;border-radius:10px;padding:8px 14px;font-weight:700;letter-spacing:.6px;cursor:pointer;';

    const tap = document.createElement('button');
    tap.textContent = 'Tap to Play';
    tap.style.cssText = 'position:absolute;z-index:2;background:#3563a7;color:#eaf4ff;border:0;border-radius:12px;padding:10px 16px;font-weight:800;letter-spacing:.5px;cursor:pointer;box-shadow:0 6px 20px -8px #000a;display:none;';

    wrap.appendChild(vid);
    wrap.appendChild(skip);
    wrap.appendChild(tap);
    root.appendChild(wrap);
    document.body.appendChild(root);

    return { root, vid, skip, tap };
  }

  function cleanup() {
    const el = document.getElementById('videoCinema');
    if (el) try { el.remove(); } catch {}
    // Restore body scroll
    document.body.style.overflow = '';
  }

  function playVideo(url, { onEnd, onSkip, onFail } = {}) {
    console.info('[intro-outro] playVideo:', url);
    const { vid, skip, tap } = buildOverlay();
    let finished = false;

    function finish(kind) {
      if (finished) return;
      finished = true;
      try { vid.pause(); } catch {}
      cleanup();
      console.info('[intro-outro] finished:', kind);
      if (kind === 'skip') onSkip && onSkip();
      else if (kind === 'end') onEnd && onEnd();
      else onFail && onFail();
    }

    skip.onclick = () => finish('skip');

    vid.addEventListener('ended', () => finish('end'));
    vid.addEventListener('error', () => finish('fail'));

    const tryPlay = () => {
      const p = vid.play();
      if (p && p.then) {
        p.then(() => {}).catch(() => { tap.style.display = 'block'; });
      }
    };

    vid.src = url;
    tryPlay();

    tap.onclick = () => {
      tap.style.display = 'none';
      try {
        vid.muted = false;
        const p = vid.play();
        if (p && p.then) p.then(() => {}).catch(() => finish('fail'));
      } catch { finish('fail'); }
    };
  }

  // Show intro once when the page/app opens
  async function maybePlayIntroOnLoad(){
    if (isIntroPlayed()) return;
    const url = await pickVideoUrl(INTRO_URL, INTRO_URL_MOBILE);
    fetch(url, { method: 'HEAD', cache: 'no-store' }).then(r=>{
      if (!r.ok) return;
      playVideo(url, {
        onEnd: function(){
          markIntroPlayed();
          showRulesCard();
        },
        onSkip: function(){
          markIntroPlayed();
          showRulesCard();
        },
        onFail: ()=>{}
      });
    }).catch(()=>{});
  }
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', maybePlayIntroOnLoad, { once:true });
  } else {
    setTimeout(maybePlayIntroOnLoad, 0);
  }

  // Also play intro right before the opening sequence (if it hasn’t played yet)
  (function hookIntro() {
    const origStart = g.startOpeningSequence;
    if (typeof origStart !== 'function') {
      console.warn('[intro-outro] startOpeningSequence not found at load — intro hook inactive');
      return;
    }
    g.startOpeningSequence = async function wrappedOpening() {
      console.info('[intro-outro] startOpeningSequence intercepted');
      if (isIntroPlayed()){
        return origStart.call(g);
      }
      const url = await pickVideoUrl(INTRO_URL, INTRO_URL_MOBILE);
      let hasVideo = true;
      try { const res = await fetch(url, { method: 'HEAD', cache: 'no-store' }); hasVideo = !!res.ok; } catch {}
      if (hasVideo) {
        playVideo(url, {
          onEnd: () => { 
            markIntroPlayed(); 
            showRulesCard();
            try { origStart.call(g); } catch { origStart(); } 
          },
          onSkip: () => { 
            markIntroPlayed(); 
            showRulesCard();
            try { origStart.call(g); } catch { origStart(); } 
          },
          onFail: () => { try { origStart.call(g); } catch { origStart(); } }
        });
        return;
      }
      return origStart.call(g);
    };
  })();

  // Wrap showFinaleCinematic so we can replace credits entirely with our video.
  function wrapFinale(){
    const prevShow = g.showFinaleCinematic;
    if (typeof prevShow !== 'function' || prevShow.__ioWrapped) return;
    const wrapped = function(){
      try { prevShow.apply(this, arguments); } catch (e){ console.warn('[intro-outro] finale orig error', e); }
      (async ()=>{
        if (outroPlayed) return;
        const url = await pickVideoUrl(OUTRO_URL, OUTRO_URL_MOBILE);
        let hasVideo = true;
        try { const r = await fetch(url, { method:'HEAD', cache:'no-store' }); hasVideo = !!r.ok; } catch {}
        if (!hasVideo) return;
        // Stop built-in credits just before or after they start, then play our outro
        setTimeout(()=>{
          try { g.stopCreditsSequence?.(); } catch {}
          if (outroPlayed) return;
          outroPlayed = true;
          playVideo(url, { onEnd: ()=>{}, onSkip: ()=>{}, onFail: ()=>{} });
        }, 1200);
      })();
    };
    wrapped.__ioWrapped = true;
    g.showFinaleCinematic = wrapped;
    console.info('[intro-outro] showFinaleCinematic wrapped');
  }

  // Fallback: wrap startCreditsSequence in case it’s invoked directly.
  function wrapCredits(){
    const prevStartCredits = g.startCreditsSequence;
    if (prevStartCredits && prevStartCredits.__ioWrapped) return;
    const wrapped = async function(){
      console.info('[intro-outro] startCreditsSequence intercepted');
      if (outroPlayed) return;
      const url = await pickVideoUrl(OUTRO_URL, OUTRO_URL_MOBILE);
      let hasVideo = true;
      try { const res = await fetch(url, { method: 'HEAD', cache: 'no-store' }); hasVideo = !!res.ok; } catch {}
      if (hasVideo) {
        outroPlayed = true;
        playVideo(url, {
          onEnd: () => {},
          onSkip: () => {},
          onFail: () => { try { prevStartCredits?.(); } catch {} }
        });
        return;
      }
      try { return prevStartCredits?.(); } catch {}
    };
    wrapped.__ioWrapped = true;
    g.startCreditsSequence = wrapped;
    // Also ensure stop proxy cleans overlay
    const prevStop = g.stopCreditsSequence;
    g.stopCreditsSequence = function(){
      cleanup();
      try { prevStop?.(); } catch {}
    };
    console.info('[intro-outro] startCreditsSequence wrapped');
  }

  function installOutroHooks(){
    wrapFinale();
    wrapCredits();
  }

  // Install now, then re-apply for a short window after DOM ready (end-credits installs then).
  installOutroHooks();
  function scheduleRehook(){
    let ticks=0;
    const iv=setInterval(()=>{
      installOutroHooks();
      if(++ticks>30) clearInterval(iv); // ~9s total if 300ms interval
    }, 300);
  }
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', scheduleRehook, { once:true });
  } else {
    scheduleRehook();
  }

  // Export function to replay outro video manually
  g.playOutroVideo = async function(){
    const url = await pickVideoUrl(OUTRO_URL, OUTRO_URL_MOBILE);
    let hasVideo = true;
    try { const res = await fetch(url, { method: 'HEAD', cache: 'no-store' }); hasVideo = !!res.ok; } catch {}
    if (!hasVideo) {
      console.warn('[intro-outro] playOutroVideo: outro video not found');
      // Fallback to credits if available
      if(typeof g.startCreditsSequence === 'function'){
        try { g.startCreditsSequence(); } catch {}
      }
      return;
    }
    // D) Return to winner panel after outro
    playVideo(url, { 
      onEnd: ()=>{ 
        if(g.__lastWinnerId != null) {
          setTimeout(()=>g.showFinaleCinematic?.(g.__lastWinnerId), 100);
        }
      }, 
      onSkip: ()=>{
        if(g.__lastWinnerId != null) {
          setTimeout(()=>g.showFinaleCinematic?.(g.__lastWinnerId), 100);
        }
      }, 
      onFail: ()=>{} 
    });
  };

  // Show Rules card automatically (used after intro)
  function showRulesCard(){
    const rulesHtml = `
      <div style="text-align:left;line-height:1.6;max-width:600px;margin:0 auto;max-height:70vh;overflow-y:auto;padding:10px;">
        <p><strong>Objective:</strong> Be the last player standing to win Big Brother.</p>
        <p><strong>HOH (Head of Household):</strong> Wins power to nominate 2 players for eviction.</p>
        <p><strong>Nominations:</strong> The HOH chooses two players to put on the block.</p>
        <p><strong>Veto Competition:</strong> Six players compete for the Power of Veto to save a nominee.</p>
        <p><strong>Eviction:</strong> Houseguests vote to evict one of the final nominees. Majority rules.</p>
        <p><strong>Jury Phase:</strong> Evicted players become jurors who vote for the winner in the finale.</p>
        <p><strong>Finale:</strong> Final 2 face the jury. The jury votes, and the winner is crowned!</p>
      </div>
    `;
    
    if(typeof g.showBigCard === 'function'){
     g.showBigCard('Game Rules', [rulesHtml]);
    } else if(typeof g.showCard === 'function'){
      g.showCard('Game Rules', [rulesHtml], 'info', 10000, true);
    }
  }

  // Export showRulesCard so the Rules button can use it
  g.showRulesCard = showRulesCard;

})(window);
