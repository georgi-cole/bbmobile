/**
 * XP Modal Component - displays detailed progression info
 */

export function createModal(options = {}) {
  const {
    theme = 'dark',
    onClose = null
  } = options;

  // Backdrop
  const backdrop = document.createElement('div');
  backdrop.className = 'xp-modal-backdrop';
  backdrop.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    padding: 20px;
    animation: fadeIn 0.2s ease;
  `;

  // Modal
  const modal = document.createElement('div');
  modal.className = 'xp-modal';
  modal.style.cssText = `
    background: ${theme === 'dark' ? '#1a1a1a' : '#fff'};
    border-radius: 12px;
    max-width: 700px;
    width: 100%;
    max-height: 90vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    animation: slideUp 0.3s ease;
  `;

  // Header
  const header = document.createElement('div');
  header.style.cssText = `
    padding: 20px;
    border-bottom: 2px solid ${theme === 'dark' ? '#ffdc8b' : '#ffa500'};
    display: flex;
    justify-content: space-between;
    align-items: center;
  `;

  const title = document.createElement('h2');
  title.textContent = 'Progression';
  title.style.cssText = `
    margin: 0;
    color: ${theme === 'dark' ? '#ffdc8b' : '#333'};
    font-size: 24px;
  `;

  const closeButton = document.createElement('button');
  closeButton.textContent = '✕';
  closeButton.style.cssText = `
    background: transparent;
    border: none;
    font-size: 28px;
    color: ${theme === 'dark' ? '#b0b0b0' : '#666'};
    cursor: pointer;
    padding: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: all 0.2s ease;
  `;
  closeButton.addEventListener('mouseenter', () => {
    closeButton.style.background = theme === 'dark' ? '#2a2a2a' : '#f0f0f0';
  });
  closeButton.addEventListener('mouseleave', () => {
    closeButton.style.background = 'transparent';
  });
  closeButton.addEventListener('click', () => {
    backdrop.remove();
    if (onClose) onClose();
  });

  header.appendChild(title);
  header.appendChild(closeButton);

  // Tabs
  const tabBar = document.createElement('div');
  tabBar.style.cssText = `
    display: flex;
    gap: 0;
    padding: 0 20px;
    background: ${theme === 'dark' ? '#0f0f0f' : '#f5f5f5'};
    border-bottom: 1px solid ${theme === 'dark' ? '#333' : '#ddd'};
  `;

  const tabs = ['Overview', 'Breakdown', 'Unlocks'];
  const tabButtons = tabs.map((tabName, index) => {
    const button = document.createElement('button');
    button.textContent = tabName;
    button.dataset.tab = tabName.toLowerCase();
    button.style.cssText = `
      padding: 12px 20px;
      background: transparent;
      border: none;
      border-bottom: 3px solid transparent;
      color: ${theme === 'dark' ? '#b0b0b0' : '#666'};
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      transition: all 0.2s ease;
    `;
    
    if (index === 0) {
      button.style.borderBottomColor = '#ffdc8b';
      button.style.color = theme === 'dark' ? '#ffdc8b' : '#ffa500';
    }

    button.addEventListener('click', () => {
      // Update active tab
      tabButtons.forEach(b => {
        b.style.borderBottomColor = 'transparent';
        b.style.color = theme === 'dark' ? '#b0b0b0' : '#666';
      });
      button.style.borderBottomColor = '#ffdc8b';
      button.style.color = theme === 'dark' ? '#ffdc8b' : '#ffa500';

      // Show corresponding content
      contentPanes.forEach((pane, i) => {
        pane.style.display = i === index ? 'block' : 'none';
      });
    });

    tabBar.appendChild(button);
    return button;
  });

  // Content area
  const content = document.createElement('div');
  content.style.cssText = `
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    color: ${theme === 'dark' ? '#e0e0e0' : '#333'};
  `;

  // Content panes
  const overviewPane = document.createElement('div');
  overviewPane.dataset.pane = 'overview';
  
  const breakdownPane = document.createElement('div');
  breakdownPane.dataset.pane = 'breakdown';
  breakdownPane.style.display = 'none';
  
  const unlocksPane = document.createElement('div');
  unlocksPane.dataset.pane = 'unlocks';
  unlocksPane.style.display = 'none';

  const contentPanes = [overviewPane, breakdownPane, unlocksPane];

  content.appendChild(overviewPane);
  content.appendChild(breakdownPane);
  content.appendChild(unlocksPane);

  modal.appendChild(header);
  modal.appendChild(tabBar);
  modal.appendChild(content);
  backdrop.appendChild(modal);

  // Close on backdrop click
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) {
      backdrop.remove();
      if (onClose) onClose();
    }
  });

  // Add animations
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes slideUp {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
  `;
  document.head.appendChild(style);

  // Update methods
  backdrop.updateOverview = (state, levelThresholds) => {
    overviewPane.innerHTML = `
      <div style="text-align: center; margin-bottom: 30px;">
        <div style="
          width: 80px;
          height: 80px;
          background: linear-gradient(135deg, #ffdc8b 0%, #ffa500 100%);
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
          font-weight: bold;
          color: #1a1a1a;
          margin-bottom: 12px;
        ">${state.level}</div>
        <div style="font-size: 24px; font-weight: 600; margin-bottom: 8px;">Level ${state.level}</div>
        <div style="font-size: 18px; color: ${theme === 'dark' ? '#b0b0b0' : '#666'};">${state.totalXP} XP</div>
      </div>

      <div style="margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px;">
          <span>Progress to Level ${state.level + 1}</span>
          <span>${state.progressPercent}%</span>
        </div>
        <div style="
          width: 100%;
          height: 12px;
          background: ${theme === 'dark' ? '#2a2a2a' : '#e0e0e0'};
          border-radius: 6px;
          overflow: hidden;
        ">
          <div style="
            width: ${state.progressPercent}%;
            height: 100%;
            background: linear-gradient(90deg, #ffdc8b 0%, #ffa500 100%);
            transition: width 0.3s ease;
          "></div>
        </div>
        <div style="margin-top: 8px; font-size: 12px; color: ${theme === 'dark' ? '#888' : '#999'};">
          ${state.totalXP} / ${state.nextLevelXP} XP
        </div>
      </div>

      <div style="
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 16px;
        margin-top: 24px;
      ">
        <div style="
          padding: 16px;
          background: ${theme === 'dark' ? '#2a2a2a' : '#f5f5f5'};
          border-radius: 8px;
        ">
          <div style="font-size: 12px; color: ${theme === 'dark' ? '#888' : '#999'}; margin-bottom: 4px;">Total Events</div>
          <div style="font-size: 20px; font-weight: 600;">${state.eventsCount}</div>
        </div>
        <div style="
          padding: 16px;
          background: ${theme === 'dark' ? '#2a2a2a' : '#f5f5f5'};
          border-radius: 8px;
        ">
          <div style="font-size: 12px; color: ${theme === 'dark' ? '#888' : '#999'}; margin-bottom: 4px;">Next Milestone</div>
          <div style="font-size: 20px; font-weight: 600;">${state.nextLevelXP - state.totalXP} XP</div>
        </div>
      </div>
    `;
  };

  backdrop.updateBreakdown = (breakdown) => {
    const entries = Array.from(breakdown.entries())
      .sort((a, b) => b[1].totalXP - a[1].totalXP);

    if (entries.length === 0) {
      breakdownPane.innerHTML = `
        <div style="text-align: center; padding: 40px; color: ${theme === 'dark' ? '#888' : '#999'};">
          No events recorded yet
        </div>
      `;
      return;
    }

    breakdownPane.innerHTML = `
      <div style="margin-bottom: 16px; font-size: 14px; color: ${theme === 'dark' ? '#b0b0b0' : '#666'};">
        XP earned by action type
      </div>
      ${entries.map(([ruleId, data]) => `
        <div style="
          padding: 12px;
          background: ${theme === 'dark' ? '#2a2a2a' : '#f5f5f5'};
          border-radius: 8px;
          margin-bottom: 8px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        ">
          <div>
            <div style="font-weight: 600; margin-bottom: 4px;">${data.ruleName}</div>
            <div style="font-size: 12px; color: ${theme === 'dark' ? '#888' : '#999'};">${data.count} time${data.count !== 1 ? 's' : ''}</div>
          </div>
          <div style="
            font-size: 18px;
            font-weight: 600;
            color: ${data.totalXP >= 0 ? '#4caf50' : '#f44336'};
          ">${data.totalXP >= 0 ? '+' : ''}${data.totalXP}</div>
        </div>
      `).join('')}
    `;
  };

  backdrop.updateUnlocks = (state, levelThresholds) => {
    const unlockedLevels = levelThresholds.filter(t => state.totalXP >= t.xpRequired);
    const nextUnlocks = levelThresholds.filter(t => state.totalXP < t.xpRequired).slice(0, 5);

    unlocksPane.innerHTML = `
      <div style="margin-bottom: 24px;">
        <h3 style="font-size: 16px; margin-bottom: 12px; color: ${theme === 'dark' ? '#ffdc8b' : '#ffa500'};">
          Unlocked Levels (${unlockedLevels.length})
        </h3>
        <div style="font-size: 14px; color: ${theme === 'dark' ? '#b0b0b0' : '#666'};">
          You've reached Level ${state.level}!
        </div>
      </div>

      <div>
        <h3 style="font-size: 16px; margin-bottom: 12px; color: ${theme === 'dark' ? '#83bfff' : '#2196f3'};">
          Upcoming Levels
        </h3>
        ${nextUnlocks.map(t => {
          const xpNeeded = t.xpRequired - state.totalXP;
          return `
            <div style="
              padding: 12px;
              background: ${theme === 'dark' ? '#2a2a2a' : '#f5f5f5'};
              border-radius: 8px;
              margin-bottom: 8px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              opacity: 0.7;
            ">
              <div>
                <div style="font-weight: 600; margin-bottom: 4px;">Level ${t.level}</div>
                <div style="font-size: 12px; color: ${theme === 'dark' ? '#888' : '#999'};">${xpNeeded} XP needed</div>
              </div>
              <div style="font-size: 14px; color: ${theme === 'dark' ? '#b0b0b0' : '#666'};">${t.xpRequired} XP</div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  };

  document.body.appendChild(backdrop);
  return backdrop;
}
