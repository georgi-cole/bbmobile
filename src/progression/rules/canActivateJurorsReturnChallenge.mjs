/**
 * Determines whether the Jurors Return Challenge can be activated.
 *
 * NOTE: As of the latest refactor, juror return eligibility is now CONFIGURABLE
 * via game config keys (jurorReturnAliveMin, jurorReturnAliveMax, jurorReturnMinJurors).
 * This function provides a simplified eligibility check for the progression system.
 *
 * Default rules (configurable in js/config/defaults.js):
 * - Alive players must be exactly 6 (or within jurorReturnAliveMin/Max range)
 * - At least 2 jurors required (or jurorReturnMinJurors value)
 *
 * For the actual game logic, see js/twists.js::isJurorReturnEligible()
 *
 * @param {object} params
 * @param {number} params.initialPlayers - Players at game start (legacy, not used in new logic).
 * @param {number} params.alivePlayers - Current number of alive players.
 * @param {number} params.jurorCount - Current number of jurors.
 * @returns {boolean} True if the challenge can be activated, else false.
 */
export function canActivateJurorsReturnChallenge({ initialPlayers, alivePlayers, jurorCount }) {
  if (!Number.isFinite(initialPlayers) || !Number.isFinite(alivePlayers) || !Number.isFinite(jurorCount)) {
    throw new TypeError("All parameters must be finite numbers.");
  }

  // Default thresholds - MUST be kept in sync with js/config/defaults.js
  // TODO: Consider importing these from a shared constant file
  const aliveMin = 6;
  const aliveMax = 6;
  const minJurors = 2;

  // Check if alive players fall within the configured range
  if (alivePlayers < aliveMin || alivePlayers > aliveMax) return false;

  // Check if we have enough jurors
  return jurorCount >= minJurors;
}

/**
 * Returns the juror count required to allow activation.
 * NOTE: This is now a fixed default value. The actual game uses configurable
 * thresholds via game.cfg.jurorReturnMinJurors (default: 2).
 * @param {number} initialPlayers - Legacy parameter, no longer used in new logic
 * @returns {number} Required juror count (default: 2)
 */
export function requiredJurorsForActivation(initialPlayers) {
  if (!Number.isFinite(initialPlayers)) {
    throw new TypeError("initialPlayers must be a finite number.");
  }
  // Return the default minimum jurors (matches js/config/defaults.js)
  return 2;
}

/**
 * Like canActivateJurorsReturnChallenge, but returns a structured result with reason for failure.
 * @param {object} params
 * @param {number} params.initialPlayers - Legacy parameter
 * @param {number} params.alivePlayers
 * @param {number} params.jurorCount
 * @returns {{ ok: true } | { ok: false, reason: string }}
 */
export function canActivateJurorsReturnChallengeCheck({ initialPlayers, alivePlayers, jurorCount }) {
  // Default thresholds - MUST be kept in sync with js/config/defaults.js
  const aliveMin = 6;
  const aliveMax = 6;
  const minJurors = 2;

  if (alivePlayers < aliveMin) {
    return { ok: false, reason: `Not enough players alive (need at least ${aliveMin}).` };
  }
  if (alivePlayers > aliveMax) {
    return { ok: false, reason: `Too many players alive (need at most ${aliveMax}).` };
  }
  if (jurorCount < minJurors) {
    return { ok: false, reason: `Not enough jurors (need at least ${minJurors}).` };
  }
  return { ok: true };
}
