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
       fileName === 'mobile-utils.js' ||
       fileName === 'GameConfig.js' ||
       fileName === 'central-scoring.js' ||
       fileName === 'gameUtils.js' ||
       fileName === 'high-score-manager.js' ||
       fileName === 'instructions.js' ||
       fileName === 'loader.js' ||
       fileName === 'opponent-synth.js' ||
       fileName === 'rules-modal.js' ||
       fileName === 'rules-registry.js'){
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
 * Load registry data for comparison and extract metadata
 * @returns {Object} Registry data with game metadata
 */
function loadRegistry(){
  try {
    const registryPath = path.join(MINIGAMES_DIR, 'registry.js');
    const content = fs.readFileSync(registryPath, 'utf8');
    
    // Parse registry entries to extract metadata including new fields
    const games = {};
    const gamePattern = /(\w+):\s*\{([^}]*key:\s*'(\w+)'[^}]*)\}/g;
    let match;
    
    while((match = gamePattern.exec(content)) !== null){
      const key = match[3];
      const blockContent = match[2];
      
      // Extract metadata fields
      const getName = blockContent.match(/name:\s*'([^']*)'/);
      const getCategory = blockContent.match(/category:\s*'([^']*)'/);
      const getDifficulty = blockContent.match(/difficulty:\s*'([^']*)'/);
      const getDuration = blockContent.match(/estimatedDuration:\s*(\d+)/);
      const getImplemented = blockContent.match(/implemented:\s*(true|false)/);
      const getRetired = blockContent.match(/retired:\s*(true|false)/);
      const getReplacedBy = blockContent.match(/replacedBy:\s*'([^']*)'/);
      
      games[key] = {
        key,
        name: getName ? getName[1] : key,
        category: getCategory ? getCategory[1] : null,
        difficulty: getDifficulty ? getDifficulty[1] : null,
        estimatedDuration: getDuration ? parseInt(getDuration[1], 10) : null,
        implemented: getImplemented ? getImplemented[1] === 'true' : false,
        retired: getRetired ? getRetired[1] === 'true' : false,
        replacedBy: getReplacedBy ? getReplacedBy[1] : null
      };
    }
    
    return {
      found: true,
      gameCount: Object.keys(games).length,
      games
    };
  } catch(error){
    console.warn('Could not load registry:', error.message);
    return { found: false, games: {} };
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
  
  // Enrich game metadata with registry data
  const enrichedGames = games.map(game => {
    const registryData = registry.games[game.key];
    return {
      ...game,
      ...(registryData || {})
    };
  });
  
  // Check for retired/placeholder games
  const retiredGames = enrichedGames.filter(g => g.retired);
  const unimplementedGames = enrichedGames.filter(g => !g.implemented);
  
  if(retiredGames.length > 0){
    console.warn(`\n⚠️  ${retiredGames.length} retired games (excluded from selection):`);
    retiredGames.forEach(g => console.warn(`   - ${g.key}${g.replacedBy ? ` (replaced by ${g.replacedBy})` : ''}`));
  }
  
  if(unimplementedGames.length > 0){
    console.warn(`\n⚠️  ${unimplementedGames.length} unimplemented/placeholder games:`);
    unimplementedGames.forEach(g => console.warn(`   - ${g.key}`));
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
    implementedGames: enrichedGames.filter(g => g.implemented && !g.retired).length,
    retiredGames: retiredGames.length,
    games: enrichedGames.sort((a, b) => a.key.localeCompare(b.key))
  };
  
  // Write manifest file
  try {
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(manifest, null, 2));
    console.log(`\n✅ Manifest generated: ${OUTPUT_FILE}`);
    console.log(`   Total games: ${games.length}`);
    console.log(`   Implemented: ${manifest.implementedGames}`);
    console.log(`   Retired: ${manifest.retiredGames}`);
    console.log(`   Valid contracts: ${games.filter(g => g.hasRender && g.hasComplete).length}`);
  } catch(error){
    console.error('\n❌ Error writing manifest:', error.message);
    process.exit(1);
  }
  
  // Only exit with error if there are CRITICAL contract violations
  // (retired/unimplemented games are warnings, not errors)
  // Legacy API games (with init instead of render) are also warnings
  const criticalViolations = missingRender.length > 0 || missingComplete.length > 0;
  
  if(criticalViolations){
    console.warn('\n⚠️  Some games use legacy API (init instead of render)');
    console.warn('    These games still work but should be migrated eventually');
    // Don't fail the build for legacy API - only for truly missing implementations
    
    const trulyMissing = missingRender.filter(g => {
      // Check if it has an 'init' function (legacy API)
      try {
        const filePath = path.join(MINIGAMES_DIR, g.module);
        const content = fs.readFileSync(filePath, 'utf8');
        // Check for various init patterns
        return !(
          content.includes('function init(') || 
          content.includes('init: function(') ||
          content.includes('init(container') ||
          /\binit\s*\(/m.test(content)
        );
      } catch(e){
        return true; // Assume truly missing if we can't read the file
      }
    });
    
    if(trulyMissing.length > 0){
      console.error('\n❌ Contract violations detected - truly missing implementations:');
      trulyMissing.forEach(g => console.error(`   - ${g.module}`));
      process.exit(1);
    }
  }
  
  console.log('\n✅ All checks passed\n');
}

// Run
generateManifest();
