(function () {
  'use strict';

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
  }

  function unlockAudio() {
    try {
      const bgm = document.getElementById('bgm');
      if (!bgm) return done();
      const p = bgm.play();
      if (p && p.then) {
        p.then(() => { bgm.pause(); bgm.currentTime = 0; done(); }).catch(done);
      } else { done(); }
    } catch { done(); }
  }
  function done() {
    ['touchend','click','keydown'].forEach(ev => window.removeEventListener(ev, unlockAudio, { passive: true }));
  }
  ['touchend','click','keydown'].forEach(ev => window.addEventListener(ev, unlockAudio, { passive: true }));

  function isStandalone() {
    return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || (window.navigator.standalone === true);
  }
  function isiOS() { return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream; }
  function maybeShowA2HSHint() {
    if (isStandalone() || !isiOS()) return;
    const hint = document.createElement('div');
    hint.className = 'tiny muted';
    hint.style.cssText = 'position:fixed;left:12px;right:12px;bottom:12px;background:#0e1422;border:1px solid #223049;padding:8px;border-radius:10px;z-index:99';
    hint.textContent = 'Tip: Add to Home Screen from Safari (Share → Add to Home Screen) for full-screen play.';
    document.body.appendChild(hint);
    setTimeout(() => { try { hint.remove(); } catch {} }, 6000);
  }
  window.addEventListener('load', maybeShowA2HSHint);
})();