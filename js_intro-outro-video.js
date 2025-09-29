// Intro + Outro video with Skip. Replaces opening sequence and end credits when videos exist.
// Expected files (case-sensitive): assets/videos/intro.mp4 and assets/videos/outro.mp4
(function (g) {
  'use strict';

  const INTRO_URL = 'assets/videos/intro.mp4';
  const OUTRO_URL = 'assets/videos/outro.mp4';

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
    const { vid, skip, tap } = buildOverlay();
    let finished = false;

    function finish(kind) {
      if (finished) return;
      finished = true;
      try { vid.pause(); } catch {}
      cleanup();
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

  // ---------- INTRO HOOK ----------
  (function hookIntro() {
    const origStart = g.startOpeningSequence;
    if (typeof origStart !== 'function') return;

    g.startOpeningSequence = async function wrappedOpening() {
      let hasVideo = true;
      try {
        const res = await fetch(INTRO_URL, { method: 'HEAD', cache: 'no-store' });
        hasVideo = !!res.ok;
      } catch {}

      if (hasVideo) {
        playVideo(INTRO_URL, {
          onEnd: () => { try { origStart.call(g); } catch { origStart(); } },
          onSkip: () => { try { origStart.call(g); } catch { origStart(); } },
          onFail: () => { try { origStart.call(g); } catch { origStart(); } }
        });
        return;
      }
      return origStart.call(g);
    };
  })();

  // ---------- OUTRO (CREDITS) HOOK ----------
  (function hookOutro() {
    const prevStartCredits = g.startCreditsSequence;
    const prevStopCredits = g.stopCreditsSequence;

    g.startCreditsSequence = async function wrappedCredits() {
      let hasVideo = true;
      try {
        const res = await fetch(OUTRO_URL, { method: 'HEAD', cache: 'no-store' });
        hasVideo = !!res.ok;
      } catch {}

      if (hasVideo) {
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