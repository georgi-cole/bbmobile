// MODULE: diaryUI.js
// UI controller for Diary Room alerts - blinks DR button on dramatic/high severity entries

(function(global) {
  'use strict';

  const DiaryUI = {};

  // State
  let initialized = false;
  let drButton = null;
  // let fallbackButton = null; // Reserved for future use
  let isBlinking = false;
  let currentAlert = null;
  let config = {
    buttonSelector: '#btnDiaryRoom',
    blinkClass: 'dr-blink',
    dramaticClass: 'dr-dramatic',
    createFallback: true
  };

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  /**
   * Initialize the Diary UI system
   * @param {Object} userConfig - Optional configuration
   * @param {String} userConfig.buttonSelector - CSS selector for DR button
   * @param {Boolean} userConfig.createFallback - Whether to create fallback button
   */
  function init(userConfig) {
    if (initialized) {
      console.warn('[DiaryUI] Already initialized');
      return;
    }

    // Merge config
    if (userConfig) {
      config = { ...config, ...userConfig };
    }

    // Find or create DR button
    drButton = document.querySelector(config.buttonSelector);
    
    if (!drButton && config.createFallback) {
      console.info('[DiaryUI] DR button not found, creating fallback');
      drButton = createFallbackButton();
    }

    if (!drButton) {
      console.warn('[DiaryUI] No DR button available');
      return;
    }

    // Wire up button click
    drButton.addEventListener('click', handleButtonClick);

    // Listen for DR alerts
    const bus = getBus();
    if (bus && typeof bus.on === 'function') {
      bus.on('dr:alert', handleAlert);
      bus.on('dr:focus:ack', stopBlinking);
      bus.on('dr:closed', stopBlinking);
    }

    initialized = true;
    console.info('[DiaryUI] Initialized with button:', config.buttonSelector);
  }

  /**
   * Get the game event bus
   */
  function getBus() {
    return global.game?.bus || global.bbGameBus || null;
  }

  /**
   * Create a fallback floating DR button
   */
  function createFallbackButton() {
    const btn = document.createElement('button');
    btn.id = 'drFallbackButton';
    btn.className = 'dr-fallback-button';
    btn.setAttribute('aria-label', 'Open Diary Room');
    btn.setAttribute('title', 'Diary Room');
    btn.textContent = '🚪 DR';
    
    document.body.appendChild(btn);
    // fallbackButton = btn; // Reserved for future use
    
    return btn;
  }

  // ============================================================================
  // ALERT HANDLING
  // ============================================================================

  /**
   * Handle a DR alert event
   */
  function handleAlert(payload) {
    if (!payload || !drButton) return;

    const { entry, severity } = payload;
    
    // Store current alert
    currentAlert = entry;

    // Start blinking based on severity
    if (severity === 'dramatic' || severity === 'high') {
      startBlinking(severity);
    }

    console.info(`[DiaryUI] Alert received [${severity}]:`, entry?.text);
  }

  /**
   * Start blinking the DR button
   */
  function startBlinking(severity) {
    if (!drButton || isBlinking) return;

    isBlinking = true;
    drButton.classList.add(config.blinkClass);

    // Add severity-specific class
    if (severity === 'dramatic') {
      drButton.classList.add(config.dramaticClass);
      drButton.setAttribute('data-severity', 'dramatic');
    } else if (severity === 'high') {
      drButton.setAttribute('data-severity', 'high');
    }

    console.info('[DiaryUI] Started blinking DR button');
  }

  /**
   * Stop blinking the DR button
   */
  function stopBlinking() {
    if (!drButton || !isBlinking) return;

    isBlinking = false;
    drButton.classList.remove(config.blinkClass);
    drButton.classList.remove(config.dramaticClass);
    drButton.removeAttribute('data-severity');

    currentAlert = null;

    console.info('[DiaryUI] Stopped blinking DR button');
  }

  // ============================================================================
  // BUTTON INTERACTION
  // ============================================================================

  /**
   * Handle DR button click
   */
  function handleButtonClick(event) {
    event.preventDefault();

    const bus = getBus();
    if (!bus) return;

    // Emit dr:open event
    if (typeof bus.emit === 'function') {
      bus.emit('dr:open', {
        source: 'DiaryUI'
      });
    }

    // If there's a current alert, emit dr:focus
    if (currentAlert && typeof bus.emit === 'function') {
      bus.emit('dr:focus', {
        entry: currentAlert,
        entryId: currentAlert.id
      });
    }

    console.info('[DiaryUI] DR button clicked, opening Diary Room');
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  DiaryUI.init = init;
  DiaryUI.startBlinking = startBlinking;
  DiaryUI.stopBlinking = stopBlinking;
  DiaryUI.isBlinking = () => isBlinking;
  DiaryUI.getCurrentAlert = () => currentAlert;

  // Export to global
  global.DiaryUI = DiaryUI;

})(window);
