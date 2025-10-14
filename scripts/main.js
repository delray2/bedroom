// Configuration is now loaded from scripts/config.js
// Maintain backward compatibility with existing code patterns
const BEDROOM_GROUP_ID = window.CONFIG.DEVICES.BEDROOM_GROUP;
const BEDROOM_FAN2_ID = window.CONFIG.DEVICES.BEDROOM_FAN_2;
const MAKER_API_BASE = window.CONFIG.HUBITAT.BASE_URL;
const ACCESS_TOKEN = window.CONFIG.HUBITAT.ACCESS_TOKEN;
const BEDROOM_GROUP_COMMAND_URL = (cmd) => window.CONFIG.HUBITAT.deviceCommandUrl(BEDROOM_GROUP_ID, cmd);
const BEDROOM_FAN2_STATUS_URL = window.CONFIG.HUBITAT.deviceStatusUrl(BEDROOM_FAN2_ID);

// Centralized device map with all relevant device IDs
const DEVICE_MAP = {
  // Main control devices
  [BEDROOM_GROUP_ID]: { // BedroomLifxGOG - Main paddle switch controls this
    label: 'Bedroom Lights',
    type: 'group',
    controls: ['paddleSwitch', 'globalControls']
  },
  
  // Bedroom lights
  '451': { // Bedroom Fan 2
    label: 'Bedroom Fan 2',
    type: 'light',
    controls: ['deviceModal', 'scenes']
  },
  '447': { // Bed Lamp
    label: 'Bed Lamp',
    type: 'light',
    controls: ['deviceModal', 'scenes']
  },
  '450': { // Laundry 1
    label: 'Laundry 1',
    type: 'light',
    controls: ['deviceModal', 'scenes']
  },
  '480': { // Bedroom Fan 1
    label: 'Bedroom Fan 1',
    type: 'light',
    controls: ['deviceModal', 'scenes']
  },
  
  // Other lights
  '449': { // Fan 1
    label: 'Fan 1',
    type: 'light',
    controls: ['deviceModal', 'scenes']
  },
  '452': { // Table
    label: 'Table',
    type: 'light',
    controls: ['deviceModal']
  },
  '476': { // Lifx Beam
    label: 'Lifx Beam',
    type: 'light',
    controls: ['deviceModal']
  },
  '438': { // Oven
    label: 'Oven',
    type: 'light',
    controls: ['deviceModal']
  },
  '439': { // Kitchen
    label: 'Kitchen',
    type: 'light',
    controls: ['deviceModal']
  },
  '440': { // Kitchen 2
    label: 'Kitchen 2',
    type: 'light',
    controls: ['deviceModal']
  },
  '443': { // Patio
    label: 'Patio',
    type: 'light',
    controls: ['deviceModal']
  },
  '446': { // Fan 2
    label: 'Fan 2',
    type: 'light',
    controls: ['deviceModal']
  },
  
  // Groups
  '453': { // LRGroup
    label: 'LRGroup',
    type: 'group',
    controls: ['globalControls']
  },
  
  // TVs and HDMI
  '473': { // Bedroom TV
    label: 'Bedroom TV',
    type: 'tv',
    controls: ['tvModal']
  },
  '474': { // 50" Philips Roku TV
    label: '50" Philips Roku TV',
    type: 'tv',
    controls: ['tvModal']
  },
  '527': { // HDMI 1
    label: 'HDMI 1',
    type: 'hdmi',
    controls: ['tvModal']
  },
  '528': { // HDMI 2
    label: 'HDMI 2',
    type: 'hdmi',
    controls: ['tvModal']
  },
  '529': { // HDMI 3
    label: 'HDMI 3',
    type: 'hdmi',
    controls: ['tvModal']
  },
  
  // Security and access
  '509': { // Front Door Lock
    label: 'Front Door Lock',
    type: 'lock',
    controls: ['lockIndicator']
  },
  
  // Thermostat
  '86': { // Entryway Thermostat
    label: 'Entryway Thermostat',
    type: 'thermostat',
    controls: ['thermostatModal']
  },
  
  // Other devices
  '229': { // Broadlink Remote
    label: 'Broadlink',
    type: 'remote',
    controls: ['remoteModal']
  },
  '305': { // Fire TV Power Button
    label: 'FIRETVPOWERBUTTON',
    type: 'button',
    controls: ['buttonModal']
  },
  '531': { // Blackout Switch
    label: 'Blackout Switch',
    type: 'virtual',
    controls: ['virtualModal']
  },
  '532': { // Fire Power Switch
    label: 'Fire Power Switch',
    type: 'virtual',
    controls: ['virtualModal']
  }
};

