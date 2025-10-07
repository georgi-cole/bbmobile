# Theme Switcher Documentation

## Overview
The Big Brother Mobile Game now includes a theme switcher that allows users to customize the visual atmosphere of the game with different house-inspired themes.

## Available Themes

### 1. Classic (Default)
- **Description:** Original Big Brother dark blue theme
- **Colors:** Deep blue backgrounds, bright cyan accents
- **Best for:** Traditional Big Brother experience

### 2. Wooden House
- **Description:** Warm cabin vibes with woodgrain texture
- **Colors:** Warm browns, earthy tones, muted oranges
- **Texture:** Woodgrain pattern overlay on cards
- **Best for:** Cozy, rustic atmosphere

### 3. TV Studio
- **Description:** Bright professional broadcast look
- **Colors:** Cool grays, bright blues, professional lighting
- **Texture:** Studio light radial gradients
- **Best for:** Professional, broadcast-quality feel

### 4. Modern House
- **Description:** Sleek minimalist with fiber texture
- **Colors:** Dark grays, cool blues, clean whites
- **Texture:** Subtle crosshatch fiber pattern
- **Best for:** Contemporary, sleek aesthetic

## How to Use

### Switching Themes
1. Click the ⚙️ **Settings** button in the top navigation
2. Navigate to the **Visual** tab
3. Select your desired theme from the **House Theme** dropdown
4. The theme applies instantly - no page reload needed!

### Theme Persistence
Your theme preference is automatically saved to browser localStorage and will persist across sessions.

## How to Add New Themes

### Step 1: Define CSS Variables
Add a new theme block in `styles.css` after the existing theme definitions:

```css
/* Your Custom Theme */
body[data-theme="mytheme"]{
  --bg:#your-background-color;
  --card:#your-card-color;
  --card-2:#your-card-alt-color;
  --ink:#your-text-color;
  --muted:#your-muted-text;
  --muted-2:#your-muted-text-alt;
  --line:#your-border-color;
  --line-2:#your-border-alt;
  --accent:#your-accent-color;
  --accent-2:#your-accent-alt;
  --good:#your-success-color;
  --warn:#your-warning-color;
  --bad:#your-error-color;
  --primary-1:#your-button-1;
  --primary-2:#your-button-2;
  --primary-3:#your-button-3;
  --texture-overlay:url("data:image/svg+xml,..."); /* Optional texture */
  --texture-opacity:0.15;
}
```

### Step 2: Register Theme in JavaScript
Add your theme to the THEMES object in `js/theme-switcher.js`:

```javascript
const THEMES = {
  // ... existing themes ...
  mytheme: {
    name: 'My Custom Theme',
    description: 'Brief description of your theme'
  }
};
```

### Step 3: Add to UI Selector
Add an option to the theme selector in two places:

**In `js/settings.js` (buildVisualPaneHTML function):**
```javascript
'<option value="mytheme">My Custom Theme - Description</option>',
```

**In `index.html` (Features tab):**
```html
<option value="mytheme">My Custom Theme - Description</option>
```

### Step 4: Test Your Theme
1. Refresh the page (hard refresh with Ctrl+Shift+R may be needed)
2. Open Settings → Visual tab
3. Select your new theme from the dropdown
4. Verify all UI elements look correct

## Creating Custom Textures

Themes can include subtle texture overlays using SVG data URLs. These textures are applied to card elements via CSS pseudo-elements.

### Example Texture Pattern:
```css
--texture-overlay:url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='...' /%3E%3C/svg%3E");
```

**Tips:**
- Keep textures subtle (opacity: 0.08-0.2)
- Use simple patterns to avoid performance issues
- Test textures on different screen sizes
- SVG data URLs must be properly URL-encoded

## Reverting to Classic Theme

To return to the original theme:
1. Open Settings → Visual tab
2. Select "Classic - Original Big Brother" from the dropdown

OR programmatically:
```javascript
window.ThemeSwitcher.applyTheme('classic');
```

## Technical Details

### CSS Architecture
- Themes use CSS custom properties (CSS variables)
- Theme switching is achieved by changing the `data-theme` attribute on the `<body>` element
- All color references use `var(--variable-name)` for dynamic updates

### JavaScript API
```javascript
// Apply a theme
window.ThemeSwitcher.applyTheme('wooden');

// Get current theme
const current = window.ThemeSwitcher.getCurrentTheme();

// Get list of available themes
const themes = window.ThemeSwitcher.getAvailableThemes();
```

### Storage
Theme preferences are stored in localStorage under the key `bb_theme_preference`.

### Events
When a theme changes, a custom event is dispatched:
```javascript
document.addEventListener('themeChanged', (e) => {
  console.log('Theme changed to:', e.detail.theme);
});
```

## Troubleshooting

### Theme Not Applying
- **Hard refresh:** Press Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
- **Clear cache:** Clear browser cache and reload
- **Check console:** Open DevTools console for any error messages

### Colors Look Wrong
- Verify all CSS variables are defined for your theme
- Check that color values are valid CSS colors
- Ensure proper contrast ratios for accessibility

### Texture Not Showing
- Verify SVG data URL is properly encoded
- Check `--texture-opacity` value (should be 0.05-0.3)
- Ensure `.card::before` pseudo-element isn't being overridden

## Browser Compatibility
- Modern browsers with CSS custom properties support
- localStorage support required for theme persistence
- Tested on: Chrome, Firefox, Safari, Edge

## Performance
- Theme switching is instant (no page reload)
- Texture overlays use CSS pseudo-elements for optimal performance
- Minimal JavaScript overhead

## Future Enhancements
Potential additions for future versions:
- User-created custom themes
- Theme preview mode
- More texture options
- Time-based automatic theme switching
- Import/export theme configurations
