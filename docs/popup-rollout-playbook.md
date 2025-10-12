# Popup System Refresh — Rollout Playbook

## Overview

This document provides a step-by-step guide for safely rolling out the new popup system using feature flags.

## Feature Flags

### Primary Flags

1. **popup_refresh_enabled** - Master switch for new popup system
   - Default: `false` (uses legacy showCard system)
   - When: `true` (uses BasePopup/PopupManager)

2. **social_cadence_enabled** - Social decision popup cadence
   - Default: `false` (legacy social cards)
   - When: `true` (uses SocialDecisionPopup)

3. **social_logic_v2_enabled** - Context-aware social popup selection
   - Default: `false` (random selection)
   - When: `true` (weighted selection based on game state)

### Debug Flags

4. **enablePopupTelemetryPanel** - Console telemetry logging
   - Default: `false`
   - When: `true` (logs all popup events to console)

## Rollout Stages

### Stage 0: Pre-Rollout (Development)

**Goal:** Verify implementation in isolated test environment

**Actions:**
1. Enable flags in test builds only:
   ```javascript
   game.cfg.popup_refresh_enabled = true;
   game.cfg.enablePopupTelemetryPanel = true;
   ```

2. Run test suite:
   ```bash
   # Open test_popup_system.html in browser
   # Test all scenarios
   ```

3. Manual testing:
   - Test all popup types
   - Verify accessibility (keyboard, screen reader)
   - Check telemetry data
   - Test on mobile devices

**Success Criteria:**
- All tests pass
- No console errors
- Telemetry data is accurate
- Accessibility checks pass

---

### Stage 1: Internal Testing (5% rollout)

**Goal:** Test with internal users/developers

**Duration:** 3-7 days

**Actions:**
1. Enable for 5% of users via config:
   ```javascript
   // In defaults.js or server-side config
   popup_refresh_enabled: Math.random() < 0.05
   ```

2. Monitor telemetry:
   ```javascript
   bbGameBus.on('popup:telemetry', (event) => {
     // Send to analytics service
     sendToAnalytics('popup_event', event);
   });
   ```

3. Collect feedback:
   - Survey internal testers
   - Monitor error logs
   - Review telemetry data

**Metrics to Monitor:**
- Error rate (should be < 1%)
- Popup dismiss rate by method
- Average time popups are shown
- Queue depth over time

**Rollback Conditions:**
- Error rate > 2%
- Critical bugs reported
- Accessibility issues found

**Rollback Process:**
```javascript
// Set flag to false
game.cfg.popup_refresh_enabled = false;
Config.saveStoredCfg(game.cfg);
// Inform users to refresh
```

---

### Stage 2: Controlled Rollout (25% rollout)

**Goal:** Expand to wider audience, collect more data

**Duration:** 7-14 days

**Actions:**
1. Increase rollout to 25%:
   ```javascript
   popup_refresh_enabled: Math.random() < 0.25
   ```

2. A/B test with control group:
   - Group A (25%): New popup system
   - Group B (75%): Legacy system
   - Compare metrics

3. Monitor performance:
   - Page load time impact
   - Memory usage
   - Animation smoothness

**Metrics to Monitor:**
- User engagement (time on page)
- Popup completion rate
- User feedback/reports
- Performance metrics

**Success Criteria:**
- Error rate < 0.5%
- Positive user feedback
- No performance degradation
- Telemetry shows expected patterns

---

### Stage 3: Majority Rollout (75% rollout)

**Goal:** Move majority of users to new system

**Duration:** 7-14 days

**Actions:**
1. Increase to 75%:
   ```javascript
   popup_refresh_enabled: Math.random() < 0.75
   ```

2. Enable social cadence for popup_refresh users:
   ```javascript
   if (game.cfg.popup_refresh_enabled) {
     game.cfg.social_cadence_enabled = true;
   }
   ```

3. Fine-tune based on feedback:
   - Adjust inter-popup delays
   - Refine animations
   - Optimize performance

