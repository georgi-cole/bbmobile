// MODULE: player-profile-modal.js
// Player Profile Modal - collects user info (photo, name, age, location, occupation) before game start
// Shows after rules acknowledgment and before cast introduction

(function (global) {
  'use strict';

  let lastFocusEl = null;
  let modalShown = false;
  let pendingAvatarDataUrl = null;
  let parentalConsentGiven = false;
  let ageTooltip = null;
  let over99Confirmed = false;
  
  // Track if modals have already been shown once this session
  let rulesAcknowledged = false;

  function ensureModal() {
    let dim = document.querySelector('.profileDim');
    if (dim) return dim;

    dim = document.createElement('div');
    dim.className = 'profileDim';
    dim.setAttribute('role', 'dialog');
    dim.setAttribute('aria-modal', 'true');
    dim.setAttribute('aria-labelledby', 'profileTitle');

    const panel = document.createElement('div');
    panel.className = 'profilePanel';

    const title = document.createElement('div');
    title.className = 'profileTitle';
    title.id = 'profileTitle';
    title.textContent = 'Create Your Profile';

    const body = document.createElement('div');
    body.className = 'profileBody';
    body.tabIndex = 0;

    // Photo upload section
    const photoSection = document.createElement('div');
    photoSection.className = 'profile-photo-section';
    photoSection.style.cssText = 'text-align: center; margin-bottom: 20px;';

    const avatarPreview = document.createElement('img');
    avatarPreview.id = 'profileAvatarPreview';
    avatarPreview.alt = 'Your avatar';
    avatarPreview.style.cssText = 'width: 120px; height: 120px; border-radius: 50%; object-fit: cover; border: 3px solid #3f6385; background: #1a2634; display: block; margin: 0 auto 12px;';
    
    // Set default avatar
    const FALLBACK_AVATAR_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="48" fill="#1a2634" stroke="#3f6385" stroke-width="2"/>
  <circle cx="50" cy="40" r="15" fill="#3f6385"/>
  <ellipse cx="50" cy="75" rx="25" ry="20" fill="#3f6385"/>
</svg>
`;
    const FALLBACK_AVATAR = 'data:image/svg+xml,' + encodeURIComponent(FALLBACK_AVATAR_SVG.trim());
    avatarPreview.src = FALLBACK_AVATAR;
    avatarPreview.onerror = function() {
      this.onerror = null;
      this.src = FALLBACK_AVATAR;
    };

    const photoLabel = document.createElement('label');
    photoLabel.className = 'profile-photo-label';
    photoLabel.style.cssText = 'display: inline-block; cursor: pointer; color: #78b4f0; text-decoration: underline; font-size: 0.9rem;';
    photoLabel.textContent = '📷 Upload Photo';
    
    const photoInput = document.createElement('input');
    photoInput.type = 'file';
    photoInput.id = 'profilePhotoInput';
    photoInput.accept = 'image/*';
    photoInput.style.display = 'none';

    photoLabel.appendChild(photoInput);
    photoSection.appendChild(avatarPreview);
    photoSection.appendChild(photoLabel);

    // Form fields
    const formSection = document.createElement('div');
    formSection.className = 'profile-form-section';
    formSection.style.cssText = 'display: flex; flex-direction: column; gap: 12px;';

    const createField = (labelText, inputId, type = 'text', placeholder = '', required = false) => {
      const field = document.createElement('div');
      field.className = 'profile-field';
      field.style.cssText = 'display: flex; flex-direction: column; gap: 4px;';
      
      const label = document.createElement('label');
      label.htmlFor = inputId;
      label.textContent = labelText;
      label.style.cssText = 'font-weight: 600; color: #c4d9ec; font-size: 0.9rem;';
      if (required) {
        const req = document.createElement('span');
        req.textContent = ' *';
        req.style.color = '#ff6b6b';
        label.appendChild(req);
      }
      
      const input = document.createElement('input');
      input.type = type;
      input.id = inputId;
      input.placeholder = placeholder;
      input.style.cssText = 'padding: 10px 12px; background: #1a2634; border: 1px solid #3f6385; border-radius: 8px; color: #e8f4ff; font-size: 1rem; min-height: 44px;';
      input.setAttribute('aria-label', labelText);
      
      field.appendChild(label);
      field.appendChild(input);
      return field;
    };

    formSection.appendChild(createField('Name', 'profileName', 'text', 'Enter your name', true));
    
    // Age field with tooltip container
    const ageFieldContainer = document.createElement('div');
    ageFieldContainer.style.cssText = 'position: relative;';
    const ageField = createField('Age', 'profileAge', 'number', 'Enter your age');
    ageFieldContainer.appendChild(ageField);
    formSection.appendChild(ageFieldContainer);
    
    formSection.appendChild(createField('Location', 'profileLocation', 'text', 'City, Country'));
    formSection.appendChild(createField('Occupation', 'profileOccupation', 'text', 'Your occupation'));

    body.appendChild(photoSection);
    body.appendChild(formSection);

    // Buttons section
    const btns = document.createElement('div');
    btns.className = 'profileBtns';
    btns.style.cssText = 'display: flex; gap: 12px; justify-content: flex-end; margin-top: 20px;';

    const startBtn = document.createElement('button');
    startBtn.className = 'btn primary';
    startBtn.id = 'profileStartBtn';
    startBtn.textContent = '▶ Start Game';
    startBtn.style.cssText = 'min-height: 44px; padding: 10px 24px; font-size: 1rem; font-weight: 700;';
    startBtn.setAttribute('aria-label', 'Start game with your profile');

    btns.appendChild(startBtn);

    panel.appendChild(title);
    panel.appendChild(body);
    panel.appendChild(btns);
    dim.appendChild(panel);
    document.body.appendChild(dim);

    // Wire photo upload
    photoInput.addEventListener('change', function(e) {
      const file = e.target.files?.[0];
      if (!file) return;
      
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file.');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = function(ev) {
        const dataUrl = ev.target.result;
        pendingAvatarDataUrl = dataUrl;
        avatarPreview.src = dataUrl;
      };
      reader.readAsDataURL(file);
    });

    // Prevent closing by clicking backdrop
    dim.addEventListener('mousedown', (e) => {
      if (e.target === dim) {
        e.preventDefault();
        e.stopPropagation();
        // Focus the start button to guide the user
        try { startBtn.focus(); } catch {}
      }
    });

    // Handle ESC key (allow closing to start with defaults)
    dim.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        // Start with defaults if user presses ESC
        startWithProfile();
        return;
      }
      // Basic focus trap
      if (e.key === 'Tab') {
        const focusables = panel.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        const list = Array.from(focusables).filter(el => !el.hasAttribute('disabled'));
        if (list.length) {
          const first = list[0];
          const last = list[list.length - 1];
          const active = document.activeElement;
          if (e.shiftKey && (active === first || active === panel)) {
            e.preventDefault(); 
            last.focus();
          } else if (!e.shiftKey && (active === last)) {
            e.preventDefault(); 
            first.focus();
          }
        }
      }
    });

    return dim;
  }

  // Age tooltip functions
  function showAgeTooltip(message) {
    hideAgeTooltip(); // Remove any existing tooltip
    
    const ageInput = document.getElementById('profileAge');
    if (!ageInput) return;
    
    ageTooltip = document.createElement('div');
    ageTooltip.className = 'age-tooltip';
    ageTooltip.textContent = message;
    ageTooltip.style.cssText = `
      position: absolute;
      bottom: 100%;
      left: 0;
      right: 0;
      margin-bottom: 8px;
      background: #2d3f56;
      color: #f5f9fc;
      border: 2px solid #ff9933;
      border-radius: 10px;
      padding: 10px 14px;
      font-size: 0.85rem;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
      z-index: 10;
      animation: fadeIn 0.25s ease;
      pointer-events: none;
      text-align: center;
      line-height: 1.4;
    `;
    
    // Add tooltip to age field container
    const ageFieldContainer = ageInput.closest('div').parentElement;
    if (ageFieldContainer) {
      ageFieldContainer.style.position = 'relative';
      ageFieldContainer.appendChild(ageTooltip);
      
      // Highlight age input
      ageInput.style.borderColor = '#ff9933';
      ageInput.style.boxShadow = '0 0 0 2px rgba(255, 153, 51, 0.3)';
    }
  }

  function hideAgeTooltip() {
    if (ageTooltip && ageTooltip.parentElement) {
      ageTooltip.remove();
      ageTooltip = null;
    }
    
    // Remove highlight from age input
    const ageInput = document.getElementById('profileAge');
    if (ageInput) {
      ageInput.style.borderColor = '';
      ageInput.style.boxShadow = '';
    }
  }

  function checkAgeInput() {
    const ageInput = document.getElementById('profileAge');
    if (!ageInput || !ageInput.value) {
      hideAgeTooltip();
      over99Confirmed = false;
      return;
    }
    
    const age = parseInt(ageInput.value, 10);
    
    if (isNaN(age)) {
      hideAgeTooltip();
      over99Confirmed = false;
      return;
    }
    
    if (age < 5 && age > 0) {
      showAgeTooltip("Wow, you must be a wunderkind! 🧠👶");
    } else if (age >= 6 && age <= 12) {
      showAgeTooltip("You sure you don't have some homework to do? 🏫📚");
    } else if (age > 99) {
      showAgeTooltip("You must be related to Dracula? 🧛🩸");
      // Don't block, just show tooltip
    } else {
      hideAgeTooltip();
    }
  }

  function ensureParentalConsentModal() {
    let dim = document.querySelector('.parentalConsentDim');
    if (dim) return dim;

    dim = document.createElement('div');
    dim.className = 'parentalConsentDim';
    dim.setAttribute('role', 'dialog');
    dim.setAttribute('aria-modal', 'true');
    dim.setAttribute('aria-labelledby', 'parentalConsentTitle');

    const panel = document.createElement('div');
    panel.className = 'parentalConsentPanel';

    const title = document.createElement('div');
    title.className = 'parentalConsentTitle';
    title.id = 'parentalConsentTitle';
    title.textContent = '⚠️ Parental Permission Required';

    const body = document.createElement('div');
    body.className = 'parentalConsentBody';
    body.innerHTML = 'You have indicated that you are under 18 years old.<br><br>You must have parental or guardian permission to play this game.';

    const checkboxContainer = document.createElement('div');
    checkboxContainer.className = 'parentalConsentCheckbox';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = 'parentalConsentCheckbox';
    checkbox.setAttribute('aria-label', 'I confirm I have parental permission');

    const label = document.createElement('label');
    label.htmlFor = 'parentalConsentCheckbox';
    label.textContent = 'I confirm that I have parental or guardian permission to play this game.';

    checkboxContainer.appendChild(checkbox);
    checkboxContainer.appendChild(label);

    const btns = document.createElement('div');
    btns.className = 'parentalConsentBtns';

    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'btn primary';
    confirmBtn.id = 'parentalConsentConfirmBtn';
    confirmBtn.textContent = 'Confirm';
    confirmBtn.style.cssText = 'min-height: 44px; padding: 10px 28px; font-size: 1rem; font-weight: 700;';
    confirmBtn.setAttribute('aria-label', 'Confirm parental permission');

    btns.appendChild(confirmBtn);

    panel.appendChild(title);
    panel.appendChild(body);
    panel.appendChild(checkboxContainer);
    panel.appendChild(btns);
    dim.appendChild(panel);
    document.body.appendChild(dim);

    // Prevent closing by clicking backdrop
    dim.addEventListener('mousedown', (e) => {
      if (e.target === dim) {
        e.preventDefault();
        e.stopPropagation();
        // Focus the confirm button to guide the user
        try { confirmBtn.focus(); } catch {}
      }
    });

    // Block ESC key - user must confirm
    dim.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      // Basic focus trap
      if (e.key === 'Tab') {
        const focusables = panel.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        const list = Array.from(focusables).filter(el => !el.hasAttribute('disabled'));
        if (list.length) {
          const first = list[0];
          const last = list[list.length - 1];
          const active = document.activeElement;
          if (e.shiftKey && (active === first || active === panel)) {
            e.preventDefault(); 
            last.focus();
          } else if (!e.shiftKey && (active === last)) {
            e.preventDefault(); 
            first.focus();
          }
        }
      }
    });

    return dim;
  }

  function showParentalConsentModal(onConfirm) {
    const dim = ensureParentalConsentModal();
    const panel = dim.querySelector('.parentalConsentPanel');
    const confirmBtn = dim.querySelector('#parentalConsentConfirmBtn');
    const checkbox = document.getElementById('parentalConsentCheckbox');

    // Reset checkbox state
    if (checkbox) checkbox.checked = false;

    dim.style.display = 'flex';
    requestAnimationFrame(() => {
      dim.classList.add('open');
      panel.classList.add('in');
    });

    // Lock page scroll
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    // Focus checkbox
    setTimeout(() => { 
      try { checkbox ? checkbox.focus() : confirmBtn.focus(); } catch {} 
    }, 100);

    confirmBtn.onclick = () => {
      if (!checkbox || !checkbox.checked) {
        alert('Please check the box to confirm you have parental permission.');
        checkbox?.focus();
        return;
      }

      // Mark consent as given
      parentalConsentGiven = true;
      
      // Save to localStorage
      try {
        localStorage.setItem('bb_parental_consent', 'true');
      } catch (e) {
        console.warn('[parental-consent] failed to save consent', e);
      }

      hideParentalConsentModal(() => {
        if (onConfirm) onConfirm();
      });
    };
  }

  function hideParentalConsentModal(callback) {
    const dim = document.querySelector('.parentalConsentDim');
    if (!dim) {
      if (callback) callback();
      return;
    }

    const panel = dim.querySelector('.parentalConsentPanel');
    dim.classList.remove('open');
    if (panel) panel.classList.remove('in');

    // Small delay for CSS transition, then hide
    setTimeout(() => {
      dim.style.display = 'none';
      // Restore scroll
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      if (callback) callback();
    }, 200);
  }

  function showProfileModal() {
    // Check if this is a restart and we should skip the modal
    if (modalShown && rulesAcknowledged) {
      console.info('[profile-modal] skipping modal on restart');
      return;
    }
    
    if (modalShown) {
      console.info('[profile-modal] already shown this session');
      return;
    }
    
    modalShown = true;
    const dim = ensureModal();
    const panel = dim.querySelector('.profilePanel');
    const startBtn = dim.querySelector('#profileStartBtn');

    // Try to load saved profile
    try {
      const saved = localStorage.getItem('bb_human_profile');
      if (saved) {
        const profile = JSON.parse(saved);
        const nameInput = document.getElementById('profileName');
        const ageInput = document.getElementById('profileAge');
        const locInput = document.getElementById('profileLocation');
        const occInput = document.getElementById('profileOccupation');
        
        if (nameInput && profile.name) nameInput.value = profile.name;
        if (ageInput && profile.age) ageInput.value = profile.age;
        if (locInput && profile.location) locInput.value = profile.location;
        if (occInput && profile.occupation) occInput.value = profile.occupation;
      }
    } catch (e) {
      console.warn('[profile-modal] failed to load saved profile', e);
    }

    dim.style.display = 'flex';
    requestAnimationFrame(() => {
      dim.classList.add('open');
      panel.classList.add('in');
    });

    // Lock page scroll
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    // Focus handling
    try { lastFocusEl = document.activeElement; } catch { lastFocusEl = null; }
    setTimeout(() => { 
      const nameInput = document.getElementById('profileName');
      try { nameInput ? nameInput.focus() : startBtn.focus(); } catch {} 
    }, 100);

    // Wire age input to show tooltips
    const ageInput = document.getElementById('profileAge');
    if (ageInput) {
      ageInput.addEventListener('input', checkAgeInput);
      ageInput.addEventListener('blur', hideAgeTooltip);
      // Check immediately if there's a value
      if (ageInput.value) {
        setTimeout(() => checkAgeInput(), 200);
      }
    }

    startBtn.onclick = () => {
      startWithProfile();
    };
  }

  function startWithProfile() {
    const nameInput = document.getElementById('profileName');
    const ageInput = document.getElementById('profileAge');
    const locInput = document.getElementById('profileLocation');
    const occInput = document.getElementById('profileOccupation');

    const name = (nameInput?.value || 'You').trim();
    if (!name || name.length === 0) {
      alert('Please enter your name to continue.');
      nameInput?.focus();
      return;
    }

    const profile = {
      name: name,
      age: (ageInput?.value || '').trim(),
      location: (locInput?.value || '').trim(),
      occupation: (occInput?.value || '').trim(),
      avatar: pendingAvatarDataUrl || null
    };

    // Check if user is under 18 and needs parental consent
    const age = parseInt(profile.age, 10);
    if (!isNaN(age) && age < 18) {
      // Check if consent already given
      const consentGiven = parentalConsentGiven || localStorage.getItem('bb_parental_consent') === 'true';
      
      if (!consentGiven) {
        // Show parental consent modal
        showParentalConsentModal(() => {
          // After consent is given, continue with profile
          continueWithProfile(profile);
        });
        return;
      }
    }

    // If age >= 18 or consent already given, continue normally
    continueWithProfile(profile);
  }

  function continueWithProfile(profile) {
    // Save profile
    try {
      localStorage.setItem('bb_human_profile', JSON.stringify(profile));
    } catch (e) {
      console.warn('[profile-modal] failed to save profile', e);
    }

    // Apply profile to human player name in settings
    const humanNameInput = document.getElementById('humanName');
    if (humanNameInput) {
      humanNameInput.value = profile.name;
    }

    // Hide modal
    hideProfileModal();

    // Start the opening sequence
    console.info('[profile-modal] starting opening sequence with profile:', profile);
    
    // Apply the profile to config and the actual player
    if (global.game && global.game.cfg) {
      global.game.cfg.humanName = profile.name;
    }
    
    // Find and update the human player
    if (global.game && global.game.players) {
      const humanPlayer = global.game.players.find(p => p.human || p.id === global.game.humanId || p.id === 0);
      if (humanPlayer) {
        humanPlayer.name = profile.name;
        if (profile.age) humanPlayer.age = profile.age;
        if (profile.location) humanPlayer.location = profile.location;
        if (profile.occupation) humanPlayer.occupation = profile.occupation;
        
        // Update meta object if it exists
        if (!humanPlayer.meta) humanPlayer.meta = {};
        if (profile.age) humanPlayer.meta.age = parseInt(profile.age, 10);
        if (profile.location) humanPlayer.meta.location = profile.location;
        if (profile.occupation) humanPlayer.meta.occupation = profile.occupation;
        
        // Update bio object (used by profile cards during opening sequence)
        if (!humanPlayer.bio) humanPlayer.bio = {};
        if (profile.age) humanPlayer.bio.age = profile.age;
        if (profile.location) humanPlayer.bio.location = profile.location;
        if (profile.occupation) humanPlayer.bio.occupation = profile.occupation;
        
        console.info('[profile-modal] updated human player:', humanPlayer);
      }
    }
    
    // Update HUD to reflect the new name
    if (typeof global.updateHud === 'function') {
      global.updateHud();
    }
    if (typeof global.renderPanel === 'function') {
      global.renderPanel();
    }
    
    // Trigger opening sequence
    setTimeout(() => {
      if (typeof global.startOpeningSequence === 'function') {
        global.startOpeningSequence();
      } else {
        console.warn('[profile-modal] startOpeningSequence not found');
      }
    }, 100);
  }

  function hideProfileModal() {
    const dim = document.querySelector('.profileDim');
    if (!dim) return;

    const panel = dim.querySelector('.profilePanel');
    dim.classList.remove('open');
    if (panel) panel.classList.remove('in');

    // Small delay for CSS transition, then hide
    setTimeout(() => {
      dim.style.display = 'none';
      // Restore scroll
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      // Restore focus
      try { lastFocusEl && lastFocusEl.focus && lastFocusEl.focus(); } catch {}
    }, 200);
  }

  // Listen for rules modal closed event
  function setupRulesListener() {
    // Listen for when rules modal is closed
    window.addEventListener('bb:rules:acknowledged', function(e) {
      console.info('[profile-modal] rules acknowledged, showing profile modal');
      rulesAcknowledged = true;
      setTimeout(() => showProfileModal(), 150);
    }, { once: true });
  }

  // Expose to global
  global.showProfileModal = showProfileModal;
  global.hideProfileModal = hideProfileModal;
  
  // Function to allow restart to skip modals
  global.skipModalFlow = function() {
    modalShown = true;
    rulesAcknowledged = true;
    console.info('[profile-modal] modal flow skipped for restart');
  };

  // Initialize
  function init() {
    setupRulesListener();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

})(window);
