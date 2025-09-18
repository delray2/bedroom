// Standardized Hubitat Maker API service (unified commands)
(function(){
  const BASE  = () => (window.CONFIG?.makerApiBase || window.MAKER_API_BASE);
  const TOKEN = () => (window.CONFIG?.accessToken  || window.ACCESS_TOKEN);

  function resolveBase(override){
    const candidate = override != null && String(override).trim()
      ? String(override).trim()
      : BASE();
    if (!candidate) {
      throw new Error('Hubitat Maker API base URL is not configured.');
    }
    return candidate.replace(/\/+$/, '');
  }

  function resolveToken(override){
    const candidate = override != null && String(override).trim()
      ? String(override).trim()
      : TOKEN();
    if (!candidate) {
      throw new Error('Hubitat Maker API access token is not configured.');
    }
    return candidate;
  }

  async function httpJson(url, options = {}){
    let response;
    try {
      response = await fetch(url, options);
    } catch (err) {
      throw new Error(`Network error: ${err.message}`);
    }

    if (!response.ok) {
      let detail = '';
      try {
        const text = await response.text();
        if (text) {
          detail = `: ${text.slice(0, 140)}`;
        }
      } catch (err) {
        console.warn('Unable to read error response body', err);
      }
      throw new Error(`HTTP ${response.status}${detail}`);
    }

    const text = await response.text();
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch (err) {
      console.warn('Expected JSON response but received plain text', err);
      return text;
    }
  }

  async function getDevice(deviceId){
    const url = `${resolveBase()}/devices/${deviceId}?access_token=${encodeURIComponent(resolveToken())}`;
    return httpJson(url);
  }

  async function sendDeviceCommand(deviceId, command, ...args){
    const encoded = args.filter(v => v != null).map(String).map(encodeURIComponent).join('/');
    const url = `${resolveBase()}/devices/${deviceId}/${command}${encoded?`/${encoded}`:''}?access_token=${encodeURIComponent(resolveToken())}`;
    return httpJson(url, { method: 'POST' });
  }

  async function listDevices(options = {}){
    const base = resolveBase(options.base);
    const token = resolveToken(options.token);
    const url = `${base}/devices?access_token=${encodeURIComponent(token)}`;
    const fetchOptions = options.fetchOptions && typeof options.fetchOptions === 'object'
      ? options.fetchOptions
      : {};
    return httpJson(url, { cache: 'no-store', ...fetchOptions });
  }

  window.apiService = { getDevice, sendDeviceCommand, listDevices };
})();
