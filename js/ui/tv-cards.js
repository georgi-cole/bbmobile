// MODULE: tv-cards.js
// Shared TV card scaffolding and presentation logic for in-TV ceremony cards.
// Extracted from veto.js to standardize all ceremony card presentation.

(function(global){
  'use strict';

  // ======= UTILITY FUNCTIONS =======

  function getP(id){ 
    return (global.getP ? global.getP(id) : null); 
  }

  // ======= TV OVERLAY SCAFFOLD MANAGEMENT =======

  /**
   * Ensure TV overlay scaffold exists with proper structure.
   * Creates .tvDim (backdrop) and .tvOverlayContent (content container) if missing.
   * @returns {HTMLElement|null} The tvOverlayContent element, or null if #tvOverlay not found
   */
  function ensureTVOverlay(){
    var tvOverlay = document.getElementById('tvOverlay');
    if(!tvOverlay) return null;
    
    // Check if scaffold already exists
    var dim = tvOverlay.querySelector('.tvDim');
    var content = tvOverlay.querySelector('.tvOverlayContent');
    
    if(!dim){
      dim = document.createElement('div');
      dim.className = 'tvDim';
      tvOverlay.appendChild(dim);
    }
    
    if(!content){
      content = document.createElement('div');
      content.className = 'tvOverlayContent';
      tvOverlay.appendChild(content);
    }
    
    return content;
  }

  /**
   * Clear content from TV overlay (preserves scaffold structure).
   */
  function clearTVOverlay(){
    var content = document.querySelector('.tvOverlayContent');
    if(content) content.innerHTML = '';
  }

  // ======= TV CARD DISPLAY FUNCTIONS =======

  /**
   * Show a basic text card in the TV overlay.
   * @param {Object} options - Card configuration
   * @param {string} options.title - Card title
   * @param {string[]} options.lines - Array of text lines
   * @param {string} [options.tone] - Optional tone/style attribute
   * @param {number} [options.duration=2400] - Display duration in ms
   * @returns {Promise} Resolves when card is dismissed
   */
  function showTVCard({title, lines, tone, duration}){
    return new Promise(function(resolve){
      var content = ensureTVOverlay();
      if(!content){ resolve(); return; }
      
      clearTVOverlay();
      
      var card = document.createElement('div');
      card.className = 'revealCard diaryRoomCard tvCardBody';
      if(tone) card.setAttribute('data-tone', tone);
      
      var h3 = document.createElement('h3');
      h3.textContent = title;
      card.appendChild(h3);
      
      for(var i=0; i<lines.length; i++){
        var p = document.createElement('p');
        if(i === 0) p.className = 'big';
        p.textContent = lines[i];
        card.appendChild(p);
      }
      
      content.appendChild(card);
      
      var tv = document.getElementById('tv');
      if(tv) tv.classList.add('tvTall');
      
      // Downscale font if card is too tall
      var fitTVCardText = (global.UI && global.UI.fitTVCardText) || global.fitTVCardText;
      if(fitTVCardText) fitTVCardText(card);
      
      setTimeout(function(){
        clearTVOverlay();
        if(tv) tv.classList.remove('tvTall');
        resolve();
      }, duration || 2400);
    });
  }

  /**
   * Show a TV card with player avatars.
   * @param {Object} options - Card configuration
   * @param {string} options.title - Card title
   * @param {string[]} options.lines - Array of text lines
   * @param {string} [options.tone] - Optional tone/style attribute
   * @param {number} [options.duration=2400] - Display duration in ms
   * @param {number|number[]} [options.actorIds] - Actor player ID(s) to show avatars
   * @param {number|number[]} [options.subjectIds] - Subject player ID(s) to show avatars
   * @returns {Promise} Resolves when card is dismissed
   */
  function showTVCardWithAvatars({title, lines, tone, duration, actorIds, subjectIds}){
    return new Promise(function(resolve){
      var content = ensureTVOverlay();
      if(!content){ resolve(); return; }
      
      clearTVOverlay();
      
      var card = document.createElement('div');
      card.className = 'revealCard diaryRoomCard tvCardBody';
      if(tone) card.setAttribute('data-tone', tone);
      
      // Build avatar row if actors/subjects provided
      var hasAvatars = (actorIds && actorIds !== null) || (subjectIds && subjectIds !== null);
      if(hasAvatars){
        var avatarRow = document.createElement('div');
        avatarRow.className = 'tv-card-avatars';
        avatarRow.style.display = 'flex';
        avatarRow.style.gap = '12px';
        avatarRow.style.justifyContent = 'center';
        avatarRow.style.marginBottom = '16px';
        avatarRow.style.flexWrap = 'wrap';
        
        // Add actor avatars
        var actors = Array.isArray(actorIds) ? actorIds : (actorIds != null ? [actorIds] : []);
        for(var i=0; i<actors.length; i++){
          var actorId = actors[i];
          var actor = getP(actorId);
          if(actor){
            var avatarWrap = document.createElement('div');
            avatarWrap.style.display = 'flex';
            avatarWrap.style.flexDirection = 'column';
            avatarWrap.style.alignItems = 'center';
            avatarWrap.style.gap = '6px';
            
            var img = document.createElement('img');
            var resolveAvatar = (global.Game || global).resolveAvatar;
            img.src = resolveAvatar ? resolveAvatar(actor) : (actor.avatar || actor.img || actor.photo);
            if(!img.src){
              img.src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(actor.name);
            }
            img.alt = actor.name;
            img.style.width = '64px';
            img.style.height = '64px';
            img.style.borderRadius = '12px';
            img.style.border = '2px solid rgba(255,255,255,0.3)';
            img.style.objectFit = 'cover';
            avatarWrap.appendChild(img);
            
            var nameLabel = document.createElement('div');
            nameLabel.className = 'tiny';
            nameLabel.textContent = actor.name;
            nameLabel.style.textAlign = 'center';
            nameLabel.style.fontSize = '12px';
            nameLabel.style.opacity = '0.9';
            avatarWrap.appendChild(nameLabel);
            
            avatarRow.appendChild(avatarWrap);
          }
        }
        
        // Add arrow separator if both actors and subjects exist
        if(actors.length > 0 && subjectIds){
          var arrow = document.createElement('div');
          arrow.textContent = '→';
          arrow.style.fontSize = '32px';
          arrow.style.alignSelf = 'center';
          arrow.style.opacity = '0.7';
          arrow.style.padding = '0 8px';
          avatarRow.appendChild(arrow);
        }
        
        // Add subject avatars
        var subjects = Array.isArray(subjectIds) ? subjectIds : (subjectIds != null ? [subjectIds] : []);
        for(var j=0; j<subjects.length; j++){
          var subjectId = subjects[j];
          var subject = getP(subjectId);
          if(subject){
            var subjectWrap = document.createElement('div');
            subjectWrap.style.display = 'flex';
            subjectWrap.style.flexDirection = 'column';
            subjectWrap.style.alignItems = 'center';
            subjectWrap.style.gap = '6px';
            
            var subjectImg = document.createElement('img');
            var resolveAvatar2 = (global.Game || global).resolveAvatar;
            subjectImg.src = resolveAvatar2 ? resolveAvatar2(subject) : (subject.avatar || subject.img || subject.photo);
            if(!subjectImg.src){
              subjectImg.src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(subject.name);
            }
            subjectImg.alt = subject.name;
            subjectImg.style.width = '64px';
            subjectImg.style.height = '64px';
            subjectImg.style.borderRadius = '12px';
            subjectImg.style.border = '2px solid rgba(255,255,255,0.3)';
            subjectImg.style.objectFit = 'cover';
            subjectWrap.appendChild(subjectImg);
            
            var subjectLabel = document.createElement('div');
            subjectLabel.className = 'tiny';
            subjectLabel.textContent = subject.name;
            subjectLabel.style.textAlign = 'center';
            subjectLabel.style.fontSize = '12px';
            subjectLabel.style.opacity = '0.9';
            subjectWrap.appendChild(subjectLabel);
            
            avatarRow.appendChild(subjectWrap);
          }
        }
        
        card.appendChild(avatarRow);
      }
      
      var h3 = document.createElement('h3');
      h3.textContent = title;
      card.appendChild(h3);
      
      for(var k=0; k<lines.length; k++){
        var p = document.createElement('p');
        if(k === 0) p.className = 'big';
        p.textContent = lines[k];
        card.appendChild(p);
      }
      
      content.appendChild(card);
      
      var tv = document.getElementById('tv');
      if(tv) tv.classList.add('tvTall');
      
      // Count total avatars and add .has-wide-avatars if > 2
      if(hasAvatars){
        var actors = Array.isArray(actorIds) ? actorIds : (actorIds != null ? [actorIds] : []);
        var subjects = Array.isArray(subjectIds) ? subjectIds : (subjectIds != null ? [subjectIds] : []);
        var totalAvatars = actors.length + subjects.length;
        if(totalAvatars > 2){
          card.classList.add('has-wide-avatars');
        }
      }
      
      // Downscale font if card is too tall
      var fitTVCardText = (global.UI && global.UI.fitTVCardText) || global.fitTVCardText;
      if(fitTVCardText) fitTVCardText(card);
      
      setTimeout(function(){
        clearTVOverlay();
        if(tv) tv.classList.remove('tvTall');
        resolve();
      }, duration || 2400);
    });
  }

  /**
   * Show a decision card with buttons.
   * @param {Object} options - Card configuration
   * @param {string} options.title - Card title
   * @param {string} options.message - Card message
   * @param {Array} options.buttons - Array of button configs: {label, value, primary, ariaLabel}
   * @returns {Promise} Resolves with selected button value
   */
  function showTVDecision({title, message, buttons}){
    return new Promise(function(resolve){
      var content = ensureTVOverlay();
      if(!content){ resolve(null); return; }
      
      clearTVOverlay();
      
      var card = document.createElement('div');
      card.className = 'revealCard diaryRoomCard tvCardBody';
      
      var h3 = document.createElement('h3');
      h3.textContent = title;
      card.appendChild(h3);
      
      var p = document.createElement('p');
      p.textContent = message;
      p.style.marginBottom = '20px';
      card.appendChild(p);
      
      var btnRow = document.createElement('div');
      btnRow.className = 'veto-decision-row';
      
      function disableAll(){
        var btns = btnRow.querySelectorAll('button');
        for(var i=0; i<btns.length; i++){ btns[i].disabled = true; }
      }
      
      for(var i=0; i<buttons.length; i++){
        (function(btn){
          var b = document.createElement('button');
          b.className = btn.primary ? 'btn primary' : 'btn';
          b.textContent = btn.label;
          // Use ariaLabel if provided, otherwise fall back to label
          b.setAttribute('aria-label', btn.ariaLabel || btn.label);
          b.onclick = function(){
            disableAll();
            clearTVOverlay();
            var tv = document.getElementById('tv');
            if(tv) tv.classList.remove('tvTall');
            resolve(btn.value);
          };
          // Keyboard accessibility
          b.onkeydown = function(e){
            if(e.key === 'Enter' || e.key === ' '){
              e.preventDefault();
              b.click();
            }
          };
          btnRow.appendChild(b);
        })(buttons[i]);
      }
      
      card.appendChild(btnRow);
      content.appendChild(card);
      
      var tv = document.getElementById('tv');
      if(tv) tv.classList.add('tvTall');
      
      // Downscale font if card is too tall
      var fitTVCardText = (global.UI && global.UI.fitTVCardText) || global.fitTVCardText;
      if(fitTVCardText) fitTVCardText(card);
      
      // Focus first button for accessibility
      setTimeout(function(){
        var firstBtn = btnRow.querySelector('button');
        if(firstBtn) firstBtn.focus();
      }, 100);
    });
  }

  /**
   * Show nominee save panel for veto ceremony.
   * @param {Object} options - Card configuration
   * @param {string} options.title - Card title
   * @param {number[]} options.nominees - Array of nominee player IDs
   * @param {number} options.povId - POV holder player ID
   * @returns {Promise} Resolves with selected nominee ID
   */
  function showTVNomineeSavePanel({title, nominees, povId}){
    return new Promise(function(resolve){
      var content = ensureTVOverlay();
      if(!content){ resolve(null); return; }
      
      clearTVOverlay();
      
      var card = document.createElement('div');
      card.className = 'revealCard diaryRoomCard tvCardBody';
      
      var h3 = document.createElement('h3');
      h3.textContent = title;
      card.appendChild(h3);
      
      var info = document.createElement('p');
      info.textContent = 'Select which nominee to save with the Power of Veto.';
      info.style.marginBottom = '20px';
      card.appendChild(info);
      
      var grid = document.createElement('div');
      grid.className = 'row';
      grid.style.gap = '16px';
      grid.style.justifyContent = 'center';
      grid.style.flexWrap = 'wrap';
      
      function disableAll(){
        var btns = grid.querySelectorAll('button');
        for(var i=0; i<btns.length; i++){ btns[i].disabled = true; }
      }
      
      for(var i=0; i<nominees.length; i++){
        (function(nomId, idx){
          var p = getP(nomId);
          var tile = document.createElement('div');
          tile.className = 'veto-nominee-tile';
          tile.style.animationDelay = (idx * 0.15) + 's';
          
          // Avatar
          var img = document.createElement('img');
          var resolveAvatar = (global.Game || global).resolveAvatar;
          img.src = resolveAvatar ? resolveAvatar(p) : (p.avatar || p.img || p.photo);
          if(!img.src){
            img.src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(p.name);
          }
          img.alt = p.name;
          img.className = 'veto-nominee-avatar';
          tile.appendChild(img);
          
          var label = document.createElement('div');
          label.className = 'veto-nominee-name';
          label.textContent = p.name;
          tile.appendChild(label);
          
          var btn = document.createElement('button');
          btn.className = 'btn primary veto-save-btn';
          btn.textContent = 'Save';
          btn.onclick = function(){
            disableAll();
            clearTVOverlay();
            var tv = document.getElementById('tv');
            if(tv) tv.classList.remove('tvTall');
            resolve(nomId);
          };
          tile.appendChild(btn);
          
          grid.appendChild(tile);
        })(nominees[i], i);
      }
      
      card.appendChild(grid);
      content.appendChild(card);
      
      var tv = document.getElementById('tv');
      if(tv) tv.classList.add('tvTall');
      
      // Downscale font if card is too tall
      var fitTVCardText = (global.UI && global.UI.fitTVCardText) || global.fitTVCardText;
      if(fitTVCardText) fitTVCardText(card);
    });
  }

  /**
   * Generic inline card for ceremony messages (nominations adjourn, eviction results, etc.).
   * @param {Object} options - Card configuration
   * @param {string} options.title - Card title
   * @param {string|string[]} options.content - Card content (string or array of strings)
   * @param {string} [options.tone] - Optional tone/style attribute
   * @param {number} [options.duration=2400] - Display duration in ms (0 = no auto-dismiss)
   * @returns {Promise} Resolves when card is dismissed
   */
  function showInlineCard({title, content, tone, duration}){
    return new Promise(function(resolve){
      var container = ensureTVOverlay();
      if(!container){ resolve(); return; }
      
      clearTVOverlay();
      
      var card = document.createElement('div');
      card.className = 'revealCard diaryRoomCard tvCardBody';
      if(tone) card.setAttribute('data-tone', tone);
      
      var h3 = document.createElement('h3');
      h3.textContent = title;
      card.appendChild(h3);
      
      // Handle content as string or array
      var contentArray = Array.isArray(content) ? content : [content];
      for(var i=0; i<contentArray.length; i++){
        var p = document.createElement('p');
        if(i === 0) p.className = 'big';
        p.textContent = contentArray[i];
        card.appendChild(p);
      }
      
      container.appendChild(card);
      
      var tv = document.getElementById('tv');
      if(tv) tv.classList.add('tvTall');
      
      // Downscale font if card is too tall
      var fitTVCardText = (global.UI && global.UI.fitTVCardText) || global.fitTVCardText;
      if(fitTVCardText) fitTVCardText(card);
      
      // Auto-dismiss if duration provided
      if(duration && duration > 0){
        setTimeout(function(){
          clearTVOverlay();
          if(tv) tv.classList.remove('tvTall');
          resolve();
        }, duration);
      } else {
        // Manual dismiss only
        resolve();
      }
    });
  }

  /**
   * Show nomination ceremony intro card with NOMINATE button.
   * @param {Object} options - Card configuration
   * @param {string} options.hohName - Name of the Head of Household
   * @param {number} options.need - Number of nominees required (2, 3, or 4)
   * @param {Function} options.onNominate - Callback when NOMINATE button is clicked
   * @returns {Promise} Resolves when button is clicked
   */
  function showNominateIntro({hohName, need, onNominate}){
    var countText = need > 2 
      ? 'You must nominate ' + need + ' houseguests for eviction.'
      : 'You must nominate two houseguests for eviction.';
    var message = hohName + ', as Head of Household, it is time to make your nominations. ' + countText;
    
    return showTVDecision({
      title: 'Nomination Ceremony',
      message: message,
      buttons: [
        {
          label: 'NOMINATE',
          value: 'nominate',
          primary: true,
          ariaLabel: 'Open nomination selector'
        }
      ]
    }).then(function(result){
      if(result === 'nominate' && onNominate){
        onNominate();
      }
      return result;
    });
  }

  // ======= EXPORTS =======

  // Export to global namespace
  var TVCards = {
    ensureTVOverlay: ensureTVOverlay,
    clearTVOverlay: clearTVOverlay,
    showTVCard: showTVCard,
    showTVCardWithAvatars: showTVCardWithAvatars,
    showTVDecision: showTVDecision,
    showTVNomineeSavePanel: showTVNomineeSavePanel,
    showInlineCard: showInlineCard,
    showNominateIntro: showNominateIntro
  };

  // Export as module
  if(global.UI){
    global.UI.TVCards = TVCards;
  }
  global.TVCards = TVCards;

  // Also export individual functions for backward compatibility
  global.ensureTVOverlayScaffold = ensureTVOverlay; // Legacy name
  global.clearTVOverlayContent = clearTVOverlay; // Legacy name

})(typeof window !== 'undefined' ? window : global);
