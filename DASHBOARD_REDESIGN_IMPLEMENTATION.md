# Dashboard Redesign Implementation Guide

## Overview
This document describes the complete dashboard redesign including dynamic title, structured information rows, and hourglass timer animation.

## Implementation Details

### Files Changed
1. `index.html` - Restructured dashboard with new row layout and hourglass
2. `styles.css` - Modern badge styling and hourglass animations
3. `js/ui.hud-and-router.js` - Dynamic title generation and HUD updates

### Features

#### 1. Dynamic Title
- **Before game**: "House"
- **During game**: "Week X – [Phase Name]"
  - Examples: "Week 1 – HOH Competition", "Week 3 – Nominations", "Week 7 – Eviction"
- **Final 2**: "Final Week"
- Readable phase names (not technical codes)

#### 2. Structured Information Rows

**Row 1: HOH / POV**
- Side-by-side layout
- HOH: Gold gradient badge
- POV: Green gradient badge
- Responsive stacking on mobile

**Row 2: Nominees**
- Individual badges for each nominee
- Warning/yellow gradient styling
- Horizontal flex layout with wrapping

**Row 3: Alive / Evicted**
- Alive count: Green gradient badge
- Evicted count: Red gradient badge
- Tracks game progression

#### 3. Timer Section with Hourglass
- "Time Remaining" label
- Large digital timer display (2rem, bold)
- Skip button positioned in timer header
- Animated SVG hourglass below
  - Top sand empties as time counts down
  - Bottom sand fills as time progresses
  - Flowing sand particle animation at center

### Badge Color Scheme
- **HOH**: Gold (#f4d03f → #e6a900)
- **POV**: Green (#77d58d → #4fb369)
- **Nominees**: Warning yellow (#f2ce7b → #daa950)
- **Alive**: Green (#77d58d → #4fb369)
- **Evicted**: Red (#ff6d6d → #d64545)

### Phase Names Mapping
```javascript
{
  'opening': 'Season Premiere',
  'intermission': 'Strategizing',
  'hoh': 'HOH Competition',
  'nominations': 'Nominations',
  'veto_comp': 'Veto Competition',
  'veto': 'Veto Competition',
  'veto_ceremony': 'Veto Ceremony',
  'livevote': 'Eviction',
  'jury': 'Jury Deliberation',
  'return_twist': 'Return Challenge',
  'final3_comp1': 'Final 3 – Part 1',
  'final3_comp2': 'Final 3 – Part 2',
  'final3_decision': 'Final 3 – Decision',
  'social': 'Social Time'
}
```

## Technical Details

### CSS Structure
- `.dashboard-row`: Flexbox container for each info row
- `.dashboard-info-item`: Individual info items with labels
- `.dashboard-badge`: Styled badges with gradients
- `.dashboard-nominees`: Container for nominee badges
- `.nominee-badge`: Individual nominee badge styling
- `.dashboard-timer-section`: Timer area container
- `.dashboard-timer-header`: Timer label and display row
- `.hourglass-container`: SVG hourglass wrapper

### JavaScript Functions
- `computeWeekTitle()`: Generates dynamic title based on game state and phase
- `getReadablePhaseName(phase)`: Converts technical phase names to readable text
- `updateHud()`: Updates all dashboard elements including nominees as badges
- `keepSingleSkip()`: Moves skip button to timer header

### Responsive Design
- Mobile: Vertical stacking with full-width items
- Tablet/Desktop: Horizontal layout with grid
- Flexible wrapping for nominees
- Min-width constraints on badges

## Screenshots

### Before Game
Title: "House"
All badges show initial/empty state

### During Game
Title changes dynamically:
- "Week 1 – Season Premiere"
- "Week 1 – HOH Competition"  
- "Week 1 – Nominations"
- "Week 1 – Veto Competition"
- etc.

HOH winner, nominees, and counts update in real-time

## Commit Reference
- Initial Hourglass: commit `69c604c`
- Full Redesign: commit `dfd1f93`
- Branch: `copilot/add-hourglass-progress-indicator-2`
