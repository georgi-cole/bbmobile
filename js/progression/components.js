// MODULE: progression/components.js
// Web Components for XP/Level progression UI
// Badge, Modal, and Summary components

(function(g){
  'use strict';

  // ============================================================================
  // PROGRESSION BADGE COMPONENT
  // ============================================================================
  
  class ProgressionBadge extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
      this.render();
    }

    static get observedAttributes() {
      return ['level', 'xp', 'show-progress'];
    }

    attributeChangedCallback() {
      if (this.shadowRoot.innerHTML) {
        this.render();
      }
    }

    get level() {
      return parseInt(this.getAttribute('level') || '1', 10);
    }

    set level(val) {
      this.setAttribute('level', val);
    }

    get xp() {
      return parseInt(this.getAttribute('xp') || '0', 10);
    }

    set xp(val) {
      this.setAttribute('xp', val);
    }

    get showProgress() {
      return this.hasAttribute('show-progress');
    }

    render() {
      const level = this.level;
      const xp = this.xp;
      const showProgress = this.showProgress;

      let levelInfo = { progressToNextLevel: 0, xpForNextLevel: 0, isMaxLevel: false };
      if (g.ProgressionRules) {
        levelInfo = g.ProgressionRules.getLevelInfo(xp);
      }

      const progress = Math.round(levelInfo.progressToNextLevel * 100);

      this.shadowRoot.innerHTML = `
        <style>
          :host {
            display: inline-block;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          }
          .badge-container {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 6px 12px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 20px;
            color: white;
            font-weight: 600;
            box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
          }
          .level-icon {
            font-size: 1.2em;
          }
          .level-text {
            font-size: 0.9em;
            display: flex;
            align-items: center;
            gap: 4px;
          }
          .xp-text {
            font-size: 0.75em;
            opacity: 0.9;
          }
          .progress-bar {
            margin-top: 4px;
            height: 4px;
            background: rgba(255, 255, 255, 0.3);
            border-radius: 2px;
            overflow: hidden;
          }
          .progress-fill {
            height: 100%;
            background: rgba(255, 255, 255, 0.9);
            border-radius: 2px;
            transition: width 0.3s ease;
            width: ${progress}%;
          }
        </style>
        <div class="badge-container">
          <span class="level-icon">⭐</span>
          <div class="level-text">
            <span>Level ${level}</span>
            ${showProgress && !levelInfo.isMaxLevel ? `
              <span class="xp-text">(${xp} XP • ${levelInfo.xpForNextLevel} to next)</span>
            ` : `
              <span class="xp-text">(${xp} XP)</span>
            `}
          </div>
        </div>
        ${showProgress && !levelInfo.isMaxLevel ? `
          <div class="progress-bar">
            <div class="progress-fill"></div>
          </div>
        ` : ''}
      `;
    }
  }

  // ============================================================================
  // LEVEL UP MODAL COMPONENT
  // ============================================================================
  
  class LevelUpModal extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
      this.render();
    }

    get level() {
      return parseInt(this.getAttribute('level') || '1', 10);
    }

    get oldLevel() {
      return parseInt(this.getAttribute('old-level') || '1', 10);
    }

    show() {
      const modal = this.shadowRoot.querySelector('.modal-overlay');
      if (modal) {
        modal.classList.add('show');
        
        // Auto-dismiss after 3 seconds
        setTimeout(() => this.hide(), 3000);
      }
    }

    hide() {
      const modal = this.shadowRoot.querySelector('.modal-overlay');
      if (modal) {
        modal.classList.remove('show');
        this.dispatchEvent(new CustomEvent('dismissed'));
      }
    }

    render() {
      const level = this.level;
      const oldLevel = this.oldLevel;

      this.shadowRoot.innerHTML = `
        <style>
          :host {
            display: block;
          }
          .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(5px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 999999;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.3s ease;
          }
          .modal-overlay.show {
            opacity: 1;
            pointer-events: auto;
          }
          .modal-content {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 40px;
            border-radius: 20px;
            text-align: center;
            color: white;
            max-width: 400px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
            transform: scale(0.8);
            transition: transform 0.3s ease;
          }
          .show .modal-content {
            transform: scale(1);
          }
          .level-icon {
            font-size: 4em;
            margin-bottom: 20px;
            animation: bounce 0.6s ease;
          }
          @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-20px); }
          }
          .title {
            font-size: 2em;
            font-weight: 800;
            margin-bottom: 10px;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
          }
          .subtitle {
            font-size: 1.2em;
            opacity: 0.9;
          }
          .level-display {
            font-size: 3em;
            font-weight: 800;
            margin: 20px 0;
          }
          .dismiss-hint {
            font-size: 0.9em;
            opacity: 0.7;
            margin-top: 20px;
          }
        </style>
        <div class="modal-overlay">
          <div class="modal-content">
            <div class="level-icon">🎉</div>
            <div class="title">Level Up!</div>
            <div class="subtitle">You've reached</div>
            <div class="level-display">Level ${level}</div>
            <div class="dismiss-hint">Click to dismiss</div>
          </div>
        </div>
      `;

      // Add click listener to dismiss
      const overlay = this.shadowRoot.querySelector('.modal-overlay');
      overlay.addEventListener('click', () => this.hide());
    }
  }

  // ============================================================================
  // PROGRESSION SUMMARY COMPONENT
  // ============================================================================
  
  class ProgressionSummary extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
      this.render();
    }

    get playerId() {
      return this.getAttribute('player-id');
    }

    render() {
      const playerId = this.playerId;
      
      let state = null;
      if (g.ProgressionEngine && playerId) {
        state = g.ProgressionEngine.getPlayerState(playerId);
      }

      if (!state) {
        this.shadowRoot.innerHTML = `
          <style>
            :host { display: block; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
            .no-data { padding: 20px; text-align: center; color: #999; }
          </style>
          <div class="no-data">No progression data available</div>
        `;
        return;
      }

      const recentHistory = state.history.slice(-5).reverse();

      this.shadowRoot.innerHTML = `
        <style>
          :host {
            display: block;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          }
          .summary-container {
            background: #f5f5f5;
            border-radius: 12px;
            padding: 20px;
            color: #333;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 2px solid #ddd;
          }
          .title {
            font-size: 1.5em;
            font-weight: 700;
            color: #667eea;
          }
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
          }
          .stat-card {
            background: white;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }
          .stat-label {
            font-size: 0.85em;
            color: #666;
            margin-bottom: 5px;
          }
          .stat-value {
            font-size: 1.8em;
            font-weight: 700;
            color: #667eea;
          }
          .progress-section {
            background: white;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }
          .progress-label {
            font-size: 0.9em;
            color: #666;
            margin-bottom: 8px;
          }
          .progress-bar {
            height: 24px;
            background: #e0e0e0;
            border-radius: 12px;
            overflow: hidden;
            position: relative;
          }
          .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
            border-radius: 12px;
            transition: width 0.3s ease;
            width: ${Math.round(state.progressToNextLevel * 100)}%;
          }
          .progress-text {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 0.8em;
            font-weight: 600;
            color: white;
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
          }
          .history-section {
            background: white;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }
          .history-title {
            font-size: 1.1em;
            font-weight: 600;
            margin-bottom: 10px;
            color: #667eea;
          }
          .history-item {
            padding: 10px;
            border-left: 3px solid #667eea;
            margin-bottom: 8px;
            background: #f9f9f9;
            border-radius: 4px;
          }
          .history-action {
            font-weight: 600;
            color: #333;
          }
          .history-xp {
            color: #667eea;
            font-weight: 600;
          }
          .history-time {
            font-size: 0.8em;
            color: #999;
          }
          .badges-section {
            background: white;
            padding: 15px;
            border-radius: 8px;
            margin-top: 20px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }
          .badge-list {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 10px;
          }
          .badge-item {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 6px 12px;
            border-radius: 16px;
            font-size: 0.85em;
            font-weight: 600;
          }
        </style>
        <div class="summary-container">
          <div class="header">
            <div class="title">Progression Summary</div>
          </div>
          
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-label">Level</div>
              <div class="stat-value">${state.level}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Total XP</div>
              <div class="stat-value">${state.totalXP}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Badges</div>
              <div class="stat-value">${state.badgeCount}</div>
            </div>
          </div>

          ${!state.isMaxLevel ? `
            <div class="progress-section">
              <div class="progress-label">Progress to Level ${state.level + 1}</div>
              <div class="progress-bar">
                <div class="progress-fill"></div>
                <div class="progress-text">${state.xpForNextLevel} XP remaining</div>
              </div>
            </div>
          ` : `
            <div class="progress-section">
              <div class="progress-label">🏆 Max Level Reached!</div>
            </div>
          `}

          ${recentHistory.length > 0 ? `
            <div class="history-section">
              <div class="history-title">Recent Activity</div>
              ${recentHistory.map(entry => `
                <div class="history-item">
                  <div class="history-action">${entry.reason}</div>
                  <div class="history-xp">+${entry.xpAmount} XP</div>
                  <div class="history-time">${new Date(entry.timestamp).toLocaleString()}</div>
                </div>
              `).join('')}
            </div>
          ` : ''}

          ${state.badges.length > 0 ? `
            <div class="badges-section">
              <div class="history-title">Earned Badges</div>
              <div class="badge-list">
                ${state.badges.map(badge => `
                  <div class="badge-item">${badge.name}</div>
                `).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      `;
    }

    refresh() {
      this.render();
    }
  }

  // Register custom elements
  if (!customElements.get('progression-badge')) {
    customElements.define('progression-badge', ProgressionBadge);
  }
  if (!customElements.get('level-up-modal')) {
    customElements.define('level-up-modal', LevelUpModal);
  }
  if (!customElements.get('progression-summary')) {
    customElements.define('progression-summary', ProgressionSummary);
  }

  console.info('[progression/components] Web Components registered');

})(window);
