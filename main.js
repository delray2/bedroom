const { app, BrowserWindow } = require('electron');
const path = require('path');
const express = require('express');
const { WebSocketServer } = require('ws');

// --- WebSocket server setup ---
const wss = new WebSocketServer({ port: 4712 });
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

backend.post('/api/notify', (req, res) => {
  console.log('Notification received:', req.body);
  // If notification is for LRGroup (deviceId 453), broadcast to WebSocket clients
  const content = req.body.content || req.body;
  if (content.deviceId === '453' || content.deviceId === 453) {
    broadcast({ type: 'lrgroup_update', payload: content });
  }
  res.sendStatus(200);
});

backend.listen(backendPort, () => {
  console.log(`Backend listening for notifications on http://localhost:${backendPort}/api/notify`);
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
  win.loadFile('index.html');
  
  // Prevent exit on escape key
  win.on('before-quit', (event) => {
    event.preventDefault();
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
}); 