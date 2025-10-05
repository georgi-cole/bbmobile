#!/usr/bin/env node
/**
 * Generate minigame-manifest.json from game directories
 * Scans js/minigames/ for game modules and validates them
 * 
 * Usage: node scripts/generate-minigame-manifest.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const MINIGAMES_DIR = path.join(ROOT, 'js', 'minigames');
const OUTPUT_FILE = path.join(ROOT, 'minigame-manifest.json');

console.log('🎮 Minigame Manifest Generator\n');
console.log('Scanning:', MINIGAMES_DIR);

/**
 * Extract game metadata from a module file
 * @param {string} filePath - Path to game module
 * @returns {Object|null} Game metadata or null if not a game
 */
function extractMetadata(filePath){
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath);
    
    // Skip non-game files
    if(fileName.startsWith('_') || 
       fileName === 'index.js' ||
       fileName === 'registry.js' ||
       fileName === 'selector.js' ||
       fileName === 'scoring.js' ||
       fileName === 'telemetry.js' ||
       fileName === 'error-handler.js' ||
       fileName === 'debug-panel.js' ||
       fileName === 'accessibility.js' ||
       fileName === 'mobile-utils.js'){
      return null;
    }
    
    // Skip core directory
    if(filePath.includes('/core/')){
      return null;
    }
    
    // Check for render function (required for all games)
    const hasRender = content.includes('function render(') || 
                      content.includes('render: function(') ||
                      content.includes('render(container');
    
    if(!hasRender){
      console.warn(`⚠️  ${fileName} missing render() function`);
    }
    
    // Check for completion callback
    const hasComplete = content.includes('onComplete(') || 
                        content.includes('onSubmit(') ||
                        content.includes('complete(');
    
    if(!hasComplete){
      console.warn(`⚠️  ${fileName} missing completion callback`);
    }
    
    // Try to extract game name from comments or export
    let gameName = fileName.replace('.js', '')
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    // Look for MODULE: comment
    const moduleMatch = content.match(/\/\/\s*MODULE:\s*minigames\/([^\.]+)\.js/);
    if(moduleMatch){
      gameName = moduleMatch[1]
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
    
    // Convert filename to camelCase key
    const gameKey = fileName.replace('.js', '')
      .split('-')
      .map((word, i) => i === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1))
      .join('');
    
    return {
      key: gameKey,
      name: gameName,
      module: fileName,
      hasRender,
      hasComplete,
      fileSize: fs.statSync(filePath).size
    };
  } catch(error){
    console.error(`Error processing ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Scan minigames directory for game modules
 * @returns {Array} Array of game metadata
 */
function scanGames(){
  const games = [];
  
  try {
    const files = fs.readdirSync(MINIGAMES_DIR);
    
    for(const file of files){
      if(!file.endsWith('.js')){
        continue;
      }
      
      const filePath = path.join(MINIGAMES_DIR, file);
      const stat = fs.statSync(filePath);
      
      if(!stat.isFile()){
        continue;
      }
      
      const metadata = extractMetadata(filePath);
      if(metadata){
        games.push(metadata);
      }
    }
  } catch(error){
    console.error('Error scanning games:', error.message);
    process.exit(1);
  }
  
  return games;
}

/**
 * Load registry data for comparison
 * @returns {Object} Registry data
 */
function loadRegistry(){
  try {
    const registryPath = path.join(MINIGAMES_DIR, 'registry.js');
    const content = fs.readFileSync(registryPath, 'utf8');
    
    // Extract REGISTRY object (basic parsing)
    const registryMatch = content.match(/const REGISTRY\s*=\s*\{([\s\S]*?)\n\s*\};/);
    if(!registryMatch){
      console.warn('Could not parse registry.js');
      return {};
    }
    
    // Count games in registry (rough estimate)
    const gameCount = (content.match(/\s+key:\s*'/g) || []).length;
    
    return {
      found: true,
      gameCount
    };
  } catch(error){
    console.warn('Could not load registry:', error.message);
    return { found: false };
  }
}

/**
 * Generate manifest file
 */
function generateManifest(){
  console.log('\n📝 Scanning games...\n');
  
  const games = scanGames();
  const registry = loadRegistry();
  
  console.log(`✅ Found ${games.length} game modules`);
  
  if(registry.found){
    console.log(`📚 Registry contains ${registry.gameCount} registered games`);
  }
  
  // Check for contract violations
  const missingRender = games.filter(g => !g.hasRender);
  const missingComplete = games.filter(g => !g.hasComplete);
  
  if(missingRender.length > 0){
    console.warn(`\n⚠️  ${missingRender.length} games missing render():`);
    missingRender.forEach(g => console.warn(`   - ${g.module}`));
  }
  
  if(missingComplete.length > 0){
    console.warn(`\n⚠️  ${missingComplete.length} games missing completion callback:`);
    missingComplete.forEach(g => console.warn(`   - ${g.module}`));
  }
  
  // Generate manifest
  const manifest = {
    generated: new Date().toISOString(),
    version: '1.0.0',
    gamesScanned: games.length,
    registryGames: registry.gameCount || 0,
    games: games.sort((a, b) => a.key.localeCompare(b.key))
  };
  
  // Write manifest file
  try {
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(manifest, null, 2));
    console.log(`\n✅ Manifest generated: ${OUTPUT_FILE}`);
    console.log(`   Total games: ${games.length}`);
    console.log(`   Valid contracts: ${games.filter(g => g.hasRender && g.hasComplete).length}`);
  } catch(error){
    console.error('\n❌ Error writing manifest:', error.message);
    process.exit(1);
  }
  
  // Exit with error if there are contract violations
  if(missingRender.length > 0 || missingComplete.length > 0){
    console.error('\n❌ Contract violations detected');
    process.exit(1);
  }
  
  console.log('\n✅ All checks passed\n');
}

// Run
generateManifest();
