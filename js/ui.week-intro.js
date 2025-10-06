// MODULE: ui.week-intro.js
// Week transition modal shown before HOH competition starts each week.
// Displays "Get Ready for Week X" with eye emoji and auto-dismisses.

(function(global) {
  'use strict';

  let modalElement = null;

  function ensureModal() {
    if (modalElement) return modalElement;

    const dim = document.createElement('div');
    dim.className = 'weekIntroDim';
    dim.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 999999;
      display: none;
      align-items: center;
      justify-content: center;
      background: radial-gradient(120% 120% at 50% 10%, rgba(2,6,10,.85), rgba(0,0,0,.95));
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      opacity: 0;
      transition: opacity 0.3s ease;
      cursor: pointer;
    `;

    const content = document.createElement('div');
    content.className = 'weekIntroContent';
    content.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 20px;
      text-align: center;
      padding: 40px;
    `;

    const emojiContainer = document.createElement('div');
    emojiContainer.className = 'weekIntroEmojiContainer';
    emojiContainer.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
    `;

    const eyeEmoji = document.createElement('div');
    eyeEmoji.className = 'weekIntroEmoji';
    eyeEmoji.textContent = '👁️';
    eyeEmoji.style.cssText = `
      font-size: 4rem;
      line-height: 1;
      animation: pulse 1.5s ease-in-out infinite;
    `;

    const houseEmoji = document.createElement('div');
    houseEmoji.className = 'weekIntroEmoji';
    houseEmoji.textContent = '🏠';
    houseEmoji.style.cssText = `
      font-size: 4rem;
      line-height: 1;
      animation: pulse 1.5s ease-in-out infinite 0.2s;
    `;

    emojiContainer.appendChild(eyeEmoji);
    emojiContainer.appendChild(houseEmoji);

    const title = document.createElement('div');
    title.className = 'weekIntroTitle';
    title.style.cssText = `
      font-size: 2.5rem;
      font-weight: 700;
      color: #ffdc8b;
      text-shadow: 0 2px 12px rgba(0,0,0,0.6);
      letter-spacing: 0.05em;
    `;

    const subtitle = document.createElement('div');
    subtitle.className = 'weekIntroSubtitle';
    subtitle.textContent = 'The competition is about to begin';
    subtitle.style.cssText = `
      font-size: 0.95rem;
      color: #b9d4e8;
      opacity: 0.85;
    `;

    const dismissHint = document.createElement('div');
    dismissHint.className = 'weekIntroDismissHint';
    dismissHint.textContent = 'Click to continue';
    dismissHint.style.cssText = `
      font-size: 0.75rem;
      color: rgba(255,255,255,0.5);
      margin-top: 8px;
      opacity: 0.7;
    `;

    content.appendChild(emojiContainer);
    content.appendChild(title);
    content.appendChild(subtitle);
    content.appendChild(dismissHint);
    dim.appendChild(content);

    // Add pulse animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.1); opacity: 0.8; }
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(dim);
    modalElement = dim;
    return dim;
  }

  function showWeekIntroModal(weekNumber, callback) {
    const modal = ensureModal();
    const title = modal.querySelector('.weekIntroTitle');
    
    if (title) {
      title.textContent = `Get Ready for Week ${weekNumber}`;
    }

    // Track dismissal state
    let dismissed = false;
    let timeoutId = null;

    // Dismiss handler
    const dismiss = () => {
      if (dismissed) return;
      dismissed = true;

      // Clear timeout if it exists
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      // Remove event listener
      modal.removeEventListener('click', dismiss);
      modal.removeEventListener('touchstart', dismiss);

      // Fade out
      modal.style.opacity = '0';
      
      setTimeout(() => {
        modal.style.display = 'none';
        
        // Restore scroll
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
        
        // Invoke callback
        if (typeof callback === 'function') {
          callback();
        }
      }, 300); // Wait for fade-out transition
    };

    // Show modal with fade-in
    modal.style.display = 'flex';
    requestAnimationFrame(() => {
      modal.style.opacity = '1';
    });

    // Lock page scroll
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    // Add click/tap event listeners for dismissal
    modal.addEventListener('click', dismiss);
    modal.addEventListener('touchstart', dismiss);

    // Auto-dismiss after 5000ms (5 seconds)
    timeoutId = setTimeout(dismiss, 5000);
  }

  // Expose to global
  global.showWeekIntroModal = showWeekIntroModal;

  // Wrap startHOH to show week intro modal when appropriate
  function wrapStartHOH() {
    const origStartHOH = global.startHOH;
    if (typeof origStartHOH !== 'function') {
      console.warn('[ui.week-intro] startHOH not found — wrapper inactive');
      return;
    }

    let wrapped = false;
    global.startHOH = function wrappedStartHOH() {
      if (wrapped) {
        return origStartHOH.apply(this, arguments);
      }
      wrapped = true;

      const result = function() {
        const g = global.game || {};
        const currentWeek = g.week || 1;
        
        // Guard: only show if not in finale/jury phases and more than 2 alive players
        const alivePlayers = (typeof global.alivePlayers === 'function') ? global.alivePlayers() : [];
        const shouldShow = alivePlayers.length > 2 && 
                          (!g.phase || !['jury', 'finale'].includes(g.phase));
        
        // Check if already shown for this week
        if (shouldShow && g.__weekIntroShownFor !== currentWeek) {
          g.__weekIntroShownFor = currentWeek;
          console.info(`[ui.week-intro] Showing week intro for week ${currentWeek}`);
          
          // Show modal, then call original startHOH
          showWeekIntroModal(currentWeek, () => {
            origStartHOH.apply(this, arguments);
          });
        } else {
          // Already shown or shouldn't show, call original directly
          origStartHOH.apply(this, arguments);
        }
      };

      return result.apply(this, arguments);
    };
  }

  // Install wrapper after a brief delay to ensure startHOH is defined
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(wrapStartHOH, 100);
    }, { once: true });
  } else {
    setTimeout(wrapStartHOH, 100);
  }

  console.info('[ui.week-intro] Module loaded');

})(window);
