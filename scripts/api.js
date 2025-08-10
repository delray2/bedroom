// API Service for Hubitat device interactions
const MAKER_API_BASE = 'http://192.168.4.44/apps/api/37';
const ACCESS_TOKEN = 'b9846a66-8bf8-457a-8353-fd16d511a0af';

const apiService = {
  async getDeviceStatus(deviceId) {
    try {
      const response = await fetch(`${MAKER_API_BASE}/devices/${deviceId}?access_token=${ACCESS_TOKEN}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
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
      return await response.json();
    } catch (error) {
      console.error('Failed to send device command:', error);
      throw error;
    }
  }
};

// Make available globally
window.apiService = apiService;

// Export for module use
export { apiService }; 