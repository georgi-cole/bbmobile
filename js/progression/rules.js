// MODULE: progression/rules.js
// Data-driven rules engine for XP progression
// Configurable XP rewards and level thresholds

(function(g){
  'use strict';

  // Default XP rewards for various actions
  const DEFAULT_XP_RULES = {
    // Competition actions
    win_hoh: 100,
    win_veto: 80,
    win_final_hoh_part1: 120,
    win_final_hoh_part2: 120,
    win_final_hoh_part3: 150,
    
    // Game performance
    comp_participation: 10,
    comp_top3: 30,
    comp_perfect_score: 50,
    
    // Social actions
    form_alliance: 25,
    survive_nomination: 40,
    survive_block: 60,
    cast_vote: 5,
    jury_vote: 20,
    
    // Milestones
    reach_jury: 100,
    reach_final3: 150,
    reach_final2: 200,
    win_game: 500,
    
    // Special achievements
    backdoor_success: 75,
    veto_save_ally: 50,
    flip_vote: 35,
    unanimous_hoh: 40,
    
    // Gameplay progression
    week_survived: 15,
    eviction_avoided: 30
  };

  // Level thresholds (cumulative XP required)
  const DEFAULT_LEVEL_THRESHOLDS = [
    0,      // Level 1
    100,    // Level 2
    250,    // Level 3
    450,    // Level 4
    700,    // Level 5
    1000,   // Level 6
    1400,   // Level 7
    1900,   // Level 8
    2500,   // Level 9
    3200,   // Level 10
    4000,   // Level 11
    5000,   // Level 12
    6200,   // Level 13
    7600,   // Level 14
    9200,   // Level 15
    11000,  // Level 16
    13000,  // Level 17
    15500,  // Level 18
    18500,  // Level 19
    22000   // Level 20 (max)
  ];

  // Current rules (mutable copy)
  let xpRules = { ...DEFAULT_XP_RULES };
  let levelThresholds = [...DEFAULT_LEVEL_THRESHOLDS];

  /**
   * Get XP reward for an action
   * @param {string} action - Action name
   * @returns {number} XP reward (0 if not found)
   */
  function getXPReward(action) {
    return xpRules[action] || 0;
  }

  /**
   * Get level for a given XP amount
   * @param {number} xp - Total XP
   * @returns {number} Current level
   */
  function getLevelForXP(xp) {
    for (let i = levelThresholds.length - 1; i >= 0; i--) {
      if (xp >= levelThresholds[i]) {
        return i + 1;
      }
    }
    return 1;
  }

  /**
   * Get XP required for next level
   * @param {number} currentXP - Current XP
   * @returns {number} XP needed for next level
   */
  function getXPForNextLevel(currentXP) {
    const currentLevel = getLevelForXP(currentXP);
    if (currentLevel >= levelThresholds.length) {
      return 0; // Max level reached
    }
    const nextThreshold = levelThresholds[currentLevel];
    return nextThreshold - currentXP;
  }

  /**
   * Get progress to next level (0-1)
   * @param {number} currentXP - Current XP
   * @returns {number} Progress percentage (0-1)
   */
  function getProgressToNextLevel(currentXP) {
    const currentLevel = getLevelForXP(currentXP);
    if (currentLevel >= levelThresholds.length) {
      return 1; // Max level
    }
    
    const currentThreshold = levelThresholds[currentLevel - 1];
    const nextThreshold = levelThresholds[currentLevel];
    const range = nextThreshold - currentThreshold;
    const progress = currentXP - currentThreshold;
    
    return Math.max(0, Math.min(1, progress / range));
  }

  /**
   * Get level info for current XP
   * @param {number} currentXP - Current XP
   * @returns {Object} Level information
   */
  function getLevelInfo(currentXP) {
    const level = getLevelForXP(currentXP);
    const isMaxLevel = level >= levelThresholds.length;
    
    return {
      level,
      currentXP,
      isMaxLevel,
      xpForNextLevel: isMaxLevel ? 0 : getXPForNextLevel(currentXP),
      progressToNextLevel: getProgressToNextLevel(currentXP),
      currentThreshold: levelThresholds[level - 1] || 0,
      nextThreshold: isMaxLevel ? currentXP : levelThresholds[level]
    };
  }

  /**
   * Update XP rules
   * @param {Object} newRules - New rules to merge
   */
  function updateRules(newRules) {
    xpRules = { ...xpRules, ...newRules };
    console.info('[Progression Rules] Rules updated');
  }

  /**
   * Update level thresholds
   * @param {Array} newThresholds - New threshold array
   */
  function updateThresholds(newThresholds) {
    if (Array.isArray(newThresholds) && newThresholds.length > 0) {
      levelThresholds = [...newThresholds];
      console.info('[Progression Rules] Thresholds updated');
    }
  }

  /**
   * Reset to default rules
   */
  function resetToDefaults() {
    xpRules = { ...DEFAULT_XP_RULES };
    levelThresholds = [...DEFAULT_LEVEL_THRESHOLDS];
    console.info('[Progression Rules] Reset to defaults');
  }

  /**
   * Get all available actions and their XP
   * @returns {Object} All XP rules
   */
  function getAllRules() {
    return { ...xpRules };
  }

  /**
   * Get all level thresholds
   * @returns {Array} Level thresholds
   */
  function getThresholds() {
    return [...levelThresholds];
  }

  /**
   * Get max level
   * @returns {number} Maximum level
   */
  function getMaxLevel() {
    return levelThresholds.length;
  }

  // Export API
  const ProgressionRules = {
    getXPReward,
    getLevelForXP,
    getXPForNextLevel,
    getProgressToNextLevel,
    getLevelInfo,
    updateRules,
    updateThresholds,
    resetToDefaults,
    getAllRules,
    getThresholds,
    getMaxLevel
  };

  g.ProgressionRules = ProgressionRules;

  console.info('[progression/rules] Rules engine initialized');

})(window);
