// MODULE: creditsVideo.js
// Play outro.mp4 video when Credits button is clicked

(function(global) {
  'use strict';

  const OUTRO_URL = 'assets/videos/outro.mp4';
  let isPlaying = false;

  /**
   * Play the credits/outro video
   */
  function play() {
    if (isPlaying) {
      console.warn('[creditsVideo] Video already playing');
      return;
    }

    console.info('[creditsVideo] Playing outro video');
    isPlaying = true;

    // Remove any existing video overlay
    const existing = document.getElementById('creditsVideoOverlay');
    if (existing) {
      existing.remove();
    }

    // Lock body scroll
    document.body.style.overflow = 'hidden';

    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'creditsVideoOverlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: #000;
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    // Create video container
    const container = document.createElement('div');
    container.style.cssText = `
      position: relative;
      width: 100%;
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #000;
    `;

    // Create video element
    const video = document.createElement('video');
    video.style.cssText = `
      width: 100%;
      height: 100%;
      max-width: 100vw;
      max-height: 100vh;
      object-fit: contain;
      display: block;
      background: #000;
    `;
    video.src = OUTRO_URL;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.controls = false;
    video.autoplay = false;
    video.muted = false;

    // Create skip button
    const skipBtn = document.createElement('button');
    skipBtn.textContent = 'Skip';
    skipBtn.style.cssText = `
      position: absolute;
      top: 20px;
      right: 20px;
      padding: 10px 20px;
      background: rgba(0, 0, 0, 0.7);
      color: white;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      z-index: 10000;
      transition: all 200ms ease;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
    `;

    skipBtn.addEventListener('mouseenter', () => {
      skipBtn.style.background = 'rgba(255, 255, 255, 0.2)';
      skipBtn.style.transform = 'scale(1.05)';
    });

    skipBtn.addEventListener('mouseleave', () => {
      skipBtn.style.background = 'rgba(0, 0, 0, 0.7)';
      skipBtn.style.transform = 'scale(1)';
    });

    skipBtn.addEventListener('click', stop);

    // Handle video end
    video.addEventListener('ended', () => {
      console.info('[creditsVideo] Video ended');
      stop();
    });

    // Handle video error
    video.addEventListener('error', (e) => {
      console.error('[creditsVideo] Video error:', e);
      stop();
    });

    // Assemble
    container.appendChild(video);
    container.appendChild(skipBtn);
    overlay.appendChild(container);
    document.body.appendChild(overlay);

    // Play video
    video.play().then(() => {
      console.info('[creditsVideo] Video started playing');
    }).catch((err) => {
      console.error('[creditsVideo] Failed to play video:', err);
      stop();
    });
  }

  /**
   * Stop and remove the video
   */
  function stop() {
    console.info('[creditsVideo] Stopping video');
    isPlaying = false;

    const overlay = document.getElementById('creditsVideoOverlay');
    if (overlay) {
      const video = overlay.querySelector('video');
      if (video) {
        video.pause();
        video.src = '';
      }
      overlay.remove();
    }

    // Restore body scroll
    document.body.style.overflow = '';
  }

  // Expose to global scope
  global.CreditsVideo = {
    play,
    stop
  };

  console.info('[creditsVideo] Module loaded');

})(window);