// Make important constants available to other scripts (including ES modules)
window.MAKER_API_BASE = MAKER_API_BASE;
window.ACCESS_TOKEN = ACCESS_TOKEN;
window.BEDROOM_GROUP_ID = BEDROOM_GROUP_ID; // Keep compatibility with existing code
window.DEVICE_MAP = DEVICE_MAP; // Make device map globally available

// Bedroom device definitions with correct IDs from devicesfulldetails.json
const bedroomDevices = {
  '447': {
    label: 'Bed Lamp',
    id: '447',
    capabilities: ["Configuration","Actuator","Refresh","ColorTemperature","Polling","ColorMode","ColorControl","SignalStrength","ChangeLevel","SwitchLevel","Light","Switch"],
    attributes: ["switch","level","colorTemperature","colorMode","colorName","hue","saturation","color"],
    commands: ["on","off","setLevel","setColorTemperature","setColor","setHue","setSaturation","refresh"]
  },
  '450': {
    label: 'Laundry 1',
    id: '450',
    capabilities: ["Configuration","Actuator","Refresh","ColorTemperature","Polling","ColorMode","ColorControl","SignalStrength","ChangeLevel","SwitchLevel","Light","Switch"],
    attributes: ["switch","level","colorTemperature","colorMode","colorName","hue","saturation","color"],
    commands: ["on","off","setLevel","setColorTemperature","setColor","setHue","setSaturation","refresh"]
  },
  '480': {
    label: 'Bedroom Fan 1',
    id: '480',
    capabilities: ["Configuration","Actuator","Refresh","ColorTemperature","Polling","ColorMode","ColorControl","SignalStrength","ChangeLevel","SwitchLevel","Light","Switch"],
    attributes: ["switch","level","colorTemperature","colorMode","colorName","hue","saturation","color"],
    commands: ["on","off","setLevel","setColorTemperature","setColor","setHue","setSaturation","refresh"]
  },
  '451': {
    label: 'Bedroom Fan 2',
    id: '451',
    capabilities: ["Configuration","Actuator","Refresh","ColorTemperature","Polling","ColorMode","ColorControl","SignalStrength","ChangeLevel","SwitchLevel","Light","Switch"],
    attributes: ["switch","level","colorTemperature","colorMode","colorName","hue","saturation","color"],
    commands: ["on","off","setLevel","setColorTemperature","setColor","setHue","setSaturation","refresh"]
  },
  '457': {
    label: 'Bedroom Lights',
    id: '457',
    capabilities: ["Actuator","ColorTemperature","ColorMode","ColorControl","ChangeLevel","SwitchLevel","Light","Switch"],
    attributes: ["switch","level","colorTemperature","colorMode","colorName","hue","saturation","color","groupState"],
    commands: ["on","off","setLevel","setColorTemperature","setColor","setHue","setSaturation","startLevelChange","stopLevelChange"]
  }
};

// Keep compatibility with existing code
const livingRoomDevices = bedroomDevices;

// Clock functionality
function updateClock() {
  const now = new Date();
  const dateElement = document.getElementById('currentDate');
  const timeElement = document.getElementById('currentTime');
  
  if (dateElement && timeElement) {
    // Format date: "Wednesday, September 5th, 2024"
    const dateOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    const dateStr = now.toLocaleDateString('en-US', dateOptions);
    
    // Format time: "3:43 PM"
    const timeOptions = { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    };
    const timeStr = now.toLocaleTimeString('en-US', timeOptions);
    
    dateElement.textContent = dateStr;
    timeElement.textContent = timeStr;
  }
}

// Update clock every second
setInterval(updateClock, 1000);
updateClock(); // Initial update

// Register service worker for offline capability (only if not running from file://)
if ('serviceWorker' in navigator && window.location.protocol !== 'file:') {
  navigator.serviceWorker.register('/sw.js')
    .then(registration => console.log('SW registered:', registration))
    .catch(error => console.log('SW registration failed:', error));
} else if (window.location.protocol === 'file:') {
  console.log('Service Worker registration skipped - running from file:// protocol');
}

