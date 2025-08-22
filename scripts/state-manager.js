// Centralized State Management for Hubitat Dashboard
class DeviceStateManager {
  constructor() {
    this.devices = new Map();
    this.listeners = new Set();
    this.updateQueue = new Map(); // Debounce rapid updates
    this.debounceDelay = 100; // ms
  }
  
  // Update device state and notify listeners
  updateDevice(deviceId, attributes) {
    const deviceIdStr = String(deviceId);
    const currentState = this.devices.get(deviceIdStr);
    
    // Only update if state actually changed
    if (!this.hasStateChanged(currentState, attributes)) {
      return;
    }
    
    // Store the new state
    this.devices.set(deviceIdStr, {
      ...attributes,
      lastUpdated: Date.now()
    });
    
    // Debounce rapid updates
    this.debounceUpdate(deviceIdStr, attributes);
  }
  
  // Check if state has meaningful changes
  hasStateChanged(oldState, newState) {
    if (!oldState) return true;
    
    // Check key attributes that affect UI
    const keyAttributes = ['switch', 'level', 'hue', 'saturation', 'colorTemperature', 'lock', 'contact', 'temperature'];
    
    for (const attr of keyAttributes) {
      if (oldState[attr] !== newState[attr]) {
        return true;
      }
    }
    
    return false;
  }
  
  // Debounce rapid updates to prevent UI flicker
  debounceUpdate(deviceId, attributes) {
    if (this.updateQueue.has(deviceId)) {
      clearTimeout(this.updateQueue.get(deviceId));
    }
    
    const timeoutId = setTimeout(() => {
      this.notifyListeners(deviceId, attributes);
      this.updateQueue.delete(deviceId);
    }, this.debounceDelay);
    
    this.updateQueue.set(deviceId, timeoutId);
  }
  
  // Get current device state
  getDevice(deviceId) {
    const deviceIdStr = String(deviceId);
    return this.devices.get(deviceIdStr);
  }
  
  // Get all devices
  getAllDevices() {
    return Object.fromEntries(this.devices);
  }
  
  // Subscribe to state changes
  subscribe(listener) {
    this.listeners.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }
  
  // Notify all listeners of state change
  notifyListeners(deviceId, attributes) {
    this.listeners.forEach(listener => {
      try {
        listener(deviceId, attributes);
      } catch (error) {
        console.error('Error in state listener:', error);
      }
    });
  }
  
  // Bulk update multiple devices
  updateMultipleDevices(deviceUpdates) {
    Object.entries(deviceUpdates).forEach(([deviceId, attributes]) => {
      this.updateDevice(deviceId, attributes);
    });
  }
  
  // Refresh device state from Hubitat
  async refreshDevice(deviceId) {
    try {
      const response = await fetch(`${window.MAKER_API_BASE}/devices/${deviceId}?access_token=${window.ACCESS_TOKEN}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const device = await response.json();
      const attributes = this.normalizeAttributes(device.attributes);
      
      this.updateDevice(deviceId, attributes);
      return attributes;
    } catch (error) {
      console.error(`Failed to refresh device ${deviceId}:`, error);
      throw error;
    }
  }
  
  // Normalize Hubitat attributes to consistent format
  normalizeAttributes(attributes) {
    if (!attributes) return {};
    
    // Handle both array and object formats from Hubitat
    if (Array.isArray(attributes)) {
      const normalized = {};
      attributes.forEach(attr => {
        if (attr.name && attr.currentValue !== undefined) {
          normalized[attr.name] = attr.currentValue;
        }
      });
      return normalized;
    }
    
    return attributes;
  }
  
  // Get device state summary for UI
  getDeviceSummary(deviceId) {
    const device = this.getDevice(deviceId);
    if (!device) return null;
    
    return {
      id: deviceId,
      isOn: device.switch === 'on',
      level: parseInt(device.level) || 0,
      hue: parseInt(device.hue) || 0,
      saturation: parseInt(device.saturation) || 0,
      colorTemperature: parseInt(device.colorTemperature) || 3000,
      lock: device.lock,
      contact: device.contact,
      temperature: parseFloat(device.temperature) || 0,
      lastUpdated: device.lastUpdated
    };
  }
  
  // Check if device is online/recently updated
  isDeviceOnline(deviceId, maxAgeMs = 300000) { // 5 minutes default
    const device = this.getDevice(deviceId);
    if (!device || !device.lastUpdated) return false;
    
    return (Date.now() - device.lastUpdated) < maxAgeMs;
  }
}

// Create global instance
const deviceStateManager = new DeviceStateManager();
window.deviceStateManager = deviceStateManager;

// Global instance available for use
// deviceStateManager is available globally as window.deviceStateManager
