// MODULE: popup/SocialDecisionPopup.js
// Social decision popup with player avatar, themed buttons, and accessibility

(function(global){
  'use strict';

  /**
   * Create avatar element with fallback support
   * @param {string|object} playerIdOrObject - Player ID or player object
   * @returns {HTMLElement} Avatar container element
   */
  function createAvatarElement(playerIdOrObject){
    const container = document.createElement('div');
    container.className = 'social-popup-avatar-container';
    container.style.cssText = `
      width: 80px;
      height: 80px;
      border-radius: 50%;
      overflow: hidden;
      background: linear-gradient(135deg, var(--primary-2), var(--primary-1));
      display: flex;
      align-items: center;
      justify-content: center;
      border: 3px solid var(--accent);
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      flex-shrink: 0;
    `;

    // Get player object and details
    let player;
    if(typeof playerIdOrObject === 'object' && playerIdOrObject !== null){
      player = playerIdOrObject;
    } else {
      const getP = global.getP;
      player = getP ? getP(playerIdOrObject) : null;
    }

    const playerName = player?.name || 'Player';
    const playerId = player?.id || playerIdOrObject;

    // Try to resolve avatar
    const avatarUrl = global.resolveAvatar ? global.resolveAvatar(player || playerId) : null;

    if(avatarUrl){
      const img = document.createElement('img');
      img.src = avatarUrl;
      img.alt = `${playerName}'s avatar`;
      img.style.cssText = `
        width: 100%;
        height: 100%;
        object-fit: cover;
      `;
      
      // Fallback to initials if image fails
      img.onerror = () => {
        img.remove();
        container.appendChild(createInitialsFallback(playerName));
      };
      
      container.appendChild(img);
    } else {
      // No avatar URL, use initials immediately
      container.appendChild(createInitialsFallback(playerName));
    }

    return container;
  }

  /**
   * Create initials fallback element
   * @param {string} name - Player name
   * @returns {HTMLElement} Initials element
   */
  function createInitialsFallback(name){
    const initials = document.createElement('div');
    initials.className = 'social-popup-avatar-initials';
    
    // Generate initials from name
    const initialsText = name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
    
    initials.textContent = initialsText || '?';
    initials.style.cssText = `
      font-size: 2rem;
      font-weight: 700;
      color: var(--accent);
      user-select: none;
    `;
    initials.setAttribute('aria-label', `${name}'s initials: ${initialsText}`);
    
    return initials;
  }

  /**
   * Create themed button
   * @param {Object} options Button configuration
   * @param {string} options.label - Button label
   * @param {string} options.theme - Button theme (accept/refuse/neutral)
   * @param {Function} options.onClick - Click handler
   * @returns {HTMLElement} Button element
   */
  function createThemedButton(options = {}){
    const {
      label = 'OK',
      theme = 'neutral',
      onClick = null
    } = options;

    const button = document.createElement('button');
    button.className = 'social-decision-btn social-decision-btn-' + theme;
    button.textContent = label;
    button.setAttribute('type', 'button');

    // Theme-based styling with token inheritance
    let bgColor, hoverBrightness, textColor;
    
    if(theme === 'accept'){
      bgColor = 'var(--good)';
      hoverBrightness = '1.1';  // Slightly brighter on hover
      textColor = '#0d151f';
    } else if(theme === 'refuse'){
      bgColor = 'var(--bad)';
      hoverBrightness = '1.1';
      textColor = '#fff';
    } else {
      bgColor = 'var(--primary-3)';
      hoverBrightness = '1.15';
      textColor = 'var(--ink)';
    }

    button.style.cssText = `
      background: ${bgColor};
      color: ${textColor};
      border: none;
      padding: 12px 28px;
      border-radius: 10px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      min-width: 120px;
      flex-shrink: 0;
    `;

    button.addEventListener('mouseenter', () => {
      button.style.filter = `brightness(${hoverBrightness})`;
      button.style.transform = 'translateY(-2px)';
      button.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
    });

    button.addEventListener('mouseleave', () => {
      button.style.filter = 'brightness(1)';
      button.style.transform = 'translateY(0)';
      button.style.boxShadow = 'none';
    });

    if(typeof onClick === 'function'){
      button.addEventListener('click', onClick);
    }

    return button;
  }

  /**
   * Create social decision popup
   * @param {Object} options Configuration options
   * @param {string|object} options.player - Player ID or player object
   * @param {string} options.title - Popup title
   * @param {string|Array<string>} options.bodyText - Body text (string or array of strings)
   * @param {Array<Object>} options.actions - Array of action buttons
   * @param {Function} options.onClose - Callback when popup is closed
   * @returns {HTMLElement} The popup element
   */
  function createSocialDecisionPopup(options = {}){
    const {
      player = null,
      title = 'Social Decision',
      bodyText = '',
      actions = [],
      onClose = null
    } = options;

    // Create header content with avatar
    const headerContent = document.createElement('div');
    headerContent.style.cssText = `
      display: flex;
      align-items: center;
      gap: 16px;
    `;

    // Add avatar if player is provided
    if(player){
      const avatar = createAvatarElement(player);
      headerContent.appendChild(avatar);
    }

    // Add title
    const titleElement = document.createElement('h2');
    titleElement.textContent = title;
    titleElement.style.cssText = `
      margin: 0;
      font-size: 1.15rem;
      font-weight: 700;
      letter-spacing: 0.5px;
      flex: 1;
      /* Match HOH Challenge popup header styling */
      background: linear-gradient(135deg, #f0f8ff 0%, var(--accent-2) 50%, #f0f8ff 100%);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
      text-shadow: 0 0 28px var(--accent);
      filter: drop-shadow(0 2px 8px rgba(140,200,255,0.4));
    `;
    headerContent.appendChild(titleElement);

    // Create body content
    const bodyContent = document.createElement('div');
    bodyContent.className = 'social-popup-body';
    
    if(Array.isArray(bodyText)){
      bodyText.forEach(text => {
        const p = document.createElement('p');
        p.textContent = text;
        p.style.cssText = `
          margin: 0 0 12px 0;
          line-height: 1.7;
          color: var(--ink);
          font-size: 0.95rem;
        `;
        bodyContent.appendChild(p);
      });
    } else if(typeof bodyText === 'string'){
      const p = document.createElement('p');
      p.textContent = bodyText;
      p.style.cssText = `
        margin: 0;
        line-height: 1.7;
        color: var(--ink);
        font-size: 0.95rem;
      `;
      bodyContent.appendChild(p);
    }

    // Create footer with themed buttons
    const footerContent = document.createElement('div');
    footerContent.className = 'social-popup-footer';
    footerContent.style.cssText = `
      display: flex;
      justify-content: center;
      gap: var(--popup-button-gap, 14px);
      flex-wrap: wrap;
      margin-top: var(--popup-content-gap, 18px);
    `;

    // Add action buttons
    actions.forEach(action => {
      const button = createThemedButton({
        label: action.label || 'OK',
        theme: action.theme || 'neutral',
        onClick: () => {
          if(typeof action.onChoose === 'function'){
            action.onChoose();
          }
          // Close popup after action
          if(popupElement && popupElement.__closePopup){
            popupElement.__closePopup();
          }
        }
      });
      footerContent.appendChild(button);
    });

    // Create the base popup with custom header
    const popupElement = global.createBasePopup({
      id: 'social-decision-popup-' + Date.now(),
      headerText: '', // We'll replace header with custom content
      bodyContent: bodyContent,
      footerContent: footerContent,
      onClose: onClose,
      closeOnBackdrop: false, // Require explicit button click
      closeOnEsc: true,
      showCloseButton: false, // No close button for decision popups
      className: 'social-decision-popup'
    });

    // Replace header with custom header containing avatar
    const headerElement = popupElement.querySelector('.base-popup-header');
    if(headerElement){
      // Clear default header content
      headerElement.innerHTML = '';
      headerElement.appendChild(headerContent);
    }

    return popupElement;
  }

  // Export to global
  global.createSocialDecisionPopup = createSocialDecisionPopup;

})(window);
