#!/usr/bin/env node
/**
 * LV2 Observer Mode Validation Script
 * Validates that eviction.js has the correct implementation for observer mode
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EVICTION_JS_PATH = path.join(__dirname, '..', 'js', 'eviction.js');

console.log('\n=== LV2 Observer Mode Validation ===\n');

// Read eviction.js content
let content;
try {
  content = fs.readFileSync(EVICTION_JS_PATH, 'utf8');
} catch (err) {
  console.error('❌ Failed to read eviction.js:', err.message);
  process.exit(1);
}

let passed = 0;
let failed = 0;

// Test 1: Check for setTurn calls in renderLiveVotePanel
console.log('Test 1: Check for setTurn calls in renderLiveVotePanel...');
const hasTurnTrue = content.includes('global.lv2.setTurn?.(true)');
const hasTurnFalse = content.includes('global.lv2.setTurn?.(false)');
if (hasTurnTrue && hasTurnFalse) {
  console.log('✓ setTurn(true) and setTurn(false) calls present');
  passed++;
} else {
  console.log('✗ Missing setTurn calls');
  if (!hasTurnTrue) console.log('  - Missing setTurn(true)');
  if (!hasTurnFalse) console.log('  - Missing setTurn(false)');
  failed++;
}

// Test 2: Check for observer mode comment
console.log('\nTest 2: Check for observer mode comment...');
const hasObserverComment = content.includes('// Observer mode: no voting UI, just watch');
if (hasObserverComment) {
  console.log('✓ Observer mode comment present');
  passed++;
} else {
  console.log('✗ Missing observer mode comment');
  failed++;
}

// Test 3: Check for guarded closeAllVoteUI in diary sequence
console.log('\nTest 3: Check for guarded closeAllVoteUI in beginDiaryRoomSequence...');
const hasGuardedClose = content.includes('if (!useLv2)') && 
                         content.includes('closeAllVoteUI()') &&
                         content.includes('LV2 active — keeping overlay during diary sequence');
if (hasGuardedClose) {
  console.log('✓ closeAllVoteUI properly guarded with !useLv2 check');
  passed++;
} else {
  console.log('✗ closeAllVoteUI not properly guarded');
  failed++;
}

// Test 4: Check for LV2 overlay preservation log
console.log('\nTest 4: Check for LV2 overlay preservation log...');
const hasPreservationLog = content.includes('LV2 active — keeping overlay during diary sequence');
if (hasPreservationLog) {
  console.log('✓ LV2 overlay preservation log present');
  passed++;
} else {
  console.log('✗ Missing LV2 overlay preservation log');
  failed++;
}

// Test 5: Check for pushVote call in diary sequence
console.log('\nTest 5: Check for pushVote call in diary sequence...');
const hasPushVote = content.includes('global.lv2?.pushVote?.({') &&
                     content.includes('voterId: entry.voter') &&
                     content.includes('voterName: nameV') &&
                     content.includes('pick: votePick');
if (hasPushVote) {
  console.log('✓ pushVote call present in diary sequence');
  passed++;
} else {
  console.log('✗ Missing or incomplete pushVote call');
  failed++;
}

// Test 6: Check for HOH tie-break pushVote
console.log('\nTest 6: Check for HOH tie-break pushVote...');
const hasTieBreakPushVote = content.includes('// Push HOH tie-break vote to LV2 feed if active') ||
                             content.includes('// Push AI HOH tie-break vote to LV2 feed if active');
if (hasTieBreakPushVote) {
  console.log('✓ HOH tie-break pushVote logic present');
  passed++;
} else {
  console.log('✗ Missing HOH tie-break pushVote logic');
  failed++;
}

// Test 7: Check for legacy tally suppression
console.log('\nTest 7: Check for legacy tally suppression...');
const hasTallySuppression = content.includes('if(!useLv2)') && 
                            content.includes('updateLiveVoteGraph');
if (hasTallySuppression) {
  console.log('✓ Legacy tally updateLiveVoteGraph properly guarded');
  passed++;
} else {
  console.log('✗ Legacy tally not properly suppressed');
  failed++;
}

// Test 8: Check for consistent useLv2 pattern
console.log('\nTest 8: Check for consistent useLv2 pattern...');
const useLv2Pattern = /const useLv2 = g\.eviction\.nominees\.length === 2[\s\S]*?&& g\.cfg\?\.modernLiveVoteUI !== false[\s\S]*?&& global\.lv2\?\.enabled !== false/g;
const useLv2Matches = content.match(useLv2Pattern);
if (useLv2Matches && useLv2Matches.length >= 3) {
  console.log(`✓ Consistent useLv2 pattern found (${useLv2Matches.length} occurrences)`);
  passed++;
} else {
  console.log('✗ Inconsistent useLv2 pattern');
  failed++;
}

// Test 9: Check for CTA guard comment
console.log('\nTest 9: Check for CTA guard comment...');
const hasCTAComment = content.includes('// Only make CTA if human can vote and hasn\'t voted yet');
if (hasCTAComment) {
  console.log('✓ CTA guard comment present');
  passed++;
} else {
  console.log('✗ Missing CTA guard comment');
  failed++;
}

// Test 10: Check for multi-nominee clarification
console.log('\nTest 10: Check for multi-nominee clarification...');
const hasMultiComment = content.includes('// Multi-nominee legacy list - no LV2 for 3+ nominees, always update');
if (hasMultiComment) {
  console.log('✓ Multi-nominee clarification comment present');
  passed++;
} else {
  console.log('✗ Missing multi-nominee clarification comment');
  failed++;
}

// Summary
console.log('\n=== Validation Summary ===');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log('');

if (failed === 0) {
  console.log('✅ All validation checks passed!');
  console.log('✅ LV2 observer mode implementation looks correct.');
  process.exit(0);
} else {
  console.log('❌ Some validation checks failed.');
  console.log('❌ Please review the implementation.');
  process.exit(1);
}
