/* roster-placeholders.js
 * Displays placeholder tiles in the roster area before the game starts.
 * - Mobile (≤700px): Shows skeleton roster with question-mark avatar tiles
 * - Desktop (>700px): Shows "BIG BROTHER" letter tiles
 * These placeholders are removed when the actual roster becomes visible.
 */
(function(g) {
  'use strict';
  if (!g || !document) return;

  const WORDS = ['BIG', 'BROTHER']; // Split by spaces for multi-row layout (desktop)
  const PLACEHOLDER_OVERLAY_ID = 'bbRosterPlaceholderOverlay';
  const ATTR_PLACEHOLDERS_VISIBLE = 'data-roster-placeholders-visible';
  const MOBILE_BREAKPOINT = '(max-width: 700px)';

  /**
   * Check if we're on mobile (≤700px width)
   * @returns {boolean} True if mobile viewport
   */
  function isMobile() {
    return window.matchMedia(MOBILE_BREAKPOINT).matches;
  }

  /**
   * Get the number of players to show in skeleton roster
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
   * @returns {HTMLElement|null} The roster container element
   */
  function findRosterContainer() {
    const selectors = ['.top-roster', '#topRoster', '#rosterBar', '.roster-strip', '.cast-strip'];
    
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el) return el;
    }
    
    return null;
  }

  /**
   * Create a skeleton tile element with question-mark avatar (mobile mode)
   * @param {number} index - Tile index for stagger animation
   * @returns {HTMLElement} The skeleton tile element
   */
  function createSkeletonTile(index) {
    const tile = document.createElement('div');
    tile.className = 'roster-placeholder-skeleton';
    tile.style.setProperty('--tile-index', index);

    // Avatar circle with question mark
    const avatar = document.createElement('div');
    avatar.className = 'roster-placeholder-avatar';
    avatar.textContent = '?';
    
    // Name band placeholder
    const nameband = document.createElement('div');
    nameband.className = 'roster-placeholder-nameband';
    
    tile.appendChild(avatar);
    tile.appendChild(nameband);
    return tile;
  }

  /**
   * Create a placeholder tile element with a letter (desktop mode).
   * @param {string} letter - The letter to display
   * @returns {HTMLElement} The tile element
   */
  function createPlaceholderTile(letter) {
    const tile = document.createElement('div');
    tile.className = 'roster-placeholder-tile';
    
    const letterSpan = document.createElement('span');
    letterSpan.className = 'roster-placeholder-letter';
    letterSpan.textContent = letter;
    
    tile.appendChild(letterSpan);
    return tile;
  }

  /**
   * Inject CSS for placeholder tiles with multi-row support (desktop) and skeleton tiles (mobile).
   */
  function injectPlaceholderCSS() {
    if (document.getElementById('bbRosterPlaceholderCSS')) return;
    
    const style = document.createElement('style');
    style.id = 'bbRosterPlaceholderCSS';
    style.textContent = `
      /* Placeholder overlay container - column layout for rows */
      #${PLACEHOLDER_OVERLAY_ID} {
        display: flex;
        flex-direction: column;
        gap: 12px;
        align-items: center;
        justify-content: center;
        padding: 12px;
        position: relative;
        z-index: 1;
        animation: bbPlaceholderFadeIn 400ms ease-out;
      }
      
      /* Mobile: Skeleton roster layout */
      @media ${MOBILE_BREAKPOINT} {
        #${PLACEHOLDER_OVERLAY_ID} {
          flex-direction: row;
          flex-wrap: wrap;
          gap: 8px;
          padding: 8px 4px;
        }
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
      
      /* ============ DESKTOP MODE: BIG/BROTHER Letter Tiles ============ */
      
      /* Row container for each word */
      .roster-placeholder-row {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 10px;
      }
      
      /* Individual placeholder tile with responsive sizing */
      .roster-placeholder-tile {
        width: clamp(44px, 6.0vw, 72px);
        height: clamp(44px, 6.0vw, 72px);
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, 
          var(--roster-gradient-1, #00d9ff) 0%, 
          var(--roster-gradient-2, #0088ff) 100%);
        border: 2px solid var(--roster-border, #00d9ff);
        border-radius: 12px;
        box-shadow: var(--roster-glow, 0 0 20px rgba(0,217,255,0.4)),
                    0 4px 8px rgba(0,0,0,0.3);
        position: relative;
        overflow: hidden;
      }
      
      /* Pulse animation (respects reduced motion) */
      @media (prefers-reduced-motion: no-preference) {
        .roster-placeholder-tile {
          animation: bbPlaceholderPulse 2s ease-in-out infinite;
          animation-delay: calc(var(--tile-index, 0) * 0.1s);
        }
      }
      
      /* Subtle pulse animation */
      @keyframes bbPlaceholderPulse {
        0%, 100% {
          transform: scale(1);
          opacity: 0.9;
        }
        50% {
          transform: scale(1.02);
          opacity: 1;
        }
      }
      
      /* Letter text with responsive sizing */
      .roster-placeholder-letter {
        font-family: 'Oswald', 'Montserrat', sans-serif;
        font-weight: 700;
        font-size: clamp(18px, 3.2vw, 32px);
        color: #ffffff;
        text-shadow: 0 2px 8px rgba(0,0,0,0.4);
        letter-spacing: 0;
        user-select: none;
        z-index: 1;
      }
      
      /* Shimmer effect overlay (respects reduced motion) */
      @media (prefers-reduced-motion: no-preference) {
        .roster-placeholder-tile::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: linear-gradient(
            45deg,
            transparent 30%,
            rgba(255,255,255,0.15) 50%,
            transparent 70%
          );
          animation: bbPlaceholderShimmer 3s linear infinite;
          animation-delay: calc(var(--tile-index, 0) * 0.15s);
        }
      }
      
      @keyframes bbPlaceholderShimmer {
        0% {
          transform: translateX(-100%) translateY(-100%) rotate(45deg);
        }
        100% {
          transform: translateX(100%) translateY(100%) rotate(45deg);
        }
      }
      
      /* ============ MOBILE MODE: Skeleton Question-Mark Tiles ============ */
      
      .roster-placeholder-skeleton {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        width: clamp(44px, 12vw, 64px);
      }
      
      /* Avatar circle with question mark */
      .roster-placeholder-avatar {
        width: clamp(44px, 12vw, 64px);
        height: clamp(44px, 12vw, 64px);
        min-width: 44px;
        min-height: 44px;
        border-radius: 50%;
        background: linear-gradient(135deg,
          color-mix(in srgb, var(--card, #2a3f5f) 90%, var(--accent, #4a90e2)),
          color-mix(in srgb, var(--card-2, #1f3248) 85%, var(--bg, #0d1623)));
        border: 2px solid color-mix(in srgb, var(--line, #3a4f6f) 60%, transparent);
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: 'Oswald', 'Montserrat', sans-serif;
        font-size: clamp(20px, 6vw, 28px);
        font-weight: 700;
        color: color-mix(in srgb, var(--muted-2, #7a8fa5) 80%, var(--ink, #e8f1ff));
        box-shadow: 0 2px 8px rgba(0,0,0,0.3),
                    inset 0 1px 2px rgba(255,255,255,0.1);
        position: relative;
        overflow: hidden;
      }
      
      /* Name band placeholder */
      .roster-placeholder-nameband {
        width: 100%;
        height: clamp(8px, 2vw, 12px);
        background: linear-gradient(90deg,
          color-mix(in srgb, var(--card-2, #1f3248) 70%, transparent),
          color-mix(in srgb, var(--card, #2a3f5f) 50%, transparent),
          color-mix(in srgb, var(--card-2, #1f3248) 70%, transparent));
        border-radius: 4px;
        opacity: 0.6;
      }
      
      /* Pulse animation for skeleton tiles (respects reduced motion) */
      @media (prefers-reduced-motion: no-preference) {
        .roster-placeholder-skeleton {
          animation: bbSkeletonPulse 2s ease-in-out infinite;
          animation-delay: calc(var(--tile-index, 0) * 0.08s);
        }
      }
      
      @keyframes bbSkeletonPulse {
        0%, 100% {
          opacity: 0.85;
        }
        50% {
          opacity: 1;
        }
      }
      
      /* Shimmer effect for skeleton avatar */
      @media (prefers-reduced-motion: no-preference) {
        .roster-placeholder-avatar::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -150%;
          width: 100%;
          height: 200%;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255,255,255,0.12) 50%,
            transparent 100%
          );
          animation: bbSkeletonShimmer 2.5s ease-in-out infinite;
          animation-delay: calc(var(--tile-index, 0) * 0.1s);
        }
      }
      
      @keyframes bbSkeletonShimmer {
        0% {
          left: -150%;
        }
        100% {
          left: 150%;
        }
      }
      
      /* ============ SHARED STYLES ============ */
      
      /* Mobile responsive adjustments */
      @media (max-width: 640px) {
        #${PLACEHOLDER_OVERLAY_ID} {
          gap: 6px;
          padding: 6px 4px;
        }
        
        .roster-placeholder-row {
          gap: 8px;
        }
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
   * Render placeholder tiles in the roster container.
   * Mobile: skeleton roster with question-mark tiles
   * Desktop: multi-row BIG/BROTHER letter tiles
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

    // Create overlay
    overlay = document.createElement('div');
    overlay.id = PLACEHOLDER_OVERLAY_ID;

    // Render based on viewport size
    if (isMobile()) {
      // Mobile: skeleton roster with question-mark tiles
      const playerCount = getPlayerCount();
      for (let i = 0; i < playerCount; i++) {
        const tile = createSkeletonTile(i);
        overlay.appendChild(tile);
      }
      console.log('[RosterPlaceholders] Mobile skeleton roster rendered:', playerCount, 'tiles');
    } else {
      // Desktop: BIG/BROTHER letter tiles
      let tileIndex = 0;
      WORDS.forEach((word) => {
        const row = document.createElement('div');
        row.className = 'roster-placeholder-row';
        
        // Create tiles for each letter in the word
        word.split('').forEach((letter) => {
          const tile = createPlaceholderTile(letter);
          tile.style.setProperty('--tile-index', tileIndex);
          tileIndex++;
          row.appendChild(tile);
        });
        
        overlay.appendChild(row);
      });
      console.log('[RosterPlaceholders] Desktop placeholders rendered:', WORDS.join(' '), '(' + tileIndex + ' tiles in ' + WORDS.length + ' rows)');
    }

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
   */
  function init() {
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
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})(window);
