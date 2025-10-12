# Settings System Quick Reference

## 🎯 Quick Start: Adding a New Setting

### Step 1: Add Default Value
**File:** `js/config/defaults.js`
```javascript
const DEFAULT_CFG = {
  // ... existing settings
  myNewSetting: true,  // ← Add here
};
```

### Step 2: Add to Registry
**File:** `js/settings/registry.js`
```javascript
{
  id: 'general',  // Choose appropriate tab
  label: 'General',
  groups: [
    {
      title: 'My Group',
      fields: [
        checkbox('myNewSetting', 'Enable my new feature'),  // ← Add here
      ]
    }
  ]
}
```

### Step 3: (Optional) Add Side Effect
**File:** `js/settings/effects.js`
```javascript
const EFFECT_HANDLERS = {
  myNewSetting: function(value, cfg){
    // Code to run when this setting changes
    if(value) {
      console.log('Feature enabled!');
    }
  }
};
```

That's it! The setting will automatically appear in the UI and persist to localStorage.

## 📋 Available Field Types

### Checkbox
```javascript
checkbox('myToggle', 'Enable feature')
```

### Number Input
```javascript
number('myTimer', 'Duration (seconds)', min, max, step)
// Example:
number('tHOH', 'HOH Competition', 5, 600, 5)
```

### Select Dropdown
```javascript
select('myOption', 'Choose option', [
  {value: 'a', label: 'Option A'},
  {value: 'b', label: 'Option B'}
])
```

### Raw HTML (for complex controls)
```javascript
html('<div class="custom-control">...</div>')
```

## 🔧 System Architecture

```
Settings Flow:
1. User opens Settings → js/settings/render.js
2. Modal generated from → js/settings/registry.js
3. User changes setting → stored in bb_cfg_v2 (localStorage)
4. Side effects applied via → js/settings/effects.js
5. Config loaded from → js/config/defaults.js
```

## 📚 Available Tabs

1. **General** - Interface, quality of life
2. **Cast** - Player editor (custom mount)
3. **Gameplay** - Game features and twists
4. **Timing** - All timer settings
5. **Visual** - Theme, avatars, effects
6. **Audio** - Music and sound effects
7. **Advanced** - Data export/import, danger zone
8. **Debug** - Developer tools

## 🎨 Adding a New Tab

```javascript
// In js/settings/registry.js
const TAB_REGISTRY = [
  // ... existing tabs
  {
    id: 'mynewtab',
    label: 'My New Tab',
    groups: [
      {
        title: 'Section Title',
        fields: [
          checkbox('setting1', 'Setting 1'),
          number('setting2', 'Setting 2', 0, 100, 1)
        ]
      }
    ]
  }
];
```

## 🔌 Custom Tab Mounting (Advanced)

For complex tabs that need custom rendering (like Cast editor):

```javascript
// 1. In registry
{
  id: 'mycustomtab',
  label: 'My Custom Tab',
  mount: 'mountMyCustomTab'  // Function name
}

// 2. Create mount function globally
window.mountMyCustomTab = function(pane, modal){
  pane.innerHTML = '<div>My custom HTML</div>';
  // Wire up event handlers, etc.
};
```

## 💾 Storage

- **Key:** `bb_cfg_v2`
- **Location:** `localStorage`
- **Format:** JSON object with all settings
- **Default values:** Merged from `js/config/defaults.js`

## 🔍 Debugging

Check current config in console:
```javascript
// View all settings
console.log(window.game.cfg);

// View specific setting
console.log(window.game.cfg.myNewSetting);

// View stored settings
console.log(JSON.parse(localStorage.getItem('bb_cfg_v2')));
```

## ⚠️ Important Notes

- Settings persist across page reloads
- Side effects only trigger when settings change
- Default values are always merged first
- The Cast tab uses a custom mount function
- Old `js/settings.js` is deprecated and not loaded

## 📖 Full Documentation

See `MIGRATION_SETTINGS.md` for complete migration guide and detailed documentation.
