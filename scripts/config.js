/**
 * Centralized Configuration for Hubitat Dashboard
 * Single source of truth for all constants, endpoints, and timing values
 */

(function() {
  'use strict';

  const CONFIG = {
    // ========================================
    // Hubitat Maker API Configuration
    // ========================================
    HUBITAT: {
      BASE_URL: 'http://192.168.4.44/apps/api/37',
      ACCESS_TOKEN: 'b9846a66-8bf8-457a-8353-fd16d511a0af',
      
      // Helper to build device command URL
      deviceCommandUrl: function(deviceId, command, value = null) {
        let url = `${this.BASE_URL}/devices/${deviceId}/${command}`;
        if (value !== null && value !== undefined) {
          url += `/${value}`;
        }
        url += `?access_token=${this.ACCESS_TOKEN}`;
        return url;
      },
      
      // Helper to build device status URL
      deviceStatusUrl: function(deviceId) {
        return `${this.BASE_URL}/devices/${deviceId}?access_token=${this.ACCESS_TOKEN}`;
      }
    },
    
    // ========================================
    // Home Assistant Configuration
    // ========================================
    HOME_ASSISTANT: {
      BASE_URL: 'http://192.168.4.145:8123',
      ACCESS_TOKEN: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJhNzU0MDhhNTYxYmQ0NTVjOTA3NTFmZDg0OTQ2MzMzOCIsImlhdCI6MTc1NTE5OTg1NywiZXhwIjoyMDcwNTU5ODU3fQ.NMPxvnz0asFM66pm7LEH80BIGR9dU8pj6IZEX5v3WB4',
      
      ENTITIES: {
        FIRE_TV: 'media_player.fire_tv_192_168_4_54',
        LIFX_BEAM: 'light.beam',
        LIFX_BEAM_THEME: 'select.beam_theme'
      },
      
      // Helper to build service call URL
      serviceUrl: function(domain, service) {
        return `${this.BASE_URL}/api/services/${domain}/${service}`;
      },
      
      // Helper to build state URL
      stateUrl: function(entityId) {
        return `${this.BASE_URL}/api/states/${entityId}`;
      },
      
      // Helper to get auth headers
      getHeaders: function() {
        return {
          'Authorization': `Bearer ${this.ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        };
      }
    },
    
    // ========================================
    // Go2RTC (Camera Streaming)
    // ========================================
    GO2RTC: {
      BASE_URL: 'http://192.168.4.145:1984',
      CAMERA_NAME: 'reolink'
    },
    
    // ========================================
    // WLED Device Configuration
    // ========================================
    WLED: {
      BEDROOM_1: '192.168.4.137',
      BEDROOM_2: '192.168.4.52',
      
      // Helper to build WLED command URL
      commandUrl: function(deviceIp, params) {
        return `http://${deviceIp}/win&${params}`;
      }
    },
    
    // ========================================
    // Spotify Web Player Configuration
    // ========================================
    SPOTIFY: {
      PORT: 8081,
      
      // Helper to build Spotify iframe URL (uses dynamic IP)
      iframeUrl: function() {
        const ip = window.ipDetection?.getCurrentIP() || '192.168.4.203';
        return `https://${ip}:${this.PORT}`;
      },
      
      // Get base URL with dynamic IP
      getBaseUrl: function() {
        const ip = window.ipDetection?.getCurrentIP() || '192.168.4.203';
        return `https://${ip}:${this.PORT}`;
      }
    },
    
    // ========================================
    // Device IDs
    // ========================================
    DEVICES: {
      // Main Groups
      BEDROOM_GROUP: '457',        // BedroomLifxGOG - Main paddle switch
      LIVING_ROOM_GROUP: '453',    // LRGroup
      
      // Lights - Bedroom
      BEDROOM_FAN_1: '480',
      BEDROOM_FAN_2: '451',
      BED_LAMP: '447',
      LAUNDRY_1: '450',
      
      // Lights - Other
      FAN_1: '449',
      FAN_2: '446',
      TABLE: '452',
      LIFX_BEAM: '476',
      OVEN: '438',
      KITCHEN: '439',
      KITCHEN_2: '440',
      PATIO: '443',
      
      // TVs and HDMI
      BEDROOM_TV: '473',           // Roku TV (94E742)
      ROKU_TV_50: '474',           // 50" Philips Roku TV
      HDMI_1: '527',
      HDMI_2: '528',
      HDMI_3: '529',
      
      // Security
      FRONT_DOOR_LOCK: '509',
      
      // Climate
      ENTRYWAY_THERMOSTAT: '86',
      
      // Virtual/Other
      BROADLINK_REMOTE: '229',
      FIRE_TV_POWER_BUTTON: '305',
      BLACKOUT_SWITCH: '531',
      FIRE_POWER_SWITCH: '532'
    },
    
    // ========================================
    // Animation Timing Constants
    // ========================================
    TIMING: {
      // Animation durations
      FAST: 150,
      NORMAL: 200,
      SLOW: 300,
      
      // Easing functions
      EASING: {
        FAST: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
        NORMAL: 'cubic-bezier(0.4, 0.0, 0.6, 1)',
        SMOOTH: 'cubic-bezier(0.4, 0.0, 0.6, 1)',
        BOUNCE: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
      },
      
      // State manager timing
      STATE_UPDATE_DEBOUNCE: 100,
      STATE_MAX_AGE: 300000,          // 5 minutes
      STATE_STALE_THRESHOLD: 15000,   // 15 seconds
      
      // UI interaction timing
      PADDLE_LONG_PRESS: 320,
      PADDLE_DEBOUNCE: 150,
      SLIDER_DEBOUNCE: 500,
      MODAL_TIMEOUT: 30000,           // 30 seconds
      INACTIVITY_DELAY: 120000,       // 2 minutes (side buttons fade)
      
      // Rate limiting
      RATE_LIMIT_INTERVAL: 1000       // 1 second
    },
    
    // ========================================
    // UI Thresholds
    // ========================================
    THRESHOLDS: {
      // Significant change thresholds (avoid micro-adjustments)
      LEVEL_CHANGE: 2,              // 2% for brightness
      HUE_CHANGE: 3,                // 3 for hue (0-100 scale)
      SATURATION_CHANGE: 2,         // 2% for saturation
      TEMP_CHANGE: 50,              // 50K for color temperature
      
      // Numeric comparison tolerance
      NUMERIC_TOLERANCE: 0.5
    },
    
    // ========================================
    // Backend Server Configuration
    // ========================================
    BACKEND: {
      API_PORT: 4711,
      WEBSOCKET_PORT: 4712,
      
      // Helper URLs (uses dynamic IP detection)
      notifyUrl: function() {
        const ip = window.ipDetection?.getCurrentIP() || '192.168.4.203';
        return `https://${ip}:${this.API_PORT}/api/notify`;
      },
      
      websocketUrl: function() {
        const ip = window.ipDetection?.getCurrentIP() || '192.168.4.203';
        return `ws://${ip}:${this.WEBSOCKET_PORT}`;
      },
      
      // Authentication URLs for Spotify
      getAuthUrls: function() {
        const ip = window.ipDetection?.getCurrentIP() || '192.168.4.203';
        return {
          login: `https://${ip}:${this.API_PORT}/auth/login`,
          callback: `https://${ip}:${this.API_PORT}/oauth/callback`,
          token: `https://${ip}:${this.API_PORT}/auth/token`,
          base: `https://${ip}:${this.API_PORT}`
        };
      }
    },
    
    // ========================================
    // Feature Flags & Settings
    // ========================================
    FEATURES: {
      ENABLE_OPTIMISTIC_UPDATES: true,
      ENABLE_VISUAL_STATE: true,
      ENABLE_HAPTIC_FEEDBACK: false,   // No haptic on 7" touchscreen
      ENABLE_SERVICE_WORKER: true
    },
    
    // ========================================
    // Helper Methods
    // ========================================
    
    /**
     * Get device ID by name
     */
    getDeviceId: function(name) {
      return this.DEVICES[name];
    },
    
    /**
     * Get timing value in milliseconds
     */
    getTiming: function(name) {
      return this.TIMING[name];
    },
    
    /**
     * Get threshold value
     */
    getThreshold: function(name) {
      return this.THRESHOLDS[name];
    }
  };
  
  // ========================================
  // Export Configuration
  // ========================================
  
  // Make globally available
  window.CONFIG = CONFIG;
  
  // Backward compatibility - maintain legacy global constants
  window.MAKER_API_BASE = CONFIG.HUBITAT.BASE_URL;
  window.ACCESS_TOKEN = CONFIG.HUBITAT.ACCESS_TOKEN;
  window.BEDROOM_GROUP_ID = CONFIG.DEVICES.BEDROOM_GROUP;
  window.BEDROOM_FAN2_ID = CONFIG.DEVICES.BEDROOM_FAN_2;
  window.TIMING = CONFIG.TIMING;
  
  console.log('✓ Configuration loaded');
  
})();