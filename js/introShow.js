// MODULE: introShow.js
// Reality-TV style animated intro sequence with GSAP
// Features: camera pans, zooms, parallax, lighting sweeps, live reactions, skip button

(function(g) {
  'use strict';

  // Configuration
  const CONFIG = {
    cardDuration: 3500,      // ms per contestant
    transitionDuration: 800, // ms between contestants
    reactionsPerCard: 8,     // number of floating reactions per contestant
    enableParallax: true,
    enableLighting: true,
    enableReactions: true,
    musicKey: 'theme_opening' // audio track key
  };

  // Emoji pool for reactions
  const EMOJI_POOL = ['🔥', '❤️', '👏', '😍', '🎉', '⭐', '💯', '👑', '🎊', '✨', '💪', '🙌'];
  
  // Comment templates for live reactions
  const COMMENT_TEMPLATES = [
    'OMG {name}!',
    '{name} is amazing!',
    'Love {name}!',
    'Go {name}!',
    '{name} FTW!',
    'Team {name}!',
    'Yaaas {name}!',
    '{name} is my fav!',
    'Rooting for {name}!',
    '{name} looks fierce!'
  ];

  let currentSequence = null;
  let skipCallback = null;
  let isActive = false;

  // Check if GSAP is loaded
  function isGsapAvailable() {
    return typeof gsap !== 'undefined';
  }

  // Create the intro overlay container
  function createOverlay() {
    let overlay = document.getElementById('introShowOverlay');
    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.id = 'introShowOverlay';
    overlay.className = 'intro-show-overlay';
    overlay.innerHTML = `
      <div class="intro-show-background">
        <div class="intro-bg-layer intro-bg-layer-1"></div>
        <div class="intro-bg-layer intro-bg-layer-2"></div>
        <div class="intro-bg-layer intro-bg-layer-3"></div>
        <div class="intro-lighting-sweep"></div>
      </div>
      <div class="intro-show-stage">
        <div class="intro-card-container"></div>
      </div>
      <div class="intro-reactions-layer"></div>
      <button class="intro-skip-btn" aria-label="Skip intro">
        <span>⏩ SKIP INTRO</span>
      </button>
    `;

    document.body.appendChild(overlay);
    
    // Wire skip button
    const skipBtn = overlay.querySelector('.intro-skip-btn');
    skipBtn.addEventListener('click', () => {
      if (skipCallback) skipCallback();
    });

    return overlay;
  }

  // Remove overlay
  function removeOverlay() {
    const overlay = document.getElementById('introShowOverlay');
    if (overlay) {
      overlay.remove();
    }
  }

  // Resolve avatar for a player with fallback chain
  function resolveAvatarForPlayer(player) {
    return g.resolveAvatar?.(player) ||
           player.avatar ||
           'https://api.dicebear.com/6.x/bottts/svg?seed=' + (player.name || 'Guest');
  }

  // Build a contestant card
  function buildContestantCard(player) {
    const card = document.createElement('div');
    card.className = 'intro-contestant-card';
    
    const avatar = resolveAvatarForPlayer(player);
    
    card.innerHTML = `
      <div class="intro-card-bg"></div>
      <div class="intro-card-content">
        <div class="intro-card-avatar-wrapper">
          <div class="intro-card-avatar-glow"></div>
          <img src="${avatar}" alt="${player.name}" class="intro-card-avatar" onerror="this.src='https://api.dicebear.com/6.x/bottts/svg?seed=${player.name}'">
        </div>
        <div class="intro-card-info">
          <div class="intro-card-name">${player.name || 'Guest'}</div>
          <div class="intro-card-meta">
            <span class="intro-card-age">${player.age || '?'}</span>
            ${player.location ? `<span class="intro-card-location">${player.location}</span>` : ''}
          </div>
          ${player.occupation ? `<div class="intro-card-occupation">${player.occupation}</div>` : ''}
        </div>
      </div>
      <div class="intro-card-spotlight"></div>
    `;

    return card;
  }

  // Spawn a floating reaction (emoji)
  function spawnEmoji(container, emoji) {
    const el = document.createElement('div');
    el.className = 'intro-reaction-emoji';
    el.textContent = emoji;
    el.style.left = (20 + Math.random() * 60) + '%';
    el.style.bottom = '-50px';
    container.appendChild(el);

    // Animate with GSAP
    if (isGsapAvailable()) {
      gsap.to(el, {
        bottom: '110%',
        duration: 3 + Math.random() * 2,
        ease: 'power1.out',
        opacity: 0,
        scale: 0.5,
        rotation: Math.random() * 60 - 30,
        onComplete: () => el.remove()
      });
    } else {
      // Fallback CSS animation
      el.style.animation = 'floatUp 4s ease-out forwards';
      setTimeout(() => el.remove(), 4000);
    }
  }

  // Spawn a floating comment
  function spawnComment(container, text) {
    const el = document.createElement('div');
    el.className = 'intro-reaction-comment';
    el.textContent = text;
    el.style.left = (10 + Math.random() * 80) + '%';
    el.style.top = (30 + Math.random() * 40) + '%';
    container.appendChild(el);

    // Animate with GSAP
    if (isGsapAvailable()) {
      gsap.fromTo(el, 
        { opacity: 0, scale: 0.5, y: 20 },
        { 
          opacity: 1, 
          scale: 1, 
          y: 0, 
          duration: 0.5,
          ease: 'back.out(1.7)',
          onComplete: () => {
            gsap.to(el, {
              opacity: 0,
              y: -20,
              duration: 0.5,
              delay: 1.5,
              onComplete: () => el.remove()
            });
          }
        }
      );
    } else {
      // Fallback
      el.style.animation = 'fadeInOut 2.5s ease-out forwards';
      setTimeout(() => el.remove(), 2500);
    }
  }

  // Generate reactions for a player
  function generateReactions(container, player) {
    if (!CONFIG.enableReactions) return;

    const name = player.name || 'them';
    
    // Schedule emoji bursts
    for (let i = 0; i < CONFIG.reactionsPerCard; i++) {
      setTimeout(() => {
        const emoji = EMOJI_POOL[Math.floor(Math.random() * EMOJI_POOL.length)];
        spawnEmoji(container, emoji);
      }, Math.random() * (CONFIG.cardDuration - 500));
    }

    // Schedule comments
    const numComments = 2 + Math.floor(Math.random() * 3); // 2-4 comments
    for (let i = 0; i < numComments; i++) {
      setTimeout(() => {
        const template = COMMENT_TEMPLATES[Math.floor(Math.random() * COMMENT_TEMPLATES.length)];
        const comment = template.replace('{name}', name);
        spawnComment(container, comment);
      }, (i + 1) * (CONFIG.cardDuration / (numComments + 1)));
    }
  }

  // Animate lighting sweep
  function animateLighting(overlay) {
    if (!CONFIG.enableLighting) return;
    
    const sweep = overlay.querySelector('.intro-lighting-sweep');
    if (!sweep) return;

    if (isGsapAvailable()) {
      gsap.fromTo(sweep,
        { left: '-100%', opacity: 0.6 },
        { 
          left: '100%', 
          opacity: 0,
          duration: 2,
          ease: 'power2.inOut',
          repeat: -1,
          repeatDelay: 1
        }
      );
    }
  }

  // Animate background parallax layers
  function animateBackground(overlay) {
    if (!CONFIG.enableParallax) return;

    const layers = overlay.querySelectorAll('.intro-bg-layer');
    if (!isGsapAvailable() || layers.length === 0) return;

    layers.forEach((layer, idx) => {
      const speed = 20 + (idx * 10);
      gsap.to(layer, {
        x: `-${speed}%`,
        duration: 20 + (idx * 5),
        ease: 'none',
        repeat: -1
      });
    });
  }

  // Animate a single contestant card
  function animateCard(card, container, isLast) {
    if (!isGsapAvailable()) {
      // Fallback: simple fade-in
      card.style.opacity = '0';
      card.style.transform = 'scale(0.8)';
      container.appendChild(card);
      setTimeout(() => {
        card.style.transition = 'all 0.8s ease-out';
        card.style.opacity = '1';
        card.style.transform = 'scale(1)';
      }, 50);
      return;
    }

    container.appendChild(card);

    // Initial state
    gsap.set(card, { 
      opacity: 0, 
      scale: 0.7, 
      rotationY: -15,
      z: -500
    });

    // Entrance animation
    const timeline = gsap.timeline();
    
    timeline.to(card, {
      opacity: 1,
      scale: 1,
      rotationY: 0,
      z: 0,
      duration: 0.8,
      ease: 'power3.out'
    });

    // Spotlight pulse
    const spotlight = card.querySelector('.intro-card-spotlight');
    if (spotlight) {
      gsap.fromTo(spotlight,
        { opacity: 0, scale: 0.5 },
        { 
          opacity: 0.3, 
          scale: 1.5, 
          duration: 0.6,
          ease: 'power2.out',
          yoyo: true,
          repeat: Math.floor(CONFIG.cardDuration / 1200)
        }
      );
    }

    // Avatar glow pulse
    const glow = card.querySelector('.intro-card-avatar-glow');
    if (glow) {
      gsap.to(glow, {
        opacity: 0.8,
        scale: 1.2,
        duration: 1.2,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1
      });
    }

    // Camera zoom (subtle)
    timeline.to(card, {
      scale: 1.05,
      duration: CONFIG.cardDuration / 1000,
      ease: 'sine.inOut'
    }, '+=0.5');

    // Exit animation
    if (!isLast) {
      timeline.to(card, {
        opacity: 0,
        scale: 0.9,
        rotationY: 15,
        x: -100,
        duration: CONFIG.transitionDuration / 1000,
        ease: 'power2.in'
      }, `+=${(CONFIG.cardDuration - CONFIG.transitionDuration) / 1000}`);
    }
  }

  // Play the intro sequence
  function playIntroSequence(players, onComplete) {
    if (!players || players.length === 0) {
      console.warn('[introShow] No players provided');
      if (onComplete) onComplete();
      return;
    }

    if (isActive) {
      console.warn('[introShow] Sequence already active');
      return;
    }

    isActive = true;
    console.info('[introShow] Starting reality-TV intro sequence for', players.length, 'contestants');

    // Create overlay
    const overlay = createOverlay();
    overlay.style.display = 'flex';

    const stage = overlay.querySelector('.intro-show-stage');
    const cardContainer = overlay.querySelector('.intro-card-container');
    const reactionsLayer = overlay.querySelector('.intro-reactions-layer');

    // Start background animations
    animateBackground(overlay);
    animateLighting(overlay);

    // Start music
    try {
      if (typeof g.playMusicForPhase === 'function') {
        g.playMusicForPhase(CONFIG.musicKey);
      } else if (typeof g.setMusic === 'function') {
        g.setMusic(CONFIG.musicKey, true);
      }
    } catch (e) {
      console.warn('[introShow] Failed to start music:', e);
    }

    // Play SFX at start (if available)
    try {
      if (typeof g.playSFX === 'function') {
        g.playSFX('intro_whoosh');
      }
    } catch (e) {}

    let currentIndex = 0;
    let timeouts = [];

    // Setup skip callback
    skipCallback = () => {
      console.info('[introShow] Skipped by user');
      cleanup();
      if (onComplete) onComplete();
    };

    function showNextCard() {
      if (currentIndex >= players.length) {
        // All done
        setTimeout(() => {
          cleanup();
          if (onComplete) onComplete();
        }, CONFIG.transitionDuration);
        return;
      }

      const player = players[currentIndex];
      const isLast = currentIndex === players.length - 1;
      
      // Clear previous card
      cardContainer.innerHTML = '';

      // Build and animate new card
      const card = buildContestantCard(player);
      animateCard(card, cardContainer, isLast);

      // Generate reactions
      generateReactions(reactionsLayer, player);

      // Play SFX for card reveal
      try {
        if (typeof g.playSFX === 'function') {
          g.playSFX('card_whoosh');
        }
      } catch (e) {}

      currentIndex++;

      // Schedule next card
      const nextDelay = isLast ? CONFIG.cardDuration : CONFIG.cardDuration + CONFIG.transitionDuration;
      const tid = setTimeout(showNextCard, nextDelay);
      timeouts.push(tid);
    }

    // Start the sequence
    showNextCard();

    // Store cleanup handles
    currentSequence = {
      overlay,
      timeouts,
      cleanup: () => {
        timeouts.forEach(t => clearTimeout(t));
        overlay.style.display = 'none';
        isActive = false;
        skipCallback = null;
      }
    };
  }

  // Cleanup function
  function cleanup() {
    if (currentSequence) {
      currentSequence.cleanup();
      currentSequence = null;
    }
    isActive = false;
    skipCallback = null;
  }

  // Stop/skip the current sequence
  function stopIntroSequence() {
    if (currentSequence) {
      cleanup();
    }
  }

  // Check if intro is currently active
  function isIntroActive() {
    return isActive;
  }

  // Export API
  g.IntroShow = {
    play: playIntroSequence,
    stop: stopIntroSequence,
    isActive: isIntroActive,
    hasGsap: isGsapAvailable
  };

  console.info('[introShow] Module loaded. GSAP available:', isGsapAvailable());

})(window);
