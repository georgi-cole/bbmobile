# Progression Events Reference

Complete reference for all game events that trigger XP logging in the progression system.

## Feature Flag Gating

All event logging is gated by the `progression.enabled` feature flag. The flag can be set via:
1. `window.progression.enabled` (runtime override)
2. `localStorage.getItem('progression.enabled')` (user preference)
3. `window.g.cfg.progressionEnabled` (game config)
4. Default: `false` (disabled)

When the feature flag is OFF:
- No XP events are logged
- No errors are thrown
- All hooks are safe no-ops

## Event Hooks API

All event hooks are exposed on `window.ProgressionEvents` and can be called from game logic.

### Major Positive Events (High XP Rewards)

#### HOH_WIN (+150 XP)
```javascript
window.ProgressionEvents.onHOHWin(winnerId, participants = [])
```
- Triggers when a player wins Head of Household competition
- `winnerId`: Player ID of the winner
- `participants`: Array of all player IDs who participated
- Winner gets HOH_WIN (+150 XP)
- Other participants get COMP_PARTICIPATE (+50 XP, capped at 3/week)

#### POV_WIN (+125 XP)
```javascript
window.ProgressionEvents.onPOVWin(winnerId, participants = [])
```
- Triggers when a player wins Power of Veto competition
- `winnerId`: Player ID of the winner
- `participants`: Array of all player IDs who participated
- Winner gets POV_WIN (+125 XP)
- Other participants get COMP_PARTICIPATE (+50 XP, capped at 3/week)

#### WON_FINAL (+500 XP)
```javascript
window.ProgressionEvents.onFinalWinner(winnerId)
```
- Triggers when a player wins the game
- `winnerId`: Player ID of the winner
- Awards 500 XP for winning the season

#### WON_ALL_JURY_VOTES (+300 XP)
```javascript
window.ProgressionEvents.onWonAllJuryVotes(winnerId, totalVotes)
```
- Triggers when a player wins with unanimous jury votes
- `winnerId`: Player ID of the winner
- `totalVotes`: Total number of jury votes received
- Awards 300 XP for a perfect game (in addition to WON_FINAL)

#### WON_PUBLIC_FAVORITE (+100 XP)
```javascript
window.ProgressionEvents.onPublicFavorite(winnerId)
```
- Triggers when a player wins the public's favorite player award
- `winnerId`: Player ID of the winner

#### WON_JURY_VOTE (+50 XP per vote)
```javascript
window.ProgressionEvents.onJuryVote(finalistId)
```
- Triggers for each jury vote received at finale
- `finalistId`: Player ID who received the vote
- Call once per vote received (e.g., if player gets 5 votes, call 5 times)

### Minor Positive Events (Medium XP Rewards)

#### POV_USED (+80 XP)
```javascript
window.ProgressionEvents.onPOVUsed(userId, savedId)
```
- Triggers when Power of Veto is used at the veto ceremony
- `userId`: Player ID who used the veto
- `savedId`: Player ID who was saved (could be same as userId)
- Alternative hooks: `onVetoUsedOnSelf` and `onVetoUsedOnOther` still work