**Metrics to Monitor:**
- Same as Stage 2
- Social popup engagement
- Queue depth patterns

**Success Criteria:**
- Metrics stable or improved vs legacy
- User satisfaction maintained
- No critical issues

---

### Stage 4: Full Rollout (100%)

**Goal:** Complete migration to new system

**Duration:** Ongoing

**Actions:**
1. Enable for all users:
   ```javascript
   // In defaults.js
   popup_refresh_enabled: true
   ```

2. Enable advanced features:
   ```javascript
   social_cadence_enabled: true,
   social_logic_v2_enabled: true  // Context-aware selection
   ```

3. Monitor for 2-4 weeks

4. Plan legacy code removal:
   - Mark showCard as deprecated
   - Add console warnings
   - Schedule removal in future release

**Metrics to Monitor:**
- All previous metrics
- Long-term engagement trends
- Performance over time

**Success Criteria:**
- Stable for 2+ weeks
- Positive user feedback
- Improved metrics vs legacy

---

### Stage 5: Legacy Deprecation

**Goal:** Remove legacy popup system

**Duration:** 1-2 release cycles

**Actions:**
1. Add deprecation warnings:
   ```javascript
   function showCard(...args) {
     console.warn('showCard is deprecated. Use PopupManager.enqueue() instead.');
     // Still works, but logged
     UI.showCard(...args);
   }
   ```

2. Update documentation:
   - Mark old APIs as deprecated
   - Provide migration examples
   - Update all code samples

3. After 1-2 releases, remove:
   - Legacy CardQueue code
   - showCard/showBigCard functions
   - Old CSS animations

---

## Monitoring & Telemetry

### Key Metrics

#### Engagement Metrics
- Popup views per session
- Decision completion rate
- Time to decision
- Dismiss method distribution

#### Performance Metrics
- Popup render time
- Animation frame rate
- Memory usage
- Queue processing time

#### Error Metrics
- JavaScript errors
- Failed popup renders
- Focus trap failures
- Telemetry failures

### Telemetry Dashboard

Create a dashboard to visualize:

```javascript
// Example telemetry aggregation
const stats = PopupTelemetry.getStats();

Dashboard.show({
  totalPopups: stats.totalShown,
  decisionRate: stats.totalDecisions / stats.totalShown,
  avgQueueDepth: stats.totalQueued / stats.totalShown,
  topPopupTypes: Object.entries(stats.popupTypeStats)
    .sort((a, b) => b[1].shown - a[1].shown)
    .slice(0, 5)
});
```

### Alerts

Set up alerts for:
- Error rate > 1%
- Average queue depth > 5
- Popup render time > 500ms
- Memory leak detection

## Rollback Procedures

### Quick Rollback (Emergency)

If critical issue found:

1. **Immediate:**
   ```javascript
   // Server-side or config service
   setGlobalConfig({ popup_refresh_enabled: false });
   ```

2. **User notification:**
   ```javascript
   showCard('System Update', [
     'We\'ve temporarily reverted a feature.',
     'Please refresh your page.'
   ], 'neutral', 5000);
   ```

3. **Investigate:**
   - Check error logs
   - Review telemetry
   - Reproduce issue
   - Fix and test

### Gradual Rollback

If issues affect subset of users:

1. **Reduce rollout percentage:**
   ```javascript
   popup_refresh_enabled: Math.random() < 0.10  // Back to 10%
   ```

2. **Identify affected users:**
   - Check telemetry for error patterns
   - Segment by browser/device
   - A/B test with specific cohorts

3. **Targeted fix:**
   - Apply fix to affected segment
   - Re-test before expanding

## Testing Checklist

Before each stage, verify:

### Functional Tests
- [ ] All popup types display correctly
- [ ] Queue system works as expected
- [ ] Popups close properly
- [ ] No memory leaks
- [ ] Telemetry logs correctly

