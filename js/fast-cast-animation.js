// MODULE: fast-cast-animation.js
// Fast cast animation for returning users
// Shows all contestant photos with pulse-in effect, then fades out after 3 seconds

(function(global) {
  'use strict';

  let isPlaying = false;

  /**
   * Play house circle animation showing all contestants with pulse-in effect
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

    // Create fullscreen overlay container
    const overlay = document.createElement('div');
    overlay.id = 'houseCircleOverlay';
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 999999;
      background: linear-gradient(135deg, #0a0f16 0%, #1a2533 50%, #0a0f16 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    `;

    // Create house frame container
    const houseFrame = document.createElement('div');
    houseFrame.id = 'houseFrame';
    houseFrame.style.cssText = `
      position: relative;
      width: min(90vw, 90vh);
      height: min(90vw, 90vh);
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    // Try to load house background image, fallback to SVG
    const houseBackground = document.createElement('div');
    houseBackground.style.cssText = `
      position: absolute;
      inset: 0;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
    `;

    // Try to load house image
    const houseImg = new Image();
    houseImg.onload = function() {
      houseBackground.style.backgroundImage = `
        linear-gradient(rgba(10, 15, 22, 0.3), rgba(10, 15, 22, 0.5)),
        url('${houseImg.src}')
      `;
      houseBackground.style.backgroundSize = 'cover';
      houseBackground.style.backgroundPosition = 'center';
    };
    houseImg.onerror = function() {
      // Fallback to SVG house frame
      houseBackground.innerHTML = `
        <svg width="100%" height="100%" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="houseGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#1a2f44;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#0e1730;stop-opacity:1" />
            </linearGradient>
          </defs>
          <!-- House structure -->
          <path d="M 200 50 L 350 150 L 350 350 L 50 350 L 50 150 Z" fill="url(#houseGrad)" stroke="#3d5a75" stroke-width="4"/>
          <!-- Roof -->
          <path d="M 200 30 L 360 140 L 40 140 Z" fill="#2a3f54" stroke="#3d5a75" stroke-width="4"/>
          <!-- Door -->
          <rect x="170" y="280" width="60" height="70" rx="5" fill="#1a2533" stroke="#3d5a75" stroke-width="2"/>
          <!-- Windows -->
          <rect x="90" y="200" width="50" height="50" rx="3" fill="#78d2ff" fill-opacity="0.3" stroke="#3d5a75" stroke-width="2"/>
          <rect x="260" y="200" width="50" height="50" rx="3" fill="#78d2ff" fill-opacity="0.3" stroke="#3d5a75" stroke-width="2"/>
          <circle cx="200" cy="100" r="15" fill="#ffd700" opacity="0.8"/>
        </svg>
      `;
      houseBackground.style.display = 'flex';
      houseBackground.style.alignItems = 'center';
      houseBackground.style.justifyContent = 'center';
    };
    
    // Try multiple possible paths for house image
    houseImg.src = '/img/studio_bg.jpg';
    setTimeout(() => {
      if (!houseImg.complete) {
        houseImg.src = '/avatars/tvstudio.jpg';
      }
    }, 100);

    // Create circle container (no rotation)
    const circleContainer = document.createElement('div');
    circleContainer.id = 'circleContainer';
    circleContainer.style.cssText = `
      position: relative;
      width: 70%;
      height: 70%;
    `;

    // Calculate circle positions for contestants
    const radius = 45; // percentage from center
    const angleStep = (2 * Math.PI) / players.length;

    players.forEach((player, index) => {
      const angle = index * angleStep;
      const x = 50 + radius * Math.cos(angle - Math.PI / 2);
      const y = 50 + radius * Math.sin(angle - Math.PI / 2);

      const card = document.createElement('div');
      card.className = 'circle-contestant-card';
      card.style.cssText = `
        position: absolute;
        left: ${x}%;
        top: ${y}%;
        transform: translate(-50%, -50%);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        opacity: 0;
        animation: pulseInContestant 0.6s ease-out forwards, fadeOutContestant 0.5s ease-in forwards;
        animation-delay: 0s, 2.5s;
      `;

      // Avatar
      const avatarWrapper = document.createElement('div');
      avatarWrapper.style.cssText = `
        width: clamp(50px, 8vw, 80px);
        height: clamp(50px, 8vw, 80px);
        border-radius: 50%;
        overflow: hidden;
        border: 3px solid #3d5a75;
        background: #1a2f44;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6);
      `;

      const avatar = document.createElement('img');
      avatar.style.cssText = `
        width: 100%;
        height: 100%;
        object-fit: cover;
      `;
      // Use centralized avatar resolver
      avatar.src = global.resolveAvatar ? global.resolveAvatar(player) : getPlayerAvatar(player);
      avatar.alt = player.name || 'Contestant';
      avatar.onerror = function() {
        this.onerror = null;
        const fallbackUrl = global.getAvatarFallback ? 
          global.getAvatarFallback(player.name || player.id, this.src) : 
          getAvatarFallback(player);
        this.src = fallbackUrl;
      };

      avatarWrapper.appendChild(avatar);

      // Name
      const name = document.createElement('div');
      name.style.cssText = `
        font-size: clamp(0.6rem, 1.5vw, 0.85rem);
        font-weight: 600;
        color: #ffffff;
        text-align: center;
        text-shadow: 0 2px 6px rgba(0, 0, 0, 0.9);
        max-width: clamp(60px, 10vw, 100px);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        background: rgba(10, 15, 22, 0.7);
        padding: 2px 6px;
        border-radius: 4px;
      `;
      name.textContent = player.name || 'Guest';

      card.appendChild(avatarWrapper);
      card.appendChild(name);
      circleContainer.appendChild(card);
    });

    // Assemble the animation
    houseFrame.appendChild(houseBackground);
    houseFrame.appendChild(circleContainer);
    overlay.appendChild(houseFrame);

    // Add CSS animations
    if (!document.getElementById('houseCircleStyles')) {
      const style = document.createElement('style');
      style.id = 'houseCircleStyles';
      style.textContent = `
        @keyframes pulseInContestant {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.5);
          }
          50% {
            transform: translate(-50%, -50%) scale(1.1);
          }
          100% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }
        
        @keyframes fadeOutContestant {
          0% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.3);
          }
        }
      `;
      document.head.appendChild(style);
    }

    // Add to page
    document.body.appendChild(overlay);

    // Cleanup and complete after 3 seconds
    setTimeout(() => {
      cleanup();
      if (onComplete) onComplete();
    }, 3000);

    function cleanup() {
      isPlaying = false;

      // Remove overlay
      const overlayEl = document.getElementById('houseCircleOverlay');
      if (overlayEl) {
        overlayEl.style.opacity = '0';
        overlayEl.style.transition = 'opacity 0.3s ease';
        setTimeout(() => overlayEl.remove(), 300);
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
    console.info('[house-circle] Stopping animation');
    
    const overlay = document.getElementById('houseCircleOverlay');
    if (overlay) overlay.remove();
    
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
