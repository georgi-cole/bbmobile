// MODULE: player-profile-modal.js
// Player Profile Modal - collects user info (photo, name, age, location, occupation) before game start
// Shows after rules acknowledgment and before cast introduction

(function (global) {
  'use strict';

  let lastFocusEl = null;
  let modalShown = false;
  let pendingAvatarDataUrl = null;

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
    formSection.appendChild(createField('Age', 'profileAge', 'number', 'Enter your age'));
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

  function showProfileModal() {
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
      setTimeout(() => showProfileModal(), 150);
    }, { once: true });
  }

  // Expose to global
  global.showProfileModal = showProfileModal;
  global.hideProfileModal = hideProfileModal;

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
