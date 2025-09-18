(function(){
  const STORAGE_KEY = 'hubitatDashboardConfig';

  const DEFAULT_CONFIG = Object.freeze({
    makerApiBase: 'http://192.168.4.44/apps/api/37',
    accessToken: 'b9846a66-8bf8-457a-8353-fd16d511a0af',
    deviceIds: {
      bedroomGroupId: '457',
      bedroomFan2Id: '451'
    },
    deviceMap: null,
    knownDevices: []
  });

  const storage = (() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage;
      }
    } catch (err) {
      console.warn('Local storage unavailable for config persistence', err);
    }
    return null;
  })();

  function safeParse(json){
    if (!json) return {};
    try { return JSON.parse(json); }
    catch(err){
      console.warn('Failed to parse saved config, resetting to defaults', err);
      return {};
    }
  }

  function sanitizeKnownDevices(devices){
    if (!Array.isArray(devices)) return [];

    const unique = new Map();
    devices.forEach((device) => {
      if (!device || typeof device !== 'object') return;
      const id = device.id != null ? String(device.id).trim() : '';
      if (!id) return;
      const labelSource = device.label || device.name || `Device ${id}`;
      const label = String(labelSource).trim() || `Device ${id}`;
      const type = device.type != null ? String(device.type) : '';
      const name = device.name != null ? String(device.name) : '';
      const capabilities = Array.isArray(device.capabilities)
        ? device.capabilities.map((cap) => String(cap)).filter(Boolean)
        : [];

      unique.set(id, {
        id,
        label,
        name,
        type,
        capabilities
      });
    });

    return Array.from(unique.values()).sort((a, b) => {
      return a.label.localeCompare(b.label, undefined, { sensitivity: 'base' });
    });
  }

  function normalizeConfig(raw){
    if (!raw || typeof raw !== 'object') {
      return {
        makerApiBase: DEFAULT_CONFIG.makerApiBase,
        accessToken: DEFAULT_CONFIG.accessToken,
        deviceIds: { ...DEFAULT_CONFIG.deviceIds },
        deviceMap: DEFAULT_CONFIG.deviceMap,
        knownDevices: [...DEFAULT_CONFIG.knownDevices]
      };
    }
    const normalized = {
      makerApiBase: raw.makerApiBase || DEFAULT_CONFIG.makerApiBase,
      accessToken: raw.accessToken || DEFAULT_CONFIG.accessToken,
      deviceIds: {
        ...DEFAULT_CONFIG.deviceIds,
        ...(typeof raw.deviceIds === 'object' && raw.deviceIds ? raw.deviceIds : {})
      },
      deviceMap: raw.deviceMap && typeof raw.deviceMap === 'object' ? raw.deviceMap : DEFAULT_CONFIG.deviceMap,
      knownDevices: sanitizeKnownDevices(raw.knownDevices)
    };
    return normalized;
  }

  let currentConfig = normalizeConfig(storage ? safeParse(storage.getItem(STORAGE_KEY)) : null);

  function persist(config){
    if (!storage) return;
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch (err) {
      console.error('Failed to persist Hubitat config', err);
    }
  }

  function applyGlobals(){
    const knownDevices = currentConfig.knownDevices
      ? currentConfig.knownDevices.map((device) => ({
        ...device,
        capabilities: Array.isArray(device.capabilities) ? [...device.capabilities] : []
      }))
      : [];

    window.CONFIG = {
      ...currentConfig,
      deviceIds: { ...currentConfig.deviceIds },
      deviceMap: currentConfig.deviceMap ? { ...currentConfig.deviceMap } : null,
      knownDevices
    };
    window.MAKER_API_BASE = currentConfig.makerApiBase;
    window.ACCESS_TOKEN = currentConfig.accessToken;
    window.KNOWN_DEVICES = knownDevices;
    window.dispatchEvent(new CustomEvent('config:updated', { detail: window.CONFIG }));
  }

  function setConfig(partial){
    if (!partial || typeof partial !== 'object') return window.CONFIG;
    currentConfig = normalizeConfig({ ...currentConfig, ...partial });
    persist(currentConfig);
    applyGlobals();
    return window.CONFIG;
  }

  function replaceConfig(next){
    if (!next || typeof next !== 'object') return window.CONFIG;
    currentConfig = normalizeConfig(next);
    persist(currentConfig);
    applyGlobals();
    return window.CONFIG;
  }

  function reset(){
    currentConfig = normalizeConfig(DEFAULT_CONFIG);
    persist(currentConfig);
    applyGlobals();
    return window.CONFIG;
  }

  applyGlobals();

  window.configStore = {
    get(){
      return window.CONFIG;
    },
    set(partial){
      return setConfig(partial);
    },
    replace(next){
      return replaceConfig(next);
    },
    reset(){
      return reset();
    },
    defaults: DEFAULT_CONFIG,
    storageKey: STORAGE_KEY
  };
})();
