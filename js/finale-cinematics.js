// MODULE: finale-cinematics.js
// Dramatic cinematic transitions for Final 3 competition flow
// Provides reusable cinematic overlays for part transitions and winner reveals

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

  // Inject cinematic styles
  function ensureCinematicStyles() {
    if (document.getElementById('finaleCinematicStyles')) return;

    const css = `
      .finale-cinematic-overlay {
        position: fixed;
        inset: 0;
        background: radial-gradient(120% 120% at 50% 10%, rgba(2,6,10,.95), rgba(0,0,0,.98));
        z-index: 999999;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: cinematicFadeIn 0.4s ease forwards;
        cursor: pointer;
      }

      @keyframes cinematicFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      .finale-cinematic-content {
        text-align: center;
        max-width: 90vw;
        padding: 24px;
        animation: cinematicSlideUp 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
      }

      @keyframes cinematicSlideUp {
        from { 
          opacity: 0;
          transform: translateY(30px) scale(0.9);
        }
        to { 
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      .finale-cinematic-emoji {
        font-size: 4rem;
        margin-bottom: 16px;
        animation: cinematicPulse 2s ease-in-out infinite;
      }

      @keyframes cinematicPulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.1); }
      }

      .finale-cinematic-avatar {
        width: 140px;
        height: 140px;
        border-radius: 50%;
        margin: 0 auto 20px;
        border: 5px solid #ffd96b;
        box-shadow: 
          0 0 30px rgba(255, 220, 139, 0.6),
          0 8px 20px rgba(0, 0, 0, 0.8);
        animation: cinematicGlow 2s ease-in-out infinite;
        position: relative;
        overflow: hidden;
      }

      @keyframes cinematicGlow {
        0%, 100% { 
          box-shadow: 
            0 0 30px rgba(255, 220, 139, 0.6),
            0 8px 20px rgba(0, 0, 0, 0.8);
        }
        50% { 
          box-shadow: 
            0 0 50px rgba(255, 220, 139, 0.9),
            0 12px 30px rgba(0, 0, 0, 0.9);
        }
      }

      .finale-cinematic-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .finale-cinematic-crown {
        position: absolute;
        top: -20px;
        left: 50%;
        transform: translateX(-50%);
        font-size: 3rem;
        animation: crownDescent 1s ease-out forwards;
      }

      @keyframes crownDescent {
        from {
          top: -80px;
          opacity: 0;
          transform: translateX(-50%) scale(0.5);
        }
        to {
          top: -20px;
          opacity: 1;
          transform: translateX(-50%) scale(1);
        }
      }

      .finale-cinematic-title {
        font-size: 2.5rem;
        font-weight: 800;
        background: linear-gradient(90deg, #ffe9a8, #ffd36b 45%, #fff1c9);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        margin-bottom: 12px;
        letter-spacing: 1.2px;
        text-shadow: 0 0 20px rgba(255, 220, 139, 0.5);
      }

      .finale-cinematic-subtitle {
        font-size: 1.2rem;
        color: #96cfff;
        font-weight: 600;
        margin-bottom: 8px;
        letter-spacing: 0.5px;
      }

      .finale-cinematic-text {
        font-size: 1rem;
        color: #cedbeb;
        margin-top: 8px;
        line-height: 1.5;
      }

      .finale-cinematic-scores {
        margin: 20px auto;
        max-width: 400px;
        text-align: left;
      }

      .finale-cinematic-score-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        margin: 8px 0;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        border-left: 4px solid;
        animation: scoreRowSlide 0.4s ease-out forwards;
        opacity: 0;
      }

      .finale-cinematic-score-row:nth-child(1) {
        border-left-color: #ffd36b;
        animation-delay: 0.2s;
      }

      .finale-cinematic-score-row:nth-child(2) {
        border-left-color: #c0c0c0;
        animation-delay: 0.35s;
      }

      .finale-cinematic-score-row:nth-child(3) {
        border-left-color: #cd7f32;
        animation-delay: 0.5s;
      }

      @keyframes scoreRowSlide {
        from {
          opacity: 0;
          transform: translateX(-20px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }

      .finale-cinematic-score-name {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 1.1rem;
        font-weight: 600;
        color: #fff;
      }

      .finale-cinematic-score-medal {
        font-size: 1.3rem;
      }

      .finale-cinematic-score-value {
        font-size: 1.2rem;
        font-weight: 700;
        color: #ffd36b;
      }

      .finale-cinematic-vs-container {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 40px;
        margin: 24px 0;
      }

      .finale-cinematic-vs {
        font-size: 2.5rem;
        font-weight: 800;
        color: #ff6b6b;
        text-shadow: 0 0 20px rgba(255, 107, 107, 0.6);
      }

      .finale-cinematic-skip-hint {
        position: absolute;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%);
        color: rgba(255, 255, 255, 0.6);
        font-size: 0.85rem;
        animation: skipHintFade 2s ease-in-out infinite;
      }

      @keyframes skipHintFade {
        0%, 100% { opacity: 0.4; }
        50% { opacity: 0.8; }
      }

      /* Mobile responsive */
      @media (max-width: 680px) {
        .finale-cinematic-emoji {
          font-size: 3rem;
        }

        .finale-cinematic-avatar {
          width: 100px;
          height: 100px;
        }

        .finale-cinematic-crown {
          font-size: 2rem;
          top: -15px;
        }

        .finale-cinematic-title {
          font-size: 1.8rem;
        }

        .finale-cinematic-subtitle {
          font-size: 1rem;
        }

        .finale-cinematic-text {
          font-size: 0.9rem;
        }

        .finale-cinematic-vs-container {
          gap: 20px;
        }

        .finale-cinematic-vs {
          font-size: 1.8rem;
        }
      }
    `;

    const style = document.createElement('style');
    style.id = 'finaleCinematicStyles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  /**
   * Show a cinematic overlay
   * @param {Object} options - Configuration
   * @param {string} options.emoji - Emoji to display
   * @param {string} options.title - Main title text
   * @param {string} options.subtitle - Subtitle text
   * @param {string} options.text - Additional text
   * @param {string} options.avatarId - Player ID for avatar
   * @param {Array<string>} options.avatarIds - Multiple player IDs for side-by-side
   * @param {boolean} options.showCrown - Show crown animation
   * @param {number} options.duration - Duration in ms (default: 5000)
   * @param {string} options.music - Music phase to play
   * @returns {Promise} Resolves when cinematic is dismissed
   */
  async function showCinematic(options) {
    ensureCinematicStyles();

    const {
      emoji = '🏆',
      title = '',
      subtitle = '',
      text = '',
      avatarId = null,
      avatarIds = null,
      showCrown = false,
      duration = 5000,
      music = null,
      scores = null  // NEW: Array of {name, score, medal} objects
    } = options;

    return new Promise((resolve) => {
      // Play music if specified
      if (music && typeof global.phaseMusic === 'function') {
        try {
          global.phaseMusic(music);
        } catch (e) {
          console.warn('[cinematic] music error:', e);
        }
      }

      // Create overlay
      const overlay = document.createElement('div');
      overlay.className = 'finale-cinematic-overlay';

      const content = document.createElement('div');
      content.className = 'finale-cinematic-content';

      // Emoji
      if (emoji) {
        const emojiEl = document.createElement('div');
        emojiEl.className = 'finale-cinematic-emoji';
        emojiEl.textContent = emoji;
        content.appendChild(emojiEl);
      }

      // Avatar(s)
      if (avatarIds && avatarIds.length > 1) {
        // Side-by-side avatars for VS display
        const vsContainer = document.createElement('div');
        vsContainer.className = 'finale-cinematic-vs-container';

        avatarIds.forEach((playerId, index) => {
          const player = global.getP?.(playerId);
          if (!player) return;

          const avatarContainer = document.createElement('div');
          avatarContainer.style.textAlign = 'center';

          const avatar = document.createElement('div');
          avatar.className = 'finale-cinematic-avatar';
          const img = document.createElement('img');
          img.src = getAvatar(playerId);
          img.alt = player.name || 'Player';
          img.onerror = function() {
            this.src = getAvatarFallback(player.name || 'player');
          };
          avatar.appendChild(img);

          const nameLabel = document.createElement('div');
          nameLabel.className = 'finale-cinematic-subtitle';
          nameLabel.textContent = player.name || 'Player';
          nameLabel.style.marginTop = '12px';

          avatarContainer.appendChild(avatar);
          avatarContainer.appendChild(nameLabel);
          vsContainer.appendChild(avatarContainer);

          // Add VS between players
          if (index === 0 && avatarIds.length === 2) {
            const vs = document.createElement('div');
            vs.className = 'finale-cinematic-vs';
            vs.textContent = 'VS';
            vsContainer.appendChild(vs);
          }
        });

        content.appendChild(vsContainer);
      } else if (avatarId) {
        // Single avatar
        const player = global.getP?.(avatarId);
        if (player) {
          const avatarContainer = document.createElement('div');
          avatarContainer.className = 'finale-cinematic-avatar';

          const img = document.createElement('img');
          img.src = getAvatar(avatarId);
          img.alt = player.name || 'Player';
          img.onerror = function() {
            this.src = getAvatarFallback(player.name || 'player');
          };
          avatarContainer.appendChild(img);

          // Crown animation
          if (showCrown) {
            const crown = document.createElement('div');
            crown.className = 'finale-cinematic-crown';
            crown.textContent = '👑';
            avatarContainer.appendChild(crown);
          }

          content.appendChild(avatarContainer);
        }
      }

      // Title
      if (title) {
        const titleEl = document.createElement('div');
        titleEl.className = 'finale-cinematic-title';
        titleEl.textContent = title;
        content.appendChild(titleEl);
      }

      // Subtitle
      if (subtitle) {
        const subtitleEl = document.createElement('div');
        subtitleEl.className = 'finale-cinematic-subtitle';
        subtitleEl.textContent = subtitle;
        content.appendChild(subtitleEl);
      }

      // Additional text
      if (text) {
        const textEl = document.createElement('div');
        textEl.className = 'finale-cinematic-text';
        textEl.textContent = text;
        content.appendChild(textEl);
      }

      // Scores display
      if (scores && scores.length > 0) {
        const scoresContainer = document.createElement('div');
        scoresContainer.className = 'finale-cinematic-scores';
        
        scores.forEach((scoreEntry) => {
          const scoreRow = document.createElement('div');
          scoreRow.className = 'finale-cinematic-score-row';
          
          const nameDiv = document.createElement('div');
          nameDiv.className = 'finale-cinematic-score-name';
          
          if (scoreEntry.medal) {
            const medalSpan = document.createElement('span');
            medalSpan.className = 'finale-cinematic-score-medal';
            medalSpan.textContent = scoreEntry.medal;
            nameDiv.appendChild(medalSpan);
          }
          
          const nameSpan = document.createElement('span');
          nameSpan.textContent = scoreEntry.name;
          nameDiv.appendChild(nameSpan);
          
          const valueDiv = document.createElement('div');
          valueDiv.className = 'finale-cinematic-score-value';
          valueDiv.textContent = scoreEntry.score + ' pts';
          
          scoreRow.appendChild(nameDiv);
          scoreRow.appendChild(valueDiv);
          scoresContainer.appendChild(scoreRow);
        });
        
        content.appendChild(scoresContainer);
      }

      // Skip hint
      const skipHint = document.createElement('div');
      skipHint.className = 'finale-cinematic-skip-hint';
      skipHint.textContent = 'Tap to skip';
      overlay.appendChild(skipHint);

      overlay.appendChild(content);
      document.body.appendChild(overlay);

      // Auto-dismiss timer (declared before dismissCinematic to avoid hoisting error)
      let autoDismissTimer = null;

      // Click to skip
      const dismissCinematic = () => {
        if (autoDismissTimer) {
          clearTimeout(autoDismissTimer);
        }
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.3s ease';
        setTimeout(() => {
          overlay.remove();
          resolve();
        }, 300);
      };

      // Auto-dismiss after duration
      autoDismissTimer = setTimeout(dismissCinematic, duration);

      overlay.addEventListener('click', dismissCinematic);
    });
  }

  /**
   * Show Part 1 winner cinematic
   * @param {string} winnerId - Winner player ID
   */
  async function showPart1WinnerCinematic(winnerId) {
    const player = global.getP?.(winnerId);
    if (!player) return;

    await showCinematic({
      emoji: '🏆',
      title: player.name,
      subtitle: 'ADVANCES DIRECTLY TO PART 3!',
      text: 'The two remaining houseguests will face off in Part 2...',
      avatarId: winnerId,
      duration: 4500,
      music: 'hoh'
    });
  }

  /**
   * Show Part 2 winner cinematic
   * @param {string} winnerId - Winner player ID
   */
  async function showPart2WinnerCinematic(winnerId) {
    const player = global.getP?.(winnerId);
    if (!player) return;

    await showCinematic({
      emoji: '🏆',
      title: player.name,
      subtitle: 'EARNS THEIR SPOT IN THE FINAL SHOWDOWN!',
      text: 'Part 3 will determine the Final Head of Household...',
      avatarId: winnerId,
      duration: 4500,
      music: 'hoh'
    });
  }

  /**
   * Show Final Showdown intro cinematic (before Part 3)
   * @param {string} player1Id - First finalist ID
   * @param {string} player2Id - Second finalist ID
   */
  async function showFinalShowdownIntroCinematic(player1Id, player2Id) {
    await showCinematic({
      emoji: '⚔️',
      title: 'THE FINAL SHOWDOWN',
      subtitle: '',
      text: 'The winner becomes Final Head of Household',
      avatarIds: [player1Id, player2Id],
      duration: 5500,
      music: 'hoh'
    });
  }

  /**
   * Show Final HOH crowned cinematic (after Part 3)
   * @param {string} winnerId - Final HOH player ID
   */
  async function showFinalHOHCinematic(winnerId) {
    const player = global.getP?.(winnerId);
    if (!player) return;

    await showCinematic({
      emoji: '👑',
      title: player.name,
      subtitle: 'FINAL HEAD OF HOUSEHOLD!',
      text: 'They alone will decide who sits in the Final 2',
      avatarId: winnerId,
      showCrown: true,
      duration: 6500,
      music: 'hoh'
    });
  }

  /**
   * Show Part 1 results with all scores
   * @param {string} winnerId - Winner player ID
   * @param {Array} scoreboard - Array of {name, score, medal} objects
   */
  async function showPart1ResultsWithScores(winnerId, scoreboard) {
    const player = global.getP?.(winnerId);
    if (!player) return;

    await showCinematic({
      emoji: '🏆',
      title: 'Final 3 Part 1 Results',
      subtitle: player.name.toUpperCase() + ' ADVANCES DIRECTLY TO PART 3!',
      text: 'The two remaining houseguests will face off in Part 2...',
      avatarId: winnerId,
      scores: scoreboard,
      duration: 5000,
      music: 'hoh'
    });
  }

  /**
   * Show Part 2 results with all scores
   * @param {string} winnerId - Winner player ID
   * @param {Array} scoreboard - Array of {name, score, medal} objects
   */
  async function showPart2ResultsWithScores(winnerId, scoreboard) {
    const player = global.getP?.(winnerId);
    if (!player) return;

    await showCinematic({
      emoji: '🏆',
      title: 'Final 3 Part 2 Results',
      subtitle: player.name.toUpperCase() + ' EARNS THEIR SPOT IN THE FINAL SHOWDOWN!',
      text: 'Part 3 will determine the Final Head of Household...',
      avatarId: winnerId,
      scores: scoreboard,
      duration: 5000,
      music: 'hoh'
    });
  }

  /**
   * Show Part 3 results with all scores
   * @param {string} winnerId - Final HOH player ID
   * @param {Array} scoreboard - Array of {name, score, medal} objects
   */
  async function showPart3ResultsWithScores(winnerId, scoreboard) {
    const player = global.getP?.(winnerId);
    if (!player) return;

    await showCinematic({
      emoji: '👑',
      title: 'Final 3 Part 3 Results',
      subtitle: player.name.toUpperCase() + ' IS THE FINAL HEAD OF HOUSEHOLD!',
      text: 'They alone will decide who sits in the Final 2',
      avatarId: winnerId,
      showCrown: true,
      scores: scoreboard,
      duration: 5000,
      music: 'hoh'
    });
  }

  // Export to global
  global.FinaleCinematics = {
    showCinematic,
    showPart1WinnerCinematic,
    showPart2WinnerCinematic,
    showFinalShowdownIntroCinematic,
    showFinalHOHCinematic,
    showPart1ResultsWithScores,
    showPart2ResultsWithScores,
    showPart3ResultsWithScores
  };

})(window);
