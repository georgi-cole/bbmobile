// MODULE: profileService.js
// Business logic for profile selection flow, guest mode, and profile management

(function(global) {
  'use strict';

  let currentProfile = null;
  let isGuest = false;

  // Get current profile or guest status
  function getCurrentProfile() {
    return currentProfile;
  }

  function isGuestMode() {
    return isGuest;
  }

  // Set current profile
  function setCurrentProfile(profile) {
    currentProfile = profile;
    isGuest = false;
    
    if (profile) {
      global.ProfileStorage.setLastProfileId(profile.id);
      
      // Apply profile to game
      applyProfileToGame(profile);
    }
  }

  // Set guest mode
  function setGuestMode() {
    currentProfile = null;
    isGuest = true;
    
    // Apply default guest profile to game
    applyProfileToGame({
      displayName: 'Guest',
      avatar: global.ProfileStorage.DEFAULT_AVATAR,
      xp: 0,
      season: 1
    });
  }

  // Apply profile to game state
  function applyProfileToGame(profile) {
    if (!global.game) {
      console.warn('[profileService] game not initialized, will apply later');
      // Store profile to apply when game initializes
      global.__pendingProfile = profile;
      return;
    }

    // Clear any pending profile
    global.__pendingProfile = null;

    // Update game config
    if (global.game.cfg) {
      global.game.cfg.humanName = profile.displayName;
    }

    // Find and update human player
    if (global.game.players && global.game.players.length > 0) {
      const humanPlayer = global.game.players.find(p => 
        p.human || p.id === global.game.humanId || p.id === 0 || p.id === 1
      );
      
      if (humanPlayer) {
        humanPlayer.name = profile.displayName;
        
        // Update avatar if player has avatar field
        if (profile.avatar) {
          humanPlayer.avatar = profile.avatar;
          humanPlayer.img = profile.avatar;
          humanPlayer.photo = profile.avatar;
        }
        
        // Store XP and season in meta
        if (!humanPlayer.meta) humanPlayer.meta = {};
        humanPlayer.meta.xp = profile.xp || 0;
        humanPlayer.meta.season = profile.season || 1;
        
        console.info('[profileService] applied profile to human player:', humanPlayer);
      } else {
        console.warn('[profileService] human player not found in players array');
        global.__pendingProfile = profile;
      }
    } else {
      console.warn('[profileService] players array not ready, storing for later application');
      global.__pendingProfile = profile;
    }

    // Update HUD if available
    if (typeof global.updateHud === 'function') {
      global.updateHud();
    }
    if (typeof global.renderPanel === 'function') {
      global.renderPanel();
    }
  }

  // Update current profile (for XP/season updates during game)
  function updateCurrentProfile(updates) {
    if (!currentProfile || isGuest) {
      console.warn('[profileService] cannot update guest profile');
      return null;
    }

    try {
      const updated = global.ProfileStorage.updateProfile(currentProfile.id, updates);
      currentProfile = updated;
      applyProfileToGame(updated);
      return updated;
    } catch (e) {
      console.error('[profileService] failed to update profile:', e);
      return null;
    }
  }

  // Initialize profile on app start
  function initializeProfile() {
    // Check if there are any profiles
    const profiles = global.ProfileStorage.getAllProfiles();
    
    if (profiles.length === 0) {
      // First launch - no profiles exist
      console.info('[profileService] first launch - no profiles found');
      return { firstLaunch: true };
    }

    // Try to load last used profile
    const lastProfile = global.ProfileStorage.getLastProfile();
    
    if (lastProfile) {
      console.info('[profileService] loaded last profile:', lastProfile.displayName);
      setCurrentProfile(lastProfile);
      return { 
        firstLaunch: false, 
        profile: lastProfile 
      };
    }

    // Profiles exist but no last profile - show selection
    console.info('[profileService] profiles exist, showing selection');
    return { 
      firstLaunch: false,
      showSelection: true 
    };
  }

  // Get display name for HUD (includes XP/level info)
  function getDisplayName() {
    if (isGuest) {
      return 'Guest';
    }
    if (!currentProfile) {
      return 'You';
    }
    return currentProfile.displayName;
  }

  // Export API
  const ProfileService = {
    getCurrentProfile,
    isGuestMode,
    setCurrentProfile,
    setGuestMode,
    updateCurrentProfile,
    initializeProfile,
    getDisplayName,
    applyProfileToGame
  };

  // Expose to global
  global.ProfileService = ProfileService;

})(window);
