// MODULE: debug-tools.js
// Debug utilities for testing competition fairness

(function(global){
  'use strict';

  // Simulate X competitions without UI to test human win ratio
  function dumpCompStats(numSims = 100){
    console.log(`[debug] Running ${numSims} competition simulations...`);
    
    const g = global.game;
    if(!g || !g.players || g.players.length === 0){
      console.error('[debug] No game or players initialized');
      return;
    }
    
    const humanId = g.humanId;
    if(!humanId){
      console.error('[debug] No human player found');
      return;
    }
    
    const human = global.getP?.(humanId);
    if(!human){
      console.error('[debug] Human player not found');
      return;
    }
    
    let humanWins = 0;
    let aiWins = 0;
    const alive = global.alivePlayers?.() || g.players.filter(p => !p.evicted);
    const eligible = alive.filter(p => p.id !== g.lastHOHId || alive.length === 4);
    
    console.log(`[debug] Human compBeast: ${human.compBeast?.toFixed(3) || 'N/A'}`);
    console.log(`[debug] Eligible players: ${eligible.length}`);
    
    for(let i = 0; i < numSims; i++){
      const scores = new Map();
      
      for(const p of eligible){
        const baseScore = 8 + Math.random() * 20;
        const multiplier = 0.75 + (p.compBeast || 0.5) * 0.6;
        const variance = 0.9 + Math.random() * 0.3;
        const finalScore = baseScore * multiplier * variance;
        scores.set(p.id, finalScore);
      }
      
      const sorted = [...scores.entries()].sort((a, b) => b[1] - a[1]);
      const winnerId = sorted[0][0];
      
      if(winnerId === humanId){
        humanWins++;
      } else {
        aiWins++;
      }
    }
    
    const humanWinRate = (humanWins / numSims * 100).toFixed(1);
    const expectedRate = (100 / eligible.length).toFixed(1);
    
    console.log(`\n[debug] Competition Stats (${numSims} simulations):`);
    console.log(`  Human wins: ${humanWins} (${humanWinRate}%)`);
    console.log(`  AI wins: ${aiWins} (${(aiWins / numSims * 100).toFixed(1)}%)`);
    console.log(`  Expected rate (fair): ${expectedRate}%`);
    console.log(`  Eligible players: ${eligible.length}`);
    
    if(parseFloat(humanWinRate) > parseFloat(expectedRate) * 1.5){
      console.warn(`  ⚠️ Human win rate is significantly higher than expected`);
    } else if(parseFloat(humanWinRate) < parseFloat(expectedRate) * 0.5){
      console.warn(`  ⚠️ Human win rate is significantly lower than expected`);
    } else {
      console.log(`  ✅ Win rate is within expected range`);
    }
    
    return {
      humanWins,
      aiWins,
      humanWinRate: parseFloat(humanWinRate),
      expectedRate: parseFloat(expectedRate),
      numSims,
      eligible: eligible.length
    };
  }
  
  // Dump phase state
  function dumpPhaseState(){
    const g = global.game;
    if(!g){
      console.error('[debug] No game state');
      return;
    }
    
    console.log('[debug] Phase State Dump:');
    console.log(`  Phase: ${g.phase}`);
    console.log(`  Week: ${g.week}`);
    console.log(`  HOH: ${global.safeName?.(g.hohId) || g.hohId || 'none'}`);
    console.log(`  Veto Holder: ${global.safeName?.(g.vetoHolder) || g.vetoHolder || 'none'}`);
    console.log(`  Nominees: ${(g.nominees || []).map(id => global.safeName?.(id) || id).join(', ') || 'none'}`);
    console.log(`  Alive: ${(global.alivePlayers?.() || []).length}`);
    console.log(`  Jury: ${(g.juryHouse || []).map(id => global.safeName?.(id) || id).join(', ') || 'none'}`);
    console.log(`  Phase Token: ${global.currentPhaseToken || 'N/A'}`);
    console.log(`  Card Generation: ${global.__cardGen || 0}`);
    
    return {
      phase: g.phase,
      week: g.week,
      hoh: g.hohId,
      vetoHolder: g.vetoHolder,
      nominees: g.nominees,
      alive: (global.alivePlayers?.() || []).length,
      jury: g.juryHouse,
      phaseToken: global.currentPhaseToken,
      cardGen: global.__cardGen
    };
  }
  
  // Dump social memory
  function dumpSocialMemory(){
    const memory = global.game?.__socialMemory;
    if(!memory){
      console.error('[debug] No social memory initialized');
      return;
    }
    
    console.log('[debug] Social Memory Dump:');
    console.log(`  Debug Numbers: ${memory.debugShowNumbers}`);
    console.log(`  Total Pairs: ${memory.pairs.size}`);
    
    const sortedPairs = [...memory.pairs.entries()].sort((a, b) => Math.abs(b[1].affinity) - Math.abs(a[1].affinity));
    
    console.log('\n  Top Relationships:');
    sortedPairs.slice(0, 10).forEach(([key, data]) => {
      const [id1, id2] = key.split(',');
      const name1 = global.safeName?.(id1) || id1;
      const name2 = global.safeName?.(id2) || id2;
      console.log(`    ${name1} ↔ ${name2}: stage=${data.stage} affinity=${data.affinity.toFixed(2)} week=${data.lastWeek}`);
    });
    
    return memory;
  }
  
  // Simulate final two scenario
  function simulateFinalTwo(){
    const g = global.game;
    if(!g){
      console.error('[debug] No game state');
      return;
    }
    
    const alive = global.alivePlayers?.() || [];
    if(alive.length < 2){
      console.error('[debug] Need at least 2 players alive');
      return;
    }
    
    // Keep only 2 players
    const finalists = alive.slice(0, 2);
    g.players.forEach(p => {
      if(!finalists.includes(p)){
        p.evicted = true;
        if(!g.juryHouse.includes(p.id)){
          g.juryHouse.push(p.id);
        }
      }
    });
    
    console.log('[debug] Simulated Final Two:');
    console.log(`  Finalists: ${finalists.map(p => p.name).join(', ')}`);
    console.log(`  Jury Size: ${g.juryHouse.length}`);
    
    // Trigger finale phase
    if(typeof global.setPhase === 'function'){
      global.setPhase('jury', 30, () => {
        if(typeof global.startJuryVoting === 'function'){
          global.startJuryVoting();
        }
      });
    }
    
    if(typeof global.updateHud === 'function') global.updateHud();
    
    return { finalists, jurySize: g.juryHouse.length };
  }
  
  // Toggle reduced motion
  function toggleReducedMotion(){
    const body = document.body;
    const current = body.classList.contains('reduced-motion');
    body.classList.toggle('reduced-motion');
    const newState = !current;
    
    console.info(`[debug] Reduced Motion: ${newState ? 'ON' : 'OFF'}`);
    
    // Store preference
    try{
      localStorage.setItem('bb_reducedMotion', newState ? '1' : '0');
    }catch{}
    
    return newState;
  }
  
  // Export to window
  global.__dumpCompStats = dumpCompStats;
  global.__dumpPhaseState = dumpPhaseState;
  global.__dumpSocialMemory = dumpSocialMemory;
  global.__simulateFinalTwo = simulateFinalTwo;
  global.__toggleReducedMotion = toggleReducedMotion;
  
  console.info('[debug-tools] Loaded. Available commands:');
  console.info('  window.__dumpCompStats(100) - Test competition fairness');
  console.info('  window.__dumpPhaseState() - Show current phase state');
  console.info('  window.__dumpSocialMemory() - Show social memory');
  console.info('  window.__simulateFinalTwo() - Jump to final two');
  console.info('  window.__toggleReducedMotion() - Toggle reduced motion');

})(window);
