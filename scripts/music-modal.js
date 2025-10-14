// Music Modal Implementation with Authentication Flow
class MusicModal {
  constructor() {
    this.spotifyIframe = null;
    this.isAuthenticated = false;
    this.accessToken = null;
    this.deviceId = null;
    this.player = null;
    this.currentTrack = null;
    this.isPlaying = false;
    this.volume = 0.5;
    this.unsubscribeFromMusicState = null; // Store unsubscribe function
    
    // Restore authentication from session storage
    this.restoreAuthentication();
  }

  restoreAuthentication() {
    const storedToken = sessionStorage.getItem('spotify_access_token');
    const storedAuth = sessionStorage.getItem('spotify_authenticated');
    
    if (storedToken && storedAuth === 'true') {
      this.accessToken = storedToken;
      this.isAuthenticated = true;
      this.debugLog('🎵 Restored authentication from session storage');
    }
  }

  debugLog(message) {
    console.log(message);
    // Debug element removed - only log to console
  }

  async showMusicModal() {
    console.log('🎵 showMusicModal called');
    const html = `
      <div class="music-modal">
        <!-- Album Artwork Background -->
        <div class="album-artwork-bg" id="albumArtworkBg"></div>
        
        <!-- Search Button (Top Center) -->
        <button class="search-button" id="searchButton" title="Search Music">
          <span class="search-icon">SEARCH</span>
        </button>
        
        <!-- Music Controls (Bottom) -->
        <div class="music-controls" id="musicControls" style="display: none;">
          <!-- Progress Bar -->
          <div class="progress-container">
            <div class="progress-bar" id="progressBar">
              <div class="progress-fill" id="progressFill"></div>
            </div>
            <div class="time-display">
              <span class="current-time" id="currentTime">0:00</span>
              <span class="total-time" id="totalTime">0:00</span>
            </div>
          </div>
          
          <!-- Control Buttons Row -->
          <div class="control-buttons-row">
            <!-- Previous Button -->
            <button class="skip-btn" id="prevBtn" title="Previous">
              <span class="skip-icon">⏮</span>
            </button>
            
            <!-- Play/Pause Button (Centered) -->
            <button class="play-pause-btn" id="playPauseBtn" title="Play/Pause">
              <span class="play-icon">▶</span>
            </button>
            
            <!-- Next Button -->
            <button class="skip-btn" id="nextBtn" title="Next">
              <span class="skip-icon">⏭</span>
            </button>
          </div>
        </div>
        
        <!-- Devices Button -->
        <button class="devices-button" id="devicesButton" title="Select Device" style="display: block !important; visibility: visible !important;">
          <span class="devices-icon">DEVICES</span>
        </button>
        
        <!-- Device List -->
        <div class="device-list" id="deviceList" style="display: none;"></div>
        
        <!-- Authentication and Status -->
        <div class="music-status" id="musicStatus">Checking authentication...</div>
        
        <!-- Authentication check will determine what to show -->
        <div id="musicAuthCheck" class="auth-check">
          <div class="loading-spinner"></div>
          <p>Checking Spotify authentication...</p>
        </div>
        
        <!-- Login section (shown when not authenticated) -->
        <div id="musicLogin" class="music-login" style="display: none;">
          <div class="login-content">
            <div class="login-icon">🎵</div>
            <h3>Connect to Spotify</h3>
            <p>You need to authenticate with Spotify to use the music player.</p>
            <button class="login-btn" id="spotifyLoginBtn">
              <span class="spotify-icon">🎵</span>
              Login with Spotify
            </button>
          </div>
        </div>
        
        <!-- Player section (shown when authenticated) -->
        <div id="musicPlayer" class="music-player" style="display: none;">
          <!-- Spotify Web Playback SDK will be loaded here -->
          <div id="spotify-player" class="spotify-player">
            <div class="player-loading">
              <div class="loading-spinner"></div>
              <p>Loading Spotify Player...</p>
            </div>
          </div>
        </div>
        
        <div class="music-error" id="musicError" style="display: none;">
          <p>❌ Failed to load Spotify player</p>
          <button class="retry-btn" id="retryBtn">Retry</button>
        </div>
        
        <!-- Search Overlay (Full Screen) -->
        <div class="search-overlay" id="searchOverlay" style="display: none;">
          <div class="search-overlay-content">
            <div class="search-header">
              <button class="close-search" id="closeSearch">&times;</button>
              <h3>Search Music</h3>
            </div>
            <div class="search-input-container">
              <input type="text" id="searchInput" placeholder="Search for songs, artists, or albums..." autocomplete="off">
            </div>
            <div class="search-results-container">
              <div class="search-results" id="searchResults"></div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Show the modal
    console.log('🎵 Showing music modal with UI manager');
    if (window.uiManager) {
      window.uiManager.showModal(html, { 
        triggerSelector: '.side-btn[title="Music"]',
        modalType: 'music'
      });
    } else {
      console.log('🎵 UI manager not available, using fallback showModal');
      showModal(html);
    }

    // Check authentication status first
    await this.checkAuthenticationStatus();
  }

  async checkAuthenticationStatus() {
    try {
      console.log('🎵 Checking authentication status...');
      
      // Check if we already have a valid token stored
      if (this.accessToken && this.isAuthenticated) {
        console.log('🎵 Using cached authentication');
        
        // If player is already initialized, just show the interface
        if (this.isInitialized) {
          console.log('🎵 Player already initialized, showing interface');
          this.showPlayerInterface();
          return;
        }
        
        // Otherwise, initialize the player
        this.showPlayerInterface();
        await this.initializeSpotifyPlayer();
        return;
      }
      
      console.log('🎵 No cached authentication, checking server...');
      const musicStatus = document.getElementById('musicStatus');
      if (musicStatus) {
        musicStatus.textContent = 'Checking authentication...';
      }
      
      // Get auth URLs from config
      const authUrls = window.CONFIG.BACKEND.getAuthUrls();
      console.log('🎵 Auth URLs:', authUrls);
      
      // Try to get token from your main server
      const response = await fetch(authUrls.token);
      
      console.log('🎵 Token response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }
      
      const data = await response.json();
      console.log('🎵 Token response data:', data);
      
      if (data.access_token) {
        // User is authenticated
        console.log('🎵 User is authenticated');
        this.accessToken = data.access_token;
        this.isAuthenticated = true;
        
        // Store in sessionStorage for persistence
        sessionStorage.setItem('spotify_access_token', this.accessToken);
        sessionStorage.setItem('spotify_authenticated', 'true');
        
        // Start token refresh manager
        window.dispatchEvent(new CustomEvent('spotify:authenticated'));
        
        this.showPlayerInterface();
        await this.initializeSpotifyPlayer();
        
      } else {
        // User is not authenticated
        console.log('🎵 User is not authenticated, showing login screen');
        this.showLoginScreen();
      }
      
    } catch (error) {
      console.error('❌ Authentication check failed:', error);
      
      // Check if server is running
      if (error.message.includes('Failed to fetch') || error.message.includes('Server responded with')) {
        console.log('🎵 Server not running, showing error');
        this.showError('Main server is not running. Please start it with: npm start');
      } else {
        // Server is running but user needs to authenticate
        console.log('🎵 Server running but user needs to authenticate');
        this.showLoginScreen();
      }
    }
  }

  showPlayerInterface() {
    // Hide auth check, show player
    document.getElementById('musicAuthCheck').style.display = 'none';
    document.getElementById('musicPlayer').style.display = 'block';
    document.getElementById('musicStatus').textContent = 'Connected to Spotify';
  }

  showLoginScreen() {
    // Hide auth check, show login
    document.getElementById('musicAuthCheck').style.display = 'none';
    document.getElementById('musicLogin').style.display = 'block';
    document.getElementById('musicStatus').textContent = 'Please authenticate with Spotify';
    
    // Set up login button
    document.getElementById('spotifyLoginBtn').addEventListener('click', () => {
      this.initiateSpotifyLogin();
    });
  }

  initiateSpotifyLogin() {
    // Get auth URLs from config
    const authUrls = window.CONFIG.BACKEND.getAuthUrls();
    
    // Check if we're in Electron
    const isElectron = window.navigator.userAgent.toLowerCase().includes('electron');
    
    if (isElectron) {
      // In Electron, we need to use a different approach
      // Open the login URL in the main window temporarily
      const loginUrl = authUrls.login;
      
      // Store current URL to restore later
      const currentUrl = window.location.href;
      
      // Navigate to login URL
      window.location.href = loginUrl;
      
      // Monitor for successful authentication
      const checkAuth = setInterval(async () => {
        try {
          const response = await fetch(authUrls.token);
          if (response.ok) {
            const data = await response.json();
            if (data.access_token) {
              clearInterval(checkAuth);
              // Navigate back to dashboard
              window.location.href = currentUrl;
              // Wait a moment for navigation, then check auth status
              setTimeout(() => {
                this.checkAuthenticationStatus();
              }, 1000);
            }
          }
        } catch (error) {
          // Ignore errors during polling
        }
      }, 2000);
      
      // Clean up after 5 minutes
      setTimeout(() => {
        clearInterval(checkAuth);
      }, 300000);
      
    } else {
      // In regular browser, use popup window
      const loginUrl = authUrls.login;
      const loginWindow = window.open(
        loginUrl,
        'spotify-login',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );
      
      // Monitor the login window
      const checkClosed = setInterval(() => {
        if (loginWindow.closed) {
          clearInterval(checkClosed);
          // Check authentication again after login window closes
          setTimeout(() => {
            this.checkAuthenticationStatus();
          }, 1000);
        }
      }, 1000);
      
      // Also check for successful login by polling the token endpoint
      const checkLogin = setInterval(async () => {
        try {
          const response = await fetch(authUrls.token);
          if (response.ok) {
            const data = await response.json();
            if (data.access_token) {
              clearInterval(checkLogin);
              loginWindow.close();
              this.checkAuthenticationStatus();
            }
          }
        } catch (error) {
          // Ignore errors during polling
        }
      }, 2000);
      
      // Clean up intervals after 5 minutes
      setTimeout(() => {
        clearInterval(checkClosed);
        clearInterval(checkLogin);
      }, 300000);
    }
  }

  async initializeSpotifyPlayer() {
    try {
      this.debugLog('🎵 Starting Spotify player initialization...');
      this.debugLog('🎵 Access token: ' + (this.accessToken ? 'Present' : 'Missing'));
      
      // Try Web Playback SDK first, fallback to API mode
      try {
        this.debugLog('🎵 Attempting to initialize Web Playback SDK...');
        await this.initializeWebPlaybackSDK();
        this.debugLog('✅ Web Playback SDK initialized successfully');
        document.getElementById('musicStatus').textContent = 'Connected to Spotify (Web Player)';
      } catch (sdkError) {
        this.debugLog('⚠️ Web Playback SDK failed: ' + sdkError.message);
        this.debugLog('🎵 Falling back to API-based player...');
        
        // Initialize API-based player as fallback
        await this.initializeAPIPlayer();
        this.debugLog('✅ Spotify API player initialized successfully');
        document.getElementById('musicStatus').textContent = 'Connected to Spotify (API Mode)';
      }
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Show controls
      document.getElementById('musicControls').style.display = 'block';
      
      // Mark as initialized
      this.isInitialized = true;
      
    } catch (error) {
      console.error('Failed to initialize Spotify player:', error);
      this.showError(`Failed to connect to Spotify: ${error.message}`);
    }
  }

  async initializeWebPlaybackSDK() {
    this.debugLog('🎵 Initializing Spotify Web Playback SDK...');
    
    // Load the SDK if not already loaded
    await this.loadSpotifySDK();
    
    // Initialize the player
    await this.initializePlayer();
    
    // Subscribe to music state changes from the state manager
    if (window.deviceStateManager) {
      this.unsubscribeFromMusicState = window.deviceStateManager.subscribeToMusic((musicState) => {
        this.handleMusicStateChange(musicState);
      });
    }
    
    this.debugLog('✅ Web Playback SDK initialization complete');
  }

  async initializeAPIPlayer() {
    this.debugLog('🎵 Initializing API-based Spotify player...');
    
    // Subscribe to music state changes from the state manager
    if (window.deviceStateManager) {
      this.unsubscribeFromMusicState = window.deviceStateManager.subscribeToMusic((musicState) => {
        this.handleMusicStateChange(musicState);
      });
    }
    
    // Get current playback state ONCE
    try {
      const authUrls = window.CONFIG.BACKEND.getAuthUrls();
      const response = await fetch(`${authUrls.base}/api/spotify/playback-state`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        this.debugLog('✅ Got current playback state');
        this.currentTrack = data.item;
        this.isPlaying = data.is_playing;
        this.updateTrackInfo();
        this.updatePlayPauseButton();
        
        // Update progress bar if available
        if (data.progress_ms && data.item.duration_ms) {
          this.updateProgressBar(data.progress_ms, data.item.duration_ms);
        }
        
        // Update state manager
        if (window.deviceStateManager && data.item) {
          const trackInfo = {
            name: data.item.name,
            artist: data.item.artists.map(a => a.name).join(', '),
            imageUrl: data.item.album.images.length > 0 ? data.item.album.images[0].url : null,
            album: data.item.album.name,
            duration: data.item.duration_ms,
            popularity: data.item.popularity
          };
          
          window.deviceStateManager.updateMusicState(this.isPlaying, trackInfo);
        }
      } else {
        this.debugLog('⚠️ No active playback found');
      }
    } catch (error) {
      this.debugLog('⚠️ Could not get playback state: ' + error.message);
    }
    
    // Start smart refresh for API mode (much more efficient)
    this.startSmartRefresh();
    this.debugLog('🎵 API mode initialized with smart refresh');
  }

  handleMusicStateChange(musicState) {
    // This method will be called when music state changes from the state manager
    if (musicState.trackInfo) {
      this.currentTrack = {
        name: musicState.trackInfo.name,
        artists: [{ name: musicState.trackInfo.artist }],
        album: {
          name: musicState.trackInfo.album,
          images: musicState.trackInfo.imageUrl ? [{ url: musicState.trackInfo.imageUrl }] : []
        },
        duration_ms: musicState.trackInfo.duration,
        popularity: musicState.trackInfo.popularity
      };
      
      this.isPlaying = musicState.isPlaying;
      
      // CRITICAL FIX: Only update UI, don't call updateTrackInfo() which would trigger state manager update
      this.updateTrackInfoDisplay();
      this.updatePlayPauseButton();
      this.updateModalBackground(musicState.trackInfo.imageUrl);
      this.updateSideButtonBackground(musicState.trackInfo.imageUrl);
    }
  }

  // Smart refresh - only when modal is visible and music is playing
  startSmartRefresh() {
    // Only refresh if modal is visible and music is playing
    const shouldRefresh = () => {
      const modal = document.getElementById('modalContent');
      const isVisible = modal && modal.style.display !== 'none';
      return isVisible && this.isPlaying;
    };
    
    // Refresh every 10 seconds when conditions are met (much less frequent)
    this.smartRefreshInterval = setInterval(() => {
      if (shouldRefresh()) {
        this.refreshPlaybackState();
      }
    }, 10000); // 10 seconds instead of 2
    
    this.debugLog('🎵 Smart refresh started (10s intervals, only when visible and playing)');
  }
  
  stopSmartRefresh() {
    if (this.smartRefreshInterval) {
      clearInterval(this.smartRefreshInterval);
      this.smartRefreshInterval = null;
      this.debugLog('🎵 Smart refresh stopped');
    }
  }

  resumeSmartRefresh() {
    // Only resume if not already running
    if (!this.smartRefreshInterval) {
      this.startSmartRefresh();
    }
  }

  // Efficient state refresh - only when needed
  async refreshPlaybackState() {
    try {
      const authUrls = window.CONFIG.BACKEND.getAuthUrls();
      const response = await fetch(`${authUrls.base}/api/spotify/playback-state`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.item) {
          const previousTrack = this.currentTrack;
          this.currentTrack = data.item;
          this.isPlaying = data.is_playing;
          
          // Check if track changed
          const trackChanged = !previousTrack || 
            (previousTrack.id !== this.currentTrack.id);
          
          if (trackChanged) {
            this.debugLog('🎵 Track changed via API! Updating all backgrounds...');
          }
          
          // Always update track info (this will update all backgrounds)
          this.updateTrackInfo();
          this.updatePlayPauseButton();
          
          // Update progress bar if available
          if (data.progress_ms && data.item.duration_ms) {
            this.updateProgressBar(data.progress_ms, data.item.duration_ms);
          }
          
          // Update state manager
          if (window.deviceStateManager) {
            const trackInfo = {
              name: data.item.name,
              artist: data.item.artists.map(a => a.name).join(', '),
              imageUrl: data.item.album.images.length > 0 ? data.item.album.images[0].url : null,
              album: data.item.album.name,
              duration: data.item.duration_ms,
              popularity: data.item.popularity
            };
            
            window.deviceStateManager.updateMusicState(this.isPlaying, trackInfo);
          }
          
          this.debugLog('✅ Refreshed playback state');
        }
      }
    } catch (error) {
      this.debugLog('⚠️ Could not refresh playback state: ' + error.message);
    }
  }

  async loadSpotifySDK() {
    return new Promise((resolve, reject) => {
      if (window.Spotify) {
        this.debugLog('🎵 Spotify SDK already loaded');
        resolve();
        return;
      }

      this.debugLog('🎵 Loading Spotify SDK from CDN...');
      const script = document.createElement('script');
      script.src = 'https://sdk.scdn.co/spotify-player.js';
      script.onload = () => {
        this.debugLog('🎵 Spotify SDK loaded from CDN');
        resolve();
      };
      script.onerror = () => {
        this.debugLog('❌ Failed to load Spotify SDK from CDN');
        reject(new Error('Failed to load Spotify SDK'));
      };
      document.head.appendChild(script);
    });
  }

  async initializePlayer() {
    return new Promise((resolve, reject) => {
      this.debugLog('🎵 Creating Spotify Player instance...');
      
      if (!window.Spotify) {
        reject(new Error('Spotify SDK not loaded'));
        return;
      }
      
      if (!this.accessToken) {
        reject(new Error('No access token available'));
        return;
      }
      
      // Set a timeout for player initialization
      const initTimeout = setTimeout(() => {
        this.debugLog('⏰ Player initialization timeout (30 seconds)');
        this.debugLog('⚠️ Player may not be ready - this could be normal');
        // Don't reject, just continue - sometimes the ready event is delayed
      }, 30000);
      
      this.player = new window.Spotify.Player({
        name: 'Hubitat Dashboard',
        getOAuthToken: cb => { 
          this.debugLog('🎵 Providing OAuth token to Spotify');
          cb(this.accessToken); 
        },
        volume: this.volume,
        enableMediaSession: true // Enable Media Session API for better integration
      });

      // Error handling
      this.player.addListener('initialization_error', ({ message }) => {
        this.debugLog('❌ Initialization Error: ' + message);
        
        // Check if it's a DRM/keysystem error
        if (message.includes('keysystem') || message.includes('EME') || message.includes('DRM')) {
          this.debugLog('⚠️ DRM/Keysystem error detected');
          this.debugLog('⚠️ Spotify Web Playback SDK requires DRM support');
          this.debugLog('⚠️ This is a known limitation on Raspberry Pi');
          reject(new Error('DRM support required for Spotify playback'));
        } else {
          reject(new Error(`Initialization Error: ${message}`));
        }
      });

      this.player.addListener('authentication_error', ({ message }) => {
        this.debugLog('❌ Authentication Error: ' + message);
        reject(new Error(`Authentication Error: ${message}`));
      });

      this.player.addListener('account_error', ({ message }) => {
        this.debugLog('❌ Account Error: ' + message);
        reject(new Error(`Account Error: ${message}`));
      });

      this.player.addListener('playback_error', ({ message }) => {
        this.debugLog('❌ Playback Error: ' + message);
      });

      this.player.addListener('autoplay_failed', () => {
        this.debugLog('⚠️ Autoplay failed - user interaction required');
        this.showAutoplayMessage();
      });

      // Playback status updates
      this.player.addListener('player_state_changed', state => {
        if (!state) return;
        
        const previousTrack = this.currentTrack;
        this.currentTrack = state.track_window.current_track;
        this.isPlaying = !state.paused;
        
        // Check if track changed (different song)
        const trackChanged = !previousTrack || 
          (previousTrack.id !== this.currentTrack.id);
        
        if (trackChanged) {
          this.debugLog('🎵 Track changed! Updating all backgrounds...');
        }
        
        // Update progress bar with real-time position
        if (state.position && state.duration) {
          this.updateProgressBar(state.position, state.duration);
        }
        
        // Always update track info (this will update all backgrounds)
        this.updateTrackInfo();
        this.updatePlayPauseButton();
        
        // Update state manager with detailed state
        if (window.deviceStateManager && state.track_window.current_track) {
          const trackInfo = {
            name: state.track_window.current_track.name,
            artist: state.track_window.current_track.artists.map(a => a.name).join(', '),
            imageUrl: state.track_window.current_track.album.images.length > 0 ? 
                     state.track_window.current_track.album.images[0].url : null,
            album: state.track_window.current_track.album.name,
            duration: state.duration,
            popularity: state.track_window.current_track.popularity || 0,
            position: state.position,
            repeatMode: state.repeat_mode,
            shuffle: state.shuffle
          };
          
          window.deviceStateManager.updateMusicState(this.isPlaying, trackInfo);
        }
      });

      // Ready
      this.player.addListener('ready', ({ device_id }) => {
        clearTimeout(initTimeout);
        this.debugLog('✅ Ready with Device ID: ' + device_id);
        this.deviceId = device_id;
        resolve();
      });

      // Not Ready
      this.player.addListener('not_ready', ({ device_id }) => {
        this.debugLog('⚠️ Device ID has gone offline: ' + device_id);
      });

      // Connect to the player!
      this.debugLog('🎵 Connecting to Spotify player...');
      this.player.connect();
      
      // Give it some time to connect, then resolve even if not ready
      setTimeout(() => {
        if (!this.deviceId) {
          this.debugLog('⚠️ Player connected but not ready yet - continuing anyway');
          this.debugLog('⚠️ You may need to select this device in Spotify app');
          resolve(); // Continue even if not ready
        }
      }, 10000); // Wait 10 seconds
    });
  }

  setupEventListeners() {
    // Play/Pause button
    const playPauseBtn = document.getElementById('playPauseBtn');
    if (playPauseBtn) {
      playPauseBtn.addEventListener('click', () => {
        console.log('Play/Pause button clicked');
        this.togglePlayPause();
      });
    } else {
      console.error('Play/Pause button not found');
    }

    // Previous button
    const prevBtn = document.getElementById('prevBtn');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        console.log('Previous button clicked');
        this.previousTrack();
      });
    } else {
      console.error('Previous button not found');
    }

    // Next button
    const nextBtn = document.getElementById('nextBtn');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        console.log('Next button clicked');
        this.nextTrack();
      });
    } else {
      console.error('Next button not found');
    }

    // Search button
    const searchButton = document.getElementById('searchButton');
    if (searchButton) {
      searchButton.addEventListener('click', () => {
        console.log('Search button clicked');
        this.showSearchOverlay();
      });
    } else {
      console.error('Search button not found');
    }

    // Close search overlay
    const closeSearch = document.getElementById('closeSearch');
    if (closeSearch) {
      closeSearch.addEventListener('click', () => {
        this.hideSearchOverlay();
      });
    }

    // Search input with auto-submit
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      let searchTimeout;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          this.performSearch(e.target.value);
        }, 300); // Auto-submit after 300ms of no typing
      });
    }

    // Device selection
    const devicesButton = document.getElementById('devicesButton');
    if (devicesButton) {
      devicesButton.addEventListener('click', () => {
        console.log('Devices button clicked');
        this.showDeviceList();
      });
    } else {
      console.error('Devices button not found');
    }

    // Retry button
    const retryBtn = document.getElementById('retryBtn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        this.checkAuthenticationStatus();
      });
    }

    // Close search overlay when clicking outside
    const searchOverlay = document.getElementById('searchOverlay');
    if (searchOverlay) {
      searchOverlay.addEventListener('click', (e) => {
        if (e.target.id === 'searchOverlay') {
          this.hideSearchOverlay();
        }
      });
    }
  }

  updateTrackInfo() {
    if (!this.currentTrack) return;

    // Update track information display only
    this.updateTrackInfoDisplay();
    
    // Send state update to unified state manager (this will trigger all UI updates)
    if (window.deviceStateManager) {
      const trackInfo = {
        name: this.currentTrack.name,
        artist: this.currentTrack.artists.map(a => a.name).join(', '),
        imageUrl: this.currentTrack.album.images.length > 0 ? this.currentTrack.album.images[0].url : null,
        album: this.currentTrack.album.name,
        duration: this.currentTrack.duration_ms,
        popularity: this.currentTrack.popularity,
        id: this.currentTrack.id
      };
      
      window.deviceStateManager.updateMusicState(this.isPlaying, trackInfo);
    }
  }

  updateModalBackground(imageUrl) {
    const albumArtworkBg = document.getElementById('albumArtworkBg');
    if (!albumArtworkBg) return;
    
    if (imageUrl) {
      // Preload the image to prevent flickering
      const img = new Image();
      img.onload = () => {
        albumArtworkBg.style.backgroundImage = `url(${imageUrl})`;
        this.debugLog('🎵 Updated modal album artwork background: ' + imageUrl);
      };
      img.src = imageUrl;
    } else {
      // Reset background if no image URL
      albumArtworkBg.style.backgroundImage = 'none';
      this.debugLog('🎵 Reset modal album artwork background');
    }
  }

  updateSideButtonBackground(imageUrl) {
    const musicSideButton = document.querySelector('.side-btn[title="Music"]');
    if (!musicSideButton) return;
    
    if (imageUrl && this.isPlaying) {
      // Update with album artwork
      musicSideButton.style.backgroundImage = `url(${imageUrl})`;
      musicSideButton.style.backgroundSize = 'cover';
      musicSideButton.style.backgroundPosition = 'center';
      musicSideButton.style.backgroundRepeat = 'no-repeat';
      musicSideButton.classList.add('has-album-artwork');
      musicSideButton.classList.add('is-playing');
      
      this.debugLog('🎵 Updated music side button with album artwork: ' + imageUrl);
    } else {
      // Reset to default music emoji
      musicSideButton.style.backgroundImage = `url('assets/emoji/1f3b5.svg')`;
      musicSideButton.style.backgroundSize = '50%';
      musicSideButton.style.backgroundPosition = 'center';
      musicSideButton.style.backgroundRepeat = 'no-repeat';
      musicSideButton.classList.remove('has-album-artwork');
      musicSideButton.classList.remove('is-playing');
      
      this.debugLog('🎵 Reset music side button to default state');
    }
  }

  updateTrackInfoDisplay() {
    // Create or update track info display
    let trackInfoDisplay = document.getElementById('trackInfoDisplay');
    if (!trackInfoDisplay) {
      trackInfoDisplay = document.createElement('div');
      trackInfoDisplay.id = 'trackInfoDisplay';
      trackInfoDisplay.className = 'track-info-display';
      
      // Insert after the search button
      const searchButton = document.getElementById('searchButton');
      searchButton.parentNode.insertBefore(trackInfoDisplay, searchButton.nextSibling);
    }
    
    if (this.currentTrack) {
      trackInfoDisplay.innerHTML = `
        <div class="track-name">${this.currentTrack.name}</div>
        <div class="track-artist">${this.currentTrack.artists.map(a => a.name).join(', ')}</div>
        <div class="track-album">${this.currentTrack.album.name}</div>
      `;
      trackInfoDisplay.style.display = 'block';
    } else {
      trackInfoDisplay.style.display = 'none';
    }
  }

  updatePlayPauseButton() {
    const playPauseBtn = document.getElementById('playPauseBtn');
    const playIcon = playPauseBtn.querySelector('.play-icon');
    playIcon.textContent = this.isPlaying ? '⏸' : '▶';
    playPauseBtn.title = this.isPlaying ? 'Pause' : 'Play';
    
    // Add visual feedback
    playPauseBtn.classList.toggle('playing', this.isPlaying);
  }

  updateProgressBar(progressMs = 0, durationMs = 0) {
    const progressFill = document.getElementById('progressFill');
    const currentTimeEl = document.getElementById('currentTime');
    const totalTimeEl = document.getElementById('totalTime');
    
    if (progressFill && durationMs > 0) {
      const progressPercent = (progressMs / durationMs) * 100;
      progressFill.style.width = `${Math.min(progressPercent, 100)}%`;
      this.debugLog(`🎵 Progress: ${this.formatTime(progressMs)} / ${this.formatTime(durationMs)} (${Math.round(progressPercent)}%)`);
    }
    
    if (currentTimeEl) {
      currentTimeEl.textContent = this.formatTime(progressMs);
    }
    
    if (totalTimeEl) {
      totalTimeEl.textContent = this.formatTime(durationMs);
    }
  }

  formatTime(ms) {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  showAutoplayMessage() {
    // Show a message to user about autoplay restrictions
    const message = document.createElement('div');
    message.className = 'autoplay-message';
    message.innerHTML = `
      <div class="autoplay-content">
        <h4>🎵 User Interaction Required</h4>
        <p>Your browser requires user interaction to start playback.</p>
        <button class="activate-playback-btn">Activate Playback</button>
      </div>
    `;
    
    // Insert into modal
    const modalContent = document.getElementById('modalContent');
    modalContent.appendChild(message);
    
    // Handle activation button
    message.querySelector('.activate-playback-btn').addEventListener('click', () => {
      if (this.player && this.player.activateElement) {
        this.player.activateElement();
        this.debugLog('✅ Activated element for autoplay');
      }
      message.remove();
    });
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (message.parentNode) {
        message.remove();
      }
    }, 10000);
  }

  async setVolume(volume) {
    try {
      if (this.player && this.player.setVolume) {
        // Use Web Playback SDK if available
        await this.player.setVolume(volume);
        this.volume = volume;
        this.debugLog(`✅ Volume set to ${Math.round(volume * 100)}% via Web Playback SDK`);
      } else {
        // Fallback to API (if available)
        const authUrls = window.CONFIG.BACKEND.getAuthUrls();
        const response = await fetch(`${authUrls.base}/api/spotify/volume`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ volume_percent: Math.round(volume * 100) })
        });
        
        if (response.ok) {
          this.volume = volume;
          this.debugLog(`✅ Volume set to ${Math.round(volume * 100)}% via API`);
        }
      }
    } catch (error) {
      this.debugLog('❌ Error setting volume: ' + error.message);
    }
  }

  async getCurrentState() {
    try {
      if (this.player && this.player.getCurrentState) {
        // Use Web Playback SDK if available
        const state = await this.player.getCurrentState();
        this.debugLog('✅ Got current state via Web Playback SDK');
        return state;
      } else {
        // Fallback to API
        const authUrls = window.CONFIG.BACKEND.getAuthUrls();
        const response = await fetch(`${authUrls.base}/api/spotify/playback-state`, {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          this.debugLog('✅ Got current state via API');
          return data;
        }
      }
    } catch (error) {
      this.debugLog('❌ Error getting current state: ' + error.message);
      return null;
    }
  }

  async togglePlayPause() {
    try {
      console.log('🎵 Toggle play/pause called, isPlaying:', this.isPlaying);
      
      if (this.player && this.player.togglePlay) {
        // Use Web Playback SDK if available
        console.log('🎵 Using Web Playback SDK for play/pause');
        await this.player.togglePlay();
        this.debugLog('✅ Toggled playback via Web Playback SDK');
      } else {
        // Fallback to API
        console.log('🎵 Using API fallback for play/pause');
        const authUrls = window.CONFIG.BACKEND.getAuthUrls();
        const endpoint = this.isPlaying ? 'pause' : 'play';
        
        console.log('🎵 Making API call to:', `${authUrls.base}/api/spotify/${endpoint}`);
        
        const response = await fetch(`${authUrls.base}/api/spotify/${endpoint}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('🎵 API response status:', response.status);
        
        if (response.ok) {
          this.debugLog(`✅ ${this.isPlaying ? 'Paused' : 'Resumed'} playback via API`);
          // Update UI immediately for better responsiveness
          this.isPlaying = !this.isPlaying;
          this.updatePlayPauseButton();
          // Refresh state to get accurate information
          setTimeout(() => this.refreshPlaybackState(), 500);
        } else {
          const errorText = await response.text();
          console.error('❌ Failed to toggle playback:', response.status, errorText);
          this.debugLog('❌ Failed to toggle playback');
        }
      }
    } catch (error) {
      console.error('❌ Error toggling playback:', error);
      this.debugLog('❌ Error toggling playback: ' + error.message);
    }
  }

  async previousTrack() {
    try {
      if (this.player && this.player.previousTrack) {
        // Use Web Playback SDK if available
        this.player.previousTrack();
        this.debugLog('✅ Previous track via Web Playback SDK');
      } else {
        // Fallback to API
        const authUrls = window.CONFIG.BACKEND.getAuthUrls();
        const response = await fetch(`${authUrls.base}/api/spotify/previous`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          this.debugLog('✅ Previous track via API');
          // Refresh state to get new track info
          setTimeout(() => this.refreshPlaybackState(), 500);
        } else {
          this.debugLog('❌ Failed to go to previous track');
        }
      }
    } catch (error) {
      this.debugLog('❌ Error going to previous track: ' + error.message);
    }
  }

  async nextTrack() {
    try {
      if (this.player && this.player.nextTrack) {
        // Use Web Playback SDK if available
        this.player.nextTrack();
        this.debugLog('✅ Next track via Web Playback SDK');
      } else {
        // Fallback to API
        const authUrls = window.CONFIG.BACKEND.getAuthUrls();
        const response = await fetch(`${authUrls.base}/api/spotify/next`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          this.debugLog('✅ Next track via API');
          // Refresh state to get new track info
          setTimeout(() => this.refreshPlaybackState(), 500);
        } else {
          this.debugLog('❌ Failed to go to next track');
        }
      }
    } catch (error) {
      this.debugLog('❌ Error going to next track: ' + error.message);
    }
  }

  async showDeviceList() {
    try {
      const authUrls = window.CONFIG.BACKEND.getAuthUrls();
      const response = await fetch(`${authUrls.base}/devices`);
      const data = await response.json();
      
      const deviceList = document.getElementById('deviceList');
      deviceList.innerHTML = '';
      
      if (!data.devices || data.devices.length === 0) {
        deviceList.innerHTML = '<div class="no-devices">No devices found. Make sure Spotify is open on another device.</div>';
        deviceList.style.display = 'block';
        return;
      }
      
      data.devices.forEach(device => {
        const deviceItem = document.createElement('div');
        deviceItem.className = `device-item ${device.is_active ? 'active' : ''}`;
        
        // Add device type icon
        const deviceIcon = this.getDeviceIcon(device.type);
        
        deviceItem.innerHTML = `
          <div class="device-icon">${deviceIcon}</div>
          <div class="device-info">
            <span class="device-name">${device.name}</span>
            <span class="device-type">${device.type}</span>
            ${device.is_active ? '<span class="active-indicator">Currently Playing</span>' : ''}
          </div>
          ${!device.is_active ? '<button class="select-device-btn">Select</button>' : ''}
        `;
        
        if (!device.is_active) {
          deviceItem.addEventListener('click', () => {
            this.transferToDevice(device.id);
          });
        }
        
        deviceList.appendChild(deviceItem);
      });
      
      deviceList.style.display = deviceList.style.display === 'none' ? 'block' : 'none';
    } catch (error) {
      console.error('Failed to get devices:', error);
      const deviceList = document.getElementById('deviceList');
      deviceList.innerHTML = '<div class="device-error">Failed to load devices. Please try again.</div>';
      deviceList.style.display = 'block';
    }
  }

  getDeviceIcon(deviceType) {
    const icons = {
      'Computer': '💻',
      'Smartphone': '📱',
      'Speaker': '🔊',
      'TV': '📺',
      'Game console': '🎮',
      'Cast video': '📺',
      'Cast audio': '🔊',
      'Automobile': '🚗',
      'Unknown': '🎵'
    };
    return icons[deviceType] || icons['Unknown'];
  }

  async transferToDevice(deviceId) {
    try {
      const authUrls = window.CONFIG.BACKEND.getAuthUrls();
      
      // Show loading state
      const deviceList = document.getElementById('deviceList');
      deviceList.innerHTML = '<div class="device-loading">Transferring playback...</div>';
      
      const response = await fetch(`${authUrls.base}/devices/transfer`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_id: deviceId })
      });
      
      if (response.ok) {
        this.debugLog('✅ Successfully transferred playback to device');
        // Refresh device list to show updated active device
        setTimeout(() => {
          this.showDeviceList();
        }, 1000);
      } else {
        throw new Error('Transfer failed');
      }
      
    } catch (error) {
      console.error('Failed to transfer device:', error);
      const deviceList = document.getElementById('deviceList');
      deviceList.innerHTML = '<div class="device-error">Failed to transfer playback. Please try again.</div>';
      
      // Auto-refresh after 3 seconds
      setTimeout(() => {
        this.showDeviceList();
      }, 3000);
    }
  }

  showError(message) {
    document.getElementById('musicError').style.display = 'block';
    document.getElementById('musicError').querySelector('p').textContent = message;
    document.getElementById('musicStatus').textContent = 'Connection failed';
  }

  // Search functionality
  showSearchOverlay() {
    console.log('🎵 showSearchOverlay called');
    const searchOverlay = document.getElementById('searchOverlay');
    if (!searchOverlay) {
      console.error('❌ Search overlay not found');
      return;
    }
    
    console.log('🎵 Showing search overlay');
    searchOverlay.style.display = 'flex';
    searchOverlay.style.opacity = '0';
    
    // Focus on search input
    setTimeout(() => {
      searchOverlay.style.opacity = '1';
      const searchInput = document.getElementById('searchInput');
      if (searchInput) {
        searchInput.focus();
        console.log('🎵 Search input focused');
      } else {
        console.error('❌ Search input not found');
      }
    }, 10);
    
    console.log('✅ Search overlay shown');
  }

  hideSearchOverlay() {
    const searchOverlay = document.getElementById('searchOverlay');
    if (!searchOverlay) {
      console.error('Search overlay not found');
      return;
    }
    
    searchOverlay.style.opacity = '0';
    
    setTimeout(() => {
      searchOverlay.style.display = 'none';
      // Clear search results
      const searchResults = document.getElementById('searchResults');
      const searchInput = document.getElementById('searchInput');
      if (searchResults) searchResults.innerHTML = '';
      if (searchInput) searchInput.value = '';
    }, 300);
    
    console.log('Search overlay hidden');
  }

  async performSearch(query) {
    console.log('🎵 Performing search for:', query);
    
    if (!query || query.length < 2) {
      const searchResults = document.getElementById('searchResults');
      if (searchResults) searchResults.innerHTML = '';
      return;
    }

    try {
      console.log('🎵 Sending search request...');
      const authUrls = window.CONFIG.BACKEND.getAuthUrls();
      const searchUrl = `${authUrls.base}/search?q=${encodeURIComponent(query)}`;
      
      console.log('🎵 Search URL:', searchUrl);
      console.log('🎵 Access token available:', !!this.accessToken);
      
      const response = await fetch(searchUrl, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      console.log('🎵 Search response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('🎵 Search results:', data);
        this.displaySearchResults(data);
      } else {
        const errorText = await response.text();
        console.error('❌ Search failed:', response.status, response.statusText, errorText);
        const searchResults = document.getElementById('searchResults');
        if (searchResults) {
          searchResults.innerHTML = '<div class="no-results">Search failed. Please try again.</div>';
        }
      }
    } catch (error) {
      console.error('❌ Search error:', error);
      const searchResults = document.getElementById('searchResults');
      if (searchResults) {
        searchResults.innerHTML = '<div class="no-results">Search error. Please check your connection.</div>';
      }
    }
  }

  displaySearchResults(data) {
    console.log('Displaying search results:', data);
    const resultsContainer = document.getElementById('searchResults');
    if (!resultsContainer) {
      console.error('Search results container not found');
      return;
    }
    
    resultsContainer.innerHTML = '';

    if (!data.tracks || !data.tracks.items) {
      resultsContainer.innerHTML = '<div class="no-results">No results found</div>';
      return;
    }

    console.log('Found', data.tracks.items.length, 'tracks');
    
    data.tracks.items.slice(0, 10).forEach(track => {
      const resultItem = document.createElement('div');
      resultItem.className = 'search-result-item';
      resultItem.innerHTML = `
        <div class="result-artwork">
          <img src="${track.album.images[0]?.url || ''}" alt="${track.name}">
        </div>
        <div class="result-info">
          <div class="result-name">${track.name}</div>
          <div class="result-artist">${track.artists.map(a => a.name).join(', ')}</div>
        </div>
        <button class="play-result-btn" data-track-uri="${track.uri}">▶</button>
      `;

      // Add click handler to play the track
      resultItem.querySelector('.play-result-btn').addEventListener('click', () => {
        this.playTrack(track.uri);
        this.hideSearchOverlay();
      });

      resultsContainer.appendChild(resultItem);
    });
  }

  async playTrack(trackUri) {
    try {
      const authUrls = window.CONFIG.BACKEND.getAuthUrls();
      const response = await fetch(`${authUrls.base}/api/spotify/play`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ uris: [trackUri] })
      });

      if (response.ok) {
        this.debugLog('✅ Playing track: ' + trackUri);
        // Refresh state to get new track info
        setTimeout(() => this.refreshPlaybackState(), 1000);
      } else {
        this.debugLog('❌ Failed to play track');
      }
    } catch (error) {
      this.debugLog('❌ Error playing track: ' + error.message);
    }
  }


  // Cleanup when modal is closed
  destroy() {
    if (this.player) {
      this.player.disconnect();
    }
    
    // Stop smart refresh
    this.stopSmartRefresh();
    
    // Clear any existing polling intervals (legacy cleanup)
    if (this.playbackInterval) {
      clearInterval(this.playbackInterval);
      this.playbackInterval = null;
    }
    
    // CRITICAL FIX: Unsubscribe from state manager to prevent memory leaks
    if (this.unsubscribeFromMusicState) {
      this.unsubscribeFromMusicState();
      this.unsubscribeFromMusicState = null;
    }
    
    this.debugLog('🎵 Music modal cleaned up');
  }
}

