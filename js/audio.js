// Audio: local MP3s only, auto-switch on phase changes and on special events.
// Files expected in /audio/ (or window.MUSIC_BASE to override).
// Exposes:
//  - window.playMusicForPhase(phaseOrEvent)
//  - window.stopMusic()
//  - window.musicCue(eventName)  // 'eviction' | 'twist' | 'final_jury_vote' | 'winner'
//  - window.setMusicVolume(v)    // 0..1
//
// Behavior:
//  - Wraps setPhase so every phase change stops current audio and plays mapped track.
//  - Works when phases are skipped (because setPhase is still invoked).
//  - Detects common reveal cards and cues event music (eviction, winner, twists, final jury).
//  - First playback is unlocked on user gesture (click/key).
(function(g){
  'use strict';

  const BASE = ((g.MUSIC_BASE || 'audio/').replace(/^\/*/,'').replace(/\/*$/,'')) + '/';

  // Phase mapping (stop music when null)
  // opening -> intro.mp3
  const PHASE_TO_TRACK = {
    opening: 'intro.mp3',
    intermission: null,           // no music during brief intermission
    hoh: 'competition.mp3',
    hoh_comp: 'competition.mp3',
    competition: 'competition.mp3',
    nominations: 'nominations.mp3',
    nomination: 'nominations.mp3',
    veto_comp: 'veto.mp3',
    veto: 'veto.mp3',
    livevote: 'live vote.mp3',
    'live vote': 'live vote.mp3',
    jury: null,                   // handled by final_jury_vote event when applicable
    finale: null                  // handled by 'winner' event
  };

  // Event mapping (explicit cues outside of phase)
  const EVENT_TO_TRACK = {
    eviction: 'eviction.mp3',
    twist: 'twist.mp3',                 // also used for double/triple/jury return
    final_jury_vote: 'final jury vote.mp3',
    winner: 'victory.mp3'
  };

  // Fuzzy matching helper
  function mapPhase(phase){
    const k = String(phase||'').toLowerCase();
    if (k in PHASE_TO_TRACK) return PHASE_TO_TRACK[k];
    if (k.includes('open')) return 'intro.mp3';
    if (k.includes('hoh') || k.includes('comp')) return 'competition.mp3';
    if (k.includes('nom')) return 'nominations.mp3';
    if (k.includes('veto')) return 'veto.mp3';
    if (k.includes('live')) return 'live vote.mp3';
    return null;
  }

  // Audio element and unlock gate
  let el = null, unlocked = false, pending = null, currentSrc = '';

  function ensureEl(){
    if (el) return el;
    el = document.createElement('audio');
    el.id = 'bbMusic';
    el.style.display = 'none';
    el.preload = 'auto';
    el.loop = true;
    document.body.appendChild(el);
    return el;
  }

  function unlock(){
    if (unlocked) return;
    unlocked = true;
    document.removeEventListener('pointerdown', unlock);
    document.removeEventListener('keydown', unlock);
    if (pending){ const p = pending; pending = null; playMusicForPhase(p); }
  }

  function setMusicVolume(v){
    const vol = Math.min(1, Math.max(0, Number(v)||0));
    if (el) el.volume = vol;
  }

  function stopMusic(){
    if (!el) return;
    currentSrc = '';
    try { el.pause(); } catch {}
    try { el.removeAttribute('src'); el.load(); } catch {}
  }

  function srcFor(file){ return BASE + file.split('/').map(encodeURIComponent).join('/'); }

  // attempt to play, fallback from veto.mp3 -> competition.mp3 if missing
  async function playFile(file){
    if (!file) { stopMusic(); return; }

    const audio = ensureEl();
    const full = srcFor(file);

    // If already playing same, do nothing
    if (currentSrc === full && !audio.paused) return;

    // If still locked by browser policies, wait for user gesture
    if (!unlocked){
      pending = file; // store filename (or fuzzy key)
      document.addEventListener('pointerdown', unlock, { once:true, passive:true });
      document.addEventListener('keydown', unlock, { once:true });
      return;
    }

    // Replace source cleanly
    stopMusic();
    currentSrc = full;
    audio.src = full;
    audio.loop = true;
    try {
      await audio.play();
    } catch (e) {
      // Fallback: if veto.mp3 fails, try competition.mp3 (common setup)
      if (/veto\.mp3$/i.test(file)) {
        try {
          currentSrc = srcFor('competition.mp3');
          audio.src = currentSrc;
          await audio.play();
          console.warn('[audio] veto.mp3 not found; fell back to competition.mp3');
          return;
        } catch {}
      }
      console.warn('[audio] play failed:', e);
    }
  }

  function playMusicForPhase(phaseOrEvent){
    // Phase first
    const phaseTrack = mapPhase(phaseOrEvent);
    if (phaseTrack !== null) { playFile(phaseTrack); return; }
    // Event
    const k = String(phaseOrEvent||'').toLowerCase().replace(/\s+/g,'_');
    const evFile = EVENT_TO_TRACK[k];
    if (evFile) { playFile(evFile); return; }
    // Unknown: stop
    stopMusic();
  }

  function musicCue(eventName){ playMusicForPhase(String(eventName||'').toLowerCase()); }

  // Wrap setPhase so any phase change swaps music (covers skipping)
  (function wrapSetPhase(){
    const sp = g.setPhase;
    if (typeof sp !== 'function' || sp.__musicWrapped) return;
    function wrapped(phase, seconds, onTimeout){
      // call original first to keep timing accurate
      const r = sp.apply(this, arguments);
      try { playMusicForPhase(phase); } catch(e){ console.warn('[audio] phase hook error', e); }
      return r;
    }
    wrapped.__musicWrapped = true;
    g.setPhase = wrapped;
  })();

  // Start button -> intro during cast presentation (in addition to opening phase hook)
  (function wireStartButton(){
    function bind(){
      const btn = document.getElementById('btnStartQuick') || document.getElementById('btnStart');
      if (btn && !btn.__musicWired){
        btn.__musicWired = true;
        btn.addEventListener('click', ()=> playMusicForPhase('opening'));
      }
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once:true });
    else bind();
  })();

  // Cue events via CustomEvents if the app dispatches them
  window.addEventListener('bb:eviction:announced', ()=>musicCue('eviction'));
  window.addEventListener('bb:twist', ()=>musicCue('twist'));
  window.addEventListener('bb:jury:return', ()=>musicCue('twist'));
  window.addEventListener('bb:finale:final_jury_vote', ()=>musicCue('final_jury_vote'));
  window.addEventListener('bb:finale:winner', ()=>musicCue('winner'));

  // Fallback: detect from reveal cards (title keywords)
  function tryCardCue(title){
    const t = String(title||'').toLowerCase();
    if (!t) return;
    if (t.includes('winner')) return musicCue('winner');
    if (t.includes('final jury vote')) return musicCue('final_jury_vote');
    if (t.includes('double') || t.includes('triple') || t.includes('jury return')) return musicCue('twist');
    if (t.includes('evicted') || t.includes('eviction')) return musicCue('eviction');
  }

  // Wrap global/UI showCard to sniff titles (non-breaking)
  (function wrapCards(){
    const tryWrap = (host, key)=>{
      const fn = host && host[key];
      if (typeof fn === 'function' && !fn.__musicWrapped){
        host[key] = function(title){
          try { tryCardCue(title); } catch {}
          return fn.apply(this, arguments);
        };
        host[key].__musicWrapped = true;
      }
    };
    // Now and on DOM ready (UI may attach later)
    tryWrap(g, 'showCard');
    tryWrap(g.UI||g, 'showCard');
    const id = setInterval(()=>{ tryWrap(g, 'showCard'); tryWrap(g.UI||g, 'showCard'); }, 1000);
    setTimeout(()=>clearInterval(id), 8000);
  })();

  // Public API
  g.playMusicForPhase = playMusicForPhase;
  g.stopMusic = stopMusic;
  g.musicCue = musicCue;
  g.setMusicVolume = setMusicVolume;

  console.info('[audio] ready (phase-wrapped, events+cues, local mp3s)');

})(window);