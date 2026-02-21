// MODULE: plea-modal.js
// Lightweight Plea modal for human nominees during nomination ceremony.
// Exposes window.PleaUI.show({ nomineeId, nomineeName, onSubmit }) => Promise<{submitted, text}>

(function(global) {
  'use strict';

  let _currentModal = null;
  let _keydownHandler = null;

  /**
   * Show the Plea modal for a human nominee.
   *
   * @param {Object}   opts
   * @param {string}   opts.nomineeId   ID of the nominee making the plea
   * @param {string}   opts.nomineeName Display name for the nominee
   * @param {Function} [opts.onSubmit]  Called with plea text when submitted
   * @returns {Promise<{submitted: boolean, text: string}>}
   */
  function show(opts) {
    const nomineeName = opts.nomineeName || 'You';
    const onSubmit = opts.onSubmit;

    return new Promise(function(resolve) {
      let resolved = false;
      const failsafe = setTimeout(function() {
        _close(null);
        if (!resolved) { resolved = true; resolve({ submitted: false, text: '' }); }
      }, 90000);

      function settle(result) {
        if (resolved) return;
        resolved = true;
        clearTimeout(failsafe);
        resolve(result);
      }

      try {
        // Backdrop
        const backdrop = document.createElement('div');
        backdrop.setAttribute('role', 'dialog');
        backdrop.setAttribute('aria-modal', 'true');
        backdrop.setAttribute('aria-label', 'Plea to the Head of Household');
        backdrop.style.cssText = [
          'position:fixed',
          'inset:0',
          'z-index:9999999',
          'background:rgba(10,15,25,0.88)',
          'display:flex',
          'align-items:center',
          'justify-content:center',
          'padding:20px',
          'box-sizing:border-box',
        ].join(';');

        // Card
        const card = document.createElement('div');
        card.style.cssText = [
          'background:linear-gradient(145deg,#1a2a3a,#243040)',
          'border:2px solid rgba(255,215,0,0.35)',
          'border-radius:12px',
          'padding:22px 20px 18px',
          'max-width:420px',
          'width:100%',
          'box-shadow:0 16px 48px rgba(0,0,0,0.7)',
          'box-sizing:border-box',
        ].join(';');

        // Title
        const title = document.createElement('h2');
        title.style.cssText = 'margin:0 0 6px;font-size:1.2rem;color:#fff;text-align:center;';
        title.textContent = '\uD83D\uDD11 Plead Your Case';
        card.appendChild(title);

        // Subtitle
        const sub = document.createElement('p');
        sub.style.cssText = 'margin:0 0 14px;font-size:0.82rem;color:#a0b4c8;text-align:center;line-height:1.4;';
        sub.textContent = nomineeName + ', you have been nominated. Make your plea to the Head of Household.';
        card.appendChild(sub);

        // Textarea
        const textarea = document.createElement('textarea');
        textarea.setAttribute('aria-label', 'Your plea message');
        textarea.placeholder = 'Write your plea here\u2026';
        textarea.maxLength = 400;
        textarea.rows = 4;
        textarea.style.cssText = [
          'width:100%',
          'padding:10px',
          'font-size:0.88rem',
          'border:2px solid rgba(90,160,230,0.4)',
          'border-radius:6px',
          'background:rgba(10,15,25,0.6)',
          'color:#d8e8f5',
          'font-family:inherit',
          'resize:vertical',
          'box-sizing:border-box',
          'margin-bottom:14px',
        ].join(';');
        card.appendChild(textarea);

        // Buttons row
        const btnRow = document.createElement('div');
        btnRow.style.cssText = 'display:flex;gap:10px;justify-content:center;';

        // Submit
        const submitBtn = document.createElement('button');
        submitBtn.textContent = 'Submit Plea';
        submitBtn.setAttribute('aria-label', 'Submit your plea');
        submitBtn.style.cssText = [
          'padding:9px 24px',
          'background:#5aa575',
          'border:none',
          'border-radius:6px',
          'color:#fff',
          'font-size:0.9rem',
          'font-weight:600',
          'cursor:pointer',
        ].join(';');
        submitBtn.addEventListener('click', function() {
          const text = textarea.value.trim();
          if (!text) {
            textarea.focus();
            textarea.style.borderColor = 'rgba(255,100,100,0.7)';
            return;
          }
          _close(backdrop);
          if (typeof onSubmit === 'function') { try { onSubmit(text); } catch(e) { /* ignore */ } }
          settle({ submitted: true, text: text });
        });
        btnRow.appendChild(submitBtn);

        // Skip
        const skipBtn = document.createElement('button');
        skipBtn.textContent = 'Skip';
        skipBtn.setAttribute('aria-label', 'Skip making a plea');
        skipBtn.style.cssText = [
          'padding:9px 20px',
          'background:rgba(255,255,255,0.08)',
          'border:1px solid rgba(255,255,255,0.28)',
          'border-radius:6px',
          'color:rgba(255,255,255,0.78)',
          'font-size:0.9rem',
          'font-weight:600',
          'cursor:pointer',
        ].join(';');
        skipBtn.addEventListener('click', function() {
          _close(backdrop);
          settle({ submitted: false, text: '' });
        });
        btnRow.appendChild(skipBtn);

        card.appendChild(btnRow);
        backdrop.appendChild(card);
        document.body.appendChild(backdrop);
        _currentModal = backdrop;

        // Trap focus
        textarea.focus();

        // Escape closes
        _keydownHandler = function(e) {
          if (e.key === 'Escape') {
            _close(backdrop);
            settle({ submitted: false, text: '' });
          }
        };
        document.addEventListener('keydown', _keydownHandler);

      } catch(err) {
        console.error('[PleaUI] Error rendering modal:', err);
        settle({ submitted: false, text: '' });
      }
    });
  }

  function _close(modal) {
    const el = modal || _currentModal;
    if (el && el.parentNode) {
      el.parentNode.removeChild(el);
    }
    if (_keydownHandler) {
      document.removeEventListener('keydown', _keydownHandler);
      _keydownHandler = null;
    }
    _currentModal = null;
  }

  /** @returns {boolean} true if a plea modal is currently visible */
  function isActive() { return _currentModal !== null; }

  // Export
  global.PleaUI = {
    show: show,
    isActive: isActive,
  };

})(typeof window !== 'undefined' ? window : global);