// Global function for UI Manager to call
window.showMusicModal = function() {
  // CRITICAL FIX: Only create one instance, reuse if it exists
  if (!window.currentMusicModal) {
    window.currentMusicModal = new MusicModal();
  }
  window.currentMusicModal.showMusicModal();
};

// Cleanup when modal is closed
document.addEventListener('click', (e) => {
  if (e.target.id === 'closeModal' || e.target.id === 'modalBg') {
    if (window.currentMusicModal) {
      // CRITICAL FIX: Just hide the modal, keep all operations running in background
      // This ensures album artwork updates continue for side button and other UI elements
      window.currentMusicModal.debugLog('🎵 Music modal hidden, operations continue in background');
    }
  }
});

// Spotify Token Refresh Manager
// Access tokens expire after 1 hour (3600 seconds) per Spotify API documentation
class SpotifyTokenRefreshManager {
  constructor() {
    this.refreshInterval = null;
    this.REFRESH_INTERVAL = 55 * 60 * 1000; // Refresh every 55 minutes (before 1 hour expiration)
  }

  start() {
    // Clear any existing interval
    this.stop();
    
    // Start periodic token refresh
    this.refreshInterval = setInterval(() => {
      this.refreshToken();
    }, this.REFRESH_INTERVAL);
    
    console.log('🎵 Spotify token refresh manager started (refreshing every 55 minutes)');
  }

  stop() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
      console.log('🎵 Spotify token refresh manager stopped');
    }
  }

  async refreshToken() {
    try {
      const authUrls = window.CONFIG.BACKEND.getAuthUrls();
      const response = await fetch(`${authUrls.base}/api/spotify/refresh-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('🎵 Spotify access token refreshed successfully');
        
        // Update session storage with new token
        if (data.access_token) {
          sessionStorage.setItem('spotify_access_token', data.access_token);
        }
        
        return data;
      } else {
        console.error('❌ Failed to refresh Spotify token:', response.status);
        return null;
      }
    } catch (error) {
      console.error('❌ Error refreshing Spotify token:', error);
      return null;
    }
  }
}

// Initialize token refresh manager globally
window.spotifyTokenRefreshManager = new SpotifyTokenRefreshManager();

// Start token refresh when user authenticates with Spotify
window.addEventListener('spotify:authenticated', () => {
  window.spotifyTokenRefreshManager.start();
});

// Stop token refresh when user logs out
window.addEventListener('spotify:logout', () => {
  window.spotifyTokenRefreshManager.stop();
});