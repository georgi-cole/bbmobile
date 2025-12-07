/**
 * Juror Overlay Module
 * 
 * Provides an immersive fullscreen overlay for jury voting with:
 * - Animated SMS-like audience messages
 * - Floating emoji animations
 * - Quick-vote input with player name validation
 * - Visual feedback for votes (avatar flash, pulse effects)
 * - Mobile-first responsive design
 * - Full accessibility support
 * 
 * This module wraps the existing jury voting UI without changing game logic.
 * Quick votes are visual-only and don't affect actual vote tallies.
 */

export const JurorOverlay = (() => {
  'use strict';

  // State management
  let overlayElement = null;
  let isShowing = false;
  let messageIntervalId = null;
  let emojiIntervalId = null;
  let originalPanelContent = null;
  let focusedElementBeforeOpen = null;

  // Sample audience messages for visual effect
  const sampleMessages = [
    "I voted for {player1}, they were amazing! 🔥",
    "{player2} was on fire the entire time! 💯",
    "{player3} got robbed! 😤",
    "{player1} played the best strategic game 🧠",
    "Can't believe {player2} made it this far! 🎉",
    "{player3} deserves this win 100% 👑",
    "My pick is {player1} all the way! ⭐",
    "{player2}'s social game was incredible 🤝",
    "Nobody played like {player3}! 🏆",
    "{player1} won my heart ❤️",
    "Team {player2} forever! 💪",
    "{player3} is the true mastermind 🎯",
    "Voting for {player1} was easy! ✨",
    "{player2} controlled the whole house 🏠",
    "{player3} had the best comp wins 🥇"
  ];

  // Emoji pool for floating effects
  const emojiPool = ['🎉', '🔥', '⭐', '💯', '👑', '❤️', '💪', '✨', '🏆', '🎯', '😍', '🤩', '👏', '🙌', '💥'];

  /**
   * Get player list from window.game or use fallback
   */
  function getPlayerList() {
    try {
      // Try to get from window.game
      if (window.game && Array.isArray(window.game.players)) {
        return window.game.players
          .filter(p => p && !p.evicted && p.name)
          .map(p => ({
            id: p.id,
            name: p.name,
            avatarUrl: p.avatar || p.avatarUrl || getAvatarFallback(p.name)
          }));
      }

      // Fallback to sample list
      return [
        { id: 1, name: 'Alex', avatarUrl: getDicebearUrl('Alex') },
        { id: 2, name: 'Jordan', avatarUrl: getDicebearUrl('Jordan') },
        { id: 3, name: 'Taylor', avatarUrl: getDicebearUrl('Taylor') },
        { id: 4, name: 'Morgan', avatarUrl: getDicebearUrl('Morgan') }
      ];
    } catch (err) {
      console.warn('[JurorOverlay] Error getting player list:', err);
      return [
        { id: 1, name: 'Alex', avatarUrl: getDicebearUrl('Alex') },
        { id: 2, name: 'Jordan', avatarUrl: getDicebearUrl('Jordan') }
      ];
    }
  }

  /**
   * Get Dicebear avatar URL
   */
  function getDicebearUrl(seed) {
    return `https://api.dicebear.com/6.x/bottts/svg?seed=${encodeURIComponent(seed || 'player')}`;
  }

  /**
   * Get avatar fallback URL
   */
  function getAvatarFallback(name) {
    if (window.getAvatarFallback && typeof window.getAvatarFallback === 'function') {
      return window.getAvatarFallback(name);
    }
    return getDicebearUrl(name || 'player');
  }

  /**
   * Create overlay DOM structure
   */
  function createOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'juror-overlay hidden';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'juror-overlay-title');

    overlay.innerHTML = `
      <button class="juror-overlay__close" aria-label="Close voting overlay" title="Close">
        ×
      </button>
      
      <div class="juror-overlay__audience-messages" aria-hidden="true"></div>
      
      <div class="juror-overlay__header">
        <h2 class="juror-overlay__title" id="juror-overlay-title">Jury Voting</h2>
        <p class="juror-overlay__subtitle">Cast your vote for the winner</p>
      </div>
      
      <div class="juror-overlay__content" id="juror-overlay-content">
        <!-- Original jury voting UI will be moved here -->
      </div>
      
      <div class="juror-overlay__quick-vote">
        <h3>Quick Vote</h3>
        <form class="juror-overlay__quick-vote-form" id="quick-vote-form">
          <input 
            type="text" 
            class="juror-overlay__quick-vote-input" 
            id="quick-vote-input"
            placeholder="Enter player name..."
            autocomplete="off"
            aria-label="Player name for quick vote"
          />
          <button 
            type="submit" 
            class="juror-overlay__quick-vote-button"
            id="quick-vote-button"
          >
            Send Vote
          </button>
        </form>
        <div id="quick-vote-validation" role="alert" aria-live="polite"></div>
      </div>
    `;

    document.body.appendChild(overlay);
    return overlay;
  }

  /**
   * Show overlay with existing jury UI content
   */
  function show() {
    if (isShowing) {
      console.warn('[JurorOverlay] Already showing');
      return;
    }

    // Save currently focused element
    focusedElementBeforeOpen = document.activeElement;

    // Find existing jury panel
    const panel = document.getElementById('panel');
    const existingJuryUI = panel ? panel.querySelector('#humanJuryVote') : null;

    // Create overlay if it doesn't exist
    if (!overlayElement) {
      overlayElement = createOverlay();
      attachEventListeners();
    }

    // Move existing jury UI to overlay content if present
    const contentContainer = overlayElement.querySelector('#juror-overlay-content');
    if (existingJuryUI && contentContainer) {
      originalPanelContent = existingJuryUI.cloneNode(true);
      contentContainer.appendChild(existingJuryUI);
    }

    // Show overlay
    overlayElement.classList.remove('hidden');
    isShowing = true;

    // Start animations
    startAudienceMessages();
    startFloatingEmojis();

    // Focus management
    const closeButton = overlayElement.querySelector('.juror-overlay__close');
    if (closeButton) {
      closeButton.focus();
    }

    // Trap focus within overlay
    trapFocus(overlayElement);

    console.info('[JurorOverlay] Overlay shown');
  }

  /**
   * Hide overlay and restore original state
   */
  function hide() {
    if (!isShowing || !overlayElement) {
      return;
    }

    // Stop animations
    stopAudienceMessages();
    stopFloatingEmojis();

    // Restore original jury UI to panel if needed
    if (originalPanelContent) {
      const panel = document.getElementById('panel');
      if (panel) {
        const existingJuryUI = overlayElement.querySelector('#humanJuryVote');
        if (existingJuryUI) {
          panel.appendChild(existingJuryUI);
        }
      }
      originalPanelContent = null;
    }

    // Hide overlay
    overlayElement.classList.add('hidden');
    isShowing = false;

    // Restore focus
    if (focusedElementBeforeOpen && focusedElementBeforeOpen.focus) {
      focusedElementBeforeOpen.focus();
    }

    console.info('[JurorOverlay] Overlay hidden');
  }

  /**
   * Attach event listeners to overlay elements
   */
  function attachEventListeners() {
    if (!overlayElement) return;

    // Close button
    const closeButton = overlayElement.querySelector('.juror-overlay__close');
    if (closeButton) {
      closeButton.addEventListener('click', hide);
    }

    // Quick vote form
    const quickVoteForm = overlayElement.querySelector('#quick-vote-form');
    if (quickVoteForm) {
      quickVoteForm.addEventListener('submit', handleQuickVote);
    }

    // Escape key to close
    document.addEventListener('keydown', handleEscapeKey);

    // Click outside to close (optional, commented out for safety)
    // overlayElement.addEventListener('click', (e) => {
    //   if (e.target === overlayElement) {
    //     hide();
    //   }
    // });
  }

  /**
   * Handle escape key press
   */
  function handleEscapeKey(e) {
    if (e.key === 'Escape' && isShowing) {
      hide();
    }
  }

  /**
   * Handle quick vote submission
   */
  function handleQuickVote(e) {
    e.preventDefault();

    const input = overlayElement.querySelector('#quick-vote-input');
    const validationDiv = overlayElement.querySelector('#quick-vote-validation');
    const button = overlayElement.querySelector('#quick-vote-button');

    if (!input || !validationDiv) return;

    const playerName = input.value.trim();
    
    if (!playerName) {
      showValidation(validationDiv, 'Please enter a player name', 'error');
      return;
    }

    // Get player list and validate
    const players = getPlayerList();
    const matchedPlayer = players.find(p => 
      p.name.toLowerCase() === playerName.toLowerCase()
    );

    if (!matchedPlayer) {
      showValidation(
        validationDiv, 
        `Player "${playerName}" not found. Try: ${players.map(p => p.name).join(', ')}`,
        'error'
      );
      return;
    }

    // Valid vote - trigger visual effects
    showValidation(
      validationDiv,
      `Vote sent for ${matchedPlayer.name}! 🎉`,
      'success'
    );

    // Flash avatar if visible
    flashPlayerAvatar(matchedPlayer);

    // Add a custom audience message
    addAudienceMessage(`${matchedPlayer.name} got a vote from you! ⭐`, true);

    // Clear input
    input.value = '';

    // Briefly disable button
    if (button) {
      button.disabled = true;
      setTimeout(() => { button.disabled = false; }, 1000);
    }

    console.info('[JurorOverlay] Quick vote processed:', matchedPlayer.name);
  }

  /**
   * Show validation message
   */
  function showValidation(container, message, type) {
    container.innerHTML = '';
    const msgEl = document.createElement('div');
    msgEl.className = `juror-overlay__validation juror-overlay__validation--${type}`;
    msgEl.textContent = message;
    container.appendChild(msgEl);

    // Auto-clear after 4 seconds
    setTimeout(() => {
      if (container.contains(msgEl)) {
        msgEl.style.opacity = '0';
        setTimeout(() => msgEl.remove(), 300);
      }
    }, 4000);
  }

  /**
   * Flash player avatar for visual feedback
   */
  function flashPlayerAvatar(player) {
    // Try to find avatar in the overlay content
    const contentContainer = overlayElement.querySelector('#juror-overlay-content');
    if (!contentContainer) return;

    // Look for image elements that might be avatars
    const avatars = contentContainer.querySelectorAll('img');
    let targetAvatar = null;

    // Try to match by alt text or src containing player name
    for (const avatar of avatars) {
      const alt = (avatar.alt || '').toLowerCase();
      const src = (avatar.src || '').toLowerCase();
      const playerNameLower = player.name.toLowerCase();
      
      if (alt.includes(playerNameLower) || src.includes(playerNameLower)) {
        targetAvatar = avatar;
        break;
      }
    }

    if (targetAvatar) {
      targetAvatar.classList.add('avatar-flash');
      
      // Create pulse effect
      const pulse = document.createElement('div');
      pulse.className = 'vote-pulse';
      
      // Position relative to avatar
      const rect = targetAvatar.getBoundingClientRect();
      pulse.style.left = `${rect.left + rect.width / 2 - 20}px`;
      pulse.style.top = `${rect.top + rect.height / 2 - 20}px`;
      
      document.body.appendChild(pulse);
      
      // Cleanup
      setTimeout(() => {
        targetAvatar.classList.remove('avatar-flash');
      }, 800);
      
      setTimeout(() => {
        pulse.remove();
      }, 1000);
    }
  }

  /**
   * Start audience message animation stream
   */
  function startAudienceMessages() {
    const messagesContainer = overlayElement.querySelector('.juror-overlay__audience-messages');
    if (!messagesContainer) return;

    // Get player names for message interpolation
    const players = getPlayerList();

    // Create initial messages
    for (let i = 0; i < 3; i++) {
      setTimeout(() => addAudienceMessage(), i * 1000);
    }

    // Continue adding messages periodically
    messageIntervalId = setInterval(() => {
      addAudienceMessage();
    }, 3000);
  }

  /**
   * Add a single audience message
   */
  function addAudienceMessage(customMessage = null, isImportant = false) {
    const messagesContainer = overlayElement.querySelector('.juror-overlay__audience-messages');
    if (!messagesContainer) return;

    const players = getPlayerList();
    if (players.length === 0) return;

    // Create message element
    const message = document.createElement('div');
    message.className = 'audience-message';
    
    // Use custom message or pick random template
    let messageText;
    if (customMessage) {
      messageText = customMessage;
    } else {
      const template = sampleMessages[Math.floor(Math.random() * sampleMessages.length)];
      // Replace placeholders with random player names
      messageText = template
        .replace('{player1}', players[Math.floor(Math.random() * players.length)].name)
        .replace('{player2}', players[Math.floor(Math.random() * players.length)].name)
        .replace('{player3}', players[Math.floor(Math.random() * players.length)].name);
    }
    
    message.textContent = messageText;
    
    // Random horizontal position
    const leftPos = 5 + Math.random() * 70; // 5% to 75%
    message.style.left = `${leftPos}%`;
    
    // Start from bottom
    const startBottom = -50;
    message.style.bottom = `${startBottom}px`;
    
    if (isImportant) {
      message.style.background = 'rgba(0, 224, 204, 0.15)';
      message.style.borderColor = 'rgba(0, 224, 204, 0.4)';
    }
    
    messagesContainer.appendChild(message);
    
    // Remove after animation completes
    setTimeout(() => {
      message.remove();
    }, 8000);
  }

  /**
   * Stop audience messages
   */
  function stopAudienceMessages() {
    if (messageIntervalId) {
      clearInterval(messageIntervalId);
      messageIntervalId = null;
    }
  }

  /**
   * Start floating emoji animations
   */
  function startFloatingEmojis() {
    const messagesContainer = overlayElement.querySelector('.juror-overlay__audience-messages');
    if (!messagesContainer) return;

    // Create initial emojis
    for (let i = 0; i < 2; i++) {
      setTimeout(() => addFloatingEmoji(), i * 1500);
    }

    // Continue adding emojis periodically
    emojiIntervalId = setInterval(() => {
      addFloatingEmoji();
    }, 4000);
  }

  /**
   * Add a single floating emoji
   */
  function addFloatingEmoji() {
    const messagesContainer = overlayElement.querySelector('.juror-overlay__audience-messages');
    if (!messagesContainer) return;

    const emoji = document.createElement('span');
    emoji.className = 'floating-emoji';
    emoji.textContent = emojiPool[Math.floor(Math.random() * emojiPool.length)];
    
    // Random position
    const leftPos = 10 + Math.random() * 80; // 10% to 90%
    const bottomPos = 10 + Math.random() * 30; // 10% to 40%
    emoji.style.left = `${leftPos}%`;
    emoji.style.bottom = `${bottomPos}%`;
    
    // Random drift values
    const driftX = -20 + Math.random() * 40; // -20px to 20px
    const driftY = -100 - Math.random() * 50; // -100px to -150px
    const rotate = -20 + Math.random() * 40; // -20deg to 20deg
    
    emoji.style.setProperty('--drift-x', `${driftX}px`);
    emoji.style.setProperty('--drift-y', `${driftY}px`);
    emoji.style.setProperty('--rotate', `${rotate}deg`);
    
    messagesContainer.appendChild(emoji);
    
    // Remove after animation completes
    setTimeout(() => {
      emoji.remove();
    }, 6000);
  }

  /**
   * Stop floating emojis
   */
  function stopFloatingEmojis() {
    if (emojiIntervalId) {
      clearInterval(emojiIntervalId);
      emojiIntervalId = null;
    }
  }

  /**
   * Trap focus within overlay for accessibility
   */
  function trapFocus(element) {
    const focusableElements = element.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    if (focusableElements.length === 0) return;
    
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];
    
    const handleTabKey = (e) => {
      if (e.key !== 'Tab') return;
      
      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstFocusable) {
          lastFocusable.focus();
          e.preventDefault();
        }
      } else {
        // Tab
        if (document.activeElement === lastFocusable) {
          firstFocusable.focus();
          e.preventDefault();
        }
      }
    };
    
    element.addEventListener('keydown', handleTabKey);
  }

  /**
   * Cleanup function
   */
  function destroy() {
    hide();
    stopAudienceMessages();
    stopFloatingEmojis();
    
    if (overlayElement && overlayElement.parentNode) {
      overlayElement.remove();
    }
    
    overlayElement = null;
    document.removeEventListener('keydown', handleEscapeKey);
    
    console.info('[JurorOverlay] Destroyed');
  }

  // Public API
  return {
    show,
    hide,
    destroy,
    isShowing: () => isShowing
  };
})();

// Make globally available for compatibility
if (typeof window !== 'undefined') {
  window.JurorOverlay = JurorOverlay;
}
