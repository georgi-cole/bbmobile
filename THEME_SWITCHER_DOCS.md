# Theme Switcher Documentation

## Overview
The Big Brother Mobile Game features two modern, stylish themes designed for optimal viewing experience: TV Studio (dark) and Modern Big Brother House (light). Each theme includes custom colors, textures, and visual effects optimized for the game interface.

## Available Themes

### 1. TV Studio (Default - Dark Theme)
- **Description:** Dark theme with neon cyan accents and spotlight effects
- **Colors:** Deep dark backgrounds (#0a0a12) with bright cyan (#00d9ff) accents
- **Texture:** Neon grid with spotlight effects and geometric patterns
- **Best for:** Dramatic TV studio atmosphere, high contrast viewing
- **Visual Style:** Modern broadcast studio with neon lighting and grid overlays
- **Roster Styling:** Cyan borders with neon glow effects

### 2. Modern Big Brother House (Light Theme)
- **Description:** Clean light theme with glassmorphism and soft accents
- **Colors:** Light backgrounds (#f5f5fa) with purple/blue accents (#6b8fff)
- **Texture:** Soft glassmorphism with light ray effects
- **Best for:** Comfortable daytime viewing, contemporary aesthetic
- **Visual Style:** Professional, clean, with subtle depth and transparency
- **Roster Styling:** Purple borders with soft glow effects

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
Add an option to the theme selector in `js/ui.config-and-settings.js` (buildVisualPaneHTML function):

```javascript
'<option value="mytheme">My Custom Theme - Description</option>',
```

### Step 4: Test Your Theme
1. Refresh the page (hard refresh with Ctrl+Shift+R may be needed)
2. Open Settings → Visual tab
3. Select your new theme from the dropdown
4. Verify all UI elements look correct

## Modern Design Features

### Theme-Aware Roster Styling
The top roster (houseguest avatars) adapts to the active theme:
- **Theme-specific CSS variables** for gradients, borders, and glow effects
- `--roster-gradient-1` and `--roster-gradient-2` for background gradients
- `--roster-border` for border colors
- `--roster-glow` for base glow effect
- `--roster-hover-glow` for enhanced hover glow

### Enhanced Hover Effects
Roster tiles feature modern hover interactions:
- **Transform**: Scale (1.05x) with vertical lift (-6px translateY)
- **Glass reflection**: Overlay gradient on hover
- **Avatar zoom**: Scale and brightness increase
- **Smooth animations**: Cubic-bezier transitions for premium feel

### TV Section Enhancement
- **Default background**: Uses `assets/videos/tvscreen.jpg`
- **Blended overlay**: Semi-transparent gradient (70-80%) to avoid distraction
- **Custom background support**: Maintains `.hasTvBg` class for user uploads

### Glassmorphism Effects
Cards and UI elements feature glassmorphism with:
- `backdrop-filter: blur(12px)` for frosted glass effect
- Semi-transparent backgrounds with gradient overlays
- Enhanced border highlights with accent colors
- Subtle glow effects on interactive elements

### Enhanced Buttons
Buttons are designed with:
- **Pill shape** (border-radius: 999px) for modern look
- **Gradient backgrounds** using CSS linear-gradients
- **Layered shadows** with glow effects on hover
- **Shine animation** on hover for premium feel

### Rich Textures
Textures are highly visible (opacity 0.35-0.5):
- Neon grids with spotlight effects (TV Studio)
- Glassmorphism with light rays (Modern House)
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
