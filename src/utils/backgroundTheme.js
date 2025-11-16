// MODULE: backgroundTheme.js
// Determines which background image to display based on:
// 1. Holiday override (Dec 20–Jan 1)
// 2. Weather override (geolocation + Open-Meteo API)
// 3. Seasonal fallback (winter snow, autumn rain chance)
// 4. Time-of-day base (sunrise, day, sunset, night)
//
// Emits: theme:bg-change event with { key, url, anchor, reason }
// Public API: init({ bus }), getCurrent(), updateTheme()

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
    snow: 'nisght-snow-background.png', // TODO: Rename file to night-snow-background.png in follow-up PR
    xmasDay: 'xmas-day-background.png',
    xmasy: 'xmasy-background.png',
    xmasyNight: 'xmasy-night-background.png'
  };

  // Anchor suggestions per theme (CSS values for button column positioning)
  // These position the button column within the "beam/right-center" area of each background
  const ANCHORS = {
    sunrise: { left: '60vw', top: '38vh' },
    day: { left: '58vw', top: '40vh' },
    sunset: { left: '59vw', top: '39vh' },
    night: { left: '62vw', top: '40vh' },      // Slightly more right for night
    rain: { left: '58vw', top: '41vh' },
    snow: { left: '61vw', top: '39vh' },
    xmasDay: { left: '59vw', top: '38vh' },
    xmasy: { left: '60vw', top: '39vh' },
    xmasyNight: { left: '62vw', top: '40vh' }
  };

  let bus = null;
  let currentTheme = null;
  let lastUpdate = 0;
  let weatherData = null;
  let weatherFetchTime = 0;
  let solarData = null;
  let userCoords = null;
  let adaptiveEnabled = true;

  const UPDATE_INTERVAL = 60 * 1000;       // Update theme every 1 minute
  const WEATHER_CACHE_DURATION = 15 * 60 * 1000; // Cache weather for 15 minutes

  // ===== UTILITY FUNCTIONS =====

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
      return null;
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            lat: position.coords.latitude,
            lon: position.coords.longitude
          };
          console.info('[BackgroundTheme] Geolocation obtained:', coords);
          resolve(coords);
        },
        (error) => {
          console.info('[BackgroundTheme] Geolocation denied or failed:', error.message);
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
      return weatherData;
    } catch (error) {
      console.warn('[BackgroundTheme] Weather fetch failed:', error.message);
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

    const now = Date.now();
    if (!force && currentTheme && (now - lastUpdate) < UPDATE_INTERVAL) {
      return; // Too soon to update
    }

    // Try to get geolocation and weather if we don't have it
    if (!userCoords) {
      userCoords = await requestGeolocation();
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

    // Emit event
    if (bus) {
      bus.emit('theme:bg-change', themeData);
    }

    return themeData;
  }

  function getCurrent() {
    return currentTheme ? { ...currentTheme } : null;
  }

  function setAdaptive(enabled) {
    adaptiveEnabled = !!enabled;
    console.info('[BackgroundTheme] Adaptive backgrounds:', adaptiveEnabled ? 'enabled' : 'disabled');
    
    if (!adaptiveEnabled && currentTheme) {
      // Keep current background frozen
      console.info('[BackgroundTheme] Background frozen at:', currentTheme.key);
    }
  }

  function init(options = {}) {
    bus = options.bus || g.bbGameBus;
    
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

    // Initial theme update
    updateTheme(true);

    // Set up periodic updates
    setInterval(() => updateTheme(), UPDATE_INTERVAL);

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
      setAdaptive
    };
  }

  // Export API
  if (!g.BackgroundTheme) {
    g.BackgroundTheme = {
      init,
      getCurrent,
      updateTheme,
      setAdaptive
    };
  }

})(window);
