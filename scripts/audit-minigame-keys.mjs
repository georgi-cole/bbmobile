#!/usr/bin/env node
/**
 * Audit script to verify all selector pool keys are registered
 * Checks registry vs bootstrap vs selector compatibility
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

/**
 * Extract canonical keys from registry.js
 */
function extractRegistryKeys(){
  const registryPath = path.join(PROJECT_ROOT, 'js/minigames/registry.js');
  const content = fs.readFileSync(registryPath, 'utf8');
  
  // Find all key: 'value' pairs in the REGISTRY object
  const keyMatches = content.matchAll(/^\s+(\w+):\s*\{[^}]*key:\s*'(\w+)'/gm);
  const keys = [];
  
  for(const match of keyMatches){
    const propertyName = match[1];
    const keyValue = match[2];
    
    // They should match
    if(propertyName === keyValue){
      keys.push(keyValue);
    } else {
      console.warn(`${colors.yellow}Warning: Property name "${propertyName}" doesn't match key value "${keyValue}"${colors.reset}`);
      keys.push(keyValue); // Use the key value as canonical
    }
  }
  
  return keys;
}

/**
 * Extract canonical keys from bootstrap fallback list
 */
function extractBootstrapFallbackKeys(){
  const bootstrapPath = path.join(PROJECT_ROOT, 'js/minigames/core/registry-bootstrap.js');
  const content = fs.readFileSync(bootstrapPath, 'utf8');
  
  // Find the fallbackKeys array
  const fallbackMatch = content.match(/const fallbackKeys = \[([\s\S]*?)\];/);
  if(!fallbackMatch){
    console.error(`${colors.red}Could not find fallbackKeys array in bootstrap${colors.reset}`);
    return [];
  }
  
  // Extract all quoted strings
  const keys = [];
  const keyMatches = fallbackMatch[1].matchAll(/'(\w+)'/g);
  for(const match of keyMatches){
    keys.push(match[1]);
  }
  
  return keys;
}

/**
 * Extract all aliases from bootstrap
 */
function extractBootstrapAliases(){
  const bootstrapPath = path.join(PROJECT_ROOT, 'js/minigames/core/registry-bootstrap.js');
  const content = fs.readFileSync(bootstrapPath, 'utf8');
  
  const aliases = {};
  
  // Extract legacyAliases
  const legacyMatch = content.match(/const legacyAliases = \{([\s\S]*?)\};/);
  if(legacyMatch){
    const aliasMatches = legacyMatch[1].matchAll(/'(\w+)':\s*'(\w+)'/g);
    for(const match of aliasMatches){
      aliases[match[1]] = match[2];
    }
  }
  
  // Extract descriptiveAliases
  const descriptiveMatch = content.match(/const descriptiveAliases = \{([\s\S]*?)\};/);
  if(descriptiveMatch){
    const aliasMatches = descriptiveMatch[1].matchAll(/'([\w-]+)':\s*'(\w+)'/g);
    for(const match of aliasMatches){
      aliases[match[1]] = match[2];
    }
  }
  
  return aliases;
}

/**
 * Check which keys from registry are implemented and not retired
 */
