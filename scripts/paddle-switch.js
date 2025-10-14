// ========================================
// IMPROVED PADDLE SWITCH FUNCTIONALITY
// ========================================

class PaddleSwitch {
  constructor(element, deviceId, options = {}) {
    this.element = element;
    this.deviceId = deviceId;
    this.options = {
      longPressMs: window.CONFIG?.TIMING?.PADDLE_LONG_PRESS || 320,
      debounceMs: window.CONFIG?.TIMING?.PADDLE_DEBOUNCE || 150,
      ...options
    };
    
    this.level = 0;         // 0..1
    this.isOn = false;      // convenience flag: is level > 0
    this.dimming = false;   // are we in dim mode?
    
    // Gesture bookkeeping
    this.pressTimer = null;
    this.pointerId = null;
    this.pressStart = 0;
    this.moved = false;
    
    // Continuous level sending
    this.lastSentLevel = -1;  // Track last sent level to avoid duplicates
    this.levelSendTimer = null;  // Debounce timer for level sending
    
    this.init();
  }
  
  init() {
    this.setupEventListeners();
    this.setLevel(0);
  }
  
  setLevel(v, {commit = false, fromUser = false} = {}) {
    this.level = Math.min(1, Math.max(0, v));
    this.isOn = this.level > 0.0001; // treat nonzero as ON
    
    this.element.style.setProperty('--level', this.level.toFixed(4));
    this.element.setAttribute('aria-checked', String(this.isOn));
    
    // Update percentage displays (only for switches that have HUD percentage)
    const percent = Math.round(this.level * 100);
    const percentEl = this.element.querySelector('.percent span');
    if (percentEl) {
      percentEl.textContent = percent;
    }
    
    // Update side percentage displays
    this.updateSidePercentage(percent);
    
    // Update paddle glyph to show ON/OFF state
    this.updatePaddleGlyph();
    
    // Lock state manager during user interaction
    if (fromUser && window.deviceStateManager && this.deviceId !== 'all') {
      window.deviceStateManager.lockDevice(this.deviceId);
    }
    
    // Send continuous level commands during dimming
    if (this.dimming) {
      this.sendContinuousLevelCommand();
    }
    
    if (commit) {
      this.element.classList.add('commit');
      setTimeout(() => this.element.classList.remove('commit'), 120);
    }
  }
  
  updateSidePercentage(percent) {
    const isLeftSwitch = this.element.id === 'paddleSwitch';
    const percentageEl = document.getElementById(isLeftSwitch ? 'paddlePercentageLeft' : 'paddlePercentageRight');
    
    if (percentageEl) {
      percentageEl.textContent = `${percent}%`;
      if (this.dimming) {
        percentageEl.classList.add('visible');
      } else {
        percentageEl.classList.remove('visible');
      }
    }
  }
  
  updatePaddleGlyph() {
    const glyphEl = this.element.querySelector('.glyph');
    if (glyphEl) {
      // Show ON when light is on, OFF when light is off
      glyphEl.textContent = this.isOn ? 'ON' : 'OFF';
    }
  }
  
  toggle() {
    const newState = !this.isOn;
    this.setLevel(newState ? 1 : 0, {commit: true, fromUser: true});
    this.sendCommand(newState ? 'on' : 'off');
  }
  
  enterDim() {
    if (this.dimming) return;
    this.dimming = true;
    this.element.classList.add('dimming');
    
    // Reset continuous level sending state
    this.lastSentLevel = -1;
    
    // Lock state during dimming interaction
    if (window.deviceStateManager && this.deviceId !== 'all') {
      window.deviceStateManager.lockDevice(this.deviceId);
    }
    
    // Change wall plate background instead of body
    const wallPlate = document.querySelector('.wall-plate');
    if (wallPlate) {
      wallPlate.classList.add('dimming');
    }
    
    // Show hold hint
    const holdHint = document.getElementById('holdHint');
    if (holdHint) {
      holdHint.classList.add('visible');
    }
    
    this.setLevel(Math.max(this.level, 0.01), {fromUser: true});
  }
  
