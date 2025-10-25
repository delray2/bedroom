// ========================================
// Slider Carousel System
// ========================================

// Global state for slider values
const sliderState = { b: 60, s: 70, h: 30, k: 3500 };
const K_MIN = 2000, K_MAX = 6500, H_MIN = 35, H_MAX = 220;
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const map = (v, a, b, c, d) => ((v - a) / (b - a)) * (d - c) + c;
const kelvinToHue = k => clamp(map(k, K_MIN, K_MAX, H_MIN, H_MAX), 0, 360);
const hueToKelvin = h => Math.round(clamp(map(h, H_MIN, H_MAX, K_MIN, K_MAX), K_MIN, K_MAX));

// Initialize the slider carousel (main/modal)
function initializeSliderCarousel(deviceId = null) {
  const carousel = document.getElementById('sliderCarousel');
  if (!carousel) {
    console.error('Slider carousel container not found');
    return;
  }

  // Remove any prior nav sibling to prevent duplicates
  const next = carousel.nextElementSibling;
  if (next && next.id === 'nav') next.remove();

  // Clear any existing content
  carousel.innerHTML = '';

  // Determine target device ID - use provided deviceId or default to bedroom group
  const targetDeviceId = deviceId || window.BEDROOM_GROUP_ID || '457';
  
  // Get current device state from state manager
  let deviceState = null;
  if (window.deviceStateManager && targetDeviceId) {
    deviceState = window.deviceStateManager.getDevice(targetDeviceId);
    console.log(`🎛️ Initializing slider carousel for device ${targetDeviceId}:`, deviceState);
  }
  
  // Initialize slider state with actual device values or defaults
  if (deviceState && deviceState.attributes) {
    const attrs = deviceState.attributes;
    sliderState.b = Math.max(1, Math.round(Number(attrs.level) || 0));
    sliderState.h = Math.round((Number(attrs.hue) || 0) / 100 * 360);
    sliderState.s = Math.round(Number(attrs.saturation) || 0);
    sliderState.k = Math.round(Number(attrs.colorTemperature) || 3500);
    console.log(`🎛️ Set slider state from device:`, sliderState);
  } else {
    // Use defaults if no device state available
    sliderState.b = 60;
    sliderState.s = 70;
    sliderState.h = 30;
    sliderState.k = 3500;
    console.log(`🎛️ Using default slider state:`, sliderState);
  }

  // Create carousel HTML with actual device state values
  const carouselHTML = `
    <!-- Brightness -->
    <section class="page">
      <div></div>
      <div class="slider-wrap" id="brightness">
        <div class="pill"><div class="fill"></div></div>
        <input id="input-brightness" class="v-range" type="range" min="0" max="100" value="${sliderState.b}" />
        <div class="gesture" data-for="input-brightness"></div>
      </div>
      <div class="label">Brightness <span class="value" id="val-b">${sliderState.b}%</span></div>
    </section>

    <!-- Saturation -->
    <section class="page">
      <div></div>
      <div class="slider-wrap" id="saturation">
        <div class="pill"><div class="fill"></div></div>
        <input id="input-saturation" class="v-range" type="range" min="0" max="100" value="${sliderState.s}" />
        <div class="gesture" data-for="input-saturation"></div>
      </div>
      <div class="label">Saturation <span class="value" id="val-s">${sliderState.s}%</span></div>
    </section>

    <!-- Hue -->
    <section class="page">
      <div></div>
      <div class="slider-wrap" id="hue">
        <div class="pill"><div class="fill"></div></div>
        <input id="input-hue" class="v-range" type="range" min="0" max="360" value="${sliderState.h}" />
        <div class="gesture" data-for="input-hue"></div>
      </div>
      <div class="label">Hue <span class="value" id="val-h">${Math.round(sliderState.h)}°</span></div>
    </section>

    <!-- Kelvin -->
    <section class="page">
      <div></div>
      <div class="slider-wrap" id="kelvin">
        <div class="pill"><div class="fill"></div></div>
        <input id="input-kelvin" class="v-range" type="range" min="2000" max="6500" value="${sliderState.k}" />
        <div class="gesture" data-for="input-kelvin"></div>
      </div>
      <div class="label">Temperature <span class="value" id="val-k">${sliderState.k}K</span></div>
    </section>
  `;

  carousel.innerHTML = carouselHTML;

  // Add navigation controls (as a sibling)
  const navHTML = `
    <div id="nav" class="nav-controls">
      <button id="btn-prev" class="nav-btn nav-left" aria-label="Previous">&#x2039;</button>
      <button id="btn-next" class="nav-btn nav-right" aria-label="Next">&#x203A;</button>
    </div>
  `;
  carousel.insertAdjacentHTML('afterend', navHTML);

  // Store target device ID for command sending
  carousel.dataset.targetDeviceId = targetDeviceId;

  // Initialize carousel functionality
  setupCarouselControls(targetDeviceId);
  setupGestureHandlers(targetDeviceId);
  setupNavigationControls();

  // Load current device state
  loadDeviceState(targetDeviceId);

  // Setup state manager subscription for real-time updates
  setupStateManagerSubscription();
}


