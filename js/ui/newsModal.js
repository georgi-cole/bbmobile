// MODULE: newsModal.js
// Modal for displaying Big Brother Network news in an iframe
// Opens https://bigbrothernetwork.com/ without leaving the app

(function(global) {
  'use strict';

  let modalContainer = null;

  /**
   * Create and show the news modal
   */
  function open() {
    console.info('[newsModal] Opening news modal');

    // Remove any existing modal
    close();

    // Create modal container
    modalContainer = document.createElement('div');
    modalContainer.className = 'news-modal';
    modalContainer.setAttribute('role', 'dialog');
    modalContainer.setAttribute('aria-modal', 'true');
    modalContainer.setAttribute('aria-labelledby', 'news-modal-title');

    // Create backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'news-modal__backdrop';
    backdrop.addEventListener('click', close);

    // Create dialog
    const dialog = document.createElement('div');
    dialog.className = 'news-modal__dialog';

    // Header
    const header = document.createElement('div');
    header.className = 'news-modal__header';

    const title = document.createElement('h2');
    title.id = 'news-modal-title';
    title.className = 'news-modal__title';
    title.textContent = 'Big Brother Network News';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'news-modal__close-btn';
    closeBtn.innerHTML = '✕';
    closeBtn.setAttribute('aria-label', 'Close news modal');
    closeBtn.addEventListener('click', close);

    header.appendChild(title);
    header.appendChild(closeBtn);

    // Content (iframe)
    const content = document.createElement('div');
    content.className = 'news-modal__content';

    // Warning message
    const warning = document.createElement('div');
    warning.className = 'news-modal__warning';
    warning.innerHTML = `
      <div class="news-modal__warning-icon">ℹ️</div>
      <div class="news-modal__warning-text">
        <strong>External Content</strong><br>
        You're viewing content from bigbrothernetwork.com. This site is not affiliated with this app.
      </div>
    `;

    const iframeContainer = document.createElement('div');
    iframeContainer.className = 'news-modal__iframe-container';

    const iframe = document.createElement('iframe');
    iframe.className = 'news-modal__iframe';
    iframe.src = 'https://bigbrothernetwork.com/';
    iframe.setAttribute('title', 'Big Brother Network News');
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups allow-forms');
    iframe.setAttribute('loading', 'lazy');

    // Loading indicator
    const loading = document.createElement('div');
    loading.className = 'news-modal__loading';
    loading.textContent = 'Loading Big Brother Network...';

    iframe.addEventListener('load', () => {
      loading.style.display = 'none';
      console.info('[newsModal] Iframe loaded successfully');
    });

    iframe.addEventListener('error', () => {
      loading.innerHTML = `
        <div style="color: #ff4444;">
          Failed to load content.<br>
          <a href="https://bigbrothernetwork.com/" target="_blank" rel="noopener noreferrer" 
             style="color: #00d4ff; text-decoration: underline; cursor: pointer;">
            Open in new tab instead
          </a>
        </div>
      `;
      console.error('[newsModal] Failed to load iframe');
    });

    iframeContainer.appendChild(loading);
    iframeContainer.appendChild(iframe);

    content.appendChild(warning);
    content.appendChild(iframeContainer);

    dialog.appendChild(header);
    dialog.appendChild(content);

    modalContainer.appendChild(backdrop);
    modalContainer.appendChild(dialog);

    // Add to DOM
    document.body.appendChild(modalContainer);

    // Lock body scroll
    document.body.style.overflow = 'hidden';

    // Handle ESC key
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        close();
      }
    };
    document.addEventListener('keydown', handleEscape);
    modalContainer._handleEscape = handleEscape;

    // Trigger entrance animation
    requestAnimationFrame(() => {
      modalContainer.classList.add('news-modal--visible');
    });
  }

  /**
   * Close and remove the modal
   */
  function close() {
    if (!modalContainer) return;

    console.info('[newsModal] Closing news modal');

    // Remove escape handler
    if (modalContainer._handleEscape) {
      document.removeEventListener('keydown', modalContainer._handleEscape);
    }

    // Trigger exit animation
    modalContainer.classList.remove('news-modal--visible');

    // Remove from DOM after animation
    setTimeout(() => {
      if (modalContainer && modalContainer.parentNode) {
        modalContainer.parentNode.removeChild(modalContainer);
      }
      modalContainer = null;

      // Restore body scroll
      document.body.style.overflow = '';
    }, 300);
  }

  // Expose to global scope
  global.NewsModal = {
    open,
    close
  };

  console.info('[newsModal] Module loaded');

})(window);
