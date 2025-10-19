// MODULE: social-battery.js
// Persistent social battery indicator showing energy preview and current state
// Always visible in top-right header (same line as "House Network")
// Feature-guarded behind SocialManeuvers.isEnabled()

(function(global) {
  'use strict';

  // Battery color thresholds
  const COLOR_THRESHOLDS = {
    green: 6,   // >= 6
    yellow: 4,  // 4-5
    orange: 2,  // 2-3
    red: 1,     // 1
    empty: 0    // 0
  };

  const BLINK_THRESHOLD = 1; // <= 1 triggers blink animation

  let batteryElement = null;
  let currentEnergy = 0;
  let isPreviewMode = false;

  /**
   * Initialize the battery indicator
   */
  function init() {
    if (!global.SocialManeuvers?.isEnabled?.()) {
      console.info('[social-battery] Social Maneuvers disabled - battery not initialized');
      return;
    }

    // Create battery element if it doesn't exist
    if (!batteryElement) {
      createBatteryElement();
    }

    // Listen for resource change events
    global.addEventListener('social-resources-changed', handleResourcesChanged);
    global.addEventListener('social-battery-preview', handlePreviewUpdate);

    // Initial update
    updateBattery();

    console.info('[social-battery] ✓ Battery indicator initialized');
  }

  /**
   * Create the battery UI element
   */
  function createBatteryElement() {
    // Find mount target - look for header elements
    let mountTarget = findMountTarget();
    if (!mountTarget) {
      console.warn('[social-battery] No suitable mount target found');
      return;
    }

    // Create battery container
    batteryElement = document.createElement('div');
    batteryElement.id = 'socialBatteryIndicator';
    batteryElement.className = 'social-battery-indicator';
    batteryElement.setAttribute('role', 'status');
    batteryElement.setAttribute('aria-live', 'polite');
    batteryElement.setAttribute('aria-label', 'Social Energy');

    // Battery icon and value
    batteryElement.innerHTML = `
      <div class="battery-icon">⚡</div>
      <div class="battery-value">5</div>
    `;

    // Create tooltip
    const tooltip = document.createElement('div');
    tooltip.className = 'battery-tooltip';
    tooltip.innerHTML = '<div class="tooltip-content"></div>';
    batteryElement.appendChild(tooltip);

    // Add hover events for tooltip
    batteryElement.addEventListener('mouseenter', showTooltip);
    batteryElement.addEventListener('mouseleave', hideTooltip);
    batteryElement.addEventListener('click', showTooltip);

    // Mount the battery
    mountTarget.appendChild(batteryElement);

    console.info('[social-battery] Battery element created and mounted');
  }

  /**
   * Find the best mount target for the battery indicator
   */
  function findMountTarget() {
    // Try multiple potential mount points
    const candidates = [
      // Look for header elements
      document.querySelector('.game-header'),
      document.querySelector('.header-right'),
      document.querySelector('#hud'),
      document.querySelector('.hud-container'),
      // Fallback to body
      document.body
    ];

    for (const candidate of candidates) {
      if (candidate) {
        return candidate;
      }
    }

    return null;
  }

  /**
   * Update the battery display
   */
  function updateBattery() {
    if (!batteryElement) return;
    if (!global.SocialManeuvers?.isEnabled?.()) return;

    const g = global.game || {};
    const humanId = g.humanId;
    if (!humanId) return;

    // Determine if we're in social phase
    const inSocialPhase = g.phase === 'social_intermission' || g.phase === 'social';

    let energy, breakdown;
    
    if (inSocialPhase) {
      // Show current energy
      energy = global.SocialManeuvers?.SocialResources?.get(humanId, 'energy') || 0;
      breakdown = getCurrentEnergyBreakdown(humanId, energy);
      isPreviewMode = false;
    } else {
      // Show preview energy
      const preview = getPreviewEnergy(humanId);
      energy = preview.total;
      breakdown = preview.breakdown;
      isPreviewMode = true;
    }

    currentEnergy = energy;

    // Update value
    const valueEl = batteryElement.querySelector('.battery-value');
    if (valueEl) {
      valueEl.textContent = energy;
    }

    // Update color
    updateBatteryColor(energy);

    // Update tooltip
    updateTooltip(breakdown, isPreviewMode);

    console.info(`[social-battery] Battery updated: ${energy} (${isPreviewMode ? 'preview' : 'current'})`);
  }

  /**
   * Get preview energy for next social phase
   */
  function getPreviewEnergy(playerId) {
    if (!global.SocialManeuvers?.SocialResources) {
      return { total: 5, breakdown: { base: 5, bonuses: {}, penalties: {} } };
    }

    const SR = global.SocialManeuvers.SocialResources;
    
    // Check if engine has getPreviewEnergy method
    if (typeof SR.getPreviewEnergy === 'function') {
      return SR.getPreviewEnergy(playerId);
    }

    // Fallback: compute preview manually
    return computePreviewEnergyFallback(playerId);
  }

  /**
   * Fallback computation of preview energy
   */
  function computePreviewEnergyFallback(playerId) {
    const g = global.game || {};
    const SR = global.SocialManeuvers?.SocialResources;
    if (!SR) {
      return { total: 5, breakdown: { base: 5, bonuses: {}, penalties: {} } };
    }

    const weeklyEvents = g.__weeklyEvents?.get(playerId) || {};
    const BONUSES = global.SocialManeuvers?.WEEKLY_ENERGY_BONUSES || {};
    const PENALTIES = global.SocialManeuvers?.WEEKLY_ENERGY_PENALTIES || {};
    const DEFAULT_ENERGY = global.SocialManeuvers?.DEFAULT_ENERGY || 5;

    let total = DEFAULT_ENERGY;
    const bonuses = {};
    const penalties = {};

    // Apply bonuses
    if (weeklyEvents.hohWin && BONUSES.HOH_WIN) {
      bonuses.HOH = BONUSES.HOH_WIN;
      total += BONUSES.HOH_WIN;
    }
    if (weeklyEvents.povWin && BONUSES.POV_WIN) {
      bonuses.POV = BONUSES.POV_WIN;
      total += BONUSES.POV_WIN;
    }
    if (weeklyEvents.nominated && BONUSES.NOMINATED) {
      bonuses.Nominated = BONUSES.NOMINATED;
      total += BONUSES.NOMINATED;
    }
    if (weeklyEvents.newAlliances && BONUSES.NEW_ALLIANCE) {
      const allianceBonus = weeklyEvents.newAlliances * BONUSES.NEW_ALLIANCE;
      bonuses.Alliances = allianceBonus;
      total += allianceBonus;
    }
    if (weeklyEvents.savedWithPov && BONUSES.SAVED_WITH_POV) {
      bonuses.SavedWithPOV = BONUSES.SAVED_WITH_POV;
      total += BONUSES.SAVED_WITH_POV;
    }
    if (weeklyEvents.survivedEviction && BONUSES.SURVIVED_EVICTION) {
      bonuses.SurvivedEviction = BONUSES.SURVIVED_EVICTION;
      total += BONUSES.SURVIVED_EVICTION;
    }

    // Apply penalties
    if (weeklyEvents.compSkipped && PENALTIES.COMP_SKIPPED) {
      penalties.Skipped = PENALTIES.COMP_SKIPPED;
      total += PENALTIES.COMP_SKIPPED; // Penalties are negative
    }
    if (weeklyEvents.notDrawnVeto && PENALTIES.NOT_DRAWN_VETO) {
      penalties.NotDrawn = PENALTIES.NOT_DRAWN_VETO;
      total += PENALTIES.NOT_DRAWN_VETO;
    }
    if (weeklyEvents.zeroScore && PENALTIES.ZERO_SCORE) {
      penalties.ZeroScore = PENALTIES.ZERO_SCORE;
      total += PENALTIES.ZERO_SCORE;
    }
    if (weeklyEvents.brokeAlliance && PENALTIES.BROKE_ALLIANCE) {
      penalties.BrokeAlliance = PENALTIES.BROKE_ALLIANCE;
      total += PENALTIES.BROKE_ALLIANCE;
    }

    // Clamp to [0, MAX_ENERGY]
    const MAX_ENERGY = global.SocialManeuvers?.MAX_ENERGY || 10;
    total = Math.max(0, Math.min(MAX_ENERGY, total));

    return {
      total,
      breakdown: {
        base: DEFAULT_ENERGY,
        bonuses,
        penalties
      }
    };
  }

  /**
   * Get current energy breakdown
   */
  function getCurrentEnergyBreakdown(playerId, currentEnergy) {
    return {
      base: currentEnergy,
      bonuses: {},
      penalties: {}
    };
  }

  /**
   * Update battery color based on energy level
   */
  function updateBatteryColor(energy) {
    if (!batteryElement) return;

    // Remove all color classes
    batteryElement.classList.remove('battery-green', 'battery-yellow', 'battery-orange', 'battery-red', 'battery-empty', 'battery-blink');

    // Add appropriate color class
    if (energy === 0) {
      batteryElement.classList.add('battery-empty');
    } else if (energy === 1) {
      batteryElement.classList.add('battery-red');
    } else if (energy <= 3) {
      batteryElement.classList.add('battery-orange');
    } else if (energy <= 5) {
      batteryElement.classList.add('battery-yellow');
    } else {
      batteryElement.classList.add('battery-green');
    }

    // Add blink animation if low
    if (energy <= BLINK_THRESHOLD) {
      batteryElement.classList.add('battery-blink');
    }
  }

  /**
   * Update tooltip content
   */
  function updateTooltip(breakdown, isPreview) {
    if (!batteryElement) return;

    const tooltip = batteryElement.querySelector('.tooltip-content');
    if (!tooltip) return;

    const parts = [];

    if (isPreview) {
      parts.push('<div class="tooltip-header">Next Social Phase Energy</div>');
    } else {
      parts.push('<div class="tooltip-header">Current Energy</div>');
    }

    if (isPreview && breakdown) {
      parts.push(`<div class="tooltip-row"><span>Base:</span><span>${breakdown.base}</span></div>`);

      // Bonuses
      if (breakdown.bonuses && Object.keys(breakdown.bonuses).length > 0) {
        parts.push('<div class="tooltip-section">Bonuses:</div>');
        for (const [key, value] of Object.entries(breakdown.bonuses)) {
          parts.push(`<div class="tooltip-row tooltip-bonus"><span>${key}:</span><span>+${value}</span></div>`);
        }
      }

      // Penalties
      if (breakdown.penalties && Object.keys(breakdown.penalties).length > 0) {
        parts.push('<div class="tooltip-section">Penalties:</div>');
        for (const [key, value] of Object.entries(breakdown.penalties)) {
          parts.push(`<div class="tooltip-row tooltip-penalty"><span>${key}:</span><span>${value}</span></div>`);
        }
      }
    }

    tooltip.innerHTML = parts.join('');
  }

  /**
   * Show tooltip
   */
  function showTooltip() {
    if (!batteryElement) return;
    const tooltip = batteryElement.querySelector('.battery-tooltip');
    if (tooltip) {
      tooltip.classList.add('visible');
    }
  }

  /**
   * Hide tooltip
   */
  function hideTooltip() {
    if (!batteryElement) return;
    const tooltip = batteryElement.querySelector('.battery-tooltip');
    if (tooltip) {
      tooltip.classList.remove('visible');
    }
  }

  /**
   * Handle resource changed event
   */
  function handleResourcesChanged(event) {
    console.info('[social-battery] Resources changed event received');
    updateBattery();
  }

  /**
   * Handle preview update event
   */
  function handlePreviewUpdate(event) {
    console.info('[social-battery] Preview update event received');
    updateBattery();
  }

  /**
   * Show the battery indicator
   */
  function show() {
    if (batteryElement) {
      batteryElement.style.display = '';
    }
  }

  /**
   * Hide the battery indicator
   */
  function hide() {
    if (batteryElement) {
      batteryElement.style.display = 'none';
    }
  }

  /**
   * Destroy the battery indicator
   */
  function destroy() {
    if (batteryElement) {
      batteryElement.remove();
      batteryElement = null;
    }

    global.removeEventListener('social-resources-changed', handleResourcesChanged);
    global.removeEventListener('social-battery-preview', handlePreviewUpdate);

    console.info('[social-battery] Battery indicator destroyed');
  }

  // Export API
  global.SocialBattery = {
    init,
    updateBattery,
    show,
    hide,
    destroy
  };

  // Auto-initialize on load if Social Maneuvers is enabled
  function maybeAutoInit() {
    if (global.SocialManeuvers?.isEnabled?.()) {
      init();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', maybeAutoInit);
  } else {
    maybeAutoInit();
  }
  console.info('[social-battery] Module loaded');

})(window);
