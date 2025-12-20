// MODULE: rosterHover.js
// Desktop roster hover overlay for displaying houseguest profiles
// Features:
// - Canonical lookup using houseguestLookup utility
// - Real-time ally updates via event bus
// - Attach to roster items with data attributes

import { getProfileByKey } from '../utils/houseguestLookup.js';

export const RosterHover = (() => {
  /**
   * Build allies list for display
   * Returns array of ally names
   */
  function buildAllies(profile) {
    if (!profile) return [];
    
    // Check for allies array (populated by social-relations.js)
    const alliesIds = profile.allies || [];
    if (alliesIds.length === 0) return [];
    
    return alliesIds.map(targetId => {
      const ally = getProfileByKey(targetId);
      return ally ? ally.name : `Player ${targetId}`;
    }).filter(name => name != null);
  }

  /**
   * Render hover content at element
   */
  function renderHoverAt(el, profile) {
    if (!el) return;
    
    if (!profile) {
      el.innerHTML = '<div class="empty">Profile not found</div>';
      el.removeAttribute('data-houseguest-id');
      return;
    }
    
    const allies = buildAllies(profile);
    const alliesHtml = allies.length 
      ? allies.map(a => `<span class="ally">${a}</span>`).join(', ')
      : 'None';
    
    const name = profile.fullName || profile.name || 'Guest';
    
    el.innerHTML = `
      <div class="hover-profile">
        <strong>${name}</strong>
        <div class="hover-social">
          <div>Allies: ${alliesHtml}</div>
        </div>
      </div>
    `;
    el.dataset.houseguestId = profile.id;
  }

  /**
   * Attach hover handlers to roster items
   * @param {string} selector - CSS selector for roster items
   */
  function attach(selector = '.roster .item') {
    const items = document.querySelectorAll(selector);
    if (items.length === 0) {
      console.warn('[RosterHover] No roster items found for selector:', selector);
      return;
    }
    
    items.forEach(item => {
      item.addEventListener('mouseenter', () => {
        // Try multiple data attributes for compatibility
        const key = item.dataset.houseguestId || 
                    item.dataset.houseguestName || 
                    item.dataset.slug || 
                    item.dataset.playerId ||
                    item.textContent.trim();
        
        const profile = getProfileByKey(key);
        const hoverEl = document.getElementById('roster-hover');
        
        if (hoverEl) {
          renderHoverAt(hoverEl, profile);
          // Show the hover element if it has visibility controls
          hoverEl.classList.remove('hidden');
          console.debug('[RosterHover] Showing hover for:', profile ? profile.name : 'unknown');
        } else {
          console.warn('[RosterHover] Hover element not found (#roster-hover)');
        }
      });
      
      // Optional: hide on mouse leave
      item.addEventListener('mouseleave', () => {
        const hoverEl = document.getElementById('roster-hover');
        if (hoverEl) {
          hoverEl.classList.add('hidden');
        }
      });
    });
    
    console.info('[RosterHover] Attached hover handlers to', items.length, 'roster items');
  }

  /**
   * Handle social update event - refresh visible hover
   */
  function onSocialUpdate() {
    const hoverEl = document.getElementById('roster-hover');
    if (!hoverEl || hoverEl.classList.contains('hidden')) {
      return; // Hover not visible, no need to refresh
    }
    
    const id = hoverEl.dataset.houseguestId;
    if (!id) return;
    
    const profile = getProfileByKey(id);
    if (profile) {
      renderHoverAt(hoverEl, profile);
      console.info('[RosterHover] Refreshed hover after social update');
    }
  }

  // Subscribe to social update events
  // Using both possible event names for compatibility
  if (window.game && window.game.bus && typeof window.game.bus.on === 'function') {
    window.game.bus.on('social:updated', onSocialUpdate);
    window.game.bus.on('social.relation.changed', onSocialUpdate);
    window.game.bus.on('social.relations.synced', onSocialUpdate);
    console.info('[RosterHover] Subscribed to social update events');
  } else {
    console.warn('[RosterHover] Event bus not available - social updates will not refresh hover');
  }

  return { attach };
})();
