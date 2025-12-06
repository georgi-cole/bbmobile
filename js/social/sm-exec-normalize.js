// MODULE: sm-exec-normalize.js
// Defensive cost normalization for social-maneuvers executeAction
// Patches executeAction to handle malformed cost shapes (objects vs numbers)

(function(global) {
  'use strict';

  // ============================================================================
  // CONFIGURATION
  // ============================================================================
  const CONFIG = {
    enabled: true,              // Enable cost normalization
    verbose: false              // Verbose logging
  };

  function getConfig() {
    const g = global.game || {};
    const cfg = g.cfg || {};
    return {
      enabled: cfg.smExecNormalizeEnabled ?? CONFIG.enabled,
      verbose: cfg.smExecNormalizeVerbose ?? CONFIG.verbose
    };
  }

  // ============================================================================
  // COST NORMALIZATION
  // ============================================================================
  
  /**
   * Normalize a cost value to a number
   * Handles:
   * - number: return as-is
   * - string: parse as number
   * - object: extract .energy, .amount, or .value property
   * - null/undefined: return 0
   * 
   * @param {*} cost - Cost value to normalize
   * @returns {number} Normalized numeric cost
   */
  function normalizeCost(cost) {
    // Already a number
    if (typeof cost === 'number') {
      return Math.max(0, cost);
    }

    // String - try to parse
    if (typeof cost === 'string') {
      const parsed = parseFloat(cost);
      return isNaN(parsed) ? 0 : Math.max(0, parsed);
    }

    // Object - extract numeric field
    if (typeof cost === 'object' && cost !== null) {
      // Try common property names
      if ('energy' in cost) return normalizeCost(cost.energy);
      if ('amount' in cost) return normalizeCost(cost.amount);
      if ('value' in cost) return normalizeCost(cost.value);
      if ('cost' in cost) return normalizeCost(cost.cost);
      
      // No recognized property - log warning and return 0
      const config = getConfig();
      if (config.verbose) {
        console.warn('[sm-exec-normalize] Unknown cost object shape:', cost);
      }
      return 0;
    }

    // Null, undefined, or other type
    return 0;
  }

  /**
   * Normalize an action's cost structure
   * @param {Object} action - Action object
   * @returns {Object} Action with normalized costs
   */
  function normalizeActionCosts(action) {
    if (!action || typeof action !== 'object') {
      return action;
    }

    const normalized = { ...action };

    // Normalize main cost field
    if ('cost' in normalized) {
      normalized.cost = normalizeCost(normalized.cost);
    }

    // Normalize costs object (if it exists)
    if ('costs' in normalized && typeof normalized.costs === 'object') {
      const costs = { ...normalized.costs };
      
      if ('energy' in costs) {
        costs.energy = normalizeCost(costs.energy);
      }
      if ('influence' in costs) {
        costs.influence = normalizeCost(costs.influence);
      }
      if ('information' in costs) {
        costs.information = normalizeCost(costs.information);
      }

      normalized.costs = costs;
    }

    return normalized;
  }

  // ============================================================================
  // PATCHING
  // ============================================================================
  
  /**
   * Apply defensive patching to social-maneuvers
   */
  function applyPatches() {
    const config = getConfig();
    
    if (!config.enabled) {
      console.info('[sm-exec-normalize] Patching disabled');
      return;
    }

    // Check if SocialManeuvers exists
    if (!global.SocialManeuvers) {
      console.warn('[sm-exec-normalize] SocialManeuvers not found - skipping patches');
      return;
    }

    // Patch getActionById to normalize costs
    const originalGetActionById = global.SocialManeuvers.getActionById;
    if (typeof originalGetActionById === 'function') {
      global.SocialManeuvers.getActionById = function(actionId) {
        const action = originalGetActionById.call(this, actionId);
        if (!action) return action;
        
        const normalized = normalizeActionCosts(action);
        
        if (config.verbose && action !== normalized) {
          console.log('[sm-exec-normalize] Normalized action costs:', actionId);
        }
        
        return normalized;
      };
      
      console.info('[sm-exec-normalize] ✓ Patched SocialManeuvers.getActionById');
    }

    // Store normalization helpers globally for external use
    if (!global.__smCostNormalize) {
      global.__smCostNormalize = {
        normalizeCost,
        normalizeActionCosts
      };
      
      if (config.verbose) {
        console.info('[sm-exec-normalize] ✓ Exposed window.__smCostNormalize helpers');
      }
    }
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================
  
  function init() {
    // Wait for SocialManeuvers to be available
    const checkInterval = setInterval(() => {
      if (global.SocialManeuvers) {
        clearInterval(checkInterval);
        applyPatches();
      }
    }, 100);

    // Safety timeout - stop checking after 10 seconds
    setTimeout(() => {
      clearInterval(checkInterval);
      if (!global.SocialManeuvers) {
        console.warn('[sm-exec-normalize] SocialManeuvers not found after timeout - patches not applied');
      }
    }, 10000);
  }

  // Auto-initialize
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      setTimeout(init, 50);
    }
  } else {
    init();
  }

})(typeof window !== 'undefined' ? window : global);
