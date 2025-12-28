// canonical houseguest lookup utility
// Resolves houseguest profiles by id, slug, or name
// Works with both static Houseguests data and dynamic game.players

/**
 * Get profile by key (id, slug, or name)
 * Attempts multiple resolution strategies:
 * 1. Numeric ID lookup in game.players (for live game data with allies/enemies)
 * 2. Name match in game.players (case-insensitive)
 * 3. Numeric ID lookup in Houseguests static data
 * 4. Slug match in Houseguests static data
 * 5. Name match in Houseguests static data
 * 
 * @param {string|number} key - ID, slug, or name to look up
 * @returns {object|null} Player/houseguest object or null if not found
 */
export function getProfileByKey(key) {
  if (key === null || key === undefined) return null;
  
  const strKey = String(key);
  
  // First, try to find in game.players (live game data with allies/enemies)
  const players = window.game && window.game.players;
  if (players && Array.isArray(players)) {
    // Try numeric ID match
    if (/^\d+$/.test(strKey)) {
      const numericId = Number(strKey);
      const found = players.find(p => p.id === numericId);
      if (found) {
        // Enrich with static houseguest data if available
        return enrichWithHouseguestData(found);
      }
    }
    
    // Try name match (case-insensitive)
    const lowerKey = strKey.toLowerCase().trim();
    const found = players.find(p => p.name && p.name.toLowerCase() === lowerKey);
    if (found) {
      return enrichWithHouseguestData(found);
    }
  }
  
  // Fall back to static Houseguests data (for profile info like bios)
  const houseguests = (window.Houseguests && window.Houseguests.getAll()) || [];
  if (houseguests.length === 0) return null;
  
  // Try numeric ID lookup by matching player id to houseguest name
  if (/^\d+$/.test(strKey) && players && Array.isArray(players)) {
    const numericId = Number(strKey);
    const player = players.find(p => p.id === numericId);
    if (player) {
      // Find houseguest by matching name
      const houseguest = houseguests.find(h => h.name === player.name);
      if (houseguest) {
        return mergeWithGamePlayer(houseguest);
      }
    }
  }
  
  // Try slug match (lowercase, spaces -> dashes)
  const slug = strKey.toLowerCase().trim().replace(/\s+/g, '-');
  let found = houseguests.find(h => h.id && h.id === slug);
  if (found) {
    // Merge with game.players data if available
    return mergeWithGamePlayer(found);
  }
  
  // Try name match (case-insensitive)
  const lowerKey = strKey.toLowerCase().trim();
  found = houseguests.find(h => h.name && h.name.toLowerCase() === lowerKey);
  if (found) {
    return mergeWithGamePlayer(found);
  }
  
  return null;
}

/**
 * Enrich player object with static houseguest data
 * Adds bio, story, and other profile fields from houseguests.js
 * 
 * @param {object} player - Player object from game.players
 * @returns {object} Enriched player object
 */
function enrichWithHouseguestData(player) {
  const houseguests = (window.Houseguests && window.Houseguests.getAll()) || [];
  const houseguest = houseguests.find(h => h.name === player.name);
  
  if (!houseguest) {
    return player;
  }
  
  // Merge: player takes precedence for live data, houseguest for static profile fields
  return {
    ...houseguest,
    ...player,
    // Preserve important static fields from houseguest data
    fullName: houseguest.fullName || player.fullName || player.name,
    bio: houseguest.bio || player.bio,
    story: houseguest.story || player.story,
    motto: houseguest.motto || player.motto,
    funFact: houseguest.funFact || player.funFact,
    age: houseguest.age !== undefined ? houseguest.age : player.age,
    sex: houseguest.sex || player.sex,
    location: houseguest.location || player.location,
    sexuality: houseguest.sexuality || player.sexuality,
    education: houseguest.education || player.education,
    profession: houseguest.profession || player.profession,
    occupation: houseguest.occupation || player.occupation,
    familyStatus: houseguest.familyStatus || player.familyStatus,
    kids: houseguest.kids || player.kids,
    pets: houseguest.pets || player.pets,
    zodiacSign: houseguest.zodiacSign || player.zodiacSign,
    religion: houseguest.religion || player.religion,
    trait: houseguest.trait || player.trait
  };
}

/**
 * Merge static houseguest data with live game player data
 * This ensures we get both profile info (bio, motto) and live data (allies, enemies)
 * 
 * @param {object} houseguest - Static houseguest object
 * @returns {object} Merged object with both static and live data
 */
function mergeWithGamePlayer(houseguest) {
  const players = window.game && window.game.players;
  if (!players || !Array.isArray(players)) {
    return houseguest;
  }
  
  // Find matching player by name
  const player = players.find(p => p.name === houseguest.name);
  if (!player) {
    return houseguest;
  }
  
  // Merge: player data takes precedence for live fields, houseguest for static profile fields
  return {
    ...houseguest,
    ...player,
    // Preserve important static fields from houseguest data
    fullName: houseguest.fullName || player.fullName || player.name,
    bio: houseguest.bio || player.bio,
    story: houseguest.story || player.story,
    motto: houseguest.motto || player.motto,
    funFact: houseguest.funFact || player.funFact,
    age: houseguest.age !== undefined ? houseguest.age : player.age,
    sex: houseguest.sex || player.sex,
    location: houseguest.location || player.location,
    sexuality: houseguest.sexuality || player.sexuality,
    education: houseguest.education || player.education,
    profession: houseguest.profession || player.profession,
    occupation: houseguest.occupation || player.occupation,
    familyStatus: houseguest.familyStatus || player.familyStatus,
    kids: houseguest.kids || player.kids,
    pets: houseguest.pets || player.pets,
    zodiacSign: houseguest.zodiacSign || player.zodiacSign,
    religion: houseguest.religion || player.religion,
    trait: houseguest.trait || player.trait
  };
}
