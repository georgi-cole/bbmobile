// Move Settings + Sound next to Diary Room button on desktop viewports
// Safe, id/class-fallback approach; import as a module in index.html or bundle entry.

const DESKTOP_MIN_W = 900; // adjust to your desktop breakpoint

function findSettingsButton() {
  return document.getElementById('btnOpenSettings')
    || document.querySelector('[data-action="open-settings"]')
    || document.querySelector('.btn-settings')
    || null;
}

function findSoundButton() {
  return document.getElementById('btnToggleSfx')
    || document.getElementById('btnToggleSound')
    || document.getElementById('btnMuteToggle')
    || document.querySelector('[data-action="toggle-sound"]')
    || document.querySelector('.btn-sound')
    || null;
}

function findDRButton() {
  return document.getElementById('btnDiaryRoom')
    || document.querySelector('[data-action="open-dr"]')
    || document.querySelector('.dr-button')
    || document.querySelector('.btn-dr')
    || null;
}

function moveButtonsToDRContainer() {
  const settingsBtn = findSettingsButton();
  const soundBtn = findSoundButton();
  const drBtn = findDRButton();

  if (!drBtn) {
    // No DR button found — nothing to move
    return;
  }

  // Determine the container where DR button lives
  const drContainer = drBtn.parentElement || drBtn.closest('.toolbar') || drBtn.parentNode;
  if (!drContainer) return;

  // Create a small wrapper to hold the DR + moved buttons
  let group = drContainer.querySelector('.dr-action-group');
  if (!group) {
    group = document.createElement('div');
    group.className = 'dr-action-group';
    // Place the group in the same position as the DR button currently is
    drContainer.insertBefore(group, drBtn);
    group.appendChild(drBtn);
  }

  // Move (or append) the settings & sound buttons into the group (after DR)
  if (settingsBtn) {
    settingsBtn.classList.add('moved-to-dr');
    group.appendChild(settingsBtn);
  }
  if (soundBtn) {
    soundBtn.classList.add('moved-to-dr');
    group.appendChild(soundBtn);
  }
}

function restoreButtons() {
  // Remove moved class so default stylesheet can keep original layout.
  document.querySelectorAll('.moved-to-dr').forEach(el => el.classList.remove('moved-to-dr'));
  // If you want deeper restoration logic (moving back to original container),
  // add it here — keep simple for now.
}

function applyResponsivePlacement() {
  // Only move on desktop
  if (window.innerWidth >= DESKTOP_MIN_W) {
    moveButtonsToDRContainer();
  } else {
    restoreButtons();
  }
}

function init() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyResponsivePlacement);
  } else {
    applyResponsivePlacement();
  }
  // Re-evaluate on resize (debounced)
  let rto = null;
  window.addEventListener('resize', () => {
    clearTimeout(rto);
    rto = setTimeout(applyResponsivePlacement, 120);
  });
}

init();

export default {
  applyResponsivePlacement
};