  exitDim({commit = false, fade = true} = {}) {
    if (!this.dimming) return;
    this.dimming = false;
    
    // Clear any pending level send timer
    if (this.levelSendTimer) {
      clearTimeout(this.levelSendTimer);
      this.levelSendTimer = null;
    }
    
    if (fade) {
      setTimeout(() => this.element.classList.remove('dimming'), 80);
      setTimeout(() => {
        const wallPlate = document.querySelector('.wall-plate');
        if (wallPlate) {
          wallPlate.classList.remove('dimming');
        }
      }, 80);
    } else {
      this.element.classList.remove('dimming');
      const wallPlate = document.querySelector('.wall-plate');
      if (wallPlate) {
        wallPlate.classList.remove('dimming');
      }
    }
    
    // Hide hold hint
    const holdHint = document.getElementById('holdHint');
    if (holdHint) {
      holdHint.classList.remove('visible');
    }
    
    // Hide side percentages
    const leftPercentage = document.getElementById('paddlePercentageLeft');
    const rightPercentage = document.getElementById('paddlePercentageRight');
    if (leftPercentage) leftPercentage.classList.remove('visible');
    if (rightPercentage) rightPercentage.classList.remove('visible');
    
    if (commit) {
      this.setLevel(this.level, {commit: true, fromUser: true});
      // Send final level command (not continuous)
      const finalLevel = Math.round(this.level * 100);
      this.sendCommand('setLevel', finalLevel);
      console.log(`Sent final level command: ${finalLevel}%`);
    }
    
    // Unlock device after short delay to allow command to complete
    if (window.deviceStateManager && this.deviceId !== 'all') {
      setTimeout(() => {
        window.deviceStateManager.unlockDevice(this.deviceId);
      }, 500);
    }
  }
  
  yToLevel(clientY) {
    const r = this.element.getBoundingClientRect();
    const y = clientY - r.top; 
    const clamped = Math.min(Math.max(y, 0), r.height);
    const v = 1 - clamped / r.height; 
    return v;
  }
  
  sendCommand(command, value = null) {
    if (!this.deviceId) return;
    
    console.log(`Sending command to device ${this.deviceId}:`, command, value);
    
    // Special handling for "All" paddle switch
    if (this.deviceId === 'all') {
      if (command === 'on' || command === 'off') {
        window.handleAllPaddleSwitchToggle();
      }
      return;
    }
    
    // Use the existing API service
    if (window.apiService) {
      window.apiService.sendDeviceCommand(this.deviceId, command, value)
        .then(() => {
          console.log('Command sent successfully');
        })
        .catch(error => {
          console.error('Failed to send command:', error);
        });
    }
  }
  
  sendLevelCommand() {
    const level = Math.round(this.level * 100);
    this.sendCommand('setLevel', level);
  }
  
  // Send level command continuously during dimming with debouncing and 5% increments
  sendContinuousLevelCommand() {
    if (!this.dimming) return;
    
    const currentLevel = Math.round(this.level * 100);
    
    // Round to nearest 5% increment
    const roundedLevel = Math.round(currentLevel / 5) * 5;
    
    // Only send if level changed and it's a meaningful increment
    if (roundedLevel !== this.lastSentLevel && roundedLevel >= 0 && roundedLevel <= 100) {
      // Clear existing timer
      if (this.levelSendTimer) {
        clearTimeout(this.levelSendTimer);
      }
      
      // Set new timer for debounced sending
      this.levelSendTimer = setTimeout(() => {
        this.sendCommand('setLevel', roundedLevel);
        this.lastSentLevel = roundedLevel;
        console.log(`Sent continuous level command: ${roundedLevel}%`);
      }, this.options.debounceMs);
    }
  }
  
