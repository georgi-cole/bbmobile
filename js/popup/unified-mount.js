// MODULE: popup/unified-mount.js
// Unified popup mounting system that centers all popups/cards within the faux TV viewport
// instead of the full device viewport.

(function(global) {
  'use strict';

  /**
   * Find the TV viewport container
   * Priority: .tvViewport > .tv-screen > #panel > body (fallback)
   */
  function findTVContainer() {
    // First choice: .tvViewport
    let container = document.querySelector('.tvViewport');
    if (container) return container;

    // Second choice: .tv-screen
    container = document.querySelector('.tv-screen');
    if (container) return container;

    // Third choice: #panel (action card area)
    container = document.getElementById('panel');
    if (container) return container;

    // Last resort: body (shouldn't happen but prevents crashes)
    console.warn('[unified-mount] Could not find TV container, falling back to body');
    return document.body;
  }

  /**
   * Get or create the popup host within the TV container
   * @param {HTMLElement} tvContainer - The TV viewport container
   * @returns {HTMLElement} The popup host element
   */
  function ensurePopupHost(tvContainer) {
    let host = tvContainer.querySelector('.bb-popup-host');
    
    if (!host) {
      host = document.createElement('div');
      host.className = 'bb-popup-host';
      host.setAttribute('role', 'presentation');
      tvContainer.appendChild(host);
      console.info('[unified-mount] Created .bb-popup-host in', tvContainer.className || tvContainer.id);
    }
    
    return host;
  }

  /**
   * Mount a centered popup within the TV viewport
   * @param {HTMLElement|string} content - The popup content element or HTML string
   * @param {Object} options - Mounting options
   * @param {boolean} options.replace - Replace existing popups (default: true)
   * @param {string} options.className - Additional CSS class for the wrapper
   * @param {boolean} options.lockScroll - Lock TV viewport scroll (default: true)
   * @param {boolean} options.dialog - Add dialog ARIA attributes (default: true)
   * @param {Function} options.onMount - Callback after mount
   * @returns {HTMLElement} The wrapper element (.bb-popup-card)
   */
  function mountCenteredPopup(content, options = {}) {
    const {
      replace = true,
      className = '',
      lockScroll = true,
      dialog = true,
      onMount = null
    } = options;

    // Find TV container and ensure popup host exists
    const tvContainer = findTVContainer();
    const host = ensurePopupHost(tvContainer);

    // Clear existing popups if replace is true (one-at-a-time policy)
    if (replace) {
      unmountPopups();
    }

    // Create wrapper with .bb-popup-card class
    const wrapper = document.createElement('div');
    wrapper.className = 'bb-popup-card' + (className ? ' ' + className : '');

    // Add dialog ARIA attributes if requested
    if (dialog) {
      wrapper.setAttribute('role', 'dialog');
      wrapper.setAttribute('aria-modal', 'true');
    }

    // Add content to wrapper
    if (typeof content === 'string') {
      wrapper.innerHTML = content;
    } else if (content instanceof HTMLElement) {
      wrapper.appendChild(content);
    } else {
      console.error('[unified-mount] Invalid content type:', typeof content);
      return null;
    }

    // Mount to host
    host.appendChild(wrapper);

    // Lock TV viewport scroll if requested
    if (lockScroll) {
      tvContainer.classList.add('popup-active');
    }

    // Call onMount callback if provided
    if (typeof onMount === 'function') {
      try {
        onMount(wrapper);
      } catch (e) {
        console.error('[unified-mount] onMount callback error:', e);
      }
    }

    console.info('[unified-mount] Popup mounted in TV viewport');
    return wrapper;
  }

  /**
   * Unmount all popups from the TV viewport
   * @param {Object} options - Unmounting options
   * @param {boolean} options.unlockScroll - Unlock TV viewport scroll (default: true)
   * @param {Function} options.onUnmount - Callback after unmount
   */
  function unmountPopups(options = {}) {
    const {
      unlockScroll = true,
      onUnmount = null
    } = options;

    const tvContainer = findTVContainer();
    const host = tvContainer.querySelector('.bb-popup-host');

    if (host) {
      // Remove all popup cards
      const popups = host.querySelectorAll('.bb-popup-card');
      popups.forEach(popup => popup.remove());
      
      // Clear host content (in case of orphaned nodes)
      host.innerHTML = '';
      
      console.info('[unified-mount] Unmounted', popups.length, 'popup(s)');
    }

    // Unlock TV viewport scroll if requested
    if (unlockScroll) {
      tvContainer.classList.remove('popup-active');
    }

    // Call onUnmount callback if provided
    if (typeof onUnmount === 'function') {
      try {
        onUnmount();
      } catch (e) {
        console.error('[unified-mount] onUnmount callback error:', e);
      }
    }
  }

  /**
   * Check if any popups are currently mounted
   * @returns {boolean} True if popups are mounted
   */
  function hasActivePopups() {
    const tvContainer = findTVContainer();
    const host = tvContainer.querySelector('.bb-popup-host');
    return host && host.querySelectorAll('.bb-popup-card').length > 0;
  }

  /**
   * Get all currently mounted popups
   * @returns {HTMLElement[]} Array of popup elements
   */
  function getActivePopups() {
    const tvContainer = findTVContainer();
    const host = tvContainer.querySelector('.bb-popup-host');
    return host ? Array.from(host.querySelectorAll('.bb-popup-card')) : [];
  }

  // Expose public API to global scope
  global.mountCenteredPopup = mountCenteredPopup;
  global.unmountPopups = unmountPopups;
  global.hasActivePopups = hasActivePopups;
  global.getActivePopups = getActivePopups;

  // Also expose as namespaced object for cleaner API
  global.UnifiedPopup = {
    mount: mountCenteredPopup,
    unmount: unmountPopups,
    hasActive: hasActivePopups,
    getActive: getActivePopups
  };

  console.info('[unified-mount] Popup mounting system initialized');

})(window);
