# Background Manager Documentation

## Overview

The Background Manager is a developer-only tool that allows the repository owner to manage intro hub backgrounds. It provides two types of functionality:

1. **Personal overrides** (localStorage): Test backgrounds locally without affecting other users
2. **Publish to repository** (GitHub API): Apply a background override globally to all users by committing `/bg_override.json` to the main branch

## Enabling the Background Manager

The Background Manager UI panel is only visible when:

- `localStorage.devBackgroundManager` is set to `"true"`, OR
- The URL query parameter `?bgmgr=1` is present

### Enable via Browser Console

```javascript
localStorage.setItem('devBackgroundManager', 'true');
// Then reload the page
```

### Enable via URL

Navigate to:
```
https://yourdomain.com/?bgmgr=1
```

Once enabled, the Background Manager panel will appear in the bottom-right corner of the screen.

## Features

### 1. Manual Override (Personal)

Select a background from the dropdown to override the automatic background selection. This change is stored in `localStorage` and only affects your browser session.

- **Auto mode**: Use the date-based schedule or automatic resolver
- **Manual selection**: Pick any background from the list

### 2. Schedule (Personal)

Schedule a specific background for today's date. This is also stored locally and only affects your browser.

### 3. Refresh Assets

Click the "Refresh" button to reload the list of available backgrounds from `/assets/skins/skins.json`. This is useful if you've added new background images.

### 4. Apply to All Users (Publish to Repository)

This feature allows you to publish a background override to the repository, affecting all users globally.

**⚠️ IMPORTANT**: This feature commits a file to the repository and affects all users immediately. Use with caution.

#### Steps to Publish:

1. **Create a GitHub Personal Access Token**:
   - Go to GitHub Settings → Developer Settings → Personal Access Tokens → Tokens (classic)
   - Click "Generate new token (classic)"
   - Set expiration (recommend: 7 days or 30 days for short-lived tokens)
   - Select scopes:
     - ✅ `repo` (or just `repo:contents` if available)
   - Generate and copy the token (starts with `ghp_`)

2. **Paste Token in Background Manager**:
   - Open the Background Manager panel
   - Scroll to "Apply to All Users" section
   - Paste your token in the "GitHub Token" field
   - The token is stored in `sessionStorage` for the duration of your browser session only

3. **Select Background**:
   - Choose a background from the "Manual Override" dropdown
   - OR select "(none)" to clear the global override

4. **Edit Commit Message** (optional):
   - The default commit message is: `bgmgr: set manualOverrideId -> <id>`
   - You can edit this before publishing

5. **Publish**:
   - Click "✓ Publish Override to Repo"
   - Wait for the success message
   - The file `/bg_override.json` is now committed to the `main` branch

#### What Gets Published

The publish action creates/updates `/bg_override.json` with content like:

```json
{
  "manualOverrideId": "xmasDay",
  "lastUpdated": "2025-12-06T15:30:00.000Z",
  "updatedBy": "BackgroundManager"
}
```

If you select "Clear override" or no background, it will publish:

```json
{
  "manualOverrideId": null,
  "lastUpdated": "2025-12-06T15:30:00.000Z",
  "updatedBy": "BackgroundManager"
}
```

## Available Backgrounds

The Background Manager loads backgrounds from `/assets/skins/skins.json`. The current list includes:

- **day** - Bright daytime background
- **day2** - Alternative daytime background
- **night** - Nighttime background
- **sunrise** - Early morning sunrise
- **sunset** - Evening sunset
- **rain** - Rainy weather background
- **thunderstorm** - Stormy weather with lightning
- **snow** - Night snow background
- **snowday** - Snowy daytime background
- **blizzard** - Heavy snowstorm
- **icyNight** - Cold icy night
- **autumnLeaves** - Fall season with leaves
- **xmasDay** - Christmas day celebration
- **xmasEve** - Christmas Eve night
- **xmasyNight** - Christmas themed night
- **xmas** - General Christmas theme
- **discreteSantaDay** - Subtle Christmas daytime

## Security Notes

### Token Security

1. **Never commit tokens to the repository**
   - Tokens are stored in `sessionStorage` only (cleared when browser tab closes)
   - Never hardcode tokens in JavaScript files

2. **Use short-lived tokens**
   - Create tokens with 7-day or 30-day expiration
   - Revoke tokens after use if no longer needed

3. **Minimal scope**
   - Only grant `repo` or `repo:contents` scope
   - Never grant admin or delete scopes

4. **Token storage**
   - Tokens are stored in `sessionStorage.bgmgr.gh_token`
   - Cleared automatically when browser tab closes
   - Not shared across tabs or windows

### Best Practices

1. **Test locally first**
   - Use personal override to preview changes before publishing
   - Ensure the background renders correctly

2. **Clear commit messages**
   - Use descriptive messages like: `bgmgr: set Christmas day background`
   - This helps track background changes in git history

3. **Coordinate with team**
   - Inform team members before making global changes
   - Avoid conflicting publishes from multiple maintainers

4. **Monitor repository**
   - Check GitHub commit history for unexpected changes
   - Review `bg_override.json` regularly

## Troubleshooting

### Panel doesn't appear
- Check that `localStorage.devBackgroundManager === 'true'` or URL has `?bgmgr=1`
- Open browser console and look for `[BackgroundManager]` logs

### Publish fails with "401 Unauthorized"
- Token is invalid or expired
- Generate a new token and try again

### Publish fails with "404 Not Found"
- First time publishing creates the file (this is normal)
- Check that repository name is correct: `georgi-cole/bbmobile`

### Publish fails with "422 Unprocessable Entity"
- File might have been modified by someone else
- Refresh the page and try again (will fetch latest SHA)

### Backgrounds not loading
- Check `/assets/skins/skins.json` exists and is valid JSON
- Click "Refresh" button to reload the manifest
- Open browser console for error messages

## Development

### Adding New Backgrounds

1. Add image file to `/assets/skins/`
2. Update `/assets/skins/skins.json`:

```json
{
  "id": "newBackground",
  "label": "My New Background",
  "filename": "new-background.png",
  "description": "Description of the background"
}
```

3. Click "Refresh" in Background Manager to reload the list

### Architecture

- **backgroundManager.js**: Core manager module with GitHub API integration
- **introhubBackgroundIntegration.js**: Integration shim for intro hub
- **skins.json**: Manifest of available backgrounds
- **bg_override.json**: Published global override (created by publish action)

## API Reference

### BackgroundManager API

```javascript
// Load assets from manifest
await BackgroundManager.refreshAssetsAndPopulateUI();

// Set available backgrounds manually
BackgroundManager.setAvailableBackgrounds([
  { id: 'day', label: 'Day', filename: 'daily-background.png' }
]);

// Publish override to repository
await BackgroundManager.publishOverrideToRepo(
  'xmasDay',  // background id or null
  'bgmgr: set Christmas day background',  // commit message
  'ghp_...'  // GitHub token
);

// Show/hide panel
BackgroundManager.showPanel();
BackgroundManager.hidePanel();

// Check if dev mode enabled
BackgroundManager.isDevModeEnabled();
```

## Support

For issues or questions:
- Check browser console for error messages
- Review this documentation
- Contact repository maintainers
