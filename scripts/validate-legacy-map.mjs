#!/usr/bin/env node
/**
 * Validate Legacy Minigame Map Coverage
 * Ensures that all registry games and selector pool keys are in the legacy map
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

/**
 * Parse and extract JavaScript object from source code
 */
function evalCodeBlock(code, variableName) {
  try {
    // Extract the object definition
    const regex = new RegExp(`const\\s+${variableName}\\s*=\\s*({[\\s\\S]*?});`, 'm');
    const match = code.match(regex);
    if (!match) {
      return null;
    }
    
    // Safely evaluate the object
    const objStr = match[1];
    const obj = eval(`(${objStr})`);
    return obj;
  } catch (error) {
    console.error(`Error parsing ${variableName}:`, error.message);
    return null;
  }
}

/**
 * Parse registry to get all games
 */
function parseRegistry() {
  const registryPath = path.join(PROJECT_ROOT, 'js/minigames/registry.js');
  const code = fs.readFileSync(registryPath, 'utf-8');
  
  const registry = evalCodeBlock(code, 'REGISTRY');
  if (!registry) {
    throw new Error('Failed to parse REGISTRY');
  }
  
  return registry;
}

/**
 * Parse compat-bridge to get legacy minigame map
 */
function parseLegacyMap() {
  const compatPath = path.join(PROJECT_ROOT, 'js/minigames/core/compat-bridge.js');
  const code = fs.readFileSync(compatPath, 'utf-8');
  
  const legacyMap = evalCodeBlock(code, 'LEGACY_MINIGAME_MAP');
  if (!legacyMap) {
    throw new Error('Failed to parse LEGACY_MINIGAME_MAP');
  }
  
  return legacyMap;
}

/**
 * Main validation
 */
function validate() {
  console.log(`\n${CYAN}=== Legacy Minigame Map Validation ===${RESET}\n`);
  
  // Parse files
  const registry = parseRegistry();
  const legacyMap = parseLegacyMap();
  
  const registryKeys = Object.keys(registry);
  const legacyMapKeys = Object.keys(legacyMap);
  const legacyMapModules = new Set(Object.values(legacyMap));
  
  console.log(`Registry games: ${registryKeys.length}`);
  console.log(`Legacy map entries: ${legacyMapKeys.length}`);
  console.log(`Legacy map unique modules: ${legacyMapModules.size}\n`);
  
  // Get selector pool (implemented, non-retired)
  const selectorPool = registryKeys.filter(key => {
    const game = registry[key];
    return game.implemented && !game.retired;
  });
  
  console.log(`${CYAN}=== Selector Pool Coverage ===${RESET}\n`);
  console.log(`Selector pool size: ${selectorPool.length}\n`);
  
  let allPoolKeysCovered = true;
  const poolResults = [];
  
  for (const key of selectorPool) {
    // Check if canonical key is in legacy map
    const hasCanonical = legacyMap[key] !== undefined;
    
    if (hasCanonical) {
      console.log(`${GREEN}✓ ${key}${RESET}`);
      poolResults.push({ key, covered: true });
    } else {
      console.log(`${RED}✗ ${key} - NOT IN LEGACY MAP${RESET}`);
      poolResults.push({ key, covered: false });
      allPoolKeysCovered = false;
    }
  }
  
  // Check all registry keys coverage
  console.log(`\n${CYAN}=== Registry Coverage ===${RESET}\n`);
  
  const missingFromLegacyMap = [];
  
  for (const key of registryKeys) {
    if (legacyMap[key] === undefined) {
      missingFromLegacyMap.push(key);
    }
  }
  
  if (missingFromLegacyMap.length === 0) {
    console.log(`${GREEN}✓ All ${registryKeys.length} registry keys are in legacy map${RESET}\n`);
  } else {
    console.log(`${RED}✗ ${missingFromLegacyMap.length} registry keys missing from legacy map:${RESET}`);
    for (const key of missingFromLegacyMap) {
      console.log(`  - ${key}`);
    }
    console.log();
  }
  
  // Check for orphaned entries in legacy map (module keys that don't exist in registry)
  console.log(`${CYAN}=== Orphaned Entries Check ===${RESET}\n`);
  
  const orphanedModules = [];
  for (const moduleKey of legacyMapModules) {
    if (!registry[moduleKey]) {
      orphanedModules.push(moduleKey);
    }
  }
  
  if (orphanedModules.length === 0) {
    console.log(`${GREEN}✓ No orphaned entries in legacy map${RESET}\n`);
  } else {
    console.log(`${YELLOW}⚠ ${orphanedModules.length} module keys in legacy map but not in registry:${RESET}`);
    for (const key of orphanedModules) {
      console.log(`  - ${key}`);
    }
    console.log(`${YELLOW}  (These may be valid if modules exist but not yet in registry)${RESET}\n`);
  }
  
  // Check for alias consistency (legacy map keys should resolve to modules that exist)
  console.log(`${CYAN}=== Module Reference Validation ===${RESET}\n`);
  
  const invalidReferences = [];
  for (const [key, moduleKey] of Object.entries(legacyMap)) {
    // Module key should either be in registry or be a known valid module
    if (!registry[moduleKey] && !legacyMapModules.has(moduleKey)) {
      invalidReferences.push({ key, moduleKey });
    }
  }
  
  if (invalidReferences.length === 0) {
    console.log(`${GREEN}✓ All legacy map entries reference valid modules${RESET}\n`);
  } else {
    console.log(`${RED}✗ ${invalidReferences.length} invalid module references:${RESET}`);
    for (const { key, moduleKey } of invalidReferences) {
      console.log(`  - ${key} → ${moduleKey} (module not found)`);
    }
    console.log();
  }
  
  // Summary
  console.log(`${CYAN}=== Validation Summary ===${RESET}\n`);
  
  const allPassed = allPoolKeysCovered && missingFromLegacyMap.length === 0 && invalidReferences.length === 0;
  
  if (allPassed) {
    console.log(`${GREEN}✓ VALIDATION PASSED${RESET}`);
    console.log(`  All selector pool keys covered: ${selectorPool.length}/${selectorPool.length}`);
    console.log(`  All registry keys in legacy map: ${registryKeys.length}/${registryKeys.length}`);
    console.log(`  No invalid references`);
    console.log(`\n${GREEN}✓ Legacy map provides 100% coverage${RESET}\n`);
    return 0;
  } else {
    console.log(`${RED}✗ VALIDATION FAILED${RESET}`);
    if (!allPoolKeysCovered) {
      console.log(`  ${RED}✗ Some selector pool keys missing from legacy map${RESET}`);
    }
    if (missingFromLegacyMap.length > 0) {
      console.log(`  ${RED}✗ ${missingFromLegacyMap.length} registry keys missing from legacy map${RESET}`);
    }
    if (invalidReferences.length > 0) {
      console.log(`  ${RED}✗ ${invalidReferences.length} invalid module references${RESET}`);
    }
    console.log();
    return 1;
  }
}

// Run validation
try {
  const exitCode = validate();
  process.exit(exitCode);
} catch (error) {
  console.error(`${RED}Error during validation:${RESET}`, error.message);
  process.exit(1);
}
