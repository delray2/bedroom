// Enhanced Scene System with Individual Bulb Control and LIFX Theme-Inspired Palettes
window.lifxScenes = [
  {
    name: 'Focusing',
    gradient: 'radial-gradient(circle at 30% 30%, #ffffff 0%, #f8f9fa 35%, #e9ecef 70%, #dee2e6 100%)',
    bulbs: [
      { deviceId: '480', color: '#ffffff', brightness: 100, temp: 4000 }, // Bedroom Fan 1 - Pure white
      { deviceId: '451', color: '#f8f9fa', brightness: 95, temp: 4000 },   // Bedroom Fan 2 - Soft white
      { deviceId: '447', color: '#e9ecef', brightness: 90, temp: 4000 }   // Bed Lamp - Light gray
    ],
    wled: {
      palette: 0,  // Default palette
      effect: 0,   // Solid
      brightness: 128,
      color: '#ffffff'
    },
    beamPalette: ['#ffffff', '#f8f9fa', '#e9ecef', '#dee2e6']  // Clean, focused palette
  },
  {
    name: 'Evening',
    gradient: 'conic-gradient(from 200deg at 50% 50%, #ff6b35 0%, #f7931e 25%, #ffd23f 50%, #ff8c42 75%, #ff4757 100%)',
    bulbs: [
      { deviceId: '480', color: '#ff6b35', brightness: 80, temp: 2700 },  // Bedroom Fan 1 - Warm orange
      { deviceId: '451', color: '#ffd23f', brightness: 70, temp: 3000 },  // Bedroom Fan 2 - Golden yellow
      { deviceId: '447', color: '#ff8c42', brightness: 60, temp: 3500 }   // Bed Lamp - Soft orange
    ],
    wled: {
      palette: 45, // Sunset palette
      effect: 0,   // Solid
      brightness: 128
    },
    beamPalette: ['#ff6b35', '#f7931e', '#ffd23f', '#ff8c42', '#ff4757']  // Warm evening palette
  },
  {
    name: 'Calm',
    gradient: 'radial-gradient(circle at 40% 30%, #4a90e2 0%, #7bb3f0 25%, #a8d0f0 50%, #c7e9f1 75%, #e8f4fd 100%)',
    bulbs: [
      { deviceId: '480', color: '#4a90e2', brightness: 85, temp: 6500 },  // Bedroom Fan 1 - Deep blue
      { deviceId: '451', color: '#7bb3f0', brightness: 75, temp: 7000 },  // Bedroom Fan 2 - Sky blue
      { deviceId: '447', color: '#a8d0f0', brightness: 65, temp: 6000 }   // Bed Lamp - Light blue
    ],
    wled: {
      palette: 37, // Tropical palette
      effect: 0,   // Solid
      brightness: 128
    },
    beamPalette: ['#4a90e2', '#7bb3f0', '#a8d0f0', '#c7e9f1', '#e8f4fd']  // Calm blue palette
  },
  {
    name: 'Gentle',
    gradient: 'radial-gradient(circle at 60% 40%, #2d5016 0%, #4a7c59 25%, #6b8e23 50%, #9acd32 75%, #f0f8e8 100%)',
    bulbs: [
      { deviceId: '480', color: '#2d5016', brightness: 80, temp: 5000 },  // Bedroom Fan 1 - Dark green
      { deviceId: '451', color: '#4a7c59', brightness: 70, temp: 5500 },  // Bedroom Fan 2 - Forest green
      { deviceId: '447', color: '#6b8e23', brightness: 60, temp: 5200 }   // Bed Lamp - Olive green
    ],
    wled: {
      palette: 55, // Forest palette
      effect: 0,   // Solid
      brightness: 128
    },
    beamPalette: ['#2d5016', '#4a7c59', '#6b8e23', '#9acd32', '#f0f8e8']  // Gentle nature palette
  },
  {
    name: 'Hygge',
    gradient: 'radial-gradient(circle at 50% 45%, #ffd700 0%, #ffb347 25%, #ff8c42 50%, #ff6b35 75%, #ff4757 100%)',
    bulbs: [
      { deviceId: '480', color: '#ffd700', brightness: 60, temp: 2200 },  // Bedroom Fan 1 - Warm yellow
      { deviceId: '451', color: '#ffb347', brightness: 50, temp: 2500 },  // Bedroom Fan 2 - Orange
      { deviceId: '447', color: '#ff8c42', brightness: 40, temp: 2800 }   // Bed Lamp - Soft orange
    ],
    wled: {
      palette: 65, // Party palette
      effect: 0,   // Solid
      brightness: 100
    },
    beamPalette: ['#ffd700', '#ffb347', '#ff8c42', '#ff6b35', '#ff4757']  // Cozy hygge palette
  },
  {
    name: 'Fantasy',
    gradient: 'conic-gradient(from 90deg at 50% 50%, #ff61a6 0%, #a18cd1 25%, #4a90e2 50%, #7b68ee 75%, #9370db 100%)',
    bulbs: [
      { deviceId: '480', color: '#ff61a6', brightness: 75, temp: 3500 },  // Bedroom Fan 1 - Magenta
      { deviceId: '451', color: '#a18cd1', brightness: 65, temp: 4000 },  // Bedroom Fan 2 - Purple
      { deviceId: '447', color: '#4a90e2', brightness: 55, temp: 4500 }   // Bed Lamp - Blue
    ],
    wled: {
      palette: 0,  // Rainbow palette
      effect: 0,   // Solid
      brightness: 128
    },
    beamPalette: ['#ff61a6', '#a18cd1', '#4a90e2', '#7b68ee', '#9370db']  // Dreamy fantasy palette
  },
  {
    name: 'Cheerful',
    gradient: 'conic-gradient(at 50% 50%, #ffeb3b 0%, #ff9800 20%, #ff5722 40%, #e91e63 60%, #9c27b0 80%, #3f51b5 100%)',
    bulbs: [
      { deviceId: '480', color: '#ffeb3b', brightness: 85, temp: 4000 },  // Bedroom Fan 1 - Bright yellow
      { deviceId: '451', color: '#ff9800', brightness: 80, temp: 4200 },  // Bedroom Fan 2 - Orange
      { deviceId: '447', color: '#e91e63', brightness: 75, temp: 4500 }   // Bed Lamp - Pink
    ],
    wled: {
      palette: 0,  // Rainbow palette
      effect: 0,   // Solid
      brightness: 128
    },
    beamTheme: 'cheerful'  // Use LIFX cheerful theme
  },
  {
    name: 'Love',
    gradient: 'radial-gradient(circle at 40% 60%, #ff69b4 0%, #ff1493 25%, #ffc0cb 50%, #ffe4e1 75%, #fff0f5 100%)',
    bulbs: [
      { deviceId: '480', color: '#ff69b4', brightness: 65, temp: 3000 },  // Bedroom Fan 1 - Hot pink
      { deviceId: '451', color: '#ffc0cb', brightness: 55, temp: 3200 },  // Bedroom Fan 2 - Light pink
      { deviceId: '447', color: '#ff1493', brightness: 45, temp: 3100 }   // Bed Lamp - Deep pink
    ],
    wled: {
      palette: 45, // Sunset palette
      effect: 0,   // Solid
      brightness: 80
    },
    beamPalette: ['#ff69b4', '#ff1493', '#ffc0cb', '#ffe4e1', '#fff0f5']  // Warm love palette
  }
];

