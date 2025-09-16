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
    <div class="device-loading-message"><em>Loading...</em></div>`, showBack, '.side-btn[title="Lights"]');
  
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
    document.getElementById('modalBody').innerHTML = `
      <div class="modal-header"><h2>Device Controls</h2></div>
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

  // Controls group - replaced with carousel
  html += `<div id="sliderCarousel" class="carousel"></div>`;
  
  // Optional refresh button (kept minimal, styled like icon-only)
  html += `<div class="device-refresh-section">
    <button id='refreshBtn' class='btn btn-info' title='Refresh'>🔄</button>
  </div>`;
  
  document.getElementById('modalBody').innerHTML = html;
  document.getElementById('backModal').style.display = showBack ? '' : 'none';
  
  // Setup carousel sliders for this device
  setTimeout(() => {
    try {
      initializeSliderCarousel(deviceId);
    } catch (error) {
      console.error('Error setting up slider carousel for device:', deviceId, error);
    }
  }, 100);
  
  // Event listeners for the refresh button
  document.getElementById('refreshBtn').onclick = function() {
    const container = document.getElementById('modalBody');
    container.innerHTML = '<div class="modal-header"><h2>Device Controls</h2></div><div class="device-loading-message"><em>Refreshing...</em></div>';
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