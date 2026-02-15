const stillHoldingAll = participants.filter(p => p.dropTimeMs == null);
const stillHolding = participants.filter((p) => p.dropTimeMs === null && p.isAI); // AI-only

// ... rest of the function remains unchanged ...