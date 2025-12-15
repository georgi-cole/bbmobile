// js/ui.veto-results.js
(function(global){
  'use strict';

  function toId(x){ return +x; }

  function getPlayerInfo(id){
    try{
      var p = null;
      if(global.getPlayerById && typeof global.getPlayerById === 'function'){
        p = global.getPlayerById(+id);
      } else if(global.getP && typeof global.getP === 'function'){
        p = global.getP(+id);
      }
      
      if(p){
        return {
          id: +id,
          name: p.name || ('Player ' + id),
          avatarUrl: (p.avatar && p.avatar.url) || p.avatarUrl || p.avatar || null,
          avatarHtml: (global.buildSmallAvatar ? global.buildSmallAvatar(+id) : null)
        };
      }
    }catch(e){}
    return { id: +id, name: ('Player ' + id), avatarUrl: null, avatarHtml: null };
  }

  function createPlayerTile(player, rank, isFirst){
    const tile = document.createElement('div');
    tile.className = 'comp-player-tile' + (isFirst ? ' first-place' : '');
    tile.setAttribute('role','group');
    
    // Round score to 1 decimal place
    const roundedScore = (typeof player.score === 'number') ? player.score.toFixed(1) : player.score;
    tile.setAttribute('aria-label', `${rank}. ${player.name} — ${roundedScore}`);

    // Avatar with onerror fallback
    const avatarContent = player.avatarHtml 
      ? player.avatarHtml 
      : (player.avatarUrl 
          ? `<img src="${player.avatarUrl}" alt="${player.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"><div class="avatar-fallback" style="display:none;"></div>`
          : '<div class="avatar-fallback" style="display:flex;"></div>');

    tile.innerHTML = `\n      <div class="comp-rank">${rank}</div>\n      <div class="comp-avatar">${avatarContent}</div>\n      <div class="comp-meta">\n        <div class="comp-name">${player.name}</div>\n        <div class="comp-score">${roundedScore}</div>\n      </div>\n      ${isFirst ? '<div class="comp-badge" aria-hidden="true">🛡️</div>' : ''}\n    `;
    return tile;
  }

  function defaultFFwdSelectors(){
    return [
      '.btn-ffwd',
      '.ffwd',
      '.ffwd-btn',
      '#ffwd',
      '.player-ffwd',
      '.tv-ffwd',
      'button.ffwd'
    ];
  }

  function removePanel(panel){
    if(!panel) return;
    
    // Clean up auto-dismiss timer
    try{
      const tid = panel.__vetoAutoDismissTimer;
      if(tid) clearTimeout(tid);
    }catch(e){}
    
    // Clean up split-card transition timeout
    try{
      const splitTid = panel.__splitCardTransitionTimeout;
      if(splitTid) clearTimeout(splitTid);
    }catch(e){}
    
    // Clean up associated runners-up card in split-card mode
    try{
      const runnersCard = panel.__splitCardRunnersRef;
      if(runnersCard && runnersCard.parentNode){
        removePanel(runnersCard);
      }
    }catch(e){}
    
    // Clean up FFWD event handlers
    try{
      if(typeof panel.__ffwdCleanup === 'function') panel.__ffwdCleanup();
    }catch(e){}
    
    // Animate out and remove
    panel.classList.add('veto-results-hide');
    panel.addEventListener('animationend', function onEnd(){
      panel.removeEventListener('animationend', onEnd);
      if(panel.parentNode) panel.parentNode.removeChild(panel);
    });
  }

  function attachFastForwardClose(panel, selectors){
    selectors = selectors && selectors.length ? selectors : defaultFFwdSelectors();
    var nodes = [];
    try{ nodes = Array.from(document.querySelectorAll(selectors.join(','))); }catch(e){ nodes = []; }
    const onClick = function(){ removePanel(panel); };
    nodes.forEach(function(n){ try{ n.addEventListener('click', onClick); }catch(e){} });

    const onCustom = function(){ removePanel(panel); };
    window.addEventListener('fastForwardPressed', onCustom);
    window.addEventListener('ffwdPressed', onCustom);

    panel.__ffwdCleanup = function(){
      nodes.forEach(function(n){ try{ n.removeEventListener('click', onClick); }catch(e){} });
      try{ window.removeEventListener('fastForwardPressed', onCustom); }catch(e){}
      try{ window.removeEventListener('ffwdPressed', onCustom); }catch(e){}
      panel.__ffwdCleanup = null;
    };
  }

  // Split-card timing constants (milliseconds)
  var SPLIT_CARD_WINNER_DURATION = 2500;
  var SPLIT_CARD_RUNNERS_DURATION = 2500;
  var SPLIT_CARD_TRANSITION_BUFFER = 100; // Buffer between cards

  /**
   * Check if viewport is very constrained (needs split-card mode)
   * Matches CSS media query: (max-width: 480px) and (max-height: 700px)
   * Split-card mode: show winner first, then runner-up (2nd place only)
   */
  function shouldUseSplitCardMode(){
    try{
      return window.innerWidth < 480 && window.innerHeight < 700;
    }catch(e){
      return false;
    }
  }

  /**
   * Render split-card sequence: winner card, then runner-up card (2nd place only)
   * On very small viewports, show only 1st and 2nd place for space optimization
   * Total display time: ~5s (2.5s + 2.5s + buffers)
   * IMPORTANT: Always shows results even when FFWD/Skip pressed
   */
  function renderSplitCardSequence(top, ffwdSelectors, tvContainer){
    if(top.length < 2){
      // Not enough results to split, render normally
      return renderSingleCard(top, ffwdSelectors, tvContainer, 5000);
    }

    // Phase 1: Winner card
    var winnerCard = renderSingleCard([top[0]], ffwdSelectors, tvContainer, SPLIT_CARD_WINNER_DURATION, 'split-card-winner');
    
    // Store timeout reference for cleanup
    var transitionTimeout = null;
    
    // Phase 2: Runner-up card (2nd place only)
    transitionTimeout = setTimeout(function(){
      if(winnerCard && winnerCard.parentNode){
        // Winner card still visible, remove it first
        removePanel(winnerCard);
      }
      var runnersUp = top.slice(1, 2); // Get only 2nd place (not 3rd)
      var runnersCard = renderSingleCard(runnersUp, ffwdSelectors, tvContainer, SPLIT_CARD_RUNNERS_DURATION, 'split-card-runners');
      
      // Store reference for potential cleanup
      if(winnerCard) winnerCard.__splitCardRunnersRef = runnersCard;
    }, SPLIT_CARD_WINNER_DURATION + SPLIT_CARD_TRANSITION_BUFFER);
    
    // Store timeout reference on winner card for cleanup if FFWD pressed early
    if(winnerCard) winnerCard.__splitCardTransitionTimeout = transitionTimeout;

    return winnerCard;
  }

  /**
   * Render a single card (either all results or subset for split-card mode)
   */
  function renderSingleCard(entries, ffwdSelectors, tvContainer, autoDismissMs, splitClass){
    const container = document.createElement('div');
    container.className = 'veto-comp-results comp-results' + (splitClass ? ' ' + splitClass : '');
    container.setAttribute('role','region');
    container.setAttribute('aria-label','Veto competition results');

    const header = document.createElement('div');
    header.className = 'comp-results-header';
    header.innerHTML = `<h3>Veto Competition</h3>`;
    container.appendChild(header);

    const list = document.createElement('div');
    list.className = 'comp-results-list';
    
    // For split-card runners, adjust ranking to show actual placement (2nd, 3rd)
    var startRank = (splitClass === 'split-card-runners') ? 2 : 1;
    
    entries.forEach(function(entry, idx){
      const info = getPlayerInfo(entry.id);
      const player = { 
        id: entry.id, 
        name: info.name, 
        score: entry.score, 
        avatarUrl: info.avatarUrl, 
        avatarHtml: info.avatarHtml 
      };
      const actualRank = startRank + idx;
      const isFirst = (actualRank === 1);
      const tile = createPlayerTile(player, actualRank, isFirst);
      list.appendChild(tile);
    });
    container.appendChild(list);

    tvContainer.appendChild(container);
    attachFastForwardClose(container, ffwdSelectors);

    try{ 
      const tid = setTimeout(function(){ removePanel(container); }, autoDismissMs); 
      container.__vetoAutoDismissTimer = tid; 
    }catch(e){}

    return container;
  }

  function renderVetoCompResults(scoresMap, participantIds, options){
    options = options || {};
    // Default to 2 results: winner + runner-up only
    var maxResults = typeof options.maxResults === 'number' ? options.maxResults : 2;
    var autoDismissMs = typeof options.autoDismissMs === 'number' ? options.autoDismissMs : 5000;
    var ffwdSelectors = options.ffwdSelectors || null;

    var scoresObj = {};
    if(scoresMap instanceof Map){
      scoresMap.forEach(function(v,k){ scoresObj[+k] = v; });
    } else if(scoresMap && typeof scoresMap === 'object'){
      for(const k in scoresMap){ if(Object.prototype.hasOwnProperty.call(scoresMap,k)){ scoresObj[+k] = scoresMap[k]; } }
    }

    var participants = Array.isArray(participantIds) ? participantIds.map(toId) : [];
    if(participants.length === 0){ participants = Object.keys(scoresObj).map(function(k){ return +k; }); }

    var arr = participants.map(function(id){ return { id: +id, score: Number(scoresObj[+id] != null ? scoresObj[+id] : (scoresObj[String(id)] || 0)) }; });
    if(arr.length === 0){ console.warn('[veto-results] no participants/scores to show'); return null; }

    arr.sort(function(a,b){ return b.score - a.score; });
    var top = arr.slice(0, maxResults);

    // Clean up any existing results panels
    try{ 
      var old = document.querySelectorAll('.veto-comp-results'); 
      old && old.forEach(function(n){ 
        try{ 
          if(n.__vetoAutoDismissTimer) clearTimeout(n.__vetoAutoDismissTimer); 
        }catch(e){} 
        if(n.parentNode) n.parentNode.removeChild(n); 
      }); 
    }catch(e){}

    const tvContainer = document.getElementById('tvOverlay') || document.querySelector('#tvOverlay') || document.getElementById('tv') || document.body;

    // Determine if we need split-card mode for very small viewports
    if(shouldUseSplitCardMode() && top.length >= 2){
      console.info('[veto-results] Using split-card mode for constrained viewport');
      return renderSplitCardSequence(top, ffwdSelectors, tvContainer);
    }

    // Standard single-card render
    return renderSingleCard(top, ffwdSelectors, tvContainer, autoDismissMs);
  }

  global.VetoResultsUI = global.VetoResultsUI || {};
  global.VetoResultsUI.renderVetoCompResults = renderVetoCompResults;

})(window);
