(function (global) {
  'use strict';

  const ROOT_CLASS = 'eviction-carousel-root';
  const LIST_CLASS = 'eviction-list';
  const ITEM_CLASS = 'eviction-item';
  const AVATAR_CLASS = 'eviction-avatar';
  const NAME_CLASS = 'eviction-name';
  const BUTTON_CLASS = 'evict-button';

  function ensureContainer(node) {
    if (!node) return null;
    node.classList.add(ROOT_CLASS);
    return node;
  }

  function createItem(n) {
    const item = document.createElement('div');
    item.className = ITEM_CLASS;
    item.dataset.nomineeId = String(n.id);

    const avatarBtn = document.createElement('button');
    avatarBtn.type = 'button';
    avatarBtn.className = AVATAR_CLASS;
    avatarBtn.setAttribute('aria-label', `Select ${n.name || 'nominee'}`);
    avatarBtn.innerHTML = `<img src="${String(n.photo || '')}" alt="${String(n.name || 'Nominee')}" loading="lazy">`;

    const name = document.createElement('div');
    name.className = NAME_CLASS;
    name.textContent = n.name || '';

    item.appendChild(avatarBtn);
    item.appendChild(name);

    return item;
  }

  function findTvRoot() {
    const selectors = ['[data-faux-tv]', '[data-sm-faux-tv]', '.tvViewport', '#tv', '.tv'];
    for (const s of selectors) {
      const el = document.querySelector(s);
      if (el) return el;
    }
    return null;
  }

  function announce(container, text) {
    if (!container) return;
    let aria = container.querySelector('.eviction-aria-live');
    if (!aria) {
      aria = document.createElement('div');
      aria.className = 'eviction-aria-live';
      aria.setAttribute('aria-live', 'polite');
      aria.setAttribute('aria-atomic', 'true');
      aria.style.position = 'absolute';
      aria.style.left = '-9999px';
      container.appendChild(aria);
    }
    aria.textContent = text;
  }

  const EvictionCarousel = {
    _root: null,
    _list: null,
    _nominees: [],
    _selectedId: null,
    _evictButton: null,
    _opts: {},

    render(container, nominees, options) {
      try { if (global.closeAllVoteUI) global.closeAllVoteUI(); } catch (e) { /* closeAllVoteUI may not exist */ }

      this.teardown();
      const root = ensureContainer(container || findTvRoot() || document.getElementById('panel') || document.body);
      if (!root) throw new Error('No container available for EvictionCarousel');

      this._root = root;
      this._nominees = Array.isArray(nominees) ? nominees : [];
      this._opts = options || {};

      const list = document.createElement('div');
      list.className = LIST_CLASS;

      this._nominees.forEach(n => {
        const item = createItem(n);
        list.appendChild(item);

        const avatarBtn = item.querySelector(`.${AVATAR_CLASS}`);
        avatarBtn.addEventListener('click', () => this.selectNominee(String(n.id)));
        avatarBtn.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.selectNominee(String(n.id)); }
          if (e.key === 'ArrowRight') { this._focusNext(item); }
          if (e.key === 'ArrowLeft') { this._focusPrev(item); }
        });
      });

      root.appendChild(list);
      this._list = list;

      root.dataset.evictionCarousel = '1';

      try {
        global.game && global.game.bus && global.game.bus.emit && global.game.bus.emit('eviction:opened', { nominees: this._nominees });
      } catch (e) { /* game.bus may not exist */ }
    },

    selectNominee(id) {
      if (!this._list) return;
      if (this._selectedId === id) return;
      this._selectedId = id;

      const prev = this._list.querySelector(`.${ITEM_CLASS}.selected`);
      if (prev) prev.classList.remove('selected');

      const items = Array.from(this._list.querySelectorAll('.' + ITEM_CLASS));
      const found = items.find(it => it.dataset.nomineeId === String(id));
      if (!found) return;

      found.classList.add('selected');
      const avatar = found.querySelector('.' + AVATAR_CLASS);
      if (avatar) avatar.focus();
      try { found.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' }); } catch (e) { /* scrollIntoView options may not be supported */ }

      this._showEvictButton(found, id);

      try {
        global.game && global.game.bus && global.game.bus.emit && global.game.bus.emit('eviction:selected', { nomineeId: id });
      } catch (e) { /* game.bus may not exist */ }

      announce(this._root, `${found.querySelector('.' + NAME_CLASS).textContent} selected`);
    },

    _showEvictButton(item, id) {
      if (this._evictButton && this._evictButton.parentNode) this._evictButton.parentNode.removeChild(this._evictButton);

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = BUTTON_CLASS;
      btn.textContent = 'Evict';
      btn.setAttribute('aria-label', `Evict ${item.querySelector('.' + NAME_CLASS).textContent}`);

      btn.addEventListener('click', async () => {
        btn.disabled = true;
        try {
          try { global.game && global.game.bus && global.game.bus.emit && global.game.bus.emit('eviction:vote', { nomineeId: id }); } catch (e) { /* game.bus may not exist */ }

          if (typeof this._opts.onVote === 'function') {
            await this._opts.onVote(id);
          }

          try { global.game && global.game.bus && global.game.bus.emit && global.game.bus.emit('eviction:closed', { nomineeId: id }); } catch (e) { /* game.bus may not exist */ }

        } catch (err) {
          console.error('[EvictionCarousel] vote handler error', err);
          btn.disabled = false;
        }
      });

      item.appendChild(btn);
      this._evictButton = btn;
    },

    _focusNext(item) {
      const items = Array.from(this._list.querySelectorAll('.' + ITEM_CLASS));
      const idx = items.indexOf(item);
      if (idx >= 0 && idx < items.length - 1) items[idx + 1].querySelector('.' + AVATAR_CLASS).focus();
    },

    _focusPrev(item) {
      const items = Array.from(this._list.querySelectorAll('.' + ITEM_CLASS));
      const idx = items.indexOf(item);
      if (idx > 0) items[idx - 1].querySelector('.' + AVATAR_CLASS).focus();
    },

    hide() { this.teardown(); },

    teardown() {
      try { if (this._list && this._list.parentNode) this._list.parentNode.removeChild(this._list); } catch (e) { /* element may already be removed */ }
      if (this._root) { delete this._root.dataset.evictionCarousel; }
      this._root = null;
      this._list = null;
      this._nominees = [];
      this._selectedId = null;
      this._evictButton = null;
    }
  };

  try { global.EvictionCarousel = EvictionCarousel; } catch (e) { /* window may be read-only */ }

})(window);
