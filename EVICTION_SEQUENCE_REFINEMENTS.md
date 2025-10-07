# Final HOH Eviction Sequence Refinements

This document describes the refinements made to the Final HOH eviction sequence for improved pacing, dialogue, and jury vote anticipation.

## Overview

The final eviction sequence has been enhanced to provide better dramatic pacing, clearer information delivery, and more engaging player interactions during the climactic Final 3 eviction ceremony.

## Changes Implemented

### 1. Timer Pause/Resume System

**Files Modified:** `js/ui.hud-and-router.js`

Added phase timer pause and resume functionality to allow modals to pause the game clock while players make important decisions.

**New Functions:**
- `pausePhaseTimer()` - Pauses the phase timer and stores remaining time
- `resumePhaseTimer()` - Resumes the phase timer from where it was paused

**Implementation Details:**
- Timer state tracked via `game.timerPaused` boolean flag
- Remaining time stored in `game.pausedTimeRemaining`
- Timer tick function skips when `timerPaused` is true
- On resume, recalculates `game.endAt` based on stored remaining time

### 2. Enhanced Eviction Justification Modal

**Files Modified:** `js/competitions.js`

The eviction justification modal now pauses the phase timer, giving players unlimited time to type their reason without pressure.

**Changes:**
- Calls `pausePhaseTimer()` when modal opens
- Calls `resumePhaseTimer()` on both Cancel and Confirm actions
- Stores justification in `game.__lastEvictionJustification` for use in dialogue cards

### 3. Bronze Medalist Card (3rd Place)

**Files Modified:** `js/competitions.js`

Added a dramatic "🥉 Third Place" card that displays after the eviction decision, celebrating the houseguest who finished 3rd.

**Details:**
- Shows immediately after the eviction decision card
- Duration: 4500ms
- Displays: "🥉 Third Place", "[Player Name]", "finishes in 3rd place", "The Bronze Medalist"
- Uses 'warn' tone for visual distinction

### 4. Dialogue Cards System

**Files Modified:** `js/competitions.js`

Added dynamic dialogue between HOH and evicted houseguest based on their relationship.

**New Function:** `generateEvicteeReply(evictee, hoh)`

Generates contextual responses based on affinity levels:
- **Unkind replies** (affinity < -0.15): Spicy, confrontational responses
  - "You made the wrong choice, [name]. The jury will remember this."
  - "I hope you enjoy second place, [name]."
- **Neutral replies** (-0.15 to 0.15): Gracious, professional responses
  - "Good game, [name]. Best of luck in the finale."
  - "It's been a journey. May the best player win."
- **Kind replies** (affinity > 0.15): Supportive, encouraging responses
  - "I'm rooting for you, [name]. Go win this!"
  - "You've got this, [name]. Make me proud!"

**Card Sequence:**
1. HOH's reasoning card: `💬 [HOH Name]` with justification text (4000ms)
2. Evictee's reply card: `💬 [Evictee Name]` with dynamic response (4000ms)

### 5. Jury Vote Explanation Modal

**Files Modified:** `js/competitions.js`

Added a modal that explains the upcoming jury vote process, displayed immediately after dialogue cards.

**Modal Content:**
- Title: "Time for the Jury Vote"
- Emoji: ⚖️
- Subtitle: "The Jury will now cast their votes one by one.\n\nThe winner of Big Brother will be crowned after all votes are revealed."
- Duration: 5000ms minimum display time
- Tone: 'special' (purple gradient)

**Purpose:**
- Builds anticipation for the jury vote
- Ensures all players understand what's happening next
- Provides a dramatic pause between eviction and vote reveal

### 6. Pattern Match Timing Improvements

**Files Modified:** `js/minigames/gameUtils.js`

Increased memorization and replay timers for Pattern Match minigame to give players a fair chance.

**New Timings:**

| Difficulty | Reveal Duration | Time Limit | Pattern Length |
|------------|----------------|------------|----------------|
| Easy       | 8000ms (+3000) | 75000ms (+15000) | 4 shapes |
| Medium     | 6000ms (+3000) | 60000ms (+15000) | 6 shapes |
| Hard       | 4000ms (+2000) | 45000ms (+15000) | 8 shapes |

**Changes:**
- Easy: +60% memorization time, +25% replay time
- Medium: +100% memorization time, +33% replay time
- Hard: +100% memorization time, +50% replay time

### 7. Async Flow in finalizeFinal3Decision

**Files Modified:** `js/competitions.js`

Converted `finalizeFinal3Decision` to async function to properly sequence cards with await.

**Sequence:**
1. Decision card (5000ms) → await completion
2. Bronze medalist card (4500ms) → await completion
3. If justification exists:
   - HOH reasoning card (4000ms) → await completion
   - Evictee reply card (4000ms) → await completion
4. Jury vote explanation modal (5000ms min) → await completion
5. Start jury vote after 800ms pause

## Testing

A comprehensive test suite has been created at `test_eviction_sequence_refinements.html` to validate all changes.

**Test Categories:**
1. Timer Pause/Resume Functions
2. Pattern Match Timing Updates
3. Final Eviction Enhancements
4. Modal Integration
5. Dialogue System

**Test Results:**
The test validates code structure and implementation. Runtime testing should be done in-game during Final 3 eviction.

## Visual Flow

```
Final HOH Makes Decision
         ↓
[Timer Paused during Justification Modal]
         ↓
Decision Card (5s)
         ↓
Bronze Medalist Card (4.5s)
         ↓
[If Justification Provided]
HOH Reasoning Card (4s)
         ↓
Evictee Reply Card (4s)
         ↓
Jury Vote Explanation Modal (5s)
         ↓
[Brief Pause]
         ↓
Start Jury Vote Sequence
```

## Pacing Analysis

**Total Sequence Time (with justification):**
- Decision Card: 5s
- Bronze Card: 4.5s
- HOH Card: 4s
- Evictee Card: 4s
- Modal: 5s (minimum)
- Pause: 0.8s
- **Total: ~23.3 seconds** of dramatic, readable content

**Without Justification:**
- Decision Card: 5s
- Bronze Card: 4.5s
- Modal: 5s
- Pause: 0.8s
- **Total: ~15.3 seconds**

All timings ensure players have adequate time to read and absorb the content without feeling rushed.

## Implementation Notes

1. The timer pause system is designed to be reusable for other modals that require player input.
2. Affinity-based responses add personality and reflect player relationships throughout the game.
3. Card sequences use `await cardQueueWaitIdle()` to ensure proper ordering.
4. The bronze medalist card uses 'warn' tone (yellow/amber) to visually distinguish 3rd place.
5. Pattern Match timing improvements apply to all difficulties, making the game more accessible.

## Future Enhancements

Possible improvements for future iterations:
- Animated transitions between cards
- Sound effects for dialogue cards
- Camera zoom effects on speakers
- Player avatars on dialogue cards
- Customizable eviction phrases based on game events

## Files Changed

1. `js/ui.hud-and-router.js` - Timer pause/resume system
2. `js/competitions.js` - Eviction sequence enhancements, dialogue system, modals
3. `js/minigames/gameUtils.js` - Pattern Match timing adjustments
4. `test_eviction_sequence_refinements.html` - Test suite (new file)

## Compatibility

All changes are backward compatible and gracefully degrade if optional systems are unavailable:
- Checks for `showEventModal` existence before calling
- Checks for `pausePhaseTimer`/`resumePhaseTimer` before calling
- Uses optional chaining (`?.`) for all card queue operations
- Falls back gracefully if justification is not provided
