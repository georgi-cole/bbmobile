/**
 * XP Badge Component - displays current level and XP
 */

export function createBadge(container, options = {}) {
  const {
    onClick = null,
    theme = 'dark'
  } = options;

  const badge = document.createElement('div');
  badge.className = 'xp-badge';
  badge.style.cssText = `
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: ${theme === 'dark' ? '#2a2a2a' : '#fff'};
    border: 2px solid #ffdc8b;
    border-radius: 20px;
    cursor: ${onClick ? 'pointer' : 'default'};
    transition: all 0.2s ease;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    user-select: none;
  `;

  const levelIcon = document.createElement('div');
  levelIcon.style.cssText = `
    width: 32px;
    height: 32px;
    background: linear-gradient(135deg, #ffdc8b 0%, #ffa500 100%);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    font-size: 14px;
    color: #1a1a1a;
  `;

  const textContainer = document.createElement('div');
  textContainer.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: 2px;
  `;

  const levelText = document.createElement('div');
  levelText.style.cssText = `
    font-size: 12px;
    font-weight: 600;
    color: ${theme === 'dark' ? '#ffdc8b' : '#333'};
  `;

  const xpText = document.createElement('div');
  xpText.style.cssText = `
    font-size: 10px;
    color: ${theme === 'dark' ? '#b0b0b0' : '#666'};
  `;

  textContainer.appendChild(levelText);
  textContainer.appendChild(xpText);
  badge.appendChild(levelIcon);
  badge.appendChild(textContainer);

  if (onClick) {
    badge.addEventListener('click', onClick);
    badge.style.boxShadow = '0 2px 8px rgba(255, 220, 139, 0.3)';
    badge.addEventListener('mouseenter', () => {
      badge.style.transform = 'translateY(-2px)';
      badge.style.boxShadow = '0 4px 12px rgba(255, 220, 139, 0.4)';
    });
    badge.addEventListener('mouseleave', () => {
      badge.style.transform = 'translateY(0)';
      badge.style.boxShadow = '0 2px 8px rgba(255, 220, 139, 0.3)';
    });
  }

  // Update method
  badge.update = (state) => {
    levelIcon.textContent = state.level;
    levelText.textContent = `Level ${state.level}`;
    xpText.textContent = `${state.totalXP} XP`;
  };

  container.appendChild(badge);
  return badge;
}

/**
 * Create a floating "Score & Level" button
 */
export function createFloatingButton(options = {}) {
  const {
    position = 'bottom-right',
    onClick = null
  } = options;

  const button = document.createElement('button');
  button.className = 'xp-floating-button';
  button.textContent = '📊 Score & Level';
  
  const positions = {
    'bottom-right': 'bottom: 20px; right: 20px;',
    'bottom-left': 'bottom: 20px; left: 20px;',
    'top-right': 'top: 20px; right: 20px;',
    'top-left': 'top: 20px; left: 20px;'
  };

  button.style.cssText = `
    position: fixed;
    ${positions[position] || positions['bottom-right']}
    padding: 12px 20px;
    background: linear-gradient(135deg, #ffdc8b 0%, #ffa500 100%);
    border: none;
    border-radius: 24px;
    font-size: 14px;
    font-weight: 600;
    color: #1a1a1a;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(255, 220, 139, 0.4);
    transition: all 0.2s ease;
    z-index: 9999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    user-select: none;
  `;

  button.addEventListener('mouseenter', () => {
    button.style.transform = 'translateY(-2px) scale(1.05)';
    button.style.boxShadow = '0 6px 16px rgba(255, 220, 139, 0.5)';
  });

  button.addEventListener('mouseleave', () => {
    button.style.transform = 'translateY(0) scale(1)';
    button.style.boxShadow = '0 4px 12px rgba(255, 220, 139, 0.4)';
  });

  if (onClick) {
    button.addEventListener('click', onClick);
  }

  document.body.appendChild(button);
  return button;
}

/**
 * Create a top-right badge button (respects safe-area)
 * @param {Object} options - Configuration options
 * @returns {HTMLElement} Badge button element
 */
export function createBadgeButton(options = {}) {
  const {
    onClick = null,
    theme = 'dark'
  } = options;

  const button = document.createElement('button');
  button.className = 'xp-badge-button';
  button.setAttribute('aria-label', 'Open Progression Leaderboard');
  button.setAttribute('title', 'View Score & Level');
  button.textContent = '📊';
  
  button.style.cssText = `
    position: fixed;
    top: var(--tv-safe-top, 60px);
    right: var(--tv-safe-x, 20px);
    width: 48px;
    height: 48px;
    background: linear-gradient(135deg, #ffdc8b 0%, #ffa500 100%);
    border: none;
    border-radius: 50%;
    font-size: 24px;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(255, 220, 139, 0.4);
    transition: all 0.2s ease;
    z-index: 9998;
    display: flex;
    align-items: center;
    justify-content: center;
    user-select: none;
  `;

  button.addEventListener('mouseenter', () => {
    button.style.transform = 'scale(1.1)';
    button.style.boxShadow = '0 6px 20px rgba(255, 220, 139, 0.6)';
  });

  button.addEventListener('mouseleave', () => {
    button.style.transform = 'scale(1)';
    button.style.boxShadow = '0 4px 12px rgba(255, 220, 139, 0.4)';
  });

  button.addEventListener('focus', () => {
    button.style.outline = '3px solid #ffdc8b';
    button.style.outlineOffset = '2px';
  });

  button.addEventListener('blur', () => {
    button.style.outline = 'none';
  });

  if (onClick) {
    button.addEventListener('click', onClick);
  }

  // Support keyboard navigation
  button.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      button.click();
    }
  });

  document.body.appendChild(button);
  return button;
}
