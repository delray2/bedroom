     // --- Camera Modal Logic ---
let cameraModalTimeout = null;
let videoStream = null;
let currentVideoElement = null;
const GO2RTC_URL = window.GO2RTC_URL || window.CONFIG?.go2rtcUrl || 'http://192.168.4.145:1984';

async function showCameraModal() {
  console.log('Opening camera modal...');
  const startTime = performance.now();
  const bg = document.getElementById('cameraModalBg');
  const modal = document.getElementById('cameraModal');
  
  if (!bg || !modal) {
    console.error('Camera modal elements not found!');
    return;
  }
  
  // Show modal with CSS transitions
  bg.classList.add('visible');
  console.log('Camera modal background displayed');
  activeModal = 'camera';
  
  // Start the unified modal timeout system
  startModalTimeout();
  startActivityMonitoring();
  
  // Disable websocket listening during camera modal timeout
  // (but allow Reolink messages to still interrupt)
  disableWebSocketListening();
  
  // If a previous VideoStream instance exists, stop and clean it up before creating a new one.
  // This prevents orphaned WebRTC sessions from accumulating on the server.
  if (videoStream) {
    try {
      videoStream.stop();
    } catch (e) {
      console.warn('Error stopping previous video stream:', e);
    }
    videoStream = null;
  }
  
  try {
    // Always create a fresh VideoStream instance after cleaning up any previous one.
    videoStream = new VideoStream();
    
    // Remove existing iframe if present
    const existingIframe = modal.querySelector('iframe');
    if (existingIframe) {
      existingIframe.remove();
    }
    
    // Remove existing video if present
    if (currentVideoElement) {
      currentVideoElement.remove();
    }
    
    // Try WebRTC first, fallback to HLS, then MJPEG
    try {
      currentVideoElement = await videoStream.initializeStream('reolink');
      console.log('WebRTC stream initialized');
      logStreamPerformance('webrtc', startTime);
    } catch (webrtcError) {
      console.warn('WebRTC failed, trying HLS:', webrtcError);
      try {
        currentVideoElement = await videoStream.createHLSStream('reolink');
        console.log('HLS stream initialized');
        logStreamPerformance('hls', startTime);
      } catch (hlsError) {
        console.warn('HLS failed, using MJPEG fallback:', hlsError);
        currentVideoElement = videoStream.createMJPEGStream('reolink');
        console.log('MJPEG stream initialized');
        logStreamPerformance('mjpeg', startTime);
      }
    }
    
    // Add video element to modal
    modal.insertBefore(currentVideoElement, modal.querySelector('#closeCameraModal'));
    
  } catch (error) {
    console.error('Failed to initialize camera stream:', error);
    logStreamPerformance('iframe_fallback', startTime);
    // Fallback to iframe
    const iframe = document.createElement('iframe');
    iframe.id = 'reolink-snap';
    iframe.src = `${GO2RTC_URL}/stream.html?src=reolink`;
    modal.insertBefore(iframe, modal.querySelector('#closeCameraModal'));
  }
  
  // Note: Auto-hide is now handled by the unified modal timeout system
  // No need for separate camera timeout
}

function hideCameraModal() {
  const bg = document.getElementById('cameraModalBg');
  const modal = document.getElementById('cameraModal');
  
  bg.classList.remove('visible');
  clearTimeout(cameraModalTimeout);
  cameraModalTimeout = null;
  activeModal = null;
  
  // Clear the unified modal timeout system
  clearModalTimeout();
  stopActivityMonitoring();
  
  // Re-enable websocket listening when camera modal closes
  enableWebSocketListening();
  
  // Stop video stream and reset the instance to prevent stale connections
  if (videoStream) {
    try {
      videoStream.stop();
    } catch (e) {
      console.warn('Error stopping video stream:', e);
    }
    videoStream = null;
  }
  
  // Remove video element
  if (currentVideoElement) {
    currentVideoElement.remove();
    currentVideoElement = null;
  }
  
  // Clear any iframe
  const iframe = modal.querySelector('iframe');
  if (iframe) {
    iframe.src = '';
    iframe.remove();
  }
  
  console.log('Camera stream stopped and cleaned up');
}

// Initialize camera modal event listeners
document.addEventListener('DOMContentLoaded', function() {
  // Close button and background click
  document.getElementById('closeCameraModal').onclick = hideCameraModal;
  document.getElementById('cameraModalBg').onclick = function(e) {
    if (e.target === this) hideCameraModal();
  };
}); 