// MODULE: tv-skip.js
// Inline Skip control for the TV header
// Always visible with progress effect, disabled when not skippable
//
// Changes:
// - Skip button is always rendered (no hiding)
// - Disabled state when phase is not skippable
// - Progress bar depletes R->L based on phase timer
// - Respects prefers-reduced-motion
// - Preserves sm-phase-skip-empty event emissions

(function(g){
  'use strict';

  const TVSkip = g.TVSkip || (g.TVSkip = {});

  // Skippable phases list
  const SKIPPABLE_PHASES = [
    'opening',
    'intermission',
    'hoh',
    'nominations',
    'veto_comp',
    'veto',
    'veto_ceremony',
    'livevote',
    'jury',
    'jury_return',
    'final3_comp1',
    'final3_comp2',
    'final3_decision',
    'social'
  ];

  let skipButton = null;
  let tvTitle = null;
  let progressBar = null;
  let progressInterval = null;
  let prefersReducedMotion = false;

  // Initialize the inline skip button
  function init(){
    const tvHead = document.querySelector('.tvHead');
    if(!tvHead){
      console.warn('[TVSkip] .tvHead not found');
      return;
    }

    // Find tvTitle element
    tvTitle = tvHead.querySelector('.tvTitle');
    if(!tvTitle){
      console.warn('[TVSkip] .tvTitle not found');
    }

    // Check prefers-reduced-motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    prefersReducedMotion = mediaQuery.matches;
    mediaQuery.addEventListener('change', (e) => {
      prefersReducedMotion = e.matches;
    });

    // Create skip button with progress bar
    skipButton = document.createElement('button');
    skipButton.id = 'tvSkipButton';
    skipButton.className = 'tv-skip-button';
    skipButton.setAttribute('role', 'button');
    skipButton.setAttribute('aria-label', 'Skip to next phase');
    skipButton.setAttribute('title', 'Skip to next phase');
    
    // Create progress bar element
    progressBar = document.createElement('div');
    progressBar.className = 'tv-skip-progress';
    
    // Create label span
    const label = document.createElement('span');
    label.textContent = '⏩ Skip';
    
    // Assemble button
    skipButton.appendChild(progressBar);
    skipButton.appendChild(label);
    
    // Insert after tvTitle
    if(tvTitle && tvTitle.nextSibling){
      tvHead.insertBefore(skipButton, tvTitle.nextSibling);
    } else {
      tvHead.appendChild(skipButton);
    }

    // Always visible, but may be disabled
    skipButton.style.display = 'inline-flex';
    
    // Hide tvTitle when skip button is present
    if(tvTitle) tvTitle.style.display = 'none';

    // Wire up handlers
    wireHandlers();

    // Initial state update
    updateState();
    
    // Start progress animation
    startProgressAnimation();

    console.info('[TVSkip] Initialized (always visible)');
  }

  // Wire up click and keyboard handlers
  function wireHandlers(){
    if(!skipButton) return;

    const handleSkip = () => {
      // Don't skip if disabled
      if(skipButton.disabled){
        console.info('[TVSkip] Skip button is disabled');
        return;
      }

      console.info('[TVSkip] Skip triggered');

      // Try skip APIs in order: fastForwardPhase → skipPhase → advancePhase
      if(typeof g.fastForwardPhase === 'function'){
        g.fastForwardPhase();
      } else if(typeof g.skipPhase === 'function'){
        g.skipPhase();
      } else if(typeof g.advancePhase === 'function'){
        g.advancePhase();
      } else {
        console.warn('[TVSkip] No skip function available');
      }
    };

    // Click handler
    skipButton.addEventListener('click', (e) => {
      e.preventDefault();
      handleSkip();
    });

    // Keyboard handler (Enter/Space)
    skipButton.addEventListener('keydown', (e) => {
      if(e.key === 'Enter' || e.key === ' '){
        e.preventDefault();
        handleSkip();
      }
    });
  }

  // Update button state (enabled/disabled) based on phase
  function updateState(){
    if(!skipButton) return;

    const game = g.game || {};
    const phase = game.phase;

    // Determine if skip should be enabled
    let shouldEnable = false;

    // Check if phase is skippable
    if(phase && SKIPPABLE_PHASES.includes(phase)){
      // Check if at least one skip handler is available
      const hasHandler = (
        typeof g.fastForwardPhase === 'function' ||
        typeof g.skipPhase === 'function' ||
        typeof g.advancePhase === 'function'
      );

      shouldEnable = hasHandler;
    }

    // Update button state (always visible, but may be disabled)
    skipButton.disabled = !shouldEnable;
    
    if(shouldEnable){
      skipButton.setAttribute('aria-label', 'Skip to next phase');
      skipButton.setAttribute('title', 'Skip to next phase');
    } else {
      skipButton.setAttribute('aria-label', 'Skip not available');
      skipButton.setAttribute('title', 'Skip not available in this phase');
    }
  }

  // Start progress animation tied to phase timer
  function startProgressAnimation(){
    // Clear existing interval
    if(progressInterval){
      clearInterval(progressInterval);
      progressInterval = null;
    }

    // Update progress every 100ms
    progressInterval = setInterval(() => {
      updateProgress();
    }, 100);
  }

  // Update progress bar based on phase timer
  function updateProgress(){
    if(!progressBar || prefersReducedMotion) return;

    const game = g.game || {};
    const now = Date.now();
    const endAt = game.endAt || (game.phaseEndsAt || 0);

    if(!endAt || endAt <= now){
      // Timer expired or not set
      progressBar.style.transform = 'scaleX(0)';
      return;
    }

    // Calculate time remaining
    const duration = getPhaseTimeout(game.phase);
    const startAt = endAt - duration;
    const elapsed = now - startAt;
    
    if(duration <= 0){
      progressBar.style.transform = 'scaleX(0)';
      return;
    }

    // Calculate progress (1 = full, 0 = depleted)
    const progress = Math.max(0, Math.min(1, 1 - (elapsed / duration)));
    progressBar.style.transform = `scaleX(${progress})`;
  }

  // Get phase duration in ms (matches timer config from js/state.js)
  function getPhaseTimeout(phase){
    const game = g.game || {};
    const cfg = game.cfg || {};
    
    const durations = {
      'opening': 5000,
      'intermission': 3000,
      'hoh': (cfg.tHOH || 35) * 1000,
      'nominations': (cfg.tNoms || 25) * 1000,
      'veto_comp': (cfg.tVeto || 30) * 1000,
      'veto': (cfg.tVeto || 30) * 1000,
      'veto_ceremony': (cfg.tVetoDec || 20) * 1000,
      'livevote': (cfg.tVote || 25) * 1000,
      'jury': (cfg.tJury || 42) * 1000,
      'social': (cfg.tComms || 30) * 1000,
      'social_intermission': (cfg.tComms || 30) * 1000
    };
    
    return durations[phase] || 30000;
  }

  // Legacy alias for updateVisibility
  function updateVisibility(){
    updateState();
  }

  // Hook into setPhase to update state on phase changes
  function wrapSetPhase(){
    if(!g.setPhase) {
      // Retry if setPhase doesn't exist yet
      setTimeout(wrapSetPhase, 100);
      return;
    }
    
    if(g.setPhase.__tvSkipWrapped) return; // Already wrapped
    
    const originalSetPhase = g.setPhase;
    g.setPhase = function(...args){
      const result = originalSetPhase.apply(this, args);
      // Update state after phase change
      setTimeout(() => updateState(), 0);
      return result;
    };
    g.setPhase.__tvSkipWrapped = true;
  }

  // Hook into updateHud to update state
  function wrapUpdateHud(){
    if(!g.updateHud) {
      // Retry if updateHud doesn't exist yet
      setTimeout(wrapUpdateHud, 100);
      return;
    }
    
    if(g.updateHud.__tvSkipWrapped) return; // Already wrapped
    
    const originalUpdateHud = g.updateHud;
    g.updateHud = function(...args){
      const result = originalUpdateHud.apply(this, args);
      // Update state after HUD update
      setTimeout(() => updateState(), 0);
      return result;
    };
    g.updateHud.__tvSkipWrapped = true;
  }

  // Cleanup on page unload
  function cleanup(){
    if(progressInterval){
      clearInterval(progressInterval);
      progressInterval = null;
    }
  }

  window.addEventListener('beforeunload', cleanup);

  // Auto-initialize on DOM ready
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', () => {
      init();
      wrapSetPhase();
      wrapUpdateHud();
    }, { once: true });
  } else {
    init();
    wrapSetPhase();
    wrapUpdateHud();
  }

  // Exports
  TVSkip.updateVisibility = updateVisibility; // Legacy alias
  TVSkip.updateState = updateState;
  TVSkip.updateProgress = updateProgress;
  TVSkip.startProgressAnimation = startProgressAnimation;
  g.TVSkip = TVSkip;

})(window);
