// Disable faux viewport background whenever the TV container (#tv) has a real background.
// Keeps background single-sourced on #tv as set by js/ui.tv-media.js.
(function () {
  function hasRealTvBg(tvEl) {
    if (!tvEl) return false;
    if (tvEl.classList.contains('hasTvBg')) return true;
    const bg = tvEl.style.getPropertyValue('--tv-bg');
    return !!bg && bg.includes('url(');
  }

  function apply() {
    const tv = document.getElementById('tv');
    const viewport = tv ? tv.querySelector('.tvViewport') : null;
    if (!tv || !viewport) return;

    if (hasRealTvBg(tv)) {
      viewport.style.background = 'none';
      viewport.classList.add('no-faux-bg');
      try { 
        viewport.removeAttribute('data-sm-faux-tv'); 
      } catch (e) {
        // Ignore errors if attribute doesn't exist
      }
      tv.classList.add('hasTvBg');
    }
  }

  document.addEventListener('DOMContentLoaded', apply);
  window.addEventListener('load', apply);

  const tv = document.getElementById('tv');
  if (tv) {
    const obs = new MutationObserver(apply);
    obs.observe(tv, { attributes: true, attributeFilter: ['style', 'class'] });
  }
})();
