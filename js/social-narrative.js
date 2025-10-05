// MODULE: social-narrative.js
// Social narrative engine with week memory, stage progression, and threshold events

(function(global){
  'use strict';

  // Initialize social memory structure
  function initSocialMemory(){
    if(!global.game) return;
    if(!global.game.__socialMemory){
      global.game.__socialMemory = {
        pairs: new Map(), // key: "id1,id2" -> { stage: 0-3, lastWeek: 0, affinity: 0, allianceHintShown: false, feudHintShown: false }
        debugShowNumbers: false
      };
    }
    return global.game.__socialMemory;
  }

  // Get or create pair memory
  function getPairMemory(id1, id2){
    const memory = initSocialMemory();
    const key = [id1, id2].sort().join(',');
    if(!memory.pairs.has(key)){
      memory.pairs.set(key, {
        stage: 0,
        lastWeek: global.game?.week || 1,
        affinity: 0,
        allianceHintShown: false,
        feudHintShown: false
      });
    }
    return memory.pairs.get(key);
  }

  // Update pair stage based on affinity
  function updatePairStage(id1, id2, affinity){
    const pair = getPairMemory(id1, id2);
    const week = global.game?.week || 1;
    
    // Week decay: if inactive, downgrade stage
    if(pair.lastWeek < week - 1 && pair.stage > 0){
      pair.stage = Math.max(0, pair.stage - 1);
      console.info(`[social] narrative stageDown pair=${id1},${id2} stage=${pair.stage} reason=weekDecay`);
    }
    
    pair.lastWeek = week;
    pair.affinity = affinity;
    
    // Determine target stage based on affinity
    let targetStage = 0;
    if(affinity > 0.55){
      targetStage = 3; // Strong alliance
    } else if(affinity > 0.35){
      targetStage = 2; // Alliance forming
    } else if(affinity > 0.15){
      targetStage = 1; // Strategizing
    } else if(affinity < -0.55){
      targetStage = 3; // Feud
    } else if(affinity < -0.35){
      targetStage = 2; // Conflict
    } else if(affinity < -0.15){
      targetStage = 1; // Tension
    }
    
    // Escalate stage if needed
    if(targetStage > pair.stage){
      pair.stage = targetStage;
      console.info(`[social] narrative stageUp pair=${id1},${id2} stage=${pair.stage} affinity=${affinity.toFixed(2)}`);
    }
    
    // Threshold events (once per pair)
    if(affinity > 0.55 && !pair.allianceHintShown){
      pair.allianceHintShown = true;
      const name1 = global.safeName?.(id1) || id1;
      const name2 = global.safeName?.(id2) || id2;
      console.info(`[social] allianceHint pair=${id1},${id2}`);
      global.addLog?.(`${name1} and ${name2} appear to be forming a strong alliance.`, 'social');
    }
    
    if(affinity < -0.55 && !pair.feudHintShown){
      pair.feudHintShown = true;
      const name1 = global.safeName?.(id1) || id1;
      const name2 = global.safeName?.(id2) || id2;
      console.info(`[social] feudHint pair=${id1},${id2}`);
      global.addLog?.(`Tension between ${name1} and ${name2} has escalated into a serious feud.`, 'warn');
    }
    
    return pair;
  }

  // Generate narrative description for pair
  function getNarrativeForPair(id1, id2, affinity){
    const pair = updatePairStage(id1, id2, affinity);
    const name1 = global.safeName?.(id1) || id1;
    const name2 = global.safeName?.(id2) || id2;
    const memory = initSocialMemory();
    
    let narrative = '';
    
    if(affinity > 0.15){
      // Positive relationship stages
      const positiveNarratives = [
        [`${name1} and ${name2} met and had a brief chat.`, `${name1} and ${name2} got to know each other.`],
        [`${name1} and ${name2} are strategizing together.`, `${name1} and ${name2} are building trust.`],
        [`${name1} and ${name2} are working closely as allies.`, `${name1} and ${name2} have strong alliance synergy.`],
        [`${name1} and ${name2} are in a tight alliance.`, `${name1} and ${name2} have an unbreakable bond.`]
      ];
      const options = positiveNarratives[Math.min(3, pair.stage)] || positiveNarratives[0];
      narrative = options[Math.floor(Math.random() * options.length)];
    } else if(affinity < -0.15){
      // Negative relationship stages
      const negativeNarratives = [
        [`${name1} and ${name2} had an awkward moment.`, `${name1} and ${name2} avoided each other.`],
        [`${name1} and ${name2} are feeling tension.`, `${name1} and ${name2} had a disagreement.`],
        [`${name1} and ${name2} are in open conflict.`, `${name1} and ${name2} can't stand each other.`],
        [`${name1} and ${name2} are feuding intensely.`, `${name1} and ${name2} are bitter enemies.`]
      ];
      const options = negativeNarratives[Math.min(3, pair.stage)] || negativeNarratives[0];
      narrative = options[Math.floor(Math.random() * options.length)];
    } else {
      // Neutral
      narrative = `${name1} and ${name2} exchanged pleasantries.`;
    }
    
    // Append numeric delta if debug enabled
    if(memory.debugShowNumbers){
      const delta = affinity > 0 ? `+${affinity.toFixed(2)}` : affinity.toFixed(2);
      narrative += ` (${delta})`;
    }
    
    return narrative;
  }

  // Reset week memory (call at start of new week)
  function resetWeekMemory(){
    const memory = initSocialMemory();
    const week = global.game?.week || 1;
    
    // Apply week decay to all pairs
    memory.pairs.forEach((pair, key) => {
      if(pair.lastWeek < week - 1 && pair.stage > 0){
        pair.stage = Math.max(0, pair.stage - 1);
        console.info(`[social] narrative weekDecay pair=${key} stage=${pair.stage}`);
      }
    });
  }

  // Toggle debug numbers
  function toggleDebugNumbers(){
    const memory = initSocialMemory();
    memory.debugShowNumbers = !memory.debugShowNumbers;
    console.info(`[social] debugShowNumbers=${memory.debugShowNumbers}`);
    return memory.debugShowNumbers;
  }

  // Export functions
  global.initSocialMemory = initSocialMemory;
  global.getPairMemory = getPairMemory;
  global.updatePairStage = updatePairStage;
  global.getNarrativeForPair = getNarrativeForPair;
  global.resetWeekMemory = resetWeekMemory;
  global.toggleSocialDebugNumbers = toggleDebugNumbers;

})(window);
