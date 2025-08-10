// DEBUG: Log modal open/close and fallback
function debugLog(msg) { try { console.log('[MODAL DEBUG]', msg); } catch(e){} }

// Modal animation from trigger button
let modalTriggerRect = null;

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
  
  // Check if HTML already has modal-content wrapper
  if (html.includes('modal-content')) {
    // Already wrapped, use as is
    document.getElementById('modalBody').innerHTML = html;
  } else {
    // Wrap in modal-content
    document.getElementById('modalBody').innerHTML = `<div class="modal-content">${html}</div>`;
  }
  
  document.getElementById('backModal').style.display = showBack ? 'block' : 'none';
  showModalBg(triggerSelector);
  activeModal = 'main';
  startModalTimeout();
}

function closeModal() {
  hideModalBg();
  activeModal = null;
  clearModalTimeout();
}

document.getElementById('closeModal').onclick = closeModal;
document.getElementById('modalBg').onclick = function(e) {
  if (e.target === this) closeModal();
};
document.getElementById('backModal').onclick = function() {
  if (window.uiManager) {
    window.uiManager.showBubbleChartModal();
  }
};

// --- Global Modal Management ---
let activeModal = null;
let modalTimeout = null;
const MODAL_TIMEOUT = 30000; // 30 seconds

function startModalTimeout() {
  clearModalTimeout();
  modalTimeout = setTimeout(() => {
    if (activeModal) {
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
    hideCameraModal();
  } else if (activeModal === 'main') {
    closeModal();
  }
  activeModal = null;
  clearModalTimeout();
}

// Event listeners for modal system
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
});

// DON'T touch camera modal: leave its code/ids/handlers alone.

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
  startModalTimeout(timeoutMs);
}

function setModalContent(html) {
  const body = document.getElementById('modalBody');
  body.innerHTML = html;
}

function closeModal() {
  clearModalTimeout();
  modalStack = [];
  activeModalType = null;
  hideModalBg();
}

function backModal() {
  clearModalTimeout();
  if (!modalStack.length) { closeModal(); return; }
  const prev = modalStack.pop();
  setModalContent(prev.html);
  activeModalType = prev.type;
  document.getElementById('backModal').classList.toggle('is-hidden', modalStack.length === 0);
  startModalTimeout(30000);
}

let modalTimeoutHandle = null;
function startModalTimeout(ms) {
  clearModalTimeout();
  if (!ms) return;
  modalTimeoutHandle = setTimeout(closeModal, ms);
}
function clearModalTimeout() {
  if (modalTimeoutHandle) clearTimeout(modalTimeoutHandle);
  modalTimeoutHandle = null;
}

// Wire up
document.getElementById('closeModal').addEventListener('click', closeModal);
document.getElementById('backModal').addEventListener('click', backModal);
document.getElementById('modalBg').addEventListener('click', (e)=>{ if(e.target.id==='modalBg') closeModal(); });
document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') closeModal(); }); 