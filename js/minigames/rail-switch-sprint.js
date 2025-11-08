// MODULE: minigames/rail-switch-sprint.js
// Rail Switch Sprint - Route trains to correct stations by toggling switches

(function(g){
  'use strict';

  function SeededRandom(seed) {
    this.seed = seed || Date.now();
    this.next = function() {
      this.seed = (this.seed * 9301 + 49297) % 233280;
      return this.seed / 233280;
    };
  }

  /**
   * Rail Switch Sprint minigame
   * Toggle switches to route color-coded trains to matching stations
   * 
   * @param {HTMLElement} container - Container element
   * @param {Function} onComplete - Callback function(score)
   * @param {Object} options - Configuration (seed for determinism)
   */
  function render(container, onComplete, options = {}) {
    container.innerHTML = '';
    
    const { debugMode = false, seed } = options;
    const rng = new SeededRandom(seed);
    
    // Game constants
    const CANVAS_WIDTH = 400;
    const CANVAS_HEIGHT = 400;
    const GAME_DURATION = 60; // seconds
    
    // Track colors
    const COLORS = ['#83bfff', '#ff6b9d', '#5bd68a', '#f7b955'];
    
    // Game state
    const trains = [];
    const switches = [];
    const stations = [];
    let score = 0;
    let crashes = 0;
    let combo = 0;
    let gameOver = false;
    let startTime = Date.now();
    let timeLeft = GAME_DURATION;
    let trainSpawnTimer = 0;
    
    // Create simple track layout with switches
    // Track: nodes (x, y) and edges
    const nodes = [
      { x: 50, y: 200, id: 'start', isStation: false },
      { x: 150, y: 200, id: 'sw1', isStation: false },
      { x: 250, y: 150, id: 'st1', color: COLORS[0], isStation: true },
      { x: 250, y: 250, id: 'sw2', isStation: false },
      { x: 350, y: 100, id: 'st2', color: COLORS[1], isStation: true },
      { x: 350, y: 200, id: 'st3', color: COLORS[2], isStation: true },
      { x: 350, y: 300, id: 'st4', color: COLORS[3], isStation: true }
    ];
    
    // Edges: [from, to, active]
    const edges = [
      ['start', 'sw1'],
      ['sw1', 'st1'],
      ['sw1', 'sw2'],
      ['sw2', 'st2'],
      ['sw2', 'st3'],
      ['sw2', 'st4']
    ];
    
    // Switches with states
    switches.push({
      nodeId: 'sw1',
      state: 0, // 0 = path to st1, 1 = path to sw2
      paths: [['sw1', 'st1'], ['sw1', 'sw2']]
    });
    switches.push({
      nodeId: 'sw2',
      state: 0, // 0 = st2, 1 = st3, 2 = st4
      paths: [['sw2', 'st2'], ['sw2', 'st3'], ['sw2', 'st4']]
    });
    
    // Find stations
    nodes.forEach(node => {
      if(node.isStation) {
        stations.push(node);
      }
    });
    
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:12px;padding:15px;';
    
    const title = document.createElement('h3');
    title.textContent = 'Rail Switch Sprint';
    title.style.cssText = 'margin:0;font-size:1.4rem;color:#e3ecf5;';
    
    const instructions = document.createElement('p');
    instructions.textContent = 'Toggle switches to route trains to matching colored stations!';
    instructions.style.cssText = 'margin:0;font-size:0.85rem;color:#95a9c0;text-align:center;max-width:400px;';
    
    const statsDiv = document.createElement('div');
    statsDiv.style.cssText = 'display:flex;gap:16px;font-size:0.9rem;';
    
    const scoreDiv = document.createElement('div');
    scoreDiv.textContent = 'Delivered: 0';
    scoreDiv.style.cssText = 'color:#5bd68a;font-weight:600;';
    
    const crashDiv = document.createElement('div');
    crashDiv.textContent = 'Crashes: 0';
    crashDiv.style.cssText = 'color:#ff6b9d;font-weight:600;';
    
    const timerDiv = document.createElement('div');
    timerDiv.textContent = `Time: ${GAME_DURATION}s`;
    timerDiv.style.cssText = 'color:#83bfff;font-weight:600;';
    
    const comboDiv = document.createElement('div');
    comboDiv.textContent = 'Combo: 0';
    comboDiv.style.cssText = 'color:#f7b955;font-weight:600;display:none;';
    
    statsDiv.appendChild(scoreDiv);
    statsDiv.appendChild(crashDiv);
    statsDiv.appendChild(timerDiv);
    statsDiv.appendChild(comboDiv);
    
    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    canvas.style.cssText = 'background:#1a1a1a;border:3px solid #5bd68a;border-radius:8px;cursor:pointer;touch-action:none;max-width:100%;';
    const ctx = canvas.getContext('2d');
    
    const controlsDiv = document.createElement('div');
    controlsDiv.style.cssText = 'display:flex;gap:10px;flex-wrap:wrap;justify-content:center;';
    
    switches.forEach((sw, idx) => {
      const btn = document.createElement('button');
      btn.textContent = `Switch ${idx + 1}`;
      btn.style.cssText = `
        min-height:44px;
        padding:10px 20px;
        font-size:1rem;
        font-weight:bold;
        background:linear-gradient(135deg, #5bd68a 0%, #4db878 100%);
        color:#1a1a1a;
        border:2px solid #4db878;
        border-radius:10px;
        cursor:pointer;
      `;
      btn.addEventListener('click', () => toggleSwitch(idx));
      controlsDiv.appendChild(btn);
    });
    
    wrapper.appendChild(title);
    wrapper.appendChild(instructions);
    wrapper.appendChild(statsDiv);
    wrapper.appendChild(canvas);
    wrapper.appendChild(controlsDiv);
    container.appendChild(wrapper);
    
    function getNode(id) {
      return nodes.find(n => n.id === id);
    }
    
    function spawnTrain() {
      const targetStation = stations[Math.floor(rng.next() * stations.length)];
      trains.push({
        color: targetStation.color,
        targetId: targetStation.id,
        path: ['start', 'sw1'],
        currentSegment: 0,
        progress: 0,
        speed: 0.3 + rng.next() * 0.2,
        alive: true
      });
    }
    
    function toggleSwitch(idx) {
      if(gameOver) return;
      const sw = switches[idx];
      sw.state = (sw.state + 1) % sw.paths.length;
    }
    
    function getNextNode(train) {
      const currentNodeId = train.path[train.currentSegment];
      const sw = switches.find(s => s.nodeId === currentNodeId);
      
      if(sw) {
        // At switch, determine next path based on state
        return sw.paths[sw.state][1];
      } else {
        // Continue on current path
        return train.path[train.currentSegment + 1];
      }
    }
    
    function updateTrains(delta) {
      trains.forEach(train => {
        if(!train.alive) return;
        
        train.progress += train.speed * delta / 100;
        
        if(train.progress >= 1) {
          // Move to next segment
          train.progress = 0;
          const nextNodeId = getNextNode(train);
          
          if(nextNodeId) {
            train.path.push(nextNodeId);
            train.currentSegment++;
            
            const nextNode = getNode(nextNodeId);
            if(nextNode && nextNode.isStation) {
              // Reached station
              if(nextNode.id === train.targetId) {
                // Correct station
                score++;
                combo++;
                if(combo > 1) {
                  score += combo - 1; // Combo bonus
                  comboDiv.style.display = 'block';
                  comboDiv.textContent = `Combo: x${combo}`;
                }
                scoreDiv.textContent = `Delivered: ${score}`;
              } else {
                // Wrong station
                crashes++;
                combo = 0;
                comboDiv.style.display = 'none';
                crashDiv.textContent = `Crashes: ${crashes}`;
              }
              train.alive = false;
            }
          } else {
            // Dead end
            crashes++;
            combo = 0;
            comboDiv.style.display = 'none';
            crashDiv.textContent = `Crashes: ${crashes}`;
            train.alive = false;
          }
        }
      });
      
      // Remove dead trains
      for(let i = trains.length - 1; i >= 0; i--) {
        if(!trains[i].alive) {
          trains.splice(i, 1);
        }
      }
    }
    
    function draw() {
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      // Draw tracks
      ctx.strokeStyle = '#5bd68a';
      ctx.lineWidth = 3;
      edges.forEach(edge => {
        const from = getNode(edge[0]);
        const to = getNode(edge[1]);
        if(from && to) {
          ctx.beginPath();
          ctx.moveTo(from.x, from.y);
          ctx.lineTo(to.x, to.y);
          ctx.stroke();
        }
      });
      
      // Draw nodes
      nodes.forEach(node => {
        if(node.isStation) {
          ctx.fillStyle = node.color;
          ctx.beginPath();
          ctx.arc(node.x, node.y, 15, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2;
          ctx.stroke();
        } else {
          ctx.fillStyle = '#2a3a4a';
          ctx.beginPath();
          ctx.arc(node.x, node.y, 8, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      
      // Draw switch indicators
      switches.forEach(sw => {
        const node = getNode(sw.nodeId);
        if(node) {
          ctx.fillStyle = '#f7b955';
          ctx.font = 'bold 12px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(sw.state + 1), node.x, node.y);
        }
      });
      
      // Draw trains
      trains.forEach(train => {
        if(!train.alive || train.currentSegment >= train.path.length - 1) return;
        
        const fromNode = getNode(train.path[train.currentSegment]);
        const toNode = getNode(train.path[train.currentSegment + 1]);
        
        if(fromNode && toNode) {
          const x = fromNode.x + (toNode.x - fromNode.x) * train.progress;
          const y = fromNode.y + (toNode.y - fromNode.y) * train.progress;
          
          ctx.fillStyle = train.color;
          ctx.beginPath();
          ctx.arc(x, y, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      });
    }
    
    let lastTime = Date.now();
    let lastFrame = Date.now();
    
    function gameLoop() {
      if(gameOver) return;
      
      const now = Date.now();
      const delta = now - lastFrame;
      lastFrame = now;
      
      // Update timer
      timeLeft = GAME_DURATION - Math.floor((now - startTime) / 1000);
      timerDiv.textContent = `Time: ${Math.max(0, timeLeft)}s`;
      
      if(timeLeft <= 0) {
        endGame();
        return;
      }
      
      // Spawn trains
      trainSpawnTimer += delta;
      const spawnInterval = Math.max(1500, 3000 - Math.floor((GAME_DURATION - timeLeft) / 10) * 200);
      if(trainSpawnTimer >= spawnInterval) {
        spawnTrain();
        trainSpawnTimer = 0;
      }
      
      updateTrains(delta);
      draw();
      requestAnimationFrame(gameLoop);
    }
    
    function endGame() {
      if(gameOver) return;
      gameOver = true;
      
      const finalScore = Math.max(0, Math.min(100, score * 5 - crashes * 10));
      
      const resultDiv = document.createElement('div');
      resultDiv.style.cssText = `
        position:fixed;
        top:50%;
        left:50%;
        transform:translate(-50%, -50%);
        background:#1a2a3a;
        padding:30px;
        border-radius:15px;
        border:3px solid #5bd68a;
        text-align:center;
        z-index:1000;
        min-width:300px;
      `;
      
      const resultText = document.createElement('div');
      resultText.textContent = '⏱️ Time Up!';
      resultText.style.cssText = 'font-size:1.8rem;color:#5bd68a;margin-bottom:15px;font-weight:bold;';
      
      const statsText = document.createElement('div');
      statsText.innerHTML = `
        <div style="color:#5bd68a;font-size:1.1rem;margin-bottom:6px;">Delivered: ${score}</div>
        <div style="color:#ff6b9d;font-size:1.1rem;margin-bottom:12px;">Crashes: ${crashes}</div>
      `;
      
      const scoreText = document.createElement('div');
      scoreText.textContent = `Score: ${finalScore}`;
      scoreText.style.cssText = 'font-size:1.3rem;color:#f7b955;font-weight:600;';
      
      resultDiv.appendChild(resultText);
      resultDiv.appendChild(statsText);
      resultDiv.appendChild(scoreText);
      container.appendChild(resultDiv);
      
      setTimeout(() => {
        if(typeof onComplete === 'function') {
          onComplete(finalScore);
        }
      }, 3000);
    }
    
    // Click on canvas to toggle nearest switch
    canvas.addEventListener('click', (e) => {
      if(gameOver) return;
      
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (CANVAS_WIDTH / rect.width);
      const y = (e.clientY - rect.top) * (CANVAS_HEIGHT / rect.height);
      
      let nearestSwitch = -1;
      let minDist = 30;
      
      switches.forEach((sw, idx) => {
        const node = getNode(sw.nodeId);
        if(node) {
          const dist = Math.sqrt((x - node.x) ** 2 + (y - node.y) ** 2);
          if(dist < minDist) {
            minDist = dist;
            nearestSwitch = idx;
          }
        }
      });
      
      if(nearestSwitch >= 0) {
        toggleSwitch(nearestSwitch);
      }
    });
    
    draw();
    gameLoop();
  }

  // Register module
  if(typeof g.MinigameModules !== 'undefined' && typeof g.MinigameModules.register === 'function'){
    g.MinigameModules.register('railSwitchSprint', { render });
  } else {
    g.MinigameModules = g.MinigameModules || {};
    g.MinigameModules.railSwitchSprint = { render };
    g.MiniGames = g.MiniGames || {};
    g.MiniGames.railSwitchSprint = { render };
  }

  console.info('[RailSwitchSprint] Module loaded');

})(window);
