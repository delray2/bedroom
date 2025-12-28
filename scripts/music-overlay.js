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
      this.currentBackgroundUrl = null;
      this.backgroundRequestId = 0;

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
        <div class="music-overlay__gradient"></div>
        <div class="music-overlay__layer">
          <div class="music-overlay__top">
            <div class="music-overlay__clock">
              <div class="music-overlay__date" data-role="date"></div>
              <div class="music-overlay__time" data-role="time"></div>
            </div>
            <div class="music-overlay__instruction">Tap to resume</div>
          </div>
          <div class="music-overlay__bottom">
            <div class="music-overlay__track" data-role="track">
              <div class="music-overlay__track-title" data-role="title">Music paused</div>
              <div class="music-overlay__track-artist" data-role="artist"></div>
            </div>
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
      if (!state) return;

      // Check if state has actually changed to avoid redundant updates
      const stateChanged = this.hasStateChanged(state);
      if (!stateChanged) {
        return;
      }

      // Determine what changed before updating state
      const wasPlaying = this.state?.isPlaying;
      const isNowPlaying = state.isPlaying;
      const playingStateChanged = wasPlaying !== isNowPlaying;
      const trackChanged = this.hasTrackChanged(state);

      this.state = state;

      if (!state.track) {
        this.hide();
        this.activityTimestamp = Date.now();
        return;
      }

      this.updateContent(state);
      if (!state.isPlaying) {
        this.hide();
        this.activityTimestamp = Date.now();
        return;
      }

      // Only update activity timestamp if playing state changed (user action)
      // Don't update it on track changes - overlay should stay visible and just update content
      if (playingStateChanged) {
        this.activityTimestamp = Date.now();
      }
      // If only track changed but still playing, don't reset timestamp - keep overlay visible
    }

    hasTrackChanged(newState) {
      if (!this.state || !this.state.track || !newState.track) {
        return !this.state?.track && !!newState.track;
      }
      
      const oldTrack = this.state.track;
      const newTrack = newState.track;
      
      return (
        oldTrack.title !== newTrack.title ||
        oldTrack.artist !== newTrack.artist ||
        oldTrack.imageUrl !== newTrack.imageUrl ||
        oldTrack.id !== newTrack.id
      );
    }

    hasStateChanged(newState) {
      if (!this.state) return true;
      
      // Compare key properties that affect the overlay
      const oldTrack = this.state.track;
      const newTrack = newState.track;
      
      // Check if track changed
      if (!oldTrack && !newTrack) return false;
      if (!oldTrack || !newTrack) return true;
      
      const trackChanged = (
        oldTrack.title !== newTrack.title ||
        oldTrack.artist !== newTrack.artist ||
        oldTrack.imageUrl !== newTrack.imageUrl ||
        oldTrack.id !== newTrack.id
      );
      
      // Check if playing state changed
      const playingChanged = this.state.isPlaying !== newState.isPlaying;
      
      return trackChanged || playingChanged;
    }

    updateContent(state) {
      if (!this.overlay) return;
      
      // Update track information
      if (this.elements.title) {
        this.elements.title.textContent = state.track?.title || 'Music paused';
      }
      if (this.elements.artist) {
        this.elements.artist.textContent = state.track?.artist || '';
      }
      
      // Update background image
      if (this.elements.background) {
        const image = state.track?.imageUrl || null;
        
        if (image) {
          // Check if this is a new image URL
          if (image !== this.currentBackgroundUrl) {
            console.log('🎵 Music Overlay: New image URL detected, preloading:', image);
            console.log('🎵 Music Overlay: Previous URL:', this.currentBackgroundUrl);
            
            const requestId = ++this.backgroundRequestId;
            this.preloadImage(image).then((loaded) => {
              if (!loaded) {
                console.warn('🎵 Music Overlay: Failed to load image:', image);
                return;
              }
              if (requestId !== this.backgroundRequestId) {
                console.log('🎵 Music Overlay: Request ID mismatch, ignoring (newer request in progress)');
                return;
              }
              if (!this.elements.background) {
                console.warn('🎵 Music Overlay: Background element not found');
                return;
              }
              
              console.log('✅ Music Overlay: Successfully loaded and setting background:', image);
              this.currentBackgroundUrl = image;
              this.elements.background.style.backgroundImage = `url("${image}")`;
              this.elements.background.classList.add('has-image');
            }).catch((error) => {
              console.error('🎵 Music Overlay: Error loading image:', error);
            });
          } else {
            console.log('🎵 Music Overlay: Same image URL, no update needed:', image);
          }
        } else {
          // No image URL - clear the background if we had one before
          if (this.currentBackgroundUrl) {
            console.log('🎵 Music Overlay: No image URL, clearing background');
            this.backgroundRequestId += 1;
            this.currentBackgroundUrl = null;
            this.elements.background.style.backgroundImage = 'none';
            this.elements.background.classList.remove('has-image');
          }
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
      this.elements.date.textContent = this.formatDate(now);
      const timeFormatter = new Intl.DateTimeFormat([], { hour: 'numeric', minute: '2-digit', hour12: true });
      this.elements.time.textContent = timeFormatter.format(now);
    }

    formatDate(date) {
      const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(date);
      const month = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(date);
      const day = date.getDate();
      const suffix = this.getOrdinalSuffix(day);
      const year = date.getFullYear();
      return `${weekday}, ${month} ${day}${suffix}, ${year}`;
    }

    getOrdinalSuffix(day) {
      const remainder = day % 100;
      if (remainder >= 11 && remainder <= 13) {
        return 'th';
      }
      switch (day % 10) {
        case 1:
          return 'st';
        case 2:
          return 'nd';
        case 3:
          return 'rd';
        default:
          return 'th';
      }
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
      if (this.controller?.setOverlayActive) {
        this.controller.setOverlayActive(true);
      }
    }

    hide() {
      if (!this.overlay || !this.visible) {
        if (this.controller?.setOverlayActive) {
          this.controller.setOverlayActive(false);
        }
        return;
      }
      this.overlay.setAttribute('data-visible', 'false');
      this.visible = false;
      if (this.controller?.setOverlayActive) {
        this.controller.setOverlayActive(false);
      }
    }

    recordActivity() {
      this.activityTimestamp = Date.now();
      // Always hide music overlay on user activity, regardless of camera modal state
      if (this.visible) {
        this.hide();
      }
    }

    preloadImage(url) {
      return new Promise((resolve, reject) => {
        if (!url) {
          console.warn('🎵 Music Overlay: preloadImage called with empty URL');
          resolve(false);
          return;
        }
        
        const image = new Image();
        
        image.onload = () => {
          console.log('✅ Music Overlay: Image preloaded successfully');
          resolve(true);
        };
        
        image.onerror = (error) => {
          console.error('❌ Music Overlay: Image preload failed:', url, error);
          resolve(false);
        };
        
        // Set crossOrigin to anonymous to handle CORS issues
        image.crossOrigin = 'anonymous';
        
        // Start loading the image
        console.log('🔄 Music Overlay: Starting image preload:', url);
        image.src = url;
        
        // Timeout after 10 seconds
        setTimeout(() => {
          if (!image.complete) {
            console.warn('⏱️ Music Overlay: Image preload timeout after 10s:', url);
            resolve(false);
          }
        }, 10000);
      });
    }

    destroy() {
      this.stopVisibilityCheck();
      this.stopClock();
      if (this.unsubscribe) {
        this.unsubscribe();
        this.unsubscribe = null;
      }
      if (this.controller?.setOverlayActive) {
        this.controller.setOverlayActive(false);
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
