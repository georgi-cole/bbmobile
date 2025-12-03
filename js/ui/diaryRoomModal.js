/**
 * MODULE: diaryRoomModal.js
 * 
 * Purpose: Handles the fullscreen Diary Room modal overlay that opens when
 * the DR button in the TV header is clicked.
 * 
 * Features:
 * - Opens Diary Room as a fullscreen modal overlay
 * - Syncs log content from existing log panes
 * - Tab navigation (All, Game, Social, Vote, Jury)
 * - Keyboard accessibility (Escape to close, focus trap)
 * - Shows Jury House section when jury is active
 */

(function(global) {
  'use strict';

  const DiaryRoomModal = global.DiaryRoomModal || (global.DiaryRoomModal = {});

  // State
  let modal = null;
  let isOpen = false;
  let activeTab = 'all';
  let lastFocusedElement = null;

  // Tab definitions
  const TABS = [
    { id: 'all', label: 'All' },
    { id: 'game', label: 'Game' },
    { id: 'social', label: 'Social' },
    { id: 'vote', label: 'Vote' },
    { id: 'jury', label: 'Jury' }
  ];

  /**
   * Initialize the Diary Room Modal system
   */
  function init() {
    // Wire up the DR button
    const drBtn = document.getElementById('btnDiaryRoom');
    if (drBtn) {
      drBtn.addEventListener('click', open);
      console.info('[DiaryRoomModal] Initialized, DR button wired');
    } else {
      console.warn('[DiaryRoomModal] DR button not found');
    }

    // Listen for Escape key globally when modal is open
    document.addEventListener('keydown', handleKeyDown);
  }

  /**
   * Handle keyboard events
   */
  function handleKeyDown(e) {
    if (!isOpen) return;
    
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
    
    // Focus trap
    if (e.key === 'Tab' && modal) {
      trapFocus(e);
    }
  }

  /**
   * Trap focus within the modal
   */
  function trapFocus(e) {
    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (e.shiftKey && document.activeElement === firstElement) {
      e.preventDefault();
      lastElement.focus();
    } else if (!e.shiftKey && document.activeElement === lastElement) {
      e.preventDefault();
      firstElement.focus();
    }
  }

  /**
   * Open the Diary Room modal
   */
  function open() {
    if (isOpen) return;

    // Store last focused element for return
    lastFocusedElement = document.activeElement;

    // Create modal if it doesn't exist
    if (!modal) {
      modal = createModal();
      document.body.appendChild(modal);
    }

    // Sync log content from main panes
    syncLogContent();

    // Show modal
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
    isOpen = true;

    // Prevent body scroll
    document.body.style.overflow = 'hidden';

    // Focus the close button
    const closeBtn = modal.querySelector('.diaryRoomModal-close');
    if (closeBtn) {
      closeBtn.focus();
    }

    console.info('[DiaryRoomModal] Opened');
  }

  /**
   * Close the Diary Room modal
   */
  function close() {
    if (!isOpen || !modal) return;

    // Hide modal
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
    isOpen = false;

    // Restore body scroll
    document.body.style.overflow = '';

    // Restore focus
    if (lastFocusedElement) {
      lastFocusedElement.focus();
      lastFocusedElement = null;
    }

    console.info('[DiaryRoomModal] Closed');
  }

  /**
   * Create the modal DOM structure
   */
  function createModal() {
    const modalEl = document.createElement('div');
    modalEl.className = 'diaryRoomModal';
    modalEl.setAttribute('role', 'dialog');
    modalEl.setAttribute('aria-modal', 'true');
    modalEl.setAttribute('aria-label', 'Diary Room');
    modalEl.style.display = 'none';

    // Header
    const header = document.createElement('div');
    header.className = 'diaryRoomModal-header';
    header.innerHTML = `
      <h2 class="diaryRoomModal-title">
        <span class="diaryRoomModal-title-icon">🚪</span>
        <span>Diary Room</span>
      </h2>
      <button class="diaryRoomModal-close" aria-label="Close Diary Room" title="Close">✕</button>
    `;
    modalEl.appendChild(header);

    // Wire close button
    const closeBtn = header.querySelector('.diaryRoomModal-close');
    closeBtn.addEventListener('click', close);

    // Tab bar
    const tabBar = document.createElement('div');
    tabBar.className = 'diaryRoomModal-tabs';
    tabBar.setAttribute('role', 'tablist');
    
    TABS.forEach(tab => {
      const tabBtn = document.createElement('button');
      tabBtn.className = 'diaryRoomModal-tab' + (tab.id === activeTab ? ' active' : '');
      tabBtn.setAttribute('role', 'tab');
      tabBtn.setAttribute('aria-selected', tab.id === activeTab ? 'true' : 'false');
      tabBtn.setAttribute('data-tab', tab.id);
      tabBtn.textContent = tab.label;
      tabBtn.addEventListener('click', () => switchTab(tab.id));
      tabBar.appendChild(tabBtn);
    });
    modalEl.appendChild(tabBar);

    // Content area
    const content = document.createElement('div');
    content.className = 'diaryRoomModal-content';
    
    // Create panes for each tab
    TABS.forEach(tab => {
      const pane = document.createElement('div');
      pane.className = 'diaryRoomModal-pane' + (tab.id === activeTab ? ' active' : '');
      pane.setAttribute('role', 'tabpanel');
      pane.setAttribute('data-pane', tab.id);
      content.appendChild(pane);
    });

    // Jury House section (shown in jury tab or when jury is active)
    const jurySection = document.createElement('div');
    jurySection.className = 'diaryRoomModal-jurySection';
    jurySection.id = 'drModalJurySection';
    jurySection.style.display = 'none';
    jurySection.innerHTML = `
      <h3 class="diaryRoomModal-juryTitle">🏠 Jury House</h3>
      <div class="diaryRoomModal-juryStatus"></div>
      <div class="diaryRoomModal-juryRoster"></div>
    `;
    content.appendChild(jurySection);

    modalEl.appendChild(content);

    return modalEl;
  }

  /**
   * Switch to a different tab
   */
  function switchTab(tabId) {
    if (!modal) return;

    activeTab = tabId;

    // Update tab buttons
    const tabs = modal.querySelectorAll('.diaryRoomModal-tab');
    tabs.forEach(tab => {
      const isActive = tab.getAttribute('data-tab') === tabId;
      tab.classList.toggle('active', isActive);
      tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    // Update panes
    const panes = modal.querySelectorAll('.diaryRoomModal-pane');
    panes.forEach(pane => {
      const isActive = pane.getAttribute('data-pane') === tabId;
      pane.classList.toggle('active', isActive);
    });

    // Show jury section in jury tab
    const jurySection = modal.querySelector('#drModalJurySection');
    if (jurySection) {
      jurySection.style.display = tabId === 'jury' ? 'block' : 'none';
    }

    console.info('[DiaryRoomModal] Switched to tab:', tabId);
  }

  /**
   * Sync log content from main log panes to modal panes
   */
  function syncLogContent() {
    if (!modal) return;

    // Map source pane IDs to modal pane IDs
    const paneMap = {
      'all': 'log',
      'game': 'logGame',
      'social': 'logSocial',
      'vote': 'logVote',
      'jury': 'logJury'
    };

    Object.entries(paneMap).forEach(([tabId, sourceId]) => {
      const sourcePane = document.getElementById(sourceId);
      const targetPane = modal.querySelector(`.diaryRoomModal-pane[data-pane="${tabId}"]`);
      
      if (sourcePane && targetPane) {
        // Clone the content
        targetPane.innerHTML = sourcePane.innerHTML || '<div class="diaryRoomModal-empty">No entries yet...</div>';
      }
    });

    // Update jury house section
    updateJurySection();
  }

  /**
   * Update the Jury House section in the modal
   */
  function updateJurySection() {
    const jurySection = modal?.querySelector('#drModalJurySection');
    if (!jurySection) return;

    const game = global.game || {};
    const juryHouse = game.juryHouse || [];
    const isJuryEnabled = game.cfg?.enableJuryHouse;

    if (!isJuryEnabled || juryHouse.length === 0) {
      jurySection.style.display = 'none';
      return;
    }

    // Show section
    jurySection.style.display = 'block';

    // Update status
    const statusEl = jurySection.querySelector('.diaryRoomModal-juryStatus');
    if (statusEl) {
      statusEl.textContent = `${juryHouse.length} juror(s) in the house`;
      statusEl.style.marginBottom = '8px';
      statusEl.style.fontSize = '0.8rem';
      statusEl.style.color = 'rgba(255, 255, 255, 0.7)';
    }

    // Update roster
    const rosterEl = jurySection.querySelector('.diaryRoomModal-juryRoster');
    if (rosterEl) {
      rosterEl.innerHTML = '';
      juryHouse.forEach(jurorId => {
        const player = (game.players || []).find(p => p.id === jurorId);
        const name = player?.name || `Juror ${jurorId}`;
        const avatar = global.resolveAvatar?.(player) || player?.avatar || '';
        
        const jurorDiv = document.createElement('div');
        jurorDiv.className = 'diaryRoomModal-juror';
        
        if (avatar) {
          const img = document.createElement('img');
          img.className = 'diaryRoomModal-juror-avatar';
          img.src = avatar;
          img.alt = name;
          img.onerror = function() { this.style.display = 'none'; };
          jurorDiv.appendChild(img);
        }
        
        const nameSpan = document.createElement('span');
        nameSpan.textContent = name; // Safe: uses textContent
        jurorDiv.appendChild(nameSpan);
        
        rosterEl.appendChild(jurorDiv);
      });
    }
  }

  /**
   * Refresh the modal content (called when logs update)
   */
  function refresh() {
    if (isOpen) {
      syncLogContent();
    }
  }

  // Public API
  DiaryRoomModal.init = init;
  DiaryRoomModal.open = open;
  DiaryRoomModal.close = close;
  DiaryRoomModal.refresh = refresh;
  DiaryRoomModal.isOpen = () => isOpen;

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  global.DiaryRoomModal = DiaryRoomModal;

})(window);
