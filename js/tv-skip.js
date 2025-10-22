// MODULE: tv-skip.js
// Inline Skip control for the TV header
// Shows a prominent "⏩ Skip" button during skippable phases

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

    // Create skip button
    skipButton = document.createElement('button');
    skipButton.id = 'tvSkipButton';
    skipButton.className = 'tv-skip-button';
    skipButton.setAttribute('role', 'button');
    skipButton.setAttribute('aria-label', 'Skip to next phase');
    skipButton.setAttribute('title', 'Skip to next phase');
    skipButton.innerHTML = '⏩ Skip';
    
    // Insert after tvTitle
    if(tvTitle && tvTitle.nextSibling){
      tvHead.insertBefore(skipButton, tvTitle.nextSibling);
    } else {
      tvHead.appendChild(skipButton);
    }

    // Hide initially
    skipButton.style.display = 'none';

    // Wire up handlers
    wireHandlers();

    // Initial visibility update
    updateVisibility();

    console.info('[TVSkip] Initialized');
  }

  // Wire up click and keyboard handlers
  function wireHandlers(){
    if(!skipButton) return;

    const handleSkip = () => {
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

  // Update visibility based on current phase and handler availability
  function updateVisibility(){
    if(!skipButton) return;

    const game = g.game || {};
    const phase = game.phase;

    // Determine if skip should be visible
    let shouldShow = false;

    // Check if phase is skippable
    if(phase && SKIPPABLE_PHASES.includes(phase)){
      // Check if at least one skip handler is available
      const hasHandler = (
        typeof g.fastForwardPhase === 'function' ||
        typeof g.skipPhase === 'function' ||
        typeof g.advancePhase === 'function'
      );

      shouldShow = hasHandler;
    }

    // Update button visibility
    if(shouldShow){
      skipButton.style.display = 'inline-flex';
      // Hide tvTitle when skip button is visible
      if(tvTitle) tvTitle.style.display = 'none';
    } else {
      skipButton.style.display = 'none';
      // Show tvTitle when skip button is hidden
      if(tvTitle) tvTitle.style.display = 'block';
    }
  }

  // Hook into setPhase to update visibility on phase changes
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
      // Update visibility after phase change
      setTimeout(() => updateVisibility(), 0);
      return result;
    };
    g.setPhase.__tvSkipWrapped = true;
  }

  // Hook into updateHud to update visibility
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
      // Update visibility after HUD update
      setTimeout(() => updateVisibility(), 0);
      return result;
    };
    g.updateHud.__tvSkipWrapped = true;
  }

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
  TVSkip.updateVisibility = updateVisibility;
  g.TVSkip = TVSkip;

})(window);
