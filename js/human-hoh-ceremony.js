// MODULE: human-hoh-ceremony.js
// Fullscreen ceremony UI for when human player is Final HOH
// Shows nominees making pleas before the human makes their eviction decision

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

  // Inject ceremony styles
  function ensureCeremonyStyles() {
    if (document.getElementById('humanHOHCeremonyStyles')) return;

    const css = `
      .human-hoh-ceremony-overlay {
        position: fixed;
        inset: 0;
        background: linear-gradient(135deg, rgba(4, 10, 18, 0.96) 0%, rgba(10, 10, 30, 0.98) 100%);
        z-index: 999998;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: ceremonyFadeIn 0.5s ease forwards;
        padding: 20px;
        overflow-y: auto;
      }

      @keyframes ceremonyFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      .human-hoh-ceremony-container {
        background: linear-gradient(145deg, #0e1622, #0a131f);
        border: 2px solid rgba(255, 220, 139, 0.4);
        border-radius: 24px;
        padding: 32px 40px;
        max-width: 900px;
        width: 95%;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.9);
      }

      .human-hoh-ceremony-header {
        text-align: center;
        margin-bottom: 32px;
      }

      .human-hoh-ceremony-title {
        font-size: 1.6rem;
        font-weight: 700;
        color: #ffd96b;
        margin: 0 0 12px 0;
        letter-spacing: 0.6px;
      }

      .human-hoh-ceremony-subtitle {
        font-size: 1rem;
        color: #96cfff;
        margin: 0;
        line-height: 1.5;
      }

      .human-hoh-ceremony-nominees {
        display: flex;
        flex-direction: column;
        gap: 24px;
        margin-bottom: 32px;
      }

      .human-hoh-nominee-card {
        background: linear-gradient(145deg, rgba(30, 30, 60, 0.5), rgba(20, 20, 50, 0.5));
        border: 2px solid rgba(110, 160, 220, 0.25);
        border-radius: 16px;
        padding: 24px;
        transition: all 0.3s ease;
      }

      .human-hoh-nominee-card:hover {
        border-color: rgba(110, 160, 220, 0.5);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
      }

      .human-hoh-nominee-header {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 16px;
      }

      .human-hoh-nominee-avatar {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        border: 3px solid #ff6b6b;
        overflow: hidden;
        flex-shrink: 0;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6);
      }

      .human-hoh-nominee-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .human-hoh-nominee-info {
        flex: 1;
      }

      .human-hoh-nominee-name {
        font-size: 1.3rem;
        font-weight: 700;
        color: #eaf4ff;
        margin: 0 0 4px 0;
      }

      .human-hoh-nominee-status {
        font-size: 0.9rem;
        color: #ff9999;
        font-style: italic;
      }

      .human-hoh-nominee-plea {
        background: rgba(150, 207, 255, 0.08);
        border: 1px solid rgba(150, 207, 255, 0.2);
        border-radius: 12px;
        padding: 16px 20px;
        margin-bottom: 16px;
      }

      .human-hoh-nominee-plea-label {
        font-size: 0.8rem;
        color: #96cfff;
        text-transform: uppercase;
        letter-spacing: 0.8px;
        margin-bottom: 8px;
      }

      .human-hoh-nominee-plea-text {
        font-size: 1rem;
        color: #eaf4ff;
        line-height: 1.6;
        font-style: italic;
      }

      .human-hoh-nominee-actions {
        display: flex;
        justify-content: flex-end;
      }

      .human-hoh-evict-btn {
        background: linear-gradient(135deg, #dc2626, #991b1b);
        border: 2px solid #ef4444;
        border-radius: 12px;
        padding: 12px 32px;
        font-size: 1.05rem;
        font-weight: 600;
        color: #fff;
        cursor: pointer;
        transition: all 0.2s ease;
        box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
      }

      .human-hoh-evict-btn:hover {
        background: linear-gradient(135deg, #ef4444, #b91c1c);
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(220, 38, 38, 0.5);
      }

      .human-hoh-evict-btn:active {
        transform: translateY(0);
      }

      .human-hoh-evict-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none;
      }

      .human-hoh-ceremony-footer {
        text-align: center;
        padding-top: 16px;
        border-top: 1px solid rgba(110, 160, 220, 0.2);
      }

      .human-hoh-ceremony-hint {
        font-size: 0.9rem;
        color: #8a9ab8;
        font-style: italic;
      }

      /* Mobile responsive */
      @media (max-width: 680px) {
        .human-hoh-ceremony-container {
          padding: 24px 20px;
        }

        .human-hoh-ceremony-title {
          font-size: 1.3rem;
        }

        .human-hoh-ceremony-subtitle {
          font-size: 0.9rem;
        }

        .human-hoh-nominee-header {
          flex-direction: column;
          text-align: center;
        }

        .human-hoh-nominee-avatar {
          width: 70px;
          height: 70px;
        }

        .human-hoh-nominee-name {
          font-size: 1.15rem;
        }

        .human-hoh-evict-btn {
          width: 100%;
          padding: 14px 24px;
        }
      }
    `;

    const style = document.createElement('style');
    style.id = 'humanHOHCeremonyStyles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  /**
   * Generate AI plea text for a nominee
   * @param {Object} nominee - Nominee player object
   * @param {Object} hoh - HOH player object
   * @param {Object} otherNominee - The other nominee player object
   * @returns {string} Plea text
   */
  function generateNomineePlea(nominee, hoh, otherNominee) {
    const affinity = nominee.affinity?.[hoh.id] ?? 0;
    const otherAffinity = otherNominee.affinity?.[hoh.id] ?? 0;

    // Plea templates based on relationship and strategy
    const strongAlliancePleas = [
      `${hoh.name}, we've been allies since day one. I've had your back through every vote, and I'll have it to the end. Take me to Final 2.`,
      `You know I'm loyal, ${hoh.name}. We made it this far together. Don't let our alliance end here—take me with you.`,
      `${hoh.name}, I've proven my loyalty to you all season. Let's finish this journey together in the Final 2.`,
      `We've been working together this whole game, ${hoh.name}. Honor our alliance and take me to the end.`
    ];

    const weakerCompetitorPleas = [
      `${hoh.name}, look at my competition record. You can beat me in the finale. ${otherNominee.name} is the bigger threat to your game.`,
      `I'm not the comp beast here, ${hoh.name}. Take me to Final 2 and you'll have a much better shot at winning this game.`,
      `The jury respects comp wins, ${hoh.name}. ${otherNominee.name} has more wins than me. You can beat me easier.`,
      `Think strategically, ${hoh.name}. I'm the weaker competitor. Taking me to Final 2 gives you the best chance to win.`
    ];

    const juryThreatPleas = [
      `${otherNominee.name} has stronger relationships with the jury than I do. You'll have a better chance of winning against me.`,
      `The jury loves ${otherNominee.name}, ${hoh.name}. If you take them, you're handing them the win. Take me instead.`,
      `${hoh.name}, think about jury votes. ${otherNominee.name} has more friends on the jury. I'm your better bet.`,
      `You know the jury will vote for ${otherNominee.name} over you. I'm the safer choice for Final 2.`
    ];

    const desperatePleas = [
      `${hoh.name}, I'll campaign for you in the jury house if you save me. You have my vote, guaranteed.`,
      `I'm begging you, ${hoh.name}. I've worked too hard to go home now. Please take me to Final 2.`,
      `${hoh.name}, you owe me this. Remember when I had your back during the vote? It's time to return the favor.`,
      `Please, ${hoh.name}. I need this more than ${otherNominee.name} does. Take me to the end.`
    ];

    const respectfulPleas = [
      `${hoh.name}, you've played an incredible game. I respect your decision, but I hope you'll see that taking me to Final 2 is your best move.`,
      `I know this isn't an easy decision, ${hoh.name}. I just want you to know I think you deserve to win, and I'll vote for you if I'm on the jury.`,
      `${hoh.name}, you've earned this power. I just hope you see me as the better option to take to the end.`,
      `Whatever you decide, ${hoh.name}, I respect it. But I believe we'd make a strong Final 2 together.`
    ];

    // Select plea category based on affinity and other factors
    let pleas;
    if (affinity > 0.2) {
      // Strong alliance
      pleas = strongAlliancePleas;
    } else if (affinity < -0.1) {
      // Poor relationship - try desperate or strategic angle
      pleas = Math.random() > 0.5 ? desperatePleas : weakerCompetitorPleas;
    } else if (otherAffinity > affinity + 0.15) {
      // Other nominee has better relationship - emphasize jury threat
      pleas = juryThreatPleas;
    } else if (nominee.compWins < otherNominee.compWins) {
      // Fewer comp wins - emphasize being easier to beat
      pleas = weakerCompetitorPleas;
    } else {
      // Default to respectful plea
      pleas = respectfulPleas;
    }

    return pleas[Math.floor(Math.random() * pleas.length)];
  }

  /**
   * Show human HOH ceremony
   * @param {Object} options
   * @param {Object} options.hoh - HOH player object
   * @param {Array} options.nominees - Array of nominee player objects [nominee1, nominee2]
   * @param {Function} options.onEvict - Callback with evicted player ID
   * @returns {HTMLElement} Overlay element
   */
  function show(options) {
    const { hoh, nominees, onEvict } = options;

    if (!hoh || !nominees || nominees.length !== 2) {
      console.error('[HumanHOHCeremony] Invalid options', options);
      return null;
    }

    ensureCeremonyStyles();

    // Pause phase timer during ceremony
    if (typeof global.pausePhaseTimer === 'function') {
      global.pausePhaseTimer();
    }

    const overlay = document.createElement('div');
    overlay.className = 'human-hoh-ceremony-overlay';

    const container = document.createElement('div');
    container.className = 'human-hoh-ceremony-container';

    // Header
    const header = document.createElement('div');
    header.className = 'human-hoh-ceremony-header';

    const title = document.createElement('h2');
    title.className = 'human-hoh-ceremony-title';
    title.textContent = '🎬 Final 3 Eviction Ceremony';
    header.appendChild(title);

    const subtitle = document.createElement('p');
    subtitle.className = 'human-hoh-ceremony-subtitle';
    subtitle.innerHTML = `As Final HOH, <strong>${hoh.name}</strong>, you must evict one houseguest.<br>Both nominees will make their final plea to stay.`;
    header.appendChild(subtitle);

    container.appendChild(header);

    // Nominees section
    const nomineesSection = document.createElement('div');
    nomineesSection.className = 'human-hoh-ceremony-nominees';

    nominees.forEach(nominee => {
      const otherNominee = nominees.find(n => n.id !== nominee.id);
      const card = createNomineeCard(nominee, hoh, otherNominee, onEvict, overlay);
      nomineesSection.appendChild(card);
    });

    container.appendChild(nomineesSection);

    // Footer
    const footer = document.createElement('div');
    footer.className = 'human-hoh-ceremony-footer';

    const hint = document.createElement('p');
    hint.className = 'human-hoh-ceremony-hint';
    hint.textContent = 'Choose wisely — this decision determines who sits beside you in the Final 2.';
    footer.appendChild(hint);

    container.appendChild(footer);

    overlay.appendChild(container);
    document.body.appendChild(overlay);

    return overlay;
  }

  /**
   * Create nominee card with plea and evict button
   */
  function createNomineeCard(nominee, hoh, otherNominee, onEvict, overlay) {
    const card = document.createElement('div');
    card.className = 'human-hoh-nominee-card';

    // Header
    const header = document.createElement('div');
    header.className = 'human-hoh-nominee-header';

    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'human-hoh-nominee-avatar';
    const img = document.createElement('img');
    img.src = getAvatar(nominee.id);
    img.alt = nominee.name || 'Nominee';
    img.onerror = function() {
      this.src = getAvatarFallback(nominee.name || 'player');
    };
    avatarDiv.appendChild(img);

    const info = document.createElement('div');
    info.className = 'human-hoh-nominee-info';

    const name = document.createElement('h3');
    name.className = 'human-hoh-nominee-name';
    name.textContent = nominee.name || 'Nominee';
    info.appendChild(name);

    const status = document.createElement('p');
    status.className = 'human-hoh-nominee-status';
    status.textContent = 'On The Block';
    info.appendChild(status);

    header.appendChild(avatarDiv);
    header.appendChild(info);
    card.appendChild(header);

    // Plea
    const pleaDiv = document.createElement('div');
    pleaDiv.className = 'human-hoh-nominee-plea';

    const pleaLabel = document.createElement('div');
    pleaLabel.className = 'human-hoh-nominee-plea-label';
    pleaLabel.textContent = 'Final Plea:';
    pleaDiv.appendChild(pleaLabel);

    const pleaText = document.createElement('div');
    pleaText.className = 'human-hoh-nominee-plea-text';
    pleaText.textContent = `"${generateNomineePlea(nominee, hoh, otherNominee)}"`;
    pleaDiv.appendChild(pleaText);

    card.appendChild(pleaDiv);

    // Actions
    const actions = document.createElement('div');
    actions.className = 'human-hoh-nominee-actions';

    const evictBtn = document.createElement('button');
    evictBtn.className = 'human-hoh-evict-btn';
    evictBtn.textContent = `Evict ${nominee.name}`;
    evictBtn.onclick = () => {
      // Disable all evict buttons
      const allButtons = overlay.querySelectorAll('.human-hoh-evict-btn');
      allButtons.forEach(btn => btn.disabled = true);

      // Show confirmation modal
      showConfirmationModal(nominee, hoh, () => {
        cleanup(overlay);
        if (onEvict) onEvict(nominee.id);
      }, () => {
        // Re-enable buttons if cancelled
        allButtons.forEach(btn => btn.disabled = false);
      });
    };

    actions.appendChild(evictBtn);
    card.appendChild(actions);

    return card;
  }

  /**
   * Show confirmation modal
   */
  function showConfirmationModal(nominee, hoh, onConfirm, onCancel) {
    if (typeof global.showEvictionJustificationModal === 'function') {
      // Use existing justification modal if available
      global.showEvictionJustificationModal(nominee, hoh, onConfirm, onCancel);
    } else {
      // Simple confirmation
      const confirmed = confirm(`Are you sure you want to evict ${nominee.name}?`);
      if (confirmed) {
        onConfirm();
      } else if (onCancel) {
        onCancel();
      }
    }
  }

  /**
   * Clean up ceremony overlay
   */
  function cleanup(overlay) {
    if (overlay && overlay.parentNode) {
      overlay.style.opacity = '0';
      overlay.style.transition = 'opacity 0.3s ease';
      setTimeout(() => {
        overlay.remove();
      }, 300);
    }

    // Resume phase timer
    if (typeof global.resumePhaseTimer === 'function') {
      global.resumePhaseTimer();
    }
  }

  /**
   * Check if ceremony is active
   */
  function isActive() {
    return document.querySelector('.human-hoh-ceremony-overlay') !== null;
  }

  // Public API
  const HumanHOHCeremony = {
    show,
    cleanup,
    isActive
  };

  // Export to global
  global.HumanHOHCeremony = HumanHOHCeremony;

})(window);
