const CACHE_NAME = 'hubitat-dashboard-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/main.js',
  '/video-stream.js',
  '/styles/main.css',
  '/scripts/config.js',
  '/statemanager/unified-state-manager.js',
  '/scripts/main.js',
  '/scripts/modal.js',
  '/scripts/ui.js',
  '/scripts/api.js',
  '/scripts/ui-manager.js',
  '/scripts/devices.js',
  '/scripts/controls.js',
  '/scripts/camera.js',
  '/scripts/scenes.js',
  '/scripts/lifx-themes.js',
  '/scripts/paddle-switch.js',
  '/scripts/slider-carousel.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
}); 