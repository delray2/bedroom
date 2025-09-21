// --- Camera Modal Logic ---
const CAMERA_TRANSITION_MS = 340;

let videoStream = null;
let currentVideoElement = null;
let cameraHideTimer = null;
let cameraShellBound = false;

function syncActiveModal(state) {
  if (typeof setActiveModal === 'function') {
    setActiveModal(state);
  } else {
    window.activeModal = state;
  }
}

function resetCameraModalTimeout() {
  if (typeof recordActivity === 'function') {
    recordActivity();
    return;
  }

  if (typeof clearModalTimeout === 'function') clearModalTimeout();
  if (typeof startModalTimeout === 'function') startModalTimeout();
}

function handleCameraInteraction() {
  resetCameraModalTimeout();
}

function bindShellInteractions(modal) {
  if (!modal || cameraShellBound) return;
  modal.addEventListener('pointerdown', handleCameraInteraction);
  modal.addEventListener('click', handleCameraInteraction);
  cameraShellBound = true;
}

function attachMediaListeners(element) {
  if (!element) return;
  element.addEventListener('pointerdown', handleCameraInteraction);
  element.addEventListener('click', handleCameraInteraction);
  element.addEventListener('touchstart', handleCameraInteraction, { passive: true });
}

function cleanupExistingMedia(modal) {
  if (currentVideoElement) {
    currentVideoElement.remove();
    currentVideoElement = null;
  }

  const iframe = modal?.querySelector('iframe');
  if (iframe) {
    iframe.src = '';
    iframe.remove();
  }
}

async function showCameraModal() {
  const startTime = performance.now();
  const bg = document.getElementById('cameraModalBg');
  const modal = document.getElementById('cameraModal');

  if (!bg || !modal) {
    console.error('Camera modal elements not found!');
    return;
  }

  if (window.activeModal === 'camera') {
    console.log('Camera modal already open, extending timeout.');
    resetCameraModalTimeout();
    return;
  }

  clearTimeout(cameraHideTimer);
  modal.classList.remove('is-hiding');
  bg.classList.add('visible');
  syncActiveModal('camera');

  if (typeof startModalTimeout === 'function') startModalTimeout();
  if (typeof startActivityMonitoring === 'function') startActivityMonitoring();
  if (typeof disableWebSocketListening === 'function') disableWebSocketListening();

  bindShellInteractions(modal);
  cleanupExistingMedia(modal);

  if (videoStream) {
    try {
      videoStream.stop();
    } catch (error) {
      console.warn('Error stopping previous video stream:', error);
    }
    videoStream = null;
  }

  try {
    videoStream = new VideoStream();

    try {
      currentVideoElement = await videoStream.initializeStream('reolink');
      logStreamPerformance('webrtc', startTime);
    } catch (webrtcError) {
      console.warn('WebRTC failed, trying HLS:', webrtcError);
      try {
        currentVideoElement = await videoStream.createHLSStream('reolink');
        logStreamPerformance('hls', startTime);
      } catch (hlsError) {
        console.warn('HLS failed, using MJPEG fallback:', hlsError);
        currentVideoElement = videoStream.createMJPEGStream('reolink');
        logStreamPerformance('mjpeg', startTime);
      }
    }

    modal.insertBefore(currentVideoElement, modal.querySelector('#closeCameraModal'));
    attachMediaListeners(currentVideoElement);
  } catch (error) {
    console.error('Failed to initialize camera stream:', error);
    logStreamPerformance('iframe_fallback', startTime);

    const iframe = document.createElement('iframe');
    iframe.id = 'reolink-snap';
    iframe.src = 'http://192.168.4.145:1984/stream.html?src=reolink';
    modal.insertBefore(iframe, modal.querySelector('#closeCameraModal'));
    currentVideoElement = iframe;
    attachMediaListeners(currentVideoElement);
  }

  resetCameraModalTimeout();
}

function hideCameraModal() {
  const bg = document.getElementById('cameraModalBg');
  const modal = document.getElementById('cameraModal');

  if (!bg || !modal) return;

  bg.classList.remove('visible');
  modal.classList.add('is-hiding');
  syncActiveModal(null);

  if (typeof clearModalTimeout === 'function') clearModalTimeout();
  if (typeof stopActivityMonitoring === 'function') stopActivityMonitoring();
  if (typeof enableWebSocketListening === 'function') enableWebSocketListening();

  if (videoStream) {
    try {
      videoStream.stop();
    } catch (error) {
      console.warn('Error stopping video stream:', error);
    }
    videoStream = null;
  }

  cleanupExistingMedia(modal);

  clearTimeout(cameraHideTimer);
  cameraHideTimer = setTimeout(() => {
    modal.classList.remove('is-hiding');
  }, CAMERA_TRANSITION_MS);

  console.log('Camera stream stopped and cleaned up');
}

function handleCameraModalTrigger() {
  if (window.activeModal === 'camera') {
    resetCameraModalTimeout();
    return;
  }

  if (window.activeModal && window.activeModal !== 'camera' && typeof window.closeActiveModal === 'function') {
    window.closeActiveModal();
  }

  showCameraModal();
}

// Initialize camera modal event listeners
document.addEventListener('DOMContentLoaded', () => {
  const closeButton = document.getElementById('closeCameraModal');
  const bg = document.getElementById('cameraModalBg');

  if (closeButton) closeButton.addEventListener('click', hideCameraModal);
  if (bg) {
    bg.addEventListener('click', (event) => {
      if (event.target === bg) {
        hideCameraModal();
      }
    });
  }
});

window.showCameraModal = showCameraModal;
window.hideCameraModal = hideCameraModal;
window.handleCameraModalTrigger = handleCameraModalTrigger;
window.resetCameraModalTimeout = resetCameraModalTimeout;
