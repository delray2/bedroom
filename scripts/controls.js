// --- TV Modal (Fire TV and Roku TV) ---
function showTvModal() {
  let html = `<div class="rollershade-controls" style="width: 100%; height: 100%;">
      <button class="rollershade-btn tv-firetv" onclick='showFireTvModal()'>
        <span class="icon">🔥</span>
        <span class="label">Fire TV</span>
      </button>
      <button class="rollershade-btn tv-roku" onclick='showRokuTvModal()'>
        <span class="icon">📺</span>
        <span class="label">Roku TV</span>
      </button>
    </div>`;
  
  showModalContent(html, false, '.side-btn[title="TV"]');
}

// Fire TV Modal
window.showFireTvModal = function() {
  let html = `<div class="fire-tv-remote">
      <!-- Top Row: Power, Home, Back -->
      <div class="remote-section top-row">
        <button class="remote-btn btn-power" onclick='fireTvSendCommand("power")'>
          <svg class="icon-svg" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 6v6"/>
          </svg>
          <div class="label">Power</div>
        </button>
        <button class="remote-btn btn-home" onclick='fireTvSendCommand("home")'>
          <svg class="icon-svg" viewBox="0 0 24 24">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9,22 9,12 15,12 15,22"/>
          </svg>
          <div class="label">Home</div>
        </button>
        <button class="remote-btn btn-back" onclick='fireTvSendCommand("back")'>
          <svg class="icon-svg" viewBox="0 0 24 24">
            <path d="M19 12H5"/>
            <path d="M12 19l-7-7 7-7"/>
          </svg>
          <div class="label">Back</div>
        </button>
      </div>
      
      <!-- D-Pad Cluster -->
      <div class="remote-section d-pad">
        <button class="remote-btn btn-up" onclick='fireTvSendCommand("up")'>
          <svg class="icon-svg" viewBox="0 0 24 24">
            <path d="M12 19V5"/>
            <path d="M5 12l7-7 7 7"/>
          </svg>
        </button>
        <button class="remote-btn btn-down" onclick='fireTvSendCommand("down")'>
          <svg class="icon-svg" viewBox="0 0 24 24">
            <path d="M12 5v14"/>
            <path d="M19 12l-7 7-7-7"/>
          </svg>
        </button>
        <button class="remote-btn btn-left" onclick='fireTvSendCommand("left")'>
          <svg class="icon-svg" viewBox="0 0 24 24">
            <path d="M19 12H5"/>
            <path d="M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <button class="remote-btn btn-right" onclick='fireTvSendCommand("right")'>
          <svg class="icon-svg" viewBox="0 0 24 24">
            <path d="M5 12h14"/>
            <path d="M12 5l7 7-7 7"/>
          </svg>
        </button>
        <button class="remote-btn btn-select" onclick='fireTvSendCommand("select")'>
          <svg class="icon-svg" viewBox="0 0 24 24">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
          <div class="label">OK</div>
        </button>
      </div>
      
      <!-- Volume Controls -->
      <div class="remote-section volume-controls">
        <button class="remote-btn btn-mute" onclick='fireTvSendCommand("mute")'>
          <svg class="icon-svg" viewBox="0 0 24 24">
            <polygon points="11,5 6,9 2,9 2,15 6,15 11,19 11,5"/>
            <line x1="23" y1="9" x2="17" y2="15"/>
            <line x1="17" y1="9" x2="23" y2="15"/>
          </svg>
          <div class="label">Mute</div>
        </button>
        <button class="remote-btn btn-vol-down" onclick='fireTvSendCommand("volumedown")'>
          <svg class="icon-svg" viewBox="0 0 24 24">
            <polygon points="11,5 6,9 2,9 2,15 6,15 11,19 11,5"/>
            <line x1="23" y1="9" x2="17" y2="15"/>
            <line x1="17" y1="9" x2="23" y2="15"/>
            <line x1="17" y1="12" x2="23" y2="12"/>
          </svg>
          <div class="label">Vol-</div>
        </button>
        <button class="remote-btn btn-vol-up" onclick='fireTvSendCommand("volumeup")'>
          <svg class="icon-svg" viewBox="0 0 24 24">
            <polygon points="11,5 6,9 2,9 2,15 6,15 11,19 11,5"/>
            <line x1="23" y1="9" x2="17" y2="15"/>
            <line x1="17" y1="9" x2="23" y2="15"/>
            <line x1="17" y1="12" x2="23" y2="12"/>
            <line x1="17" y1="9" x2="23" y2="9"/>
          </svg>
          <div class="label">Vol+</div>
        </button>
      </div>
      
      <!-- Media Controls -->
      <div class="remote-section media-controls">
        <button class="remote-btn btn-play" onclick='fireTvSendCommand("play")'>
          <svg class="icon-svg" viewBox="0 0 24 24">
            <polygon points="5,3 19,12 5,21"/>
          </svg>
          <div class="label">Play</div>
        </button>
        <button class="remote-btn btn-pause" onclick='fireTvSendCommand("pause")'>
          <svg class="icon-svg" viewBox="0 0 24 24">
            <rect x="6" y="4" width="4" height="16"/>
            <rect x="14" y="4" width="4" height="16"/>
          </svg>
          <div class="label">Pause</div>
        </button>
        <button class="remote-btn btn-stop" onclick='fireTvSendCommand("stop")'>
          <svg class="icon-svg" viewBox="0 0 24 24">
            <rect x="6" y="6" width="12" height="12"/>
          </svg>
          <div class="label">Stop</div>
        </button>
      </div>
      
      <!-- HDMI Inputs -->
      <div class="remote-section hdmi-inputs">
        <button class="remote-btn btn-hdmi1" onclick='fireTvSendCommand("hdmi1")'>
          <svg class="icon-svg" viewBox="0 0 24 24">
            <path d="M3 7h18v10H3z"/>
            <path d="M7 7v10"/>
            <path d="M17 7v10"/>
            <path d="M3 12h18"/>
            <path d="M7 3l5 4 5-4"/>
          </svg>
          <div class="label">HDMI1</div>
        </button>
        <button class="remote-btn btn-hdmi2" onclick='fireTvSendCommand("hdmi2")'>
          <svg class="icon-svg" viewBox="0 0 24 24">
            <path d="M3 7h18v10H3z"/>
            <path d="M7 7v10"/>
            <path d="M17 7v10"/>
            <path d="M3 12h18"/>
            <path d="M7 3l5 4 5-4"/>
          </svg>
          <div class="label">HDMI2</div>
        </button>
        <button class="remote-btn btn-hdmi3" onclick='fireTvSendCommand("hdmi3")'>
          <svg class="icon-svg" viewBox="0 0 24 24">
            <path d="M3 7h18v10H3z"/>
            <path d="M7 7v10"/>
            <path d="M17 7v10"/>
            <path d="M3 12h18"/>
            <path d="M7 3l5 4 5-4"/>
          </svg>
          <div class="label">HDMI3</div>
        </button>
      </div>
    </div>
    <div id='fireTvFeedback' class="toast"></div>`;

  showModalContent(html, true, '.side-btn[title="TV"]');
}

