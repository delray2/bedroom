// Music Overlay System - Full Screen Album Artwork Display
// Shows after 1 minute of inactivity when music is playing

class MusicOverlay {
  constructor() {
    this.isVisible = false;
    this.musicOverlayTimeout = null;
    this.lastActivityTime = Date.now();
    this.MUSIC_OVERLAY_TIMEOUT = 60000; // 1 minute
    this.ACTIVITY_CHECK_INTERVAL = 1000; // Check every second
    
    this.init();
  }
  
  init() {
    // Create the overlay HTML structure
    this.createOverlayHTML();
    
    // Set up activity monitoring
    this.setupActivityListeners();
    
    // Subscribe to music state changes
    this.subscribeToMusicState();
    
    console.log('🎵 Music overlay system initialized');
  }
  
  createOverlayHTML() {
    // Create the overlay container
    const overlay = document.createElement('div');
    overlay.id = 'musicOverlay';
    overlay.className = 'music-overlay-container';
    overlay.style.display = 'none';
    
    overlay.innerHTML = `
      <!-- Album Artwork Background -->
      <div class="music-overlay-bg" id="musicOverlayBg"></div>
      
      <!-- Clock Display (Top Left) -->
      <div class="music-overlay-clock">
        <div class="music-overlay-date" id="musicOverlayDate"></div>
        <div class="music-overlay-time" id="musicOverlayTime"></div>
      </div>
      
      <!-- Track Information (Bottom Right) -->
      <div class="music-overlay-track-info">
        <div class="music-overlay-track-name" id="musicOverlayTrackName"></div>
        <div class="music-overlay-track-artist" id="musicOverlayTrackArtist"></div>
      </div>
      
      <!-- Tap to Resume Instruction (Top Right) -->
      <div class="music-overlay-instruction">
        <span class="music-overlay-tap-text">Tap to resume</span>
      </div>
    `;
    
    // Add to body
    document.body.appendChild(overlay);
    
    // Set up tap to dismiss
    overlay.addEventListener('click', () => {
      this.hideOverlay();
    });
    
    // Prevent event bubbling
    overlay.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }
  
  setupActivityListeners() {
    // Don't set up our own activity listeners - use the existing system
    // The existing UI system already handles activity detection
    // We'll hook into it instead of creating duplicate listeners
    this.hookIntoExistingActivitySystem();
  }
  
  hookIntoExistingActivitySystem() {
    // Hook into the existing resetInactivityTimer function
    const originalResetTimer = window.resetInactivityTimer;
    if (originalResetTimer) {
      window.resetInactivityTimer = () => {
        // Call original function
        originalResetTimer();
        // Also record activity for music overlay
        this.recordActivity();
      };
    }
    
    // Also listen for direct clicks on the overlay to prevent immediate re-showing
    document.addEventListener('click', (e) => {
      if (e.target.closest('#musicOverlay')) {
        this.hideOverlay();
        // Reset activity time to prevent immediate re-showing
        this.lastActivityTime = Date.now();
      }
    });
  }
  
  subscribeToMusicState() {
    // Wait for state manager to be available
    const checkStateManager = () => {
      if (window.deviceStateManager) {
        console.log('🎵 Music Overlay: Subscribing to music state changes');
        // Subscribe to music state changes using the correct method
        window.deviceStateManager.subscribeToMusic(this.handleMusicStateChange.bind(this));
        
        // Get initial state if available
        const currentState = window.deviceStateManager.getMusicState();
        if (currentState.hasTrack) {
          console.log('🎵 Music Overlay: Found existing music state:', currentState);
          this.handleMusicStateChange(currentState);
        }
      } else {
        // Retry after a short delay
        setTimeout(checkStateManager, 100);
      }
    };
    checkStateManager();
  }
  
  handleMusicStateChange(state) {
    if (state.isPlaying && state.trackInfo) {
      // Music is playing, update overlay content (this will update album artwork)
      this.updateOverlayContent(state.trackInfo);
      
      // Start monitoring for inactivity if not already monitoring
      if (!this.musicOverlayTimeout) {
        this.startMusicOverlayMonitoring();
      }
      
      // If overlay is currently visible, update it immediately with new track info
      if (this.isVisible) {
        this.updateOverlayContent(state.trackInfo);
      }
    } else {
      // Music stopped, hide overlay and stop monitoring
      this.hideOverlay();
      this.stopMusicOverlayMonitoring();
    }
  }
  
