/**
 * Unified State Manager for Hubitat Dashboard
 * Combines optimistic updates, interaction locking, visual state subscriptions,
 * and backward compatibility with existing code
 */

class UnifiedStateManager {
  constructor() {
    // Device states
    this.devices = new Map();
    this.listeners = new Set();
    
    // Optimistic update tracking
    this.pendingCommands = new Map(); // deviceId -> { command, value, timestamp, rollbackState }
    this.interactionLocks = new Map(); // deviceId -> timestamp (locks state during user interaction)
    
    // Debouncing and batching
    this.updateQueue = new Map();
    this.batchTimeout = null;
    
    // Visual state subscribers (for real-time UI updates)
    this.visualSubscribers = new Map(); // deviceId -> Set of callbacks
    
    // Timestamps for deduplication
    this.lastEventTs = new Map();
    
    // Modal tracking
    this.activeDeviceModalId = null;
    
    // Music playing state tracking
    this.musicPlaying = false;
    this.musicTrackInfo = null;
    
    // Configuration from global config (with fallbacks)
    this.config = {
      debounceDelay: window.CONFIG?.TIMING?.STATE_UPDATE_DEBOUNCE || 100,
      maxAge: window.CONFIG?.TIMING?.STATE_MAX_AGE || 300000,
      staleThreshold: window.CONFIG?.TIMING?.STATE_STALE_THRESHOLD || 15000,
      lockTimeout: 2000 // How long to lock state during user interaction
    };
    
    console.log('✓ Unified State Manager initialized');
    
    // Notify the app once the manager is ready
    try {
      window.dispatchEvent(new CustomEvent('deviceStateManager:ready'));
    } catch {}
    
    this._bindModalTracking();
  }
  
  // ========================================
  // Core State Management
  // ========================================
  
  /**
   * Update device state (from external source like WebSocket)
   * Respects interaction locks to prevent conflicts
   */
  updateDevice(deviceId, attributes) {
    if (!attributes || typeof attributes !== 'object') return;
    
    const id = String(deviceId);
    
    // Log individual light bulb updates
    const deviceInfo = window.DEVICE_MAP?.[id];
    if (deviceInfo && deviceInfo.type === 'light') {
      console.log(`💡 State Manager: Processing light bulb update for ${deviceInfo.label} (${id}):`, attributes);
    }
    
    // Check if device is locked due to user interaction
    if (this.isLocked(id)) {
      console.log(`Device ${id} is locked, queuing update`);
      this.queueUpdateWhenUnlocked(id, attributes);
      return;
    }
    
    // Deduplicate based on timestamp
    const incomingTs = Number(attributes.timestamp || Date.now());
    const lastTs = this.lastEventTs.get(id) || 0;
    if (incomingTs <= lastTs) {
      return; // Ignore older updates
    }
    this.lastEventTs.set(id, incomingTs);
    
    // Get previous state
    const prev = this.devices.get(id) || { attributes: {}, lastUpdated: 0 };
    
    // Check if this is a meaningful change
    if (!this.hasStateChanged(prev.attributes, attributes)) {
      return; // No significant change, skip update
    }
    
    // Remove timestamp from attributes (internal use only)
    const { timestamp, ...clean } = attributes;
    
    // Merge with existing state
    const next = {
      attributes: { ...prev.attributes, ...clean },
      lastUpdated: Date.now()
    };
    
    this.devices.set(id, next);
    
    // Update visual state immediately for responsive UI
    this.updateDeviceVisualState(id, clean);
    
    // Notify subscribers with debouncing
    this.debounceUpdate(id);
  }
  
