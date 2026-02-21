// MODULE: nomination-risk.js
// Statistical nomination-risk system for Big Brother Mobile.
// Exposes window.NominationRisk with:
//   normalizeBond, computeNominationRisk, categorizeRisk, chooseNomineeByRisk

(function(global) {
  'use strict';

  // Category thresholds (configurable)
  const THRESHOLDS = [
    { label: 'very low',  max: 0.10 },
    { label: 'low',       max: 0.25 },
    { label: 'medium',    max: 0.50 },
    { label: 'high',      max: 0.70 },
    { label: 'very high', max: 0.90 },
    { label: 'extreme',   max: Infinity },
  ];

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  /**
   * Normalize a raw social bond to [0, 1].
   * Higher bond → higher value → lower nomination risk.
   * @param {number} bond
   * @param {number} [min=-100]
   * @param {number} [max=100]
   * @returns {number} 0..1
   */
  function normalizeBond(bond, min, max) {
    if (min === undefined) min = -100;
    if (max === undefined) max = 100;
    if (max === min) return 0.5;
    return clamp((bond - min) / (max - min), 0, 1);
  }

  /**
   * Compute nomination risk for a single candidate.
   * Formula: baseChance = 1/eligibleCount; bondNorm = normalizeBond(socialBond);
   *          hohComponent = hohWeight * (1 - bondNorm); raw = baseChance + hohComponent;
   *          finalRisk = clamp(raw, 0, 1).
   *
   * @param {Object} opts
   * @param {number} opts.eligibleCount  How many eligible nominees exist
   * @param {number} opts.socialBond     Raw social bond value between HOH and candidate
   * @param {number} [opts.bondMin=-100]
   * @param {number} [opts.bondMax=100]
   * @param {number} [opts.hohWeight=2.0]
   * @returns {number} finalRisk in [0, 1]
   */
  function computeNominationRisk(opts) {
    const eligibleCount = opts.eligibleCount;
    const socialBond = opts.socialBond;
    const bondMin = (opts.bondMin !== undefined) ? opts.bondMin : -100;
    const bondMax = (opts.bondMax !== undefined) ? opts.bondMax : 100;
    const hohWeight = (opts.hohWeight !== undefined) ? opts.hohWeight : 2.0;

    const n = Math.max(1, eligibleCount);
    const baseChance = 1 / n;
    const bondNorm = normalizeBond(socialBond, bondMin, bondMax);
    const hohComponent = hohWeight * (1 - bondNorm);
    const raw = baseChance + hohComponent;
    return clamp(raw, 0, 1);
  }

  /**
   * Categorize a risk value into a human-readable tier.
   * @param {number} risk  0..1
   * @returns {'very low'|'low'|'medium'|'high'|'very high'|'extreme'}
   */
  function categorizeRisk(risk) {
    for (let i = 0; i < THRESHOLDS.length; i++) {
      if (risk < THRESHOLDS[i].max) return THRESHOLDS[i].label;
    }
    return 'extreme';
  }

  /**
   * Choose nominees from eligible players using nomination risk weighting.
   * When deterministic=true, always picks the highest-risk player(s).
   * Otherwise performs weighted-random selection proportional to risk.
   *
   * @param {string[]} eligibleIds    Player IDs that can be nominated
   * @param {string}   hohId          Head of Household player ID
   * @param {Function} getBondFn      (hohId, pid) => rawBond number
   * @param {Function} [rng]          Random function, defaults to Math.random
   * @param {boolean}  [deterministic]  When true, always pick highest risk
   * @param {number}   [count=1]      How many nominees to pick
   * @param {number}   [bondMin=-100]
   * @param {number}   [bondMax=100]
   * @returns {string[]} Array of chosen nominee IDs (length <= count)
   */
  function chooseNomineeByRisk(eligibleIds, hohId, getBondFn, rng, deterministic, count, bondMin, bondMax) {
    if (!rng) rng = Math.random;
    if (deterministic === undefined) deterministic = false;
    if (!count) count = 1;
    if (bondMin === undefined) bondMin = -100;
    if (bondMax === undefined) bondMax = 100;

    if (!eligibleIds || eligibleIds.length === 0) return [];

    const scored = eligibleIds.map(function(id) {
      return {
        id: id,
        risk: computeNominationRisk({
          eligibleCount: eligibleIds.length,
          socialBond: getBondFn(hohId, id),
          bondMin: bondMin,
          bondMax: bondMax,
        }),
      };
    });

    const picks = [];
    const remaining = scored.slice();

    for (let i = 0; i < count && remaining.length > 0; i++) {
      let chosen;

      if (deterministic) {
        chosen = remaining.reduce(function(best, c) { return c.risk > best.risk ? c : best; }, remaining[0]);
      } else {
        const total = remaining.reduce(function(s, c) { return s + c.risk; }, 0);
        if (total <= 0) {
          chosen = remaining[Math.floor(rng() * remaining.length)];
        } else {
          let r = rng() * total;
          chosen = remaining[remaining.length - 1];
          for (let j = 0; j < remaining.length; j++) {
            r -= remaining[j].risk;
            if (r <= 0) { chosen = remaining[j]; break; }
          }
        }
      }

      picks.push(chosen.id);
      const idx = remaining.indexOf(chosen);
      if (idx !== -1) remaining.splice(idx, 1);
    }

    return picks;
  }

  // Export to global scope
  global.NominationRisk = {
    computeNominationRisk: computeNominationRisk,
    categorizeRisk: categorizeRisk,
    normalizeBond: normalizeBond,
    chooseNomineeByRisk: chooseNomineeByRisk,
  };

})(typeof window !== 'undefined' ? window : global);
