// API Service for Hubitat device interactions with State Management Integration
const MAKER_API_BASE = 'http://192.168.4.44/apps/api/37';
const ACCESS_TOKEN = 'b9846a66-8bf8-457a-8353-fd16d511a0af';

const apiService = {
  async getDeviceStatus(deviceId) {
    try {
      const response = await fetch(`${MAKER_API_BASE}/devices/${deviceId}?access_token=${ACCESS_TOKEN}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const device = await response.json();
      
      // Update state manager with fresh data
      if (window.deviceStateManager) {
        const attributes = window.deviceStateManager.normalizeAttributes(device.attributes);
        window.deviceStateManager.updateDevice(deviceId, attributes);
      }
      
      return device;
    } catch (error) {
      console.error('Failed to fetch device status:', error);
      throw error;
    }
  },

  async sendDeviceCommand(deviceId, command, value) {
    try {
      let url = `${MAKER_API_BASE}/devices/${deviceId}/${command}`;
      if (value !== undefined) {
        url += `/${value}`;
      }
      url += `?access_token=${ACCESS_TOKEN}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      // Automatically refresh device state after command
      if (window.deviceStateManager) {
        // Small delay to allow Hubitat to process the command
        setTimeout(() => {
          this.refreshDeviceAfterCommand(deviceId);
        }, 500);
      }
      
      return result;
    } catch (error) {
      console.error('Failed to send device command:', error);
      throw error;
    }
  },

  async refreshDeviceAfterCommand(deviceId) {
    try {
      if (window.deviceStateManager) {
        await window.deviceStateManager.refreshDevice(deviceId);
      }
    } catch (error) {
      console.error('Failed to refresh device after command:', error);
    }
  },

  // Bulk refresh multiple devices
  async refreshMultipleDevices(deviceIds) {
    const promises = deviceIds.map(id => this.getDeviceStatus(id));
    try {
      await Promise.all(promises);
    } catch (error) {
      console.error('Failed to refresh multiple devices:', error);
    }
  },

  // Get device capabilities
  async getDeviceCapabilities(deviceId) {
    try {
      const response = await fetch(`${MAKER_API_BASE}/devices/${deviceId}/capabilities?access_token=${ACCESS_TOKEN}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch device capabilities:', error);
      throw error;
    }
  },

  // Send command to device group
  async sendGroupCommand(groupId, command, value) {
    try {
      let url = `${MAKER_API_BASE}/devices/${groupId}/${command}`;
      if (value !== undefined) {
        url += `/${value}`;
      }
      url += `?access_token=${ACCESS_TOKEN}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      // Refresh all devices in the group after command
      if (window.deviceStateManager) {
        setTimeout(() => {
          this.refreshGroupDevices(groupId);
        }, 1000);
      }
      
      return result;
    } catch (error) {
      console.error('Failed to send group command:', error);
      throw error;
    }
  },

  // Refresh all devices in a group
  async refreshGroupDevices(groupId) {
    try {
      // Get group members and refresh each one
      const groupResponse = await fetch(`${MAKER_API_BASE}/devices/${groupId}?access_token=${ACCESS_TOKEN}`);
      if (groupResponse.ok) {
        const group = await groupResponse.json();
        // Note: This would need to be implemented based on how Hubitat groups work
        // For now, we'll refresh the group itself
        if (window.deviceStateManager) {
          await window.deviceStateManager.refreshDevice(groupId);
        }
      }
    } catch (error) {
      console.error('Failed to refresh group devices:', error);
    }
  }
};

// Make available globally
window.apiService = apiService;

// Export for module use
export { apiService }; 