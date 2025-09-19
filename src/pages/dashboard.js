import '../styles/main.css';
import rollerShadeImage from '../assets/roller-shade.png';
import '../scripts/config-store.js';
import '../scripts/api.js';
import '../scripts/video-stream.js';
import '../statemanager/state-manager.js';
import '../scripts/modal.js';
import '../scripts/main.js';
import '../scripts/devices.js';
import '../scripts/slider-carousel.js';
import '../scripts/controls.js';
import '../scripts/camera.js';
import '../scripts/lifx-themes.js';
import '../scripts/ui.js';
import '../scripts/ui-manager.js';

if (typeof document !== 'undefined') {
  const root = document.documentElement;
  if (root) {
    root.style.setProperty('--roller-shade-img', `url(${rollerShadeImage})`);
  }
}
