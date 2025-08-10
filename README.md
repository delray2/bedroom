# Hubitat Dashboard - Cleaned Version

A streamlined version of the Smart Wall Switch Dashboard with only essential files.

## Files Included

- `index.html` - Main dashboard interface
- `main.js` - Electron app and backend server
- `video-stream.js` - Video streaming functionality
- `manifest.json` - PWA manifest
- `sw.js` - Service worker for offline capability
- `package.json` - Dependencies and scripts
- `start.sh` - Startup script

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the dashboard:**
   ```bash
   npm start
   ```
   
   Or use the startup script:
   ```bash
   ./start.sh
   ```

## Features

- Smart wall switch interface
- Living room light controls
- TV controls (Roku)
- Vacuum controls (Roborock)
- Camera streaming
- Scene management
- WLED effects
- Real-time WebSocket updates

## Requirements

- Node.js and npm
- Electron
- Network access to Hubitat hub (192.168.4.44)
- Network access to WLED devices (192.168.4.24, 192.168.4.52)
- Network access to go2rtc server (192.168.4.145:1984)

## Configuration

Update the following in `index.html` if needed:
- Hubitat API base URL and access token
- Device IDs for your specific setup
- WLED device IP addresses
- go2rtc server URL

## Backend Services

The dashboard includes:
- Express server on port 4711 for notifications
- WebSocket server on port 4712 for real-time updates
- Electron window in kiosk mode 