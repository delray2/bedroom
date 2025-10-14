(function() {
  'use strict';

  const INACTIVITY_DELAY_MS = 60 * 1000; // 1 minute
  const VISIBILITY_CHECK_INTERVAL_MS = 1000;

  class MusicOverlay {
    constructor(controller) {
      this.controller = controller;
      this.state = controller?.getState?.() || null;
      this.overlay = null;
      this.elements = {};
      this.visible = false;
      this.activityTimestamp = Date.now();
      this.visibilityTimer = null;
      this.clockTimer = null;
      this.unsubscribe = null;
      this.restoreResetTimer = null;

      this.render();
      this.bindEvents();
      this.subscribeToController();
      this.updateClock();
      this.startClock();
      this.startVisibilityCheck();
    }

    render() {
      const existing = document.getElementById('musicOverlay');
      if (existing) {
        this.overlay = existing;
        this.cacheElements();
        return;
      }

      const container = document.createElement('div');
      container.id = 'musicOverlay';
      container.className = 'music-overlay';
      container.setAttribute('data-visible', 'false');
      container.innerHTML = `
        <div class="music-overlay__background" data-role="background"></div>
        <div class="music-overlay__scrim"></div>
        <div class="music-overlay__content">
          <div class="music-overlay__clock">
            <span class="music-overlay__date" data-role="date"></span>
            <span class="music-overlay__time" data-role="time"></span>
          </div>
          <div class="music-overlay__track">
            <div class="music-overlay__title" data-role="title">Music paused</div>
            <div class="music-overlay__artist" data-role="artist"></div>
            <div class="music-overlay__instruction">Tap to return</div>
          </div>
        </div>
      `;

      document.body.appendChild(container);
      this.overlay = container;
      this.cacheElements();
    }

    cacheElements() {
      if (!this.overlay) return;
      const q = (role) => this.overlay.querySelector(`[data-role="${role}"]`);
      this.elements = {
        background: q('background'),
        date: q('date'),
        time: q('time'),
        title: q('title'),
        artist: q('artist')
      };
    }

    bindEvents() {
      if (!this.overlay) return;

      this.overlay.addEventListener('click', () => {
        this.recordActivity();
      });

      const record = () => this.recordActivity();
      ['mousemove', 'mousedown', 'keydown', 'touchstart'].forEach((event) => {
        document.addEventListener(event, record, { passive: true });
      });

      this.activityListener = record;

      if (typeof window.resetInactivityTimer === 'function') {
        const original = window.resetInactivityTimer;
        window.resetInactivityTimer = (...args) => {
          this.recordActivity();
          return original.apply(window, args);
        };
        this.restoreResetTimer = () => {
          window.resetInactivityTimer = original;
        };
      }
    }

    subscribeToController() {
      if (!this.controller || typeof this.controller.on !== 'function') return;
      this.unsubscribe = this.controller.on('state', (state) => {
        this.handleMusicState(state);
      });
      if (this.state) {
        this.handleMusicState(this.state);
      }
    }

    handleMusicState(state) {
      this.state = state;
      if (!state) return;

      if (!state.track) {
        this.hide();
      }

      this.updateContent(state);
      if (!state.isPlaying) {
        this.hide();
      }
    }

    updateContent(state) {
      if (!this.overlay) return;
      if (this.elements.title) {
        this.elements.title.textContent = state.track?.title || 'Music paused';
      }
      if (this.elements.artist) {
        this.elements.artist.textContent = state.track?.artist || '';
      }
      if (this.elements.background) {
        const image = state.track?.imageUrl;
        if (image) {
          this.elements.background.style.backgroundImage = `url('${image}')`;
          this.elements.background.classList.add('has-image');
        } else {
          this.elements.background.style.backgroundImage = 'none';
          this.elements.background.classList.remove('has-image');
        }
      }
    }

    startClock() {
      this.stopClock();
      this.clockTimer = setInterval(() => this.updateClock(), 1000);
    }

    stopClock() {
      if (this.clockTimer) {
        clearInterval(this.clockTimer);
        this.clockTimer = null;
      }
    }

    updateClock() {
      if (!this.elements.date || !this.elements.time) return;
      const now = new Date();
      const dateFormatter = new Intl.DateTimeFormat([], { weekday: 'long', month: 'long', day: 'numeric' });
      const timeFormatter = new Intl.DateTimeFormat([], { hour: 'numeric', minute: '2-digit' });
      this.elements.date.textContent = dateFormatter.format(now);
      this.elements.time.textContent = timeFormatter.format(now);
    }

    startVisibilityCheck() {
      this.stopVisibilityCheck();
      this.visibilityTimer = setInterval(() => this.evaluateVisibility(), VISIBILITY_CHECK_INTERVAL_MS);
    }

    stopVisibilityCheck() {
      if (this.visibilityTimer) {
        clearInterval(this.visibilityTimer);
        this.visibilityTimer = null;
      }
    }

    evaluateVisibility() {
      if (!this.state || !this.state.track || !this.state.isPlaying) {
        this.hide();
        return;
      }

      const inactiveFor = Date.now() - this.activityTimestamp;
      if (inactiveFor >= INACTIVITY_DELAY_MS) {
        this.show();
      }
    }

    show() {
      if (!this.overlay || this.visible) return;
      this.overlay.setAttribute('data-visible', 'true');
      this.visible = true;
    }

    hide() {
      if (!this.overlay || !this.visible) return;
      this.overlay.setAttribute('data-visible', 'false');
      this.visible = false;
    }

    recordActivity() {
      this.activityTimestamp = Date.now();
      if (this.visible) {
        this.hide();
      }
    }

    destroy() {
      this.stopVisibilityCheck();
      this.stopClock();
      if (this.unsubscribe) {
        this.unsubscribe();
        this.unsubscribe = null;
      }
      if (this.activityListener) {
        ['mousemove', 'mousedown', 'keydown', 'touchstart'].forEach((event) => {
          document.removeEventListener(event, this.activityListener);
        });
        this.activityListener = null;
      }
      if (this.restoreResetTimer) {
        this.restoreResetTimer();
        this.restoreResetTimer = null;
      }
      if (this.overlay) {
        this.overlay.remove();
        this.overlay = null;
      }
    }

    // Backwards compatibility with existing code
    handleMusicStateChange(state) {
      this.handleMusicState(state);
    }
  }

  const overlay = new MusicOverlay(window.musicController);
  window.musicOverlay = overlay;
})();
