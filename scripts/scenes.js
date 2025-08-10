// Enhanced Scene System with Individual Bulb Control and Calculated Color Palettes
const lifxScenes = [
  {
    name: 'White',
    gradient: 'radial-gradient(circle at 30% 30%, #ffffff 0%, #f7f7f7 35%, #ebebeb 70%, #dcdcdc 100%)',
    bulbs: [
      { deviceId: '449', color: '#ffffff', brightness: 100, temp: 4000 }, // Fan 1
      { deviceId: '446', color: '#ffffff', brightness: 100, temp: 4000 }, // Fan 2
      { deviceId: '452', color: '#ffffff', brightness: 100, temp: 4000 }  // Table
    ],
    wled: {
      palette: 0,  // Default palette
      effect: 0,   // Solid
      brightness: 128,
      color: '#ffffff'
    }
  },
  {
    name: 'Sunset',
    gradient: 'conic-gradient(from 200deg at 50% 50%, #ff4500 0%, #ff6347 25%, #ffd700 50%, #ff8c00 75%, #dc143c 100%)',
    bulbs: [
      { deviceId: '449', color: '#ff4500', brightness: 80, temp: 2700 },  // Fan 1 - Red-orange
      { deviceId: '446', color: '#ffd700', brightness: 70, temp: 3000 },  // Fan 2 - Gold
      { deviceId: '452', color: '#ff6347', brightness: 60, temp: 3500 }   // Table - Tomato red
    ],
    wled: {
      palette: 45, // Sunset palette
      effect: 0,   // Solid
      brightness: 128
    }
  },
  {
    name: 'Ocean',
    gradient: 'radial-gradient(circle at 40% 30%, #006994 0%, #00bfff 40%, #87ceeb 75%, #e0f6ff 100%)',
    bulbs: [
      { deviceId: '449', color: '#000080', brightness: 85, temp: 6500 },  // Fan 1 - Navy blue
      { deviceId: '446', color: '#00bfff', brightness: 75, temp: 7000 },  // Fan 2 - Deep sky blue
      { deviceId: '452', color: '#87ceeb', brightness: 65, temp: 6000 }   // Table - Sky blue
    ],
    wled: {
      palette: 37, // Tropical palette
      effect: 0,   // Solid
      brightness: 128
    }
  },
  {
    name: 'Forest',
    gradient: 'radial-gradient(circle at 60% 40%, #2d5016 0%, #4a7c59 30%, #ffffff 55%, rgb(58, 7, 111) 75%, #8b4513 100%)',
    bulbs: [
      { deviceId: '449', color: '#2d5016', brightness: 80, temp: 5000 },  // Fan 1 - Dark green
      { deviceId: '446', color: '#4a7c59', brightness: 70, temp: 5500 },  // Fan 2 - Forest green
      { deviceId: '452', color: '#ffffff', brightness: 60, temp: 5200 }   // Table - White
    ],
    wled: {
      palette: 55, // Forest palette
      effect: 0,   // Solid
      brightness: 128
    }
  },
  {
    name: 'Candlelight',
    gradient: 'radial-gradient(circle at 50% 45%, #ffd452 0%, #ffb347 45%, #ff6961 100%)',
    bulbs: [
      { deviceId: '449', color: '#ffd452', brightness: 60, temp: 2200 },  // Fan 1 - Warm yellow
      { deviceId: '446', color: '#ffb347', brightness: 50, temp: 2500 },  // Fan 2 - Orange
      { deviceId: '452', color: '#ff6961', brightness: 40, temp: 2800 }   // Table - Soft red
    ],
    wled: {
      palette: 65, // Party palette
      effect: 0,   // Solid
      brightness: 100
    }
  },
  {
    name: 'Magenta Dream',
    gradient: 'conic-gradient(from 90deg at 50% 50%, #ff61a6 0%, #a18cd1 50%, #4a90e2 100%)',
    bulbs: [
      { deviceId: '449', color: '#ff61a6', brightness: 75, temp: 3500 },  // Fan 1 - Magenta
      { deviceId: '446', color: '#a18cd1', brightness: 65, temp: 4000 },  // Fan 2 - Purple
      { deviceId: '452', color: '#4a90e2', brightness: 55, temp: 4500 }   // Table - Blue
    ],
    wled: {
      palette: 0,  // Rainbow palette
      effect: 0,   // Solid
      brightness: 128
    }
  },
  {
    name: 'Aurora',
    gradient: 'conic-gradient(at 50% 50%, #00ff87 0%, #00ffff 20%, #0080ff 40%, #8000ff 60%, #ff0080 80%, #ffff00 100%)',
    bulbs: [
      { deviceId: '449', color: '#00ff87', brightness: 70, temp: 5000 },  // Fan 1 - Spring green
      { deviceId: '446', color: '#00ffff', brightness: 60, temp: 6000 },  // Fan 2 - Cyan
      { deviceId: '452', color: '#8000ff', brightness: 50, temp: 7000 }   // Table - Purple
    ],
    wled: {
      palette: 0,  // Rainbow palette
      effect: 51,  // Colorloop
      brightness: 128
    }
  },
  {
    name: 'Cozy',
    gradient: 'radial-gradient(circle at 40% 60%, #ff9a9e 0%, #fecfef 50%, #ffd1dc 100%)',
    bulbs: [
      { deviceId: '449', color: '#ff9a9e', brightness: 65, temp: 3000 },  // Fan 1 - Soft pink
      { deviceId: '446', color: '#fecfef', brightness: 55, temp: 3200 },  // Fan 2 - Light pink
      { deviceId: '452', color: '#ffb3ba', brightness: 45, temp: 3100 }   // Table - Medium pink
    ],
    wled: {
      palette: 45, // Sunset palette
      effect: 0,   // Solid
      brightness: 80
    }
  }
];

