# Week 1 Modal Flow Diagram

## Before the Fix (Duplicate Modals)

```
┌─────────────────────────────────────────────────────────────┐
│ bootstrap.js: skipToWeek1()                                 │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ├──> showWeekIntroModal(1, callback)  ◄── MODAL 1
                  │     │
                  │     └──> callback() 
                  │           │
                  │           └──> startHOH()
                  │                 │
                  │                 └──> [wrapped by ui.week-intro.js]
                  │                       │
                  │                       ├──> showWeekIntroModal(1, callback)  ◄── MODAL 2 (DUPLICATE!)
                  │                       │     │
                  │                       │     └──> callback()
                  │                       │           │
                  │                       │           └──> [original startHOH]
```

```
┌─────────────────────────────────────────────────────────────┐
│ jury_return.js: proceedToHOH()                              │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ├──> showWeekIntroModal(week, callback)  ◄── MODAL 1
                  │     │
                  │     └──> callback()
                  │           │
                  │           └──> setPhase('intermission', ..., startHOH)
                  │                 │
                  │                 └──> startHOH()
                  │                       │
                  │                       └──> [wrapped by ui.week-intro.js]
                  │                             │
                  │                             ├──> showWeekIntroModal(week, callback)  ◄── MODAL 2 (DUPLICATE!)
                  │                             │     │
                  │                             │     └──> callback()
                  │                             │           │
                  │                             │           └──> [original startHOH]
```

## After the Fix (Single Modal)

```
┌─────────────────────────────────────────────────────────────┐
│ bootstrap.js: skipToWeek1()                                 │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  └──> setPhase('intermission', ..., startHOH)
                        │
                        └──> startHOH()
                              │
                              └──> [wrapped by ui.week-intro.js]
                                    │
                                    ├──> Check: g.__weekIntroShownFor !== g.week?
                                    │     │
                                    │     └──> YES: Show modal
                                    │           │
                                    │           ├──> showWeekIntroModal(week, callback)  ◄── MODAL (ONCE!)
                                    │           │     │
                                    │           │     └──> callback()
                                    │           │           │
                                    │           │           └──> showTwistAnnouncementIfNeeded()
                                    │           │                 │
                                    │           │                 └──> [original startHOH]
                                    │           │
                                    │           └──> Set: g.__weekIntroShownFor = g.week
                                    │
                                    └──> NO: Skip modal, call original startHOH
```

```
┌─────────────────────────────────────────────────────────────┐
│ jury_return.js: proceedToHOH()                              │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  └──> setPhase('intermission', ..., startHOH)
                        │
                        └──> startHOH()
                              │
                              └──> [wrapped by ui.week-intro.js]
                                    │
                                    ├──> Check: g.__weekIntroShownFor !== g.week?
                                    │     │
                                    │     └──> YES: Show modal
                                    │           │
                                    │           ├──> showWeekIntroModal(week, callback)  ◄── MODAL (ONCE!)
                                    │           │     │
                                    │           │     └──> callback()
                                    │           │           │
                                    │           │           └──> showTwistAnnouncementIfNeeded()
                                    │           │                 │
                                    │           │                 └──> [original startHOH]
                                    │           │
                                    │           └──> Set: g.__weekIntroShownFor = g.week
                                    │
                                    └──> NO: Skip modal, call original startHOH
```

## Key Improvements

1. **Single Source of Truth**: The `ui.week-intro.js` wrapper is the ONLY place that calls `showWeekIntroModal()`
2. **Automatic Deduplication**: The wrapper tracks which week was shown using `g.__weekIntroShownFor`
3. **Simplified Code**: Removed complex conditional logic from multiple files
4. **Consistent Behavior**: All paths through the code now show the modal exactly once per week

## Flow for All Week Transitions

```
Any code that starts a new week
          │
          └──> setPhase('intermission', duration, startHOH)
                │
                └──> After duration, callback is invoked
                      │
                      └──> startHOH() is called
                            │
                            └──> Wrapper intercepts and shows modal ONCE
                                  │
                                  └──> Original startHOH() executes
```

This ensures consistent behavior regardless of how the week transition is triggered:
- ✅ Opening sequence → Week 1
- ✅ Week N → Week N+1 
- ✅ Juror return → Next week
- ✅ Any other transition → Next week
