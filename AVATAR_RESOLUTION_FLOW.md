# Avatar Resolution Flow - Visual Guide

## Overview
This document provides a visual representation of the avatar resolution system used in the return_twist phase and throughout the application.

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    Return Twist Phase Starts                      │
│                  (America's Vote - Juror Return)                  │
└──────────────────────────┬────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│              renderReturnTwistPanel() [twists.js]                 │
│                  OR showReturnVotePanel() [jury_return_vote.js]   │
└──────────────────────────┬────────────────────────────────────────┘
                           │
                           │ For each juror ID...
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Call: global.resolveAvatar(id)                   │
│                         [avatar.js]                               │
└──────────────────────────┬────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│              Priority 1: Check player.avatar                      │
│              (Skip if numeric .jpg pattern)                       │
└──────────────────────────┬────────────────────────────────────────┘
                           │
                   ┌───────┴───────┐
                   │               │
              Found? ✓         Not found ✗
                   │               │
                   │               ▼
                   │   ┌─────────────────────────────────────────┐
                   │   │   Priority 2: Check player.img           │
                   │   └──────────────────┬───────────────────────┘
                   │                      │
                   │              ┌───────┴───────┐
                   │              │               │
                   │         Found? ✓         Not found ✗
                   │              │               │
                   │              │               ▼
                   │              │   ┌──────────────────────────┐
                   │              │   │ Priority 3: player.photo  │
                   │              │   └────────┬─────────────────┘
                   │              │            │
                   │              │    ┌───────┴───────┐
                   │              │    │               │
                   │              │Found? ✓       Not found ✗
                   │              │    │               │
                   │              │    │               ▼
                   │              │    │   ┌──────────────────────┐
                   │              │    │   │ Priority 4-9:         │
                   │              │    │   │ ./avatars/ folder     │
                   │              │    │   │ - {Name}.png          │
                   │              │    │   │ - {name}.png          │
                   │              │    │   │ - {id}.png            │
                   │              │    │   │ - {Name}.jpg          │
                   │              │    │   │ - {name}.jpg          │
                   │              │    │   │ - {id}.jpg            │
                   │              │    │   └──────┬───────────────┘
                   │              │    │          │
                   │              │    │  ┌───────┴───────┐
                   │              │    │  │               │
                   │              │    │Found? ✓     Not found ✗
                   │              │    │  │               │
                   └──────────────┴────┴──┘               │
                                  │                       │
                                  │                       ▼
                                  │           ┌──────────────────────┐
                                  │           │ Priority 10:          │
                                  │           │ Dicebear API fallback │
                                  │           │ (unique per name)     │
                                  │           └──────┬───────────────┘
                                  │                  │
                                  └──────────────────┘
                                             │
                                             ▼
                                  ┌──────────────────┐
                                  │  Avatar URL      │
                                  │  returned        │
                                  └────────┬─────────┘
                                           │
                                           ▼
                                  ┌──────────────────┐
                                  │  Render <img>    │
                                  │  with onerror    │
                                  └────────┬─────────┘
                                           │
                                   ┌───────┴───────┐
                                   │               │
                            Success ✓       Error ✗
                                   │               │
                                   │               ▼
                                   │    ┌─────────────────────────┐
                                   │    │ onerror handler:         │
                                   │    │ - Log to console         │
                                   │    │ - Call getAvatarFallback │
                                   │    │ - Set src to Dicebear    │
                                   │    └──────────┬──────────────┘
                                   │               │
                                   └───────────────┘
                                                   │
                                                   ▼
                                        ┌─────────────────┐
                                        │ Avatar displays │
                                        │ correctly       │
                                        └─────────────────┘
```

## Key Components

### 1. Global Avatar Resolver (avatar.js)
**Function:** `global.resolveAvatar(playerIdOrObject)`
- Accepts player ID or player object
- Checks negative cache to prevent repeated 404s
- Returns first valid URL from priority list
- Falls back to Dicebear API

### 2. Global Fallback Handler (avatar.js)
**Function:** `global.getAvatarFallback(name, failedUrl)`
- Adds failed URL to negative cache
- Returns Dicebear API URL with player name seed
- Ensures unique avatars per player

### 3. Local Avatar Helper (jury_return_vote.js)
**Function:** `getAvatar(id)`
- Calls `global.resolveAvatar(id)` if available
- Falls back to local implementation if global not available
- Ensures backward compatibility

### 4. Render with Error Handling (both files)
**Implementation:**
```javascript
const img = document.createElement('img');
img.src = avatarUrl;
img.onerror = function() {
  console.info('[module] avatar fallback used');
  this.onerror = null;  // Prevent infinite loop
  this.src = getAvatarFallback(name, this.src);
};
```

## Before vs After

### Before (Inline Resolution)
```
User triggers return twist
    ↓
Code: p?.avatar || p?.img || p?.photo || dicebear
    ↓
If file missing → 404 error
    ↓
Broken image displayed ✗
```

### After (Centralized Resolution)
```
User triggers return twist
    ↓
Code: global.resolveAvatar(id)
    ↓
Tries multiple formats & paths
    ↓
If all fail → Dicebear API
    ↓
onerror handler catches any remaining issues
    ↓
Always displays valid avatar ✓
```

## Error Handling Flow

```
Avatar load attempt
    ↓
┌────────────────┐
│ Browser loads  │
│ image from URL │
└───────┬────────┘
        │
  ┌─────┴─────┐
  │           │
Success    Error (404, etc.)
  │           │
  │           ▼
  │    ┌──────────────────────┐
  │    │ onerror triggered     │
  │    │ - Log: [module] info  │
  │    │ - Call fallback       │
  │    └──────┬───────────────┘
  │           │
  │           ▼
  │    ┌──────────────────────┐
  │    │ Dicebear API         │
  │    │ (always succeeds)    │
  │    └──────┬───────────────┘
  │           │
  └───────────┘
              │
              ▼
      ┌──────────────┐
      │ Avatar shows │
      │ correctly    │
      └──────────────┘
```

## Negative Cache System

```
First attempt at ./avatars/Diana.png
    ↓
404 error
    ↓
URL added to negative cache Set
    ↓
Fallback to Dicebear
    ↓
[Later attempts]
    ↓
resolveAvatar checks cache
    ↓
Skips ./avatars/Diana.png (already in cache)
    ↓
Returns Dicebear immediately
    ↓
No repeated 404s ✓
```

## Module Integration

```
┌─────────────────────────────────────────────────────────┐
│                      index.html                          │
│  (Script loading order matters)                          │
└───────────────────────┬─────────────────────────────────┘
                        │
                ┌───────┴────────┐
                │                │
                ▼                ▼
        ┌─────────────┐  ┌─────────────┐
        │ avatar.js   │  │ state.js    │
        │ (exports:)  │  │             │
        │ - resolve   │  │             │
        │ - fallback  │  │             │
        └──────┬──────┘  └─────────────┘
               │
               │ Used by ↓
               │
    ┌──────────┼───────────┬──────────────┐
    │          │           │              │
    ▼          ▼           ▼              ▼
┌────────┐ ┌─────────┐ ┌──────────┐ ┌─────────┐
│jury.js │ │twists.js│ │jury_ret..│ │other... │
│✓ uses  │ │✓ uses   │ │✓ uses    │ │modules  │
│global  │ │global   │ │global    │ │         │
└────────┘ └─────────┘ └──────────┘ └─────────┘
```

## Console Log Examples

### Normal Flow (Avatar Found)
```
(No logs - avatar loads successfully)
```

### Fallback Triggered
```
[INFO] [jury_return_vote] avatar fallback used for juror=4 url=./avatars/Diana.png
[INFO] [twists] avatar fallback for juror=4 url=./avatars/Diana.png
```

### Player Not Found
```
[WARN] [jury_return_vote] avatar: player not found id=999
```

### Debug Mode (avatar.js)
```
[LOG] [avatar] resolved=8 fallback=2 strictMiss=0
[LOG] [avatar] Summary: { resolved: 8, fallback: 2, total: 10 }
```

## Performance Benefits

### Before
```
10 jurors × 1 attempt each = 10 requests
If 5 missing: 5 × 404 errors
Total: 10 requests + 5 errors = overhead
```

### After
```
10 jurors × 1 attempt each = 10 requests
First 404 → cached
Subsequent same URLs → skipped
Total: 10 requests + 0 repeated errors = efficient
```

## Summary

### Changes Made
✅ Centralized avatar resolution via `global.resolveAvatar()`
✅ Added error handlers with logging
✅ Implemented negative caching
✅ Ensured fallback to Dicebear API
✅ No 404 errors displayed to users

### Benefits
✅ Consistent avatar handling across all modules
✅ Graceful degradation (always shows something)
✅ Better debugging with console logs
✅ Performance optimization via caching
✅ User experience improved (no broken images)
