// Comprehensive Modal Management System with Activity-Based Timeouts
// DEBUG: Log modal open/close and fallback (reduced verbosity)
function debugLog(msg) { 
  try { 
    // Only log initialization events, not repetitive activity
    if (msg.includes('Activity listeners set up') || 
        msg.includes('Modal system initialized')) {
      console.log('[MODAL DEBUG]', msg); 
    }
    // Skip repetitive "WebSocket listening enabled" and "Closing modal" messages
  } catch(e){} 
}

// Modal animation from trigger button
let modalTriggerRect = null;

// Global Modal Management Variables
let activeModal = null;
let modalTimeout = null;
let activityTimeout = null;
let isWebSocketListening = true;
let lastActivityTime = Date.now();
const MODAL_TIMEOUT = window.CONFIG?.TIMING?.MODAL_TIMEOUT || 30000; // 30 seconds
const ACTIVITY_CHECK_INTERVAL = 1000; // Check for activity every second
const historyStack = [];

// Activity detection variables
let lastMouseX = 0;
let lastMouseY = 0;
let lastTouchTime = 0;

function showModalBg(triggerSelector) {
  debugLog('showModalBg called with triggerSelector: ' + triggerSelector);
  const bg = document.getElementById('modalBg');
  const modal = document.getElementById('modalContent');
  bg.style.display = 'flex';
  
  // Find trigger button position
  let rect = null;
  if (triggerSelector) {
    const btn = document.querySelector(triggerSelector);
    if (btn) rect = btn.getBoundingClientRect();
    else debugLog('Trigger button not found for selector: ' + triggerSelector);
  }
  modalTriggerRect = rect;
  
  // Center of viewport
  const vw = window.innerWidth, vh = window.innerHeight;
  const modalW = modal.offsetWidth || 480, modalH = modal.offsetHeight || 480;
  let startX = 0, startY = 0;
  
  if (rect) {
    // Start at button center, end at center of viewport
    startX = rect.left + rect.width/2 - vw/2;
    startY = rect.top + rect.height/2 - vh/2;
    debugLog('Animating from button at: ' + JSON.stringify({startX, startY}));
  } else {
    debugLog('No trigger rect, animating from center.');
  }
  
  modal.style.transform = `scale(0.7) translate(${startX}px,${startY}px)`;
  modal.style.opacity = 0;
  
  setTimeout(() => {
    bg.classList.add('visible');
    modal.style.transform = 'scale(1) translate(0,0)';
    modal.style.opacity = 1;
  }, 10);
}

function hideModalBg() {
  const bg = document.getElementById('modalBg');
  const modal = document.getElementById('modalContent');
  
  // Animate back to trigger
  let endX = 0, endY = 0;
  if (modalTriggerRect) {
    const vw = window.innerWidth, vh = window.innerHeight;
    endX = modalTriggerRect.left + modalTriggerRect.width/2 - vw/2;
    endY = modalTriggerRect.top + modalTriggerRect.height/2 - vh/2;
    debugLog('Closing modal, animating back to: ' + JSON.stringify({endX, endY}));
  } else {
    debugLog('Closing modal, no trigger rect, animating to center.');
  }
  
  modal.style.transform = `scale(0.7) translate(${endX}px,${endY}px)`;
  modal.style.opacity = 0;
  bg.classList.remove('visible');
  
  setTimeout(() => { 
    bg.style.display = 'none'; 
  }, 350);
}

// Global showModal function for compatibility
window.showModal = function(html, showBack = false) {
  showModalContent(html, showBack, null);
};

// Override modal show/hide
function showModalContent(html, showBack = false, triggerSelector = null) {
  debugLog('showModalContent called, showBack: ' + showBack + ', triggerSelector: ' + triggerSelector);
  
  const body = document.getElementById('modalBody');
  // Push current snapshot if replacing content and Back requested
  const current = body.innerHTML;
  if (activeModal === 'main' && current && showBack){
    historyStack.push(current);
  }
  body.innerHTML = html;
  
  document.getElementById('backModal').style.display = showBack ? 'block' : 'none';
  showModalBg(triggerSelector);
  activeModal = 'main';
  startModalTimeout();
  startActivityMonitoring();
}

