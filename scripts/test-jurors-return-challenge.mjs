import {
  canActivateJurorsReturnChallenge,
  canActivateJurorsReturnChallengeCheck,
  requiredJurorsForActivation,
} from "../src/progression/rules/canActivateJurorsReturnChallenge.mjs";

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    console.error(`✗ ${label} => expected ${expected}, got ${actual}`);
    process.exitCode = 1;
  } else {
    console.log(`✓ ${label}`);
  }
}

function run() {
  // Sanity: required jurors by initial players
  assertEqual(requiredJurorsForActivation(12), 5, "required (12 initial) == 5");
  assertEqual(requiredJurorsForActivation(11), 5, "required (11 initial) == 5");
  assertEqual(requiredJurorsForActivation(10), 4, "required (10 initial) == 4");
  assertEqual(requiredJurorsForActivation(9), 4, "required (9 initial) == 4");

  // Core examples
  assertEqual(
    canActivateJurorsReturnChallenge({ initialPlayers: 12, alivePlayers: 7, jurorCount: 5 }),
    true,
    "12 initial, 7 alive, 5 jurors => true"
  );
  assertEqual(
    canActivateJurorsReturnChallenge({ initialPlayers: 12, alivePlayers: 7, jurorCount: 4 }),
    false,
    "12 initial, 7 alive, 4 jurors => false"
  );
  assertEqual(
    canActivateJurorsReturnChallenge({ initialPlayers: 10, alivePlayers: 5, jurorCount: 4 }),
    true,
    "10 initial (small), 5 alive, 4 jurors => true"
  );
  assertEqual(
    canActivateJurorsReturnChallenge({ initialPlayers: 9, alivePlayers: 6, jurorCount: 3 }),
    false,
    "9 initial, 6 alive, 3 jurors => false"
  );
  assertEqual(
    canActivateJurorsReturnChallenge({ initialPlayers: 9, alivePlayers: 4, jurorCount: 4 }),
    false,
    "9 initial, 4 alive, 4 jurors => false (alive constraint)"
  );

  // Structured check messages
  const r1 = canActivateJurorsReturnChallengeCheck({ initialPlayers: 12, alivePlayers: 4, jurorCount: 10 });
  assertEqual(r1.ok, false, "check: alive < 5 blocked");
  const r2 = canActivateJurorsReturnChallengeCheck({ initialPlayers: 12, alivePlayers: 6, jurorCount: 4 });
  assertEqual(r2.ok, false, "check: jurors below required blocked");
  const r3 = canActivateJurorsReturnChallengeCheck({ initialPlayers: 10, alivePlayers: 6, jurorCount: 4 });
  assertEqual(r3.ok, true, "check: small game satisfied");

  console.log("Done.");
}

run();
