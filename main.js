const { app, BrowserWindow } = require('electron');
const path = require('path');
const express = require('express');
const { WebSocketServer } = require('ws');
const axios = require('axios');
const dotenv = require('dotenv');
const https = require('https');
const fs = require('fs');

// Configure axios to ignore SSL certificate errors for Spotify API calls
// This is necessary when network-level certificate interception occurs
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

// Configure axios defaults to use the custom agent for HTTPS requests
axios.defaults.httpsAgent = httpsAgent;

// Load environment variables
dotenv.config();

// Render middleware configuration
const MIDDLEWARE_URL = process.env.MIDDLEWARE_URL || 'https://spotifyserver-n9nk.onrender.com';
const MIDDLEWARE_WS_URL = MIDDLEWARE_URL.replace(/^https?:\/\//, 'wss://').replace(/^http:\/\//, 'ws://') + '/ws';

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
let spotifyRefreshToken = ''; // Add missing refresh token variable
const spotifyClientId = process.env.SPOTIFY_CLIENT_ID || '6eba173437884404862a5bdd132ad7c3';
const spotifyClientSecret = process.env.SPOTIFY_CLIENT_SECRET || 'acf11af6751c4c55a48ed93fb4f7b492';
// Dynamic redirect URI based on detected IP (must be HTTPS for Spotify)
let spotifyRedirectUri = process.env.SPOTIFY_REDIRECT_URI || `https://${currentIP}:4711/oauth/receive`;
const spotifyScope = process.env.SPOTIFY_SCOPE || 'user-read-private user-read-email streaming user-read-playback-state user-modify-playback-state';

// Render middleware session management
let sessionId = null;
let middlewareWs = null;
let lastNonce = null;
let expiresAt = 0; // Track token expiration time

// Helper functions for base64url encoding/decoding
function b64urlEncode(obj) {
  return Buffer.from(JSON.stringify(obj)).toString('base64url');
}

function b64urlDecode(str) {
  return JSON.parse(Buffer.from(str, 'base64url').toString('utf8'));
}

function randomNonce() {
  return Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2);
}

function nowMs() {
  return Date.now();
}

const spotifyTokenStoragePath = path.join(__dirname, 'spotify-tokens.json');

function loadSpotifyTokensFromDisk() {
  try {
    if (!fs.existsSync(spotifyTokenStoragePath)) {
      return;
    }

    const raw = fs.readFileSync(spotifyTokenStoragePath, 'utf-8');
    if (!raw) {
      return;
    }

    const stored = JSON.parse(raw);
    spotifyAccessToken = stored.accessToken || '';
    spotifyRefreshToken = stored.refreshToken || '';
    
    // Restore expiresAt if available, otherwise set default (1 hour from now)
    if (stored.expiresAt && stored.expiresAt > nowMs()) {
      expiresAt = stored.expiresAt;
    } else if (spotifyAccessToken) {
      // If we have a token but no expiry, assume it expires in 1 hour
      expiresAt = nowMs() + 3600000;
    }

    if (spotifyAccessToken || spotifyRefreshToken) {
      console.log('🎵 Loaded Spotify tokens from disk');
    }
  } catch (error) {
    console.error('Failed to load Spotify tokens from disk:', error.message);
  }
}

function persistSpotifyTokensToDisk() {
  try {
    if (!spotifyAccessToken && !spotifyRefreshToken) {
      if (fs.existsSync(spotifyTokenStoragePath)) {
        fs.unlinkSync(spotifyTokenStoragePath);
      }
      return;
    }

    const payload = {
      accessToken: spotifyAccessToken,
      refreshToken: spotifyRefreshToken,
      expiresAt: expiresAt,
      updatedAt: new Date().toISOString()
    };

    fs.writeFileSync(spotifyTokenStoragePath, JSON.stringify(payload, null, 2), { mode: 0o600 });
  } catch (error) {
    console.error('Failed to persist Spotify tokens:', error.message);
  }
}

loadSpotifyTokensFromDisk();

// Generate or restore session ID
if (!sessionId) {
  sessionId = `local_${randomNonce()}`;
}

console.log('🎵 Spotify redirect URI:', spotifyRedirectUri);
console.log('📝 Environment DETECTED_HOST_IP:', process.env.DETECTED_HOST_IP);
console.log('🌐 Render Middleware URL:', MIDDLEWARE_URL);
console.log('🔌 Middleware WebSocket URL:', MIDDLEWARE_WS_URL);
console.log('🆔 Session ID:', sessionId);

