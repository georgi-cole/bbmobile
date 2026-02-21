// MODULE: competition-manager.js
// Orchestrates competition lifecycle for the rankings-only competition system.
// Phases: lobby → play → reveal → results
// Exposes API at global.game.competition
// Emits events: roundStarted, roundFinished, placementsUpdated, competitionFinished

(function (global) {
  'use strict';

  // ── Simple EventEmitter ──────────────────────────────────────────────────
  function EventEmitter() {
    this._listeners = {};
  }
  EventEmitter.prototype.on = function (event, fn) {
    (this._listeners[event] = this._listeners[event] || []).push(fn);
    return this;
  };
  EventEmitter.prototype.off = function (event, fn) {
    if (!this._listeners[event]) return this;
    this._listeners[event] = this._listeners[event].filter(function (l) { return l !== fn; });
    return this;
  };
  EventEmitter.prototype.emit = function (event) {
    var args = Array.prototype.slice.call(arguments, 1);
    var listeners = this._listeners[event] || [];
    listeners.forEach(function (fn) {
      try { fn.apply(null, args); } catch (e) { console.error('[CompetitionManager] event listener error', e); }
    });
  };

  // ── Phase constants ──────────────────────────────────────────────────────
  var PHASES = { LOBBY: 'lobby', PLAY: 'play', REVEAL: 'reveal', RESULTS: 'results' };

  // ── CompetitionManager ───────────────────────────────────────────────────
  /**
   * Manages a single competition round lifecycle.
   * Performances are used only to derive placements; raw values are not stored.
   *
   * Config options:
   *   roundId    {string}  – unique identifier for this round
   *   order      {string}  – 'desc' (higher=better, default) or 'asc' (lower=better)
   *   rngSeed    {number}  – optional seed for deterministic tie-breaking
   */
  function CompetitionManager() {
    EventEmitter.call(this);
    this._phase = PHASES.LOBBY;
    this._config = {};
    this._performances = []; // [{playerId, performance}]
    this._placements = [];   // [{playerId, placement}]
    this._roundActive = false;
  }
  CompetitionManager.prototype = Object.create(EventEmitter.prototype);
  CompetitionManager.prototype.constructor = CompetitionManager;

  /**
   * Start a new competition round.
   * @param {object} config - { roundId, order, rngSeed }
   */
  CompetitionManager.prototype.start = function (config) {
    if (this._roundActive) {
      console.warn('[CompetitionManager] start() called while round already active; resetting.');
      this.resetRound();
    }
    this._config = Object.assign({ roundId: 'round_' + Date.now(), order: 'desc' }, config || {});
    this._performances = [];
    this._placements = [];
    this._phase = PHASES.PLAY;
    this._roundActive = true;
    this.emit('roundStarted', { config: this._config });
  };

  /**
   * Record a player's performance for this round.
   * @param {string|number} playerId
   * @param {number} performance - comparable metric emitted by minigame
   */
  CompetitionManager.prototype.submitPerformance = function (playerId, performance) {
    if (!this._roundActive) {
      console.warn('[CompetitionManager] submitPerformance() called outside active round.');
      return;
    }
    // Overwrite if player already submitted
    var idx = this._performances.findIndex(function (p) { return p.playerId === playerId; });
    if (idx >= 0) {
      this._performances[idx].performance = performance;
    } else {
      this._performances.push({ playerId: playerId, performance: performance });
    }
  };

  /**
   * Finalize the round: compute placements, persist, advance phase.
   * @returns {Array} placements array [{playerId, placement}]
   */
  CompetitionManager.prototype.finalizeRound = function () {
    if (!this._roundActive) {
      console.warn('[CompetitionManager] finalizeRound() called outside active round.');
      return [];
    }
    this._phase = PHASES.REVEAL;

    var calculator = _getResultsCalculator();
    this._placements = calculator.calculate(this._performances, this._config);
    this.emit('placementsUpdated', { placements: this._placements });

    var adapter = _getStorageAdapter();
    adapter.saveRound({
      timestamp: new Date().toISOString(),
      roundId: this._config.roundId,
      placements: this._placements,
      config: this._config
    });

    this._phase = PHASES.RESULTS;
    this._roundActive = false;
    this.emit('roundFinished', { placements: this._placements, config: this._config });

    if (this._config.isFinal) {
      this.emit('competitionFinished', { placements: this._placements });
    }

    return this._placements;
  };

  /**
   * Return the current placements array (empty if round not finalized).
   * @returns {Array} [{playerId, placement}]
   */
  CompetitionManager.prototype.getPlacements = function () {
    return this._placements.slice();
  };

  /**
   * Reset state for a new round without re-configuring.
   */
  CompetitionManager.prototype.resetRound = function () {
    this._performances = [];
    this._placements = [];
    this._phase = PHASES.LOBBY;
    this._roundActive = false;
  };

  /** Current phase string */
  CompetitionManager.prototype.getPhase = function () {
    return this._phase;
  };

  // ── Lazy module resolution helpers ──────────────────────────────────────
  function _getResultsCalculator() {
    if (global.ResultsCalculator) return global.ResultsCalculator;
    console.error('[CompetitionManager] ResultsCalculator not loaded');
    return { calculate: function () { return []; } };
  }

  function _getStorageAdapter() {
    if (global.CompetitionStorageAdapter) return global.CompetitionStorageAdapter;
    console.error('[CompetitionManager] CompetitionStorageAdapter not loaded');
    return { saveRound: function () {} };
  }

  // ── Attach singleton to global.game.competition ──────────────────────────
  var _instance = new CompetitionManager();

  function _attach() {
    var g = global.game = global.game || {};
    g.competition = _instance;
  }

  if (document && document.readyState !== 'loading') {
    _attach();
  } else if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', _attach);
  } else {
    _attach();
  }

  // Also expose constructor for testing
  global.CompetitionManager = CompetitionManager;
  global.COMPETITION_PHASES = PHASES;

}(typeof window !== 'undefined' ? window : global));
