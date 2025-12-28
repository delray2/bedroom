/**
 * Music Controller for Spotify Integration
 * 
 * Uses local backend pattern (like local server example):
 * - Frontend → Local Backend → Render Middleware → Spotify API
 * - Local backend handles OAuth with client secret (secure)
 * - Local backend proxies all API calls to Render middleware
 * - SSE (/events) for real-time updates from local backend
 * - Local backend receives updates from Render middleware via WebSocket
 */

(function() {
  'use strict';

  const AUTH_STORAGE_KEY = 'spotify_authenticated';
  const TOKEN_STORAGE_KEY = 'spotify_access_token';
  const REFRESH_TOKEN_STORAGE_KEY = 'spotify_refresh_token';
  const TOKEN_EXPIRY_STORAGE_KEY = 'spotify_token_expiry';

  class MusicController {
    constructor() {
      this.state = {
        isAuthenticated: false,
        isPlaying: false,
        track: null,
        progressMs: 0,
        durationMs: 0,
        volumePercent: null,
        deviceId: null,
        deviceName: null,
        deviceType: null,
        lastUpdated: null
      };

      this.listeners = {
        state: new Set(),
        auth: new Set(),
        error: new Set()
      };

      this.sseEventSource = null;
      this.sseReconnectAttempts = 0;
      this.sseReconnectTimer = null;
      this.sseConnectionState = 'disconnected'; // 'disconnected', 'connecting', 'connected'
      this.visibilityContexts = new Map([
        ['modal', false],
        ['overlay', false]
      ]);

      this.restoreFromStorage();
      this.attachStateManager();
      // Don't connect SSE immediately - wait for IP detection to complete
      this.initializeSSE();
    }

    async initializeSSE() {
      // Wait for IP detection before connecting SSE
      if (window.ipDetection) {
        try {
          await window.ipDetection.waitForDetection();
        } catch (e) {
          console.warn('⚠️ IP detection wait failed, proceeding anyway:', e);
        }
        
        // Listen for IP changes and reconnect SSE
        window.ipDetection.addListener((changeData) => {
          if (changeData.changed) {
            console.log('📡 IP changed, reconnecting SSE:', changeData.oldIP, '->', changeData.newIP);
            setTimeout(() => {
              this.connectSSE();
            }, 1000); // Small delay to ensure new IP is ready
          }
        });
      }
      this.connectSSE();
    }

    getBaseUrl() {
      // Always use local backend (which proxies to Render middleware)
      if (window.ipDetection) {
        const ip = window.ipDetection.getCurrentIP();
        return `https://${ip}:4711`;
      }
      return window.CONFIG?.BACKEND?.getAuthUrls?.()?.base || '';
    }

    getAuthUrls() {
      const base = this.getBaseUrl();
      return {
        login: `${base}/auth/login`,
        callback: `${base}/oauth/callback`,
        token: `${base}/auth/token`,
        base: base
      };
    }

    restoreFromStorage() {
      try {
        const storedAuth = localStorage.getItem(AUTH_STORAGE_KEY);
        const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
        const storedRefreshToken = localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
        const storedExpiry = localStorage.getItem(TOKEN_EXPIRY_STORAGE_KEY);
        
        if (storedAuth === 'true' && storedToken) {
          const now = Date.now();
          const expiry = storedExpiry ? parseInt(storedExpiry, 10) : 0;
          const bufferTime = 5 * 60 * 1000; // 5 minutes
          const needsRefresh = (expiry - now) < bufferTime;
          
          if (expiry > now && !needsRefresh) {
            this.state.isAuthenticated = true;
            this.state.lastUpdated = Date.now();
          } else if (storedRefreshToken) {
            this.state.isAuthenticated = true;
            this.refreshToken().catch(() => {
              this.clearStoredToken();
            });
          } else {
            this.clearStoredToken();
          }
        }
      } catch (error) {
        console.error('MusicController: Error restoring from localStorage:', error);
      }
    }

    attachStateManager() {
      const subscribe = () => {
        if (!window.deviceStateManager || typeof window.deviceStateManager.subscribeToMusic !== 'function') {
          return;
        }

        this.deviceStateUnsubscribe = window.deviceStateManager.subscribeToMusic((musicState) => {
          this.applyHubMusicState(musicState);
        });

        const currentState = window.deviceStateManager.getMusicState?.();
        if (currentState) {
          this.applyHubMusicState(currentState);
        }
      };

      if (window.deviceStateManager) {
        subscribe();
      } else {
        window.addEventListener('deviceStateManager:ready', subscribe, { once: true });
      }
    }

    connectSSE() {
      // Close existing connection if any
      if (this.sseEventSource) {
        try {
          this.sseEventSource.close();
        } catch (e) {
          console.warn('Error closing existing SSE connection:', e);
        }
        this.sseEventSource = null;
      }

      // Clear any pending reconnection timer
      if (this.sseReconnectTimer) {
        clearTimeout(this.sseReconnectTimer);
        this.sseReconnectTimer = null;
      }

      // Connect to Server-Sent Events for real-time updates (like local server example)
      const base = this.getBaseUrl();
      if (!base) {
        console.warn('⚠️ Cannot connect SSE - no base URL');
        this.scheduleSSEReconnect();
        return;
      }

      const sseUrl = `${base}/events`;
      console.log('📡 Connecting to SSE:', sseUrl, `(attempt ${this.sseReconnectAttempts + 1})`);
      this.sseConnectionState = 'connecting';

      try {
        this.sseEventSource = new EventSource(sseUrl);
        
        this.sseEventSource.onopen = () => {
          console.log('✅ SSE connection opened');
          this.sseConnectionState = 'connected';
          this.sseReconnectAttempts = 0; // Reset on successful connection
          
          // Clear any pending reconnection timer
          if (this.sseReconnectTimer) {
            clearTimeout(this.sseReconnectTimer);
            this.sseReconnectTimer = null;
          }
        };

        this.sseEventSource.addEventListener('status', (event) => {
          try {
            const data = JSON.parse(event.data);
            if (typeof data.loggedIn === 'boolean') {
              this.setAuthenticated(data.loggedIn);
            }
            if (typeof data.connectedToMiddleware === 'boolean') {
              // Middleware connection status (for debugging)
              console.log('Middleware connected:', data.connectedToMiddleware);
            }
          } catch (e) {
            console.error('Error parsing SSE status:', e);
          }
        });

        this.sseEventSource.addEventListener('player_state', (event) => {
          try {
            const playerData = JSON.parse(event.data);
            console.log('📡 SSE player_state received:', playerData ? (playerData.item ? `track: ${playerData.item.name}` : 'no item') : 'null');
            
            if (playerData && playerData.item) {
              // Valid playback data - apply it
              console.log('📡 Applying valid SSE player_state');
              this.applyPlaybackState(playerData);
            } else if (playerData === null) {
              // Explicit null from backend - but only clear if we don't have recent valid data
              const timeSinceLastUpdate = Date.now() - (this.state.lastUpdated || 0);
              const shouldClear = timeSinceLastUpdate > 10000 || !this.state.track;
              console.log('📡 SSE null player_state - time since update:', timeSinceLastUpdate, 'ms, should clear:', shouldClear);
              
              if (shouldClear) {
                // No recent data or no track - safe to clear
                this.applyPlaybackState(null);
              } else {
                console.log('📡 Ignoring SSE null update (have recent valid data)');
              }
            } else {
              console.log('📡 SSE player_state empty/invalid, ignoring');
            }
          } catch (e) {
            console.error('Error parsing SSE player_state:', e);
            // Don't clear state on parse errors - might be transient
          }
        });

        this.sseEventSource.onerror = (error) => {
          const readyState = this.sseEventSource?.readyState;
          console.error('❌ SSE connection error:', error);
          console.error('SSE readyState:', readyState, '(0=CONNECTING, 1=OPEN, 2=CLOSED)');
          
          // If connection is closed (readyState === 2), it won't auto-reconnect
          // We need to manually reconnect
          if (readyState === 2) {
            console.log('📡 SSE connection closed, scheduling reconnect...');
            this.sseConnectionState = 'disconnected';
            this.scheduleSSEReconnect();
          } else if (readyState === 0) {
            // Still connecting - might be certificate/network error
            console.log('📡 SSE connection failed during initial connect, will retry...');
            this.sseConnectionState = 'disconnected';
            // EventSource will try to reconnect, but if it fails immediately, we'll handle it
            setTimeout(() => {
              if (this.sseEventSource?.readyState === 2) {
                this.scheduleSSEReconnect();
              }
            }, 2000);
          }
          
          // Check auth status (but don't block on it)
          this.checkAuth().catch(() => {});
        };
      } catch (error) {
        console.error('Failed to create SSE connection:', error);
        this.sseConnectionState = 'disconnected';
        this.scheduleSSEReconnect();
      }
    }

    scheduleSSEReconnect() {
      // Don't schedule if already scheduled
      if (this.sseReconnectTimer) {
        return;
      }

      // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
      const maxAttempts = 10;
      const baseDelay = 1000;
      const maxDelay = 30000;
      
      if (this.sseReconnectAttempts >= maxAttempts) {
        console.warn('⚠️ SSE: Max reconnection attempts reached, will retry periodically');
        // After max attempts, retry every 30 seconds
        this.sseReconnectTimer = setTimeout(() => {
          this.sseReconnectAttempts = 0; // Reset after long wait
          this.sseReconnectTimer = null;
          this.connectSSE();
        }, maxDelay);
        return;
      }

      const delay = Math.min(baseDelay * Math.pow(2, this.sseReconnectAttempts), maxDelay);
      console.log(`📡 SSE: Scheduling reconnect in ${delay}ms (attempt ${this.sseReconnectAttempts + 1}/${maxAttempts})`);
      
      this.sseReconnectTimer = setTimeout(() => {
        this.sseReconnectAttempts++;
        this.sseReconnectTimer = null;
        this.connectSSE();
      }, delay);
    }

    on(event, handler) {
      const bucket = this.listeners[event];
      if (!bucket || typeof handler !== 'function') return () => {};
      bucket.add(handler);
      return () => bucket.delete(handler);
    }

    emit(event, payload) {
      const bucket = this.listeners[event];
      if (!bucket) return;
      bucket.forEach((handler) => {
        try {
          handler(payload);
        } catch (error) {
          console.error('MusicController listener error', error);
        }
      });
    }

    getState() {
      return { ...this.state };
    }

    async ensureAuth() {
      const authed = await this.checkAuth();
      if (authed) {
        this.updatePollingState();
      } else {
        this.stopPolling();
      }
      return authed;
    }

    async checkAuth() {
      const base = this.getBaseUrl();
      if (!base) return false;

      try {
        const response = await fetch(`${base}/api/session`, {
          credentials: 'include',
          headers: { 'Accept': 'application/json' }
        });
        
        if (!response.ok) {
          this.setAuthenticated(false);
          return false;
        }

        const data = await response.json();
        const isLoggedIn = !!data.loggedIn;
        
        if (isLoggedIn) {
          // Get token from backend
          const tokenResponse = await fetch(`${base}/auth/token`, {
            credentials: 'include',
            headers: { 'Accept': 'application/json' }
          });
          
          if (tokenResponse.ok) {
            const tokenData = await tokenResponse.json();
            if (tokenData && tokenData.access_token) {
              this.setAuthenticated(true, tokenData.access_token, tokenData.refresh_token, tokenData.expires_in);
              return true;
            }
          }
        }

        this.setAuthenticated(false);
        return false;
      } catch (error) {
        this.emit('error', error);
        return false;
      }
    }

    setAuthenticated(isAuthenticated, token = null, refreshToken = null, expiresIn = 3600) {
      const changed = this.state.isAuthenticated !== isAuthenticated;
      this.state.isAuthenticated = isAuthenticated;
      this.state.lastUpdated = Date.now();

      if (isAuthenticated && token) {
        this.persistToken(token, refreshToken, expiresIn);
        window.dispatchEvent(new CustomEvent('spotify:authenticated'));
      }

      if (!isAuthenticated) {
        this.clearStoredToken();
        this.stopPolling();
        window.dispatchEvent(new CustomEvent('spotify:logout'));
      }

      this.updatePollingState();

      if (changed) {
        this.emit('auth', isAuthenticated);
        this.emit('state', this.getState());
      }
    }

    persistToken(token, refreshToken = null, expiresIn = 3600) {
      try {
        localStorage.setItem(TOKEN_STORAGE_KEY, token);
        localStorage.setItem(AUTH_STORAGE_KEY, 'true');
        
        const expiryTime = Date.now() + (expiresIn * 1000);
        localStorage.setItem(TOKEN_EXPIRY_STORAGE_KEY, expiryTime.toString());
        
        if (refreshToken) {
          localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
        }
      } catch (error) {
        console.warn('MusicController: unable to persist token', error);
      }
    }

    clearStoredToken() {
      try {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        localStorage.removeItem(AUTH_STORAGE_KEY);
        localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
        localStorage.removeItem(TOKEN_EXPIRY_STORAGE_KEY);
      } catch (error) {
        console.warn('MusicController: unable to clear token', error);
      }
    }

    updatePollingState() {
      // NO LOCAL POLLING - Middleware polls Spotify and pushes updates via WebSocket → SSE
      // All updates come from middleware server, no fallback polling needed
      this.stopPolling();
    }

    startPolling() {
      // DISABLED - Middleware handles all polling
      // Updates come from middleware via WebSocket → local server → SSE → frontend
    }

    stopPolling() {
      if (this.pollTimer) {
        clearInterval(this.pollTimer);
        this.pollTimer = null;
      }
      this.isPolling = false;
    }

    async refreshToken() {
      const base = this.getBaseUrl();
      if (!base) return false;

      try {
        const response = await fetch(`${base}/api/spotify/refresh-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include'
        });
        
        if (!response.ok) {
          if (response.status === 401) {
            this.setAuthenticated(false);
          }
          return false;
        }
        
        const data = await response.json().catch(() => null);
        if (data && data.access_token) {
          this.persistToken(data.access_token, data.refresh_token, data.expires_in || 3600);
          if (!this.state.isAuthenticated) {
            this.state.isAuthenticated = true;
            this.emit('auth', true);
            this.emit('state', this.getState());
          }
          return true;
        }
        
        return false;
      } catch (error) {
        console.error('MusicController: Token refresh error:', error.message);
        this.emit('error', error);
        return false;
      }
    }

    async refreshPlaybackState() {
      if (!this.state.isAuthenticated) return null;
      
      // Use the generic proxy endpoint with correct Spotify API path
      try {
        console.log('🔄 refreshPlaybackState: fetching playback state...');
        const response = await this.sendCommand('GET', '/v1/me/player');
        
        // Spotify returns 204 No Content when there's no active playback
        if (response.status === 204) {
          console.log('🔄 Got 204 response (no active playback)');
          // Don't clear state on single 204 - might be transient
          // Only clear if we've had no valid data for a while
          const timeSinceLastUpdate = Date.now() - (this.state.lastUpdated || 0);
          if (timeSinceLastUpdate > 30000) { // 30 seconds without valid data
            console.log('🔄 Clearing state after 30s without valid data');
            this.applyPlaybackState(null);
          } else {
            console.log('🔄 Ignoring 204 (have recent data, time since update:', timeSinceLastUpdate, 'ms)');
          }
          return null;
        }
        
        // Parse JSON only if status is 200
        if (response.status === 200) {
          const data = await response.json();
          console.log('🔄 Got 200 response with data:', data?.item ? `track: ${data.item.name}` : 'no item');
          this.applyPlaybackState(data);
          return data;
        }
        
        // Other status codes
        const text = await response.text().catch(() => '');
        console.warn('MusicController: Unexpected response status', response.status, text);
        return null;
      } catch (error) {
        console.log('🔄 refreshPlaybackState error:', error.message);
        // Check if it's a JSON parse error (likely 204 response)
        if (error.message.includes('JSON') || error.message.includes('Unexpected end')) {
          // Probably a 204 response - don't clear state immediately
          console.log('🔄 JSON parse error (likely 204), ignoring');
          return null;
        }
        
        if (error.message.includes('401') || error.message.includes('expired')) {
          const refreshSuccess = await this.refreshToken();
          if (refreshSuccess) {
            try {
              const retryResponse = await this.sendCommand('GET', '/v1/me/player');
              if (retryResponse.status === 204) {
                return null;
              }
              if (retryResponse.status === 200) {
                const data = await retryResponse.json();
                this.applyPlaybackState(data);
                return data;
              }
            } catch (retryError) {
              this.setAuthenticated(false);
              return null;
            }
          }
          this.setAuthenticated(false);
          return null;
        }
        console.warn('MusicController: playback refresh failed', error);
        this.emit('error', error);
        return null;
      }
    }

    applyPlaybackState(data) {
      console.log('🎵 applyPlaybackState called with:', data ? 'valid data' : 'null/empty', data?.item ? `track: ${data.item.name}` : 'no track');
      
      if (!data || !data.item) {
        // No active playback - but only clear if we don't have recent valid data
        // This prevents clearing state on transient 204 responses
        const timeSinceLastUpdate = Date.now() - (this.state.lastUpdated || 0);
        const hasRecentTrack = this.state.track && timeSinceLastUpdate < 10000;
        
        console.log('🎵 No playback data - time since last update:', timeSinceLastUpdate, 'ms, has recent track:', hasRecentTrack);
        
        if (hasRecentTrack) {
          // We have track data and it's recent - don't clear, just mark as paused
          console.log('🎵 Keeping track data, just marking as paused');
          this.state = {
            ...this.state,
            isPlaying: false,
            lastUpdated: Date.now()
          };
        } else {
          // No recent valid data - clear state
          console.log('🎵 Clearing playback state (no recent valid data)');
          this.state = {
            ...this.state,
            isPlaying: false,
            track: null,
            progressMs: 0,
            durationMs: 0,
            lastUpdated: Date.now()
          };
        }
        this.emit('state', this.getState());
        this.updatePollingState();
        return;
      }

      const track = this.mapTrack(data?.item);
      const isPlaying = Boolean(data?.is_playing);
      const progressMs = data?.progress_ms ?? 0;
      const durationMs = track?.durationMs ?? 0;
      const deviceId = data?.device?.id || null;
      const deviceName = data?.device?.name || null;
      const deviceType = data?.device?.type || null;
      const volumePercent = data?.device?.volume_percent ?? null;

      this.state = {
        ...this.state,
        isPlaying,
        track,
        progressMs,
        durationMs,
        deviceId,
        deviceName,
        deviceType,
        volumePercent,
        lastUpdated: Date.now()
      };

      if (window.deviceStateManager && typeof window.deviceStateManager.updateMusicState === 'function') {
        window.deviceStateManager.updateMusicState(isPlaying, track ? {
          name: track.title,
          artist: track.artist,
          album: track.album,
          imageUrl: track.imageUrl,
          duration: track.durationMs,
          progress: progressMs
        } : null);
      }

      this.emit('state', this.getState());
      this.updatePollingState();
    }

    mapTrack(item) {
      if (!item) return null;
      return {
        id: item.id || null,
        title: item.name || 'Unknown track',
        artist: (item.artists || []).map((artist) => artist.name).filter(Boolean).join(', ') || 'Unknown artist',
        album: item.album?.name || '',
        imageUrl: item.album?.images?.[0]?.url || null,
        durationMs: item.duration_ms || 0
      };
    }

    applyHubMusicState(musicState) {
      if (!musicState) return;

      const trackInfo = musicState.trackInfo || null;
      const mappedTrack = trackInfo ? {
        id: trackInfo.id || null,
        title: trackInfo.name || trackInfo.title || 'Unknown track',
        artist: trackInfo.artist || trackInfo.artists || 'Unknown artist',
        album: trackInfo.album || '',
        imageUrl: trackInfo.imageUrl || null,
        durationMs: trackInfo.duration || trackInfo.durationMs || this.state.durationMs,
        progress: trackInfo.progress || trackInfo.progressMs || null
      } : null;

      const progressMs = mappedTrack?.progress ?? this.state.progressMs;
      const durationMs = mappedTrack?.durationMs ?? this.state.durationMs;

      this.state = {
        ...this.state,
        isPlaying: Boolean(musicState.isPlaying),
        track: mappedTrack ? { ...mappedTrack } : null,
        progressMs,
        durationMs,
        lastUpdated: Date.now()
      };

      this.emit('state', this.getState());
      this.updatePollingState();
    }

    async sendCommand(method, endpoint, body = null) {
      if (!this.state.isAuthenticated) {
        throw new Error('Not authenticated with Spotify');
      }

      const base = this.getBaseUrl();
      if (!base) {
        throw new Error('Spotify backend unavailable');
      }

      // Use local backend proxy endpoint (which forwards to Render middleware)
      const options = { method, credentials: 'include' };
      if (body) {
        options.headers = { 'Content-Type': 'application/json' };
        options.body = JSON.stringify(body);
      }

      const response = await fetch(`${base}/api/spotify${endpoint}`, options);

      if (response.status === 401) {
        this.setAuthenticated(false);
        throw new Error('Spotify session expired');
      }

      // 204 No Content is a valid response (means no active playback)
      if (response.status === 204) {
        return response;
      }

      if (!response.ok) {
        const text = await response.text().catch(() => response.statusText);
        throw new Error(text || 'Spotify request failed');
      }

      return response;
    }

    async togglePlayPause() {
      if (this.state.isPlaying) {
        await this.pause();
      } else {
        await this.play();
      }
    }

    async play() {
      await this.sendCommand('PUT', '/v1/me/player/play');
      // Don't poll - middleware will push update via WebSocket → SSE
    }

    async pause() {
      await this.sendCommand('PUT', '/v1/me/player/pause');
      // Don't poll - middleware will push update via WebSocket → SSE
    }

    async next() {
      await this.sendCommand('POST', '/v1/me/player/next');
      // Don't poll - middleware will push update via WebSocket → SSE
    }

    async previous() {
      await this.sendCommand('POST', '/v1/me/player/previous');
      // Don't poll - middleware will push update via WebSocket → SSE
    }

    async setVolume(volumePercent) {
      const clamped = Math.max(0, Math.min(100, Math.round(volumePercent)));
      await this.sendCommand('PUT', `/v1/me/player/volume?volume_percent=${clamped}`);
      this.state = { ...this.state, volumePercent: clamped, lastUpdated: Date.now() };
      this.emit('state', this.getState());
    }

    async refreshDevices() {
      const response = await this.sendCommand('GET', '/v1/me/player/devices');
      const data = await response.json();
      return data?.devices || [];
    }

    async transferPlayback(deviceId) {
      await this.sendCommand('PUT', '/v1/me/player', { device_ids: [deviceId] });
      // Don't poll - middleware will push update via WebSocket → SSE
    }

    async search(query) {
      if (!query) return [];
      const response = await this.sendCommand('GET', `/v1/search?q=${encodeURIComponent(query)}&type=track`);
      const data = await response.json();
      return data?.tracks?.items || [];
    }

    async playUris(uris, options = {}) {
      if (!Array.isArray(uris) || uris.length === 0) {
        console.warn('MusicController: playUris called with invalid URIs:', uris);
        return;
      }
      
      const payload = { uris: uris.slice(0, 50) };
      if (options.deviceId) {
        payload.device_id = options.deviceId;
      }
      await this.sendCommand('PUT', '/v1/me/player/play', payload);
      // Don't poll - middleware will push update via WebSocket → SSE
    }

    async playTrackUri(uri, options = {}) {
      if (!uri) return;
      await this.playUris([uri], options);
    }

    setContextActive(context, isActive) {
      if (!context) return;
      const normalized = Boolean(isActive);
      const previous = this.visibilityContexts.get(context);
      if (previous === normalized) {
        return;
      }
      this.visibilityContexts.set(context, normalized);
      this.updatePollingState();
    }

    setModalVisible(isVisible) {
      this.setContextActive('modal', isVisible);
    }

    setOverlayActive(isVisible) {
      this.setContextActive('overlay', isVisible);
    }

    async openLogin() {
      const urls = this.getAuthUrls();
      if (!urls.login) {
        throw new Error('Spotify login URL unavailable');
      }

      // Use local backend login endpoint (which redirects to Render middleware OAuth)
      const loginWindow = window.open(
        urls.login,
        'spotify-login',
        'width=520,height=720,menubar=no,toolbar=no,location=yes,status=no,resizable=yes,scrollbars=yes'
      );

      if (!loginWindow) {
        throw new Error('Browser blocked the Spotify login popup. Please allow popups for this site.');
      }

      // Focus the login window
      try {
        loginWindow.focus();
      } catch (e) {
        console.warn('Could not focus login window:', e.message);
      }

      // Set up message listener for authentication success
      const messageListener = (event) => {
        if (event.data && event.data.type === 'spotify-auth-success') {
          this.checkAuth().then((authed) => {
            if (authed) {
              this.updatePollingState();
            }
          });
        }
      };
      
      window.addEventListener('message', messageListener);

      try {
        const success = await this.pollForAuth(() => loginWindow && loginWindow.closed);
        if (!success) {
          throw new Error('Spotify login timed out or was cancelled');
        }
        return true;
      } finally {
        window.removeEventListener('message', messageListener);
        if (loginWindow && !loginWindow.closed) {
          try {
            loginWindow.close();
          } catch (e) {
            console.warn('Could not close login window:', e.message);
          }
        }
      }
    }

    async pollForAuth(stopCondition) {
      const timeoutMs = 5 * 60 * 1000;
      const intervalMs = 2000;
      const start = Date.now();

      while (Date.now() - start < timeoutMs) {
        const authed = await this.checkAuth();
        if (authed) {
          this.updatePollingState();
          return true;
        }

        if (typeof stopCondition === 'function' && stopCondition()) {
          return false;
        }

        await this.delay(intervalMs);
      }

      return false;
    }

    delay(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }

    async logout() {
      const base = this.getBaseUrl();
      if (base) {
        try {
          const response = await fetch(`${base}/api/logout`, { 
            method: 'POST',
            credentials: 'include'
          });
          
          if (response.ok) {
            const data = await response.json();
            // Open middleware logout URL if provided (clears Spotify web session cookies)
            if (data.middlewareLogoutUrl) {
              window.open(data.middlewareLogoutUrl, '_blank', 'noopener,noreferrer');
            }
          }
        } catch (error) {
          console.warn('MusicController: logout request failed', error);
        }
      }
      
      this.setAuthenticated(false);
      this.state = {
        ...this.state,
        isPlaying: false,
        track: null,
        progressMs: 0,
        durationMs: 0,
        volumePercent: null,
        deviceId: null,
        deviceName: null,
        deviceType: null
      };
      this.emit('state', this.getState());
    }
  }

  const controller = new MusicController();
  window.musicController = controller;
  window.dispatchEvent(new CustomEvent('music:controller-ready', { detail: controller }));

  // Wait for IP detection before attempting authentication
  async function initializeMusicController() {
    if (window.ipDetection) {
      await window.ipDetection.waitForDetection();
    }
    
    if (typeof controller.ensureAuth === 'function') {
      controller.ensureAuth().catch((error) => {
        console.warn('MusicController: initial auth check failed', error);
      });
    }
  }
  
  setTimeout(initializeMusicController, 1000);
})();
