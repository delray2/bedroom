// ==============================
// UI Utilities + Realtime Layer
// ==============================

// --- Side buttons inactivity logic ---
const sideBtns = document.getElementById('sideBtns');

let inactivityTimeout;
const INACTIVITY_DELAY = window.CONFIG?.TIMING?.INACTIVITY_DELAY || 30000; // 30 seconds

function showSideBtns() {
  sideBtns.classList.add('side-btns-visible');
}

function hideSideBtns() {
  sideBtns.classList.remove('side-btns-visible');
}



function resetInactivityTimer() {
  showSideBtns();
  clearTimeout(inactivityTimeout);
  inactivityTimeout = setTimeout(hideSideBtns, INACTIVITY_DELAY);
}

// Make functions available globally
window.resetInactivityTimer = resetInactivityTimer;
window.showSideBtns = showSideBtns;
window.hideSideBtns = hideSideBtns;

// List of events that count as activity
const activityEvents = ['mousemove', 'mousedown', 'touchstart', 'keydown'];

function startInactivityListeners() {
  activityEvents.forEach(event => {
    window.addEventListener(event, resetInactivityTimer, { passive: true });
  });
  resetInactivityTimer();
}

// Wait for first user interaction to show side buttons
function onFirstActivity() {
  showSideBtns();
  activityEvents.forEach(event => {
    window.removeEventListener(event, onFirstActivity, true);
  });
}

// Initialize side button functionality
document.addEventListener('DOMContentLoaded', () => {
  // Start inactivity listeners immediately instead of waiting for first activity
  startInactivityListeners();
  
  // Keep the first activity handler for any additional setup if needed
  activityEvents.forEach(event => {
    window.addEventListener(event, onFirstActivity, true);
  });

  // Emoji fallback: map displayed emoji to local SVGs for Electron
  const emojiToSvg = new Map([
    ['📺', '1f4fa'],
    ['💡', '1f4a1'],
    ['🪟', '1f6cf'],  // Rollershade/window emoji
    ['🔒', '1f512'],
    ['🔓', '1f513'],
    ['📷', '1f4f7'],
    ['🌡️', '1f321'],
    ['🎵', '1f3b5'],
    ['🌙', '1f319'],
    ['☀️', '2600'],
    ['🔆', '1f506'],
    ['🔅', '1f505'],
    ['🔄', '1f504'],
    ['🎨', '1f3a8'],
    ['🎬', '1f3ac'],
    ['✨', '2728'],
    ['🌐', '1f310'],
    ['🧹', '1f9f9'],
    ['🏠', '1f3e0'],
    ['⏸️', '23f8'],
    ['⏹️', '23f9'],
    ['▶️', '25b6'],
    ['🔥', '1f525'],
    ['⬆️', '2b06'],
    ['⬇️', '2b07'],
    ['⬅️', '2b05'],
    ['➡️', '27a1'],
    ['✅', '2705'],
    ['☰', '2630'],
  ]);
  
  // For rollershade button specifically, always use the PNG image since emoji may not render
  const rollershadeBtn = document.querySelector('.side-btn[title="Rollershade"]');
  if (rollershadeBtn) {
    // Always use the PNG image for rollershade button
    rollershadeBtn.style.backgroundImage = "url('assets/roller-shade.png')";
    rollershadeBtn.style.backgroundSize = '60%';
    rollershadeBtn.style.backgroundPosition = 'center';
    rollershadeBtn.style.backgroundRepeat = 'no-repeat';
    rollershadeBtn.style.color = 'transparent'; // Hide the emoji text
    console.log('Applied rollershade PNG image to button');
  }

  function replaceEmojiNode(el) {
    const text = (el.textContent || '').trim();
    if (!text) return;
    const code = emojiToSvg.get(text);
    if (!code) return;
    const svgPath = `assets/emoji/${code}.svg`;
    el.classList.add('emoji-replaced', 'emoji-bg');
    el.style.backgroundImage = `url("${svgPath}")`;
  }

  // Emoji replacement logic removed - side buttons now have direct background images in HTML

  // Replace inline icon spans inside bubble buttons/modal actions
  document.querySelectorAll('.bubble-btn .icon, .power-icon, #lockIndicator').forEach(replaceEmojiNode);
});

// --- Lock indicator helpers ---
function getLockDeviceId() {
  return localStorage.getItem('FRONT_DOOR_LOCK_ID') || window.CONFIG.DEVICES.FRONT_DOOR_LOCK;
}

