// MODULE: js/ui/introHubSfx.js
// WebAudio-first SFX module for Intro Hub button interactions
// Provides low-latency click sounds using WebAudio API with HTMLAudio fallback
// Respects global sfxOn setting and mute state

(function(g){
  'use strict';
  
  // Prefer WAV for faster decode, fallback to MP3
  const CLICK_WAV = 'audio/mouse-click.wav';
  const CLICK_MP3 = 'audio/mouse-click-290204.mp3';
  
  let ctx = null;
  let clickBuffer = null;
  let clickEl = null; // HTMLAudio fallback
  let enabled = true;
  let initialized = false;
  let warnedClick = false;
  let useWebAudio = true;
  let userGestureReceived = false; // Track if user has interacted

  /**
   * Initialize the SFX module
   * NOTE: AudioContext creation is deferred until first user gesture to avoid autoplay warnings
   */
  function init(){
    if(initialized) return;
    
    // Do NOT create AudioContext here - defer until user gesture
    // ctx will be created lazily in getCtx() when needed
    
    // Create HTMLAudio fallback
    clickEl = new Audio(CLICK_MP3);
    clickEl.preload = 'auto';
    clickEl.volume = 0.85;
    
    try {
      clickEl.load();
    } catch(e) {
      // Ignore load errors
    }
    
    // Sync enabled state with global config
    syncEnabled();
    
    // Wire up event listener for sound toggle and consent
    wireBridge();
    
    // Try to load and decode buffer proactively if consent already granted
    // This will only create AudioContext if user has already interacted
    tryLoadBuffer();
    
    initialized = true;
    console.info('[IntroHubSfx] Initialized (WebAudio deferred until user gesture, HTMLAudio fallback)');
  }

  /**
   * Get or create WebAudio context (lazily, after user gesture)
   * Returns null if no user gesture has been received yet
   */
  function getCtx(){
    if (!ctx && userGestureReceived) {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        console.info('[IntroHubSfx] AudioContext created after user gesture');
      } catch(e) {
        console.warn('[IntroHubSfx] Failed to create AudioContext:', e);
        ctx = null;
      }
    }
    return ctx;
  }

  /**
   * Try to load and decode audio buffer
   * Prefers WAV for faster decode, falls back to MP3
   */
  async function tryLoadBuffer(){
    const ac = getCtx();
    if (!ac || clickBuffer) return; // Already loaded or no context
    
    // Check if consent granted
    let consentGranted = false;
    try {
      const consent = localStorage.getItem('bb_sound_consent');
      consentGranted = consent === '1';
    } catch(e) {
      // Ignore localStorage errors
    }
    
    if (!consentGranted) {
      console.info('[IntroHubSfx] Consent not granted, deferring buffer load');
      return;
    }
    
    // Try WAV first
    try {
      const response = await fetch(CLICK_WAV);
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        clickBuffer = await ac.decodeAudioData(arrayBuffer);
        console.info('[IntroHubSfx] WAV buffer loaded and decoded');
        useWebAudio = true;
        return;
      }
    } catch(e) {
      console.info('[IntroHubSfx] WAV load failed, trying MP3 fallback:', e.message);
    }
    
    // Fallback to MP3
    try {
      const response = await fetch(CLICK_MP3);
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        clickBuffer = await ac.decodeAudioData(arrayBuffer);
        console.info('[IntroHubSfx] MP3 buffer loaded and decoded');
        useWebAudio = true;
        return;
      }
    } catch(e) {
      console.warn('[IntroHubSfx] MP3 buffer decode failed, will use HTMLAudio fallback:', e.message);
      useWebAudio = false;
    }
  }

  /**
   * Sync enabled state with global config
   * Checks sfxOn setting and mute state
   */
  function syncEnabled(){
    const cfg = (g.game && g.game.cfg) || g.cfg || {};
    const sfxOn = cfg.sfxOn !== false; // default true
    const muted = typeof g.getMuted === 'function' ? g.getMuted() : false;
    enabled = sfxOn && !muted;
    if (console.debug) console.debug('[IntroHubSfx] Synced enabled state:', { sfxOn, muted, enabled });
  }

  /**
   * Wire up event bridge for sound toggle and consent
   * Listens for introHubSfx custom event and bb:sound-consent-granted
   */
  function wireBridge(){
    // Listen for custom event dispatched when sound is toggled
    document.addEventListener('introHubSfx', syncEnabled);
    
    // Listen for consent granted event
    const consentHandler = async () => {
      console.info('[IntroHubSfx] Sound consent granted, syncing state and loading buffer');
      syncEnabled();
      
      // Resume WebAudio context if it was suspended
      const ac = getCtx();
      if (ac && ac.state === 'suspended') {
        try {
          await ac.resume();
          console.info('[IntroHubSfx] WebAudio context resumed');
        } catch(err) {
          console.warn('[IntroHubSfx] Failed to resume WebAudio context:', err);
        }
      }
      
      // Load and decode buffer now that consent is granted
      await tryLoadBuffer();
    };
    
    window.addEventListener('bb:sound-consent-granted', consentHandler);
    document.addEventListener('bb:sound-consent-granted', consentHandler);
    
    // Cheap fallback: periodic sync every 4 seconds
    if(!g.__introHubSfxPoll){
      g.__introHubSfxPoll = setInterval(syncEnabled, 4000);
    }
  }

  /**
   * Play click sound using WebAudio (low latency) or HTMLAudio fallback
   */
  function playClick(){
    if (!enabled) return;
    
    // Mark that user has interacted (enables AudioContext creation)
    if (!userGestureReceived) {
      userGestureReceived = true;
      console.info('[IntroHubSfx] User gesture received, AudioContext now permitted');
    }
    
    const ac = getCtx();
    
    // Try WebAudio first (low latency)
    if (useWebAudio && ac && clickBuffer) {
      try {
        const source = ac.createBufferSource();
        const gainNode = ac.createGain();
        gainNode.gain.value = 0.85;
        source.buffer = clickBuffer;
        source.connect(gainNode);
        gainNode.connect(ac.destination);
        source.start(0);
        return;
      } catch(e) {
        if (!warnedClick) {
          console.warn('[IntroHubSfx] WebAudio playback failed, falling back to HTMLAudio:', e.message);
          warnedClick = true;
        }
      }
    }
    
    // Fallback to HTMLAudio
    if (clickEl) {
      try {
        clickEl.currentTime = 0;
        const p = clickEl.play();
        if (p && p.catch) {
          p.catch((err) => {
            if (!warnedClick) {
              console.info('[IntroHubSfx] HTMLAudio playback blocked or failed:', err.message);
              warnedClick = true;
            }
          });
        }
      } catch(e) {
        if (!warnedClick) {
          console.warn('[IntroHubSfx] HTMLAudio playback exception:', e.message);
          warnedClick = true;
        }
      }
    }
  }

  /**
   * Attach SFX listeners to all buttons in root element
   * @param {HTMLElement} root - Root element containing buttons
   */
  function attach(root){
    init();
    
    if(!root) return;
    
    // Find all button elements
    const buttons = root.querySelectorAll('button');
    
    // Attach listeners to each button
    let bound = 0;
    buttons.forEach(btn => {
      // Skip if already attached
      if(btn.__hubSfxBound) return;
      
      // Mark as attached
      btn.__hubSfxBound = true;
      
      // Use pointerdown for immediate feedback (lower latency than click)
      btn.addEventListener('pointerdown', playClick, {passive: true});
      
      bound++;
    });
    
    console.info(`[IntroHubSfx] Attached to ${bound} buttons (using pointerdown for low latency)`);
  }

  // Public API
  g.IntroHubSfx = {
    attach: attach,
    sync: syncEnabled
  };
  
  console.info('[IntroHubSfx] Module loaded');

})(window);
