// MODULE: profileStorage.js
// Local storage CRUD for up to 5 user profiles with versioning and migration support
// Each profile: id, displayName, avatar (dataURL), XP, season, createdAt, updatedAt

(function(global) {
  'use strict';

  const STORAGE_KEY = 'bb_profiles';
  const VERSION_KEY = 'bb_profiles_version';
  const LAST_PROFILE_KEY = 'bb_last_profile_id';
  const CURRENT_VERSION = 1;
  const MAX_PROFILES = 5;

  // Default avatar SVG
  const DEFAULT_AVATAR_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="48" fill="#1a2634" stroke="#3f6385" stroke-width="2"/>
  <circle cx="50" cy="40" r="15" fill="#3f6385"/>
  <ellipse cx="50" cy="75" rx="25" ry="20" fill="#3f6385"/>
</svg>
`;
  const DEFAULT_AVATAR = 'data:image/svg+xml,' + encodeURIComponent(DEFAULT_AVATAR_SVG.trim());

  // Safe localStorage wrapper
  function safeGetItem(key, defaultValue = null) {
    try {
      return localStorage.getItem(key) || defaultValue;
    } catch (e) {
      console.warn('[profileStorage] getItem failed:', e);
      return defaultValue;
    }
  }

  function safeSetItem(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (e) {
      console.warn('[profileStorage] setItem failed:', e);
      return false;
    }
  }

  function safeRemoveItem(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (e) {
      console.warn('[profileStorage] removeItem failed:', e);
      return false;
    }
  }

  // Generate unique ID
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  // Migration functions
  function migrate(profiles, fromVersion) {
    console.info('[profileStorage] migrating from version', fromVersion, 'to', CURRENT_VERSION);
    // Future migrations would go here
    // For now, version 1 is the first version
    return profiles;
  }

  // Load all profiles from storage
  function loadProfiles() {
    const versionStr = safeGetItem(VERSION_KEY);
    const version = versionStr ? parseInt(versionStr, 10) : 0;
    
    const dataStr = safeGetItem(STORAGE_KEY);
    if (!dataStr) {
      return [];
    }

    try {
      let profiles = JSON.parse(dataStr);
      
      // Ensure it's an array
      if (!Array.isArray(profiles)) {
        console.warn('[profileStorage] invalid data format, resetting');
        return [];
      }

      // Migrate if needed
      if (version < CURRENT_VERSION) {
        profiles = migrate(profiles, version);
        saveProfiles(profiles);
      }

      return profiles;
    } catch (e) {
      console.error('[profileStorage] failed to parse profiles:', e);
      return [];
    }
  }

  // Save profiles to storage
  function saveProfiles(profiles) {
    try {
      const dataStr = JSON.stringify(profiles);
      safeSetItem(STORAGE_KEY, dataStr);
      safeSetItem(VERSION_KEY, CURRENT_VERSION.toString());
      return true;
    } catch (e) {
      console.error('[profileStorage] failed to save profiles:', e);
      return false;
    }
  }

  // Get all profiles
  function getAllProfiles() {
    return loadProfiles();
  }

  // Get profile by ID
  function getProfileById(id) {
    const profiles = loadProfiles();
    return profiles.find(p => p.id === id) || null;
  }

  // Create new profile
  function createProfile(data) {
    const profiles = loadProfiles();
    
    // Check limit
    if (profiles.length >= MAX_PROFILES) {
      throw new Error(`Maximum of ${MAX_PROFILES} profiles reached`);
    }

    // Validate required fields
    if (!data.displayName || !data.displayName.trim()) {
      throw new Error('Display name is required');
    }

    const now = new Date().toISOString();
    const profile = {
      id: generateId(),
      displayName: data.displayName.trim(),
      avatar: data.avatar || DEFAULT_AVATAR,
      xp: data.xp || 0,
      season: data.season || 1,
      createdAt: now,
      updatedAt: now
    };

    profiles.push(profile);
    saveProfiles(profiles);
    
    // Set as last used profile
    setLastProfileId(profile.id);
    
    return profile;
  }

  // Update existing profile
  function updateProfile(id, data) {
    const profiles = loadProfiles();
    const index = profiles.findIndex(p => p.id === id);
    
    if (index === -1) {
      throw new Error('Profile not found');
    }

    const profile = profiles[index];
    const now = new Date().toISOString();

    // Update fields
    if (data.displayName !== undefined) {
      if (!data.displayName.trim()) {
        throw new Error('Display name cannot be empty');
      }
      profile.displayName = data.displayName.trim();
    }
    if (data.avatar !== undefined) profile.avatar = data.avatar;
    if (data.xp !== undefined) profile.xp = data.xp;
    if (data.season !== undefined) profile.season = data.season;
    profile.updatedAt = now;

    profiles[index] = profile;
    saveProfiles(profiles);
    
    return profile;
  }

  // Delete profile
  function deleteProfile(id) {
    const profiles = loadProfiles();
    const filtered = profiles.filter(p => p.id !== id);
    
    if (filtered.length === profiles.length) {
      throw new Error('Profile not found');
    }

    saveProfiles(filtered);
    
    // Clear last profile if it was deleted
    if (getLastProfileId() === id) {
      safeRemoveItem(LAST_PROFILE_KEY);
    }
    
    return true;
  }

  // Get/set last used profile ID
  function getLastProfileId() {
    return safeGetItem(LAST_PROFILE_KEY);
  }

  function setLastProfileId(id) {
    safeSetItem(LAST_PROFILE_KEY, id);
  }

  // Get last used profile
  function getLastProfile() {
    const lastId = getLastProfileId();
    if (!lastId) return null;
    return getProfileById(lastId);
  }

  // Check if at max capacity
  function isAtMaxCapacity() {
    const profiles = loadProfiles();
    return profiles.length >= MAX_PROFILES;
  }

  // Get profile count
  function getProfileCount() {
    return loadProfiles().length;
  }

  // Export API
  const ProfileStorage = {
    MAX_PROFILES,
    DEFAULT_AVATAR,
    getAllProfiles,
    getProfileById,
    createProfile,
    updateProfile,
    deleteProfile,
    getLastProfile,
    getLastProfileId,
    setLastProfileId,
    isAtMaxCapacity,
    getProfileCount
  };

  // Expose to global
  global.ProfileStorage = ProfileStorage;

})(window);