  setupEventListeners() {
    this.element.addEventListener('pointerdown', (e) => {
      if (this.pointerId !== null) return; 
      this.pointerId = e.pointerId; 
      this.element.setPointerCapture(this.pointerId);
      this.moved = false; 
      this.pressStart = performance.now();
      
      this.pressTimer = setTimeout(() => { 
        this.enterDim(); 
        this.setLevel(Math.max(this.level, 0.01)); 
      }, this.options.longPressMs);
    });
    
    this.element.addEventListener('pointermove', (e) => {
      if (this.pointerId !== e.pointerId) return;
      if (!this.moved && Math.abs(e.movementY) + Math.abs(e.movementX) > 3) this.moved = true;
      
      if (this.dimming) {
        const v = this.yToLevel(e.clientY);
        this.setLevel(v);
      }
    });
    
    const endPointer = (e) => {
      if (this.pointerId !== e.pointerId) return;
      clearTimeout(this.pressTimer); 
      this.pressTimer = null;
      const elapsed = performance.now() - this.pressStart;
      
      if (!this.dimming && !this.moved && elapsed < this.options.longPressMs) {
        this.toggle();
      } else if (this.dimming) {
        // Keep the actual dimmed level, don't snap to 0 or 1
        // Only snap to 0 if level is very low (essentially off)
        const finalLevel = this.level <= 0.02 ? 0 : this.level;
        this.setLevel(finalLevel, {commit: true});
        this.exitDim({commit: true});
      }
      
      this.element.releasePointerCapture(this.pointerId);
      this.pointerId = null;
    };
    
    this.element.addEventListener('pointerup', endPointer);
    this.element.addEventListener('pointercancel', endPointer);
    this.element.addEventListener('lostpointercapture', () => { 
      clearTimeout(this.pressTimer); 
    });
    
    this.element.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { 
        e.preventDefault(); 
        this.toggle(); 
      }
      if (e.key === 'ArrowUp')  { 
        e.preventDefault(); 
        this.enterDim(); 
        this.setLevel(Math.min(1, this.level + 0.05), {commit: true}); 
        this.exitDim({commit: true, fade: false}); 
      }
      if (e.key === 'ArrowDown'){ 
        e.preventDefault(); 
        this.enterDim(); 
        this.setLevel(Math.max(0, this.level - 0.05), {commit: true}); 
        this.exitDim({commit: true, fade: false}); 
      }
    });
  }
  
  // Update from external state changes
  updateFromState(attributes) {
    if (!attributes) return;
    
    // Don't update if currently dimming (user is actively interacting)
    if (this.dimming) {
      return;
    }
    
    // Don't update if device is locked (recent user interaction)
    if (window.deviceStateManager && window.deviceStateManager.isLocked(this.deviceId)) {
      return;
    }
    
    // Special handling for "All" paddle switch
    if (this.deviceId === 'all') {
      // For the "All" switch, we need to check multiple device states
      // This will be handled by updatePaddleSwitch2UI in main.js
      return;
    }
    
    const level = Number(attributes.level || 0);
    const isOn = attributes.switch === 'on' || attributes.groupState === 'on' || attributes.groupState === 'allOn';
    
    const normalizedLevel = isOn ? Math.max(level / 100, 0.01) : 0;
    
    // Only update if the change is significant (avoid micro-adjustments)
    if (Math.abs(this.level - normalizedLevel) > 0.02) {
      this.setLevel(normalizedLevel);
    }
  }
}

// Initialize paddle switches when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Initialize left paddle switch (Lights - BedroomLifxGOG)
  const paddleSwitch1 = document.getElementById('paddleSwitch');
  if (paddleSwitch1) {
    window.paddleSwitch1 = new PaddleSwitch(paddleSwitch1, window.BEDROOM_GROUP_ID || '457');
  }
  
  // Initialize right paddle switch (All devices)
  const paddleSwitch2 = document.getElementById('paddleSwitch2');
  if (paddleSwitch2) {
    window.paddleSwitch2 = new PaddleSwitch(paddleSwitch2, 'all');
  }
});

// Export for global use
window.PaddleSwitch = PaddleSwitch;