// Roku TV Modal - Full remote control layout
window.showRokuTvModal = function() {
  const rokuTvId = window.CONFIG.DEVICES.BEDROOM_TV; // Device 473
  let html = `<div class="fire-tv-remote">
      <!-- Top Row: Power, Home, Back -->
      <div class="remote-section top-row">
        <button class="remote-btn btn-power" onclick='rokuTvSendCommand("off")'>
          <svg class="icon-svg" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 6v6"/>
          </svg>
          <div class="label">Power</div>
        </button>
        <button class="remote-btn btn-home" onclick='rokuTvSendCommand("home")'>
          <svg class="icon-svg" viewBox="0 0 24 24">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9,22 9,12 15,12 15,22"/>
          </svg>
          <div class="label">Home</div>
        </button>
        <button class="remote-btn btn-back" onclick='rokuTvSendCommand("back")'>
          <svg class="icon-svg" viewBox="0 0 24 24">
            <path d="M19 12H5"/>
            <path d="M12 19l-7-7 7-7"/>
          </svg>
          <div class="label">Back</div>
        </button>
      </div>
      
      <!-- D-Pad Cluster -->
      <div class="remote-section d-pad">
        <button class="remote-btn btn-up" onclick='rokuTvSendCommand("up")'>
          <svg class="icon-svg" viewBox="0 0 24 24">
            <path d="M12 19V5"/>
            <path d="M5 12l7-7 7 7"/>
          </svg>
        </button>
        <button class="remote-btn btn-down" onclick='rokuTvSendCommand("down")'>
          <svg class="icon-svg" viewBox="0 0 24 24">
            <path d="M12 5v14"/>
            <path d="M19 12l-7 7-7-7"/>
          </svg>
        </button>
        <button class="remote-btn btn-left" onclick='rokuTvSendCommand("left")'>
          <svg class="icon-svg" viewBox="0 0 24 24">
            <path d="M19 12H5"/>
            <path d="M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <button class="remote-btn btn-right" onclick='rokuTvSendCommand("right")'>
          <svg class="icon-svg" viewBox="0 0 24 24">
            <path d="M5 12h14"/>
            <path d="M12 5l7 7-7 7"/>
          </svg>
        </button>
        <button class="remote-btn btn-select" onclick='rokuTvSendCommand("select")'>
          <svg class="icon-svg" viewBox="0 0 24 24">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
          <div class="label">OK</div>
        </button>
      </div>
      
      <!-- Volume Controls -->
      <div class="remote-section volume-controls">
        <button class="remote-btn btn-mute" onclick='rokuTvSendCommand("mute")'>
          <svg class="icon-svg" viewBox="0 0 24 24">
            <polygon points="11,5 6,9 2,9 2,15 6,15 11,19 11,5"/>
            <line x1="23" y1="9" x2="17" y2="15"/>
            <line x1="17" y1="9" x2="23" y2="15"/>
          </svg>
          <div class="label">Mute</div>
        </button>
        <button class="remote-btn btn-vol-down" onclick='rokuTvSendCommand("volumeDown")'>
          <svg class="icon-svg" viewBox="0 0 24 24">
            <polygon points="11,5 6,9 2,9 2,15 6,15 11,19 11,5"/>
            <line x1="23" y1="9" x2="17" y2="15"/>
            <line x1="17" y1="9" x2="23" y2="15"/>
            <line x1="17" y1="12" x2="23" y2="12"/>
          </svg>
          <div class="label">Vol-</div>
        </button>
        <button class="remote-btn btn-vol-up" onclick='rokuTvSendCommand("volumeUp")'>
          <svg class="icon-svg" viewBox="0 0 24 24">
            <polygon points="11,5 6,9 2,9 2,15 6,15 11,19 11,5"/>
            <line x1="23" y1="9" x2="17" y2="15"/>
            <line x1="17" y1="9" x2="23" y2="15"/>
            <line x1="17" y1="12" x2="23" y2="12"/>
            <line x1="17" y1="9" x2="23" y2="9"/>
          </svg>
          <div class="label">Vol+</div>
        </button>
      </div>
      
      <!-- Media Controls -->
      <div class="remote-section media-controls">
        <button class="remote-btn btn-play" onclick='rokuTvSendCommand("play")'>
          <svg class="icon-svg" viewBox="0 0 24 24">
            <polygon points="5,3 19,12 5,21"/>
          </svg>
          <div class="label">Play</div>
        </button>
        <button class="remote-btn btn-pause" onclick='rokuTvSendCommand("pause")'>
          <svg class="icon-svg" viewBox="0 0 24 24">
            <rect x="6" y="4" width="4" height="16"/>
            <rect x="14" y="4" width="4" height="16"/>
          </svg>
          <div class="label">Pause</div>
        </button>
        <button class="remote-btn btn-stop" onclick='rokuTvSendCommand("stop")'>
          <svg class="icon-svg" viewBox="0 0 24 24">
            <rect x="6" y="6" width="12" height="12"/>
          </svg>
          <div class="label">Stop</div>
        </button>
      </div>
      
      <!-- HDMI Inputs -->
      <div class="remote-section hdmi-inputs">
        <button class="remote-btn btn-hdmi1" onclick='rokuTvSendHdmiInput("InputHDMI1")'>
          <svg class="icon-svg" viewBox="0 0 24 24">
            <path d="M3 7h18v10H3z"/>
            <path d="M7 7v10"/>
            <path d="M17 7v10"/>
            <path d="M3 12h18"/>
            <path d="M7 3l5 4 5-4"/>
          </svg>
          <div class="label">HDMI1</div>
        </button>
        <button class="remote-btn btn-hdmi2" onclick='rokuTvSendHdmiInput("InputHDMI2")'>
          <svg class="icon-svg" viewBox="0 0 24 24">
            <path d="M3 7h18v10H3z"/>
            <path d="M7 7v10"/>
            <path d="M17 7v10"/>
            <path d="M3 12h18"/>
            <path d="M7 3l5 4 5-4"/>
          </svg>
          <div class="label">HDMI2</div>
        </button>
        <button class="remote-btn btn-hdmi3" onclick='rokuTvSendHdmiInput("InputHDMI3")'>
          <svg class="icon-svg" viewBox="0 0 24 24">
            <path d="M3 7h18v10H3z"/>
            <path d="M7 7v10"/>
            <path d="M17 7v10"/>
            <path d="M3 12h18"/>
            <path d="M7 3l5 4 5-4"/>
          </svg>
          <div class="label">HDMI3</div>
        </button>
      </div>
    </div>
    <div id='rokuTvFeedback' class="toast"></div>`;
  
  showModalContent(html, true, '.side-btn[title="TV"]');
}

