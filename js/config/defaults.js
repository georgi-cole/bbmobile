// MODULE: config/defaults.js
// Centralized configuration constants for the application
// This module provides default values and constants used across multiple files

(function(g){
  'use strict';

  // Avatar fallback constants
  const AVATAR_DEFAULTS = {
    // External API fallback URL pattern (without seed parameter)
    DICEBEAR_API_BASE: 'https://api.dicebear.com/6.x/bottts/svg',
    
    // Local SVG silhouette for strict mode (data URI)
    LOCAL_SILHOUETTE: 'data:image/svg+xml,' + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">' +
      '<rect fill="#2d3f56" width="100" height="100"/>' +
      '<circle cx="50" cy="35" r="15" fill="#4a5f7f"/>' +
      '<ellipse cx="50" cy="70" rx="20" ry="25" fill="#4a5f7f"/>' +
      '</svg>'
    )
  };

  // Helper function to generate Dicebear URL with seed
  function getDicebearUrl(seed) {
    return `${AVATAR_DEFAULTS.DICEBEAR_API_BASE}?seed=${encodeURIComponent(seed || 'player')}`;
  }

  // Export to global namespace
  g.AVATAR_DEFAULTS = AVATAR_DEFAULTS;
  g.getDicebearUrl = getDicebearUrl;

  // Also export to Game namespace if it exists
  if (g.Game) {
    g.Game.AVATAR_DEFAULTS = AVATAR_DEFAULTS;
    g.Game.getDicebearUrl = getDicebearUrl;
  }

})(window.Game || window);
