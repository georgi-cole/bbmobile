/**
 * XP Badge Component - displays current level and XP
 */

/**
 * Create and show a tooltip for the XP badge
 * @param {HTMLElement} badge - The badge element to attach the tooltip to
 * @param {boolean} autoShow - Whether to show automatically on first visit
 */
function createTooltip(badge, autoShow = false) {
  // Check if tooltip has been shown before
  const hasSeenTooltip = localStorage.getItem('xp-badge-tooltip-seen') === 'true';
  
  // Get theme colors
  const computedStyle = getComputedStyle(document.body);
  const bodyTheme = document.body.getAttribute('data-theme') || 'tvstudio';
  const lightThemes = ['modernhouse', 'miami', 'cabin'];
  const isDark = !lightThemes.includes(bodyTheme);
  
  const bgColor = computedStyle.getPropertyValue('--card-2').trim() || (isDark ? '#182738' : '#f5f5f5');
  const borderColor = computedStyle.getPropertyValue('--line').trim() || (isDark ? '#2c4662' : '#ddd');
  const textColor = computedStyle.getPropertyValue('--ink').trim() || (isDark ? '#e3ecf5' : '#333');
  
  const tooltip = document.createElement('div');
  tooltip.className = 'xp-badge-tooltip';
  tooltip.style.cssText = `
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    margin-top: 8px;
    background: ${bgColor};
    border: 1px solid ${borderColor};
    border-radius: 8px;
    padding: 12px 16px;
    width: 240px;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.4);
    z-index: 1000;
    font-size: 0.75rem;
    color: ${textColor};
    line-height: 1.4;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.2s ease;
  `;
  tooltip.textContent = 'Here you can check your XP score. The higher your level, the better the prizes you can win!';
  
  // Position tooltip relative to badge
  badge.style.position = 'relative';
  badge.appendChild(tooltip);
  
  // Show tooltip function
  const showTooltip = () => {
    tooltip.style.opacity = '1';
  };
  
  // Hide tooltip function
  const hideTooltip = () => {
    tooltip.style.opacity = '0';
  };
  
  // Auto-show on first visit
  if (autoShow && !hasSeenTooltip) {
    setTimeout(() => {
      showTooltip();
      localStorage.setItem('xp-badge-tooltip-seen', 'true');
      
      // Auto-hide after 5 seconds
      setTimeout(hideTooltip, 5000);
    }, 500);
  }
  
  // Show/hide on hover
  badge.addEventListener('mouseenter', showTooltip);
  badge.addEventListener('mouseleave', hideTooltip);
  
  return tooltip;
}

/**
 * Create a topbar badge button that matches the standard button style
 * @param {Object} options - Configuration options
 * @returns {HTMLElement} Badge button element
 */
export function createBadgeButton(options = {}) {
  const {
    onClick = null,
    theme = 'dark',
    showTooltip = true
  } = options;

  const button = document.createElement('button');
  button.id = 'xpLeaderboardBadge';
  button.className = 'btn';
  button.setAttribute('aria-label', 'Open Progression Leaderboard');
  button.setAttribute('title', 'View Score & Level');
  button.textContent = '📊 XP';
  
  if (onClick) {
    button.addEventListener('click', onClick);
  }

  // Find the topbar and insert the button
  const topbar = document.querySelector('.topbar');
  if (topbar) {
    // Insert after the Start button
    const startButton = document.getElementById('btnStartQuick');
    if (startButton && startButton.nextSibling) {
      topbar.insertBefore(button, startButton.nextSibling);
    } else {
      topbar.appendChild(button);
    }
  } else {
    // Fallback: append to body if topbar not found
    document.body.appendChild(button);
  }
  
  // Add tooltip if enabled
  if (showTooltip) {
    // Check if user has created profile (simplified check - assume true after first interaction)
    const hasCreatedProfile = localStorage.getItem('xp-profile-created') === 'true';
    createTooltip(button, !hasCreatedProfile);
  }

  return button;
}

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
