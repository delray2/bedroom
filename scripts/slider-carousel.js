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

  // Create carousel HTML
  const carouselHTML = `
    <!-- Brightness -->
    <section class="page">
      <div></div>
      <div class="slider-wrap" id="brightness">
        <div class="pill"><div class="fill"></div></div>
        <input id="input-brightness" class="v-range" type="range" min="0" max="100" value="60" />
        <div class="gesture" data-for="input-brightness"></div>
      </div>
      <div class="label">Brightness <span class="value" id="val-b">60%</span></div>
    </section>

    <!-- Saturation -->
    <section class="page">
      <div></div>
      <div class="slider-wrap" id="saturation">
        <div class="pill"><div class="fill"></div></div>
        <input id="input-saturation" class="v-range" type="range" min="0" max="100" value="70" />
        <div class="gesture" data-for="input-saturation"></div>
      </div>
      <div class="label">Saturation <span class="value" id="val-s">70%</span></div>
    </section>

    <!-- Hue -->
    <section class="page">
      <div></div>
      <div class="slider-wrap" id="hue">
        <div class="pill"><div class="fill"></div></div>
        <input id="input-hue" class="v-range" type="range" min="0" max="360" value="30" />
        <div class="gesture" data-for="input-hue"></div>
      </div>
      <div class="label">Hue <span class="value" id="val-h">30°</span></div>
    </section>

    <!-- Kelvin -->
    <section class="page">
      <div></div>
      <div class="slider-wrap" id="kelvin">
        <div class="pill"><div class="fill"></div></div>
        <input id="input-kelvin" class="v-range" type="range" min="2000" max="6500" value="3500" />
        <div class="gesture" data-for="input-kelvin"></div>
      </div>
      <div class="label">Temperature <span class="value" id="val-k">3500K</span></div>
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

// Hide & clear side carousel content (exported properly)
function hideSideCarosel() {
  const caroseldiv = document.getElementById('side-carosel');
  if (!caroseldiv) return;
  caroseldiv.innerHTML = "";
}
window.hideSideCarosel = hideSideCarosel;

// Initialize the side (inline) carousel
function initializeSideCarousel(deviceId = null) {
  const carousel = document.getElementById('side-carosel');
  if (!carousel) {
    console.error('Side carousel container not found');
    return;
  }

  // Clear any existing content
  carousel.innerHTML = '';

  // Determine target device ID - use provided deviceId or default to bedroom group
  const targetDeviceId = deviceId || window.BEDROOM_GROUP_ID || '457';

  // Create carousel HTML with unique IDs for side carousel
  const carouselHTML = `
    <!-- Brightness -->
    <section class="page">
      <div></div>
      <div class="slider-wrap" id="side-brightness">
        <div class="pill"><div class="fill"></div></div>
        <input id="side-input-brightness" class="v-range" type="range" min="0" max="100" value="60" />
        <div class="gesture" data-for="side-input-brightness"></div>
      </div>
      <div class="label">Brightness <span class="value" id="side-val-b">60%</span></div>
    </section>

    <!-- Saturation -->
    <section class="page">
      <div></div>
      <div class="slider-wrap" id="side-saturation">
        <div class="pill"><div class="fill"></div></div>
        <input id="side-input-saturation" class="v-range" type="range" min="0" max="100" value="70" />
        <div class="gesture" data-for="side-input-saturation"></div>
      </div>
      <div class="label">Saturation <span class="value" id="side-val-s">70%</span></div>
    </section>

    <!-- Hue -->
    <section class="page">
      <div></div>
      <div class="slider-wrap" id="side-hue">
        <div class="pill"><div class="fill"></div></div>
        <input id="side-input-hue" class="v-range" type="range" min="0" max="360" value="30" />
        <div class="gesture" data-for="side-input-hue"></div>
      </div>
      <div class="label">Hue <span class="value" id="side-val-h">30°</span></div>
    </section>

    <!-- Kelvin -->
    <section class="page">
      <div></div>
      <div class="slider-wrap" id="side-kelvin">
        <div class="pill"><div class="fill"></div></div>
        <input id="side-input-kelvin" class="v-range" type="range" min="2000" max="6500" value="3500" />
        <div class="gesture" data-for="side-input-kelvin"></div>
      </div>
      <div class="label">Temperature <span class="value" id="side-val-k">3500K</span></div>
    </section>

    <div id="side-nav" class="nav-controls">
      <button id="side-btn-prev" class="nav-btn nav-left" aria-label="Previous">&#x2039;</button>
      <button id="side-btn-next" class="nav-btn nav-right" aria-label="Next">&#x203A;</button>
    </div>
  `;

  carousel.innerHTML = carouselHTML;

  // Store target device ID for command sending
  carousel.dataset.targetDeviceId = targetDeviceId;

  // Initialize side carousel functionality with separate functions
  setupSideCarouselControls(targetDeviceId);
  setupSideGestureHandlers(targetDeviceId);
  setupSideNavigationControls();

  // Load current device state
  loadSideDeviceState(targetDeviceId);

  // Setup state manager subscription for real-time updates
  setupSideStateManagerSubscription();
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
    }, 500);
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
    updateSlidersFromState(currentState);
  } else {
    window.deviceStateManager.refreshDevice(deviceId)
      .then(() => {
        const refreshedState = window.deviceStateManager.getDevice(deviceId);
        if (refreshedState) updateSlidersFromState(refreshedState);
      })
      .catch(err => console.error('Failed to refresh device state:', err));
  }
}

// Send command to device (shared)
function sendDeviceCommand(deviceId, command, value) {
  const API_BASE = window.MAKER_API_BASE || 'http://192.168.4.44/apps/api/37';
  const ACCESS_TOKEN = window.ACCESS_TOKEN || '';
  if (!API_BASE || !ACCESS_TOKEN) {
    console.warn('Missing API base or access token; aborting command.');
    return;
  }

  // Convert values for Hubitat commands
  if (value !== undefined && command === 'setHue') {
    // Convert 0-360 slider hue to 0-100 hubitat range
    value = Math.round((value / 360) * 100);
  }

  let url = `${API_BASE}/devices/${deviceId}/${command}`;
  if (value !== undefined) url += `/${value}`;
  url += `?access_token=${ACCESS_TOKEN}`;

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
      const attributes = state && state.attributes ? state.attributes : state;
      updateSlidersFromState(attributes);
    }
  });
}

function updateSlidersFromState(attributes) {
  if (!attributes) return;

  const level = Number(attributes.level || 0);
  const hue = Number(attributes.hue || 0);
  const sat = Number(attributes.saturation || 0);
  const ct = Number(attributes.colorTemperature || 3500);

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
  }
}

// ========================================
// SIDE CAROUSEL SPECIFIC FUNCTIONS
// ========================================
const sideSliderState = { b: 60, s: 70, h: 30, k: 3500 };

function setupSideCarouselControls(deviceId) {
  const root = document.documentElement;
  const $b = document.getElementById('side-input-brightness');
  const $s = document.getElementById('side-input-saturation');
  const $h = document.getElementById('side-input-hue');
  const $k = document.getElementById('side-input-kelvin');
  const $vb = document.getElementById('side-val-b');
  const $vs = document.getElementById('side-val-s');
  const $vh = document.getElementById('side-val-h');
  const $vk = document.getElementById('side-val-k');

  const debounceTimers = { brightness: null, saturation: null, hue: null, kelvin: null };

  function render() {
    root.style.setProperty('--side-b', sideSliderState.b);
    root.style.setProperty('--side-s', sideSliderState.s);
    root.style.setProperty('--side-h', sideSliderState.h);
    root.style.setProperty('--side-k', sideSliderState.k);
    if ($b) $b.value = sideSliderState.b;
    if ($s) $s.value = sideSliderState.s;
    if ($h) $h.value = sideSliderState.h;
    if ($k) $k.value = sideSliderState.k;
    if ($vb) $vb.textContent = `${sideSliderState.b}%`;
    if ($vs) $vs.textContent = `${sideSliderState.s}%`;
    if ($vh) $vh.textContent = `${Math.round(sideSliderState.h)}°`;
    if ($vk) $vk.textContent = `${sideSliderState.k}K`;
  }

  function sendDebouncedCommand(type, command, value) {
    if (debounceTimers[type]) clearTimeout(debounceTimers[type]);
    debounceTimers[type] = setTimeout(() => {
      if (deviceId) sendDeviceCommand(deviceId, command, Math.round(value));
      debounceTimers[type] = null;
    }, 500);
  }

  const setSideBrightness = v => { sideSliderState.b = Math.round(clamp(v, +$b.min, +$b.max)); render(); sendDebouncedCommand('brightness', 'setLevel', sideSliderState.b); };
  const setSideSaturation = v => { sideSliderState.s = Math.round(clamp(v, +$s.min, +$s.max)); render(); sendDebouncedCommand('saturation', 'setSaturation', sideSliderState.s); };
  const setSideHue        = v => { sideSliderState.h = Math.round(clamp(v, +$h.min, +$h.max)); sideSliderState.k = kelvinToHue(sideSliderState.h); render(); sendDebouncedCommand('hue', 'setHue', sideSliderState.h); };
  const setSideKelvin     = v => { sideSliderState.k = Math.round(clamp(v, +$k.min, +$k.max)); sideSliderState.h = kelvinToHue(sideSliderState.k); render(); sendDebouncedCommand('kelvin', 'setColorTemperature', sideSliderState.k); };

  function sendSideImmediateCommand(inputId) {
    if (!deviceId) return;
    let command, commandValue;
    switch (inputId) {
      case 'side-input-brightness': command = 'setLevel';            commandValue = Math.round(sideSliderState.b); break;
      case 'side-input-saturation': command = 'setSaturation';       commandValue = Math.round(sideSliderState.s); break;
      case 'side-input-hue':        command = 'setHue';              commandValue = Math.round(sideSliderState.h); break;
      case 'side-input-kelvin':     command = 'setColorTemperature'; commandValue = Math.round(sideSliderState.k); break;
      default: return;
    }
    const sliderType = inputId.replace('side-input-', '');
    if (debounceTimers[sliderType]) { clearTimeout(debounceTimers[sliderType]); debounceTimers[sliderType] = null; }
    sendDeviceCommand(deviceId, command, commandValue);
  }

  window.sideSliderSetters = { setSideBrightness, setSideSaturation, setSideHue, setSideKelvin };
  window.sendSideImmediateCommand = sendSideImmediateCommand;

  render();
}

function setupSideGestureHandlers(deviceId) {
  function attachSideGesture(layer, input, onChange) {
    if (!layer || !input) return;
    const rect = () => layer.getBoundingClientRect();
    const valueRange = +input.max - +input.min;

    let startY = 0, startX = 0, startValue = +input.value;
    let moved = false, dragging = false;
    const ORIENT_EPS = 8;
    const sliderWrap = layer.closest('.slider-wrap');

    const clearDragState = () => {
      moved = false;
      dragging = false;
      sliderWrap?.classList.remove('is-dragging');
    };

    layer.addEventListener('pointerdown', (e) => {
      layer.setPointerCapture(e.pointerId);
      startY = e.clientY; startX = e.clientX; startValue = +input.value;
      moved = false; dragging = false;
      sliderWrap?.classList.add('is-dragging');
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
        sliderWrap?.classList.add('is-dragging');
        const h = rect().height;
        const delta = (dy / h) * valueRange;
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
      if (window.sendSideImmediateCommand) window.sendSideImmediateCommand(input.id, input.value);
      layer.releasePointerCapture(e.pointerId);
      clearDragState();
    });

    layer.addEventListener('pointercancel', clearDragState);
    layer.addEventListener('lostpointercapture', clearDragState);
  }

  const $b = document.getElementById('side-input-brightness');
  const $s = document.getElementById('side-input-saturation');
  const $h = document.getElementById('side-input-hue');
  const $k = document.getElementById('side-input-kelvin');

  if (!window.sideSliderSetters) return;

  attachSideGesture(document.querySelector('#side-brightness .gesture'), $b, window.sideSliderSetters.setSideBrightness);
  attachSideGesture(document.querySelector('#side-saturation .gesture'), $s, window.sideSliderSetters.setSideSaturation);
  attachSideGesture(document.querySelector('#side-hue .gesture'), $h, window.sideSliderSetters.setSideHue);
  attachSideGesture(document.querySelector('#side-kelvin .gesture'), $k, window.sideSliderSetters.setSideKelvin);
}

let _sideNavActivityBound = false;
function setupSideNavigationControls() {
  const carousel = document.getElementById('side-carosel');
  const nav = document.getElementById('side-nav');
  if (!carousel || !nav) return;

  const btnPrev = document.getElementById('side-btn-prev');
  const btnNext = document.getElementById('side-btn-next');
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

  if (!_sideNavActivityBound) {
    const activityEvents = ['pointerdown', 'pointerup', 'mousemove', 'wheel', 'touchstart', 'keydown', 'click'];
    activityEvents.forEach(ev => window.addEventListener(ev, showNav, { passive: true }));
    _sideNavActivityBound = true;
  }

  showNav();
  updateDisabled();
}

function loadSideDeviceState(deviceId) {
  if (!window.deviceStateManager) {
    console.warn('Device state manager not available');
    return;
  }
  const currentState = window.deviceStateManager.getDevice(deviceId);
  if (currentState) {
    updateSideSlidersFromState(currentState);
  } else {
    window.deviceStateManager.refreshDevice(deviceId)
      .then(() => {
        const refreshedState = window.deviceStateManager.getDevice(deviceId);
        if (refreshedState) updateSideSlidersFromState(refreshedState);
      })
      .catch(err => console.error('Failed to refresh device state:', err));
  }
}

function setupSideStateManagerSubscription() {
  if (!window.deviceStateManager) {
    console.warn('Device state manager not available for side carousel subscription');
    return;
  }
  if (window.sideCarouselUnsubscribe) {
    window.sideCarouselUnsubscribe();
  }

  window.sideCarouselUnsubscribe = window.deviceStateManager.subscribe((deviceId, state) => {
    const carousel = document.getElementById('side-carosel');
    if (!carousel) return;
    const targetDeviceId = carousel.dataset.targetDeviceId;
    if (targetDeviceId && String(deviceId) === String(targetDeviceId)) {
      const attributes = state && state.attributes ? state.attributes : state;
      updateSideSlidersFromState(attributes);
    }
  });
}

function updateSideSlidersFromState(attributes) {
  if (!attributes) return;

  const level = Number(attributes.level || 0);
  const hue = Number(attributes.hue || 0);
  const sat = Number(attributes.saturation || 0);
  const ct = Number(attributes.colorTemperature || 3500);

  sideSliderState.b = Math.max(1, Math.round(level));
  sideSliderState.h = Math.round((hue / 100) * 360);
  sideSliderState.s = Math.round(sat);
  sideSliderState.k = Math.round(ct);

  if (window.sideSliderSetters) {
    const root = document.documentElement;
    root.style.setProperty('--side-b', sideSliderState.b);
    root.style.setProperty('--side-s', sideSliderState.s);
    root.style.setProperty('--side-h', sideSliderState.h);
    root.style.setProperty('--side-k', sideSliderState.k);

    const $b = document.getElementById('side-input-brightness');
    const $s = document.getElementById('side-input-saturation');
    const $h = document.getElementById('side-input-hue');
    const $k = document.getElementById('side-input-kelvin');
    const $vb = document.getElementById('side-val-b');
    const $vs = document.getElementById('side-val-s');
    const $vh = document.getElementById('side-val-h');
    const $vk = document.getElementById('side-val-k');

    if ($b) $b.value = sideSliderState.b;
    if ($s) $s.value = sideSliderState.s;
    if ($h) $h.value = sideSliderState.h;
    if ($k) $k.value = sideSliderState.k;
    if ($vb) $vb.textContent = `${sideSliderState.b}%`;
    if ($vs) $vs.textContent = `${sideSliderState.s}%`;
    if ($vh) $vh.textContent = `${Math.round(sideSliderState.h)}°`;
    if ($vk) $vk.textContent = `${sideSliderState.k}K`;
  }
}

// Export for global use
window.initializeSliderCarousel = initializeSliderCarousel;
window.initializeSideCarousel = initializeSideCarousel;
window.loadDeviceState = loadDeviceState;
window.setupStateManagerSubscription = setupStateManagerSubscription;
