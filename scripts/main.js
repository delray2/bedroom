// Hubitat API details
const LRGROUP_ID = '453';
const FAN2_ID = '446';
const MAKER_API_BASE = 'http://192.168.4.44/apps/api/37';
const ACCESS_TOKEN = 'b9846a66-8bf8-457a-8353-fd16d511a0af';
const LRGROUP_COMMAND_URL = (cmd) => `${MAKER_API_BASE}/devices/${LRGROUP_ID}/${cmd}?access_token=${ACCESS_TOKEN}`;
const FAN2_STATUS_URL = `${MAKER_API_BASE}/devices/${FAN2_ID}?access_token=${ACCESS_TOKEN}`;

// Living room device definitions (from devicesfulldetails.json)
const livingRoomDevices = {
  '452': {
    label: 'Table',
    id: '452',
    capabilities: ["Configuration","Actuator","Refresh","ColorTemperature","Polling","ColorMode","ColorControl","SignalStrength","ChangeLevel","SwitchLevel","Light","Switch"],
    attributes: ["switch","level","colorTemperature","colorMode","colorName","hue","saturation","color"],
    commands: ["on","off","setLevel","setColorTemperature","setColor","setHue","setSaturation","refresh"]
  },
  '449': {
    label: 'Fan 1',
    id: '449',
    capabilities: ["Configuration","Actuator","Refresh","ColorTemperature","Polling","ColorMode","ColorControl","SignalStrength","ChangeLevel","SwitchLevel","Light","Switch"],
    attributes: ["switch","level","colorTemperature","colorMode","colorName","hue","saturation","color"],
    commands: ["on","off","setLevel","setColorTemperature","setColor","setHue","setSaturation","refresh"]
  },
  '446': {
    label: 'Fan 2',
    id: '446',
    capabilities: ["Configuration","Actuator","Refresh","ColorTemperature","Polling","ColorMode","ColorControl","SignalStrength","ChangeLevel","SwitchLevel","Light","Switch"],
    attributes: ["switch","level","colorTemperature","colorMode","colorName","hue","saturation","color"],
    commands: ["on","off","setLevel","setColorTemperature","setColor","setHue","setSaturation","refresh"]
  },
  '470': {
    label: 'LR Wall',
    id: '470',
    capabilities: ["Refresh","ColorTemperature","SwitchLevel","ColorMode","Switch","ColorControl"],
    attributes: ["switch","level","colorTemperature","colorMode","hue","saturation","color","effectIntensity","effectSpeed","currentEffect","currentPalette"],
    commands: ["on","off","setLevel","setColorTemperature","setColor","setHue","setSaturation","refresh"]
  }
};

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

// Notify backend on load
window.addEventListener('DOMContentLoaded', function() {
  fetch('http://localhost:4711/api/notify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event: 'dashboard_loaded', timestamp: Date.now() })
  })
  .then(res => {
    if (!res.ok) throw new Error('Backend not reachable');
    console.log('Backend notified on load');
  })
  .catch(err => {
    console.error('Could not notify backend:', err);
  });

  // Fetch Fan 2 state and set paddle switch
  fetch(FAN2_STATUS_URL)
    .then(res => res.json())
    .then(device => {
      const state = (device.attributes || device.attributes?.find?.(a => a.name === 'switch'))?.switch || device.attributes?.find?.(a => a.name === 'switch')?.currentValue;
      setPaddleSwitch(state === 'on');
    })
    .catch(err => {
      console.error('Could not fetch Fan 2 state:', err);
    });
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
  setPaddleSwitch(newState);
  // Send command to Hubitat (LRGroup)
  fetch(LRGROUP_COMMAND_URL(newState ? 'on' : 'off'))
    .then(res => res.json())
    .then(data => {
      // Optionally, update UI or handle response
      console.log('LRGroup command response:', data);
    })
    .catch(err => {
      console.error('Could not send LRGroup command:', err);
    });
}; 