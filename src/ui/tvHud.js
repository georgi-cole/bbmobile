/**
 * TV HUD Overlay Module
 * 
 * Provides a heads-up display overlay for the faux TV screen
 * Displays game state: Skip, Timer, Players, Season/Week, Mode
 * 
 * @module src/ui/tvHud
 */

/**
 * Mount a TV HUD overlay component
 * 
 * @param {HTMLElement} root - Root container (typically the TV viewport)
 * @returns {Object} HUD API with state management methods
 */
export function mountTvHud(root) {
  // Create HUD container
  const hudEl = document.createElement('div');
  hudEl.className = 'tv-hud';
  
  // Top bar: Skip and Timer
  const topBar = document.createElement('div');
  topBar.className = 'tv-hud__top';
  
  const skipBtn = document.createElement('button');
  skipBtn.className = 'tv-hud__skip';
  skipBtn.textContent = 'Skip';
  skipBtn.type = 'button';
  topBar.appendChild(skipBtn);
  
  const timerDiv = document.createElement('div');
  timerDiv.className = 'tv-hud__timer';
  timerDiv.textContent = '00:00';
  topBar.appendChild(timerDiv);
  
  hudEl.appendChild(topBar);
  
  // Bottom bar: Players, Season/Week, Mode
  const bottomBar = document.createElement('div');
  bottomBar.className = 'tv-hud__bottom';
  
  // Players progress
  const playersDiv = document.createElement('div');
  playersDiv.className = 'tv-hud__players';
  
  const playersLabel = document.createElement('div');
  playersLabel.className = 'tv-hud__players-label';
  playersLabel.textContent = 'Players';
  playersDiv.appendChild(playersLabel);
  
  const playersBar = document.createElement('div');
  playersBar.className = 'tv-hud__players-bar';
  
  const playersFill = document.createElement('div');
  playersFill.className = 'tv-hud__players-fill';
  playersFill.style.width = '0%';
  playersBar.appendChild(playersFill);
  
  playersDiv.appendChild(playersBar);
  
  const playersText = document.createElement('div');
  playersText.className = 'tv-hud__players-text';
  playersText.textContent = '0 / 0';
  playersDiv.appendChild(playersText);
  
  bottomBar.appendChild(playersDiv);
  
  // Info row: Season/Week and Mode
  const infoDiv = document.createElement('div');
  infoDiv.className = 'tv-hud__info';
  
  const metaDiv = document.createElement('div');
  metaDiv.className = 'tv-hud__meta';
  
  const seasonPill = document.createElement('div');
  seasonPill.className = 'tv-hud__pill';
  seasonPill.innerHTML = 'Season <strong>1</strong>';
  metaDiv.appendChild(seasonPill);
  
  const weekPill = document.createElement('div');
  weekPill.className = 'tv-hud__pill';
  weekPill.innerHTML = 'Week <strong>1</strong>';
  metaDiv.appendChild(weekPill);
  
  infoDiv.appendChild(metaDiv);
  
  const modeDiv = document.createElement('div');
  modeDiv.className = 'tv-hud__mode';
  modeDiv.textContent = 'CEREMONY';
  infoDiv.appendChild(modeDiv);
  
  bottomBar.appendChild(infoDiv);
  hudEl.appendChild(bottomBar);
  
  // Append to root
  root.appendChild(hudEl);
  
  // Internal state
  let skipCallback = null;
  
  // Skip button handler
  skipBtn.addEventListener('click', () => {
    if (skipCallback) {
      skipCallback();
    }
  });
  
  /**
   * Format seconds as MM:SS
   * 
   * @param {number} seconds - Seconds to format
   * @returns {string} Formatted time string
   */
  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  
  /**
   * Set the busy state (fades HUD)
   * 
   * @param {boolean} busy - Whether HUD should be hidden
   */
  function setBusy(busy) {
    if (busy) {
      hudEl.classList.add('is-hidden');
    } else {
      hudEl.classList.remove('is-hidden');
    }
  }
  
  /**
   * Set progress bar state
   * 
   * @param {number} current - Current player count
   * @param {number} total - Total player count
   */
  function setProgress(current, total) {
    const percentage = total > 0 ? (current / total) * 100 : 0;
    playersFill.style.width = `${percentage}%`;
    playersText.textContent = `${current} / ${total}`;
  }
  
  /**
   * Set season and week
   * 
   * @param {number} season - Season number
   * @param {number} week - Week number
   */
  function setSeasonWeek(season, week) {
    seasonPill.innerHTML = `Season <strong>${season}</strong>`;
    weekPill.innerHTML = `Week <strong>${week}</strong>`;
  }
  
  /**
   * Set mode label
   * 
   * @param {string} mode - Mode text (will be uppercased)
   */
  function setMode(mode) {
    modeDiv.textContent = mode.toUpperCase();
  }
  
  /**
   * Set timer value
   * 
   * @param {number} seconds - Time in seconds
   */
  function setTimer(seconds) {
    timerDiv.textContent = formatTime(seconds);
  }
  
  /**
   * Register skip button callback
   * 
   * @param {Function} fn - Callback function
   */
  function onSkip(fn) {
    skipCallback = fn;
  }
  
  /**
   * Enable/disable skip button
   * 
   * @param {boolean} enabled - Whether skip is enabled
   */
  function setSkipEnabled(enabled) {
    skipBtn.disabled = !enabled;
  }
  
  /**
   * Destroy the HUD and clean up
   */
  function destroy() {
    skipBtn.removeEventListener('click', skipCallback);
    hudEl.remove();
  }
  
  // Return public API
  return {
    setBusy,
    setProgress,
    setSeasonWeek,
    setMode,
    setTimer,
    onSkip,
    setSkipEnabled,
    destroy
  };
}
