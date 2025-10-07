# Theme Switcher Documentation

## Overview
The Big Brother Mobile Game now includes a completely overhauled theme system featuring modern, stylish designs with gradients, glassmorphism, rich textures, and professional visual effects.

## Available Themes

All themes have been redesigned with:
- **Modern gradients** for depth and visual interest
- **Glassmorphism effects** with blur and transparency
- **Prominent textures** (glass, fabric, waves, neon) - not just flat colors
- **Enhanced shadows** and glow effects
- **Pill-shaped buttons** with gradient backgrounds
- **Rounded corners** on all UI elements
- **Professional spacing** and typography

### 1. Midnight Glass (Default)
- **Description:** Dark glassmorphism with blue/purple gradients
- **Colors:** Deep navy backgrounds with vibrant blue accents
- **Texture:** Prominent glass effect with radial gradients and vertical lines
- **Best for:** Sleek, modern look with professional appeal
- **Visual Style:** High-tech, premium feel with subtle transparency

### 2. Sunset Boulevard
- **Description:** Warm gradients with rich orange/pink hues
- **Colors:** Deep warm browns, vibrant orange and coral accents
- **Texture:** Visible fabric/weave pattern overlay
- **Best for:** Welcoming, energetic atmosphere
- **Visual Style:** Warm, inviting with textile-inspired design

### 3. Ocean Depths
- **Description:** Deep teal/blue with prominent wave textures
- **Colors:** Rich aquatic blues and teals with cyan accents
- **Texture:** Animated wave patterns with gradient fills
- **Best for:** Calm, flowing aesthetic
- **Visual Style:** Fluid, dynamic with aquatic inspiration

### 4. Neon Nights
- **Description:** Vibrant purple/pink gradients with neon glow effects
- **Colors:** Deep purple backgrounds with bright pink/magenta accents
- **Texture:** Neon glow circles and grid lines
- **Best for:** Bold, energetic, cyberpunk atmosphere
- **Visual Style:** High-energy with glowing neon aesthetics

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

**In `js/ui.config-and-settings.js` (buildVisualPaneHTML function):**
```javascript
'<option value="mytheme">My Custom Theme - Description</option>',
```

### Step 4: Test Your Theme
1. Refresh the page (hard refresh with Ctrl+Shift+R may be needed)
2. Open Settings → Visual tab
3. Select your new theme from the dropdown
4. Verify all UI elements look correct

## Modern Design Features

### Glassmorphism Effects
All themes now feature glassmorphism with:
- `backdrop-filter: blur(16px)` for frosted glass effect
- Semi-transparent backgrounds with gradient overlays
- Enhanced border highlights with accent colors
- Subtle glow effects on interactive elements

### Enhanced Buttons
Buttons have been completely redesigned:
- **Pill shape** (border-radius: 999px) for modern look
- **Gradient backgrounds** using CSS linear-gradients
- **Layered shadows** with glow effects on hover
- **Shine animation** on hover for premium feel
- **Active states** with accent color glows

### Rich Textures
Textures are now highly visible (opacity 0.35-0.5):
- Glass effects with radial gradients
- Fabric weave patterns
- Wave animations
- Neon glow grids
- All created with SVG data URLs for performance

### Typography
Enhanced typography with:
- Gradient text effects on headings
- Increased font weights (700) for better readability
- Improved letter-spacing and line-height
- Better visual hierarchy

## Creating Custom Textures

Themes include prominent texture overlays using SVG data URLs. These textures are applied to card elements via CSS pseudo-elements.

### Example Texture Pattern:
```css
--texture-overlay:url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='...' /%3E%3C/svg%3E");
```

**Tips for Modern Textures:**
- Make textures **prominent** (opacity: 0.35-0.5) for visibility
- Use **gradients** within SVG for depth
- Combine **multiple patterns** for richness
- Add **animation** with CSS for dynamic effects
- Test textures on different screen sizes
- SVG data URLs must be properly URL-encoded

## Default Theme

The default theme is now **Midnight Glass** (previously Classic):
1. Open Settings → Visual tab
2. Select "Midnight Glass - Dark Glassmorphism" from the dropdown

OR programmatically:
```javascript
window.ThemeSwitcher.applyTheme('midnight');
```

## Technical Details

### CSS Architecture
- Themes use CSS custom properties (CSS variables)
- Theme switching is achieved by changing the `data-theme` attribute on the `<body>` element
- All color references use `var(--variable-name)` for dynamic updates
- Enhanced with gradients, glassmorphism, and layered effects

### JavaScript API
```javascript
// Apply a theme
window.ThemeSwitcher.applyTheme('sunset');

// Get current theme
const current = window.ThemeSwitcher.getCurrentTheme();

// Get list of available themes
const themes = window.ThemeSwitcher.getAvailableThemes();
```

### Available Theme Keys
- `midnight` - Midnight Glass (default)
- `sunset` - Sunset Boulevard
- `ocean` - Ocean Depths
- `neon` - Neon Nights

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
