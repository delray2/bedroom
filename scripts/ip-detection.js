/**
 * IP Detection Service
 * Automatically detects the host machine's IP address and provides dynamic URL generation
 */

(function() {
  'use strict';

  class IPDetectionService {
    constructor() {
      this.detectedIP = null;
      this.isDetecting = false;
      this.listeners = [];
      this.fallbackIP = '192.168.4.203'; // Default fallback
      this.detectionTimeout = 5000; // 5 second timeout
      
      // Start detection immediately
      this.detectIP();
    }

    /**
     * Detect the host machine's IP address
     */
    async detectIP() {
      if (this.isDetecting) return;
      
      this.isDetecting = true;
      console.log('🔍 Starting IP detection...');

      try {
        // Method 1: Try to get IP from current window location (fastest, no SSL issues)
        const locationIP = await this.getLocationIP();
        if (locationIP) {
          this.setDetectedIP(locationIP);
          return;
        }

        // Method 2: Try WebRTC to get local IP (no SSL issues)
        const webrtcIP = await this.getWebRTCIP();
        if (webrtcIP) {
          this.setDetectedIP(webrtcIP);
          return;
        }

        // Method 3: Try to get IP from network info endpoint (may have SSL issues)
        const networkIP = await this.getNetworkInfoIP();
        if (networkIP) {
          this.setDetectedIP(networkIP);
          return;
        }

        // Fallback to default
        console.warn('⚠️ Could not detect IP, using fallback:', this.fallbackIP);
        this.setDetectedIP(this.fallbackIP);

      } catch (error) {
        console.error('❌ IP detection failed:', error);
        this.setDetectedIP(this.fallbackIP);
      } finally {
        this.isDetecting = false;
      }
    }

    /**
     * Try to get IP from network info endpoint
     */
    async getNetworkInfoIP() {
      try {
        // Try HTTP first (no SSL issues)
        const fallbackIP = this.fallbackIP;
        const response = await fetch(`http://${fallbackIP}:8081/api/network-info`, {
          method: 'GET',
          mode: 'cors',
          credentials: 'omit'
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('📡 Got IP from HTTP network info endpoint:', data.ip);
          return data.ip;
        }
      } catch (error) {
        console.log('HTTP network info endpoint not available:', error.message);
      }
      
      // Try HTTPS as fallback (may fail due to SSL cert issues)
      try {
        const fallbackIP = this.fallbackIP;
        const response = await fetch(`https://${fallbackIP}:8081/api/network-info`, {
          method: 'GET',
          mode: 'cors',
          credentials: 'omit'
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('📡 Got IP from HTTPS network info endpoint:', data.ip);
          return data.ip;
        }
      } catch (error) {
        console.log('HTTPS network info endpoint not available (SSL cert issue):', error.message);
      }
      
      return null;
    }

    /**
     * Use WebRTC to get local IP address
     */
    async getWebRTCIP() {
      return new Promise((resolve) => {
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });

        pc.createDataChannel('');
        
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            const candidate = event.candidate.candidate;
            const ipMatch = candidate.match(/([0-9]{1,3}(\.[0-9]{1,3}){3})/);
            if (ipMatch) {
              const ip = ipMatch[1];
              // Accept private IPs for local network (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
              if (ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
                console.log('🌐 Got IP from WebRTC:', ip);
                pc.close();
                resolve(ip);
              }
            }
          }
        };

        pc.onicegatheringstatechange = () => {
          if (pc.iceGatheringState === 'complete') {
            pc.close();
            resolve(null);
          }
        };

        pc.createOffer().then(offer => pc.setLocalDescription(offer)).catch(() => {
          pc.close();
          resolve(null);
        });

        // Timeout after 3 seconds
        setTimeout(() => {
          pc.close();
          resolve(null);
        }, 3000);
      });
    }

    /**
     * Try to detect IP from current location
     */
    async getLocationIP() {
      try {
        // Try to get IP from current window location
        if (window.location && window.location.hostname) {
          const hostname = window.location.hostname;
          // If we're accessing via IP address, use that
          if (hostname.match(/^[0-9]{1,3}(\.[0-9]{1,3}){3}$/)) {
            console.log('🌍 Got IP from window location:', hostname);
            return hostname;
          }
        }
        return null;
      } catch (error) {
        return null;
      }
    }

    /**
     * Check if IP is private/local
     */
    isPrivateIP(ip) {
      const privateRanges = [
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^192\.168\./,
    /^127\./,
    /^169\.254\./,
    /^::1$/,
    /^fe80:/
      ];
      
      return privateRanges.some(range => range.test(ip));
    }

    /**
     * Set the detected IP and notify listeners
     */
    setDetectedIP(ip) {
      const oldIP = this.detectedIP;
      this.detectedIP = ip;
      
      console.log('✅ IP Detection Complete:', {
        detected: ip,
        previous: oldIP,
        changed: oldIP !== ip
      });

      // Update environment variables if possible
      this.updateEnvironmentVariables(ip);

      // Notify all listeners
      this.notifyListeners({
        newIP: ip,
        oldIP: oldIP,
        changed: oldIP !== ip,
        timestamp: Date.now()
      });

      // Dispatch network change event
      window.dispatchEvent(new CustomEvent('networkChanged', {
        detail: {
          newIP: ip,
          oldIP: oldIP,
          changed: oldIP !== ip,
          timestamp: Date.now()
        }
      }));
    }

    /**
     * Update environment variables (if running in Electron)
     */
    updateEnvironmentVariables(ip) {
      try {
        // Try to update the .env file or environment
        if (typeof process !== 'undefined' && process.env) {
          process.env.DETECTED_HOST_IP = ip;
          console.log('📝 Updated process.env.DETECTED_HOST_IP:', ip);
        }
        
        // Also try to update the .env file directly
        this.updateEnvFile(ip);
      } catch (error) {
        console.log('Could not update environment variables:', error.message);
      }
    }

    /**
     * Update the .env file with detected IP
     */
    async updateEnvFile(ip) {
      try {
        // This would require Node.js fs module, which isn't available in browser
        // But we can store it in localStorage for frontend use
        localStorage.setItem('detected_host_ip', ip);
        console.log('💾 Stored detected IP in localStorage:', ip);
      } catch (error) {
        console.log('Could not update .env file:', error.message);
      }
    }

    /**
     * Get the current detected IP
     */
    getCurrentIP() {
      return this.detectedIP || this.fallbackIP;
    }

    /**
     * Get authentication URLs for Spotify
     */
    getAuthURLs() {
      const ip = this.getCurrentIP();
      return {
        login: `https://${ip}:4711/auth/login`,
        callback: `https://${ip}:4711/oauth/callback`,
        token: `https://${ip}:4711/auth/token`,
        base: `https://${ip}:4711`,
        // Legacy property names for compatibility
        loginEndpoint: `https://${ip}:4711/auth/login`,
        tokenEndpoint: `https://${ip}:4711/auth/token`,
        devicesEndpoint: `https://${ip}:4711/devices`,
        transferEndpoint: `https://${ip}:4711/devices/transfer`
      };
    }

    /**
     * Get WebSocket URL
     */
    getWebSocketURL() {
      const ip = this.getCurrentIP();
      return `ws://${ip}:4712`;
    }

    /**
     * Get API notification URL
     */
    getNotificationURL() {
      const ip = this.getCurrentIP();
      return `https://${ip}:4711/api/notify`;
    }

    /**
     * Get Spotify iframe URL
     */
    getSpotifyIframeURL() {
      const ip = this.getCurrentIP();
      return `https://${ip}:8081`;
    }

    /**
     * Add a listener for IP changes
     */
    addListener(callback) {
      this.listeners.push(callback);
    }

    /**
     * Remove a listener
     */
    removeListener(callback) {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    }

    /**
     * Notify all listeners of IP changes
     */
    notifyListeners(changeData) {
      this.listeners.forEach(callback => {
        try {
          callback(changeData);
        } catch (error) {
          console.error('Error in IP change listener:', error);
        }
      });
    }

    /**
     * Force re-detection of IP
     */
    async redetect() {
      console.log('🔄 Forcing IP re-detection...');
      await this.detectIP();
    }

    /**
     * Wait for IP detection to complete
     */
    async waitForDetection(timeout = 5000) {
      return new Promise((resolve) => {
        if (this.detectedIP) {
          resolve(this.detectedIP);
          return;
        }
        
        const startTime = Date.now();
        const checkInterval = setInterval(() => {
          if (this.detectedIP) {
            clearInterval(checkInterval);
            resolve(this.detectedIP);
          } else if (Date.now() - startTime > timeout) {
            clearInterval(checkInterval);
            console.warn('IP detection timeout, using fallback');
            resolve(this.fallbackIP);
          }
        }, 100);
      });
    }

    /**
     * Get network status information
     */
    getNetworkStatus() {
      return {
        detectedIP: this.detectedIP,
        fallbackIP: this.fallbackIP,
        isDetecting: this.isDetecting,
        listeners: this.listeners.length,
        timestamp: Date.now()
      };
    }
  }

  // Create global instance
  window.ipDetection = new IPDetectionService();

  // Expose for debugging
  window.debugIPDetection = () => {
    console.log('IP Detection Status:', window.ipDetection.getNetworkStatus());
    console.log('Current IP:', window.ipDetection.getCurrentIP());
    console.log('Auth URLs:', window.ipDetection.getAuthURLs());
  };

  // Force immediate IP detection for testing
  window.forceIPDetection = async () => {
    console.log('🔄 Forcing IP detection...');
    await window.ipDetection.redetect();
    console.log('✅ IP detection complete:', window.ipDetection.getCurrentIP());
  };

  // Check if running in Electron and handle SSL issues
  window.checkElectronSSL = () => {
    const isElectron = window.navigator.userAgent.toLowerCase().includes('electron');
    if (isElectron) {
      console.log('🔒 Running in Electron - SSL certificate issues may occur');
      console.log('💡 To bypass SSL issues, you can:');
      console.log('   1. Accept the certificate in the browser');
      console.log('   2. Use HTTP URLs for development');
      console.log('   3. Install proper SSL certificates');
    }
    return isElectron;
  };

  console.log('🚀 IP Detection Service initialized');
  
  // Log initial status
  setTimeout(() => {
    console.log('📊 IP Detection Status:', window.ipDetection.getNetworkStatus());
    window.checkElectronSSL();
  }, 1000);

})();