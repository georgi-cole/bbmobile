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

    tile.innerHTML = `\n      <div class="comp-rank">${rank}</div>\n      <div class="comp-avatar">${avatarContent}</div>\n      <div class="comp-meta">\n        <div class="comp-name">${player.name}</div>\n        <div class="comp-score">${roundedScore}</div>\n      </div>\n      ${isFirst ? '<div class="comp-badge" aria-hidden="true">👑</div>' : ''}\n    `;
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
    try{
      const tid = panel.__vetoAutoDismissTimer;
      if(tid) clearTimeout(tid);
    }catch(e){}
    try{
      if(typeof panel.__ffwdCleanup === 'function') panel.__ffwdCleanup();
    }catch(e){}
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

  function renderVetoCompResults(scoresMap, participantIds, options){
    options = options || {};
    var maxResults = typeof options.maxResults === 'number' ? options.maxResults : 3;
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

    try{ var old = document.querySelectorAll('.veto-comp-results'); old && old.forEach(function(n){ try{ if(n.__vetoAutoDismissTimer) clearTimeout(n.__vetoAutoDismissTimer); }catch(e){} if(n.parentNode) n.parentNode.removeChild(n); }); }catch(e){}

    const container = document.createElement('div');
    container.className = 'veto-comp-results comp-results';
    container.setAttribute('role','region');
    container.setAttribute('aria-label','Veto competition results');

    const header = document.createElement('div');
    header.className = 'comp-results-header';
    header.innerHTML = `<h3>Veto Competition</h3>`;
    container.appendChild(header);

    const list = document.createElement('div');
    list.className = 'comp-results-list';
    top.forEach(function(entry, idx){
      const info = getPlayerInfo(entry.id);
      const player = { id: entry.id, name: info.name, score: entry.score, avatarUrl: info.avatarUrl, avatarHtml: info.avatarHtml };
      const tile = createPlayerTile(player, idx+1, idx===0);
      list.appendChild(tile);
    });
    container.appendChild(list);

    const tvContainer = document.getElementById('tvOverlay') || document.querySelector('#tvOverlay') || document.getElementById('tv') || document.body;
    tvContainer.appendChild(container);

    attachFastForwardClose(container, ffwdSelectors);

    try{ const tid = setTimeout(function(){ removePanel(container); }, autoDismissMs); container.__vetoAutoDismissTimer = tid; }catch(e){}

    return container;
  }

  global.VetoResultsUI = global.VetoResultsUI || {};
  global.VetoResultsUI.renderVetoCompResults = renderVetoCompResults;

})(window);
