// UI Manager Class for handling modal interactions and bubble chart functionality
class UIManager {
  constructor() {
    this.initializeEventListeners();
    this.initializeStateManager();
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

  initializeStateManager() {
    // Subscribe to state changes if state manager is available
    if (window.deviceStateManager) {
      this.unsubscribeFromState = window.deviceStateManager.subscribe(
        this.handleDeviceStateChange.bind(this)
      );
      
      // Initialize visual state system
      if (window.deviceStateManager.initVisualStateSubscriptions) {
        window.deviceStateManager.initVisualStateSubscriptions();
      }
    } else {
      // Wait for state manager to be ready
      window.addEventListener('deviceStateManager:ready', () => {
        this.unsubscribeFromState = window.deviceStateManager.subscribe(
          this.handleDeviceStateChange.bind(this)
        );
        if (window.deviceStateManager.initVisualStateSubscriptions) {
          window.deviceStateManager.initVisualStateSubscriptions();
        }
      }, { once: true });
    }
  }

  handleDeviceStateChange(deviceId, attributes) {
    console.log('UI Manager received state change:', deviceId, attributes);
    
    // Update relevant UI components
    this.updateDeviceDisplay(deviceId, attributes);
    this.updateGlobalControls(deviceId, attributes);
  }

  updateDeviceDisplay(deviceId, attributes) {
    // Update device modals if they're open
    const modalBody = document.getElementById('modalBody');
    if (!modalBody) return;

    const carousel = modalBody.querySelector('#sliderCarousel');
    if (carousel && !carousel.style.display) {
      // Check if this modal is for the updated device
      const currentDeviceId = this.getCurrentModalDeviceId();
      if (currentDeviceId === deviceId) {
        this.refreshDeviceControls(deviceId);
      }
    }
  }

  updateGlobalControls(deviceId, attributes) {
    // Update global controls if they're open and this is the BedroomLifxGOG group
    if (deviceId === window.BEDROOM_GROUP_ID) { // BedroomLifxGOG group
      const globalModal = document.querySelector('.global-ring-top');
      if (globalModal && globalModal.style.display !== 'none') {
        if (window.renderGlobalControls) {
          window.renderGlobalControls({ attributes });
        }
      }
    }
    
    // Update paddle switch UI if this is BedroomLifxGOG
    if (deviceId === window.BEDROOM_GROUP_ID && attributes.switch !== undefined) {
      if (typeof window.updatePaddleSwitchUI === 'function') {
        window.updatePaddleSwitchUI(attributes.switch === 'on');
      }
    }
  }

  getCurrentModalDeviceId() {
    // Try to extract device ID from current modal
    const modalBody = document.getElementById('modalBody');
    if (!modalBody) return null;

    // Look for device ID in various places
    const deviceIdElement = modalBody.querySelector('[data-device-id]');
    if (deviceIdElement) {
      return deviceIdElement.getAttribute('data-device-id');
    }

    // Check if we're in a device modal by looking for carousel with device ID
    const carousel = modalBody.querySelector('#sliderCarousel');
    if (carousel && carousel.dataset.targetDeviceId) {
      return carousel.dataset.targetDeviceId;
    }

    return null;
  }

  handleSideButtonClick(action) {
    switch (action) {
      case 'showBubbleChartModal':
        this.showBubbleChartModal();
        break;
      case 'showTvModal':
        if (typeof showTvModal === 'function') {
          showTvModal();
        } else {
          this.showModal('TV Controls', '<div class="coming-soon">TV controls coming soon...</div>');
        }
        break;
      case 'showRollershadeModal':
        if (typeof showRollershadeModal === 'function') {
          showRollershadeModal();
        } else {
          this.showModal('Rollershade Controls', '<div class="coming-soon">Rollershade controls coming soon...</div>');
        }
        break;
      case 'toggleLock':
        if (typeof window.toggleLock === 'function') {
          window.toggleLock();
        }
        break;
      case 'showLockModal':
        if (typeof showLockModal === 'function') {
          showLockModal();
        } else {
          this.showModal('Front Door', '<div class="coming-soon">Lock controls coming soon...</div>');
        }
        break;
      case 'showCameraModal':
        if (typeof showCameraModal === 'function') {
          showCameraModal();
        }
        break;
      case 'showMusicModal':
        this.showModal('Music Player', 'Music controls coming soon...');
        break;
      case 'showThermostatModal':
        this.showThermostatModal();
        break;
    }
  }

  showBubbleChartModal() {
    const bubbles = [
      { label: 'Bed Lamp', id: '447', icon: '💡' },
      { label: 'Laundry 1', id: '450', icon: '💡' },
      { label: 'Bedroom Fan 1', id: '480', icon: '💡' },
      { label: 'Bedroom Fan 2', id: '451', icon: '💡' },
      { label: 'Scenes', id: 'scenes', icon: '🎬' },
      { label: 'WLED Effects', id: 'wled', icon: '✨' },
      { label: 'Global', id: 'global', icon: '🌐' }
    ];

    const bubbleCount = bubbles.length;
    let html = `<div class="room-badge">Bedroom<br>LifxGOG</div>
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
    if (['447','450','480','451'].includes(id)) {
      this.showDeviceModal(label, id, true);
    } else if (id === 'scenes') {
      this.showScenesModal();
    } else if (id === 'wled') {
      this.showWledModal();
    } else if (id === 'global') {
      this.showDeviceModal('Bedroom Lights', '457', true);
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
    // Import sceneManager dynamically (module script injection for broad browser support)
    if (window.sceneManager) {
      const html = window.sceneManager.getScenePreviewHTML();
      this.showModal(html, {
        showBack: true,
        triggerSelector: '.side-btn[title="Lights"]',
        isBubble: true,
        hideClose: true,
        modalType: 'scenes'
      });
    } else {
      this._ensureScenesLoaded().then(() => {
        if (!window.sceneManager) return;
        const html = window.sceneManager.getScenePreviewHTML();
        this.showModal(html, {
          showBack: true,
          triggerSelector: '.side-btn[title="Lights"]',
          isBubble: true,
          hideClose: true,
          modalType: 'scenes'
        });
      });
    }
  }

  showDeviceModal(label, deviceId, showBack = false) {
    this.showModal(`<div class="modal-header"><h2>${label}</h2></div><div class="device-loading-message"><em>Loading...</em></div>`, {
      showBack,
      triggerSelector: '.side-btn[title="Lights"]'
    });

    // Load device controls
    this.loadDeviceControls(deviceId, showBack);
  }

  async loadDeviceControls(deviceId, showBack) {
    try {
      // First try to get from state manager
      let device = null;
      if (window.deviceStateManager) {
        device = window.deviceStateManager.getDevice(deviceId);
      }
      
      // If not in state manager or stale, fetch from API
      if (!device || !window.deviceStateManager.isDeviceOnline(deviceId)) {
        device = await window.apiService.getDevice(deviceId);
      }
      
      this.renderDeviceControls(device, deviceId, showBack);
    } catch (error) {
      document.getElementById('modalBody').innerHTML = 
        `<div class="modal-header"><h2>Device Controls</h2></div><div class="error-message">Failed to load device state: ${error.message}</div>`;
    }
  }

  refreshDeviceControls(deviceId) {
    // Refresh the device controls display
    this.loadDeviceControls(deviceId, true);
  }

  // Method for state manager to call when updating open device modal
  renderDeviceControls(deviceId, state) {
    // If we have a device modal open for this device, refresh it
    const currentDeviceId = this.getCurrentModalDeviceId();
    if (currentDeviceId === deviceId) {
      this.refreshDeviceControls(deviceId);
      return true; // Indicate we handled it
    }
    return false; // Indicate we didn't handle it
  }

  renderDeviceControls(device, deviceId, showBack) {
    const capabilities = this.getDeviceCapabilities(deviceId);
    if (!capabilities) {
      document.getElementById('modalBody').innerHTML = `<div class="modal-header"><h2>Device Controls</h2></div><div class="error-message">Unknown device type</div>`;
      return;
    }

    // Normalize attributes
    const attrs = device.attributes || {};
    const a = window.deviceStateManager ? window.deviceStateManager.normalizeAttributes(attrs) : attrs;
    const isOn = a.switch === 'on';
    const level = parseInt(a.level || 0);
    const hue   = parseInt(a.hue   || 0);
    const sat   = parseInt(a.saturation || 0);
    const ct    = parseInt(a.colorTemperature || 3000);

    // Ring buttons identical to global controls but wired to this device
    const ring = [
      {icon:'🔆',lbl:'On',     cls:'btn-all-on',  cmd:`uiManager.sendDeviceCommand('${deviceId}','on')`},
      {icon:'🌙',lbl:'Off',    cls:'btn-all-off', cmd:`uiManager.sendDeviceCommand('${deviceId}','off')`},
      {icon:'🔅',lbl:'Dim',    cls:'btn-dim',     cmd:`uiManager.sendDeviceCommand('${deviceId}','setLevel',20)`},
      {icon:'☀️',lbl:'Bright', cls:'btn-bright',  cmd:`uiManager.sendDeviceCommand('${deviceId}','setLevel',90)`}
    ];
    const start=-140,end=-40,steps=ring.length-1||1;
    let html = `<div class="bubble-ring global-ring-top" style="--radius:180px;">`;
    ring.forEach((b,i)=>{
      const deg=start+(i/steps)*(end-start);
      html+=`<button class="bubble-btn global-btn ${b.cls}" style="--pose:translate(-50%,-50%) rotate(${deg}deg) translateY(calc(-1*var(--radius))) rotate(${-deg}deg);" onclick=\"${b.cmd}\"><span class='icon'>${b.icon}</span><span class='label'>${b.lbl}</span></button>`;
    });
    html+='</div><div id="sliderCarousel" class="carousel"></div>';

