/* Live Vote V2 - Triple Nominee Extension */
/* Handles 3-up layout for triple evictions inside #tv overlay */

(() => {
  const global = window;
  if (!global.lv2) global.lv2 = {};
  const lv2 = global.lv2;

  let root, grid, ctaRow, nomineesLocal = [];
  let keyHandler;

  // Get TV overlay container
  function getTvRoot() {
    const tv = document.getElementById('tv');
    if (!tv) return null;
    // Use existing overlay if present, otherwise use TV directly
    return tv.querySelector('.overlay') || tv;
  }

  // Helper to create DOM elements
  function createEl(tag, cls, html) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (html !== null && html !== undefined) el.innerHTML = html;
    return el;
  }

  // Get avatar URL for a player
  function getAvatarUrl(playerId) {
    if (global.resolveAvatar) {
      const player = global.getP?.(playerId);
      if (player) {
        return global.resolveAvatar(player) || getDicebearUrl(player.name);
      }
    }
    const player = global.getP?.(playerId);
    if (player?.avatar) return player.avatar;
    return getDicebearUrl(global.safeName?.(playerId) || 'player');
  }

  function getDicebearUrl(seed) {
    return `https://api.dicebear.com/6.x/bottts/svg?seed=${encodeURIComponent(seed || 'player')}`;
  }

  // Teardown UI elements
  function teardown() {
    if (keyHandler) {
      document.removeEventListener('keydown', keyHandler);
      keyHandler = null;
    }
    if (root && root.parentNode) root.parentNode.removeChild(root);
    root = grid = ctaRow = null;
    nomineesLocal = [];
  }

  // Cleanup and restore panel visibility
  function cleanup() {
    teardown();
    document.body.classList.remove('lv-active-livevote');
    document.body.classList.remove('lv-dock-livevote');
    
    // Restore panel visibility
    const panel = document.querySelector('#panel');
    if (panel) {
      panel.style.display = '';
    }
  }

  /**
   * Initialize triple nominee UI
   * @param {Object} opts - Configuration options
   * @param {Array} opts.nominees - Array of {id, name} nominee objects (must be exactly 3)
   * @param {Function} opts.onVote - Callback when user votes: (pickId) => void
   */
  function initTriple(opts) {
    cleanup();
    const overlay = getTvRoot();
    if (!overlay) {
      console.warn('[lv2:triple] No #tv overlay found.');
      return;
    }

    nomineesLocal = (opts?.nominees || []).slice(0, 3);
    if (nomineesLocal.length !== 3) {
      console.warn('[lv2:triple] Expected exactly 3 nominees, got', nomineesLocal.length);
    }

    // Add body class to hide legacy panel
    document.body.classList.add('lv-active-livevote');

    // Create root container with grid layout
    root = createEl('div', 'lv2-fit lv2-3up');
    Object.assign(root.style, {
      position: 'absolute',
      inset: 'clamp(8px,1.8vw,16px)',
      display: 'grid',
      gridTemplateRows: '1fr auto',
      zIndex: '150'
    });

    // Create 3-column grid for nominees
    grid = createEl('div', 'lv2-3up-grid');
    Object.assign(grid.style, {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, minmax(0,1fr))',
      gap: 'clamp(10px,1.6vw,18px)',
      alignItems: 'center',
      justifyItems: 'center',
      pointerEvents: 'auto'
    });

    // Render each nominee
    nomineesLocal.forEach(n => {
      const card = createEl('div', 'lv2-contestant');
      Object.assign(card.style, {
        display: 'grid',
        gridTemplateRows: 'auto auto',
        justifyItems: 'center',
        gap: '8px'
      });

      // Avatar container
      const avatarContainer = createEl('div', 'lv2-avatar');
      Object.assign(avatarContainer.style, {
        width: 'clamp(72px,12vw,96px)',
        height: 'clamp(72px,12vw,96px)',
        borderRadius: '50%',
        background: 'radial-gradient(circle at 30% 30%, #1b2b44, #0f1a2d)',
        boxShadow: '0 0 0 3px rgba(143,211,255,0.4), 0 4px 18px rgba(0,0,0,0.5)',
        overflow: 'hidden'
      });

      // Avatar image
      const avatarImg = createEl('img');
      avatarImg.src = getAvatarUrl(n.id);
      avatarImg.alt = n.name;
      avatarImg.onerror = function() {
        console.warn(`[lv2:triple] Avatar load failed for ${n.name}, using fallback`);
        this.onerror = null;
        this.src = getDicebearUrl(n.name);
      };
      Object.assign(avatarImg.style, {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        display: 'block'
      });
      avatarContainer.appendChild(avatarImg);

      // Name label
      const name = createEl('div', 'lv2-name', n.name);
      Object.assign(name.style, {
        fontWeight: '700',
        color: '#d9ecff',
        textShadow: '0 2px 6px rgba(0,0,0,0.4)',
        fontSize: 'clamp(0.85rem, 2vw, 1rem)',
        textAlign: 'center'
      });

      card.dataset.id = n.id;
      card.appendChild(avatarContainer);
      card.appendChild(name);
      grid.appendChild(card);
    });

    // Create CTA row with 3 buttons
    ctaRow = createEl('div', 'lv2-cta-row triple');
    Object.assign(ctaRow.style, {
      display: 'grid',
      gridTemplateColumns: 'repeat(3,1fr)',
      gap: 'clamp(8px,1.4vw,16px)',
      alignItems: 'center',
      justifyItems: 'center',
      marginTop: 'clamp(6px,1.2vw,10px)',
      pointerEvents: 'auto'
    });

    const onVote = typeof opts?.onVote === 'function' ? opts.onVote : () => {};
    nomineesLocal.forEach((n, ix) => {
      const btn = createEl('button', 'lv2-cta-btn');
      btn.textContent = `Evict ${n.name} (${ix + 1})`;
      btn.setAttribute('aria-label', `Vote to evict ${n.name}. Press ${ix + 1} on keyboard.`);
      btn.dataset.key = String(ix + 1);
      Object.assign(btn.style, {
        padding: '10px 12px',
        borderRadius: '10px',
        background: 'linear-gradient(135deg,#19314f,#0e223b)',
        border: '1px solid rgba(143,211,255,0.3)',
        color: '#e9f4ff',
        fontWeight: '700',
        cursor: 'pointer',
        fontSize: 'clamp(0.8rem, 1.8vw, 0.95rem)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        width: '100%',
        maxWidth: '180px'
      });
      btn.addEventListener('click', () => {
        disableCtas();
        try {
          onVote(n.id);
        } catch (e) {
          console.error('[lv2:triple] Vote callback error:', e);
        }
      });
      ctaRow.appendChild(btn);
    });

    root.appendChild(grid);
    root.appendChild(ctaRow);
    overlay.appendChild(root);

    // Setup keyboard handler for 1/2/3 shortcuts
    keyHandler = (e) => {
      // Ignore if user is typing in an input field
      const target = e.target;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (!['1', '2', '3'].includes(e.key)) return;
      const idx = Number(e.key) - 1;
      const n = nomineesLocal[idx];
      if (!n) return;

      e.preventDefault();
      disableCtas();
      try {
        onVote(n.id);
      } catch (err) {
        console.error('[lv2:triple] Vote callback error:', err);
      }
    };
    document.addEventListener('keydown', keyHandler);

    console.info('[lv2:triple] Triple UI initialized for:', nomineesLocal.map(n => n.name).join(', '));
  }

  // Disable all CTA buttons after vote
  function disableCtas() {
    if (!ctaRow) return;
    ctaRow.querySelectorAll('button').forEach(b => {
      b.disabled = true;
      b.style.opacity = '0.6';
      b.style.cursor = 'default';
    });
  }

  // Export public API
  lv2.initTriple = initTriple;
  lv2.cleanupTriple = cleanup;
})();
