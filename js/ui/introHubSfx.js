// MODULE: js/ui/introHubSfx.js
// Lightweight SFX module for Intro Hub button interactions
// Provides hover and click sounds for all Intro Hub buttons
// Respects global sfxOn setting and mute state

(function(g){
  'use strict';
  
  const CLICK_SRC = 'audio/mouse-click-290204.mp3';
  const HOVER_SRC = CLICK_SRC; // reuse at lower volume
  
  let hoverEl = null;
  let clickEl = null;
  let enabled = true;
  let initialized = false;
  let warnedHover = false;
  let warnedClick = false;
  let ctx = null;

  /**
   * Initialize the SFX module
   * Creates audio elements and sets up listeners
   */
  function init(){
    if(initialized) return;
    
    // Create hover audio element
    hoverEl = new Audio(HOVER_SRC);
    hoverEl.preload = 'auto';
    hoverEl.volume = 0.35;
    
    // Create click audio element
    clickEl = new Audio(CLICK_SRC);
    clickEl.preload = 'auto';
    clickEl.volume = 0.85;
    
    // Preload both
    try {
      hoverEl.load();
      clickEl.load();
    } catch(e) {
      // Ignore load errors
    }
    
    // Sync enabled state with global config
    syncEnabled();
    
    // Wire up event listener for sound toggle
    wireBridge();
    
    // Listen for sound consent event to create WebAudio context
    document.addEventListener('bb:sound-consent-granted', () => {
      console.info('[IntroHubSfx] Sound consent granted, resuming WebAudio context');
      const ac = getCtx();
      if (ac && ac.state === 'suspended') {
        ac.resume().catch(() => {});
      }
    }, { once: true });
    
    initialized = true;
    console.info('[IntroHubSfx] Initialized (hover & click SFX ready)');
  }

  /**
   * Get or create WebAudio context for beep fallback
   */
  function getCtx(){
    if (!ctx) {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch(e) {
        ctx = null;
      }
    }
    return ctx;
  }

  /**
   * Generate a beep using WebAudio (fallback when asset unavailable)
   */
  function beep(freq=880, duration=0.05, gain=0.05){
    const ac = getCtx();
    if (!ac || !enabled) return;
    
    const osc = ac.createOscillator();
    const gnode = ac.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gnode.gain.value = gain;
    osc.connect(gnode);
    gnode.connect(ac.destination);
    const now = ac.currentTime;
    osc.start(now);
    osc.stop(now + duration);
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
   * Wire up event bridge for sound toggle
   * Listens for introHubSfx custom event
   */
  function wireBridge(){
    // Listen for custom event dispatched when sound is toggled
    document.addEventListener('introHubSfx', syncEnabled);
    
    // Cheap fallback: periodic sync every 4 seconds
    if(!g.__introHubSfxPoll){
      g.__introHubSfxPoll = setInterval(syncEnabled, 4000);
    }
  }

  /**
   * Try to play an audio element, with beep fallback if blocked
   * @param {HTMLAudioElement} el - Audio element to play
   * @param {string} label - 'hover' or 'click' for logging
   */
  function tryPlay(el, label){
    if(!enabled || !el) return true;
    
    try {
      el.currentTime = 0;
      const p = el.play();
      if (p && p.catch) {
        p.catch(() => {
          if (label === 'hover' && !warnedHover) {
            console.info('[IntroHubSfx] Hover SFX not available:', HOVER_SRC);
            warnedHover = true;
          }
          if (label === 'click' && !warnedClick) {
            console.info('[IntroHubSfx] Click SFX not available:', CLICK_SRC);
            warnedClick = true;
          }
          // Play beep fallback
          if (enabled) {
            if (label === 'hover') beep(1200, 0.03, 0.03);
            else beep(600, 0.05, 0.06);
          }
        });
      }
      return true;
    } catch(e) {
      // Play beep fallback on exception
      if (enabled) {
        if (label === 'hover') beep(1200, 0.03, 0.03);
        else beep(600, 0.05, 0.06);
      }
      return false;
    }
  }

  /**
   * Play hover sound
   */
  function playHover(){
    tryPlay(hoverEl, 'hover');
  }

  /**
   * Play click sound
   */
  function playClick(){
    tryPlay(clickEl, 'click');
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
      
      // Attach hover listeners
      btn.addEventListener('mouseenter', playHover);
      btn.addEventListener('focus', playHover);
      
      // Attach click listeners
      btn.addEventListener('click', playClick, {capture: true});
      btn.addEventListener('touchend', playClick, {passive: true});
      
      bound++;
    });
    
    console.info(`[IntroHubSfx] Attached to ${bound} buttons`);
  }

  // Public API
  g.IntroHubSfx = {
    attach: attach,
    sync: syncEnabled
  };
  
  console.info('[IntroHubSfx] Module loaded');

})(window);
