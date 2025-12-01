// MODULE: tv-cards.js
// Shared TV card scaffolding and presentation logic for in-TV ceremony cards.
// Extracted from veto.js to standardize all ceremony card presentation.
// 
// Features:
// - Automatic splitting of cards that would overflow the TV overlay
// - Ceremony title omission for ceremony-labeled cards
// - Avatar preservation across split cards
// - CardManager integration for fast-forward support

(function(global){
  'use strict';

  // ======= CONSTANTS =======
  
  /**
   * Ceremony keywords that trigger title omission.
   * Case-insensitive matching against card title.
   */
  var CEREMONY_KEYWORDS = [
    'ceremony',
    'veto',
    'nomination',
    'eviction',
    'results',
    'adjourned',
    'nominees',
    'saved',
    'replacement'
  ];

  /**
   * Safe margin (px) to leave when computing available height for cards.
   */
  var SAFE_MARGIN_PX = 24;

  /**
   * Fallback height (px) when #tvOverlay is not available.
   */
  var FALLBACK_OVERLAY_HEIGHT_PX = 400;

  /**
   * Approximate avatar row height (px) for measurement calculations.
   */
  var AVATAR_ROW_HEIGHT_PX = 100;

  /**
   * Card measurement width (px) for off-DOM measurement.
   */
  var MEASUREMENT_CARD_WIDTH_PX = 400;

  // ======= UTILITY FUNCTIONS =======

  function getP(id){ 
    return (global.getP ? global.getP(id) : null); 
  }

  /**
   * Create ESC key dismissal handler for cards.
   * @param {Function} onDismiss - Callback to execute when ESC is pressed
   * @returns {Function} The event handler function (for cleanup if needed)
   */
  function createEscDismissHandler(onDismiss){
    function handleEscape(e){
      if(e.key === 'Escape'){
        document.removeEventListener('keydown', handleEscape);
        onDismiss();
      }
    }
    document.addEventListener('keydown', handleEscape);
    return handleEscape;
  }

  /**
   * Check if a title matches ceremony keywords (case-insensitive).
   * @param {string} title - The card title to check
   * @returns {boolean} True if title contains ceremony keywords
   */
  function isCeremonyTitle(title){
    if(!title || typeof title !== 'string') return false;
    var lowerTitle = title.toLowerCase();
    for(var i = 0; i < CEREMONY_KEYWORDS.length; i++){
      if(lowerTitle.indexOf(CEREMONY_KEYWORDS[i]) !== -1){
        return true;
      }
    }
    return false;
  }

  // ======= SPLITTING HELPER FUNCTIONS =======

  /**
   * Compute the available height for cards inside #tvOverlay.
   * Returns the visible height minus safe margins.
   * @returns {number} Available height in pixels
   */
  function computeOverlayAvailableHeight(){
    var tvOverlay = document.getElementById('tvOverlay');
    if(!tvOverlay) return FALLBACK_OVERLAY_HEIGHT_PX;
    
    var rect = tvOverlay.getBoundingClientRect();
    var availableHeight = rect.height - (SAFE_MARGIN_PX * 2);
    
    // Minimum reasonable height
    return Math.max(availableHeight, 200);
  }

  /**
   * Measure and split lines array into chunks that fit within available height.
   * Uses off-DOM measurement to detect overflow.
   * 
   * @param {string[]} lines - Array of text lines to display
   * @param {Object} opts - Options
   * @param {string} [opts.title] - Card title (for height calculation)
   * @param {boolean} [opts.hasAvatars] - Whether avatars are present (adds height)
   * @param {number} [opts.availableHeight] - Override available height
   * @returns {string[][]} Array of line chunks, each chunk fits in one card
   */
  function measureAndSplitLines(lines, opts){
    opts = opts || {};
    
    if(!lines || lines.length === 0) return [[]];
    if(lines.length === 1) return [lines];
    
    var availableHeight = opts.availableHeight || computeOverlayAvailableHeight();
    
    // Create off-DOM measurement container
    var measurer = document.createElement('div');
    measurer.className = 'tv-inline-card revealCard diaryRoomCard tvCardBody';
    measurer.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;' +
      'max-width:min(780px, 92%);width:' + MEASUREMENT_CARD_WIDTH_PX + 'px;padding:22px 26px;';
    
    // Add title if present (contributes to height)
    if(opts.title && !isCeremonyTitle(opts.title)){
      var h3 = document.createElement('h3');
      h3.textContent = opts.title;
      h3.style.fontSize = '0.95rem';
      h3.style.marginBottom = '0.6em';
      measurer.appendChild(h3);
    }
    
    // Account for avatar row height if present
    if(opts.hasAvatars){
      var avatarPlaceholder = document.createElement('div');
      avatarPlaceholder.style.height = AVATAR_ROW_HEIGHT_PX + 'px';
      avatarPlaceholder.style.marginBottom = '16px';
      measurer.appendChild(avatarPlaceholder);
    }
    
    document.body.appendChild(measurer);
    
    var chunks = [];
    var currentChunk = [];
    var linesContainer = document.createElement('div');
    measurer.appendChild(linesContainer);
    
    for(var i = 0; i < lines.length; i++){
      var p = document.createElement('p');
      if(currentChunk.length === 0) p.className = 'big';
      p.textContent = lines[i];
      p.style.fontSize = currentChunk.length === 0 ? '0.92rem' : '0.86rem';
      p.style.lineHeight = '1.45';
      p.style.margin = '0.5em 0';
      linesContainer.appendChild(p);
      
      currentChunk.push(lines[i]);
      
      // Check if we exceed available height
      if(measurer.scrollHeight > availableHeight && currentChunk.length > 1){
        // Remove last line and start new chunk
        linesContainer.removeChild(p);
        currentChunk.pop();
        
        // Save current chunk
        chunks.push(currentChunk);
        
        // Start new chunk with the line that caused overflow
        currentChunk = [lines[i]];
        linesContainer.innerHTML = '';
        
        // Re-add the overflowing line to new measurement
        var newP = document.createElement('p');
        newP.className = 'big';
        newP.textContent = lines[i];
        newP.style.fontSize = '0.92rem';
        newP.style.lineHeight = '1.45';
        newP.style.margin = '0.5em 0';
        linesContainer.appendChild(newP);
      }
    }
    
    // Add remaining lines as final chunk
    if(currentChunk.length > 0){
      chunks.push(currentChunk);
    }
    
    // Cleanup
    document.body.removeChild(measurer);
    
    return chunks.length > 0 ? chunks : [lines];
  }

  /**
   * Emit sequential cards from line chunks with proper CardManager registration.
   * Each card is displayed in sequence with the specified duration.
   * 
   * @param {string[][]} chunks - Array of line arrays
   * @param {Object} options - Card options (title, tone, duration, actorIds, subjectIds)
   * @returns {Promise} Resolves when all cards have been shown
   */
  function emitCardsFromChunks(chunks, options){
    if(!chunks || chunks.length === 0) return Promise.resolve();
    if(chunks.length === 1){
      // Single chunk - use normal card display
      return showTVCardWithAvatarsInternal(Object.assign({}, options, { lines: chunks[0] }));
    }
    
    // Multiple chunks - display sequentially
    var index = 0;
    
    function showNext(){
      if(index >= chunks.length) return Promise.resolve();
      
      var isFirst = index === 0;
      var chunkOptions = Object.assign({}, options, {
        lines: chunks[index],
        // Only show avatars on first card by default (can be overridden)
        actorIds: isFirst ? options.actorIds : (options.avatarsOnAll ? options.actorIds : undefined),
        subjectIds: isFirst ? options.subjectIds : (options.avatarsOnAll ? options.subjectIds : undefined)
      });
      
      index++;
      return showTVCardWithAvatarsInternal(chunkOptions).then(showNext);
    }
    
    return showNext();
  }

  // ======= TV OVERLAY SCAFFOLD MANAGEMENT =======

  /**
   * Ensure TV overlay scaffold exists with proper structure.
   * Creates #tvOverlay if missing, along with .tvDim (backdrop) and .tvOverlayContent (content container).
   * Also ensures #tv has tvTall class for proper sizing.
   * @returns {HTMLElement|null} The tvOverlayContent element, or null if #tv not found
   */
  function ensureTVOverlay(){
    var tv = document.getElementById('tv');
    if(!tv){
      console.error('[TVCards] Cannot ensure TV overlay - #tv element not found');
      return null;
    }
    
    // Find or create #tvOverlay
    var tvOverlay = document.getElementById('tvOverlay');
    if(!tvOverlay){
      console.log('[TVCards] Creating missing #tvOverlay element');
      tvOverlay = document.createElement('div');
      tvOverlay.id = 'tvOverlay';
      
      // Find tvViewport to append overlay inside it
      var viewport = tv.querySelector('.tvViewport');
      if(viewport){
        viewport.appendChild(tvOverlay);
      } else {
        // Fallback: append directly to #tv
        tv.appendChild(tvOverlay);
      }
    }
    
    // Ensure #tv has tvTall class for proper overlay space
    if(!tv.classList.contains('tvTall')){
      tv.classList.add('tvTall');
    }
    
    // Check if scaffold already exists
    var dim = tvOverlay.querySelector('.tvDim');
    var content = tvOverlay.querySelector('.tvOverlayContent');
    
    if(!dim){
      console.log('[TVCards] Creating .tvDim backdrop');
      dim = document.createElement('div');
      dim.className = 'tvDim';
      tvOverlay.appendChild(dim);
    }
    
    if(!content){
      console.log('[TVCards] Creating .tvOverlayContent container');
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
   * @param {boolean} [options.omitCeremonyTitle] - Force omit title if true (auto-detected otherwise)
   * @returns {Promise} Resolves when card is dismissed
   * 
   * NOTE: CardManager wrapper automatically handles timeout registration and phase guards.
   * Factory returns {card, timeout} - CardManager.show() auto-registers the timeout.
   * 
   * CEREMONY TITLE OMISSION: If title contains ceremony keywords (ceremony, veto, nomination,
   * eviction, results, adjourned, nominees, saved, replacement), the <h3> title element
   * will not be rendered. This keeps ceremony cards focused on avatars and content.
   */
  function showTVCard({title, lines, tone, duration, omitCeremonyTitle}){
    // Determine if we should omit the title
    var shouldOmitTitle = omitCeremonyTitle === true || isCeremonyTitle(title);
    
    return new Promise(function(resolve){
      var content = ensureTVOverlay();
      if(!content){ resolve(); return; }
      
      // Use CardManager if available for centralized lifecycle management
      if(global.CardManager){
        global.CardManager.show(function(){
          clearTVOverlay();
          
          var card = document.createElement('div');
          card.className = 'tv-inline-card revealCard diaryRoomCard tvCardBody';
          if(tone) card.setAttribute('data-tone', tone);
          
          // Mark as ephemeral for automatic cleanup on phase transitions
          card.setAttribute('data-ephemeral', 'true');
          card.setAttribute('data-ui-card', 'true');
          card.classList.add('ceremony-card');
          
          // Accessibility: ARIA role for status messages
          card.setAttribute('role', 'status');
          card.setAttribute('aria-live', 'polite');
          card.setAttribute('tabindex', '0');
          
          // Only render title if not a ceremony label
          if(!shouldOmitTitle){
            var h3 = document.createElement('h3');
            h3.textContent = title;
            card.appendChild(h3);
          }
          
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
          
          // Set up auto-dismissal with fast-forward support
          var originalDuration = duration || 2400;
          var normalizedDuration = global.normalizeDuration ? global.normalizeDuration(originalDuration) : originalDuration;
          
          var timeoutCallback = function(){
            clearTVOverlay();
            if(tv) tv.classList.remove('tvTall');
            resolve();
          };
          
          var timeout = setTimeout(timeoutCallback, normalizedDuration);
          
          // Register with metadata for fast-forward acceleration
          if(global.CardManager && global.CardManager.registerTimeout){
            // Update registration call to include callback and duration
            global.CardManager.__pendingTimeoutData = global.CardManager.__pendingTimeoutData || [];
            global.CardManager.__pendingTimeoutData.push({
              id: timeout,
              callback: timeoutCallback,
              originalDuration: originalDuration
            });
          }
          
          return { card: card, timeout: timeout };
        });
      } else {
        // Fallback: original implementation without CardManager
        clearTVOverlay();
        
        var card = document.createElement('div');
        card.className = 'tv-inline-card revealCard diaryRoomCard tvCardBody';
        if(tone) card.setAttribute('data-tone', tone);
        
        // Mark as ephemeral for automatic cleanup on phase transitions
        card.setAttribute('data-ephemeral', 'true');
        card.setAttribute('data-ui-card', 'true');
        card.classList.add('ceremony-card');
        
        // Accessibility: ARIA role for status messages
        card.setAttribute('role', 'status');
        card.setAttribute('aria-live', 'polite');
        card.setAttribute('tabindex', '0');
        
        // Only render title if not a ceremony label
        if(!shouldOmitTitle){
          var h3 = document.createElement('h3');
          h3.textContent = title;
          card.appendChild(h3);
        }
        
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
        
        // Apply fast-forward duration normalization (fallback path)
        var originalDuration = duration || 2400;
        var normalizedDuration = global.normalizeDuration ? global.normalizeDuration(originalDuration) : originalDuration;
        
        setTimeout(function(){
          clearTVOverlay();
          if(tv) tv.classList.remove('tvTall');
          resolve();
        }, normalizedDuration);
      }
    });
  }

  /**
   * Helper: Build avatar card DOM structure.
   * @private
   * @param {Object} opts - Card options
   * @param {string} opts.title - Card title
   * @param {string[]} opts.lines - Text lines
   * @param {string} [opts.tone] - Tone attribute
   * @param {number|number[]} [opts.actorIds] - Actor ID(s)
   * @param {number|number[]} [opts.subjectIds] - Subject ID(s)
   * @param {boolean} [opts.omitCeremonyTitle] - Force omit title (auto-detected for ceremony keywords)
   * @returns {HTMLElement} Card element
   */
  function buildAvatarCard({title, lines, tone, actorIds, subjectIds, omitCeremonyTitle}){
    // Determine if we should omit the title
    var shouldOmitTitle = omitCeremonyTitle === true || isCeremonyTitle(title);
    
    var card = document.createElement('div');
    card.className = 'tv-inline-card revealCard diaryRoomCard tvCardBody';
    if(tone) card.setAttribute('data-tone', tone);
    
    // Accessibility: ARIA role for status messages
    card.setAttribute('role', 'status');
    card.setAttribute('aria-live', 'polite');
    card.setAttribute('tabindex', '0');
    
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
      
      // Count total avatars and add .has-wide-avatars if > 2
      var totalAvatars = actors.length + subjects.length;
      if(totalAvatars > 2){
        card.classList.add('has-wide-avatars');
      }
    }
    
    // Only render title if not a ceremony label
    if(!shouldOmitTitle){
      var h3 = document.createElement('h3');
      h3.textContent = title;
      card.appendChild(h3);
    }
    
    for(var k=0; k<lines.length; k++){
      var p = document.createElement('p');
      if(k === 0) p.className = 'big';
      p.textContent = lines[k];
      card.appendChild(p);
    }
    
    return card;
  }

  /**
   * Internal implementation for showTVCardWithAvatars.
   * Called by both the public API and the splitting helper.
   * @private
   */
  function showTVCardWithAvatarsInternal({title, lines, tone, duration, actorIds, subjectIds, omitCeremonyTitle}){
    return new Promise(function(resolve){
      var content = ensureTVOverlay();
      if(!content){ resolve(); return; }
      
      // Use CardManager if available for centralized lifecycle management
      if(global.CardManager){
        global.CardManager.show(function(){
          clearTVOverlay();
          
          var card = buildAvatarCard({title, lines, tone, actorIds, subjectIds, omitCeremonyTitle});
          content.appendChild(card);
          
          var tv = document.getElementById('tv');
          if(tv) tv.classList.add('tvTall');
          
          // Downscale font if card is too tall
          var fitTVCardText = (global.UI && global.UI.fitTVCardText) || global.fitTVCardText;
          if(fitTVCardText) fitTVCardText(card);
          
          // Set up auto-dismissal with fast-forward support
          var originalDuration = duration || 2400;
          var normalizedDuration = global.normalizeDuration ? global.normalizeDuration(originalDuration) : originalDuration;
          
          var timeoutCallback = function(){
            clearTVOverlay();
            if(tv) tv.classList.remove('tvTall');
            resolve();
          };
          
          var timeout = setTimeout(timeoutCallback, normalizedDuration);
          
          // Register with metadata for fast-forward acceleration
          if(global.CardManager && global.CardManager.__pendingTimeoutData){
            global.CardManager.__pendingTimeoutData.push({
              id: timeout,
              callback: timeoutCallback,
              originalDuration: originalDuration
            });
          }
          
          return { card: card, timeout: timeout };
        });
      } else {
        // Fallback: original implementation without CardManager
        clearTVOverlay();
        
        var card = buildAvatarCard({title, lines, tone, actorIds, subjectIds, omitCeremonyTitle});
        content.appendChild(card);
        
        var tv = document.getElementById('tv');
        if(tv) tv.classList.add('tvTall');
        
        // Downscale font if card is too tall
        var fitTVCardText = (global.UI && global.UI.fitTVCardText) || global.fitTVCardText;
        if(fitTVCardText) fitTVCardText(card);
        
        // Apply fast-forward duration normalization (fallback path)
        var originalDuration = duration || 2400;
        var normalizedDuration = global.normalizeDuration ? global.normalizeDuration(originalDuration) : originalDuration;
        
        setTimeout(function(){
          clearTVOverlay();
          if(tv) tv.classList.remove('tvTall');
          resolve();
        }, normalizedDuration);
      }
    });
  }

  /**
   * Show a TV card with player avatars.
   * Supports automatic splitting if content would overflow the TV overlay.
   * 
   * @param {Object} options - Card configuration
   * @param {string} options.title - Card title
   * @param {string[]} options.lines - Array of text lines
   * @param {string} [options.tone] - Optional tone/style attribute
   * @param {number} [options.duration=2400] - Display duration in ms
   * @param {number|number[]} [options.actorIds] - Actor player ID(s) to show avatars
   * @param {number|number[]} [options.subjectIds] - Subject player ID(s) to show avatars
   * @param {boolean} [options.enableSplit=false] - Enable automatic content splitting
   * @param {boolean} [options.avatarsOnAll=true] - Show avatars on all split cards (default: true)
   * @returns {Promise} Resolves when card(s) dismissed
   */
  function showTVCardWithAvatars({title, lines, tone, duration, actorIds, subjectIds, enableSplit, avatarsOnAll}){
    // Check if splitting is enabled and needed
    if(enableSplit && lines && lines.length > 1){
      var hasAvatars = (actorIds != null) || (subjectIds != null);
      var chunks = measureAndSplitLines(lines, {
        title: title,
        hasAvatars: hasAvatars
      });
      
      if(chunks.length > 1){
        // Multiple chunks - emit sequential cards
        return emitCardsFromChunks(chunks, {
          title: title,
          tone: tone,
          duration: duration,
          actorIds: actorIds,
          subjectIds: subjectIds,
          avatarsOnAll: avatarsOnAll !== false // Default to true
        });
      }
    }
    
    // Single card (no splitting needed)
    return showTVCardWithAvatarsInternal({title, lines, tone, duration, actorIds, subjectIds});
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
      card.className = 'tv-inline-card revealCard diaryRoomCard tvCardBody';
      
      // Accessibility: ARIA role for dialog with actions
      card.setAttribute('role', 'dialog');
      card.setAttribute('aria-label', title);
      card.setAttribute('tabindex', '0');
      
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
      
      // ESC key dismissal handler
      createEscDismissHandler(function(){
        clearTVOverlay();
        var tv = document.getElementById('tv');
        if(tv) tv.classList.remove('tvTall');
        resolve(null);
      });
      
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
      card.className = 'tv-inline-card revealCard diaryRoomCard tvCardBody';
      
      // Accessibility: ARIA role for dialog with nominee selection
      card.setAttribute('role', 'dialog');
      card.setAttribute('aria-label', title);
      card.setAttribute('tabindex', '0');
      
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
   * Supports automatic ceremony title omission for ceremony-labeled cards.
   * 
   * @param {Object} options - Card configuration
   * @param {string} options.title - Card title
   * @param {string|string[]} options.content - Card content (string or array of strings)
   * @param {string} [options.tone] - Optional tone/style attribute
   * @param {number} [options.duration=2400] - Display duration in ms (0 = no auto-dismiss)
   * @param {boolean} [options.omitCeremonyTitle] - Force omit title (auto-detected for ceremony keywords)
   * @returns {Promise} Resolves when card is dismissed
   */
  function showInlineCard({title, content, tone, duration, omitCeremonyTitle}){
    // Determine if we should omit the title
    var shouldOmitTitle = omitCeremonyTitle === true || isCeremonyTitle(title);
    
    return new Promise(function(resolve){
      var container = ensureTVOverlay();
      if(!container){ resolve(); return; }
      
      // Use CardManager if available
      if(global.CardManager){
        global.CardManager.show(function(){
          clearTVOverlay();
          
          var card = document.createElement('div');
          card.className = 'tv-inline-card revealCard diaryRoomCard tvCardBody';
          if(tone) card.setAttribute('data-tone', tone);
          
          // Accessibility: ARIA role for status messages
          card.setAttribute('role', 'status');
          card.setAttribute('aria-live', 'polite');
          card.setAttribute('tabindex', '0');
          
          // Only render title if not a ceremony label
          if(!shouldOmitTitle){
            var h3 = document.createElement('h3');
            h3.textContent = title;
            card.appendChild(h3);
          }
          
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
          var timeout = null;
          if(duration && duration > 0){
            timeout = setTimeout(function(){
              clearTVOverlay();
              if(tv) tv.classList.remove('tvTall');
              resolve();
            }, duration);
          } else {
            // Manual dismiss only
            resolve();
          }
          
          return { card: card, timeout: timeout };
        });
      } else {
        // Fallback: original implementation without CardManager
        clearTVOverlay();
        
        var card = document.createElement('div');
        card.className = 'tv-inline-card revealCard diaryRoomCard tvCardBody';
        if(tone) card.setAttribute('data-tone', tone);
        
        // Accessibility: ARIA role for status messages
        card.setAttribute('role', 'status');
        card.setAttribute('aria-live', 'polite');
        card.setAttribute('tabindex', '0');
        
        // Only render title if not a ceremony label
        if(!shouldOmitTitle){
          var h3 = document.createElement('h3');
          h3.textContent = title;
          card.appendChild(h3);
        }
        
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
    console.log('[TVCards] showNominateIntro - HOH:', hohName, 'need:', need);
    
    // Always ensure scaffold exists before showing card
    var content = ensureTVOverlay();
    if(!content){
      console.error('[TVCards] showNominateIntro failed - could not ensure overlay scaffold');
      return Promise.reject(new Error('TV overlay scaffold could not be created'));
    }
    
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
    // Core scaffold
    ensureTVOverlay: ensureTVOverlay,
    clearTVOverlay: clearTVOverlay,
    
    // Card display functions
    showTVCard: showTVCard,
    showTVCardWithAvatars: showTVCardWithAvatars,
    showTVDecision: showTVDecision,
    showTVNomineeSavePanel: showTVNomineeSavePanel,
    showInlineCard: showInlineCard,
    showNominateIntro: showNominateIntro,
    
    // Splitting helpers (for advanced use cases)
    computeOverlayAvailableHeight: computeOverlayAvailableHeight,
    measureAndSplitLines: measureAndSplitLines,
    emitCardsFromChunks: emitCardsFromChunks,
    
    // Utility functions
    isCeremonyTitle: isCeremonyTitle
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
