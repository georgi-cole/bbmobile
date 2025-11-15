// MODULE: uiCleanup.js
// Centralized cleanup for ephemeral UI (ceremony cards, messages, toasts, overlays)
// Guarantees no UI remnants from previous phase remain when new phase begins

export const UICleanup = (() => {
  const ephemeral = new Set();
  const timers = new Set();
  const intervals = new Set();
  let hooked = false;

  const hasGSAP = () => typeof window !== "undefined" && window.gsap && typeof window.gsap.killTweensOf === "function";

  function markEphemeral(node) {
    if (!node) return node;
    try {
      node.setAttribute?.("data-ephemeral", "true");
      ephemeral.add(node);
      const obs = new MutationObserver(() => {
        if (!document.contains(node)) {
          ephemeral.delete(node);
          obs.disconnect();
        }
      });
      obs.observe(document.documentElement, { childList: true, subtree: true });
      node.__uiCleanupObserver = obs;
    } catch (_) {}
    return node;
  }

  function setTimeoutSafe(fn, ms, ...args) {
    const id = window.setTimeout(() => {
      timers.delete(id);
      fn?.(...args);
    }, ms);
    timers.add(id);
    return id;
  }
  function clearTimeoutSafe(id) { if (id != null) { window.clearTimeout(id); timers.delete(id); } }
  function setIntervalSafe(fn, ms, ...args) { const id = window.setInterval(fn, ms, ...args); intervals.add(id); return id; }
  function clearIntervalSafe(id) { if (id != null) { window.clearInterval(id); intervals.delete(id); } }

  function killAnimations(nodes) {
    if (!hasGSAP()) return;
    try {
      nodes.forEach(n => {
        window.gsap.killTweensOf(n);
        n.querySelectorAll?.("*").forEach(child => window.gsap.killTweensOf(child));
      });
    } catch (_) {}
  }

  function removeEphemeralNodes() {
    const nodes = new Set(ephemeral);
    const safetySelectors = [
      "[data-ephemeral]",
      "[data-phase-message]",
      "[data-ui-card]",
      ".ui-card",
      ".message-card",
      ".phase-card",
      ".toast",
      ".ceremony-card",
    ];
    try {
      safetySelectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(n => nodes.add(n));
      });
    } catch (_) {}

    killAnimations(nodes);

    nodes.forEach(n => {
      try { n.remove?.(); if (n.__uiCleanupObserver) { n.__uiCleanupObserver.disconnect(); delete n.__uiCleanupObserver; } } catch (_) {}
      ephemeral.delete(n);
    });
  }

  function clearTimers() { timers.forEach(id => window.clearTimeout(id)); intervals.forEach(id => window.clearInterval(id)); timers.clear(); intervals.clear(); }

  function cleanupAll() { try { removeEphemeralNodes(); } finally { clearTimers(); } }

  function hookPhaseEvents(bus) {
    if (hooked || !bus) return;
    hooked = true;
    const possibleStarts = [
      "phase:will-change",
      "phase:willStart",
      "phase:start",
      "phase:enter",
      "phase:transition:start",
    ];
    possibleStarts.forEach(ev => { try { bus.on?.(ev, () => cleanupAll()); } catch (_) {} });

    const emit = bus.emit?.bind?.(bus);
    if (emit) {
      bus.emit = function patchedEmit(name, ...args) {
        try {
          if (
            typeof name === "string" && name.startsWith("phase:") && (
              name.endsWith(":start") || name.endsWith(":willStart") || name.endsWith(":enter") || name === "phase:will-change"
            )
          ) {
            cleanupAll();
          }
        } catch (_) {}
        return emit(name, ...args);
      };
    }
  }

  function init(bus) {
    hookPhaseEvents(bus);
    try { bus?.on?.("route:change", cleanupAll); } catch (_) {}
  }

  return { init, markEphemeral, cleanupAll, setTimeout: setTimeoutSafe, clearTimeout: clearTimeoutSafe, setInterval: setIntervalSafe, clearInterval: clearIntervalSafe };
})();
