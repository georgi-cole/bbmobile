/* Randomize the AI cast per game: subset + order.
   - Wraps startOpeningSequence once.
   - Subsets from the pool (playersPool or current players) to cfg.castSize (or inferred).
   - Shuffles order every new game so avatars/characters appear randomized.
*/
(function (g) {
  'use strict';
  if (!g) return;

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function pickRandomCast(allCharacters, castSize) {
    if (!Array.isArray(allCharacters) || allCharacters.length === 0) return [];
    const size = Math.max(0, Math.min(castSize || allCharacters.length, allCharacters.length));
    const pool = shuffle(allCharacters);
    return pool.slice(0, size);
  }

  function tryWrap() {
    const orig = g.startOpeningSequence;
    if (typeof orig !== 'function') return false;
    if (orig.__bbCastWrapped) return true;

    const wrapped = function randomizedOpening() {
      const game = g.game || {};
      try {
        if (game && !game.__castRandomized) {
          const cfg = game.cfg || {};

          // Prefer a larger pool if available, else use current players
          const pool =
            (Array.isArray(game.playersPool) && game.playersPool.length)
              ? game.playersPool.slice()
              : (Array.isArray(game.players) ? game.players.slice() : []);

          // Determine desired cast size from config (multiple common keys)
          const desired = cfg.castSize || cfg.players || cfg.numPlayers || (pool.length || 0);

          if (pool.length > 0 && desired > 0) {
            const selected = pickRandomCast(pool, desired);
            game.players = shuffle(selected);
            game.__castRandomized = true;
            console.info('[cast-randomizer] randomized cast:', { size: desired, from: pool.length });
          } else {
            console.info('[cast-randomizer] skipped (no pool/size)');
          }
        }
      } catch (e) {
        console.warn('[cast-randomizer] error', e);
      }
      return orig.apply(this, arguments);
    };

    wrapped.__bbCastWrapped = true;
    g.startOpeningSequence = wrapped;
    return true;
  }

  // Attempt immediately; if not ready, retry briefly
  if (!tryWrap()) {
    let tries = 0;
    const tid = setInterval(() => {
      tries++;
      if (tryWrap() || tries > 40) clearInterval(tid); // ~4s max
    }, 100);
  }

  // Expose utilities (optional)
  g.CastRandomizer = { shuffle, pickRandomCast };
})(window);
