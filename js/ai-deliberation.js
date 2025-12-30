// MODULE: ai-deliberation.js
// AI HOH deliberation animation for Final 3 eviction decision
// Shows AI "thinking" process before revealing their choice

(function(global) {
  'use strict';

  // Import centralized avatar resolver
  const getAvatar = global.resolveAvatar || function(playerId) {
    const player = global.getP?.(playerId);
    if (!player) return `https://api.dicebear.com/6.x/bottts/svg?seed=${encodeURIComponent(String(playerId))}`;
    return player.avatar || `./avatars/${player.name}.png`;
  };

  const getAvatarFallback = global.getAvatarFallback || function(name) {
    return `https://api.dicebear.com/6.x/bottts/svg?seed=${encodeURIComponent(name || 'player')}`;
  };

  // Inject deliberation styles
  function ensureDeliberationStyles() {
    if (document.getElementById('aiDeliberationStyles')) return;

    const css = `
      .ai-deliberation-overlay {
        position: fixed;
        inset: 0;
        background: rgba(4, 10, 18, 0.94);
        z-index: 999997;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: deliberationFadeIn 0.4s ease forwards;
        padding: 20px;
      }

      @keyframes deliberationFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      .ai-deliberation-container {
        background: linear-gradient(145deg, #0e1622, #0a131f);
        border: 2px solid rgba(110, 160, 220, 0.25);
        border-radius: 24px;
        padding: 40px 48px;
        max-width: 800px;
        width: 90%;
        box-shadow: 0 16px 48px -16px rgba(0, 0, 0, 0.9);
      }

      .ai-deliberation-title {
        font-size: 1.4rem;
        font-weight: 700;
        color: #ffd96b;
        text-align: center;
        margin-bottom: 24px;
        letter-spacing: 0.6px;
      }

      .ai-deliberation-content {
        display: flex;
        gap: 32px;
        align-items: center;
      }

      .ai-deliberation-hoh {
        flex: 1;
        text-align: center;
      }

      .ai-deliberation-hoh-avatar {
        width: 120px;
        height: 120px;
        border-radius: 50%;
        margin: 0 auto 12px;
        border: 4px solid #ffd96b;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.7);
        position: relative;
        overflow: hidden;
        animation: deliberationPulse 2s ease-in-out infinite;
      }

      @keyframes deliberationPulse {
        0%, 100% { 
          transform: scale(1);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.7);
        }
        50% { 
          transform: scale(1.05);
          box-shadow: 0 12px 32px rgba(255, 220, 139, 0.5);
        }
      }

      .ai-deliberation-hoh-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .ai-deliberation-hoh-name {
        font-size: 1.1rem;
        font-weight: 700;
        color: #eaf4ff;
        margin-bottom: 8px;
      }

      .ai-deliberation-status {
        font-size: 0.9rem;
        color: #96cfff;
        font-style: italic;
      }

      .ai-deliberation-divider {
        width: 2px;
        height: 180px;
        background: linear-gradient(to bottom, transparent, rgba(110, 160, 220, 0.3), transparent);
      }

      .ai-deliberation-nominees {
        flex: 1;
      }

      .ai-deliberation-nominees-title {
        font-size: 0.9rem;
        color: #96cfff;
        text-align: center;
        margin-bottom: 16px;
        text-transform: uppercase;
        letter-spacing: 0.8px;
      }

      .ai-deliberation-nominee-list {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .ai-deliberation-nominee {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        background: rgba(255, 255, 255, 0.03);
        border-radius: 12px;
        border: 1px solid rgba(110, 160, 220, 0.15);
      }

      .ai-deliberation-nominee-avatar {
        width: 50px;
        height: 50px;
        border-radius: 50%;
        border: 2px solid #ff6b6b;
        overflow: hidden;
        flex-shrink: 0;
      }

      .ai-deliberation-nominee-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .ai-deliberation-nominee-name {
        font-size: 1rem;
        font-weight: 600;
        color: #eaf4ff;
      }

      .ai-deliberation-thought-bubble {
        margin-top: 24px;
        padding: 16px 20px;
        background: rgba(150, 207, 255, 0.08);
        border: 1px solid rgba(150, 207, 255, 0.2);
        border-radius: 16px;
        text-align: center;
        min-height: 60px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .ai-deliberation-thought {
        font-size: 0.95rem;
        color: #96cfff;
        font-style: italic;
        animation: thoughtFade 2s ease-in-out infinite;
      }

      @keyframes thoughtFade {
        0%, 100% { opacity: 0.5; }
        50% { opacity: 1; }
      }

      .ai-deliberation-spinner {
        display: inline-block;
        width: 16px;
        height: 16px;
        border: 2px solid rgba(150, 207, 255, 0.3);
        border-top-color: #96cfff;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-left: 8px;
      }

      @keyframes spin {
        to { transform: rotate(360deg); }
      }

      /* Mobile responsive */
      @media (max-width: 680px) {
        .ai-deliberation-container {
          padding: 28px 24px;
        }

        .ai-deliberation-title {
          font-size: 1.2rem;
        }

        .ai-deliberation-content {
          flex-direction: column;
          gap: 24px;
        }

        .ai-deliberation-divider {
          width: 80%;
          height: 2px;
          background: linear-gradient(to right, transparent, rgba(110, 160, 220, 0.3), transparent);
        }

        .ai-deliberation-hoh-avatar {
          width: 100px;
          height: 100px;
        }

        .ai-deliberation-thought-bubble {
          margin-top: 16px;
          padding: 12px 16px;
        }

        .ai-deliberation-thought {
          font-size: 0.85rem;
        }
      }
    `;

    const style = document.createElement('style');
    style.id = 'aiDeliberationStyles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  /**
   * Show AI deliberation animation
   * @param {string} hohId - HOH player ID
   * @param {Array<string>} nomineeIds - Nominee player IDs
   * @param {boolean} pleaSubmitted - Whether human submitted a plea
   * @param {number} duration - Duration in ms (default: 6000)
   * @returns {Promise} Resolves when deliberation is complete
   */
  async function showAIDeliberation(hohId, nomineeIds, pleaSubmitted = false, duration = 6000) {
    ensureDeliberationStyles();

    const hoh = global.getP?.(hohId);
    if (!hoh) {
      console.warn('[deliberation] HOH not found:', hohId);
      return;
    }

    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'ai-deliberation-overlay';

      const container = document.createElement('div');
      container.className = 'ai-deliberation-container';

      // Title
      const title = document.createElement('div');
      title.className = 'ai-deliberation-title';
      title.textContent = 'Final 3 Eviction Decision';
      container.appendChild(title);

      // Content
      const content = document.createElement('div');
      content.className = 'ai-deliberation-content';

      // HOH section
      const hohSection = createHOHSection(hohId);
      content.appendChild(hohSection);

      // Divider
      const divider = document.createElement('div');
      divider.className = 'ai-deliberation-divider';
      content.appendChild(divider);

      // Nominees section
      const nomineesSection = createNomineesSection(nomineeIds);
      content.appendChild(nomineesSection);

      container.appendChild(content);

      // Thought bubble with rotating considerations
      const thoughtBubble = createThoughtBubble(pleaSubmitted);
      container.appendChild(thoughtBubble);

      overlay.appendChild(container);
      document.body.appendChild(overlay);

      // Rotate through different thoughts
      const thoughts = [
        'Weighing the options...',
        'Considering jury votes...',
        'Analyzing competition threats...',
        'Evaluating our alliance...',
        'Who can I beat in the end?...'
      ];

      if (pleaSubmitted) {
        thoughts.splice(1, 0, 'Reflecting on their plea...');
      }

      let thoughtIndex = 0;
      const thoughtEl = thoughtBubble.querySelector('.ai-deliberation-thought');

      const thoughtRotation = setInterval(() => {
        thoughtIndex = (thoughtIndex + 1) % thoughts.length;
        thoughtEl.textContent = thoughts[thoughtIndex];
      }, 2000);

      // Auto-dismiss after duration
      setTimeout(() => {
        clearInterval(thoughtRotation);
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.3s ease';
        setTimeout(() => {
          overlay.remove();
          resolve();
        }, 300);
      }, duration);
    });
  }

  /**
   * Create HOH section
   */
  function createHOHSection(hohId) {
    const hoh = global.getP?.(hohId);
    if (!hoh) return document.createElement('div');

    const section = document.createElement('div');
    section.className = 'ai-deliberation-hoh';

    // Avatar
    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'ai-deliberation-hoh-avatar';
    const img = document.createElement('img');
    img.src = getAvatar(hohId);
    img.alt = hoh.name || 'HOH';
    img.onerror = function() {
      this.src = getAvatarFallback(hoh.name || 'player');
    };
    avatarDiv.appendChild(img);

    // Name
    const nameDiv = document.createElement('div');
    nameDiv.className = 'ai-deliberation-hoh-name';
    nameDiv.textContent = hoh.name || 'HOH';

    // Status
    const statusDiv = document.createElement('div');
    statusDiv.className = 'ai-deliberation-status';
    statusDiv.innerHTML = 'Deliberating<span class="ai-deliberation-spinner"></span>';

    section.appendChild(avatarDiv);
    section.appendChild(nameDiv);
    section.appendChild(statusDiv);

    return section;
  }

  /**
   * Create nominees section
   */
  function createNomineesSection(nomineeIds) {
    const section = document.createElement('div');
    section.className = 'ai-deliberation-nominees';

    const title = document.createElement('div');
    title.className = 'ai-deliberation-nominees-title';
    title.textContent = 'On The Block';
    section.appendChild(title);

    const list = document.createElement('div');
    list.className = 'ai-deliberation-nominee-list';

    nomineeIds.forEach(nomineeId => {
      const nominee = global.getP?.(nomineeId);
      if (!nominee) return;

      const nomineeDiv = document.createElement('div');
      nomineeDiv.className = 'ai-deliberation-nominee';

      // Avatar
      const avatarDiv = document.createElement('div');
      avatarDiv.className = 'ai-deliberation-nominee-avatar';
      const img = document.createElement('img');
      img.src = getAvatar(nomineeId);
      img.alt = nominee.name || 'Nominee';
      img.onerror = function() {
        this.src = getAvatarFallback(nominee.name || 'player');
      };
      avatarDiv.appendChild(img);

      // Name
      const nameDiv = document.createElement('div');
      nameDiv.className = 'ai-deliberation-nominee-name';
      nameDiv.textContent = nominee.name || 'Nominee';

      nomineeDiv.appendChild(avatarDiv);
      nomineeDiv.appendChild(nameDiv);
      list.appendChild(nomineeDiv);
    });

    section.appendChild(list);

    return section;
  }

  /**
   * Create thought bubble
   */
  function createThoughtBubble(pleaSubmitted) {
    const bubble = document.createElement('div');
    bubble.className = 'ai-deliberation-thought-bubble';

    const thought = document.createElement('div');
    thought.className = 'ai-deliberation-thought';
    thought.textContent = pleaSubmitted ? 'Reflecting on their plea...' : 'Weighing the options...';

    bubble.appendChild(thought);

    return bubble;
  }

  // Export to global
  global.AIDeliberation = {
    showAIDeliberation
  };

})(window);