  startMusicOverlayMonitoring() {
    this.stopMusicOverlayMonitoring();
    this.lastActivityTime = Date.now();
    
    this.musicOverlayTimeout = setInterval(() => {
      const now = Date.now();
      const timeSinceActivity = now - this.lastActivityTime;
      
      // If no activity for 1 minute, check if music is playing and show overlay
      if (timeSinceActivity >= this.MUSIC_OVERLAY_TIMEOUT && !this.isVisible) {
        const musicState = window.deviceStateManager?.getMusicState();
        if (musicState?.isPlaying) {
          this.showOverlay();
        }
      }
    }, this.ACTIVITY_CHECK_INTERVAL);
  }
  
  stopMusicOverlayMonitoring() {
    if (this.musicOverlayTimeout) {
      clearInterval(this.musicOverlayTimeout);
      this.musicOverlayTimeout = null;
    }
  }
  
  recordActivity() {
    this.lastActivityTime = Date.now();
    
    // If overlay is visible, hide it on any activity
    if (this.isVisible) {
      this.hideOverlay();
      // Don't restart monitoring immediately - wait for music state to change
      return;
    }
    
    // Reset the music overlay timer if music is playing
    const musicState = window.deviceStateManager?.getMusicState();
    if (musicState?.isPlaying && this.musicOverlayTimeout) {
      // Timer is already running, just reset the activity time
      // The existing timer will continue checking
    }
  }
  
  showOverlay() {
    const overlay = document.getElementById('musicOverlay');
    if (!overlay) return;
    
    // Update content before showing
    const musicState = window.deviceStateManager?.getMusicState();
    if (musicState?.trackInfo) {
      this.updateOverlayContent(musicState.trackInfo);
    }
    
    // Show overlay with fade-in animation
    overlay.style.display = 'block';
    overlay.style.opacity = '0';
    
    // Trigger fade-in
    setTimeout(() => {
      overlay.style.opacity = '1';
    }, 10);
    
    this.isVisible = true;
    console.log('🎵 Music overlay shown');
  }
  
  hideOverlay() {
    const overlay = document.getElementById('musicOverlay');
    if (!overlay || !this.isVisible) return;
    
    // Fade out
    overlay.style.opacity = '0';
    
    // Hide after animation
    setTimeout(() => {
      overlay.style.display = 'none';
    }, 300);
    
    this.isVisible = false;
    console.log('🎵 Music overlay hidden');
  }
  
  updateOverlayContent(trackInfo) {
    console.log('🎵 Updating music overlay content:', trackInfo);
    
    // Update album artwork background
    const bg = document.getElementById('musicOverlayBg');
    if (bg && trackInfo.imageUrl) {
      // Force a new image load to ensure it updates
      const img = new Image();
      img.onload = () => {
        bg.style.backgroundImage = `url(${trackInfo.imageUrl})`;
        console.log('🎵 Updated music overlay album artwork:', trackInfo.imageUrl);
      };
      img.src = trackInfo.imageUrl;
    } else if (bg) {
      // Reset background if no image URL
      bg.style.backgroundImage = 'none';
      console.log('🎵 Reset music overlay background');
    }
    
    // Update track information
    const trackName = document.getElementById('musicOverlayTrackName');
    const trackArtist = document.getElementById('musicOverlayTrackArtist');
    
    if (trackName) trackName.textContent = trackInfo.name || 'Unknown Track';
    if (trackArtist) trackArtist.textContent = trackInfo.artist || 'Unknown Artist';
    
    console.log('🎵 Updated music overlay track info:', trackInfo.name, 'by', trackInfo.artist);
  }
  
  updateClock() {
    const now = new Date();
    const dateElement = document.getElementById('musicOverlayDate');
    const timeElement = document.getElementById('musicOverlayTime');
    
    if (dateElement && timeElement) {
      // Format date: "Wednesday, September 5th, 2024"
      const dateOptions = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      };
      const dateStr = now.toLocaleDateString('en-US', dateOptions);
      
      // Format time: "3:43 PM"
      const timeOptions = { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      };
      const timeStr = now.toLocaleTimeString('en-US', timeOptions);
      
      dateElement.textContent = dateStr;
      timeElement.textContent = timeStr;
    }
  }
  
  // Cleanup method
  destroy() {
    this.stopMusicOverlayMonitoring();
    this.hideOverlay();
    
    const overlay = document.getElementById('musicOverlay');
    if (overlay) {
      overlay.remove();
    }
  }
}

// Create global instance
let musicOverlay = null;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Wait for other systems to initialize
  setTimeout(() => {
    musicOverlay = new MusicOverlay();
    
    // Update clock every second
    setInterval(() => {
      if (musicOverlay) {
        musicOverlay.updateClock();
      }
    }, 1000);
  }, 500); // Wait longer for UI system to be ready
});

// Make available globally
if (typeof window !== 'undefined') {
  window.musicOverlay = musicOverlay;
}
