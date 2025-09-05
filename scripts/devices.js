// Global state to track pending commands for device modals
if (!window.devicePendingCommands) {
  window.devicePendingCommands = new Map();
}

async function openDeviceModal(label, deviceId, showBack = false) {
  if (!livingRoomDevices[deviceId]) {
    showModalContent(`<div class="modal-header">${label}</div>
      <div class="device-coming-soon">Controls for <b>${label}</b> (ID: ${deviceId}) coming soon...</div>`, showBack, '.side-btn[title="Lights"]');
    return;
  }
  
  showModalContent(`<div class="modal-header"><h2>${label}</h2></div>
    <div id='deviceControls' class="control-panel with-arches" data-device-id="${deviceId}"><em>Loading...</em></div>`, showBack, '.side-btn[title="Lights"]');
  
  // Initialize from current cache; refresh once if stale/missing
  let attrs = window.deviceStateManager.getDevice(deviceId) || {};
  if (!attrs || Object.keys(attrs).length === 0 || window.deviceStateManager.isStale(deviceId)){
    await window.deviceStateManager.refreshDevice(deviceId);
    attrs = window.deviceStateManager.getDevice(deviceId) || {};
  }
  renderDeviceControls({ attributes: attrs, capabilities: livingRoomDevices[deviceId]?.capabilities || [] }, deviceId, showBack);
}