function closeModal() {
  // Clear the current open device ID when modal closes
  window.currentOpenDeviceId = null;
  console.log('Modal closed, cleared currentOpenDeviceId');
  
  clearModalTimeout();
  stopActivityMonitoring();
  historyStack.length = 0;
  hideModalBg();
  activeModal = null;
  // Re-enable websocket listening when closing non-camera modals
  if (activeModal !== 'camera') {
    enableWebSocketListening();
  }
}

// Activity Detection Functions
function startActivityMonitoring() {
  stopActivityMonitoring();
  lastActivityTime = Date.now();
  
  // Monitor for activity
  activityTimeout = setInterval(() => {
    const now = Date.now();
    const timeSinceActivity = now - lastActivityTime;
    
    // If no activity for 30 seconds, close modal
    if (timeSinceActivity >= MODAL_TIMEOUT && activeModal) {
      debugLog('No activity detected for 30 seconds, closing modal');
      closeActiveModal();
    }
  }, ACTIVITY_CHECK_INTERVAL);
  
  debugLog('Activity monitoring started');
}

function stopActivityMonitoring() {
  if (activityTimeout) {
    clearInterval(activityTimeout);
    activityTimeout = null;
    debugLog('Activity monitoring stopped');
  }
}

function recordActivity() {
  lastActivityTime = Date.now();
  // debugLog('Activity recorded at: ' + new Date(lastActivityTime).toLocaleTimeString()); // Removed to prevent console flooding
  
  // If a modal is open, reset the timeout
  if (activeModal) {
    clearModalTimeout();
    startModalTimeout();
  }
}

// WebSocket Management
function disableWebSocketListening() {
  isWebSocketListening = false;
  debugLog('WebSocket listening disabled');
}

function enableWebSocketListening() {
  isWebSocketListening = true;
  debugLog('WebSocket listening enabled');
}

function isWebSocketListeningEnabled() {
  return isWebSocketListening;
}

// Expose for use by other modules
window.isWebSocketListeningEnabled = isWebSocketListeningEnabled;

// Modal Timeout Management
function startModalTimeout() {
  clearModalTimeout();
  modalTimeout = setTimeout(() => {
    if (activeModal) {
      debugLog('Modal timeout reached, closing modal');
      closeActiveModal();
    }
  }, MODAL_TIMEOUT);
}

function clearModalTimeout() {
  if (modalTimeout) {
    clearTimeout(modalTimeout);
    modalTimeout = null;
  }
}

function closeActiveModal() {
  if (activeModal === 'camera') {
    // For camera modal, don't interrupt websocket during timeout
    // but still close the modal
    hideCameraModal();
  } else if (activeModal === 'main') {
    closeModal();
  }
  activeModal = null;
  clearModalTimeout();
  stopActivityMonitoring();
}

// Event Listeners for Activity Detection
function setupActivityListeners() {
  // Mouse movement
  document.addEventListener('mousemove', function(e) {
    const currentTime = Date.now();
    // Only record activity if mouse actually moved
    if (Math.abs(e.clientX - lastMouseX) > 5 || Math.abs(e.clientY - lastMouseY) > 5) {
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
      recordActivity();
    }
  });
  
  // Mouse events
  document.addEventListener('mousedown', recordActivity);
  document.addEventListener('mouseup', recordActivity);
  document.addEventListener('mouseover', recordActivity);
  document.addEventListener('mouseout', recordActivity);
  
  // Touch events
  document.addEventListener('touchstart', function(e) {
    const currentTime = Date.now();
    // Throttle touch events to avoid spam
    if (currentTime - lastTouchTime > 100) {
      lastTouchTime = currentTime;
      recordActivity();
    }
  });
  
  document.addEventListener('touchend', function(e) {
    const currentTime = Date.now();
    if (currentTime - lastTouchTime > 100) {
      lastTouchTime = currentTime;
      recordActivity();
    }
  });
  
  document.addEventListener('touchmove', recordActivity);
  
  // Click events
  document.addEventListener('click', recordActivity);
  
  // Key events
  document.addEventListener('keydown', recordActivity);
  document.addEventListener('keyup', recordActivity);
  document.addEventListener('keypress', recordActivity);
  
  // Scroll events
  document.addEventListener('scroll', recordActivity);
  window.addEventListener('scroll', recordActivity);
  
  // Focus events
  document.addEventListener('focus', recordActivity);
  document.addEventListener('blur', recordActivity);
  
  // Form events
  document.addEventListener('input', recordActivity);
  document.addEventListener('change', recordActivity);
  document.addEventListener('submit', recordActivity);
  
  // Wheel events
  document.addEventListener('wheel', recordActivity);
  
  // Context menu
  document.addEventListener('contextmenu', recordActivity);
  
  // Catch any interactions within modals specifically
  document.addEventListener('click', function(e) {
    // If clicking inside a modal, record activity
    if (e.target.closest('#modalContent') || e.target.closest('#cameraModal')) {
      recordActivity();
    }
  });
  
  debugLog('Activity listeners set up');
}