// Initialize state manager and load initial device states
async function initializeDeviceStates() {
  if (!window.deviceStateManager) {
    console.warn('State manager not available');
    return;
  }

  try {
    // Load initial states for key devices
    const keyDevices = [
      CONFIG.DEVICES.BEDROOM_FAN_2,
      CONFIG.DEVICES.FRONT_DOOR_LOCK,
      CONFIG.DEVICES.BEDROOM_GROUP,
      CONFIG.DEVICES.BED_LAMP,
      CONFIG.DEVICES.LAUNDRY_1,
      CONFIG.DEVICES.BEDROOM_FAN_1,
      CONFIG.DEVICES.ENTRYWAY_THERMOSTAT,
      CONFIG.DEVICES.BEDROOM_TV,
      CONFIG.DEVICES.ROKU_TV_50
    ]; // Key devices for initial state loading
    
    console.log('Loading initial device states...');
    
    for (const deviceId of keyDevices) {
      try {
        await window.deviceStateManager.refreshDevice(deviceId);
        console.log(`Loaded state for device ${deviceId}`);
      } catch (error) {
        console.error(`Failed to load state for device ${deviceId}:`, error);
      }
    }
    
    console.log('Initial device states loaded');
  } catch (error) {
    console.error('Failed to initialize device states:', error);
  }
}

// Update paddle switch based on BedroomLifxGOG group state (only called on initial load and external state changes)
function updatePaddleSwitchFromState() {
  if (!window.deviceStateManager) return;
  
  const bedroomLightsState = window.deviceStateManager.getDevice(BEDROOM_GROUP_ID);
  if (bedroomLightsState && bedroomLightsState.switch !== undefined) {
    updatePaddleSwitchUI(bedroomLightsState.switch === 'on');
  }
}

// Initialize the dashboard
async function initializeDashboard() {
  try {
    console.log('Initializing dashboard...');
    
    // Initialize state manager
    if (window.deviceStateManager) {
      window.deviceStateManager.subscribe(handleDeviceStateUpdate);
    }
    
    // Initial state refresh for key devices
    const [bedroomGroup, rokuTv, bedroomTv] = await Promise.all([
      window.apiService.getDevice(CONFIG.DEVICES.BEDROOM_GROUP),
      window.apiService.getDevice(CONFIG.DEVICES.ROKU_TV_50),
      window.apiService.getDevice(CONFIG.DEVICES.BEDROOM_TV)
    ]);
    
    // Update state manager with the fetched data
    if (window.deviceStateManager) {
      if (bedroomGroup && bedroomGroup.attributes) {
        const attrs = window.deviceStateManager.normalizeAttributes(bedroomGroup.attributes);
        window.deviceStateManager.updateDevice(CONFIG.DEVICES.BEDROOM_GROUP, attrs);
      }
      if (rokuTv && rokuTv.attributes) {
        const attrs = window.deviceStateManager.normalizeAttributes(rokuTv.attributes);
        window.deviceStateManager.updateDevice(CONFIG.DEVICES.ROKU_TV_50, attrs);
      }
      if (bedroomTv && bedroomTv.attributes) {
        const attrs = window.deviceStateManager.normalizeAttributes(bedroomTv.attributes);
        window.deviceStateManager.updateDevice(CONFIG.DEVICES.BEDROOM_TV, attrs);
      }
    }
    
    // Update paddle switch based on BedroomLifxGOG group state (only called on initial load and external state changes)
    updatePaddleSwitchFromState();
    
    // Update paddle switch 2 based on overall device states
    updatePaddleSwitch2UI();
    
    console.log('Dashboard initialized successfully');
  } catch (error) {
    console.error('Failed to initialize dashboard:', error);
  }
}