  /**
   * Optimistic update - immediately update UI, send command, rollback on failure
   */
  async updateDeviceOptimistic(deviceId, attributes, command, value) {
    const id = String(deviceId);
    
    // Lock the device during this interaction
    this.lockDevice(id);
    
    // Store current state for potential rollback
    const rollbackState = this.getDevice(id);
    
    // Immediately update UI
    const prev = this.devices.get(id) || { attributes: {}, lastUpdated: 0 };
    const next = {
      attributes: { ...prev.attributes, ...attributes },
      lastUpdated: Date.now(),
      optimistic: true // Mark as optimistic
    };
    this.devices.set(id, next);
    
    // Track pending command
    this.pendingCommands.set(id, {
      command,
      value,
      timestamp: Date.now(),
      rollbackState
    });
    
    // Notify listeners immediately
    this.notifyListeners(id, next.attributes);
    
    // Send command to device
    try {
      if (window.apiService) {
        await window.apiService.sendDeviceCommand(id, command, value);
        // Success - remove pending command
        this.pendingCommands.delete(id);
        
        // Mark as confirmed
        const current = this.devices.get(id);
        if (current) {
          current.optimistic = false;
          this.devices.set(id, current);
        }
        
        // Unlock after short delay to allow server state to arrive
        setTimeout(() => this.unlockDevice(id), 500);
      }
    } catch (error) {
      console.error(`Failed to send command to device ${id}:`, error);
      
      // Rollback to previous state
      if (rollbackState) {
        this.devices.set(id, {
          attributes: rollbackState,
          lastUpdated: Date.now()
        });
        this.notifyListeners(id, rollbackState);
      }
      
      // Clean up
      this.pendingCommands.delete(id);
      this.unlockDevice(id);
      
      // Show error toast
      if (window.showToast) {
        window.showToast('Failed to update device', 'error');
      }
      
      throw error;
    }
  }
  
  /**
   * Get current device state
   */
  getDevice(deviceId) {
    const id = String(deviceId);
    const device = this.devices.get(id);
    return device ? { ...device.attributes } : {};
  }
  
  /**
   * Get all devices
   */
  getAllDevices() {
    const result = {};
    this.devices.forEach((device, id) => {
      result[id] = { ...device.attributes };
    });
    return result;
  }
  
  /**
   * Check if device state has meaningful changes
   */
  hasStateChanged(oldState, newState) {
    if (!oldState) return true;
    
    // Key attributes that matter for UI
    const significantFields = [
      'switch', 'level', 'hue', 'saturation', 'colorTemperature',
      'lock', 'contact', 'temperature', 'thermostatMode',
      'thermostatOperatingState', 'heatingSetpoint', 'coolingSetpoint',
      'thermostatFanMode', 'supportedThermostatFanModes', 'thermostatSetpoint',
      'power', 'application', 'transportStatus', 'groupState'
    ];
    
    return significantFields.some(field => {
      const oldVal = oldState[field];
      const newVal = newState[field];
      
      // Handle numeric comparisons with tolerance
      if (typeof oldVal === 'number' && typeof newVal === 'number') {
        return Math.abs(oldVal - newVal) > 0.5;
      }
      
      return oldVal !== newVal;
    });
  }
  
  // ========================================
  // Interaction Locking
  // ========================================
  
  /**
   * Lock a device during user interaction to prevent state conflicts
   */
  lockDevice(deviceId) {
    const id = String(deviceId);
    this.interactionLocks.set(id, Date.now());
    console.log(`🔒 Locked device ${id} during interaction`);
  }
  
  /**
   * Unlock a device after interaction completes
   */
  unlockDevice(deviceId) {
    const id = String(deviceId);
    this.interactionLocks.delete(id);
    console.log(`🔓 Unlocked device ${id}`);
    
    // Process any queued updates
    this.processQueuedUpdate(id);
  }
  
  /**
   * Check if device is currently locked
   */
  isLocked(deviceId) {
    const id = String(deviceId);
    const lockTime = this.interactionLocks.get(id);
    
    if (!lockTime) return false;
    
    // Auto-unlock after timeout
    if (Date.now() - lockTime > this.config.lockTimeout) {
      this.unlockDevice(id);
      return false;
    }
    
    return true;
  }
  
  /**
   * Queue update for when device is unlocked
   */
  queueUpdateWhenUnlocked(deviceId, attributes) {
    const id = String(deviceId);
    if (!this.updateQueue.has(id)) {
      this.updateQueue.set(id, []);
    }
    this.updateQueue.get(id).push({ attributes, timestamp: Date.now() });
  }
  
