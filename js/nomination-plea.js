// MODULE: nomination-plea.js
// Nomination-specific plea module for making deals with HOH during nomination ceremony
// Provides in-UI modal interface with strategic options

(function(global) {
  'use strict';

  const NominationPlea = {};

  let currentModal = null;
  let keydownHandler = null;

  /**
   * Show nomination plea modal
   * @param {Object} options
   * @param {Object} options.nominee - Player making the plea
   * @param {Object} options.hoh - HOH player
   * @returns {Promise<Object>} Resolves with { influence, plea, successful } or { skipped: true }
   */
  function show(options) {
    const { nominee, hoh } = options;

    if (!nominee || !hoh) {
      console.error('[NominationPlea] Missing required options');
      return Promise.resolve({ skipped: true });
    }

    const timestamp = Date.now();
    console.info(`[NominationPlea] Plea opened at ${new Date(timestamp).toISOString()}`);

    // Plea options for nomination ceremony
    const pleaOptions = [
      {
        id: 'promise_support',
        text: 'Promise future support',
        description: 'Offer loyalty in exchange for safety'
      },
      {
        id: 'side_deal',
        text: 'Offer a side-deal',
        description: 'Propose mutual benefit arrangement'
      },
      {
        id: 'appeal_sympathy',
        text: 'Appeal to sympathy',
        description: 'Request compassion and understanding'
      },
      {
        id: 'trade_favor',
        text: 'Trade a favor',
        description: 'Offer something valuable in return'
      }
    ];

    return new Promise((resolve) => {
      try {
        // Create modal backdrop
        const modal = document.createElement('div');
        modal.className = 'nomination-plea-modal';
        modal.style.cssText = `
          position: fixed;
          inset: 0;
          z-index: 9999999;
          background: linear-gradient(135deg, rgba(20,25,40,0.97) 0%, rgba(15,18,30,0.98) 100%);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          justify-content: center;
          animation: modalFadeIn 0.3s ease;
          overflow-y: auto;
          padding: 20px;
        `;

        // Create content container
        const content = document.createElement('div');
        content.style.cssText = `
          background: linear-gradient(135deg, #1a2f44 0%, #243a50 100%);
          border-radius: 16px;
          padding: 32px;
          max-width: 500px;
          width: 90%;
          box-shadow: 0 20px 60px rgba(0,0,0,0.8);
          position: relative;
          border: 2px solid rgba(255, 215, 0, 0.3);
        `;

        // Header
        const header = document.createElement('div');
        header.style.cssText = `
          text-align: center;
          margin-bottom: 24px;
        `;

        const icon = document.createElement('div');
        icon.textContent = '🔑';
        icon.style.cssText = `
          font-size: 3rem;
          margin-bottom: 12px;
        `;
        header.appendChild(icon);

        const title = document.createElement('h2');
        title.textContent = 'Make Your Plea to the HOH';
        title.style.cssText = `
          font-size: 1.5rem;
          font-weight: 700;
          color: #ffffff;
          margin: 0 0 8px 0;
        `;
        header.appendChild(title);

        const bodyText = document.createElement('p');
        bodyText.textContent = 'Offer the Head of Household a deal or appeal for safety this week.';
        bodyText.style.cssText = `
          font-size: 0.95rem;
          color: #b2c2d5;
          margin: 0;
          line-height: 1.5;
        `;
        header.appendChild(bodyText);

        content.appendChild(header);

        // Options container
        const optionsContainer = document.createElement('div');
        optionsContainer.style.cssText = `
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 20px;
        `;

        // Create option buttons
        let selectedOption = null;
        let customTextArea = null;

        pleaOptions.forEach(option => {
          const optionBtn = document.createElement('button');
          optionBtn.className = 'plea-option-btn';
          optionBtn.style.cssText = `
            padding: 14px 20px;
            background: rgba(58, 123, 213, 0.2);
            border: 2px solid rgba(58, 123, 213, 0.4);
            border-radius: 8px;
            color: #ffffff;
            cursor: pointer;
            font-size: 0.95rem;
            font-weight: 500;
            transition: all 0.2s;
            text-align: left;
          `;

          const optionText = document.createElement('div');
          optionText.style.cssText = `
            font-weight: 600;
            margin-bottom: 4px;
          `;
          optionText.textContent = option.text;
          optionBtn.appendChild(optionText);

          const optionDesc = document.createElement('div');
          optionDesc.style.cssText = `
            font-size: 0.85rem;
            color: #8a9fb5;
            font-style: italic;
          `;
          optionDesc.textContent = option.description;
          optionBtn.appendChild(optionDesc);

          optionBtn.addEventListener('mouseenter', () => {
            if (selectedOption !== option) {
              optionBtn.style.background = 'rgba(58, 123, 213, 0.3)';
              optionBtn.style.borderColor = 'rgba(58, 123, 213, 0.6)';
            }
          });

          optionBtn.addEventListener('mouseleave', () => {
            if (selectedOption !== option) {
              optionBtn.style.background = 'rgba(58, 123, 213, 0.2)';
              optionBtn.style.borderColor = 'rgba(58, 123, 213, 0.4)';
            }
          });

          optionBtn.addEventListener('click', () => {
            // Deselect all
            optionsContainer.querySelectorAll('.plea-option-btn').forEach(btn => {
              btn.style.border = '2px solid rgba(58, 123, 213, 0.4)';
              btn.style.background = 'rgba(58, 123, 213, 0.2)';
            });

            // Select this one
            optionBtn.style.border = '2px solid rgba(255, 215, 0, 0.6)';
            optionBtn.style.background = 'rgba(58, 123, 213, 0.4)';
            selectedOption = option;
          });

          optionsContainer.appendChild(optionBtn);
        });

        content.appendChild(optionsContainer);

        // Custom textarea
        customTextArea = document.createElement('textarea');
        customTextArea.placeholder = 'Or write your own custom message...';
        customTextArea.setAttribute('aria-label', 'Custom plea message to the Head of Household');
        customTextArea.maxLength = 200;
        customTextArea.rows = 3;
        customTextArea.style.cssText = `
          width: 100%;
          padding: 12px;
          margin-bottom: 20px;
          font-size: 0.95rem;
          border: 2px solid rgba(58, 123, 213, 0.4);
          border-radius: 8px;
          background: rgba(20,20,40,0.6);
          color: #cedbeb;
          font-family: inherit;
          resize: vertical;
          box-sizing: border-box;
        `;
        content.appendChild(customTextArea);

        // Buttons container
        const buttonsContainer = document.createElement('div');
        buttonsContainer.style.cssText = `
          display: flex;
          gap: 12px;
          justify-content: center;
        `;

        // Submit button
        const submitBtn = document.createElement('button');
        submitBtn.className = 'plea-submit-btn';
        submitBtn.textContent = 'Submit';
        submitBtn.setAttribute('aria-label', 'Submit your plea to the Head of Household');
        submitBtn.style.cssText = `
          padding: 12px 32px;
          background: #5aa575;
          border: none;
          border-radius: 6px;
          color: white;
          cursor: pointer;
          font-size: 1rem;
          font-weight: 600;
          transition: all 0.2s;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        `;
        submitBtn.addEventListener('mouseenter', () => {
          submitBtn.style.background = '#6ab585';
        });
        submitBtn.addEventListener('mouseleave', () => {
          submitBtn.style.background = '#5aa575';
        });
        submitBtn.addEventListener('click', () => {
          handleSubmit(modal, resolve, selectedOption, customTextArea, nominee, hoh, timestamp);
        });
        buttonsContainer.appendChild(submitBtn);

        // Skip button
        const skipBtn = document.createElement('button');
        skipBtn.className = 'plea-skip-btn';
        skipBtn.textContent = 'Skip';
        skipBtn.setAttribute('aria-label', 'Skip making a plea and continue without offering a deal');
        skipBtn.style.cssText = `
          padding: 12px 32px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 6px;
          color: rgba(255, 255, 255, 0.8);
          cursor: pointer;
          font-size: 1rem;
          font-weight: 600;
          transition: all 0.2s;
        `;
        skipBtn.addEventListener('mouseenter', () => {
          skipBtn.style.borderColor = 'rgba(255, 255, 255, 0.5)';
          skipBtn.style.color = '#ffffff';
        });
        skipBtn.addEventListener('mouseleave', () => {
          skipBtn.style.borderColor = 'rgba(255, 255, 255, 0.3)';
          skipBtn.style.color = 'rgba(255, 255, 255, 0.8)';
        });
        skipBtn.addEventListener('click', () => {
          const closeTimestamp = Date.now();
          console.info(`[NominationPlea] Plea skipped at ${new Date(closeTimestamp).toISOString()} (duration: ${closeTimestamp - timestamp}ms)`);
          cleanup(modal);
          resolve({ skipped: true });
        });
        buttonsContainer.appendChild(skipBtn);

        content.appendChild(buttonsContainer);

        modal.appendChild(content);
        document.body.appendChild(modal);
        currentModal = modal;

        // Focus trap
        content.setAttribute('tabindex', '-1');
        content.focus();

        // Escape key handler
        keydownHandler = (e) => {
          if (e.key === 'Escape') {
            const closeTimestamp = Date.now();
            console.info(`[NominationPlea] Plea closed via Escape at ${new Date(closeTimestamp).toISOString()} (duration: ${closeTimestamp - timestamp}ms)`);
            cleanup(modal);
            resolve({ skipped: true });
          }
        };
        document.addEventListener('keydown', keydownHandler);

      } catch (err) {
        console.error('[NominationPlea] Error rendering plea UI:', err);
        const closeTimestamp = Date.now();
        console.info(`[NominationPlea] Plea failed at ${new Date(closeTimestamp).toISOString()} (duration: ${closeTimestamp - timestamp}ms)`);
        resolve({ skipped: true });
      }
    });
  }

  /**
   * Handle plea submission
   */
  function handleSubmit(modal, resolve, selectedOption, customTextArea, nominee, hoh, openTimestamp) {
    const customText = customTextArea.value.trim();

    // Determine which option/text to use
    let pleaText;
    let optionId;

    if (customText) {
      pleaText = customText;
      optionId = 'custom';
    } else if (selectedOption) {
      pleaText = selectedOption.text;
      optionId = selectedOption.id;
    } else {
      // No selection and no custom text
      alert('Please select an option or enter a custom message');
      return;
    }

    // Calculate influence
    const influence = computeInfluence(optionId, customText);
    const successful = Math.random() < (0.4 + influence * 2); // 40-76% chance

    const closeTimestamp = Date.now();
    console.info(`[NominationPlea] Plea submitted at ${new Date(closeTimestamp).toISOString()} (duration: ${closeTimestamp - openTimestamp}ms)`, {
      optionId,
      influence,
      successful
    });

    cleanup(modal);
    resolve({
      influence,
      plea: pleaText,
      successful
    });
  }

  /**
   * Compute influence value for a plea option/custom text
   * Returns a small influence value (0 to 0.18) with random factor
   * @param {string} optionId - Option identifier
   * @param {string} customText - Custom plea text (if used)
   * @returns {number} Influence value between 0 and 0.18
   */
  function computeInfluence(optionId, customText) {
    let baseInfluence;

    // Base influence by option type
    switch (optionId) {
      case 'promise_support':
        baseInfluence = 0.12;
        break;
      case 'side_deal':
        baseInfluence = 0.15;
        break;
      case 'appeal_sympathy':
        baseInfluence = 0.10;
        break;
      case 'trade_favor':
        baseInfluence = 0.13;
        break;
      case 'custom':
        baseInfluence = 0.08;
        // Bonus for longer custom messages (shows effort)
        if (customText && customText.length > 50) {
          baseInfluence += 0.04;
        }
        break;
      default:
        baseInfluence = 0.08;
    }

    // Add small random factor (0 to 0.06)
    const randomFactor = Math.random() * 0.06;
    const totalInfluence = baseInfluence + randomFactor;

    // Cap at 0.18 to keep it small and non-deterministic
    return Math.min(0.18, totalInfluence);
  }

  /**
   * Clean up modal and event listeners
   */
  function cleanup(modal) {
    if (modal && modal.parentNode) {
      modal.style.opacity = '0';
      setTimeout(() => {
        if (modal.parentNode) {
          modal.parentNode.removeChild(modal);
        }
      }, 300);
    }
    
    if (keydownHandler) {
      document.removeEventListener('keydown', keydownHandler);
      keydownHandler = null;
    }
    
    currentModal = null;
  }

  /**
   * Check if plea is currently active
   * @returns {boolean}
   */
  function isActive() {
    return currentModal !== null;
  }

  // Public API
  NominationPlea.show = show;
  NominationPlea.cleanup = cleanup;
  NominationPlea.isActive = isActive;

  // Export to global
  global.NominationPlea = NominationPlea;

})(window);
