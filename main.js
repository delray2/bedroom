const { app, BrowserWindow } = require('electron');
const path = require('path');
const express = require('express');
const { WebSocketServer } = require('ws');
const axios = require('axios');
const dotenv = require('dotenv');
const https = require('https');
const fs = require('fs');

// Load environment variables
dotenv.config();

// IP Detection for dynamic URLs
const os = require('os');

function getCurrentIP() {
  const networkInterfaces = os.networkInterfaces();
  
  // Find the first non-internal IPv4 address
  for (const interfaceName in networkInterfaces) {
    const interfaces = networkInterfaces[interfaceName];
    for (const iface of interfaces) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  
  // Fallback to default
  return '192.168.4.203';
}

// Get current IP and update Spotify redirect URI
const currentIP = getCurrentIP();
console.log('🌐 Detected host IP:', currentIP);

// Update environment variable
process.env.DETECTED_HOST_IP = currentIP;

// Spotify configuration
let spotifyAccessToken = '';
const spotifyClientId = process.env.SPOTIFY_CLIENT_ID || '6eba173437884404862a5bdd132ad7c3';
const spotifyClientSecret = process.env.SPOTIFY_CLIENT_SECRET || 'acf11af6751c4c55a48ed93fb4f7b492';
// Dynamic redirect URI based on detected IP (must be HTTPS for Spotify)
let spotifyRedirectUri = process.env.SPOTIFY_REDIRECT_URI || `https://${currentIP}:4711/oauth/callback`;
const spotifyScope = process.env.SPOTIFY_SCOPE || 'user-read-private user-read-email streaming user-read-playback-state user-modify-playback-state';

console.log('🎵 Spotify redirect URI:', spotifyRedirectUri);
console.log('📝 Environment DETECTED_HOST_IP:', process.env.DETECTED_HOST_IP);

// --- WebSocket server setup ---
const wss = new WebSocketServer({ port: 4712, host: '0.0.0.0' });
function broadcast(data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === 1) client.send(msg);
  });
}

// --- Express backend setup ---
const backendPort = 4711; // Arbitrary port for notifications
const backend = express();
backend.use(express.json());
backend.use(express.urlencoded({ extended: true }));

// Set headers to allow external navigation
backend.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', "default-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.spotify.com https://api.spotify.com https://sdk.scdn.co; frame-ancestors 'self' *;");
  res.setHeader('X-Frame-Options', 'ALLOWALL');
  next();
});

// Broadcast on ANY request containing the keyword 'reolink'
backend.use((req, res, next) => {
  try {
    const parts = [
      req.originalUrl || '',
      JSON.stringify(req.body || {}),
      JSON.stringify(req.query || {}),
      JSON.stringify(req.headers || {}),
    ].join(' ').toLowerCase();
    if (parts.includes('reolink')) {
      broadcast({
        type: 'reolink_webhook',
        note: 'Detected keyword reolink in incoming request',
        url: req.originalUrl,
      });
    }
  } catch (_) {}
  next();
});

// Hubitat webhook endpoint for device state updates
backend.post('/api/hubitat/webhook', (req, res) => {
  try {
    console.log('Hubitat webhook received:', req.body);
    
    // Handle the actual Hubitat webhook format with content wrapper
    let deviceId, attributes, name, value;
    
    if (req.body.content) {
      // New Hubitat format with content wrapper
      const content = req.body.content;
      deviceId = content.deviceId;
      name = content.name;
      value = content.value;
      
      // Create normalized attributes object
      attributes = {};
      if (name && value !== undefined) {
        attributes[name] = value;
      }
    } else {
      // Legacy format (fallback)
      deviceId = req.body.deviceId;
      attributes = req.body.attributes || {};
      name = req.body.name;
      value = req.body.value || req.body.currentValue;
      
      if (name && value !== undefined) {
        attributes[name] = value;
      }
    }
    
    if (deviceId) {
      // Normalize the data structure
      const normalizedData = {
        type: 'device_state_update',
        deviceId: String(deviceId),
        attributes: attributes,
        event: 'attribute_change',
        timestamp: Date.now()
      };
      
      // Broadcast to all WebSocket clients
      broadcast(normalizedData);
      
      console.log('Broadcasted device state update:', normalizedData);
    }
    
    res.sendStatus(200);
  } catch (error) {
    console.error('Error processing Hubitat webhook:', error);
    res.sendStatus(500);
  }
});

