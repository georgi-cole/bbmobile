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
  
  // Comment templates for live reactions (personalized with contestant info)
  const COMMENT_TEMPLATES = [
    // Name-only templates
    'OMG {name}!',
    '{name} is amazing!',
    'Love {name}!',
    'Go {name}!',
    '{name} FTW!',
    'Team {name}!',
    'Yaaas {name}!',
    '{name} is my fav!',
    'Rooting for {name}!',
    '{name} looks fierce!',
    '{name} came to SLAY! 🔥',
    'Not {name} serving looks! 💅',
    '{name} said what now? 👀',
    'The DRAMA with {name}! 🍿',
    '{name} is ICONIC already!',
    'I can\'t with {name}! 😂',
    '{name} is pure chaos energy',
    'OBSESSED with {name}! 😍',
    '{name} understood the assignment ✨',
    'All eyes on {name}! 👁️',
    '{name} is TV GOLD! 📺',
    'Not ready for {name}\'s chaos 🌪️',
    '{name} is THAT contestant!',
    'Watch out for {name}! ⚠️',
    '{name}\'s gonna shake things up! 💥',
    '{name} is the moment! 💫',
    'The way {name} just walked in! 🚶',
    '{name} is main character energy! ⭐',
    'Did {name} just do that?! 😱',
    '{name} is living rent free in my head! 🧠',
    'Nobody\'s doing it like {name}! 💯',
    '{name} woke up and chose violence! ⚔️',
    'The audacity of {name}! 😤',
    '{name} is absolutely unhinged! 🤪',
    'We need to talk about {name}! 🗣️',
    
    // Location-based templates
    '{location} represent! 🌍',
    'Straight outta {location}! 🔥',
    '{location} vibes only! ✨',
    'Putting {location} on the map! 📍',
    '{location} energy is unmatched! 💯',
    '{location}? That explains everything! 😏',
    'Of course they\'re from {location}! 🙌',
    
    // Age-based templates
    '{age} and thriving! 💪',
    '{age} years of ICONIC! ⭐',
    '{age} never looked so good! 😍',
    'At {age}, {name} is unstoppable!',
    '{age}?! Living their best life! 🎉',
    '{age} and already legendary! 👑',
    
    // Occupation-based templates
    'A {occupation}? We stan! 👑',
    '{occupation} bringing the heat! 🔥',
    'This {occupation} came to WIN! 💯',
    '{occupation} excellence! ⚡',
    'Not a {occupation} dominating! 💅',
    'A {occupation} with THAT energy?! 🤯',
    'The {occupation} we didn\'t know we needed! 🙏',
    
    // Motto-based templates
    '"{motto}" - we believe it! ✨',
    'Living by "{motto}" and SERVING! 🔥',
    '"{motto}" is the energy we need! 💪',
    'That motto hits different! 👀',
    '"{motto}" - ICONIC! ⭐',
    'The way "{motto}" describes them perfectly! 💯',
    '"{motto}" and they mean it! 😤',
    
    // Multi-attribute templates
    '{age} from {location}? Icon behavior! 👑',
    '{occupation} from {location} bringing IT! 🔥',
    '{name}, {age}, {occupation} - the whole package! 💯',
    'A {occupation} with that motto? CHEF\'S KISS! 😘',
    '{location} + {occupation} = TV GOLD! 📺',
    '{age}-year-old {occupation}? We love to see it! 🎊',
    '{name} from {location} is about to DOMINATE! 💪',
    'A {occupation} living by "{motto}"? PERFECT! ✨',
    '{age}, {occupation}, and FIERCE! 🔥',
    '{location} sent us their best with {name}! 👏'
  ];

  let currentSequence = null;
  let skipCallback = null;
  let isActive = false;
  const activeTimelines = [];
  const activeTimeouts = [];

  // Check if GSAP is loaded
  function isGsapAvailable() {
    return typeof gsap !== 'undefined';
  }

  // Escape HTML to prevent XSS injection
  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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
        <div class="intro-auditorium-bg"></div>
        <div class="intro-studio-bg"></div>
        <div class="intro-bg-layer intro-bg-layer-1"></div>
        <div class="intro-bg-layer intro-bg-layer-2"></div>
        <div class="intro-bg-layer intro-bg-layer-3"></div>
        <div class="intro-lighting-sweep"></div>
      </div>
      <div class="intro-projector-beam"></div>
      <div class="intro-show-stage">
        <div class="intro-screen">
          <div class="intro-screen-glare"></div>
          <div class="intro-screen-scanlines"></div>
          <div class="intro-card-container"></div>
        </div>
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

  // Resolve avatar for a player with fallback chain (uses global avatar resolver)
  function resolveAvatarForPlayer(player) {
    // Priority: global resolver > player.avatar > player.img > player.photo > dicebear
    if (g.resolveAvatar) {
      return g.resolveAvatar(player);
    }
    return player.avatar ||
           player.img ||
           player.photo ||
           'https://api.dicebear.com/6.x/bottts/svg?seed=' + encodeURIComponent(player.name || 'Guest');
  }
  
  // Get avatar fallback for onerror handlers
  function getAvatarFallback(player) {
    const name = player?.name || 'Guest';
    return 'https://api.dicebear.com/6.x/bottts/svg?seed=' + encodeURIComponent(name);
  }

  // Build a contestant card
  function buildContestantCard(player) {
    const card = document.createElement('div');
    card.className = 'intro-contestant-card intro-projection-card';
    
    const avatarUrl = resolveAvatarForPlayer(player);
    
    // Escape user-provided strings to prevent XSS
    const safeName = escapeHtml(player.name || 'Contestant');
    const safeAge = escapeHtml(player.age);
    const safeLocation = escapeHtml(player.location);
    const safeOccupation = escapeHtml(player.occupation);
    const safeMotto = escapeHtml(player.motto);
    
    card.innerHTML = `
      <div class="intro-card-bg"></div>
      <div class="intro-card-content">
        <div class="intro-card-avatar-wrapper">
          <div class="intro-card-avatar-glow"></div>
        </div>
        <div class="intro-card-info">
          <div class="intro-card-name">${safeName}</div>
          <div class="intro-card-meta">
            ${safeAge ? `<span class="intro-card-age">${safeAge}</span>` : ''}
            ${safeLocation ? `<span class="intro-card-location">${safeLocation}</span>` : ''}
          </div>
          ${safeOccupation ? `<div class="intro-card-occupation">${safeOccupation}</div>` : ''}
          ${safeMotto ? `<div class="intro-card-motto">"${safeMotto}"</div>` : ''}
        </div>
      </div>
      <div class="intro-card-spotlight"></div>
    `;
    
    // Create and insert avatar image with robust error handling
    const avatarWrapper = card.querySelector('.intro-card-avatar-wrapper');
    const avatarImg = document.createElement('img');
    avatarImg.className = 'intro-card-avatar';
    avatarImg.alt = safeName;
    avatarImg.src = avatarUrl;
    
    // Robust onerror handler - ensures avatar always displays
    avatarImg.onerror = function() {
      console.info('[introShow] avatar fallback for', player.name || player);
      this.onerror = null; // Prevent infinite loop
      this.src = getAvatarFallback(player);
    };
    
    avatarWrapper.appendChild(avatarImg);

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
    const age = player.age || null;
    const location = player.location || null;
    const occupation = player.occupation || null;
    const motto = player.motto || null;
    
    // Helper function to fill template with player data
    function fillTemplate(template) {
      let comment = template.replace(/{name}/g, name);
      
      // Only use templates that require attributes if player has them
      if (template.includes('{age}') && !age) return null;
      if (template.includes('{location}') && !location) return null;
      if (template.includes('{occupation}') && !occupation) return null;
      if (template.includes('{motto}') && !motto) return null;
      
      // Replace all placeholders
      if (age) comment = comment.replace(/{age}/g, age);
      if (location) comment = comment.replace(/{location}/g, location);
      if (occupation) comment = comment.replace(/{occupation}/g, occupation);
      if (motto) comment = comment.replace(/{motto}/g, motto);
      
      return comment;
    }
    
    // Build a pool of valid comments for this player
    const validComments = [];
    for (const template of COMMENT_TEMPLATES) {
      const filled = fillTemplate(template);
      if (filled) {
        validComments.push(filled);
      }
    }
    
    // Fallback if no valid comments (shouldn't happen with name-only templates)
    if (validComments.length === 0) {
      validComments.push(`Go ${name}!`, `${name} is amazing!`);
    }
    
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
        const comment = validComments[Math.floor(Math.random() * validComments.length)];
        spawnComment(container, comment);
      }, (i + 1) * (CONFIG.cardDuration / (numComments + 1)));
    }
  }

  // Animate lighting sweep and projector beam
  function animateLighting(overlay) {
    if (!CONFIG.enableLighting) return;
    
    const sweep = overlay.querySelector('.intro-lighting-sweep');

    if (isGsapAvailable()) {
      // Animate lighting sweep
      if (sweep) {
        const sweepTween = gsap.fromTo(sweep,
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
        activeTimelines.push(sweepTween);
      }

      // Animate projector beam - subtle opacity pulse and rotation
      const projectorBeam = overlay.querySelector('.intro-projector-beam');
      if (projectorBeam) {
        const beamTween = gsap.to(projectorBeam, {
          opacity: 0.08,
          rotation: 0.5,
          duration: 2,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1
        });
        activeTimelines.push(beamTween);
      }
    } else {
      // Fallback: add CSS pulse class
      const projectorBeam = overlay.querySelector('.intro-projector-beam');
      if (projectorBeam) {
        projectorBeam.classList.add('intro-projector-pulse');
      }
    }
  }

  // Animate background parallax layers and auditorium
  function animateBackground(overlay) {
    if (!CONFIG.enableParallax) return;

    const layers = overlay.querySelectorAll('.intro-bg-layer');
    const auditorium = overlay.querySelector('.intro-auditorium-bg');
    
    if (!isGsapAvailable()) return;

    // Animate parallax layers
    if (layers.length > 0) {
      layers.forEach((layer, idx) => {
        const speed = 20 + (idx * 10);
        const layerTween = gsap.to(layer, {
          x: `-${speed}%`,
          duration: 20 + (idx * 5),
          ease: 'none',
          repeat: -1
        });
        activeTimelines.push(layerTween);
      });
    }

    // Animate auditorium with slow drift
    if (auditorium) {
      const auditoriumTween = gsap.to(auditorium, {
        x: '2%',
        y: '1%',
        scale: 1.02,
        duration: 30,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1
      });
      activeTimelines.push(auditoriumTween);
    }
  }

  // Animate a single contestant card
  function animateCard(card, container, isLast) {
    if (!isGsapAvailable()) {
      // Fallback: simple fade-in with CSS transitions
      card.style.opacity = '0';
      card.style.transform = 'scale(0.8) perspective(1000px) rotateX(10deg)';
      container.appendChild(card);
      setTimeout(() => {
        card.style.transition = 'all 0.8s ease-out';
        card.style.opacity = '1';
        card.style.transform = 'scale(1) perspective(1000px) rotateX(0deg)';
      }, 50);
      return;
    }

    container.appendChild(card);

    // Initial state - projection from above with perspective
    gsap.set(card, { 
      opacity: 0, 
      scale: 0.7, 
      rotationX: -25,
      rotationY: -5,
      y: -100,
      z: -500
    });

    // Entrance animation with perspective projection
    const timeline = gsap.timeline();
    activeTimelines.push(timeline);
    
    timeline.to(card, {
      opacity: 1,
      scale: 1,
      rotationX: 0,
      rotationY: 0,
      y: 0,
      z: 0,
      duration: 0.8,
      ease: 'power3.out'
    });

    // Trigger projector beam pulse on card reveal
    const overlay = document.getElementById('introShowOverlay');
    const projectorBeam = overlay?.querySelector('.intro-projector-beam');
    if (projectorBeam) {
      const beamTween = gsap.to(projectorBeam, {
        opacity: 0.15,
        duration: 0.3,
        ease: 'power2.out',
        yoyo: true,
        repeat: 1
      });
      activeTimelines.push(beamTween);
    }

    // Spotlight pulse
    const spotlight = card.querySelector('.intro-card-spotlight');
    if (spotlight) {
      const spotlightTween = gsap.fromTo(spotlight,
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
      activeTimelines.push(spotlightTween);
    }

    // Avatar glow pulse
    const glow = card.querySelector('.intro-card-avatar-glow');
    if (glow) {
      const glowTween = gsap.to(glow, {
        opacity: 0.8,
        scale: 1.2,
        duration: 1.2,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1
      });
      activeTimelines.push(glowTween);
    }

    // Camera zoom (subtle) with slight perspective shift
    timeline.to(card, {
      scale: 1.05,
      rotationX: 2,
      duration: CONFIG.cardDuration / 1000,
      ease: 'sine.inOut'
    }, '+=0.5');

    // Exit animation with perspective
    if (!isLast) {
      timeline.to(card, {
        opacity: 0,
        scale: 0.9,
        rotationX: 15,
        rotationY: 10,
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

    const cardContainer = overlay.querySelector('.intro-card-container');
    const reactionsLayer = overlay.querySelector('.intro-reactions-layer');

    // Start background animations
    animateBackground(overlay);
    animateLighting(overlay);

    // Start music (premiere.mp4 for intro, falls back to theme_opening)
    // Audio requirement: Place premiere.mp4 in /audio/ directory for full intro experience
    // If premiere.mp4 is missing, will gracefully fall back to theme_opening track
    try {
      if (typeof g.playMusicForPhase === 'function') {
        // Try premiere.mp4 first (video file audio track)
        g.playMusicForPhase('premiere.mp4');
      } else if (typeof g.playMusic === 'function') {
        g.playMusic('premiere.mp4');
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
    } catch (e) {
      // Ignore SFX errors
    }

    let currentIndex = 0;
    const timeouts = [];

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
      } catch (e) {
        // Ignore SFX errors
      }

      currentIndex++;

      // Schedule next card
      const nextDelay = isLast ? CONFIG.cardDuration : CONFIG.cardDuration + CONFIG.transitionDuration;
      const tid = setTimeout(showNextCard, nextDelay);
      activeTimeouts.push(tid);
    }

    // Start the sequence
    showNextCard();

    // Store cleanup handles
    currentSequence = {
      overlay,
      cleanup: () => {
        activeTimeouts.forEach(t => clearTimeout(t));
        activeTimeouts.length = 0;
        activeTimelines.forEach(tl => {
          try {
            if (tl && typeof tl.kill === 'function') {
              tl.kill();
            }
          } catch (e) {
            // Ignore kill errors
          }
        });
        activeTimelines.length = 0;
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
    
    // Fade out music when intro completes or is skipped
    try {
      if (typeof g.fadeOutMusic === 'function') {
        g.fadeOutMusic(800); // 800ms fade out
      } else if (typeof g.stopMusic === 'function') {
        g.stopMusic();
      }
    } catch (e) {
      console.warn('[introShow] Failed to fade out music:', e);
    }
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

  // Drainer for SkipController integration
  function introDrainer() {
    if (!isActive) {
      return false;
    }

    // Kill all GSAP timelines
    let didWork = false;
    activeTimelines.forEach(tl => {
      try {
        if (tl && typeof tl.progress === 'function' && typeof tl.kill === 'function') {
          tl.progress(1);
          tl.kill();
          didWork = true;
        }
      } catch (e) {
        console.warn('[introShow] Error killing timeline:', e);
      }
    });
    activeTimelines.length = 0;

    // Clear all timeouts
    activeTimeouts.forEach(tid => clearTimeout(tid));
    if (activeTimeouts.length > 0) {
      didWork = true;
    }
    activeTimeouts.length = 0;

    // Remove overlay
    const overlay = document.getElementById('introShowOverlay');
    if (overlay) {
      overlay.remove();
      didWork = true;
    }

    // Reset state
    if (currentSequence) {
      currentSequence = null;
      didWork = true;
    }
    isActive = false;
    skipCallback = null;

    return didWork;
  }

  // Export API
  g.IntroShow = {
    play: playIntroSequence,
    stop: stopIntroSequence,
    isActive: isIntroActive,
    hasGsap: isGsapAvailable,
    drainer: introDrainer
  };

  // Register drainer with SkipController
  if (g.SkipController) {
    g.SkipController.registerDrainer('introShow', introDrainer);
  }

  console.info('[introShow] Module loaded. GSAP available:', isGsapAvailable());

})(window);
