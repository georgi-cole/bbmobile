// MODULE: ProfileModal.js
// Reusable profile selection/creation modal UI
// Shows up to 5 profiles with add, delete, and guest mode options

(function(global) {
  'use strict';

  let modalElement = null;
  let onSelectCallback = null;
  let onGuestCallback = null;

  // Create avatar input and preview
  function createAvatarUpload(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return null;

    const preview = document.createElement('img');
    preview.className = 'profile-avatar-preview';
    preview.alt = 'Avatar preview';
    preview.src = global.ProfileStorage.DEFAULT_AVATAR;

    const label = document.createElement('label');
    label.className = 'profile-avatar-label';
    label.textContent = '📷 Upload Photo';

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';

    label.appendChild(input);
    container.appendChild(preview);
    container.appendChild(label);

    let avatarDataUrl = null;

    input.addEventListener('change', function(e) {
      const file = e.target.files?.[0];
      if (!file || !file.type.startsWith('image/')) {
        alert('Please select an image file.');
        return;
      }

      const reader = new FileReader();
      reader.onload = function(ev) {
        avatarDataUrl = ev.target.result;
        preview.src = avatarDataUrl;
      };
      reader.readAsDataURL(file);
    });

    return {
      getAvatar: () => avatarDataUrl || global.ProfileStorage.DEFAULT_AVATAR,
      reset: () => {
        avatarDataUrl = null;
        preview.src = global.ProfileStorage.DEFAULT_AVATAR;
        input.value = '';
      }
    };
  }

  // Show vampire animation for age > 99
  function showVampireAnimation() {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'vampire-flash';
      overlay.innerHTML = '<div class="vampire-icon">🧛</div>';
      document.body.appendChild(overlay);

      requestAnimationFrame(() => {
        overlay.classList.add('active');
      });

      setTimeout(() => {
        overlay.classList.remove('active');
        setTimeout(() => {
          document.body.removeChild(overlay);
          resolve();
        }, 200);
      }, 600);
    });
  }

  // Request parental consent for age < 18
  function requestParentalConsent() {
    return new Promise((resolve) => {
      // Check if global showParentalConsentModal exists
      if (typeof window.showParentalConsentModal === 'function') {
        window.showParentalConsentModal((granted) => {
          if (granted) {
            localStorage.setItem('bb_parental_consent', 'true');
          }
          resolve(granted);
        });
      } else {
        // Fallback to confirm dialog
        const granted = confirm(
          'Parental consent is required for users under 18.\n\n' +
          'By clicking OK, a parent or guardian confirms they have reviewed ' +
          'and approved the creation of this profile.'
        );
        if (granted) {
          localStorage.setItem('bb_parental_consent', 'true');
        }
        resolve(granted);
      }
    });
  }

  // Show profile creation form
  function showCreateProfileForm(onComplete, preselectId) {
    const panel = modalElement.querySelector('.profile-modal-panel');
    
    panel.innerHTML = `
      <div class="profile-modal-header">
        <h2 class="profile-modal-title">Create Your Profile</h2>
        <button class="profile-modal-close" id="profileCloseBtn" title="Close" aria-label="Close">✕</button>
      </div>
      <div class="profile-modal-body">
        <div class="profile-avatar-upload" id="avatarUploadContainer"></div>
        <div class="profile-form-grid">
          <div class="profile-form-field">
            <label for="profileNameInput">Name <span class="required">*</span></label>
            <input type="text" id="profileNameInput" placeholder="Enter your name" maxlength="30" />
          </div>
          <div class="profile-form-field">
            <label for="profileAgeInput">Age <span class="required">*</span></label>
            <input type="number" id="profileAgeInput" placeholder="Age" min="5" max="99999" />
          </div>
          <div class="profile-form-field">
            <label for="profileSexSelect">Sex</label>
            <select id="profileSexSelect">
              <option value="NA">Prefer not to say</option>
              <option value="M">Male</option>
              <option value="F">Female</option>
            </select>
          </div>
          <div class="profile-form-field">
            <label for="profileLocationInput">Location</label>
            <input type="text" id="profileLocationInput" placeholder="e.g., New York, NY" maxlength="50" />
          </div>
          <div class="profile-form-field">
            <label for="profileOccupationInput">Occupation</label>
            <input type="text" id="profileOccupationInput" placeholder="e.g., Teacher" maxlength="50" />
          </div>
          <div class="profile-form-field profile-form-field-full">
            <label for="profileMottoInput">Motto</label>
            <input type="text" id="profileMottoInput" placeholder="Your personal motto" maxlength="100" />
          </div>
        </div>
      </div>
      <div class="profile-modal-footer">
        <button class="btn" id="profileCancelBtn">Cancel</button>
        <button class="btn primary" id="profileCreateBtn">Create Profile</button>
      </div>
    `;

    const avatarUpload = createAvatarUpload('avatarUploadContainer');
    const nameInput = panel.querySelector('#profileNameInput');
    const ageInput = panel.querySelector('#profileAgeInput');
    const sexSelect = panel.querySelector('#profileSexSelect');
    const locationInput = panel.querySelector('#profileLocationInput');
    const occupationInput = panel.querySelector('#profileOccupationInput');
    const mottoInput = panel.querySelector('#profileMottoInput');
    const createBtn = panel.querySelector('#profileCreateBtn');
    const cancelBtn = panel.querySelector('#profileCancelBtn');

    nameInput.focus();

    createBtn.onclick = async () => {
      const name = nameInput.value.trim();
      if (!name) {
        alert('Please enter a name.');
        nameInput.focus();
        return;
      }

      const age = ageInput.value.trim();
      if (!age) {
        alert('Please enter your age.');
        ageInput.focus();
        return;
      }

      const ageNum = Number(age);
      if (!Number.isInteger(ageNum) || ageNum < 5 || ageNum > 99999) {
        alert('Age must be an integer between 5 and 99,999.');
        ageInput.focus();
        return;
      }

      // Vampire animation for age > 99
      if (ageNum > 99) {
        await showVampireAnimation();
      }

      // Parental consent check for age < 18
      if (ageNum < 18) {
        const consentGranted = await requestParentalConsent();
        if (!consentGranted) {
          return; // User cancelled consent
        }
      }

      try {
        const profile = global.ProfileStorage.createProfile({
          displayName: name,
          avatar: avatarUpload.getAvatar(),
          age: ageNum,
          sex: sexSelect.value,
          location: locationInput.value,
          occupation: occupationInput.value,
          motto: mottoInput.value
        });
        
        console.info('[ProfileModal] created profile:', profile);
        onComplete(profile);
      } catch (e) {
        alert('Failed to create profile: ' + e.message);
        console.error('[ProfileModal] create failed:', e);
      }
    };

    cancelBtn.onclick = () => {
      showProfileList(preselectId);
    };
    
    // Wire close button (X)
    const closeBtn = panel.querySelector('#profileCloseBtn');
    if (closeBtn) {
      closeBtn.onclick = () => {
        // Check if profiles exist - if not, just hide modal
        const profiles = global.ProfileStorage.getAllProfiles();
        if (profiles.length > 0) {
          showProfileList(preselectId);
        } else {
          hideModal();
        }
      };
    }
  }

  // Show profile list
  function showProfileList(preselectId) {
    const profiles = global.ProfileStorage.getAllProfiles();
    const atMax = global.ProfileStorage.isAtMaxCapacity();
    
    const panel = modalElement.querySelector('.profile-modal-panel');
    
    const profileCards = profiles.map(p => {
      const xpDisplay = (p.xp !== undefined && p.xp !== null) ? ` • ${p.xp} XP` : '';
      const seasonDisplay = (p.season !== undefined && p.season !== null) ? ` • Season ${p.season}` : '';
      
      // Extended info display
      const age = p.age !== undefined ? p.age : 'N/A';
      const sex = p.sex || 'NA';
      const location = p.location || 'N/A';
      const occupation = p.occupation || 'N/A';
      const motto = p.motto || 'N/A';
      
      const extendedInfo = `${age} • ${sex} • ${location}`;
      const extendedDetails = (occupation !== 'N/A' || motto !== 'N/A') 
        ? `<div class="profile-card-details">${occupation !== 'N/A' ? occupation : ''}${occupation !== 'N/A' && motto !== 'N/A' ? ' • ' : ''}${motto !== 'N/A' ? motto : ''}</div>`
        : '';
      
      const isPreselected = preselectId && p.id === preselectId;
      const preselectClass = isPreselected ? ' preselected' : '';
      
      return `
        <div class="profile-card${preselectClass}" data-id="${p.id}">
          <img class="profile-card-avatar" src="${p.avatar}" alt="${p.displayName}" />
          <div class="profile-card-info">
            <div class="profile-card-name">${escapeHtml(p.displayName)}</div>
            <div class="profile-card-meta">${extendedInfo}${xpDisplay}${seasonDisplay}</div>
            ${extendedDetails}
          </div>
          <button class="profile-card-delete" data-id="${p.id}" title="Delete profile">🗑️</button>
        </div>
      `;
    }).join('');

    const addBtnDisabled = atMax ? 'disabled' : '';
    const addBtnTitle = atMax ? `Maximum ${global.ProfileStorage.MAX_PROFILES} profiles reached` : 'Add new profile';

    panel.innerHTML = `
      <div class="profile-modal-header">
        <h2 class="profile-modal-title">Select Profile</h2>
        <button class="profile-modal-close" id="profileCloseBtn" title="Close" aria-label="Close">✕</button>
      </div>
      <div class="profile-modal-body">
        ${profiles.length > 0 ? `
          <div class="profile-list">
            ${profileCards}
          </div>
        ` : `
          <div class="profile-empty-state">
            <p>No profiles yet. Create one to get started!</p>
          </div>
        `}
      </div>
      <div class="profile-modal-footer">
        <button class="btn" id="profileGuestBtn">Play as Guest</button>
        <div style="flex: 1;"></div>
        <button class="btn primary" id="profileAddBtn" ${addBtnDisabled} title="${addBtnTitle}">
          ➕ Add Profile
        </button>
      </div>
    `;

    // Wire profile selection
    panel.querySelectorAll('.profile-card').forEach(card => {
      const id = card.dataset.id;
      card.addEventListener('click', (e) => {
        // Don't trigger on delete button
        if (e.target.classList.contains('profile-card-delete')) return;
        
        const profile = global.ProfileStorage.getProfileById(id);
        if (profile && onSelectCallback) {
          hideModal();
          onSelectCallback(profile);
        }
      });
    });

    // Wire delete buttons
    panel.querySelectorAll('.profile-card-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const profile = global.ProfileStorage.getProfileById(id);
        
        if (confirm(`Delete profile "${profile.displayName}"?`)) {
          try {
            global.ProfileStorage.deleteProfile(id);
            showProfileList(preselectId); // Refresh list with same preselection
          } catch (e) {
            alert('Failed to delete profile: ' + e.message);
          }
        }
      });
    });

    // Wire add button
    const addBtn = panel.querySelector('#profileAddBtn');
    if (addBtn && !addBtn.disabled) {
      addBtn.onclick = () => {
        showCreateProfileForm((profile) => {
          hideModal();
          if (onSelectCallback) {
            onSelectCallback(profile);
          }
        }, preselectId);
      };
    }

    // Wire guest button
    const guestBtn = panel.querySelector('#profileGuestBtn');
    guestBtn.onclick = () => {
      hideModal();
      if (onGuestCallback) {
        onGuestCallback();
      }
    };
    
    // Wire close button
    const closeBtn = panel.querySelector('#profileCloseBtn');
    if (closeBtn) {
      closeBtn.onclick = () => {
        hideModal();
      };
    }
  }

  // Create modal element
  function ensureModal() {
    if (modalElement) return modalElement;

    modalElement = document.createElement('div');
    modalElement.className = 'profile-modal-dim';
    modalElement.setAttribute('role', 'dialog');
    modalElement.setAttribute('aria-modal', 'true');
    modalElement.setAttribute('aria-labelledby', 'profileModalTitle');

    const panel = document.createElement('div');
    panel.className = 'profile-modal-panel';
    
    modalElement.appendChild(panel);
    document.body.appendChild(modalElement);

    // Prevent backdrop clicks
    modalElement.addEventListener('mousedown', (e) => {
      if (e.target === modalElement) {
        e.preventDefault();
        e.stopPropagation();
      }
    });

    // Handle ESC key (allow closing if profiles exist)
    modalElement.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const profiles = global.ProfileStorage.getAllProfiles();
        if (profiles.length > 0) {
          e.preventDefault();
          hideModal();
        }
      }
    });

    return modalElement;
  }

  // Show modal
  function showModal(options = {}) {
    onSelectCallback = options.onSelect || null;
    onGuestCallback = options.onGuest || null;

    const modal = ensureModal();
    
    // Check if we should show create form or list
    const profiles = global.ProfileStorage.getAllProfiles();
    if (profiles.length === 0 && options.autoCreate) {
      showCreateProfileForm((profile) => {
        hideModal();
        if (onSelectCallback) {
          onSelectCallback(profile);
        }
      }, options.preselectId);
    } else {
      showProfileList(options.preselectId);
    }

    modal.style.display = 'flex';
    requestAnimationFrame(() => {
      modal.classList.add('open');
    });

    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
  }

  // Hide modal
  function hideModal() {
    if (!modalElement) return;

    modalElement.classList.remove('open');
    
    setTimeout(() => {
      modalElement.style.display = 'none';
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    }, 200);
  }

  // Utility: escape HTML
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Export API
  const ProfileModal = {
    show: showModal,
    hide: hideModal
  };

  // Expose to global
  global.ProfileModal = ProfileModal;

})(window);
