/* roster-placeholders.js
 * Displays avatar-style placeholder tiles in the roster area before the game starts.
 * - Shows skeleton roster with question-mark avatar tiles on all viewports
 * These placeholders are removed when the actual roster becomes visible.
 */
(function(g) {
  'use strict';
  if (!g || !document) return;

  const PLACEHOLDER_OVERLAY_ID = 'bbRosterPlaceholderOverlay';
  const ATTR_PLACEHOLDERS_VISIBLE = 'data-roster-placeholders-visible';

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
   * Create a card-style placeholder tile with avatar silhouette
   * @param {number} index - Tile index for stagger animation
   * @returns {HTMLElement} The skeleton tile element
   */
  function createSkeletonTile(index) {
    const tile = document.createElement('div');
    tile.className = 'roster-placeholder-skeleton';
    tile.style.setProperty('--tile-index', index);

    // Card container with rounded square background
    const card = document.createElement('div');
    card.className = 'roster-placeholder-card';
    
    // Avatar icon container (silhouette)
    const avatarIcon = document.createElement('div');
    avatarIcon.className = 'roster-placeholder-avatar-icon';
    
    // Create SVG avatar silhouette
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('class', 'avatar-silhouette');
    
    // Head circle
    const headCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    headCircle.setAttribute('cx', '12');
    headCircle.setAttribute('cy', '8');
    headCircle.setAttribute('r', '4');
    
    // Body path
    const bodyPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    bodyPath.setAttribute('d', 'M12,14 C8,14 4,16 4,19 L4,22 L20,22 L20,19 C20,16 16,14 12,14 Z');
    
    svg.appendChild(headCircle);
    svg.appendChild(bodyPath);
    avatarIcon.appendChild(svg);
    
    card.appendChild(avatarIcon);
    
    // Guest label
    const label = document.createElement('div');
    label.className = 'roster-placeholder-label';
    label.textContent = 'Guest';
    
    tile.appendChild(card);
    tile.appendChild(label);
    return tile;
  }

  /**
   * Inject CSS for avatar-style placeholder tiles.
   */
  function injectPlaceholderCSS() {
    if (document.getElementById('bbRosterPlaceholderCSS')) return;
    
    const style = document.createElement('style');
    style.id = 'bbRosterPlaceholderCSS';
    style.textContent = `
      /* Placeholder overlay container - flexible layout for avatar tiles */
      #${PLACEHOLDER_OVERLAY_ID} {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        gap: clamp(12px, 2vw, 20px);
        align-items: flex-start;
        justify-content: center;
        padding: clamp(12px, 2vw, 24px);
        position: relative;
        z-index: 1;
        animation: bbPlaceholderFadeIn 400ms ease-out;
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
      
      /* ============ Avatar-Style Skeleton Tiles ============ */
      
      .roster-placeholder-skeleton {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        width: clamp(80px, 15vw, 120px);
      }
      
      /* Card container with rounded square background */
      .roster-placeholder-card {
        width: 100%;
        aspect-ratio: 0.75;
        background: linear-gradient(135deg,
          color-mix(in srgb, var(--accent, #4a90e2) 70%, var(--card, #2a3f5f)),
          color-mix(in srgb, var(--accent, #4a90e2) 50%, var(--card-2, #1f3248)));
        border-radius: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(0,0,0,0.4),
                    inset 0 1px 2px rgba(255,255,255,0.1);
        position: relative;
        overflow: hidden;
        border: 2px solid color-mix(in srgb, var(--accent, #4a90e2) 60%, transparent);
      }
      
      /* Avatar icon container */
      .roster-placeholder-avatar-icon {
        width: 60%;
        height: 60%;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0, 0, 0, 0.3);
        border-radius: 12px;
        padding: 12%;
      }
      
      /* SVG avatar silhouette */
      .avatar-silhouette {
        width: 100%;
        height: 100%;
        fill: color-mix(in srgb, var(--muted-2, #7a8fa5) 70%, var(--ink, #e8f1ff));
        opacity: 0.8;
      }
      
      /* Guest label */
      .roster-placeholder-label {
        width: 100%;
        padding: 6px 12px;
        background: color-mix(in srgb, var(--card-2, #1f3248) 90%, var(--bg, #0d1623));
        border-radius: 8px;
        text-align: center;
        font-family: 'Oswald', 'Montserrat', sans-serif;
        font-size: clamp(12px, 2.5vw, 16px);
        font-weight: 600;
        color: color-mix(in srgb, var(--muted-2, #7a8fa5) 90%, var(--ink, #e8f1ff));
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
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
      
      /* Shimmer effect for card */
      @media (prefers-reduced-motion: no-preference) {
        .roster-placeholder-card::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -150%;
          width: 100%;
          height: 200%;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255,255,255,0.15) 50%,
            transparent 100%
          );
          animation: bbCardShimmer 2.5s ease-in-out infinite;
          animation-delay: calc(var(--tile-index, 0) * 0.1s);
        }
      }
      
      @keyframes bbCardShimmer {
        0% {
          left: -150%;
        }
        100% {
          left: 150%;
        }
      }
      
      /* ============ SHARED STYLES ============ */
      
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
   * Render avatar-style placeholder tiles in the roster container.
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

    // Render skeleton roster with question-mark avatar tiles
    const playerCount = getPlayerCount();
    for (let i = 0; i < playerCount; i++) {
      const tile = createSkeletonTile(i);
      overlay.appendChild(tile);
    }
    console.log('[RosterPlaceholders] Card-style skeleton roster rendered:', playerCount, 'tiles');

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
