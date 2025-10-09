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
  .finalFaceoff{
    position: relative;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
    align-items: start;
    justify-items: center;
    width: 100%;
    padding: 18px 12px 28px;
    box-sizing: border-box;
    min-height: 300px;
  }
  /* Vote cards lane (top center) - Issue 3: Safe region above finalists */
  .finalFaceoff .fo-cards{
    position: absolute;
    top: -80px; /* Moved higher to avoid overlap with finalists */
    left: 50%;
    transform: translateX(-50%);
    width: min(90%, 980px);
    display: flex;
    flex-direction: column-reverse;
    align-items: center;
    gap: 6px;
    pointer-events: none;
    z-index: 5;
  }
  /* Jury lane safe region class for collision detection */
  .jury-lane {
    position: absolute;
    top: -80px;
    left: 0;
    right: 0;
    height: 200px;
    pointer-events: none;
    z-index: 5;
  }
  /* Offset class for collision detection fallback */
  .fo-card.offset-up {
    transform: translateY(-20px);
  }
  .fo-card.offset-up.enter {
    transform: translateY(-20px);
  }
  .finalFaceoff .fo-card{
    /* Ultra-transparent vote cards with glassmorphism */
    background: rgba(0,0,0,0.15);
    backdrop-filter: blur(4px) saturate(1.1);
    -webkit-backdrop-filter: blur(4px) saturate(1.1);
    border: 1px solid rgba(255,255,255,0.12);
    padding: 8px 12px;
    border-radius: 10px;
    font-size: clamp(13px, 1.7vw, 18px);
    line-height: 1.25;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    opacity: 0;
    transform: translateY(-6px);
    transition: opacity .25s ease, transform .25s ease;
    color: #e8f9ff;
    text-align: center;
    max-width: 100%;
    text-shadow: 0 1px 2px rgba(0,0,0,0.5);
  }
  .finalFaceoff .fo-card.enter{
    opacity: 1;
    transform: translateY(0);
  }
  .finalFaceoff .fo-card.fade{
    opacity: 0;
    transform: translateY(-10px);
  }

  .finalFaceoff .fo-slot{
    position: relative;
    display: grid;
    grid-template-rows: auto auto auto;
    gap: 10px;
    align-items: center;
    justify-items: center;
    padding: 14px 16px;
    width: min(46vw, 520px);
    border-radius: 14px;
    /* Completely transparent background - TV fully visible */
    background: transparent;
    box-shadow: none;
    transition: box-shadow .25s ease, transform .25s ease;
  }
  .finalFaceoff .fo-slot.fo-leader{
    /* Subtle glow only, no border */
    box-shadow: 0 0 20px rgba(0,255,230,0.15);
    transform: translateY(-2px);
  }

  .fo-avatar{
    width: min(26vw, 300px);
    height: min(26vw, 300px);
    object-fit: cover;
    border-radius: 12px;
    background: #111;
    box-shadow: 0 8px 24px rgba(0,0,0,0.35);
  }

  .fo-name{
    font-size: clamp(18px, 2vw, 28px);
    font-weight: 700;
    letter-spacing: 0.3px;
    text-align: center;
  }

  .fo-votes{
    font-size: clamp(22px, 3vw, 36px);
    font-weight: 800;
    background: linear-gradient(180deg, rgba(255,255,255,0.9), rgba(255,255,255,0.65));
    -webkit-background-clip: text;
    color: transparent;
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
    if (html != null) n.innerHTML = html;
    return n;
  }
  function pickAvatar(obj){
    return obj?.avatar || obj?.image || obj?.img || obj?.avatarUrl || obj?.photo || '';
  }

  function mount({ left, right, majority, container }){
    destroy();
    // Remove any left-over graph containers
    try { document.querySelectorAll('.final-graph, .jury-graph, #finalGraph').forEach(x => x.remove()); } catch {}

    const mountAt = typeof container === 'string' ? document.querySelector(container) : (container || document.body);
    if (!mountAt) throw new Error('FinalFaceoff: container not found');

    const wrap = el('div', 'finalFaceoff');
    const cards = el('div', 'fo-cards');
    const badge = el('div', 'fo-badge', 'Majority clinched'); badge.style.display = 'none';

    const leftSlot = el('div', 'fo-slot left');
    const leftImg = el('img', 'fo-avatar'); leftImg.src = pickAvatar(left); leftImg.alt = left?.name || 'Finalist A';
    const leftName = el('div', 'fo-name', left?.name || 'Finalist A');
    const leftVotes = el('div', 'fo-votes', '0');
    leftSlot.append(leftImg, leftName, leftVotes);

    const rightSlot = el('div', 'fo-slot right');
    const rightImg = el('img', 'fo-avatar'); rightImg.src = pickAvatar(right); rightImg.alt = right?.name || 'Finalist B';
    const rightName = el('div', 'fo-name', right?.name || 'Finalist B');
    const rightVotes = el('div', 'fo-votes', '0');
    rightSlot.append(rightImg, rightName, rightVotes);

    wrap.append(cards, leftSlot, rightSlot, badge);
    mountAt.appendChild(wrap);

    state = {
      wrap, cards, badge,
      left:  { meta:left,  slot:leftSlot,  votesEl:leftVotes,  count:0 },
      right: { meta:right, slot:rightSlot, votesEl:rightVotes, count:0 },
      majority: majority || 0
    };

    updateLeaderGlow();
    updateBadge();
    console.log('[jury-viz] Final Faceoff UI mounted');
  }

  function showVoteCard(jurorName, votedName){
    if(!state) return;
    const text = `${jurorName}: I vote for ${votedName} to win the Big Brother game.`;
    const card = el('div', 'fo-card', text);
    state.cards.appendChild(card);
    
    // Issue 3: Collision detection - check if card overlaps finalist avatars
    let offsetApplied = false;
    requestAnimationFrame(() => {
      const cardRect = card.getBoundingClientRect();
      const leftSlotRect = state.left.slot.getBoundingClientRect();
      const rightSlotRect = state.right.slot.getBoundingClientRect();
      
      // Check for overlap
      const overlapsLeft = !(cardRect.bottom < leftSlotRect.top || cardRect.top > leftSlotRect.bottom);
      const overlapsRight = !(cardRect.bottom < rightSlotRect.top || cardRect.top > rightSlotRect.bottom);
      
      if(overlapsLeft || overlapsRight){
        card.classList.add('offset-up');
        offsetApplied = true;
      }
      
      // Log bubble positioning (Issue 3)
      console.info(`[jury] bubble juror=${jurorName} offsetApplied=${offsetApplied}`);
      
      card.classList.add('enter');
    });
    
    // keep last 3 cards
    const nodes = Array.from(state.cards.children);
    while (nodes.length > 3){
      nodes[0].remove();
      nodes.shift();
    }
    
    setTimeout(()=> card.classList.add('fade'), 1400);
    setTimeout(()=> card.remove(), 2200);
  }

  function setCounts({ left, right }){
    if (!state) return;
    if (typeof left  === 'number') state.left.count  = left;
    if (typeof right === 'number') state.right.count = right;
    writeCounts(); updateLeaderGlow(); updateBadge();
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
    pulse(which === 'left' ? state.left.slot : state.right.slot);
    updateLeaderGlow(); updateBadge();
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
    state.left.votesEl.textContent  = String(state.left.count);
    state.right.votesEl.textContent = String(state.right.count);
  }
  function pulse(slot){
    if (!slot) return;
    slot.classList.remove('fo-pulse'); void slot.offsetWidth; slot.classList.add('fo-pulse');
    setTimeout(()=> slot.classList.remove('fo-pulse'), 650);
  }
  function updateLeaderGlow(){
    const a = state.left.count, b = state.right.count;
    state.left.slot.classList.toggle('fo-leader',  a > b);
    state.right.slot.classList.toggle('fo-leader', b > a);
  }
  function updateBadge(){
    const m = state?.majority || 0;
    const clinched = m > 0 && (state.left.count >= m || state.right.count >= m);
    if (state?.badge) state.badge.style.display = clinched ? '' : 'none';
  }
  function remove(sel){ try{ state.wrap.querySelectorAll(sel).forEach(x=>x.remove()); }catch{} }

  function destroy(){
    if (!state) return;
    try { state.wrap.remove(); } catch {}
    state = null;
    console.log('[jury-viz] Final Faceoff UI destroyed');
  }

  // Public API
  global.FinalFaceoff = {
    mount, showVoteCard, setCounts, onVote,
    showFinalTally, showWinnerMessage,
    showCrown, showCheckCard, destroy
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