// MODULE: player-bio.js
// Rich player bio data and attachment system for stable profile panels.
// Provides structured bio information for all cast members.

(function(global){
  'use strict';

  // Static bios map keyed by exact player names (case-sensitive)
  const BIOS = {
    'Finn': {
      gender: 'Male',
      age: 41,
      location: 'Helsinki, Finland',
      sexuality: 'Straight',
      motto: 'Ride the waves',
      funFact: 'Surfs daily'
    },
    'Mimi': {
      gender: 'Female',
      age: 23,
      location: 'Tokyo, Japan',
      sexuality: 'Straight',
      motto: 'Dream big',
      funFact: 'Plays violin'
    },
    'Rae': {
      gender: 'Female',
      age: 44,
      location: 'Nairobi, Kenya',
      sexuality: 'Straight',
      motto: 'Lead with strength',
      funFact: 'Black belt in karate'
    },
    'Nova': {
      gender: 'Female',
      age: 25,
      location: 'Los Angeles, USA',
      sexuality: 'Straight',
      motto: 'Be creative',
      funFact: 'Writes sci‑fi stories'
    },
    'Kai': {
      gender: 'Male',
      age: 34,
      location: 'Seoul, South Korea',
      sexuality: 'Straight',
      motto: 'Stay curious',
      funFact: 'Speaks five languages'
    },
    'Zed': {
      gender: 'Male',
      age: 30,
      location: 'Lagos, Nigeria',
      sexuality: 'Straight',
      motto: 'Think deep',
      funFact: 'Chess champion'
    },
    'Ivy': {
      gender: 'Female',
      age: 26,
      location: 'Berlin, Germany',
      sexuality: 'Straight',
      motto: 'Analyze everything',
      funFact: 'Solves puzzles daily'
    },
    'Ash': {
      gender: 'Male',
      age: 27,
      location: 'Sydney, Australia',
      sexuality: 'Straight',
      motto: 'Stay calm',
      funFact: 'Meditates every morning'
    },
    'Lux': {
      gender: 'Female',
      age: 24,
      location: 'Paris, France',
      sexuality: 'Bisexual',
      motto: 'Elegant simplicity',
      funFact: 'Former runway model'
    },
    'Remy': {
      gender: 'Male',
      age: 29,
      location: 'Montreal, Canada',
      sexuality: 'Straight',
      motto: 'Charm the room',
      funFact: 'Jazz saxophonist'
    },
    'Blue': {
      gender: 'Male',
      age: 31,
      location: 'New York, USA',
      sexuality: 'Straight',
      motto: 'Quiet observation',
      funFact: 'Keeps a daily journal'
    },
    'Jax': {
      gender: 'Male',
      age: 28,
      location: 'Rio de Janeiro, Brazil',
      sexuality: 'Straight',
      motto: 'Push limits',
      funFact: 'Ironman finisher'
    },
    'Echo': {
      gender: 'Female',
      age: 22,
      location: 'London, UK',
      sexuality: 'Straight',
      motto: 'Quirk is strength',
      funFact: 'Collects vintage radios'
    },
    'Vee': {
      gender: 'Female',
      age: 24,
      location: 'Cape Town, South Africa',
      sexuality: 'Straight',
      motto: 'Peace and strategy',
      funFact: 'Brews craft coffee'
    },
    'Sol': {
      gender: 'Male',
      age: 26,
      location: 'Madrid, Spain',
      sexuality: 'Straight',
      motto: 'Stay golden',
      funFact: 'Sunsets photographer'
    },
    'Quinn': {
      gender: 'Female',
      age: 25,
      location: 'Dublin, Ireland',
      sexuality: 'Straight',
      motto: 'Stay mysterious',
      funFact: 'Poker‑face champion'
    },
    'Aria': {
      gender: 'Female',
      age: 23,
      location: 'Rome, Italy',
      sexuality: 'Straight',
      motto: 'Harmony first',
      funFact: 'Plays harp'
    },
    'Dex': {
      gender: 'Male',
      age: 30,
      location: 'Stockholm, Sweden',
      sexuality: 'Straight',
      motto: 'Less is more',
      funFact: 'Minimalist designer'
    },
    'Rune': {
      gender: 'Male',
      age: 32,
      location: 'Oslo, Norway',
      sexuality: 'Gay',
      motto: 'Create with soul',
      funFact: 'Writes poetry'
    },
    'Bea': {
      gender: 'Female',
      age: 22,
      location: 'Athens, Greece',
      sexuality: 'Straight',
      motto: 'Stay cheerful',
      funFact: 'Runs marathons'
    },
    'Nico': {
      gender: 'Male',
      age: 28,
      location: 'Lisbon, Portugal',
      sexuality: 'Straight',
      motto: 'Playful pranks',
      funFact: 'Magician on weekends'
    },
    'You': {
      gender: '(You)',
      age: '—',
      location: 'Your Space',
      sexuality: '—',
      motto: 'Play your game',
      funFact: 'Customize in bios file'
    }
  };

  // Fallback bio for unmapped players
  const FALLBACK_BIO = {
    gender: '—',
    age: '—',
    location: '—',
    sexuality: '—',
    motto: '—',
    funFact: '—'
  };

  /**
   * Attach bio data to each player in the game.
   * Called after player creation in bootstrap.
   * @param {object} game - The game object containing players array
   */
  function attachBios(game) {
    if (!game || !Array.isArray(game.players)) {
      console.warn('[bio] attachBios: invalid game object');
      return;
    }

    let attached = 0;
    let fallbacks = 0;

    game.players.forEach(player => {
      const name = player.name;
      const bio = BIOS[name];
      
      if (bio) {
        player.bio = { ...bio };
        attached++;
      } else {
        player.bio = { ...FALLBACK_BIO };
        fallbacks++;
        console.info(`[bio] missing name=${name} (using fallback)`);
      }
    });

    console.info(`[bio] attached ${attached} bios, ${fallbacks} fallbacks`);
  }

  /**
   * Get bio for a specific player by name.
   * @param {string} name - Player name
   * @returns {object} Bio object with gender, age, location, sexuality, motto, funFact
   */
  function getBio(name) {
    return BIOS[name] || { ...FALLBACK_BIO };
  }

  // Expose to global scope
  global.attachBios = attachBios;
  global.getBio = getBio;
  global.__bios = BIOS; // Debug/inspection access

  console.info('[bio] player-bio.js loaded');

})(window);
