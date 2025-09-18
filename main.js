const { app, BrowserWindow } = require('electron');
const path = require('path');
const express = require('express');
const { WebSocketServer } = require('ws');

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

backend.listen(backendPort, '0.0.0.0', () => {
  console.log(`Backend listening for notifications on http://0.0.0.0:${backendPort}`);
  console.log(`Hubitat webhook endpoint: http://0.0.0.0:${backendPort}/api/hubitat/webhook`);
  console.log(`Network accessible at: http://192.168.4.135:${backendPort}/api/hubitat/webhook`);
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
    },
    // Touchscreen optimizations
    alwaysOnTop: true,
    skipTaskbar: true,
    autoHideMenuBar: true,
  });
  const indexPath = path.join(__dirname, 'dist', 'index.html');
  win.loadFile(indexPath);
  
  // Prevent exit on escape key
  win.on('before-quit', (event) => {
    event.preventDefault();
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
}); 