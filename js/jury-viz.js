// jury-viz.js
// Final Faceoff UI + vote cards + tally + winner banner + optional medal overlay (fallback).
// No external CSS file edits: styles are injected here.
// Back-compat shims replace the old "final graph" API names so existing calls still work.

// =====================================================================================
// Runtime CSS injection (scoped)
// =====================================================================================
(function injectFaceoffStyles(){
  if (document.getElementById('faceoff-css')) return;
  const css = `
  /* Fullscreen cinematic overlay with enhanced atmosphere */
  .finale-fullscreen-overlay{
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    /* Enhanced animated gradient with color breathing */
    background: 
      radial-gradient(ellipse at center, 
        rgba(20, 30, 50, 0.95) 0%, 
        rgba(5, 10, 20, 0.98) 100%);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    z-index: 10000;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.5s ease;
    pointer-events: auto;
    /* Animated gradient shift */
    animation: atmosphereBreath 12s ease-in-out infinite alternate;
  }
  
  @keyframes atmosphereBreath {
    0% {
      background: 
        radial-gradient(ellipse at center, 
          rgba(20, 30, 50, 0.95) 0%, 
          rgba(5, 10, 20, 0.98) 100%);
    }
    100% {
      background: 
        radial-gradient(ellipse at center, 
          rgba(25, 35, 60, 0.95) 0%, 
          rgba(10, 15, 30, 0.98) 100%);
    }
  }
  
  .finale-fullscreen-overlay.visible{
    opacity: 1;
  }
  
  /* Vignette effect - darker edges */
  .finale-fullscreen-overlay::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(ellipse at center, 
      transparent 0%,
      transparent 40%,
      rgba(0, 0, 0, 0.4) 100%);
    pointer-events: none;
    z-index: 1;
  }
  
  /* Enhanced floating particles with varied sizes */
  .finale-fullscreen-overlay::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image: 
      radial-gradient(circle at 20% 30%, rgba(255,255,255,0.2) 1px, transparent 1px),
      radial-gradient(circle at 60% 70%, rgba(255,255,255,0.15) 2px, transparent 2px),
      radial-gradient(circle at 80% 20%, rgba(255,255,255,0.1) 1.5px, transparent 1.5px),
      radial-gradient(circle at 40% 80%, rgba(0,224,204,0.1) 1px, transparent 1px);
    background-size: 60px 60px, 90px 90px, 120px 120px, 150px 150px;
    background-position: 0 0, 20px 20px, 40px 40px, 60px 60px;
    animation: floatParticles 40s linear infinite;
    pointer-events: none;
    z-index: 1;
  }
  
  @keyframes floatParticles {
    0% { 
      transform: translateY(0) translateX(0); 
      opacity: 1;
    }
    50% {
      opacity: 0.8;
    }
    100% { 
      transform: translateY(-120px) translateX(20px); 
      opacity: 1;
    }
  }
  
  .finalFaceoff{
    position: relative;
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    gap: clamp(20px, 4vw, 60px);
    align-items: center;
    justify-items: center;
    width: 100%;
    max-width: 1400px;
    padding: 40px 20px;
    box-sizing: border-box;
    min-height: 400px;
    z-index: 2;
  }
  
  /* Spotlight/stage lighting effect from top */
  .finalFaceoff::before {
    content: '';
    position: absolute;
    top: -100px;
    left: 50%;
    transform: translateX(-50%);
    width: 200%;
    height: 400px;
    background: 
      radial-gradient(ellipse at center top, 
        rgba(0, 224, 204, 0.08) 0%,
        transparent 50%);
    pointer-events: none;
    z-index: -1;
    animation: spotlightPulse 8s ease-in-out infinite alternate;
  }
  
  @keyframes spotlightPulse {
    0% {
      opacity: 0.6;
      transform: translateX(-50%) scaleY(1);
    }
    100% {
      opacity: 1;
      transform: translateX(-50%) scaleY(1.1);
    }
  }
  
  /* Hide faceoff during voting phase */
  .finalFaceoff.hidden-for-voting {
    opacity: 0;
    pointer-events: none;
  }
  /* VS divider between finalists */
  .finalFaceoff .fo-vs{
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: clamp(32px, 6vw, 64px);
    font-weight: 900;
    color: #00e0cc;
    text-shadow: 0 0 20px rgba(0, 224, 204, 0.6),
                 0 4px 8px rgba(0, 0, 0, 0.8);
    letter-spacing: 4px;
    animation: vsGlow 2s ease-in-out infinite alternate;
  }
  @keyframes vsGlow{
    0%{ text-shadow: 0 0 20px rgba(0, 224, 204, 0.6), 0 4px 8px rgba(0, 0, 0, 0.8); }
    100%{ text-shadow: 0 0 30px rgba(0, 224, 204, 0.9), 0 4px 12px rgba(0, 0, 0, 0.8); }
  }

  .finalFaceoff .fo-slot{
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    padding: 24px 20px;
    width: min(40vw, 450px);
    border-radius: 20px;
    background: rgba(15, 25, 40, 0.85);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(0, 224, 204, 0.25);
    box-shadow: 0 0 60px rgba(0, 224, 204, 0.1),
                0 25px 50px rgba(0, 0, 0, 0.5);
    transition: all 0.3s ease;
  }
  .finalFaceoff .fo-slot.fo-leader{
    border-color: rgba(0, 224, 204, 0.5);
    box-shadow: 0 0 40px rgba(0, 224, 204, 0.3),
                0 8px 32px rgba(0, 0, 0, 0.4);
    transform: scale(1.02);
  }

  .fo-avatar{
    width: min(22vw, 180px);
    height: min(22vw, 180px);
    object-fit: cover;
    border-radius: 16px;
    background: #111;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6);
    border: 3px solid rgba(255, 255, 255, 0.15);
    transition: all 0.3s ease;
  }
  
  /* Smaller avatars during reveal phase */
  .finalFaceoff.reveal-phase .fo-avatar{
    width: min(18vw, 140px);
    height: min(18vw, 140px);
  }

  .fo-name{
    font-size: clamp(22px, 3vw, 36px);
    font-weight: 800;
    letter-spacing: 1px;
    text-align: center;
    color: #ffffff;
    text-shadow: 0 2px 8px rgba(0, 0, 0, 0.8);
  }

  /* Vote counter pills below each finalist */
  .fo-vote-pill{
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px 24px;
    background: rgba(0, 0, 0, 0.6);
    border: 2px solid rgba(255, 255, 255, 0.2);
    border-radius: 999px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
    transition: all 0.3s ease;
  }
  .fo-vote-pill.pulse{
    animation: votePulse 0.6s ease;
  }
  @keyframes votePulse{
    0%{ 
      transform: scale(1); 
      border-color: rgba(255, 255, 255, 0.2);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
    }
    50%{ 
      transform: scale(1.15); 
      border-color: rgba(0, 224, 204, 0.8);
      box-shadow: 0 0 30px rgba(0, 224, 204, 0.6),
                  0 4px 16px rgba(0, 0, 0, 0.4);
    }
    100%{ 
      transform: scale(1); 
      border-color: rgba(255, 255, 255, 0.2);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
    }
  }
  .fo-vote-pill-label{
    font-size: clamp(12px, 1.5vw, 16px);
    font-weight: 600;
    color: #aaa;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  .fo-votes{
    font-size: clamp(28px, 4vw, 48px);
    font-weight: 900;
    background: linear-gradient(180deg, rgba(255,255,255,0.95), rgba(0, 224, 204, 0.8));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    text-shadow: 0 2px 8px rgba(0, 0, 0, 0.6);
  }

  .fo-badge{
    position: absolute;
    top: 8px;
    left: 50%;
    transform: translateX(-50%);
    background: #00e0cc;
    color: #001a18;
    font-weight: 800;
    font-size: 12px;
    padding: 6px 10px;
    border-radius: 999px;
    box-shadow: 0 2px 10px rgba(0,224,204,0.3);
    letter-spacing: 0.3px;
    z-index: 6;
  }

  /* Pulse when a vote lands on a finalist - ultra-subtle */
  @keyframes foPulse {
    0%   { box-shadow: 0 0 0 rgba(0,224,204,0.0); }
    40%  { box-shadow: 0 0 28px rgba(0,224,204,0.35); }
    100% { box-shadow: 0 0 0 rgba(0,224,204,0.0); }
  }
  .fo-pulse{ animation: foPulse 600ms ease; }

  /* Final tally and winner banner - Positioned at sides/bottom to not cover faces */
  .finalFaceoff .fo-tally,
  .finalFaceoff .fo-winner{
    position: absolute;
    right: 12px;
    padding: 8px 14px;
    border-radius: 10px;
    /* Maximum transparency: minimal glass effect - TV background dominates */
    background: rgba(0, 0, 0, 0.08);
    backdrop-filter: blur(6px) saturate(1.2);
    -webkit-backdrop-filter: blur(6px) saturate(1.2);
    border: 1px solid rgba(255,255,255,0.15);
    color: #ffffff;
    font-weight: 800;
    text-align: center;
    text-shadow: 0 1px 3px rgba(0,0,0,0.7), 0 0 8px rgba(0,0,0,0.5);
    /* Minimal shadow for readability */
    box-shadow: 0 2px 12px rgba(0,0,0,0.15);
    z-index: 7;
    /* Smooth entrance animation */
    animation: tallySlideIn 0.4s cubic-bezier(0.25, 0.9, 0.25, 1);
    /* Reduce size for minimal obstruction */
    max-width: min(280px, 35vw);
    word-wrap: break-word;
  }
  @keyframes tallySlideIn {
    0% { 
      opacity: 0; 
      transform: translateX(20px); 
    }
    100% { 
      opacity: 1; 
      transform: translateX(0); 
    }
  }
  .finalFaceoff .fo-tally{
    top: 12px;
    font-size: clamp(12px, 1.8vw, 16px);
  }
  .finalFaceoff .fo-winner{
    /* Position at bottom instead of top to not cover finalist photos */
    bottom: 12px;
    top: auto;
    font-size: clamp(13px, 2vw, 18px);
    /* Highlight winner with subtle cyan tint - ultra transparent */
    background: rgba(0, 224, 204, 0.12);
    border-color: rgba(0, 224, 204, 0.35);
    box-shadow: 0 2px 12px rgba(0,0,0,0.15),
                0 0 12px rgba(0, 224, 204, 0.2);
  }

  /* Mobile responsive adjustments for tally panels */
  @media (max-width: 768px) {
    .finalFaceoff .fo-tally,
    .finalFaceoff .fo-winner {
      /* On mobile, position at sides */
      left: auto;
      right: 8px;
      transform: none;
      max-width: min(45vw, 280px);
      font-size: clamp(11px, 3vw, 14px);
    }
    .finalFaceoff .fo-winner {
      /* Keep at bottom on mobile */
      bottom: 8px;
      top: auto;
      font-size: clamp(12px, 3.2vw, 16px);
    }
  }

  /* Crown overlay - non-face-covering, positioned above photo */
  .fo-crown{
    position: absolute;
    top: -20px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 48px;
    filter: drop-shadow(0 4px 12px rgba(255, 215, 0, 0.6));
    animation: crownDrop 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
    z-index: 10;
  }
  @keyframes crownDrop{
    0%{ 
      opacity: 0; 
      transform: translateX(-50%) translateY(-60px) scale(0.3); 
    }
    60%{
      transform: translateX(-50%) translateY(5px) scale(1.1);
    }
    100%{ 
      opacity: 1; 
      transform: translateX(-50%) translateY(0) scale(1); 
    }
  }
  
  /* Check card - displays next to winner, elegant cinematic style */
  .fo-check-card{
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: min(420px, 85vw);
    background: linear-gradient(135deg, #1a2942 0%, #0f1a2f 100%);
    border: 2px solid #d4af37;
    border-radius: 16px;
    padding: 32px 24px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.7),
                0 0 0 1px rgba(212, 175, 55, 0.3);
    z-index: 9;
    animation: checkSlideIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
    opacity: 0;
    animation-fill-mode: forwards;
  }
  @keyframes checkSlideIn{
    0%{
      opacity: 0;
      transform: translate(-50%, -50%) scale(0.7) rotateY(-15deg);
    }
    100%{
      opacity: 1;
      transform: translate(-50%, -50%) scale(1) rotateY(0deg);
    }
  }
  @keyframes checkSlideOut{
    0%{
      opacity: 1;
      transform: translate(-50%, -50%) scale(1);
    }
    100%{
      opacity: 0;
      transform: translate(-50%, -50%) scale(0.8) translateY(20px);
    }
  }
  .fo-check-header{
    text-align: center;
    font-size: clamp(11px, 2vw, 14px);
    color: #8b9dc3;
    letter-spacing: 1.2px;
    text-transform: uppercase;
    margin-bottom: 8px;
  }
  .fo-check-amount{
    text-align: center;
    font-size: clamp(36px, 6vw, 56px);
    font-weight: 900;
    background: linear-gradient(135deg, #ffd700 0%, #ffed4e 50%, #d4af37 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    letter-spacing: -1px;
    margin: 12px 0;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
  }
  .fo-check-payto{
    text-align: center;
    font-size: clamp(13px, 2.2vw, 18px);
    color: #e8f4ff;
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid rgba(255, 255, 255, 0.15);
  }
  .fo-check-payto strong{
    color: #ffd700;
    font-weight: 800;
    letter-spacing: 0.5px;
  }
  .fo-check-memo{
    text-align: center;
    font-size: clamp(11px, 1.8vw, 14px);
    color: #9bb5d4;
    margin-top: 12px;
    font-style: italic;
  }
  
  /* Winner celebration overlay */
  .winner-celebration{
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 10002;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.5s ease;
  }
  .winner-celebration.visible{
    opacity: 1;
  }
  
  /* Winner display - large centered */
  .winner-display{
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 24px;
    padding: 40px;
    background: rgba(0, 0, 0, 0.75);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 3px solid rgba(0, 224, 204, 0.5);
    border-radius: 24px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8),
                0 0 40px rgba(0, 224, 204, 0.4);
    animation: winnerEnter 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  @keyframes winnerEnter{
    0%{
      opacity: 0;
      transform: scale(0.5) translateY(-50px);
    }
    100%{
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }
  
  .winner-avatar-large{
    width: min(50vw, 400px);
    height: min(50vw, 400px);
    object-fit: cover;
    border-radius: 20px;
    border: 3px solid #ffd700;
    box-shadow: 0 0 30px rgba(255, 215, 0, 0.4),
                0 0 60px rgba(255, 215, 0, 0.2),
                0 16px 48px rgba(0, 0, 0, 0.8);
    animation: winnerPulse 2s ease-in-out infinite;
  }
  @keyframes winnerPulse{
    0%, 100%{ 
      box-shadow: 0 0 30px rgba(255, 215, 0, 0.4),
                  0 0 60px rgba(255, 215, 0, 0.2),
                  0 16px 48px rgba(0, 0, 0, 0.8);
    }
    50%{ 
      box-shadow: 0 0 50px rgba(255, 215, 0, 0.6),
                  0 0 90px rgba(255, 215, 0, 0.3),
                  0 16px 48px rgba(0, 0, 0, 0.8);
    }
  }
  
  .winner-name-large{
    font-size: clamp(32px, 6vw, 64px);
    font-weight: 900;
    text-align: center;
    background: linear-gradient(135deg, #ffd700 0%, #ffed4e 50%, #d4af37 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    letter-spacing: 2px;
    text-transform: uppercase;
    filter: drop-shadow(0 4px 12px rgba(255, 215, 0, 0.6));
    animation: nameShimmer 3s ease-in-out infinite;
  }
  @keyframes nameShimmer{
    0%, 100%{ filter: drop-shadow(0 4px 12px rgba(255, 215, 0, 0.6)); }
    50%{ filter: drop-shadow(0 4px 20px rgba(255, 215, 0, 0.9)); }
  }
  
  .winner-title{
    font-size: clamp(18px, 3vw, 32px);
    font-weight: 700;
    text-align: center;
    color: #00e0cc;
    text-shadow: 0 0 20px rgba(0, 224, 204, 0.8),
                 0 4px 8px rgba(0, 0, 0, 0.8);
    letter-spacing: 3px;
    text-transform: uppercase;
  }
  
  .winner-votes-display{
    font-size: clamp(16px, 2.5vw, 24px);
    font-weight: 600;
    color: #e8f9ff;
    text-align: center;
    opacity: 0.9;
  }
  
  .runner-up-compact{
    position: fixed;
    bottom: 40px;
    right: 40px;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px 20px;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border: 2px solid rgba(255, 255, 255, 0.2);
    border-radius: 16px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
    z-index: 10003;
  }
  .runner-up-avatar{
    width: 60px;
    height: 60px;
    object-fit: cover;
    border-radius: 8px;
    border: 2px solid rgba(192, 192, 192, 0.5);
  }
  .runner-up-info{
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .runner-up-label{
    font-size: 12px;
    font-weight: 600;
    color: #aaa;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  .runner-up-name{
    font-size: 18px;
    font-weight: 700;
    color: #e8f9ff;
  }
  
  /* Floating emojis */
  .floating-emoji{
    position: absolute;
    font-size: 48px;
    pointer-events: none;
    animation: floatUp 4s ease-in-out infinite;
    opacity: 0;
  }
  @keyframes floatUp{
    0%{
      opacity: 0;
      transform: translateY(0) rotate(0deg);
    }
    10%{
      opacity: 1;
    }
    90%{
      opacity: 1;
    }
    100%{
      opacity: 0;
      transform: translateY(-100vh) rotate(360deg);
    }
  }
  
  /* Confetti particle */
  .confetti{
    position: absolute;
    width: 10px;
    height: 10px;
    pointer-events: none;
    animation: confettiFall 3s ease-out forwards;
  }
  @keyframes confettiFall{
    0%{
      opacity: 1;
      transform: translateY(0) rotate(0deg);
    }
    100%{
      opacity: 0;
      transform: translateY(100vh) rotate(720deg);
    }
  }
  
  /* Mobile adjustments */
  @media (max-width: 768px) {
    .finalFaceoff{
      grid-template-columns: 1fr;
      grid-template-rows: 1fr auto 1fr;
      gap: 12px;
      padding: 16px 12px;
      min-height: auto;
    }
    .finalFaceoff .fo-vs{
      font-size: clamp(20px, 6vw, 32px);
      letter-spacing: 2px;
    }
    .finalFaceoff .fo-slot{
      width: min(85vw, 350px);
      padding: 16px 12px;
      gap: 12px;
    }
    .fo-avatar{
      width: min(35vw, 140px);
      height: min(35vw, 140px);
    }
    .fo-name{
      font-size: clamp(16px, 4vw, 24px);
    }
    .fo-vote-pill{
      padding: 8px 16px;
      gap: 6px;
    }
    .fo-vote-pill-label{
      font-size: clamp(10px, 2vw, 12px);
    }
    .fo-votes{
      font-size: clamp(20px, 5vw, 32px);
    }
    .winner-avatar-large{
      width: min(70vw, 300px);
      height: min(70vw, 300px);
    }
    .runner-up-compact{
      bottom: 20px;
      right: 20px;
      flex-direction: column;
      text-align: center;
    }
  }
  
  /* Reduced motion support for accessibility */
  @media (prefers-reduced-motion: reduce) {
    .finale-fullscreen-overlay {
      animation: none !important;
      background: radial-gradient(ellipse at center, 
        rgba(20, 30, 50, 0.95) 0%, 
        rgba(5, 10, 20, 0.98) 100%);
    }
    .finale-fullscreen-overlay::before {
      animation: none !important;
      opacity: 0.5;
    }
    .finalFaceoff::before {
      animation: none !important;
      opacity: 0.8;
    }
    .floating-emoji,
    .confetti {
      animation-duration: 1s !important;
    }
  }
  
  /* Batched vote display animations */
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes fadeOut {
    from { opacity: 1; }
    to { opacity: 0; }
  }
  
  @keyframes slideInLeft {
    from {
      opacity: 0;
      transform: translateX(-30px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  
  .batched-votes-container {
    pointer-events: none;
  }
  
  .batched-vote-card {
    pointer-events: none;
  }
  
  .tally-screen-container {
    pointer-events: none;
  }`;
  const style = document.createElement('style');
  style.id = 'faceoff-css';
  style.textContent = css;
  document.head.appendChild(style);
})();