  /**
   * Process queued updates after unlock
   */
  processQueuedUpdate(deviceId) {
    const id = String(deviceId);
    const queue = this.updateQueue.get(id);
    
    if (!queue || queue.length === 0) return;
    
    // Get most recent update
    const latest = queue[queue.length - 1];
    this.updateQueue.delete(id);
    
    // Apply the update
    this.updateDevice(id, latest.attributes);
  }
  
  // ========================================
  // Debouncing & Batching
  // ========================================
  
  /**
   * Debounce rapid updates to prevent UI flicker
   */
  debounceUpdate(deviceId) {
    const id = String(deviceId);
    
    // Clear existing timeout
    const existing = this.updateQueue.get(`debounce_${id}`);
    if (existing) {
      clearTimeout(existing);
    }
    
    // Set new timeout
    const timeoutId = setTimeout(() => {
      const state = this.getDevice(id);
      this.notifyListeners(id, state);
      this.updateQueue.delete(`debounce_${id}`);
    }, this.config.debounceDelay);
    
    this.updateQueue.set(`debounce_${id}`, timeoutId);
  }
  
  // ========================================
  // Subscriptions & Notifications
  // ========================================
  
  /**
   * Subscribe to all state changes
   */
  subscribe(listener) {
    if (typeof listener !== 'function') return () => {};
    
    this.listeners.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }
  
  /**
   * Subscribe to specific device visual state changes
   */
  subscribeToDevice(deviceId, callback) {
    const id = String(deviceId);
    
    if (!this.visualSubscribers.has(id)) {
      this.visualSubscribers.set(id, new Set());
    }
    
    this.visualSubscribers.get(id).add(callback);
    
    // Return unsubscribe function
    return () => {
      const subscribers = this.visualSubscribers.get(id);
      if (subscribers) {
        subscribers.delete(callback);
        if (subscribers.size === 0) {
          this.visualSubscribers.delete(id);
        }
      }
    };
  }
  
