// MODULE: fast-cast-animation.js
// Fast cast introduction animation for returning users
// Shows all contestant photos at once inside the TV screen for under 5 seconds

(function(global) {
  'use strict';

  let isPlaying = false;

  /**
   * Play fast cast animation showing all contestants at once
   * @param {Array} players - Array of player objects
   * @param {Function} onComplete - Callback when animation completes
   */
  function playFastCastAnimation(players, onComplete) {
    if (!players || players.length === 0) {
      console.warn('[fast-cast] No players provided');
      if (onComplete) onComplete();
      return;
    }

    if (isPlaying) {
      console.warn('[fast-cast] Animation already playing');
      return;
    }

    isPlaying = true;
    console.info('[fast-cast] Starting fast cast animation for', players.length, 'contestants');

    // Hide everything except the TV section
    const elementsToHide = [
      document.querySelector('.topbar'),
      document.getElementById('dashboardCard'),
      document.getElementById('sideCard'),
      document.querySelector('#actionCard h1'),
      document.getElementById('rosterBar'),
      document.getElementById('panel')
    ];

    elementsToHide.forEach(el => {
      if (el) {
        el.__originalDisplay = el.style.display;
        el.style.display = 'none';
      }
    });

    // Hide TV overlay elements
    const tvNow = document.getElementById('tvNow');
    const tvOverlay = document.getElementById('tvOverlay');
    if (tvNow) {
      tvNow.__originalDisplay = tvNow.style.display;
      tvNow.style.display = 'none';
    }
    if (tvOverlay) {
      tvOverlay.__originalDisplay = tvOverlay.style.display;
      tvOverlay.style.display = 'none';
    }

    // Create fullscreen overlay for TV section
    const tvSection = document.getElementById('actionCard');
    if (tvSection) {
      tvSection.style.position = 'fixed';
      tvSection.style.top = '0';
      tvSection.style.left = '0';
      tvSection.style.width = '100vw';
      tvSection.style.height = '100vh';
      tvSection.style.zIndex = '999999';
      tvSection.style.background = '#000';
      tvSection.style.margin = '0';
      tvSection.style.padding = '0';
      tvSection.style.display = 'flex';
      tvSection.style.alignItems = 'center';
      tvSection.style.justifyContent = 'center';
    }

    // Create container for cast grid
    const viewport = document.querySelector('.tvViewport');
    if (!viewport) {
      console.error('[fast-cast] TV viewport not found');
      cleanup();
      if (onComplete) onComplete();
      return;
    }

    const castGrid = document.createElement('div');
    castGrid.id = 'fastCastGrid';
    castGrid.style.cssText = `
      position: absolute;
      inset: 0;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 12px;
      padding: 20px;
      align-items: center;
      justify-items: center;
      overflow: auto;
      z-index: 10;
    `;

    // Create cast member cards
    players.forEach((player, index) => {
      const card = document.createElement('div');
      card.className = 'fast-cast-card';
      card.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        opacity: 0;
        transform: scale(0.5);
        animation: fastCastFadeIn 0.4s ease-out forwards;
        animation-delay: ${index * 0.05}s;
      `;

      // Avatar
      const avatarWrapper = document.createElement('div');
      avatarWrapper.style.cssText = `
        width: 100px;
        height: 100px;
        border-radius: 50%;
        overflow: hidden;
        border: 3px solid #3d5a75;
        background: #1a2f44;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
      `;

      const avatar = document.createElement('img');
      avatar.style.cssText = `
        width: 100%;
        height: 100%;
        object-fit: cover;
      `;
      avatar.src = getPlayerAvatar(player);
      avatar.alt = player.name || 'Contestant';
      avatar.onerror = function() {
        this.onerror = null;
        this.src = getAvatarFallback(player);
      };

      avatarWrapper.appendChild(avatar);

      // Name
      const name = document.createElement('div');
      name.style.cssText = `
        font-size: 0.9rem;
        font-weight: 600;
        color: #ffffff;
        text-align: center;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
        max-width: 120px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      `;
      name.textContent = player.name || 'Guest';

      card.appendChild(avatarWrapper);
      card.appendChild(name);
      castGrid.appendChild(card);
    });

    viewport.appendChild(castGrid);

    // Add CSS animation
    if (!document.getElementById('fastCastStyles')) {
      const style = document.createElement('style');
      style.id = 'fastCastStyles';
      style.textContent = `
        @keyframes fastCastFadeIn {
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `;
      document.head.appendChild(style);
    }

    // Cleanup and complete after 4 seconds
    setTimeout(() => {
      cleanup();
      if (onComplete) onComplete();
    }, 4000);

    function cleanup() {
      isPlaying = false;

      // Remove cast grid
      const grid = document.getElementById('fastCastGrid');
      if (grid) grid.remove();

      // Restore hidden elements
      elementsToHide.forEach(el => {
        if (el && el.__originalDisplay !== undefined) {
          el.style.display = el.__originalDisplay;
          delete el.__originalDisplay;
        }
      });

      // Restore TV overlay elements
      if (tvNow && tvNow.__originalDisplay !== undefined) {
        tvNow.style.display = tvNow.__originalDisplay;
        delete tvNow.__originalDisplay;
      }
      if (tvOverlay && tvOverlay.__originalDisplay !== undefined) {
        tvOverlay.style.display = tvOverlay.__originalDisplay;
        delete tvOverlay.__originalDisplay;
      }

      // Restore TV section positioning
      if (tvSection) {
        tvSection.style.position = '';
        tvSection.style.top = '';
        tvSection.style.left = '';
        tvSection.style.width = '';
        tvSection.style.height = '';
        tvSection.style.zIndex = '';
        tvSection.style.background = '';
        tvSection.style.margin = '';
        tvSection.style.padding = '';
        tvSection.style.display = '';
        tvSection.style.alignItems = '';
        tvSection.style.justifyContent = '';
      }

      console.info('[fast-cast] Animation complete, cleanup done');
    }
  }

  /**
   * Get player avatar URL with fallback chain
   */
  function getPlayerAvatar(player) {
    if (!player) return getAvatarFallback(null);

    // Try avatar property first
    if (player.avatar && typeof player.avatar === 'string') {
      return player.avatar;
    }

    // Try global getAvatar function
    if (typeof global.getAvatar === 'function') {
      try {
        return global.getAvatar(player);
      } catch (e) {
        console.warn('[fast-cast] getAvatar failed:', e);
      }
    }

    // Try UI.getAvatar
    if (typeof global.UI?.getAvatar === 'function') {
      try {
        return global.UI.getAvatar(player);
      } catch (e) {
        console.warn('[fast-cast] UI.getAvatar failed:', e);
      }
    }

    return getAvatarFallback(player);
  }

  /**
   * Get fallback avatar URL
   */
  function getAvatarFallback(player) {
    const seed = player?.name ?? player?.id ?? 'Guest';
    
    // Try global getDicebearUrl
    if (typeof global.getDicebearUrl === 'function') {
      return global.getDicebearUrl(seed);
    }

    // Try UI.getDicebearUrl
    if (typeof global.UI?.getDicebearUrl === 'function') {
      return global.UI.getDicebearUrl(seed);
    }

    // Hard-coded fallback
    return `https://api.dicebear.com/6.x/bottts/svg?seed=${encodeURIComponent(seed)}`;
  }

  /**
   * Check if animation is currently playing
   */
  function isActive() {
    return isPlaying;
  }

  /**
   * Stop the animation (cleanup immediately)
   */
  function stop() {
    if (!isPlaying) return;
    console.info('[fast-cast] Stopping animation');
    
    const grid = document.getElementById('fastCastGrid');
    if (grid) grid.remove();
    
    isPlaying = false;
  }

  // Expose API
  global.FastCastAnimation = {
    play: playFastCastAnimation,
    isActive: isActive,
    stop: stop
  };

  console.info('[fast-cast] Fast cast animation module loaded');

})(window);