// WLED Device IPs - Direct HTTP API control
const WLED_DEVICES = {
  'lrwall': '192.168.4.24'   // LRWall WLED device - direct HTTP API
};

function showScenesModal() {
  const sceneCount = lifxScenes.length;
  let html = `<div class="label-badge">Choose a Scene</div>
    <div class="bubble-ring count-${sceneCount}">`;
  
  for (let i = 0; i < sceneCount; i++) {
    const slug = lifxScenes[i].name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const bg = lifxScenes[i].gradient || '';
    html += `<button class="bubble-btn scene-button scene-${slug} i-${i}" style="background: ${bg};" onclick='applyLifxScene("${lifxScenes[i].name}")'>
      <span class="icon">🎨</span>
      <span class="label">${lifxScenes[i].name}</span>
    </button>`;
  }
  
  html += `</div>
    <div id='sceneFeedback' class="toast"></div>`;
  
  showModal(html, { showBack: true });
}

// Enhanced Scene Application with Individual Bulb Control and WLED Gradient
window.applyLifxScene = async function(sceneName) {
  const scene = lifxScenes.find(s => s.name === sceneName);
  if (!scene) {
    showToast('Scene not found', 'error');
    return;
  }
  
  try {
    // Create gradient from scene palette for WLED
    const gradientColors = scene.bulbs.map(bulb => bulb.color);
    const gradientString = gradientColors.join(',');
    
    // Apply to individual LIFX bulbs with calculated colors
    const bulbPromises = scene.bulbs.map(bulb => {
      // Convert hex color to HSL for LIFX
      const hex = bulb.color.replace('#', '');
      const r = parseInt(hex.substr(0, 2), 16) / 255;
      const g = parseInt(hex.substr(2, 2), 16) / 255;
      const b = parseInt(hex.substr(4, 2), 16) / 255;
      
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const l = (max + min) / 2;
      
      let h, s;
      if (max === min) {
        h = s = 0; // achromatic
      } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = (g - b) / d + (g < b ? 6 : 0); break;
          case g: h = (b - r) / d + 2; break;
          case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
      }
      
      // Convert to LIFX format (0-100 for hue, 0-100 for saturation)
      const hue = Math.round(h * 100);
      const saturation = Math.round(s * 100);
      
      // Send commands to individual bulb
      const promises = [
        // Set color
        fetch(`${MAKER_API_BASE}/devices/${bulb.deviceId}/setColor/${encodeURIComponent(JSON.stringify({hue: hue, saturation: saturation, level: bulb.brightness}))}?access_token=${ACCESS_TOKEN}`),
        // Set brightness
        fetch(`${MAKER_API_BASE}/devices/${bulb.deviceId}/setLevel/${bulb.brightness}?access_token=${ACCESS_TOKEN}`),
        // Turn on
        fetch(`${MAKER_API_BASE}/devices/${bulb.deviceId}/on?access_token=${ACCESS_TOKEN}`)
      ];
      
      return Promise.all(promises);
    });
    
    // Apply to WLED device with gradient and Puddles effect
    const wledPromises = [
      // Set custom gradient and apply Puddles effect (FX=89 is Puddles)
      fetch(`http://${WLED_DEVICES.lrwall}/win&CL=${gradientString}&FX=89&A=${scene.wled.brightness}&SA=0&SB=300&SC=1&SE=1`)
    ];
    
    // Wait for all promises to complete with 1-second duration for smooth transitions
    await Promise.all([...bulbPromises.flat(), ...wledPromises]);
    
    showToast(`Scene "${sceneName}" applied successfully!`, 'success');
    
    // Update UI feedback
    const feedback = document.getElementById('sceneFeedback');
    if (feedback) {
      feedback.textContent = `Scene "${sceneName}" applied!`;
      feedback.style.display = 'block';
      setTimeout(() => { feedback.style.display = 'none'; }, 1800);
    }
    
  } catch (error) {
    console.error('Failed to apply scene:', error);
    showToast(`Failed to apply scene: ${error.message}`, 'error');
  }
}