// Connect to Render middleware WebSocket
function ensureMiddlewareWsConnected() {
  if (!sessionId) return;
  if (middlewareWs && (middlewareWs.readyState === 1 || middlewareWs.readyState === 0)) { // OPEN or CONNECTING
    return;
  }

  const WebSocket = require('ws');
  middlewareWs = new WebSocket(`${MIDDLEWARE_WS_URL}?sessionId=${encodeURIComponent(sessionId)}`);

  middlewareWs.on('open', () => {
    console.log('✅ Connected to Render middleware WebSocket');
    console.log('🆔 Session ID sent to middleware:', sessionId);
    
    // Send tokens when WebSocket opens (matches middleware pattern)
    if (spotifyAccessToken) {
      const expiresIn = Math.max(1, Math.floor((expiresAt - nowMs()) / 1000));
      middlewareWs.send(JSON.stringify({
        type: 'tokens',
        access_token: spotifyAccessToken,
        expires_in: expiresIn
      }));
      console.log('✅ Sent tokens to Render middleware');
    } else {
      console.log('⚠️ No tokens to send (user needs to login)');
    }
  });

  middlewareWs.on('message', async (buf) => {
    let msg;
    try {
      msg = JSON.parse(buf.toString('utf8'));
    } catch {
      return;
    }

    if (msg.type === 'refresh_required') {
      console.log('🔄 Render middleware requested token refresh');
      if (spotifyRefreshToken) {
        await refreshAccessToken();
        if (middlewareWs && middlewareWs.readyState === WebSocket.OPEN) {
          middlewareWs.send(JSON.stringify({
            type: 'refreshed',
            access_token: spotifyAccessToken,
            expires_in: Math.max(1, Math.floor((expiresAt - nowMs()) / 1000))
          }));
          broadcastSSE('status', { refreshed: true, expiresAt });
        }
      }
      return;
    }

    if (msg.type === 'logout') {
      console.log('🚪 Render middleware requested logout');
      spotifyAccessToken = '';
      spotifyRefreshToken = '';
      expiresAt = 0;
      lastPlayerState = null;
      persistSpotifyTokensToDisk();
      broadcast({
        type: 'spotify_logout',
        timestamp: Date.now()
      });
      broadcastSSE('status', { loggedIn: false });
      broadcastSSE('player_state', null);
      return;
    }

    if (msg.type === 'player_state') {
      // Only update lastPlayerState if we have valid data (don't clear on null/undefined)
      if (msg.data && msg.data.item) {
        lastPlayerState = msg.data;
        const trackName = lastPlayerState.item.name || 'no item';
        console.log('🔄 Middleware player_state received: track:', trackName, 'SSE clients:', sseClients.size);
        
        // Forward player state to frontend via WebSocket and SSE
        broadcast({
          type: 'spotify_state_change',
          data: msg.data,
          timestamp: Date.now()
        });
        
        // Always broadcast via SSE (even if no clients currently - it will be cached for new connections)
        broadcastSSE('player_state', lastPlayerState);
      } else if (msg.data === null) {
        // Explicit null from middleware - only clear if we don't have recent valid data
        const timeSinceLastUpdate = Date.now() - (lastPlayerState?.timestamp || 0);
        if (timeSinceLastUpdate > 30000) { // 30 seconds without valid data
          console.log('🔄 Clearing player_state after 30s without valid data');
          lastPlayerState = null;
          broadcastSSE('player_state', null);
        } else {
          console.log('🔄 Ignoring null player_state (have recent valid data, time since update:', timeSinceLastUpdate, 'ms)');
        }
      } else {
        // msg.data is undefined or empty - don't update lastPlayerState, just log
        console.log('🔄 Middleware player_state received but data is empty/undefined, keeping cached state');
      }
      return;
    }
  });

  middlewareWs.on('close', () => {
    console.log('⚠️ Render middleware WebSocket closed, reconnecting...');
    middlewareWs = null;
    setTimeout(ensureMiddlewareWsConnected, 1000);
  });

  middlewareWs.on('error', (error) => {
    console.error('❌ Render middleware WebSocket error:', error.message);
  });
}

// Start middleware connection if we have tokens (matches middleware pattern)
if (spotifyAccessToken || spotifyRefreshToken) {
  ensureMiddlewareWsConnected();
}

// --- WebSocket server setup ---
const wss = new WebSocketServer({ port: 4712, host: '0.0.0.0' });
function broadcast(data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === 1) client.send(msg);
  });
}

// --- SSE clients for UI updates (like local server example) ---
const sseClients = new Set();
let lastPlayerState = null; // Cached for new UI connections

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
    websocketClients: wss.clients.size,
    spotify: {
      authenticated: !!spotifyAccessToken,
      hasRefreshToken: !!spotifyRefreshToken,
      redirectUri: spotifyRedirectUri
    },
    middleware: {
      url: MIDDLEWARE_URL,
      connected: middlewareWs?.readyState === 1, // OPEN
      sessionId: sessionId || null
    }
  });
});

