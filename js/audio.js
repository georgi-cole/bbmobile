// Audio: local MP3s only, auto-switch on phase changes and on special events.
// Now supports raw filenames (e.g., "intro.mp3") and fixes first-click debug play.
// Exposes:
//  - window.playMusicForPhase(nameOrFilename)
//  - window.stopMusic()
//  - window.musicCue(eventName)  // 'eviction' | 'twist' | 'final_jury_vote' | 'winner'
//  - window.setMusicVolume(v)    // 0..1
//  - window.phaseMusic(phase)    // compat alias
//  - window.playMusic(nameOrFilename) // compat alias
//
// Behavior:
//  - Wraps setPhase so every phase change stops current audio and plays mapped track (covers skips).
//  - Detects eviction/twist/final jury/winner via CustomEvents or reveal card titles.
//  - First playback is unlocked by the browser on user gesture; we now try to play immediately and only defer if blocked.

(function(g){
  'use strict';

  const BASE = ((g.MUSIC_BASE || 'audio/').replace(/^\/*/,'').replace(/\/*$/,'')) + '/';

  // Phase mapping
  const PHASE_TO_TRACK = {
    opening: 'intro.mp3',
    intermission: null,
    social: 'social.mp3',
    social_intermission: 'social.mp3',
    hoh: 'competition.mp3',
    hoh_comp: 'competition.mp3',
    competition: 'competition.mp3',
    nominations: 'nominations.mp3',
    nomination: 'nominations.mp3',
    veto_comp: 'veto.mp3',
    veto: 'veto.mp3',
    livevote: 'live vote.mp3',
    'live vote': 'live vote.mp3',
    jury: null,
    finale: null
  };

  // Event mapping
  const EVENT_TO_TRACK = {
    eviction: 'eviction.mp3',
    twist: 'twist.mp3',
    final_jury_vote: 'final jury vote.mp3',
    winner: 'victory.mp3'
  };

  function mapPhase(phase){
    const k = String(phase||'').toLowerCase();
    if (k in PHASE_TO_TRACK) return PHASE_TO_TRACK[k];
    if (k.includes('open')) return 'intro.mp3';
    if (k.includes('social')) return 'social.mp3';
    if (k.includes('hoh') || k.includes('comp')) return 'competition.mp3';
    if (k.includes('nom')) return 'nominations.mp3';
    if (k.includes('veto')) return 'veto.mp3';
    if (k.includes('live')) return 'live vote.mp3';
    return null;
  }

  // Support raw filenames as well as phase/event names
  function resolveToFile(nameOrFilename){
    if (!nameOrFilename) return null;
    const s = String(nameOrFilename).trim();
    // Raw filename support
    if (/\.mp3(\?.*)?$/i.test(s)) return s;
    // Try phase mapping
    const p = mapPhase(s);
    if (p) return p;
    // Try event mapping
    const ev = EVENT_TO_TRACK[s.toLowerCase().replace(/\s+/g,'_')];
    if (ev) return ev;
    return null;
  }

  let el = null, currentSrc = '', stopPending = false;
  function ensureEl(){
    if (el) return el;
    el = document.createElement('audio');
    el.id = 'bbMusic';
    el.style.display = 'none';
    el.preload = 'auto';
    el.loop = true;
    // Initialize with saved mute state
    try{
      const stored = localStorage.getItem('bb_soundMuted');
      if(stored === '1' || stored === 'true') el.muted = true;
    }catch{}
    document.body.appendChild(el);
    return el;
  }

  function setMusicVolume(v){
    const vol = Math.min(1, Math.max(0, Number(v)||0));
    if (el) el.volume = vol;
  }

  async function stopMusic(){
    if (!el) return;
    if (stopPending) return; // Prevent multiple simultaneous stops
    stopPending = true;
    
    const wasSrc = currentSrc;
    currentSrc = '';
    
    try { 
      el.pause(); 
      console.info(`[audio] stopped music, file=${wasSrc || 'none'}`);
    } catch(e) {
      console.warn('[audio] pause failed:', e);
    }
    
    // Small delay to ensure pause completes before clearing source
    await new Promise(resolve => setTimeout(resolve, 10));
    
    try { 
      el.removeAttribute('src'); 
      el.load(); 
    } catch(e) {
      console.warn('[audio] clear src failed:', e);
    }
    
    stopPending = false;
  }

  function srcFor(file){ return BASE + file.split('/').map(encodeURIComponent).join('/'); }

  // Try to play immediately; if NotAllowedError, attach one-time unlock to retry
  async function playFile(file){
    if (!file) { 
      await stopMusic(); 
      return; 
    }

    const audio = ensureEl();
    const full = srcFor(file);

    // If already playing the same track, don't restart
    if (currentSrc === full && !audio.paused) {
      console.info(`[audio] already playing file=${file}`);
      return;
    }

    // Always await stop before switching to prevent race condition
    await stopMusic();
    
    currentSrc = full;
    audio.src = full;
    audio.loop = true;
    audio.currentTime = 0;
    
    // Log music start attempt
    const muted = audio.muted || false;
    console.info(`[audio] starting music, muted=${muted}, file=${file}`);

    // Special handling for social.mp3: seek to 13s
    if (/social\.mp3$/i.test(file)) {
      const seekToThirteen = () => {
        try {
          if (audio.duration >= 13) {
            audio.currentTime = 13;
            console.info('[audio] seeked social.mp3 to 13s');
          }
        } catch (e) {
          console.warn('[audio] seek to 13s failed:', e);
        }
        audio.removeEventListener('loadedmetadata', seekToThirteen);
      };
      audio.addEventListener('loadedmetadata', seekToThirteen, { once: true });
    }

    try {
      await audio.play();
      console.info(`[audio] successfully started music, file=${file}`);
    } catch (e) {
      if (e && String(e.name).toLowerCase() === 'notallowederror') {
        // Browser blocked autoplay: retry on next gesture
        console.info('[audio] autoplay blocked, waiting for user gesture');
        const retry = async () => {
          document.removeEventListener('pointerdown', retry);
          document.removeEventListener('keydown', retry);
          try { 
            await audio.play(); 
            console.info(`[audio] successfully started after gesture, file=${file}`);
          }
          catch (err) { console.warn('[audio] play retry failed:', err); }
        };
        document.addEventListener('pointerdown', retry, { once:true, passive:true });
        document.addEventListener('keydown', retry, { once:true });
        return;
      }
      // Fallback if veto.mp3 missing: try competition.mp3
      if (/veto\.mp3$/i.test(file)) {
        try {
          currentSrc = srcFor('competition.mp3');
          audio.src = currentSrc;
          await audio.play();
          console.warn('[audio] veto.mp3 failed; fell back to competition.mp3');
          return;
        } catch {}
      }
      console.warn('[audio] play failed:', e);
    }
  }

  function playMusicForPhase(nameOrFilename){
    const file = resolveToFile(nameOrFilename);
    if (file === null) { stopMusic(); return; }
    playFile(file);
  }

  function musicCue(eventName){ playMusicForPhase(String(eventName||'').toLowerCase()); }

  // Wrap setPhase so any change swaps tracks (covers skips)
  (function wrapSetPhase(){
    const sp = g.setPhase;
    if (typeof sp !== 'function' || sp.__musicWrapped) return;
    function wrapped(phase, seconds, onTimeout){
      const r = sp.apply(this, arguments);
      try { playMusicForPhase(phase); } catch(e){ console.warn('[audio] phase hook error', e); }
      return r;
    }
    wrapped.__musicWrapped = true;
    g.setPhase = wrapped;
  })();

  // Start button -> intro during cast presentation
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

  // Custom events (optional)
  window.addEventListener('bb:eviction:announced', ()=>musicCue('eviction'));
  window.addEventListener('bb:twist', ()=>musicCue('twist'));
  window.addEventListener('bb:jury:return', ()=>musicCue('twist'));
  window.addEventListener('bb:finale:final_jury_vote', ()=>musicCue('final_jury_vote'));
  window.addEventListener('bb:finale:winner', ()=>musicCue('winner'));

  // Fallback: detect from reveal card titles
  function tryCardCue(title){
    const t = String(title||'').toLowerCase();
    if (!t) return;
    if (t.includes('winner')) return musicCue('winner');
    if (t.includes('final jury vote')) return musicCue('final_jury_vote');
    if (t.includes('double') || t.includes('triple') || t.includes('jury return')) return musicCue('twist');
    if (t.includes('evicted') || t.includes('eviction')) return musicCue('eviction');
  }
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
    tryWrap(g, 'showCard');
    tryWrap(g.UI||g, 'showCard');
    const id = setInterval(()=>{ tryWrap(g, 'showCard'); tryWrap(g.UI||g, 'showCard'); }, 800);
    setTimeout(()=>clearInterval(id), 8000);
  })();

  // Cheer SFX helper (placeholder for cheer.mp3)
  function playCheerSfx(){
    try {
      const sfx = new Audio(BASE + 'cheer.mp3');
      sfx.volume = 0.7;
      sfx.play().catch(e => {
        // Gracefully ignore if cheer.mp3 is missing or blocked
        console.info('[audio] cheer.mp3 not available or play blocked:', e.message || e);
      });
    } catch(e) {
      console.info('[audio] playCheerSfx error:', e.message || e);
    }
  }

  // Mute toggle functionality
  let isMuted = false;
  
  // Load mute state from localStorage
  try{
    const stored = localStorage.getItem('bb_soundMuted');
    if(stored === '1' || stored === 'true') isMuted = true;
  }catch{}
  
  function setMuted(muted){
    isMuted = !!muted;
    // Only set the muted property, don't pause/resume
    if(el){
      el.muted = isMuted;
    }
    // Persist to localStorage
    try{
      localStorage.setItem('bb_soundMuted', isMuted ? '1' : '0');
    }catch{}
    console.info(`[audio] muted=${isMuted}`);
    return isMuted;
  }
  
  function toggleMute(){
    return setMuted(!isMuted);
  }
  
  function getMuted(){
    return isMuted;
  }
  
  // Fade out helper
  async function fadeOut(duration = 1000){
    if(!el || !el.src) return;
    console.info(`[audio] fading out over ${duration}ms`);
    const startVol = el.volume;
    const startTime = Date.now();
    
    return new Promise(async resolve => {
      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(1, elapsed / duration);
        el.volume = startVol * (1 - progress);
        if(progress >= 1){
          clearInterval(interval);
          stopMusic().then(() => {
            el.volume = startVol; // Restore volume
            resolve();
          });
        }
      }, 50);
    });
  }

  // Compat aliases and public API
  g.playMusicForPhase = playMusicForPhase;
  g.stopMusic = stopMusic;
  g.musicCue = musicCue;
  g.setMusicVolume = setMusicVolume;
  g.phaseMusic = playMusicForPhase;  // compat
  g.playMusic = playMusicForPhase;   // accept filename or phase
  g.playCheerSfx = playCheerSfx;     // public cheer helper
  g.setMuted = setMuted;
  g.toggleMute = toggleMute;
  g.getMuted = getMuted;
  g.fadeOutMusic = fadeOut;

  console.info('[audio] ready (phase-wrapped, filename+phase inputs, immediate-play with gesture fallback)');

})(window);