### Accessibility Tests
- [ ] Keyboard navigation works
- [ ] Screen readers announce properly
- [ ] Focus trap functions correctly
- [ ] Reduced motion is respected
- [ ] Color contrast passes WCAG AA

### Performance Tests
- [ ] Popup renders in < 100ms
- [ ] Animations run at 60fps
- [ ] No jank or stuttering
- [ ] Memory usage is stable

### Browser/Device Tests
- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile Chrome (Android)
- [ ] Mobile Safari (iOS)
- [ ] Tablet devices

## Communication Plan

### Internal Communication

**Before each stage:**
- Notify development team
- Update project board
- Share rollout schedule

**During rollout:**
- Daily check-ins
- Share metrics updates
- Address issues promptly

### External Communication

**User-facing:**
- No announcement needed (seamless transition)
- If issues: "We're updating our notification system"

**Support team:**
- Brief on new system
- Provide troubleshooting guide
- Share known issues

## Success Metrics

### Overall Success Criteria

The rollout is successful if:

1. **Error rate < 0.5%** across all stages
2. **User satisfaction maintained or improved**
3. **Performance metrics stable or better**
4. **Accessibility improved** (measured by manual testing)
5. **Telemetry shows expected patterns**

### Key Performance Indicators (KPIs)

- **Popup completion rate:** > 90%
- **Average time to decision:** < 5 seconds
- **Dismiss by ESC/backdrop:** < 20% (users should use buttons)
- **Queue depth:** Average < 2
- **Render time:** < 100ms

## Troubleshooting

### Common Issues

#### Popups not appearing
**Symptom:** User reports popups not showing
**Check:**
- Is `popup_refresh_enabled` true?
- Console errors?
- Is PopupManager/BasePopup loaded?
- Is #popup-root in DOM?

**Fix:**
- Verify script load order
- Check for JS errors
- Ensure portal exists

#### Focus trap not working
**Symptom:** Tab key escapes popup
**Check:**
- Are there focusable elements?
- Is focus trap initialized?
- Console errors?

**Fix:**
- Verify popup has buttons/links
- Check focus trap timing
- Review BasePopup code

#### Telemetry not logging
**Symptom:** No telemetry events
**Check:**
- Is PopupTelemetry.js loaded?
- Is `enablePopupTelemetryPanel` true?
- Is GameBus available?

**Fix:**
- Check script load order
- Enable debug flag
- Verify GameBus integration

## Post-Rollout

### Week 1-2
- Monitor metrics daily
- Address any issues immediately
- Collect user feedback

### Week 3-4
- Analyze trends
- Fine-tune settings
- Plan optimizations

### Month 2+
- Review long-term metrics
- Plan legacy deprecation
- Document lessons learned

## Appendix

### Configuration Reference

```javascript
// js/config/defaults.js
{
  // Popup system
  popup_refresh_enabled: false,           // Master switch
  enablePopupTelemetryPanel: false,       // Debug logging
  
  // Social popups
  social_cadence_enabled: false,          // Social popup cadence
  social_logic_v2_enabled: false,         // Context-aware selection
  social_inter_delay: 800,                // Delay between social popups (ms)
}
```

### API Reference

```javascript
// Enqueue popup
PopupManager.enqueue(() => {
  return createBasePopup({ /* options */ });
}, {
  popupType: 'competition_result',  // For telemetry
  id: 'hoh-winner',                  // Unique ID
  interPopupDelay: 1000              // Custom delay
});

// Close current popup
PopupManager.close();

// Check if popup shown
if (PopupManager.isPopupShown()) { /* ... */ }

// Get queue length
const queueLength = PopupManager.getQueueLength();
```

### Contact

For questions or issues:
- GitHub Issues: [georgi-cole/bbmobile/issues](https://github.com/georgi-cole/bbmobile/issues)
- Documentation: `/docs/popup-refresh-migration-guide.md`
- Telemetry Guide: `/docs/popup-a11y-telemetry.md`