// Network info endpoint for IP detection
backend.get('/api/network-info', (req, res) => {
  res.json({
    ip: currentIP,
    timestamp: Date.now(),
    detected: true
  });
});

// SSE stream for UI updates (player state + status) - like local server example
// IMPORTANT: Register this route early, before any catch-all routes
backend.get('/events', (req, res) => {
  console.log('📡 SSE connection request received from:', req.ip || req.connection.remoteAddress);
  
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*'); // Allow CORS for SSE
  res.flushHeaders?.();

  sseClients.add(res);
  console.log('📡 SSE client connected. Total clients:', sseClients.size);

  // Immediate snapshot (matches middleware pattern)
  const isLoggedIn = !!(spotifyAccessToken || spotifyRefreshToken);
  res.write(`event: status\ndata: ${JSON.stringify({ loggedIn: isLoggedIn, connectedToMiddleware: middlewareWs?.readyState === 1, expiresAt })}\n\n`);
  
  // Always send player_state if we have it (even if null, so frontend knows state)
  if (lastPlayerState && lastPlayerState.item) {
    console.log('📡 SSE: Sending initial player_state:', lastPlayerState.item.name);
    res.write(`event: player_state\ndata: ${JSON.stringify(lastPlayerState)}\n\n`);
  } else if (lastPlayerState === null) {
    console.log('📡 SSE: Sending initial null player_state');
    res.write(`event: player_state\ndata: null\n\n`);
  } else {
    console.log('📡 SSE: No initial player_state cached');
  }

  // Send a keepalive ping every 30 seconds to keep connection alive
  const keepAliveInterval = setInterval(() => {
    if (sseClients.has(res)) {
      try {
        res.write(': keepalive\n\n');
      } catch (e) {
        console.error('📡 SSE keepalive write error:', e.message);
        clearInterval(keepAliveInterval);
        sseClients.delete(res);
        console.log('📡 Removed SSE client due to keepalive error. Remaining clients:', sseClients.size);
      }
    } else {
      clearInterval(keepAliveInterval);
    }
  }, 30000);
  
  req.on('close', () => {
    clearInterval(keepAliveInterval);
    sseClients.delete(res);
    console.log('📡 SSE client disconnected. Remaining clients:', sseClients.size);
  });
  
  req.on('error', (err) => {
    clearInterval(keepAliveInterval);
    console.error('📡 SSE connection error:', err.message);
    sseClients.delete(res);
  });
});

function broadcastSSE(eventName, data) {
  const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
  let sentCount = 0;
  const deadClients = [];
  
  for (const res of sseClients) {
    try { 
      res.write(payload);
      sentCount++;
    } catch (e) {
      console.error('📡 SSE write error:', e.message);
      // Mark for removal
      deadClients.push(res);
    }
  }
  
  // Remove dead clients
  deadClients.forEach(res => {
    sseClients.delete(res);
    console.log('📡 Removed dead SSE client. Remaining clients:', sseClients.size);
  });
  
  if (eventName === 'player_state') {
    console.log('📡 SSE player_state broadcasted to', sentCount, 'clients, data:', data ? (data.item ? `track: ${data.item.name}` : 'no item') : 'null');
  }
}

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

