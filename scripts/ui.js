// ==============================
// UI Utilities + Realtime Layer
// ==============================

// --- Side buttons inactivity logic ---
const sideBtns = document.getElementById('sideBtns');
// NOTE: keep the DOM id spelling as-is to match HTML/CSS (#side-carosel)
const sideCarosel = document.getElementById('side-carosel');

let inactivityTimeout;
const INACTIVITY_DELAY = 10000; // 10 seconds

function showSideBtns() {
  sideBtns.classList.add('side-btns-visible');

  // Show the left-side carousel
  const container = document.getElementById('side-carousel-container');
  container.classList.add('side-carosel-visible');

  const rail = document.getElementById('side-carosel');
  if (!rail || rail.children.length === 0) {
    window.initializeSideCarousel(window.BEDROOM_GROUP_ID || 457);
  }

  requestAnimationFrame(positionSideCarousel);
}

function hideSideBtns() {
  sideBtns.classList.remove('side-btns-visible');

  const container = document.getElementById('side-carousel-container');
  container.classList.remove('side-carosel-visible');

  window.hideSideCarosel?.();
}

function positionSideCarousel() {
  const container = document.getElementById('side-carousel-container');
  const rail = document.getElementById('side-carosel');
  const plate = document.querySelector('.wall-plate');
  const sideBtns = document.getElementById('sideBtns');
  if (!container || !rail || !plate || !sideBtns) return;

  const plateBox = plate.getBoundingClientRect();
  const btnsBox = sideBtns.getBoundingClientRect();

  const rightGap = Math.max(0, btnsBox.left - plateBox.right);
  const desiredWidth = Math.max(280, Math.min(420, btnsBox.width));

  const targetRightEdge = plateBox.left - rightGap;
  let leftPx = targetRightEdge - desiredWidth;
  if (leftPx < 12) leftPx = 12;

  container.style.left = `${leftPx}px`;
  container.style.width = `${desiredWidth}px`;

  rail.style.width = '100%';
  rail.style.height = `${Math.min(plateBox.height, 0.5 * window.innerHeight)}px`;
  rail.style.position = 'relative';

  const sideNav = document.getElementById('side-nav');
  if (sideNav) {
    sideNav.style.width = '100%';
    sideNav.style.height = '100%';
  }
}

window.addEventListener('resize', positionSideCarousel);
window.addEventListener('orientationchange', positionSideCarousel);

function resetInactivityTimer() {
  showSideBtns();
  clearTimeout(inactivityTimeout);
  inactivityTimeout = setTimeout(hideSideBtns, INACTIVITY_DELAY);
}

// List of events that count as activity
const activityEvents = ['mousemove', 'mousedown', 'touchstart', 'keydown'];

function startInactivityListeners() {
  activityEvents.forEach(event => {
    window.addEventListener(event, resetInactivityTimer, { passive: true });
  });
  resetInactivityTimer();
}

// Wait for first user interaction to show side buttons and start timer logic
function onFirstActivity() {
  showSideBtns();
  startInactivityListeners();
  activityEvents.forEach(event => {
    window.removeEventListener(event, onFirstActivity, true);
  });
}

// Initialize side button functionality
document.addEventListener('DOMContentLoaded', () => {
  activityEvents.forEach(event => {
    window.addEventListener(event, onFirstActivity, true);
  });

  // Emoji fallback: map displayed emoji to local SVGs for Electron
  const emojiToSvg = new Map([
    ['📺', '1f4fa'],
    ['💡', '1f4a1'],
    ['🪟', '1f6cf'],
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

  function replaceEmojiNode(el) {
    const text = (el.textContent || '').trim();
    if (!text) return;
    const code = emojiToSvg.get(text);
    if (!code) return;
    const svgPath = `assets/emoji/${code}.svg`;
    el.classList.add('emoji-replaced', 'emoji-bg');
    el.style.backgroundImage = `url("${svgPath}")`;
  }

  // Replace in side buttons (button text is the emoji)
  document.querySelectorAll('.side-btn').forEach(btn => {
    // skip theme toggle; it switches icons dynamically
    if (btn.id === 'themeToggle') return;
    replaceEmojiNode(btn);
  });

  // Replace inline icon spans inside bubble buttons/modal actions
  document.querySelectorAll('.bubble-btn .icon, .power-icon, #lockIndicator').forEach(replaceEmojiNode);
});

// --- Lock indicator helpers ---
function getLockDeviceId() {
  return localStorage.getItem('FRONT_DOOR_LOCK_ID') || '509';
}

function setLockIndicator(state) {
  const el = document.getElementById('lockIndicator');
  if (!el) return;
  const normalized = (state || '').toString().toLowerCase();
  if (normalized === 'locked') {
    el.textContent = '🔒';
    el.classList.add('locked');
    el.classList.remove('unlocked');
  } else if (normalized === 'unlocked') {
    el.textContent = '🔓';
    el.classList.add('unlocked');
    el.classList.remove('locked');
  } else {
    el.textContent = '❔';
    el.classList.remove('locked', 'unlocked');
  }
  // apply emoji replacement if needed
  const emojiToSvg = { '🔒': '1f512', '🔓': '1f513' };
  const code = emojiToSvg[el.textContent];
  if (code) {
    el.classList.add('emoji-replaced', 'emoji-bg');
    el.style.backgroundImage = `url("assets/emoji/${code}.svg")`;
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
  ws = new WebSocket('ws://localhost:4712');

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
        console.log('Reolink message received, handling camera modal trigger.');
        if (typeof window.handleCameraModalTrigger === 'function') {
          window.handleCameraModalTrigger();
        } else if (typeof window.showCameraModal === 'function') {
          window.showCameraModal();
        }
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

  // Update generic device controls
  const deviceControls = modalBody.querySelector('#deviceControls');
  if (deviceControls && deviceControls.style.display !== 'none') {
    const openId = deviceControls.getAttribute('data-device-id');
    if (openId && String(openId) === String(deviceId)) {
      const attrs = (window.deviceStateManager && window.deviceStateManager.getDevice(deviceId)) || {};
      if (typeof window.renderDeviceControls === 'function') {
        window.renderDeviceControls({ attributes: attrs, capabilities: [] }, deviceId, true);
      } else if (window.uiManager?.loadDeviceControls) {
        window.uiManager.loadDeviceControls(deviceId, true);
      }
    }
  }

  // Thermostat re-render
  if (window.uiManager?.isThermostatModalVisible?.() && String(deviceId) === '86') {
    const dev = { attributes: (window.deviceStateManager && window.deviceStateManager.getDevice('86')) || {} };
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
  if (String(payload.deviceId) === '451') {
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
    '451', // Bedroom Fan 2
    '509', // Front Door Lock
    window.BEDROOM_GROUP_ID, // BedroomLifxGOG
    '447', // Bed Lamp
    '450', // Laundry 1
    '480', // Bedroom Fan 1
    '86',  // Entryway Thermostat
    '473', // Bedroom TV
    '474'  // 50" Philips Roku TV
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
