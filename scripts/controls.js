// --- TV Modal (50" Roku TV, deviceId 474) ---
function showTvModal() {
  const tvId = '474';
  let html = `<div class="modal-header">TV Controls</div>
    <div class="bubble-ring count-12">`;
  
  const tvButtons = [
    {label:'Power', cmd:'power', icon:'⏻', api:'off'},
    {label:'On', cmd:'on', icon:'🔛', api:'on'},
    {label:'Home', cmd:'home', icon:'🏠', api:'home'},
    {label:'Mute', cmd:'mute', icon:'🔇', api:'mute'},
    {label:'Unmute', cmd:'unmute', icon:'🔊', api:'unmute'},
    {label:'Vol +', cmd:'volup', icon:'🔼', api:'volumeUp'},
    {label:'Vol -', cmd:'voldown', icon:'🔽', api:'volumeDown'},
    {label:'Ch +', cmd:'chup', icon:'📺+', api:'channelUp'},
    {label:'Ch -', cmd:'chdown', icon:'📺-', api:'channelDown'},
    {label:'Input', cmd:'input', icon:'🔀', api:'setInputSource'},
    {label:'Play', cmd:'play', icon:'▶️', api:'play'},
    {label:'Pause', cmd:'pause', icon:'⏸️', api:'pause'},
    {label:'Stop', cmd:'stop', icon:'⏹️', api:'stop'}
  ];
  
  for (let i = 0; i < tvButtons.length; i++) {
    html += `<button class="bubble-btn control-button i-${i}" onclick='tvSendCommand("${tvButtons[i].api}")'>
      <div class="icon">${tvButtons[i].icon}</div>
      <div class="label">${tvButtons[i].label}</div>
    </button>`;
  }
  
  html += `</div>
    <div id='tvFeedback' class="toast"></div>`;
  
  showModalContent(html, true, '.side-btn[title="TV"]');
}

window.tvSendCommand = function(apiCmd) {
  const tvId = '474';
  let url = `${MAKER_API_BASE}/devices/${tvId}/${apiCmd}?access_token=${ACCESS_TOKEN}`;
  fetch(url).then(r => r.json()).then(() => {
    const feedback = document.getElementById('tvFeedback');
    if (feedback) {
      feedback.textContent = `TV command "${apiCmd}" sent!`;
      feedback.style.display = 'block';
      setTimeout(() => { feedback.style.display = 'none'; }, 1800);
    }
    showToast(`TV command "${apiCmd}" sent!`, 'success');
  }).catch(err => {
    console.error('Failed to send TV command:', err);
    showToast(`Failed to send TV command: ${err.message}`, 'error');
  });
}

// --- Vacuum Modal ---
function showVacuumModal() {
  let html = `<div class="modal-header">Roborock Vacuum</div>
    <div class="bubble-ring count-4">`;
  
  const buttons = [
    { icon: '🧹', label: 'Start', onclick: 'vacuumCommand("appClean")' },
    { icon: '🏠', label: 'Home', onclick: 'vacuumCommand("appDock")' },
    { icon: '⏸️', label: 'Pause', onclick: 'vacuumCommand("appPause")' },
    { icon: '🎬', label: 'Scenes', onclick: 'showVacuumScenesModal()' }
  ];
  
  for (let i = 0; i < buttons.length; i++) {
    html += `<button class="bubble-btn vacuum-button i-${i}" onclick='${buttons[i].onclick}'>
      <span class="icon">${buttons[i].icon}</span>
      <span class="label">${buttons[i].label}</span>
    </button>`;
  }
  
  html += `</div>
    <div id='vacuumFeedback' class="toast"></div>`;
  
  showModalContent(html, true, '.side-btn[title="Vacuum"]');
}

window.vacuumCommand = function(cmd) {
  const vacuumId = '298';
  let url = `${MAKER_API_BASE}/devices/${vacuumId}/${cmd}?access_token=${ACCESS_TOKEN}`;
  fetch(url).then(r => r.json()).then(() => {
    const feedback = document.getElementById('vacuumFeedback');
    if (feedback) {
      feedback.textContent = `Vacuum command "${cmd}" sent!`;
      feedback.style.display = 'block';
      setTimeout(() => { feedback.style.display = 'none'; }, 1800);
    }
    showToast(`Vacuum command "${cmd}" sent!`, 'success');
  }).catch(err => {
    console.error('Failed to send vacuum command:', err);
    showToast(`Failed to send vacuum command: ${err.message}`, 'error');
  });
}

// Vacuum Scenes Modal
window.showVacuumScenesModal = function() {
  const scenes = [
    {name:'Full Cleaning', id: '2739622'},
    {name:'Vac + Mop', id: '2739711'},
    {name:'Deep', id: '2739712'},
    {name:'Intensive', id: '2739713'},
    {name:'Deep+', id: '2739715'},
    {name:'Living Room', id: '2781198'},
    {name:'Vac + Mop3', id: '3162708'}
  ];
  
  let html = `<div class="modal-header">Vacuum Scenes</div>
    <div class="bubble-ring count-${scenes.length}">`;
  
  for (let i = 0; i < scenes.length; i++) {
    html += `<button class="bubble-btn vacuum-button i-${i}" onclick='vacuumScene("${scenes[i].id}","${scenes[i].name}")'>
      <span class="icon">🎬</span>
      <span class="label">${scenes[i].name}</span>
    </button>`;
  }
  
  html += `</div>
    <div id='vacuumSceneFeedback' class="toast"></div>`;
  
  showModalContent(html, true, '.side-btn[title="Vacuum"]');
}

window.vacuumScene = function(sceneId, sceneName) {
  const vacuumId = '298';
  let url = `${MAKER_API_BASE}/devices/${vacuumId}/appScene/${sceneId}?access_token=${ACCESS_TOKEN}`;
  fetch(url).then(r => r.json()).then(() => {
    const feedback = document.getElementById('vacuumSceneFeedback');
    if (feedback) {
      feedback.textContent = `Scene "${sceneName}" started!`;
      feedback.style.display = 'block';
      setTimeout(() => { feedback.style.display = 'none'; }, 1800);
    }
    showToast(`Vacuum scene "${sceneName}" started!`, 'success');
  }).catch(err => {
    console.error('Failed to start vacuum scene:', err);
    showToast(`Failed to start scene: ${err.message}`, 'error');
  });
} 