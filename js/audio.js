// audio.js
// Background music and SFX with reliable YouTube playback.
// - Uses youtube-nocookie host for embeds.
// - Autoplays on ready (subject to user gesture policy).
// - Adds a one-time click unlock so auto music works after any initial click.
// - Falls back to <audio id="bgm"> for non-YouTube URLs.
// - Exposes stopMusic() for explicit stopping (used after victory fanfare).

(function(global){
  const YT_API_SRC='https://www.youtube.com/iframe_api';
  const bgmEl=document.getElementById('bgm');

  // Map of music keys to URLs (YouTube or direct audio)
  const musicTracks={
    theme_opening:'https://www.youtube.com/watch?v=58UXX7yUicI&list=RD58UXX7yUicI&start_radio=1',
    hoh_comp:'https://www.youtube.com/watch?v=NTXJpYysvNQ',
    veto_comp:'https://www.youtube.com/watch?v=u7Mzm_JExw8&start_radio=1',
    nominations:'https://www.youtube.com/watch?v=fa1FTbzgRlA&start_radio=1',
    live_vote:'https://www.youtube.com/watch?v=pRyJL8AIHFg',
    eviction:'https://www.youtube.com/watch?v=1uIe1PpaUdA',
    victory:'https://www.youtube.com/watch?v=qKaIFa_GL_I'
  };

  // Minimal SFX example; extend as needed
  const sfxData={
    // Add your small SFX here if you want (kept minimal intentionally)
  };
  const sfxCache=new Map();
  function loadSfx(key){
    if(sfxCache.has(key)) return sfxCache.get(key);
    const url=sfxData[key]; if(!url) return null;
    const audio=new Audio(url); audio.preload='auto'; sfxCache.set(key,audio); return audio;
  }
  function playSfx(key){
    const g=global.game||{};
    if(g.cfg && g.cfg.fxSound===false) return;
    try{ const a=loadSfx(key); if(!a) return; a.currentTime=0; a.volume=0.85; a.play().catch(()=>{}); }catch{}
  }

  // YouTube helpers
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
    if(global.YT && global.YT.Player){ ytReady=true; cb&&cb(); return; }

    // If already present, hook into ready; otherwise inject
    const existing=document.querySelector('script[src*="iframe_api"]');
    if(existing){
      const prev=global.onYouTubeIframeAPIReady;
      global.onYouTubeIframeAPIReady=function(){ ytReady=true; try{ prev&&prev(); }catch{} cb&&cb(); };
      return;
    }
    const s=document.createElement('script'); s.src=YT_API_SRC; s.async=true;
    global.onYouTubeIframeAPIReady=function(){ ytReady=true; cb&&cb(); };
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
    // eslint-disable-next-line no-undef
    ytPlayer=new YT.Player('ytbgm',{
      host:'https://www.youtube-nocookie.com',
      videoId:videoId,
      playerVars:{autoplay:1,controls:0,disablekb:1,modestbranding:1,rel:0,iv_load_policy:3,loop:1,playlist:videoId},
      events:{
        onReady:(e)=>{ try{ e.target.playVideo(); }catch{} onReady&&onReady(e.target); },
        onError:(e)=>console.warn('[music] YT error',e)
      }
    });
  }

  function stopAll(){
    try{ bgmEl.pause(); bgmEl.removeAttribute('src'); }catch{}
    try{ ytPlayer && ytPlayer.stopVideo && ytPlayer.stopVideo(); }catch{}
  }
  function setVolume(vol){
    try{ if(bgmEl) bgmEl.volume=vol; }catch{}
    try{ ytPlayer && ytPlayer.setVolume && ytPlayer.setVolume(Math.round((+vol||0)*100)); }catch{}
  }

  function setMusic(key,force=false){
    const g=global.game||{};
    if(!force && g.cfg && g.cfg.autoMusic===false) return;
    const url=musicTracks[key];
    if(!url){ stopAll(); return; }

    // Optional: read a volume slider if present
    const volEl=document.getElementById('musicVol');
    const vol=volEl ? (+volEl.value||0.4) : 0.4;

    stopAll();

    if(isYouTube(url)){
      const vid=parseVideoId(url);
      if(!vid){ console.warn('[music] cannot parse YT id',url); return; }
      ensureYTApi(()=>ensureYTIframe(vid,(player)=>{
        try{ player.loadVideoById({videoId:vid,suggestedQuality:'small'}); }catch{}
        setVolume(vol);
      }));
    } else {
      bgmEl.src=url; bgmEl.loop=true; setVolume(vol);
      bgmEl.play().catch(()=>{ /* requires gesture until first click */ });
    }
  }

  function stopMusic(){
    stopAll();
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
  global.stopMusic=stopMusic;
  global.phaseMusic=phaseMusic;
  global.playSfx=playSfx;
  global.setMusicEnabled=setMusicEnabled;
  global.setSfxEnabled=setSfxEnabled;

  // One-time user gesture unlock for autoplay
  document.addEventListener('click', ()=>{
    try{ if(ytPlayer && ytPlayer.playVideo) ytPlayer.playVideo(); }catch{}
    try{ if(bgmEl && bgmEl.src) bgmEl.play().catch(()=>{}); }catch{}
  }, { once:true });

  console.log('[audio] ready (YT nocookie, gesture-unlock, stopMusic exposed)');
})(window);