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
  
  // Export to window
  global.__dumpCompStats = dumpCompStats;
  
  console.info('[debug-tools] Loaded. Use window.__dumpCompStats(100) to test competition fairness.');

})(window);
