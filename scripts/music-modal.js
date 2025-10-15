(function() {
  'use strict';

  const TEMPLATE = `
    <div class="music-bubble" id="musicSheet" data-authenticated="false" data-has-track="false" data-playing="false" data-has-artwork="false">
      <div class="music-bubble__background" data-role="background"></div>
      <div class="music-bubble__overlay"></div>
      <div class="music-bubble__surface">
        <header class="music-bubble__header">
          <div class="music-bubble__header-slot music-bubble__header-slot--left">
            <div class="music-bubble__status" data-role="status">Checking Spotify…</div>
          </div>
          <div class="music-bubble__header-slot music-bubble__header-slot--center">
            <button class="music-bubble__icon-btn music-bubble__icon-btn--search" data-action="search" aria-label="Search Spotify" disabled>
              <span class="music-bubble__icon">🔍</span>
              <span class="music-bubble__icon-label">Search</span>
            </button>
          </div>
          <div class="music-bubble__header-slot music-bubble__header-slot--right">
            <button class="music-bubble__icon-btn music-bubble__icon-btn--devices" data-action="devices" aria-label="Choose device" disabled>
              <span class="music-bubble__icon">📡</span>
              <span class="music-bubble__icon-label">Devices</span>
            </button>
          </div>
        </header>
        <div class="music-bubble__artwork-badge" data-role="artworkFallback">🎵</div>
        <div class="music-bubble__info" data-role="track">
          <h2 class="music-bubble__track-title" data-role="trackTitle">No music playing</h2>
          <p class="music-bubble__track-artist" data-role="trackArtist"></p>
          <p class="music-bubble__device" data-role="device"></p>
        </div>
        <div class="music-bubble__progress" data-role="progress">
          <div class="music-bubble__progress-bar">
            <div class="music-bubble__progress-fill" data-role="progressFill"></div>
          </div>
          <div class="music-bubble__progress-times">
            <span data-role="elapsed">0:00</span>
            <span data-role="duration">0:00</span>
          </div>
        </div>
        <div class="music-bubble__controls">
          <button class="music-bubble__btn" data-action="previous" aria-label="Previous track">⏮</button>
          <button class="music-bubble__btn music-bubble__btn--play" data-action="toggle" aria-label="Play or pause">
            <span data-role="playIcon">▶</span>
          </button>
          <button class="music-bubble__btn" data-action="next" aria-label="Next track">⏭</button>
        </div>
        <div class="music-bubble__volume" data-role="volume">
          <label class="music-bubble__volume-label" for="musicVolume">Volume</label>
          <input type="range" id="musicVolume" min="0" max="100" value="50" data-role="volumeSlider">
          <span class="music-bubble__volume-value" data-role="volumeValue">50%</span>
        </div>
        <div class="music-bubble__empty" data-role="emptyState">
          Start playing Spotify on any device to see controls here.
        </div>
      </div>
      <div class="music-bubble__login" data-role="login">
        <div class="music-bubble__login-card">
          <h3>Connect Spotify</h3>
          <p>Sign in to Spotify to control your music from the dashboard.</p>
          <button class="music-bubble__btn music-bubble__btn--primary" data-action="login">Login with Spotify</button>
        </div>
      </div>
      <div class="music-bubble__panel music-bubble__panel--search" data-role="searchPanel" aria-hidden="true">
        <div class="music-bubble__panel-inner">
          <div class="music-bubble__panel-header">
            <h3>Search Spotify</h3>
            <button class="music-bubble__icon-btn music-bubble__icon-btn--ghost" data-action="closePanel" data-panel="search" aria-label="Close search">✕</button>
          </div>
          <div class="music-bubble__panel-body">
            <div class="music-bubble__input">
              <input type="search" placeholder="Search songs, artists, or albums" autocomplete="off" data-role="searchInput">
            </div>
            <div class="music-bubble__panel-message" data-role="searchMessage">Start typing to search.</div>
            <div class="music-bubble__panel-results" data-role="searchResults"></div>
          </div>
        </div>
      </div>
      <div class="music-bubble__panel music-bubble__panel--devices" data-role="devicesPanel" aria-hidden="true">
        <div class="music-bubble__panel-inner">
          <div class="music-bubble__panel-header">
            <h3>Choose a device</h3>
            <button class="music-bubble__icon-btn music-bubble__icon-btn--ghost" data-action="closePanel" data-panel="devices" aria-label="Close devices">✕</button>
          </div>
          <div class="music-bubble__panel-body">
            <div class="music-bubble__panel-message" data-role="devicesMessage">Loading devices…</div>
            <div class="music-bubble__panel-results" data-role="devicesList"></div>
          </div>
        </div>
      </div>
      <div class="music-bubble__error" data-role="error" hidden></div>
    </div>
  `;

  class MusicModal {
    constructor(controller) {
      this.controller = controller;
      this.state = controller?.getState?.() || null;
      this.root = null;
      this.elements = {};
      this.subscriptions = [];
      this.listeners = [];
      this.progressFrame = null;
      this.isOpen = false;
      this.isAdjustingVolume = false;
      this.volumeAdjustTimeout = null;
      this.volumeDebounce = null;
      this.activePanel = null;
      this.searchDebounceTimeout = null;
      this.pendingSearchToken = 0;
      this.deviceLoadPromise = null;
    }

    open() {
      if (this.isOpen) {
        // Just show the modal if it's already open but hidden
        this.showModal();
        return;
      }

      // First time opening - render and initialize
      this.renderModal();
      this.cacheElements();
      this.bindEvents();
      this.subscribeToController();
      this.isOpen = true;

      if (this.controller?.setModalVisible) {
        this.controller.setModalVisible(true);
      }

      this.setStatus('Checking Spotify…');
      this.syncState();

      if (this.controller && typeof this.controller.ensureAuth === 'function') {
        this.controller.ensureAuth().then((isAuthed) => {
          if (!this.isOpen) return;
          this.toggleAuthenticated(isAuthed);
          if (!isAuthed) {
            this.setStatus('Connect to Spotify to begin.');
          }
        }).catch((error) => {
          if (!this.isOpen) return;
          console.error('MusicModal: authentication check failed', error);
          this.showError('Unable to contact the Spotify service. Make sure the backend is running.');
        });
      }
    }

    renderModal() {
      // Create the modal content directly in the modal body
      const modalBody = document.getElementById('modalBody');
      if (!modalBody) {
        throw new Error('Modal body not found');
      }
      
      modalBody.innerHTML = TEMPLATE;
      this.root = document.getElementById('musicSheet');
      if (!this.root) {
        throw new Error('Music modal root element not found');
      }

      // Show the modal using the global modal system
      this.showModal();
    }

    showModal() {
      const modalBg = document.getElementById('modalBg');
      const modalContent = document.getElementById('modalContent');
      
      if (!modalBg || !modalContent) {
        throw new Error('Modal elements not found');
      }

      // Show the modal with animation
      modalBg.style.display = 'flex';
      modalBg.classList.add('visible');
      modalContent.style.transform = 'scale(1) translate(0px)';
      modalContent.style.opacity = '1';
      
      if (this.controller?.setModalVisible) {
        this.controller.setModalVisible(true);
      }
    }

    hideModal() {
      const modalBg = document.getElementById('modalBg');
      const modalContent = document.getElementById('modalContent');
      
      if (!modalBg || !modalContent) {
        return;
      }

      // Hide the modal with animation
      modalContent.style.transform = 'scale(0.7) translate(0px)';
      modalContent.style.opacity = '0';
      modalBg.classList.remove('visible');
      
      setTimeout(() => {
        modalBg.style.display = 'none';
      }, 350);
      
      if (this.controller?.setModalVisible) {
        this.controller.setModalVisible(false);
      }
    }


    cacheElements() {
      if (!this.root) return;
      const q = (role) => this.root.querySelector(`[data-role="${role}"]`);
      this.elements = {
        background: q('background'),
        status: q('status'),
        trackTitle: q('trackTitle'),
        trackArtist: q('trackArtist'),
        device: q('device'),
        artworkFallback: q('artworkFallback'),
        progressFill: q('progressFill'),
        elapsed: q('elapsed'),
        duration: q('duration'),
        playIcon: q('playIcon'),
        emptyState: q('emptyState'),
        volumeSlider: q('volumeSlider'),
        volumeValue: q('volumeValue'),
        login: q('login'),
        error: q('error'),
        searchPanel: q('searchPanel'),
        searchInput: q('searchInput'),
        searchResults: q('searchResults'),
        searchMessage: q('searchMessage'),
        devicesPanel: q('devicesPanel'),
        devicesList: q('devicesList'),
        devicesMessage: q('devicesMessage')
      };
      this.elements.searchButton = this.root.querySelector('[data-action="search"]');
      this.elements.devicesButton = this.root.querySelector('[data-action="devices"]');
    }

    bindEvents() {
      if (!this.root) return;
      
      // Add close button handler
      const closeBtn = document.getElementById('closeModal');
      if (closeBtn) {
        const closeHandler = () => this.close();
        closeBtn.addEventListener('click', closeHandler);
        this.listeners.push({ target: closeBtn, type: 'click', handler: closeHandler });
      }
      
      // Add background click handler
      const modalBg = document.getElementById('modalBg');
      if (modalBg) {
        const bgHandler = (e) => {
          if (e.target === modalBg) {
            this.close();
          }
        };
        modalBg.addEventListener('click', bgHandler);
        this.listeners.push({ target: modalBg, type: 'click', handler: bgHandler });
      }
      
      // Add escape key handler
      const escapeHandler = (e) => {
        if (e.key === 'Escape' && this.isOpen) {
          this.close();
        }
      };
      document.addEventListener('keydown', escapeHandler);
      this.listeners.push({ target: document, type: 'keydown', handler: escapeHandler });
      
      const actions = this.root.querySelectorAll('[data-action]');
      actions.forEach((btn) => {
        const handler = (event) => {
          event.preventDefault();
          const action = btn.getAttribute('data-action');
          this.handleAction(action, btn);
        };
        btn.addEventListener('click', handler);
        this.listeners.push({ target: btn, type: 'click', handler });
      });

      if (this.elements.volumeSlider) {
        const inputHandler = (event) => {
          const value = Number(event.target.value);
          this.isAdjustingVolume = true;
          this.updateVolumeValue(value);
          this.scheduleVolumeChange(value);
        };
        const changeHandler = (event) => {
          const value = Number(event.target.value);
          this.scheduleVolumeChange(value, true);
        };
        const pointerUpHandler = () => {
          if (this.volumeAdjustTimeout) {
            clearTimeout(this.volumeAdjustTimeout);
          }
          this.volumeAdjustTimeout = setTimeout(() => {
            this.isAdjustingVolume = false;
            this.volumeAdjustTimeout = null;
          }, 400);
        };
        this.elements.volumeSlider.addEventListener('input', inputHandler);
        this.elements.volumeSlider.addEventListener('change', changeHandler);
        this.elements.volumeSlider.addEventListener('pointerup', pointerUpHandler);
        this.listeners.push({ target: this.elements.volumeSlider, type: 'input', handler: inputHandler });
        this.listeners.push({ target: this.elements.volumeSlider, type: 'change', handler: changeHandler });
        this.listeners.push({ target: this.elements.volumeSlider, type: 'pointerup', handler: pointerUpHandler });
      }

      if (this.elements.searchInput) {
        const inputHandler = (event) => {
          this.handleSearchInput(event.target.value);
        };
        this.elements.searchInput.addEventListener('input', inputHandler);
        this.listeners.push({ target: this.elements.searchInput, type: 'input', handler: inputHandler });
      }

      if (this.elements.searchResults) {
        const clickHandler = (event) => {
          const button = event.target.closest('[data-track-uri]');
          if (!button) return;
          event.preventDefault();
          const uri = button.getAttribute('data-track-uri');
          this.playSearchResult(uri);
        };
        this.elements.searchResults.addEventListener('click', clickHandler);
        this.listeners.push({ target: this.elements.searchResults, type: 'click', handler: clickHandler });
      }

      if (this.elements.devicesList) {
        const clickHandler = (event) => {
          const button = event.target.closest('[data-device-id]');
          if (!button) return;
          event.preventDefault();
          const deviceId = button.getAttribute('data-device-id');
          this.handleDeviceSelection(deviceId, button);
        };
        this.elements.devicesList.addEventListener('click', clickHandler);
        this.listeners.push({ target: this.elements.devicesList, type: 'click', handler: clickHandler });
      }
    }

    subscribeToController() {
      if (!this.controller || typeof this.controller.on !== 'function') return;
      const unsubscribe = this.controller.on('state', (state) => {
        this.state = state;
        this.update(state);
      });
      this.subscriptions.push(unsubscribe);
      this.state = this.controller.getState ? this.controller.getState() : null;
      if (this.state) {
        this.update(this.state);
      }
    }

    handleAction(action, button) {
      if (!action || !this.controller) return;
      switch (action) {
        case 'previous':
          this.runControllerAction(button, () => this.controller.previous());
          break;
        case 'next':
          this.runControllerAction(button, () => this.controller.next());
          break;
        case 'toggle':
          this.runControllerAction(button, () => this.controller.togglePlayPause());
          break;
        case 'search':
          if (this.requireAuthenticationForPanel()) {
            this.togglePanel('search');
          }
          break;
        case 'devices':
          if (this.requireAuthenticationForPanel()) {
            this.togglePanel('devices');
          }
          break;
        case 'closePanel':
          this.closePanel(button?.getAttribute('data-panel') || null);
          break;
        case 'login':
          this.handleLogin(button);
          break;
        default:
          break;
      }
    }

    async runControllerAction(button, action) {
      const previousDisabled = button ? button.disabled : false;
      if (button) {
        button.disabled = true;
      }
      try {
        await action();
      } catch (error) {
        console.error('MusicModal action failed', error);
        this.showError(error.message || 'Something went wrong while talking to Spotify.');
      } finally {
        if (button) {
          setTimeout(() => {
            button.disabled = previousDisabled;
          }, 150);
        }
      }
    }

    async handleLogin(button) {
      if (!this.controller) return;
      if (button) {
        button.disabled = true;
        button.textContent = 'Opening Spotify…';
      }
      this.clearError();
      try {
        const authenticated = await this.controller.openLogin();
        if (authenticated) {
          this.toggleAuthenticated(true);
          this.setStatus('Connected to Spotify.');
        }
      } catch (error) {
        console.error('MusicModal login failed', error);
        this.showError(error.message || 'Unable to open the Spotify login window.');
      } finally {
        if (button) {
          button.disabled = false;
          button.textContent = 'Login with Spotify';
        }
      }
    }

    scheduleVolumeChange(value, immediate = false) {
      if (!this.controller) return;
      if (this.volumeDebounce) {
        clearTimeout(this.volumeDebounce);
        this.volumeDebounce = null;
      }

      const sendUpdate = async () => {
        try {
          await this.controller.setVolume(value);
        } catch (error) {
          console.error('MusicModal volume update failed', error);
          this.showError('Unable to adjust volume.');
        }
      };

      if (immediate) {
        sendUpdate();
      } else {
        this.volumeDebounce = setTimeout(sendUpdate, 250);
      }
    }

    syncState() {
      if (!this.state && this.controller?.getState) {
        this.state = this.controller.getState();
      }
      if (this.state) {
        this.update(this.state);
      }
    }

    update(state) {
      if (!this.root || !state) return;
      this.state = state;
      this.clearError();
      this.toggleAuthenticated(state.isAuthenticated);
      this.root.dataset.hasTrack = state.track ? 'true' : 'false';
      this.root.dataset.playing = state.isPlaying ? 'true' : 'false';

      this.updateStatus(state);
      this.updateTrack(state);
      this.updateArtwork(state);
      this.updateDevice(state);
      this.updateProgress(state);
      this.updateVolume(state);
      this.updateEmptyState(state);
      this.updatePanelAvailability(state.isAuthenticated);
      this.setControlsEnabled(state.isAuthenticated && Boolean(state.track));
    }

    toggleAuthenticated(isAuthenticated) {
      if (!this.root) return;
      this.root.dataset.authenticated = isAuthenticated ? 'true' : 'false';
      if (!isAuthenticated) {
        this.closePanel();
      }
    }

    updateStatus(state) {
      if (!this.elements.status) return;
      if (!state.isAuthenticated) {
        this.elements.status.textContent = 'Spotify account not connected.';
        return;
      }

      if (!state.track) {
        this.elements.status.textContent = state.deviceName ? `Connected to ${state.deviceName}` : 'Waiting for playback…';
        return;
      }

      if (state.isPlaying) {
        this.elements.status.textContent = state.deviceName ? `Playing on ${state.deviceName}` : 'Playing';
      } else {
        this.elements.status.textContent = state.deviceName ? `Paused on ${state.deviceName}` : 'Paused';
      }
    }

    updateTrack(state) {
      if (!this.elements.trackTitle || !this.elements.trackArtist) return;
      if (state.track) {
        this.elements.trackTitle.textContent = state.track.title;
        this.elements.trackArtist.textContent = state.track.artist || '';
      } else {
        this.elements.trackTitle.textContent = 'No music playing';
        this.elements.trackArtist.textContent = '';
      }

      if (this.elements.playIcon) {
        this.elements.playIcon.textContent = state.isPlaying ? '⏸' : '▶';
      }
    }

    updateArtwork(state) {
      if (!this.root) return;
      const imageUrl = state.track?.imageUrl || null;
      if (this.elements.background) {
        this.elements.background.style.backgroundImage = imageUrl ? `url("${imageUrl}")` : '';
      }
      this.root.dataset.hasArtwork = imageUrl ? 'true' : 'false';
      if (this.elements.artworkFallback) {
        this.elements.artworkFallback.classList.toggle('is-visible', !imageUrl);
      }
    }

    updateProgress(state) {
      if (!this.elements.progressFill || !this.elements.elapsed || !this.elements.duration) {
        return;
      }

      const durationMs = state.durationMs || state.track?.durationMs || 0;
      const progressMs = state.progressMs || 0;
      const percent = durationMs ? Math.min(100, (progressMs / durationMs) * 100) : 0;
      this.elements.progressFill.style.width = `${percent}%`;
      this.elements.elapsed.textContent = this.formatTime(progressMs);
      this.elements.duration.textContent = durationMs ? this.formatTime(durationMs) : '0:00';

      if (state.isPlaying && durationMs) {
        this.startProgressLoop();
      } else {
        this.stopProgressLoop();
      }
    }

    startProgressLoop() {
      if (this.progressFrame) return;
      const updateFrame = () => {
        if (!this.state || !this.state.isPlaying) {
          this.progressFrame = null;
          return;
        }
        const durationMs = this.state.durationMs || this.state.track?.durationMs || 0;
        if (!durationMs) {
          this.progressFrame = null;
          return;
        }
        const elapsed = Date.now() - (this.state.lastUpdated || Date.now());
        const baseProgress = this.state.progressMs || 0;
        const progress = Math.min(durationMs, baseProgress + elapsed);
        const percent = Math.min(100, (progress / durationMs) * 100);
        if (this.elements.progressFill) {
          this.elements.progressFill.style.width = `${percent}%`;
        }
        if (this.elements.elapsed) {
          this.elements.elapsed.textContent = this.formatTime(progress);
        }
        this.progressFrame = requestAnimationFrame(updateFrame);
      };
      this.progressFrame = requestAnimationFrame(updateFrame);
    }

    stopProgressLoop() {
      if (this.progressFrame) {
        cancelAnimationFrame(this.progressFrame);
        this.progressFrame = null;
      }
    }

    updateVolume(state) {
      if (!this.elements.volumeSlider || !this.elements.volumeValue) return;
      const volume = typeof state.volumePercent === 'number' ? state.volumePercent : 50;
      if (!this.isAdjustingVolume) {
        this.elements.volumeSlider.value = volume;
        this.updateVolumeValue(volume);
      }
    }

    updateVolumeValue(value) {
      if (this.elements.volumeValue) {
        this.elements.volumeValue.textContent = `${Math.round(value)}%`;
      }
    }

    updateEmptyState(state) {
      if (!this.elements.emptyState) return;
      this.elements.emptyState.classList.toggle('is-visible', !state.track);
    }

    setControlsEnabled(enabled) {
      if (!this.root) return;
      const controlButtons = this.root.querySelectorAll('.music-bubble__controls button');
      controlButtons.forEach((button) => {
        button.disabled = !enabled;
      });
      if (this.elements.volumeSlider) {
        this.elements.volumeSlider.disabled = !enabled;
      }
    }

    formatTime(ms) {
      const totalSeconds = Math.max(0, Math.floor(ms / 1000));
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    updateDevice(state) {
      if (!this.elements.device) return;
      if (!state.isAuthenticated) {
        this.elements.device.textContent = '';
        return;
      }

      if (state.deviceName) {
        this.elements.device.textContent = `Listening on ${state.deviceName}`;
      } else {
        this.elements.device.textContent = 'No active Spotify device';
      }
    }

    updatePanelAvailability(isAuthenticated) {
      const disabled = !isAuthenticated;
      if (this.elements.searchButton) {
        this.elements.searchButton.disabled = disabled;
        this.elements.searchButton.setAttribute('aria-disabled', disabled ? 'true' : 'false');
      }
      if (this.elements.devicesButton) {
        this.elements.devicesButton.disabled = disabled;
        this.elements.devicesButton.setAttribute('aria-disabled', disabled ? 'true' : 'false');
      }
      if (disabled) {
        this.closePanel();
      }
    }

    requireAuthenticationForPanel() {
      if (this.state?.isAuthenticated) {
        return true;
      }
      this.setStatus('Connect Spotify to access this feature.');
      this.clearError();
      return false;
    }

    togglePanel(panel) {
      if (!panel) return;
      if (this.activePanel === panel) {
        this.closePanel(panel);
      } else {
        this.openPanel(panel);
      }
    }

    openPanel(panel) {
      if (!this.root) return;
      const panelEl = this.getPanelElement(panel);
      if (!panelEl) return;
      if (this.activePanel && this.activePanel !== panel) {
        this.closePanel(this.activePanel);
      }
      this.activePanel = panel;
      this.root.dataset.panel = panel;
      panelEl.classList.add('is-open');
      panelEl.setAttribute('aria-hidden', 'false');

      if (panel === 'search') {
        this.prepareSearchPanel();
      } else if (panel === 'devices') {
        this.prepareDevicesPanel();
      }
    }

    closePanel(panel = null) {
      if (!this.root) {
        this.activePanel = null;
        return;
      }
      const target = panel || this.activePanel;
      if (!target) return;
      const panelEl = this.getPanelElement(target);
      if (!panelEl) return;
      panelEl.classList.remove('is-open');
      panelEl.setAttribute('aria-hidden', 'true');
      if (target === 'search') {
        this.pendingSearchToken += 1;
      }
      if (!panel || this.activePanel === target) {
        this.activePanel = null;
        delete this.root.dataset.panel;
      }
    }

    getPanelElement(panel) {
      if (panel === 'search') return this.elements.searchPanel;
      if (panel === 'devices') return this.elements.devicesPanel;
      return null;
    }

    prepareSearchPanel() {
      if (!this.elements.searchInput) return;
      if (!this.elements.searchInput.value) {
        this.clearSearchResults();
        this.setSearchMessage('Start typing to search.');
      }
      try {
        this.elements.searchInput.focus({ preventScroll: true });
      } catch (error) {
        this.elements.searchInput.focus();
      }
    }

    prepareDevicesPanel() {
      this.setDevicesMessage('Loading devices…');
      this.renderDeviceList([]);
      this.loadDevices(true);
    }

    handleSearchInput(rawQuery) {
      if (!this.requireAuthenticationForPanel()) return;
      const query = (rawQuery || '').trim();
      if (this.searchDebounceTimeout) {
        clearTimeout(this.searchDebounceTimeout);
        this.searchDebounceTimeout = null;
      }

      if (!query) {
        this.pendingSearchToken += 1;
        this.clearSearchResults();
        this.setSearchMessage('Start typing to search.');
        return;
      }

      this.setSearchMessage('Searching…');
      const token = ++this.pendingSearchToken;
      this.searchDebounceTimeout = setTimeout(async () => {
        this.searchDebounceTimeout = null;
        try {
          const results = await this.controller.search(query);
          if (this.pendingSearchToken !== token) return;
          if (!results || !results.length) {
            this.renderSearchResults([]);
            this.setSearchMessage('No results found.');
            return;
          }
          this.renderSearchResults(results.slice(0, 10));
          this.setSearchMessage('Tap a result to start playback.');
        } catch (error) {
          if (this.pendingSearchToken !== token) return;
          console.error('MusicModal search failed', error);
          this.renderSearchResults([]);
          this.setSearchMessage('Search failed. Please try again.');
        }
      }, 300);
    }

    clearSearchResults() {
      if (this.elements.searchResults) {
        this.elements.searchResults.innerHTML = '';
      }
    }

    setSearchMessage(message) {
      if (!this.elements.searchMessage) return;
      this.elements.searchMessage.textContent = message || '';
      this.elements.searchMessage.classList.toggle('is-hidden', !message);
    }

    renderSearchResults(results) {
      if (!this.elements.searchResults) return;
      this.elements.searchResults.innerHTML = '';
      if (!Array.isArray(results) || results.length === 0) {
        return;
      }

      const fragment = document.createDocumentFragment();
      const currentDeviceId = this.state?.deviceId || null;

      results.forEach((track) => {
        if (!track) return;
        const item = document.createElement('div');
        item.className = 'music-bubble__result-item';
        if (track.uri) {
          item.setAttribute('data-track-uri', track.uri);
        }

        const artwork = document.createElement('div');
        artwork.className = 'music-bubble__result-art';
        const imageUrl = track.album?.images?.[0]?.url || track.imageUrl;
        if (imageUrl) {
          artwork.style.backgroundImage = `url("${imageUrl}")`;
        }
        item.appendChild(artwork);

        const info = document.createElement('div');
        info.className = 'music-bubble__result-info';
        const title = document.createElement('div');
        title.className = 'music-bubble__result-title';
        title.textContent = track.name || track.title || 'Unknown track';
        info.appendChild(title);
        const artist = document.createElement('div');
        artist.className = 'music-bubble__result-artist';
        const artistNames = Array.isArray(track.artists)
          ? track.artists.map((artist) => artist.name || artist).filter(Boolean).join(', ')
          : (track.artist || '');
        artist.textContent = artistNames;
        info.appendChild(artist);
        item.appendChild(info);

        const playButton = document.createElement('button');
        playButton.type = 'button';
        playButton.className = 'music-bubble__result-play';
        playButton.setAttribute('data-track-uri', track.uri || track.id || '');
        playButton.textContent = '▶';
        if (!track.uri) {
          playButton.disabled = true;
        }
        if (currentDeviceId) {
          playButton.setAttribute('data-device-id', currentDeviceId);
        }
        item.appendChild(playButton);

        fragment.appendChild(item);
      });

      this.elements.searchResults.appendChild(fragment);
    }

    async playSearchResult(uri) {
      if (!uri || !this.controller?.playTrackUri) return;
      try {
        await this.controller.playTrackUri(uri, { deviceId: this.state?.deviceId || undefined });
        this.setSearchMessage('Playback starting…');
        setTimeout(() => this.closePanel('search'), 400);
      } catch (error) {
        console.error('MusicModal: failed to start playback', error);
        this.showError('Unable to start playback for that track.');
      }
    }

    loadDevices(force = false) {
      if (!this.controller || typeof this.controller.refreshDevices !== 'function') return null;
      if (this.deviceLoadPromise && !force) {
        return this.deviceLoadPromise;
      }

      const request = this.controller.refreshDevices()
        .then((response) => {
          const devices = this.normalizeDeviceResponse(response);
          if (!devices.length) {
            this.renderDeviceList([]);
            this.setDevicesMessage('No Spotify devices are currently available.');
          } else {
            this.renderDeviceList(devices);
            this.setDevicesMessage('Select a device to control playback.');
          }
          return devices;
        })
        .catch((error) => {
          console.error('MusicModal: failed to load devices', error);
          this.renderDeviceList([]);
          this.setDevicesMessage('Unable to load devices.');
          throw error;
        })
        .finally(() => {
          this.deviceLoadPromise = null;
        });

      this.deviceLoadPromise = request;
      return request;
    }

    normalizeDeviceResponse(response) {
      if (!response) return [];
      if (Array.isArray(response)) return response;
      if (Array.isArray(response.devices)) return response.devices;
      if (Array.isArray(response.devices?.items)) return response.devices.items;
      if (Array.isArray(response.body)) return response.body;
      if (Array.isArray(response.data)) return response.data;
      return [];
    }

    renderDeviceList(devices) {
      if (!this.elements.devicesList) return;
      this.elements.devicesList.innerHTML = '';
      if (!Array.isArray(devices) || devices.length === 0) {
        return;
      }

      const fragment = document.createDocumentFragment();
      const currentId = this.state?.deviceId || null;
      const currentName = (this.state?.deviceName || '').toLowerCase();

      devices.forEach((device) => {
        if (!device || !device.id) return;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'music-bubble__device-btn';
        button.setAttribute('data-device-id', device.id);

        const icon = document.createElement('span');
        icon.className = 'music-bubble__device-icon';
        icon.textContent = this.getDeviceIcon(device.type || device.device_type);
        button.appendChild(icon);

        const info = document.createElement('span');
        info.className = 'music-bubble__device-info';

        const name = document.createElement('span');
        name.className = 'music-bubble__device-name';
        name.textContent = device.name || 'Unknown device';
        info.appendChild(name);

        const meta = document.createElement('span');
        meta.className = 'music-bubble__device-meta';
        const type = device.type || device.device_type || '';
        const isActive = device.is_active || device.isActive || false;
        const metaParts = [];
        if (type) metaParts.push(type);
        if (isActive) metaParts.push('Active');
        meta.textContent = metaParts.join(' • ');
        info.appendChild(meta);

        button.appendChild(info);

        const isCurrent = (currentId && device.id === currentId) || (!currentId && currentName && device.name && device.name.toLowerCase() === currentName);
        if (isCurrent) {
          button.classList.add('is-current');
          button.setAttribute('aria-current', 'true');
        }

        fragment.appendChild(button);
      });

      this.elements.devicesList.appendChild(fragment);
    }

    setDevicesMessage(message) {
      if (!this.elements.devicesMessage) return;
      this.elements.devicesMessage.textContent = message || '';
      this.elements.devicesMessage.classList.toggle('is-hidden', !message);
    }

    getDeviceIcon(type) {
      const normalized = (type || '').toString().toLowerCase();
      switch (normalized) {
        case 'computer':
        case 'desktop':
        case 'laptop':
          return '💻';
        case 'smartphone':
        case 'tablet':
        case 'tabletpc':
        case 'mobile':
          return '📱';
        case 'tv':
        case 'castvideo':
        case 'cast_tv':
        case 'avr':
        case 'stb':
          return '📺';
        case 'gameconsole':
          return '🎮';
        case 'speaker':
        case 'audiodongle':
        case 'audio_dongle':
        case 'embedded':
        case 'automobile':
          return '🔊';
        default:
          return '🔊';
      }
    }

    async handleDeviceSelection(deviceId, button) {
      if (!deviceId || !this.controller?.transferPlayback) return;
      const cleanup = () => {
        if (button) {
          button.disabled = false;
          button.classList.remove('is-loading');
        }
      };
      if (button) {
        button.disabled = true;
        button.classList.add('is-loading');
      }
      try {
        this.setDevicesMessage('Transferring playback…');
        await this.controller.transferPlayback(deviceId);
        this.setDevicesMessage('Playback transferred.');
        setTimeout(() => this.closePanel('devices'), 600);
      } catch (error) {
        console.error('MusicModal: failed to transfer playback', error);
        this.setDevicesMessage('Unable to transfer playback.');
      } finally {
        cleanup();
      }
    }

    setStatus(message) {
      if (this.elements.status) {
        this.elements.status.textContent = message;
      }
    }

    showError(message) {
      if (!this.elements.error) return;
      this.elements.error.textContent = message;
      this.elements.error.hidden = false;
    }

    clearError() {
      if (!this.elements.error) return;
      this.elements.error.hidden = true;
      this.elements.error.textContent = '';
    }

    detachEvents() {
      this.listeners.forEach(({ target, type, handler }) => {
        target.removeEventListener(type, handler);
      });
      this.listeners = [];
    }

    close() {
      if (!this.isOpen) return;
      this.isOpen = false;
      this.hideModal();
      this.closePanel();
    }
  }

  const modal = new MusicModal(window.musicController);

  window.showMusicModal = function() {
    modal.open();
  };

  window.currentMusicModal = modal;
})();
