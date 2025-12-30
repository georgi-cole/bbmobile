// MODULE: road-to-finale.js
// Pre-jury recap sequence showing the road to finale
// Displays before jury voting begins

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

  // Inject recap styles
  function ensureRecapStyles() {
    if (document.getElementById('roadToFinaleStyles')) return;

    const css = `
      .road-to-finale-overlay {
        position: fixed;
        inset: 0;
        background: rgba(4, 10, 18, 0.96);
        z-index: 999998;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        animation: recapFadeIn 0.4s ease forwards;
        cursor: pointer;
        overflow-y: auto;
        padding: 20px;
      }

      @keyframes recapFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      .road-to-finale-card {
        background: linear-gradient(145deg, #0e1622, #0a131f);
        border: 2px solid rgba(110, 160, 220, 0.25);
        border-radius: 20px;
        padding: 32px 40px;
        max-width: 700px;
        width: 90%;
        margin-bottom: 20px;
        box-shadow: 0 12px 40px -16px rgba(0, 0, 0, 0.9);
        animation: recapSlideIn 0.5s ease-out forwards;
      }

      @keyframes recapSlideIn {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .road-to-finale-title {
        font-size: 1.8rem;
        font-weight: 800;
        color: #ffd96b;
        text-align: center;
        margin-bottom: 8px;
        letter-spacing: 0.8px;
      }

      .road-to-finale-subtitle {
        font-size: 1rem;
        color: #96cfff;
        text-align: center;
        margin-bottom: 24px;
      }

      .road-to-finale-finalists {
        display: flex;
        gap: 40px;
        justify-content: center;
        margin: 24px 0;
      }

      .road-to-finale-finalist {
        text-align: center;
        flex: 1;
        max-width: 200px;
      }

      .road-to-finale-avatar {
        width: 100px;
        height: 100px;
        border-radius: 50%;
        margin: 0 auto 12px;
        border: 3px solid #60a5fa;
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.6);
        overflow: hidden;
      }

      .road-to-finale-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .road-to-finale-name {
        font-size: 1.2rem;
        font-weight: 700;
        color: #eaf4ff;
        margin-bottom: 12px;
      }

      .road-to-finale-stats {
        font-size: 0.85rem;
        color: #96cfff;
        line-height: 1.6;
        text-align: left;
      }

      .road-to-finale-stat-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 4px;
      }

      .road-to-finale-stat-label {
        color: #7a9fc4;
      }

      .road-to-finale-stat-value {
        color: #eaf4ff;
        font-weight: 600;
      }

      .road-to-finale-jury {
        margin-top: 20px;
      }

      .road-to-finale-jury-title {
        font-size: 1.1rem;
        font-weight: 700;
        color: #ffd96b;
        text-align: center;
        margin-bottom: 16px;
      }

      .road-to-finale-jury-avatars {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        justify-content: center;
      }

      .road-to-finale-jury-avatar {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        border: 2px solid #96cfff;
        overflow: hidden;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
      }

      .road-to-finale-jury-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .road-to-finale-skip-hint {
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        color: rgba(255, 255, 255, 0.5);
        font-size: 0.85rem;
        animation: skipHintPulse 2s ease-in-out infinite;
      }

      @keyframes skipHintPulse {
        0%, 100% { opacity: 0.3; }
        50% { opacity: 0.7; }
      }

      /* Mobile responsive */
      @media (max-width: 680px) {
        .road-to-finale-card {
          padding: 24px 20px;
        }

        .road-to-finale-title {
          font-size: 1.4rem;
        }

        .road-to-finale-subtitle {
          font-size: 0.9rem;
        }

        .road-to-finale-finalists {
          flex-direction: column;
          gap: 24px;
        }

        .road-to-finale-finalist {
          max-width: 100%;
        }

        .road-to-finale-avatar {
          width: 80px;
          height: 80px;
        }

        .road-to-finale-name {
          font-size: 1.1rem;
        }

        .road-to-finale-stats {
          font-size: 0.8rem;
        }

        .road-to-finale-jury-avatar {
          width: 50px;
          height: 50px;
        }
      }
    `;

    const style = document.createElement('style');
    style.id = 'roadToFinaleStyles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  /**
   * Get juror IDs
   */
  function getJurors() {
    const g = global.game || {};
    let list = [];

    if (Array.isArray(g.juryHouse) && g.juryHouse.length) {
      list = g.juryHouse.slice();
    } else if (Array.isArray(g.jury) && g.jury.length) {
      list = g.jury.slice();
    } else if (Array.isArray(g.jurors) && g.jurors.length) {
      list = g.jurors.slice();
    } else {
      const players = g.players || global.players || [];
      list = players.filter(p => p?.juror || p?.inJury || p?.in_jury).map(p => p.id).filter(Boolean);
    }

    list = list.map(x => typeof x === 'object' ? x?.id : x).filter(Boolean);
    return list;
  }

  /**
   * Get finalists
   */
  function getFinalists() {
    const g = global.game || {};
    if (Array.isArray(g.finalTwo) && g.finalTwo.length >= 2) {
      return g.finalTwo.slice(0, 2);
    }

    const alive = (global.alivePlayers?.() || []).filter(p => !p.evicted);
    if (alive.length >= 2) {
      return [alive[0].id, alive[1].id];
    }

    const all = (g.players || []).filter(p => !p.evicted).sort((a, b) => (b.threat || 0.5) - (a.threat || 0.5));
    return all.slice(0, 2).map(p => p.id);
  }

  /**
   * Show Road to Finale recap sequence
   * @returns {Promise} Resolves when recap is dismissed
   */
  async function showRoadToFinaleRecap() {
    // Guard: only show once
    const g = global.game || {};
    if (g.__recapShown) {
      console.info('[recap] Already shown, skipping');
      return;
    }
    g.__recapShown = true;

    ensureRecapStyles();

    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'road-to-finale-overlay';

      // Season overview card
      const seasonCard = createSeasonOverviewCard();
      overlay.appendChild(seasonCard);

      // Final 2 showcase card
      const finalistsCard = createFinalistsCard();
      overlay.appendChild(finalistsCard);

      // Jury introduction card
      const juryCard = createJuryCard();
      overlay.appendChild(juryCard);

      // Skip hint
      const skipHint = document.createElement('div');
      skipHint.className = 'road-to-finale-skip-hint';
      skipHint.textContent = 'Tap to continue';
      overlay.appendChild(skipHint);

      document.body.appendChild(overlay);

      // Auto-dismiss timer (declared before dismissRecap to avoid hoisting error)
      let autoDismissTimer = null;

      // Click to skip
      const dismissRecap = () => {
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

      // Auto-dismiss after 18 seconds
      autoDismissTimer = setTimeout(dismissRecap, 18000);

      overlay.addEventListener('click', dismissRecap);
    });
  }

  /**
   * Create season overview card
   */
  function createSeasonOverviewCard() {
    const g = global.game || {};
    const card = document.createElement('div');
    card.className = 'road-to-finale-card';

    const title = document.createElement('div');
    title.className = 'road-to-finale-title';
    title.textContent = `Season ${g.season || 1} — The Road to Finale`;

    const subtitle = document.createElement('div');
    subtitle.className = 'road-to-finale-subtitle';
    
    const totalPlayers = g.players?.length || 16;
    const currentWeek = g.week || 1;
    subtitle.textContent = `${currentWeek} weeks • ${totalPlayers} houseguests → Final 2`;

    card.appendChild(title);
    card.appendChild(subtitle);

    return card;
  }

  /**
   * Create finalists showcase card
   */
  function createFinalistsCard() {
    const card = document.createElement('div');
    card.className = 'road-to-finale-card';

    const title = document.createElement('div');
    title.className = 'road-to-finale-title';
    title.textContent = 'The Final 2';

    const subtitle = document.createElement('div');
    subtitle.className = 'road-to-finale-subtitle';
    subtitle.textContent = 'Only two remain standing';

    card.appendChild(title);
    card.appendChild(subtitle);

    const finalistsContainer = document.createElement('div');
    finalistsContainer.className = 'road-to-finale-finalists';

    const finalistIds = getFinalists();
    finalistIds.forEach(playerId => {
      const player = global.getP?.(playerId);
      if (!player) return;

      const finalistDiv = document.createElement('div');
      finalistDiv.className = 'road-to-finale-finalist';

      // Avatar
      const avatarDiv = document.createElement('div');
      avatarDiv.className = 'road-to-finale-avatar';
      const img = document.createElement('img');
      img.src = getAvatar(playerId);
      img.alt = player.name || 'Finalist';
      img.onerror = function() {
        this.src = getAvatarFallback(player.name || 'player');
      };
      avatarDiv.appendChild(img);

      // Name
      const nameDiv = document.createElement('div');
      nameDiv.className = 'road-to-finale-name';
      nameDiv.textContent = player.name || 'Player';

      // Stats
      const statsDiv = document.createElement('div');
      statsDiv.className = 'road-to-finale-stats';

      const stats = [
        { label: 'HOH Wins', value: player.stats?.hohWins || 0 },
        { label: 'Veto Wins', value: player.stats?.vetoWins || 0 },
        { label: 'Times Nominated', value: player.nominatedCount || 0 },
        { label: 'Times Saved', value: player.stats?.timesSaved || 0 }
      ];

      stats.forEach(stat => {
        const row = document.createElement('div');
        row.className = 'road-to-finale-stat-row';

        const label = document.createElement('span');
        label.className = 'road-to-finale-stat-label';
        label.textContent = stat.label + ':';

        const value = document.createElement('span');
        value.className = 'road-to-finale-stat-value';
        value.textContent = stat.value;

        row.appendChild(label);
        row.appendChild(value);
        statsDiv.appendChild(row);
      });

      finalistDiv.appendChild(avatarDiv);
      finalistDiv.appendChild(nameDiv);
      finalistDiv.appendChild(statsDiv);
      finalistsContainer.appendChild(finalistDiv);
    });

    card.appendChild(finalistsContainer);

    return card;
  }

  /**
   * Create jury introduction card
   */
  function createJuryCard() {
    const card = document.createElement('div');
    card.className = 'road-to-finale-card';

    const juryDiv = document.createElement('div');
    juryDiv.className = 'road-to-finale-jury';

    const title = document.createElement('div');
    title.className = 'road-to-finale-jury-title';
    
    const jurorIds = getJurors();
    title.textContent = `The Jury of ${jurorIds.length} will now decide the winner`;

    const avatarsContainer = document.createElement('div');
    avatarsContainer.className = 'road-to-finale-jury-avatars';

    jurorIds.forEach(jurorId => {
      const juror = global.getP?.(jurorId);
      if (!juror) return;

      const avatarDiv = document.createElement('div');
      avatarDiv.className = 'road-to-finale-jury-avatar';
      avatarDiv.title = juror.name || 'Juror';

      const img = document.createElement('img');
      img.src = getAvatar(jurorId);
      img.alt = juror.name || 'Juror';
      img.onerror = function() {
        this.src = getAvatarFallback(juror.name || 'juror');
      };

      avatarDiv.appendChild(img);
      avatarsContainer.appendChild(avatarDiv);
    });

    juryDiv.appendChild(title);
    juryDiv.appendChild(avatarsContainer);
    card.appendChild(juryDiv);

    return card;
  }

  // Export to global
  global.RoadToFinale = {
    showRoadToFinaleRecap
  };

})(window);