function setLockIndicator(state) {
  const el = document.getElementById('lockIndicator');
  if (!el) return;
  const normalized = (state || '').toString().toLowerCase();
  if (normalized === 'locked') {
    el.style.backgroundImage = "url('assets/emoji/1f512.svg')";
    el.style.backgroundSize = "50%";
    el.style.backgroundPosition = "center";
    el.style.backgroundRepeat = "no-repeat";
    el.classList.add('locked');
    el.classList.remove('unlocked');
  } else if (normalized === 'unlocked') {
    el.style.backgroundImage = "url('assets/emoji/1f513.svg')";
    el.style.backgroundSize = "50%";
    el.style.backgroundPosition = "center";
    el.style.backgroundRepeat = "no-repeat";
    el.classList.add('unlocked');
    el.classList.remove('locked');
  } else {
    el.style.backgroundImage = "url('assets/emoji/2753.svg')"; // Question mark
    el.style.backgroundSize = "50%";
    el.style.backgroundPosition = "center";
    el.style.backgroundRepeat = "no-repeat";
    el.classList.remove('locked', 'unlocked');
  }
}

async function refreshLockIndicator() {
  try {
    const id = getLockDeviceId();
    const base = window.MAKER_API_BASE;
    const token = window.ACCESS_TOKEN;
    if (!base || !token) return;
    const res = await fetch(`${base}/devices/${id}?access_token=${token}`);
    if (!res.ok) return;
    const dev = await res.json();
    const attrs = dev.attributes || {};
    const val = Array.isArray(attrs) ? (attrs.find(a => a.name === 'lock')?.currentValue) : attrs.lock;
    setLockIndicator(val);

    // Update state manager if available
    if (window.deviceStateManager) {
      const normalizedAttrs = window.deviceStateManager.normalizeAttributes
        ? window.deviceStateManager.normalizeAttributes(attrs)
        : attrs;
      window.deviceStateManager.updateDevice(id, normalizedAttrs);
    }
  } catch (_) {}
}

// --- WebSocket for real-time updates ---
let ws = null;
const MAX_RECONNECT_ATTEMPTS = 5;

// Reconnect banner
let reconnectBanner;
function ensureReconnectBanner() {
  if (reconnectBanner) return reconnectBanner;
  reconnectBanner = document.createElement('div');
  reconnectBanner.id = 'reconnectBanner';
  reconnectBanner.textContent = 'Reconnecting…';
  reconnectBanner.setAttribute('aria-live', 'polite');
  reconnectBanner.style.display = 'none';
  document.body.appendChild(reconnectBanner);
  return reconnectBanner;
}

// Message schema validation
function isValidWsMessage(msg) {
  if (!msg || typeof msg !== 'object') return false;
  const { type, deviceId, attributes, timestamp } = msg;
  const validType = typeof type === 'string' && type.length > 0;
  const hasDevice = (type === 'device_state_update') ? (deviceId !== undefined) : true;
  const hasAttrs = (type === 'device_state_update') ? (attributes && typeof attributes === 'object') : true;
  const hasTs = (timestamp === undefined) || Number.isFinite(Number(timestamp));
  return validType && hasDevice && hasAttrs && hasTs;
}

let wsReconnectAttempts = 0;
function scheduleReconnect() {
  wsReconnectAttempts++;
  const backoff = Math.min(1000 * Math.pow(2, wsReconnectAttempts), 30000);
  ensureReconnectBanner().style.display = 'block';
  setTimeout(connectWebSocket, backoff);
}

function connectWebSocket() {
  try {
    ws?.close?.();
  } catch {}
  ws = new WebSocket(window.CONFIG.BACKEND.websocketUrl());

  ws.onopen = function () {
    console.log('WebSocket connected');
    wsReconnectAttempts = 0;
    try { ensureReconnectBanner().style.display = 'none'; } catch (e) {}

    // Request initial state refresh for key devices
    if (window.deviceStateManager && !window._initialRefreshDone) {
      requestInitialStateRefresh();
      window._initialRefreshDone = true;
    }
  };

  ws.onclose = function () {
    console.log('WebSocket disconnected');
    if (wsReconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      scheduleReconnect();
    } else {
      ensureReconnectBanner().textContent = 'Connection lost.';
      ensureReconnectBanner().style.display = 'block';
    }
  };

  ws.onerror = function (error) {
    console.error('WebSocket error:', error);
  };

  ws.onmessage = function (event) {
    try {
      const raw = typeof event.data === 'string' ? event.data : '';

      // Handle Reolink camera notifications - ALWAYS interrupt any modal except camera modal
      if (raw && raw.toLowerCase().includes('reolink')) {
        console.log('Reolink message received, checking modal state...');
        if (window.activeModal === 'camera') return;
        if (window.activeModal && window.activeModal !== 'camera') {
          if (typeof window.closeActiveModal === 'function') window.closeActiveModal();
        }
        if (typeof window.showCameraModal === 'function') window.showCameraModal();
        return;
      }

      // Respect global toggle
      if (typeof window.isWebSocketListeningEnabled === 'function' && !window.isWebSocketListeningEnabled()) {
        console.log('WebSocket listening disabled, ignoring message');
        return;
      }

      const msg = JSON.parse(event.data);
      if (!isValidWsMessage(msg)) return;
      handleWebSocketMessage(msg);
    } catch (e) {
      console.error('WebSocket message error:', e);
    }
  };
}

