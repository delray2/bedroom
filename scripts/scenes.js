// Enhanced Scene System with Individual Bulb Control and Calculated Color Palettes
const lifxScenes = [
  {
    name: 'White',
    gradient: 'radial-gradient(circle at 30% 30%, #ffffff 0%, #f7f7f7 35%, #ebebeb 70%, #dcdcdc 100%)',
    bulbs: [
      { deviceId: '480', color: '#ffffff', brightness: 100, temp: 4000 }, // Bedroom Fan 1
      { deviceId: '451', color: '#ffffff', brightness: 100, temp: 4000 }, // Bedroom Fan 2
      { deviceId: '447', color: '#ffffff', brightness: 100, temp: 4000 }  // Bed Lamp
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
      { deviceId: '480', color: '#ff4500', brightness: 80, temp: 2700 },  // Bedroom Fan 1 - Red-orange
      { deviceId: '451', color: '#ffd700', brightness: 70, temp: 3000 },  // Bedroom Fan 2 - Gold
      { deviceId: '447', color: '#ff6347', brightness: 60, temp: 3500 }   // Bed Lamp - Tomato red
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
      { deviceId: '480', color: '#000080', brightness: 85, temp: 6500 },  // Bedroom Fan 1 - Navy blue
      { deviceId: '451', color: '#00bfff', brightness: 75, temp: 7000 },  // Bedroom Fan 2 - Deep sky blue
      { deviceId: '447', color: '#87ceeb', brightness: 65, temp: 6000 }   // Bed Lamp - Sky blue
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
      { deviceId: '480', color: '#2d5016', brightness: 80, temp: 5000 },  // Bedroom Fan 1 - Dark green
      { deviceId: '451', color: '#4a7c59', brightness: 70, temp: 5500 },  // Bedroom Fan 2 - Forest green
      { deviceId: '447', color: '#ffffff', brightness: 60, temp: 5200 }   // Bed Lamp - White
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
      { deviceId: '480', color: '#ffd452', brightness: 60, temp: 2200 },  // Bedroom Fan 1 - Warm yellow
      { deviceId: '451', color: '#ffb347', brightness: 50, temp: 2500 },  // Bedroom Fan 2 - Orange
      { deviceId: '447', color: '#ff6961', brightness: 40, temp: 2800 }   // Bed Lamp - Soft red
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
      { deviceId: '480', color: '#ff61a6', brightness: 75, temp: 3500 },  // Bedroom Fan 1 - Magenta
      { deviceId: '451', color: '#a18cd1', brightness: 65, temp: 4000 },  // Bedroom Fan 2 - Purple
      { deviceId: '447', color: '#4a90e2', brightness: 55, temp: 4500 }   // Bed Lamp - Blue
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
      { deviceId: '480', color: '#00ff87', brightness: 70, temp: 5000 },  // Bedroom Fan 1 - Spring green
      { deviceId: '451', color: '#00ffff', brightness: 60, temp: 6000 },  // Bedroom Fan 2 - Cyan
      { deviceId: '447', color: '#8000ff', brightness: 50, temp: 7000 }   // Bed Lamp - Purple
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
      { deviceId: '480', color: '#ff9a9e', brightness: 65, temp: 3000 },  // Bedroom Fan 1 - Soft pink
      { deviceId: '451', color: '#fecfef', brightness: 55, temp: 3200 },  // Bedroom Fan 2 - Light pink
      { deviceId: '447', color: '#ffb3ba', brightness: 45, temp: 3100 }   // Bed Lamp - Medium pink
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
  'bedroom1': '192.168.4.137',   // Bedroom WLED device 1
  'bedroom2': '192.168.4.52'     // Bedroom WLED device 2
};

// Safe access to Hubitat Maker API globals
const MAKER = typeof window !== 'undefined' ? (window.MAKER_API_BASE || '') : '';
const TOKEN = typeof window !== 'undefined' ? (window.ACCESS_TOKEN || '') : '';
const LRID = typeof window !== 'undefined' ? (window.BEDROOM_LIGHTS_ID || '') : '';

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
  
  window.showModal(html, { showBack: true });
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
        fetch(`${MAKER}/devices/${bulb.deviceId}/setColor/${encodeURIComponent(JSON.stringify({hue: hue, saturation: saturation, level: bulb.brightness}))}?access_token=${TOKEN}`),
        // Set brightness
        fetch(`${MAKER}/devices/${bulb.deviceId}/setLevel/${bulb.brightness}?access_token=${TOKEN}`),
        // Turn on
        fetch(`${MAKER}/devices/${bulb.deviceId}/on?access_token=${TOKEN}`)
      ];
      
      return Promise.all(promises);
    });
    
    // Apply to WLED devices with gradient and Puddles effect
    const wledPromises = [
      // Set custom gradient and apply Puddles effect (FX=89 is Puddles) to both bedroom WLED devices
      fetch(`http://${WLED_DEVICES.bedroom1}/win&CL=${gradientString}&FX=89&A=${scene.wled.brightness}&SA=0&SB=300&SC=1&SE=1`),
      fetch(`http://${WLED_DEVICES.bedroom2}/win&CL=${gradientString}&FX=89&A=${scene.wled.brightness}&SA=0&SB=300&SC=1&SE=1`)
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
  
  window.showModal(html, { showBack: true });
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
  
  window.showModal(html, { showBack: true });
}

