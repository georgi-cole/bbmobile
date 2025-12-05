# Roster/Player Audit Tracer

This tracer helps identify which roster/player modules load and which selection handlers actually fire, so we can consolidate duplicate files and wire visuals in the correct place.

## How to use

### Manual annotations (preferred in dev/staging)
Insert logs in suspected modules/handlers:

```js
// In module init:
BBMobile.auditTracer.moduleLoaded('assets/js/roster.js');

// Inside a selection handler:
BBMobile.auditTracer.handlerFired('onPlayerSelected', { playerId });
```

### Auto hooks (opt-in)
Enable delegated click logging via a global flag before page load:

```html
<script>
  window.BBMobile = window.BBMobile || {};
  window.BBMobile.audit = { autoHookSelections: true };
</script>
<script src="assets/js/roster-audit-tracer.js"></script>
```

This attaches a delegated `click` listener that logs interactions on `.player`, `.roster-card`, and `[data-player-id]`.

### Export logs
Download a JSON of captured traces:

```js
BBMobile.auditTracer.exportLogs();
```

## Notes
- Non-invasive: no logic changes; logs to console and an in-memory array.
- Use in dev/staging; you can gate in prod via flags.
- Once we know the active handler file, proceed with PR to wire visuals directly.
