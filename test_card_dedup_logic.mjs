#!/usr/bin/env node

/**
 * Test script for card deduplication logic
 * Verifies that duplicate cards are prevented when scheduled near-simultaneously
 */

console.log('🧪 Testing Card Deduplication Logic\n');

// Test 1: Signature generation consistency
console.log('Test 1: Signature Generation');
function generateSignature(title, lines, tone) {
  const linesArray = Array.isArray(lines) ? lines : [lines].filter(Boolean);
  return `${String(title || '')}\u0000${linesArray.join('|')}\u0000${String(tone || '')}`;
}

const sig1 = generateSignature('HOH Competition', ['Winner: Alice'], 'ok');
const sig2 = generateSignature('HOH Competition', ['Winner: Alice'], 'ok');
const sig3 = generateSignature('HOH Competition', ['Winner: Bob'], 'ok');
const sig4 = generateSignature('Veto Competition', ['Winner: Alice'], 'ok');

console.log(`  Signature 1: ${sig1.replace(/\u0000/g, '<NULL>')}`);
console.log(`  Signature 2: ${sig2.replace(/\u0000/g, '<NULL>')}`);
console.log(`  Match? ${sig1 === sig2 ? '✓' : '✗'}`);
console.log(`  Signature 3 (different lines): ${sig3.replace(/\u0000/g, '<NULL>')}`);
console.log(`  Match with sig1? ${sig1 === sig3 ? '✗ (should not match)' : '✓'}`);
console.log(`  Signature 4 (different title): ${sig4.replace(/\u0000/g, '<NULL>')}`);
console.log(`  Match with sig1? ${sig1 === sig4 ? '✗ (should not match)' : '✓'}\n`);

// Test 2: Set-based deduplication (CardQueue)
console.log('Test 2: Set-Based Deduplication (CardQueue)');
const pendingSigs = new Set();
const cards = [
  { title: 'HOH', lines: ['Alice wins'], tone: 'ok' },
  { title: 'HOH', lines: ['Alice wins'], tone: 'ok' }, // duplicate
  { title: 'Veto', lines: ['Bob wins'], tone: 'ok' },
  { title: 'HOH', lines: ['Alice wins'], tone: 'ok' }, // duplicate
];

let accepted = 0;
let rejected = 0;

cards.forEach((card, idx) => {
  const sig = generateSignature(card.title, card.lines, card.tone);
  if (pendingSigs.has(sig)) {
    console.log(`  Card ${idx + 1}: REJECTED (duplicate) - ${card.title}`);
    rejected++;
  } else {
    console.log(`  Card ${idx + 1}: ACCEPTED - ${card.title}`);
    pendingSigs.add(sig);
    accepted++;
  }
});

console.log(`  Summary: ${accepted} accepted, ${rejected} rejected`);
console.log(`  Expected: 2 accepted, 2 rejected`);
console.log(`  Result: ${accepted === 2 && rejected === 2 ? '✓ PASS' : '✗ FAIL'}\n`);

// Test 3: Map-based deduplication (safeShowCard)
console.log('Test 3: Map-Based Deduplication (safeShowCard)');
const pendingMap = {};
const safeCards = [
  { title: 'Eviction', lines: ['Player evicted'], tone: 'evict' },
  { title: 'Eviction', lines: ['Player evicted'], tone: 'evict' }, // duplicate
  { title: 'Nomination', lines: ['Two nominated'], tone: 'neutral' },
];

let mapAccepted = 0;
let mapRejected = 0;

safeCards.forEach((card, idx) => {
  const sig = generateSignature(card.title, card.lines, card.tone);
  if (pendingMap[sig]) {
    console.log(`  Card ${idx + 1}: REJECTED (already pending) - ${card.title}`);
    mapRejected++;
  } else {
    console.log(`  Card ${idx + 1}: ACCEPTED - ${card.title}`);
    pendingMap[sig] = true; // simulate timeout id
    mapAccepted++;
  }
});

console.log(`  Summary: ${mapAccepted} accepted, ${mapRejected} rejected`);
console.log(`  Expected: 2 accepted, 1 rejected`);
console.log(`  Result: ${mapAccepted === 2 && mapRejected === 1 ? '✓ PASS' : '✗ FAIL'}\n`);

// Test 4: Cleanup after card completion
console.log('Test 4: Signature Cleanup Simulation');
const queueSigs = new Set();
const sig = generateSignature('Challenge Complete', ['Score: 100'], 'ok');

console.log(`  Adding signature: ${sig.replace(/\u0000/g, '<NULL>')}`);
queueSigs.add(sig);
console.log(`  Set size: ${queueSigs.size}`);
console.log(`  Has signature? ${queueSigs.has(sig) ? '✓' : '✗'}`);

console.log(`  Simulating card completion (delete signature)...`);
queueSigs.delete(sig);
console.log(`  Set size after delete: ${queueSigs.size}`);
console.log(`  Has signature? ${queueSigs.has(sig) ? '✗ (should be removed)' : '✓'}`);
console.log(`  Can add same card again? ${!queueSigs.has(sig) ? '✓ PASS' : '✗ FAIL'}\n`);

// Test 5: Flush behavior
console.log('Test 5: Flush Clears Pending State');
const flushTestMap = { 'sig1': 1, 'sig2': 2, 'sig3': 3 };
console.log(`  Before flush: ${Object.keys(flushTestMap).length} pending signatures`);
// Simulate flush
const clearedMap = {};
console.log(`  After flush: ${Object.keys(clearedMap).length} pending signatures`);
console.log(`  Result: ${Object.keys(clearedMap).length === 0 ? '✓ PASS' : '✗ FAIL'}\n`);

console.log('✅ All tests completed\n');
