// MODULE: ui.veto-results.js
// Renders a full leaderboard-style results panel for veto competition results
// Matches the HOH competition results display pattern with avatars, scores, and winner badge

(function(global){
  'use strict';

  // Helper to get player by ID (with defensive fallback)
  function getPlayer(id){
    try{
      if(global.getP && typeof global.getP === 'function'){
        return global.getP(id);
      }
      // Fallback: search in game.players
      if(global.game && Array.isArray(global.game.players)){
        return global.game.players.find(function(p){ return p.id === +id; });
      }
    }catch(e){
      console.warn('[VetoResultsUI] getPlayer error:', e);
    }
    return null;
  }

  // Helper to get player name safely
  function safeName(id){
    try{
      if(global.safeName && typeof global.safeName === 'function'){
        return global.safeName(id);
      }
      const player = getPlayer(id);
      return player ? (player.name || String(id)) : String(id);
    }catch(e){
      return String(id);
    }
  }

  // Helper to resolve avatar URL
  function resolveAvatarUrl(player, playerId){
    try{
      const resolveAvatar = (global.Game || global).resolveAvatar;
      const getDicebearUrl = global.getDicebearUrl || function(seed){
        return 'https://api.dicebear.com/6.x/bottts/svg?seed=' + encodeURIComponent(seed || 'player');
      };

      if(resolveAvatar && typeof resolveAvatar === 'function'){
        return resolveAvatar(player || playerId);
      }

      if(player){
        return player.avatar || player.img || player.photo || getDicebearUrl(player.name || String(playerId));
      }

      return getDicebearUrl(String(playerId));
    }catch(e){
      console.warn('[VetoResultsUI] resolveAvatarUrl error:', e);
      return '';
    }
  }

  /**
   * Render veto competition results as a leaderboard
   * @param {Object|Map} scoresObj - Scores map or object {playerId: score}
   * @param {Array<number>} participantIds - Optional array of participant IDs
   * @param {Object} options - Optional configuration
   * @returns {HTMLElement|null} The created container element
   */
  function renderVetoCompResults(scoresObj, participantIds, options){
    options = options || {};
    
    try{
      console.info('[VetoResultsUI] Rendering veto competition results');

      // Normalize scores to plain object if Map
      let scoresPlain = {};
      if(scoresObj && typeof scoresObj.forEach === 'function'){
        scoresObj.forEach(function(value, key){
          scoresPlain[+key] = +value;
        });
      } else if(scoresObj && typeof scoresObj === 'object'){
        Object.keys(scoresObj).forEach(function(key){
          scoresPlain[+key] = +scoresObj[key];
        });
      }

      // Determine participants (from provided list or infer from scores)
      let participants = [];
      if(Array.isArray(participantIds) && participantIds.length > 0){
        participants = participantIds.map(function(id){ return +id; });
      } else {
        participants = Object.keys(scoresPlain).map(function(k){ return +k; });
      }

      if(participants.length === 0){
        console.warn('[VetoResultsUI] No participants to display');
        return null;
      }

      // Build sorted array of [id, score] pairs
      const resultsArray = participants.map(function(id){
        const score = scoresPlain[id] || 0;
        return { id: +id, score: +score };
      }).sort(function(a, b){
        return b.score - a.score; // Sort descending by score
      });

      // Find target container (TV overlay or fallback to body)
      let container = document.getElementById('tvOverlay');
      if(!container || container.style.display === 'none'){
        container = document.getElementById('tv');
      }
      if(!container){
        container = document.body;
      }

      // Remove any existing veto comp results
      const existing = container.querySelectorAll('.veto-comp-results');
      for(let i = 0; i < existing.length; i++){
        existing[i].remove();
      }

      // Create results container
      const resultsContainer = document.createElement('div');
      resultsContainer.className = 'comp-results veto-comp-results';
      resultsContainer.setAttribute('role', 'region');
      resultsContainer.setAttribute('aria-label', 'Veto Competition Results');

      // Header
      const header = document.createElement('div');
      header.className = 'comp-results-header';
      
      const title = document.createElement('h2');
      title.textContent = 'Veto Competition Results 🛡️';
      header.appendChild(title);
      
      resultsContainer.appendChild(header);

      // Results list
      const list = document.createElement('div');
      list.className = 'comp-results-list';
      list.setAttribute('role', 'list');

      // Render each player tile
      resultsArray.forEach(function(result, index){
        const playerId = result.id;
        const score = result.score;
        const player = getPlayer(playerId);
        const playerName = safeName(playerId);
        const avatarUrl = resolveAvatarUrl(player, playerId);
        const isWinner = (index === 0);

        // Player tile
        const tile = document.createElement('div');
        tile.className = 'comp-player-tile' + (isWinner ? ' winner' : '');
        tile.setAttribute('role', 'listitem');
        tile.setAttribute('data-player-id', playerId);
        if(isWinner){
          tile.setAttribute('tabindex', '0');
          tile.setAttribute('aria-label', playerName + ' - Winner - Score: ' + score.toFixed(1));
        } else {
          tile.setAttribute('aria-label', playerName + ' - Rank ' + (index + 1) + ' - Score: ' + score.toFixed(1));
        }

        // Rank badge
        const rankBadge = document.createElement('div');
        rankBadge.className = 'comp-rank';
        rankBadge.textContent = String(index + 1);
        rankBadge.setAttribute('aria-hidden', 'true');
        tile.appendChild(rankBadge);

        // Avatar
        const avatar = document.createElement('img');
        avatar.className = 'comp-avatar';
        avatar.src = avatarUrl;
        avatar.alt = playerName;
        avatar.onerror = function(){
          // Fallback to dicebear if avatar fails to load
          if(global.getDicebearUrl){
            this.src = global.getDicebearUrl(playerName);
          }
        };
        tile.appendChild(avatar);

        // Meta section (name + score)
        const meta = document.createElement('div');
        meta.className = 'comp-meta';

        const name = document.createElement('div');
        name.className = 'comp-name';
        name.textContent = playerName;
        meta.appendChild(name);

        const scoreEl = document.createElement('div');
        scoreEl.className = 'comp-score';
        scoreEl.textContent = score.toFixed(1);
        meta.appendChild(scoreEl);

        tile.appendChild(meta);

        // Winner badge
        if(isWinner){
          const badge = document.createElement('div');
          badge.className = 'comp-badge winner';
          badge.textContent = '👑';
          badge.setAttribute('aria-label', 'Winner');
          tile.appendChild(badge);
        }

        list.appendChild(tile);
      });

      resultsContainer.appendChild(list);

      // Append to container
      container.appendChild(resultsContainer);

      // Focus the winner tile for accessibility
      setTimeout(function(){
        const winnerTile = resultsContainer.querySelector('.comp-player-tile.winner');
        if(winnerTile){
          winnerTile.focus();
        }
      }, 100);

      console.info('[VetoResultsUI] Results rendered successfully -', resultsArray.length, 'participants');
      return resultsContainer;

    }catch(e){
      console.error('[VetoResultsUI] renderVetoCompResults error:', e);
      return null;
    }
  }

  // Export to global namespace
  if(!global.VetoResultsUI){
    global.VetoResultsUI = {};
  }
  global.VetoResultsUI.renderVetoCompResults = renderVetoCompResults;

  console.info('[VetoResultsUI] Module loaded');

})(window);
