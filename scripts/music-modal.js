(function() {
  'use strict';

  const TEMPLATE = `
    <div class="music-sheet" id="musicSheet" data-authenticated="false" data-has-track="false" data-playing="false">
      <div class="music-sheet__backdrop" data-role="backdrop"></div>
      <div class="music-sheet__layout">
        <div class="music-sheet__artwork">
          <div class="music-sheet__artwork-image" data-role="artwork"></div>
          <div class="music-sheet__artwork-fallback" data-role="artworkFallback">🎵</div>
        </div>
        <div class="music-sheet__content">
          <div class="music-sheet__status" data-role="status">Checking Spotify…</div>
          <div class="music-sheet__track" data-role="track">
            <h2 class="music-sheet__track-title" data-role="trackTitle">No music playing</h2>
            <p class="music-sheet__track-artist" data-role="trackArtist"></p>
          </div>
          <div class="music-sheet__progress" data-role="progress">
            <div class="music-sheet__progress-bar">
              <div class="music-sheet__progress-fill" data-role="progressFill"></div>
            </div>
            <div class="music-sheet__progress-times">
              <span data-role="elapsed">0:00</span>
              <span data-role="duration">0:00</span>
            </div>
          </div>
          <div class="music-sheet__controls">
            <button class="music-sheet__btn music-sheet__btn--icon" data-action="previous" aria-label="Previous track">⏮</button>
            <button class="music-sheet__btn music-sheet__btn--play" data-action="toggle" aria-label="Play or pause">
              <span data-role="playIcon">▶</span>
            </button>
            <button class="music-sheet__btn music-sheet__btn--icon" data-action="next" aria-label="Next track">⏭</button>
          </div>
          <div class="music-sheet__volume" data-role="volume">
            <label class="music-sheet__volume-label" for="musicVolume">Volume</label>
            <input type="range" id="musicVolume" min="0" max="100" value="50" data-role="volumeSlider">
            <span class="music-sheet__volume-value" data-role="volumeValue">50%</span>
          </div>
          <div class="music-sheet__empty" data-role="emptyState">
            Start playing Spotify on any device to see controls here.
          </div>
        </div>
      </div>
      <div class="music-sheet__login" data-role="login">
        <div class="music-sheet__login-card">
          <h3>Connect Spotify</h3>
          <p>Sign in to Spotify to control your music from the dashboard.</p>
          <button class="music-sheet__btn music-sheet__btn--primary" data-action="login">Login with Spotify</button>
        </div>
      </div>
      <div class="music-sheet__error" data-role="error" hidden></div>
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
      this.originalCloseHandler = null;
      this.isAdjustingVolume = false;
      this.volumeAdjustTimeout = null;
      this.volumeDebounce = null;
    }

    open() {
      if (this.isOpen) {
        this.syncState();
        return;
      }

      this.renderModal();
      this.cacheElements();
      this.bindEvents();
      this.subscribeToController();
      this.isOpen = true;

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
      if (window.uiManager && typeof window.uiManager.showModal === 'function') {
        window.uiManager.showModal(TEMPLATE, {
          triggerSelector: '.side-btn[title="Music"]',
          modalType: 'music'
        });
      } else if (typeof window.showModal === 'function') {
        window.showModal(TEMPLATE);
      } else {
        console.warn('MusicModal: no modal renderer available');
        return;
      }

      this.root = document.getElementById('musicSheet');
      if (!this.root) {
        throw new Error('Music modal root element not found');
      }

      this.overrideCloseHandler();
    }

    overrideCloseHandler() {
      this.originalCloseHandler = window.closeActiveModal;
      window.closeActiveModal = (...args) => {
        try {
          this.teardown();
        } finally {
          if (typeof this.originalCloseHandler === 'function') {
            return this.originalCloseHandler.apply(window, args);
          }
        }
      };
    }

    restoreCloseHandler() {
      if (this.originalCloseHandler) {
        window.closeActiveModal = this.originalCloseHandler;
        this.originalCloseHandler = null;
      }
    }

    cacheElements() {
      if (!this.root) return;
      const q = (role) => this.root.querySelector(`[data-role="${role}"]`);
      this.elements = {
        status: q('status'),
        trackTitle: q('trackTitle'),
        trackArtist: q('trackArtist'),
        artwork: q('artwork'),
        artworkFallback: q('artworkFallback'),
        progressFill: q('progressFill'),
        elapsed: q('elapsed'),
        duration: q('duration'),
        playIcon: q('playIcon'),
        emptyState: q('emptyState'),
        volumeSlider: q('volumeSlider'),
        volumeValue: q('volumeValue'),
        login: q('login'),
        error: q('error')
      };
    }

    bindEvents() {
      if (!this.root) return;
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
      this.clearError();
      this.toggleAuthenticated(state.isAuthenticated);
      this.root.dataset.hasTrack = state.track ? 'true' : 'false';
      this.root.dataset.playing = state.isPlaying ? 'true' : 'false';

      this.updateStatus(state);
      this.updateTrack(state);
      this.updateArtwork(state);
      this.updateProgress(state);
      this.updateVolume(state);
      this.updateEmptyState(state);
      this.setControlsEnabled(state.isAuthenticated && Boolean(state.track));
    }

    toggleAuthenticated(isAuthenticated) {
      if (!this.root) return;
      this.root.dataset.authenticated = isAuthenticated ? 'true' : 'false';
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
      if (!this.elements.artwork || !this.elements.artworkFallback) return;
      const imageUrl = state.track?.imageUrl || null;
      if (imageUrl) {
        this.elements.artwork.style.backgroundImage = `url('${imageUrl}')`;
        this.elements.artwork.classList.add('has-image');
        this.elements.artworkFallback.hidden = true;
      } else {
        this.elements.artwork.style.backgroundImage = 'none';
        this.elements.artwork.classList.remove('has-image');
        this.elements.artworkFallback.hidden = false;
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
      this.elements.emptyState.hidden = Boolean(state.track);
    }

    setControlsEnabled(enabled) {
      if (!this.root) return;
      const controlButtons = this.root.querySelectorAll('.music-sheet__controls button');
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

    teardown() {
      if (!this.isOpen) return;
      this.isOpen = false;
      this.stopProgressLoop();
      this.detachEvents();
      this.subscriptions.forEach((unsubscribe) => {
        try {
          unsubscribe?.();
        } catch (error) {
          console.warn('MusicModal: error during unsubscribe', error);
        }
      });
      this.subscriptions = [];
      this.restoreCloseHandler();
      if (this.volumeDebounce) {
        clearTimeout(this.volumeDebounce);
        this.volumeDebounce = null;
      }
      if (this.volumeAdjustTimeout) {
        clearTimeout(this.volumeAdjustTimeout);
        this.volumeAdjustTimeout = null;
      }
      this.root = null;
      this.elements = {};
    }
  }

  const modal = new MusicModal(window.musicController);

  window.showMusicModal = function() {
    modal.open();
  };

  window.currentMusicModal = modal;
})();
