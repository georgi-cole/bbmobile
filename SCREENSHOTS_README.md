# POV Twists Screenshots

This directory contains visual mockups of the POV Twist implementation.

## Screenshot Files

Open these HTML files in your browser to see the mockups:

### 1. Settings Modal - Week Twists
**File**: `screenshot_settings_modal.html`

Shows the Settings → Gameplay → Week twists section with the new Golden POV and Diamond POV chance fields highlighted.

- Golden POV chance (🏆): 5% default
- Diamond POV chance (💎): 3% default

### 2. Golden POV Twist Announcement
**File**: `screenshot_golden_twist.html`

The TV modal that appears when Golden POV is activated at the start of a POV competition.

**Message**: "Twist alert! The Golden Power of Veto is in play. The POV holder will choose the replacement nominee (not the HOH)."

### 3. Diamond POV Twist Announcement
**File**: `screenshot_diamond_twist.html`

The TV modal that appears when Diamond POV is activated at the start of a POV competition.

**Message**: "Twist alert! The Diamond Power of Veto is in play. The POV holder may replace both nominees. The HOH cannot be named as a replacement."

### 4. Golden POV Ceremony - Replacement Selection
**File**: `screenshot_golden_ceremony.html`

Shows the ceremony interface when the POV holder (not HOH) selects a single replacement nominee under Golden POV rules.

**Features**:
- POV holder shown as the decision maker
- Grid of eligible houseguests
- Exclusions noted (HOH, self, saved player)

### 5. Diamond POV Ceremony - Both Nominees Selection
**File**: `screenshot_diamond_ceremony.html`

Shows the ceremony interface when the POV holder selects TWO new nominees under Diamond POV rules.

**Features**:
- POV holder shown as the decision maker
- Selection counter (1 of 2 selected)
- Grid of eligible houseguests
- Exclusions noted (HOH, self)
- Visual indicator for selected players

## How to View

1. Open any of the HTML files in a web browser
2. The mockup will display in full screen
3. Take a screenshot using your browser's screenshot tool or OS screenshot utility

## Automated Screenshots (Future)

The `screenshot_pov_twists.mjs` Puppeteer script can be used to automatically generate these screenshots when Puppeteer is installed:

```bash
npm install --save-dev puppeteer
node screenshot_pov_twists.mjs
```

However, these HTML mockups provide the same visual representation without requiring Puppeteer.

## Implementation Details

These mockups accurately represent:
- ✅ Settings UI with new fields
- ✅ Twist announcement modals (tone: 'twist')
- ✅ Golden POV ceremony flow
- ✅ Diamond POV ceremony flow
- ✅ Proper styling matching the game's UI
- ✅ Correct eligibility rules
- ✅ Dynamic authority indicators (POV Holder vs HOH)
