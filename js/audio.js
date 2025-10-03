// Audio phase-to-track mapping, local MP3 only, no YouTube.
// Place audio files in /audio as shown in your repo.
// Expose: window.playMusicForPhase(phaseOrEvent), window.stopMusic(), window.unlockMusicForAutoplay()

(function (g) {
  'use strict';

  // Folder and filenames (case-sensitive on many hosts)
  const BASE = 'audio/';
  const TRACKS = {
    intro: 'intro.mp3',
    hoh: 'competition.mp3',
    'hoh comp': 'competition.mp3',
    competition: 'competition.mp3',
    nominations: 'nominations.mp3',
    nomination: 'nominations.mp3',
    veto: 'veto.mp3',
    'veto comp': 'veto.mp3',
    'veto competition': 'veto.mp3',
    'live vote': 'live vote.mp3',
    eviction: 'eviction.mp3',
    twist: 'twist.mp3',
    double: 'twist.mp3',
    triple: 'twist.mp3',
    'jury return': 'twist.mp3',
    'final jury vote': 'final jury vote.mp3',
    finale: 'victory.mp3',
    victory: 'victory.mp3',
    winner: 'victory.mp3'
  };

  // Fuzzy mapping for events
  function matchTrack(phase) {
    const k = String(phase||'').toLowerCase().trim();
    // Direct match
    if (TRACKS[k]) return TRACKS[k];

    // Fuzzy
    if (k.includes('intro') || k.includes('opening') || k.includes('start')) return TRACKS.intro;
    if (k.includes('hoh')) return TRACKS.hoh;
    if (k.includes('comp')) return TRACKS.competition;
    if (k.includes('veto')) return TRACKS.veto;
    if (k.includes('nom')) return TRACKS.nominations;
    if (k.includes('live')) return TRACKS['live vote'];
    if (k.includes('evict')) return TRACKS.eviction;
    if (k.includes('twist') || k.includes('double') || k.includes('triple') || k.includes('jury return')) return TRACKS.twist;
    if (k.includes('final') && k.includes('jury')) return TRACKS['final jury vote'];
    if (k.includes('victory') || k.includes('winner') || k.includes('finale')) return TRACKS.victory;

    return null;
  }

  // Internal: single audio element, unlock on gesture
  let audioEl = null, unlocked = false, pendingTrack = null;

  function ensureAudioEl() {
    if (audioEl) return audioEl;
    audioEl = document.createElement('audio');
    audioEl.id = 'gameMusicAudio';
    audioEl.style.display = 'none';
    audioEl.preload = 'auto';
    audioEl.autoplay = false;
    audioEl.loop = true;
    document.body.appendChild(audioEl);
    return audioEl;
  }

  function unlockMusicForAutoplay() {
    if (unlocked) return;
    unlocked = true;
    document.removeEventListener('pointerdown', unlockMusicForAutoplay);
    document.removeEventListener('keydown', unlockMusicForAutoplay);
    if (pendingTrack) {
      playMusicForPhase(pendingTrack);
      pendingTrack = null;
    }
  }

  function playMusicForPhase(phase) {
    const track = matchTrack(phase);
    if (!track) { stopMusic(); return; }
    const el = ensureAudioEl();
    const src = BASE + encodeURIComponent(track);
    if (el.src.endsWith(src) && !el.paused) return; // already playing

    if (!unlocked) {
      pendingTrack = phase;
      document.addEventListener('pointerdown', unlockMusicForAutoplay, { once: true, passive: true });
      document.addEventListener('keydown', unlockMusicForAutoplay, { once: true });
      return;
    }

    el.pause(); el.removeAttribute('src'); el.load();
    el.src = src;
    el.loop = true;
    el.currentTime = 0;
    el.volume = 1.0;
    el.play().catch(()=>{});
  }

  function stopMusic() {
    if (audioEl) { audioEl.pause(); audioEl.removeAttribute('src'); audioEl.load(); }
  }

  // Optional: Callbacks for your code
  g.playMusicForPhase = playMusicForPhase;
  g.stopMusic = stopMusic;
  g.unlockMusicForAutoplay = unlockMusicForAutoplay;

  // --- WIRING: Patch your game events below as needed ---

  // 1. Play intro.mp3 when Start is clicked and cast is presented
  // (Assume #btnStartQuick is the start button)
  document.addEventListener('DOMContentLoaded', ()=>{
    const btn=document.getElementById('btnStartQuick');
    if(btn && !btn.__musicWired){
      btn.__musicWired=true;
      btn.addEventListener('click', ()=>playMusicForPhase('intro'));
    }
  });

  // 2. HOH competition: play competition.mp3
  if (!g.__musicHOHPatched && g.startHOH) {
    const origHOH = g.startHOH;
    g.startHOH = function() {
      playMusicForPhase('hoh');
      return origHOH.apply(this, arguments);
    };
    g.__musicHOHPatched = true;
  }

  // 3. Nominations: play nominations.mp3
  if (!g.__musicNomPatched && g.startNominations) {
    const origNom = g.startNominations;
    g.startNominations = function() {
      playMusicForPhase('nominations');
      return origNom.apply(this, arguments);
    };
    g.__musicNomPatched = true;
  }

  // 4. Veto comp: play veto.mp3
  if (!g.__musicVetoPatched && g.startVetoComp) {
    const origVeto = g.startVetoComp;
    g.startVetoComp = function() {
      playMusicForPhase('veto');
      return origVeto.apply(this, arguments);
    };
    g.__musicVetoPatched = true;
  }

  // 5. Live vote: play live vote.mp3
  if (!g.__musicLiveVotePatched && g.startLiveVote) {
    const origLiveVote = g.startLiveVote;
    g.startLiveVote = function() {
      playMusicForPhase('live vote');
      return origLiveVote.apply(this, arguments);
    };
    g.__musicLiveVotePatched = true;
  }

  // 6. Eviction: play eviction.mp3 (call when evictee is announced)
  // If you have a function like announceEvictee or similar, patch here.
  // Example:
  // if (!g.__musicEvictPatched && g.announceEvictee) {
  //   const origEvict = g.announceEvictee;
  //   g.announceEvictee = function() {
  //     playMusicForPhase('eviction');
  //     return origEvict.apply(this, arguments);
  //   };
  //   g.__musicEvictPatched = true;
  // }

  // 7. Twists: listen for double/triple/jury-return events, or call playMusicForPhase('twist') when fired.

  // 8. Final jury vote: play final jury vote.mp3
  // Patch your function for final jury vote phase if needed.

  // 9. Winner announcement: play victory.mp3
  // Patch your winner-reveal code to call playMusicForPhase('victory')

  // --- END PATCHING ---

  console.info('[audio] ready (local mp3, phase-mapped)');

})(window);