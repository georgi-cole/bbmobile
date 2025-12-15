# Enhanced DR Narratives - Feature Documentation

## Overview

The Diary Room (DR) section now features organic, narrative-driven logs that bring AI interactions to life. The system automatically detects and describes relationships, highlights dramatic moments, and generates engaging phase summaries.

## Features

### 1. Expanded Social Action Templates

Each social action now has multiple narrative variations for more natural and engaging logs:

**Actions with Enhanced Templates:**
- `compliment` - Praise and admiration (8 variations)
- `flirt` - Romantic interactions with personality (8 variations)
- `gossip` - House rumors and secrets (8 variations)
- `strategize` - Game planning and alliances (8 variations)
- `backstab` - Betrayals and trust-breaking (7 variations)
- `lie` - Deception and manipulation (7 variations)
- `insult` - Confrontations and shade (7 variations)
- `comfort` - Emotional support (7 variations)
- And more...

**New Action Types:**
- `small_talk` - Casual conversations
- `confide` - Sharing personal thoughts
- `form_alliance` - Explicit alliance formation
- `group_hangout` - Multi-player social interactions
- `spread_rumor` - Reputation damage
- `confront` - Direct confrontations
- `mediate` - Peacemaking
- `observe` - Strategic observation

### 2. Relationship-Aware Logging

The system automatically detects and describes relationship changes:

#### Alliance Formation (Bond: 0.4+)
- 🤝 "A strong alliance has formed between Alex and Bailey"
- 🤝 "New alliance alert: Alex and Bailey are working together"
- 💪 "The alliance between Alex and Bailey grew stronger"

#### Romance Development (Bond: 0.6+)
- 💕 "Romance is brewing between Casey and Drew"
- 💖 "Showmance confirmed: Casey and Drew"
- 💖 "Love is in the air! Casey and Drew are now a couple"

#### Rivalry Formation (Bond: -0.3 to -0.5)
- ⚔️ "A rivalry has formed between Ellie and Finn"
- 🔥 "The feud between Ellie and Finn intensified"
- 🔥 "War is brewing between Ellie and Finn"

#### Trust Broken (Large negative shift)
- 💔 "Betrayal! Alex turned on Bailey"
- 💔 "Alex and Bailey's friendship shattered"

#### Reconciliation (Negative to positive shift)
- 🕊️ "Peace was made between Alex and Bailey"
- 🕊️ "Alex and Bailey patched things up"

### 3. Enhanced Phase Summaries

Phase end summaries now highlight the most dramatic and significant moments:

#### Categories:
- 🎭 **Dramatic**: Major betrayals, rivalries, shocking moments
- 🎯 **Strategic**: Alliance formations, strategic moves
- 💬 **Social**: Relationship updates, social dynamics
- 📝 **General**: Overall phase statistics

#### Example Summaries:
```
🎭 Week 3 Drama Report: 💔 A major betrayal occurred between Bailey and Casey
💬 This week in the house: 🤝 New alliance alert: Alex and Bailey are working together
🎯 Week 3 game changers: 3 strategic moves were made
```

### 4. Automatic Highlight Extraction

The system analyzes all phase actions and bond shifts to identify:
- Top 3 most significant relationship changes
- Most dramatic actions (backstabs, betrayals, confrontations)
- Strategic clustering (multiple alliances, strategic moves)

## Technical Implementation

### Bond Thresholds

```javascript
ROMANCE_THRESHOLD = 0.6       // Romance confirmed
ALLIANCE_THRESHOLD = 0.4      // Alliance formed
RIVALRY_THRESHOLD = -0.3      // Rivalry detected
ENEMY_THRESHOLD = -0.5        // Strong enemies
SIGNIFICANT_CHANGE = 0.15     // Notable bond shift
```

### API Functions

#### `DiaryTemplates.analyzeRelationship(bondBefore, bondAfter)`
Analyzes bond change and returns relationship type:
- `'alliance_formed'` - New alliance detected
- `'alliance_strengthened'` - Existing alliance grew
- `'romance_developing'` - Romance starting
- `'romance_blossomed'` - Romance confirmed
- `'rivalry_formed'` - New rivalry
- `'rivalry_intensified'` - Rivalry escalated
- `'trust_broken'` - Major betrayal
- `'reconciliation'` - Enemies became friends

#### `DiaryTemplates.generateNarrative(actor, target, actionType, bondBefore, bondAfter, outcome)`
Generates a complete narrative with relationship context and emojis.

#### `DiaryTemplates.getRelationshipTemplate(type, player1, player2)`
Returns a formatted relationship description for the given type.

#### `DiaryTemplates.getPhaseSummaryTemplate(type)`
Returns a phase summary template for the given category (dramatic, strategic, social, general).

### Event Integration

The system listens to these events:
- `social.action:result` - Individual social actions
- `bond.shift` - Bond changes between players
- `social.phase:end` - Phase completion with highlights

### Backwards Compatibility

All enhancements are backwards compatible:
- Falls back to simple templates when bond data is unavailable
- Works with existing Social Maneuvers and socialSimulator systems
- No breaking changes to existing APIs

## Testing

### Automated Tests
```bash
# Run Node.js test
node test_dr_narratives_node.mjs
```

### Interactive Browser Test
Open `test_dr_enhanced_narratives.html` in a browser and run:
1. Setup Mock Game
2. Test Basic Interactions
3. Test Alliance Formation
4. Test Romance Development
5. Test Rivalry/Betrayal
6. Test Phase Summary
7. View All DR Entries

### Expected Results

**Alliance Test:**
```
Alex and Bailey forged a secret alliance. 🤝 Alex and Bailey have joined forces. ✨
```

**Romance Test:**
```
Alex gave Casey a flirtatious look. 💖 Alex and Casey have formed a strong romantic connection. ✨
```

**Rivalry Test:**
```
Bailey backstabbed Casey. 💔 Betrayal! Bailey turned on Casey. 🎭
```

**Phase Summary:**
```
🎭 Week 3 Drama Report: 💔 A major betrayal occurred between Bailey and Casey.
💬 Social dynamics shifted: 🤝 New alliance alert: Alex and Bailey are working together.
💬 Social dynamics shifted: 💖 Showmance confirmed: Alex and Casey.
```

## Configuration

No additional configuration required. The system works automatically with:
- Social Maneuvers system
- Social AI Scheduler
- Diary Room Logger

## Future Enhancements

Possible future additions:
- Player personality-based narrative variations
- Historical context (e.g., "After weeks of tension, Alex finally confronted Bailey")
- Multi-player dynamics (love triangles, group alliances)
- Seasonal/thematic narrative styles
- Custom emoji/icon sets

## Files Modified

- `js/dr/diaryTemplates.js` - Core template and narrative system
- `js/dr/diaryRoomLogger.js` - Event handlers and highlight extraction
- `js/dr/socialSimulator.js` - Bond context emission
- `test_dr_enhanced_narratives.html` - Interactive test suite
- `test_dr_narratives_node.mjs` - Automated test suite

## Credits

Enhanced as part of Issue: "Add more organic logs in DR section Social tab for AI interactions and summaries"

**Benefits Achieved:**
✅ More immersive simulation of house life
✅ Engaging diary room entries with personality
✅ AI-to-AI interactions feel organic and real
✅ Summaries highlight interesting and fun moments
✅ Relationship dynamics (alliances, romances, rivalries) are clearly visible
