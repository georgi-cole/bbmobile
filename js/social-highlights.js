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

    let icon = '💬';
    let message = '';
    let className = 'highlight-neutral';

    // Alliance formed
    if (outcome?.allianceFormed) {
      icon = '🤝';
      message = `${actorName} formed an alliance with ${targetNames[0]}`;
      className = 'highlight-success';
    }
    // Betrayal/backlash
    else if (outcome?.betrayalRisk || outcome?.caught || outcome?.backlash) {
      icon = '⚠️';
      if (outcome?.caught) {
        message = `${actorName} was caught spreading rumors about ${targetNames[0]}!`;
      } else {
        message = `${actorName}'s actions backfired with ${targetNames[0]}`;
      }
      className = 'highlight-warning';
    }
    // Expose secret success
    else if (actionId === 'expose_secret' && success) {
      icon = '🔓';
      message = `${actorName} exposed a secret about ${targetNames[0]}`;
      className = 'highlight-warning';
    }
    // Confront
    else if (actionId === 'confront') {
      icon = outcome?.type === 'failure' ? '❌' : '⚔️';
      message = outcome?.type === 'failure' 
        ? `${actorName}'s confrontation with ${targetNames[0]} went poorly`
        : `${actorName} confronted ${targetNames[0]}`;
      className = outcome?.type === 'failure' ? 'highlight-negative' : 'highlight-neutral';
    }
    // Strong negative
    else if ((deltas?.influence || 0) <= DEFAULT_THRESHOLDS.negativeThreshold ||
             (deltas?.affinity || 0) <= DEFAULT_THRESHOLDS.negativeThreshold) {
      icon = '📉';
      message = `${actorName}'s relationship with ${targetNames[0]} deteriorated significantly`;
      className = 'highlight-negative';
    }
    // Major influence gain
    else if ((deltas?.influence || 0) >= DEFAULT_THRESHOLDS.majorInfluenceDelta) {
      icon = '📈';
      message = `${actorName} gained major influence with ${targetNames[0]}`;
      className = 'highlight-success';
    }
    // Major affinity gain
    else if ((deltas?.affinity || 0) >= DEFAULT_THRESHOLDS.majorAffinityDelta) {
      icon = '💖';
      message = `${actorName} bonded strongly with ${targetNames[0]}`;
      className = 'highlight-success';
    }
    // Big information gain
    else if ((deltas?.information || 0) >= DEFAULT_THRESHOLDS.majorInformationGain) {
      icon = '🔍';
      message = `${actorName} learned valuable information from ${targetNames[0]}`;
      className = 'highlight-success';
    }
    // Group events
    else if (outcome?.multiTarget || (outcome?.participants?.length > 2)) {
      icon = '👥';
      const count = targetNames.length || outcome?.participants?.length || 2;
      message = `${actorName} had a positive group interaction with ${count} others`;
      className = 'highlight-success';
    }
    // Generic major event
    else {
      message = `${actorName} had a significant interaction with ${targetNames.join(', ')}`;
    }

    return {
      timestamp: Date.now(),
      icon,
      message,
      className,
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

    // Create highlights card
    const card = document.createElement('div');
    card.className = 'revealCard diaryRoomCard social-highlights-card';
    
    const header = document.createElement('div');
    header.className = 'card-header';
    header.innerHTML = '<h3>🌟 Social Highlights</h3>';
    
    const body = document.createElement('div');
    body.className = 'card-body';
    
    // Add each highlight
    currentHighlights.forEach(highlight => {
      const entry = document.createElement('div');
      entry.className = `highlight-entry ${highlight.className}`;
      entry.innerHTML = `
        <span class="highlight-icon">${highlight.icon}</span>
        <span class="highlight-message">${highlight.message}</span>
      `;
      body.appendChild(entry);
    });

    card.appendChild(header);
    card.appendChild(body);
    
    // Prepend to Social log pane (most recent first)
    logPane.insertBefore(card, logPane.firstChild);
    
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
