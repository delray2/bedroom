// --- Camera Modal Logic ---
let cameraModalTimeout = null;
let videoStream = null;
let currentVideoElement = null;

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
  startModalTimeout();
  
  try {
    // Initialize video stream
    if (!videoStream) {
      videoStream = new VideoStream();
    }
    
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
    iframe.src = 'http://192.168.4.145:1984/stream.html?src=reolink';
    modal.insertBefore(iframe, modal.querySelector('#closeCameraModal'));
  }
  
  // Auto-hide after 30 seconds
  clearTimeout(cameraModalTimeout);
  cameraModalTimeout = setTimeout(hideCameraModal, 30000);
}

function hideCameraModal() {
  const bg = document.getElementById('cameraModalBg');
  const modal = document.getElementById('cameraModal');
  
  bg.classList.remove('visible');
  clearTimeout(cameraModalTimeout);
  activeModal = null;
  clearModalTimeout();
  
  // Stop video stream
  if (videoStream) {
    videoStream.stop();
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