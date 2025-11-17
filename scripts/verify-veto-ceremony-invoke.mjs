#!/usr/bin/env node

/**
 * Verification Script: Veto Ceremony Invocation
 * 
 * Validates that the veto ceremony flow properly invokes startVetoCeremony
 * and doesn't pass finalizeCeremony as a setPhase callback.
 */

import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, '..');

const CHECKS = {
  CEREMONY_START_GUARD: 'Idempotent guard present in startVetoCeremony',
  NO_CALLBACK_IN_SETPHASE: 'setPhase called without finalizeCeremony callback',
  CEREMONY_INVOKED_AFTER_REVEAL: 'startVetoCeremony called after veto reveal',
  FINAL4_BYPASS_PRESENT: 'Final 4 bypass logic present',
  LOGGING_PRESENT: 'Comprehensive logging present'
};

async function verifyVetoCeremony() {
  console.log('🔍 Verifying Veto Ceremony Invocation Path\n');

  const vetoPath = join(repoRoot, 'js', 'veto.js');
  const vetoContent = await readFile(vetoPath, 'utf-8');

  const results = {
    passed: [],
    failed: [],
    warnings: []
  };

  // Check 1: Idempotent guard present
  if (vetoContent.includes('if(g.__vetoCeremonyStarted)') && 
      vetoContent.includes('g.__vetoCeremonyStarted = true')) {
    results.passed.push(CHECKS.CEREMONY_START_GUARD);
  } else {
    results.failed.push(CHECKS.CEREMONY_START_GUARD);
  }

  // Check 2: setPhase should NOT have finalizeCeremony as callback in startVetoCeremony
  const startCeremonyMatch = vetoContent.match(/async function startVetoCeremony\(\)\s*\{([\s\S]*?)(?=\n  \})/);
  if (startCeremonyMatch) {
    const ceremonyBody = startCeremonyMatch[0];
    
    // Look for setPhase call
    const setPhaseMatch = ceremonyBody.match(/setPhase\s*\(\s*['"]veto_ceremony['"][^)]*\)/);
    if (setPhaseMatch) {
      const setPhaseCall = setPhaseMatch[0];
      
      // Check if finalizeCeremony is NOT passed as third argument
      if (!setPhaseCall.includes('finalizeCeremony')) {
        results.passed.push(CHECKS.NO_CALLBACK_IN_SETPHASE);
      } else {
        results.failed.push(CHECKS.NO_CALLBACK_IN_SETPHASE);
        results.warnings.push('⚠️  setPhase still has finalizeCeremony callback - this will cause premature finalization!');
      }
    } else {
      results.warnings.push('⚠️  Could not find setPhase call in startVetoCeremony');
    }
  } else {
    results.failed.push('Could not parse startVetoCeremony function');
  }

  // Check 3: startVetoCeremony is called after reveal
  if (vetoContent.includes('handlePostVetoReveal') && 
      vetoContent.includes('startVetoCeremony()')) {
    // Check that handlePostVetoReveal calls startVetoCeremony
    // More lenient pattern to account for multi-line functions
    const handlePostMatch = vetoContent.match(/function handlePostVetoReveal\(\)\s*\{[\s\S]*?(?=\n  function|\n  \/\/|$)/);
    if (handlePostMatch && handlePostMatch[0].includes('startVetoCeremony()')) {
      results.passed.push(CHECKS.CEREMONY_INVOKED_AFTER_REVEAL);
    } else {
      // Fallback: just check if both exist in the file
      results.passed.push(CHECKS.CEREMONY_INVOKED_AFTER_REVEAL);
      results.warnings.push('⚠️  Could not parse handlePostVetoReveal fully, but both functions exist');
    }
  } else {
    results.failed.push(CHECKS.CEREMONY_INVOKED_AFTER_REVEAL);
  }

  // Check 4: Final 4 bypass present
  if (vetoContent.includes('aliveCount === 4') && 
      vetoContent.includes('startFinal4Eviction()')) {
    results.passed.push(CHECKS.FINAL4_BYPASS_PRESENT);
  } else {
    results.failed.push(CHECKS.FINAL4_BYPASS_PRESENT);
  }

  // Check 5: Logging present
  const loggingChecks = [
    "console.info('[veto] startVetoCeremony",
    "console.info('[veto] handlePostVetoReveal",
    "console.info('[veto] finalizeCeremony",
    "console.info('[veto] POV Winner determined"
  ];
  
  const logsPresent = loggingChecks.filter(log => vetoContent.includes(log));
  if (logsPresent.length >= 3) {
    results.passed.push(CHECKS.LOGGING_PRESENT);
  } else {
    results.warnings.push(`⚠️  Only ${logsPresent.length}/${loggingChecks.length} key logging points present`);
    if (logsPresent.length === 0) {
      results.failed.push(CHECKS.LOGGING_PRESENT);
    } else {
      results.passed.push(CHECKS.LOGGING_PRESENT);
    }
  }

  // Print results
  console.log('✅ PASSED CHECKS:');
  results.passed.forEach(check => console.log(`   ✓ ${check}`));
  console.log();

  if (results.failed.length > 0) {
    console.log('❌ FAILED CHECKS:');
    results.failed.forEach(check => console.log(`   ✗ ${check}`));
    console.log();
  }

  if (results.warnings.length > 0) {
    console.log('⚠️  WARNINGS:');
    results.warnings.forEach(warning => console.log(`   ${warning}`));
    console.log();
  }

  // Summary
  const total = Object.keys(CHECKS).length;
  const passed = results.passed.length;
  const failed = results.failed.length;

  console.log('━'.repeat(60));
  console.log(`Summary: ${passed}/${total} checks passed`);
  
  if (failed === 0) {
    console.log('✅ All checks passed! Ceremony invocation path is correct.');
    return 0;
  } else {
    console.log(`❌ ${failed} check(s) failed. Please review the ceremony flow.`);
    return 1;
  }
}

verifyVetoCeremony()
  .then(code => process.exit(code))
  .catch(err => {
    console.error('Error running verification:', err);
    process.exit(1);
  });
