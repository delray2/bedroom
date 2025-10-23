(function() {
  'use strict';

  const AUTH_STORAGE_KEY = 'spotify_authenticated';
  const TOKEN_STORAGE_KEY = 'spotify_access_token';
  const REFRESH_TOKEN_STORAGE_KEY = 'spotify_refresh_token';
  const TOKEN_EXPIRY_STORAGE_KEY = 'spotify_token_expiry';
  const POLL_INTERVAL_MS = 10000;
  const TOKEN_REFRESH_INTERVAL_MS = 50 * 60 * 1000; // 50 minutes (refresh before 1 hour expiry)

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

      this.pollTimer = null;
      this.tokenRefreshTimer = null;
      this.isPolling = false;
      this.visibilityContexts = new Map([
        ['modal', false],
        ['overlay', false]
      ]);

      this.restoreFromStorage();
      this.attachStateManager();
    }

    restoreFromStorage() {
      try {
        const storedAuth = localStorage.getItem(AUTH_STORAGE_KEY);
        const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
        const storedRefreshToken = localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
        const storedExpiry = localStorage.getItem(TOKEN_EXPIRY_STORAGE_KEY);
        
        if (storedAuth === 'true' && storedToken) {
          // Check if token is still valid (not expired)
          const now = Date.now();
          const expiry = storedExpiry ? parseInt(storedExpiry, 10) : 0;
          
          if (expiry > now) {
            // Token is still valid
            this.state.isAuthenticated = true;
            this.state.lastUpdated = Date.now();
            console.log('🎵 Restored valid Spotify authentication from localStorage');
            
            // Start token refresh if we have a refresh token
            if (storedRefreshToken) {
              this.startTokenRefresh();
            }
          } else {
            // Token is expired, try to refresh if we have a refresh token
            if (storedRefreshToken) {
              console.log('🎵 Access token expired, attempting refresh...');
              this.refreshToken().then((success) => {
                if (success) {
                  console.log('🎵 Token refreshed successfully');
                  this.startTokenRefresh();
                } else {
                  console.log('🎵 Token refresh failed, clearing stored auth');
                  this.clearStoredToken();
                }
              }).catch(() => {
                console.log('🎵 Token refresh failed, clearing stored auth');
                this.clearStoredToken();
              });
            } else {
              console.log('🎵 Token expired and no refresh token available');
              this.clearStoredToken();
            }
          }
        }
      } catch (error) {
        console.warn('MusicController: Unable to restore localStorage', error);
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

    getAuthUrls() {
      // Use IP detection service for correct URLs
      if (window.ipDetection) {
        return window.ipDetection.getAuthURLs();
      }
      return window.CONFIG?.BACKEND?.getAuthUrls?.() || {};
    }

    getBaseUrl() {
      const urls = this.getAuthUrls();
      return urls.base || '';
    }

    getState() {
      return { ...this.state };
    }

    async ensureAuth() {
      const authed = await this.checkAuth();
      if (authed) {
        this.startTokenRefresh();
        this.updatePollingState();
      } else {
        this.stopPolling();
        this.stopTokenRefresh();
      }
      return authed;
    }

    async checkAuth() {
      const urls = this.getAuthUrls();
      if (!urls.token) return false;

      try {
        const response = await fetch(urls.token, { credentials: 'include' });
        if (!response.ok) {
          if (response.status === 401) {
            this.setAuthenticated(false);
          }
          return false;
        }

        const data = await response.json();
        if (data && data.access_token) {
          this.setAuthenticated(true, data.access_token, data.refresh_token, data.expires_in);
          return true;
        }

        this.setAuthenticated(false);
        return false;
      } catch (error) {
        console.warn('MusicController: auth check failed', error);
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
        this.stopTokenRefresh();
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
        
        // Calculate expiry time (expiresIn is in seconds)
        const expiryTime = Date.now() + (expiresIn * 1000);
        localStorage.setItem(TOKEN_EXPIRY_STORAGE_KEY, expiryTime.toString());
        
        if (refreshToken) {
          localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
        }
        
        console.log('🎵 Token persisted to localStorage with expiry:', new Date(expiryTime).toLocaleString());
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
        console.log('🎵 Cleared all Spotify tokens from localStorage');
      } catch (error) {
        console.warn('MusicController: unable to clear token', error);
      }
    }

    startPolling() {
      if (this.isPolling) return;
      this.isPolling = true;
      this.refreshPlaybackState();
      this.pollTimer = setInterval(() => {
        this.refreshPlaybackState();
      }, POLL_INTERVAL_MS);
    }

    stopPolling() {
      if (!this.isPolling && !this.pollTimer) return;
      this.isPolling = false;
      if (this.pollTimer) {
        clearInterval(this.pollTimer);
        this.pollTimer = null;
      }
    }

    startTokenRefresh() {
      if (this.tokenRefreshTimer) return;
      this.tokenRefreshTimer = setInterval(() => {
        this.refreshToken().catch(() => {});
      }, TOKEN_REFRESH_INTERVAL_MS);
    }

    stopTokenRefresh() {
      if (this.tokenRefreshTimer) {
        clearInterval(this.tokenRefreshTimer);
        this.tokenRefreshTimer = null;
      }
    }

    async refreshToken() {
      if (!this.state.isAuthenticated) return false;
      const base = this.getBaseUrl();
      if (!base) return false;

      try {
        const response = await fetch(`${base}/api/spotify/refresh-token`, {
          method: 'POST'
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
          return true;
        }
        return false;
      } catch (error) {
        console.warn('MusicController: refresh token failed', error);
        this.emit('error', error);
        return false;
      }
    }

    async refreshPlaybackState() {
      if (!this.state.isAuthenticated) return null;
      const base = this.getBaseUrl();
      if (!base) return null;

      try {
        const response = await fetch(`${base}/api/spotify/playback-state`, {
          credentials: 'include'
        });

        if (response.status === 401) {
          this.setAuthenticated(false);
          return null;
        }

        if (!response.ok) {
          const errorText = await response.text().catch(() => response.statusText);
          throw new Error(`Playback state error: Request failed with status code ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        this.applyPlaybackState(data);
        return data;
      } catch (error) {
        console.warn('MusicController: playback refresh failed', error);
        this.emit('error', error);
        return null;
      }
    }

    applyPlaybackState(data) {
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

      const options = { method, credentials: 'include' };
      if (body) {
        options.headers = { 'Content-Type': 'application/json' };
        options.body = JSON.stringify(body);
      }

      const response = await fetch(`${base}${endpoint}`, options);

      if (response.status === 401) {
        this.setAuthenticated(false);
        throw new Error('Spotify session expired');
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
      await this.sendCommand('PUT', '/api/spotify/play');
      await this.refreshPlaybackState();
    }

    async pause() {
      await this.sendCommand('PUT', '/api/spotify/pause');
      await this.refreshPlaybackState();
    }

    async next() {
      await this.sendCommand('POST', '/api/spotify/next');
      await this.refreshPlaybackState();
    }

    async previous() {
      await this.sendCommand('POST', '/api/spotify/previous');
      await this.refreshPlaybackState();
    }

    async setVolume(volumePercent) {
      const clamped = Math.max(0, Math.min(100, Math.round(volumePercent)));
      await this.sendCommand('PUT', '/api/spotify/volume', { volume_percent: clamped });
      this.state = { ...this.state, volumePercent: clamped, lastUpdated: Date.now() };
      this.emit('state', this.getState());
    }

    async refreshDevices() {
      const base = this.getBaseUrl();
      if (!base) return null;
      const response = await this.sendCommand('GET', '/devices');
      return response.json();
    }

    async transferPlayback(deviceId) {
      await this.sendCommand('PUT', '/devices/transfer', { device_id: deviceId });
      await this.refreshPlaybackState();
    }

    async search(query) {
      if (!query) return [];
      const base = this.getBaseUrl();
      if (!base) return [];
      const response = await this.sendCommand('GET', `/search?q=${encodeURIComponent(query)}&type=track`);
      const data = await response.json();
      return data?.tracks?.items || [];
    }

    async playUris(uris, options = {}) {
      if (!Array.isArray(uris) || uris.length === 0) return;
      const payload = { uris: uris.slice(0, 50) };
      if (options.deviceId) {
        payload.device_id = options.deviceId;
      }
      await this.sendCommand('PUT', '/api/spotify/play', payload);
      await this.refreshPlaybackState();
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

    updatePollingState() {
      if (!this.state.isAuthenticated) {
        this.stopPolling();
        return;
      }

      const contextActive = Array.from(this.visibilityContexts.values()).some(Boolean);
      const shouldPoll = contextActive || Boolean(this.state.isPlaying);

      if (shouldPoll) {
        this.startPolling();
      } else {
        this.stopPolling();
      }
    }

    async openLogin() {
      const urls = this.getAuthUrls();
      if (!urls.login) {
        throw new Error('Spotify login URL unavailable');
      }

      const loginWindow = window.open(
        urls.login,
        'spotify-login',
        'width=520,height=720,menubar=no,toolbar=no,location=yes,status=no,resizable=yes,scrollbars=yes'
      );

      if (!loginWindow) {
        throw new Error('Browser blocked the Spotify login popup');
      }

      try {
        const success = await this.pollForAuth(() => loginWindow && loginWindow.closed);
        if (!success) {
          throw new Error('Spotify login timed out');
        }
        return true;
      } finally {
        if (loginWindow && !loginWindow.closed) {
          loginWindow.close();
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
          this.startPolling();
          this.startTokenRefresh();
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
          await fetch(`${base}/auth/logout`, { method: 'POST' });
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
  
  // Initialize after a short delay to ensure IP detection is ready
  setTimeout(initializeMusicController, 1000);
})();