function getImplementedKeys(){
  const registryPath = path.join(PROJECT_ROOT, 'js/minigames/registry.js');
  const content = fs.readFileSync(registryPath, 'utf8');
  
  // Find all game entries with implemented: true and retired: false (or no retired field)
  const implementedKeys = [];
  
  // Split into individual game blocks
  const gameBlocks = content.split(/^\s+\w+:\s*\{/m).slice(1);
  
  for(const block of gameBlocks){
    const keyMatch = block.match(/key:\s*'(\w+)'/);
    const implementedMatch = block.match(/implemented:\s*(true|false)/);
    const retiredMatch = block.match(/retired:\s*(true|false)/);
    
    if(keyMatch && implementedMatch && implementedMatch[1] === 'true'){
      const isRetired = retiredMatch && retiredMatch[1] === 'true';
      if(!isRetired){
        implementedKeys.push(keyMatch[1]);
      }
    }
  }
  
  return implementedKeys;
}

/**
 * Main audit function
 */
function audit(){
  console.log(`\n${colors.cyan}=== Minigame Key Audit ===${colors.reset}\n`);
  
  // Extract data
  const registryKeys = extractRegistryKeys();
  const bootstrapFallbackKeys = extractBootstrapFallbackKeys();
  const aliases = extractBootstrapAliases();
  const implementedKeys = getImplementedKeys();
  
  console.log(`${colors.blue}Registry canonical keys:${colors.reset} ${registryKeys.length}`);
  console.log(`${colors.blue}Bootstrap fallback keys:${colors.reset} ${bootstrapFallbackKeys.length}`);
  console.log(`${colors.blue}Aliases defined:${colors.reset} ${Object.keys(aliases).length}`);
  console.log(`${colors.blue}Implemented (non-retired):${colors.reset} ${implementedKeys.length}`);
  
  // Check 1: Are all registry keys in bootstrap fallback?
  console.log(`\n${colors.cyan}=== Check 1: Registry → Bootstrap Coverage ===${colors.reset}`);
  const missingFromBootstrap = registryKeys.filter(key => !bootstrapFallbackKeys.includes(key));
  if(missingFromBootstrap.length > 0){
    console.log(`${colors.red}✗ ${missingFromBootstrap.length} registry keys missing from bootstrap fallback:${colors.reset}`);
    missingFromBootstrap.forEach(key => console.log(`  - ${key}`));
  } else {
    console.log(`${colors.green}✓ All registry keys are in bootstrap fallback${colors.reset}`);
  }
  
  // Check 2: Are all bootstrap keys in registry?
  console.log(`\n${colors.cyan}=== Check 2: Bootstrap → Registry Coverage ===${colors.reset}`);
  const missingFromRegistry = bootstrapFallbackKeys.filter(key => !registryKeys.includes(key));
  if(missingFromRegistry.length > 0){
    console.log(`${colors.red}✗ ${missingFromRegistry.length} bootstrap keys not in registry:${colors.reset}`);
    missingFromRegistry.forEach(key => console.log(`  - ${key}`));
  } else {
    console.log(`${colors.green}✓ All bootstrap keys are in registry${colors.reset}`);
  }
  
  // Check 3: Are all alias targets valid canonical keys?
  console.log(`\n${colors.cyan}=== Check 3: Alias → Canonical Validity ===${colors.reset}`);
  const invalidAliases = Object.entries(aliases).filter(([alias, canonical]) => !registryKeys.includes(canonical));
  if(invalidAliases.length > 0){
    console.log(`${colors.red}✗ ${invalidAliases.length} aliases point to invalid keys:${colors.reset}`);
    invalidAliases.forEach(([alias, canonical]) => console.log(`  - '${alias}' → '${canonical}' (not in registry)`));
  } else {
    console.log(`${colors.green}✓ All aliases point to valid canonical keys${colors.reset}`);
  }
  
  // Check 4: List the expected selector pool (implemented, non-retired)
  console.log(`\n${colors.cyan}=== Check 4: Expected Selector Pool ===${colors.reset}`);
  console.log(`These ${implementedKeys.length} keys should be in the selector pool:`);
  implementedKeys.forEach(key => console.log(`  - ${key}`));
  
  // Check 5: Verify all implemented keys are registered (either canonical or alias)
  console.log(`\n${colors.cyan}=== Check 5: Pool Keys → Registration ===${colors.reset}`);
  const allKnownKeys = new Set([...bootstrapFallbackKeys, ...Object.keys(aliases)]);
  const unregisteredPoolKeys = implementedKeys.filter(key => !allKnownKeys.has(key));
  if(unregisteredPoolKeys.length > 0){
    console.log(`${colors.red}✗ ${unregisteredPoolKeys.length} pool keys are not registered (will cause "Unknown minigame" errors):${colors.reset}`);
    unregisteredPoolKeys.forEach(key => console.log(`  - ${key}`));
  } else {
    console.log(`${colors.green}✓ All pool keys are registered${colors.reset}`);
  }
  
  // Summary
  console.log(`\n${colors.cyan}=== Summary ===${colors.reset}`);
  const issueCount = missingFromBootstrap.length + missingFromRegistry.length + invalidAliases.length + unregisteredPoolKeys.length;
  if(issueCount === 0){
    console.log(`${colors.green}✓ No issues found! All keys are properly registered.${colors.reset}`);
    return 0;
  } else {
    console.log(`${colors.red}✗ Found ${issueCount} issue(s) that need to be fixed.${colors.reset}`);
    return 1;
  }
}

// Run audit
const exitCode = audit();
process.exit(exitCode);
