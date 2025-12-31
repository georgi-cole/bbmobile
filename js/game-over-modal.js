// MODULE: game-over-modal.js
// Handles "Game Over" modal when human player is evicted before making jury

(function(global) {
  'use strict';

  /**
   * Calculate if an evicted player makes the jury house
   * Based on jury size and final placement
   * 
   * Math:
   * - Final 2 (1st and 2nd place) are finalists
   * - If jury has J people, jurors are placements J+2 down to 3
   * - First juror = (J + 2)th place
   * - Last juror = 3rd place
   * 
   * Note on placement calculation:
   * - When N players remain and one is evicted, they finish in Nth place
   * - Example: 9 players remain, one evicted = finishes 9th place
   * - This is consistent with Big Brother terminology
   * 
   * Examples:
   * - 7-person jury: 9th place (first juror) to 3rd place (last juror)
   * - 9-person jury: 11th place (first juror) to 3rd place (last juror)
   * 
   * @param {number} placement - The player's final placement (e.g., 9 = 9th place)
   * @param {number} jurySize - Size of the jury (default: 7)
   * @returns {boolean} - True if player makes jury, false otherwise
   */
  function makesJury(placement, jurySize = 7) {
    // Calculate jury range
    const firstJurorPlace = jurySize + 2;  // e.g., 7 + 2 = 9th place
    const lastJurorPlace = 3;              // Always 3rd place
    
    // Player makes jury if their placement is within jury range
    const isJuror = placement >= lastJurorPlace && placement <= firstJurorPlace;
    
    console.info(`[game-over] Placement: ${placement}, Jury range: ${firstJurorPlace}-${lastJurorPlace}, Makes jury: ${isJuror}`);
    
    return isJuror;
  }

  /**
   * Show Game Over modal for pre-jury eviction
   * Displays modal with Exit and New Season buttons
   * 
   * @param {Object} options - Modal options
   * @param {string} options.playerName - Name of evicted player
   * @param {number} options.placement - Final placement (e.g., 16th, 15th, etc.)
   * @param {number} options.jurySize - Size of jury (for display purposes)
   */
  async function showGameOverModal(options = {}) {
    const {
      playerName = 'You',
      placement = 0,
      jurySize = 7
    } = options;

    const firstJurorPlace = jurySize + 2;
    
    return new Promise((resolve) => {
      // Create overlay
      const overlay = document.createElement('div');
      overlay.className = 'game-over-modal-overlay';
      overlay.style.cssText = `
        position: fixed;
        inset: 0;
        background: rgba(4, 10, 18, 0.95);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 999999;
        opacity: 0;
        transition: opacity 0.4s ease;
      `;

      // Create modal content
      const modal = document.createElement('div');
      modal.className = 'game-over-modal';
      modal.style.cssText = `
        background: linear-gradient(145deg, #1a0a0a 0%, #2a1010 100%);
        border: 3px solid #8a2a2a;
        border-radius: 24px;
        padding: 48px 60px;
        text-align: center;
        box-shadow: 0 24px 72px -24px rgba(0, 0, 0, 0.95), 0 12px 32px -12px rgba(180, 0, 0, 0.6);
        max-width: 560px;
        width: 90%;
        transform: scale(0.85);
        transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        position: relative;
      `;

      // Emoji section
      const emojiContainer = document.createElement('div');
      emojiContainer.style.cssText = `
        font-size: 5rem;
        margin-bottom: 24px;
        line-height: 1;
      `;
      emojiContainer.textContent = '🚪';
      modal.appendChild(emojiContainer);

      // Title
      const titleEl = document.createElement('div');
      titleEl.style.cssText = `
        font-size: 2.5rem;
        font-weight: 800;
        color: #ffffff;
        margin-bottom: 16px;
        text-shadow: 0 3px 12px rgba(0, 0, 0, 0.6);
        letter-spacing: 0.5px;
        line-height: 1.2;
      `;
      titleEl.textContent = 'GAME OVER';
      modal.appendChild(titleEl);

      // Message
      const messageEl = document.createElement('div');
      messageEl.style.cssText = `
        font-size: 1.1rem;
        color: #d5b2b2;
        margin-top: 12px;
        line-height: 1.6;
        font-weight: 500;
        margin-bottom: 24px;
      `;
      messageEl.innerHTML = `
        <div style="margin-bottom: 12px;">
          <strong>${playerName}</strong> finished in <strong>${placement}${getOrdinalSuffix(placement)} place</strong>
        </div>
        <div style="font-size: 0.95rem; color: #b89999;">
          You were evicted before making the jury house.<br>
          (Jury starts at ${firstJurorPlace}${getOrdinalSuffix(firstJurorPlace)} place with a ${jurySize}-person jury)
        </div>
      `;
      modal.appendChild(messageEl);

      // Buttons
      const buttonsContainer = document.createElement('div');
      buttonsContainer.style.cssText = `
        display: flex;
        gap: 14px;
        justify-content: center;
        flex-wrap: wrap;
        margin-top: 28px;
      `;

      // New Season button (primary action)
      const newSeasonBtn = document.createElement('button');
      newSeasonBtn.className = 'game-over-btn-primary';
      newSeasonBtn.textContent = 'NEW SEASON';
      newSeasonBtn.style.cssText = `
        background: #3563a7;
        color: #d8e6f5;
        border: none;
        border-radius: 12px;
        padding: 14px 28px;
        font-weight: 700;
        letter-spacing: 0.8px;
        font-size: 0.85rem;
        cursor: pointer;
        box-shadow: 0 4px 10px -4px rgba(0, 0, 0, 0.7);
        transition: all 0.2s ease;
      `;
      newSeasonBtn.onmouseover = () => {
        newSeasonBtn.style.background = '#4574b8';
        newSeasonBtn.style.transform = 'translateY(-2px)';
      };
      newSeasonBtn.onmouseout = () => {
        newSeasonBtn.style.background = '#3563a7';
        newSeasonBtn.style.transform = 'translateY(0)';
      };

      // Exit button (secondary action)
      const exitBtn = document.createElement('button');
      exitBtn.className = 'game-over-btn-secondary';
      exitBtn.textContent = 'EXIT';
      exitBtn.style.cssText = `
        background: #993636;
        color: #d8e6f5;
        border: none;
        border-radius: 12px;
        padding: 14px 28px;
        font-weight: 700;
        letter-spacing: 0.8px;
        font-size: 0.85rem;
        cursor: pointer;
        box-shadow: 0 4px 10px -4px rgba(0, 0, 0, 0.7);
        transition: all 0.2s ease;
      `;
      exitBtn.onmouseover = () => {
        exitBtn.style.background = '#aa4747';
        exitBtn.style.transform = 'translateY(-2px)';
      };
      exitBtn.onmouseout = () => {
        exitBtn.style.background = '#993636';
        exitBtn.style.transform = 'translateY(0)';
      };

      buttonsContainer.appendChild(newSeasonBtn);
      buttonsContainer.appendChild(exitBtn);
      modal.appendChild(buttonsContainer);

      overlay.appendChild(modal);
      document.body.appendChild(overlay);

      // Trigger fade-in animation
      requestAnimationFrame(() => {
        overlay.style.opacity = '1';
        modal.style.transform = 'scale(1)';
      });

      // Handler to close modal
      const closeModal = () => {
        overlay.style.opacity = '0';
        modal.style.transform = 'scale(0.95)';
        setTimeout(() => {
          if (overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
          }
          resolve();
        }, 400);
      };

      // New Season button - starts a new game
      newSeasonBtn.addEventListener('click', () => {
        console.info('[game-over] NEW SEASON clicked');
        newSeasonBtn.disabled = true;
        exitBtn.disabled = true;
        
        closeModal();
        
        // Delegate to finale's new season flow (same logic as finale winner screen)
        setTimeout(() => {
          if (global.ProfileService && global.ProfileModal) {
            // Show profile modal for new season
            global.ProfileModal.show({
              autoCreate: false,
              onSelect: (profile) => {
                console.info('[game-over] profile selected:', profile);
                global.ProfileService.setCurrentProfile(profile);
                global.ProfileService.incrementSeason();
                startNewSeasonFlow();
              },
              onGuest: () => {
                console.info('[game-over] guest mode selected');
                global.ProfileService.setGuestMode();
                startNewSeasonFlow();
              }
            });
          } else {
            // Fallback: direct restart
            startNewSeasonFlow();
          }
        }, 200);
      });

      // Exit button - closes the modal and returns to game state
      exitBtn.addEventListener('click', () => {
        console.info('[game-over] EXIT clicked');
        closeModal();
      });
    });
  }

  /**
   * Helper: Start new season flow (adapted from finale.js)
   */
  function startNewSeasonFlow() {
    console.info('[game-over] starting new season flow');
    
    // Clear all competition locks
    try {
      if (global.CompLocks && typeof global.CompLocks.clearAllLocks === 'function') {
        global.CompLocks.clearAllLocks();
        console.info('[game-over] cleared all competition locks');
      }
    } catch(e) {
      console.warn('[game-over] failed to clear competition locks:', e);
    }
    
    // Clear logs for fresh season
    ['log','logGame','logSocial','logVote','logJury'].forEach(id=>{
      const el=document.getElementById(id);
      if(el) el.innerHTML='';
    });
    
    // Try to use modern API for smooth restart
    const API = global.Game || global;
    
    // Rebuild game
    if (typeof API.rebuildGame === 'function') {
      console.info('[game-over] calling rebuildGame(false)');
      API.rebuildGame(false);
    } else if (typeof API.buildCast === 'function') {
      console.info('[game-over] calling buildCast()');
      API.buildCast();
    } else {
      console.warn('[game-over] neither rebuildGame nor buildCast available, falling back to reload');
      location.reload();
      return;
    }
    
    // Start opening sequence after a brief delay
    setTimeout(() => {
      if (typeof API.startOpeningSequence === 'function') {
        console.info('[game-over] calling startOpeningSequence()');
        API.startOpeningSequence();
      } else {
        console.warn('[game-over] startOpeningSequence not available');
      }
    }, 60);
  }

  /**
   * Helper: Get ordinal suffix (1st, 2nd, 3rd, 4th, etc.)
   */
  function getOrdinalSuffix(num) {
    const j = num % 10;
    const k = num % 100;
    if (j === 1 && k !== 11) return 'st';
    if (j === 2 && k !== 12) return 'nd';
    if (j === 3 && k !== 13) return 'rd';
    return 'th';
  }

  // Expose to global
  global.GameOverModal = {
    makesJury,
    show: showGameOverModal
  };

  console.info('[game-over-modal] Game Over modal system initialized');

})(window);