  /**
   * Subscribe to music state changes
   */
  subscribeToMusic(callback) {
    if (typeof callback !== 'function') return () => {};
    
    // Add to music-specific listeners
    if (!this.musicListeners) {
      this.musicListeners = new Set();
    }
    
    this.musicListeners.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.musicListeners.delete(callback);
    };
  }
  
  /**
   * Notify all listeners of state change
   */
  notifyListeners(deviceId, attributes) {
    const id = String(deviceId);
    
    // Log individual light bulb notifications
    const deviceInfo = window.DEVICE_MAP?.[id];
    if (deviceInfo && deviceInfo.type === 'light') {
      console.log(`💡 State Manager: Notifying listeners for light bulb ${deviceInfo.label} (${id}):`, attributes);
    }
    
    // Notify global listeners
    this.listeners.forEach(listener => {
      try {
        listener(id, attributes);
      } catch (error) {
        console.error('Error in state listener:', error);
      }
    });
    
    // Notify device-specific visual subscribers
    const subscribers = this.visualSubscribers.get(id);
    if (subscribers) {
      subscribers.forEach(callback => {
        try {
          callback(attributes);
        } catch (error) {
          console.error(`Error in visual subscriber for device ${id}:`, error);
        }
      });
    }
  }
  
  /**
   * Notify music-specific listeners
   */
  notifyMusicListeners(musicState) {
    if (!this.musicListeners) return;
    
    this.musicListeners.forEach(callback => {
      try {
        callback(musicState);
      } catch (error) {
        console.error('Error in music listener:', error);
      }
    });
  }
  
  // ========================================
  // API Integration
  // ========================================
  
  /**
   * Refresh device state from API
   */
  async refreshDevice(deviceId) {
    const id = String(deviceId);
    
    try {
      if (!window.apiService) {
        console.warn('API service not available');
        return null;
      }
      
      const device = await window.apiService.getDevice(id);
      const attributes = this.normalizeAttributes(device.attributes);
      
      // Add timestamp
      attributes.timestamp = Date.now();
      
      // Update state
      this.updateDevice(id, attributes);
      
      return attributes;
    } catch (error) {
      console.error(`Failed to refresh device ${id}:`, error);
      throw error;
    }
  }
  
  /**
   * Normalize attributes from API response
   */
  normalizeAttributes(attributes) {
    if (!attributes) return {};
    
    // Handle array format from Hubitat
    if (Array.isArray(attributes)) {
      const normalized = {};
      attributes.forEach(attr => {
        if (attr.name && attr.currentValue !== undefined) {
          normalized[attr.name] = attr.currentValue;
        }
      });
      return normalized;
    }
    
    return { ...attributes };
  }
  
  // ========================================
  // Utility Methods
  // ========================================
  
  /**
   * Check if device is online (recently updated)
   */
  isDeviceOnline(deviceId, maxAge = null) {
    const id = String(deviceId);
    const device = this.devices.get(id);
    
    if (!device || !device.lastUpdated) return false;
    
    const age = maxAge || this.config.maxAge;
    return (Date.now() - device.lastUpdated) < age;
  }
  
  /**
   * Check if device state is stale
   */
  isStale(deviceId, maxAge = null) {
    const id = String(deviceId);
    const device = this.devices.get(id);
    
    if (!device) return true;
    
    const age = maxAge || this.config.staleThreshold;
    return (Date.now() - device.lastUpdated) > age;
  }
  
  /**
   * Get device summary for UI
   */
  getDeviceSummary(deviceId) {
    const attributes = this.getDevice(deviceId);
    
    if (!attributes || Object.keys(attributes).length === 0) return null;
    
    return {
      id: deviceId,
      isOn: attributes.switch === 'on' || attributes.groupState === 'allOn',
      level: parseInt(attributes.level) || 0,
      hue: parseInt(attributes.hue) || 0,
      saturation: parseInt(attributes.saturation) || 0,
      colorTemperature: parseInt(attributes.colorTemperature) || 3000,
      lock: attributes.lock,
      contact: attributes.contact,
      temperature: parseFloat(attributes.temperature) || 0,
      mode: attributes.thermostatMode,
      lastUpdated: this.devices.get(String(deviceId))?.lastUpdated
    };
  }
  
  /**
   * Bulk update multiple devices
   */
  updateMultipleDevices(deviceUpdates) {
    Object.entries(deviceUpdates).forEach(([deviceId, attributes]) => {
      this.updateDevice(deviceId, attributes);
    });
  }
  
  // ========================================
  // Visual State Management (from original state-manager.js)
  // ========================================
  
  /**
   * Initialize visual state subscriptions
   */
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
        
        // Also check window.currentOpenDeviceId for compatibility
        if (window.currentOpenDeviceId && String(window.currentOpenDeviceId) === idStr) {
          console.log(`State manager: Updating open device modal for ${deviceId}`);
          // The updateOpenDeviceModals function in ui.js will handle the actual update
        }
      } catch(e) {
        console.error('Visual state update failed', e);
      }
    });
  }

  /**
   * Update visual state for a specific device
   */
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
    if ('thermostatMode' in state || 'thermostatOperatingState' in state || 'coolingSetpoint' in state || 'heatingSetpoint' in state || 'thermostatFanMode' in state || 'temperature' in state) {
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
    const off = mode === 'off' || mode === '';
    
    btn.classList.toggle('heating', heat);
    btn.classList.toggle('cooling', cool);
    btn.classList.toggle('is-on', heat || cool);
    
    // Enhanced visual feedback based on mode and temperature
    let glow, strength = 0.55;
    if (heat) {
      glow = 'rgba(255,148,54,.92)';
      strength = 0.7;
    } else if (cool) {
      glow = 'rgba(86,175,255,.95)';
      strength = 0.7;
    } else if (off) {
      glow = 'rgba(180,180,180,.3)';
      strength = 0.3;
    } else {
      glow = 'rgba(180,180,180,.4)';
      strength = 0.4;
    }
    
    this._setGlow(btn, glow, strength);
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
  
  // ========================================
  // Music State Management
  // ========================================
  
  /**
   * Update music playing state
   */
  updateMusicState(isPlaying, trackInfo = null) {
    console.log('🎵 State Manager: Updating music state', { isPlaying, trackInfo });
    
    // Store the previous state for comparison
    const previousState = {
      isPlaying: this.musicPlaying,
      trackInfo: this.musicTrackInfo
    };
    
    this.musicPlaying = isPlaying;
    this.musicTrackInfo = trackInfo;
    
    // Check if this is a significant change
    const trackChanged = !previousState.trackInfo || !trackInfo || 
                        previousState.trackInfo.name !== trackInfo.name ||
                        previousState.trackInfo.artist !== trackInfo.artist;
    
    const playingStateChanged = previousState.isPlaying !== isPlaying;
    
    if (trackChanged) {
      console.log('🎵 State Manager: Track changed from', previousState.trackInfo?.name, 'to', trackInfo?.name);
    }
    
    if (playingStateChanged) {
      console.log('🎵 State Manager: Playing state changed from', previousState.isPlaying, 'to', isPlaying);
    }
    
    // Notify listeners about music state change
    const musicState = { 
      isPlaying, 
      trackInfo,
      timestamp: Date.now(),
      trackChanged,
      playingStateChanged
    };
    
    // Notify general listeners (with 'music' as deviceId)
    this.notifyListeners('music', musicState);
    
    // Notify music-specific listeners
    this.notifyMusicListeners(musicState);
  }
  
  /**
   * Get current music state
   */
  getMusicState() {
    return {
      isPlaying: this.musicPlaying,
      trackInfo: this.musicTrackInfo,
      hasTrack: !!this.musicTrackInfo,
      hasArtwork: !!(this.musicTrackInfo?.imageUrl),
      lastUpdated: this.musicTrackInfo ? Date.now() : null
    };
  }
  
  /**
   * Check if music is currently playing
   */
  isMusicPlaying() {
    return this.musicPlaying;
  }

  /**
   * Handle WebSocket messages (including Spotify state changes)
   */
  handleWebSocketMessage(message) {
    try {
      const data = JSON.parse(message);
      
      switch (data.type) {
        case 'spotify_state_change':
          console.log('🎵 State Manager: Received Spotify state change via WebSocket', data.data);
          this.updateMusicState(data.data.isPlaying, data.data.trackInfo);
          break;
          
        case 'device_state_change':
          // Handle device state changes from Hubitat/Home Assistant
          console.log('📱 State Manager: Received device state change via WebSocket', data.data);
          this.updateDeviceState(data.data.deviceId, data.data.attributes);
          break;
          
        default:
          console.log('📡 State Manager: Unknown WebSocket message type:', data.type);
      }
    } catch (error) {
      console.error('❌ State Manager: Error parsing WebSocket message:', error);
    }
  }

  // ========================================
  // Cleanup
  // ========================================
  
  /**
   * Clear all state
   */
  clear() {
    this.devices.clear();
    this.pendingCommands.clear();
    this.interactionLocks.clear();
    this.updateQueue.clear();
    this.lastEventTs.clear();
    this.visualSubscribers.clear();
  }
  
  /**
   * Cleanup resources
   */
  destroy() {
    this.clear();
    this.listeners.clear();
    
    // Clear any pending timeouts
    this.updateQueue.forEach(timeout => {
      if (typeof timeout === 'number') {
        clearTimeout(timeout);
      }
    });
    
    // Unsubscribe visual state listener
    try { 
      this._unsubscribe?.(); 
    } catch {}
    this._unsubscribe = null;
    this._visualSubscribed = false;
  }
}

// Create singleton instance
const unifiedStateManager = new UnifiedStateManager();

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = unifiedStateManager;
}

// Make available globally
if (typeof window !== 'undefined') {
  window.deviceStateManager = unifiedStateManager;
  window.unifiedStateManager = unifiedStateManager;
}

// Initialize visual state when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  if (window.deviceStateManager) {
    window.deviceStateManager.initVisualStateSubscriptions();
  }
});

// Also initialize immediately if DOM is already ready
if (document.readyState !== 'loading') {
  if (window.deviceStateManager) {
    window.deviceStateManager.initVisualStateSubscriptions();
  }
}









