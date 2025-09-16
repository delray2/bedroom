// Enhanced State Management for Hubitat Dashboard with Visual State Support
class DeviceStateManager {
  constructor() {
    this.devices = new Map();
    this.listeners = new Set();
    this.updateQueue = new Map(); // Debounce rapid updates
    this.debounceDelay = 100; // ms
    this.lastEventTs = new Map();
    this.activeDeviceModalId = null;
    
    // Notify the app once the manager is ready so UI can wire safely
    try {
      window.dispatchEvent(new CustomEvent('deviceStateManager:ready'));
    } catch {}
    
    this._bindModalTracking();
  }
  
  // Update device state and notify listeners
  updateDevice(deviceId, attributes) {
    if (!attributes || typeof attributes !== 'object') return;
    const id = String(deviceId);
    const incomingTs = Number(attributes.timestamp || Date.now());
    const lastTs = this.lastEventTs.get(id) || 0;
    if (incomingTs <= lastTs) return; // dedupe & order guarantee
    this.lastEventTs.set(id, incomingTs);

    const prev = this.devices.get(id) || { attributes: {}, lastUpdated: 0 };
    const { timestamp, ...clean } = attributes;
    const next = { attributes: { ...prev.attributes, ...clean }, lastUpdated: Date.now() };
    this.devices.set(id, next);
    
    // Update visual state immediately for responsive UI
    this.updateDeviceVisualState(id, clean);
    
    this.debounceUpdate(id);
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
  debounceUpdate(deviceId) {
    if (this.updateQueue.has(deviceId)) {
      clearTimeout(this.updateQueue.get(deviceId));
    }
    
    const timeoutId = setTimeout(() => {
      const state = this.getDevice(deviceId);
      this.notifyListeners(deviceId, state);
      this.updateQueue.delete(deviceId);
    }, this.debounceDelay);
    
    this.updateQueue.set(deviceId, timeoutId);
  }
  
  // Get current device state
  getDevice(deviceId) {
    const id = String(deviceId);
    return (this.devices.get(id) || {}).attributes || {};
  }

  // Treat values older than maxAge as stale; callers can trigger a single refresh
  isStale(deviceId, maxAgeMs = 15000){
    const id = String(deviceId);
    const last = this.devices.get(id)?.lastUpdated || 0;
    return (Date.now() - last) > maxAgeMs;
  }
  
  // Get all devices
  getAllDevices() {
    return Object.fromEntries(this.devices);
  }
  
  // Subscribe to state changes
  subscribe(listener) {
    if (typeof listener !== 'function') return () => {};
    this.listeners.add(listener);
    
    // Return an unsubscribe function so callers can cleanly detach
    return () => { try { this.listeners.delete(listener); } catch {} };
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
    const res = await window.apiService.getDevice(deviceId);
    const attrs = this.normalizeAttributes(res.attributes);
    const ts = Date.now();
    this.updateDevice(deviceId, { ...attrs, timestamp: ts });
    return attrs;
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

  /* ================= Visual State Management ================= */
  
  // Initialize visual state subscriptions
  initVisualStateSubscriptions() {
    if (this._visualSubscribed) return;
    this._visualSubscribed = true;
    
    this._unsubscribe = this.subscribe((deviceId, state) => {
      try {
        // Update visual state for any UI elements that depend on this device
        this.updateDeviceVisualState(deviceId, state);
        
        // Update global indicators when relevant
        const idStr = String(deviceId);
        if (this._isLockDevice(idStr)) this.updateLockVisualState(state);
        if (this._isInBedroomLightsGroup(idStr)) this.updatePaddleSwitchVisualState();
        
        // Live-update open device modal (if any)
        if (this.activeDeviceModalId && String(this.activeDeviceModalId) === idStr) {
          const latest = this.getDevice(deviceId) || {};
          this.updateOpenDeviceModal(deviceId, latest);
        }
      } catch(e) {
        console.error('Visual state update failed', e);
      }
    });
  }

  // Update visual state for a specific device
  updateDeviceVisualState(deviceId, state) {
    if (!state || typeof state !== 'object' || Array.isArray(state)) return;
    const idStr = String(deviceId);
    
    // Lights (switch/level/color/ct)
    if ('switch' in state || 'level' in state || 'hue' in state || 'colorTemperature' in state) {
      this.updateLightVisualState(idStr, state);
    }
    
    // Lock
    if ('lock' in state || 'contact' in state || 'battery' in state) {
      this.updateLockVisualState(state);
    }
    
    // Thermostat
    if ('thermostatMode' in state || 'thermostatOperatingState' in state || 'coolingSetpoint' in state || 'heatingSetpoint' in state) {
      this.updateThermostatVisualState(state);
    }
    
    // TV / Media (Roku)
    if ('transportStatus' in state || 'application' in state || 'power' in state || 'mediaInputSource' in state) {
      this.updateMediaVisualState(deviceId, state);
    }
    
  }

  /* ================= Visual State Helpers ================= */
  
  _isInGroup(groupName, idStr) {
    // Define device groups based on existing DEVICE_MAP
    const groups = {
      bedroomLights: ['447', '450', '480', '451'] // Bed Lamp, Laundry 1, Bedroom Fan 1, Bedroom Fan 2
    };
    const arr = groups[groupName];
    if (!Array.isArray(arr)) return false;
    return arr.some(d => String(d) === String(idStr));
  }
  
  _isLockDevice(idStr) {
    // Check if this is the lock device (ID: 509 from DEVICE_MAP)
    return String(idStr) === '509';
  }
  
  _isInBedroomLightsGroup(idStr) {
    return this._isInGroup('bedroomLights', idStr);
  }
  
  _findTileById(idStr) {
    return document.querySelector?.(`[data-device-id="${idStr}"]`) || 
           document.querySelector?.(`.device-tile[data-device-id="${idStr}"]`) || 
           null;
  }
  
  _sideBtnByTitle(title) {
    return document.querySelector?.(`.side-btn[title="${title}"]`) || null;
  }
  
  _setGlow(el, color, strength = 0.6) {
    if (!el) return;
    el.style.setProperty('--glow-color', color);
    el.style.setProperty('--glow-strength', String(Math.max(0, Math.min(1, strength))));
  }
  
  _pulse(el) {
    if (!el) return;
    el.classList.remove('pulse');
    // reflow to restart animation
    // eslint-disable-next-line no-unused-expressions
    el.offsetWidth;
    el.classList.add('pulse');
  }
  
  _colorFromState(state) {
    const level = Number.isFinite(state.level) ? state.level : (parseFloat(state.level) || 0);
    if (typeof state.hue !== 'undefined' && typeof state.saturation !== 'undefined') {
      const h = Math.max(0, Math.min(100, Number(state.hue))) * 3.6;
      const s = Math.max(0, Math.min(100, Number(state.saturation)));
      const l = 50;
      return `hsl(${h}deg ${s}% ${l}%)`;
    }
    if (typeof state.colorTemperature !== 'undefined') {
      const k = Math.max(1500, Math.min(9000, Number(state.colorTemperature)));
      const t = (k - 2700) / (6500 - 2700);
      const hue = (1 - Math.max(0, Math.min(1, t))) * 35 + Math.max(0, Math.min(1, t)) * 210;
      return `hsl(${hue}deg 90% 60%)`;
    }
    return 'hsl(48deg 95% 60%)';
  }
  
  _strengthFromState(state) {
    const lvl = Number.isFinite(state.level) ? state.level : (parseFloat(state.level) || 0);
    return Math.max(.25, Math.min(1, lvl / 100));
  }

  /* ================= Device-Specific Visual Updates ================= */
  
  // Lights: per-device tile + "Lights" side button
  updateLightVisualState(deviceId, state) {
    const isOn = (String(state.switch).toLowerCase() === 'on') || (Number(state.level) > 0);
    const color = this._colorFromState(state);
    const strength = this._strengthFromState(state);
    
    // Per-device tile (if present)
    const tile = this._findTileById(deviceId);
    if (tile) {
      tile.classList.add('light');
      tile.classList.toggle('is-on', !!isOn);
      this._setGlow(tile, color, strength);
      this._pulse(tile);
    }
    
    // Lights side button (aggregate signal for bedroom group)
    const lightsBtn = this._sideBtnByTitle('Lights');
    if (lightsBtn && this._isInBedroomLightsGroup(deviceId)) {
      lightsBtn.classList.add('light');
      lightsBtn.classList.toggle('is-on', !!isOn);
      this._setGlow(lightsBtn, color, strength);
      this._pulse(lightsBtn);
    }
  }

  // Lock: side button or #lockIndicator
  updateLockVisualState(state) {
    const locked = String(state.lock).toLowerCase() === 'locked';
    const btn = this._sideBtnByTitle('Lock') || document.getElementById?.('lockIndicator');
    if (!btn) return;
    
    btn.classList.add('lock');
    btn.classList.toggle('locked', locked);
    btn.classList.toggle('unlocked', !locked);
    btn.classList.toggle('is-on', true);
    this._setGlow(btn, locked ? 'rgba(66,179,113,.9)' : 'rgba(244,96,72,.95)', .6);
    this._pulse(btn);
  }

  // Thermostat: color by operating state
  updateThermostatVisualState(state) {
    const mode = String(state.thermostatOperatingState || state.thermostatMode || '').toLowerCase();
    const btn = this._sideBtnByTitle('Thermostat');
    if (!btn) return;
    
    btn.classList.add('thermostat');
    const heat = mode.includes('heat');
    const cool = mode.includes('cool');
    btn.classList.toggle('heating', heat);
    btn.classList.toggle('cooling', cool);
    btn.classList.toggle('is-on', heat || cool);
    
    const glow = heat ? 'rgba(255,148,54,.92)' : cool ? 'rgba(86,175,255,.95)' : 'rgba(180,180,180,.4)';
    this._setGlow(btn, glow, .55);
    if (heat || cool) this._pulse(btn);
  }

  // TV & Music: power / playback cues
  updateMediaVisualState(deviceId, state) {
    // TV
    if (this._isTvDevice(deviceId) || state.application || state.mediaInputSource || typeof state.power !== 'undefined') {
      const tvBtn = this._sideBtnByTitle('TV');
      if (tvBtn) {
        tvBtn.classList.add('tv');
        const on = String(state.power || '').toLowerCase() === 'on' || !!state.application;
        tvBtn.classList.toggle('is-on', on);
        this._setGlow(tvBtn, 'rgba(130,180,255,.75)', on ? .6 : .35);
        if (on) this._pulse(tvBtn);
      }
    }
    
    // Music (simple playback pulse)
    const playing = String(state.transportStatus || '').toLowerCase().includes('play');
    const musicBtn = this._sideBtnByTitle('Music');
    if (musicBtn) {
      musicBtn.classList.add('music');
      musicBtn.classList.toggle('playing', playing);
      musicBtn.classList.toggle('is-on', playing);
      this._setGlow(musicBtn, 'rgba(180, 160, 255, .8)', playing ? .55 : .35);
      if (playing) this._pulse(musicBtn);
    }
  }


  // Paddle switch visual state
  updatePaddleSwitchVisualState() {
    // This will be called when bedroom lights state changes
    // The existing paddle switch logic in main.js will handle the actual state
    // We just need to trigger a visual update
    if (typeof window.updatePaddleSwitchUI === 'function') {
      const state = this.getDevice('457'); // BedroomLifxGOG group
      if (state && state.switch !== undefined) {
        window.updatePaddleSwitchUI(state.switch === 'on');
      }
    }
  }

  // Update open device modal
  updateOpenDeviceModal(deviceId, state) {
    // If there's a custom renderer, use it
    if (window.renderDeviceControls) {
      window.renderDeviceControls(deviceId, state);
    } else if (window.uiManager && window.uiManager.refreshDeviceControls) {
      window.uiManager.refreshDeviceControls(deviceId);
    }
  }

  // Helper to check if device is a TV
  _isTvDevice(deviceId) {
    const tvIds = ['473', '474']; // Bedroom TV, 50" Philips Roku TV
    return tvIds.includes(String(deviceId));
  }

  // Modal tracking
  _bindModalTracking() {
    window.addEventListener?.('dashboard:deviceModalOpen', (e) => {
      this.activeDeviceModalId = e?.detail?.deviceId ?? null;
    });
    
    window.addEventListener?.('dashboard:deviceModalClose', () => {
      this.activeDeviceModalId = null;
    });
    
    // Hook into existing modal system
    const originalOpen = window.openDeviceModal;
    if (typeof originalOpen === 'function') {
      window.openDeviceModal = (id, label, showBack) => {
        this.activeDeviceModalId = id;
        return originalOpen(id, label, showBack);
      };
    }
  }

  // Cleanup
  destroy() {
    try { 
      this._unsubscribe?.(); 
    } catch {}
    this._unsubscribe = null;
    this._visualSubscribed = false;
  }
}

// Create global instance
const deviceStateManager = new DeviceStateManager();
window.deviceStateManager = deviceStateManager;

// Initialize visual state when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  if (window.deviceStateManager) {
    window.deviceStateManager.initVisualStateSubscriptions();
  }
});

// Also initialize immediately if DOM is already ready
if (document.readyState === 'loading') {
  // DOM is still loading, wait for DOMContentLoaded
} else {
  // DOM is already ready, initialize immediately
  if (window.deviceStateManager) {
    window.deviceStateManager.initVisualStateSubscriptions();
  }
}