    document.getElementById('modalBody').innerHTML=html;

    // init carousel sliders
    setTimeout(()=>{
      initializeSliderCarousel(deviceId);
    },50);
  
  }



  getDeviceCapabilities(deviceId) {
    const deviceMap = {
      '447': ['Switch', 'SwitchLevel', 'ColorControl'],
      '450': ['Switch', 'SwitchLevel', 'ColorControl'],
      '449': ['Switch', 'SwitchLevel', 'ColorControl'],
      '451': ['Switch', 'SwitchLevel', 'ColorControl']
    };
    return deviceMap[deviceId] || [];
  }

  async sendDeviceCommand(deviceId, command, value) {
    try {
      const data = await window.apiService.sendDeviceCommand(deviceId, command, value);
      
      // Show success feedback
      showToast(`Command sent successfully!`, 'success');
      
      // State will be automatically updated via the API service
      console.log('Device command response:', data);
    } catch (error) {
      console.error('Failed to send device command:', error);
      showToast(`Failed to send command: ${error.message}`, 'error');
    }
  }

  showWledModal() {
    this.showModal(`<div class="modal-header"><h2>WLED Effects</h2></div><div class="coming-soon">Bedroom WLED controls coming soon...</div>`, {
      showBack: true,
      triggerSelector: '.side-btn[title="Lights"]',
      isBubble: true,
      hideClose: true
    });
  }

  showThermostatModal() {
    // Entryway thermostat (deviceId 86)
    const deviceId = '86';
    const html = `
      <div class="label-badge">Entryway</div>
      <div id="thermoRoot" class="thermo-root">
        <div class="thermo-dial" id="thermoDial">
          <div class="thermo-thumb" id="thermoThumb"></div>
          <div class="thermo-temp" id="thermoTemp">--</div>
          <div class="thermo-set" id="thermoSet">--</div>
        </div>
        <div class="thermo-controls">
          <button class="btn btn-info stack-btn" id="thermoModeBtn">
            <span class="stack-primary" id="thermoModePrimary">--</span>
            <span class="stack-secondary">MODE</span>
          </button>
          <button class="btn btn-info stack-btn" id="thermoFanBtn">
            <span class="stack-primary" id="thermoFanPrimary">--</span>
            <span class="stack-secondary">FAN</span>
          </button>
        </div>
      </div>`;

    this.showModal(html, { triggerSelector: '.side-btn[title="Thermostat"]' });

    // Load state via state manager to avoid loops and ensure a single source of truth
    if (window.deviceStateManager) {
      this.refreshAndRenderThermostat(deviceId).catch(()=>{});
    } else {
      // Fallback to API if state manager is not available
              window.apiService.getDevice(deviceId).then(dev => this.renderThermostat(dev)).catch(()=>{});
    }

    // Wire buttons
    const modeBtn = document.getElementById('thermoModeBtn');
    const fanBtn = document.getElementById('thermoFanBtn');
    modeBtn.onclick = () => this.cycleThermostatMode(deviceId);
    fanBtn.onclick = () => this.cycleThermostatFan(deviceId);

    // Dial interactions (drag thumb)
    const dial = document.getElementById('thermoDial');
    const onPointerMove = (e)=>{
      if (!this._isDraggingThermo) return;
      this._updateThermoFromPointer(e);
    };
    const onPointerUp = async (e)=>{
      if (!this._isDraggingThermo) return;
      this._isDraggingThermo = false;
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      await this._commitThermoPending(deviceId);
    };
    dial.addEventListener('pointerdown', (e)=>{
      this._isDraggingThermo = true;
      this._updateThermoFromPointer(e);
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
    });
  }

  renderThermostat(device) {
    const attrs = device.attributes || {};
    const getAttr = (name) => {
      if (Array.isArray(attrs)) {
        const f = attrs.find(a => a.name === name);
        return f?.currentValue ?? f?.value;
      }
      return attrs[name];
    };
    const mode = (getAttr('thermostatMode') || 'off').toString();
    const fanModeRaw = (getAttr('thermostatFanMode') || 'auto').toString();
    const fanMode = this._fanDisplay(fanModeRaw);
    const tempVal = parseFloat(getAttr('temperature') ?? getAttr('thermostatSetpoint') ?? '0');
    const temp = isNaN(tempVal) ? 0 : Math.round(tempVal);
    const heatVal = parseFloat(getAttr('heatingSetpoint') ?? temp);
    const coolVal = parseFloat(getAttr('coolingSetpoint') ?? temp);
    const heat = isNaN(heatVal) ? temp : Math.round(heatVal);
    const cool = isNaN(coolVal) ? temp : Math.round(coolVal);

    document.getElementById('thermoTemp').textContent = `${temp}°`;
    const setVal = mode === 'cool' ? cool : heat;
    document.getElementById('thermoSet').textContent = `${setVal}°`;

    // Update stacked button labels
    const modePrimary = document.getElementById('thermoModePrimary');
    if (modePrimary) modePrimary.textContent = mode.toUpperCase();
    const fanPrimary = document.getElementById('thermoFanPrimary');
    if (fanPrimary) fanPrimary.textContent = fanMode;

    // Color the dial per mode
    const dial = document.querySelector('.thermo-dial');
    dial.dataset.mode = mode;

    // Position thumb to current setpoint
    const thumb = document.getElementById('thermoThumb');
    const angle = this._angleFromSetpoint(setVal, mode);
    thumb.style.setProperty('--angle', `${angle}deg`);
    // store for drag baseline
    this._thermoMode = mode;
    this._thermoHeat = heat;
    this._thermoCool = cool;
  }

  // Map raw fan mode to display label
  _fanDisplay(mode) {
    if (!mode) return '--';
    const m = mode.toString().toLowerCase();
    if (m === 'auto') return 'AUTO';
    if (m === 'on') return 'ON';
    if (m === 'circulate') return 'CIRC';
    return m.toUpperCase();
  }

  // Returns true if the thermostat modal is currently visible
  isThermostatModalVisible() {
    const modalBg = document.getElementById('modalBg');
    const root = document.getElementById('thermoRoot');
    return !!(modalBg && modalBg.classList.contains('visible') && root);
  }

  // Build a Hubitat-like device object from normalized state for rendering
  _getThermostatDeviceFromState(deviceId = '86') {
    const attrs = (window.deviceStateManager && window.deviceStateManager.getDevice(deviceId)) || {};
    return { attributes: attrs };
  }

  // Refresh thermostat from Hubitat into state manager, then render from state
  async refreshAndRenderThermostat(deviceId = '86') {
    try {
      if (window.deviceStateManager) {
        await window.deviceStateManager.refreshDevice(deviceId);
        const dev = this._getThermostatDeviceFromState(deviceId);
        this.renderThermostat(dev);
      }
    } catch (e) {
      console.error('Failed to refresh thermostat state:', e);
    }
  }

  _rangeForMode(mode){
    if (mode === 'cool') return { min: 60, max: 86 };
    if (mode === 'heat') return { min: 50, max: 80 };
    if (mode === 'auto') return { min: 60, max: 86 };
    // off
    return { min: 50, max: 86 };
  }

  _angleFromSetpoint(value, mode){
    const {min, max} = this._rangeForMode(mode);
    const clamped = Math.max(min, Math.min(max, value));
    const pct = (clamped - min) / (max - min); // 0..1
    // 0deg = top. Map 0..1 to 0..360
    return pct * 360;
  }

  _setpointFromAngle(angle, mode){
    const {min, max} = this._rangeForMode(mode);
    const norm = ((angle % 360) + 360) % 360; // 0..360
    const value = Math.round(min + (norm / 360) * (max - min));
    return Math.max(min, Math.min(max, value));
  }

  _updateThermoFromPointer(e){
    const dial = document.getElementById('thermoDial');
    const rect = dial.getBoundingClientRect();
    const cx = rect.left + rect.width/2;
    const cy = rect.top + rect.height/2;
    const angleRad = Math.atan2(e.clientY - cy, e.clientX - cx); // from +X axis
    let deg = angleRad * 180 / Math.PI; // -180..180
    deg = (deg + 90 + 360) % 360; // make 0 at top

    const mode = this._thermoMode || 'off';
    const value = this._setpointFromAngle(deg, mode);

    // Update UI thumb and set text preview
    const thumb = document.getElementById('thermoThumb');
    if (thumb) thumb.style.setProperty('--angle', `${deg}deg`);
    const setEl = document.getElementById('thermoSet');
    if (setEl) setEl.textContent = `${value}°`;

    this._thermoPendingValue = value;
  }

  async _commitThermoPending(deviceId){
    const mode = this._thermoMode || 'off';
    const val = this._thermoPendingValue;
    if (val == null) return;
    if (mode === 'cool') {
      await window.apiService.sendDeviceCommand(deviceId, 'setCoolingSetpoint', val);
    } else if (mode === 'heat') {
      await window.apiService.sendDeviceCommand(deviceId, 'setHeatingSetpoint', val);
    } else if (mode === 'auto') {
      // keep current separation, move midpoint to val
      const sep = Math.max(2, (this._thermoCool ?? 74) - (this._thermoHeat ?? 68));
      const heat = Math.round(val - sep/2);
      const cool = Math.round(heat + sep);
      await window.apiService.sendDeviceCommand(deviceId, 'setHeatCoolSetpoint', `${heat},${cool}`);
    }
    const updated = await window.apiService.getDevice(deviceId);
    this.renderThermostat(updated);
    this._thermoPendingValue = null;
  }

  async nudgeSetpoint(deviceId, delta){
    // Decide which setpoint to change based on current mode
    const dev = await window.apiService.getDevice(deviceId);
    const attrs = dev.attributes || {};
    const getAttr = (name) => Array.isArray(attrs) ? (attrs.find(a => a.name === name)?.currentValue) : attrs[name];
    const mode = (getAttr('thermostatMode') || 'off').toString();
    if (mode === 'cool') {
      const current = Math.round(parseFloat(getAttr('coolingSetpoint') ?? 72));
      const next = Math.max(60, Math.min(86, current + delta));
      await window.apiService.sendDeviceCommand(deviceId, 'setCoolingSetpoint', next);
    } else if (mode === 'heat') {
      const current = Math.round(parseFloat(getAttr('heatingSetpoint') ?? 68));
      const next = Math.max(50, Math.min(80, current + delta));
      await window.apiService.sendDeviceCommand(deviceId, 'setHeatingSetpoint', next);
    } else if (mode === 'auto') {
      // in auto, adjust both bounds closer
      const cool = Math.round(parseFloat(getAttr('coolingSetpoint') ?? 74)) + delta;
      const heat = Math.round(parseFloat(getAttr('heatingSetpoint') ?? 68)) + delta;
      await window.apiService.sendDeviceCommand(deviceId, 'setHeatCoolSetpoint', `${heat},${cool}`);
    }
    const updated = await window.apiService.getDevice(deviceId);
    this.renderThermostat(updated);
  }

  async cycleThermostatMode(deviceId){
    const dev = await window.apiService.getDevice(deviceId);
    const modes = ['off','heat','cool','auto'];
    const attrs = dev.attributes || {};
    const current = (Array.isArray(attrs) ? (attrs.find(a=>a.name==='thermostatMode')?.currentValue) : attrs.thermostatMode) || 'off';
    const idx = modes.indexOf(current);
    const next = modes[(idx+1)%modes.length];
    await window.apiService.sendDeviceCommand(deviceId, next);
    const updated = await window.apiService.getDevice(deviceId);
    this.renderThermostat(updated);
  }

  async cycleThermostatFan(deviceId){
    const dev = await window.apiService.getDevice(deviceId);
    const attrs = dev.attributes || {};
    const getAttr = (name) => Array.isArray(attrs) ? (attrs.find(a => a.name===name)?.currentValue) : attrs[name];

    // Determine supported fan modes, default to ['auto','on']
    let supported = getAttr('supportedThermostatFanModes');
    if (typeof supported === 'string') {
      try { supported = JSON.parse(supported); } catch { supported = null; }
    }
    const fallback = ['auto','on'];
    const modes = Array.isArray(supported) && supported.length ? supported.map(String) : fallback;

    const current = (getAttr('thermostatFanMode') || modes[0]).toString();
    const idx = Math.max(0, modes.indexOf(current));
    const next = modes[(idx + 1) % modes.length];

    // Send GET to Hubitat
    await window.apiService.sendDeviceCommand(deviceId, 'setThermostatFanMode', next);
    const updated = await window.apiService.getDevice(deviceId);
    this.renderThermostat(updated);
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

  // Inject `scripts/scenes.js` as a module and wait until its globals are available
  _ensureScenesLoaded() {
    if (window.sceneManager || window.showGlobalControlsModal) {
      return Promise.resolve();
    }
    if (this._scenesLoadingPromise) return this._scenesLoadingPromise;

    this._scenesLoadingPromise = new Promise((resolve) => {
      // If a module script for scenes is already present, just poll briefly
      const existing = Array.from(document.scripts).some(s => s.src && s.src.includes('scripts/scenes.js'));
      if (existing) {
        const start = Date.now();
        const check = () => {
          if (window.sceneManager || window.showGlobalControlsModal) return resolve();
          if (Date.now() - start > 2000) return resolve();
          setTimeout(check, 50);
        };
        check();
        return;
      }

      const script = document.createElement('script');
      script.type = 'module';
      script.src = 'scripts/scenes.js';
      script.onload = () => resolve();
      script.onerror = () => resolve();
      document.head.appendChild(script);
    });

    return this._scenesLoadingPromise;
  }

  // Cleanup when UI manager is destroyed
  destroy() {
    if (this.unsubscribeFromState) {
      this.unsubscribeFromState();
    }
  }
}

// Initialize UI Manager
const uiManager = new UIManager();
window.uiManager = uiManager;

// Global function for state manager to call
window.renderDeviceControls = (deviceId, state) => {
  return uiManager.renderDeviceControls(deviceId, state);
};

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