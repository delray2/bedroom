# Hubitat Smart Home Dashboard

A modern, touch-friendly dashboard for controlling your Hubitat smart home devices with real-time state synchronization.

## ✨ Features

- **Real-Time State Management**: Automatic UI updates when device states change
- **Centralized State Store**: Single source of truth for all device states
- **WebSocket Integration**: Real-time communication between backend and frontend
- **Hubitat Webhook Support**: Receive instant updates when devices change
- **Responsive Touch UI**: Optimized for touchscreen and mobile devices
- **Device Group Control**: Control multiple devices simultaneously
- **Scene Management**: Pre-configured lighting scenes with WLED integration
- **Camera Integration**: Live camera feeds with motion detection
- **Thermostat Control**: Intuitive dial-based temperature control

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm
- Hubitat Hub with Maker API enabled
- Local network access to your Hubitat hub

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd bedroom

# Install dependencies
npm install

# Start the dashboard
npm start
```

The dashboard will open in a fullscreen Electron window optimized for touchscreen use.

## 🏗️ Architecture

### State Management System

The dashboard now features a centralized state management system that provides:

- **Real-time synchronization** between Hubitat and UI
- **Automatic state updates** when devices change
- **Debounced updates** to prevent UI flicker
- **Consistent state representation** across all components

#### Key Components

1. **DeviceStateManager** (`scripts/state-manager.js`)
   - Centralized state store for all devices
   - Handles state normalization and change detection
   - Provides subscription system for UI updates

2. **Enhanced API Service** (`scripts/api.js`)
   - Automatic state refresh after commands
   - Integration with state manager
   - Bulk device operations support

3. **WebSocket Backend** (`main.js`)
   - Real-time communication with frontend
   - Hubitat webhook endpoint
   - Device state broadcasting

4. **UI Manager** (`scripts/ui-manager.js`)
   - State-aware UI components
   - Automatic UI updates on state changes
   - Modal state synchronization

### State Flow

```
Hubitat Device Change → Webhook → Backend → WebSocket → Frontend → UI Update
```

## 🔧 Configuration

### Hubitat Setup

1. **Enable Maker API** in your Hubitat hub
2. **Configure webhooks** to send device updates (see [Webhook Setup Guide](HUBITAT_WEBHOOK_SETUP.md))
3. **Update device IDs** in `scripts/main.js` to match your setup

### Device IDs

Update these constants in `scripts/main.js`:

```javascript
const BEDROOM_GROUP_ID = '534'; // Your BedroomLifxGOG group ID
const BEDROOM_FAN2_ID = '451';  // Your Fan 2 device ID
const MAKER_API_BASE = 'http://192.168.4.44/apps/api/37'; // Your Hubitat IP
const ACCESS_TOKEN = 'your-access-token-here';
```

### Webhook Configuration

The dashboard listens for webhooks at:
```
http://localhost:4711/api/hubitat/webhook
```

Configure Hubitat to send webhooks when device attributes change. See the [Webhook Setup Guide](HUBITAT_WEBHOOK_SETUP.md) for detailed instructions.

## 📱 Usage

### Main Dashboard

- **Paddle Switch**: Controls the BedroomLifxGOG group
- **Side Buttons**: Access different device categories
- **Lock Indicator**: Shows front door lock status
- **Clock**: Current date and time

### Device Controls

- **Individual Device Modals**: Control specific devices with sliders and buttons
- **Global Controls**: Control all BedroomLifxGOG lights simultaneously
- **Scene Selection**: Apply pre-configured lighting scenes
- **WLED Effects**: Control LED strips with effects and palettes

### Real-Time Updates

The UI automatically updates when:
- Device states change in Hubitat
- Commands are sent from the dashboard
- Other apps control your devices
- Webhooks are received from Hubitat

## 🔌 API Endpoints

### Backend Endpoints

- `POST /api/hubitat/webhook` - Receive device state updates
- `POST /api/notify` - Legacy notification endpoint
- `POST /api/refresh-device/:deviceId` - Request device refresh
- `POST /api/refresh-devices` - Bulk device refresh
- `GET /api/health` - Health check

### WebSocket Messages

The frontend receives these message types:

- `device_state_update` - Device attribute changes
- `device_notification` - Device-specific notifications
- `lrgroup_update` - Group device updates
- `device_refresh_request` - Device refresh requests
- `bulk_device_refresh_request` - Bulk refresh requests

## 🛠️ Development

### Project Structure

```
bedroom/
├── scripts/
│   ├── state-manager.js      # Centralized state management
│   ├── api.js               # Enhanced API service
│   ├── ui-manager.js        # State-aware UI management
│   ├── controls.js          # Device control logic
│   ├── scenes.js            # Scene management
│   ├── ui.js                # WebSocket and UI updates
│   └── modal.js             # Modal system
├── main.js                  # Electron main process + backend
├── index.html               # Main UI
└── styles/                  # CSS stylesheets
```

### Adding New Devices

1. **Update device definitions** in `scripts/main.js`
2. **Add device capabilities** in `scripts/ui-manager.js`
3. **Configure webhooks** for the new device
4. **Test state synchronization**

### State Manager Integration

```javascript
// Subscribe to state changes
const unsubscribe = window.deviceStateManager.subscribe((deviceId, attributes) => {
  console.log(`Device ${deviceId} changed:`, attributes);
  // Update your UI here
});

// Get current device state
const state = window.deviceStateManager.getDevice('deviceId');

// Refresh device state
await window.deviceStateManager.refreshDevice('deviceId');
```

## 🐛 Troubleshooting

### Common Issues

1. **UI not updating**
   - Check WebSocket connection in browser console
   - Verify webhook configuration in Hubitat
   - Ensure state manager is initialized

2. **Webhooks not received**
   - Check backend is running on port 4711
   - Verify webhook URL is accessible from Hubitat
   - Check Hubitat logs for delivery errors

3. **State inconsistencies**
   - Use the refresh endpoints to force state sync
   - Check device IDs match between Hubitat and dashboard
   - Verify API access tokens are correct

### Debug Mode

Enable debug logging:

```javascript
// In browser console
localStorage.setItem('debug', 'true');
location.reload();
```

### Health Check

```bash
curl http://localhost:4711/api/health
```

## 🔒 Security

- **Local Network Only**: Dashboard runs on localhost
- **No Authentication**: Webhook endpoint is currently open
- **HTTPS Recommended**: Use HTTPS in production environments
- **Rate Limiting**: Consider implementing webhook rate limiting

## 📈 Performance

- **Debounced Updates**: Prevents UI flicker from rapid changes
- **Efficient State Storage**: Only stores relevant device attributes
- **WebSocket Optimization**: Minimal overhead for real-time updates
- **Automatic Cleanup**: Unused state listeners are cleaned up

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues and questions:
1. Check the troubleshooting section
2. Review browser console for errors
3. Verify Hubitat webhook configuration
4. Check backend logs for errors

## 🔮 Future Enhancements

- [ ] Authentication for webhook endpoints
- [ ] Device state history and analytics
- [ ] Custom device type support
- [ ] Mobile app companion
- [ ] Voice control integration
- [ ] Advanced automation rules
- [ ] Multi-room support
- [ ] Device grouping and scenes 