// Setup carousel controls and state management (main)
function setupCarouselControls(deviceId) {
  const root = document.documentElement;
  const $b = document.getElementById('input-brightness');
  const $s = document.getElementById('input-saturation');
  const $h = document.getElementById('input-hue');
  const $k = document.getElementById('input-kelvin');
  const $vb = document.getElementById('val-b');
  const $vs = document.getElementById('val-s');
  const $vh = document.getElementById('val-h');
  const $vk = document.getElementById('val-k');

  // Debounce timers for each slider
  const debounceTimers = { brightness: null, saturation: null, hue: null, kelvin: null };

  function render() {
    root.style.setProperty('--b', sliderState.b);
    root.style.setProperty('--s', sliderState.s);
    root.style.setProperty('--h', sliderState.h);
    root.style.setProperty('--k', sliderState.k);
    if ($b) $b.value = sliderState.b;
    if ($s) $s.value = sliderState.s;
    if ($h) $h.value = sliderState.h;
    if ($k) $k.value = sliderState.k;
    if ($vb) $vb.textContent = `${sliderState.b}%`;
    if ($vs) $vs.textContent = `${sliderState.s}%`;
    if ($vh) $vh.textContent = `${Math.round(sliderState.h)}°`;
    if ($vk) $vk.textContent = `${sliderState.k}K`;
  }

  function sendDebouncedCommand(type, command, value) {
    if (debounceTimers[type]) clearTimeout(debounceTimers[type]);
    debounceTimers[type] = setTimeout(() => {
      if (deviceId) {
        const roundedValue = Math.round(value);
        sendDeviceCommand(deviceId, command, roundedValue);
      }
      debounceTimers[type] = null;
    }, window.CONFIG?.TIMING?.SLIDER_DEBOUNCE || 500);
  }

  const setBrightness = v => { sliderState.b = Math.round(clamp(v, +$b.min, +$b.max)); render(); sendDebouncedCommand('brightness', 'setLevel', sliderState.b); };
  const setSaturation = v => { sliderState.s = Math.round(clamp(v, +$s.min, +$s.max)); render(); sendDebouncedCommand('saturation', 'setSaturation', sliderState.s); };
  const setHue        = v => { sliderState.h = Math.round(clamp(v, +$h.min, +$h.max)); sliderState.k = hueToKelvin(sliderState.h); render(); sendDebouncedCommand('hue', 'setHue', sliderState.h); };
  const setKelvin     = v => { sliderState.k = Math.round(clamp(v, +$k.min, +$k.max)); sliderState.h = kelvinToHue(sliderState.k); render(); sendDebouncedCommand('kelvin', 'setColorTemperature', sliderState.k); };

  function sendImmediateCommand(inputId) {
    if (!deviceId) return;
    let command, commandValue;
    switch (inputId) {
      case 'input-brightness': command = 'setLevel';           commandValue = Math.round(sliderState.b); break;
      case 'input-saturation': command = 'setSaturation';      commandValue = Math.round(sliderState.s); break;
      case 'input-hue':        command = 'setHue';             commandValue = Math.round(sliderState.h); break;
      case 'input-kelvin':     command = 'setColorTemperature';commandValue = Math.round(sliderState.k); break;
      default: return;
    }
    const sliderType = inputId.replace('input-', '');
    if (debounceTimers[sliderType]) { clearTimeout(debounceTimers[sliderType]); debounceTimers[sliderType] = null; }
    sendDeviceCommand(deviceId, command, commandValue);
  }

  window.sliderSetters = { setBrightness, setSaturation, setHue, setKelvin };
  window.sendImmediateCommand = sendImmediateCommand;

  render();
}