function renderDeviceControls(device, deviceId, showBack = false) {
  const dev = livingRoomDevices[deviceId];
  
  if (!device || !device.attributes) {
    console.error('Invalid device data:', device);
    document.getElementById('deviceControls').innerHTML = `
      <div class="device-error-container">
        <div class="device-error-title">❌ Invalid device data</div>
        <div class="device-error-details">Device ID: ${deviceId}</div>
        <div class="device-error-details">Device: ${device ? JSON.stringify(device) : 'null'}</div>
      </div>`;
    return;
  }
  
  const attr = device.attributes || {};
  
  // Debug logging to see what we're getting
  console.log('Device data:', device);
  console.log('Device attributes:', attr);
  console.log('Device capabilities:', device.capabilities);
  
  // Helper to get attribute value
  function getAttr(name) {
    if (Array.isArray(attr)) {
      const found = attr.find(a => a.name === name);
      return found ? found.currentValue : undefined;
    } else {
      return attr[name];
    }
  }
  
  // Helper to check if device has a capability (handles mixed string/object array)
  function hasCapability(capabilityName) {
    if (!device.capabilities || !Array.isArray(device.capabilities)) {
      return false;
    }
    return device.capabilities.some(cap => {
      if (typeof cap === 'string') {
        return cap === capabilityName;
      } else if (cap && typeof cap === 'object') {
        return cap.attributes && cap.attributes.some(attr => attr.name === capabilityName);
      }
      return false;
    });
  }
  
  const isOn = getAttr('switch') === 'on';
  const level = getAttr('level') || 0;
  const colorTemp = getAttr('colorTemperature') || 3000;
  const hue = getAttr('hue') || 0;
  const sat = getAttr('saturation') || 0;
  const color = getAttr('color') || '#FFFFFF';
  const colorMode = getAttr('colorMode') || 'CT';
  
  // Debug logging for parsed values
  console.log('Parsed values:', { isOn, level, colorTemp, hue, sat, color, colorMode });
  
  // Convert Hubitat color values to CSS color
  function getCurrentColor() {
    if (colorMode === 'CT') {
      // Convert color temperature to RGB
      const temp = colorTemp / 100;
      let r, g, b;
      if (temp <= 66) {
        r = 255;
        g = temp <= 19 ? 0 : 3.051 * temp - 60;
        b = temp <= 19 ? 0 : 138.51 * Math.log(temp - 10) - 305.044;
      } else {
        r = 329.698 * Math.pow(temp - 60, -0.133);
        g = 288.122 * Math.pow(temp - 60, -0.075);
        b = 255;
      }
      return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
    } else {
      // Convert HSL to RGB
      const h = (hue / 100) * 360;
      const s = sat / 100;
      const l = level / 100;
      
      const c = (1 - Math.abs(2 * l - 1)) * s;
      const x = c * (1 - Math.abs((h / 60) % 2 - 1));
      const m = l - c / 2;
      
      let r, g, b;
      if (h < 60) { r = c; g = x; b = 0; }
      else if (h < 120) { r = x; g = c; b = 0; }
      else if (h < 180) { r = 0; g = c; b = x; }
      else if (h < 240) { r = 0; g = x; b = c; }
      else if (h < 300) { r = x; g = 0; b = c; }
      else { r = c; g = 0; b = x; }
      
      return `rgb(${Math.round((r + m) * 255)}, ${Math.round((g + m) * 255)}, ${Math.round((b + m) * 255)})`;
    }
  }
  
  const currentColor = getCurrentColor();
  let html = '';

  // Global-style ring buttons (per-device wiring)
  const ringButtons = [
    { icon: '🔆', label: 'On',     onclick: `sendDeviceCommand('${deviceId}','on')`,       cls: 'btn-all-on' },
    { icon: '🌙', label: 'Off',    onclick: `sendDeviceCommand('${deviceId}','off')`,      cls: 'btn-all-off' },
    { icon: '🔅', label: 'Dim',    onclick: `sendDeviceCommand('${deviceId}','setLevel',20)`,  cls: 'btn-dim' },
    { icon: '☀️', label: 'Bright', onclick: `sendDeviceCommand('${deviceId}','setLevel',90)`,  cls: 'btn-bright' }
  ];
  const startDeg = -140, endDeg = -40; const steps = ringButtons.length - 1 || 1;
  html += `<div class="bubble-ring global-ring-top" style="--radius: 180px;">`;
  for (let i = 0; i < ringButtons.length; i++) {
    const t = i / steps; const deg = startDeg + t * (endDeg - startDeg);
    const b = ringButtons[i];
    html += `<button class="bubble-btn global-btn ${b.cls}" style="--pose: translate(-50%,-50%) rotate(${deg}deg) translateY(calc(-1 * var(--radius))) rotate(${-deg}deg);" onclick="${b.onclick}">
      <span class="icon">${b.icon}</span>
      <span class="label">${b.label}</span>
    </button>`;
  }
  html += `</div>`;

  // Controls group - same classes as global controls
  html += `<div class="controls-group">`;
  
  // Brightness slider (Kawaii style)
  html += `
    <div class="slider-wrapper">
      <svg class="kawaii-slider" width="60" height="260">
        <defs>
          <linearGradient id="lvlGradient-${deviceId}" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#ffffff" />
            <stop offset="50%" stop-color="#777777" />
            <stop offset="100%" stop-color="#000000" />
          </linearGradient>
        </defs>
        <path id="bgLvl-${deviceId}" d="M20 230 C 50 200, 50 60, 20 30" stroke="#e4e4e4" stroke-width="30" fill="none" stroke-linecap="round" />
        <path id="progressLvl-${deviceId}" d="M20 230 C 50 200, 50 60, 20 30" stroke="url(#lvlGradient-${deviceId})" stroke-width="30" fill="none" stroke-linecap="round" stroke-dasharray="1" stroke-dashoffset="1" />
      </svg>
      <div class="value" id="valLvl-${deviceId}">${level}%</div>
      <div style="font-size: 12px;">Bright</div>
    </div>`;
  
  // Color Temperature slider (if supported)
  if (hasCapability('ColorTemperature')) {
    html += `
      <div class="slider-wrapper">
        <svg class="kawaii-slider" width="60" height="260">
          <defs>
            <linearGradient id="ctGradient-${deviceId}" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#ff8a65" />
              <stop offset="50%" stop-color="#ffd600" />
              <stop offset="100%" stop-color="#3aa3ff" />
            </linearGradient>
          </defs>
          <path id="bgCt-${deviceId}" d="M20 230 C 50 200, 50 60, 20 30" stroke="#e4e4e4" stroke-width="30" fill="none" stroke-linecap="round" />
          <path id="progressCt-${deviceId}" d="M20 230 C 50 200, 50 60, 20 30" stroke="url(#ctGradient-${deviceId})" stroke-width="30" fill="none" stroke-linecap="round" stroke-dasharray="1" stroke-dashoffset="1" />
        </svg>
        <div class="value" id="valCt-${deviceId}" style="color: #ff8a65;">${colorTemp}K</div>
        <div style="font-size: 12px;">Temp</div>
      </div>`;
  }
  
  // Color controls (if supported)
  if (hasCapability('ColorControl')) {
    // HUE Slider (Kawaii style)
    html += `
      <div class="slider-wrapper">
        <svg class="kawaii-slider" width="60" height="260">
          <defs>
            <linearGradient id="hueGradient-${deviceId}" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#ff0000" />
              <stop offset="14%" stop-color="#ff8000" />
              <stop offset="29%" stop-color="#ffff00" />
              <stop offset="43%" stop-color="#80ff00" />
              <stop offset="57%" stop-color="#00ff00" />
              <stop offset="71%" stop-color="#00ff80" />
              <stop offset="86%" stop-color="#00ffff" />
              <stop offset="100%" stop-color="#ff0000" />
            </linearGradient>
          </defs>
          <path id="bgHue-${deviceId}" d="M20 230 C 50 200, 50 60, 20 30" stroke="#e4e4e4" stroke-width="30" fill="none" stroke-linecap="round" />
          <path id="progressHue-${deviceId}" d="M20 230 C 50 200, 50 60, 20 30" stroke="url(#hueGradient-${deviceId})" stroke-width="30" fill="none" stroke-linecap="round" stroke-dasharray="1" stroke-dashoffset="1" />
        </svg>
        <div class="value" id="valHue-${deviceId}" style="color: #ff0000;">${hue}</div>
        <div style="font-size: 12px;">Hue</div>
      </div>`;
    
    // SAT Slider (Kawaii style)
    html += `
      <div class="slider-wrapper">
        <svg class="kawaii-slider" width="60" height="260">
          <defs>
            <linearGradient id="satGradient-${deviceId}" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#ff0000" />
              <stop offset="50%" stop-color="#ff8080" />
              <stop offset="100%" stop-color="#ffffff" />
            </linearGradient>
          </defs>
          <path id="bgSat-${deviceId}" d="M20 230 C 50 200, 50 60, 20 30" stroke="#e4e4e4" stroke-width="30" fill="none" stroke-linecap="round" />
          <path id="progressSat-${deviceId}" d="M20 230 C 50 200, 50 60, 20 30" stroke="url(#satGradient-${deviceId})" stroke-width="30" fill="none" stroke-linecap="round" stroke-dasharray="1" stroke-dashoffset="1" />
        </svg>
        <div class="value" id="valSat-${deviceId}" style="color: #ff0000;">${sat}</div>
        <div style="font-size: 12px;">Sat</div>
      </div>`;
  }
  
  html += `</div>`;
  
  // Optional refresh button (kept minimal, styled like icon-only)
  html += `<div class="device-refresh-section">
    <button id='refreshBtn' class='btn btn-info' title='Refresh'>🔄</button>
  </div>`;
  
  document.getElementById('deviceControls').innerHTML = html;
  document.getElementById('backModal').style.display = showBack ? '' : 'none';
  
  // Setup kawaii sliders for this device
  setTimeout(() => {
    try {
      setupKawaiiSlider(`bgLvl-${deviceId}`, `progressLvl-${deviceId}`, `valLvl-${deviceId}`, 'setLevel', deviceId);
      
      if (hasCapability('ColorTemperature')) {
        setupKawaiiSlider(`bgCt-${deviceId}`, `progressCt-${deviceId}`, `valCt-${deviceId}`, 'setColorTemperature', deviceId);
      }
      
      if (hasCapability('ColorControl')) {
        setupKawaiiSlider(`bgHue-${deviceId}`, `progressHue-${deviceId}`, `valHue-${deviceId}`, 'setHue', deviceId);
        setupKawaiiSlider(`bgSat-${deviceId}`, `progressSat-${deviceId}`, `valSat-${deviceId}`, 'setSaturation', deviceId);
      }
    } catch (error) {
      console.error('Error setting up kawaii sliders for device:', deviceId, error);
    }
  }, 100);
  
  // Event listeners for the refresh button
  document.getElementById('refreshBtn').onclick = function() {
    const container = document.getElementById('deviceControls');
    container.innerHTML = '<div class="device-loading-message"><em>Refreshing...</em></div>';
    if (window.deviceStateManager) {
      window.deviceStateManager.refreshDevice(deviceId)
        .then(() => {
          const attrs = window.deviceStateManager.getDevice(deviceId) || {};
          renderDeviceControls({ attributes: attrs, capabilities: livingRoomDevices[deviceId]?.capabilities || [] }, deviceId, showBack);
        })
        .catch(() => {
          container.innerHTML = `<div class="device-error-container"><span class="device-error-title">Failed to refresh device state.</span></div>`;
        });
    }
  };
}

