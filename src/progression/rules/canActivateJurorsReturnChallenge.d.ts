export interface CanActivateParams {
  initialPlayers: number; // players at game start
  alivePlayers: number;   // current alive players
  jurorCount: number;     // current jurors
}

export declare function canActivateJurorsReturnChallenge(params: CanActivateParams): boolean;

export declare function requiredJurorsForActivation(initialPlayers: number): 4 | 5;

export type CheckResult =
  | { ok: true }
  | { ok: false; reason: string };

export declare function canActivateJurorsReturnChallengeCheck(params: CanActivateParams): CheckResult;
