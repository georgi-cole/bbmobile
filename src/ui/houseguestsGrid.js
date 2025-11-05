/**
 * Houseguests Grid Module
 * 
 * Provides a compact 4×4 grid for displaying houseguests with status indicators
 * Optimized for mobile viewing with tap and long-press support
 * 
 * @module src/ui/houseguestsGrid
 */

/**
 * Mount a houseguests grid component
 * 
 * @param {HTMLElement} container - Container element for the grid
 * @param {Object} options - Configuration options
 * @param {Function} options.onTap - Callback for tap/click (receives player data)
 * @param {Function} options.onLongPress - Callback for long-press (receives player data)
 * @returns {Object} Grid API with render method
 */
export function mountHouseguestsGrid(container, options = {}) {
  const { onTap, onLongPress } = options;
  
  // Create grid container
  const gridEl = document.createElement('div');
  gridEl.className = 'hg-grid';
  container.appendChild(gridEl);
  
  // Track long-press state
  let longPressTimer = null;
  let longPressTriggered = false;
  
  /**
   * Handle pointer/touch start
   */
  function handlePointerDown(player, event) {
    if (player.evicted) return;
    
    longPressTriggered = false;
    
    // Clear any existing timer
    if (longPressTimer) {
      clearTimeout(longPressTimer);
    }
    
    // Start long-press timer (500ms)
    longPressTimer = setTimeout(() => {
      longPressTriggered = true;
      if (onLongPress) {
        onLongPress(player);
      }
    }, 500);
  }
  
  /**
   * Handle pointer/touch end
   */
  function handlePointerUp(player, event) {
    if (player.evicted) return;
    
    // Clear long-press timer
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
    
    // If not a long-press, trigger tap
    if (!longPressTriggered && onTap) {
      onTap(player);
    }
  }
  
  /**
   * Handle pointer/touch cancel
   */
  function handlePointerCancel() {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
    longPressTriggered = false;
  }
  
  /**
   * Create a card element for a houseguest
   * 
   * @param {Object} player - Player data
   * @param {string} player.id - Unique identifier
   * @param {string} player.name - Display name
   * @param {string} player.avatar - Avatar image URL
   * @param {boolean} player.hoh - Is Head of Household
   * @param {boolean} player.nom - Is nominated
   * @param {boolean} player.evicted - Is evicted
   * @returns {HTMLElement} Card element
   */
  function createCard(player) {
    const card = document.createElement('div');
    card.className = 'hg-card';
    card.dataset.playerId = player.id;
    
    // Add status classes
    if (player.hoh) card.classList.add('hg-card--hoh');
    if (player.nom) card.classList.add('hg-card--nom');
    if (player.evicted) card.classList.add('hg-card--evicted');
    
    // Avatar container
    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'hg-card__avatar';
    
    const avatarImg = document.createElement('img');
    avatarImg.src = player.avatar;
    avatarImg.alt = player.name;
    avatarImg.loading = 'lazy';
    avatarDiv.appendChild(avatarImg);
    
    card.appendChild(avatarDiv);
    
    // Status pills
    if ((player.hoh || player.nom) && !player.evicted) {
      const pillsDiv = document.createElement('div');
      pillsDiv.className = 'hg-card__pills';
      
      if (player.hoh) {
        const hohPill = document.createElement('div');
        hohPill.className = 'hg-card__pill hg-card__pill--hoh';
        hohPill.textContent = 'HOH';
        pillsDiv.appendChild(hohPill);
      }
      
      if (player.nom) {
        const nomPill = document.createElement('div');
        nomPill.className = 'hg-card__pill hg-card__pill--nom';
        nomPill.textContent = 'NOM';
        pillsDiv.appendChild(nomPill);
      }
      
      card.appendChild(pillsDiv);
    }
    
    // Name label
    const nameDiv = document.createElement('div');
    nameDiv.className = 'hg-card__name';
    nameDiv.textContent = player.name;
    card.appendChild(nameDiv);
    
    // Add event listeners if not evicted
    if (!player.evicted) {
      // Use pointer events for better cross-device support
      card.addEventListener('pointerdown', (e) => handlePointerDown(player, e));
      card.addEventListener('pointerup', (e) => handlePointerUp(player, e));
      card.addEventListener('pointercancel', handlePointerCancel);
      card.addEventListener('pointerleave', handlePointerCancel);
      
      // Prevent context menu on long-press for mobile
      card.addEventListener('contextmenu', (e) => {
        if (longPressTriggered) {
          e.preventDefault();
        }
      });
    }
    
    return card;
  }
  
  /**
   * Render the grid with player data
   * 
   * @param {Array<Object>} players - Array of player objects
   */
  function render(players) {
    // Clear existing cards
    gridEl.innerHTML = '';
    
    // Create and append cards
    players.forEach(player => {
      const card = createCard(player);
      gridEl.appendChild(card);
    });
  }
  
  /**
   * Destroy the grid and clean up
   */
  function destroy() {
    gridEl.remove();
  }
  
  // Return public API
  return {
    render,
    destroy
  };
}
