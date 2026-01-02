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

  // Ensure profile has a valid season number (normalize to 1 if missing/invalid)
  function ensureSeason(profile) {
    if (!profile) return profile;
    
    const season = profile.season;
    if (typeof season !== 'number' || season < 1 || !Number.isInteger(season)) {
      profile.season = 1;
    }
    
    return profile;
  }

  // Check if last game was completed with this profile and increment season
  function checkAndIncrementSeasonForProfile(profile) {
    if (!profile || !profile.id) return;
    
    try {
      // Check if last game was completed
      const gameCompleted = localStorage.getItem('bb.lastGameCompleted');
      if (gameCompleted !== '1') {
        console.info('[profileService] no completed game found, skipping season increment');
        return;
      }

      // Check if the same profile completed the last game
      const completedProfileId = localStorage.getItem('bb.lastGameCompletedProfileId');
      if (completedProfileId && completedProfileId === profile.id) {
        console.info('[profileService] same profile detected - incrementing season for profile:', profile.id);
        
        // Increment season in the profile object
        const nextSeason = (profile.season || 1) + 1;
        profile.season = nextSeason;
        
        // Persist to storage
        global.ProfileStorage.updateProfile(profile.id, {
          season: nextSeason,
          updatedAt: Date.now()
        });
        
        // Clear the completion flags after incrementing
        localStorage.removeItem('bb.lastGameCompleted');
        localStorage.removeItem('bb.lastGameCompletedProfileId');
        
        console.info('[profileService] season incremented to', nextSeason);
      } else {
        console.info('[profileService] different profile or no profile match - not incrementing season');
      }
    } catch (e) {
      console.error('[profileService] failed to check/increment season:', e);
    }
  }

  // Set current profile
  async function setCurrentProfile(profile, options = {}) {
    currentProfile = profile;
    isGuest = false;
    
    // Clear guest mode when a real profile is selected
    clearGuestMode();
    
    if (profile) {
      // Check if previous game was completed with this profile and increment season
      checkAndIncrementSeasonForProfile(profile);
      
      // Ensure season is valid before applying
      ensureSeason(profile);
      
      global.ProfileStorage.setLastProfileId(profile.id);
      
      // Check for saved game unless explicitly skipped
      if (!options.skipSavedGameCheck && typeof global.hasSavedGame === 'function') {
        const hasSaved = global.hasSavedGame(profile.id);
        
        if (hasSaved && typeof global.showConfirm === 'function') {
          // Get save metadata for display
          const metadata = global.getSaveMetadata?.(profile.id);
          let message = 'Would you like to continue your saved game?';
          
          if (metadata) {
            const weekText = metadata.week ? `Week ${metadata.week}` : 'Unknown Week';
            const phaseText = metadata.phase ? metadata.phase.replace(/_/g, ' ') : 'Unknown Phase';
            message = `Welcome back! Would you like to continue your saved game?\n\nSaved at: ${weekText}, ${phaseText}`;
          }
          
          const continueGame = await global.showConfirm(
            message,
            {
              title: 'Continue Saved Game?',
              confirmText: 'Continue',
              cancelText: 'Start New',
              tone: 'neutral'
            }
          );
          
          if (continueGame) {
            // Load saved game
            if (typeof global.loadGame === 'function') {
              const savedState = global.loadGame(profile.id);
              
              if (savedState && global.game) {
                // Restore game state
                Object.assign(global.game, savedState);
                
                // Show success message
                if (typeof global.addLog === 'function') {
                  const weekText = savedState.week ? `Week ${savedState.week}` : 'Unknown Week';
                  const phaseText = savedState.phase ? savedState.phase.replace(/_/g, ' ') : 'Unknown Phase';
                  global.addLog(`🎮 Game restored! Resuming from ${weekText}, ${phaseText}`, 'game');
                }
                
                console.info('[profileService] Loaded saved game for profile:', profile.id);
                
                // Apply profile to ensure player data is synced
                applyProfileToGame(profile);
                
                // Update UI if needed
                if (typeof global.updateHud === 'function') {
                  global.updateHud();
                }
                if (typeof global.renderPanel === 'function') {
                  global.renderPanel();
                }
                
                return; // Don't apply fresh profile, game is restored
              }
            }
          } else {
            // Start new game - clear saved game
            if (typeof global.clearSavedGame === 'function') {
              global.clearSavedGame(profile.id);
              console.info('[profileService] Cleared saved game, starting fresh');
            }
          }
        }
      }
      
      // Apply profile to game (fresh start or no saved game)
      applyProfileToGame(profile);
    }
  }

  // Set guest mode
  function setGuestMode() {
    currentProfile = null;
    isGuest = true;
    
    // Set localStorage flag to suppress XP writes
    try {
      localStorage.setItem('bb.guestMode', 'true');
      console.info('[profileService] guest mode enabled - XP writes suppressed');
    } catch (e) {
      console.warn('[profileService] failed to set guest mode flag:', e);
    }
    
    // Apply default guest profile to game
    applyProfileToGame({
      displayName: 'Guest',
      avatar: global.ProfileStorage.DEFAULT_AVATAR,
      xp: 0,
      season: 1
    });
  }

  // Clear guest mode (called when user selects a real profile later)
  function clearGuestMode() {
    try {
      localStorage.removeItem('bb.guestMode');
      console.info('[profileService] guest mode cleared - XP writes enabled');
    } catch (e) {
      console.warn('[profileService] failed to clear guest mode flag:', e);
    }
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
        p.human || p.id === global.game.humanId
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
        
        // Store extended fields in bio (for intro/HUD display)
        if (!humanPlayer.bio) humanPlayer.bio = {};
        if (profile.age !== undefined) humanPlayer.bio.age = profile.age;
        if (profile.sex) humanPlayer.bio.gender = profile.sex;
        if (profile.location) humanPlayer.bio.location = profile.location;
        if (profile.occupation) humanPlayer.bio.occupation = profile.occupation;
        if (profile.motto) humanPlayer.bio.motto = profile.motto;
        
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

  // Initialize profile on app start (pure function - no side effects)
  function initializeProfile() {
    // Check if there are any profiles
    const profiles = global.ProfileStorage.getAllProfiles();
    const lastProfileId = global.ProfileStorage.getLastProfileId();
    
    if (profiles.length === 0) {
      // First launch - no profiles exist
      console.info('[profileService] first launch - no profiles found');
      return { 
        firstLaunch: true,
        profiles: [],
        lastProfileId: null
      };
    }

    // Return profile data without applying it
    console.info('[profileService] profiles exist:', profiles.length);
    if (lastProfileId) {
      console.info('[profileService] last profile ID:', lastProfileId);
    }
    
    return { 
      firstLaunch: false,
      profiles: profiles,
      lastProfileId: lastProfileId
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

  // Increment season for current profile after game completion
  function incrementSeason() {
    // No-op if guest or no profile
    if (isGuest || !currentProfile) {
      console.info('[profileService] incrementSeason skipped - guest or no profile');
      return;
    }

    try {
      // Compute next season
      const nextSeason = (currentProfile.season || 1) + 1;
      console.info('[profileService] incrementing season from', currentProfile.season, 'to', nextSeason);

      // Persist to storage
      const updatedProfile = global.ProfileStorage.updateProfile(currentProfile.id, {
        season: nextSeason,
        updatedAt: Date.now()
      });

      // Update current profile with returned value or fallback to local update
      if (updatedProfile) {
        currentProfile = updatedProfile;
      } else {
        // Fallback if update failed - still apply locally
        currentProfile.season = nextSeason;
      }

      // Re-apply to game to update HUD/display
      applyProfileToGame(currentProfile);

      console.info('[profileService] season incremented successfully to', currentProfile.season);
    } catch (e) {
      console.error('[profileService] failed to increment season:', e);
      // Still try to apply locally even if storage failed
      currentProfile.season = (currentProfile.season || 1) + 1;
      applyProfileToGame(currentProfile);
    }
  }

  // Export API
  const ProfileService = {
    getCurrentProfile,
    isGuestMode,
    setCurrentProfile,
    setGuestMode,
    clearGuestMode,
    updateCurrentProfile,
    initializeProfile,
    getDisplayName,
    applyProfileToGame,
    incrementSeason
  };

  // Expose to global
  global.ProfileService = ProfileService;

})(window);
