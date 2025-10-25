# Spotify Authentication Testing Guide

## Quick Start

1. **Restart the Electron app**:
   ```bash
   npm start
   ```

2. **Open the Music Modal**:
   - Click the Music button (🎵) on the side panel
   - You should see the music modal open

3. **Test Authentication**:
   - If you see "Connect to Spotify" → Click "Login with Spotify"
   - A popup window will open for Spotify authentication
   - After successful login, the popup will close and you'll be authenticated

## Expected Console Output

### On App Startup (with valid stored token):
```
✓ Configuration loaded
🔍 Starting IP detection...
🚀 IP Detection Service initialized
✓ Unified State Manager initialized
🎵 Restored valid Spotify authentication from localStorage
🎵 Token expires in X minutes
✅ Allowing self-signed certificate for: 192.168.4.214
✅ MusicController: Authentication verified
```

### On App Startup (with expired token but valid refresh token):
```
🎵 Access token expired, attempting immediate refresh...
✅ Allowing self-signed certificate for: 192.168.4.214
🔄 Attempting to refresh Spotify access token...
✅ Successfully refreshed Spotify access token
✅ Token refreshed successfully on startup
```

### During Spotify Login:
```
🎵 Starting Spotify authentication flow
✅ Allowing self-signed certificate for: 192.168.4.214
✅ [Popup] Allowing self-signed certificate for: 192.168.4.214
✅ MusicController: Authentication verified
```

## Common Issues & Solutions

### Issue: Still seeing `ERR_CERT_AUTHORITY_INVALID` errors

**Solution 1**: Clear app cache and restart
```bash
# Stop the app (Ctrl+C if running in terminal)
# Delete Electron cache
rm -rf ~/Library/Application\ Support/Electron
# Restart
npm start
```

**Solution 2**: Verify SSL certificates exist
```bash
ls -la server-cert.pem server-key.pem
# Both files should exist in the project root
```

**Solution 3**: Check Electron version
```bash
npm list electron
# Should be version 25.9.8 or higher
```

### Issue: Authentication succeeds but playback controls don't work

**Possible causes**:
1. No active Spotify device
   - Open Spotify on your phone/computer
   - Start playing something
   - The controls should now work

2. Backend not running
   - Check that port 4711 is accessible: `curl -k https://192.168.4.214:4711/api/health`
   - Should return: `{"status":"healthy",...}`

### Issue: Token refresh fails after 1 hour

**Solution**: Check backend logs
```bash
# In terminal where you ran `npm start`, look for:
🎵 Spotify access token refreshed successfully
# OR
Spotify token refresh error: ...
```

If you see refresh errors:
1. Re-authenticate with Spotify (logout and login again)
2. Check that refresh token is being stored: `localStorage.getItem('spotify_refresh_token')`

## Manual Testing Steps

### Test 1: Fresh Authentication
```javascript
// Open browser console (Ctrl+Shift+I)
// Clear all Spotify data
localStorage.removeItem('spotify_authenticated');
localStorage.removeItem('spotify_access_token');
localStorage.removeItem('spotify_refresh_token');
localStorage.removeItem('spotify_token_expiry');
location.reload();

// Click Music button → Login with Spotify
// Should successfully authenticate without SSL errors
```

### Test 2: Token Refresh on Startup
```javascript
// Set token expiry to the past
const expiry = Date.now() - 1000; // 1 second ago
localStorage.setItem('spotify_token_expiry', expiry.toString());
location.reload();

// Check console - should see:
// "🎵 Access token expired, attempting immediate refresh..."
// "✅ Token refreshed successfully on startup"
```

### Test 3: Background Token Refresh
```javascript
// Check when next refresh will happen
const controller = window.musicController;
console.log('Token refresh timer active:', controller.tokenRefreshTimer !== null);

// Token refresh happens every 50 minutes automatically
// You can force a refresh by calling:
controller.refreshToken().then(success => {
  console.log('Manual refresh result:', success);
});
```

### Test 4: Verify Certificate Bypass
```javascript
// Test that HTTPS requests work
fetch('https://192.168.4.214:4711/api/health')
  .then(r => r.json())
  .then(data => console.log('✅ HTTPS request successful:', data))
  .catch(err => console.error('❌ HTTPS request failed:', err));

// Should print: ✅ HTTPS request successful: {status: "healthy", ...}
```

## Debugging Commands

### Check Authentication Status
```javascript
// Get current auth state
const controller = window.musicController;
console.log('Authenticated:', controller.state.isAuthenticated);
console.log('Has refresh token:', !!localStorage.getItem('spotify_refresh_token'));
console.log('Token expiry:', new Date(parseInt(localStorage.getItem('spotify_token_expiry'))));
```

### View All Stored Tokens
```javascript
console.log({
  authenticated: localStorage.getItem('spotify_authenticated'),
  accessToken: localStorage.getItem('spotify_access_token')?.substring(0, 20) + '...',
  refreshToken: localStorage.getItem('spotify_refresh_token')?.substring(0, 20) + '...',
  expiry: new Date(parseInt(localStorage.getItem('spotify_token_expiry')))
});
```

### Force Token Refresh
```javascript
window.musicController.refreshToken()
  .then(success => console.log('Refresh result:', success));
```

### View IP Detection Status
```javascript
console.log('Detected IP:', window.ipDetection.getCurrentIP());
console.log('Auth URLs:', window.ipDetection.getAuthURLs());
```

## Performance Monitoring

### Token Refresh Timing
The app refreshes tokens every **50 minutes** (configurable in controller.js):
```javascript
const TOKEN_REFRESH_INTERVAL_MS = 50 * 60 * 1000; // 50 minutes
```

This ensures tokens are refreshed before the 1-hour expiration.

### Token Expiry Buffer
Tokens are considered "expiring soon" when they have less than **5 minutes** remaining:
```javascript
const bufferTime = 5 * 60 * 1000; // 5 minutes
```

This triggers an immediate refresh on app startup if needed.

## Success Criteria

✅ **Authentication Working** if:
1. No `ERR_CERT_AUTHORITY_INVALID` errors in console
2. Music modal shows "Connected to Spotify" status
3. Playback controls are enabled (not grayed out)
4. Console shows "✅ Allowing self-signed certificate" messages

✅ **Token Refresh Working** if:
1. App automatically refreshes token on startup when expired
2. Background refresh happens every 50 minutes
3. No logout/re-authentication required after token expiry
4. Console shows "🔄 Attempting to refresh Spotify access token..."

## Contact & Support

If issues persist:
1. Check the SPOTIFY_FIX_SUMMARY.md for detailed technical information
2. Review Electron console output for error messages
3. Verify backend is running: `curl -k https://192.168.4.214:4711/api/health`
4. Check that all dependencies are installed: `npm install`

---

**Last Updated**: October 2025
**Electron Version**: 25.9.8
**Node Version**: 18.x or higher


