// MODULE: minigames/rules-modal.js
// Full-screen accessible rules modal for minigames
// Provides window.showMinigameRules(key) and window.attachRulesButton(playBtn, key)

(function(g){
  'use strict';

  let currentModal = null;
  let lastFocusedElement = null;

  /**
   * Show minigame rules in a full-screen modal dialog
   * @param {string} key - Minigame registry key
   */
  function showMinigameRules(key){
    // Check if rules registry is available
    if(!g.MinigameRulesRegistry){
      console.error('[RulesModal] MinigameRulesRegistry not loaded');
      return;
    }

    // Get rules from registry
    const rules = g.MinigameRulesRegistry.getRules(key);
    
    // Store currently focused element to restore later
    lastFocusedElement = document.activeElement;

    // Close existing modal if any
    if(currentModal){
      closeModal();
    }

    // Create modal container
    const backdrop = document.createElement('div');
    backdrop.className = 'rules-modal-backdrop';
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');
    backdrop.setAttribute('aria-labelledby', 'rules-modal-title');
    backdrop.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.85);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      animation: fadeIn 0.2s ease;
    `;

    // Create modal content container
    const modal = document.createElement('div');
    modal.className = 'rules-modal-content';
    modal.style.cssText = `
      background: #0d151f;
      border: 2px solid #2a4d6e;
      border-radius: 12px;
      max-width: 600px;
      width: 100%;
      max-height: 85vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
      animation: slideUp 0.3s ease;
    `;

    // Header with title and close button
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid #2a4d6e;
      flex-shrink: 0;
    `;

    const title = document.createElement('h2');
    title.id = 'rules-modal-title';
    title.style.cssText = `
      margin: 0;
      font-size: 1.5rem;
      color: #83bfff;
      font-weight: bold;
    `;

    // Check if rules exist
    if(!rules){
      // Fallback for missing rules
      title.textContent = 'Rules Not Available';
      
      const fallbackBody = document.createElement('div');
      fallbackBody.style.cssText = `
        padding: 40px 20px;
        text-align: center;
        color: #95a9c0;
        flex: 1;
        overflow-y: auto;
      `;
      
      const fallbackIcon = document.createElement('div');
      fallbackIcon.textContent = '📋';
      fallbackIcon.style.cssText = `
        font-size: 4rem;
        margin-bottom: 16px;
        opacity: 0.5;
      `;
      
      const fallbackText = document.createElement('p');
      fallbackText.textContent = 'Rules for this minigame have not been authored yet. Check back soon!';
      fallbackText.style.cssText = `
        font-size: 1rem;
        line-height: 1.6;
        margin: 0;
      `;
      
      fallbackBody.appendChild(fallbackIcon);
      fallbackBody.appendChild(fallbackText);
      
      const closeBtn = createCloseButton();
      header.appendChild(title);
      header.appendChild(closeBtn);
      modal.appendChild(header);
      modal.appendChild(fallbackBody);
      backdrop.appendChild(modal);
      document.body.appendChild(backdrop);
      
      currentModal = backdrop;
      
      // Focus close button
      closeBtn.focus();
      
      // Set up event listeners
      setupModalListeners(backdrop, closeBtn);
      
      return;
    }

    title.textContent = rules.title || 'Game Rules';

    const closeBtn = createCloseButton();

    header.appendChild(title);
    header.appendChild(closeBtn);

    // Scrollable body
    const body = document.createElement('div');
    body.style.cssText = `
      padding: 20px;
      overflow-y: auto;
      flex: 1;
      color: #e3ecf5;
    `;

    // Render sections
    rules.sections.forEach(function(section){
      const sectionDiv = document.createElement('div');
      sectionDiv.style.cssText = `
        margin-bottom: 24px;
      `;

      // Section heading
      const heading = document.createElement('h3');
      heading.textContent = section.h;
      heading.style.cssText = `
        margin: 0 0 12px 0;
        font-size: 1.2rem;
        color: #5bd68a;
        font-weight: 700;
      `;
      sectionDiv.appendChild(heading);

      // Paragraphs
      if(section.p && section.p.length > 0){
        section.p.forEach(function(para){
          const p = document.createElement('p');
          p.textContent = para;
          p.style.cssText = `
            margin: 0 0 10px 0;
            line-height: 1.6;
            color: #b6c9dc;
          `;
          sectionDiv.appendChild(p);
        });
      }

      // List
      if(section.list && section.list.length > 0){
        const ul = document.createElement('ul');
        ul.style.cssText = `
          margin: 0;
          padding-left: 20px;
          line-height: 1.6;
          color: #b6c9dc;
        `;
        section.list.forEach(function(item){
          const li = document.createElement('li');
          li.textContent = item;
          li.style.cssText = `
            margin: 6px 0;
          `;
          ul.appendChild(li);
        });
        sectionDiv.appendChild(ul);
      }

      body.appendChild(sectionDiv);
    });

    // Assemble modal
    modal.appendChild(header);
    modal.appendChild(body);
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    currentModal = backdrop;

    // Focus close button (first focusable element)
    closeBtn.focus();

    // Set up event listeners
    setupModalListeners(backdrop, closeBtn);
  }

  /**
   * Create close button with consistent styling
   * @returns {HTMLElement} Close button element
   */
  function createCloseButton(){
    const closeBtn = document.createElement('button');
    closeBtn.className = 'rules-modal-close';
    closeBtn.textContent = '×';
    closeBtn.setAttribute('aria-label', 'Close rules');
    closeBtn.style.cssText = `
      width: 44px;
      height: 44px;
      min-width: 44px;
      min-height: 44px;
      background: rgba(255, 107, 157, 0.2);
      border: 1px solid #ff6b9d;
      border-radius: 8px;
      color: #ff6b9d;
      font-size: 2rem;
      line-height: 1;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      transition: all 0.2s;
      flex-shrink: 0;
    `;
    
    closeBtn.addEventListener('mouseenter', function(){
      closeBtn.style.background = 'rgba(255, 107, 157, 0.4)';
      closeBtn.style.transform = 'scale(1.05)';
    });
    
    closeBtn.addEventListener('mouseleave', function(){
      closeBtn.style.background = 'rgba(255, 107, 157, 0.2)';
      closeBtn.style.transform = 'scale(1)';
    });
    
    closeBtn.addEventListener('click', closeModal);
    
    return closeBtn;
  }

  /**
   * Set up modal event listeners
   * @param {HTMLElement} backdrop - Backdrop element
   * @param {HTMLElement} closeBtn - Close button element
   */
  function setupModalListeners(backdrop, closeBtn){
    // Close on backdrop click
    backdrop.addEventListener('click', function(e){
      if(e.target === backdrop){
        closeModal();
      }
    });

    // Close on ESC key
    const escHandler = function(e){
      if(e.key === 'Escape' || e.keyCode === 27){
        closeModal();
      }
    };
    document.addEventListener('keydown', escHandler);
    
    // Store handler for cleanup
    backdrop._escHandler = escHandler;

    // Focus trap
    const focusableElements = backdrop.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    if(focusableElements.length > 0){
      const firstFocusable = focusableElements[0];
      const lastFocusable = focusableElements[focusableElements.length - 1];

      const trapHandler = function(e){
        if(e.key === 'Tab' || e.keyCode === 9){
          if(e.shiftKey){
            // Shift + Tab
            if(document.activeElement === firstFocusable){
              e.preventDefault();
              lastFocusable.focus();
            }
          } else {
            // Tab
            if(document.activeElement === lastFocusable){
              e.preventDefault();
              firstFocusable.focus();
            }
          }
        }
      };
      
      backdrop.addEventListener('keydown', trapHandler);
      backdrop._trapHandler = trapHandler;
    }
  }

  /**
   * Close the current modal
   */
  function closeModal(){
    if(!currentModal){
      return;
    }

    // Remove event listeners
    if(currentModal._escHandler){
      document.removeEventListener('keydown', currentModal._escHandler);
    }

    // Remove modal from DOM
    currentModal.remove();
    currentModal = null;

    // Restore focus to the element that opened the modal
    if(lastFocusedElement && typeof lastFocusedElement.focus === 'function'){
      try{
        lastFocusedElement.focus();
      }catch(e){
        // Element may no longer be in DOM
      }
    }

    lastFocusedElement = null;
  }

  /**
   * Attach a Rules button next to a Play button
   * Defends against duplicate injection
   * @param {HTMLElement} playButton - The Play button element
   * @param {string} key - Minigame registry key
   */
  function attachRulesButton(playButton, key){
    if(!playButton || !playButton.parentNode){
      console.warn('[RulesModal] Invalid play button element');
      return;
    }

    // Check if Rules button already exists as sibling
    const parent = playButton.parentNode;
    const existingRulesBtn = parent.querySelector('[data-role="rules-btn"]');
    
    if(existingRulesBtn){
      // Already exists, just update the key if different
      if(existingRulesBtn._rulesKey !== key){
        existingRulesBtn._rulesKey = key;
        existingRulesBtn.onclick = function(){
          showMinigameRules(key);
        };
      }
      return;
    }

    // Create Rules button
    const rulesBtn = document.createElement('button');
    rulesBtn.className = 'btn rules-btn';
    rulesBtn.textContent = '📋 Rules';
    rulesBtn.setAttribute('data-role', 'rules-btn');
    rulesBtn.setAttribute('aria-label', 'View game rules');
    rulesBtn.style.cssText = `
      padding: 8px 20px;
      font-size: 1rem;
      font-weight: 700;
      background: #12324b;
      border: 1px solid #2a4d6e;
      border-radius: 10px;
      color: #e3ecf5;
      cursor: pointer;
      transition: all 0.2s;
      min-width: 44px;
      min-height: 44px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    `;

    rulesBtn._rulesKey = key;

    rulesBtn.addEventListener('mouseenter', function(){
      rulesBtn.style.background = '#1a405f';
      rulesBtn.style.borderColor = '#3a6d8e';
      rulesBtn.style.transform = 'translateY(-2px)';
      rulesBtn.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
    });

    rulesBtn.addEventListener('mouseleave', function(){
      rulesBtn.style.background = '#12324b';
      rulesBtn.style.borderColor = '#2a4d6e';
      rulesBtn.style.transform = 'translateY(0)';
      rulesBtn.style.boxShadow = 'none';
    });

    rulesBtn.onclick = function(){
      showMinigameRules(key);
    };

    // Insert Rules button before Play button
    parent.insertBefore(rulesBtn, playButton);
  }

  // Inject animations CSS
  function injectAnimations(){
    if(document.getElementById('rules-modal-animations')){
      return;
    }

    const style = document.createElement('style');
    style.id = 'rules-modal-animations';
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes slideUp {
        from {
          opacity: 0;
          transform: translateY(30px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Initialize on DOM ready
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', injectAnimations);
  } else {
    injectAnimations();
  }

  // Export to global namespace
  g.showMinigameRules = showMinigameRules;
  g.attachRulesButton = attachRulesButton;

  console.info('[RulesModal] Initialized - showMinigameRules() and attachRulesButton() available');

})(window);