// Notify backend on load (optional)
window.addEventListener('DOMContentLoaded', function() {
  try {
    fetch(window.CONFIG.BACKEND.notifyUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'dashboard_loaded', timestamp: Date.now() })
    }).catch((error) => {
      // Silently ignore backend notification failures - backend may not be running
      console.log('Backend notification failed (backend may not be running):', error.message);
    });
  } catch (error) {
    console.log('Backend notification skipped:', error.message);
  }

  // Initialize device states when state manager is ready
  if (window.deviceStateManager) {
    initializeDeviceStates().then(() => {
      updatePaddleSwitchFromState();
    });
  } else {
    // Fallback to direct API call if state manager isn't ready
    const BEDROOM_GROUP_STATUS_URL = window.CONFIG.HUBITAT.deviceStatusUrl(CONFIG.DEVICES.BEDROOM_GROUP);
    fetch(BEDROOM_GROUP_STATUS_URL)
      .then(res => res.json())
      .then(device => {
        const attrs = device.attributes || {};
        const val = Array.isArray(attrs) ? (attrs.find(a=>a.name==='groupState')?.currentValue) : attrs.groupState;
        const isOn = val === 'allOn' || val === 'on';
        // Update UI and state based on fetched value
        if (typeof updatePaddleSwitchUI === 'function') {
          updatePaddleSwitchUI(isOn);
        }
        if (window.deviceStateManager) {
          window.deviceStateManager.updateDevice(CONFIG.DEVICES.BEDROOM_GROUP, { switch: isOn ? 'on' : 'off' });
        }
      })
      .catch(err => {
        console.error('Could not fetch BedroomLifxGOG state:', err);
      });
  }

  // Initial fetch of lock status indicator
  if (typeof refreshLockIndicator === 'function') {
    refreshLockIndicator();
  }
});

const paddleSwitch = document.getElementById('paddleSwitch');

// Update paddle switch UI based on device state
function updatePaddleSwitchUI(isOn) {
  if (!window.paddleSwitch1) return;
  
  const level = isOn ? 1 : 0;
  window.paddleSwitch1.setLevel(level);
}

// Send toggle command to Hubitat (separated from UI updates)
function sendToggleCommand(newState) {
  console.log('Sending toggle command to BedroomLifxGOG:', newState ? 'on' : 'off');
  
  fetch(BEDROOM_GROUP_COMMAND_URL(newState ? 'on' : 'off'))
    .then(res => res.json())
    .then(data => {
      console.log('BedroomLifxGOG command response:', data);
      // Command successful - UI already shows correct state
    })
    .catch(err => {
      console.error('Could not send BedroomLifxGOG command:', err);
      // Revert UI state on error
      updatePaddleSwitchUI(!newState);
      if (window.showToast) {
        showToast('Failed to send command', 'error');
      }
    });
}

// Make functions globally available for webhook updates
window.updatePaddleSwitchUI = updatePaddleSwitchUI;
window.sendToggleCommand = sendToggleCommand;

// Function to update paddle switch 2 UI based on overall device states
// OPTIMIZED: Uses state manager cache instead of making 3 API calls
async function updatePaddleSwitch2UI() {
  if (!window.paddleSwitch2) return;
  
  try {
    // First try to use cached state from state manager
    const bedroomLightsState = window.deviceStateManager?.getDevice(CONFIG.DEVICES.BEDROOM_GROUP);
    const bedroomTvState = window.deviceStateManager?.getDevice(CONFIG.DEVICES.BEDROOM_TV);
    
    // For Fire TV we still need Home Assistant but can debounce
    let fireTvState = null;
    try {
      const response = await fetch(window.CONFIG.HOME_ASSISTANT.stateUrl(CONFIG.HOME_ASSISTANT.ENTITIES.FIRE_TV), {
        method: 'GET',
        headers: window.CONFIG.HOME_ASSISTANT.getHeaders()
      });
      
      if (response.ok) {
        fireTvState = await response.json();
      }
    } catch (error) {
      console.warn('Could not check Fire TV state for UI update:', error);
      fireTvState = { state: 'off' };
    }
    
    // Determine current states
    const lightsOn = bedroomLightsState?.switch === 'on';
    const bedroomTvOn = bedroomTvState?.switch === 'on';
    const fireTvOn = fireTvState?.state === 'on';
    
    // If all devices are on, show paddle switch 2 as on
    const allDevicesOn = lightsOn && bedroomTvOn && fireTvOn;
    
    const level = allDevicesOn ? 1 : 0;
    window.paddleSwitch2.setLevel(level);
    
    console.log('Updated paddle switch 2 UI - all devices on:', allDevicesOn);
    
  } catch (error) {
    console.error('Failed to update paddle switch 2 UI:', error);
  }
}

// Make the function globally available
window.updatePaddleSwitch2UI = updatePaddleSwitch2UI;