// =====================================================================================
// Final Faceoff implementation + Backward-compatible API
// =====================================================================================
(function attachFinalFaceoff(global){
  const DEFAULTS = { container: '#tv' };
  let state = null;

  function el(tag, className, html){
    const n = document.createElement(tag);
    if (className) n.className = className;
    if (html !== null && html !== undefined) n.innerHTML = html;
    return n;
  }
  function pickAvatar(obj){
    return obj?.avatar || obj?.image || obj?.img || obj?.avatarUrl || obj?.photo || '';
  }

  function mount({ left, right, majority, container, fullscreen = true }){
    destroy();
    // Remove any left-over graph containers
    try { 
      document.querySelectorAll('.final-graph, .jury-graph, #finalGraph').forEach(x => x.remove()); 
    } catch (e) {
      console.warn('[jury-viz] cleanup error:', e);
    }

    // Create fullscreen overlay if requested
    let overlay = null;
    let mountAt = null;
    
    if (fullscreen) {
      overlay = el('div', 'finale-fullscreen-overlay');
      document.body.appendChild(overlay);
      mountAt = overlay;
      
      // Fade in overlay
      requestAnimationFrame(() => {
        setTimeout(() => overlay.classList.add('visible'), 50);
      });
    } else {
      mountAt = typeof container === 'string' ? document.querySelector(container) : (container || document.body);
      if (!mountAt) throw new Error('FinalFaceoff: container not found');
    }

    const wrap = el('div', 'finalFaceoff');
    
    // Left finalist slot
    const leftSlot = el('div', 'fo-slot left');
    const leftImg = el('img', 'fo-avatar'); 
    leftImg.src = pickAvatar(left); 
    leftImg.alt = left?.name || 'Finalist A';
    const leftName = el('div', 'fo-name', left?.name || 'Finalist A');
    
    // Vote pill for left
    const leftPill = el('div', 'fo-vote-pill');
    const leftPillLabel = el('div', 'fo-vote-pill-label', 'VOTES');
    const leftVotes = el('div', 'fo-votes', '0');
    leftPill.append(leftPillLabel, leftVotes);
    
    leftSlot.append(leftImg, leftName, leftPill);

    // VS divider
    const vs = el('div', 'fo-vs', 'VS');

    // Right finalist slot
    const rightSlot = el('div', 'fo-slot right');
    const rightImg = el('img', 'fo-avatar'); 
    rightImg.src = pickAvatar(right); 
    rightImg.alt = right?.name || 'Finalist B';
    const rightName = el('div', 'fo-name', right?.name || 'Finalist B');
    
    // Vote pill for right
    const rightPill = el('div', 'fo-vote-pill');
    const rightPillLabel = el('div', 'fo-vote-pill-label', 'VOTES');
    const rightVotes = el('div', 'fo-votes', '0');
    rightPill.append(rightPillLabel, rightVotes);
    
    rightSlot.append(rightImg, rightName, rightPill);

    wrap.append(leftSlot, vs, rightSlot);
    mountAt.appendChild(wrap);

    state = {
      wrap, 
      overlay,
      left:  { meta:left,  slot:leftSlot,  img:leftImg, votesEl:leftVotes, pill:leftPill, count:0 },
      right: { meta:right, slot:rightSlot, img:rightImg, votesEl:rightVotes, pill:rightPill, count:0 },
      majority: majority || 0,
      fullscreen
    };

    updateLeaderGlow();
    console.log('[jury-viz] Final Faceoff UI mounted', fullscreen ? '(fullscreen)' : '(in-place)');
  }

  function showVoteCard(jurorName, votedName, reason, jurorAvatar){
    if(!state) return;
    
    // REMOVE ANY EXISTING JURY VOTE CARDS FIRST to prevent duplicates
    // Clear any pending removal timeouts to ensure immediate removal
    const existingCards = document.querySelectorAll('.jury-vote-card');
    existingCards.forEach(el => {
      // Cancel any pending animations/removals
      el.style.animation = 'none';
      el.remove();
    });
    
    console.log('[jury-viz] showVoteCard:', jurorName, 'voting for', votedName, '| Removed', existingCards.length, 'existing cards');
    
    // Use card-based system similar to nominee declarations
    // Create card with juror avatar and vote reason
    const card = document.createElement('div');
    card.className = 'revealCard diaryRoomCard jury-vote-card';
    card.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 10002;
      max-width: min(480px, 90vw);
      width: auto;
      animation: cardFloatIn 0.5s cubic-bezier(0.25, 0.9, 0.25, 1) forwards;
      box-sizing: border-box;
    `;
    
    // Card title with juror name
    const title = el('h3');
    title.textContent = jurorName;
    title.style.cssText = `
      font-size: clamp(1.1rem, 3vw, 1.3rem);
      font-weight: 700;
      margin: 0 0 16px 0;
      color: #00e0cc;
      text-shadow: 0 0 20px rgba(0, 224, 204, 0.5);
    `;
    
    // Avatar and content container
    const content = el('div');
    content.style.cssText = `
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 16px;
    `;
    
    // Juror avatar
    if (jurorAvatar) {
      const avatar = el('img');
      avatar.src = jurorAvatar;
      avatar.alt = jurorName;
      avatar.className = 'rc-face';
      avatar.style.cssText = `
        width: 80px;
        height: 80px;
        border-radius: 50%;
        object-fit: cover;
        border: 3px solid rgba(0, 224, 204, 0.5);
        box-shadow: 0 0 16px rgba(0, 224, 204, 0.3);
      `;
      avatar.onerror = function() {
        console.warn('[jury-viz] Juror avatar fallback for:', jurorName);
        this.onerror = null;
        const getDicebearUrl = window.getDicebearUrl || window.global?.getDicebearUrl || function(seed) {
          return `https://api.dicebear.com/6.x/bottts/svg?seed=${encodeURIComponent(seed || 'player')}`;
        };
        this.src = getDicebearUrl(jurorName || 'juror');
      };
      content.appendChild(avatar);
    }
    
    // Vote text
    const voteText = el('div');
    voteText.textContent = reason || `I vote for ${votedName} to win Big Brother.`;
    voteText.style.cssText = `
      flex: 1;
      font-size: clamp(0.9rem, 2.5vw, 1.05rem);
      line-height: 1.5;
      color: #e8f4ff;
      font-style: italic;
    `;
    content.appendChild(voteText);
    
    // Finalist badge
    const badge = el('div');
    badge.textContent = `Vote for ${votedName}`;
    badge.style.cssText = `
      text-align: center;
      padding: 8px 16px;
      background: rgba(0, 224, 204, 0.15);
      border: 1px solid rgba(0, 224, 204, 0.3);
      border-radius: 20px;
      font-size: clamp(0.8rem, 2vw, 0.95rem);
      font-weight: 600;
      color: #00e0cc;
    `;
    
    card.appendChild(title);
    card.appendChild(content);
    card.appendChild(badge);
    
    // Add to overlay
    if (state.overlay) {
      state.overlay.appendChild(card);
    } else {
      document.body.appendChild(card);
    }
    
    // Remove after delay
    setTimeout(() => {
      card.style.animation = 'holdOut 0.6s ease-in forwards';
      setTimeout(() => {
        card.remove();
      }, 600);
    }, 2600);
  }
  
  // Hide the faceoff UI (for voting phase)
  function hideFaceoff(){
    if(!state || !state.wrap) return;
    state.wrap.classList.add('hidden-for-voting');
    console.log('[jury-viz] Faceoff hidden for voting');
  }
  
  // Show the faceoff UI (for reveal phase)
  function showFaceoff(){
    if(!state || !state.wrap) return;
    state.wrap.classList.remove('hidden-for-voting');
    state.wrap.classList.add('reveal-phase');
    console.log('[jury-viz] Faceoff shown for reveal');
  }

  function setCounts({ left, right }){
    if (!state) return;
    if (typeof left  === 'number') state.left.count  = left;
    if (typeof right === 'number') state.right.count = right;
    writeCounts(); updateLeaderGlow();
  }

  function onVote(which, counts){
    if (!state) return;
    if (which === 'left') state.left.count++;
    else if (which === 'right') state.right.count++;

    if (counts && typeof counts.left === 'number' && typeof counts.right === 'number'){
      state.left.count  = counts.left;
      state.right.count = counts.right;
    }
    writeCounts();
    
    // Pulse the vote pill instead of the slot
    const pill = which === 'left' ? state.left.pill : state.right.pill;
    if (pill) {
      pill.classList.remove('pulse');
      void pill.offsetWidth; // Force reflow
      pill.classList.add('pulse');
      setTimeout(() => pill.classList.remove('pulse'), 650);
    }
    
    updateLeaderGlow();
  }

  function showFinalTally(){
    if(!state) return;
    remove('.fo-tally');
    const t = el('div', 'fo-tally',
      `Final Tally — ${state.left.meta?.name || 'A'}: ${state.left.count} · ${state.right.meta?.name || 'B'}: ${state.right.count}`);
    state.wrap.appendChild(t);
    return t;
  }

  function showWinnerMessage(name){
    if(!state) return;
    remove('.fo-winner');
    const w = el('div', 'fo-winner', `${name} has won the Big Brother game!`);
    state.wrap.appendChild(w);
    return w;
  }
  
  function showCrown(which){
    if(!state) return;
    const slot = which === 'left' ? state.left.slot : state.right.slot;
    if(!slot) return;
    
    // Remove any existing crowns
    remove('.fo-crown');
    
    const crown = el('div', 'fo-crown', '👑');
    slot.style.position = 'relative';
    slot.appendChild(crown);
    
    console.log('[jury-viz] Crown displayed on winner');
    return crown;
  }
  
  function showCheckCard(winnerName, durationMs=5000){
    if(!state) return;
    remove('.fo-check-card');
    
    const card = el('div', 'fo-check-card');
    card.innerHTML = `
      <div class="fo-check-header">Big Brother Winner Prize</div>
      <div class="fo-check-amount">$1,000,000</div>
      <div class="fo-check-payto">Pay to the order of<br><strong>${winnerName}</strong></div>
      <div class="fo-check-memo">Congratulations on an incredible game!</div>
    `;
    
    state.wrap.appendChild(card);
    
    setTimeout(()=> {
      card.style.animation = 'checkSlideOut 0.4s ease forwards';
      setTimeout(()=> card.remove(), 400);
    }, durationMs);
    
    console.log('[jury-viz] Check card displayed for winner');
    return card;
  }

  function writeCounts(){
    if (!state) return;
    state.left.votesEl.textContent  = String(state.left.count);
    state.right.votesEl.textContent = String(state.right.count);
  }
  
  function updateLeaderGlow(){
    if (!state) return;
    const a = state.left.count, b = state.right.count;
    state.left.slot.classList.toggle('fo-leader',  a > b);
    state.right.slot.classList.toggle('fo-leader', b > a);
  }
  
  function remove(sel){ 
    try{ 
      if (state?.wrap) state.wrap.querySelectorAll(sel).forEach(x=>x.remove()); 
      if (state?.overlay) state.overlay.querySelectorAll(sel).forEach(x=>x.remove());
    } catch (e) {
      console.warn('[jury-viz] remove error:', e);
    }
  }
  
  // Create confetti burst
  function createConfetti(count = 100) {
    if (!state || !state.overlay) return;
    
    const colors = ['#ffd700', '#ff6b6b', '#4ecdc4', '#45b7d1', '#f7b731', '#5f27cd', '#00d2d3'];
    const container = state.overlay;
    
    for (let i = 0; i < count; i++) {
      const confetti = el('div', 'confetti');
      confetti.style.left = Math.random() * 100 + 'vw';
      confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      confetti.style.animationDelay = Math.random() * 0.5 + 's';
      confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
      container.appendChild(confetti);
      
      // Remove after animation
      setTimeout(() => confetti.remove(), 3500);
    }
    
    console.log('[jury-viz] Confetti burst created');
  }
  
  // Create floating emojis
  function createFloatingEmojis() {
    if (!state || !state.overlay) return;
    
    const emojis = ['👑', '🏆', '🎉', '✨'];
    const container = state.overlay;
    
    // Create 12 floating emojis
    for (let i = 0; i < 12; i++) {
      const emoji = el('div', 'floating-emoji');
      emoji.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      emoji.style.left = (10 + Math.random() * 80) + 'vw';
      emoji.style.animationDelay = (Math.random() * 2) + 's';
      emoji.style.animationDuration = (3 + Math.random() * 2) + 's';
      container.appendChild(emoji);
    }
    
    console.log('[jury-viz] Floating emojis created');
  }
  
  // Show winner celebration overlay
  function showWinnerCelebration(winner, runnerUp, finalVotes) {
    if (!state) return;
    
    // FIX 3: COMPLETELY CLEAR the overlay before showing winner content
    // This prevents old voting UI from being visible behind the winner
    if (state.overlay) {
      // Use modern replaceChildren() for better performance
      state.overlay.replaceChildren();
      console.log('[jury-viz] Overlay cleared before winner display');
    }
    
    // Also clear the wrap element if it exists separately
    if (state.wrap && state.wrap.parentNode) {
      state.wrap.remove();
    }
    
    const celebration = el('div', 'winner-celebration');
    
    // Winner display
    const display = el('div', 'winner-display');
    
    const avatarLarge = el('img', 'winner-avatar-large');
    avatarLarge.src = pickAvatar(winner);
    avatarLarge.alt = winner?.name || 'Winner';
    
    const nameLarge = el('div', 'winner-name-large', winner?.name || 'WINNER');
    const title = el('div', 'winner-title', '✨ WINNER OF BIG BROTHER ✨');
    const votesDisplay = el('div', 'winner-votes-display', `Final Vote: ${finalVotes}`);
    
    display.append(avatarLarge, nameLarge, title, votesDisplay);
    celebration.appendChild(display);
    
    // Runner-up compact display
    if (runnerUp) {
      const runnerUpCard = el('div', 'runner-up-compact');
      
      const runnerUpAvatar = el('img', 'runner-up-avatar');
      runnerUpAvatar.src = pickAvatar(runnerUp);
      runnerUpAvatar.alt = runnerUp?.name || 'Runner-up';
      
      const runnerUpInfo = el('div', 'runner-up-info');
      const runnerUpLabel = el('div', 'runner-up-label', 'Runner-Up');
      const runnerUpName = el('div', 'runner-up-name', runnerUp?.name || 'Unknown');
      
      runnerUpInfo.append(runnerUpLabel, runnerUpName);
      runnerUpCard.append(runnerUpAvatar, runnerUpInfo);
      
      if (state.overlay) state.overlay.appendChild(runnerUpCard);
    }
    
    if (state.overlay) state.overlay.appendChild(celebration);
    
    // Show celebration
    requestAnimationFrame(() => {
      setTimeout(() => celebration.classList.add('visible'), 50);
    });
    
    // Create effects
    createConfetti(150);
    createFloatingEmojis();
    
    console.log('[jury-viz] Winner celebration displayed');
    return celebration;
  }

  function destroy(){
    if (!state) return;
    try { 
      if (state.overlay) state.overlay.remove();
      if (state.wrap) state.wrap.remove();
    } catch (e) {
      console.warn('[jury-viz] cleanup error:', e);
    }
    state = null;
    console.log('[jury-viz] Final Faceoff UI destroyed');
  }
  
  // =====================================================================================
  // Batched Vote Display Functions
  // =====================================================================================
  
  /**
   * Generate dynamic tally message based on current vote state
   * @param {number} leftCount - Current votes for left finalist
   * @param {number} rightCount - Current votes for right finalist  
   * @param {number} majority - Votes needed to win
   * @param {number} votesRemaining - Number of votes still to be revealed
   * @returns {string} Dynamic status message
   */
  function generateTallyMessage(leftCount, rightCount, majority, votesRemaining) {
    if (!state) return '';
    
    const leftName = state.left.meta?.name || 'Finalist A';
    const rightName = state.right.meta?.name || 'Finalist B';
    const diff = Math.abs(leftCount - rightCount);
    const leader = leftCount > rightCount ? leftName : rightName;
    const leaderCount = Math.max(leftCount, rightCount);
    const votesNeeded = majority - leaderCount;
    
    // Already won (mathematically)
    if (leaderCount >= majority) {
      return `The winner is decided, but let's see how the rest vote!`;
    }
    
    // One vote away from winning
    if (votesNeeded === 1) {
      return `One more vote could crown the winner!`;
    }
    
    // Tied votes
    if (leftCount === rightCount && leftCount > 0) {
      return `Votes are tied! The tension is real!`;
    }
    
    // Close race (within 1 vote)
    if (diff <= 1 && votesRemaining > 2) {
      return `It's anyone's game now!`;
    }
    
    // Final suspense (last batch)
    if (votesRemaining <= 3 && diff <= 1) {
      return `This next vote could change everything!`;
    }
    
    // Clear leader
    if (votesNeeded > 1) {
      return `${leader} is ${votesNeeded} votes away from winning!`;
    }
    
    // Default
    return `The race continues...`;
  }
  
  /**
   * Display a batch of juror vote cards stacked vertically
   * @param {Array} votes - Array of vote objects: {jurorId, jurorName, finalistName, reason, jurorAvatar}
   * @param {number} durationMs - How long to display (default 4500ms)
   * @returns {Promise} Resolves when display is complete
   */
  function showBatchedVotes(votes, durationMs = 4500) {
    return new Promise((resolve) => {
      if (!state || !state.overlay) {
        console.warn('[jury-viz] Cannot show batched votes: no overlay');
        resolve();
        return;
      }
      
      // Remove any existing vote displays
      const existing = state.overlay.querySelectorAll('.batched-votes-container');
      existing.forEach(el => el.remove());
      
      // Create container for stacked cards
      const container = el('div', 'batched-votes-container');
      container.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 10002;
        width: min(500px, 90vw);
        display: flex;
        flex-direction: column;
        gap: 16px;
        animation: fadeIn 0.4s ease;
      `;
      
      // Create each vote card
      votes.forEach((vote, idx) => {
        const card = el('div', 'batched-vote-card');
        card.style.cssText = `
          background: rgba(15, 25, 40, 0.95);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 2px solid rgba(0, 224, 204, 0.3);
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
          animation: slideInLeft 0.5s ease forwards;
          animation-delay: ${idx * 0.15}s;
          opacity: 0;
        `;
        
        // Header with juror info
        const header = el('div');
        header.style.cssText = `
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        `;
        
        // Juror avatar
        const avatar = el('img');
        avatar.src = vote.jurorAvatar || '';
        avatar.alt = vote.jurorName;
        avatar.style.cssText = `
          width: 50px;
          height: 50px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid rgba(0, 224, 204, 0.4);
        `;
        avatar.onerror = function() {
          const getDicebearUrl = window.getDicebearUrl || window.global?.getDicebearUrl || function(seed) {
            return `https://api.dicebear.com/6.x/bottts/svg?seed=${encodeURIComponent(seed || 'player')}`;
          };
          this.src = getDicebearUrl(vote.jurorName || 'juror');
        };
        
        // Juror name
        const nameLabel = el('div');
        nameLabel.textContent = vote.jurorName;
        nameLabel.style.cssText = `
          font-size: 1.1rem;
          font-weight: 700;
          color: #00e0cc;
          flex: 1;
        `;
        
        header.append(avatar, nameLabel);
        
        // Vote reason text
        const reasonText = el('div');
        reasonText.textContent = vote.reason;
        reasonText.style.cssText = `
          font-size: 0.95rem;
          line-height: 1.5;
          color: #e8f4ff;
          font-style: italic;
          margin-bottom: 12px;
        `;
        
        // Vote badge
        const badge = el('div');
        badge.textContent = `Vote for ${vote.finalistName} ✓`;
        badge.style.cssText = `
          text-align: center;
          padding: 8px 16px;
          background: rgba(0, 224, 204, 0.15);
          border: 1px solid rgba(0, 224, 204, 0.3);
          border-radius: 20px;
          font-size: 0.9rem;
          font-weight: 600;
          color: #00e0cc;
        `;
        
        card.append(header, reasonText, badge);
        container.appendChild(card);
      });
      
      state.overlay.appendChild(container);
      
      // Remove after duration
      setTimeout(() => {
        container.style.animation = 'fadeOut 0.4s ease forwards';
        setTimeout(() => {
          container.remove();
          resolve();
        }, 400);
      }, durationMs);
    });
  }
  
  /**
   * Show tally screen with finalists and vote counts
   * @param {number} leftCount - Votes for left finalist
   * @param {number} rightCount - Votes for right finalist
   * @param {string} statusMessage - Dynamic message to display
   * @param {number} durationMs - How long to display (default 3000ms)
   * @returns {Promise} Resolves when display is complete
   */
  function showTallyScreen(leftCount, rightCount, statusMessage, durationMs = 3000) {
    return new Promise((resolve) => {
      if (!state || !state.overlay) {
        console.warn('[jury-viz] Cannot show tally screen: no overlay');
        resolve();
        return;
      }
      
      // Remove any existing tally displays
      const existing = state.overlay.querySelectorAll('.tally-screen-container');
      existing.forEach(el => el.remove());
      
      const leftName = state.left.meta?.name || 'Finalist A';
      const rightName = state.right.meta?.name || 'Finalist B';
      
      // Create tally screen container
      const container = el('div', 'tally-screen-container');
      container.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 10002;
        width: min(600px, 90vw);
        background: rgba(15, 25, 40, 0.95);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 2px solid rgba(0, 224, 204, 0.4);
        border-radius: 20px;
        padding: 32px 24px;
        box-shadow: 0 12px 36px rgba(0, 0, 0, 0.7);
        animation: fadeIn 0.4s ease;
      `;
      
      // Finalists row
      const finalistsRow = el('div');
      finalistsRow.style.cssText = `
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        gap: 24px;
        align-items: center;
        margin-bottom: 24px;
      `;
      
      // Left finalist
      const leftCard = el('div');
      leftCard.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
      `;
      
      const leftAvatar = el('img');
      leftAvatar.src = pickAvatar(state.left.meta);
      leftAvatar.alt = leftName;
      leftAvatar.style.cssText = `
        width: 100px;
        height: 100px;
        object-fit: cover;
        border-radius: 12px;
        border: 3px solid ${leftCount > rightCount ? 'rgba(0, 224, 204, 0.6)' : 'rgba(255, 255, 255, 0.2)'};
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
      `;
      
      const leftNameEl = el('div');
      leftNameEl.textContent = leftName;
      leftNameEl.style.cssText = `
        font-size: 1.2rem;
        font-weight: 700;
        color: #ffffff;
        text-align: center;
      `;
      
      const leftVotes = el('div');
      leftVotes.textContent = `${leftCount} VOTES`;
      leftVotes.style.cssText = `
        font-size: 1.4rem;
        font-weight: 800;
        color: ${leftCount > rightCount ? '#00e0cc' : '#aaa'};
        text-align: center;
      `;
      
      leftCard.append(leftAvatar, leftNameEl, leftVotes);
      
      // VS divider
      const vsDiv = el('div');
      vsDiv.textContent = 'VS';
      vsDiv.style.cssText = `
        font-size: 2rem;
        font-weight: 900;
        color: #00e0cc;
        text-shadow: 0 0 20px rgba(0, 224, 204, 0.6);
      `;
      
      // Right finalist
      const rightCard = el('div');
      rightCard.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
      `;
      
      const rightAvatar = el('img');
      rightAvatar.src = pickAvatar(state.right.meta);
      rightAvatar.alt = rightName;
      rightAvatar.style.cssText = `
        width: 100px;
        height: 100px;
        object-fit: cover;
        border-radius: 12px;
        border: 3px solid ${rightCount > leftCount ? 'rgba(0, 224, 204, 0.6)' : 'rgba(255, 255, 255, 0.2)'};
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
      `;
      
      const rightNameEl = el('div');
      rightNameEl.textContent = rightName;
      rightNameEl.style.cssText = `
        font-size: 1.2rem;
        font-weight: 700;
        color: #ffffff;
        text-align: center;
      `;
      
      const rightVotes = el('div');
      rightVotes.textContent = `${rightCount} VOTES`;
      rightVotes.style.cssText = `
        font-size: 1.4rem;
        font-weight: 800;
        color: ${rightCount > leftCount ? '#00e0cc' : '#aaa'};
        text-align: center;
      `;
      
      rightCard.append(rightAvatar, rightNameEl, rightVotes);
      
      finalistsRow.append(leftCard, vsDiv, rightCard);
      
      // Status message
      const message = el('div');
      message.textContent = statusMessage;
      message.style.cssText = `
        font-size: 1.1rem;
        font-weight: 600;
        color: #ffdc8b;
        text-align: center;
        line-height: 1.5;
        font-style: italic;
      `;
      
      container.append(finalistsRow, message);
      state.overlay.appendChild(container);
      
      // Remove after duration
      setTimeout(() => {
        container.style.animation = 'fadeOut 0.4s ease forwards';
        setTimeout(() => {
          container.remove();
          resolve();
        }, 400);
      }, durationMs);
    });
  }

  // Public API
  global.FinalFaceoff = {
    mount, showVoteCard, setCounts, onVote,
    showFinalTally, showWinnerMessage,
    showCrown, showCheckCard, 
    showWinnerCelebration, createConfetti, createFloatingEmojis,
    hideFaceoff, showFaceoff,
    showBatchedVotes, showTallyScreen, generateTallyMessage,
    destroy
  };

  // Backward-compatible shims (replace old "final graph" helpers)
  global.initFinalJuryGraph = function(left, right, majority){
    mount({ left, right, majority, container: DEFAULTS.container });
  };
  global.updateFinalJuryGraph = function(which, counts){
    onVote(which, counts);
  };
  global.destroyFinalJuryGraph = function(){
    destroy();
  };

  // Additional aliases if older names were used
  global.initFinalGraph = global.initFinalJuryGraph;
  global.updateFinalGraph = global.updateFinalJuryGraph;
  global.teardownFinalGraph = global.destroyFinalJuryGraph;

  console.log('[jury-viz] Final Faceoff installed (cards + tally + winner)');
})(window);

// =====================================================================================
// Remove the "Edit cast in Lobby..." hint at runtime (no HTML edits).
// =====================================================================================
(function removeLobbyHint(){
  const tryRemove = () => {
    document.querySelectorAll('.tiny.muted').forEach(el => {
      const t = (el.textContent || '').trim();
      if (/^Edit cast in Lobby via Settings\s*→\s*Manage\s*→\s*Edit Cast\./i.test(t)){
        el.remove();
      }
    });
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryRemove, { once:true });
  } else {
    tryRemove();
  }
})();