// WLED Effects Modal with Bubble Theme
function showWledEffectsModal() {
  const buttons = [
    { icon: '🎨', label: 'Palettes', onclick: 'showWledPalettesModal()' },
    { icon: '✨', label: 'Effects', onclick: 'showWledFxModal()' }
  ];
  
  let html = `<div class="modal-header">WLED Effects</div>
    <div class="bubble-ring count-${buttons.length}">`;
  
  for (let i = 0; i < buttons.length; i++) {
    html += `<button class="bubble-btn wled-button i-${i}" onclick='${buttons[i].onclick}'>
      <span class="icon">${buttons[i].icon}</span>
      <span class="label">${buttons[i].label}</span>
    </button>`;
  }
  
  html += `</div>`;
  
  showModal(html, { showBack: true });
}

// WLED Palettes Modal
window.showWledPalettesModal = function() {
  const palettes = [
    {name:'Sunset', id: 45},
    {name:'Tropical', id: 37},
    {name:'Party', id: 65},
    {name:'Forest', id: 55},
    {name:'Rainbow', id: 0}
  ];
  
  let html = `<div class="modal-header">WLED Palettes</div>
    <div class="bubble-ring count-${palettes.length}">`;
  
  for (let i = 0; i < palettes.length; i++) {
    html += `<button class="bubble-btn wled-button i-${i}" onclick='applyWledPalette(${palettes[i].id},"${palettes[i].name}")'>
      <span class="icon">🎨</span>
      <span class="label">${palettes[i].name}</span>
    </button>`;
  }
  
  html += `</div>
    <div id='wledFeedback' class="toast"></div>`;
  
  showModal(html, { showBack: true });
}

window.applyWledPalette = function(id, name) {
  // Apply to LRWall WLED device
  fetch(`http://${WLED_DEVICES.lrwall}/win&FP=${id}`)
    .then(() => {
      const feedback = document.getElementById('wledFeedback');
      if (feedback) {
        feedback.textContent = `Palette "${name}" applied!`;
        feedback.style.display = 'block';
        setTimeout(() => { feedback.style.display = 'none'; }, 1800);
      }
      showToast(`WLED palette "${name}" applied!`, 'success');
    })
    .catch(err => {
      console.error('Failed to apply WLED palette:', err);
      showToast(`Failed to apply palette: ${err.message}`, 'error');
    });
}

