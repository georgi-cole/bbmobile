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

  // Show profile creation form
  function showCreateProfileForm(onComplete) {
    const panel = modalElement.querySelector('.profile-modal-panel');
    
    panel.innerHTML = `
      <div class="profile-modal-header">
        <h2 class="profile-modal-title">Create Your Profile</h2>
      </div>
      <div class="profile-modal-body">
        <div class="profile-avatar-upload" id="avatarUploadContainer"></div>
        <div class="profile-form-field">
          <label for="profileNameInput">Name <span class="required">*</span></label>
          <input type="text" id="profileNameInput" placeholder="Enter your name" maxlength="30" />
        </div>
      </div>
      <div class="profile-modal-footer">
        <button class="btn" id="profileCancelBtn">Cancel</button>
        <button class="btn primary" id="profileCreateBtn">Create Profile</button>
      </div>
    `;

    const avatarUpload = createAvatarUpload('avatarUploadContainer');
    const nameInput = panel.querySelector('#profileNameInput');
    const createBtn = panel.querySelector('#profileCreateBtn');
    const cancelBtn = panel.querySelector('#profileCancelBtn');

    nameInput.focus();

    createBtn.onclick = () => {
      const name = nameInput.value.trim();
      if (!name) {
        alert('Please enter a name.');
        nameInput.focus();
        return;
      }

      try {
        const profile = global.ProfileStorage.createProfile({
          displayName: name,
          avatar: avatarUpload.getAvatar()
        });
        
        console.info('[ProfileModal] created profile:', profile);
        onComplete(profile);
      } catch (e) {
        alert('Failed to create profile: ' + e.message);
        console.error('[ProfileModal] create failed:', e);
      }
    };

    cancelBtn.onclick = () => {
      showProfileList();
    };
  }

  // Show profile list
  function showProfileList() {
    const profiles = global.ProfileStorage.getAllProfiles();
    const atMax = global.ProfileStorage.isAtMaxCapacity();
    
    const panel = modalElement.querySelector('.profile-modal-panel');
    
    const profileCards = profiles.map(p => {
      const xpDisplay = p.xp ? ` • ${p.xp} XP` : '';
      const seasonDisplay = p.season ? ` • Season ${p.season}` : '';
      
      return `
        <div class="profile-card" data-id="${p.id}">
          <img class="profile-card-avatar" src="${p.avatar}" alt="${p.displayName}" />
          <div class="profile-card-info">
            <div class="profile-card-name">${escapeHtml(p.displayName)}</div>
            <div class="profile-card-meta">${xpDisplay}${seasonDisplay}</div>
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
            showProfileList(); // Refresh list
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
        });
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
      });
    } else {
      showProfileList();
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