window.applyWledPalette = function(id, name) {
  // Apply to both bedroom WLED devices
  Promise.all([
    fetch(`http://${WLED_DEVICES.bedroom1}/win&FP=${id}`),
    fetch(`http://${WLED_DEVICES.bedroom2}/win&FP=${id}`)
  ])
    .then(() => {
      const feedback = document.getElementById('wledFeedback');
      if (feedback) {
        feedback.textContent = `Palette "${name}" applied to both bedroom WLED devices!`;
        feedback.style.display = 'block';
        setTimeout(() => { feedback.style.display = 'none'; }, 1800);
      }
      showToast(`WLED palette "${name}" applied to both bedroom WLED devices!`, 'success');
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
  
  window.showModal(html, { showBack: true });
}

window.applyWledEffect = function(id, name) {
  // Apply to both bedroom WLED devices
  Promise.all([
    fetch(`http://${WLED_DEVICES.bedroom1}/win&FX=${id}`),
    fetch(`http://${WLED_DEVICES.bedroom2}/win&FX=${id}`)
  ])
    .then(() => {
      const feedback = document.getElementById('wledFeedback');
      if (feedback) {
        feedback.textContent = `Effect "${name}" applied to both bedroom WLED devices!`;
        feedback.style.display = 'block';
        setTimeout(() => { feedback.style.display = 'none'; }, 1800);
      }
      showToast(`WLED effect "${name}" applied to both bedroom WLED devices!`, 'success');
    })
    .catch(err => {
      console.error('Failed to apply WLED effect:', err);
      showToast(`Failed to apply effect: ${err.message}`, 'error');
    });
}

function bubbleChartBubbleClick(label, id) {
  if (['447','450','449','451'].includes(id)) {
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
    { icon: '🔆', label: 'All On',  onclick: "globalAllOn()",   cls: 'btn-all-on' },
    { icon: '🌙', label: 'All Off', onclick: "globalAllOff()",  cls: 'btn-all-off' },
    { icon: '🔅', label: 'Dim',     onclick: "globalDim()",     cls: 'btn-dim' },
    { icon: '☀️', label: 'Bright',  onclick: "globalBright()",  cls: 'btn-bright' }
  ];

  let html = `<div class="bubble-ring global-ring-top" style="--radius: 180px;">`;

  // ring buttons
  const startDeg = -140, endDeg = -40;
  const steps = buttons.length - 1 || 1;
  for (let i = 0; i < buttons.length; i++) {
    const t = i / steps;
    const deg = startDeg + t * (endDeg - startDeg);
    html += `<button class="bubble-btn global-btn ${buttons[i].cls}" style="transform: translate(-50%,-50%) rotate(${deg}deg) translateY(calc(-1 * var(--radius))) rotate(${-deg}deg);" onclick="${buttons[i].onclick}">
      <span class="icon">${buttons[i].icon}</span>
      <span class="label">${buttons[i].label}</span>
    </button>`;
  }

  // controls
  html += `<div class="controls-group" style="display: flex; gap: 8px; justify-content: center;">`;

  // HUE Slider (Kawaii style)
  html += `
    <div class="slider-wrapper" style="display: flex; flex-direction: column; align-items: center;">
      <svg class="kawaii-slider" width="60" height="260">
        <defs>
          <linearGradient id="hueGradient" x1="0%" y1="0%" x2="0%" y2="100%">
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
        <path id="bgHue" d="M20 230 C 50 200, 50 60, 20 30" stroke="#e4e4e4" stroke-width="30" fill="none" stroke-linecap="round" />
        <path id="progressHue" d="M20 230 C 50 200, 50 60, 20 30" stroke="url(#hueGradient)" stroke-width="30" fill="none" stroke-linecap="round" stroke-dasharray="1" stroke-dashoffset="1" />
      </svg>
      <div class="value" id="valHue" style="margin-top: 0.5rem; font-weight: bold; color: #ff0000;">0</div>
      <div style="font-size: 12px; color: #666;">Hue</div>
    </div>`;

  // LEVEL Slider (Kawaii style)
  html += `
    <div class="slider-wrapper" style="display: flex; flex-direction: column; align-items: center;">
      <svg class="kawaii-slider" width="60" height="260">
        <defs>
          <linearGradient id="lvlGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#ffffff" />
            <stop offset="50%" stop-color="#777777" />
            <stop offset="100%" stop-color="#000000" />
          </linearGradient>
        </defs>
        <path id="bgLvl" d="M20 230 C 50 200, 50 60, 20 30" stroke="#e4e4e4" stroke-width="30" fill="none" stroke-linecap="round" />
        <path id="progressLvl" d="M20 230 C 50 200, 50 60, 20 30" stroke="url(#lvlGradient)" stroke-width="30" fill="none" stroke-linecap="round" stroke-dasharray="1" stroke-dashoffset="1" />
      </svg>
      <div class="value" id="valLvl" style="margin-top: 0.5rem; font-weight: bold; color: #333333;">0%</div>
      <div style="font-size: 12px; color: #666;">Bright</div>
    </div>`;

  // SAT Slider (Kawaii style)
  html += `
    <div class="slider-wrapper" style="display: flex; flex-direction: column; align-items: center;">
      <svg class="kawaii-slider" width="60" height="260">
        <defs>
          <linearGradient id="satGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#ff0000" />
            <stop offset="50%" stop-color="#ff8080" />
            <stop offset="100%" stop-color="#ffffff" />
          </linearGradient>
        </defs>
        <path id="bgSat" d="M20 230 C 50 200, 50 60, 20 30" stroke="#e4e4e4" stroke-width="30" fill="none" stroke-linecap="round" />
        <path id="progressSat" d="M20 230 C 50 200, 50 60, 20 30" stroke="url(#satGradient)" stroke-width="30" fill="none" stroke-linecap="round" stroke-dasharray="1" stroke-dashoffset="1" />
      </svg>
      <div class="value" id="valSat" style="margin-top: 0.5rem; font-weight: bold; color: #ff0000;">0</div>
      <div style="font-size: 12px; color: #666;">Sat</div>
    </div>`;

  html += `</div></div>`;

  window.showModal(html, true);

  // Setup kawaii sliders
  setTimeout(() => {
    try {
      setupKawaiiSlider('bgHue', 'progressHue', 'valHue', 'setHue');
      setupKawaiiSlider('bgLvl', 'progressLvl', 'valLvl', 'setLevel');
      setupKawaiiSlider('bgSat', 'progressSat', 'valSat', 'setSaturation');
    } catch (error) {
      console.error('Error setting up kawaii sliders:', error);
    }
  }, 100);

  // fetch BedroomLifxGOG and render controls
  const BEDROOM_LIGHTS_ID = window.BEDROOM_GROUP_ID; // BedroomLifxGOG device ID
  if (window.deviceStateManager) {
    window.deviceStateManager.refreshDevice(BEDROOM_LIGHTS_ID)
      .then(() => {
        const attrs = window.deviceStateManager.getDevice(BEDROOM_LIGHTS_ID) || {};
        renderGlobalControls({ attributes: attrs });
      })
      .catch(() => { console.error('Failed to load BedroomLifxGOG state from state manager.'); });
  }
}


// Expose for non-module callers
window.showGlobalControlsModal = showGlobalControlsModal;

// Wrapper helpers for inline buttons
window.globalAllOn = () => window.sendGlobalCommand('on');
window.globalAllOff = () => window.sendGlobalCommand('off');
window.globalDim = () => window.sendGlobalCommand('setLevel', 30);
window.globalBright = () => window.sendGlobalCommand('setLevel', 100);

// --- Wire kawaii slider interactions ---
const setupKawaiiSlider = (bgId, progressId, valueId, command) => {
  const bgPath = document.getElementById(bgId);
  const prog = document.getElementById(progressId);
  const valBox = document.getElementById(valueId);
  
  if (!bgPath || !prog || !valBox) {
    console.error(`Missing slider elements: ${bgId}, ${progressId}, ${valueId}`);
    return;
  }
  
  const length = bgPath.getTotalLength();
  prog.setAttribute("stroke-dasharray", length);
  prog.setAttribute("stroke-dashoffset", length);
  
  let dragging = false;
  let currentValue = 0;
  
  function move(e) {
    const rect = bgPath.getBoundingClientRect();
    const y = e.clientY - rect.top;
    let t = 1 - (y / rect.height);
    t = Math.max(0, Math.min(1, t));
    
    // Update visual progress
    prog.setAttribute("stroke-dashoffset", (1 - t) * length);
    
    // Calculate value based on slider type
    let value;
    if (valueId === 'valLvl') {
      // Level: 1-100%
      value = Math.max(1, Math.round(t * 100));
      valBox.textContent = `${value}%`;
    } else {
      // Hue and Saturation: 0-100
      value = Math.round(t * 100);
      valBox.textContent = value;
    }
    
    currentValue = value;
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
    
    // Send command to BedroomLifxGOG device (ID: 478)
    sendBedroomLightsCommand(command, currentValue);
  }
  
  // Mouse events
  bgPath.addEventListener("mousedown", startDrag);
  prog.addEventListener("mousedown", startDrag);
  window.addEventListener("mouseup", endDrag);
  
  // Touch events
  bgPath.addEventListener("touchstart", (e) => {
    const touch = e.touches[0];
    startDrag({ clientY: touch.clientY, preventDefault: () => e.preventDefault(), stopPropagation: () => e.stopPropagation() });
  });
  
  prog.addEventListener("touchstart", (e) => {
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
  bgPath.addEventListener("click", (e) => {
    if (!dragging) {
      move(e);
      sendBedroomLightsCommand(command, currentValue);
    }
  });
  
  prog.addEventListener("click", (e) => {
    if (!dragging) {
      move(e);
      sendBedroomLightsCommand(command, currentValue);
    }
  });
};

// Send command to BedroomLifxGOG device using Hubitat API
function sendBedroomLightsCommand(command, value) {
  const BEDROOM_LIGHTS_ID = window.BEDROOM_GROUP_ID; // BedroomLifxGOG device ID
  const API_BASE = 'http://192.168.4.44/apps/api/37'; // From localUrls.md
  const ACCESS_TOKEN = 'b9846a66-8bf8-457a-8353-fd16d511a0af'; // From localUrls.md
  
  let url = `${API_BASE}/devices/${BEDROOM_LIGHTS_ID}/${command}`;
  if (value !== undefined) {
    url += `/${value}`;
  }
  url += `?access_token=${ACCESS_TOKEN}`;
  
  fetch(url)
    .then(res => res.text())
    .then(() => {
      console.log(`BedroomLifxGOG command sent: ${command}${value ? ` = ${value}` : ''}`);
      showToast(`BedroomLifxGOG ${command} ${value ? value : 'command'} sent!`, 'success');
    })
    .catch(err => {
      console.error('Failed to send BedroomLifxGOG command:', err);
      showToast(`Failed to control BedroomLifxGOG: ${err.message}`, 'error');
    });
}

function renderGlobalControls(device) {
  const attr = device.attributes || {};
  const isOn = attr.switch === 'on';
  const level = Number(attr.level || 0);
  const hue = Number(attr.hue || 0);
  const sat = Number(attr.saturation || 0);
  
  console.log('BedroomLifxGOG state:', { isOn, level, hue, sat });
  
  // Update kawaii slider values and visual progress
  const valLvl = document.getElementById('valLvl');
  const valHue = document.getElementById('valHue');
  const valSat = document.getElementById('valSat');
  
  const bgLvl = document.getElementById('bgLvl');
  const bgHue = document.getElementById('bgHue');
  const bgSat = document.getElementById('bgSat');
  
  const progressLvl = document.getElementById('progressLvl');
  const progressHue = document.getElementById('progressHue');
  const progressSat = document.getElementById('progressSat');
  
  // Update text values
  if (valLvl) valLvl.textContent = `${Math.max(1, level)}%`;
  if (valHue) valHue.textContent = `${hue}`;
  if (valSat) valSat.textContent = `${sat}`;
  
  // Update visual progress for kawaii sliders
  if (bgLvl && progressLvl) {
    const length = bgLvl.getTotalLength();
    const progress = level / 100; // 0 to 1
    progressLvl.setAttribute('stroke-dasharray', length);
    progressLvl.setAttribute('stroke-dashoffset', (1 - progress) * length);
  }
  
  if (bgHue && progressHue) {
    const length = bgHue.getTotalLength();
    const progress = hue / 100; // 0 to 1
    progressHue.setAttribute('stroke-dasharray', length);
    progressHue.setAttribute('stroke-dashoffset', (1 - progress) * length);
  }
  
  if (bgSat && progressSat) {
    const length = bgSat.getTotalLength();
    const progress = sat / 100; // 0 to 1
    progressSat.setAttribute('stroke-dasharray', length);
    progressSat.setAttribute('stroke-dashoffset', (1 - progress) * length);
  }
}

window.sendGlobalCommand = function(command, value) {
  const targetId = window.BEDROOM_GROUP_ID; // Global controls target the Bedroom Lights group
  let url = `${window.MAKER_API_BASE}/devices/${targetId}/${command}`;
  if (value !== undefined) url += `/${value}`;
  url += `?access_token=${window.ACCESS_TOKEN}`;
  
  fetch(url)
    .then(res => res.text())
    .then(() => {
      const feedback = document.getElementById('globalFeedback');
      if (feedback) {
        feedback.textContent = `Global command "${command}" sent!`;
        feedback.style.display = 'block';
        setTimeout(() => { feedback.style.display = 'none'; }, 1800);
      }
      showToast(`Global command sent successfully!`, 'success');
      // Do not fetch again; WS will update state manager. Optionally rate-limit refresh:
      // if needed: window.deviceStateManager.refreshDevice(targetId);
    })
    .catch(err => {
      console.error('Failed to send global command:', err);
      showToast(`Failed to send command: ${err.message}`, 'error');
    });
}

// Make power toggle wrapper stable for inline handler
window.globalPowerToggle = function() {
  // Fetch current, then invert
  fetch(`${window.MAKER_API_BASE}/devices/${window.BEDROOM_GROUP_ID_ID}?access_token=${window.ACCESS_TOKEN}`)
    .then(r => r.json())
    .then(dev => {
      const isOn = (Array.isArray(dev.attributes) ? (dev.attributes.find(a => a.name === 'switch')?.currentValue) : dev.attributes?.switch) === 'on';
      return window.sendGlobalCommand(isOn ? 'off' : 'on');
    })
    .catch(() => window.sendGlobalCommand('on'));
};

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

// Also expose on window for non-module callers
window.sceneManager = sceneManager; 