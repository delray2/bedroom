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
});

// --- WebSocket for real-time updates ---
let ws = null;
let wsReconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

function connectWebSocket() {
  ws = new WebSocket('ws://localhost:4712');
  
  ws.onopen = function() {
    console.log('WebSocket connected');
    wsReconnectAttempts = 0;
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
      const msg = JSON.parse(event.data);
      // Only update UI if Fan 2 state changes
      if (msg.type === 'lrgroup_update' && msg.payload && (msg.payload.deviceId === FAN2_ID || msg.payload.deviceId === Number(FAN2_ID))) {
        if (msg.payload.value) {
          setPaddleSwitch(msg.payload.value === 'on');
        } else if (msg.payload.name === 'switch') {
          setPaddleSwitch(msg.payload.value === 'on');
        }
      }
      // --- Doorbell Notification Camera Modal ---
      // Accept any notification with an 'alarm' property and device/deviceModel containing 'Reolink Video Doorbell'
      if (msg.alarm && (msg.alarm.device || msg.alarm.deviceModel) &&
          (msg.alarm.device?.toLowerCase().includes('reolink') || msg.alarm.deviceModel?.toLowerCase().includes('reolink'))) {
        showCameraModal();
      }
    } catch (e) {
      console.error('WebSocket message error:', e);
    }
  };
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