// Handle different types of WebSocket messages
function handleWebSocketMessage(msg) {
  const { type, deviceId, attributes, payload, timestamp } = msg;

  switch (type) {
    case 'device_state_update':
      handleDeviceStateUpdate(deviceId, attributes, timestamp);
      break;
    case 'device_notification':
      handleDeviceNotification(payload);
      break;
    case 'lrgroup_update':
      handleLRGroupUpdate(payload);
      break;
    case 'device_refresh_request':
      handleDeviceRefreshRequest(deviceId);
      break;
    case 'bulk_device_refresh_request':
      handleBulkDeviceRefreshRequest(payload.deviceIds);
      break;
    case 'reolink_webhook':
      // handled earlier
      break;
    case 'spotify_state_change':
      // Route Spotify state changes to the unified state manager
      if (window.deviceStateManager) {
        window.deviceStateManager.handleWebSocketMessage(JSON.stringify(msg));
      }
      break;
    default:
      console.log('Unknown WebSocket message type:', type, msg);
  }
}

// Handle device state updates from Hubitat
function handleDeviceStateUpdate(deviceId, attributes, timestamp) {
  console.log('Device state update received:', { deviceId, attributes, timestamp });

  // Prefer centralized handler from main.js, but avoid self-recursion if not yet set
  const centralHandler = window.handleDeviceStateUpdate;
  if (typeof centralHandler === 'function' && centralHandler !== handleDeviceStateUpdate) {
    centralHandler(deviceId, attributes);
    return;
  }

  if (!window.deviceStateManager) {
    console.warn('State manager not available');
    return;
  }

  // Update state manager
  window.deviceStateManager.updateDevice(deviceId, attributes);

  // Update specific UI elements based on device type
  updateUIForDevice(deviceId, attributes);
}

function updateUIForDevice(deviceId, attributes) {
  // Update lock indicator if this is the lock device
  if (String(deviceId) === String(getLockDeviceId()) && attributes.lock !== undefined) {
    setLockIndicator(attributes.lock);
  }

  // Bedroom group paddle UI sync
  if (String(deviceId) === String(window.BEDROOM_GROUP_ID) &&
      (attributes.groupState !== undefined || attributes.switch !== undefined)) {
    const hasGroup = attributes.groupState !== undefined;
    const isOn = hasGroup ? (attributes.groupState === 'allOn' || attributes.groupState === 'on')
                          : (attributes.switch === 'on');
    if (typeof window.updatePaddleSwitchUI === 'function') {
      window.updatePaddleSwitchUI(isOn);
    }
  }

  updateOpenDeviceModals(deviceId, attributes);
  updateGlobalControls(deviceId, attributes);
}

function updateOpenDeviceModals(deviceId, attributes) {
  const modalBody = document.getElementById('modalBody');
  if (!modalBody) return;

  // Check if a device modal is currently open by looking for sliderCarousel
  const sliderCarousel = modalBody.querySelector('#sliderCarousel');
  if (sliderCarousel && sliderCarousel.style.display !== 'none') {
    // Check if this is the currently open device modal
    const currentOpenDeviceId = window.currentOpenDeviceId;
    if (currentOpenDeviceId && String(currentOpenDeviceId) === String(deviceId)) {
      console.log(`Updating open device modal for device ${deviceId}:`, attributes);
      
      // Get the latest device state from state manager
      const attrs = (window.deviceStateManager && window.deviceStateManager.getDevice(deviceId)) || {};
      
      // Update the device controls with fresh data
      if (typeof window.renderDeviceControls === 'function') {
        // Use the device info from DEVICE_MAP or bedroomDevices
        const deviceInfo = window.DEVICE_MAP?.[deviceId] || window.bedroomDevices?.[deviceId];
        const capabilities = deviceInfo?.capabilities || [];
        window.renderDeviceControls({ attributes: attrs, capabilities }, deviceId, true);
      } else if (window.uiManager?.loadDeviceControls) {
        window.uiManager.loadDeviceControls(deviceId, true);
      }
      
      // Also update sliders directly if carousel is already initialized
      if (typeof window.updateSlidersFromState === 'function') {
        console.log(`🎛️ Updating sliders directly for device ${deviceId}`);
        window.updateSlidersFromState(attrs);
      }
    }
  }

  // Thermostat re-render
  if (window.uiManager?.isThermostatModalVisible?.() && String(deviceId) === window.CONFIG.DEVICES.ENTRYWAY_THERMOSTAT) {
    const dev = { attributes: (window.deviceStateManager && window.deviceStateManager.getDevice(window.CONFIG.DEVICES.ENTRYWAY_THERMOSTAT)) || {} };
    if (typeof window.uiManager.renderThermostat === 'function') {
      window.uiManager.renderThermostat(dev);
    }
  }
}

