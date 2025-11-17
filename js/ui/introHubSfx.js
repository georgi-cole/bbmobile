// MODULE: js/ui/introHubSfx.js
// Lightweight SFX module for Intro Hub button interactions
// Provides hover and click sounds for all Intro Hub buttons
// Respects global sfxOn setting and mute state

(function(g){
  'use strict';
  
  const HOVER_SRC = 'audio/ui_hover.mp3';
  const CLICK_SRC = 'audio/ui_click.mp3';
  
  let hoverEl = null;
  let clickEl = null;
  let enabled = true;
  let initialized = false;

  /**
   * Initialize the SFX module
   * Creates audio elements and sets up listeners
   */
  function init(){
    if(initialized) return;
    
    // Create hover audio element
    hoverEl = new Audio(HOVER_SRC);
    hoverEl.preload = 'auto';
    hoverEl.volume = 0.75;
    
    // Create click audio element
    clickEl = new Audio(CLICK_SRC);
    clickEl.preload = 'auto';
    clickEl.volume = 0.9;
    
    // Sync enabled state with global config
    syncEnabled();
    
    // Wire up event listener for sound toggle
    wireBridge();
    
    initialized = true;
    console.info('[IntroHubSfx] Initialized (hover & click SFX ready)');
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
    console.info(`[IntroHubSfx] Synced enabled state: sfxOn=${sfxOn}, muted=${muted}, enabled=${enabled}`);
  }

  /**
   * Wire up event bridge for sound toggle
   * Listens for introHubSfx custom event
   */
  function wireBridge(){
    // Listen for custom event dispatched when sound is toggled
    document.addEventListener('introHubSfx', syncEnabled);
    
    // Cheap fallback: periodic sync every 4 seconds
    setInterval(syncEnabled, 4000);
  }

  /**
   * Play an audio element if enabled
   * @param {HTMLAudioElement} el - Audio element to play
   */
  function play(el){
    if(!enabled || !el) return;
    
    try{
      el.currentTime = 0;
      el.play().catch(() => {
        // Gracefully ignore play errors (autoplay blocked, etc.)
      });
    } catch(_) {
      // Gracefully ignore exceptions
    }
  }

  /**
   * Play hover sound
   */
  function playHover(){
    play(hoverEl);
  }

  /**
   * Play click sound
   */
  function playClick(){
    play(clickEl);
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
    buttons.forEach(btn => {
      // Skip if already attached
      if(btn.__hubSfx) return;
      
      // Mark as attached
      btn.__hubSfx = true;
      
      // Attach hover listeners
      btn.addEventListener('mouseenter', playHover);
      btn.addEventListener('focus', playHover);
      
      // Attach click listeners
      btn.addEventListener('click', playClick, {capture: true});
      btn.addEventListener('touchend', playClick, {passive: true});
    });
    
    console.info(`[IntroHubSfx] Attached to ${buttons.length} buttons`);
  }

  // Public API
  g.IntroHubSfx = {
    attach: attach,
    sync: syncEnabled
  };
  
  console.info('[IntroHubSfx] Module loaded');

})(window);
