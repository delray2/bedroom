// Standardized Hubitat Maker API service (unified commands)
(function(){
  const BASE  = () => (window.CONFIG?.HUBITAT?.BASE_URL || window.MAKER_API_BASE);
  const TOKEN = () => (window.CONFIG?.HUBITAT?.ACCESS_TOKEN || window.ACCESS_TOKEN);

  async function httpJson(url, options = {}){
    const res = await fetch(url, options);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    try { return await res.json(); } catch { return null; }
  }

  async function getDevice(deviceId){
    // Use CONFIG helper if available
    if (window.CONFIG?.HUBITAT?.deviceStatusUrl) {
      return httpJson(window.CONFIG.HUBITAT.deviceStatusUrl(deviceId));
    }
    const url = `${BASE()}/devices/${deviceId}?access_token=${TOKEN()}`;
    return httpJson(url);
  }

  async function sendDeviceCommand(deviceId, command, ...args){
    // Use CONFIG helper if available
    if (window.CONFIG?.HUBITAT?.deviceCommandUrl) {
      const value = args.length > 0 ? args[0] : null;
      return httpJson(window.CONFIG.HUBITAT.deviceCommandUrl(deviceId, command, value), { method: 'POST' });
    }
    const encoded = args.filter(v => v != null).map(String).map(encodeURIComponent).join('/');
    const url = `${BASE()}/devices/${deviceId}/${command}${encoded?`/${encoded}`:''}?access_token=${TOKEN()}`;
    return httpJson(url, { method: 'POST' });
  }

  window.apiService = { getDevice, sendDeviceCommand };
})(); 