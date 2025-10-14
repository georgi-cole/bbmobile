// MODULE: popup/BasePopup.js
// Base popup component with slots, accessibility, and token-based styling

(function(global){
  'use strict';

  // Import accessibility helpers
  const createFocusTrap = global.createFocusTrap || function(container){
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    if(focusableElements.length === 0){
      return () => {};
    }
    
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];
    const previouslyFocused = document.activeElement;
    
    firstFocusable.focus();
    
    const trapFocus = (e) => {
      if(e.key !== 'Tab') return;
      
      if(e.shiftKey){
        if(document.activeElement === firstFocusable){
          e.preventDefault();
          lastFocusable.focus();
        }
      } else {
        if(document.activeElement === lastFocusable){
          e.preventDefault();
          firstFocusable.focus();
        }
      }
    };
    
    container.addEventListener('keydown', trapFocus);
    
    return () => {
      container.removeEventListener('keydown', trapFocus);
      if(previouslyFocused && typeof previouslyFocused.focus === 'function'){
        previouslyFocused.focus();
      }
    };
  };

  /**
   * Create a base popup with header/body/footer slots
   * @param {Object} options Configuration options
   * @param {string} options.id - Unique popup identifier
   * @param {string} options.headerText - Header text
   * @param {string|HTMLElement} options.bodyContent - Body content (HTML string or element)
   * @param {string|HTMLElement} options.footerContent - Footer content (HTML string or element)
   * @param {Function} options.onClose - Callback when popup is closed
   * @param {boolean} options.closeOnBackdrop - Close when clicking backdrop (default: true)
   * @param {boolean} options.closeOnEsc - Close when pressing ESC (default: true)
   * @param {boolean} options.showCloseButton - Show close button in header (default: true)
   * @returns {HTMLElement} The popup element
   */
  function createBasePopup(options = {}){
    const {
      id = 'popup-' + Date.now(),
      headerText = 'Popup',
      bodyContent = '',
      footerContent = '',
      onClose = null,
      closeOnBackdrop = true,
      closeOnEsc = true,
      showCloseButton = true,
      className = ''
    } = options;

    // Create backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'base-popup-backdrop';
    backdrop.setAttribute('role', 'presentation');
    backdrop.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 999999;
      background: rgba(0, 0, 0, var(--popup-backdrop-opacity, 0.75));
      backdrop-filter: blur(var(--popup-backdrop-blur, 20px));
      -webkit-backdrop-filter: blur(var(--popup-backdrop-blur, 20px));
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--tv-safe-top, 44px) var(--tv-safe-x, 16px) var(--tv-safe-bottom, 42px);
      animation: popupBackdropFadeIn var(--popup-transition-duration, 0.3s) ease;
    `;

    // Create popup container
    const popup = document.createElement('div');
    popup.id = id;
    popup.className = 'base-popup ' + className;
    popup.setAttribute('role', 'dialog');
    popup.setAttribute('aria-modal', 'true');
    popup.setAttribute('aria-labelledby', id + '-header');
    popup.setAttribute('aria-describedby', id + '-body');
    popup.style.cssText = `
      background: linear-gradient(145deg, var(--popup-bg-start), var(--popup-bg-end));
      border: 1px solid var(--popup-border);
      border-radius: var(--popup-radius, 24px);
      box-shadow: var(--popup-shadow), var(--popup-shadow-inset);
      max-width: var(--popup-max-width);
      width: 100%;
      max-height: calc(100vh - var(--tv-safe-top, 44px) - var(--tv-safe-bottom, 42px) - 40px);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: popupSlideUp var(--popup-transition-duration, 0.3s) cubic-bezier(0.25, 0.9, 0.25, 1);
      position: relative;
    `;

    // Create header
    const header = document.createElement('div');
    header.className = 'base-popup-header';
    header.id = id + '-header';
    header.style.cssText = `
      padding: 20px 24px;
      border-bottom: 1px solid var(--line);
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-shrink: 0;
    `;

    const headerTitle = document.createElement('h2');
    headerTitle.textContent = headerText;
    headerTitle.style.cssText = `
      margin: 0;
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--accent);
      letter-spacing: 0.5px;
    `;
    header.appendChild(headerTitle);

    if(showCloseButton){
      const closeBtn = document.createElement('button');
      closeBtn.className = 'base-popup-close';
      closeBtn.setAttribute('aria-label', 'Close popup');
      closeBtn.textContent = '✕';
      closeBtn.style.cssText = `
        background: none;
        border: none;
        color: var(--muted);
        font-size: 1.5rem;
        line-height: 1;
        cursor: pointer;
        padding: 4px 8px;
        transition: color 0.2s ease;
      `;
      closeBtn.addEventListener('mouseenter', () => {
        closeBtn.style.color = 'var(--ink)';
      });
      closeBtn.addEventListener('mouseleave', () => {
        closeBtn.style.color = 'var(--muted)';
      });
      closeBtn.addEventListener('click', () => {
        closePopup('button');
      });
      header.appendChild(closeBtn);
    }

    popup.appendChild(header);

    // Create body
    const body = document.createElement('div');
    body.className = 'base-popup-body';
    body.id = id + '-body';
    body.style.cssText = `
      padding: var(--popup-padding);
      overflow-y: auto;
      overflow-x: hidden;
      flex: 1;
      color: var(--ink);
      font-size: 0.95rem;
      line-height: 1.6;
    `;
    
    if(typeof bodyContent === 'string'){
      body.innerHTML = bodyContent;
    } else if(bodyContent instanceof HTMLElement){
      body.appendChild(bodyContent);
    }
    
    popup.appendChild(body);

    // Create footer (optional)
    if(footerContent){
      const footer = document.createElement('div');
      footer.className = 'base-popup-footer';
      footer.style.cssText = `
        padding: 16px 24px;
        border-top: 1px solid var(--line);
        display: flex;
        justify-content: flex-end;
        gap: var(--popup-button-gap, 12px);
        flex-shrink: 0;
      `;
      
      if(typeof footerContent === 'string'){
        footer.innerHTML = footerContent;
      } else if(footerContent instanceof HTMLElement){
        footer.appendChild(footerContent);
      }
      
      popup.appendChild(footer);
    }

    backdrop.appendChild(popup);

    // Focus trap cleanup function
    let releaseFocusTrap = null;

    // Close function (accepts optional dismissMethod for telemetry)
    function closePopup(dismissMethod = 'programmatic'){
      // Cleanup focus trap
      if(releaseFocusTrap){
        releaseFocusTrap();
        releaseFocusTrap = null;
      }
      
      // Animate out
      backdrop.style.animation = 'popupBackdropFadeOut var(--popup-transition-duration, 0.3s) ease';
      popup.style.animation = 'popupSlideDown var(--popup-transition-duration, 0.3s) cubic-bezier(0.25, 0.9, 0.25, 1)';
      
      setTimeout(() => {
        if(backdrop.parentNode){
          backdrop.parentNode.removeChild(backdrop);
        }
        
        // Call onClose callback with dismiss method
        if(typeof onClose === 'function'){
          onClose(dismissMethod);
        }
      }, 300);
    }

    // Backdrop click handler
    if(closeOnBackdrop){
      backdrop.addEventListener('click', (e) => {
        if(e.target === backdrop){
          closePopup('backdrop');
        }
      });
    }

    // ESC key handler
    if(closeOnEsc){
      const escHandler = (e) => {
        if(e.key === 'Escape'){
          closePopup('esc');
          document.removeEventListener('keydown', escHandler);
        }
      };
      document.addEventListener('keydown', escHandler);
    }

    // Setup focus trap after popup is added to DOM
    setTimeout(() => {
      releaseFocusTrap = createFocusTrap(popup);
    }, 50);

    // Store close function on element
    backdrop.__closePopup = closePopup;

    return backdrop;
  }

  // Export to global
  global.createBasePopup = createBasePopup;

})(window);
