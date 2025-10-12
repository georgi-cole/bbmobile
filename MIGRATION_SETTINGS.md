# Settings System Migration Guide

## Overview

The settings system has been centralized into a registry-driven architecture. All settings tabs, groups, and fields are now defined in a single registry file, and the modal UI is dynamically generated.

## Architecture

### New Module Structure

```
js/
├── config/
│   └── defaults.js       # Central config defaults + load/save helpers
├── settings/
│   ├── registry.js       # Tab/group/field definitions (THE SINGLE SOURCE OF TRUTH)
│   ├── effects.js        # Side effect handlers (HUD updates, theming, etc.)
│   ├── cast-tab.js       # Cast editor tab mount and functionality
│   └── render.js         # Dynamic modal renderer and opener
```

### Legacy Files

- **js/settings.js** - DEPRECATED (no longer loaded in index.html)
- **js/ui.config-and-settings.js** - Still loaded for backward compatibility, but modal rendering logic superseded by new system

## Key Changes

### 1. Static Modal Removed

The static modal that was previously hard-coded in `index.html` has been removed. The settings modal is now dynamically generated from the registry.

**Before (index.html):**
```html
<div id="settingsModal" class="modal-backdrop">
  <div class="modal">
    <!-- Hard-coded tabs and fields -->
  </div>
</div>
```

**After (index.html):**
```html
<!-- Settings Modal - Now dynamically generated from js/settings/registry.js -->
```

### 2. Configuration Defaults Centralized

All configuration defaults are now in `js/config/defaults.js`:

```javascript
const DEFAULT_CFG = {
  fxCards: true,
  showTopRoster: true,
  colorblindMode: false,
  enableJuryHouse: true,
  // ... all other settings
};
```

**Storage Key:** `bb_cfg_v2` (unchanged for backward compatibility)

### 3. Registry-Driven Tab Definitions

All tabs, groups, and fields are defined in `js/settings/registry.js`:

```javascript
const TAB_REGISTRY = [
  {
    id: 'general',
    label: 'General',
    groups: [
      {
        title: 'Interface',
        fields: [
          checkbox('fxCards', 'Card reveal popups (FX cards)'),
          checkbox('showTopRoster', 'Show top roster above TV')
        ]
      }
    ]
  },
  // ... more tabs
];
```

### 4. Side Effects Centralized

Side effects (like HUD updates, theming) are now in `js/settings/effects.js`:

```javascript
const EFFECT_HANDLERS = {
  colorblindMode: function(value, cfg){
    document.body.classList.toggle('cb', !!value);
  },
  showTopRoster: function(value, cfg){
    global.updateHud?.();
  }
};
```

### 5. Cast Tab Extracted

The Cast editor tab logic has been extracted to `js/settings/cast-tab.js` and is mounted via a registry hook:

```javascript
{
  id: 'cast',
  label: 'Cast',
  mount: 'mountCastTab'  // Calls window.mountCastTab(pane, modal)
}
```

## Adding New Settings

### Step 1: Add Default Value

Edit `js/config/defaults.js`:

```javascript
const DEFAULT_CFG = {
  // ... existing settings
  myNewSetting: true  // Add your new setting with default value
};
```

### Step 2: Add Field to Registry

Edit `js/settings/registry.js`:

```javascript
{
  id: 'general',  // Choose appropriate tab
  label: 'General',
  groups: [
    {
      title: 'My Group',
      fields: [
        checkbox('myNewSetting', 'Enable my new feature'),
        number('myTimer', 'My timer (seconds)', 0, 300, 5),
        select('myOption', 'Choose option', [
          {value: 'a', label: 'Option A'},
          {value: 'b', label: 'Option B'}
        ])
      ]
    }
  ]
}
```

### Step 3: Add Side Effect (if needed)

Edit `js/settings/effects.js`:

```javascript
const EFFECT_HANDLERS = {
  myNewSetting: function(value, cfg){
    // Apply side effect when this setting changes
    if(value){
      console.log('My new feature is enabled!');
      // Trigger whatever you need
    }
  }
};
```

### That's it! No manual UI wiring required.

## Adding New Tabs

Add a new tab to `js/settings/registry.js`:

```javascript
const TAB_REGISTRY = [
  // ... existing tabs
  {
    id: 'experimental',
    label: 'Experimental',
    groups: [
      {
        title: 'Beta Features',
        fields: [
          checkbox('betaFeatureA', 'Enable Beta Feature A'),
          html('<div class="tiny muted">This feature is experimental.</div>')
        ]
      }
    ]
  }
];
```

## Custom Tab Mounting

For complex tabs that need custom rendering (like Cast editor):

1. Define mount function in `js/settings/registry.js`:

```javascript
{
  id: 'mycustomtab',
  label: 'My Custom Tab',
  mount: 'mountMyCustomTab'
}
```

2. Implement mount function globally:

```javascript
window.mountMyCustomTab = function(pane, modal){
  pane.innerHTML = '<div>My custom HTML</div>';
  // Wire up event handlers, etc.
};
```

## Migration Checklist

- [x] Create `js/config/defaults.js` with centralized defaults
- [x] Create `js/settings/registry.js` with all tab/field definitions
- [x] Create `js/settings/effects.js` with side effect handlers
- [x] Create `js/settings/render.js` with dynamic modal renderer
- [x] Create `js/settings/cast-tab.js` with Cast editor logic
- [x] Remove static modal from `index.html`
- [x] Update script loading in `index.html`
- [x] Preserve `bb_cfg_v2` storage key for backward compatibility
- [x] Cast tab functionality preserved and mounted via registry
- [x] All settings persist correctly

## Backward Compatibility

- **Storage Key:** `bb_cfg_v2` unchanged - existing saved settings will be loaded
- **Global API:** `window.openSettingsModal()` still works
- **Settings Button:** Automatically wires to `#btnOpenSettings`
- **Side Effects:** All existing side effects preserved (HUD updates, theming, etc.)
- **Cast Editor:** Full functionality preserved, including keyboard navigation, avatar upload, etc.

## Testing

1. Open the app
2. Click the Settings button (⚙️)
3. Verify all tabs load correctly
4. Verify Cast tab shows player roster and editor
5. Change settings and click "Apply" - verify changes take effect
6. Click "Save & Close" - verify settings persist after page reload
7. Try export/import settings
8. Try reset to defaults

## Benefits

✅ **Single source of truth** - All settings defined in one place (`registry.js`)  
✅ **No more manual UI wiring** - Modal is generated dynamically  
✅ **Centralized side effects** - Easy to see what happens when settings change  
✅ **Easy to extend** - Add new settings by editing registry only  
✅ **Better maintainability** - Clear separation of concerns  
✅ **Preserved functionality** - All existing features work as before  

## Future Improvements

- Add field validation
- Add conditional field visibility (show field B only if field A is checked)
- Add field grouping within cards
- Add search/filter for settings
- Add settings categories/sections
- Add settings import/export with versioning
