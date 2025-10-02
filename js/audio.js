// MODULE: audio.js
// Background music + lightweight SFX stub (playSfx).
// - Music: YouTube embed (loop) OR direct audio if non-YouTube URL.
// - SFX: tiny inline base64 WAV/OGG clips, gated by cfg.fxSound (and music by cfg.autoMusic).
// - Exposes setMusic, phaseMusic, playSfx, setMusicEnabled/setSfxEnabled for future UI toggles.

(function(global){
  const YT_API_SRC='https://www.youtube.com/iframe_api';
  const bgmEl=document.getElementById('bgm');

  /* ---------- Track Map (YouTube links) ---------- */
  const musicTracks={
    theme_opening:'https://www.youtube.com/watch?v=58UXX7yUicI&list=RD58UXX7yUicI&start_radio=1',
    hoh_comp:'https://www.youtube.com/watch?v=NTXJpYysvNQ',
    veto_comp:'https://www.youtube.com/watch?v=u7Mzm_JExw8&start_radio=1',
    nominations:'https://www.youtube.com/watch?v=fa1FTbzgRlA&start_radio=1',
    live_vote:'https://www.youtube.com/watch?v=pRyJL8AIHFg',
    eviction:'https://www.youtube.com/watch?v=1uIe1PpaUdA',
    victory:'https://www.youtube.com/watch?v=qKaIFa_GL_I'
  };

  /* ---------- Simple SFX (small inline clips) ---------- */
  // Short synthesized tones (very small); replace with real assets later if desired.
  const sfxData={
    // 220 Hz blip (twist)
    twist:'data:audio/wav;base64,UklGRlYAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAADwAAAA8AAAAPAAAADwAAAA8AAAAPAAAADwAAAA8AAAAPAAAADwAAAA8AAAAPAAAADwAAAA8AAAAPAAAADwAAAA8AAAAPAAAA',
    // short softer blip (card)
    card:'data:audio/wav;base64,UklGRlYAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAABwAAAAcAAAAHAAAABwAAAAcAAAAHAAAABwAAAAcAAAA'
  };
  const sfxCache=new Map();

  function loadSfx(key){
    if(sfxCache.has(key)) return sfxCache.get(key);
    const url=sfxData[key]; if(!url) return null;
    const audio=new Audio(url);
    audio.preload='auto';
    sfxCache.set(key,audio);
    return audio;
  }

  function playSfx(key){
    const g=global.game||{};
    if(g.cfg && g.cfg.fxSound===false) return;
    try{
      const a=loadSfx(key);
      if(!a) return;
      a.currentTime=0;
      a.volume=0.85;
      a.play().catch(()=>{ /* ignored */ });
    }catch(e){}
  }

  /* ---------- YouTube API Helpers ---------- */
  let ytReady=false, ytPlayer=null;
  function isYouTube(u){ return /youtu\.?be/.test(u||''); }
  function parseVideoId(u){
    try{
      const url=new URL(u);
      if(url.hostname.includes('youtu.be')) return url.pathname.replace('/','').split('?')[0];
      if(url.searchParams.get('v')) return url.searchParams.get('v');
      const m=url.pathname.match(/\/embed\/([^\/\?]+)/); if(m) return m[1];
    }catch{}
    return null;
  }
  function ensureYTApi(cb){
    if(ytReady){ cb&&cb(); return; }
    if(document.querySelector('script[src*="iframe_api"]')){
      const prev=window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady=function(){
        ytReady=true; prev&&prev(); cb&&cb();
      };
      return;
    }
    const s=document.createElement('script'); s.src=YT_API_SRC; s.async=true;
    window.onYouTubeIframeAPIReady=function(){ ytReady=true; cb&&cb(); };
    document.head.appendChild(s);
  }
  function ensureYTIframe(videoId,onReady){
    let host=document.getElementById('ytbgm');
    if(!host){
      host=document.createElement('div');
      host.id='ytbgm';
      host.style.cssText='position:fixed;left:-9999px;bottom:-9999px;width:0;height:0;overflow:hidden;';
      document.body.appendChild(host);
    }
    if(ytPlayer){ onReady&&onReady(ytPlayer); return; }
    ytPlayer=new YT.Player('ytbgm',{
      videoId,
      playerVars:{autoplay:1,controls:0,disablekb:1,modestbranding:1,rel:0,iv_load_policy:3,loop:1,playlist:videoId},
      events:{
        onReady:()=>{ onReady&&onReady(ytPlayer); },
        onError:(e)=>console.warn('[music] YT error',e)
      }
    });
  }

  /* ---------- Core Music Controls ---------- */
  function stopAll(){
    try{ bgmEl.pause(); bgmEl.removeAttribute('src'); }catch{}
    try{ ytPlayer && ytPlayer.stopVideo && ytPlayer.stopVideo(); }catch{}
  }
  function setVolume(vol){
    try{ if(bgmEl) bgmEl.volume=vol; }catch{}
    try{ ytPlayer && ytPlayer.setVolume && ytPlayer.setVolume(Math.round(vol*100)); }catch{}
  }

  function setMusic(key,force=false){
    const g=global.game||{};
    if(!force && g.cfg && g.cfg.autoMusic===false) return;
    const url=musicTracks[key];
    if(!url){ stopAll(); return; }

    const volEl=document.getElementById('musicVol');
    const vol=volEl ? (+volEl.value||0.4) : 0.4;
    stopAll();
    if(isYouTube(url)){
      const vid=parseVideoId(url);
      if(!vid){ console.warn('[music] cannot parse YT id',url); return; }
      ensureYTApi(()=>ensureYTIframe(vid,(player)=>{
        try{
          player.loadVideoById({videoId:vid,suggestedQuality:'small'});
          setVolume(vol);
        }catch(e){}
      }));
    } else {
      bgmEl.src=url; bgmEl.loop=true; setVolume(vol);
      bgmEl.play().catch(()=>{ /* gesture needed; UI play button exists */ });
    }
  }

  function phaseMusic(ph){
    const map={
      opening:'theme_opening',
      hoh:'hoh_comp',
      final3_comp1:'hoh_comp',
      final3_comp2:'hoh_comp',
      veto_comp:'veto_comp',
      nominations:'nominations',
      replace_nom:'nominations',
      livevote:'live_vote',
      tiebreak:'live_vote',
      jury:'live_vote',
      return_twist:'live_vote',
      finale:'victory',
      intermission:'nominations'
    };
    const k=map[ph];
    if(k) setMusic(k);
  }

  /* ---------- Public API & Toggles ---------- */
  function setMusicEnabled(on){
    const g=global.game||{};
    if(!g.cfg) g.cfg={};
    g.cfg.autoMusic=!!on;
    if(!on) stopAll();
    else phaseMusic(g.game?.phase);
  }
  function setSfxEnabled(on){
    const g=global.game||{};
    if(!g.cfg) g.cfg={};
    g.cfg.fxSound=!!on;
  }

  global.setMusic=setMusic;
  global.phaseMusic=phaseMusic;
  global.playSfx=playSfx;
  global.setMusicEnabled=setMusicEnabled;
  global.setSfxEnabled=setSfxEnabled;

  document.getElementById('musicVol')?.addEventListener('input',e=>{
    setVolume(+e.target.value||0.4);
  });

})(window);