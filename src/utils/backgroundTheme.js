// MODULE: backgroundTheme.js
// Determines which background image to display based on:
// 1. Holiday override (Dec 20–Jan 1)
// 2. Weather override (geolocation + Open-Meteo API)
// 3. Seasonal fallback (winter snow, autumn rain chance)
// 4. Time-of-day base (sunrise, day, sunset, night)
//
// Emits: theme:bg-change event with { key, url, anchor, reason }
// Public API: init({ bus }), getCurrent(), updateTheme(), setAdaptive(), manualOverride()

(function(g) {
  'use strict';

  const ASSETS_BASE = 'assets/skins/';
  
  // Background asset mapping (handling typo in snow asset)
  const BACKGROUNDS = {
    sunrise: 'sunrise-background.png',
    day: 'daily-background.png',
    sunset: 'sunset-background.png',
    night: 'night-background.png',
    rain: 'rainy-background.png',
    // TODO: Rename asset file from nisght-snow-background.png to night-snow-background.png
    // For now, keep using the misspelled filename to avoid breaking the app
    snow: 'nisght-snow-background.png',
    xmasDay: 'xmas-day-background.png',
    xmasy: 'xmasy-background.png',
    xmasyNight: 'xmasy-night-background.png'
  };

  // Anchor suggestions per theme (CSS values for button column positioning)
  // These position the button column centered on screen with slight adjustments per theme
  const ANCHORS = {
    sunrise: { left: '50vw', top: '50vh' },
    day: { left: '50vw', top: '50vh' },
    sunset: { left: '50vw', top: '50vh' },
    night: { left: '50vw', top: '50vh' },
    rain: { left: '50vw', top: '50vh' },
    snow: { left: '50vw', top: '50vh' },
    xmasDay: { left: '50vw', top: '50vh' },
    xmasy: { left: '50vw', top: '50vh' },
    xmasyNight: { left: '50vw', top: '50vh' }
  };

  let bus = null;
  let currentTheme = null;
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
  function ensureAlias() {
    if (!g.game) {
      g.game = {};
    }
    if (!g.game.BackgroundTheme) {
      g.game.BackgroundTheme = g.BackgroundTheme;
      console.info('[BackgroundTheme] Alias established: window.game.BackgroundTheme -> window.BackgroundTheme');
    }
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
          // Use xmas-day as temporary "snow day" visual
          theme = 'xmasDay';
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

      // Check if theme changed
      if (currentTheme && currentTheme.key === theme) {
        lastUpdate = now;
        return; // No change
      }

      // Build theme data
      const themeData = {
        key: theme,
        url: ASSETS_BASE + BACKGROUNDS[theme],
        anchor: ANCHORS[theme] || ANCHORS.day,
        reason: reason
      };

      currentTheme = themeData;
      lastUpdate = now;

      console.info('[BackgroundTheme] Theme updated:', themeData);
      
      // Log telemetry
      logTelemetry('bg_update', {
        theme: theme,
        reason: reason,
        adaptiveEnabled: adaptiveEnabled
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

  // Export API to both window.BackgroundTheme and window.game.BackgroundTheme
  const API = {
    init,
    getCurrent,
    updateTheme,
    setAdaptive,
    manualOverride
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

})(window);
