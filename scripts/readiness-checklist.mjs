#!/usr/bin/env node
/**
 * Readiness checklist script for minigame system
 * Validates that all components are ready for production
 * 
 * Usage: node scripts/readiness-checklist.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

console.log('🎯 Minigame System Readiness Checklist\n');
console.log('='.repeat(60) + '\n');

const checks = {
  passed: 0,
  failed: 0,
  warnings: 0,
  details: []
};

/**
 * Check if a file exists
 * @param {string} filePath - File path to check
 * @param {string} description - Description for logging
 * @returns {boolean} True if file exists
 */
function checkFile(filePath, description){
  const fullPath = path.join(ROOT, filePath);
  const exists = fs.existsSync(fullPath);
  
  if(exists){
    checks.passed++;
    console.log(`✅ ${description}`);
  } else {
    checks.failed++;
    console.error(`❌ ${description} (not found: ${filePath})`);
  }
  
  checks.details.push({ check: description, passed: exists, path: filePath });
  return exists;
}

/**
 * Check module file and content
 * @param {string} filePath - Module path
 * @param {string} exportName - Expected export name
 * @returns {boolean} True if valid
 */
function checkModule(filePath, exportName){
  const fullPath = path.join(ROOT, filePath);
  
  if(!fs.existsSync(fullPath)){
    checks.failed++;
    console.error(`❌ Module missing: ${filePath}`);
    checks.details.push({ check: `Module ${exportName}`, passed: false, path: filePath });
    return false;
  }
  
  const content = fs.readFileSync(fullPath, 'utf8');
  const hasExport = content.includes(`g.${exportName}`) || content.includes(`window.${exportName}`);
  
  if(hasExport){
    checks.passed++;
    console.log(`✅ Module ${exportName}`);
  } else {
    checks.failed++;
    console.error(`❌ Module ${exportName} missing export`);
  }
  
  checks.details.push({ check: `Module ${exportName}`, passed: hasExport, path: filePath });
  return hasExport;
}

/**
 * Check manifest file
 * @returns {Object|null} Manifest data or null
 */
function checkManifest(){
  const manifestPath = path.join(ROOT, 'minigame-manifest.json');
  
  if(!fs.existsSync(manifestPath)){
    checks.failed++;
    console.error('❌ Manifest file missing');
    checks.details.push({ check: 'Manifest', passed: false });
    return null;
  }
  
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    
    if(manifest.gamesScanned >= 15){
      checks.passed++;
      console.log(`✅ Manifest (${manifest.gamesScanned} games scanned)`);
    } else {
      checks.warnings++;
      console.warn(`⚠️  Manifest (only ${manifest.gamesScanned} games scanned, expected ≥15)`);
    }
    
    checks.details.push({ 
      check: 'Manifest', 
      passed: true, 
      games: manifest.gamesScanned 
    });
    
    return manifest;
  } catch(error){
    checks.failed++;
    console.error('❌ Manifest parse error:', error.message);
    checks.details.push({ check: 'Manifest', passed: false, error: error.message });
    return null;
  }
}

/**
 * Check registry consistency
 * @returns {Object|null} Registry stats or null
 */