#### SURVIVE_NOMINATION (+75 XP)
```javascript
window.ProgressionEvents.onSurviveNomination(survivorId)
```
- Triggers when a player survives being nominated (wasn't evicted)
- `survivorId`: Player ID who survived
- Call at eviction ceremony for the nominee who stays

#### SURVIVE_TIE (+90 XP)
```javascript
window.ProgressionEvents.onSurviveTie(survivorId, votes)
```
- Triggers when a player survives a tied eviction vote
- `survivorId`: Player ID who survived the tie
- `votes`: Number of votes in the tie
- Implies HOH broke the tie in their favor

#### SAVED_BY_VETO (+60 XP)
```javascript
window.ProgressionEvents.onSavedByVeto(savedId, vetoUserId)
```
- Triggers when a player is saved from nomination by someone else's veto use
- `savedId`: Player ID who was saved
- `vetoUserId`: Player ID who used the veto
- Only award if veto was used by someone else (not self-save)

#### CLEAN_WEEK (+100 XP, max 1/week)
```javascript
window.ProgressionEvents.onCleanWeek(playerId)
```
- Triggers when a player completes a week without being nominated
- `playerId`: Player ID who had a clean week
- Only call once per player per week (capped by XP rules)
- Should be called at end of eviction/week transition

#### COMP_2ND_PLACE (+40 XP)
```javascript
window.ProgressionEvents.onComp2ndPlace(playerId, compType)
```
- Triggers when a player places 2nd in a competition
- `playerId`: Player ID who placed 2nd
- `compType`: Type of competition (e.g., 'HOH', 'POV', 'Special')

#### COMP_3RD_PLACE (+25 XP)
```javascript
window.ProgressionEvents.onComp3rdPlace(playerId, compType)
```
- Triggers when a player places 3rd in a competition
- `playerId`: Player ID who placed 3rd
- `compType`: Type of competition (e.g., 'HOH', 'POV', 'Special')

### Negative Events (XP Loss)

All negative events respect the XP floor at 0 - total XP cannot drop below 0.

#### SKIP_COMPETITION (-30 XP)
```javascript
window.ProgressionEvents.onSkipCompetition(playerId, compType)
```
- Triggers when a player chooses not to participate in a competition
- `playerId`: Player ID who skipped
- `compType`: Type of competition skipped
- Only for voluntary non-participation (not when ineligible)

#### LAST_PLACE_COMP (-20 XP)
```javascript
window.ProgressionEvents.onLastPlaceComp(playerId, compType)
```
- Triggers when a player places last in a competition
- `playerId`: Player ID who placed last
- `compType`: Type of competition

#### EVICTED (Dynamic XP Loss)
```javascript
window.ProgressionEvents.onEvicted(playerId, placement, totalPlayers)
```
- Triggers when a player is evicted from the house
- `playerId`: Player ID who was evicted
- `placement`: Final placement (1 = winner, 2 = runner-up, etc.)
- `totalPlayers`: Total number of players in the season

**Dynamic Penalty Rules:**
- **No penalty** if evicted at Final 5 or later (remainingPlayers <= 5)
- Early eviction (Week 1-2): -100 XP
- Week 3-4: -75 XP
- Week 5-6: -50 XP
- Week 7+: -25 XP minimum

Example:
```javascript
// Player evicted in Week 1, placement 16 of 16 (first out)
window.ProgressionEvents.onEvicted('p1', 16, 16); // ~-100 XP

// Player evicted in Week 5, placement 8 of 16
window.ProgressionEvents.onEvicted('p2', 8, 16); // ~-50 XP

// Player evicted at Final 5 (5th place)
window.ProgressionEvents.onEvicted('p3', 5, 16); // No penalty (0 XP change)
```

### Legacy Events (Still Supported)

These events are from the original implementation and continue to work:

#### NOMINATED (-25 XP)
```javascript
window.ProgressionEvents.onNominations(nomineeIds = [])
```
- Call when nominations are locked
- `nomineeIds`: Array of nominated player IDs

#### SURVIVE_EVICTION (+100 XP)
```javascript
window.ProgressionEvents.onSurviveEviction(survivorId)
```
- Call when a player survives eviction night
- Similar to SURVIVE_NOMINATION but higher XP

#### CAST_CORRECT_VOTE (+15 XP)
```javascript
window.ProgressionEvents.onCorrectVote(voterId)
```
- Call when a player votes with the majority
- `voterId`: Player ID who voted correctly

#### RECEIVED_VOTES_AGAINST (-10 XP per vote)
```javascript
window.ProgressionEvents.onEvictionVotes(targetId, voteCount, voters = [])
```
- Call to log votes against a player
- `targetId`: Player who received votes
- `voteCount`: Number of votes against them
- `voters`: Array of player IDs who voted

#### TIEBREAKER_WIN (+75 XP)
```javascript
window.ProgressionEvents.onTiebreakerWin(hohId)
```
- Call when HOH breaks a tie
- `hohId`: Player ID of HOH who broke the tie

## Event Metadata

All events are logged with:
- `seasonId`: Current season (default: 1)
- `week`: Current week number (from `window.game.week`)
- `playerId`: Affected player's ID
- `payload`: Additional event-specific data

Example logged event:
```javascript
{
  eventType: 'HOH_WIN',
  seasonId: 1,
  week: 3,
  playerId: 'p1',
  payload: {},
  timestamp: 1234567890
}
```

## Integration Example

```javascript
// HOH Competition Phase
function completeHOHCompetition(results) {
  const winner = results.winner;
  const participants = results.allPlayers;
  
  // Award placements
  if (results.second) {
    window.ProgressionEvents.onComp2ndPlace(results.second, 'HOH');
  }
  if (results.third) {
    window.ProgressionEvents.onComp3rdPlace(results.third, 'HOH');
  }
  if (results.last) {
    window.ProgressionEvents.onLastPlaceComp(results.last, 'HOH');
  }
  
  // Award winner
  window.ProgressionEvents.onHOHWin(winner, participants);
}

// Eviction Phase
function evictPlayer(playerId, votes) {
  const placement = calculatePlacement(playerId);
  const totalPlayers = game.players.length;
  
  // Log eviction
  window.ProgressionEvents.onEvicted(playerId, placement, totalPlayers);
  
  // Award survivor
  const survivor = getNomineeWhoStayed();
  if (survivor) {
    window.ProgressionEvents.onSurviveNomination(survivor);
  }
}

// Finale
function awardWinner(winnerId, juryVotes) {
  // Log winner
  window.ProgressionEvents.onFinalWinner(winnerId);
  
  // Log each jury vote
  juryVotes.forEach(vote => {
    window.ProgressionEvents.onJuryVote(vote.finalistId);
  });
  
  // Check for unanimous win
  if (juryVotes.every(v => v.finalistId === winnerId)) {
    window.ProgressionEvents.onWonAllJuryVotes(winnerId, juryVotes.length);
  }
}
```

## Testing

A comprehensive integration test is available at:
- `test_progression_events_integration.html`

Run tests to verify:
- ✅ All event hooks exist and work
- ✅ Feature flag gating (ON/OFF)
- ✅ XP floor at 0 (cannot go negative)
- ✅ Dynamic EVICTED penalties
- ✅ All positive and negative events
- ✅ Mock event dispatch and API

## XP Rules Summary

| Event Type | XP Value | Category | Notes |
|------------|----------|----------|-------|
| WON_FINAL | +500 | Major | Winner of the season |
| WON_ALL_JURY_VOTES | +300 | Major | Perfect game bonus |
| HOH_WIN | +150 | Major | Head of Household |
| POV_WIN | +125 | Major | Power of Veto |
| WON_PUBLIC_FAVORITE | +100 | Major | Public vote |
| CLEAN_WEEK | +100 | Minor | Max 1/week |
| SURVIVE_EVICTION | +100 | Minor | Legacy event |
| SURVIVE_TIE | +90 | Minor | Tiebreaker survivor |
| POV_USED | +80 | Minor | Used veto |
| SURVIVE_NOMINATION | +75 | Minor | Survived block |
| SAVED_BY_VETO | +60 | Minor | Saved by other |
| WON_JURY_VOTE | +50 | Minor | Per vote |
| COMP_2ND_PLACE | +40 | Minor | Runner-up |
| COMP_3RD_PLACE | +25 | Minor | Third place |
| NOMINATED | -25 | Negative | Nominated |
| LAST_PLACE_COMP | -20 | Negative | Last place |
| SKIP_COMPETITION | -30 | Negative | Voluntary skip |
| EVICTED | Variable | Negative | -100 to 0 based on placement |

## Notes

- XP totals are computed from the event log (event sourcing)
- Changing rules does not affect historical events
- The system uses IndexedDB with in-memory fallback
- All operations are async and return Promises
- Feature flag OFF = safe no-ops (no errors)
