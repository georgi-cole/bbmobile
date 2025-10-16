# Profile System Documentation

## Overview
The profile system provides persistent user profiles with support for up to 5 profiles per device. Each profile stores name, avatar, XP, season progress, and timestamps. It also supports guest mode for play-without-saving.

## Architecture

### Components

1. **profileStorage.js** - Data persistence layer
   - localStorage-based CRUD operations
   - Schema versioning with migration support
   - Maximum 5 profiles per device

2. **profileService.js** - Business logic layer
   - Profile selection and management
   - Guest mode support
   - Game state integration

3. **ProfileModal.js** - UI component
   - Profile selection modal
   - Profile creation form
   - Delete confirmation
   - Guest mode option

4. **profileModal.css** - Styling
   - Matches existing modal theme
   - Responsive design
   - Keyboard-accessible

## Profile Schema

```javascript
{
  id: string,              // Unique identifier (generated)
  displayName: string,     // User's chosen name (required)
  avatar: string,          // Data URL or default SVG
  xp: number,              // Experience points (default: 0)
  season: number,          // Current season (default: 1)
  createdAt: string,       // ISO timestamp
  updatedAt: string        // ISO timestamp
}
```

## Integration Flow

### First Launch (No Profiles)
1. Game loads → Intro video plays
2. `bb:intro:finished` event dispatched
3. Profile modal shows with "Create Profile" form
4. User creates profile or chooses guest mode
5. Game starts with selected profile

### Returning User
1. Game loads → Profile service initializes
2. Last used profile auto-loaded
3. Profile data applied to game state
4. Game starts immediately (no modal)

### Multiple Profiles (No Last Profile)
1. Game loads → Profile service initializes
2. Profile selection modal shows
3. User selects profile, creates new one, or plays as guest
4. Game starts with selected profile

## API Reference

### ProfileStorage

```javascript
// Get all profiles
ProfileStorage.getAllProfiles() // => Profile[]

// Get profile by ID
ProfileStorage.getProfileById(id) // => Profile | null

// Create profile
ProfileStorage.createProfile({
  displayName: 'John',
  avatar: 'data:image/...',
  xp: 0,
  season: 1
}) // => Profile

// Update profile
ProfileStorage.updateProfile(id, {
  xp: 500,
  season: 2
}) // => Profile

// Delete profile
ProfileStorage.deleteProfile(id) // => boolean

// Get last used profile
ProfileStorage.getLastProfile() // => Profile | null

// Check capacity
ProfileStorage.isAtMaxCapacity() // => boolean
ProfileStorage.getProfileCount() // => number

// Constants
ProfileStorage.MAX_PROFILES // 5
ProfileStorage.DEFAULT_AVATAR // SVG data URL
```

### ProfileService

```javascript
// Get current profile
ProfileService.getCurrentProfile() // => Profile | null

// Check guest mode
ProfileService.isGuestMode() // => boolean

// Set profile
ProfileService.setCurrentProfile(profile)

// Set guest mode
ProfileService.setGuestMode()

// Update current profile
ProfileService.updateCurrentProfile({
  xp: 500,
  season: 2
}) // => Profile | null

// Initialize on app start
ProfileService.initializeProfile() // => InitResult

// Get display name for HUD
ProfileService.getDisplayName() // => string
```

### ProfileModal

```javascript
// Show profile modal
ProfileModal.show({
  autoCreate: false,     // Auto-show create form if no profiles
  onSelect: (profile) => {
    // Profile selected callback
  },
  onGuest: () => {
    // Guest mode callback
  }
})

// Hide modal
ProfileModal.hide()
```

### Global Functions

```javascript
// Manual profile selection (e.g., from settings)
window.showProfileModal()

// Hide profile modal
window.hideProfileModal()

// Skip modal flow (for restarts)
window.skipModalFlow()
```

## Events

The system listens for:
- `bb:rules:acknowledged` - Triggers profile modal after rules
- `bb:intro:finished` - Fallback trigger if rules disabled

## Storage Keys

- `bb_profiles` - Array of profile objects
- `bb_profiles_version` - Schema version number
- `bb_last_profile_id` - ID of last used profile

## Migration Support

The system includes versioning for future schema changes:

```javascript
// Current version
const CURRENT_VERSION = 1;

// Migration function (called automatically)
function migrate(profiles, fromVersion) {
  // Add migration logic for future versions
  return profiles;
}
```

## Guest Mode

Guest mode allows users to play without saving progress:
- No profile created
- No data persisted
- Warning toast displayed
- Game state uses default "Guest" name

## Testing

### Manual Testing
Open `test_profile_system.html` for interactive testing:
- Create/delete profiles
- Test profile limits
- Switch between profiles
- Test guest mode
- Verify localStorage persistence

### Integration Testing
1. Clear localStorage: `localStorage.clear()`
2. Reload game (first launch flow)
3. Create profile
4. Play game
5. Refresh page (should auto-load profile)
6. Open settings → Switch profile

## UI/UX Features

- **Keyboard Accessible**: Full Tab/Enter/Esc support
- **Responsive**: Works on mobile and desktop
- **Avatars**: Upload custom images or use default
- **Delete Protection**: Confirmation dialog
- **Limit Indication**: Disabled "Add" button with tooltip
- **Guest Warning**: Toast notification for no-save mode
- **Visual Feedback**: Hover states, animations, transitions

## Styling

Matches existing game modals:
- Same color scheme
- Same border/shadow effects
- Same button styles
- Same typography
- Consistent z-index layering (z-index: 430)

## Future Enhancements

Potential additions:
- Cloud sync (requires backend)
- Profile statistics dashboard
- Achievement badges
- Custom themes per profile
- Import/export profiles
- Profile sharing
