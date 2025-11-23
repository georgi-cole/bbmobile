// MODULE: theme-inline-contrast.js
// Ensures proper contrast for inline TV cards by automatically adjusting
// --theme-on-primary based on the luminance of --theme-primary
//
// Features:
// - Calculates luminance of theme primary color
// - Adjusts text color for light backgrounds (luminance > 0.65)
// - Provides fallback values if theme variables are missing
// - Runs once on DOMContentLoaded

(function ensureThemeContrast() {
  'use strict';

  /**
   * Convert hex color to RGB object
   * @param {string} hex - Hex color string (with or without #)
   * @returns {{r: number, g: number, b: number}}
   */
  function hexToRgb(hex) {
    const h = hex.replace('#', '');
    return {
      r: parseInt(h.substr(0, 2), 16),
      g: parseInt(h.substr(2, 2), 16),
      b: parseInt(h.substr(4, 2), 16)
    };
  }

  /**
   * Calculate relative luminance using sRGB color space
   * @param {number} r - Red (0-255)
   * @param {number} g - Green (0-255)
   * @param {number} b - Blue (0-255)
   * @returns {number} Relative luminance (0-1)
   */
  function calculateLuminance(r, g, b) {
    // Convert to 0-1 range
    const rs = r / 255;
    const gs = g / 255;
    const bs = b / 255;

    // Apply sRGB gamma correction
    const rLinear = rs <= 0.03928 ? rs / 12.92 : Math.pow((rs + 0.055) / 1.055, 2.4);
    const gLinear = gs <= 0.03928 ? gs / 12.92 : Math.pow((gs + 0.055) / 1.055, 2.4);
    const bLinear = bs <= 0.03928 ? bs / 12.92 : Math.pow((bs + 0.055) / 1.055, 2.4);

    // Calculate luminance using ITU-R BT.709 coefficients
    return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
  }

  /**
   * Extract color value from CSS color string
   * Handles rgb(), rgba(), hex, and CSS variables
   * @param {string} colorStr - CSS color string
   * @returns {string|null} Normalized hex color or null
   */
  function normalizeColor(colorStr) {
    if (!colorStr) return null;

    // Remove whitespace
    colorStr = colorStr.trim();

    // If it's already hex, return it
    if (/^#[0-9A-Fa-f]{6}$/.test(colorStr)) {
      return colorStr;
    }

    // Handle rgb/rgba format
    const rgbMatch = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (rgbMatch) {
      const r = parseInt(rgbMatch[1]).toString(16).padStart(2, '0');
      const g = parseInt(rgbMatch[2]).toString(16).padStart(2, '0');
      const b = parseInt(rgbMatch[3]).toString(16).padStart(2, '0');
      return `#${r}${g}${b}`;
    }

    return null;
  }

  /**
   * Adjust theme contrast based on primary color luminance
   */
  function adjustContrast() {
    const root = document.documentElement;
    
    // Get computed theme primary color
    let primaryColor = getComputedStyle(root).getPropertyValue('--theme-primary').trim();
    
    // If no theme primary, set fallback
    if (!primaryColor || primaryColor === '') {
      console.info('[ThemeContrast] No --theme-primary found, using fallback #2d3b55');
      root.style.setProperty('--theme-primary', '#2d3b55');
      primaryColor = '#2d3b55';
    }

    // Normalize color (handle var() references, rgb(), etc.)
    const normalizedColor = normalizeColor(primaryColor);
    if (!normalizedColor) {
      console.warn('[ThemeContrast] Could not normalize color:', primaryColor);
      // Set safe defaults
      root.style.setProperty('--theme-on-primary', '#ffffff');
      return;
    }

    // Calculate luminance
    let rgb;
    try {
      rgb = hexToRgb(normalizedColor);
    } catch (err) {
      console.warn('[ThemeContrast] Could not parse color:', normalizedColor, err);
      root.style.setProperty('--theme-on-primary', '#ffffff');
      return;
    }

    const luminance = calculateLuminance(rgb.r, rgb.g, rgb.b);
    
    console.info(`[ThemeContrast] Primary color: ${normalizedColor}, Luminance: ${luminance.toFixed(3)}`);

    // If luminance is high (light color), use dark text
    if (luminance > 0.65) {
      root.style.setProperty('--theme-on-primary', '#1d1d21');
      console.info('[ThemeContrast] Light background detected, using dark text');
    } else {
      // Dark or medium background, use light text
      root.style.setProperty('--theme-on-primary', '#ffffff');
      console.info('[ThemeContrast] Dark background detected, using light text');
    }
  }

  // Run on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', adjustContrast, { once: true });
  } else {
    // DOM already loaded
    adjustContrast();
  }

  // Re-run if theme changes (listen for custom event)
  window.addEventListener('theme:changed', function() {
    console.info('[ThemeContrast] Theme changed, recalculating contrast');
    adjustContrast();
  });

})();
