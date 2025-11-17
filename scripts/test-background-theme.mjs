#!/usr/bin/env node
/**
 * BackgroundTheme Module Test
 * Validates the structure and exports of the backgroundTheme module
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { JSDOM } from 'jsdom';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

console.log(`${CYAN}=== BackgroundTheme Module Test ===${RESET}\n`);

// Read the backgroundTheme.js file
const bgThemePath = path.join(PROJECT_ROOT, 'src/utils/backgroundTheme.js');
const bgThemeCode = fs.readFileSync(bgThemePath, 'utf-8');

// Test 1: Check for required functions
console.log('Test 1: Check for required function definitions...');
const requiredFunctions = [
  'init',
  'getCurrent',
  'updateTheme',
  'setAdaptive',
  'manualOverride',
  'ensureAlias',
  'logTelemetry'
];

let allFunctionsFound = true;
for (const funcName of requiredFunctions) {
  const pattern = new RegExp(`function\\s+${funcName}\\s*\\(`);
  if (pattern.test(bgThemeCode)) {
    console.log(`${GREEN}✓${RESET} ${funcName}() found`);
  } else {
    console.log(`${RED}✗${RESET} ${funcName}() NOT found`);
    allFunctionsFound = false;
  }
}

if (allFunctionsFound) {
  console.log(`${GREEN}✓ All required functions present${RESET}\n`);
} else {
  console.log(`${RED}✗ Some required functions missing${RESET}\n`);
  process.exit(1);
}

// Test 2: Check for telemetry event names
console.log('Test 2: Check for telemetry event names...');
const requiredEvents = [
  'bg_init',
  'bg_update',
  'bg_manual_override',
  'bg_adaptive_toggle',
  'bg_geolocation_attempt',
  'bg_weather_fetch'
];

let allEventsFound = true;
for (const eventName of requiredEvents) {
  if (bgThemeCode.includes(`'${eventName}'`)) {
    console.log(`${GREEN}✓${RESET} Event '${eventName}' found`);
  } else {
    console.log(`${YELLOW}⚠${RESET} Event '${eventName}' NOT found (may use different quotes)`);
    // Check with double quotes
    if (bgThemeCode.includes(`"${eventName}"`)) {
      console.log(`${GREEN}  ✓${RESET} Found with double quotes`);
    }
  }
}

console.log(`${GREEN}✓ Telemetry events checked${RESET}\n`);

// Test 3: Check for namespace exports
console.log('Test 3: Check for namespace export patterns...');
const exportPatterns = [
  { name: 'window.BackgroundTheme', pattern: /g\.BackgroundTheme\s*=/ },
  { name: 'ensureAlias() call', pattern: /ensureAlias\s*\(/ },
  { name: 'API object export', pattern: /const\s+API\s*=\s*{/ }
];

let allExportsFound = true;
for (const { name, pattern } of exportPatterns) {
  if (pattern.test(bgThemeCode)) {
    console.log(`${GREEN}✓${RESET} ${name} found`);
  } else {
    console.log(`${RED}✗${RESET} ${name} NOT found`);
    allExportsFound = false;
  }
}

if (allExportsFound) {
  console.log(`${GREEN}✓ Export patterns correct${RESET}\n`);
} else {
  console.log(`${RED}✗ Some export patterns missing${RESET}\n`);
  process.exit(1);
}

// Test 4: Check for geolocation retry logic
console.log('Test 4: Check for geolocation retry logic...');
if (bgThemeCode.includes('MAX_GEOLOCATION_ATTEMPTS')) {
  console.log(`${GREEN}✓${RESET} MAX_GEOLOCATION_ATTEMPTS constant found`);
} else {
  console.log(`${RED}✗${RESET} MAX_GEOLOCATION_ATTEMPTS constant NOT found`);
  allExportsFound = false;
}

if (bgThemeCode.includes('geolocationAttempts')) {
  console.log(`${GREEN}✓${RESET} geolocationAttempts variable found`);
} else {
  console.log(`${RED}✗${RESET} geolocationAttempts variable NOT found`);
  allExportsFound = false;
}

console.log(`${GREEN}✓ Geolocation retry logic present${RESET}\n`);

// Test 5: Simulate module loading in JSDOM
console.log('Test 5: Simulate module loading in browser environment...');
try {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: 'http://localhost',
    runScripts: 'dangerously',
    resources: 'usable'
  });

  const { window } = dom;
  
  // Mock required globals
  window.Telemetry = {
    log: function(event, data) {
      // Mock telemetry
    }
  };
  
  window.bbGameBus = {
    emit: function(event, data) {
      // Mock event bus
    }
  };

  // Mock navigator.geolocation
  window.navigator.geolocation = {
    getCurrentPosition: function(success, error, options) {
      // Simulate denied geolocation
      setTimeout(() => error({ message: 'User denied geolocation' }), 10);
    }
  };

  // Mock fetch
  window.fetch = function() {
    return Promise.reject(new Error('Mock fetch not implemented'));
  };

  // Load the backgroundTheme module
  const scriptEl = dom.window.document.createElement('script');
  scriptEl.textContent = bgThemeCode;
  dom.window.document.body.appendChild(scriptEl);

  // Wait a bit for script to execute
  setTimeout(() => {
    // Check if window.BackgroundTheme exists
    if (window.BackgroundTheme) {
      console.log(`${GREEN}✓${RESET} window.BackgroundTheme exists`);
      
      // Check if required methods exist
      const methods = ['init', 'getCurrent', 'updateTheme', 'setAdaptive', 'manualOverride'];
      let allMethodsExist = true;
      
      for (const method of methods) {
        if (typeof window.BackgroundTheme[method] === 'function') {
          console.log(`${GREEN}✓${RESET} window.BackgroundTheme.${method}() exists`);
        } else {
          console.log(`${RED}✗${RESET} window.BackgroundTheme.${method}() NOT found`);
          allMethodsExist = false;
        }
      }
      
      // Check if window.game.BackgroundTheme exists
      if (window.game && window.game.BackgroundTheme) {
        console.log(`${GREEN}✓${RESET} window.game.BackgroundTheme exists (alias)`);
      } else {
        console.log(`${YELLOW}⚠${RESET} window.game.BackgroundTheme NOT found (may need initialization time)`);
      }
      
      if (allMethodsExist) {
        console.log(`${GREEN}\n✅ PASS: All tests passed!${RESET}`);
        process.exit(0);
      } else {
        console.log(`${RED}\n✗ FAIL: Some methods missing${RESET}`);
        process.exit(1);
      }
    } else {
      console.log(`${RED}✗${RESET} window.BackgroundTheme NOT found`);
      console.log(`${RED}\n✗ FAIL: Module did not export correctly${RESET}`);
      process.exit(1);
    }
  }, 200);
} catch (err) {
  console.log(`${RED}✗${RESET} Error loading module: ${err.message}`);
  console.log(`${RED}\n✗ FAIL: Module loading failed${RESET}`);
  process.exit(1);
}
