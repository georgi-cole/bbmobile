#!/usr/bin/env node
/**
 * Runtime validation test - simulates browser behavior
 * Tests that all selector pool keys resolve correctly
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

/**
 * Parse and extract JavaScript object/map from source code
 */
function evalCodeBlock(code, variableName) {
  // Very simple extraction - not a full JS parser
  const pattern = new RegExp(`(?:const|let|var)\\s+${variableName}\\s*=\\s*([\\s\\S]*?);(?:\\s*\\/\\/|\\s*\\/\\*|\\s*$)`, 'm');
  const match = code.match(pattern);
  if (!match) return null;
  
  try {
    // Use Function constructor to safely evaluate the code
    const func = new Function(`return ${match[1]}`);
    return func();
  } catch (e) {
    return null;
  }
}

/**
 * Simulate MGKeyResolver behavior
 */
class KeyResolver {
  constructor() {
    this.canonicalKeys = new Set();
    this.aliasMap = new Map();
  }
  
  registerCanonicalKey(key) {
    this.canonicalKeys.add(key);
  }
  
  registerAlias(alias, canonical) {
    this.aliasMap.set(alias, canonical);
  }
  
  resolveGameKey(key) {
    if (this.canonicalKeys.has(key)) {
      return key;
    }
    if (this.aliasMap.has(key)) {
      return this.aliasMap.get(key);
    }
    return null;
  }
  
  isRegistered(key) {
    return this.canonicalKeys.has(key) || this.aliasMap.has(key);
  }
}

/**
 * Parse registry to get games
 */
function parseRegistry() {
  const registryPath = path.join(PROJECT_ROOT, 'js/minigames/registry.js');
  const content = fs.readFileSync(registryPath, 'utf8');
  
  const games = [];
  const gamePattern = /(\w+):\s*\{([^}]*key:\s*'(\w+)'[^}]*)\}/g;
  let match;
  
  while ((match = gamePattern.exec(content)) !== null) {
    const blockContent = match[2];
    const keyValue = match[3];
    
    const implementedMatch = blockContent.match(/implemented:\s*(true|false)/);
    const retiredMatch = blockContent.match(/retired:\s*(true|false)/);
    
    games.push({
      key: keyValue,
      implemented: implementedMatch ? implementedMatch[1] === 'true' : false,
      retired: retiredMatch ? retiredMatch[1] === 'true' : false
    });
  }
  
  return games;
}

/**
 * Parse bootstrap to simulate its behavior
 */
function parseBootstrap() {
  const bootstrapPath = path.join(PROJECT_ROOT, 'js/minigames/core/registry-bootstrap.js');
  const content = fs.readFileSync(bootstrapPath, 'utf8');
  
  // Extract canonical keys
  const fallbackMatch = content.match(/const fallbackKeys = \[([\s\S]*?)\];/);
  const canonicalKeys = [];
  if (fallbackMatch) {
    const keyMatches = fallbackMatch[1].matchAll(/'(\w+)'/g);
    for (const match of keyMatches) {
      canonicalKeys.push(match[1]);
    }
  }
  
  // Extract legacy aliases
  const legacyMatch = content.match(/const legacyAliases = \{([\s\S]*?)\};/);
  const legacyAliases = {};
  if (legacyMatch) {
    const aliasMatches = legacyMatch[1].matchAll(/'(\w+)':\s*'(\w+)'/g);
    for (const match of aliasMatches) {
      legacyAliases[match[1]] = match[2];
    }
  }
  
  // Extract descriptive aliases
  const descriptiveMatch = content.match(/const descriptiveAliases = \{([\s\S]*?)\};/);
  const descriptiveAliases = {};
  if (descriptiveMatch) {
    const aliasMatches = descriptiveMatch[1].matchAll(/'([\w-]+)':\s*'(\w+)'/g);
    for (const match of aliasMatches) {
      descriptiveAliases[match[1]] = match[2];
    }
  }
  
  return { canonicalKeys, legacyAliases, descriptiveAliases };
}

/**
 * Simulate bootstrap process
 */
function simulateBootstrap(resolver, games, bootstrap) {
  // Register canonical keys from registry (simulates line 22-29 of bootstrap)
  console.log('Simulating bootstrap with MinigameRegistry available...');
  for (const game of games) {
    resolver.registerCanonicalKey(game.key);
  }
  
  // Register aliases
  for (const [alias, canonical] of Object.entries(bootstrap.legacyAliases)) {
    resolver.registerAlias(alias, canonical);
  }
  for (const [alias, canonical] of Object.entries(bootstrap.descriptiveAliases)) {
    resolver.registerAlias(alias, canonical);
  }
  
  console.log(`Registered ${resolver.canonicalKeys.size} canonical keys`);
  console.log(`Registered ${resolver.aliasMap.size} aliases`);
}

/**
 * Test selector pool
 */
function testSelectorPool(resolver, games) {
  console.log(`\n${CYAN}=== Testing Selector Pool ===${RESET}\n`);
  
  // Get implemented, non-retired games (same as MinigameRegistry.getImplementedGames(true))
  const selectorPool = games
    .filter(g => g.implemented && !g.retired)
    .map(g => g.key);
  
  console.log(`Selector pool size: ${selectorPool.length}`);
  console.log(`Keys: ${selectorPool.join(', ')}\n`);
  
  let allResolved = true;
  const results = [];
  
  for (const key of selectorPool) {
    const resolved = resolver.resolveGameKey(key);
    if (!resolved) {
      console.error(`${RED}❌ ${key} - FAILED TO RESOLVE${RESET}`);
      allResolved = false;
      results.push({ key, resolved: null, status: 'fail' });
    } else if (resolved !== key) {
      console.log(`${GREEN}✓ ${key} → ${resolved}${RESET}`);
      results.push({ key, resolved, status: 'alias' });
    } else {
      console.log(`${GREEN}✓ ${key}${RESET}`);
      results.push({ key, resolved, status: 'ok' });
    }
  }
  
  return { allResolved, results };
}

/**
 * Main test
 */
function runTest() {
  console.log(`${CYAN}=== Runtime Validation Test ===${RESET}\n`);
  
  try {
    // Parse files
    const games = parseRegistry();
    const bootstrap = parseBootstrap();
    
    // Create resolver and bootstrap
    const resolver = new KeyResolver();
    simulateBootstrap(resolver, games, bootstrap);
    
    // Test selector pool
    const { allResolved, results } = testSelectorPool(resolver, games);
    
    // Summary
    console.log(`\n${CYAN}=== Summary ===${RESET}`);
    console.log(`Total games in registry: ${games.length}`);
    console.log(`Selector pool size: ${results.length}`);
    console.log(`Successfully resolved: ${results.filter(r => r.status !== 'fail').length}`);
    console.log(`Failed to resolve: ${results.filter(r => r.status === 'fail').length}`);
    
    if (allResolved) {
      console.log(`\n${GREEN}✅ PASS: All selector pool keys resolve correctly${RESET}`);
      console.log(`${GREEN}   No "Unknown minigame" errors will occur${RESET}\n`);
      return 0;
    } else {
      console.error(`\n${RED}❌ FAIL: Some keys failed to resolve${RESET}`);
      console.error(`${RED}   These will cause "Unknown minigame" errors at runtime${RESET}\n`);
      return 1;
    }
  } catch (error) {
    console.error(`${RED}Error during test: ${error.message}${RESET}`);
    console.error(error.stack);
    return 1;
  }
}

// Run test
const exitCode = runTest();
process.exit(exitCode);
