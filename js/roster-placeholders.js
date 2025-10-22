/* roster-placeholders.js
 * Displays "BIG BROTHER" placeholder tiles in the roster area before the game starts.
 * These placeholders are removed when the actual roster becomes visible.
 * Multi-row layout: splits by spaces for natural wrapping across desktop and mobile.
 */
(function(g) {
  'use strict';
  if (!g || !document) return;

  const WORDS = ['BIG', 'BROTHER']; // Split by spaces for multi-row layout
  const PLACEHOLDER_OVERLAY_ID = 'bbRosterPlaceholderOverlay';
  const ATTR_PLACEHOLDERS_VISIBLE = 'data-roster-placeholders-visible';

  /**
   * Locate the roster container using priority selectors.
   * @returns {HTMLElement|null} The roster container element
   */
  function findRosterContainer() {
    const selectors = ['.top-roster', '#topRoster', '.roster-strip', '.cast-strip'];
    
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el) return el;
    }
    
    // Fallback: try #rosterBar which is the parent container
    const rosterBar = document.getElementById('rosterBar');
    if (rosterBar) return rosterBar;
    
    return null;
  }

  /**
   * Create a placeholder tile element with a letter.
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
   * Inject CSS for placeholder tiles with multi-row support.
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
      
      /* Mobile responsive adjustments */
      @media (max-width: 640px) {
        #${PLACEHOLDER_OVERLAY_ID} {
          gap: 8px;
          padding: 8px;
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
   * Render placeholder tiles in multi-row layout in the roster container.
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

    // Create overlay with column layout
    overlay = document.createElement('div');
    overlay.id = PLACEHOLDER_OVERLAY_ID;

    // Create a row for each word
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

    // Append to container
    // If container is #rosterBar, prepend; otherwise append
    if (container.id === 'rosterBar') {
      container.insertBefore(overlay, container.firstChild);
    } else {
      container.appendChild(overlay);
    }

    // Mark placeholders as visible
    document.body.setAttribute(ATTR_PLACEHOLDERS_VISIBLE, 'true');

    console.log('[RosterPlaceholders] Placeholders rendered:', WORDS.join(' '), '(' + tileIndex + ' tiles in ' + WORDS.length + ' rows)');
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