// Legacy notification endpoint (kept for compatibility)
backend.post('/api/notify', (req, res) => {
  console.log('Notification received:', req.body);
  
  const content = req.body.content || req.body;
  
  // Handle different notification types
  if (content.deviceId) {
    // Device-specific notification
    broadcast({ 
      type: 'device_notification', 
      payload: content,
      timestamp: Date.now()
    });
  } else if (content.type === 'lrgroup_update') {
    // LRGroup update (device 453)
    broadcast({ 
      type: 'lrgroup_update', 
      payload: content,
      timestamp: Date.now()
    });
  } else {
    // Generic notification
    broadcast({ 
      type: 'general_notification', 
      payload: content,
      timestamp: Date.now()
    });
  }
  
  res.sendStatus(200);
});

// Device state refresh endpoint
backend.post('/api/refresh-device/:deviceId', (req, res) => {
  const { deviceId } = req.params;
  
  try {
    // Broadcast refresh request to frontend
    broadcast({
      type: 'device_refresh_request',
      deviceId: String(deviceId),
      timestamp: Date.now()
    });
    
    res.json({ success: true, message: `Refresh requested for device ${deviceId}` });
  } catch (error) {
    console.error('Error requesting device refresh:', error);
    res.status(500).json({ error: error.message });
  }
});

// Bulk device refresh endpoint
backend.post('/api/refresh-devices', (req, res) => {
  try {
    const { deviceIds } = req.body;
    
    if (Array.isArray(deviceIds)) {
      // Broadcast bulk refresh request to frontend
      broadcast({
        type: 'bulk_device_refresh_request',
        deviceIds: deviceIds.map(String),
        timestamp: Date.now()
      });
      
      res.json({ success: true, message: `Refresh requested for ${deviceIds.length} devices` });
    } else {
      res.status(400).json({ error: 'deviceIds must be an array' });
    }
  } catch (error) {
    console.error('Error requesting bulk device refresh:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
backend.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: Date.now(),
    websocketClients: wss.clients.size
  });
});

// --- Spotify Authentication Routes ---

