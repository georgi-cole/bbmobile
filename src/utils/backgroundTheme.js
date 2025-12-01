// MODULE: backgroundTheme.js
// Determines which background image to display based on:
// 1. Holiday override (Dec 20–Jan 1)
// 2. Weather override (geolocation + Open-Meteo API)
// 3. Seasonal fallback (winter snow, autumn rain chance)
// 4. Time-of-day base (sunrise, day, sunset, night)
//
// Enhanced with:
// - Fuzzy/typo-tolerant token matching for time-of-day and weather conditions
// - Robust fallback handling for missing/404 background images
// - Asset manifest validation
// - Telemetry for asset selection and fallback scenarios
//
// Emits: theme:bg-change event with { key, url, anchor, reason }
// Public API: init({ bus }), getCurrent(), updateTheme(), setAdaptive(), manualOverride()
// Dev API: __bgTestAll() - validate all manifest assets

(function(g) {
  'use strict';

  const ASSETS_BASE = 'assets/skins/';
  const DEFAULT_THEME_KEY = 'day';
  const DEFAULT_ASSET = 'daily-background.png';
  
  // Background asset mapping - corrected to use actual filenames
  // The snow asset was previously using a typo filename that doesn't exist
  const BACKGROUNDS = {
    sunrise: 'sunrise-background.png',
    day: 'daily-background.png',
    sunset: 'sunset-background.png',
    night: 'night-background.png',
    rain: 'rainy-background.png',
    // Fixed: use correct filename (night-snow-background.png exists in assets/skins/)
    snow: 'night-snow-background.png',
    snowday: 'snowday-background.png',
    thunderstorm: 'thunderstorm-background.png',
    xmasDay: 'xmas-day-background.png',
    xmasEve: 'xmas-eve-background.png',
    xmasy: 'xmas-day-background.png', // Alias to xmas-day for backwards compatibility
    xmasyNight: 'xmasy-night-background.png'
  };

  // Asset manifest for validation - canonical list of existing files
  const ASSET_MANIFEST = [
    'sunrise-background.png',
    'daily-background.png',
    'sunset-background.png',
    'night-background.png',
    'rainy-background.png',
    'night-snow-background.png',
    'snowday-background.png',
    'thunderstorm-background.png',
    'xmas-day-background.png',
    'xmas-eve-background.png',
    'xmasy-night-background.png'
  ];

  // Anchor suggestions per theme (CSS values for button column positioning)
  // These position the button column centered on screen with slight adjustments per theme
  const ANCHORS = {
    sunrise: { left: '50vw', top: '50vh' },
    day: { left: '50vw', top: '50vh' },
    sunset: { left: '50vw', top: '50vh' },
    night: { left: '50vw', top: '50vh' },
    rain: { left: '50vw', top: '50vh' },
    snow: { left: '50vw', top: '50vh' },
    snowday: { left: '50vw', top: '50vh' },
    thunderstorm: { left: '50vw', top: '50vh' },
    xmasDay: { left: '50vw', top: '50vh' },
    xmasEve: { left: '50vw', top: '50vh' },
    xmasy: { left: '50vw', top: '50vh' },
    xmasyNight: { left: '50vw', top: '50vh' }
  };

  let bus = null;
  let currentTheme = null;
  let lastSuccessfulTheme = null; // Track last successfully loaded theme for fallback
  let lastUpdate = 0;
  let weatherData = null;
  let weatherFetchTime = 0;
  let solarData = null;
  let userCoords = null;
  let adaptiveEnabled = true;
  let isUpdating = false; // Lock flag to prevent concurrent updates
  let geolocationAttempts = 0;

  const UPDATE_INTERVAL = 60 * 1000;       // Update theme every 1 minute
  const WEATHER_CACHE_DURATION = 15 * 60 * 1000; // Cache weather for 15 minutes
  const MAX_GEOLOCATION_ATTEMPTS = 2;

  // ===== UTILITY FUNCTIONS =====

  // Telemetry helper - logs to Telemetry system if available, otherwise console
  function logTelemetry(event, data = {}) {
    try {
      if (window.Telemetry && typeof window.Telemetry.log === 'function') {
        window.Telemetry.log(event, data);
      } else {
        console.info(`[BackgroundTheme:Telemetry] ${event}`, data);
      }
    } catch (err) {
      console.warn('[BackgroundTheme] Telemetry logging failed:', err);
    }
  }

  // Ensure alias is maintained in both namespaces
  let aliasBootstrapRun = false; // Singleton guard for alias bootstrap
  function ensureAlias() {
    if (!g.game) {
      g.game = {};
    }
    if (!g.game.BackgroundTheme) {
      g.game.BackgroundTheme = g.BackgroundTheme;
      if (!aliasBootstrapRun) {
        console.info('[BackgroundTheme] Alias established: window.game.BackgroundTheme -> window.BackgroundTheme');
        aliasBootstrapRun = true;
      } else {
        // Log duplicate attempt for telemetry
        logTelemetry('config_alias_bootstrap_duplicate_attempt', { suppressed: true });
      }
    }
  }

  // ===== FUZZY TOKEN MATCHING =====
  
  /**
   * Get FuzzyTokenMap utility if available
   * Falls back to identity function if not loaded
   */
  function getFuzzyTokenMap() {
    return g.FuzzyTokenMap || {
      canonicalizeTimeToken: (raw) => ({ canonical: raw, fuzzyApplied: false, original: raw }),
      canonicalizeConditionToken: (raw) => ({ canonical: raw, fuzzyApplied: false, original: raw })
    };
  }

  // ===== ASSET VALIDATION & PRELOADING =====

  /**
   * Check if a filename exists in the asset manifest
   * @param {string} filename - Asset filename to validate
   * @returns {boolean} True if valid
   */
  function isValidAsset(filename) {
    return ASSET_MANIFEST.includes(filename);
  }

  /**
   * Preload an image with fallback handling
   * Returns a promise that resolves with success status
   * @param {string} url - Full URL to the image
   * @param {number} timeout - Timeout in ms (default 5000)
   * @returns {Promise<{success: boolean, url: string, error?: string}>}
   */
  function preloadImage(url, timeout = 5000) {
    return new Promise((resolve) => {
      const img = new Image();
      let resolved = false;

      const timeoutId = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          console.warn(`[BackgroundTheme] Image preload timeout: ${url}`);
          logTelemetry('bg_asset_load_error', { url, error: 'timeout' });
          resolve({ success: false, url, error: 'timeout' });
        }
      }, timeout);

      img.onload = () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutId);
          logTelemetry('bg_asset_load_success', { url });
          resolve({ success: true, url });
        }
      };

      img.onerror = (err) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutId);
          const errorMsg = err?.message || '404/network error';
          console.warn(`[BackgroundTheme] Image preload failed: ${url}`, errorMsg);
          logTelemetry('bg_asset_load_error', { url, error: errorMsg });
          resolve({ success: false, url, error: errorMsg });
        }
      };

      img.src = url;
    });
  }

  /**
   * Resolve theme key with fuzzy matching and validation
   * If the resolved asset doesn't exist, falls back to default
   * @param {string} rawKey - Raw theme key (may contain typos)
   * @returns {{ key: string, filename: string, fuzzyApplied: boolean, valid: boolean }}
   */
  function resolveThemeKey(rawKey) {
    if (!rawKey) {
      return { key: DEFAULT_THEME_KEY, filename: DEFAULT_ASSET, fuzzyApplied: false, valid: true };
    }

    const FuzzyTokenMap = getFuzzyTokenMap();
    
    // First, check if rawKey is a direct match
    if (BACKGROUNDS[rawKey]) {
      const filename = BACKGROUNDS[rawKey];
      const valid = isValidAsset(filename);
      
      if (!valid) {
        console.warn(`[BackgroundTheme] Asset not in manifest: ${filename}, using default`);
        logTelemetry('bg_asset_invalid', { key: rawKey, filename, reason: 'not_in_manifest' });
        return { key: DEFAULT_THEME_KEY, filename: DEFAULT_ASSET, fuzzyApplied: false, valid: true };
      }
      
      return { key: rawKey, filename, fuzzyApplied: false, valid: true };
    }

    // Try fuzzy matching for time tokens
    const timeResult = FuzzyTokenMap.canonicalizeTimeToken(rawKey);
    if (timeResult.canonical && BACKGROUNDS[timeResult.canonical]) {
      const filename = BACKGROUNDS[timeResult.canonical];
      const valid = isValidAsset(filename);
      
      if (timeResult.fuzzyApplied) {
        console.info(`[BackgroundTheme] Fuzzy matched time token: "${rawKey}" -> "${timeResult.canonical}"`);
        logTelemetry('bg_asset_select', { 
          rawToken: rawKey, 
          canonicalToken: timeResult.canonical, 
          filename, 
          fuzzyApplied: true,
          tokenType: 'time'
        });
      }
      
      if (!valid) {
        console.warn(`[BackgroundTheme] Fuzzy-resolved asset not in manifest: ${filename}, using default`);
        logTelemetry('bg_asset_invalid', { key: timeResult.canonical, filename, reason: 'fuzzy_not_in_manifest' });
        return { key: DEFAULT_THEME_KEY, filename: DEFAULT_ASSET, fuzzyApplied: timeResult.fuzzyApplied, valid: true };
      }
      
      return { key: timeResult.canonical, filename, fuzzyApplied: timeResult.fuzzyApplied, valid: true };
    }

    // Unknown key - log and use default
    console.warn(`[BackgroundTheme] Unknown theme key: "${rawKey}", using default`);
    logTelemetry('bg_asset_invalid', { key: rawKey, reason: 'unknown_key' });
    return { key: DEFAULT_THEME_KEY, filename: DEFAULT_ASSET, fuzzyApplied: false, valid: true };
  }

  // Check if date falls within holiday period (Dec 20 – Jan 1)
  function isHolidayPeriod(date = new Date()) {
    const month = date.getMonth(); // 0-indexed (0=Jan, 11=Dec)
    const day = date.getDate();
    return (month === 11 && day >= 20) || (month === 0 && day <= 1);
  }

  // Get time of day based on current time and optional solar data
  function getTimeOfDay(now = new Date(), solar = null) {
    const hour = now.getHours();
    const minutes = now.getMinutes();
    const totalMinutes = hour * 60 + minutes;

    if (solar && solar.sunrise && solar.sunset) {
      // Use solar data with windows
      const sunrise = solar.sunrise;
      const sunset = solar.sunset;
      
      // Sunrise window: 45m before to 60m after sunrise
      const sunriseStart = sunrise - 45;
      const sunriseEnd = sunrise + 60;
      
      // Sunset window: 60m before to 30m after sunset
      const sunsetStart = sunset - 60;
      const sunsetEnd = sunset + 30;
      
      if (totalMinutes >= sunriseStart && totalMinutes < sunriseEnd) {
        return 'sunrise';
      } else if (totalMinutes >= sunriseEnd && totalMinutes < sunsetStart) {
        return 'day';
      } else if (totalMinutes >= sunsetStart && totalMinutes < sunsetEnd) {
        return 'sunset';
      } else {
        return 'night';
      }
    } else {
      // Fallback hour ranges
      if (hour >= 5 && hour < 9) {
        return 'sunrise';
      } else if (hour >= 9 && hour < 17) {
        return 'day';
      } else if (hour >= 17 && hour < 20) {
        return 'sunset';
      } else {
        return 'night';
      }
    }
  }

  // Deterministic daily rain chance for autumn (seeded by date)
  function shouldShowRain(date = new Date()) {
    const month = date.getMonth(); // 0-indexed
    const isAutumn = month >= 8 && month <= 10; // Sep–Nov (8, 9, 10)
    
    if (!isAutumn) return false;
    
    // Simple seeded random: use day of year as seed for 30% chance
    const dayOfYear = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
    const seed = dayOfYear * 2654435761; // Multiplicative hash
    const pseudo = (seed >>> 0) / 4294967296; // Normalize to 0-1
    
    return pseudo < 0.3; // 30% chance
  }

  // ===== GEOLOCATION & WEATHER =====

  async function requestGeolocation() {
    if (!navigator.geolocation) {
      console.info('[BackgroundTheme] Geolocation not available');
      logTelemetry('bg_geolocation_attempt', { attempt: 0, success: false, reason: 'not_available' });
      return null;
    }

    geolocationAttempts++;
    const attemptNum = geolocationAttempts;

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            lat: position.coords.latitude,
            lon: position.coords.longitude
          };
          console.info('[BackgroundTheme] Geolocation obtained:', coords);
          logTelemetry('bg_geolocation_attempt', { attempt: attemptNum, success: true });
          resolve(coords);
        },
        (error) => {
          console.info('[BackgroundTheme] Geolocation denied or failed:', error.message);
          logTelemetry('bg_geolocation_attempt', { attempt: attemptNum, success: false, reason: error.message });
          resolve(null);
        },
        { timeout: 10000, maximumAge: 300000 } // 5-minute cache
      );
    });
  }

  async function fetchWeather(coords) {
    const now = Date.now();
    
    // Return cached weather if still valid
    if (weatherData && weatherFetchTime && (now - weatherFetchTime) < WEATHER_CACHE_DURATION) {
      return weatherData;
    }

    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=rain,snowfall&daily=sunrise,sunset&timezone=auto&forecast_days=1`;
      
      const response = await fetch(url);
      if (!response.ok) {
        console.warn('[BackgroundTheme] Weather API failed:', response.status);
        return null;
      }

      const data = await response.json();
      
      // Parse current weather
      const current = data.current || {};
      const rain = current.rain || 0;
      const snow = current.snowfall || 0;
      
      // Parse solar times (sunrise/sunset in ISO format)
      const daily = data.daily || {};
      let sunriseMinutes = null;
      let sunsetMinutes = null;
      
      if (daily.sunrise && daily.sunrise[0]) {
        const sunriseDate = new Date(daily.sunrise[0]);
        sunriseMinutes = sunriseDate.getHours() * 60 + sunriseDate.getMinutes();
      }
      if (daily.sunset && daily.sunset[0]) {
        const sunsetDate = new Date(daily.sunset[0]);
        sunsetMinutes = sunsetDate.getHours() * 60 + sunsetDate.getMinutes();
      }
      
      weatherData = {
        rain: rain > 0,
        snow: snow > 0,
        updated: now
      };
      
      solarData = (sunriseMinutes !== null && sunsetMinutes !== null) ? {
        sunrise: sunriseMinutes,
        sunset: sunsetMinutes
      } : null;
      
      weatherFetchTime = now;
      
      console.info('[BackgroundTheme] Weather fetched:', weatherData, 'Solar:', solarData);
      logTelemetry('bg_weather_fetch', { 
        success: true, 
        rain: weatherData.rain, 
        snow: weatherData.snow,
        hasSolarData: !!solarData
      });
      return weatherData;
    } catch (error) {
      console.warn('[BackgroundTheme] Weather fetch failed:', error.message);
      logTelemetry('bg_weather_fetch', { success: false, error: error.message });
      return null;
    }
  }

  // ===== THEME SELECTION LOGIC =====

  function determineTheme() {
    const now = new Date();
    const timeOfDay = getTimeOfDay(now, solarData);
    let theme = timeOfDay; // Default to time-of-day
    let reason = `time-of-day (${timeOfDay})`;

    // Priority 1: Holiday override (Dec 20–Jan 1)
    if (isHolidayPeriod(now)) {
      if (timeOfDay === 'night') {
        theme = 'xmasyNight';
        reason = 'holiday (night)';
      } else if (timeOfDay === 'sunrise' || timeOfDay === 'day' || timeOfDay === 'sunset') {
        theme = 'xmasDay';
        reason = `holiday (${timeOfDay})`;
      } else {
        theme = 'xmasy';
        reason = 'holiday (default)';
      }
      return { theme, reason };
    }

    // Priority 2: Weather override (requires geolocation)
    if (weatherData) {
      if (weatherData.snow) {
        if (timeOfDay === 'night') {
          theme = 'snow';
          reason = 'weather (snow at night)';
        } else {
          // Use snowday for daytime snow instead of xmasDay
          theme = 'snowday';
          reason = `weather (snow during ${timeOfDay})`;
        }
        return { theme, reason };
      }
      
      if (weatherData.rain) {
        theme = 'rain';
        reason = 'weather (rain)';
        return { theme, reason };
      }
    }

    // Priority 3: Seasonal fallback (no weather)
    const month = now.getMonth();
    
    // Dec–Jan: prefer snow at night
    if ((month === 11 || month === 0) && timeOfDay === 'night') {
      theme = 'snow';
      reason = 'seasonal (winter night)';
      return { theme, reason };
    }
    
    // Sep–Nov: deterministic 30% daily chance for rain
    if (shouldShowRain(now)) {
      theme = 'rain';
      reason = 'seasonal (autumn rain)';
      return { theme, reason };
    }

    // Priority 4: Time-of-day base (already set as default)
    return { theme, reason };
  }

  // ===== PUBLIC API =====

  async function updateTheme(force = false) {
    if (!adaptiveEnabled && !force) {
      return; // Adaptive backgrounds disabled
    }

    // Prevent concurrent updates
    if (isUpdating) {
      console.info('[BackgroundTheme] Update already in progress, skipping');
      return;
    }

    const now = Date.now();
    if (!force && currentTheme && (now - lastUpdate) < UPDATE_INTERVAL) {
      return; // Too soon to update
    }

    isUpdating = true;

    try {
      // Try to get geolocation with retry logic
      if (!userCoords && geolocationAttempts < MAX_GEOLOCATION_ATTEMPTS) {
        userCoords = await requestGeolocation();
        
        // Retry once more if first attempt failed
        if (!userCoords && geolocationAttempts < MAX_GEOLOCATION_ATTEMPTS) {
          console.info('[BackgroundTheme] Retrying geolocation...');
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
          userCoords = await requestGeolocation();
        }
      }
      
      if (userCoords && (!weatherData || (now - weatherFetchTime) >= WEATHER_CACHE_DURATION)) {
        await fetchWeather(userCoords);
      }

      // Determine theme
      const { theme, reason } = determineTheme();

      // Resolve and validate the theme key with fuzzy matching
      const resolved = resolveThemeKey(theme);
      const effectiveKey = resolved.key;
      const effectiveFilename = resolved.filename;

      // Check if theme changed
      if (currentTheme && currentTheme.key === effectiveKey) {
        lastUpdate = now;
        return; // No change
      }

      const url = ASSETS_BASE + effectiveFilename;

      // Preload the image with fallback handling
      const preloadResult = await preloadImage(url);
      
      let finalUrl = url;
      let finalKey = effectiveKey;
      let usedFallback = false;
      
      if (!preloadResult.success) {
        console.warn(`[BackgroundTheme] Asset load failed: ${url}, using fallback`);
        logTelemetry('bg_asset_fallback', { 
          attemptedUrl: url, 
          attemptedKey: effectiveKey,
          error: preloadResult.error
        });
        
        // Use last successful theme if available, otherwise default
        if (lastSuccessfulTheme) {
          finalUrl = lastSuccessfulTheme.url;
          finalKey = lastSuccessfulTheme.key;
          console.info(`[BackgroundTheme] Falling back to last successful theme: ${finalKey}`);
        } else {
          finalUrl = ASSETS_BASE + DEFAULT_ASSET;
          finalKey = DEFAULT_THEME_KEY;
          console.info(`[BackgroundTheme] Falling back to default theme: ${finalKey}`);
        }
        usedFallback = true;
      }

      // Build theme data
      const themeData = {
        key: finalKey,
        url: finalUrl,
        anchor: ANCHORS[finalKey] || ANCHORS.day,
        reason: usedFallback ? `${reason} (fallback)` : reason,
        fuzzyApplied: resolved.fuzzyApplied,
        usedFallback: usedFallback
      };

      currentTheme = themeData;
      lastUpdate = now;
      
      // Track successful theme for fallback
      if (!usedFallback) {
        lastSuccessfulTheme = { ...themeData };
      }

      console.info('[BackgroundTheme] Theme updated:', themeData);
      
      // Log telemetry
      logTelemetry('bg_update', {
        theme: finalKey,
        reason: themeData.reason,
        adaptiveEnabled: adaptiveEnabled,
        fuzzyApplied: resolved.fuzzyApplied,
        usedFallback: usedFallback
      });

      // Emit event
      if (bus) {
        bus.emit('theme:bg-change', themeData);
      }

      return themeData;
    } finally {
      isUpdating = false;
    }
  }

  function getCurrent() {
    return currentTheme ? { ...currentTheme } : null;
  }

  function setAdaptive(enabled) {
    adaptiveEnabled = !!enabled;
    
    // Persist setting to localStorage
    try {
      localStorage.setItem('bb.adaptiveBackground', enabled ? 'true' : 'false');
    } catch (e) {
      console.warn('[BackgroundTheme] Failed to save adaptive setting:', e);
    }
    
    console.info('[BackgroundTheme] Adaptive backgrounds:', adaptiveEnabled ? 'enabled' : 'disabled');
    
    // Log telemetry
    logTelemetry('bg_adaptive_toggle', { enabled: adaptiveEnabled });
    
    if (!adaptiveEnabled && currentTheme) {
      // Keep current background frozen
      console.info('[BackgroundTheme] Background frozen at:', currentTheme.key);
    }
  }

  function manualOverride(key) {
    if (!BACKGROUNDS[key]) {
      console.error('[BackgroundTheme] Invalid theme key:', key);
      console.info('[BackgroundTheme] Valid keys:', Object.keys(BACKGROUNDS).join(', '));
      return null;
    }

    // Build theme data
    const themeData = {
      key: key,
      url: ASSETS_BASE + BACKGROUNDS[key],
      anchor: ANCHORS[key] || ANCHORS.day,
      reason: 'manual override'
    };

    currentTheme = themeData;
    lastUpdate = Date.now();

    console.info('[BackgroundTheme] Manual override applied:', themeData);
    
    // Log telemetry
    logTelemetry('bg_manual_override', { key: key });

    // Emit event
    if (bus) {
      bus.emit('theme:bg-change', themeData);
    }

    return themeData;
  }

  function init(options = {}) {
    bus = options.bus || g.bbGameBus || (g.game && g.game.bus);
    
    if (!bus) {
      console.error('[BackgroundTheme] No event bus provided. Theme changes will not emit events.');
    }

    // Check for saved adaptive setting
    try {
      const saved = localStorage.getItem('bb.adaptiveBackground');
      if (saved !== null) {
        adaptiveEnabled = saved === 'true';
      }
    } catch (e) {
      // Ignore localStorage errors
    }

    console.info('[BackgroundTheme] Initialized (adaptive:', adaptiveEnabled, ')');
    
    // Log telemetry
    logTelemetry('bg_init', { adaptiveEnabled: adaptiveEnabled });

    // Initial theme update
    updateTheme(true);

    // Set up periodic updates - only update when document is visible
    setInterval(() => {
      if (!document.hidden) {
        updateTheme();
      }
    }, UPDATE_INTERVAL);

    // Update on visibility change (tab becomes visible)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        console.info('[BackgroundTheme] Tab visible, updating theme');
        updateTheme(true);
      }
    });

    return {
      getCurrent,
      updateTheme,
      setAdaptive,
      manualOverride
    };
  }

  // ===== DEV UTILITIES =====

  /**
   * Dev utility: Test all manifest assets and verify they load without 404
   * Iterates through the asset manifest and reports status for each
   * 
   * @returns {Promise<{passed: number, failed: number, results: Array}>}
   */
  async function testAllAssets() {
    console.info('[BackgroundTheme] Testing all manifest assets...');
    logTelemetry('bg_test_all_start', { assetCount: ASSET_MANIFEST.length });
    
    const results = [];
    let passed = 0;
    let failed = 0;
    
    for (const filename of ASSET_MANIFEST) {
      const url = ASSETS_BASE + filename;
      const result = await preloadImage(url, 10000); // 10s timeout for test
      
      if (result.success) {
        passed++;
        console.info(`[BackgroundTheme] ✓ ${filename}`);
      } else {
        failed++;
        console.error(`[BackgroundTheme] ✗ ${filename}: ${result.error}`);
      }
      
      results.push({
        filename,
        url,
        success: result.success,
        error: result.error
      });
    }
    
    const summary = {
      passed,
      failed,
      total: ASSET_MANIFEST.length,
      results
    };
    
    console.info(`[BackgroundTheme] Asset test complete: ${passed}/${ASSET_MANIFEST.length} passed, ${failed} failed`);
    logTelemetry('bg_test_all_complete', { passed, failed, total: ASSET_MANIFEST.length });
    
    return summary;
  }

  /**
   * Get the asset manifest for external validation
   * @returns {Array<string>} List of asset filenames
   */
  function getAssetManifest() {
    return [...ASSET_MANIFEST];
  }

  /**
   * Get all valid theme keys
   * @returns {Array<string>} List of theme keys
   */
  function getValidThemeKeys() {
    return Object.keys(BACKGROUNDS);
  }

  // Export API to both window.BackgroundTheme and window.game.BackgroundTheme
  const API = {
    init,
    getCurrent,
    updateTheme,
    setAdaptive,
    manualOverride,
    // Dev utilities
    testAllAssets,
    getAssetManifest,
    getValidThemeKeys
  };

  if (!g.BackgroundTheme) {
    g.BackgroundTheme = API;
    console.info('[BackgroundTheme] Exported to window.BackgroundTheme');
  }

  // Ensure alias to window.game.BackgroundTheme
  ensureAlias();

  // Re-establish alias after a short delay to handle GameGuard merges
  setTimeout(() => {
    ensureAlias();
  }, 100);

  // ===== GLOBAL DEV UTILITY =====
  // Expose __bgTestAll for easy console access
  g.__bgTestAll = testAllAssets;

})(window);
