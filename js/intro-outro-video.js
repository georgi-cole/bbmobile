// Intro + Outro video with Skip. Plays intro on load/start; replaces end credits with outro video.
// Files must exist exactly (case-sensitive): assets/videos/intro.mp4 and assets/videos/outro.mp4
(function (g) {
  'use strict';
  console.info('[intro-outro] hook loaded');

  const INTRO_URL = 'assets/videos/intro.mp4';
  const OUTRO_URL = 'assets/videos/outro.mp4';
  const INTRO_FLAG_KEY = 'bb.introPlayed';
  let outroPlayed = false;

  function isIntroPlayed(){
    try{ return sessionStorage.getItem(INTRO_FLAG_KEY) === '1' || g.__bbIntroPlayed === true; }catch{ return !!g.__bbIntroPlayed; }
  }
  function markIntroPlayed(){
    g.__bbIntroPlayed = true;
    try{ sessionStorage.setItem(INTRO_FLAG_KEY, '1'); }catch{}
  }

  function buildOverlay() {
    const old = document.getElementById('videoCinema');
    if (old) try { old.remove(); } catch {}

    const root = document.createElement('div');
    root.id = 'videoCinema';
    root.style.cssText = 'position:fixed;inset:0;background:#000;z-index:500;display:flex;align-items:center;justify-content:center;';

    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:relative;width:100vw;height:100vh;display:flex;align-items:center;justify-content:center;background:#000;';

    const vid = document.createElement('video');
    vid.id = 'videoCinemaEl';
    vid.style.cssText = 'width:min(100vw, 100vh * 16/9);height:auto;max-height:100vh;display:block;background:#000;';
    vid.playsInline = true;
    vid.setAttribute('playsinline', '');
    vid.setAttribute('webkit-playsinline', '');
    vid.controls = false;
    vid.autoplay = true;
    vid.muted = false;

    const skip = document.createElement('button');
    skip.textContent = 'Skip';
    skip.style.cssText = 'position:absolute;top:12px;right:14px;z-index:2;background:#1f344d;color:#d8e6f5;border:1px solid #2b4767;border-radius:10px;padding:8px 14px;font-weight:700;letter-spacing:.6px;cursor:pointer;';

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
  function maybePlayIntroOnLoad(){
    if (isIntroPlayed()) return;
    fetch(INTRO_URL, { method: 'HEAD', cache: 'no-store' }).then(r=>{
      if (!r.ok) return;
      playVideo(INTRO_URL, {
        onEnd: markIntroPlayed,
        onSkip: markIntroPlayed,
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
      let hasVideo = true;
      try { const res = await fetch(INTRO_URL, { method: 'HEAD', cache: 'no-store' }); hasVideo = !!res.ok; } catch {}
      if (hasVideo) {
        playVideo(INTRO_URL, {
          onEnd: () => { markIntroPlayed(); try { origStart.call(g); } catch { origStart(); } },
          onSkip: () => { markIntroPlayed(); try { origStart.call(g); } catch { origStart(); } },
          onFail: () => { try { origStart.call(g); } catch { origStart(); } }
        });
        return;
      }
      return origStart.call(g);
    };
  })();

  // Replace credits entirely by catching the finale cinematic hook.
  // End-credits sets a wrapper on showFinaleCinematic that calls its internal startCredits().
  // We can’t override that internal function directly, so we stop their credits and play our video.
  (function hookFinaleOutro(){
    const prevShow = g.showFinaleCinematic;
    if (typeof prevShow !== 'function'){
      console.warn('[intro-outro] showFinaleCinematic not found — outro hook will attach later if available');
      return;
    }
    g.showFinaleCinematic = function wrappedFinale(){
      try { prevShow.apply(this, arguments); } catch (e){ console.warn('[intro-outro] finale orig error', e); }
      // If our outro exists, stop built-in credits shortly after they start and play ours
      (async ()=>{
        if (outroPlayed) return;
        let hasVideo = true;
        try { const r = await fetch(OUTRO_URL, { method:'HEAD', cache:'no-store' }); hasVideo = !!r.ok; } catch {}
        if (!hasVideo) return;
        setTimeout(()=>{
          try { g.stopCreditsSequence?.(); } catch {}
          if (outroPlayed) return;
          outroPlayed = true;
          playVideo(OUTRO_URL, { onEnd: ()=>{}, onSkip: ()=>{}, onFail: ()=>{} });
        }, 1600); // their hook starts ~1500ms after; we stop shortly after to avoid flicker
      })();
    };
  })();

  // Keep legacy wrapper as a fallback in case someone calls startCreditsSequence directly.
  (function hookCreditsFallback() {
    const prevStartCredits = g.startCreditsSequence;
    const prevStopCredits = g.stopCreditsSequence;
    g.startCreditsSequence = async function wrappedCredits() {
      console.info('[intro-outro] startCreditsSequence intercepted');
      if (outroPlayed) return;
      let hasVideo = true;
      try { const res = await fetch(OUTRO_URL, { method: 'HEAD', cache: 'no-store' }); hasVideo = !!res.ok; } catch {}
      if (hasVideo) {
        outroPlayed = true;
        playVideo(OUTRO_URL, {
          onEnd: () => {},
          onSkip: () => {},
          onFail: () => { if (typeof prevStartCredits === 'function') prevStartCredits(); }
        });
        return;
      }
      if (typeof prevStartCredits === 'function') return prevStartCredits();
    };
    g.stopCreditsSequence = function stopWrappedCredits() {
      cleanup();
      if (typeof prevStopCredits === 'function') prevStopCredits();
    };
  })();

})(window);