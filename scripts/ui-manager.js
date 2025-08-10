// UI Manager Class for handling modal interactions and bubble chart functionality
class UIManager {
  constructor() {
    this.initializeEventListeners();
  }

  initializeEventListeners() {
    // Side button event listeners
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('side-btn')) {
        const action = e.target.getAttribute('data-action');
        if (action) {
          this.handleSideButtonClick(action);
        }
      }
    });

    // Theme toggle
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => this.toggleTheme());
    }
  }

  handleSideButtonClick(action) {
    switch (action) {
      case 'showBubbleChartModal':
        this.showBubbleChartModal();
        break;
      case 'showTvModal':
        this.showModal('TV Controls', '<div class="coming-soon">TV controls coming soon...</div>');
        break;
      case 'showVacuumModal':
        this.showModal('Vacuum Controls', '<div class="coming-soon">Vacuum controls coming soon...</div>');
        break;
      case 'showCameraModal':
        if (typeof showCameraModal === 'function') {
          showCameraModal();
        }
        break;
      case 'showMusicModal':
        this.showModal('Music Player', 'Music controls coming soon...');
        break;
    }
  }

  showBubbleChartModal() {
    const bubbles = [
      { label: 'Table', id: '452', icon: '💡' },
      { label: 'Fan 1', id: '449', icon: '💡' },
      { label: 'Fan 2', id: '446', icon: '💡' },
      { label: 'LR Wall', id: '470', icon: '💡' },
      { label: 'Scenes', id: 'scenes', icon: '🎬' },
      { label: 'WLED Effects', id: 'wled', icon: '✨' },
      { label: 'Global', id: 'global', icon: '🌐' }
    ];

    const bubbleCount = bubbles.length;
    let html = `<div class="room-badge">Living Room<br>Lights</div>
      <div class="bubble-ring count-${bubbleCount}">`;
    
    bubbles.forEach((bubble, i) => {
      html += `<button onclick="uiManager.handleBubbleClick('${bubble.label}','${bubble.id}')" 
                       class="bubble-btn i-${i}">
        <span class="icon">${bubble.icon}</span>
        <span class="label">${bubble.label}</span>
      </button>`;
    });

    html += `</div>`;
    
    this.showModal(html, {
      triggerSelector: '.side-btn[title="Lights"]',
      isBubble: true
    });
  }

  handleBubbleClick(label, id) {
    if (['452','449','446','470'].includes(id)) {
      this.showDeviceModal(label, id, true);
    } else if (id === 'scenes') {
      this.showScenesModal();
    } else if (id === 'wled') {
      this.showWledModal();
    } else {
      this.showModal(`<h2>${label}</h2><div class="coming-soon">Controls for <b>${label}</b> coming soon...</div>`, {
        showBack: true,
        triggerSelector: '.side-btn[title="Lights"]',
        isBubble: true,
        hideClose: true
      });
    }
  }

  showScenesModal() {
    // Import sceneManager dynamically
    import('./scenes.js').then(({ sceneManager }) => {
      const html = sceneManager.getScenePreviewHTML();
      this.showModal(html, {
        showBack: true,
        triggerSelector: '.side-btn[title="Lights"]',
        isBubble: true,
        hideClose: true,
        modalType: 'scenes'
      });
    });
  }

  showDeviceModal(label, deviceId, showBack = false) {
    this.showModal(`<div class="modal-header"><h2>${label}</h2></div><div id='deviceControls' class="control-panel"><em>Loading...</em></div>`, {
      showBack,
      triggerSelector: '.side-btn[title="Lights"]'
    });

    // Load device controls
    this.loadDeviceControls(deviceId, showBack);
  }

  async loadDeviceControls(deviceId, showBack) {
    try {
      const device = await window.apiService.getDeviceStatus(deviceId);
      this.renderDeviceControls(device, deviceId, showBack);
    } catch (error) {
      document.getElementById('deviceControls').innerHTML = 
        `<div class="error-message">Failed to load device state: ${error.message}</div>`;
    }
  }

  renderDeviceControls(device, deviceId, showBack) {
    const capabilities = this.getDeviceCapabilities(deviceId);
    if (!capabilities) {
      document.getElementById('deviceControls').innerHTML = 
        `<div class="error-message">Unknown device type</div>`;
      return;
    }

    let html = '<div class="control-rows">';
    
    const isOn = device.attributes?.switch === 'on';
    html += `<div class="control-row">
      <div class="label">Power</div>
      <button onclick="uiManager.sendDeviceCommand('${deviceId}', '${isOn ? 'off' : 'on'}')" 
              class="btn ${isOn ? 'btn-success' : 'btn-danger'}">
        ${isOn ? 'Turn Off' : 'Turn On'}
      </button>
    </div>`;

    if (capabilities.includes('SwitchLevel')) {
      const level = device.attributes?.level || 0;
      html += `<div class="control-row">
        <label for="level-slider" class="label">Brightness</label>
        <input type="range" id="level-slider" min="1" max="100" value="${level}" 
               onchange="uiManager.sendDeviceCommand('${deviceId}', 'setLevel', this.value)"
               class="slider-input">
        <div class="value">${level}%</div>
      </div>`;
    }

    if (capabilities.includes('ColorControl')) {
      const hue = device.attributes?.hue || 0;
      const saturation = device.attributes?.saturation || 0;
      
      html += `<div class="control-row">
        <label for="hue-slider" class="label">Hue</label>
        <input type="range" id="hue-slider" min="0" max="100" value="${hue}" 
               onchange="uiManager.sendDeviceCommand('${deviceId}', 'setHue', this.value)"
               class="slider-input">
        <div class="value">${hue}</div>
      </div>`;
      
      html += `<div class="control-row">
        <label for="saturation-slider" class="label">Saturation</label>
        <input type="range" id="saturation-slider" min="0" max="100" value="${saturation}" 
               onchange="uiManager.sendDeviceCommand('${deviceId}', 'setSaturation', this.value)"
               class="slider-input">
        <div class="value">${saturation}</div>
      </div>`;
    }
    html += '</div>';

    document.getElementById('deviceControls').innerHTML = html;
  }

  getDeviceCapabilities(deviceId) {
    const deviceMap = {
      '452': ['Switch', 'SwitchLevel', 'ColorControl'],
      '449': ['Switch', 'SwitchLevel', 'ColorControl'],
      '446': ['Switch', 'SwitchLevel', 'ColorControl'],
      '470': ['Switch', 'SwitchLevel', 'ColorControl']
    };
    return deviceMap[deviceId] || [];
  }

  async sendDeviceCommand(deviceId, command, value) {
    try {
      const data = await window.apiService.sendDeviceCommand(deviceId, command, value);
      
      // Refresh device controls
      this.loadDeviceControls(deviceId, true);
      
      console.log('Device command response:', data);
    } catch (error) {
      console.error('Failed to send device command:', error);
    }
  }

  showWledModal() {
    this.showModal(`<div class="modal-header"><h2>WLED Effects</h2></div><div class="coming-soon">LR Wall WLED controls coming soon...</div>`, {
      showBack: true,
      triggerSelector: '.side-btn[title="Lights"]',
      isBubble: true,
      hideClose: true
    });
  }

  showModal(content, options = {}) {
    const modalBg = document.getElementById('modalBg');
    const modalContent = document.getElementById('modalContent');
    const modalBody = document.getElementById('modalBody');
    const backBtn = document.getElementById('backModal');
    const closeBtn = document.getElementById('closeModal');

    // Set content
    modalBody.innerHTML = content;

    // Show/hide back button
    if (backBtn) {
      backBtn.style.display = options.showBack ? 'block' : 'none';
    }

    // Show/hide close button
    if (closeBtn) {
      closeBtn.style.display = options.hideClose ? 'none' : 'block';
    }

    // Show modal
    modalBg.style.display = 'flex';
    modalBg.classList.add('visible');
    modalContent.style.transform = 'scale(1) translate(0px)';
    modalContent.style.opacity = '1';
  }

  toggleTheme() {
    const body = document.body;
    const themeToggle = document.getElementById('themeToggle');
    
    if (body.classList.contains('dark-theme')) {
      body.classList.remove('dark-theme');
      themeToggle.textContent = '🌙';
      localStorage.setItem('theme', 'light');
    } else {
      body.classList.add('dark-theme');
      themeToggle.textContent = '☀️';
      localStorage.setItem('theme', 'dark');
    }
  }
}

// Initialize UI Manager
const uiManager = new UIManager();
window.uiManager = uiManager;

// Load saved theme
document.addEventListener('DOMContentLoaded', () => {
  const savedTheme = localStorage.getItem('theme');
  const themeToggle = document.getElementById('themeToggle');
  
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-theme');
    if (themeToggle) {
      themeToggle.textContent = '☀️';
    }
  }
}); 