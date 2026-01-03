// MODULE: sfx-player.js
// Lightweight SFX player that doesn't interfere with background music
// Provides non-blocking sound effect playback with volume control

(function(global) {
  'use strict';

  // Default configuration
  const DEFAULT_VOLUME = 0.7;
  const MAX_CONCURRENT_SOUNDS = 10; // Prevent audio spam
  
  // Active audio elements pool
  const activeAudio = new Set();

  /**
   * Clean up finished audio elements
   * Removes ended audio from the active pool
   */
  function cleanupAudio(audio) {
    try {
      activeAudio.delete(audio);
      // Remove element from DOM if it was added
      if (audio.parentNode) {
        audio.parentNode.removeChild(audio);
      }
    } catch (e) {
      // Ignore cleanup errors
    }
  }

  /**
   * Check if SFX playback is allowed
   * @returns {boolean}
   */
  function canPlaySfx() {
    try {
      // Check SFX enabled flag
      const cfg = (global.game && global.game.cfg) || global.cfg || {};
      if (cfg.sfxOn === false) {
        return false;
      }

      // Check global mute state
      if (global.getMuted && global.getMuted()) {
        return false;
      }

      // Check if we've hit concurrent sound limit
      if (activeAudio.size >= MAX_CONCURRENT_SOUNDS) {
        console.debug('[sfx-player] Max concurrent sounds reached, skipping');
        return false;
      }

      return true;
    } catch (e) {
      console.warn('[sfx-player] canPlaySfx check failed:', e);
      return false;
    }
  }

  /**
   * Play a sound effect
   * Non-blocking, fire-and-forget playback
   * @param {string} src - Audio file path
   * @param {number} volume - Volume (0.0 to 1.0, default 0.7)
   * @param {object} options - Optional configuration
   * @param {boolean} options.loop - Loop the sound (default false)
   * @param {Function} options.onEnd - Callback when sound ends
   * @returns {HTMLAudioElement|null} - Audio element or null if playback blocked
   */
  function play(src, volume = DEFAULT_VOLUME, options = {}) {
    try {
      // Check if playback is allowed
      if (!canPlaySfx()) {
        return null;
      }

      // Validate source
      if (!src || typeof src !== 'string') {
        console.warn('[sfx-player] Invalid src:', src);
        return null;
      }

      // Create audio element
      const audio = new Audio();
      audio.src = src;
      audio.volume = Math.max(0, Math.min(1, volume));
      audio.loop = options.loop || false;

      // Add to active pool
      activeAudio.add(audio);

      // Set up cleanup
      const cleanup = () => {
        cleanupAudio(audio);
        if (options.onEnd && typeof options.onEnd === 'function') {
          try {
            options.onEnd();
          } catch (e) {
            console.warn('[sfx-player] onEnd callback error:', e);
          }
        }
      };

      audio.addEventListener('ended', cleanup, { once: true });
      audio.addEventListener('error', (e) => {
        console.debug('[sfx-player] Audio error for', src, ':', e.message || 'unknown error');
        cleanup();
      }, { once: true });

      // Attempt playback
      const playPromise = audio.play();
      
      if (playPromise && playPromise.catch) {
        playPromise.catch(err => {
          // Silently handle playback errors (autoplay blocked, file not found, etc.)
          const errStr = String(err.name || err.message || '');
          if (!/NotAllowedError|NotSupportedError/i.test(errStr)) {
            console.debug('[sfx-player] Playback failed for', src, ':', err.message || err);
          }
          cleanup();
        });
      }

      return audio;
    } catch (e) {
      console.warn('[sfx-player] play error:', e);
      return null;
    }
  }

  /**
   * Stop a specific sound effect
   * @param {HTMLAudioElement} audio - Audio element to stop
   */
  function stop(audio) {
    try {
      if (!audio || !(audio instanceof HTMLAudioElement)) {
        return;
      }

      audio.pause();
      audio.currentTime = 0;
      cleanupAudio(audio);
    } catch (e) {
      console.warn('[sfx-player] stop error:', e);
    }
  }

  /**
   * Stop all active sound effects
   */
  function stopAll() {
    try {
      const sounds = Array.from(activeAudio);
      sounds.forEach(audio => {
        try {
          audio.pause();
          audio.currentTime = 0;
        } catch (e) {
          // Ignore individual stop errors
        }
      });
      activeAudio.clear();
    } catch (e) {
      console.warn('[sfx-player] stopAll error:', e);
    }
  }

  /**
   * Get number of active sounds
   * @returns {number}
   */
  function getActiveCount() {
    return activeAudio.size;
  }

  /**
   * Set default volume for future sounds
   * Note: Does not affect currently playing sounds
   * @param {number} volume - Volume (0.0 to 1.0)
   */
  function setDefaultVolume(volume) {
    try {
      const vol = Math.max(0, Math.min(1, Number(volume) || DEFAULT_VOLUME));
      SfxPlayer.DEFAULT_VOLUME = vol;
      console.info('[sfx-player] Default volume set to', vol);
    } catch (e) {
      console.warn('[sfx-player] setDefaultVolume error:', e);
    }
  }

  // Export to global namespace
  const SfxPlayer = global.SfxPlayer = {
    play,
    stop,
    stopAll,
    getActiveCount,
    setDefaultVolume,
    canPlaySfx,
    DEFAULT_VOLUME,
    MAX_CONCURRENT_SOUNDS
  };

  console.info('[sfx-player] Initialized (max concurrent:', MAX_CONCURRENT_SOUNDS, ', default volume:', DEFAULT_VOLUME, ')');

})(window);
