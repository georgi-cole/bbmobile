// MODULE: cardManager.js (lowercase name as per problem statement)
// Simple manager enforcing "only one card at a time"
// Wraps the existing CardManager.js with UICleanup integration

import { UICleanup } from "./uiCleanup.js";

export const CardManager = (() => {
  let current = null;
  let hiding = Promise.resolve();

  async function hideCurrent() {
    await hiding;
    if (!current) return;
    const node = current; current = null;
    try { node.remove?.(); } catch (_) { try { node.remove?.(); } catch (_) {} }
  }

  async function show(factory) {
    hiding = hideCurrent();
    await hiding;
    const node = factory?.();
    if (node) { UICleanup.markEphemeral(node); current = node; }
    return node;
  }

  async function clear() { await hideCurrent(); }

  return { show, clear };
})();
