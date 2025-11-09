// MODULE: ui.phase-intro-modals.js
// Phase-specific intro modals for Veto, Social Phase, and Live Eviction Vote
// Features: Improved copy, themed styling, click-to-dismiss, accessibility

(function(global) {
  'use strict';

  /**
   * Show Power of Veto Competition intro modal
   * @returns {Promise} Resolves when modal is dismissed
   */
  function showVetoIntroModal() {
    return showPhaseIntroModal({
      type: 'veto',
      icon: '🛡️',
      title: 'Power of Veto Competition',
      body: 'The Power of Veto is up for grabs. Win it to remove a nominee from the block or keep nominations the same. Strategic timing matters—protect allies or force shifts in the game.',
      theme: 'neutral'
    });
  }

  /**
   * Show Social Phase intro modal with flying emojis
   * @returns {Promise} Resolves when modal is dismissed
   */
  function showSocialPhaseIntroModal() {
    return showPhaseIntroModal({
      type: 'social',
      icon: '💬',
      title: 'Social Phase',
      body: 'It\'s time to build influence and shape relationships. Your social actions affect how other players see you and can unlock advantages later.',
      theme: 'social',
      animate: true
    });
  }

  /**
   * Show Live Eviction Vote intro modal with Diary Room styling
   * @returns {Promise} Resolves when modal is dismissed
   */
  function showEvictionVoteIntroModal() {
    return showPhaseIntroModal({
      type: 'eviction',
      icon: '🎤',
      title: 'Live Eviction Vote',
      body: 'You are casting a vote to evict. Choose carefully—your decision affects alliances, trust, and future targets. There is no undo.',
      theme: 'diaryroom'
    });
  }

  /**
   * Core function to display a phase intro modal
   * @param {Object} options - Modal configuration
   * @returns {Promise} Resolves when modal is dismissed
   */
  function showPhaseIntroModal(options) {
    const {
      type,
      icon,
      title,
      body,
      theme = 'neutral',
      animate = false
    } = options;

    return new Promise((resolve) => {
      let dismissed = false;

      // Check for motion preference
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const shouldAnimate = animate && !prefersReducedMotion;

      // Create overlay
      const overlay = document.createElement('div');
      overlay.className = `phase-intro-overlay phase-intro-${type}`;
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-labelledby', `phase-intro-title-${type}`);
      
      // Apply theme-specific overlay styling
      let overlayBg = 'rgba(4, 10, 18, 0.85)';
      
      if (theme === 'diaryroom') {
        // Diary Room: darker background for full-screen effect
        overlayBg = 'rgba(20, 25, 35, 0.95)';
      }
      
      overlay.style.cssText = `
        position: fixed;
        inset: 0;
        background: ${overlayBg};
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 999999;
        cursor: pointer;
        opacity: 0;
        transition: opacity 0.3s ease;
        overflow: hidden;
      `;

      // Add full-screen effects to overlay (behind modal)
      // Flying emojis for social phase
      if (shouldAnimate && theme === 'social') {
        const emojiContainer = document.createElement('div');
        emojiContainer.className = 'phase-intro-emoji-bg';
        emojiContainer.style.cssText = `
          position: absolute;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
        `;
        
        // Flying emojis
        const emojis = ['😎', '🤝', '🎉', '🔥', '💬', '⭐', '🧠', '🤔', '💥', '✨'];
        for (let i = 0; i < 25; i++) {
          const emoji = document.createElement('div');
          emoji.textContent = emojis[Math.floor(Math.random() * emojis.length)];
          emoji.style.cssText = `
            position: absolute;
            font-size: ${30 + Math.random() * 50}px;
            opacity: ${0.2 + Math.random() * 0.3};
            left: ${Math.random() * 100}%;
            animation: float-emoji ${10 + Math.random() * 10}s linear infinite;
            animation-delay: ${Math.random() * 5}s;
          `;
          emojiContainer.appendChild(emoji);
        }
        
        overlay.appendChild(emojiContainer);
      }

      // Diary Room effects for eviction phase
      if (theme === 'diaryroom') {
        // Add LED light strips to overlay (full height)
        const leftLED = document.createElement('div');
        leftLED.style.cssText = `
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 4px;
          background: linear-gradient(180deg, transparent 0%, #6495ed 15%, #6495ed 85%, transparent 100%);
          opacity: 0.7;
          box-shadow: 0 0 20px rgba(100, 149, 237, 0.6);
          pointer-events: none;
        `;
        overlay.appendChild(leftLED);
        
        const rightLED = document.createElement('div');
        rightLED.style.cssText = `
          position: absolute;
          right: 0;
          top: 0;
          bottom: 0;
          width: 4px;
          background: linear-gradient(180deg, transparent 0%, #6495ed 15%, #6495ed 85%, transparent 100%);
          opacity: 0.7;
          box-shadow: 0 0 20px rgba(100, 149, 237, 0.6);
          pointer-events: none;
        `;
        overlay.appendChild(rightLED);
        
        // Add large microphone watermark to overlay
        const micWatermark = document.createElement('div');
        micWatermark.innerHTML = '🎤';
        micWatermark.style.cssText = `
          position: absolute;
          bottom: 5%;
          right: 5%;
          font-size: 15rem;
          opacity: 0.05;
          pointer-events: none;
          user-select: none;
        `;
        overlay.appendChild(micWatermark);
      }

      // Create modal container
      const modal = document.createElement('div');
      modal.className = `phase-intro-modal phase-intro-modal-${theme}`;
      modal.style.cssText = `
        position: relative;
        background: linear-gradient(135deg, #1a2f44 0%, #243a50 100%);
        border: 2px solid #3d5a75;
        border-radius: 20px;
        padding: 40px 50px;
        max-width: 560px;
        width: 90%;
        box-shadow: 0 20px 60px -20px rgba(0, 0, 0, 0.9);
        transform: scale(0.96);
        transition: all 0.24s cubic-bezier(0.34, 1.56, 0.64, 1);
        pointer-events: all;
        cursor: default;
      `;

      // Apply theme-specific modal styling
      if (theme === 'diaryroom') {
        modal.style.background = 'linear-gradient(135deg, #2a1f2f 0%, #3a2f3f 100%)';
        modal.style.border = '2px solid #5a4f6f';
      }

      // Create dismiss hint
      const dismissHint = document.createElement('div');
      dismissHint.textContent = 'Click to dismiss';
      dismissHint.style.cssText = `
        position: absolute;
        top: 14px;
        right: 18px;
        font-size: 0.7rem;
        color: rgba(255, 255, 255, 0.35);
        font-weight: 500;
        pointer-events: none;
        z-index: 10;
      `;
      modal.appendChild(dismissHint);

      // Create content wrapper
      const content = document.createElement('div');
      content.style.cssText = `
        position: relative;
        z-index: 1;
        text-align: center;
      `;

      // Create icon
      const iconEl = document.createElement('div');
      iconEl.style.cssText = `
        font-size: 4rem;
        margin-bottom: 20px;
        line-height: 1;
      `;
      iconEl.textContent = icon;
      content.appendChild(iconEl);

      // Create title
      const titleEl = document.createElement('h2');
      titleEl.id = `phase-intro-title-${type}`;
      titleEl.style.cssText = `
        font-size: 2rem;
        font-weight: 700;
        color: #ffffff;
        margin: 0 0 16px 0;
        text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
        letter-spacing: 0.5px;
      `;
      titleEl.textContent = title;
      content.appendChild(titleEl);

      // Create body text
      const bodyEl = document.createElement('p');
      bodyEl.style.cssText = `
        font-size: 1rem;
        color: #b2c2d5;
        line-height: 1.6;
        margin: 0;
        font-weight: 400;
      `;
      bodyEl.textContent = body;
      content.appendChild(bodyEl);

      modal.appendChild(content);
      overlay.appendChild(modal);

      // Add CSS animation for flying emojis (if needed)
      if (shouldAnimate && theme === 'social') {
        const style = document.createElement('style');
        style.textContent = `
          @keyframes float-emoji {
            0% {
              transform: translateY(100vh) rotate(0deg);
            }
            100% {
              transform: translateY(-100px) rotate(360deg);
            }
          }
        `;
        document.head.appendChild(style);
      }

      // Add to document
      document.body.appendChild(overlay);

      // Focus trap - focus the modal
      modal.setAttribute('tabindex', '-1');
      modal.focus();

      // Animate in
      requestAnimationFrame(() => {
        overlay.style.opacity = '1';
        if (!prefersReducedMotion) {
          modal.style.transform = 'scale(1)';
        } else {
          modal.style.transform = 'scale(1)';
          modal.style.transition = 'none';
        }
      });

      // Dismiss handler
      const dismiss = () => {
        if (dismissed) return;
        dismissed = true;

        // Animate out
        overlay.style.opacity = '0';
        if (!prefersReducedMotion) {
          modal.style.transform = 'scale(0.96)';
        }

        setTimeout(() => {
          if (overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
          }
          resolve();
        }, 300);
      };

      // Click outside or on overlay to dismiss
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          dismiss();
        }
      });

      // Click anywhere on modal to dismiss
      modal.addEventListener('click', dismiss);

      // Escape key to dismiss
      const keyHandler = (e) => {
        if (e.key === 'Escape') {
          dismiss();
        }
      };
      document.addEventListener('keydown', keyHandler, { once: true });

      // Cleanup on dismiss
      overlay.addEventListener('transitionend', () => {
        document.removeEventListener('keydown', keyHandler);
      }, { once: true });
    });
  }

  // Expose functions globally
  global.showVetoIntroModal = showVetoIntroModal;
  global.showSocialPhaseIntroModal = showSocialPhaseIntroModal;
  global.showEvictionVoteIntroModal = showEvictionVoteIntroModal;

  console.info('[ui.phase-intro-modals] Phase intro modal system initialized');

})(window);
