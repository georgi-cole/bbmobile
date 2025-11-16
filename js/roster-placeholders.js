/* roster-placeholders.js
 * Displays placeholder tiles in the roster area before the game starts.
 * - Shows normal-looking roster tiles with generic avatar silhouettes
 * - Uses same markup structure as real roster tiles for seamless transition
 * These placeholders are removed when the actual roster becomes visible.
 * 
 * NOTE: With the new startup flow (StartupFlow), placeholder avatars won't appear
 * until after Play is pressed, as the main screen (including roster) is deferred
 * until after the intro hub sequence completes.
 * TODO: Consider whether placeholder logic is still needed given deferred main screen build.
 */
(function(g) {
  'use strict';
  if (!g || !document) return;

  const PLACEHOLDER_OVERLAY_ID = 'bbRosterPlaceholderOverlay';
  const ATTR_PLACEHOLDERS_VISIBLE = 'data-roster-placeholders-visible';

  /**
   * Get the number of players to show in placeholder roster
   * @returns {number} Number of placeholder tiles to render
   */
  function getPlayerCount() {
    // Priority 1: cfg.numPlayers if set
    if (g.cfg && typeof g.cfg.numPlayers === 'number' && g.cfg.numPlayers > 0) {
      return g.cfg.numPlayers;
    }
    // Priority 2: game.players.length if exists
    if (g.game && Array.isArray(g.game.players) && g.game.players.length > 0) {
      return g.game.players.length;
    }
    // Default: 12 players
    return 12;
  }

  /**
   * Locate the roster container using priority selectors.
   * Priority order:
   * 1. #rosterBar (preferred location above TV)
   * 2. .top-roster (existing host element)
   * 3. #topRoster (alternative ID)
   * 4. .roster-strip, .cast-strip (fallback selectors)
   * @returns {HTMLElement|null} The roster container element
   */
  function findRosterContainer() {
    const selectors = ['#rosterBar', '.top-roster', '#topRoster', '.roster-strip', '.cast-strip'];
    
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el) return el;
    }
    
    return null;
  }

  /**
   * Create SVG data URL for generic avatar silhouette
   * @returns {string} Data URL containing the SVG
   */
  function createGenericAvatarDataURL() {
    // Use encodeURIComponent for safe URI encoding (handles all characters including Unicode)
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <circle cx="12" cy="8" r="4" fill="currentColor" opacity="0.6"/>
      <path d="M12,14 C8,14 4,16 4,19 L4,22 L20,22 L20,19 C20,16 16,14 12,14 Z" fill="currentColor" opacity="0.6"/>
    </svg>`;
    return 'data:image/svg+xml,' + encodeURIComponent(svg);
  }

  /**
   * Create a normal-looking placeholder tile matching the real roster structure
   * @param {number} index - Tile index (0-based) for aria-label
   * @param {number} total - Total number of tiles for aria-label
   * @returns {HTMLElement} The placeholder tile element
   */
  function createPlaceholderTile(index, total) {
    // Create tile with same structure as real roster tiles
    const tile = document.createElement('div');
    tile.className = 'top-roster-tile placeholder-tile';
    tile.setAttribute('tabindex', '0');
    tile.setAttribute('role', 'img');
    tile.setAttribute('aria-label', `Guest placeholder ${index + 1} of ${total}`);

    // Avatar wrap container
    const wrap = document.createElement('div');
    wrap.className = 'top-tile-avatar-wrap';
    wrap.style.position = 'relative';

    // Avatar image - use inline SVG data URL (no network request)
    const img = document.createElement('img');
    img.className = 'top-tile-avatar placeholder-avatar';
    img.src = createGenericAvatarDataURL();
    img.alt = 'Guest';
    wrap.appendChild(img);

    // Name label
    const name = document.createElement('div');
    name.className = 'top-tile-name';
    name.textContent = 'Guest';

    tile.appendChild(wrap);
    tile.appendChild(name);
    
    return tile;
  }

  /**
   * Inject minimal CSS for placeholder tiles.
   * Placeholder tiles reuse existing .top-roster-tile styles with minor adjustments.
   */
  function injectPlaceholderCSS() {
    if (document.getElementById('bbRosterPlaceholderCSS')) return;
    
    const style = document.createElement('style');
    style.id = 'bbRosterPlaceholderCSS';
    style.textContent = `
      /* Placeholder overlay container - matches real roster layout */
      #${PLACEHOLDER_OVERLAY_ID} {
        display: block;
        position: relative;
        z-index: 1;
        animation: bbPlaceholderFadeIn 400ms ease-out;
      }
      
      /* Single row container matching real roster */
      #${PLACEHOLDER_OVERLAY_ID} .top-roster-row {
        display: flex;
        flex-direction: row;
        gap: 8px;
        overflow-x: auto;
        scroll-snap-type: x mandatory;
        padding: 0;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: thin;
      }
      
      @keyframes bbPlaceholderFadeIn {
        from {
          opacity: 0;
          transform: translateY(-10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      /* Placeholder-specific adjustments */
      .placeholder-tile {
        /* Subtle pulse to indicate loading state */
        opacity: 0.85;
      }
      
      @media (prefers-reduced-motion: no-preference) {
        .placeholder-tile {
          animation: bbPlaceholderPulse 2s ease-in-out infinite;
        }
      }
      
      @keyframes bbPlaceholderPulse {
        0%, 100% {
          opacity: 0.75;
        }
        50% {
          opacity: 0.95;
        }
      }
      
      /* Generic avatar styling - neutral colored silhouette */
      .placeholder-avatar {
        filter: grayscale(1);
        opacity: 0.5;
        background: var(--card, #1a2636);
      }
      
      /* Prevent hover effects on placeholders */
      .placeholder-tile:hover {
        transform: none;
        box-shadow: var(--roster-glow, 0 0 20px rgba(0,0,0,0.4));
      }
      
      .placeholder-tile:hover .top-tile-avatar-wrap {
        transform: none;
      }
      
      .placeholder-tile:hover .top-tile-avatar {
        filter: grayscale(1);
        opacity: 0.5;
        transform: none;
      }
      
      /* Hide when real roster is visible */
      body:not([${ATTR_PLACEHOLDERS_VISIBLE}="true"]) #${PLACEHOLDER_OVERLAY_ID} {
        display: none;
      }
      
      /* Fade out animation when hiding */
      #${PLACEHOLDER_OVERLAY_ID}.hiding {
        animation: bbPlaceholderFadeOut 300ms ease-in forwards;
      }
      
      @keyframes bbPlaceholderFadeOut {
        from {
          opacity: 1;
          transform: translateY(0);
        }
        to {
          opacity: 0;
          transform: translateY(-10px);
        }
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Render placeholder tiles matching the normal roster structure.
   */
  function renderPlaceholders() {
    const container = findRosterContainer();
    if (!container) {
      console.warn('[RosterPlaceholders] Roster container not found, will retry...');
      return false;
    }

    // Check if overlay already exists
    let overlay = document.getElementById(PLACEHOLDER_OVERLAY_ID);
    if (overlay) return true; // Already rendered

    // Create overlay container
    overlay = document.createElement('div');
    overlay.id = PLACEHOLDER_OVERLAY_ID;

    // Create row container matching real roster structure
    const row = document.createElement('div');
    row.className = 'top-roster-row';

    // Render placeholder tiles
    const playerCount = getPlayerCount();
    for (let i = 0; i < playerCount; i++) {
      const tile = createPlaceholderTile(i, playerCount);
      row.appendChild(tile);
    }
    
    overlay.appendChild(row);
    console.log('[RosterPlaceholders] Normal-looking placeholder roster rendered:', playerCount, 'tiles');

    // Append to container
    // If container is #rosterBar, prepend; otherwise append
    if (container.id === 'rosterBar') {
      container.insertBefore(overlay, container.firstChild);
    } else {
      container.appendChild(overlay);
    }

    // Mark placeholders as visible
    document.body.setAttribute(ATTR_PLACEHOLDERS_VISIBLE, 'true');

    return true;
  }

  /**
   * Remove placeholder tiles with animation.
   */
  function hidePlaceholders() {
    const overlay = document.getElementById(PLACEHOLDER_OVERLAY_ID);
    if (!overlay) return;

    // Add hiding animation
    overlay.classList.add('hiding');

    // Remove after animation completes
    setTimeout(() => {
      overlay.remove();
      document.body.removeAttribute(ATTR_PLACEHOLDERS_VISIBLE);
      console.log('[RosterPlaceholders] Placeholders removed');
    }, 300);
  }

  /**
   * Initialize the placeholder system.
   * NOTE: With deferred startup, this should NOT auto-execute until after Play.
   * See DeferredGuards module for gate control.
   */
  function init() {
    // DEFERRED STARTUP GUARD: Check if game is ready to start
    // If not ready, defer initialization until after Play button is pressed
    if (g.DeferredGuards && !g.DeferredGuards.isGameReadyToStart()) {
      console.info('[RosterPlaceholders] Game not ready, deferring initialization');
      g.DeferredGuards.deferTask(() => {
        console.info('[RosterPlaceholders] Executing deferred initialization');
        initInternal();
      }, 'RosterPlaceholders.init');
      return;
    }

    // Game is ready or guard not available, initialize normally
    initInternal();
  }

  /**
   * Internal initialization logic (extracted for deferred execution).
   */
  function initInternal() {
    injectPlaceholderCSS();

    // Try to render placeholders immediately
    if (!renderPlaceholders()) {
      // Retry until container is found (max 40 attempts = 4 seconds)
      let attempts = 0;
      const retryInterval = setInterval(() => {
        attempts++;
        if (renderPlaceholders() || attempts > 40) {
          clearInterval(retryInterval);
        }
      }, 100);
    }

    // Watch for roster visibility changes and hide placeholders when roster becomes visible
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-roster-hidden') {
          const isRosterHidden = document.body.getAttribute('data-roster-hidden') === 'true';
          if (!isRosterHidden) {
            // Roster is now visible, hide placeholders
            hidePlaceholders();
          }
        }
      });
    });

    // Start observing body for roster visibility attribute changes
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['data-roster-hidden']
    });

    // Expose API (unchanged for backward compatibility)
    g.RosterPlaceholders = {
      show: renderPlaceholders,
      hide: hidePlaceholders
    };
  }

  // Initialize when DOM is ready
  // NOTE: This will now defer if DeferredGuards says game is not ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})(window);
