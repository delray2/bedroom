// --- TV Modal (Fire TV and Roku TV) ---
function showTvModal() {
  let html = `<div class="rollershade-controls">
      <button class="rollershade-btn tv-firetv" onclick='showFireTvModal()'>
        <span class="icon">🔥</span>
        <span class="label">Fire TV</span>
      </button>
      <button class="rollershade-btn tv-roku" onclick='showRokuTvModal()'>
        <span class="icon">📺</span>
        <span class="label">Roku TV</span>
      </button>
    </div>
    <div id='tvFeedback' class="toast"></div>`;
  
  showModalContent(html, true, '.side-btn[title="TV"]');
}

// Fire TV Modal
window.showFireTvModal = function() {
  let html = `<div class="modal-header">Fire TV Remote</div>
    <div class="fire-tv-remote">
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

// Roku TV Modal
window.showRokuTvModal = function() {
  const rokuTvId = '474'; // Bedroom TV device ID
  let html = `<div class="modal-header">Roku TV Controls</div>
    <div class="bubble-ring count-8">`;
  
  const rokuTvButtons = [
    {label:'Power', cmd:'power', icon:'⏻', api:'off'},
    {label:'On', cmd:'on', icon:'🔛', api:'on'},
    {label:'Home', cmd:'home', icon:'🏠', api:'home'},
    {label:'Back', cmd:'back', icon:'⬅️', api:'back'},
    {label:'Up', cmd:'up', icon:'⬆️', api:'up'},
    {label:'Down', cmd:'down', icon:'⬇️', api:'down'},
    {label:'Left', cmd:'left', icon:'⬅️', api:'left'},
    {label:'Right', cmd:'right', icon:'➡️', api:'right'},
    {label:'Select', cmd:'select', icon:'✅', api:'select'},
    {label:'Play', cmd:'play', icon:'▶️', api:'play'},
    {label:'Pause', cmd:'pause', icon:'⏸️', api:'pause'},
    {label:'Stop', cmd:'stop', icon:'⏹️', api:'stop'}
  ];
  
  for (let i = 0; i < rokuTvButtons.length; i++) {
    html += `<button class="bubble-btn control-button i-${i}" onclick='rokuTvSendCommand("${rokuTvButtons[i].api}")'>
      <div class="icon">${rokuTvButtons[i].icon}</div>
      <div class="label">${rokuTvButtons[i].label}</div>
    </button>`;
  }
  
  html += `</div>
    <div id='rokuTvFeedback' class="toast"></div>`;
  
  showModalContent(html, true, '.side-btn[title="TV"]');
}

window.fireTvSendCommand = function(cmd) {
  if (cmd === 'power') {
    // Special handling for power: toggle the firetvswitch (ID 532) via Maker API
    const url = `${window.MAKER_API_BASE}/devices/532/toggle?access_token=${window.ACCESS_TOKEN}`;
    fetch(url)
      .then(r => r.json())
      .then(() => {
        showToast('Fire TV power toggled!', 'success');
      })
      .catch(err => {
        console.error('Failed to toggle Fire TV power:', err);
        showToast(`Failed to toggle Fire TV power: ${err.message}`, 'error');
      });
    return;
  }

  // Use the curl command structure for other Fire TV commands
  const command = cmd.toUpperCase();
  console.log(`Sending Fire TV command: ${command} via Home Assistant`);
  console.log(`Entity ID: media_player.fire_tv_192_168_4_54`);
  
  fetch('http://192.168.4.145:8123/api/services/androidtv/adb_command', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJhNzU0MDhhNTYxYmQ0NTVjOTA3NTFmZDg0OTQ2MzMzOCIsImlhdCI6MTc1NTE5OTg1NywiZXhwIjoyMDcwNTU5ODU3fQ.NMPxvnz0asFM66pm7LEH80BIGR9dU8pj6IZEX5v3WB4',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      entity_id: 'media_player.fire_tv_192_168_4_54',
      command: command
    })
  }).then(r => {
    console.log(`Home Assistant response status: ${r.status}`);
    if (!r.ok) {
      throw new Error(`HTTP ${r.status}: ${r.statusText}`);
    }
    return r.json();
  }).then((data) => {
    console.log(`Home Assistant response data:`, data);
    const feedback = document.getElementById('fireTvFeedback');
    if (feedback) {
      feedback.textContent = `Fire TV command "${cmd}" sent!`;
      feedback.classList.add(".fireTvFeedback-visible");
      setTimeout(() => { feedback.classList.remove(".fireTvFeedback-visible"); }, 1800);
    }
    showToast(`Fire TV command "${cmd}" sent!`, 'success');
  }).catch(err => {
    console.error('Failed to send Fire TV command:', err);
    showToast(`Failed to send Fire TV command: ${err.message}`, 'error');
  });
}

window.rokuTvSendCommand = function(apiCmd) {
  const rokuTvId = '474';
  let url = `${window.MAKER_API_BASE}/devices/${rokuTvId}/${apiCmd}?access_token=${window.ACCESS_TOKEN}`;
  fetch(url).then(r => r.json()).then(() => {
    const feedback = document.getElementById('rokuTvFeedback');
    if (feedback) {
      feedback.textContent = `Roku TV command "${apiCmd}" sent!`;
      feedback.style.display = 'block';
      setTimeout(() => { feedback.style.display = 'none'; }, 1800);
    }
    showToast(`Roku TV command "${apiCmd}" sent!`, 'success');
  }).catch(err => {
    console.error('Failed to send Roku TV command:', err);
    showToast(`Failed to send Roku TV command: ${err.message}`, 'error');
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
  fetch(`${window.MAKER_API_BASE}/devices/531?access_token=${window.ACCESS_TOKEN}`)
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
  // Send command to blackoutswitch device (ID: 531)
  let url = `${window.MAKER_API_BASE}/devices/531/${cmd}?access_token=${window.ACCESS_TOKEN}`;
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

// --- Lock: direct toggle for device 509 ---
window.toggleLock = async function() {
  const lockId = '509';
  try {
    const statusRes = await fetch(`${window.MAKER_API_BASE}/devices/${lockId}?access_token=${window.ACCESS_TOKEN}`);
    const dev = await statusRes.json();
    const attrs = dev.attributes || {};
    const current = Array.isArray(attrs) ? (attrs.find(a=>a.name==='lock')?.currentValue) : attrs.lock;
    const nextCmd = current === 'locked' ? 'unlock' : 'lock';
    await fetch(`${window.MAKER_API_BASE}/devices/${lockId}/${nextCmd}?access_token=${window.ACCESS_TOKEN}`);
    showToast(`Door ${nextCmd}ing...`, 'success');
  } catch (err) {
    console.error('Failed to toggle lock:', err);
    showToast(`Failed to toggle lock: ${err.message}`, 'error');
  }
}

// Expose
window.showTvModal = showTvModal;
window.showRollershadeModal = showRollershadeModal;