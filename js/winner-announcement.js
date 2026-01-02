// winner-announcement.js
// Enhanced winner announcement UI with timed runner-up miniature display.
// Provides animated rainbow border, cyan glow, and scheduled runner-up appearance/fade.
//
// Usage:
//   WinnerAnnouncement.show(winnerData, runnerData);
//   WinnerAnnouncement.cancel(); // Cancel scheduled timers
//
// Expected DOM structure:
//   <div class="winner-screen">
//     <div class="winner-card">
//       <img class="winner-avatar" src="..." alt="Winner">
//       <div class="winner-name">Player Name</div>
//       <div class="winner-title">🏆 WINNER 🏆</div>
//     </div>
//     <div class="runner-up">
//       <img class="runner-up-avatar" src="..." alt="Runner-up">
//       <div class="runner-up-name">Player Name</div>
//       <div class="runner-up-label">Runner-up</div>
//     </div>
//   </div>

export const WinnerAnnouncement = (() => {
  // State management
  let timers = [];
  
  // Default selectors (can be customized if needed)
  const SELECTORS = {
    screen: '.winner-screen',
    card: '.winner-card',
    avatar: '.winner-avatar',
    name: '.winner-name',
    title: '.winner-title',
    runnerUp: '.runner-up',
    runnerUpAvatar: '.runner-up-avatar',
    runnerUpName: '.runner-up-name',
    runnerUpLabel: '.runner-up-label'
  };
  
  // Timing configuration (in milliseconds)
  const TIMING = {
    runnerUpAppear: 2000,    // 2.0s - Runner-up appears after winner
    runnerUpVisible: 2500,   // 2.5s - Runner-up stays visible
    finalWait: 2500          // 2.5s - Wait after runner-up fades before closing
  };
  
  /**
   * Clear all scheduled timers
   */
  function clearTimers() {
    timers.forEach(id => clearTimeout(id));
    timers = [];
    console.log('[WinnerAnnouncement] All timers cleared');
  }
  
  /**
   * Get or create the winner screen DOM structure
   */
  function ensureScreenStructure() {
    let screen = document.querySelector(SELECTORS.screen);
    
    if (!screen) {
      // Create the structure dynamically if it doesn't exist
      screen = document.createElement('div');
      screen.className = 'winner-screen';
      
      const card = document.createElement('div');
      card.className = 'winner-card';
      
      const avatar = document.createElement('img');
      avatar.className = 'winner-avatar';
      avatar.alt = 'Winner';
      
      const name = document.createElement('div');
      name.className = 'winner-name';
      
      const title = document.createElement('div');
      title.className = 'winner-title';
      title.textContent = '🏆 WINNER 🏆';
      
      card.appendChild(avatar);
      card.appendChild(name);
      card.appendChild(title);
      
      const runnerUp = document.createElement('div');
      runnerUp.className = 'runner-up';
      
      const runnerUpAvatar = document.createElement('img');
      runnerUpAvatar.className = 'runner-up-avatar';
      runnerUpAvatar.alt = 'Runner-up';
      
      const runnerUpName = document.createElement('div');
      runnerUpName.className = 'runner-up-name';
      
      const runnerUpLabel = document.createElement('div');
      runnerUpLabel.className = 'runner-up-label';
      runnerUpLabel.textContent = 'Runner-up';
      
      runnerUp.appendChild(runnerUpAvatar);
      runnerUp.appendChild(runnerUpName);
      runnerUp.appendChild(runnerUpLabel);
      
      screen.appendChild(card);
      screen.appendChild(runnerUp);
      
      document.body.appendChild(screen);
      
      console.log('[WinnerAnnouncement] Created winner screen structure');
    }
    
    return screen;
  }
  
  /**
   * Populate winner data into the UI
   */
  function populateWinner(winnerData) {
    const avatar = document.querySelector(SELECTORS.avatar);
    const name = document.querySelector(SELECTORS.name);
    
    if (avatar && winnerData?.avatar) {
      avatar.src = winnerData.avatar;
      avatar.alt = winnerData.name || 'Winner';
    }
    
    if (name && winnerData?.name) {
      name.textContent = winnerData.name;
    }
    
    console.log('[WinnerAnnouncement] Winner populated:', winnerData?.name || 'Unknown');
  }
  
  /**
   * Populate runner-up data into the UI
   */
  function populateRunnerUp(runnerData) {
    const avatar = document.querySelector(SELECTORS.runnerUpAvatar);
    const name = document.querySelector(SELECTORS.runnerUpName);
    
    if (avatar && runnerData?.avatar) {
      avatar.src = runnerData.avatar;
      avatar.alt = runnerData.name || 'Runner-up';
    }
    
    if (name && runnerData?.name) {
      name.textContent = runnerData.name;
    }
    
    console.log('[WinnerAnnouncement] Runner-up populated:', runnerData?.name || 'Unknown');
  }
  
  /**
   * Show the runner-up miniature
   */
  function showRunnerUp() {
    const runnerUp = document.querySelector(SELECTORS.runnerUp);
    if (runnerUp) {
      runnerUp.classList.remove('fading');
      runnerUp.classList.add('visible');
      console.log('[WinnerAnnouncement] Runner-up now visible');
    }
  }
  
  /**
   * Fade out the runner-up miniature
   */
  function fadeRunnerUp() {
    const runnerUp = document.querySelector(SELECTORS.runnerUp);
    if (runnerUp) {
      runnerUp.classList.remove('visible');
      runnerUp.classList.add('fading');
      console.log('[WinnerAnnouncement] Runner-up fading out');
    }
  }
  
  /**
   * Hide the runner-up miniature completely
   */
  function hideRunnerUp() {
    const runnerUp = document.querySelector(SELECTORS.runnerUp);
    if (runnerUp) {
      runnerUp.classList.remove('visible', 'fading');
      console.log('[WinnerAnnouncement] Runner-up hidden');
    }
  }
  
  /**
   * Close/hide the winner screen
   */
  function closeScreen() {
    const screen = document.querySelector(SELECTORS.screen);
    if (screen) {
      screen.classList.remove('announcing');
      hideRunnerUp();
      console.log('[WinnerAnnouncement] Screen closed');
    }
  }
  
  /**
   * Main show method - displays winner announcement with timed runner-up sequence
   * 
   * @param {Object} winnerData - Winner information { name, avatar }
   * @param {Object} runnerData - Runner-up information { name, avatar }
   * @returns {Object} Control object with cancel method
   */
  function show(winnerData, runnerData) {
    // Clear any existing timers
    clearTimers();
    
    // Ensure DOM structure exists
    const screen = ensureScreenStructure();
    
    // Reset runner-up state
    hideRunnerUp();
    
    // Populate data
    if (winnerData) {
      populateWinner(winnerData);
    }
    if (runnerData) {
      populateRunnerUp(runnerData);
    }
    
    // Show the screen
    screen.classList.add('announcing');
    console.log('[WinnerAnnouncement] Winner announcement started');
    
    // Schedule runner-up appearance after 2.0s
    const timer1 = setTimeout(() => {
      showRunnerUp();
      
      // Schedule runner-up fade after 2.5s of visibility (total 4.5s from start)
      const timer2 = setTimeout(() => {
        fadeRunnerUp();
        
        // Schedule screen close after another 2.5s (total 7.0s from start)
        const timer3 = setTimeout(() => {
          closeScreen();
          console.log('[WinnerAnnouncement] Complete sequence finished');
        }, TIMING.finalWait);
        
        timers.push(timer3);
      }, TIMING.runnerUpVisible);
      
      timers.push(timer2);
    }, TIMING.runnerUpAppear);
    
    timers.push(timer1);
    
    console.log('[WinnerAnnouncement] Sequence scheduled:', {
      runnerUpAt: `${TIMING.runnerUpAppear / 1000}s`,
      fadeAt: `${(TIMING.runnerUpAppear + TIMING.runnerUpVisible) / 1000}s`,
      closeAt: `${(TIMING.runnerUpAppear + TIMING.runnerUpVisible + TIMING.finalWait) / 1000}s`
    });
    
    return {
      cancel: () => {
        clearTimers();
        closeScreen();
      }
    };
  }
  
  /**
   * Cancel the current announcement and hide everything
   */
  function cancel() {
    clearTimers();
    closeScreen();
    console.log('[WinnerAnnouncement] Cancelled');
  }
  
  // Public API
  return {
    show,
    cancel
  };
})();

// Debug/Testing helper (commented out - uncomment for manual testing)
/*
if (typeof window !== 'undefined') {
  window.WinnerAnnouncement = WinnerAnnouncement;
  
  // Test invocation - call from console: testWinnerAnnouncement()
  window.testWinnerAnnouncement = () => {
    console.log('[TEST] Starting winner announcement test...');
    
    const mockWinner = {
      name: 'Alice Johnson',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice'
    };
    
    const mockRunner = {
      name: 'Bob Smith',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob'
    };
    
    WinnerAnnouncement.show(mockWinner, mockRunner);
    
    console.log('[TEST] Winner announcement should show:');
    console.log('  - t=0.0s: Winner appears');
    console.log('  - t=2.0s: Runner-up appears');
    console.log('  - t=4.5s: Runner-up fades out');
    console.log('  - t=7.0s: Screen closes');
  };
  
  console.log('[WinnerAnnouncement] Debug mode enabled. Call testWinnerAnnouncement() to test.');
}
*/