function updateGlobalControls(deviceId, attributes) {
  const globalModal = document.querySelector('.global-ring-top');
  if (globalModal && globalModal.style.display !== 'none') {
    if (window.renderGlobalControls && String(deviceId) === String(window.BEDROOM_GROUP_ID)) {
      const attrs = (window.deviceStateManager && window.deviceStateManager.getDevice(window.BEDROOM_GROUP_ID)) || attributes || {};
      window.renderGlobalControls({ attributes: attrs });
    }
  }
}

// Handle device notifications
function handleDeviceNotification(payload) {
  console.log('Device notification received:', payload);
  if (String(payload.deviceId) === String(getLockDeviceId())) {
    if (payload.name === 'lock') {
      const value = payload.value || payload.currentValue;
      setLockIndicator(value);
    }
  }
}

// Handle LRGroup updates (example: Fan 2)
function handleLRGroupUpdate(payload) {
  console.log('LRGroup update received:', payload);
  if (String(payload.deviceId) === window.CONFIG.DEVICES.BEDROOM_FAN_2) {
    if (payload.value !== undefined || payload.name === 'switch') {
      if (typeof window.setPaddleSwitch === 'function') {
        const v = payload.value ?? payload.currentValue ?? payload.value;
        window.setPaddleSwitch(v === 'on');
      }
    }
  }
}

function handleDeviceRefreshRequest(deviceId) {
  console.log('Device refresh requested for:', deviceId);
  // intentionally not spamming refresh
}

function handleBulkDeviceRefreshRequest(deviceIds) {
  console.log('Bulk device refresh requested for:', deviceIds);
  if (window.deviceStateManager) {
    deviceIds.forEach(deviceId => window.deviceStateManager.refreshDevice(deviceId));
  }
}

// Request initial state refresh for key devices
function requestInitialStateRefresh() {
  const keyDevices = [
    window.CONFIG.DEVICES.BEDROOM_FAN_2,
    window.CONFIG.DEVICES.FRONT_DOOR_LOCK,
    window.CONFIG.DEVICES.BEDROOM_GROUP,
    window.CONFIG.DEVICES.BED_LAMP,
    window.CONFIG.DEVICES.LAUNDRY_1,
    window.CONFIG.DEVICES.BEDROOM_FAN_1,
    window.CONFIG.DEVICES.ENTRYWAY_THERMOSTAT,
    window.CONFIG.DEVICES.BEDROOM_TV,
    window.CONFIG.DEVICES.ROKU_TV_50
  ].filter(Boolean);

  keyDevices.forEach(deviceId => {
    window.deviceStateManager?.refreshDevice(deviceId);
  });
}

// Initialize WebSocket connection
connectWebSocket();

// Performance monitoring
if ('performance' in window) {
  window.addEventListener('load', () => {
    const nav = performance.getEntriesByType('navigation')[0];
    if (nav) {
      console.log('Page load time:', nav.loadEventEnd - nav.loadEventStart, 'ms');
      console.log('DOM content loaded:', nav.domContentLoadedEventEnd - nav.domContentLoadedEventStart, 'ms');
    }
  });
}

// Video stream performance monitoring
function logStreamPerformance(streamType, startTime) {
  const endTime = performance.now();
  const duration = endTime - startTime;
  console.log(`Stream initialization (${streamType}): ${duration.toFixed(2)}ms`);
  if (window.gtag) {
    window.gtag('event', 'stream_performance', {
      stream_type: streamType,
      load_time: duration
    });
  }
}

// Toast notification system
function showToast(message, type = 'success', duration = 3000) {
  // Remove existing toasts
  document.querySelectorAll('.toast').forEach(t => t.remove());

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  // Trigger animation
  setTimeout(() => toast.classList.add('show'), 10);

  // Auto remove
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

window.showToast = showToast;
