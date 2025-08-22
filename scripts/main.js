// Hubitat API details
const BEDROOM_GROUP_ID = '457'; // Bedroom Lights group (ID: 457)
const BEDROOM_FAN2_ID = '451'; // Bedroom fan2 (ID: 451)
const MAKER_API_BASE = 'http://192.168.4.44/apps/api/37';
const ACCESS_TOKEN = 'b9846a66-8bf8-457a-8353-fd16d511a0af';
const BEDROOM_GROUP_COMMAND_URL = (cmd) => `${MAKER_API_BASE}/devices/${BEDROOM_GROUP_ID}/${cmd}?access_token=${ACCESS_TOKEN}`;
const BEDROOM_FAN2_STATUS_URL = `${MAKER_API_BASE}/devices/${BEDROOM_FAN2_ID}?access_token=${ACCESS_TOKEN}`;

// Make important constants available to other scripts (including ES modules)
window.MAKER_API_BASE = MAKER_API_BASE;
window.ACCESS_TOKEN = ACCESS_TOKEN;
window.LRGROUP_ID = BEDROOM_GROUP_ID; // Keep compatibility with existing code

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
  '487': {
    label: 'Bedroom Fan 1',
    id: '487',
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
    const keyDevices = [BEDROOM_FAN2_ID, '509', BEDROOM_GROUP_ID]; // Fan 2, Lock, Bedroom Lights
    
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

// Update paddle switch based on Bedroom Lights group state (only called on initial load and external state changes)
function updatePaddleSwitchFromState() {
  if (!window.deviceStateManager) return;
  
  const bedroomLightsState = window.deviceStateManager.getDevice(BEDROOM_GROUP_ID);
  if (bedroomLightsState && bedroomLightsState.switch !== undefined) {
    setPaddleSwitch(bedroomLightsState.switch === 'on');
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
        const val = Array.isArray(attrs) ? (attrs.find(a=>a.name==='switch')?.currentValue) : attrs.switch;
        setPaddleSwitch(val === 'on');
      })
      .catch(err => {
        console.error('Could not fetch Bedroom Lights state:', err);
      });
  }

  // Initial fetch of lock status indicator
  if (typeof refreshLockIndicator === 'function') {
    refreshLockIndicator();
  }
});

const paddleSwitch = document.getElementById('paddleSwitch');

function setPaddleSwitch(isOn) {
  if (isOn) {
    paddleSwitch.classList.add('on');
    paddleSwitch.classList.remove('off');
  } else {
    paddleSwitch.classList.remove('on');
    paddleSwitch.classList.add('off');
  }
}

paddleSwitch.onclick = function(e) {
  e.stopPropagation();
  
  // Haptic feedback for touch devices
  if (navigator.vibrate) {
    navigator.vibrate(50);
  }
  
  const isCurrentlyOn = paddleSwitch.classList.contains('on');
  const newState = !isCurrentlyOn;
  
  // Immediately update UI to show user's action
  setPaddleSwitch(newState);
  console.log('Paddle switch clicked, new state:', newState ? 'on' : 'off');
  
  // Send command to Hubitat (Bedroom Lights group)
  fetch(BEDROOM_GROUP_COMMAND_URL(newState ? 'on' : 'off'))
    .then(res => res.json())
    .then(data => {
      console.log('Bedroom Lights command response:', data);
      // Command successful - UI already shows correct state
    })
    .catch(err => {
      console.error('Could not send Bedroom Lights command:', err);
      // Revert UI state on error
      setPaddleSwitch(!newState);
      if (window.showToast) {
        showToast('Failed to send command', 'error');
      }
    });
}; 