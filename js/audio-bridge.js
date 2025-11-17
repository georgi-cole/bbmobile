// MODULE: audio-bridge.js
// Robust bridge ensuring window.game.audio always proxies to g.audio
// Solves race condition where IntroScreen toggles fail because window.game.audio is missing
// while g.audio exists. This creates a stable, always-available reference.

(function(g) {
  'use strict';

  // Ensure window.game exists
  if (!g.game) {
    g.game = {};
  }

  // Create a stable bridge object that proxies all methods to g.audio
  const bridge = {
    // Core playback methods
    playMusicForPhase(...args) {
      const fn = g.audio?.playMusicForPhase || g.playMusicForPhase;
      return typeof fn === 'function' ? fn(...args) : null;
    },
    playMusic(...args) {
      const fn = g.audio?.playMusic || g.playMusic;
      return typeof fn === 'function' ? fn(...args) : null;
    },
    phaseMusic(...args) {
      const fn = g.audio?.phaseMusic || g.phaseMusic;
      return typeof fn === 'function' ? fn(...args) : null;
    },
    stopMusic(...args) {
      const fn = g.audio?.stopMusic || g.stopMusic;
      return typeof fn === 'function' ? fn(...args) : null;
    },
    setMusicVolume(...args) {
      const fn = g.audio?.setMusicVolume || g.setMusicVolume;
      return typeof fn === 'function' ? fn(...args) : null;
    },
    fadeOutMusic(...args) {
      const fn = g.audio?.fadeOutMusic || g.fadeOutMusic;
      return typeof fn === 'function' ? fn(...args) : null;
    },
    
    // Mute/unmute methods
    setMuted(...args) {
      const fn = g.audio?.setMuted || g.setMuted;
      return typeof fn === 'function' ? fn(...args) : null;
    },
    toggleMute(...args) {
      const fn = g.audio?.toggleMute || g.toggleMute;
      return typeof fn === 'function' ? fn(...args) : null;
    },
    getMuted(...args) {
      const fn = g.audio?.getMuted || g.getMuted;
      return typeof fn === 'function' ? fn(...args) : false;
    },
    
    // Music enable/disable methods
    setMusicEnabled(...args) {
      const fn = g.audio?.setMusicEnabled || g.setMusicEnabled;
      return typeof fn === 'function' ? fn(...args) : null;
    },
    toggleMusic(...args) {
      const fn = g.audio?.toggleMusic || g.toggleMusic;
      return typeof fn === 'function' ? fn(...args) : null;
    },
    getMusicEnabled(...args) {
      const fn = g.audio?.getMusicEnabled || g.getMusicEnabled;
      return typeof fn === 'function' ? fn(...args) : true;
    },
    
    // SFX enable/disable methods
    setSfxEnabled(...args) {
      const fn = g.audio?.setSfxEnabled || g.setSfxEnabled;
      return typeof fn === 'function' ? fn(...args) : null;
    },
    toggleSound(...args) {
      const fn = g.audio?.toggleSound || g.toggleSound;
      return typeof fn === 'function' ? fn(...args) : null;
    },
    getSfxEnabled(...args) {
      const fn = g.audio?.getSfxEnabled || g.getSfxEnabled;
      return typeof fn === 'function' ? fn(...args) : true;
    },
    
    // Intro hub music methods
    playIntroHubMusic(...args) {
      const fn = g.audio?.playIntroHubMusic || g.playIntroHubMusic;
      return typeof fn === 'function' ? fn(...args) : null;
    },
    stopIntroHubMusic(...args) {
      const fn = g.audio?.stopIntroHubMusic || g.stopIntroHubMusic;
      return typeof fn === 'function' ? fn(...args) : null;
    }
  };

  // Set bridge on window.game.audio
  g.game.audio = bridge;

  // Backfill g.audio if it doesn't exist (for consistency)
  // This ensures both g.audio and g.game.audio work
  if (!g.audio) {
    g.audio = bridge;
  }

  console.info('[audio-bridge] Initialized (window.game.audio bridged to g.audio)');

})(window);