// WLED Effects Modal
window.showWledFxModal = function() {
  const effects = [
    {name:'Rainbow', id: 0},
    {name:'Fireworks', id: 65},
    {name:'Colorloop', id: 51},
    {name:'Breathe', id: 24},
    {name:'Twinkle', id: 20}
  ];
  
  let html = `<div class="modal-header">WLED Effects</div>
    <div class="bubble-ring count-${effects.length}">`;
  
  for (let i = 0; i < effects.length; i++) {
    html += `<button class="bubble-btn wled-button i-${i}" onclick='applyWledEffect(${effects[i].id},"${effects[i].name}")'>
      <span class="icon">✨</span>
      <span class="label">${effects[i].name}</span>
    </button>`;
  }
  
  html += `</div>
    <div id='wledFeedback' class="toast"></div>`;
  
  showModal(html, { showBack: true });
}

window.applyWledEffect = function(id, name) {
  // Apply to LRWall WLED device
  fetch(`http://${WLED_DEVICES.lrwall}/win&FX=${id}`)
    .then(() => {
      const feedback = document.getElementById('wledFeedback');
      if (feedback) {
        feedback.textContent = `Effect "${name}" applied!`;
        feedback.style.display = 'block';
        setTimeout(() => { feedback.style.display = 'none'; }, 1800);
      }
      showToast(`WLED effect "${name}" applied!`, 'success');
    })
    .catch(err => {
      console.error('Failed to apply WLED effect:', err);
      showToast(`Failed to apply effect: ${err.message}`, 'error');
    });
}

function bubbleChartBubbleClick(label, id) {
  if (['452','449','446','470'].includes(id)) {
    openDeviceModal(label, id, true);
  } else if (id === 'scenes') {
    showScenesModal();
  } else if (id === 'wled') {
    showWledEffectsModal();
  } else if (id === 'global') {
    showGlobalControlsModal();
  } else {
    showModal(`<div class="modal-header">${label}</div>
      <div class="coming-soon">Controls for <b>${label}</b> coming soon...</div>`, { showBack: true });
  }
}

// Global Controls Modal - Uses LRGroup
function showGlobalControlsModal() {
  const buttons = [
    { icon: '🔆', label: 'All On', onclick: "sendGlobalCommand('on')" },
    { icon: '🌙', label: 'All Off', onclick: "sendGlobalCommand('off')" },
    { icon: '🔅', label: 'Dim', onclick: "sendGlobalCommand('setLevel', 30)" },
    { icon: '☀️', label: 'Bright', onclick: "sendGlobalCommand('setLevel', 100)" }
  ];
  
  let html = `<div class="modal-header">Global Controls</div>
    <div class="bubble-ring count-${buttons.length}">`;
  
  for (let i = 0; i < buttons.length; i++) {
    html += `<button class="bubble-btn control-button i-${i}" onclick='${buttons[i].onclick}'>
      <span class="icon">${buttons[i].icon}</span>
      <span class="label">${buttons[i].label}</span>
    </button>`;
  }
  
  html += `</div>
    <div id='globalFeedback' class="toast"></div>`;
  
  showModal(html, { showBack: true });
}

