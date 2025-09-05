// Hubitat API details
const BEDROOM_GROUP_ID = '457'; // BedroomLifxGOG group (ID: 457)
const BEDROOM_FAN2_ID = '451'; // Bedroom fan2 (ID: 451)
const MAKER_API_BASE = 'http://192.168.4.44/apps/api/37';
const ACCESS_TOKEN = 'b9846a66-8bf8-457a-8353-fd16d511a0af';
const BEDROOM_GROUP_COMMAND_URL = (cmd) => `${MAKER_API_BASE}/devices/${BEDROOM_GROUP_ID}/${cmd}?access_token=${ACCESS_TOKEN}`;
const BEDROOM_FAN2_STATUS_URL = `${MAKER_API_BASE}/devices/${BEDROOM_FAN2_ID}?access_token=${ACCESS_TOKEN}`;

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
  '480': { // Bedroom Fan
    label: 'Bedroom Fan',
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
  '297': { // Roborock Robot Vacuum
    label: 'Roborock',
    type: 'vacuum',
    controls: ['vacuumModal']
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

// Register service worker for offline capability
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
    .then(registration => console.log('SW registered:', registration))
    .catch(error => console.log('SW registration failed:', error));
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
      BEDROOM_FAN2_ID,     // 451 - Bedroom Fan 2
      '509',                // Front Door Lock
      BEDROOM_GROUP_ID,     // 457 - BedroomLifxGOG
      '447',                // Bed Lamp
      '450',                // Laundry 1
      '480',                // Bedroom Fan 1
      '86',                 // Entryway Thermostat
      '473',                // Bedroom TV
      '474'                 // 50" Philips Roku TV
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
      window.apiService.getDevice(BEDROOM_GROUP_ID),
      window.apiService.getDevice('474'), // 50" Philips Roku TV
      window.apiService.getDevice('473')  // Bedroom tv (94E742) - Roku TV
    ]);
    
    // Update state manager with the fetched data
    if (window.deviceStateManager) {
      if (bedroomGroup && bedroomGroup.attributes) {
        const attrs = window.deviceStateManager.normalizeAttributes(bedroomGroup.attributes);
        window.deviceStateManager.updateDevice(BEDROOM_GROUP_ID, attrs);
      }
      if (rokuTv && rokuTv.attributes) {
        const attrs = window.deviceStateManager.normalizeAttributes(rokuTv.attributes);
        window.deviceStateManager.updateDevice('474', attrs);
      }
      if (bedroomTv && bedroomTv.attributes) {
        const attrs = window.deviceStateManager.normalizeAttributes(bedroomTv.attributes);
        window.deviceStateManager.updateDevice('473', attrs);
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
    fetch('http://localhost:4711/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'dashboard_loaded', timestamp: Date.now() })
    }).catch(()=>{});
  } catch (_) {}

  // Initialize device states when state manager is ready
  if (window.deviceStateManager) {
    initializeDeviceStates().then(() => {
      updatePaddleSwitchFromState();
    });
  } else {
    // Fallback to direct API call if state manager isn't ready
    const BEDROOM_GROUP_STATUS_URL = `${MAKER_API_BASE}/devices/${BEDROOM_GROUP_ID}?access_token=${ACCESS_TOKEN}`;
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
          window.deviceStateManager.updateDevice(BEDROOM_GROUP_ID, { switch: isOn ? 'on' : 'off' });
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

// Update paddle switch UI (separated from command sending)
function updatePaddleSwitchUI(allOn) {
  if (!paddleSwitch) return;
  if (allOn) {
    paddleSwitch.classList.add('on');
    paddleSwitch.classList.remove('off');
    
    // If there's a current applied scene, show its gradient
    if (window.currentAppliedScene) {
      const scene = window.lifxScenes?.find(s => s.name === window.currentAppliedScene);
      if (scene && scene.gradient) {
        paddleSwitch.style.background = scene.gradient;
        paddleSwitch.style.color = '#222';
      } else {
        // Default on state
        paddleSwitch.style.background = '';
        paddleSwitch.style.color = '';
      }
    } else {
      // Default on state
      paddleSwitch.style.background = '';
      paddleSwitch.style.color = '';
    }
  } else {
    paddleSwitch.classList.remove('on');
    paddleSwitch.classList.add('off');
    // Reset to default off state
    paddleSwitch.style.background = '';
    paddleSwitch.style.color = '';
    // Clear current scene reference
    window.currentAppliedScene = null;
  }
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
async function updatePaddleSwitch2UI() {
  if (!paddleSwitch2) return;
  
  try {
    // Check current states of all devices
    const bedroomLightsState = await window.apiService.getDevice('457'); // Bedroom Lights
    const bedroomTvState = await window.apiService.getDevice('473'); // Bedroom tv (94E742) - Roku TV
    
    // Check Fire TV state via Home Assistant
    let fireTvState = null;
    try {
      const response = await fetch('http://192.168.4.145:8123/api/states/media_player.fire_tv_192_168_4_54', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJhNzU0MDhhNTYxYmQ0NTVjOTA3NTFmZDg0OTQ2MzMzOCIsImlhdCI6MTc1NTE5OTg1NywiZXhwIjoyMDcwNTU5ODU3fQ.NMPxvnz0asFM66pm7LEH80BIGR9dU8pj6IZEX5v3WB4',
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        fireTvState = await response.json();
      }
    } catch (error) {
      console.warn('Could not check Fire TV state for UI update:', error);
      fireTvState = { state: 'off' };
    }
    
    // Determine current states
    const lightsOn = bedroomLightsState.attributes?.switch === 'on';
    const bedroomTvOn = bedroomTvState.attributes?.switch === 'on';
    const fireTvOn = fireTvState?.state === 'on';
    
    // If all devices are on, show paddle switch 2 as on
    const allDevicesOn = lightsOn && bedroomTvOn && fireTvOn;
    
    if (allDevicesOn) {
      paddleSwitch2.classList.add('on');
      paddleSwitch2.classList.remove('off');
    } else {
      paddleSwitch2.classList.remove('on');
      paddleSwitch2.classList.add('off');
    }
    
    console.log('Updated paddle switch 2 UI - all devices on:', allDevicesOn);
    
  } catch (error) {
    console.error('Failed to update paddle switch 2 UI:', error);
  }
}

// Make the function globally available
window.updatePaddleSwitch2UI = updatePaddleSwitch2UI;

paddleSwitch.onclick = function(e) {
  e.stopPropagation();
  
  // Haptic feedback for touch devices
  if (navigator.vibrate) {
    navigator.vibrate(50);
  }
  
  const isCurrentlyOn = paddleSwitch.classList.contains('on');
  const newState = !isCurrentlyOn;
  
  // Immediately update UI to show user's action
  updatePaddleSwitchUI(newState);
  console.log('Paddle switch clicked, new state:', newState ? 'on' : 'off');
  
  // Send command to Hubitat (BedroomLifxGOG group)
  sendToggleCommand(newState);
}; 

// Add rate limiting to prevent excessive updates
let lastUpdateTimestamp = 0;
const RATE_LIMIT_INTERVAL = 1000; // 1 second

// Paddle Switch 2 - "All" switch that intelligently controls lights and TVs
const paddleSwitch2 = document.getElementById('paddleSwitch2');
if (paddleSwitch2) {
  paddleSwitch2.onclick = async function(e) {
    e.stopPropagation();
    
    // Haptic feedback for touch devices
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
    
    console.log('Paddle switch 2 (All) clicked - checking device states...');
    
    try {
      // Check current states of all devices
      const bedroomLightsState = await window.apiService.getDevice('457'); // Bedroom Lights
      const bedroomTvState = await window.apiService.getDevice('473'); // Bedroom tv (94E742) - Roku TV
      
      // Check Fire TV state via Home Assistant
      let fireTvState = null;
      try {
        const response = await fetch('http://192.168.4.145:8123/api/states/media_player.fire_tv_192_168_4_54', {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJhNzU0MDhhNTYxYmQ0NTVjOTA3NTFmZDg0OTQ2MzMzOCIsImlhdCI6MTc1NTE5OTg1NywiZXhwIjoyMDcwNTU5ODU3fQ.NMPxvnz0asFM66pm7LEH80BIGR9dU8pj6IZEX5v3WB4',
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          fireTvState = await response.json();
        }
      } catch (error) {
        console.warn('Could not check Fire TV state:', error);
        // Continue without Fire TV state - assume it's off
        fireTvState = { state: 'off' };
      }
      
      // Determine current states
      const lightsOn = bedroomLightsState.attributes?.switch === 'on';
      const bedroomTvOn = bedroomTvState.attributes?.switch === 'on';
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
        console.log('At least one device is off - turning everything on');
        
        // Turn on bedroom lights
        await window.apiService.sendDeviceCommand('457', 'on');
        
        // Turn on bedroom TV (Roku TV)
        await window.apiService.sendDeviceCommand('473', 'on');
        
        // Turn on Fire TV via Home Assistant
        try {
          await fetch('http://192.168.4.145:8123/api/services/androidtv/adb_command', {
            method: 'POST',
            headers: {
              'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJhNzU0MDhhNTYxYmQ0NTVjOTA3NTFmZDg0OTQ2MzMzOCIsImlhdCI6MTc1NTE5OTg1NywiZXhwIjoyMDcwNTU5ODU3fQ.NMPxvnz0asFM66pm7LEH80BIGR9dU8pj6IZEX5v3WB4',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              entity_id: 'media_player.fire_tv_192_168_4_54',
              command: 'POWER'
            })
          });
        } catch (error) {
          console.warn('Could not turn on Fire TV:', error);
        }
        
        // Update UI to show everything is on
        paddleSwitch2.classList.add('on');
        paddleSwitch2.classList.remove('off');
        
        showToast('All devices turned on!', 'success');
      } else {
        // All devices are on, so turn everything off
        console.log('All devices are on - turning everything off');
        
        // Turn off bedroom lights
        await window.apiService.sendDeviceCommand('457', 'off');
        
        // Turn off bedroom TV (Roku TV)
        await window.apiService.sendDeviceCommand('473', 'off');
        
        // Turn off Fire TV via Home Assistant
        try {
          await fetch('http://192.168.4.145:8123/api/services/androidtv/adb_command', {
            method: 'POST',
            headers: {
              'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJhNzU0MDhhNTYxYmQ0NTVjOTA3NTFmZDg0OTQ2MzMzOCIsImlhdCI6MTc1NTE5OTg1NywiZXhwIjoyMDcwNTU5ODU3fQ.NMPxvnz0asFM66pm7LEH80BIGR9dU8pj6IZEX5v3WB4',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              entity_id: 'media_player.fire_tv_192_168_4_54',
              command: 'POWER'
            })
          });
        } catch (error) {
          console.warn('Could not turn off Fire TV:', error);
        }
        
        // Update UI to show everything is off
        paddleSwitch2.classList.remove('on');
        paddleSwitch2.classList.add('off');
        
        showToast('All devices turned off!', 'success');
      }
      
    } catch (error) {
      console.error('Failed to check device states:', error);
      showToast('Failed to check device states', 'error');
    }
  };
}

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
if ((deviceId === '457' || deviceId === '473') && attributes.switch !== undefined) {
  // Check if we should update paddle switch 2 based on overall state
  if (typeof window.updatePaddleSwitch2UI === 'function') {
    window.updatePaddleSwitch2UI();
  }
}
  
  // Update lock indicator if this is the front door lock
  if (deviceId === '509' && attributes.lock !== undefined) {
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
  
  if (deviceInfo.type === 'thermostat' && window.uiManager && typeof window.uiManager.isThermostatModalVisible === 'function') {
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