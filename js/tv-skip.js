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
    'social',
    'social_intermission'
  ];
  
  // Phase exclusions for fast-forward
  const FFWD_EXCLUDED_PHASES = ['lobby'];

  let skipTimerPill = null;
  let skipButton = null;
  let timerDisplay = null;
  let tvTitle = null;
  let progressBar = null;
  let progressInterval = null;
  let prefersReducedMotion = false;

  // Initialize the unified skip+timer pill
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

    // Find and remove the original timer completely
    const originalTimer = tvHead.querySelector('.tvTimer');
    if(originalTimer){
      originalTimer.remove();
    }

    // Check prefers-reduced-motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    prefersReducedMotion = mediaQuery.matches;
    mediaQuery.addEventListener('change', (e) => {
      prefersReducedMotion = e.matches;
    });

    // Create unified pill container
    skipTimerPill = document.createElement('div');
    skipTimerPill.className = 'tv-skip-timer-pill';
    
    // Create progress bar background (fills entire pill)
    progressBar = document.createElement('div');
    progressBar.className = 'tv-skip-timer-progress';
    skipTimerPill.appendChild(progressBar);
    
    // Create skip button
    skipButton = document.createElement('button');
    skipButton.id = 'tvSkipButton';
    skipButton.className = 'tv-skip-timer-button';
    skipButton.setAttribute('role', 'button');
    skipButton.setAttribute('aria-label', 'Skip to next phase');
    skipButton.setAttribute('title', 'Skip to next phase');
    
    const skipLabel = document.createElement('span');
    skipLabel.textContent = '⏩ FFWD';
    skipLabel.setAttribute('title', 'Fast-Forward (preserves all steps, compresses time)');
    skipButton.appendChild(skipLabel);
    
    // Create timer display
    timerDisplay = document.createElement('div');
    timerDisplay.className = 'tv-skip-timer-display';
    timerDisplay.textContent = '00:00';
    
    // Assemble pill: skip button + timer
    skipTimerPill.appendChild(skipButton);
    skipTimerPill.appendChild(timerDisplay);
    
    // Insert after tvTitle
    if(tvTitle && tvTitle.nextSibling){
      tvHead.insertBefore(skipTimerPill, tvTitle.nextSibling);
    } else {
      tvHead.appendChild(skipTimerPill);
    }
    
    // Hide tvTitle when skip button is present
    if(tvTitle) tvTitle.style.display = 'none';

    // Wire up handlers
    wireHandlers();

    // Initial state update
    updateState();
    
    // Start progress animation and timer update
    startProgressAnimation();
    startTimerUpdate();

    console.info('[TVSkip] Initialized (unified skip+timer pill)');
  }

  // Update timer display
  function updateTimerDisplay(){
    if(!timerDisplay) return;

    const game = g.game || {};
    const now = Date.now();
    const endAt = game.endAt || (game.phaseEndsAt || 0);

    if(!endAt || endAt <= now){
      timerDisplay.textContent = '00:00';
      return;
    }

    const remaining = Math.max(0, Math.ceil((endAt - now) / 1000));
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    timerDisplay.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  // Start timer update interval
  function startTimerUpdate(){
    // Update immediately
    updateTimerDisplay();
    
    // Update every second
    setInterval(() => {
      updateTimerDisplay();
    }, 1000);
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

      // Diagnostic logging
      console.group('[TVSkip] ⏩ FFWD Button Clicked');
      const game = g.game || {};
      console.info('Phase:', game.phase);
      console.info('__ffActive before:', game.__ffActive);
      
      // Visual feedback
      skipButton.classList.add('pressed');
      setTimeout(() => skipButton.classList.remove('pressed'), 200);

      // Try skip APIs in order: fastForwardPhase → skipPhase → advancePhase
      if(typeof g.fastForwardPhase === 'function'){
        console.info('Handler: fastForwardPhase()');
        g.fastForwardPhase();
      } else if(typeof g.skipPhase === 'function'){
        console.info('Handler: skipPhase()');
        g.skipPhase();
      } else if(typeof g.advancePhase === 'function'){
        console.info('Handler: advancePhase()');
        g.advancePhase();
      } else {
        console.warn('No skip function available');
      }
      
      console.info('__ffActive after:', g.game?.__ffActive);
      console.groupEnd();
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
    const cfg = game.cfg || {};
    const phase = game.phase;

    // Determine if skip should be enabled
    let shouldEnable = false;

    // Check if at least one skip handler is available
    const hasHandler = (
      typeof g.fastForwardPhase === 'function' ||
      typeof g.skipPhase === 'function' ||
      typeof g.advancePhase === 'function'
    );

    // Determine if button should be enabled based on phase and config
    const isSkippablePhase = phase && SKIPPABLE_PHASES.includes(phase);
    const isExcludedPhase = phase && FFWD_EXCLUDED_PHASES.includes(phase);
    const alwaysEnableActive = cfg.fastForwardAlwaysEnable && phase && !isExcludedPhase;
    
    if(isSkippablePhase || alwaysEnableActive){
      shouldEnable = hasHandler;
    }

    // Update button state (always visible, but may be disabled)
    skipButton.disabled = !shouldEnable;
    
    if(shouldEnable){
      skipButton.setAttribute('aria-label', 'Fast-forward phase (preserves all steps)');
      skipButton.setAttribute('title', 'Fast-forward phase (preserves all steps)');
    } else {
      skipButton.setAttribute('aria-label', 'Fast-forward not available');
      skipButton.setAttribute('title', 'Fast-forward not available in this phase');
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
      
      // Deactivate fast-forward on phase change (auto-reset)
      if(g.game && g.game.__ffActive){
        if(typeof g.deactivateFastForward === 'function'){
          g.deactivateFastForward();
        } else {
          g.game.__ffActive = false;
          g.game.__ffMultiplier = 1;
          console.info('[fast-forward] deactivated (normal speed restored)');
        }
      }
      
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