// Setup gesture handlers for touch/mouse interaction (main)
function setupGestureHandlers(deviceId) {
  function attachGesture(layer, input, onChange) {
    if (!layer || !input) return;
    const rect = () => layer.getBoundingClientRect();
    const valueRange = +input.max - +input.min;

    let startY = 0, startX = 0, startValue = +input.value;
    let moved = false, dragging = false;
    const ORIENT_EPS = 8;

    layer.addEventListener('pointerdown', (e) => {
      layer.setPointerCapture(e.pointerId);
      startY = e.clientY;
      startX = e.clientX;
      startValue = +input.value;
      moved = false;
      dragging = false;
    });

    layer.addEventListener('pointermove', (e) => {
      if (!layer.hasPointerCapture(e.pointerId)) return;
      const dy = startY - e.clientY;
      const dx = Math.abs(e.clientX - startX);
      const ady = Math.abs(dy);
      if (!dragging && dx - ady > ORIENT_EPS) return;
      if (!dragging && ady > ORIENT_EPS) dragging = true;
      if (dragging) {
        moved = true;
        const h = rect().height;
        const delta = (dy / h) * valueRange; // up increases
        onChange(startValue + delta);
        e.preventDefault();
      }
    });

    layer.addEventListener('pointerup', (e) => {
      if (!moved) {
        const r = rect();
        const percent = Math.min(1, Math.max(0, (r.bottom - e.clientY) / r.height));
        const v = +input.min + percent * valueRange;
        onChange(v);
      }
      if (window.sendImmediateCommand) window.sendImmediateCommand(input.id, input.value);
      layer.releasePointerCapture(e.pointerId);
      moved = false;
      dragging = false;
    });

    layer.addEventListener('pointercancel', () => { moved = false; dragging = false; });
    layer.addEventListener('lostpointercapture', () => { moved = false; dragging = false; });
  }

  const $b = document.getElementById('input-brightness');
  const $s = document.getElementById('input-saturation');
  const $h = document.getElementById('input-hue');
  const $k = document.getElementById('input-kelvin');

  if (!window.sliderSetters) return;

  attachGesture(document.querySelector('#brightness .gesture'), $b, window.sliderSetters.setBrightness);
  attachGesture(document.querySelector('#saturation .gesture'), $s, window.sliderSetters.setSaturation);
  attachGesture(document.querySelector('#hue .gesture'), $h, window.sliderSetters.setHue);
  attachGesture(document.querySelector('#kelvin .gesture'), $k, window.sliderSetters.setKelvin);
}

let _navActivityBound = false;
function setupNavigationControls() {
  const carousel = document.getElementById('sliderCarousel');
  const nav = document.getElementById('nav');
  if (!carousel || !nav) return;

  const btnPrev = document.getElementById('btn-prev');
  const btnNext = document.getElementById('btn-next');
  let hideTimer = null;

  function pageWidth() { return carousel.clientWidth; }
  function pageCount() { return carousel.children.length; }
  function currentIndex() { return Math.round(carousel.scrollLeft / pageWidth()); }

  function goTo(index) {
    const clamped = clamp(index, 0, pageCount() - 1);
    carousel.scrollTo({ left: clamped * pageWidth(), behavior: 'smooth' });
    updateDisabled(clamped);
  }

  function updateDisabled(idx = currentIndex()) {
    btnPrev?.toggleAttribute('disabled', idx <= 0);
    btnNext?.toggleAttribute('disabled', idx >= pageCount() - 1);
  }

  function showNav() {
    nav.classList.add('nav-visible');
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(() => nav.classList.remove('nav-visible'), 2500);
  }

  btnPrev?.addEventListener('click', () => { showNav(); goTo(currentIndex() - 1); });
  btnNext?.addEventListener('click', () => { showNav(); goTo(currentIndex() + 1); });
  window.addEventListener('resize', () => updateDisabled());
  carousel.addEventListener('scroll', () => updateDisabled());

  if (!_navActivityBound) {
    const activityEvents = ['pointerdown', 'pointerup', 'mousemove', 'wheel', 'touchstart', 'keydown', 'click'];
    activityEvents.forEach(ev => window.addEventListener(ev, showNav, { passive: true }));
    _navActivityBound = true;
  }

  showNav();
  updateDisabled();
}

// Load device state from state manager and update sliders (main)
function loadDeviceState(deviceId) {
  if (!window.deviceStateManager) {
    console.warn('Device state manager not available');
    return;
  }

  const currentState = window.deviceStateManager.getDevice(deviceId);
  if (currentState) {
    console.log(`🎛️ Loading device state for ${deviceId}:`, currentState);
    updateSlidersFromState(currentState);
  } else {
    console.log(`🎛️ No cached state for ${deviceId}, refreshing...`);
    window.deviceStateManager.refreshDevice(deviceId)
      .then(() => {
        const refreshedState = window.deviceStateManager.getDevice(deviceId);
        if (refreshedState) {
          console.log(`🎛️ Refreshed device state for ${deviceId}:`, refreshedState);
          updateSlidersFromState(refreshedState);
        }
      })
      .catch(err => console.error('Failed to refresh device state:', err));
  }
}

