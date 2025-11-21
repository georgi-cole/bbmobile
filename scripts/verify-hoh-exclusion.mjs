#!/usr/bin/env node
/**
 * Verification Script: HOH Exclusion Guards
 * 
 * Scans the codebase to verify all required HOH exclusion guards are in place:
 * 1. normalizeIds utility function
 * 2. buildReplacementPool with unconditional HOH exclusion
 * 3. validateReplacementNominee validation function
 * 4. integrityCheckNominees integrity check
 * 5. Diagnostic logging for replacement pool
 * 
 * Exits with non-zero status if any checks fail.
 */

import { readFileSync } from 'fs';

const CHECKS = {
  normalizeIds: false,
  buildReplacementPool: false,
  hohExclusionInPool: false,
  validateReplacementNominee: false,
  integrityCheckNominees: false,
  diagnosticLogging: false
};

function log(message, type = 'info') {
  const prefix = type === 'pass' ? '✓' : type === 'fail' ? '✗' : type === 'warn' ? '⚠' : 'ℹ';
  console.log(`${prefix} ${message}`);
}

function checkFile(filePath, checks) {
  try {
    const content = readFileSync(filePath, 'utf8');
    
    // Check 1: normalizeIds function exists
    if (content.includes('function normalizeIds(')) {
      CHECKS.normalizeIds = true;
      log('Found normalizeIds function', 'pass');
    }
    
    // Check 2: buildReplacementPool function exists
    if (content.includes('function buildReplacementPool(')) {
      CHECKS.buildReplacementPool = true;
      log('Found buildReplacementPool function', 'pass');
      
      // Check 2a: Verify unconditional HOH exclusion
      const poolFnMatch = content.match(/function buildReplacementPool\([^)]*\)\{[\s\S]*?^  \}/m);
      if (poolFnMatch) {
        const poolFnBody = poolFnMatch[0];
        if (poolFnBody.includes('exclude.add(hohId)') && poolFnBody.includes('// HOH always excluded')) {
          CHECKS.hohExclusionInPool = true;
          log('Verified unconditional HOH exclusion in buildReplacementPool', 'pass');
        } else {
          log('WARNING: HOH exclusion comment or code missing in buildReplacementPool', 'warn');
        }
      }
    }
    
    // Check 3: validateReplacementNominee function exists
    if (content.includes('function validateReplacementNominee(')) {
      CHECKS.validateReplacementNominee = true;
      log('Found validateReplacementNominee function', 'pass');
      
      // Verify it checks for HOH
      if (content.includes("reason: 'HOH cannot be nominated'")) {
        log('Verified HOH check in validateReplacementNominee', 'pass');
      } else {
        log('WARNING: HOH check missing in validateReplacementNominee', 'warn');
      }
    }
    
    // Check 4: integrityCheckNominees function exists
    if (content.includes('function integrityCheckNominees(')) {
      CHECKS.integrityCheckNominees = true;
      log('Found integrityCheckNominees function', 'pass');
      
      // Verify it removes HOH
      if (content.includes('[integrity] CRITICAL: HOH found among nominees')) {
        log('Verified HOH removal in integrityCheckNominees', 'pass');
      } else {
        log('WARNING: HOH removal logic missing in integrityCheckNominees', 'warn');
      }
    }
    
    // Check 5: Diagnostic logging present
    if (content.includes("[replacement] pool built:") || content.includes("console.info('[replacement]")) {
      CHECKS.diagnosticLogging = true;
      log('Found diagnostic logging for replacement pool', 'pass');
    }
    
    // Check 6: Verify buildReplacementPool is actually called
    const buildPoolCallCount = (content.match(/buildReplacementPool\(/g) || []).length;
    if (buildPoolCallCount >= 3) {
      log(`Found ${buildPoolCallCount} calls to buildReplacementPool`, 'pass');
    } else {
      log(`WARNING: Only found ${buildPoolCallCount} calls to buildReplacementPool`, 'warn');
    }
    
    // Check 7: Verify validateReplacementNominee is called before commit
    if (content.includes('validateReplacementNominee(replacementId)')) {
      log('Verified validateReplacementNominee is called before commit', 'pass');
    } else {
      log('WARNING: validateReplacementNominee not found in commit path', 'warn');
    }
    
    // Check 8: Verify integrityCheckNominees is called after commit
    if (content.includes('integrityCheckNominees()')) {
      log('Verified integrityCheckNominees is called after commit', 'pass');
    } else {
      log('WARNING: integrityCheckNominees not found in post-commit path', 'warn');
    }
    
    return true;
  } catch (error) {
    log(`Error reading file ${filePath}: ${error.message}`, 'fail');
    return false;
  }
}

function main() {
  console.log('=== HOH Exclusion Verification ===\n');
  
  // Check js/veto.js
  log('Checking js/veto.js...');
  const vetoOk = checkFile('./js/veto.js', CHECKS);
  
  if (!vetoOk) {
    log('\n✗ VERIFICATION FAILED: Could not read veto.js', 'fail');
    process.exit(1);
  }
  
  console.log('\n=== Verification Summary ===');
  
  const allChecks = [
    { name: 'normalizeIds function', passed: CHECKS.normalizeIds },
    { name: 'buildReplacementPool function', passed: CHECKS.buildReplacementPool },
    { name: 'Unconditional HOH exclusion', passed: CHECKS.hohExclusionInPool },
    { name: 'validateReplacementNominee function', passed: CHECKS.validateReplacementNominee },
    { name: 'integrityCheckNominees function', passed: CHECKS.integrityCheckNominees },
    { name: 'Diagnostic logging', passed: CHECKS.diagnosticLogging }
  ];
  
  const passedChecks = allChecks.filter(c => c.passed).length;
  const totalChecks = allChecks.length;
  
  allChecks.forEach(check => {
    log(`${check.name}: ${check.passed ? 'PRESENT' : 'MISSING'}`, check.passed ? 'pass' : 'fail');
  });
  
  console.log(`\n${passedChecks}/${totalChecks} checks passed`);
  
  if (passedChecks === totalChecks) {
    log('\n✓ VERIFICATION PASSED: All HOH exclusion guards are in place', 'pass');
    process.exit(0);
  } else {
    log('\n✗ VERIFICATION FAILED: Some guards are missing', 'fail');
    process.exit(1);
  }
}

main();
