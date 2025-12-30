// MODULE: final-plea.js
// Final Plea mechanic for Final 3 nominees before AI HOH makes eviction decision
// Provides strategic argument options with 20% swing chance to influence AI decision

(function(global) {
  'use strict';

  const FinalPlea = {};

  // Strategic argument options
  const PLEA_OPTIONS = [
    {
      id: 'weaker',
      text: "I'm a weaker competitor—take me and you'll win",
      weight: 0.7,
      description: 'Appeal to their competitive advantage'
    },
    {
      id: 'alliance',
      text: "We've been allies all season—honor our bond",
      weight: 1.0,
      description: 'Remind them of your loyalty'
    },
    {
      id: 'other_stronger',
      text: 'The other player has a stronger jury case',
      weight: 0.8,
      description: 'Suggest the other is more dangerous'
    },
    {
      id: 'promise',
      text: "I'll vote for you in the finale if you save me",
      weight: 0.6,
      description: 'Make a jury vote promise'
    },
    {
      id: 'custom',
      text: 'Custom message...',
      weight: 0.5,
      description: 'Write your own plea'
    }
  ];

  let currentModal = null;

  /**
   * Show Final Plea modal
   * @param {Object} options
   * @param {Object} options.nominee - Player object making the plea
   * @param {Object} options.hoh - AI HOH player object
   * @param {Object} options.otherNominee - The other nominee player object
   * @param {Function} options.onSubmit - Callback with plea data
   */
  function show(options) {
    const {
      nominee,
      hoh,
      otherNominee,
      onSubmit
    } = options;

    if (!nominee || !hoh || !otherNominee) {
      console.error('[FinalPlea] Missing required options');
      return;
    }

    const g = global.game;
    if (g?.__pleaSubmitted) {
      console.info('[FinalPlea] Plea already submitted, skipping');
      if (onSubmit) onSubmit(null);
      return;
    }

    // Pause phase timer during plea
    if (typeof global.pausePhaseTimer === 'function') {
      global.pausePhaseTimer();
    }

    // Create modal backdrop
    const modal = document.createElement('div');
    modal.className = 'final-plea-modal';
    modal.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 999999;
      background: linear-gradient(135deg, rgba(20,20,40,0.97) 0%, rgba(10,10,30,0.98) 100%);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      animation: modalFadeIn 0.4s ease;
      overflow-y: auto;
      padding: 20px;
    `;

    // Create content container
    const content = document.createElement('div');
    content.style.cssText = `
      background: linear-gradient(145deg, rgba(40,40,80,0.95) 0%, rgba(25,25,50,0.95) 100%);
      border: 2px solid #ffdc8b;
      border-radius: 16px;
      padding: 32px;
      max-width: 600px;
      width: 100%;
      text-align: center;
      box-shadow: 0 12px 40px rgba(0,0,0,0.6);
    `;

    // Icon
    const icon = document.createElement('div');
    icon.textContent = '🗣️';
    icon.style.cssText = `
      font-size: 64px;
      margin-bottom: 16px;
    `;
    content.appendChild(icon);

    // Title
    const title = document.createElement('h2');
    title.textContent = 'Make Your Final Plea';
    title.style.cssText = `
      font-size: 1.8rem;
      font-weight: 700;
      color: #ffdc8b;
      margin: 0 0 16px 0;
    `;
    content.appendChild(title);

    // Description
    const desc = document.createElement('p');
    desc.innerHTML = `${hoh.name} will decide who to evict.<br>Make your case to stay in the game.`;
    desc.style.cssText = `
      color: #cedbeb;
      margin: 0 0 24px 0;
      font-size: 1rem;
      line-height: 1.5;
    `;
    content.appendChild(desc);

    // Options container
    const optionsContainer = document.createElement('div');
    optionsContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 24px;
      text-align: left;
    `;

    let selectedOption = null;
    let customTextArea = null;

    PLEA_OPTIONS.forEach(option => {
      const optionBtn = document.createElement('button');
      optionBtn.className = 'plea-option';
      optionBtn.style.cssText = `
        background: rgba(30,30,60,0.8);
        border: 2px solid #6b7a99;
        border-radius: 12px;
        padding: 16px;
        text-align: left;
        cursor: pointer;
        transition: all 0.2s ease;
        color: #cedbeb;
      `;

      const optionText = document.createElement('div');
      optionText.style.cssText = `
        font-size: 1rem;
        font-weight: 600;
        margin-bottom: 4px;
      `;
      optionText.textContent = option.text;
      optionBtn.appendChild(optionText);

      const optionDesc = document.createElement('div');
      optionDesc.style.cssText = `
        font-size: 0.85rem;
        color: #8a9ab8;
        font-style: italic;
      `;
      optionDesc.textContent = option.description;
      optionBtn.appendChild(optionDesc);

      optionBtn.onclick = () => {
        // Deselect all
        optionsContainer.querySelectorAll('.plea-option').forEach(btn => {
          btn.style.border = '2px solid #6b7a99';
          btn.style.background = 'rgba(30,30,60,0.8)';
        });

        // Select this one
        optionBtn.style.border = '2px solid #ffdc8b';
        optionBtn.style.background = 'rgba(40,40,70,0.9)';
        selectedOption = option;

        // Show/hide custom text area
        if (option.id === 'custom') {
          if (!customTextArea) {
            customTextArea = document.createElement('textarea');
            customTextArea.placeholder = 'Enter your custom plea...';
            customTextArea.maxLength = 200;
            customTextArea.rows = 3;
            customTextArea.style.cssText = `
              width: 100%;
              padding: 12px;
              margin-top: 12px;
              font-size: 0.95rem;
              border: 2px solid #6b7a99;
              border-radius: 8px;
              background: rgba(20,20,40,0.9);
              color: #cedbeb;
              font-family: inherit;
              resize: vertical;
            `;
            optionBtn.appendChild(customTextArea);
          }
          customTextArea.style.display = 'block';
          customTextArea.focus();
        } else if (customTextArea) {
          customTextArea.style.display = 'none';
        }
      };

      optionsContainer.appendChild(optionBtn);
    });

    content.appendChild(optionsContainer);

    // Submit button
    const submitBtn = document.createElement('button');
    submitBtn.className = 'btn primary';
    submitBtn.textContent = 'Submit Plea';
    submitBtn.style.cssText = `
      padding: 12px 32px;
      font-size: 1.1rem;
      font-weight: 600;
      margin-right: 12px;
    `;
    submitBtn.onclick = () => {
      if (!selectedOption) {
        alert('Please select a plea option');
        return;
      }

      let pleaText = selectedOption.text;
      if (selectedOption.id === 'custom' && customTextArea) {
        pleaText = customTextArea.value.trim();
        if (!pleaText) {
          alert('Please enter your custom plea');
          return;
        }
      }

      handlePleaSubmission({
        nominee,
        hoh,
        otherNominee,
        selectedOption,
        pleaText,
        onSubmit
      });
    };

    // Skip button
    const skipBtn = document.createElement('button');
    skipBtn.className = 'btn';
    skipBtn.textContent = 'Skip Plea';
    skipBtn.style.cssText = `
      padding: 12px 32px;
      font-size: 1.1rem;
    `;
    skipBtn.onclick = () => {
      cleanup();
      if (typeof global.resumePhaseTimer === 'function') {
        global.resumePhaseTimer();
      }
      if (onSubmit) onSubmit(null);
    };

    const btnContainer = document.createElement('div');
    btnContainer.style.cssText = `
      display: flex;
      justify-content: center;
      gap: 12px;
      margin-top: 24px;
    `;
    btnContainer.appendChild(submitBtn);
    btnContainer.appendChild(skipBtn);
    content.appendChild(btnContainer);

    // Info note
    const infoNote = document.createElement('div');
    infoNote.style.cssText = `
      margin-top: 20px;
      padding: 12px;
      background: rgba(255,220,139,0.1);
      border: 1px solid rgba(255,220,139,0.3);
      border-radius: 8px;
      font-size: 0.85rem;
      color: #8a9ab8;
    `;
    infoNote.textContent = 'Your plea has a chance to influence the HOH\'s decision';
    content.appendChild(infoNote);

    modal.appendChild(content);
    document.body.appendChild(modal);
    currentModal = modal;

    return modal;
  }

  /**
   * Handle plea submission and calculate influence
   */
  function handlePleaSubmission(data) {
    const { nominee, hoh, otherNominee, selectedOption, pleaText, onSubmit } = data;
    const g = global.game;

    if (g) {
      g.__pleaSubmitted = true;
    }

    // Disable buttons
    if (currentModal) {
      const buttons = currentModal.querySelectorAll('button');
      buttons.forEach(btn => btn.disabled = true);
    }

    // Show "considering" UI
    showConsideringUI(() => {
      // Calculate influence
      const influence = calculateInfluence({
        nominee,
        hoh,
        otherNominee,
        selectedOption
      });

      // Emit event
      if (g?.bus) {
        g.bus.emit('plea:submitted', {
          nominee: nominee.id,
          hoh: hoh.id,
          plea: pleaText,
          influence
        });
      }

      cleanup();

      // Resume timer
      if (typeof global.resumePhaseTimer === 'function') {
        global.resumePhaseTimer();
      }

      // Callback with influence data
      if (onSubmit) {
        onSubmit({
          plea: pleaText,
          influence,
          successful: influence > 0
        });
      }
    });
  }

  /**
   * Show "considering" UI with animation
   */
  function showConsideringUI(callback) {
    if (!currentModal) {
      if (callback) callback();
      return;
    }

    const content = currentModal.querySelector('div');
    if (!content) {
      if (callback) callback();
      return;
    }

    // Fade out current content
    content.style.transition = 'opacity 0.3s ease';
    content.style.opacity = '0';

    setTimeout(() => {
      content.innerHTML = '';
      content.style.opacity = '1';

      // Icon
      const icon = document.createElement('div');
      icon.textContent = '🤔';
      icon.style.cssText = `
        font-size: 72px;
        margin-bottom: 20px;
        animation: pulse 1.5s ease infinite;
      `;
      content.appendChild(icon);

      // Message
      const msg = document.createElement('div');
      msg.style.cssText = `
        font-size: 1.3rem;
        color: #ffdc8b;
        font-weight: 600;
        margin-bottom: 12px;
      `;
      msg.textContent = 'Considering your plea...';
      content.appendChild(msg);

      // Animated dots
      const dots = document.createElement('div');
      dots.style.cssText = `
        font-size: 1.5rem;
        color: #cedbeb;
        animation: pulse 1s ease infinite;
      `;
      dots.textContent = '• • •';
      content.appendChild(dots);

      // Wait 2-3 seconds before resolving
      setTimeout(() => {
        if (callback) callback();
      }, 2000 + Math.random() * 1000);
    }, 300);
  }

  /**
   * Calculate plea influence on HOH decision
   * Returns swing value (0 to 0.2 range, representing up to 20% influence)
   * @returns {number} Influence value 0-0.2
   */
  function calculateInfluence(data) {
    const { nominee, hoh, selectedOption } = data;
    // Note: otherNominee available in data but not used in calculation

    // Base swing chance
    let influence = 0;

    // Factor 1: Affinity with HOH (40% weight)
    const affinity = calculateAffinity(nominee, hoh);
    influence += affinity * 0.08; // Up to 0.08 from affinity

    // Factor 2: HOH persona traits (30% weight)
    const personalityFactor = calculatePersonalityFactor(hoh, selectedOption);
    influence += personalityFactor * 0.06; // Up to 0.06 from personality

    // Factor 3: Argument strength (30% weight)
    const argumentStrength = selectedOption.weight;
    influence += (argumentStrength / 1.0) * 0.06; // Up to 0.06 from argument

    // Cap at 20% (0.2)
    influence = Math.min(influence, 0.2);

    console.info('[FinalPlea] Calculated influence:', {
      nominee: nominee.name,
      hoh: hoh.name,
      affinity,
      personalityFactor,
      argumentStrength,
      totalInfluence: influence
    });

    return influence;
  }

  /**
   * Calculate affinity between nominee and HOH
   */
  function calculateAffinity(nominee, hoh /*, _game */) {
    // Try to get affinity from social relations
    if (global.SocialRelations?.getAffinity) {
      try {
        const affinity = global.SocialRelations.getAffinity(nominee.id, hoh.id);
        return Math.max(0, Math.min(1, affinity)); // Normalize to 0-1
      } catch (e) {
        console.warn('[FinalPlea] Error getting affinity:', e);
      }
    }

    // Fallback: use basic relationship score if available
    if (nominee.relationships && nominee.relationships[hoh.id]) {
      const rel = nominee.relationships[hoh.id];
      return Math.max(0, Math.min(1, rel / 100)); // Assume 0-100 scale
    }

    // Default: medium affinity
    return 0.5;
  }

  /**
   * Calculate personality factor based on HOH traits and plea type
   */
  function calculatePersonalityFactor(hoh, selectedOption) {
    let factor = 0.5; // Base

    // Check if HOH has personality traits
    const loyalty = hoh.loyalty || 0.5;
    const aggression = hoh.aggression || 0.5;
    const compBeast = hoh.compBeast || 0.5;

    // Adjust based on plea type
    if (selectedOption.id === 'alliance') {
      // Loyalty matters for alliance plea
      factor = loyalty;
    } else if (selectedOption.id === 'weaker') {
      // Comp beasts might like taking weaker players
      factor = compBeast;
    } else if (selectedOption.id === 'other_stronger') {
      // Strategic players respond to threat assessment
      factor = 1.0 - aggression; // Less aggressive = more strategic
    } else if (selectedOption.id === 'promise') {
      // Varies by loyalty (loyal players value promises)
      factor = loyalty * 0.8;
    } else {
      // Custom or default
      factor = 0.5;
    }

    return Math.max(0, Math.min(1, factor));
  }

  /**
   * Clean up modal
   */
  function cleanup() {
    if (currentModal) {
      currentModal.remove();
      currentModal = null;
    }
  }

  /**
   * Check if plea is active
   */
  function isActive() {
    return currentModal !== null;
  }

  // Public API
  FinalPlea.show = show;
  FinalPlea.cleanup = cleanup;
  FinalPlea.isActive = isActive;
  FinalPlea.calculateInfluence = calculateInfluence;

  // Export to global
  global.FinalPlea = FinalPlea;

})(window);