function renderGlobalControls(device) {
  const attr = device.attributes || {};
  const isOn = attr.switch === 'on';
  const level = attr.level || 0;
  const hue = attr.hue || 0;
  const sat = attr.saturation || 0;
  
  let html = '';
  
  html += `<div class="global-controls-section">
    <div class="global-power-toggle">
      <button class="btn ${isOn ? 'btn-success' : 'btn-danger'}" onclick="sendGlobalCommand('${isOn ? 'off' : 'on'}')">
        <span class="icon">${isOn ? '🔆' : '🌙'}</span>
        <span class="label">${isOn ? 'On' : 'Off'}</span>
      </button>
    </div>
  </div>`;
  
  html += `<div class="modal-sliders">`;
  
  html += `<div class="slider-container">
    <label>Brightness:</label>
    <input type="range" id="globalLevelSlider" min="1" max="100" value="${level}" class="slider-input">
    <span id="globalLevelVal" class="slider-value">${level}%</span>
  </div>`;
  
  html += `<div class="slider-container">
    <label>Hue:</label>
    <input type="range" id="globalHueSlider" min="0" max="100" value="${hue}" class="slider-input">
    <span id="globalHueVal" class="slider-value">${hue}</span>
  </div>`;
  
  html += `<div class="slider-container">
    <label>Saturation:</label>
    <input type="range" id="globalSatSlider" min="0" max="100" value="${sat}" class="slider-input">
    <span id="globalSatVal" class="slider-value">${sat}</span>
  </div>`;
  
  html += `</div>`;
  
  html += `<div class="global-refresh-button">
    <button id='globalRefreshBtn' class='btn btn-primary'>
      <span class="icon">🔄</span>
      <span class="label">Refresh</span>
    </button>
  </div>`;
  
  document.getElementById('globalControls').innerHTML = html;
  
  // Event listeners
  document.getElementById('globalLevelSlider').oninput = function() {
    document.getElementById('globalLevelVal').textContent = this.value + '%';
  };
  document.getElementById('globalLevelSlider').onchange = function() {
    sendGlobalCommand('setLevel', this.value);
  };
  
  document.getElementById('globalHueSlider').oninput = function() {
    document.getElementById('globalHueVal').textContent = this.value;
  };
  document.getElementById('globalHueSlider').onchange = function() {
    sendGlobalCommand('setHue', this.value);
  };
  
  document.getElementById('globalSatSlider').oninput = function() {
    document.getElementById('globalSatVal').textContent = this.value;
  };
  document.getElementById('globalSatSlider').onchange = function() {
    sendGlobalCommand('setSaturation', this.value);
  };
  
  document.getElementById('globalRefreshBtn').onclick = function() {
    document.getElementById('globalControls').innerHTML = '<em>Refreshing...</em>';
    fetch(`${MAKER_API_BASE}/devices/${LRGROUP_ID}?access_token=${ACCESS_TOKEN}`)
      .then(res => res.json())
      .then(device => {
        renderGlobalControls(device);
      })
      .catch(err => {
        document.getElementById('globalControls').innerHTML = `<div class="error-message">Failed to refresh global state.</div>`;
      });
  };
}

window.sendGlobalCommand = function(command, value) {
  let url = `${MAKER_API_BASE}/devices/${LRGROUP_ID}/${command}`;
  if (value !== undefined) url += `/${value}`;
  url += `?access_token=${ACCESS_TOKEN}`;
  
  fetch(url)
    .then(res => res.json())
    .then(data => {
      const feedback = document.getElementById('globalFeedback');
      if (feedback) {
        feedback.textContent = `Global command "${command}" sent!`;
        feedback.style.display = 'block';
        setTimeout(() => { feedback.style.display = 'none'; }, 1800);
      }
      showToast(`Global command sent successfully!`, 'success');
    })
    .catch(err => {
      console.error('Failed to send global command:', err);
      showToast(`Failed to send command: ${err.message}`, 'error');
    });
}

// Scene Manager for handling scene-related functionality
const sceneManager = {
  getScenePreviewHTML() {
    const sceneCount = lifxScenes.length;
    let html = `<div class="label-badge">Choose a Scene</div>
      <div class="bubble-ring count-${sceneCount}">`;
    
    for (let i = 0; i < sceneCount; i++) {
      const slug = lifxScenes[i].name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const bg = lifxScenes[i].gradient || '';
      html += `<button class="bubble-btn scene-button scene-${slug} i-${i}" style="background: ${bg};" onclick='applyLifxScene("${lifxScenes[i].name}")'>
        <span class="icon">🎨</span>
        <span class="label">${lifxScenes[i].name}</span>
      </button>`;
    }
    
    html += `</div>
      <div id='sceneFeedback' class="toast"></div>`;
    
    return html;
  }
};

// Export for use in other modules
export { sceneManager }; 