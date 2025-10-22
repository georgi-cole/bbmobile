// MODULE: social-highlights.js
// Aggregates and displays major social events in Diary Room logs
// Listens to both human and AI outcomes during Social phase

(function(global){
  'use strict';

  // ============================================================================
  // CONFIGURATION
  // ============================================================================
  const DEFAULT_THRESHOLDS = {
    majorInfluenceDelta: 8,      // |Δinfluence| ≥ 8
    majorAffinityDelta: 8,       // |Δaffinity| ≥ 8 (similar to influence)
    majorInformationGain: 6,     // Information gain ≥ 6
    negativeThreshold: -8        // Strong negative ≤ -8
  };

  function isEnabled() {
    const g = global.game || {};
    const cfg = g.cfg || {};
    return cfg.socialHighlightsEnabled ?? true;
  }

  // ============================================================================
  // HIGHLIGHTS STATE
  // ============================================================================
  let currentHighlights = [];
  const MAX_HIGHLIGHTS = 5;

  function initHighlights() {
    currentHighlights = [];
  }

  // ============================================================================
  // EVENT CLASSIFICATION
  // ============================================================================
  function isMajorEvent(eventData) {
    const { outcome, deltas, actionId, success } = eventData;
    
    // Alliance formed or protected
    if (outcome?.allianceFormed) return true;
    
    // Betrayal/backlash
    if (outcome?.betrayalRisk || outcome?.caught || outcome?.backlash) return true;
    
    // Expose secret success
    if (actionId === 'expose_secret' && success) return true;
    
    // Caught spreading rumor
    if (actionId === 'spread_rumor' && outcome?.caught) return true;
    
    // Confront fails
    if (actionId === 'confront' && outcome?.type === 'failure') return true;
    
    // Strong negative outcomes
    if ((deltas?.influence || 0) <= DEFAULT_THRESHOLDS.negativeThreshold) return true;
    if ((deltas?.affinity || 0) <= DEFAULT_THRESHOLDS.negativeThreshold) return true;
    
    // Major influence gain/loss
    if (Math.abs(deltas?.influence || 0) >= DEFAULT_THRESHOLDS.majorInfluenceDelta) return true;
    
    // Major affinity change
    if (Math.abs(deltas?.affinity || 0) >= DEFAULT_THRESHOLDS.majorAffinityDelta) return true;
    
    // Big information gain
    if ((deltas?.information || 0) >= DEFAULT_THRESHOLDS.majorInformationGain) return true;
    
    // Positive group events (group_hangout, strategize with multiple targets)
    if (outcome?.multiTarget && outcome?.type === 'positive') return true;
    if (outcome?.participants?.length > 2 && outcome?.type === 'success') return true;
    
    return false;
  }

  function createHighlightEntry(eventData) {
    const { actorId, targetIds, actionId, outcome, deltas, success } = eventData;
    
    const actorName = global.safeName?.(actorId) || `Player ${actorId}`;
    const targetNames = (targetIds || []).map(tid => 
      global.safeName?.(tid) || `Player ${tid}`
    );

    let message = '';

    // Alliance formed
    if (outcome?.allianceFormed) {
      message = `${actorName} formed an alliance with ${targetNames[0]}.`;
    }
    // Betrayal/backlash
    else if (outcome?.betrayalRisk || outcome?.caught || outcome?.backlash) {
      if (outcome?.caught) {
        message = `${actorName} was caught spreading rumors about ${targetNames[0]}!`;
      } else {
        message = `${actorName}'s actions backfired with ${targetNames[0]}.`;
      }
    }
    // Expose secret success
    else if (actionId === 'expose_secret' && success) {
      message = `${actorName} exposed a secret about ${targetNames[0]}.`;
    }
    // Confront
    else if (actionId === 'confront') {
      const delta = Math.abs(deltas?.influence || 0) + Math.abs(deltas?.affinity || 0);
      if (outcome?.type === 'failure') {
        message = `${actorName} confronted ${targetNames[0]} and it backfired (${deltas?.influence || 0}).`;
      } else {
        message = `${actorName} confronted ${targetNames[0]}.`;
      }
    }
    // Strong negative
    else if ((deltas?.influence || 0) <= DEFAULT_THRESHOLDS.negativeThreshold ||
             (deltas?.affinity || 0) <= DEFAULT_THRESHOLDS.negativeThreshold) {
      const delta = Math.min(deltas?.influence || 0, deltas?.affinity || 0);
      message = `${actorName}'s relationship with ${targetNames[0]} deteriorated significantly (${delta}).`;
    }
    // Major influence gain
    else if ((deltas?.influence || 0) >= DEFAULT_THRESHOLDS.majorInfluenceDelta) {
      message = `${actorName} gained major influence with ${targetNames[0]} (+${deltas.influence}).`;
    }
    // Major affinity gain
    else if ((deltas?.affinity || 0) >= DEFAULT_THRESHOLDS.majorAffinityDelta) {
      message = `${actorName} bonded strongly with ${targetNames[0]} (+${deltas.affinity}).`;
    }
    // Big information gain
    else if ((deltas?.information || 0) >= DEFAULT_THRESHOLDS.majorInformationGain) {
      message = `${actorName} learned valuable information from ${targetNames[0]} (+${deltas.information}).`;
    }
    // Group events
    else if (outcome?.multiTarget || (outcome?.participants?.length > 2)) {
      const count = targetNames.length || outcome?.participants?.length || 2;
      message = `${actorName} had a positive group interaction with ${count} others.`;
    }
    // Generic major event
    else {
      message = `${actorName} had a significant interaction with ${targetNames.join(', ')}.`;
    }

    return {
      timestamp: Date.now(),
      message,
      actorId,
      targetIds,
      actionId,
      outcome
    };
  }

  function addHighlight(eventData) {
    if (!isEnabled()) return;
    
    if (!isMajorEvent(eventData)) return;

    const entry = createHighlightEntry(eventData);
    currentHighlights.push(entry);

    // Keep only the most recent MAX_HIGHLIGHTS
    if (currentHighlights.length > MAX_HIGHLIGHTS) {
      currentHighlights = currentHighlights.slice(-MAX_HIGHLIGHTS);
    }

    console.info('[social-highlights] Added highlight:', entry.message);
  }

  // ============================================================================
  // EVENT LISTENERS
  // ============================================================================
  function setupEventListeners() {
    // Listen to AI interactions
    window.addEventListener('sm-ai-interaction', (e) => {
      const data = e.detail;
      if (data) {
        addHighlight(data);
      }
    });

    // Listen to human interactions (via existing social-resources-changed event)
    // We'll need to enhance this or add a new event for action outcomes
    // For now, we'll rely on the executeAction path emitting outcomes
  }

  // ============================================================================
  // RENDERING
  // ============================================================================
  function renderHighlightsCard() {
    if (!isEnabled()) return;
    
    if (currentHighlights.length === 0) {
      console.info('[social-highlights] No highlights to display');
      return;
    }

    const logPane = document.getElementById('logSocial');
    if (!logPane) {
      console.warn('[social-highlights] Social log pane not found');
      return;
    }

    // Create simple text-based list container
    const container = document.createElement('div');
    container.className = 'social-highlights-list';
    
    // Optional simple text heading
    const heading = document.createElement('div');
    heading.className = 'social-highlights-heading';
    heading.textContent = 'Social Highlights';
    container.appendChild(heading);
    
    // Create unordered list for semantic markup
    const list = document.createElement('ul');
    list.className = 'social-highlights-items';
    
    // Add each highlight as a list item (no icons, no emojis)
    currentHighlights.forEach(highlight => {
      const item = document.createElement('li');
      item.className = 'social-highlight-item';
      item.textContent = highlight.message;
      list.appendChild(item);
    });

    container.appendChild(list);
    
    // Prepend to Social log pane (most recent first)
    logPane.insertBefore(container, logPane.firstChild);
    
    console.info(`[social-highlights] Rendered ${currentHighlights.length} highlights to Diary Room`);
  }

  // ============================================================================
  // PHASE LIFECYCLE HOOKS
  // ============================================================================
  function onPhaseStart() {
    if (!isEnabled()) return;
    console.info('[social-highlights] Phase started - initializing highlights');
    initHighlights();
  }

  function onPhaseEnd() {
    if (!isEnabled()) return;
    console.info('[social-highlights] Phase ended - rendering highlights');
    renderHighlightsCard();
  }

  // ============================================================================
  // INTEGRATION HOOK
  // ============================================================================
  // This function should be called when a human action completes
  function recordHumanAction(eventData) {
    if (!isEnabled()) return;
    addHighlight(eventData);
  }

  // ============================================================================
  // EXPORTS
  // ============================================================================
  global.SocialHighlights = {
    onPhaseStart,
    onPhaseEnd,
    recordHumanAction,
    renderHighlightsCard,
    isEnabled,
    // For testing
    _currentHighlights: () => currentHighlights,
    _isMajorEvent: isMajorEvent
  };

  // Setup listeners on load
  setupEventListeners();
  
  console.info('[social-highlights] ✓ Module loaded');

})(window);
