// MODULE: settings/registry.js
// Central registry for all settings tabs, groups, and fields.
// All settings UI is generated from this registry.

(function(global){
  'use strict';

  // Field type helpers
  function checkbox(key, label){
    return {
      type: 'checkbox',
      key: key,
      label: label
    };
  }

  function number(key, label, min, max, step){
    return {
      type: 'number',
      key: key,
      label: label,
      min: min,
      max: max,
      step: step || 1
    };
  }

  function select(key, label, options){
    return {
      type: 'select',
      key: key,
      label: label,
      options: options
    };
  }

  function html(content){
    return {
      type: 'html',
      content: content
    };
  }

  // Tab registry - defines all tabs, groups, and fields
  const TAB_REGISTRY = [
    {
      id: 'general',
      label: 'General',
      visibility: 'all',
      groups: [
        {
          title: 'Interface',
          fields: [
            checkbox('fxCards', 'Card reveal popups (FX cards)'),
            checkbox('showTopRoster', 'Show top roster above TV'),
            checkbox('adaptiveBackground', 'Adaptive backgrounds (intro screen)')
          ]
        },
        {
          title: 'Quality of life',
          fields: [
            checkbox('colorblindMode', 'Colorblind/high-contrast mode'),
            html('<div class="tiny muted">Adds body class "cb" for theming; you can style colors via CSS if desired.</div>')
          ]
        },
        {
          title: 'Advanced Settings',
          fields: [
            checkbox('advancedMode', 'Show advanced settings (power-user mode)'),
            html('<div class="tiny muted">Enable to show Advanced and Debug tabs with additional configuration options.</div>')
          ]
        }
      ]
    },
    {
      id: 'cast',
      label: 'Cast',
      visibility: 'all',
      // Custom mount function - will inject Cast editor UI
      mount: 'mountCastTab'
    },
    {
      id: 'gameplay',
      label: 'Gameplay',
      visibility: 'dev',
      groups: [
        {
          title: 'Features',
          fields: [
            checkbox('enableJuryHouse', 'Enable Jury House'),
            checkbox('enablePublicFav', 'Fans\' favourite mode'),
            checkbox('progressionEnabled', 'Enable XP and leveling system (experimental)')
          ]
        },
        {
          title: 'Week twists',
          fields: [
            number('doubleChance', 'Double eviction chance (%)', 0, 100, 1),
            number('tripleChance', 'Triple eviction chance (%)', 0, 100, 1),
            number('returnChance', 'Juror return chance (%)', 0, 100, 1),
            number('selfEvictChance', 'Self-eviction chance (%)', 0, 100, 0.5),
            number('goldenPOVChance', 'Golden POV chance (%)', 0, 100, 1),
            number('diamondPOVChance', 'Diamond POV chance (%)', 0, 100, 1)
          ]
        },
        {
          title: 'Minigame settings',
          fields: [
            select('miniMode', 'Minigame mode', [
              {value: 'random', label: 'Random'},
              {value: 'clicker', label: 'Clicker only'},
              {value: 'cycle', label: 'Cycle through all'}
            ]),
            html('<div class="tiny muted">Choose how minigames are selected during competitions.</div>'),
            number('minigameDuration', 'Challenge timer duration (seconds)', 30, 600, 10),
            html('<div class="tiny muted">Duration for minigame challenge timer when launched (default: 180s = 3 minutes). Phase timer takes precedence if available.</div>'),
            checkbox('useNewMinigames', 'Use new minigame system (Phase 1) - non-repeating pools'),
            checkbox('useUnifiedMinigames', 'Use unified minigame system (Phases 0-8)'),
            checkbox('enableMinigameBridge', 'Enable minigame compatibility bridge'),
            checkbox('enableMinigameTelemetryPanel', 'Show minigame telemetry panel (Dev)')
          ]
        },
        {
          title: 'Competition win chances',
          fields: [
            html('<div class="tiny muted">Configure player win probability for different competition types (stored as decimals internally: 20% = 0.20).</div>'),
            number('playerWinChanceHOH', 'HOH win chance (%)', 0, 100, 1),
            html('<div class="tiny muted">Default: 20% chance to win HOH competitions when performing well.</div>'),
            number('playerWinChancePOV', 'POV win chance (%)', 0, 100, 1),
            html('<div class="tiny muted">Default: 30% chance to win POV competitions when performing well.</div>')
          ]
        }
      ]
    },
    {
      id: 'timing',
      label: 'Timing',
      visibility: 'dev',
      groups: [
        {
          title: 'Phase timers (seconds)',
          fields: [
            number('tOpening', 'Season Premiere', 5, 600, 5),
            number('tIntermission', 'Intermission', 1, 120, 1),
            number('tHOH', 'HOH Competition', 5, 600, 5),
            number('tNoms', 'Nominations', 5, 600, 5),
            number('tVeto', 'Veto Competition', 5, 600, 5),
            number('tVetoDec', 'Veto Decision', 5, 600, 5),
            number('tSocial', 'Social Segments', 5, 600, 5),
            number('tLiveVote', 'Live Vote', 5, 600, 5),
            number('tJury', 'Jury Segment', 5, 600, 5),
            number('tJuryReturn', 'Jury Return Twist', 5, 600, 5),
            number('tFinal3Comp1', 'Final 3 — Part 1', 5, 600, 5),
            number('tFinal3Comp2', 'Final 3 — Part 2', 5, 600, 5),
            number('tFinal3Decision', 'Final 3 — Decision', 5, 600, 5)
          ]
        },
        {
          title: 'Card FX pacing (milliseconds)',
          fields: [
            number('cardHoldMs', 'Min on-screen per card', 100, 8000, 50),
            number('cardGapMs', 'Gap between cards', 0, 4000, 50)
          ]
        },
        {
          title: 'Skip cascade',
          fields: [
            checkbox('skipCascadeEnabled', 'Enable skip cascade UI'),
            number('skipTurboWindowMs', 'Turbo window (ms)', 300, 10000, 50),
            number('skipTurboHoldMs', 'Turbo per-card hold (ms)', 100, 2000, 25),
            number('skipTurboGapMs', 'Turbo gap (ms)', 0, 1000, 25)
          ]
        }
      ]
    },
    {
      id: 'visual',
      label: 'Visual',
      visibility: 'all',
      groups: [
        {
          title: 'Theme',
          fields: [
            html('<div class="toggleRow"><label style="display:block;margin-bottom:8px;">House Theme</label><select id="themeSelector" style="width:100%;max-width:300px;padding:6px 10px;border-radius:6px;background:var(--card-2);border:1px solid var(--line);color:var(--ink);font-size:.7rem;"><option value="tvstudio">TV Studio - Dark with Neon Accents</option><option value="modernhouse">Modern Big Brother House - Light with Glassmorphism</option><option value="midnight">Midnight Glass - Original Dark Theme</option><option value="miami">Miami Beach - Tropical Turquoise</option><option value="cabin">Wooden Cabin - Rustic Wood Tones</option><option value="starrynight">Starry Night - Deep Space</option><option value="rainbow">Over the Rainbow - Multi-Colored</option><option value="matrix">The Matrix - Digital Green Code</option><option value="apartment">Modern Apartment - Clean Minimalist</option></select><div class="tiny muted" style="margin-top:6px;">Choose from 9 unique themes with distinct colors, textures, and aesthetics. Your preference is saved automatically.</div></div>')
          ]
        },
        {
          title: 'Badges & effects',
          fields: [
            checkbox('useRibbon', 'Use EVICTED ribbon overlay'),
            checkbox('modernLiveVoteUI', 'Modern Live Vote UI (cinematic versus layout)')
          ]
        },
        {
          title: 'Intros & Rules',
          fields: [
            checkbox('skipIntros', 'Skip Intros'),
            html('<div class="tiny muted">Skip intro video and animated intro sequence when starting the app</div>'),
            checkbox('autoShowRulesOnStart', 'Show rules modal after intro')
          ]
        },
        {
          title: 'Avatars',
          fields: [
            checkbox('strictAvatars', 'Strict local avatars (no external fallback)')
          ]
        }
      ]
    },
    {
      id: 'audio',
      label: 'Audio',
      visibility: 'all',
      groups: [
        {
          title: 'Audio',
          fields: [
            checkbox('musicOn', 'Music'),
            checkbox('sfxOn', 'Sound effects')
          ]
        },
        {
          title: 'Music / Audio Controls',
          fields: [
            html('<div class="row" style="gap:8px;flex-wrap:wrap;margin-bottom:6px"><select id="musicTrack" style="flex:1;min-width:180px"><option value="none">No track</option><option value="theme_opening">Opening Theme</option><option value="hoh_comp">HOH Comp</option><option value="veto_comp">Veto Comp</option><option value="nominations">Nominations</option><option value="live_vote">Live Vote</option><option value="eviction">Eviction</option><option value="victory">Victory Theme</option></select><button class="btn small" id="btnPlayMusic">Play</button><button class="btn small" id="btnStopMusic">Stop</button></div>'),
            html('<label class="toggleRow"><span>Volume</span><input type="range" id="musicVol" min="0" max="1" step="0.01" value="0.4" style="flex:1"/></label>'),
            html('<label class="toggleRow"><input type="checkbox" id="autoMusic" checked/><span>Auto music</span></label>')
          ]
        }
      ]
    },
    {
      id: 'advanced',
      label: 'Advanced',
      visibility: 'dev',
      groups: [
        {
          title: 'Quick Actions',
          fields: [
            html('<div class="row" style="gap:8px;flex-wrap:wrap;align-items:center"><label class="toggleRow"><span>Self-evict player</span><select id="qaSelfEvictSelect" style="width:220px"></select></label><button class="btn danger" data-action="self-evict">Self-evict</button></div>'),
            html('<div class="tiny muted" style="margin-top:2px">Immediately removes the selected houseguest from the game as a self-eviction.</div>')
          ]
        },
        {
          title: 'Data',
          fields: [
            html('<div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn" data-action="export">Export settings JSON</button><button class="btn" data-action="import">Import settings JSON</button></div>'),
            html('<div class="tiny muted">Import affects settings only, not game state.</div>')
          ]
        },
        {
          title: 'Danger zone',
          fields: [
            html('<div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn warn" data-action="reset-defaults">Reset to defaults</button><button class="btn danger" data-action="clear-storage">Clear saved settings</button></div>')
          ]
        }
      ]
    },
    {
      id: 'debug',
      label: 'Debug',
      visibility: 'dev',
      groups: [
        {
          title: 'Quick Actions',
          fields: [
            html('<div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn small" id="btnNextWeek">Force Week ▶</button><button class="btn small" id="btnClearLog">Clear Log</button><button class="btn small" id="btnDebugExport">Export Save</button><button class="btn small" id="btnDebugImport">Import</button></div>'),
            html('<input id="debugImportFile" type="file" accept="application/json" style="display:none"/>')
          ]
        },
        {
          title: 'Minigame Testing',
          fields: [
            checkbox('debugAlwaysWin', 'Always win (testing)'),
            html('<div class="tiny muted">When enabled, every minigame/competition outcome yields a win with 100% probability. Used for testing flow without RNG.</div>'),
            checkbox('debugUnlimitedTimer', 'Unlimited debug timer (shows ∞)'),
            html('<div class="tiny muted">When enabled, debug minigame launches will show a static timer with the infinity symbol (∞) instead of a countdown. No auto-timeout or 60s cap.</div>'),
            html('<div class="toggleRow"><label style="display:block;margin-bottom:8px;">Select Minigame</label><select id="debugMinigameSelect" style="width:100%;padding:6px 10px;border-radius:6px;background:var(--card-2);border:1px solid var(--line);color:var(--ink);font-size:.9rem;"><option value="">-- Select a minigame --</option></select></div>'),
            html('<div class="row" style="gap:8px;flex-wrap:wrap;margin-top:8px"><button class="btn primary" id="btnLaunchMinigame">🚀 Launch Minigame</button></div>'),
            html('<div class="tiny muted" style="margin-top:6px;">Launch any implemented minigame in a debug sandbox for manual testing. The game will run independently without affecting game flow.</div>')
          ]
        },
        {
          title: 'Social Maneuvers Debug',
          fields: [
            checkbox('debugSocialHUD', 'Show Social Spend Debug HUD'),
            html('<div class="tiny muted">When enabled, shows a collapsible debug HUD for the Social Spend UI Adapter. Includes mock bank controls, CTA attachment testing, and recent spendables tracking.</div>')
          ]
        }
      ]
    }
  ];

  // Export to global namespace
  const SettingsRegistry = global.SettingsRegistry = global.SettingsRegistry || {};
  SettingsRegistry.TAB_REGISTRY = TAB_REGISTRY;
  SettingsRegistry.helpers = {
    checkbox: checkbox,
    number: number,
    select: select,
    html: html
  };

})(window);
