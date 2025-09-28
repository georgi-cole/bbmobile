// UI: Visual tab control to upload an image/video to the faux TV screen.
(function(g){
  'use strict';

  const LS_TYPE = 'bb_tv_media_type';   // 'image' | 'video'
  const LS_DATA = 'bb_tv_media_data';   // data URL

  function tv(){ return document.getElementById('tv'); }

  function ensureVideoEl(){
    let v = document.getElementById('tvBgVideo');
    if (!v) {
      v = document.createElement('video');
      v.id = 'tvBgVideo';
      v.muted = true;
      v.loop = true;
      v.autoplay = true;
      v.playsInline = true;
      v.setAttribute('playsinline','');
      v.setAttribute('webkit-playsinline','');
      const host = tv();
      if (host) host.appendChild(v);
    }
    return v;
  }

  function setTvImage(src){
    const host = tv(); if(!host) return;
    host.style.setProperty('--tv-bg', `url("${src}")`);
    host.classList.add('hasTvBg');
    host.classList.remove('hasTvVideo');
    const v = document.getElementById('tvBgVideo');
    if(v){ try{ v.pause(); }catch{} v.removeAttribute('src'); v.load(); v.remove(); }
  }

  function setTvVideo(src){
    const host = tv(); if(!host) return;
    host.classList.add('hasTvVideo');
    host.classList.remove('hasTvBg');
    host.style.removeProperty('--tv-bg');
    const v = ensureVideoEl();
    try{ v.pause(); }catch{}
    v.src = src;
    v.currentTime = 0;
    v.play().catch(()=>{});
  }

  function clearTvMedia(){
    const host = tv(); if(!host) return;
    host.classList.remove('hasTvBg','hasTvVideo');
    host.style.removeProperty('--tv-bg');
    const v = document.getElementById('tvBgVideo');
    if(v){ try{ v.pause(); }catch{} v.removeAttribute('src'); v.load(); v.remove(); }
    try{
      localStorage.removeItem(LS_TYPE);
      localStorage.removeItem(LS_DATA);
    }catch{}
  }

  function restoreTvMedia(){
    try{
      const t = localStorage.getItem(LS_TYPE);
      const d = localStorage.getItem(LS_DATA);
      if(t==='image' && d){ setTvImage(d); }
      else if(t==='video' && d){ setTvVideo(d); }
    }catch{}
  }

  function injectControlsIntoVisualPane(modal){
    const grid = modal.querySelector('.settingsTabPane[data-pane="visual"] .settingsGrid');
    if(!grid) return;
    if(grid.querySelector('#tvMediaGroup')) return;

    const card = document.createElement('div');
    card.className = 'card';
    card.id = 'tvMediaGroup';
    card.innerHTML = `
      <h3>TV Screen</h3>
      <div class="sep"></div>
      <div class="toggleRow">
        <span>Upload image/video</span>
        <input type="file" id="tvMediaUpload" accept="image/*,video/*">
      </div>
      <div class="toggleRow">
        <span class="tiny muted">Images persist; videos up to ~3.5 MB persist. Larger videos play but won’t persist after reload.</span>
        <button class="btn" id="tvMediaClear">Remove</button>
      </div>
    `;
    grid.appendChild(card);

    wireControls(modal);
  }

  function wireControls(modal){
    const up = modal.querySelector('#tvMediaUpload');
    const clr = modal.querySelector('#tvMediaClear');

    if(up && !up.__wired){
      up.__wired = true;
      up.addEventListener('change', ()=>{
        const f = up.files && up.files[0]; if(!f) return;
        if(f.type.startsWith('image/')){
          const fr = new FileReader();
          fr.onload = ()=>{
            const data = String(fr.result||'');
            try{ localStorage.setItem(LS_TYPE,'image'); localStorage.setItem(LS_DATA,data); }catch{}
            setTvImage(data); g.addLog?.('TV image set.','ok');
          };
          fr.readAsDataURL(f);
        } else if(f.type.startsWith('video/')){
          if(f.size <= 3_500_000){
            const fr = new FileReader();
            fr.onload = ()=>{
              const data = String(fr.result||'');
              try{ localStorage.setItem(LS_TYPE,'video'); localStorage.setItem(LS_DATA,data); }catch{}
              setTvVideo(data); g.addLog?.('TV video set.','ok');
            };
            fr.readAsDataURL(f);
          } else {
            const url = URL.createObjectURL(f);
            try{ localStorage.setItem(LS_TYPE,'video'); localStorage.removeItem(LS_DATA); }catch{}
            setTvVideo(url);
            g.addLog?.('Large video will play but will not persist after reload.','warn');
          }
        } else {
          alert('Please select an image or video file.');
        }
      });
    }
    if(clr && !clr.__wired){
      clr.__wired = true;
      clr.addEventListener('click', ()=>{
        clearTvMedia(); g.addLog?.('TV media cleared.','warn');
      });
    }
  }

  function hookSettingsOpen(){
    const open = ()=>{
      const dim = document.getElementById('settingsBackdrop');
      const modal = dim && dim.querySelector('.modal');
      if(modal) injectControlsIntoVisualPane(modal);
    };
    ['btnSettings','btnOpenSettings'].forEach(id=>{
      const b=document.getElementById(id);
      if(b && !b.__tvhook){
        b.__tvhook = true;
        b.addEventListener('click', ()=> setTimeout(open, 50));
      }
    });
    const dim = document.getElementById('settingsBackdrop');
    if(dim && !dim.__tvObs){
      dim.__tvObs = true;
      const mo = new MutationObserver(()=> open());
      mo.observe(dim,{childList:true,subtree:true});
    }
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    restoreTvMedia();
    hookSettingsOpen();
  });

  g.setTvScreenImage = setTvImage;
  g.setTvScreenVideo = setTvVideo;
  g.clearTvScreenMedia = clearTvMedia;

})(window);