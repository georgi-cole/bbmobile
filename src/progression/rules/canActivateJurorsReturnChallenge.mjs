/**
 * Determines whether the Jurors Return Challenge can be activated.
 *
 * Rules:
 * - Activation is NEVER allowed if alivePlayers < 5.
 * - If initialPlayers >= 11 (i.e., more than 10), require at least 5 jurors.
 * - If initialPlayers <= 10 (i.e., 10 or fewer), require at least 4 jurors.
 *
 * Definitions:
 * - initialPlayers: number of players at game start (not the current alive count).
 *
 * Edge case:
 * - Exactly 10 initial players is treated as "small" (requires >= 4 jurors).
 *
 * @param {object} params
 * @param {number} params.initialPlayers - Players at game start.
 * @param {number} params.alivePlayers - Current number of alive players.
 * @param {number} params.jurorCount - Current number of jurors.
 * @returns {boolean} True if the challenge can be activated, else false.
 */
export function canActivateJurorsReturnChallenge({ initialPlayers, alivePlayers, jurorCount }) {
  if (!Number.isFinite(initialPlayers) || !Number.isFinite(alivePlayers) || !Number.isFinite(jurorCount)) {
    throw new TypeError("All parameters must be finite numbers.");
  }

  // Hard stop if fewer than 5 people are alive.
  if (alivePlayers < 5) return false;

  // Large game threshold is based on initial player count.
  const isLargeGame = initialPlayers >= 11; // "more than 10"
  return isLargeGame ? jurorCount >= 5 : jurorCount >= 4;
}

/**
 * Returns the juror count required to allow activation, based on initial players.
 * @param {number} initialPlayers
 * @returns {4|5}
 */
export function requiredJurorsForActivation(initialPlayers) {
  if (!Number.isFinite(initialPlayers)) {
    throw new TypeError("initialPlayers must be a finite number.");
  }
  return initialPlayers >= 11 ? 5 : 4;
}

/**
 * Like canActivateJurorsReturnChallenge, but returns a structured result with reason for failure.
 * @param {object} params
 * @param {number} params.initialPlayers
 * @param {number} params.alivePlayers
 * @param {number} params.jurorCount
 * @returns {{ ok: true } | { ok: false, reason: string }}
 */
export function canActivateJurorsReturnChallengeCheck({ initialPlayers, alivePlayers, jurorCount }) {
  if (alivePlayers < 5) {
    return { ok: false, reason: "Not enough players alive (need at least 5)." };
  }
  const required = requiredJurorsForActivation(initialPlayers);
  if (jurorCount < required) {
    return { ok: false, reason: `Not enough jurors (need at least ${required}).` };
  }
  return { ok: true };
}