// Handle "All" paddle switch functionality
async function handleAllPaddleSwitchToggle() {
  console.log('All paddle switch clicked - checking device states...');
  
  try {
    // Use cached state from state manager (avoids API calls for Hubitat devices)
    const bedroomLightsState = window.deviceStateManager?.getDevice(CONFIG.DEVICES.BEDROOM_GROUP);
    const bedroomTvState = window.deviceStateManager?.getDevice(CONFIG.DEVICES.BEDROOM_TV);
    
    // Check Fire TV state via Home Assistant (only one that needs external API)
    let fireTvState = null;
    try {
      const response = await fetch(window.CONFIG.HOME_ASSISTANT.stateUrl(CONFIG.HOME_ASSISTANT.ENTITIES.FIRE_TV), {
        method: 'GET',
        headers: window.CONFIG.HOME_ASSISTANT.getHeaders()
      });
      
      if (response.ok) {
        fireTvState = await response.json();
      }
    } catch (error) {
      console.warn('Could not check Fire TV state:', error);
      fireTvState = { state: 'off' };
    }
    
    // Determine current states
    const lightsOn = bedroomLightsState?.switch === 'on';
    const bedroomTvOn = bedroomTvState?.switch === 'on';
    const fireTvOn = fireTvState?.state === 'on';
    
    console.log('Current device states:', {
      lights: lightsOn ? 'on' : 'off',
      bedroomTv: bedroomTvOn ? 'on' : 'off',
      fireTv: fireTvOn ? 'on' : 'off'
    });
    
    // Check if any device is currently off
    const anyDeviceOff = !lightsOn || !bedroomTvOn || !fireTvOn;
    
    if (anyDeviceOff) {
      // At least one device is off, so turn everything on
      console.log('Turning all devices ON');
      
      // Turn on bedroom lights
      await window.apiService.sendDeviceCommand(CONFIG.DEVICES.BEDROOM_GROUP, 'on');
      
      // Turn on bedroom TV
      await window.apiService.sendDeviceCommand(CONFIG.DEVICES.BEDROOM_TV, 'on');
      
      // Turn on Fire TV via Home Assistant
      try {
        await fetch(window.CONFIG.HOME_ASSISTANT.serviceUrl('media_player', 'turn_on'), {
          method: 'POST',
          headers: window.CONFIG.HOME_ASSISTANT.getHeaders(),
          body: JSON.stringify({
            entity_id: window.CONFIG.HOME_ASSISTANT.ENTITIES.FIRE_TV
          })
        });
      } catch (error) {
        console.warn('Failed to turn on Fire TV:', error);
      }
      
      showToast('All devices turned ON', 'success');
    } else {
      // All devices are on, so turn everything off
      console.log('Turning all devices OFF');
      
      // Turn off bedroom lights
      await window.apiService.sendDeviceCommand(CONFIG.DEVICES.BEDROOM_GROUP, 'off');
      
      // Turn off bedroom TV
      await window.apiService.sendDeviceCommand(CONFIG.DEVICES.BEDROOM_TV, 'off');
      
      // Turn off Fire TV via Home Assistant
      try {
        await fetch(window.CONFIG.HOME_ASSISTANT.serviceUrl('androidtv', 'adb_command'), {
          method: 'POST',
          headers: window.CONFIG.HOME_ASSISTANT.getHeaders(),
          body: JSON.stringify({
            entity_id: window.CONFIG.HOME_ASSISTANT.ENTITIES.FIRE_TV,
            command: 'POWER'
          })
        });
      } catch (error) {
        console.warn('Failed to turn off Fire TV:', error);
      }
      
      showToast('All devices turned OFF', 'success');
    }
    
    // Update UI after a short delay to allow for state changes
    setTimeout(() => {
      updatePaddleSwitch2UI();
    }, 1000);
    
  } catch (error) {
    console.error('Failed to handle all paddle switch toggle:', error);
    showToast('Failed to check device states', 'error');
  }
}

// Make the function globally available
window.handleAllPaddleSwitchToggle = handleAllPaddleSwitchToggle;

// Add rate limiting to prevent excessive updates
let lastUpdateTimestamp = 0;
const RATE_LIMIT_INTERVAL = window.CONFIG.TIMING.RATE_LIMIT_INTERVAL;

