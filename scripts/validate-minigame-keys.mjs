#!/usr/bin/env node
/**
 * CI/Startup validation script for minigame key registration
 * Ensures all selector pool keys are registered (canonical or alias)
 * This prevents "Unknown minigame" errors at runtime
 * 
 * Usage: node scripts/validate-minigame-keys.mjs
 * Exit code: 0 = success, 1 = validation failed
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

// ANSI color codes
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

/**
 * Parse registry.js to extract canonical keys and their metadata
 */
function parseRegistry(){
  const registryPath = path.join(PROJECT_ROOT, 'js/minigames/registry.js');
  const content = fs.readFileSync(registryPath, 'utf8');
  
  const games = [];
  
  // Match each game entry
  const gamePattern = /(\w+):\s*\{([^}]*key:\s*'(\w+)'[^}]*)\}/g;
  let match;
  
  while((match = gamePattern.exec(content)) !== null){
    const propertyName = match[1];
    const blockContent = match[2];
    const keyValue = match[3];
    
    // Extract metadata
    const implementedMatch = blockContent.match(/implemented:\s*(true|false)/);
    const retiredMatch = blockContent.match(/retired:\s*(true|false)/);
    
    games.push({
      key: keyValue,
      propertyName: propertyName,
      implemented: implementedMatch ? implementedMatch[1] === 'true' : false,
      retired: retiredMatch ? retiredMatch[1] === 'true' : false
    });
  }
  
  return games;
}

/**
 * Parse bootstrap to get canonical keys and aliases
 */
function parseBootstrap(){
  const bootstrapPath = path.join(PROJECT_ROOT, 'js/minigames/core/registry-bootstrap.js');
  const content = fs.readFileSync(bootstrapPath, 'utf8');
  
  // Extract fallback canonical keys
  const fallbackMatch = content.match(/const fallbackKeys = \[([\s\S]*?)\];/);
  const canonicalKeys = new Set();
  
  if(fallbackMatch){
    const keyMatches = fallbackMatch[1].matchAll(/'(\w+)'/g);
    for(const match of keyMatches){
      canonicalKeys.add(match[1]);
    }
  }
  
  // Extract aliases
  const aliases = new Map(); // alias -> canonical
  
  // Legacy aliases
  const legacyMatch = content.match(/const legacyAliases = \{([\s\S]*?)\};/);
  if(legacyMatch){
    const aliasMatches = legacyMatch[1].matchAll(/'(\w+)':\s*'(\w+)'/g);
    for(const match of aliasMatches){
      aliases.set(match[1], match[2]);
    }
  }
  
  // Descriptive aliases
  const descriptiveMatch = content.match(/const descriptiveAliases = \{([\s\S]*?)\};/);
  if(descriptiveMatch){
    const aliasMatches = descriptiveMatch[1].matchAll(/'([\w-]+)':\s*'(\w+)'/g);
    for(const match of aliasMatches){
      aliases.set(match[1], match[2]);
    }
  }
  
  return { canonicalKeys, aliases };
}

/**
 * Get expected selector pool (implemented, non-retired games)
 */
function getExpectedSelectorPool(games){
  return games
    .filter(g => g.implemented && !g.retired)
    .map(g => g.key);
}

/**
 * Check if a key is registered (canonical or alias)
 */
function isKeyRegistered(key, canonicalKeys, aliases){
  return canonicalKeys.has(key) || aliases.has(key);
}

/**
 * Validate that all keys are properly registered
 */
function validate(){
  console.log(`\n${CYAN}=== Minigame Key Validation ===${RESET}\n`);
  
  // Parse files
  const games = parseRegistry();
  const { canonicalKeys, aliases } = parseBootstrap();
  const selectorPool = getExpectedSelectorPool(games);
  
  // Stats
  console.log(`Registry games: ${games.length}`);
  console.log(`Canonical keys in bootstrap: ${canonicalKeys.size}`);
  console.log(`Aliases in bootstrap: ${aliases.size}`);
  console.log(`Expected selector pool: ${selectorPool.length}\n`);
  
  let hasErrors = false;
  
  // CRITICAL CHECK: Are all selector pool keys registered?
  console.log(`${CYAN}=== CRITICAL: Selector Pool Registration ===${RESET}`);
  const unregisteredPoolKeys = selectorPool.filter(key => !isKeyRegistered(key, canonicalKeys, aliases));
  
  if(unregisteredPoolKeys.length > 0){
    console.error(`${RED}❌ FAIL: ${unregisteredPoolKeys.length} selector pool key(s) are NOT registered!${RESET}`);
    console.error(`${RED}   These will cause "Unknown minigame" errors at runtime:${RESET}`);
    unregisteredPoolKeys.forEach(key => console.error(`${RED}   - ${key}${RESET}`));
    console.error(`${RED}   FIX: Add these keys to bootstrap fallbackKeys or as aliases${RESET}\n`);
    hasErrors = true;
  } else {
    console.log(`${GREEN}✓ All ${selectorPool.length} selector pool keys are registered${RESET}\n`);
  }
  
  // Check: Are all aliases pointing to valid canonical keys?
  console.log(`${CYAN}=== Alias Validity Check ===${RESET}`);
  const invalidAliases = [];
  const allCanonicalKeys = new Set(games.map(g => g.key));
  
  for(const [alias, canonical] of aliases){
    if(!allCanonicalKeys.has(canonical)){
      invalidAliases.push({ alias, canonical });
    }
  }
  
  if(invalidAliases.length > 0){
    console.warn(`${YELLOW}⚠️  ${invalidAliases.length} alias(es) point to keys not in registry:${RESET}`);
    invalidAliases.forEach(({ alias, canonical }) => {
      console.warn(`${YELLOW}   '${alias}' → '${canonical}' (not found)${RESET}`);
    });
    console.warn(`${YELLOW}   These aliases will not resolve correctly\n${RESET}`);
    hasErrors = true;
  } else {
    console.log(`${GREEN}✓ All aliases point to valid canonical keys${RESET}\n`);
  }
  
  // Check: Are all registry keys registered in bootstrap?
  console.log(`${CYAN}=== Bootstrap Coverage Check ===${RESET}`);
  const registryKeys = games.map(g => g.key);
  const unregisteredKeys = registryKeys.filter(key => !canonicalKeys.has(key));
  
  if(unregisteredKeys.length > 0){
    console.warn(`${YELLOW}⚠️  ${unregisteredKeys.length} registry key(s) not in bootstrap fallback:${RESET}`);
    unregisteredKeys.forEach(key => console.warn(`${YELLOW}   - ${key}${RESET}`));
    console.warn(`${YELLOW}   Note: This is OK if MinigameRegistry is always available at runtime${RESET}`);
    console.warn(`${YELLOW}   The bootstrap dynamically loads from registry when available\n${RESET}`);
  } else {
    console.log(`${GREEN}✓ All registry keys are in bootstrap fallback${RESET}\n`);
  }
  
  // Summary
  console.log(`${CYAN}=== Validation Summary ===${RESET}`);
  if(hasErrors){
    console.error(`${RED}✗ VALIDATION FAILED${RESET}`);
    console.error(`${RED}  Fix the errors above to prevent runtime issues${RESET}\n`);
    return 1;
  } else {
    console.log(`${GREEN}✓ VALIDATION PASSED${RESET}`);
    console.log(`${GREEN}  All minigame keys are properly registered${RESET}\n`);
    return 0;
  }
}

// Run validation
const exitCode = validate();
process.exit(exitCode);
