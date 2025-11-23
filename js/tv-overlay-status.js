// MODULE: tv-overlay-status.js
// Compact status chip in TV header, positioned next to Skip button
// Replaces the below-TV message strip for transient status updates
//
// API:
// - window.TvStatus.set(text: string) - Display a simple text message
// - window.TvStatus.setPlayersAndNote(players: string[], note: string) - Display player list with note
// - window.TvStatus.clear() - Clear the status chip

(function(g){
  'use strict';

  const TvStatus = g.TvStatus || (g.TvStatus = {});

  let statusChip = null;
  let statusContent = null;
  let hideTimeout = null;

  // Initialize the status chip in TV header
  function init(){
    const tvHead = document.querySelector('.tvHead');
    if(!tvHead){
      console.warn('[TvStatus] .tvHead not found');
      return;
    }

    // Create status chip container
    statusChip = document.createElement('div');
    statusChip.id = 'tvStatusChip';
    statusChip.className = 'tv-status-chip tv-inline-theme';
    statusChip.setAttribute('role', 'status');
    statusChip.setAttribute('aria-live', 'polite');
    statusChip.setAttribute('aria-atomic', 'true');
    statusChip.style.display = 'none'; // Hidden by default

    // Create content span
    statusContent = document.createElement('span');
    statusContent.className = 'tv-status-content';
    statusChip.appendChild(statusContent);

    // Append to the end of tvHead (where timer used to be)
    tvHead.appendChild(statusChip);

    console.info('[TvStatus] Initialized');
  }

  // Set a simple text message
  function set(text){
    if(!statusChip || !statusContent){
      console.warn('[TvStatus] Not initialized');
      return;
    }

    if(!text || typeof text !== 'string'){
      clear();
      return;
    }

    // Clear any existing hide timeout
    if(hideTimeout){
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }

    // Update content
    statusContent.textContent = text;
    statusChip.style.display = 'inline-flex';

    console.info('[TvStatus] Set:', text);
  }

  // Set player list with optional note
  function setPlayersAndNote(players, note){
    if(!statusChip || !statusContent){
      console.warn('[TvStatus] Not initialized');
      return;
    }

    if(!Array.isArray(players) || players.length === 0){
      if(note){
        set(note);
      } else {
        clear();
      }
      return;
    }

    // Clear any existing hide timeout
    if(hideTimeout){
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }

    // Format: "Players: Name1, Name2, Name3"
    let text = 'Players: ' + players.join(', ');
    if(note){
      text += ' • ' + note;
    }

    statusContent.textContent = text;
    statusChip.style.display = 'inline-flex';

    console.info('[TvStatus] Set players and note:', text);
  }

  // Clear the status chip
  function clear(){
    if(!statusChip){
      console.warn('[TvStatus] Not initialized');
      return;
    }

    // Clear any existing hide timeout
    if(hideTimeout){
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }

    statusChip.style.display = 'none';
    if(statusContent){
      statusContent.textContent = '';
    }

    console.info('[TvStatus] Cleared');
  }

  // Hook into setPhase to clear status on phase changes
  function wrapSetPhase(){
    if(!g.setPhase) {
      // Retry if setPhase doesn't exist yet
      setTimeout(wrapSetPhase, 100);
      return;
    }
    
    if(g.setPhase.__tvStatusWrapped) return; // Already wrapped
    
    const originalSetPhase = g.setPhase;
    g.setPhase = function(...args){
      // Clear status on phase change
      clear();
      const result = originalSetPhase.apply(this, args);
      return result;
    };
    g.setPhase.__tvStatusWrapped = true;
  }

  // Auto-initialize on DOM ready
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', () => {
      init();
      wrapSetPhase();
    }, { once: true });
  } else {
    init();
    wrapSetPhase();
  }

  // Exports
  TvStatus.set = set;
  TvStatus.setPlayersAndNote = setPlayersAndNote;
  TvStatus.clear = clear;
  g.TvStatus = TvStatus;

})(window);