// Centralized function to handle device state updates from webhooks
function handleDeviceStateUpdate(deviceId, attributes) {
  const now = Date.now();
  if (now - lastUpdateTimestamp < RATE_LIMIT_INTERVAL) {
    console.log('Rate limit exceeded, skipping update for', deviceId);
    return;
  }
  lastUpdateTimestamp = now;
  console.log(`Device state update received for ${deviceId}:`, attributes);
  
  // Update state manager
  if (window.deviceStateManager) {
    console.log('Updating state manager for device:', deviceId);
    window.deviceStateManager.updateDevice(deviceId, attributes);
    
    // Log if this is an individual light bulb
    const deviceInfo = DEVICE_MAP[deviceId];
    if (deviceInfo && deviceInfo.type === 'light') {
      console.log(`💡 Individual light bulb update: ${deviceInfo.label} (${deviceId})`, attributes);
    }
  }
  
  // Handle specific device updates based on device map
  const deviceInfo = DEVICE_MAP[deviceId];
  if (deviceInfo) {
    console.log(`Updating UI for ${deviceInfo.label} (${deviceId})`);

  // Update paddle switch if this is BedroomLifxGOG (support both groupState and switch)
  if (deviceId === BEDROOM_GROUP_ID && (attributes.groupState !== undefined || attributes.switch !== undefined)) {
    const hasGroup = attributes.groupState !== undefined;
    const isOn = hasGroup ? (attributes.groupState === 'allOn' || attributes.groupState === 'on') : (attributes.switch === 'on');
    console.log('Updating paddle switch for BedroomLifxGOG. isOn =', isOn, 'attributes =', attributes);
    if (typeof window.updatePaddleSwitchUI === 'function') {
      window.updatePaddleSwitchUI(isOn);
    }
  }

  // Update paddle switch 2 if this is a device it controls
  if ((deviceId === CONFIG.DEVICES.BEDROOM_GROUP || deviceId === CONFIG.DEVICES.BEDROOM_TV) && attributes.switch !== undefined) {
    // Check if we should update paddle switch 2 based on overall state
    if (typeof window.updatePaddleSwitch2UI === 'function') {
      window.updatePaddleSwitch2UI();
    }
  }
  
  // Update lock indicator if this is the front door lock
  if (deviceId === CONFIG.DEVICES.FRONT_DOOR_LOCK && attributes.lock !== undefined) {
    console.log('Updating lock indicator for Front Door Lock:', attributes.lock);
    if (typeof window.setLockIndicator === 'function') {
      window.setLockIndicator(attributes.lock);
    }
  }
  
  // Update global controls if they're open and this is a group device
  if (deviceInfo.type === 'group' && window.updateGlobalControls) {
    console.log('Updating global controls for group device:', deviceId);
    window.updateGlobalControls(deviceId, attributes);
  }
  
  // Update device modals if they're open
  if (window.updateOpenDeviceModals) {
    console.log('Updating open device modals for device:', deviceId);
    window.updateOpenDeviceModals(deviceId, attributes);
  }
  
  // Update specific modal types based on device type
  if (deviceInfo.type === 'tv' && window.updateTvModal) {
    console.log('Updating TV modal for device:', deviceId);
    window.updateTvModal(deviceId, attributes);
  }
  
  if (deviceInfo.type === 'thermostat' && deviceId === CONFIG.DEVICES.ENTRYWAY_THERMOSTAT && window.uiManager && typeof window.uiManager.isThermostatModalVisible === 'function') {
    if (window.uiManager.isThermostatModalVisible()) {
      console.log('Thermostat visible; re-rendering from state without extra fetch:', deviceId);
      const dev = { attributes: (window.deviceStateManager && window.deviceStateManager.getDevice(deviceId)) || {} };
      if (typeof window.uiManager.renderThermostat === 'function') {
        window.uiManager.renderThermostat(dev);
      }
    }
  }
  
  // Update scenes if this is a light device and scenes are open
  if (deviceInfo.type === 'light' && deviceInfo.controls.includes('scenes') && window.updateScenesModal) {
    console.log('Updating scenes modal for light device:', deviceId);
    window.updateScenesModal(deviceId, attributes);
  }
}
}// Make the handler globally available for webhook updates
window.handleDeviceStateUpdate = handleDeviceStateUpdate; 