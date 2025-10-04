// MODULE: state.js
// Core game state, RNG, player creation, relationships, alliances, drift.
// Adds richer meta fields for opening presentation.

(function(global){

  /* ===== Static Data ===== */
  const TRAITS=['Strategist','Social Butterfly','Lone Wolf','Wildcard','Competitor','Charmer','Schemer','Floater','Numbers Player','Risk Taker'];
  const LOCATIONS=['NY','LA','Dallas','Miami','Chicago','Boston','Denver','Seattle','Atlanta','Phoenix','Austin','Portland'];
  const SEXES=['M','F'];
  const OCCUPATIONS=['Teacher','Software Dev','Nurse','Artist','Sales Rep','Chef','Barista','Photographer','Fitness Coach','Student','Entrepreneur','Analyst','DJ','Designer','Marketer'];
  const SEXUALITIES=['Straight','Gay','Bi','Queer','Pan'];
  const ETHNICITIES=['Black','White','Latino','Asian','Mixed','Middle Eastern','Indigenous'];
  const MOTTOS=[
    'Play big or go home.','Trust but verify.','Social first, comps later.','Expect chaos.',
    'No risk, no reward.','Silent but deadly.','Float till it matters.','All about loyalty.'
  ];

  /* ===== Game State ===== */
  const game={
    cfg:{
      numPlayers:12,tHOH:35,tNoms:25,tVeto:30,tVetoDec:20,tComms:30,tVote:25,tJury:42,
      fxCards:true,fxSound:true,fxStyle:'fade',fxAnim:true,miniMode:'random',
      manualMode:false,doubleChance:10,tripleChance:3,enableJuryHouse:true,autoMusic:true,
      returnChance:50,selfEvictChance:0,humanName:'You',enablePublicFav:false
    },
    week:1,phase:'lobby',endAt:0,
    players:[],humanId:null,
    hohId:null,lastHOHId:null,
    nominees:[],vetoHolder:null,
    jury:[],juryHouse:[],votingJury:[],
    lastCompScores:new Map(),
    rngSeed:Math.floor(Math.random()*1e9),
    editMode:false,
    nomsLocked:false,vetoSavedId:null,
    hohOrder:[],miniIndex:0,
    doubleEvictionWeek:false,tripleEvictionWeek:false,
    socialTimers:[],activeEvent:null,
    juryVotes:new Map(),revealedJuryVotes:new Set(),
    juryTwistDone:false,juryTwistCandidateWeek:null,juryTwistRunning:false,
    firstEvictionExcludedId:null,
    openingDone:false,
    relationships:{},alliances:[],
    nominations:{primary:[],replacement:null,final:[]},
    eviction:{nominees:[],votes:[],evicted:null},
    relChangeLogs:[],
    juryAllVotesLocked:false,
    juryPreRevealShown:false,
    jurySequentialRevealActive:false,
    pendingAdvance:null,
    miniHistory:[],
    finale:{
      juryVotesRaw:[],
      castingDone:false,
      revealStarted:false
    }
  };

  /* ===== Balance & Social Constants ===== */
  const NOMINATION_PENALTY=-12;
  const SHARED_VOTE_REWARD=4;
  const SAVED_WITH_VETO_REWARD=10;
  const VETO_NOT_USED_ON_ALLY_PENALTY=-6;
  const DRIFT_STEP=1;
  const ALLIANCE_FORM_THRESHOLD=25;
  const ALLIANCE_PRUNE_THRESHOLD=10;
  const MAX_ALLIANCE_SIZE=6;
  const REL_VETO_FRIEND_THRESHOLD=25;
  const REL_VETO_HOH_COHESION=10;
  const THREAT_BASE=0.5;
  const ALLY_T=0.28;
  const ENEMY_T=-0.28;
  const STRONG_ALLY=0.45;

  /* ===== RNG ===== */
  function rng(){ let x=Math.sin(game.rngSeed++)*10000; return x-Math.floor(x); }
  function clamp(x,a,b){ return Math.max(a,Math.min(b,x)); }

  /* ===== Basic Accessors ===== */
  function getP(id){ return game.players.find(p=>p.id===id); }
  function safeName(id){ return getP(id)?.name||'(?)'; }
  function alivePlayers(){ return game.players.filter(p=>!p.evicted); }
  function fmtList(ids){ return ids.map(safeName).join(', '); }

  /* ===== Player Creation ===== */
  function pushPlayer({name,human=false}){
    const id=(game.players.length?Math.max(...game.players.map(p=>p.id))+1:1);
    const skill=human?0.55:0.35+rng()*0.5;
    
    // Enhanced compBeast with archetype adjustments
    let compBeast = 0.35 + rng()*0.30; // Base range 0.35-0.65
    const persona={ aggr:0.25+rng()*0.7, loyalty:0.25+rng()*0.7, chaos:0.1+rng()*0.5 };
    
    const avatar=`https://api.dicebear.com/6.x/bottts/svg?seed=${encodeURIComponent(name)}`;
    const meta={
      age:21+Math.floor(rng()*29),
      sex:SEXES[Math.floor(rng()*SEXES.length)],
      loc:LOCATIONS[Math.floor(rng()*LOCATIONS.length)],
      trait:TRAITS[Math.floor(rng()*TRAITS.length)],
      occupation:OCCUPATIONS[Math.floor(rng()*OCCUPATIONS.length)],
      sexuality:SEXUALITIES[Math.floor(rng()*SEXUALITIES.length)],
      ethnicity:ETHNICITIES[Math.floor(rng()*ETHNICITIES.length)],
      motto:MOTTOS[Math.floor(rng()*MOTTOS.length)]
    };
    
    // Archetype-based compBeast adjustments
    const trait = meta.trait?.toLowerCase() || '';
    if(trait.includes('athlete') || trait.includes('physical')) compBeast += 0.15;
    else if(trait.includes('strategist') || trait.includes('mastermind')) compBeast += 0.05;
    else if(trait.includes('wildcard') || trait.includes('unpredictable')) compBeast += (rng() - 0.5) * 0.2;
    else if(trait.includes('slacker') || trait.includes('lazy')) compBeast -= 0.05;
    
    // Clamp to 0.2-0.9 range
    compBeast = Math.max(0.2, Math.min(0.9, compBeast));
    
    // For human, use balanced starting value
    if(human) compBeast = 0.5;
    
    const wins={hoh:0,veto:0};
    const p={ id,name,human,evicted:false,nominated:false,hoh:false,
      persona,skill,compBeast,affinity:{},stats:{hohWins:0,vetoWins:0},wins,
      threat:THREAT_BASE,weekEvicted:null,winner:false,runnerUp:false,
      avatar,meta
    };
    game.players.push(p);
    if(human) game.humanId=id;
  }

  function initAffinities(keep=false){
    for(const a of game.players)
      for(const b of game.players){
        if(a.id===b.id) continue;
        if(keep && typeof a.affinity[b.id]==='number') continue;
        a.affinity[b.id]=(rng()-0.5)*0.4;
      }
  }

  /* ===== Relationships & Alliances ===== */
  function bondKey(a,b){ const [l,h]=[Math.min(a,b),Math.max(a,b)]; return `${l}-${h}`; }
  function initRelationships(){
    if(!game.relationships) game.relationships={};
    for(let i=0;i<game.players.length;i++)
      for(let j=i+1;j<game.players.length;j++){
        const k=bondKey(game.players[i].id,game.players[j].id);
        if(!(k in game.relationships)) game.relationships[k]=0;
      }
  }
  function getBond(a,b){ return game.relationships[bondKey(a,b)]||0; }
  function setBond(a,b,val){
    const k=bondKey(a,b);
    const old=game.relationships[k]||0;
    const nv=Math.max(-100,Math.min(100,val));
    game.relationships[k]=nv;
    if(Math.abs(nv-old)>=12 && global.addLog) global.addLog(`Bond shift: ${safeName(a)} ↔ ${safeName(b)} ${nv-old>0?'+':''}${nv-old}`,'muted');
  }
  function addBond(a,b,d){ setBond(a,b,getBond(a,b)+d); }
  function inSameAlliance(a,b){ return game.alliances.some(al=>al.members.includes(a)&&al.members.includes(b)); }
  function recomputeAllianceCohesion(al){
    let sum=0,c=0;
    for(let i=0;i<al.members.length;i++)
      for(let j=i+1;j<al.members.length;j++){ sum+=getBond(al.members[i],al.members[j]); c++; }
    al.cohesion=c?Math.round(sum/c):0;
  }
  function formAlliance(memberIds){
    if(memberIds.length<3||memberIds.length>MAX_ALLIANCE_SIZE) return;
    for(let i=0;i<memberIds.length;i++)
      for(let j=i+1;j<memberIds.length;j++)
        if(getBond(memberIds[i],memberIds[j])<ALLIANCE_FORM_THRESHOLD) return;
    const sorted=[...memberIds].sort((a,b)=>a-b);
    if(game.alliances.some(al=>al.members.length===sorted.length &&
      [...al.members].sort((x,y)=>x-y).every((id,i)=>id===sorted[i]))) return;
    const al={id:Date.now()+Math.floor(Math.random()*9999),members:[...memberIds],cohesion:0};
    recomputeAllianceCohesion(al);
    game.alliances.push(al);
    global.addLog && global.addLog(`Alliance formed: [${memberIds.map(safeName).join(', ')}] cohesion ${al.cohesion}`,'success');
  }
  function pruneAlliances(){
    const removed=[];
    for(const al of game.alliances){
      let bad=false,reason='';
      if(al.members.length<2){bad=true;reason='too small';}
      else if(al.cohesion<ALLIANCE_PRUNE_THRESHOLD){bad=true;reason='low cohesion';}
      else{
        for(let i=0;i<al.members.length && !bad;i++)
          for(let j=i+1;j<al.members.length;j++)
            if(getBond(al.members[i],al.members[j])<-25){bad=true;reason='conflict';break;}
      }
      if(bad){ removed.push(al); global.addLog && global.addLog(`Alliance dissolved: [${al.members.map(safeName).join(', ')}] (${reason})`,'muted'); }
    }
    game.alliances=game.alliances.filter(a=>!removed.includes(a));
  }
  function tryFormAlliances(){
    const alive=alivePlayers(); if(alive.length<3) return;
    if(rng()<0.25){
      const ids=alive.map(p=>p.id);
      for(let size=3; size<=Math.min(5,ids.length); size++){
        if(rng()>0.18) continue;
        const sample=ids.slice().sort(()=>rng()-0.5).slice(0,size);
        if(sample.every((a,i)=>sample.slice(i+1).every(b=>getBond(a,b)>=ALLIANCE_FORM_THRESHOLD)))
          formAlliance(sample);
      }
    }
  }
  function socialPhaseTick(){
    if(alivePlayers().length<2) return;
    // drift + alliance maintenance
    for(const k in game.relationships){
      const v=game.relationships[k];
      if(v>0) game.relationships[k]=Math.max(0,v-DRIFT_STEP);
      else if(v<0) game.relationships[k]=Math.min(0,v+DRIFT_STEP);
    }
    game.alliances.forEach(recomputeAllianceCohesion);
    pruneAlliances();
    tryFormAlliances();
  }

  /* ===== Affinity Helpers ===== */
  function allyNames(p){ return Object.entries(p.affinity||{}).filter(([id,v])=>v>=ALLY_T && !getP(+id).evicted).map(([id])=>safeName(+id)); }
  function enemyNames(p){ return Object.entries(p.affinity||{}).filter(([id,v])=>v<=ENEMY_T && !getP(+id).evicted).map(([id])=>safeName(+id)); }
  function avgAffinity(p){ const vals=Object.values(p.affinity||{}); return vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:0; }
  function updatePlayerThreat(p){ p.threat=THREAT_BASE+0.1*(p.wins.hoh+p.wins.veto); }

  /* ===== Exports ===== */
  global.game=game;
  global.TRAITS=TRAITS;
  global.rng=rng;
  global.clamp=clamp;
  global.pushPlayer=pushPlayer;
  global.initAffinities=initAffinities;
  global.initRelationships=initRelationships;
  global.getP=getP;
  global.safeName=safeName;
  global.alivePlayers=alivePlayers;
  global.fmtList=fmtList;
  global.addBond=addBond;
  global.inSameAlliance=inSameAlliance;
  global.socialPhaseTick=socialPhaseTick;
  global.allyNames=allyNames;
  global.enemyNames=enemyNames;
  global.avgAffinity=avgAffinity;
  global.updatePlayerThreat=updatePlayerThreat;

  global.ALLY_T=ALLY_T;
  global.ENEMY_T=ENEMY_T;
  global.STRONG_ALLY=STRONG_ALLY;
  global.NOMINATION_PENALTY=NOMINATION_PENALTY;
  global.SAVED_WITH_VETO_REWARD=SAVED_WITH_VETO_REWARD;
  global.VETO_NOT_USED_ON_ALLY_PENALTY=VETO_NOT_USED_ON_ALLY_PENALTY;
  global.SHARED_VOTE_REWARD=SHARED_VOTE_REWARD;
  global.REL_VETO_FRIEND_THRESHOLD=REL_VETO_FRIEND_THRESHOLD;
  global.REL_VETO_HOH_COHESION=REL_VETO_HOH_COHESION;
  global.THREAT_BASE=THREAT_BASE;
  global.DRIFT_STEP=DRIFT_STEP;
  global.ALLIANCE_FORM_THRESHOLD=ALLIANCE_FORM_THRESHOLD;
  global.ALLIANCE_PRUNE_THRESHOLD=ALLIANCE_PRUNE_THRESHOLD;
  global.MAX_ALLIANCE_SIZE=MAX_ALLIANCE_SIZE;

})(window);