window.fireTvSendCommand = function(cmd) {
  if (cmd === 'power') {
    // Toggle the Hubitat virtual switch for Fire TV power
    const fireDeviceId = window.CONFIG.DEVICES.FIRE_POWER_SWITCH;
    const statusUrl = window.CONFIG.HUBITAT.deviceStatusUrl(fireDeviceId);
    fetch(statusUrl)
      .then(r => r.json())
      .then(device => {
        const attrs = device?.attributes || {};
        const current = Array.isArray(attrs) ? (attrs.find(a => a.name === 'switch')?.currentValue) : attrs.switch;
        const nextCmd = current === 'on' ? 'off' : 'on';
        const toggleUrl = window.CONFIG.HUBITAT.deviceCommandUrl(fireDeviceId, nextCmd);
        return fetch(toggleUrl).then(() => nextCmd);
      })
      .then(nextCmd => {
        showToast(`Fire TV power ${nextCmd} sent!`, 'success');
        const feedback = document.getElementById('fireTvFeedback');
        if (feedback) {
          feedback.textContent = `Fire TV power ${nextCmd}!`;
          feedback.classList.add('fireTvFeedback-visible');
          setTimeout(() => { feedback.classList.remove('fireTvFeedback-visible'); }, 1800);
        }
      })
      .catch(err => {
        console.error('Failed to toggle Fire TV power:', err);
        showToast(`Failed to toggle Fire TV power: ${err.message}`, 'error');
      });
    return;
  }

  // Use curl.command structure for ADB commands via Home Assistant
  const COMMAND_MAP = {
    up: 'UP',
    down: 'DOWN',
    left: 'LEFT',
    right: 'RIGHT',
    select: 'ENTER',
    home: 'HOME',
    back: 'BACK',
    play: 'PLAY',
    pause: 'PAUSE',
    stop: 'STOP',
    mute: 'MUTE',
    volumeup: 'VOLUME_UP',
    volumedown: 'VOLUME_DOWN',
    hdmi1: 'HDMI1',
    hdmi2: 'HDMI2',
    hdmi3: 'HDMI3'
  };
  const adbCommand = COMMAND_MAP[cmd] || String(cmd || '').toUpperCase();
  
  fetch(window.CONFIG.HOME_ASSISTANT.serviceUrl('androidtv', 'adb_command'), {
    method: 'POST',
    headers: window.CONFIG.HOME_ASSISTANT.getHeaders(),
    body: JSON.stringify({
      entity_id: window.CONFIG.HOME_ASSISTANT.ENTITIES.FIRE_TV,
      command: adbCommand
    })
  }).then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status}: ${r.statusText}`);
    return r.json();
  }).then(() => {
    const feedback = document.getElementById('fireTvFeedback');
    if (feedback) {
      feedback.textContent = `Fire TV command "${adbCommand}" sent!`;
      feedback.classList.add('fireTvFeedback-visible');
      setTimeout(() => { feedback.classList.remove('fireTvFeedback-visible'); }, 1800);
    }
    showToast(`Fire TV command "${adbCommand}" sent!`, 'success');
  }).catch(err => {
    console.error('Failed to send Fire TV command:', err);
    showToast(`Failed to send Fire TV command: ${err.message}`, 'error');
  });
}

// Roku TV command sender - uses device 473 (Bedroom tv 94E742)
window.rokuTvSendCommand = function(apiCmd) {
  const rokuTvId = window.CONFIG.DEVICES.BEDROOM_TV; // Device 473
  
  // Map UI commands to Roku API commands
  const commandMap = {
    'up': 'up',
    'down': 'down',
    'left': 'left',
    'right': 'right',
    'select': 'select',
    'back': 'back',
    'home': 'home',
    'play': 'play',
    'pause': 'pause',
    'stop': 'stop',
    'mute': 'mute',
    'volumeUp': 'volumeUp',
    'volumeDown': 'volumeDown',
    'off': 'off',
    'on': 'on'
  };
  
  const command = commandMap[apiCmd] || apiCmd;
  const url = window.CONFIG.HUBITAT.deviceCommandUrl(rokuTvId, command);
  
  fetch(url).then(r => r.json()).then(() => {
    showToast(`Roku TV "${apiCmd}" sent!`, 'success');
  }).catch(err => {
    console.error('Failed to send Roku TV command:', err);
    showToast(`Failed to send Roku TV command: ${err.message}`, 'error');
  });
}

// Roku TV HDMI input switcher - uses setInputSource command
window.rokuTvSendHdmiInput = function(inputName) {
  const rokuTvId = window.CONFIG.DEVICES.BEDROOM_TV; // Device 473
  const url = window.CONFIG.HUBITAT.deviceCommandUrl(rokuTvId, 'setInputSource', inputName);
  
  fetch(url).then(r => r.json()).then(() => {
    showToast(`Roku TV switched to ${inputName}`, 'success');
  }).catch(err => {
    console.error('Failed to switch Roku TV input:', err);
    showToast(`Failed to switch input: ${err.message}`, 'error');
  });
}

window.tvSendCommand = function(apiCmd) {
  // Generic TV commands - will need to be implemented based on which TV is active
  showToast(`TV command "${apiCmd}" - please use specific TV controls`, 'info');
}

// --- Rollershade Modal ---
function showRollershadeModal() {
  let html = `<div class="rollershade-controls">
      <button class="rollershade-btn rollershade-up" onclick='rollershadeCommand("on")'>
        <span class="icon">⬆️</span>
        <span class="label">Open</span>
      </button>
      <button class="rollershade-btn rollershade-down" onclick='rollershadeCommand("off")'>
        <span class="icon">⬇️</span>
        <span class="label">Close</span>
      </button>
    </div>
    <div id='rollershadeFeedback' class="toast"></div>`;
  
  showModalContent(html, true, '.side-btn[title="Rollershade"]');
}

window.rollershadeToggle = function() {
  // Toggle the blackoutswitch - if it's on, turn it off; if it's off, turn it on
  const blackoutId = window.CONFIG.DEVICES.BLACKOUT_SWITCH;
  fetch(window.CONFIG.HUBITAT.deviceStatusUrl(blackoutId))
    .then(r => r.json())
    .then(device => {
      const isOn = device.attributes?.switch === 'on';
      const newState = isOn ? 'off' : 'on';
      return rollershadeCommand(newState);
    })
    .catch(err => {
      console.error('Failed to get rollershade state:', err);
      showToast(`Failed to get rollershade state: ${err.message}`, 'error');
    });
}

window.rollershadeCommand = function(cmd) {
  // Send command to blackoutswitch device
  const blackoutId = window.CONFIG.DEVICES.BLACKOUT_SWITCH;
  const url = window.CONFIG.HUBITAT.deviceCommandUrl(blackoutId, cmd);
  fetch(url).then(r => r.json()).then(() => {
    const feedback = document.getElementById('rollershadeFeedback');
    if (feedback) {
      const action = cmd === 'on' ? 'opening' : 'closing';
      feedback.textContent = `Rollershades ${action}!`;
      feedback.style.display = 'block';
      setTimeout(() => { feedback.style.display = 'none'; }, 1800);
    }
    const action = cmd === 'on' ? 'opening' : 'closing';
    showToast(`Rollershades ${action}!`, 'success');
  }).catch(err => {
    console.error('Failed to send rollershade command:', err);
    showToast(`Failed to send rollershade command: ${err.message}`, 'error');
  });
}

// --- Lock: direct toggle for front door lock ---
window.toggleLock = async function() {
  const lockId = window.CONFIG.DEVICES.FRONT_DOOR_LOCK;
  try {
    const statusRes = await fetch(window.CONFIG.HUBITAT.deviceStatusUrl(lockId));
    const dev = await statusRes.json();
    const attrs = dev.attributes || {};
    const current = Array.isArray(attrs) ? (attrs.find(a=>a.name==='lock')?.currentValue) : attrs.lock;
    const nextCmd = current === 'locked' ? 'unlock' : 'lock';
    await fetch(window.CONFIG.HUBITAT.deviceCommandUrl(lockId, nextCmd));
    showToast(`Door ${nextCmd}ing...`, 'success');
  } catch (err) {
    console.error('Failed to toggle lock:', err);
    showToast(`Failed to toggle lock: ${err.message}`, 'error');
  }
}

// Expose
window.showTvModal = showTvModal;
window.showRollershadeModal = showRollershadeModal;