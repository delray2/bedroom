function openDeviceModal(label, deviceId, showBack = false) {
  if (!livingRoomDevices[deviceId]) {
    showModalContent(`<div class="modal-header">${label}</div>
      <div style="text-align: center; color: #ccc; margin-top: 20px;">Controls for <b>${label}</b> (ID: ${deviceId}) coming soon...</div>`, showBack, '.side-btn[title="Lights"]');
    return;
  }
  
  showModalContent(`<div class="modal-header">${label}</div>
    <div id='deviceControls' style="text-align: center; color: #ccc; margin-top: 20px;"><em>Loading...</em></div>`, showBack, '.side-btn[title="Lights"]');
  
  fetch(`${MAKER_API_BASE}/devices/${deviceId}?access_token=${ACCESS_TOKEN}`)
    .then(res => res.json())
    .then(device => {
      renderDeviceControls(device, deviceId, showBack);
    })
    .catch(err => {
      document.getElementById('deviceControls').innerHTML = `<span style='color:red'>Failed to load device state.</span>`;
    });
}

function renderDeviceControls(device, deviceId, showBack = false) {
  const dev = livingRoomDevices[deviceId];
  const attr = device.attributes || {};
  
  // Helper to get attribute value
  function getAttr(name) {
    if (Array.isArray(attr)) {
      const found = attr.find(a => a.name === name);
      return found ? found.currentValue : undefined;
    } else {
      return attr[name];
    }
  }
  
  const isOn = getAttr('switch') === 'on';
  const level = getAttr('level') || 0;
  const colorTemp = getAttr('colorTemperature') || 3000;
  const hue = getAttr('hue') || 0;
  const sat = getAttr('saturation') || 0;
  const color = getAttr('color') || '#FFFFFF';
  const colorMode = getAttr('colorMode') || 'CT';
  
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
  
  // Top section with power toggle and basic controls
  html += `<div style="margin-bottom: 20px;">
    <div style="display: flex; justify-content: center; align-items: center; gap: 16px; margin-bottom: 16px;">
      <button class="circular-button control-button" onclick="sendDeviceCommand('${deviceId}', '${isOn ? 'off' : 'on'}')" style="background: ${isOn ? 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)' : 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)'};">
        <div class="icon">${isOn ? '🔆' : '🌙'}</div>
        <div class="label">${isOn ? 'On' : 'Off'}</div>
      </button>
      <div style="width: 60px; height: 60px; border-radius: 50%; background: ${currentColor}; border: 3px solid rgba(255,255,255,0.3); box-shadow: 0 4px 12px rgba(0,0,0,0.3);"></div>
    </div>
  </div>`;
  
  // Sliders section at bottom
  html += `<div class="modal-sliders">`;
  
  // Brightness slider
  html += `<div class="slider-container">
    <label>Brightness:</label>
    <input type="range" id="levelSlider" min="1" max="100" value="${level}" style="flex:1;">
    <span id="levelVal" class="slider-value">${level}%</span>
  </div>`;
  
  // Color Temperature slider
  if (dev.capabilities.includes('ColorTemperature')) {
    html += `<div class="slider-container">
      <label>Color Temp:</label>
      <input type="range" id="ctSlider" min="2000" max="9000" value="${colorTemp}" style="flex:1;">
      <span id="ctVal" class="slider-value">${colorTemp}K</span>
    </div>`;
  }
  
  // Color controls
  if (dev.capabilities.includes('ColorControl')) {
    html += `<div class="slider-container">
      <label>Hue:</label>
      <input type="range" id="hueSlider" min="0" max="100" value="${hue}" style="flex:1;">
      <span id="hueVal" class="slider-value">${hue}</span>
    </div>`;
    html += `<div class="slider-container">
      <label>Saturation:</label>
      <input type="range" id="satSlider" min="0" max="100" value="${sat}" style="flex:1;">
      <span id="satVal" class="slider-value">${sat}</span>
    </div>`;
  }
  
  html += `</div>`;
  
  // Refresh button
  html += `<div style="position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%);">
    <button id='refreshBtn' class='circular-button control-button' style="width: 60px; height: 60px;">
      <div class="icon">🔄</div>
      <div class="label">Refresh</div>
    </button>
  </div>`;
  
  document.getElementById('deviceControls').innerHTML = html;
  document.getElementById('backModal').style.display = showBack ? '' : 'none';
  
  // Event listeners
  document.getElementById('levelSlider').oninput = function() {
    document.getElementById('levelVal').textContent = this.value + '%';
  };
  document.getElementById('levelSlider').onchange = function() {
    sendDeviceCommand(deviceId, 'setLevel', this.value);
  };
  
  if (document.getElementById('ctSlider')) {
    document.getElementById('ctSlider').oninput = function() {
      document.getElementById('ctVal').textContent = this.value + 'K';
    };
    document.getElementById('ctSlider').onchange = function() {
      sendDeviceCommand(deviceId, 'setColorTemperature', this.value);
    };
  }
  
  if (document.getElementById('hueSlider')) {
    document.getElementById('hueSlider').oninput = function() {
      document.getElementById('hueVal').textContent = this.value;
    };
    document.getElementById('hueSlider').onchange = function() {
      sendDeviceCommand(deviceId, 'setHue', this.value);
    };
  }
  
  if (document.getElementById('satSlider')) {
    document.getElementById('satSlider').oninput = function() {
      document.getElementById('satVal').textContent = this.value;
    };
    document.getElementById('satSlider').onchange = function() {
      sendDeviceCommand(deviceId, 'setSaturation', this.value);
    };
  }
  
  document.getElementById('refreshBtn').onclick = function() {
    document.getElementById('deviceControls').innerHTML = '<em>Refreshing...</em>';
    fetch(`${MAKER_API_BASE}/devices/${deviceId}?access_token=${ACCESS_TOKEN}`)
      .then(res => res.json())
      .then(device => {
        renderDeviceControls(device, deviceId, showBack);
      })
      .catch(err => {
        document.getElementById('deviceControls').innerHTML = `<span style='color:red'>Failed to refresh device state.</span>`;
      });
  };
}

function sendDeviceCommand(deviceId, command, value) {
  let url = `${MAKER_API_BASE}/devices/${deviceId}/${command}`;
  if (value !== undefined) url += `/${value}`;
  url += `?access_token=${ACCESS_TOKEN}`;
  
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