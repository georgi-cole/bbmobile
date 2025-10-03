// MODULE: bbGameBus.js
// Event bus for game communication and coordination

(function(g){
  'use strict';

  const listeners = new Map();

  function on(event, callback){
    if(!listeners.has(event)){
      listeners.set(event, []);
    }
    listeners.get(event).push(callback);
  }

  function off(event, callback){
    if(!listeners.has(event)) return;
    const cbs = listeners.get(event);
    const idx = cbs.indexOf(callback);
    if(idx !== -1) cbs.splice(idx, 1);
  }

  function emit(event, data){
    if(!listeners.has(event)) return;
    const cbs = listeners.get(event);
    cbs.forEach(cb => {
      try {
        cb(data);
      } catch(e){
        console.error('[GameBus] Error in listener:', e);
      }
    });
  }

  function once(event, callback){
    const wrapper = (data) => {
      callback(data);
      off(event, wrapper);
    };
    on(event, wrapper);
  }

  // Export API
  g.bbGameBus = {
    on,
    off,
    emit,
    once
  };

})(window);