// Generate random string for state parameter
function generateRandomString(length) {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

// Spotify login endpoint
backend.get('/auth/login', (req, res) => {
  const state = generateRandomString(16);
  
  const authQueryParameters = new URLSearchParams({
    response_type: 'code',
    client_id: spotifyClientId,
    scope: spotifyScope,
    redirect_uri: spotifyRedirectUri,
    state: state
  });
  
  res.redirect('https://accounts.spotify.com/authorize/?' + authQueryParameters.toString());
});

// Spotify OAuth callback
backend.get('/oauth/callback', async (req, res) => {
  const code = req.query.code;
  
  console.log('Spotify callback received - Code:', code);
  
  try {
    const authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + (Buffer.from(spotifyClientId + ':' + spotifyClientSecret).toString('base64')),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      data: new URLSearchParams({
        code: code,
        redirect_uri: spotifyRedirectUri,
        grant_type: 'authorization_code'
      }).toString()
    };
    
    console.log('Making auth request to Spotify...');
    const response = await axios(authOptions);
    
    console.log('Auth request successful:', { status: response.status });
    
    if (response.status === 200) {
      spotifyAccessToken = response.data.access_token;
      console.log('Access token received successfully');
      res.send(`
        <html>
          <head><title>Spotify Authentication</title></head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h2>✅ Successfully authenticated with Spotify!</h2>
            <p>Redirecting back to dashboard...</p>
            <div id="countdown">3</div>
            <script>
              // Countdown and redirect
              let countdown = 3;
              const countdownElement = document.getElementById('countdown');
              
              const timer = setInterval(() => {
                countdown--;
                countdownElement.textContent = countdown;
                
                if (countdown <= 0) {
                  clearInterval(timer);
                  
                  // In Electron, just go back to the previous page
                  if (window.history.length > 1) {
                    window.history.back();
                  } else {
                    // Fallback - reload the page
                    window.location.reload();
                  }
                }
              }, 1000);
              
              // Also try immediate redirect after a short delay
              setTimeout(() => {
                if (window.history.length > 1) {
                  window.history.back();
                } else {
                  window.location.reload();
                }
              }, 1000);
            </script>
          </body>
        </html>
      `);
    } else {
      console.error('Unexpected response status:', response.status);
      res.status(500).send('Error getting access token: Unexpected response status');
    }
  } catch (error) {
    console.error('Error getting access token:', error.message);
    console.error('Error details:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
    
    const errorMessage = error.response?.data?.error_description || 
                        error.response?.data?.error || 
                        error.message || 
                        'Unknown error';
    
    res.status(500).send('Error getting access token: ' + errorMessage);
  }
});

// Get current access token
backend.get('/auth/token', (req, res) => {
  res.json({ access_token: spotifyAccessToken });
});

// Get current playback state
backend.get('/api/spotify/playback-state', async (req, res) => {
  if (!spotifyAccessToken) {
    return res.status(401).json({ error: 'Not authenticated with Spotify' });
  }

  try {
    const response = await axios.get('https://api.spotify.com/v1/me/player', {
      headers: {
        'Authorization': `Bearer ${spotifyAccessToken}`,
        'Content-Type': 'application/json'
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error('Playback state error:', error.message);
    
    const errorMessage = error.response?.data?.error?.message || 
                        error.message || 
                        'Failed to get playback state';
    
    res.status(error.response?.status || 500).json({ error: errorMessage });
  }
});

// Play Spotify track
backend.put('/api/spotify/play', async (req, res) => {
  if (!spotifyAccessToken) {
    return res.status(401).json({ error: 'Not authenticated with Spotify' });
  }

  try {
    const response = await axios.put('https://api.spotify.com/v1/me/player/play', {}, {
      headers: {
        'Authorization': `Bearer ${spotifyAccessToken}`,
        'Content-Type': 'application/json'
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Play error:', error.message);
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

// Pause Spotify track
backend.put('/api/spotify/pause', async (req, res) => {
  if (!spotifyAccessToken) {
    return res.status(401).json({ error: 'Not authenticated with Spotify' });
  }

  try {
    const response = await axios.put('https://api.spotify.com/v1/me/player/pause', {}, {
      headers: {
        'Authorization': `Bearer ${spotifyAccessToken}`,
        'Content-Type': 'application/json'
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Pause error:', error.message);
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

// Previous track
backend.post('/api/spotify/previous', async (req, res) => {
  if (!spotifyAccessToken) {
    return res.status(401).json({ error: 'Not authenticated with Spotify' });
  }

  try {
    const response = await axios.post('https://api.spotify.com/v1/me/player/previous', {}, {
      headers: {
        'Authorization': `Bearer ${spotifyAccessToken}`,
        'Content-Type': 'application/json'
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Previous track error:', error.message);
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

// Next track
backend.post('/api/spotify/next', async (req, res) => {
  if (!spotifyAccessToken) {
    return res.status(401).json({ error: 'Not authenticated with Spotify' });
  }

  try {
    const response = await axios.post('https://api.spotify.com/v1/me/player/next', {}, {
      headers: {
        'Authorization': `Bearer ${spotifyAccessToken}`,
        'Content-Type': 'application/json'
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Next track error:', error.message);
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

// Set volume
backend.put('/api/spotify/volume', async (req, res) => {
  const { volume_percent } = req.body;
  
  if (!spotifyAccessToken) {
    return res.status(401).json({ error: 'Not authenticated with Spotify' });
  }

  if (volume_percent === undefined || volume_percent < 0 || volume_percent > 100) {
    return res.status(400).json({ error: 'volume_percent must be between 0 and 100' });
  }

  try {
    const response = await axios.put(`https://api.spotify.com/v1/me/player/volume?volume_percent=${volume_percent}`, {}, {
      headers: {
        'Authorization': `Bearer ${spotifyAccessToken}`,
        'Content-Type': 'application/json'
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Volume error:', error.message);
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

// Broadcast Spotify state changes via WebSocket
function broadcastSpotifyStateChange(state) {
  const message = {
    type: 'spotify_state_change',
    data: state
  };
  
  // Broadcast to all connected WebSocket clients
  if (wss) {
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }
  
  console.log('🎵 Broadcasted Spotify state change:', state);
}

// Spotify state polling endpoint (for WebSocket broadcasting)
backend.get('/api/spotify/state-poll', async (req, res) => {
  if (!spotifyAccessToken) {
    return res.status(401).json({ error: 'Not authenticated with Spotify' });
  }

  try {
    const response = await axios.get('https://api.spotify.com/v1/me/player', {
      headers: {
        'Authorization': `Bearer ${spotifyAccessToken}`
      }
    });

    if (response.data && response.data.item) {
      const spotifyState = {
        isPlaying: response.data.is_playing,
        trackInfo: {
          name: response.data.item.name,
          artist: response.data.item.artists.map(a => a.name).join(', '),
          imageUrl: response.data.item.album.images.length > 0 ? response.data.item.album.images[0].url : null,
          album: response.data.item.album.name,
          duration: response.data.item.duration_ms,
          popularity: response.data.item.popularity,
          position: response.data.progress_ms,
          id: response.data.item.id
        },
        device: {
          name: response.data.device?.name || 'Unknown Device',
          type: response.data.device?.type || 'Unknown',
          volume: response.data.device?.volume_percent || 0
        }
      };
      
      // Broadcast the state change via WebSocket
      broadcastSpotifyStateChange(spotifyState);
      
      res.json(spotifyState);
    } else {
      // No active playback
      const spotifyState = {
        isPlaying: false,
        trackInfo: null,
        device: null
      };
      
      broadcastSpotifyStateChange(spotifyState);
      res.json(spotifyState);
    }
  } catch (error) {
    console.error('Spotify state poll error:', error.message);
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

// Refresh Spotify access token (called every hour to maintain authentication)
backend.post('/api/spotify/refresh-token', async (req, res) => {
  try {
    // Check if we have a refresh token stored
    if (!spotifyRefreshToken) {
      return res.status(401).json({ error: 'No refresh token available' });
    }

    // Exchange refresh token for new access token
    const response = await axios.post('https://accounts.spotify.com/api/token', 
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: spotifyRefreshToken,
        client_id: process.env.SPOTIFY_CLIENT_ID
      }), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    // Update stored tokens
    spotifyAccessToken = response.data.access_token;
    if (response.data.refresh_token) {
      spotifyRefreshToken = response.data.refresh_token;
    }

    console.log('🎵 Spotify access token refreshed successfully');
    res.json({ 
      success: true, 
      access_token: spotifyAccessToken,
      expires_in: response.data.expires_in || 3600
    });

  } catch (error) {
    console.error('Spotify token refresh error:', error.message);
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

// Search Spotify tracks
backend.get('/search', async (req, res) => {
  const { q, type = 'track' } = req.query;
  
  if (!q) {
    return res.status(400).json({ error: 'Query parameter "q" is required' });
  }

  if (!spotifyAccessToken) {
    return res.status(401).json({ error: 'Not authenticated with Spotify' });
  }

  try {
    const response = await axios.get('https://api.spotify.com/v1/search', {
      headers: {
        'Authorization': `Bearer ${spotifyAccessToken}`,
        'Content-Type': 'application/json'
      },
      params: {
        q: q,
        type: type,
        limit: 20
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error('Search error:', error.message);
    
    const errorMessage = error.response?.data?.error?.message || 
                        error.message || 
                        'Search failed';
    
    res.status(error.response?.status || 500).json({ error: errorMessage });
  }
});

// Get available Spotify Connect devices
backend.get('/devices', async (req, res) => {
  if (!spotifyAccessToken) {
    return res.status(401).json({ error: 'Not authenticated with Spotify' });
  }

  try {
    const response = await axios.get('https://api.spotify.com/v1/me/player/devices', {
      headers: {
        'Authorization': `Bearer ${spotifyAccessToken}`,
        'Content-Type': 'application/json'
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error('Devices error:', error.message);
    
    const errorMessage = error.response?.data?.error?.message || 
                        error.message || 
                        'Failed to get devices';
    
    res.status(error.response?.status || 500).json({ error: errorMessage });
  }
});

// Transfer playback to a specific device
backend.put('/devices/transfer', async (req, res) => {
  const { device_id } = req.body;
  
  if (!device_id) {
    return res.status(400).json({ error: 'device_id is required' });
  }

  if (!spotifyAccessToken) {
    return res.status(401).json({ error: 'Not authenticated with Spotify' });
  }

  try {
    const response = await axios.put('https://api.spotify.com/v1/me/player', {
      device_ids: [device_id],
      play: true
    }, {
      headers: {
        'Authorization': `Bearer ${spotifyAccessToken}`,
        'Content-Type': 'application/json'
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Transfer error:', error.message);
    
    const errorMessage = error.response?.data?.error?.message || 
                        error.message || 
                        'Failed to transfer playback';
    
    res.status(error.response?.status || 500).json({ error: errorMessage });
  }
});

// HTTPS server setup
const httpsOptions = {
  key: fs.readFileSync(path.join(__dirname, 'server-key.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'server-cert.pem'))
};

https.createServer(httpsOptions, backend).listen(backendPort, '0.0.0.0', () => {
  console.log(`Backend listening for notifications on https://0.0.0.0:${backendPort}`);
  console.log(`Hubitat webhook endpoint: https://0.0.0.0:${backendPort}/api/hubitat/webhook`);
  console.log(`Network accessible at: https://${currentIP}:${backendPort}/api/hubitat/webhook`);
});

// --- Electron window setup ---
function createWindow() {
  const win = new BrowserWindow({
    width: 1920,
    height: 1080,
    fullscreen: true,
    kiosk: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // Allow external navigation
      allowRunningInsecureContent: true, // Allow HTTPS with invalid certs
      devTools: true, // Enable dev tools
      experimentalFeatures: true, // Enable experimental features for DRM
    },
    // Touchscreen optimizations
    alwaysOnTop: true,
    skipTaskbar: true,
    autoHideMenuBar: true,
  });
  
  // Ignore SSL certificate errors for local development
  win.webContents.session.setCertificateVerifyProc((request, callback) => {
    // Allow all certificates for local development
    callback(0); // 0 means "proceed"
  });
  
  win.loadFile('index.html');
  
  // Enable remote debugging
  win.webContents.openDevTools();
  
  // Add keyboard shortcuts for debugging
  win.webContents.on('before-input-event', (event, input) => {
    if (input.control && input.shift && input.key.toLowerCase() === 'i') {
      win.webContents.toggleDevTools();
    }
    if (input.control && input.shift && input.key.toLowerCase() === 'r') {
      win.webContents.reload();
    }
  });
  
  // Allow external navigation for Spotify login
  win.webContents.setWindowOpenHandler(({ url }) => {
    // Allow navigation to Spotify and our own server (using detected IP)
    if (url.includes('accounts.spotify.com') || url.includes(`${currentIP}:4711`)) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 500,
          height: 600,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: false,
          }
        }
      };
    }
    return { action: 'deny' };
  });
  
  // Prevent exit on escape key
  win.on('before-quit', (event) => {
    event.preventDefault();
  });
}

// Enable DRM support
app.commandLine.appendSwitch('--enable-widevine-cdm');
app.commandLine.appendSwitch('--enable-media-stream');
app.commandLine.appendSwitch('--autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('--disable-features', 'VizDisplayCompositor');

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
}); 