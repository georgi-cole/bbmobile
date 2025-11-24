// MODULE: tv-sequence.js
// Sequential Replace Auto-Advancing Cards for faux TV area
// Auto-splits lengthy text and displays one chunk at a time with fade transitions

(function(global) {
  'use strict';

  // ======= CONFIGURATION =======
  
  const CONFIG = {
    // Dwell time calculation
    BASE_DWELL_MS: 3000,
    WORDS_PER_SECOND: 40,
    WORD_TIME_MULTIPLIER: 2000,
    MIN_DWELL_MS: 3000,
    MAX_DWELL_MS: 8000,
    
    // Content splitting
    MIN_SENTENCE_WORDS: 30, // Merge sentences shorter than this
    WORD_BATCH_SIZE: 25,    // Average words per batch (22-28 range)
    WORD_BATCH_VARIANCE: 3, // +/- variance for word batches
    
    // Fade transition timing
    FADE_DURATION_MS: 400,
    
    // Avatar display
    SHOW_AVATAR_FIRST_ONLY: true, // Show avatar only on first chunk by default
  };

  // ======= STATE =======
  
  let currentSequence = null;
  let currentTimeoutId = null;
  let isAborted = false;

  // ======= UTILITY FUNCTIONS =======

  /**
   * Calculate dwell time for a chunk based on word count
   * Formula: base 3.0s + (words / 40 * 2.0s), clamped between 3s and 8s
   */
  function calculateDwellTime(text) {
    const words = countWords(text);
    const calculated = CONFIG.BASE_DWELL_MS + 
                      (words / CONFIG.WORDS_PER_SECOND * CONFIG.WORD_TIME_MULTIPLIER);
    return Math.max(CONFIG.MIN_DWELL_MS, Math.min(CONFIG.MAX_DWELL_MS, calculated));
  }

  /**
   * Count words in text
   */
  function countWords(text) {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(w => w.length > 0).length;
  }

  /**
   * Split text into paragraphs
   */
  function splitIntoParagraphs(text) {
    if (!text) return [];
    return text.split(/\n\n+/)
               .map(p => p.trim())
               .filter(p => p.length > 0);
  }

  /**
   * Split text into sentences
   */
  function splitIntoSentences(text) {
    if (!text) return [];
    // Split on sentence boundaries (., !, ?) followed by space or end
    return text.split(/([.!?]+\s+|[.!?]+$)/)
               .reduce((acc, part, i, arr) => {
                 if (i % 2 === 0 && part.trim()) {
                   const sentence = part.trim() + (arr[i + 1] || '').trim();
                   if (sentence) acc.push(sentence);
                 }
                 return acc;
               }, []);
  }

  /**
   * Split text into word batches of approximately WORD_BATCH_SIZE words
   */
  function splitIntoWordBatches(text) {
    if (!text) return [];
    const words = text.trim().split(/\s+/);
    const batches = [];
    const targetSize = CONFIG.WORD_BATCH_SIZE;
    const variance = CONFIG.WORD_BATCH_VARIANCE;
    
    let currentBatch = [];
    let targetBatchSize = targetSize + Math.floor(Math.random() * (variance * 2 + 1)) - variance;
    
    for (let i = 0; i < words.length; i++) {
      currentBatch.push(words[i]);
      
      if (currentBatch.length >= targetBatchSize || i === words.length - 1) {
        batches.push(currentBatch.join(' '));
        currentBatch = [];
        targetBatchSize = targetSize + Math.floor(Math.random() * (variance * 2 + 1)) - variance;
      }
    }
    
    return batches;
  }

  /**
   * Merge consecutive short sentences to avoid overly rapid sequences
   */
  function mergeShortSentences(sentences) {
    if (!sentences || sentences.length === 0) return [];
    
    const merged = [];
    let current = '';
    
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      const words = countWords(current + ' ' + sentence);
      
      if (words < CONFIG.MIN_SENTENCE_WORDS && i < sentences.length - 1) {
        // Accumulate short sentences
        current = current ? current + ' ' + sentence : sentence;
      } else {
        // Push accumulated or final sentence
        merged.push(current ? current + ' ' + sentence : sentence);
        current = '';
      }
    }
    
    // Handle any remaining accumulated text
    if (current) {
      merged.push(current);
    }
    
    return merged;
  }

  /**
   * Check if text fits in the TV viewport without scrolling
   */
  function checkFitsInViewport(element) {
    if (!element) return false;
    
    const viewport = document.querySelector('.tvViewport');
    if (!viewport) return false;
    
    const viewportHeight = viewport.clientHeight;
    const elementHeight = element.scrollHeight;
    
    // Add some padding buffer (20px top + 20px bottom)
    const hasBuffer = elementHeight <= (viewportHeight - 40);
    
    return hasBuffer;
  }

  /**
   * Split content into chunks that fit in viewport
   */
  function splitContentIntoChunks(rawText) {
    if (!rawText || typeof rawText !== 'string') {
      console.warn('[TVSequence] splitContentIntoChunks: Invalid rawText');
      return [];
    }

    const chunks = [];
    const paragraphs = splitIntoParagraphs(rawText);
    
    for (const paragraph of paragraphs) {
      // Try paragraph as-is first
      if (wouldFitInViewport(paragraph)) {
        chunks.push(paragraph);
        continue;
      }
      
      // Split into sentences if paragraph too tall
      const sentences = splitIntoSentences(paragraph);
      const merged = mergeShortSentences(sentences);
      
      for (const sentence of merged) {
        if (wouldFitInViewport(sentence)) {
          chunks.push(sentence);
          continue;
        }
        
        // Split into word batches if sentence too tall
        const batches = splitIntoWordBatches(sentence);
        chunks.push(...batches);
      }
    }
    
    return chunks;
  }

  /**
   * Estimate if text would fit in viewport
   * This is a heuristic based on character count and viewport size
   */
  function wouldFitInViewport(text) {
    const viewport = document.querySelector('.tvViewport');
    if (!viewport) return true; // Assume fits if no viewport
    
    const viewportHeight = viewport.clientHeight;
    
    // Rough estimate: 16px line height, ~60 chars per line for mobile
    const estimatedLines = Math.ceil(text.length / 60);
    const estimatedHeight = estimatedLines * 24; // 16px line + 8px spacing
    
    // Add overhead for title, padding, etc (approximately 120px)
    const totalHeight = estimatedHeight + 120;
    
    return totalHeight <= viewportHeight;
  }

  // ======= UI RENDERING =======

  /**
   * Create chunk card element
   */
  function createChunkCard(chunk, index, total, options = {}) {
    const card = document.createElement('div');
    card.className = 'tv-sequence-card tv-inline-card revealCard diaryRoomCard tvCardBody';
    card.setAttribute('role', 'article');
    card.setAttribute('aria-label', `Part ${index + 1} of ${total}`);
    card.setAttribute('tabindex', '0');
    
    if (options.tone) {
      card.setAttribute('data-tone', options.tone);
    }
    
    // Avatar row (only on first chunk by default)
    const showAvatar = options.showAvatar !== undefined 
      ? options.showAvatar 
      : (CONFIG.SHOW_AVATAR_FIRST_ONLY ? index === 0 : true);
    
    if (showAvatar && (options.actorIds || options.avatarUrl)) {
      const avatarRow = createAvatarRow(options.actorIds, options.avatarUrl);
      if (avatarRow) {
        card.appendChild(avatarRow);
      }
    }
    
    // Title
    if (options.title) {
      const h3 = document.createElement('h3');
      h3.textContent = options.title;
      card.appendChild(h3);
    }
    
    // Content
    const p = document.createElement('p');
    p.className = 'tv-sequence-content';
    p.textContent = chunk;
    card.appendChild(p);
    
    // Progress indicator
    const progress = createProgressIndicator(index, total);
    card.appendChild(progress);
    
    return card;
  }

  /**
   * Create avatar row
   */
  function createAvatarRow(actorIds, avatarUrl) {
    if (!actorIds && !avatarUrl) return null;
    
    const row = document.createElement('div');
    row.className = 'tv-card-avatars';
    row.style.cssText = `
      display: flex;
      gap: 12px;
      justify-content: center;
      margin-bottom: 16px;
      flex-wrap: wrap;
    `;
    
    // Handle single avatar URL
    if (avatarUrl && !actorIds) {
      const img = document.createElement('img');
      img.src = avatarUrl;
      img.alt = 'Player';
      img.style.cssText = `
        width: 64px;
        height: 64px;
        border-radius: 12px;
        border: 2px solid rgba(255,255,255,0.3);
        object-fit: cover;
      `;
      row.appendChild(img);
      return row;
    }
    
    // Handle actor IDs
    const actors = Array.isArray(actorIds) ? actorIds : [actorIds];
    
    for (const actorId of actors) {
      const actor = global.getP ? global.getP(actorId) : null;
      if (!actor) continue;
      
      const avatarWrap = document.createElement('div');
      avatarWrap.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
      `;
      
      const img = document.createElement('img');
      const resolveAvatar = (global.Game || global).resolveAvatar;
      img.src = resolveAvatar ? resolveAvatar(actor) : (actor.avatar || actor.img || actor.photo);
      if (!img.src) {
        img.src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(actor.name);
      }
      img.alt = actor.name;
      img.style.cssText = `
        width: 64px;
        height: 64px;
        border-radius: 12px;
        border: 2px solid rgba(255,255,255,0.3);
        object-fit: cover;
      `;
      avatarWrap.appendChild(img);
      
      const nameLabel = document.createElement('div');
      nameLabel.className = 'tiny';
      nameLabel.textContent = actor.name;
      nameLabel.style.cssText = `
        text-align: center;
        font-size: 12px;
        opacity: 0.9;
      `;
      avatarWrap.appendChild(nameLabel);
      
      row.appendChild(avatarWrap);
    }
    
    return row;
  }

  /**
   * Create progress indicator (Part X/Y + progress bar)
   */
  function createProgressIndicator(index, total) {
    const container = document.createElement('div');
    container.className = 'tv-sequence-progress-container';
    
    // Part counter
    const counter = document.createElement('div');
    counter.className = 'tv-sequence-progress-counter';
    counter.textContent = `Part ${index + 1}/${total}`;
    counter.setAttribute('aria-label', `Part ${index + 1} of ${total}`);
    container.appendChild(counter);
    
    // Progress bar
    const barBg = document.createElement('div');
    barBg.className = 'tv-sequence-progress-bar-bg';
    
    const barFill = document.createElement('div');
    barFill.className = 'tv-sequence-progress-bar-fill';
    barFill.style.width = '0%';
    barFill.setAttribute('role', 'progressbar');
    barFill.setAttribute('aria-valuemin', '0');
    barFill.setAttribute('aria-valuemax', '100');
    barFill.setAttribute('aria-valuenow', '0');
    
    barBg.appendChild(barFill);
    container.appendChild(barBg);
    
    return container;
  }

  /**
   * Create skip button
   */
  function createSkipButton(onClick) {
    const btn = document.createElement('button');
    btn.className = 'tv-sequence-skip-btn btn';
    btn.textContent = 'Skip';
    btn.setAttribute('aria-label', 'Skip to next part');
    btn.onclick = onClick;
    return btn;
  }

  /**
   * Create end card with Replay and Show All buttons
   */
  function createEndCard(options = {}) {
    const card = document.createElement('div');
    card.className = 'tv-sequence-end-card tv-inline-card revealCard diaryRoomCard tvCardBody';
    card.setAttribute('role', 'article');
    card.setAttribute('aria-label', 'Sequence complete');
    card.setAttribute('tabindex', '0');
    
    const h3 = document.createElement('h3');
    h3.textContent = options.endTitle || 'Sequence Complete';
    card.appendChild(h3);
    
    if (options.endMessage) {
      const p = document.createElement('p');
      p.textContent = options.endMessage;
      card.appendChild(p);
    }
    
    const btnRow = document.createElement('div');
    btnRow.className = 'tv-sequence-end-buttons';
    
    // Replay button
    const replayBtn = document.createElement('button');
    replayBtn.className = 'btn primary';
    replayBtn.textContent = 'Replay';
    replayBtn.setAttribute('aria-label', 'Replay sequence');
    replayBtn.onclick = () => {
      if (options.onReplay) {
        options.onReplay();
      }
    };
    btnRow.appendChild(replayBtn);
    
    // Show All button
    const showAllBtn = document.createElement('button');
    showAllBtn.className = 'btn';
    showAllBtn.textContent = 'Show All';
    showAllBtn.setAttribute('aria-label', 'Show all content at once');
    showAllBtn.onclick = () => {
      if (options.onShowAll) {
        options.onShowAll();
      }
    };
    btnRow.appendChild(showAllBtn);
    
    card.appendChild(btnRow);
    
    return card;
  }

  /**
   * Animate progress bar
   */
  function animateProgressBar(progressBar, duration) {
    if (!progressBar) return;
    
    const fill = progressBar.querySelector('.tv-sequence-progress-bar-fill');
    if (!fill) return;
    
    // Reset to 0
    fill.style.transition = 'none';
    fill.style.width = '0%';
    fill.setAttribute('aria-valuenow', '0');
    
    // Trigger reflow
    void fill.offsetWidth;
    
    // Animate to 100%
    fill.style.transition = `width ${duration}ms linear`;
    fill.style.width = '100%';
    fill.setAttribute('aria-valuenow', '100');
  }

  // ======= SEQUENCE CONTROL =======

  /**
   * Display a single chunk
   */
  function displayChunk(chunks, index, options) {
    if (isAborted || !chunks || index >= chunks.length) {
      return;
    }
    
    const content = getTVOverlayContent();
    if (!content) {
      console.error('[TVSequence] Cannot display chunk - no TV overlay content');
      return;
    }
    
    // Clear previous content with fade out
    const oldCard = content.querySelector('.tv-sequence-card, .tv-sequence-end-card');
    if (oldCard) {
      oldCard.style.opacity = '0';
      setTimeout(() => {
        oldCard.remove();
      }, CONFIG.FADE_DURATION_MS);
    }
    
    // Create and add new card
    setTimeout(() => {
      if (isAborted) return;
      
      const card = createChunkCard(chunks[index], index, chunks.length, options);
      card.style.opacity = '0';
      content.appendChild(card);
      
      // Ensure TV container has proper class
      const tv = document.getElementById('tv');
      if (tv) tv.classList.add('tvTall');
      
      // Check if card fits
      const fits = checkFitsInViewport(card);
      if (!fits) {
        console.warn('[TVSequence] Chunk does not fit in viewport:', chunks[index].substring(0, 50) + '...');
        
        // Fallback: show truncated version with "Show All" button
        showFallbackCard(chunks, options);
        return;
      }
      
      // Fade in
      setTimeout(() => {
        card.style.opacity = '1';
      }, 50);
      
      // Add skip button
      const skipBtn = createSkipButton(() => advanceToNext(chunks, index, options));
      content.appendChild(skipBtn);
      
      // Calculate dwell time and animate progress
      const dwellTime = calculateDwellTime(chunks[index]);
      const progressContainer = card.querySelector('.tv-sequence-progress-container');
      if (progressContainer) {
        animateProgressBar(progressContainer, dwellTime);
      }
      
      // Auto-advance after dwell time
      currentTimeoutId = setTimeout(() => {
        advanceToNext(chunks, index, options);
      }, dwellTime);
      
    }, CONFIG.FADE_DURATION_MS);
  }

  /**
   * Advance to next chunk or end card
   */
  function advanceToNext(chunks, currentIndex, options) {
    if (isAborted) return;
    
    // Clear current timeout
    if (currentTimeoutId) {
      clearTimeout(currentTimeoutId);
      currentTimeoutId = null;
    }
    
    const nextIndex = currentIndex + 1;
    
    if (nextIndex < chunks.length) {
      // Show next chunk
      displayChunk(chunks, nextIndex, options);
    } else {
      // Show end card
      showEndCard(chunks, options);
    }
  }

  /**
   * Show end card
   */
  function showEndCard(chunks, options) {
    const content = getTVOverlayContent();
    if (!content) return;
    
    // Clear previous content
    const oldCard = content.querySelector('.tv-sequence-card, .tv-sequence-end-card');
    const skipBtn = content.querySelector('.tv-sequence-skip-btn');
    
    if (oldCard) {
      oldCard.style.opacity = '0';
      setTimeout(() => oldCard.remove(), CONFIG.FADE_DURATION_MS);
    }
    
    if (skipBtn) {
      skipBtn.style.opacity = '0';
      setTimeout(() => skipBtn.remove(), CONFIG.FADE_DURATION_MS);
    }
    
    // Create end card
    setTimeout(() => {
      if (isAborted) return;
      
      const endCard = createEndCard({
        endTitle: options.endTitle,
        endMessage: options.endMessage,
        onReplay: () => {
          // Restart sequence
          start(options.rawText, options);
        },
        onShowAll: () => {
          // Show all content at once
          showAllContent(chunks, options);
        }
      });
      
      endCard.style.opacity = '0';
      content.appendChild(endCard);
      
      setTimeout(() => {
        endCard.style.opacity = '1';
      }, 50);
      
    }, CONFIG.FADE_DURATION_MS);
  }

  /**
   * Show all content at once (stacked multi-card view)
   */
  function showAllContent(chunks, options) {
    const content = getTVOverlayContent();
    if (!content) return;
    
    // Clear sequence UI
    clearTVOverlay();
    
    // Create single card with all content
    const card = document.createElement('div');
    card.className = 'tv-sequence-all-card tv-inline-card revealCard diaryRoomCard tvCardBody';
    card.setAttribute('role', 'article');
    card.setAttribute('aria-label', 'All content');
    card.setAttribute('tabindex', '0');
    card.style.maxHeight = '80vh';
    card.style.overflowY = 'auto';
    
    if (options.title) {
      const h3 = document.createElement('h3');
      h3.textContent = options.title;
      card.appendChild(h3);
    }
    
    // Add all chunks
    for (let i = 0; i < chunks.length; i++) {
      const p = document.createElement('p');
      p.textContent = chunks[i];
      p.style.marginBottom = '1em';
      card.appendChild(p);
    }
    
    content.appendChild(card);
    
    const tv = document.getElementById('tv');
    if (tv) tv.classList.add('tvTall');
    
    // Focus for accessibility
    setTimeout(() => card.focus(), 100);
  }

  /**
   * Show fallback card when content doesn't fit
   */
  function showFallbackCard(chunks, options) {
    const content = getTVOverlayContent();
    if (!content) return;
    
    clearTVOverlay();
    
    const card = document.createElement('div');
    card.className = 'tv-sequence-fallback-card tv-inline-card revealCard diaryRoomCard tvCardBody';
    card.setAttribute('role', 'article');
    card.setAttribute('aria-label', 'Content preview');
    card.setAttribute('tabindex', '0');
    
    const h3 = document.createElement('h3');
    h3.textContent = options.title || 'Content Preview';
    card.appendChild(h3);
    
    const p = document.createElement('p');
    const preview = chunks[0].substring(0, 200) + (chunks[0].length > 200 ? '...' : '');
    p.textContent = preview;
    card.appendChild(p);
    
    const notice = document.createElement('p');
    notice.className = 'tiny';
    notice.style.opacity = '0.7';
    notice.textContent = 'Content is too long for sequential display.';
    card.appendChild(notice);
    
    const showAllBtn = document.createElement('button');
    showAllBtn.className = 'btn primary';
    showAllBtn.textContent = 'Show All';
    showAllBtn.onclick = () => showAllContent(chunks, options);
    card.appendChild(showAllBtn);
    
    content.appendChild(card);
    
    const tv = document.getElementById('tv');
    if (tv) tv.classList.add('tvTall');
  }

  // ======= HELPER FUNCTIONS =======

  /**
   * Get TV overlay content container
   */
  function getTVOverlayContent() {
    // Try to use TVCards module if available
    if (global.TVCards && global.TVCards.ensureTVOverlay) {
      return global.TVCards.ensureTVOverlay();
    }
    
    // Fallback: find or create overlay content
    let content = document.querySelector('.tvOverlayContent');
    if (!content) {
      const overlay = document.getElementById('tvOverlay');
      if (overlay) {
        content = document.createElement('div');
        content.className = 'tvOverlayContent';
        overlay.appendChild(content);
      }
    }
    return content;
  }

  /**
   * Clear TV overlay
   */
  function clearTVOverlay() {
    const content = getTVOverlayContent();
    if (content) {
      content.innerHTML = '';
    }
    
    // Clear skip button
    const skipBtn = document.querySelector('.tv-sequence-skip-btn');
    if (skipBtn) {
      skipBtn.remove();
    }
    
    const tv = document.getElementById('tv');
    if (tv) tv.classList.remove('tvTall');
  }

  // ======= PUBLIC API =======

  /**
   * Start a sequential card sequence
   * @param {string} rawText - Raw narrative/content text
   * @param {Object} options - Configuration options
   * @param {string} [options.title] - Card title
   * @param {string} [options.tone] - Card tone/style
   * @param {number|number[]} [options.actorIds] - Actor player IDs for avatars
   * @param {string} [options.avatarUrl] - Direct avatar URL
   * @param {boolean} [options.showAvatar] - Whether to show avatars
   * @param {string} [options.endTitle] - End card title
   * @param {string} [options.endMessage] - End card message
   * @returns {Promise} Resolves when sequence completes
   */
  function start(rawText, options = {}) {
    // Abort any existing sequence
    abort();
    
    // Reset state
    isAborted = false;
    
    // Split content into chunks
    const chunks = splitContentIntoChunks(rawText, options);
    
    if (!chunks || chunks.length === 0) {
      console.warn('[TVSequence] No chunks to display');
      return Promise.resolve();
    }
    
    console.info(`[TVSequence] Starting sequence with ${chunks.length} chunks`);
    
    // Store current sequence
    currentSequence = {
      chunks,
      options,
      startTime: Date.now()
    };
    
    // Start displaying chunks
    displayChunk(chunks, 0, options);
    
    return new Promise((resolve) => {
      // Store resolve callback for cleanup
      currentSequence.resolve = resolve;
    });
  }

  /**
   * Abort current sequence
   * Clears timers and replaces content
   */
  function abort() {
    console.info('[TVSequence] Aborting sequence');
    
    isAborted = true;
    
    if (currentTimeoutId) {
      clearTimeout(currentTimeoutId);
      currentTimeoutId = null;
    }
    
    clearTVOverlay();
    
    if (currentSequence && currentSequence.resolve) {
      currentSequence.resolve();
    }
    
    currentSequence = null;
  }

  /**
   * Replay current sequence
   */
  function replay() {
    if (!currentSequence) {
      console.warn('[TVSequence] No sequence to replay');
      return;
    }
    
    const { chunks, options } = currentSequence;
    start(options.rawText || chunks.join('\n\n'), options);
  }

  /**
   * Show all content at once
   */
  function showAll() {
    if (!currentSequence) {
      console.warn('[TVSequence] No sequence to show');
      return;
    }
    
    const { chunks, options } = currentSequence;
    showAllContent(chunks, options);
  }

  // ======= EXPORTS =======

  const TVSequence = {
    start,
    abort,
    replay,
    showAll,
    // Expose config for testing
    CONFIG
  };

  // Export to global namespace
  global.TVSequence = TVSequence;

  // Also export as module for backward compatibility
  if (global.UI) {
    global.UI.TVSequence = TVSequence;
  }

  console.info('[TVSequence] Module loaded');

})(window);