// Spotify token exchange (local - keeps client secret secure)
async function exchangeCodeForTokens(code) {
  const redirectUri = new URL('/oauth/callback', MIDDLEWARE_URL).toString();
  const body = new URLSearchParams();
  body.set('grant_type', 'authorization_code');
  body.set('code', code);
  body.set('redirect_uri', redirectUri);

  const basic = Buffer.from(`${spotifyClientId}:${spotifyClientSecret}`).toString('base64');

  const r = await axios.post('https://accounts.spotify.com/api/token', body.toString(), {
    headers: {
      'Authorization': `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    httpsAgent: httpsAgent,
    timeout: 10000
  });

  if (!r.status || r.status !== 200) {
    const t = await r.data;
    throw new Error(`Token exchange failed: ${r.status} ${JSON.stringify(t)}`);
  }

  spotifyAccessToken = r.data.access_token;
  spotifyRefreshToken = r.data.refresh_token;
  expiresAt = nowMs() + (r.data.expires_in * 1000);
  persistSpotifyTokensToDisk();
  
  // Send tokens to Render middleware
  if (middlewareWs && middlewareWs.readyState === middlewareWs.OPEN) {
    middlewareWs.send(JSON.stringify({
      type: 'tokens',
      access_token: spotifyAccessToken,
      expires_in: Math.max(1, Math.floor((expiresAt - nowMs()) / 1000))
    }));
  }
  
  return r.data;
}

// Spotify login endpoint - redirects to Render middleware OAuth start (matches middleware pattern)
backend.get('/login', (req, res) => {
  sessionId = sessionId || `local_${randomNonce()}`;
  lastNonce = randomNonce();

  const localCallback = `https://${currentIP}:${backendPort}/oauth/receive`;
  const stateObj = { sessionId, localCallback, nonce: lastNonce, createdAt: Date.now() };
  const stateB64 = b64urlEncode(stateObj);

  const u = new URL(`${MIDDLEWARE_URL}/oauth/start`);
  u.searchParams.set('client_id', spotifyClientId);
  u.searchParams.set('scope', spotifyScope);
  u.searchParams.set('state_b64', stateB64);

  console.log('🎵 Starting Spotify authentication via Render middleware');
  console.log('🎵 Redirecting to:', u.toString());
  
  res.redirect(u.toString());
});

// Legacy /auth/login endpoint (kept for backward compatibility)
backend.get('/auth/login', (req, res) => {
  res.redirect('/login');
});

// Track processed authorization codes to prevent duplicate processing
const processedCodes = new Set();

// OAuth receive endpoint - Render middleware redirects here with code
backend.get('/oauth/receive', async (req, res) => {
  const { code, state_b64 } = req.query;
  
  if (!code || !state_b64) {
    return res.status(400).send('Missing code/state_b64');
  }

  let decoded;
  try {
    decoded = b64urlDecode(state_b64);
  } catch {
    return res.status(400).send('Bad state_b64');
  }
  
  if (decoded.nonce !== lastNonce) {
    return res.status(400).send('State nonce mismatch');
  }

  sessionId = decoded.sessionId;

  try {
    await exchangeCodeForTokens(code);
    ensureMiddlewareWsConnected();

    // Send tokens to middleware via WebSocket
    if (middlewareWs && middlewareWs.readyState === middlewareWs.OPEN) {
      middlewareWs.send(JSON.stringify({
        type: 'tokens',
        access_token: spotifyAccessToken,
        expires_in: Math.max(1, Math.floor((expiresAt - nowMs()) / 1000))
      }));
    }

    // Notify frontend of successful authentication
    broadcast({
      type: 'spotify_authenticated',
      timestamp: Date.now()
    });
    
    // Broadcast via SSE (matches middleware pattern)
    broadcastSSE('status', { loggedIn: true, expiresAt });

    res.redirect(`/?authed=1`);
  } catch (e) {
    console.error('❌ Token exchange failed:', e);
    res.status(500).send(String(e));
  }
});

// Legacy OAuth callback (kept for backward compatibility)
backend.get('/oauth/callback', async (req, res) => {
  const code = req.query.code;
  const state = req.query.state;
  const error = req.query.error;
  
  console.log('Spotify callback received - Code:', code ? 'Present' : 'Missing');
  console.log('Spotify callback received - State:', state);
  console.log('Spotify callback received - Error:', error);
  console.log('Spotify callback received - User Agent:', req.get('User-Agent'));
  console.log('Spotify callback received - Referer:', req.get('Referer'));
  
  // Handle OAuth errors
  if (error) {
    console.error('Spotify OAuth error:', error);
    return res.status(400).send(`Spotify OAuth error: ${error}`);
  }
  
  // Check if authorization code is present
  if (!code) {
    console.error('No authorization code received from Spotify');
    return res.status(400).send('No authorization code received from Spotify');
  }
  
  // Prevent duplicate processing of the same authorization code
  if (processedCodes.has(code)) {
    console.log('Authorization code already processed, ignoring duplicate request');
    return res.status(200).send(`
      <html>
        <head><title>Spotify Authentication</title></head>
        <body style="font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: center; padding: 50px;">
          <h2>✅ Already authenticated with Spotify!</h2>
          <p>Redirecting back to dashboard...</p>
          <script>
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
  }
  
  // Mark this code as processed
  processedCodes.add(code);
  
  // Clean up old codes (keep only last 10)
  if (processedCodes.size > 10) {
    const codesArray = Array.from(processedCodes);
    processedCodes.clear();
    codesArray.slice(-5).forEach(code => processedCodes.add(code));
  }
  
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
      }).toString(),
      // Use custom HTTPS agent to bypass certificate issues
      httpsAgent: httpsAgent,
      timeout: 10000
    };
    
    console.log('Making auth request to Spotify...');
    console.log('Request details:', {
      url: authOptions.url,
      method: authOptions.method,
      redirect_uri: spotifyRedirectUri,
      code_length: code ? code.length : 0
    });
    
    const response = await axios(authOptions);
    
    console.log('Auth request successful:', { status: response.status });
    
    if (response.status === 200) {
      spotifyAccessToken = response.data.access_token;
      spotifyRefreshToken = response.data.refresh_token || spotifyRefreshToken; // Store refresh token
      persistSpotifyTokensToDisk();
      console.log('✅ Spotify authentication successful');
      console.log('Access token received successfully');
      console.log('Refresh token stored:', spotifyRefreshToken ? 'Yes' : 'No');
      console.log('Token expires in:', response.data.expires_in, 'seconds');
      res.send(`
        <html>
          <head>
            <title>Spotify Authentication</title>
            <style>
              body {
                font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                text-align: center;
                padding: 50px;
                background: linear-gradient(135deg, #1DB954 0%, #1ed760 100%);
                color: white;
                margin: 0;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                height: 100vh;
              }
              h2 {
                font-size: 28px;
                margin-bottom: 20px;
                animation: fadeIn 0.5s ease-in;
              }
              .checkmark {
                font-size: 64px;
                animation: scaleIn 0.5s ease-out;
              }
              @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
              }
              @keyframes scaleIn {
                from { transform: scale(0); }
                to { transform: scale(1); }
              }
            </style>
          </head>
          <body>
            <div class="checkmark">✅</div>
            <h2>Successfully authenticated with Spotify!</h2>
            <p>Closing window...</p>
            <script>
              // Notify opener window if available
              if (window.opener && !window.opener.closed) {
                try {
                  window.opener.postMessage({ 
                    type: 'spotify-auth-success',
                    timestamp: Date.now()
                  }, '*');
                  console.log('Notified opener window of successful authentication');
                } catch (e) {
                  console.log('Could not notify opener:', e.message);
                }
              }
              
              // Close the window automatically after a short delay
              setTimeout(() => {
                console.log('Closing authentication window');
                window.close();
              }, 1000);
              
              // Fallback: if window.close() doesn't work, try to navigate back
              setTimeout(() => {
                if (!window.closed) {
                  console.log('Window still open, attempting alternate close method');
                  if (window.history.length > 1) {
                    window.history.back();
                  }
                }
              }, 1500);
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
    
    // Handle specific Spotify API errors
    if (error.response?.data?.error === 'invalid_grant') {
      console.error('Invalid grant error - this usually means:');
      console.error('1. Authorization code has expired (codes expire in 10 minutes)');
      console.error('2. Authorization code has already been used');
      console.error('3. Redirect URI mismatch');
      console.error('4. Client credentials are incorrect');
      
      return res.status(400).send(`
        <html>
          <head><title>Spotify Authentication Error</title></head>
          <body style="font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: center; padding: 50px;">
            <h2>❌ Authentication Error</h2>
            <p>The authorization code has expired or is invalid.</p>
            <p>Please try logging in again.</p>
            <button onclick="window.close()">Close</button>
          </body>
        </html>
      `);
    }
    
    const errorMessage = error.response?.data?.error_description || 
                        error.response?.data?.error || 
                        error.message || 
                        'Unknown error';
    
    res.status(500).send('Error getting access token: ' + errorMessage);
  }
});

// Get current access token
backend.get('/auth/token', (req, res) => {
  // Reload tokens from disk to ensure we have the latest
  loadSpotifyTokensFromDisk();
  
  if (!spotifyAccessToken) {
    return res.status(401).json({ error: 'Not authenticated with Spotify' });
  }
  res.json({ 
    access_token: spotifyAccessToken,
    refresh_token: spotifyRefreshToken,
    expires_in: 3600 // Default 1 hour
  });
});

// Session status endpoint (matches middleware pattern)
backend.get('/api/session', (req, res) => {
  res.json({
    loggedIn: !!(spotifyAccessToken || spotifyRefreshToken),
    sessionId: sessionId || null,
    expiresAt: expiresAt || 0,
    connectedToMiddleware: middlewareWs?.readyState === middlewareWs?.OPEN
  });
});

// Get Spotify OAuth configuration (safe to expose - client ID is public, secret stays server-side)
backend.get('/api/spotify/config', (req, res) => {
  // The redirect URI for Spotify OAuth is the Render middleware callback URL
  const spotifyRedirectUriForOAuth = new URL('/oauth/callback', MIDDLEWARE_URL).toString();
  
  res.json({
    clientId: spotifyClientId, // Safe to expose - this is public
    redirectUri: spotifyRedirectUriForOAuth, // Render middleware callback URL
    scope: spotifyScope,
    middlewareUrl: MIDDLEWARE_URL,
    localCallback: spotifyRedirectUri // Local server callback for Render to redirect to
  });
});

// Logout endpoint (API route - matches middleware pattern)
backend.post('/api/logout', async (req, res) => {
  const sid = sessionId;
  spotifyAccessToken = '';
  spotifyRefreshToken = '';
  expiresAt = 0;
  lastPlayerState = null;
  persistSpotifyTokensToDisk();

  broadcast({
    type: 'spotify_logout',
    timestamp: Date.now()
  });
  
  // Broadcast via SSE (matches middleware pattern)
  broadcastSSE('status', { loggedIn: false });
  broadcastSSE('player_state', null);
  
  res.json({
    ok: true,
    middlewareLogoutUrl: sid
      ? `${MIDDLEWARE_URL}/logout?sessionId=${encodeURIComponent(sid)}&return_to=${encodeURIComponent(`https://${currentIP}:${backendPort}/`)}`
      : null
  });
});

// Legacy logout endpoint (kept for backward compatibility)
backend.post('/auth/logout', async (req, res) => {
  console.log('Spotify logout requested');
  const sid = sessionId;
  spotifyAccessToken = '';
  spotifyRefreshToken = '';
  persistSpotifyTokensToDisk();
  
  broadcast({
    type: 'spotify_logout',
    timestamp: Date.now()
  });
  
  // Broadcast via SSE
  broadcastSSE('status', { loggedIn: false });
  broadcastSSE('player_state', null);
  lastPlayerState = null;
  
  res.json({
    success: true,
    message: 'Logged out successfully',
    middlewareLogoutUrl: sid
      ? `${MIDDLEWARE_URL}/logout?sessionId=${encodeURIComponent(sid)}&return_to=${encodeURIComponent(`https://${currentIP}:${backendPort}/`)}`
      : null
  });
});

// Generic proxy endpoint for Spotify API calls through Render middleware (matches middleware pattern)
backend.all('/api/spotify/*', async (req, res) => {
  if (!sessionId) {
    return res.status(401).json({ error: 'Not logged in. Use /login.' });
  }

  // Verify we have tokens before making request
  if (!spotifyAccessToken) {
    console.error('❌ No access token available for proxy request');
    return res.status(401).json({ error: 'Not authenticated with Spotify' });
  }

  // Ensure middleware WebSocket is connected
  if (!middlewareWs || middlewareWs.readyState !== 1) {
    console.log('⚠️ Middleware WebSocket not connected, connecting...');
    ensureMiddlewareWsConnected();
    // Wait for connection
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  // Ensure tokens are sent to middleware (in case connection was just established)
  if (middlewareWs && middlewareWs.readyState === 1) {
    middlewareWs.send(JSON.stringify({
      type: 'tokens',
      access_token: spotifyAccessToken,
      expires_in: Math.max(1, Math.floor((expiresAt - nowMs()) / 1000))
    }));
    console.log('📤 Sent tokens to middleware for session:', sessionId);
    // Small delay to ensure middleware processes the tokens
    await new Promise(resolve => setTimeout(resolve, 500));
  } else {
    console.error('❌ Cannot send tokens - WebSocket not connected');
    return res.status(503).json({ error: 'Middleware connection not ready' });
  }

  // Extract path and preserve query parameters (match middleware pattern)
  const pathPart = req.originalUrl.replace(/^\/api\/spotify/, '');
  const target = `${MIDDLEWARE_URL}/spotify${pathPart}`;

  const headers = { 'x-session-id': sessionId };
  const contentType = req.header('content-type');
  if (contentType) headers['content-type'] = contentType;

  // Prepare body - express.json() has already parsed it, so stringify if needed
  let body = undefined;
  if (!['GET', 'HEAD'].includes(req.method)) {
    if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
      body = JSON.stringify(req.body);
      headers['content-type'] = 'application/json';
    } else if (req.body && typeof req.body === 'string' && req.body.length > 0) {
      body = req.body;
    }
  }

  try {
    // Use axios to proxy request to middleware (matches middleware pattern)
    const response = await axios({
      method: req.method,
      url: target,
      headers: headers,
      data: body,
      httpsAgent: httpsAgent,
      timeout: 30000,
      validateStatus: () => true, // Don't throw on any status
      responseType: 'arraybuffer'
    });

    res.status(response.status);
    const contentType = response.headers['content-type'];
    if (contentType) {
      res.setHeader('content-type', contentType);
    }

    res.send(Buffer.from(response.data));
  } catch (e) {
    console.error('❌ Proxy request failed:', e.message);
    res.status(502).json({ error: 'Proxy failed', detail: String(e.message) });
  }
});

// Note: /api/spotify/playback-state is now handled by the generic proxy
// Controller should use /api/spotify/v1/me/player instead

// Note: All specific Spotify endpoints (play, pause, next, previous, volume) are now handled
// by the generic proxy at /api/spotify/* which forwards to middleware /spotify/*
// This matches the middleware pattern where all API calls go through the generic proxy

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

// Note: Player state polling is now handled by the middleware server
// The middleware polls Spotify and sends updates via WebSocket as 'player_state' messages
// This endpoint is removed to match the middleware pattern

// Refresh Spotify access token (local - keeps client secret secure)
async function refreshAccessToken() {
  if (!spotifyRefreshToken) {
    throw new Error('No refresh token available');
  }

  const body = new URLSearchParams();
  body.set('grant_type', 'refresh_token');
  body.set('refresh_token', spotifyRefreshToken);

  const basic = Buffer.from(`${spotifyClientId}:${spotifyClientSecret}`).toString('base64');

  const r = await axios.post('https://accounts.spotify.com/api/token', body.toString(), {
    headers: {
      'Authorization': `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    httpsAgent: httpsAgent,
    timeout: 10000
  });

  if (!r.status || r.status !== 200) {
    const t = await r.data;
    throw new Error(`Refresh failed: ${r.status} ${JSON.stringify(t)}`);
  }

  spotifyAccessToken = r.data.access_token;
  if (r.data.refresh_token) {
    spotifyRefreshToken = r.data.refresh_token;
  }
  expiresAt = nowMs() + (r.data.expires_in * 1000);
  persistSpotifyTokensToDisk();
  
  return r.data;
}

// Refresh token endpoint
backend.post('/api/spotify/refresh-token', async (req, res) => {
  try {
    const data = await refreshAccessToken();
    
    // Send refreshed tokens to Render middleware
    if (middlewareWs && middlewareWs.readyState === 1) { // OPEN
      middlewareWs.send(JSON.stringify({
        type: 'refreshed',
        access_token: spotifyAccessToken,
        expires_in: Math.max(1, Math.floor((expiresAt - nowMs()) / 1000))
      }));
    }
    
    // Broadcast status update via SSE
    broadcastSSE('status', { loggedIn: true, refreshed: true });
    
    res.json({ 
      success: true, 
      access_token: spotifyAccessToken,
      refresh_token: spotifyRefreshToken,
      expires_in: data.expires_in || 3600
    });
  } catch (error) {
    console.error('❌ Token refresh error:', error.message);
    
    if (error.response?.data?.error === 'invalid_grant') {
      spotifyRefreshToken = '';
      spotifyAccessToken = '';
      persistSpotifyTokensToDisk();
    }
    
    res.status(error.response?.status || 500).json({ 
      error: error.message,
      details: error.response?.data?.error_description || 'Token refresh failed'
    });
  }
});

// Note: Search, devices, and transfer endpoints are now handled by the generic proxy
// at /api/spotify/* which forwards to middleware /spotify/*
// Use /api/spotify/v1/search, /api/spotify/v1/me/player/devices, etc.

// HTTPS server setup (for Spotify authentication)
const httpsOptions = {
  key: fs.readFileSync(path.join(__dirname, 'server-key.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'server-cert.pem'))
};

https.createServer(httpsOptions, backend).listen(backendPort, '0.0.0.0', () => {
  console.log(`🔒 HTTPS Backend listening on https://0.0.0.0:${backendPort}`);
  console.log(`   Spotify OAuth: https://${currentIP}:${backendPort}/auth/login`);
});

// HTTP server setup (for Reolink and Hubitat webhooks)
const http = require('http');
const httpPort = 4713;

http.createServer(backend).listen(httpPort, '0.0.0.0', () => {
  console.log(`🌐 HTTP Backend listening on http://0.0.0.0:${httpPort}`);
  console.log(`   Reolink webhook: http://${currentIP}:${httpPort}/api/notify`);
  console.log(`   Hubitat webhook: http://${currentIP}:${httpPort}/api/hubitat/webhook`);
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
    alwaysOnTop: false,
    skipTaskbar: true,
    autoHideMenuBar: true,
    // Additional settings for better touch support
    focusable: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    closable: false,
  });
  
  // Ignore SSL certificate errors for ALL requests (including fetch)
  // This is essential for self-signed certificates in local development
  win.webContents.session.setCertificateVerifyProc((request, callback) => {
    try {
      // Extract hostname from the request URL
      const url = new URL(request.url);
      const hostname = url.hostname;
      
      // Allow self-signed certificates for local network IPs
      if (hostname.startsWith('192.168.') || 
          hostname.startsWith('10.') || 
          hostname.startsWith('172.') ||
          hostname === 'localhost' ||
          hostname === '127.0.0.1') {
        console.log(`✅ Allowing self-signed certificate for: ${hostname}`);
        callback(0); // 0 means "proceed"
        return;
      }
      
      // For external URLs, use normal certificate verification
      callback(-3); // -3 means "use default verification"
    } catch (error) {
      // If URL parsing fails, check if it's a local IP by other means
      const urlString = request.url || '';
      console.log(`Certificate verification: URL parsing failed for: ${urlString}`);
      
      // Try to extract IP from the URL string directly
      const ipMatch = urlString.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
      if (ipMatch) {
        const ip = ipMatch[1];
        if (ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.') || 
            ip === '127.0.0.1' || ip === 'localhost') {
          console.log(`✅ Allowing self-signed certificate for IP: ${ip}`);
          callback(0);
          return;
        }
      }
      
      // If we can't determine it's local, allow it anyway for development
      console.log('Certificate verification: Allowing unknown URL for development');
      callback(0);
    }
  });
  
  // Set fetch to ignore certificate errors (critical for self-signed certs)
  win.webContents.session.webRequest.onBeforeSendHeaders((details, callback) => {
    callback({ requestHeaders: details.requestHeaders });
  });
  
  win.loadFile('index.html');
  
  // Enable remote debugging
  // win.webContents.openDevTools(); // Disabled - no auto-open dev tools
  
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
          width: 520,
          height: 720,
          center: true,
          alwaysOnTop: true, // Keep popup on top
          modal: false, // Don't block the main window, but stay on top
          parent: win, // Set parent window for proper stacking
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: false,
            allowRunningInsecureContent: true,
            devTools: false // Disable dev tools for popup
          },
          // Window appearance
          frame: true,
          titleBarStyle: 'default',
          show: true, // Show immediately to prevent closing issues
          autoHideMenuBar: true,
          minimizable: true,
          maximizable: false,
          closable: true,
          resizable: true,
          // Additional options to prevent immediate closing
          skipTaskbar: false,
          focusable: true,
          movable: true
        }
      };
    }
    return { action: 'deny' };
  });
  
  // Apply certificate bypass to any new popup windows created
  win.webContents.on('did-create-window', (newWindow) => {
    // Apply certificate verification bypass
    newWindow.webContents.session.setCertificateVerifyProc((request, callback) => {
      try {
        // Extract hostname from the request URL
        const url = new URL(request.url);
        const hostname = url.hostname;
        
        // Allow self-signed certificates for local network IPs
        if (hostname.startsWith('192.168.') || 
            hostname.startsWith('10.') || 
            hostname.startsWith('172.') ||
            hostname === 'localhost' ||
            hostname === '127.0.0.1') {
          console.log(`✅ [Popup] Allowing self-signed certificate for: ${hostname}`);
          callback(0);
          return;
        }
        
        // For external URLs, use normal certificate verification
        callback(-3);
      } catch (error) {
        // If URL parsing fails, use default verification
        console.warn('[Popup] Certificate verification: Invalid URL format, using default verification');
        callback(-3);
      }
    });
    
    // Ensure popup window appears on top and is focused
    newWindow.once('ready-to-show', () => {
      console.log('🔐 Spotify login popup window ready, bringing to front');
      newWindow.show();
      newWindow.focus();
      newWindow.setAlwaysOnTop(true, 'floating');
      newWindow.moveTop();
    });
    
    // Log when popup closes
    newWindow.on('closed', () => {
      console.log('🔐 Spotify login popup window closed');
    });
    
    // Monitor navigation to callback URL and auto-close after success
    newWindow.webContents.on('did-navigate', (event, url) => {
      if (url.includes('/oauth/callback')) {
        console.log('🔐 Detected OAuth callback URL, popup will auto-close shortly');
      }
    });
  });
  
  // Prevent exit on escape key
  win.on('before-quit', (event) => {
    event.preventDefault();
  });
}

// Enable DRM support and touch compatibility
app.commandLine.appendSwitch('--enable-widevine-cdm');
app.commandLine.appendSwitch('--enable-media-stream');
app.commandLine.appendSwitch('--autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('--disable-features', 'VizDisplayCompositor');
// Additional switches for better touch support
app.commandLine.appendSwitch('--enable-touch-events');
app.commandLine.appendSwitch('--enable-gesture-events');
app.commandLine.appendSwitch('--enable-pointer-lock');
app.commandLine.appendSwitch('--disable-background-timer-throttling');
app.commandLine.appendSwitch('--disable-renderer-backgrounding');
app.commandLine.appendSwitch('--disable-backgrounding-occluded-windows');

// Critical: Ignore certificate errors globally for self-signed certs in local development
// This ensures fetch() and all HTTPS requests work with self-signed certificates
app.commandLine.appendSwitch('--ignore-certificate-errors');
app.commandLine.appendSwitch('--allow-insecure-localhost');

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
}); 