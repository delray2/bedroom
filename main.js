const { app, BrowserWindow } = require('electron');
const path = require('path');
const { startBackend } = require('./server/backend');
const { getRuntimeConfig } = require('./server/config');

let backendInstance = null;
let allowClose = false;

function ensureBackend() {
  if (backendInstance) {
    return backendInstance;
  }

  const config = getRuntimeConfig();
  backendInstance = startBackend({
    config,
    staticDir: path.resolve(__dirname),
  });
  return backendInstance;
}

function createWindow() {
  ensureBackend();

  const win = new BrowserWindow({
    width: 1920,
    height: 1080,
    fullscreen: true,
    kiosk: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  win.loadFile('index.html');

  win.on('close', (event) => {
    if (!allowClose) {
      // Prevent accidental exits while running in kiosk mode
      event.preventDefault();
      win.hide();
    }
  });
}

app.whenReady().then(() => {
  ensureBackend();
  createWindow();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  allowClose = true;
});

app.on('will-quit', () => {
  if (backendInstance) {
    backendInstance.stop();
    backendInstance = null;
  }
});