// Helper function to setup kawaii sliders for device controls
function setupKawaiiSlider(bgId, progressId, valueId, command, deviceId) {
  const bg = document.getElementById(bgId);
  const progress = document.getElementById(progressId);
  const value = document.getElementById(valueId);
  
  if (!bg || !progress || !value) {
    console.error(`Missing slider elements: ${bgId}, ${progressId}, ${valueId}`);
    return;
  }
  
  const pathLength = bg.getTotalLength();
  progress.style.strokeDasharray = pathLength;
  
  // Set initial value based on current value
  let currentValue = 0;
  if (command === 'setLevel') {
    currentValue = parseInt(value.textContent) || 0;
  } else if (command === 'setColorTemperature') {
    currentValue = parseInt(value.textContent) || 3000;
  } else if (command === 'setHue') {
    currentValue = parseInt(value.textContent) || 0;
  } else if (command === 'setSaturation') {
    currentValue = parseInt(value.textContent) || 0;
  }
  
  // Update progress bar
  updateProgressBar(progress, pathLength, currentValue, command);
  
  let dragging = false;
  
  function move(e) {
    const rect = bg.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const value = getValueFromY(y, rect.height, command);
    updateSliderValue(value, command, deviceId);
  }
  
  function startDrag(e) {
    e.preventDefault();
    e.stopPropagation();
    dragging = true;
    move(e);
    window.addEventListener("mousemove", move);
  }
  
  function endDrag() {
    if (!dragging) return;
    dragging = false;
    window.removeEventListener("mousemove", move);
  }
  
  // Mouse events
  bg.addEventListener("mousedown", startDrag);
  progress.addEventListener("mousedown", startDrag);
  window.addEventListener("mouseup", endDrag);
  
  // Touch events
  bg.addEventListener("touchstart", (e) => {
    const touch = e.touches[0];
    startDrag({ clientY: touch.clientY, preventDefault: () => e.preventDefault(), stopPropagation: () => e.stopPropagation() });
  });
  
  progress.addEventListener("touchstart", (e) => {
    const touch = e.touches[0];
    startDrag({ clientY: touch.clientY, preventDefault: () => e.preventDefault(), stopPropagation: () => e.stopPropagation() });
  });
  
  window.addEventListener("touchmove", (e) => {
    if (dragging && e.touches[0]) {
      move({ clientY: e.touches[0].clientY });
    }
  });
  
  window.addEventListener("touchend", endDrag);
  
  // Click events for immediate response
  bg.addEventListener("click", (e) => {
    if (!dragging) {
      move(e);
    }
  });
  
  progress.addEventListener("click", (e) => {
    if (!dragging) {
      move(e);
    }
  });
  
  function getValueFromY(y, height, command) {
    const normalizedY = Math.max(0, Math.min(1, 1 - (y / height)));
    
    if (command === 'setLevel') {
      return Math.max(1, Math.round(normalizedY * 100));
    } else if (command === 'setColorTemperature') {
      return Math.round(2000 + normalizedY * 7000);
    } else if (command === 'setHue') {
      return Math.round(normalizedY * 100);
    } else if (command === 'setSaturation') {
      return Math.round(normalizedY * 100);
    }
    return 0;
  }
  
  function updateSliderValue(newValue, command, deviceId) {
    currentValue = newValue;
    
    // Update display
    if (command === 'setLevel') {
      value.textContent = newValue + '%';
    } else if (command === 'setColorTemperature') {
      value.textContent = newValue + 'K';
    } else {
      value.textContent = newValue;
    }
    
    // Update progress bar
    updateProgressBar(progress, pathLength, newValue, command);
    
    // Send command to device
    sendDeviceCommand(deviceId, command, newValue);
  }
  
  function updateProgressBar(progress, pathLength, value, command) {
    let normalizedValue = 0;
    
    if (command === 'setLevel') {
      normalizedValue = value / 100;
    } else if (command === 'setColorTemperature') {
      normalizedValue = (value - 2000) / 7000;
    } else if (command === 'setHue' || command === 'setSaturation') {
      normalizedValue = value / 100;
    }
    
    const dashOffset = pathLength * (1 - normalizedValue);
    progress.style.strokeDashoffset = dashOffset;
  }
}

function sendDeviceCommand(deviceId, command, value) {
  let url = `${window.MAKER_API_BASE}/devices/${deviceId}/${command}`;
  if (value !== undefined) url += `/${value}`;
  url += `?access_token=${window.ACCESS_TOKEN}`;
  
  fetch(url)
    .then(res => res.json())
    .then(data => {
      showToast(`Command sent successfully!`, 'success');
    })
    .catch(err => {
      console.error('Failed to send command:', err);
      showToast(`Failed to send command: ${err.message}`, 'error');
    });
} 