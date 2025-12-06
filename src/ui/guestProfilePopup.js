// MODULE: guestProfilePopup.js
// Hover/tap profile popup for displaying houseguest profile information
// Shows basic info in a compact popup when hovering or tapping guest cards
// This is different from the full-screen HouseguestsModal - this is a lightweight tooltip/popup

(function(global) {
  'use strict';

  let popupElement = null;
  let currentGuestId = null;
  let hideTimeout = null;

  const HIDE_DELAY = 300; // ms delay before hiding on mouse leave
  const POPUP_MARGIN = 10; // px margin from viewport edges

  /**
   * Initialize popup DOM structure
   */
  function initPopup() {
    if (popupElement) return;

    const popup = document.createElement('div');
    popup.id = 'guestProfilePopup';
    popup.className = 'guest-profile-popup';
    popup.setAttribute('role', 'tooltip');
    popup.setAttribute('aria-hidden', 'true');
    popup.style.display = 'none';

    popup.innerHTML = `
      <button class="guest-profile-popup__close" aria-label="Close profile">✕</button>
      <div class="guest-profile-popup__content">
        <div class="guest-profile-popup__avatar"></div>
        <div class="guest-profile-popup__info">
          <h3 class="guest-profile-popup__name"></h3>
          <div class="guest-profile-popup__details">
            <div class="guest-profile-popup__field">
              <span class="guest-profile-popup__label">Age:</span>
              <span class="guest-profile-popup__value" data-field="age"></span>
            </div>
            <div class="guest-profile-popup__field">
              <span class="guest-profile-popup__label">Location:</span>
              <span class="guest-profile-popup__value" data-field="location"></span>
            </div>
            <div class="guest-profile-popup__field">
              <span class="guest-profile-popup__label">Occupation:</span>
              <span class="guest-profile-popup__value" data-field="occupation"></span>
            </div>
            <div class="guest-profile-popup__field">
              <span class="guest-profile-popup__label">Motto:</span>
              <span class="guest-profile-popup__value" data-field="motto"></span>
            </div>
            <div class="guest-profile-popup__field">
              <span class="guest-profile-popup__label">Fun Fact:</span>
              <span class="guest-profile-popup__value" data-field="funFact"></span>
            </div>
            <div class="guest-profile-popup__field">
              <span class="guest-profile-popup__label">Allies:</span>
              <span class="guest-profile-popup__value" data-field="allies"></span>
            </div>
            <div class="guest-profile-popup__field">
              <span class="guest-profile-popup__label">Enemies:</span>
              <span class="guest-profile-popup__value" data-field="enemies"></span>
            </div>
          </div>
        </div>
      </div>
    `;

    // Wire close button
    const closeBtn = popup.querySelector('.guest-profile-popup__close');
    closeBtn.addEventListener('click', close);

    // Also close on escape key
    document.addEventListener('keydown', handleEscKey);

    document.body.appendChild(popup);
    popupElement = popup;

    console.info('[guestProfilePopup] Popup initialized');
  }

  /**
   * Open popup for a specific houseguest by ID
   * @param {string} id - Houseguest stable ID (e.g., 'kian', 'finn')
   * @param {HTMLElement} anchorElement - Optional element to position popup near
   */
  function openById(id, anchorElement = null) {
    if (!global.Houseguests || typeof global.Houseguests.getById !== 'function') {
      console.error('[guestProfilePopup] Houseguests.getById not available');
      return;
    }

    const guest = global.Houseguests.getById(id);
    if (!guest) {
      console.warn('[guestProfilePopup] Guest not found:', id);
      return;
    }

    initPopup();
    clearTimeout(hideTimeout);

    // Populate popup content
    populatePopup(guest);

    // Position popup
    if (anchorElement) {
      positionPopup(anchorElement);
    }

    // Show popup
    popupElement.style.display = 'block';
    popupElement.setAttribute('aria-hidden', 'false');
    setTimeout(() => {
      popupElement.classList.add('guest-profile-popup--visible');
    }, 10);

    currentGuestId = id;
    console.info('[guestProfilePopup] Opened for:', guest.name);
  }

  /**
   * Populate popup with guest data
   * @param {object} guest - Houseguest data object
   */
  function populatePopup(guest) {
    if (!popupElement) return;

    // Avatar
    const avatarEl = popupElement.querySelector('.guest-profile-popup__avatar');
    const AvatarCache = global.AvatarCache || window.AvatarCache;
    let avatarUrl = null;

    if (AvatarCache && typeof AvatarCache.getUrl === 'function') {
      avatarUrl = AvatarCache.getUrl(guest);
    } else if (global.resolveAvatar) {
      avatarUrl = global.resolveAvatar(guest);
    } else {
      avatarUrl = `avatars/${guest.name}.png`;
    }

    avatarEl.style.backgroundImage = `url(${avatarUrl})`;
    avatarEl.textContent = ''; // Clear any placeholder

    // Name
    const nameEl = popupElement.querySelector('.guest-profile-popup__name');
    nameEl.textContent = guest.fullName || guest.name;

    // Fields - use em dash (—) for missing data
    const fields = {
      age: guest.age || '—',
      location: guest.location || '—',
      occupation: guest.profession || '—',
      motto: guest.motto || '—',
      funFact: guest.funFact || '—'
    };

    // Handle allies and enemies - show 'None' for empty arrays
    fields.allies = (guest.allies && guest.allies.length > 0) 
      ? guest.allies.join(', ') 
      : 'None';
    fields.enemies = (guest.enemies && guest.enemies.length > 0) 
      ? guest.enemies.join(', ') 
      : 'None';

    // Update all field values
    Object.keys(fields).forEach(key => {
      const valueEl = popupElement.querySelector(`[data-field="${key}"]`);
      if (valueEl) {
        valueEl.textContent = fields[key];
      }
    });
  }

  /**
   * Position popup near anchor element
   * @param {HTMLElement} anchor - Element to position popup relative to
   */
  function positionPopup(anchor) {
    if (!popupElement || !anchor) return;

    const rect = anchor.getBoundingClientRect();
    const popupRect = popupElement.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Default: position to the right of the anchor
    let left = rect.right + POPUP_MARGIN;
    let top = rect.top;

    // If popup would overflow right edge, position to the left
    if (left + popupRect.width > viewportWidth - POPUP_MARGIN) {
      left = rect.left - popupRect.width - POPUP_MARGIN;
    }

    // If still overflows left edge, center horizontally
    if (left < POPUP_MARGIN) {
      left = (viewportWidth - popupRect.width) / 2;
    }

    // Ensure popup doesn't overflow bottom
    if (top + popupRect.height > viewportHeight - POPUP_MARGIN) {
      top = viewportHeight - popupRect.height - POPUP_MARGIN;
    }

    // Ensure popup doesn't overflow top
    if (top < POPUP_MARGIN) {
      top = POPUP_MARGIN;
    }

    popupElement.style.left = `${left}px`;
    popupElement.style.top = `${top}px`;
  }

  /**
   * Close the popup
   */
  function close() {
    if (!popupElement) return;

    popupElement.classList.remove('guest-profile-popup--visible');
    
    setTimeout(() => {
      popupElement.style.display = 'none';
      popupElement.setAttribute('aria-hidden', 'true');
      currentGuestId = null;
    }, 200);

    console.info('[guestProfilePopup] Closed');
  }

  /**
   * Schedule popup hide with delay (for hover out)
   */
  function scheduleHide() {
    clearTimeout(hideTimeout);
    hideTimeout = setTimeout(close, HIDE_DELAY);
  }

  /**
   * Cancel scheduled hide (for hover back in)
   */
  function cancelHide() {
    clearTimeout(hideTimeout);
  }

  /**
   * Handle ESC key to close popup
   */
  function handleEscKey(e) {
    if (e.key === 'Escape' && popupElement && popupElement.style.display !== 'none') {
      close();
    }
  }

  // Expose to global scope
  global.GuestProfilePopup = {
    openById,
    close,
    scheduleHide,
    cancelHide
  };

  console.info('[guestProfilePopup] Module loaded');

})(window);
