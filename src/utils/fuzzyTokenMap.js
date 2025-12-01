/**
 * fuzzyTokenMap.js
 * 
 * Fuzzy matching utility for time-of-day and weather condition tokens.
 * Provides typo-tolerant canonicalization for background asset selection.
 * 
 * Key features:
 * - Dictionary-based mapping for common typos
 * - Levenshtein distance fallback for unknown tokens (max distance: 2)
 * - Normalized input (lowercase, alphanumeric only)
 * 
 * Public API:
 * - canonicalizeTimeToken(raw): Canonicalize time-of-day token
 * - canonicalizeConditionToken(raw): Canonicalize weather condition token
 * - levenshteinDistance(a, b): Calculate edit distance between two strings
 * - testFuzzyMapping(): Dev utility to test all mappings
 */

(function(g) {
  'use strict';

  // ===== CANONICAL TOKEN DICTIONARIES =====
  
  /**
   * Time-of-day token dictionary
   * Maps common typos to canonical tokens
   */
  const TIME_TOKEN_MAP = {
    // Canonical: night
    'night': 'night',
    'nigt': 'night',
    'nit': 'night',
    'nightt': 'night',
    'nightst': 'night',
    'nigth': 'night',
    'nihgt': 'night',
    'ngiht': 'night',
    'nicht': 'night',
    'nite': 'night',
    
    // Canonical: day
    'day': 'day',
    'dy': 'day',
    'da': 'day',
    'dat': 'day',
    'daay': 'day',
    'dya': 'day',
    
    // Canonical: sunrise
    'sunrise': 'sunrise',
    'sunris': 'sunrise',
    'sunrize': 'sunrise',
    'surnise': 'sunrise',
    'sunrsie': 'sunrise',
    'sunirse': 'sunrise',
    
    // Canonical: sunset
    'sunset': 'sunset',
    'sunst': 'sunset',
    'sunste': 'sunset',
    'sunsett': 'sunset',
    'sunet': 'sunset',
    'sunest': 'sunset',
    
    // Canonical: dusk (alias for sunset)
    'dusk': 'sunset',
    'duk': 'sunset',
    'duks': 'sunset',
    
    // Canonical: dawn (alias for sunrise)
    'dawn': 'sunrise',
    'daun': 'sunrise',
    'dwn': 'sunrise'
  };

  /**
   * Weather condition token dictionary
   * Maps common typos to canonical tokens
   */
  const CONDITION_TOKEN_MAP = {
    // Canonical: snow
    'snow': 'snow',
    'snwo': 'snow',
    'snw': 'snow',
    'snoww': 'snow',
    'snoe': 'snow',
    'snowy': 'snow',
    
    // Canonical: rain
    'rain': 'rain',
    'rian': 'rain',
    'rein': 'rain',
    'rainn': 'rain',
    'rainy': 'rain',
    'rani': 'rain',
    
    // Canonical: clear
    'clear': 'clear',
    'cler': 'clear',
    'clera': 'clear',
    'claer': 'clear',
    'cllear': 'clear',
    
    // Canonical: thunderstorm
    'thunderstorm': 'thunderstorm',
    'thundstorm': 'thunderstorm',
    'thuner': 'thunderstorm',
    'thunder': 'thunderstorm',
    'thunerstorm': 'thunderstorm',
    'thunderstrm': 'thunderstorm',
    'storm': 'thunderstorm',
    
    // Canonical: cloudy
    'cloudy': 'cloudy',
    'clouy': 'cloudy',
    'clody': 'cloudy',
    'clouds': 'cloudy',
    
    // Canonical: holiday
    'holiday': 'holiday',
    'holday': 'holiday',
    'holidya': 'holiday',
    'xmas': 'holiday',
    'christmas': 'holiday'
  };

  // ===== UTILITY FUNCTIONS =====

  /**
   * Normalize input token for comparison
   * - Lowercase
   * - Strip non-alphanumeric characters
   * - Trim whitespace
   * 
   * @param {string} raw - Raw input token
   * @returns {string} Normalized token
   */
  function normalizeToken(raw) {
    if (!raw || typeof raw !== 'string') {
      return '';
    }
    return raw.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
  }

  /**
   * Calculate Levenshtein (edit) distance between two strings
   * 
   * @param {string} a - First string
   * @param {string} b - Second string
   * @returns {number} Edit distance
   */
  function levenshteinDistance(a, b) {
    if (!a || !b) {
      return Math.max(a?.length || 0, b?.length || 0);
    }
    
    const m = a.length;
    const n = b.length;
    
    // Early exit for identical strings
    if (a === b) return 0;
    
    // Create distance matrix
    const d = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
    
    // Initialize first row and column
    for (let i = 0; i <= m; i++) d[i][0] = i;
    for (let j = 0; j <= n; j++) d[0][j] = j;
    
    // Fill in the rest
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        d[i][j] = Math.min(
          d[i - 1][j] + 1,      // deletion
          d[i][j - 1] + 1,      // insertion
          d[i - 1][j - 1] + cost // substitution
        );
      }
    }
    
    return d[m][n];
  }

  /**
   * Find best match using Levenshtein distance
   * Returns canonical token if distance <= maxDistance
   * 
   * @param {string} normalized - Normalized input token
   * @param {Object} dictionary - Token dictionary
   * @param {number} maxDistance - Maximum edit distance threshold (default: 2)
   * @returns {string|null} Canonical token or null if no match within threshold
   */
  function findBestMatch(normalized, dictionary, maxDistance = 2) {
    // Get unique canonical values
    const canonicals = [...new Set(Object.values(dictionary))];
    
    let bestMatch = null;
    let bestDistance = Infinity;
    
    for (const canonical of canonicals) {
      const distance = levenshteinDistance(normalized, canonical);
      if (distance < bestDistance && distance <= maxDistance) {
        bestDistance = distance;
        bestMatch = canonical;
      }
    }
    
    return bestMatch;
  }

  // ===== PUBLIC API =====

  /**
   * Canonicalize a time-of-day token
   * Uses dictionary lookup first, then Levenshtein distance fallback
   * 
   * @param {string} raw - Raw time-of-day token (e.g., 'nisght', 'day', 'nit')
   * @returns {{ canonical: string, fuzzyApplied: boolean, original: string }}
   */
  function canonicalizeTimeToken(raw) {
    const original = raw;
    const normalized = normalizeToken(raw);
    
    if (!normalized) {
      return { canonical: 'day', fuzzyApplied: false, original };
    }
    
    // Dictionary lookup first
    if (TIME_TOKEN_MAP[normalized]) {
      return { 
        canonical: TIME_TOKEN_MAP[normalized], 
        fuzzyApplied: normalized !== TIME_TOKEN_MAP[normalized],
        original 
      };
    }
    
    // Levenshtein fallback
    const match = findBestMatch(normalized, TIME_TOKEN_MAP);
    if (match) {
      console.info(`[FuzzyTokenMap] Time token fuzzy match: "${original}" -> "${match}"`);
      return { canonical: match, fuzzyApplied: true, original };
    }
    
    // No match - default to 'day'
    console.warn(`[FuzzyTokenMap] Time token unrecognized: "${original}", defaulting to "day"`);
    return { canonical: 'day', fuzzyApplied: false, original };
  }

  /**
   * Canonicalize a weather condition token
   * Uses dictionary lookup first, then Levenshtein distance fallback
   * 
   * @param {string} raw - Raw condition token (e.g., 'snwo', 'rian', 'clear')
   * @returns {{ canonical: string, fuzzyApplied: boolean, original: string }}
   */
  function canonicalizeConditionToken(raw) {
    const original = raw;
    const normalized = normalizeToken(raw);
    
    if (!normalized) {
      return { canonical: 'clear', fuzzyApplied: false, original };
    }
    
    // Dictionary lookup first
    if (CONDITION_TOKEN_MAP[normalized]) {
      return { 
        canonical: CONDITION_TOKEN_MAP[normalized], 
        fuzzyApplied: normalized !== CONDITION_TOKEN_MAP[normalized],
        original 
      };
    }
    
    // Levenshtein fallback
    const match = findBestMatch(normalized, CONDITION_TOKEN_MAP);
    if (match) {
      console.info(`[FuzzyTokenMap] Condition token fuzzy match: "${original}" -> "${match}"`);
      return { canonical: match, fuzzyApplied: true, original };
    }
    
    // No match - default to 'clear'
    console.warn(`[FuzzyTokenMap] Condition token unrecognized: "${original}", defaulting to "clear"`);
    return { canonical: 'clear', fuzzyApplied: false, original };
  }

  /**
   * Dev utility: Test fuzzy mapping with sample inputs
   * Logs results to console for verification
   * 
   * @returns {Object} Test results summary
   */
  function testFuzzyMapping() {
    console.info('[FuzzyTokenMap] Running fuzzy mapping tests...');
    
    const timeTests = [
      'night', 'nigt', 'nit', 'nightt', 'nisght', 'nigth',
      'day', 'dy', 'da', 'daay',
      'sunrise', 'sunrize', 'surnise',
      'sunset', 'sunsett', 'sunste',
      'unknown_time'
    ];
    
    const conditionTests = [
      'snow', 'snwo', 'snw', 'snoww',
      'rain', 'rian', 'rein',
      'clear', 'cler', 'claer',
      'thunderstorm', 'thunder', 'thundstorm',
      'unknown_condition'
    ];
    
    const results = {
      timeTokens: {},
      conditionTokens: {},
      summary: { passed: 0, failed: 0 }
    };
    
    console.group('[FuzzyTokenMap] Time Token Tests');
    for (const test of timeTests) {
      const result = canonicalizeTimeToken(test);
      results.timeTokens[test] = result;
      const status = result.canonical ? '✓' : '✗';
      console.log(`${status} "${test}" -> "${result.canonical}" (fuzzy: ${result.fuzzyApplied})`);
      if (result.canonical) results.summary.passed++;
      else results.summary.failed++;
    }
    console.groupEnd();
    
    console.group('[FuzzyTokenMap] Condition Token Tests');
    for (const test of conditionTests) {
      const result = canonicalizeConditionToken(test);
      results.conditionTokens[test] = result;
      const status = result.canonical ? '✓' : '✗';
      console.log(`${status} "${test}" -> "${result.canonical}" (fuzzy: ${result.fuzzyApplied})`);
      if (result.canonical) results.summary.passed++;
      else results.summary.failed++;
    }
    console.groupEnd();
    
    console.info(`[FuzzyTokenMap] Test summary: ${results.summary.passed} passed, ${results.summary.failed} failed`);
    return results;
  }

  // ===== EXPORTS =====

  const FuzzyTokenMap = {
    canonicalizeTimeToken,
    canonicalizeConditionToken,
    levenshteinDistance,
    normalizeToken,
    testFuzzyMapping
  };

  // Export to global scope
  if (!g.FuzzyTokenMap) {
    g.FuzzyTokenMap = FuzzyTokenMap;
    console.info('[FuzzyTokenMap] Exported to window.FuzzyTokenMap');
  }

  // Also export to game namespace if available
  if (g.game) {
    g.game.FuzzyTokenMap = FuzzyTokenMap;
  }

})(window);
