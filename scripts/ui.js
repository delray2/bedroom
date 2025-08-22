// --- Side buttons inactivity logic ---
const sideBtns = document.getElementById('sideBtns');
let inactivityTimeout;
const INACTIVITY_DELAY = 10000; // 10 seconds

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

// List of events that count as activity
const activityEvents = ['mousemove', 'mousedown', 'touchstart', 'keydown'];

function startInactivityListeners() {
  activityEvents.forEach(event => {
    window.addEventListener(event, resetInactivityTimer, {passive: true});
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
document.addEventListener('DOMContentLoaded', function() {
  activityEvents.forEach(event => {
    window.addEventListener(event, onFirstActivity, true);
  });

  // Emoji fallback: map displayed emoji to local SVGs for Electron
  const emojiToSvg = new Map([
    ['📺','1f4fa'],
    ['💡','1f4a1'],
    ['🪟','1f6cf'],
    ['🔒','1f512'],
    ['🔓','1f513'],
    ['📷','1f4f7'],
    ['🌡️','1f321'],
    ['🎵','1f3b5'],
    ['🌙','1f319'],
    ['☀️','2600'],
    ['🔆','1f506'],
    ['🔅','1f505'],
    ['🔄','1f504'],
    ['🎨','1f3a8'],
    ['🎬','1f3ac'],
    ['✨','2728'],
    ['🌐','1f310'],
    ['🧹','1f9f9'],
    ['🏠','1f3e0'],
    ['⏸️','23f8'],
    ['⏹️','23f9'],
    ['▶️','25b6'],
    ['🔥','1f525'],
    ['⬆️','2b06'],
    ['⬇️','2b07'],
    ['⬅️','2b05'],
    ['➡️','27a1'],
    ['✅','2705'],
    ['☰','2630'],
  ]);

  function replaceEmojiNode(el) {
    const text = (el.textContent || '').trim();
    if (!text) return;
    const code = emojiToSvg.get(text);
    if (!code) return;
    const svgPath = `assets/emoji/${code}.svg`;
    // mark and style
    el.classList.add('emoji-replaced','emoji-bg');
    el.style.backgroundImage = `url("${svgPath}")`;
  }

  // Replace in side buttons (button text is the emoji)
  document.querySelectorAll('.side-btn').forEach(btn => {
    // skip the theme toggle because it switches icons dynamically; it will be replaced later per run
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
    el.classList.remove('locked','unlocked');
  }
  // apply emoji replacement if needed
  const emojiToSvg = { '🔒':'1f512', '🔓':'1f513' };
  const code = emojiToSvg[el.textContent];
  if (code) {
    el.classList.add('emoji-replaced','emoji-bg');
    el.style.backgroundImage = `url("assets/emoji/${code}.svg")`;
  }
}

async function refreshLockIndicator() {
  try {
    const id = getLockDeviceId();
    const res = await fetch(`${window.MAKER_API_BASE}/devices/${id}?access_token=${window.ACCESS_TOKEN}`);
    if (!res.ok) return;
    const dev = await res.json();
    const attrs = dev.attributes || {};
    const val = Array.isArray(attrs) ? (attrs.find(a=>a.name==='lock')?.currentValue) : attrs.lock;
    setLockIndicator(val);
    
    // Update state manager if available
    if (window.deviceStateManager) {
      const normalizedAttrs = window.deviceStateManager.normalizeAttributes(attrs);
      window.deviceStateManager.updateDevice(id, normalizedAttrs);
    }
  } catch (_) {}
}

// --- WebSocket for real-time updates ---
let ws = null;
let wsReconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

function connectWebSocket() {
  ws = new WebSocket('ws://localhost:4712');
  
  ws.onopen = function() {
    console.log('WebSocket connected');
    wsReconnectAttempts = 0;
    
    // Request initial state refresh for key devices
    if (window.deviceStateManager) {
      requestInitialStateRefresh();
    }
  };
  
  ws.onclose = function() {
    console.log('WebSocket disconnected');
    if (wsReconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      wsReconnectAttempts++;
      setTimeout(connectWebSocket, 1000 * wsReconnectAttempts);
    }
  };
  
  ws.onerror = function(error) {
    console.error('WebSocket error:', error);
  };
  
  ws.onmessage = function(event) {
    try {
      const raw = typeof event.data === 'string' ? event.data : '';
      
      // Handle Reolink camera notifications
      if (raw && raw.toLowerCase().includes('reolink')) {
        showCameraModal();
      }
      
      const msg = JSON.parse(event.data);
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
      // Camera notification - handled above
      break;
      
    default:
      console.log('Unknown WebSocket message type:', type, msg);
  }
}

// Handle device state updates from Hubitat
function handleDeviceStateUpdate(deviceId, attributes, timestamp) {
  console.log('Device state update received:', { deviceId, attributes, timestamp });
  
  if (!window.deviceStateManager) {
    console.warn('State manager not available');
    return;
  }
  
  // Update state manager
  window.deviceStateManager.updateDevice(deviceId, attributes);
  
  // Update specific UI elements based on device type
  updateUIForDevice(deviceId, attributes);
}

// Update UI elements for a specific device
function updateUIForDevice(deviceId, attributes) {
  // Update lock indicator if this is the lock device
  if (deviceId === getLockDeviceId() && attributes.lock !== undefined) {
    setLockIndicator(attributes.lock);
  }
  
  // Update paddle switch if this is Bedroom Lights group (ID: 457) - only from external state changes
  if (deviceId === '457' && attributes.switch !== undefined) {
    console.log('External state change for Bedroom Lights:', attributes.switch);
    if (typeof setPaddleSwitch === 'function') {
      setPaddleSwitch(attributes.switch === 'on');
    }
  }
  
  // Update device modals if they're open
  updateOpenDeviceModals(deviceId, attributes);
  
  // Update global controls if they're open
  updateGlobalControls(deviceId, attributes);
}

// Update device modals that are currently open
function updateOpenDeviceModals(deviceId, attributes) {
  const modalBody = document.getElementById('modalBody');
  if (!modalBody) return;
  
  // Check if device controls are visible and update them
  const deviceControls = modalBody.querySelector('#deviceControls');
  if (deviceControls && deviceControls.style.display !== 'none') {
    // Find which device modal is open and update it
    const deviceIdMatch = deviceControls.querySelector(`[data-device-id="${deviceId}"]`);
    if (deviceIdMatch) {
      // Trigger a refresh of the device controls
      if (window.uiManager && window.uiManager.loadDeviceControls) {
        window.uiManager.loadDeviceControls(deviceId, true);
      }
    }
  }
}

// Update global controls if they're open
function updateGlobalControls(deviceId, attributes) {
  // Check if global controls modal is open
  const globalModal = document.querySelector('.global-ring-top');
  if (globalModal && globalModal.style.display !== 'none') {
    // Update global controls display
    if (window.renderGlobalControls && deviceId === '457') { // Bedroom Lights group
      window.renderGlobalControls({ attributes });
    }
  }
}

// Handle device notifications
function handleDeviceNotification(payload) {
  console.log('Device notification received:', payload);
  
  // Handle lock updates
  if (payload.deviceId === getLockDeviceId()) {
    if (payload.name === 'lock' || payload.name === 'contact') {
      const value = payload.value || payload.currentValue;
      if (payload.name === 'lock') {
        setLockIndicator(value);
      }
    }
  }
}

// Handle LRGroup updates
function handleLRGroupUpdate(payload) {
  console.log('LRGroup update received:', payload);
  
  if (payload.deviceId === '451' || payload.deviceId === 451) { // Fan 2
    console.log('BRGroup update for Fan 2:', payload);
    
    if (payload.value !== undefined) {
      if (typeof setPaddleSwitch === 'function') {
        setPaddleSwitch(payload.value === 'on');
      }
    } else if (payload.name === 'switch') {
      if (typeof setPaddleSwitch === 'function') {
        setPaddleSwitch(payload.value === 'on');
      }
    }
  }
}

// Handle device refresh requests
function handleDeviceRefreshRequest(deviceId) {
  console.log('Device refresh requested for:', deviceId);
  
  if (window.deviceStateManager) {
    window.deviceStateManager.refreshDevice(deviceId);
  }
}

// Handle bulk device refresh requests
function handleBulkDeviceRefreshRequest(deviceIds) {
  console.log('Bulk device refresh requested for:', deviceIds);
  
  if (window.deviceStateManager) {
    deviceIds.forEach(deviceId => {
      window.deviceStateManager.refreshDevice(deviceId);
    });
  }
}

// Request initial state refresh for key devices
function requestInitialStateRefresh() {
  const keyDevices = ['451', '509', '457']; // Fan 2, Lock, Bedroom Lights
  
  keyDevices.forEach(deviceId => {
    if (window.deviceStateManager) {
      window.deviceStateManager.refreshDevice(deviceId);
    }
  });
}

// Initialize WebSocket connection
connectWebSocket();

// Performance monitoring
if ('performance' in window) {
  window.addEventListener('load', () => {
    const perfData = performance.getEntriesByType('navigation')[0];
    console.log('Page load time:', perfData.loadEventEnd - perfData.loadEventStart, 'ms');
    console.log('DOM content loaded:', perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart, 'ms');
  });
}

// Video stream performance monitoring
function logStreamPerformance(streamType, startTime) {
  const endTime = performance.now();
  const duration = endTime - startTime;
  console.log(`Stream initialization (${streamType}): ${duration.toFixed(2)}ms`);
  
  // Send to analytics if available
  if (window.gtag) {
    gtag('event', 'stream_performance', {
      stream_type: streamType,
      load_time: duration
    });
  }
}

// Toast notification system
function showToast(message, type = 'success', duration = 3000) {
  // Remove existing toasts
  const existingToasts = document.querySelectorAll('.toast');
  existingToasts.forEach(toast => toast.remove());
  
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

// Make showToast available globally
window.showToast = showToast; 