function checkRegistry(){
  const registryPath = path.join(ROOT, 'js', 'minigames', 'registry.js');
  
  if(!fs.existsSync(registryPath)){
    checks.failed++;
    console.error('❌ Registry file missing');
    return null;
  }
  
  try {
    const content = fs.readFileSync(registryPath, 'utf8');
    
    // Count registered games (rough estimate)
    const keyMatches = content.match(/\s+key:\s*['"](\w+)['"]/g) || [];
    const gameCount = keyMatches.length;
    
    // Count implemented games
    const implementedMatches = content.match(/implemented:\s*true/g) || [];
    const implementedCount = implementedMatches.length;
    
    if(gameCount >= 15){
      checks.passed++;
      console.log(`✅ Registry (${gameCount} games, ${implementedCount} implemented)`);
    } else {
      checks.warnings++;
      console.warn(`⚠️  Registry (only ${gameCount} games, expected ≥15)`);
    }
    
    checks.details.push({
      check: 'Registry',
      passed: gameCount >= 15,
      total: gameCount,
      implemented: implementedCount
    });
    
    return { total: gameCount, implemented: implementedCount };
  } catch(error){
    checks.failed++;
    console.error('❌ Registry error:', error.message);
    return null;
  }
}

/**
 * Check documentation files
 */
function checkDocs(){
  const docs = [
    'docs/minigames.md',
    'docs/QUICK_REFERENCE.md'
  ];
  
  let allPresent = true;
  for(const doc of docs){
    const fullPath = path.join(ROOT, doc);
    if(fs.existsSync(fullPath)){
      const content = fs.readFileSync(fullPath, 'utf8');
      if(content.length > 100){
        checks.passed++;
        console.log(`✅ Documentation: ${doc}`);
      } else {
        checks.warnings++;
        console.warn(`⚠️  Documentation too short: ${doc}`);
        allPresent = false;
      }
    } else {
      checks.failed++;
      console.error(`❌ Documentation missing: ${doc}`);
      allPresent = false;
    }
  }
  
  checks.details.push({ check: 'Documentation', passed: allPresent });
}

/**
 * Main checklist
 */
function runChecklist(){
  console.log('📋 Core Modules:\n');
  
  checkModule('js/minigames/registry.js', 'MinigameRegistry');
  checkModule('js/minigames/selector.js', 'MinigameSelector');
  checkModule('js/minigames/scoring.js', 'MinigameScoring');
  checkModule('js/minigames/telemetry.js', 'MinigameTelemetry');
  checkModule('js/minigames/error-handler.js', 'MinigameErrorHandler');
  checkModule('js/minigames/accessibility.js', 'MinigameAccessibility');
  checkModule('js/minigames/mobile-utils.js', 'MinigameMobileUtils');
  
  console.log('\n📋 Core Extensions:\n');
  
  checkModule('js/minigames/core/lifecycle.js', 'MinigameLifecycle');
  checkModule('js/minigames/core/watchdog.js', 'MinigameWatchdog');
  checkModule('js/minigames/core/compat-bridge.js', 'MinigameCompatBridge');
  checkModule('js/minigames/core/context.js', 'MinigameContext');
  
  console.log('\n📋 Build & Test:\n');
  
  checkFile('scripts/generate-minigame-manifest.mjs', 'Manifest generator script');
  checkFile('tests/minigames/contract.spec.js', 'Contract test suite');
  checkFile('tests/minigames/distribution.spec.js', 'Distribution test suite');
  
  console.log('\n📋 Data & Config:\n');
  
  const manifest = checkManifest();
  const registry = checkRegistry();
  
  console.log('\n📋 Documentation:\n');
  
  checkDocs();
  
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Summary:\n');
  
  console.log(`  ✅ Passed: ${checks.passed}`);
  console.log(`  ❌ Failed: ${checks.failed}`);
  console.log(`  ⚠️  Warnings: ${checks.warnings}`);
  
  const totalChecks = checks.passed + checks.failed + checks.warnings;
  const passRate = totalChecks > 0 ? (checks.passed / totalChecks * 100).toFixed(1) : 0;
  
  console.log(`  📈 Pass Rate: ${passRate}%`);
  
  // Overall status
  const status = checks.failed === 0 ? 'READY' : 'NOT READY';
  const emoji = checks.failed === 0 ? '✅' : '❌';
  
  console.log(`\n${emoji} System Status: ${status}`);
  
  if(manifest && registry){
    console.log('\n📊 Game Statistics:');
    console.log(`  Games scanned: ${manifest.gamesScanned}`);
    console.log(`  Registry games: ${registry.total}`);
    console.log(`  Implemented: ${registry.implemented}`);
    
    if(manifest.gamesScanned !== registry.total){
      console.warn(`  ⚠️  Mismatch: scanned ≠ registry (${manifest.gamesScanned} vs ${registry.total})`);
    }
  }
  
  // Write results to file
  const resultPath = path.join(ROOT, 'readiness-results.json');
  try {
    fs.writeFileSync(resultPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      status,
      ...checks,
      manifest: manifest ? { games: manifest.gamesScanned } : null,
      registry: registry
    }, null, 2));
    console.log(`\n💾 Results saved to: readiness-results.json`);
  } catch(error){
    console.warn('⚠️  Could not save results:', error.message);
  }
  
  console.log('');
  
  // Exit with error code if failed
  process.exit(checks.failed > 0 ? 1 : 0);
}

// Run checklist
runChecklist();
