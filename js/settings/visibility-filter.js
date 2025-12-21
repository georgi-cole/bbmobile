// MODULE: settings/visibility-filter.js
// Helper to filter settings tabs based on visibility rules.
// Supports 'all' (always visible), 'dev' (dev-only), 'hidden' (never visible).

(function(global){
  'use strict';

  /**
   * Detect if the user is a developer
   * Check for localhost, dev domains, or a dev flag in localStorage
   * @returns {boolean}
   */
  function isDevUser(){
    try{
      // Check if running on localhost or dev domain
      if(typeof window !== 'undefined' && window.location){
        const hostname = window.location.hostname;
        if(hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('dev.')){
          return true;
        }
      }
      
      // Check for dev flag in localStorage
      try{
        const devFlag = localStorage.getItem('bb_dev_mode');
        if(devFlag === 'true'){
          return true;
        }
      }catch(e){}
      
      return false;
    }catch(e){
      console.warn('[visibility-filter] isDevUser check failed', e);
      return false;
    }
  }

  /**
   * Filter tabs based on visibility rules
   * @param {Array} tabRegistry - Array of tab objects from SettingsRegistry
   * @param {Object} options - Filter options
   * @param {boolean} options.isDev - True if user is a developer (auto-detected if not provided)
   * @param {boolean} options.advancedMode - True if user has enabled advanced mode
   * @returns {Array} Filtered array of visible tabs
   */
  function filterVisibleTabs(tabRegistry, options){
    options = options || {};
    
    // Auto-detect dev user if not explicitly provided
    const isDev = options.hasOwnProperty('isDev') ? options.isDev : isDevUser();
    const advancedMode = !!options.advancedMode;
    
    // Dev users always see everything
    if(isDev){
      return tabRegistry.filter(function(tab){
        return tab.visibility !== 'hidden';
      });
    }
    
    // Advanced mode users see dev tabs
    if(advancedMode){
      return tabRegistry.filter(function(tab){
        return tab.visibility !== 'hidden';
      });
    }
    
    // Normal users only see 'all' visibility tabs
    return tabRegistry.filter(function(tab){
      const visibility = tab.visibility || 'all';
      return visibility === 'all';
    });
  }

  // Export to global namespace
  const SettingsVisibilityFilter = global.SettingsVisibilityFilter = global.SettingsVisibilityFilter || {};
  SettingsVisibilityFilter.filterVisibleTabs = filterVisibleTabs;
  SettingsVisibilityFilter.isDevUser = isDevUser;

})(window);
