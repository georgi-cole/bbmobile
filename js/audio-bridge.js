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
      return typeof g.playMusicForPhase === 'function' ? g.playMusicForPhase(...args) : null;
    },
    playMusic(...args) {
      return typeof g.playMusic === 'function' ? g.playMusic(...args) : null;
    },
    phaseMusic(...args) {
      return typeof g.phaseMusic === 'function' ? g.phaseMusic(...args) : null;
    },
    stopMusic(...args) {
      return typeof g.stopMusic === 'function' ? g.stopMusic(...args) : null;
    },
    setMusicVolume(...args) {
      return typeof g.setMusicVolume === 'function' ? g.setMusicVolume(...args) : null;
    },
    fadeOutMusic(...args) {
      return typeof g.fadeOutMusic === 'function' ? g.fadeOutMusic(...args) : null;
    },
    
    // Mute/unmute methods
    setMuted(...args) {
      return typeof g.setMuted === 'function' ? g.setMuted(...args) : null;
    },
    toggleMute(...args) {
      return typeof g.toggleMute === 'function' ? g.toggleMute(...args) : null;
    },
    getMuted(...args) {
      return typeof g.getMuted === 'function' ? g.getMuted(...args) : false;
    },
    
    // Music enable/disable methods
    setMusicEnabled(...args) {
      return typeof g.setMusicEnabled === 'function' ? g.setMusicEnabled(...args) : null;
    },
    toggleMusic(...args) {
      return typeof g.toggleMusic === 'function' ? g.toggleMusic(...args) : null;
    },
    getMusicEnabled(...args) {
      return typeof g.getMusicEnabled === 'function' ? g.getMusicEnabled(...args) : true;
    },
    
    // SFX enable/disable methods
    setSfxEnabled(...args) {
      return typeof g.setSfxEnabled === 'function' ? g.setSfxEnabled(...args) : null;
    },
    toggleSound(...args) {
      return typeof g.toggleSound === 'function' ? g.toggleSound(...args) : null;
    },
    getSfxEnabled(...args) {
      return typeof g.getSfxEnabled === 'function' ? g.getSfxEnabled(...args) : true;
    },
    
    // Intro hub music methods
    playIntroHubMusic(...args) {
      return typeof g.playIntroHubMusic === 'function' ? g.playIntroHubMusic(...args) : null;
    },
    stopIntroHubMusic(...args) {
      return typeof g.stopIntroHubMusic === 'function' ? g.stopIntroHubMusic(...args) : null;
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
