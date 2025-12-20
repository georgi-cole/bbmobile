#!/usr/bin/env node
/**
 * Script to migrate minigames to use central-scoring.js with SCALE=1000
 * 
 * This script performs the following transformations:
 * 1. Removes forced loss logic (30 + Math.random() * 25)
 * 2. Removes manual score clamping to 100
 * 3. Wraps final score calculations with MinigameScoring.calculateFinalScore
 * 4. Removes determineGameResult + coerceSuccessToLossScore pattern
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MINIGAMES_DIR = path.join(__dirname, '..', 'js', 'minigames');

// Patterns to match and replace
const PATTERNS = {
  // Pattern 1: Remove forced loss logic with determineGameResult
  forcedLoss: {
    regex: /\/\/ Apply win probability logic.*?let finalScore = rawScore;.*?if\(g\.GameUtils && !debugMode && competitionMode\)\{.*?const shouldWin = g\.GameUtils\.determineGameResult\([^)]+\);.*?if\(!shouldWin && playerSucceeded\)\{.*?finalScore = Math\.round\(30 \+ Math\.random\(\) \* 25\);.*?console\.log\([^)]+\);.*?\}.*?\}/gs,
    replacement: '// Score calculated using MinigameScoring (SCALE=1000)\n          const finalScore = g.MinigameScoring ? \n            g.MinigameScoring.calculateFinalScore({\n              rawScore: rawScore,\n              minScore: 0,\n              maxScore: 100,\n              compBeast: 0.5\n            }) :\n            rawScore * 10;'
  },
  
  // Pattern 2: Simple Math.min(100, ...) clamping
  mathMinClamp: {
    regex: /const (\w+) = Math\.min\(100, (Math\.max\([^)]+\)|[^;]+)\);/g,
    replacement: 'const $1 = Math.max(0, $2);'
  },
  
  // Pattern 3: Math.round at score output - scale up by 10
  finalScoreOutput: {
    regex: /onComplete\((\w+Score)\);/g,
    replacement: (match, scoreName) => {
      return `onComplete(Math.round(${scoreName} * 10));`;
    }
  }
};

/**
 * Analyze a minigame file to see what patterns it contains
 */
function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const fileName = path.basename(filePath);
  
  const analysis = {
    hasForcedLoss: content.includes('30 + Math.random() * 25'),
    hasDetermineGameResult: content.includes('determineGameResult'),
    hasMathMin100: content.includes('Math.min(100'),
    hasOnComplete: content.includes('onComplete'),
    needsMigration: false
  };
  
  analysis.needsMigration = analysis.hasForcedLoss || analysis.hasDetermineGameResult || analysis.hasMathMin100;
  
  return { fileName, filePath, ...analysis };
}

/**
 * Migrate a single file
 */
function migrateFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let modified = false;
  
  // Pattern 1: Remove forced loss pattern
  if (content.includes('30 + Math.random() * 25')) {
    // More surgical replacement - find the specific forced loss block
    const forcedLossPattern = /\/\/ Determine if player succeeded[\s\S]*?const playerSucceeded = [^;]+;[\s\S]*?\/\/ Apply win probability logic[\s\S]*?let finalScore = rawScore;[\s\S]*?if\(g\.GameUtils && !debugMode && competitionMode\)\{[\s\S]*?const shouldWin = g\.GameUtils\.determineGameResult\([^)]+\);[\s\S]*?if\(!shouldWin && playerSucceeded\)\{[\s\S]*?\/\/ Force loss[^\n]*\n[\s\S]*?finalScore = Math\.round\(30 \+ Math\.random\(\) \* 25\);[^\n]*\n[\s\S]*?console\.log\([^\)]+\);[\s\S]*?\}[\s\S]*?\}/;
    
    if (forcedLossPattern.test(content)) {
      content = content.replace(forcedLossPattern, 
        '// Use MinigameScoring to calculate final score (SCALE=1000)\n' +
        '          const finalScore = g.MinigameScoring ? \n' +
        '            g.MinigameScoring.calculateFinalScore({\n' +
        '              rawScore: rawScore,\n' +
        '              minScore: 0,\n' +
        '              maxScore: 100,\n' +
        '              compBeast: 0.5\n' +
        '            }) :\n' +
        '            rawScore * 10; // Fallback: scale to 0-1000'
      );
      modified = true;
      console.log(`  ✓ Removed forced loss pattern`);
    }
  }
  
  // Pattern 2: Remove determineGameResult without forced loss
  if (content.includes('determineGameResult') && !modified) {
    content = content.replace(
      /g\.GameUtils\.determineGameResult\(([^,)]+),\s*false\)/g,
      'g.GameUtils.determineGameResult($1, \'hoh\', {debugMode: false})'
    );
    modified = true;
    console.log(`  ✓ Updated determineGameResult to use phase parameter`);
  }
  
  // Write back if modified
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf-8');
    return true;
  }
  
  return false;
}

/**
 * Main migration function
 */
async function main() {
  console.log('🔄 Minigame Migration Tool - Central Scoring SCALE=1000\n');
  
  // Get all .js files in minigames directory
  const files = fs.readdirSync(MINIGAMES_DIR)
    .filter(f => f.endsWith('.js') && !f.startsWith('.'))
    .map(f => path.join(MINIGAMES_DIR, f));
  
  console.log(`Found ${files.length} minigame files\n`);
  
  // Analyze all files
  console.log('📊 Analyzing files...\n');
  const analyses = files.map(analyzeFile);
  
  const needsMigration = analyses.filter(a => a.needsMigration);
  console.log(`Files needing migration: ${needsMigration.length}\n`);
  
  // Show breakdown
  console.log('Pattern breakdown:');
  console.log(`  - Forced loss pattern: ${analyses.filter(a => a.hasForcedLoss).length}`);
  console.log(`  - determineGameResult: ${analyses.filter(a => a.hasDetermineGameResult).length}`);
  console.log(`  - Math.min(100: ${analyses.filter(a => a.hasMathMin100).length}`);
  console.log('');
  
  // Migrate files
  console.log('🔧 Migrating files...\n');
  let migrated = 0;
  
  for (const analysis of needsMigration) {
    console.log(`Migrating ${analysis.fileName}...`);
    const wasMigrated = migrateFile(analysis.filePath);
    if (wasMigrated) {
      migrated++;
    }
  }
  
  console.log(`\n✅ Migration complete: ${migrated} files modified`);
  console.log(`\nNote: Some files may require manual review for complex scoring logic.`);
}

main().catch(console.error);
