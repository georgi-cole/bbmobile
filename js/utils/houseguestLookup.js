// canonical houseguest lookup utility
// Resolves houseguest profiles by id, slug, or name
// Works with both static Houseguests data and dynamic game.players

/**
 * Get profile by key (id, slug, or name)
 * Attempts multiple resolution strategies:
 * 1. Numeric ID lookup in game.players
 * 2. Name match in game.players (case-insensitive)
 * 3. Slug match in Houseguests static data
 * 4. Name match in Houseguests static data
 * 
 * @param {string|number} key - ID, slug, or name to look up
 * @returns {object|null} Player/houseguest object or null if not found
 */
export function getProfileByKey(key) {
  if (key == null) return null;
  
  const strKey = String(key);
  
  // First, try to find in game.players (live game data with allies/enemies)
  const players = window.game && window.game.players;
  if (players && Array.isArray(players)) {
    // Try numeric ID match
    if (/^\d+$/.test(strKey)) {
      const numericId = Number(strKey);
      const found = players.find(p => p.id === numericId);
      if (found) return found;
    }
    
    // Try name match (case-insensitive)
    const lowerKey = strKey.toLowerCase().trim();
    const found = players.find(p => p.name && p.name.toLowerCase() === lowerKey);
    if (found) return found;
  }
  
  // Fall back to static Houseguests data (for profile info like bios)
  const houseguests = (window.Houseguests && window.Houseguests.getAll()) || [];
  if (houseguests.length === 0) return null;
  
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
  
  // Merge: player data takes precedence for live fields
  return {
    ...houseguest,
    ...player,
    // Preserve important static fields
    fullName: houseguest.fullName || player.fullName,
    bio: houseguest.bio || player.bio,
    story: houseguest.story || player.story,
    motto: houseguest.motto || player.motto,
    funFact: houseguest.funFact || player.funFact
  };
}