// Modal Event Handlers
document.getElementById('closeModal').onclick = function() {
  recordActivity(); // Reset timeout on close button click
  closeModal();
};
document.getElementById('modalBg').onclick = function(e) {
  if (e.target === this) {
    recordActivity(); // Reset timeout on background click
    closeModal();
  }
};
document.getElementById('backModal').onclick = function() {
  recordActivity(); // Reset timeout on back button click
  const body = document.getElementById('modalBody');
  const prev = historyStack.pop();
  if (prev){
    // Go back to previous modal content
    body.innerHTML = prev;
    // Update back button visibility based on history stack
    document.getElementById('backModal').style.display = historyStack.length > 0 ? 'block' : 'none';
    console.log('Navigated back to previous modal. History depth:', historyStack.length);
  } else {
    // No history - close the modal
    closeModal();
    console.log('No modal history - closing modal');
  }
};

// Initialize modal system
document.addEventListener('DOMContentLoaded', function() {
  // Ensure modal elements exist
  const modalBg = document.getElementById('modalBg');
  const modalContent = document.getElementById('modalContent');
  const closeBtn = document.getElementById('closeModal');
  const backBtn = document.getElementById('backModal');
  
  if (!modalBg || !modalContent) {
    console.error('Modal elements not found!');
    return;
  }
  
  // Set up activity listeners
  setupActivityListeners();
  
  // Close modal on escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && activeModal) {
      closeActiveModal();
    }
  });
  
  // Prevent modal background clicks from bubbling
  modalContent.addEventListener('click', function(e) {
    e.stopPropagation();
  });
  
  debugLog('Modal system initialized');
});

// Legacy compatibility functions (keeping for existing code)
let modalStack = []; // keeps HTML strings + title/meta
let activeModalType = null; // 'ring' | 'controls' | 'camera' | null

function openModal({ html, showBack=false, replace=true, timeoutMs=30000, type='ring' }) {
  if (activeModalType && replace) {
    // push current so Back works
    modalStack.push({ html: document.getElementById('modalBody').innerHTML, type: activeModalType, showBack: true });
  }
  setModalContent(html);
  document.getElementById('backModal').classList.toggle('is-hidden', !showBack && modalStack.length === 0);
  document.getElementById('modalBg').classList.add('visible');
  activeModalType = type;
  activeModal = 'main';
  startModalTimeout();
  startActivityMonitoring();
}

function setModalContent(html) {
  const body = document.getElementById('modalBody');
  body.innerHTML = html;
}

function backModal() {
  clearModalTimeout();
  if (!modalStack.length) { closeModal(); return; }
  const prev = modalStack.pop();
  setModalContent(prev.html);
  activeModalType = prev.type;
  document.getElementById('backModal').classList.toggle('is-hidden', modalStack.length === 0);
  startModalTimeout();
  startActivityMonitoring();
}

// Wire up legacy event handlers
document.getElementById('closeModal').addEventListener('click', closeModal);
document.getElementById('backModal').addEventListener('click', backModal);
document.getElementById('modalBg').addEventListener('click', (e)=>{ if(e.target.id==='modalBg') closeModal(); });
document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') closeModal(); });