// WLED Device IPs - Direct HTTP API control (from CONFIG)
const WLED_DEVICES = {
  'bedroom1': window.CONFIG?.WLED?.BEDROOM_1 || '192.168.4.137',
  'bedroom2': window.CONFIG?.WLED?.BEDROOM_2 || '192.168.4.52'
};

// Safe access to Hubitat Maker API globals (from CONFIG)
const MAKER = window.CONFIG?.HUBITAT?.BASE_URL || '';
const TOKEN = window.CONFIG?.HUBITAT?.ACCESS_TOKEN || '';
const LRID = window.CONFIG?.DEVICES?.BEDROOM_GROUP || '';

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
    // Update paddle switch with scene gradient
    const paddleSwitch = document.getElementById('paddleSwitch');
    if (paddleSwitch) {
      paddleSwitch.style.background = scene.gradient;
      paddleSwitch.style.color = '#222';
      paddleSwitch.classList.add('on');
      paddleSwitch.classList.remove('off');
    }
    
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
    
    // Set LIFX Beam theme or custom palette if available
    let beamPalettePromise = Promise.resolve();
    if (window.lifxThemes) {
      // Always stop any running effects first
      beamPalettePromise = window.lifxThemes.stopEffects().then(() => {
        if (scene.beamTheme) {
          // Use predefined LIFX theme
          return window.lifxThemes.setThemeWithTransition(scene.beamTheme, 3);
        } else if (scene.beamPalette) {
          // Use custom palette
          return window.lifxThemes.setCustomPalette(scene.beamPalette, 3);
        }
        return Promise.resolve();
      });
    }
    
    // Wait for all promises to complete with 1-second duration for smooth transitions
    await Promise.all([...bulbPromises.flat(), ...wledPromises, beamPalettePromise]);
    
    // Store the applied scene for later reference
    window.currentAppliedScene = sceneName;
    
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
    fetch(window.CONFIG.WLED.commandUrl(WLED_DEVICES.bedroom1, `FP=${id}`)),
    fetch(window.CONFIG.WLED.commandUrl(WLED_DEVICES.bedroom2, `FP=${id}`))
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
    fetch(window.CONFIG.WLED.commandUrl(WLED_DEVICES.bedroom1, `FX=${id}`)),
    fetch(window.CONFIG.WLED.commandUrl(WLED_DEVICES.bedroom2, `FX=${id}`))
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
    openDeviceModal('Bedroom Lights', '457', true);
  } else {
    showModal(`<div class="modal-header">${label}</div>
      <div class="coming-soon">Controls for <b>${label}</b> coming soon...</div>`, { showBack: true });
  }
}

// Global Controls Modal - Now uses standard device modal system
// This function is kept for backward compatibility but redirects to standard device modal
function showGlobalControlsModal() {
  openDeviceModal('Bedroom Lights', '457', true);
}


// Expose for non-module callers
window.showGlobalControlsModal = showGlobalControlsModal;

// Global command functions removed - now using standard device modal system


// Send command to BedroomLifxGOG device using Hubitat API
function sendBedroomLightsCommand(command, value) {
  const BEDROOM_LIGHTS_ID = window.CONFIG.DEVICES.BEDROOM_GROUP;
  const url = window.CONFIG.HUBITAT.deviceCommandUrl(BEDROOM_LIGHTS_ID, command, value);
  
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

// renderGlobalControls removed - now using standard device modal system

// sendGlobalCommand removed - now using standard device modal system

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