// Send command to device (shared)
function sendDeviceCommand(deviceId, command, value) {
  if (!window.CONFIG?.HUBITAT) {
    console.warn('Missing CONFIG; aborting command.');
    return;
  }

  // Convert values for Hubitat commands
  if (value !== undefined && command === 'setHue') {
    // Convert 0-360 slider hue to 0-100 hubitat range
    value = Math.round((value / 360) * 100);
  }

  const url = window.CONFIG.HUBITAT.deviceCommandUrl(deviceId, command, value);

  fetch(url)
    .then(res => res.json())
    .then(() => {
      console.log(`Device ${deviceId} command sent: ${command}${value !== undefined ? ` = ${value}` : ''}`);
      window.showToast?.('Command sent successfully!', 'success');
    })
    .catch(err => {
      console.error('Failed to send command:', err);
      window.showToast?.(`Failed to send command: ${err.message}`, 'error');
    });
}

// State manager subscription for real-time updates (main)
function setupStateManagerSubscription() {
  if (!window.deviceStateManager) {
    console.warn('Device state manager not available for slider subscription');
    return;
  }
  if (window.sliderCarouselUnsubscribe) {
    window.sliderCarouselUnsubscribe();
  }

  window.sliderCarouselUnsubscribe = window.deviceStateManager.subscribe((deviceId, state) => {
    const carousel = document.getElementById('sliderCarousel');
    if (!carousel) return;
    const targetDeviceId = carousel.dataset.targetDeviceId;
    if (targetDeviceId && String(deviceId) === String(targetDeviceId)) {
      console.log(`🎛️ State update received for slider target device ${deviceId}:`, state);
      updateSlidersFromState(state);
    }
  });
}

function updateSlidersFromState(deviceState) {
  if (!deviceState) return;
  
  // Handle both direct attributes and nested attributes structure
  const attributes = deviceState.attributes || deviceState;
  if (!attributes) return;

  const level = Number(attributes.level || 0);
  const hue = Number(attributes.hue || 0);
  const sat = Number(attributes.saturation || 0);
  const ct = Number(attributes.colorTemperature || 3500);

  console.log(`🎛️ Updating sliders from state:`, { level, hue, sat, ct });

  sliderState.b = Math.max(1, Math.round(level));
  sliderState.h = Math.round((hue / 100) * 360);
  sliderState.s = Math.round(sat);
  sliderState.k = Math.round(ct);

  // Re-render if carousel is already initialized
  if (window.sliderSetters) {
    const root = document.documentElement;
    root.style.setProperty('--b', sliderState.b);
    root.style.setProperty('--s', sliderState.s);
    root.style.setProperty('--h', sliderState.h);
    root.style.setProperty('--k', sliderState.k);

    const $b = document.getElementById('input-brightness');
    const $s = document.getElementById('input-saturation');
    const $h = document.getElementById('input-hue');
    const $k = document.getElementById('input-kelvin');
    const $vb = document.getElementById('val-b');
    const $vs = document.getElementById('val-s');
    const $vh = document.getElementById('val-h');
    const $vk = document.getElementById('val-k');

    if ($b) $b.value = sliderState.b;
    if ($s) $s.value = sliderState.s;
    if ($h) $h.value = sliderState.h;
    if ($k) $k.value = sliderState.k;
    if ($vb) $vb.textContent = `${sliderState.b}%`;
    if ($vs) $vs.textContent = `${sliderState.s}%`;
    if ($vh) $vh.textContent = `${Math.round(sliderState.h)}°`;
    if ($vk) $vk.textContent = `${sliderState.k}K`;
    
    console.log(`🎛️ Updated slider values:`, sliderState);
  }
}

// Make updateSlidersFromState globally available
window.updateSlidersFromState = updateSlidersFromState;

// Debug function to check slider state
window.debugSliderState = function() {
  console.log('🎛️ Current slider state:', sliderState);
  console.log('🎛️ Slider elements:', {
    brightness: document.getElementById('input-brightness')?.value,
    saturation: document.getElementById('input-saturation')?.value,
    hue: document.getElementById('input-hue')?.value,
    kelvin: document.getElementById('input-kelvin')?.value
  });
  console.log('🎛️ Target device ID:', document.getElementById('sliderCarousel')?.dataset.targetDeviceId);
};




