(function(g){
  'use strict';
  const UI = g.UI || (g.UI = {});

  // Constants and storage
  const SETTINGS_STORE_KEY = 'bb_cfg_v2';
  const INJECTED_CSS_ID = 'ui_injected_styles_v2';
  const FALLBACK_AVATAR = 'https://api.dicebear.com/6.x/bottts/svg?seed=Guest';
  UI.FALLBACK_AVATAR = FALLBACK_AVATAR;

  // Injected UI CSS (settings, cast editor, cascade deck). Keep here to stay centralized.
  UI.INJECTED_CSS = [
    '.modal-backdrop{position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.55);z-index:80}',
    '.modal-backdrop .modal{background:#0f1320;border:1px solid #273041;border-radius:12px;box-shadow:0 20px 80px rgba(0,0,0,.6);padding:12px 14px;width:min(980px,96vw);max-height:92vh;overflow:auto;position:relative}',
    '.modal h2{margin:6px 2px 8px;font-size:1.12rem}',
    '.modal .closeX{position:absolute;top:8px;right:10px;border:0;background:#232a39;color:#e6e8ee;border:1px solid #2c3446;border-radius:8px;padding:4px 8px;cursor:pointer}',
    '.tabBar{position:sticky;top:0;background:linear-gradient(180deg,#0f1320 70%,#0f132000);z-index:1;display:flex;gap:6px;flex-wrap:wrap;margin:4px 0 8px;padding:6px 0 8px}',
    '.tabBar .tab-btn{background:#172034;border:1px solid #2c3446;color:#e6e8ee;border-radius:999px;padding:5px 9px;cursor:pointer;font-size:.7rem;line-height:1}',
    '.tabBar .tab-btn.active{background:linear-gradient(135deg,#2877a0,#1a4a63);border-color:#2d8ab4}',
    '.settingsTabPane{display:none}',
    '.settingsTabPane.active{display:block}',
    '.settingsGrid{display:grid;grid-template-columns:1fr;gap:8px}',
    '.settingsGrid .card{background:#141a23;border:1px solid #2b3546;border-radius:10px;padding:10px;overflow:visible}',
    '.settingsGrid h3{margin:0 0 6px;font-size:.92rem;letter-spacing:.4px}',
    '.toggleRow{display:flex;align-items:center;gap:10px;justify-content:space-between;margin:4px 0}',
    '.toggleRow input[type="checkbox"]{transform:scale(1.05)}',
    '.toggleRow input[type="number"],.toggleRow input[type="text"],.toggleRow select{background:#10151d;color:#e6e8ee;border:1px solid #2c3446;border-radius:10px;padding:6px 8px;font-size:.7rem;width:100%;box-sizing:border-box}',
    '.row.between{display:flex;align-items:center;justify-content:space-between}',
    '.row{display:flex;align-items:center;gap:8px}',
    '.sep{height:1px;background:#2a3448;margin:6px 0}',
    '.tiny{font-size:.75rem}',
    '.muted{color:#9aa3b2}',
    '.ok{color:#79d19a}',
    '.warn{color:#f2c862}',
    '@media (min-width:740px){ .settingsGrid{grid-template-columns:1fr 1fr} }',
    '.settingsTabPane[data-pane="cast"] .settingsGrid{grid-template-columns:1fr !important}',
    '.cast-wrap{display:flex;flex-direction:column;gap:8px;max-width:100%}',
    '.cast-filters{display:flex;gap:6px;align-items:center}',
    '.pill{padding:4px 8px;border-radius:999px;border:1px solid #2c3446;background:#172034;color:#e6e8ee;cursor:pointer;font-size:.68rem}',
    '.pill.active{background:#1e3653;border-color:#2d8ab4}',
    '.cast-strip{display:flex;gap:8px;overflow:auto;padding:6px 2px;border:1px solid #223049;background:#0e1422;border-radius:10px}',
    '.cast-chip{min-width:56px;display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer}',
    '.chip-ava{position:relative;width:48px;height:48px;border-radius:999px;overflow:hidden;border:1px solid #2b3546;background:#0b0f1a}',
    '.chip-ava img{width:100%;height:100%;object-fit:cover;display:block}',
    '.chip-badges{position:absolute;bottom:-3px;right:-3px;display:flex;gap:2px}',
    '.chip-badge{font-size:.55rem;background:#24304a;border:1px solid #2b3b5c;border-radius:6px;padding:1px 3px;color:#cfe2ff}',
    '.cast-chip .nm{max-width:72px;font-size:.66rem;color:#c9d3e8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.cast-chip.active .chip-ava{outline:2px solid #2d8ab4}',
    '.cast-editor{display:grid;grid-template-columns:160px minmax(340px,1fr);gap:12px;align-items:start;max-width:100%}',
    '.cast-editor>*{min-width:0}',
    '.cast-preview{display:flex;flex-direction:column;gap:6px;align-items:center;min-width:0}',
    '.cast-preview img{width:140px;height:140px;border-radius:8px;border:1px solid #2b3546;object-fit:cover;background:#0b0f1a}',
    '.cast-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;min-width:0}',
    '.cast-form .full{grid-column:1 / -1}',
    '@media (max-width:900px){ .cast-editor{grid-template-columns:1fr} .cast-preview{align-items:flex-start} }',
    '.cast-nav{display:flex;align-items:center;justify-content:space-between;margin-top:6px}',
    '.cast-nav .btn{min-width:88px}',
    '#cascadeDeck{position:absolute;right:12px;top:56px;display:flex;flex-direction:column;gap:6px;pointer-events:none;z-index:20;max-width:min(46%, 520px)}',
    '.miniCard{background:rgba(8,12,25,.9);border:1px solid #33407a;border-radius:10px;padding:7px 9px;color:#e6e8ee;font-size:.66rem;box-shadow:0 10px 24px -12px #000, 0 0 0 1px #1d2742}',
    '.miniCard h4{margin:0 0 3px;font-size:.62rem;letter-spacing:.6px;color:#9fb5ff;text-transform:uppercase}',
    '.miniCard .ln{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.miniCard.pop{animation: miniIn .18s ease-out forwards}',
    '@keyframes miniIn{from{opacity:0;transform:translateY(10px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}'
  ].join('\n');

  // Default configuration
  const DEFAULT_CFG = UI.DEFAULT_CFG = {
    fxCards: true,
    showTopRoster: true,
    colorblindMode: false,
    enableJuryHouse: true,
    doubleChance: 18,
    tripleChance: 7,
    returnChance: 10,
    selfEvictChance: 1,
    enablePublicFav: true,
    tOpening: 90,
    tIntermission: 4,
    tHOH: 40,
    tNoms: 25,
    tVeto: 40,
    tVetoDec: 25,
    tSocial: 25,
    tLiveVote: 30,
    tJury: 35,
    tFinal3Comp1: 35,
    tFinal3Comp2: 35,
    tFinal3Decision: 25,
    tJuryReturn: 30,
    cardHoldMs: 3000,
    cardGapMs: 2000,
    skipCascadeEnabled: true,
    skipTurboWindowMs: 4500,
    skipTurboHoldMs: 450,
    skipTurboGapMs: 100,
    musicOn: true,
    sfxOn: true,
    useRibbon: true
  };

  function injectUiCssOnce(){
    if(document.getElementById(INJECTED_CSS_ID)) return;
    const st = document.createElement('style');
    st.id = INJECTED_CSS_ID;
    st.textContent = UI.INJECTED_CSS;
    document.head.appendChild(st);
  }
  function loadStoredCfg(){
    try{
      const raw = localStorage.getItem(SETTINGS_STORE_KEY);
      if(!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed==='object' ? parsed : {};
    }catch(e){ return {}; }
  }
  function saveStoredCfg(cfg){
    try{ localStorage.setItem(SETTINGS_STORE_KEY, JSON.stringify(cfg||{})); }catch(e){}
  }
  function applyCfgEffects(cfg){
    try{ document.body.classList.toggle('cb', !!cfg.colorblindMode); }catch(e){}
    try{
      if(g.audio?.setMusicEnabled) g.audio.setMusicEnabled(!!cfg.musicOn);
      if(g.audio?.setSfxEnabled) g.audio.setSfxEnabled(!!cfg.sfxOn);
    }catch(e){}
  }
  function ensureGameCfg(){
    const game = g.game = g.game || {};
    game.cfg = Object.assign({}, DEFAULT_CFG, game.cfg || {}, loadStoredCfg());
    applyCfgEffects(game.cfg);
    return game.cfg;
  }

  // Expose config helpers
  UI.ensureCfg = ensureGameCfg;
  UI.applyCfgEffects = applyCfgEffects;
  UI.saveStoredCfg = saveStoredCfg;

  // Utility
  UI.escapeHtml = function(s){
    return String(s).replace(/[&<>"]/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c] || c;
    });
  };

  // Confetti spawner (visual celebration effect) - DISABLED per spec
  UI.spawnConfetti = function(durationMs, particleCount){
    // No-op: confetti removed per finale refactor spec
    return;
    try{
      const cfg = g.game?.cfg || {};
      // Respect FX settings: skip if both fxAnim and fxCards are explicitly disabled
      if(cfg.fxAnim === false && cfg.fxCards === false) return;
      
      const canvas = document.getElementById('confetti');
      if(!canvas) return;
      
      const ctx = canvas.getContext('2d');
      if(!ctx) return;
      
      // Set canvas size to match viewport
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      
      const particles = [];
      const colors = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#a8dadc', '#f1c40f', '#e74c3c', '#3498db', '#9b59b6'];
      const pCount = Math.min(particleCount || 120, 300);
      
      for(let i=0; i<pCount; i++){
        particles.push({
          x: Math.random() * canvas.width,
          y: -20 - Math.random() * 100,
          vx: (Math.random() - 0.5) * 3,
          vy: Math.random() * 3 + 2,
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 10,
          size: Math.random() * 8 + 4,
          color: colors[Math.floor(Math.random() * colors.length)],
          gravity: 0.15
        });
      }
      
      const startTime = Date.now();
      const duration = durationMs || 3000;
      
      function animate(){
        const elapsed = Date.now() - startTime;
        if(elapsed > duration){
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          return;
        }
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        particles.forEach(p => {
          p.vy += p.gravity;
          p.x += p.vx;
          p.y += p.vy;
          p.rotation += p.rotationSpeed;
          
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation * Math.PI / 180);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
          ctx.restore();
        });
        
        requestAnimationFrame(animate);
      }
      
      animate();
    }catch(e){
      console.warn('[UI] spawnConfetti error:', e);
    }
  };

  // Settings button helpers
  function findCandidateSettingsButtons(){
    const uniq = new Set();
    const list = [];
    const sels = [
      '#btnSettings','#settingsBtn','#settings','button[data-action="settings"]',
      'button[data-open="settings"]','.btn-settings','.settingsButton','button[title="Settings"]'
    ];
    sels.forEach(s=> document.querySelectorAll(s).forEach(b=>{ if(!uniq.has(b)){ uniq.add(b); list.push(b);} }));
    document.querySelectorAll('.topbar button, .topbar .btn').forEach(b=>{
      const txt = (b.textContent || '').trim().toLowerCase();
      if(txt.includes('settings')) { if(!uniq.has(b)){ uniq.add(b); list.push(b);} }
    });
    return list;
  }
  function scoreSettingsButton(btn){
    let score = 0;
    const id = btn.id || '';
    const cls = btn.className || '';
    const html = btn.innerHTML || '';
    const txt = (btn.textContent || '').trim().toLowerCase();
    if(/gear|cog|settings/i.test(cls+id)) score += 5;
    if(/svg|icon/i.test(html) && /gear|cog/i.test(html)) score += 5;
    if(/[⚙]/.test(html+txt)) score += 4;
    if(btn.closest('.topbar')) score += 3;
    const ds = btn.dataset || {};
    if(ds.role === 'settings' || ds.action === 'settings' || ds.open === 'settings') score += 3;
    if(txt === 'settings') score += 1;
    return score;
  }
  function wireSingleSettingsButton(){
    const candidates = findCandidateSettingsButtons();
    if(candidates.length === 0){
      const bar = document.querySelector('.topbar');
      if(bar){
        const btn = document.createElement('button');
        btn.id = 'btnSettings';
        btn.className = 'btn';
        btn.textContent = 'Settings';
        btn.addEventListener('click', openSettingsModal);
        bar.prepend(btn);
        return btn;
      }
      return null;
    }
    let keep = candidates[0], keepScore = -1;
    candidates.forEach(b=>{ const s = scoreSettingsButton(b); if(s > keepScore){ keep = b; keepScore = s; } });
    if(!keep.__wired){ keep.__wired = true; keep.addEventListener('click', openSettingsModal); }
    candidates.forEach(b=>{
      if(b !== keep){
        b.setAttribute('data-hidden-dup','1');
        b.style.display = 'none';
        try{ b.replaceWith(b); }catch{}
      }
    });
    return keep;
  }

  // Settings panes builders
  function buildPane(key, innerHTML){
    const pane = document.createElement('div');
    pane.className = 'settingsTabPane';
    pane.setAttribute('data-pane', key);
    pane.innerHTML = innerHTML;
    return pane;
  }
  function group(title, bodyHTML){
    return [
      '<div class="card">',
        '<h3>'+UI.escapeHtml(title)+'</h3>',
        '<div class="sep"></div>',
        bodyHTML,
      '</div>'
    ].join('');
  }
  function checkbox(key, label){
    return [
      '<label class="toggleRow">',
        '<span>'+UI.escapeHtml(label)+'</span>',
        '<input type="checkbox" data-key="'+key+'">',
      '</label>'
    ].join('');
  }
  function number(key, label, min, max, step){
    return [
      '<label class="toggleRow">',
        '<span>'+UI.escapeHtml(label)+'</span>',
        '<input type="number" data-key="'+key+'" min="'+min+'" max="'+max+'" step="'+(step||1)+'" style="width:100px">',
      '</label>'
    ].join('');
  }
  function buildGeneralPaneHTML(){
    return [
      '<div class="settingsGrid">',
        group('Interface', [
          checkbox('fxCards','Card reveal popups (FX cards)'),
          checkbox('showTopRoster','Show top roster above TV'),
          checkbox('enableJuryHouse','Enable Jury House')
        ].join('')),
        group('Quality of life', [
          checkbox('colorblindMode','Colorblind/high-contrast mode')
        ].join('')),
      '</div>'
    ].join('');
  }
  function buildGameplayPaneHTML(){
    return [
      '<div class="settingsGrid">',
        group('Features', [
          checkbox('enablePublicFav','Public\'s favourite player - this is a new module!')
        ].join('')),
        group('Week twists', [
          number('doubleChance','Double eviction chance (%)',0,100,1),
          number('tripleChance','Triple eviction chance (%)',0,100,1),
          number('returnChance','Juror return chance (%)',0,100,1),
          number('selfEvictChance','Self-eviction chance (%)',0,100,0.5)
        ].join('')),
      '</div>'
    ].join('');
  }
  function buildTimingPaneHTML(){
    return [
      '<div class="settingsGrid">',
        group('Phase timers (seconds)', [
          number('tOpening','Season Premiere',5,600,5),
          number('tIntermission','Intermission',1,120,1),
          number('tHOH','HOH Competition',5,600,5),
          number('tNoms','Nominations',5,600,5),
          number('tVeto','Veto Competition',5,600,5),
          number('tVetoDec','Veto Decision',5,600,5),
          number('tSocial','Social Segments',5,600,5),
          number('tLiveVote','Live Vote',5,600,5),
          number('tJury','Jury Segment',5,600,5),
          number('tJuryReturn','Jury Return Twist',5,600,5),
          number('tFinal3Comp1','Final 3 — Part 1',5,600,5),
          number('tFinal3Comp2','Final 3 — Part 2',5,600,5),
          number('tFinal3Decision','Final 3 — Decision',5,600,5)
        ].join('')),
        group('Card FX pacing (milliseconds)', [
          number('cardHoldMs','Min on-screen per card',100,8000,50),
          number('cardGapMs','Gap between cards',0,4000,50)
        ].join('')),
        group('Skip cascade', [
          checkbox('skipCascadeEnabled','Enable skip cascade UI'),
          number('skipTurboWindowMs','Turbo window (ms)',300,10000,50),
          number('skipTurboHoldMs','Turbo per-card hold (ms)',100,2000,25),
          number('skipTurboGapMs','Turbo gap (ms)',0,1000,25)
        ].join('')),
      '</div>'
    ].join('');
  }
  function buildVisualPaneHTML(){
    return [
      '<div class="settingsGrid">',
        group('Badges & effects', [
          checkbox('useRibbon','Use EVICTED ribbon overlay')
        ].join('')),
      '</div>'
    ].join('');
  }
  function buildAudioPaneHTML(){
    return [
      '<div class="settingsGrid">',
        group('Audio', [
          checkbox('musicOn','Music'),
          checkbox('sfxOn','Sound effects')
        ].join('')),
      '</div>'
    ].join('');
  }

  // Cast tab
  function buildCastPaneNode(){
    const pane = document.createElement('div');
    pane.className = 'settingsTabPane';
    pane.setAttribute('data-pane','cast');
    const fallback = FALLBACK_AVATAR;
    pane.innerHTML = `
      <div class="settingsGrid">
        <div class="card">
          <h3>Cast Editor</h3>
          <div class="sep"></div>
          <div class="cast-wrap">
            <div class="cast-filters">
              <span class="pill active" data-filter="all">All</span>
              <span class="pill" data-filter="alive">Alive</span>
              <span class="pill" data-filter="evicted">Evicted</span>
              <span class="tiny muted" style="margin-left:auto" id="castProgress">0/0</span>
            </div>
            <div class="cast-strip" id="castRosterStrip"></div>
            <div class="cast-editor">
              <div class="cast-preview">
                <img id="castPreviewImg" src="${fallback}" alt="preview">
                <input type="file" id="castPhotoFile" accept="image/*" style="width:100%">
                <div class="tiny muted" style="text-align:center">Upload a local image (stored as data URL)</div>
              </div>
              <div class="cast-form">
                <label class="toggleRow"><span>Name</span><input type="text" id="castName"></label>
                <label class="toggleRow"><span>Age</span><input type="number" id="castAge" min="0" max="120" step="1"></label>
                <label class="toggleRow"><span>Sex</span>
                  <select id="castSex">
                    <option value="">—</option>
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                </label>
                <label class="toggleRow full"><span>Occupation</span><input type="text" id="castOcc" placeholder="e.g., Student, Engineer"></label>
                <label class="toggleRow full"><span>Motto</span><input type="text" id="castMotto" placeholder="e.g., Play hard, win harder"></label>
                <label class="toggleRow full"><span>Photo URL</span><input type="text" id="castAvatarUrl" placeholder="https://..."></label>
              </div>
            </div>
            <div class="cast-nav">
              <div class="row">
                <button class="btn" id="castPrev">Prev</button>
                <button class="btn" id="castNext">Next</button>
              </div>
              <div class="row">
                <button class="btn primary" id="castSaveNext">Save & Next</button>
              </div>
            </div>
            <div class="tiny muted">Shortcuts: ←/→ navigate • Enter: Save & Next</div>
          </div>
        </div>
      </div>`;
    return pane;
  }
  function castState(modal){
    modal.__cast = modal.__cast || {
      filter: 'all',
      order: [],
      idx: 0,
      dirty: false,
      pendingAvatarDataUrl: null
    };
    return modal.__cast;
  }
  function playersByFilter(filter){
    const game = g.game || {};
    const arr = (game.players||[]);
    if(filter==='alive') return arr.filter(p=>!p.evicted);
    if(filter==='evicted') return arr.filter(p=>p.evicted);
    return arr.slice();
  }
  function chipBadgesHtml(p, game){
    const badges=[];
    if(p.hoh) badges.push('HOH');
    if(game?.vetoHolder===p.id) badges.push('V');
    if(p.nominated && !p.evicted) badges.push('N');
    if(p.evicted) badges.push('E');
    if(!badges.length) return '';
    return `<div class="chip-badges">${badges.map(b=>`<div class="chip-badge">${b}</div>`).join('')}</div>`;
  }
  function renderCastStrip(modal){
    const state = castState(modal);
    const game = g.game || {};
    const strip = modal.querySelector('#castRosterStrip');
    const list = playersByFilter(state.filter);
    state.order = list.map(p=>p.id);
    if(state.idx >= state.order.length) state.idx = Math.max(0, state.order.length-1);
    strip.innerHTML = '';
    list.forEach((p,i)=>{
      const chip = document.createElement('div');
      chip.className = 'cast-chip'+(i===state.idx?' active':'');
      chip.setAttribute('data-idx', String(i));
      const imgSrc = p.avatar || p.img || p.photo || `https://api.dicebear.com/6.x/bottts/svg?seed=${encodeURIComponent(p.name||'guest')}`;
      chip.innerHTML = `
        <div class="chip-ava">
          <img src="${imgSrc}" alt="${UI.escapeHtml(p.name||'player')}" onerror="this.onerror=null;this.src='https://api.dicebear.com/6.x/bottts/svg?seed='+encodeURIComponent(this.alt||'guest')">
          ${chipBadgesHtml(p,game)}
        </div>
        <div class="nm">${UI.escapeHtml(p.name||'')}</div>
      `;
      chip.addEventListener('click', ()=>{
        if(!maybeConfirmDiscard(modal)) return;
        state.idx = i;
        state.pendingAvatarDataUrl = null;
        state.dirty = false;
        renderCastStrip(modal);
        fillCastForm(modal);
      });
      strip.appendChild(chip);
    });
    const prog = modal.querySelector('#castProgress');
    if(prog) prog.textContent = `${state.order.length ? (state.idx+1) : 0}/${state.order.length}`;
  }
  function currentPlayer(modal){
    const state = castState(modal);
    const game = g.game || {};
    const id = state.order[state.idx];
    return (game.players||[]).find(p=>p.id===id) || null;
  }
  function fillCastForm(modal){
    const p = currentPlayer(modal);
    const preview = modal.querySelector('#castPreviewImg');
    const name = modal.querySelector('#castName');
    const age = modal.querySelector('#castAge');
    const sex = modal.querySelector('#castSex');
    const occ = modal.querySelector('#castOcc');
    const motto = modal.querySelector('#castMotto');
    const url = modal.querySelector('#castAvatarUrl');

    if(preview){
      try{
        preview.onerror = function(){
          this.onerror = null;
          this.src = FALLBACK_AVATAR;
        };
      }catch(e){}
    }

    if(!p){
      if(preview) preview.src = FALLBACK_AVATAR;
      [name,age,sex,occ,motto,url].forEach(el=>{ if(el){ if(el.tagName==='SELECT') el.value=''; else el.value=''; } });
      return;
    }
    const meta = p.meta || {};
    name.value = p.name || '';
    age.value = (meta.age!=null)? String(meta.age) : '';
    sex.value = meta.sex || '';
    occ.value = meta.occupation || '';
    motto.value = meta.motto || '';
    url.value = p.avatar || '';

    const imgSrc = p.avatar || p.img || p.photo || `https://api.dicebear.com/6.x/bottts/svg?seed=${encodeURIComponent(p.name||'guest')}`;
    if(preview) preview.src = imgSrc;

    castState(modal).dirty = false;
    castState(modal).pendingAvatarDataUrl = null;
  }
  function markDirty(modal){ castState(modal).dirty = true; }
  function maybeConfirmDiscard(modal){
    const st = castState(modal);
    if(!st.dirty) return true;
    return confirm('You have unsaved changes. Discard them?');
  }
  function wireCastEditor(modal){
    const state = castState(modal);
    modal.querySelectorAll('.cast-filters .pill').forEach(pill=>{
      pill.addEventListener('click', ()=>{
        if(!maybeConfirmDiscard(modal)) return;
        modal.querySelectorAll('.cast-filters .pill').forEach(x=>x.classList.remove('active'));
        pill.classList.add('active');
        state.filter = pill.getAttribute('data-filter') || 'all';
        state.idx = 0;
        state.pendingAvatarDataUrl = null;
        state.dirty = false;
        renderCastStrip(modal);
        fillCastForm(modal);
      });
    });
    ['#castName','#castAge','#castSex','#castOcc','#castMotto','#castAvatarUrl'].forEach(sel=>{
      const el = modal.querySelector(sel);
      if(!el) return;
      el.addEventListener('input', ()=>{
        markDirty(modal);
        if(sel==='#castAvatarUrl'){
          const prev = modal.querySelector('#castPreviewImg');
          const v = el.value.trim();
          if(prev) prev.src = v || FALLBACK_AVATAR;
        }
      });
      if(el.tagName==='SELECT'){
        el.addEventListener('change', ()=>markDirty(modal));
      }
    });
    const file = modal.querySelector('#castPhotoFile');
    if(file){
      file.addEventListener('change', ()=>{
        const f = file.files && file.files[0];
        if(!f) return;
        const fr = new FileReader();
        fr.onload=()=>{
          castState(modal).pendingAvatarDataUrl = String(fr.result||'');
          const prev = modal.querySelector('#castPreviewImg');
          if(prev) prev.src = castState(modal).pendingAvatarDataUrl || FALLBACK_AVATAR;
          markDirty(modal);
        };
        fr.readAsDataURL(f);
      });
    }
    const prev = modal.querySelector('#castPrev');
    const next = modal.querySelector('#castNext');
    const saveNext = modal.querySelector('#castSaveNext');

    prev.addEventListener('click', ()=>{
      if(!maybeConfirmDiscard(modal)) return;
      const st = castState(modal);
      st.idx = Math.max(0, st.idx-1);
      st.pendingAvatarDataUrl = null; st.dirty=false;
      renderCastStrip(modal); fillCastForm(modal);
    });
    next.addEventListener('click', ()=>{
      if(!maybeConfirmDiscard(modal)) return;
      const st = castState(modal);
      st.idx = Math.min(st.order.length-1, st.idx+1);
      st.pendingAvatarDataUrl = null; st.dirty=false;
      renderCastStrip(modal); fillCastForm(modal);
    });
    saveNext.addEventListener('click', ()=>{
      if(saveCurrentCastForm(modal)){
        const st=castState(modal);
        st.idx = Math.min(st.order.length-1, st.idx+1);
        renderCastStrip(modal); fillCastForm(modal);
      }
    });
    modal.addEventListener('keydown', (e)=>{
      const mac = navigator.platform.toUpperCase().includes('MAC');
      const modKey = mac ? e.metaKey : e.ctrlKey;
      if(e.key==='Enter'){ e.preventDefault(); if(saveCurrentCastForm(modal)){ const st=castState(modal); st.idx=Math.min(st.order.length-1, st.idx+1); renderCastStrip(modal); fillCastForm(modal);} }
      else if(e.key==='ArrowLeft'){ e.preventDefault(); const st=castState(modal); if(!maybeConfirmDiscard(modal)) return; st.idx=Math.max(0, st.idx-1); st.dirty=false; st.pendingAvatarDataUrl=null; renderCastStrip(modal); fillCastForm(modal); }
      else if(e.key==='ArrowRight'){ e.preventDefault(); const st=castState(modal); if(!maybeConfirmDiscard(modal)) return; st.idx=Math.min(st.order.length-1, st.idx+1); st.dirty=false; st.pendingAvatarDataUrl=null; renderCastStrip(modal); fillCastForm(modal); }
    }, {capture:true});
  }
  function saveCurrentCastForm(modal){
    const p = currentPlayer(modal);
    if(!p) return false;
    const name = modal.querySelector('#castName').value.trim();
    const ageVal = modal.querySelector('#castAge').value.trim();
    const sex = modal.querySelector('#castSex').value;
    const occ = modal.querySelector('#castOcc').value.trim();
    const motto = modal.querySelector('#castMotto').value.trim();
    const url = modal.querySelector('#castAvatarUrl').value.trim();
    const upDataUrl = castState(modal).pendingAvatarDataUrl;

    if(!name){ alert('Name is required.'); return false; }

    p.name = name;
    p.meta = p.meta || {};
    const age = parseInt(ageVal,10);
    if(!Number.isNaN(age)) p.meta.age = age; else delete p.meta.age;
    p.meta.sex = sex || '';
    if(occ) p.meta.occupation = occ; else delete p.meta.occupation;
    if(motto) p.meta.motto = motto; else delete p.meta.motto;

    if(upDataUrl){ p.avatar = upDataUrl; p.img = upDataUrl; p.photo = upDataUrl; }
    else if(url){ p.avatar = url; p.img = url; p.photo = url; }

    try{ g.updateHud?.(); }catch(e){}
    try{ g.saveGame?.(); }catch(e){}
    castState(modal).dirty = false;
    castState(modal).pendingAvatarDataUrl = null;

    renderCastStrip(modal);
    return true;
  }

  // Advanced pane
  function buildAdvancedPaneHTML(){
    return [
      '<div class="settingsGrid">',
        group('Quick Actions', [
          '<div class="row" style="gap:8px;flex-wrap:wrap;align-items:center">',
            '<label class="toggleRow"><span>Self-evict player</span><select id="qaSelfEvictSelect" style="width:220px"></select></label>',
            '<button class="btn danger" data-action="self-evict">Self-evict</button>',
          '</div>',
          '<div class="tiny muted" style="margin-top:2px">Immediately removes the selected houseguest from the game as a self-eviction.</div>'
        ].join('')),
        group('Data', [
          '<div class="row" style="gap:8px;flex-wrap:wrap">',
            '<button class="btn" data-action="export">Export settings JSON</button>',
            '<button class="btn" data-action="import">Import settings JSON</button>',
          '</div>',
          '<div class="tiny muted">Import affects settings only, not game state.</div>'
        ].join('')),
        group('Danger zone', [
          '<div class="row" style="gap:8px;flex-wrap:wrap">',
            '<button class="btn warn" data-action="reset-defaults">Reset to defaults</button>',
            '<button class="btn danger" data-action="clear-storage">Clear saved settings</button>',
          '</div>'
        ].join('')),
      '</div>'
    ].join('');
  }

  // Debug pane
  function buildDebugPaneHTML(){
    return [
      '<div class="settingsGrid">',
        group('Music / Audio', [
          '<div class="row" style="gap:8px;flex-wrap:wrap;margin-bottom:6px">',
            '<select id="musicTrack" style="flex:1;min-width:180px">',
              '<option value="none">No track</option>',
              '<option value="theme_opening">Opening Theme</option>',
              '<option value="hoh_comp">HOH Comp</option>',
              '<option value="veto_comp">Veto Comp</option>',
              '<option value="nominations">Nominations</option>',
              '<option value="live_vote">Live Vote</option>',
              '<option value="eviction">Eviction</option>',
              '<option value="victory">Victory Theme</option>',
            '</select>',
            '<button class="btn small" id="btnPlayMusic">Play</button>',
            '<button class="btn small" id="btnStopMusic">Stop</button>',
          '</div>',
          '<label class="toggleRow"><span>Volume</span><input type="range" id="musicVol" min="0" max="1" step="0.01" value="0.4" style="flex:1"/></label>',
          '<label class="toggleRow"><input type="checkbox" id="autoMusic" checked/><span>Auto music</span></label>',
        ].join('')),
        group('Quick Actions', [
          '<div class="row" style="gap:8px;flex-wrap:wrap">',
            '<button class="btn small" id="btnNextWeek">Force Week ▶</button>',
            '<button class="btn small" id="btnClearLog">Clear Log</button>',
            '<button class="btn small" id="btnDebugExport">Export Save</button>',
            '<button class="btn small" id="btnDebugImport">Import</button>',
          '</div>',
          '<input id="debugImportFile" type="file" accept="application/json" style="display:none"/>',
        ].join('')),
        group('Advanced Debug', [
          '<div class="row" style="gap:8px;flex-wrap:wrap">',
            '<button class="btn small" id="btnDumpSocial">Dump Social</button>',
            '<button class="btn small" id="btnForceReturnTwist">Force Return Twist</button>',
            '<button class="btn small" id="btnSkipPhaseDbg">Skip Phase</button>',
          '</div>',
        ].join('')),
      '</div>'
    ].join('');
  }

  // Settings modal lifecycle
  function ensureSettingsModal(){
    let dim = document.getElementById('settingsBackdrop');
    if(dim) return dim;

    injectUiCssOnce();

    dim = document.createElement('div');
    dim.id = 'settingsBackdrop';
    dim.className = 'modal-backdrop';

    const modal = document.createElement('div');
    modal.className = 'modal';

    const closeX = document.createElement('button');
    closeX.className = 'closeX';
    closeX.textContent = '×';

    const h = document.createElement('h2');
    h.textContent = 'Settings';

    const tabBar = document.createElement('div');
    tabBar.className = 'tabBar';
    tabBar.id = 'settingsTabs';
    tabBar.innerHTML = [
      '<button class="tab-btn active" data-tab="general">General</button>',
      '<button class="tab-btn" data-tab="cast">Cast</button>',
      '<button class="tab-btn" data-tab="gameplay">Gameplay</button>',
      '<button class="tab-btn" data-tab="timing">Timing</button>',
      '<button class="tab-btn" data-tab="visual">Visual</button>',
      '<button class="tab-btn" data-tab="audio">Audio</button>',
      '<button class="tab-btn" data-tab="advanced">Advanced</button>',
      '<button class="tab-btn" data-tab="debug">Debug</button>'
    ].join('');

    const panes = document.createElement('div');
    panes.id = 'settingsPanes';
    panes.appendChild(buildPane('general', buildGeneralPaneHTML()));
    panes.appendChild(buildCastPaneNode());
    panes.appendChild(buildPane('gameplay', buildGameplayPaneHTML()));
    panes.appendChild(buildPane('timing', buildTimingPaneHTML()));
    panes.appendChild(buildPane('visual', buildVisualPaneHTML()));
    panes.appendChild(buildPane('audio', buildAudioPaneHTML()));
    panes.appendChild(buildPane('advanced', buildAdvancedPaneHTML()));
    panes.appendChild(buildPane('debug', buildDebugPaneHTML()));

    const actions = document.createElement('div');
    actions.className = 'row between';
    actions.style.marginTop = '8px';
    const left = document.createElement('div'); left.className='row';
    const right = document.createElement('div'); right.className='row';

    const btnApply = document.createElement('button'); btnApply.className='btn primary'; btnApply.textContent='Apply';
    const btnSaveClose = document.createElement('button'); btnSaveClose.className='btn'; btnSaveClose.textContent='Save & Close';
    const btnCancel = document.createElement('button'); btnCancel.className='btn danger'; btnCancel.textContent='Cancel';
    left.appendChild(btnApply);
    right.appendChild(btnCancel);
    right.appendChild(btnSaveClose);

    actions.appendChild(left);
    actions.appendChild(right);

    modal.appendChild(closeX);
    modal.appendChild(h);
    modal.appendChild(tabBar);
    modal.appendChild(panes);
    modal.appendChild(actions);
    dim.appendChild(modal);
    document.body.appendChild(dim);

    // Tabs with dirty-state guard for Cast
    tabBar.addEventListener('click', (e)=>{
      const btn = e.target.closest('.tab-btn'); if(!btn) return;
      const to = btn.getAttribute('data-tab');
      const fromPane = panes.querySelector('.settingsTabPane.active');
      if(fromPane && fromPane.getAttribute('data-pane')==='cast'){
        if(!maybeConfirmDiscard(modal)) return;
      }
      tabBar.querySelectorAll('.tab-btn').forEach(b=>b.classList.toggle('active', b===btn));
      panes.querySelectorAll('.settingsTabPane').forEach(p=>p.classList.toggle('active', p.getAttribute('data-pane')===to));
      if(to==='cast'){ initCastTab(modal); }
    });
    panes.querySelector('.settingsTabPane[data-pane="general"]').classList.add('active');

    // Close with cast dirty guard
    function guardedClose(){
      const active = panes.querySelector('.settingsTabPane.active');
      if(active && active.getAttribute('data-pane')==='cast'){
        if(!maybeConfirmDiscard(modal)) return;
      }
      closeSettingsModal();
    }
    closeX.addEventListener('click', guardedClose);
    btnCancel.addEventListener('click', guardedClose);

    // Apply + Save
    btnApply.addEventListener('click', ()=>{
      applySettingsFromModal(modal);
      if(panes.querySelector('.settingsTabPane.active')?.getAttribute('data-pane')==='cast'){
        saveCurrentCastForm(modal);
      }
      notify('Settings applied', 'ok');
    });
    btnSaveClose.addEventListener('click', ()=>{
      applySettingsFromModal(modal);
      if(panes.querySelector('.settingsTabPane.active')?.getAttribute('data-pane')==='cast'){
        saveCurrentCastForm(modal);
      }
      closeSettingsModal();
      notify('Settings saved', 'ok');
    });

    // Advanced actions
    modal.addEventListener('click', (e)=>{
      const b = e.target.closest('button[data-action]'); if(!b) return;
      const act = b.getAttribute('data-action');
      if(act==='reset-defaults'){
        if(!confirm('Reset all settings to defaults?')) return;
        const game=g.game||{}; game.cfg = Object.assign({}, DEFAULT_CFG);
        saveStoredCfg(game.cfg);
        fillSettingsModalValues(modal, game.cfg);
        initCastTab(modal);
        applyCfgEffects(game.cfg);
        notify('Settings reset', 'warn');
      } else if(act==='clear-storage'){
        if(!confirm('Clear saved settings from localStorage?')) return;
        localStorage.removeItem(SETTINGS_STORE_KEY);
        notify('Saved settings cleared', 'warn');
      } else if(act==='export'){
        try{
          const data = JSON.stringify(g.game?.cfg||{}, null, 2);
          const blob = new Blob([data], {type:'application/json'});
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'bb-settings.json';
          a.click();
          URL.revokeObjectURL(a.href);
        }catch(err){ alert('Export failed: '+err); }
      } else if(act==='import'){
        const inp=document.createElement('input'); inp.type='file'; inp.accept='application/json';
        inp.onchange=()=>{
          const f = inp.files && inp.files[0]; if(!f) return;
          const fr=new FileReader();
          fr.onload=()=>{
            try{
              const obj=JSON.parse(fr.result);
              const game=g.game||{}; game.cfg = Object.assign({}, DEFAULT_CFG, game.cfg||{}, obj||{});
              saveStoredCfg(game.cfg);
              fillSettingsModalValues(modal, game.cfg);
              applyCfgEffects(game.cfg);
              notify('Settings imported', 'ok');
            }catch(err){ alert('Import failed: '+err); }
          };
          fr.readAsText(f);
        };
        inp.click();
      } else if(act==='self-evict'){
        const sel = modal.querySelector('#qaSelfEvictSelect');
        const id = sel ? +sel.value : NaN;
        if(!id || Number.isNaN(id)) { alert('Pick a player to self-evict.'); return; }
        const name = g.safeName?.(id) || ('#'+id);
        if(!confirm(`Confirm self-eviction for ${name}? This cannot be undone.`)) return;
        try{ g.handleSelfEviction?.(id,'self'); }catch(err){ alert('Self-evict failed: '+err); }
        try{ g.updateHud?.(); }catch(e){}
        closeSettingsModal();
      }
    });

    // Debug controls
    modal.addEventListener('click', (e)=>{
      const btn = e.target;
      if(btn.id === 'btnPlayMusic'){
        const track = modal.querySelector('#musicTrack')?.value;
        if(!track || track === 'none'){ notify('Select a track first', 'warn'); return; }
        const vol = parseFloat(modal.querySelector('#musicVol')?.value || 0.4);
        try{
          if(typeof g.playMusic === 'function') g.playMusic(track, vol);
          else if(typeof g.phaseMusic === 'function') g.phaseMusic(track);
          else notify('Music system not available', 'warn');
        }catch(err){ notify('Play failed: '+err, 'warn'); }
      } else if(btn.id === 'btnStopMusic'){
        try{
          if(typeof g.stopMusic === 'function') g.stopMusic();
          else if(g.bgm) g.bgm.pause();
          else {
            const bgm = document.getElementById('bgm');
            if(bgm) bgm.pause();
          }
        }catch(e){}
      } else if(btn.id === 'btnNextWeek'){
        try{
          const game = g.game;
          if(!game){ notify('Game not started', 'warn'); return; }
          game.week = (game.week || 1) + 1;
          notify('Week advanced to '+ game.week, 'ok');
        }catch(err){ notify('Failed: '+err, 'warn'); }
      } else if(btn.id === 'btnClearLog'){
        try{
          const log = document.getElementById('log');
          if(log) log.innerHTML = '';
          notify('Log cleared', 'ok');
        }catch(e){}
      } else if(btn.id === 'btnDebugExport'){
        try{
          const data = JSON.stringify(g.game || {}, null, 2);
          const blob = new Blob([data], {type:'application/json'});
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'bb-save.json';
          a.click();
          URL.revokeObjectURL(a.href);
          notify('Save exported', 'ok');
        }catch(err){ notify('Export failed: '+err, 'warn'); }
      } else if(btn.id === 'btnDebugImport'){
        modal.querySelector('#debugImportFile')?.click();
      } else if(btn.id === 'btnDumpSocial'){
        try{
          if(typeof g.dumpSocialState === 'function') g.dumpSocialState();
          else {
            console.log('Social state:', g.game?.social || 'N/A');
            notify('Social dumped to console', 'ok');
          }
        }catch(err){ notify('Failed: '+err, 'warn'); }
      } else if(btn.id === 'btnForceReturnTwist'){
        try{
          if(typeof g.startReturnTwist === 'function'){
            g.startReturnTwist();
            notify('Return twist triggered', 'ok');
          } else notify('Return twist system not available', 'warn');
        }catch(err){ notify('Failed: '+err, 'warn'); }
      } else if(btn.id === 'btnSkipPhaseDbg'){
        try{
          if(typeof g.skipPhase === 'function'){
            g.skipPhase();
            notify('Phase skipped', 'ok');
          } else notify('Skip phase not available', 'warn');
        }catch(err){ notify('Failed: '+err, 'warn'); }
      }
    });

    // Debug import file handler
    const debugImportFile = modal.querySelector('#debugImportFile');
    if(debugImportFile){
      debugImportFile.addEventListener('change', ()=>{
        const file = debugImportFile.files && debugImportFile.files[0];
        if(!file) return;
        const fr = new FileReader();
        fr.onload = ()=>{
          try{
            const obj = JSON.parse(fr.result);
            g.game = obj;
            notify('Save imported', 'ok');
            if(typeof g.updateHud === 'function') g.updateHud();
          }catch(err){ notify('Import failed: '+err, 'warn'); }
        };
        fr.readAsText(file);
      });
    }


    return dim;
  }
  function fillSettingsModalValues(modal, cfg){
    modal.querySelectorAll('[data-key]').forEach(inp=>{
      const k = inp.getAttribute('data-key');
      if(inp.type==='checkbox') inp.checked = !!cfg[k];
      else inp.value = (cfg[k] != null ? cfg[k] : '');
    });
    const sel = modal.querySelector('#qaSelfEvictSelect');
    if(sel){
      sel.innerHTML = '';
      try{
        const alive = g.alivePlayers?.() || [];
        alive.forEach(p=>{
          const o=document.createElement('option'); o.value=p.id; o.textContent=p.name; sel.appendChild(o);
        });
      }catch(e){}
    }
  }
  function initCastTab(modal){
    renderCastStrip(modal);
    fillCastForm(modal);
    if(!modal.__castWired){ wireCastEditor(modal); modal.__castWired = true; }
  }
  function openSettingsModal(){
    ensureGameCfg();
    const dim = ensureSettingsModal();
    const modal = dim.querySelector('.modal');
    fillSettingsModalValues(modal, g.game.cfg);
    const activePane = modal.querySelector('.settingsTabPane.active');
    if(activePane && activePane.getAttribute('data-pane')==='cast'){ initCastTab(modal); }
    dim.style.display = 'flex';
    setTimeout(()=>{
      const target = modal.querySelector('.settingsTabPane.active #castName') || modal.querySelector('.settingsTabPane.active input, .settingsTabPane.active select');
      if(target) try{ target.focus(); }catch(e){}
    }, 20);
  }
  function closeSettingsModal(){
    const dim = document.getElementById('settingsBackdrop');
    if(dim) dim.style.display = 'none';
  }
  function applySettingsFromModal(modal){
    const game=g.game = g.game || {};
    const cfg = game.cfg = Object.assign({}, DEFAULT_CFG, game.cfg||{});
    modal.querySelectorAll('[data-key]').forEach(inp=>{
      const k = inp.getAttribute('data-key');
      if(inp.type==='checkbox') cfg[k] = !!inp.checked;
      else {
        const v = parseFloat(inp.value);
        if(!Number.isNaN(v)) cfg[k] = v;
      }
    });
    saveStoredCfg(cfg);
    applyCfgEffects(cfg);
    g.updateHud?.();
  }
  function notify(msg, cls){ try{ g.addLog?.(msg, cls||''); }catch(e){} }

  // Public UI init
  UI.openSettingsModal = openSettingsModal;
  UI.initSettingsUI = function(){
    injectUiCssOnce();
    ensureGameCfg();
    wireSingleSettingsButton();
  };

  // Optional global for convenience
  g.openSettingsModal = openSettingsModal;

})(window);