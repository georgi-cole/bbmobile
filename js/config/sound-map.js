// MODULE: config/sound-map.js
// Central sound file mapping and SFX helper functions
// Maps all game events to audio files with flexible format support

(function(global) {
  'use strict';

  const AUDIO_BASE = ((global.MUSIC_BASE || 'audio/').replace(/^\/*/,'').replace(/\/*$/,'')) + '/';
  const SFX_BASE = AUDIO_BASE + 'sfx/';

  // Supported audio extensions (in priority order)
  const AUDIO_EXTENSIONS = ['mp3', 'mp4', 'wav', 'ogg', 'm4a'];

  /**
   * Background Music Tracks (Looping)
   * These are played by the main audio.js system
   */
  const MUSIC_MAP = {
    // Phase music
    intro: 'intro.mp3',
    intro_hub: 'Intro Hub music.mp3',
    social: 'social.mp3',
    competition: 'competition.mp3',
    nominations: 'nominations.mp3',
    veto: 'veto.mp3',
    live_vote: 'live vote.mp3',
    eviction: 'eviction.mp3',
    twist: 'twist.mp3',
    final_jury_vote: 'final jury vote.mp3',
    victory: 'victory.mp3',
    cheer: 'cheer.mp3',
    fan_favorite: 'fan_favorite.mp3'
  };

  /**
   * Sound Effects Map (One-shot sounds)
   * Organized by category for easy lookup
   */
  const SFX_MAP = {
    // UI Sounds
    ui: {
      click: 'ui/ui_click.mp3',
      hover: 'ui/ui_hover.mp3',
      modal_open: 'ui/ui_modal_open.mp3',
      modal_close: 'ui/ui_modal_close.mp3'
    },

    // Competition Sounds
    competition: {
      start_buzzer: 'competition/comp_start_buzzer.mp3',
      countdown: 'competition/comp_countdown.mp3',
      correct: 'competition/comp_correct.mp3',
      wrong: 'competition/comp_wrong.mp3',
      timeout: 'competition/comp_timeout.mp3',
      results_drum: 'competition/comp_results_drum.mp3',
      winner_reveal: 'competition/comp_winner_reveal.mp3'
    },

    // Voting Sounds
    voting: {
      cast: 'voting/vote_cast.mp3',
      tally_tick: 'voting/vote_tally_tick.mp3',
      result_drum: 'voting/vote_result_drum.mp3',
      tiebreaker: 'voting/tiebreaker.mp3',
      evicted_gong: 'voting/evicted_gong.mp3'
    },

    // Social Sounds
    social: {
      action: 'social/social_action.mp3',
      bond_increase: 'social/bond_increase.mp3',
      bond_decrease: 'social/bond_decrease.mp3',
      alliance_form: 'social/alliance_form.mp3',
      alliance_break: 'social/alliance_break.mp3'
    },

    // Jury Sounds
    jury: {
      member_arrives: 'jury/jury_member_arrives.mp3',
      vote_cast: 'jury/jury_vote_cast.mp3',
      vote_reveal: 'jury/jury_vote_reveal.mp3',
      return_twist: 'jury/jury_return_twist.mp3'
    },

    // Finale Sounds
    finale: {
      winner_fanfare: 'finale/winner_fanfare.mp3',
      confetti_burst: 'finale/confetti_burst.mp3',
      crown_placement: 'finale/crown_placement.mp3',
      check_reveal: 'finale/check_reveal.mp3',
      runner_up: 'finale/runner_up.mp3'
    },

    // Fan Favorite Sounds
    fan_favorite: {
      voting: 'fan_favorite/fan_fav_voting.mp3',
      reveal: 'fan_favorite/fan_fav_reveal.mp3',
      winner: 'fan_favorite/fan_fav_winner.mp3'
    },

    // Event/Twist Sounds
    events: {
      twist_announce: 'events/twist_announce.mp3',
      double_eviction: 'events/double_eviction.mp3',
      triple_eviction: 'events/triple_eviction.mp3',
      week_start: 'events/week_start.mp3',
      diary_room_door: 'events/diary_room_door.mp3'
    },

    // Notification Sounds
    notifications: {
      your_turn: 'notifications/your_turn.mp3',
      timer_warning: 'notifications/timer_warning.mp3',
      phase_end: 'notifications/phase_end.mp3'
    }
  };

  /**
   * Resolve SFX path with flexible extension support
   * Tries to find the file with any supported extension
   * @param {string} path - Base path (e.g., 'ui/ui_click')
   * @returns {string|null} - Full path with extension or null if not found
   */
  function resolveSfxPath(path) {
    if (!path) return null;
    
    // If path already has an extension, use it as-is
    if (/\.(mp3|mp4|wav|ogg|m4a)$/i.test(path)) {
      return SFX_BASE + path;
    }
    
    // Otherwise, try default extension first (mp3)
    return SFX_BASE + path + '.mp3';
  }

  /**
   * Get SFX path by category and key
   * @param {string} category - SFX category (e.g., 'ui', 'competition', 'voting')
   * @param {string} key - SFX key within category (e.g., 'click', 'start_buzzer')
   * @returns {string|null} - Full SFX path or null if not found
   */
  function getSfx(category, key) {
    try {
      if (!category || !key) return null;
      
      const categoryMap = SFX_MAP[category];
      if (!categoryMap) {
        console.warn(`[sound-map] Unknown SFX category: ${category}`);
        return null;
      }
      
      const sfxPath = categoryMap[key];
      if (!sfxPath) {
        console.warn(`[sound-map] Unknown SFX key: ${category}.${key}`);
        return null;
      }
      
      return resolveSfxPath(sfxPath);
    } catch (e) {
      console.warn(`[sound-map] getSfx error for ${category}.${key}:`, e);
      return null;
    }
  }

  /**
   * Get music path by phase/event name
   * @param {string} phase - Phase or event name
   * @returns {string|null} - Music file path or null
   */
  function getMusicForPhase(phase) {
    try {
      if (!phase) return null;
      const key = String(phase).toLowerCase().replace(/\s+/g, '_');
      return MUSIC_MAP[key] || null;
    } catch (e) {
      console.warn(`[sound-map] getMusicForPhase error for ${phase}:`, e);
      return null;
    }
  }

  /**
   * Play an SFX with volume and settings checks
   * This is a convenience wrapper that respects mute/sfx settings
   * @param {string} category - SFX category
   * @param {string} key - SFX key
   * @param {number} volume - Volume (0.0 to 1.0, default 0.7)
   * @returns {boolean} - True if playback was attempted, false otherwise
   */
  function playSfx(category, key, volume = 0.7) {
    try {
      // Check if SFX is enabled
      const cfg = (global.game && global.game.cfg) || global.cfg || {};
      if (cfg.sfxOn === false) {
        console.debug(`[sound-map] SFX disabled, skipping ${category}.${key}`);
        return false;
      }

      // Check if audio is muted
      if (global.getMuted && global.getMuted()) {
        console.debug(`[sound-map] Audio muted, skipping ${category}.${key}`);
        return false;
      }

      // Get SFX path
      const sfxPath = getSfx(category, key);
      if (!sfxPath) {
        return false;
      }

      // Use SfxPlayer if available, otherwise create Audio element
      if (global.SfxPlayer && typeof global.SfxPlayer.play === 'function') {
        global.SfxPlayer.play(sfxPath, volume);
      } else {
        // Fallback: create Audio element directly
        const audio = new Audio(sfxPath);
        audio.volume = Math.max(0, Math.min(1, volume));
        audio.play().catch(err => {
          // Silently ignore playback errors (file not found, autoplay blocked, etc.)
          console.debug(`[sound-map] SFX playback failed for ${category}.${key}:`, err.message || err);
        });
      }

      return true;
    } catch (e) {
      console.warn(`[sound-map] playSfx error for ${category}.${key}:`, e);
      return false;
    }
  }

  // Export to global namespace
  const SoundMap = global.SoundMap = {
    MUSIC_MAP,
    SFX_MAP,
    AUDIO_BASE,
    SFX_BASE,
    AUDIO_EXTENSIONS,
    getSfx,
    getMusicForPhase,
    playSfx,
    resolveSfxPath
  };

  console.info('[sound-map] Initialized with', Object.keys(SFX_MAP).length, 'SFX categories');

})(window);
