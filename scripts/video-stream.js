// WebRTC Video Streaming Module
class VideoStream {
  constructor() {
    this.peerConnection = null;
    this.videoElement = null;
    this.stream = null;
    this.go2rtcUrl = window.GO2RTC_URL || window.CONFIG?.go2rtcUrl || 'http://192.168.4.145:1984';
  }

  async initializeStream(streamName = 'reolink') {
    try {
      // Create video element if it doesn't exist
      if (!this.videoElement) {
        this.videoElement = document.createElement('video');
        this.videoElement.autoplay = true;
        this.videoElement.controls = false;
        this.videoElement.muted = true;
        this.videoElement.style.width = '100%';
        this.videoElement.style.height = '100%';
        this.videoElement.style.borderRadius = '50%';
        this.videoElement.style.objectFit = 'cover';
      }

      // Get WebRTC offer from go2rtc
      const response = await fetch(`${this.go2rtcUrl}/api/webrtc?src=${streamName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sdp: await this.createOffer(),
          ice_servers: []
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Set remote description
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription({
        type: 'answer',
        sdp: data.sdp
      }));

      return this.videoElement;
    } catch (error) {
      console.error('Failed to initialize WebRTC stream:', error);
      throw error;
    }
  }

  async createOffer() {
    // Create RTCPeerConnection
    this.peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
      ]
    });

    // Handle incoming stream
    this.peerConnection.ontrack = (event) => {
      if (this.videoElement) {
        this.videoElement.srcObject = event.streams[0];
        this.stream = event.streams[0];
      }
    };

    // Create offer
    const offer = await this.peerConnection.createOffer({
      offerToReceiveVideo: true,
      offerToReceiveAudio: true
    });

    await this.peerConnection.setLocalDescription(offer);
    return offer.sdp;
  }

  stop() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }
  }

  // Alternative: Direct HLS stream
  async createHLSStream(streamName = 'reolink') {
    if (Hls.isSupported()) {
      const video = document.createElement('video');
      video.autoplay = true;
      video.controls = false;
      video.muted = true;
      video.style.width = '100%';
      video.style.height = '100%';
      video.style.borderRadius = '50%';
      video.style.objectFit = 'cover';

      const hls = new Hls();
      hls.loadSource(`${this.go2rtcUrl}/hls/${streamName}/index.m3u8`);
      hls.attachMedia(video);

      return video;
    } else {
      // Fallback for browsers that don't support HLS
      const video = document.createElement('video');
      video.autoplay = true;
      video.controls = false;
      video.muted = true;
      video.style.width = '100%';
      video.style.height = '100%';
      video.style.borderRadius = '50%';
      video.style.objectFit = 'cover';
      
      video.src = `${this.go2rtcUrl}/hls/${streamName}/index.m3u8`;
      return video;
    }
  }

  // Alternative: Direct MJPEG stream
  createMJPEGStream(streamName = 'reolink') {
    const video = document.createElement('img');
    video.style.width = '100%';
    video.style.height = '100%';
    video.style.borderRadius = '50%';
    video.style.objectFit = 'cover';
    
    // MJPEG stream URL
    video.src = `${this.go2rtcUrl}/mjpeg/${streamName}`;
    
    return video;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VideoStream;
} else {
  window.VideoStream = VideoStream;
}
