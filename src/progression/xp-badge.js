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
 * Create a badge button for the topbar (matches .btn class style)
 * @param {Object} options - Configuration options
 * @returns {HTMLElement} Badge button element
 */
export function createBadgeButton(options = {}) {
  const {
    onClick = null
  } = options;

  const button = document.createElement('button');
  button.className = 'btn';
  button.id = 'xpLeaderboardBadge';
  button.setAttribute('aria-label', 'Open Progression Leaderboard');
  button.setAttribute('title', 'View Score & Level');
  button.textContent = '📊 XP';

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

  // Add tooltip functionality
  setupTooltip(button);

  return button;
}

/**
 * Setup tooltip for the XP badge button
 * Shows automatically once, then only on hover
 */
function setupTooltip(button) {
  const TOOLTIP_KEY = 'xp-badge-tooltip-shown';
  const tooltipText = 'Here you can check your XP score. The higher your level, the better the prizes you can win!';
  
  let tooltip = null;
  let tooltipTimeout = null;

  /**
   * Create and show tooltip
   */
  function showTooltip() {
    // Don't create duplicate tooltips
    if (tooltip && document.body.contains(tooltip)) {
      return;
    }

    tooltip = document.createElement('div');
    tooltip.className = 'profile-tip xp-tooltip';
    tooltip.style.cssText = `
      position: fixed;
      z-index: 160;
      background: #182738;
      border: 1px solid #2c4662;
      border-radius: 14px;
      box-shadow: 0 12px 30px -16px rgba(0, 0, 0, 0.75);
      padding: 12px 16px;
      width: 280px;
      pointer-events: none;
      font-size: 0.68rem;
      animation: fadeIn 0.25s ease;
      line-height: 1.5;
    `;
    tooltip.textContent = tooltipText;

    // Position tooltip below the button
    const rect = button.getBoundingClientRect();
    const tooltipTop = rect.bottom + 8;
    const tooltipLeft = rect.left + (rect.width / 2) - 140; // Center tooltip

    tooltip.style.top = `${tooltipTop}px`;
    tooltip.style.left = `${Math.max(10, tooltipLeft)}px`; // Ensure it doesn't go off screen

    document.body.appendChild(tooltip);
  }

  /**
   * Hide and remove tooltip
   */
  function hideTooltip() {
    if (tooltip && document.body.contains(tooltip)) {
      tooltip.style.animation = 'fadeOut 0.2s ease';
      setTimeout(() => {
        if (tooltip && document.body.contains(tooltip)) {
          tooltip.remove();
        }
        tooltip = null;
      }, 200);
    }
  }

  // Check if tooltip should be shown automatically (first time)
  const hasShownTooltip = localStorage.getItem(TOOLTIP_KEY);
  
  if (!hasShownTooltip) {
    // Show tooltip automatically after a brief delay
    tooltipTimeout = setTimeout(() => {
      showTooltip();
      // Mark as shown
      try {
        localStorage.setItem(TOOLTIP_KEY, 'true');
      } catch (e) {
        console.warn('[XP Badge] Could not save tooltip state:', e);
      }
      
      // Auto-hide after 5 seconds
      setTimeout(hideTooltip, 5000);
    }, 1000); // Wait 1 second after button is created
  }

  // Show tooltip on hover
  button.addEventListener('mouseenter', () => {
    // Clear any auto-show timeout
    if (tooltipTimeout) {
      clearTimeout(tooltipTimeout);
      tooltipTimeout = null;
    }
    showTooltip();
  });

  button.addEventListener('mouseleave', () => {
    hideTooltip();
  });

  // Hide tooltip on focus lost (for keyboard navigation)
  button.addEventListener('blur', () => {
    hideTooltip();
  });

  // Show tooltip on focus (for keyboard navigation)
  button.addEventListener('focus', () => {
    showTooltip();
  });

  // Add fadeIn/fadeOut animations if not already present
  if (!document.getElementById('xp-tooltip-styles')) {
    const style = document.createElement('style');
    style.id = 'xp-tooltip-styles';
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-5px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes fadeOut {
        from { opacity: 1; transform: translateY(0); }
        to { opacity: 0; transform: translateY(-5px); }
      }
      .xp-tooltip {
        color: #e8f0ff;
      }
      @media (prefers-reduced-motion: reduce) {
        .xp-tooltip {
          animation: none !important;
        }
      }
    `;
    document.head.appendChild(style);
  }
}
