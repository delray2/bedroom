(function(){
  function maskToken(token){
    if (!token) return 'Not set';
    const clean = String(token);
    if (clean.length <= 6) return clean.replace(/./g, '•');
    const visible = clean.slice(-4);
    return `${'•'.repeat(clean.length - 4)}${visible}`;
  }

  function stringifyMap(map){
    if (!map || typeof map !== 'object') return '';
    try {
      return JSON.stringify(map, null, 2);
    } catch (err) {
      console.warn('Unable to stringify custom device map', err);
      return '';
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const store = window.configStore;
    const apiService = window.apiService;

    const form = document.getElementById('settingsForm');
    const statusBanner = document.getElementById('statusBanner');
    const summaryList = document.getElementById('configSummary');

    if (!store || !form || !statusBanner || !summaryList) {
      if (statusBanner) {
        statusBanner.textContent = 'Configuration store failed to load. Reload this page.';
        statusBanner.className = 'status-banner visible error';
      }
      return;
    }

    const makerApiBaseInput = document.getElementById('makerApiBase');
    const accessTokenInput = document.getElementById('accessToken');
    const bedroomGroupIdInput = document.getElementById('bedroomGroupId');
    const bedroomFan2IdInput = document.getElementById('bedroomFan2Id');
    const bedroomGroupSelect = document.getElementById('bedroomGroupSelect');
    const bedroomFan2Select = document.getElementById('bedroomFan2Select');
    const deviceSuggestions = document.getElementById('deviceSuggestions');
    const deviceMapInput = document.getElementById('deviceMap');
    const copyConfigBtn = document.getElementById('copyConfig');
    const resetDefaultsBtn = document.getElementById('resetDefaults');
    const discoverDevicesBtn = document.getElementById('discoverDevices');
    const discoveryStatusEl = document.getElementById('discoveryStatus');
    const discoveryResultsEl = document.getElementById('discoveryResults');

    let knownDevices = [];

    function showStatus(message, type){
      statusBanner.textContent = message;
      statusBanner.className = `status-banner visible ${type}`;
    }

    function setDiscoveryStatus(message, type){
      if (!discoveryStatusEl) return;
      discoveryStatusEl.textContent = message || '';
      discoveryStatusEl.className = 'discovery-status';
      if (type) {
        discoveryStatusEl.classList.add(type);
      }
    }

    function populateForm(config){
      makerApiBaseInput.value = config.makerApiBase || '';
      accessTokenInput.value = config.accessToken || '';
      const ids = config.deviceIds || {};
      bedroomGroupIdInput.value = ids.bedroomGroupId || '';
      bedroomFan2IdInput.value = ids.bedroomFan2Id || '';
      deviceMapInput.value = stringifyMap(config.deviceMap);
    }

    function updateSummary(config){
      const ids = config.deviceIds || {};
      const deviceMap = config.deviceMap && typeof config.deviceMap === 'object'
        ? config.deviceMap
        : null;
      const mapSummary = deviceMap
        ? `Custom map loaded (${Object.keys(deviceMap).length} entries)`
        : 'Using built-in defaults';
      const knownCount = Array.isArray(config.knownDevices) ? config.knownDevices.length : 0;

      summaryList.innerHTML = `
        <li><strong>Maker API base:</strong> ${config.makerApiBase || 'Not set'}</li>
        <li><strong>Access token:</strong> ${maskToken(config.accessToken)}</li>
        <li><strong>Bedroom group ID:</strong> ${ids.bedroomGroupId || 'Not set'}</li>
        <li><strong>Bedroom fan 2 ID:</strong> ${ids.bedroomFan2Id || 'Not set'}</li>
        <li><strong>Device map:</strong> ${mapSummary}</li>
        <li><strong>Cached devices:</strong> ${knownCount ? `${knownCount} discovered` : 'None cached'}</li>
        <li><strong>Storage key:</strong> ${store.storageKey}</li>
      `;
    }

    function getFormValues(){
      const makerApiBase = makerApiBaseInput.value.trim();
      const accessToken = accessTokenInput.value.trim();
      const bedroomGroupId = bedroomGroupIdInput.value.trim();
      const bedroomFan2Id = bedroomFan2IdInput.value.trim();
      const deviceMapRaw = deviceMapInput.value.trim();

      if (!makerApiBase || !accessToken || !bedroomGroupId || !bedroomFan2Id) {
        throw new Error('All required fields must be filled in.');
      }

      let deviceMap = null;
      if (deviceMapRaw) {
        try {
          const parsed = JSON.parse(deviceMapRaw);
          if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            throw new Error('Device map must be a JSON object keyed by device IDs.');
          }
          deviceMap = parsed;
        } catch (err) {
          throw new Error(`Invalid device map JSON: ${err.message}`);
        }
      }

      return {
        makerApiBase,
        accessToken,
        deviceIds: {
          bedroomGroupId,
          bedroomFan2Id
        },
        deviceMap
      };
    }

    function updateDeviceSuggestions(devices){
      if (!deviceSuggestions) return;
      deviceSuggestions.innerHTML = '';
      devices.forEach((device) => {
        const option = document.createElement('option');
        option.value = device.id;
        const label = `${device.label} (#${device.id})`;
        option.label = label;
        option.textContent = label;
        deviceSuggestions.appendChild(option);
      });
    }

    function populateSelect(select, selectedValue){
      if (!select) return;
      const placeholder = select.dataset.placeholder || 'Select from discovery';
      select.innerHTML = '';
      const placeholderOption = document.createElement('option');
      placeholderOption.value = '';
      placeholderOption.textContent = placeholder;
      select.appendChild(placeholderOption);

      knownDevices.forEach((device) => {
        const option = document.createElement('option');
        option.value = device.id;
        option.textContent = `${device.label} (#${device.id})`;
        select.appendChild(option);
      });

      if (selectedValue) {
        const normalized = String(selectedValue);
        const exists = knownDevices.some((device) => device.id === normalized);
        if (exists) {
          select.value = normalized;
        } else {
          const fallback = document.createElement('option');
          fallback.value = normalized;
          fallback.textContent = `Saved value: ${normalized}`;
          fallback.selected = true;
          fallback.dataset.missing = 'true';
          select.appendChild(fallback);
        }
      }
    }

    function populateRoleSelectors(config){
      const ids = config.deviceIds || {};
      populateSelect(bedroomGroupSelect, ids.bedroomGroupId || '');
      populateSelect(bedroomFan2Select, ids.bedroomFan2Id || '');
    }

    function renderDiscoveryResults(devices, config){
      if (!discoveryResultsEl) return;
      discoveryResultsEl.innerHTML = '';

      if (!devices.length) {
        const empty = document.createElement('p');
        empty.className = 'discovery-empty';
        empty.textContent = 'No devices discovered yet. Enter your Maker API details and click “Discover devices”.';
        discoveryResultsEl.appendChild(empty);
        return;
      }

      const table = document.createElement('table');
      table.className = 'discovery-table';
      const thead = document.createElement('thead');
      const headerRow = document.createElement('tr');
      ['Label', 'ID', 'Type', 'Capabilities'].forEach((heading) => {
        const th = document.createElement('th');
        th.textContent = heading;
        headerRow.appendChild(th);
      });
      thead.appendChild(headerRow);
      table.appendChild(thead);

      const tbody = document.createElement('tbody');
      const selectedIds = new Set(Object.values(config.deviceIds || {}).filter(Boolean).map(String));

      devices.forEach((device) => {
        const row = document.createElement('tr');
        if (selectedIds.has(device.id)) {
          row.classList.add('is-selected');
        }

        const labelCell = document.createElement('td');
        labelCell.textContent = device.label;
        row.appendChild(labelCell);

        const idCell = document.createElement('td');
        idCell.textContent = device.id;
        row.appendChild(idCell);

        const typeCell = document.createElement('td');
        typeCell.textContent = device.type || device.name || '—';
        row.appendChild(typeCell);

        const capabilitiesCell = document.createElement('td');
        capabilitiesCell.className = 'capability-cell';
        const capabilities = Array.isArray(device.capabilities) ? device.capabilities : [];
        if (capabilities.length) {
          const preview = capabilities.slice(0, 4).join(', ');
          capabilitiesCell.textContent = capabilities.length > 4 ? `${preview}, …` : preview;
        } else {
          capabilitiesCell.textContent = '—';
        }
        row.appendChild(capabilitiesCell);

        tbody.appendChild(row);
      });

      table.appendChild(tbody);
      discoveryResultsEl.appendChild(table);
    }

    function syncFromStore(options = {}){
      const { updateForm = false, showDiscoveryHint = false } = options;
      const config = store.get();
      knownDevices = Array.isArray(config.knownDevices) ? config.knownDevices : [];

      if (updateForm) {
        populateForm(config);
      }

      updateSummary(config);
      updateDeviceSuggestions(knownDevices);
      populateRoleSelectors(config);
      renderDiscoveryResults(knownDevices, config);

      if (showDiscoveryHint) {
        if (knownDevices.length) {
          setDiscoveryStatus(`Loaded ${knownDevices.length} cached device${knownDevices.length === 1 ? '' : 's'}.`, 'info');
        } else {
          setDiscoveryStatus('No cached devices yet. Enter your Maker API details above and click “Discover devices”.', 'info');
        }
      }

      return config;
    }

    function highlightInput(input){
      if (!input) return;
      input.classList.add('field-updated');
      window.setTimeout(() => input.classList.remove('field-updated'), 1200);
    }

    function bindSelectToInput(select, input, label){
      if (!select || !input) return;
      select.addEventListener('change', () => {
        if (!select.value) return;
        input.value = select.value;
        highlightInput(input);
        const device = knownDevices.find((dev) => dev.id === select.value);
        const descriptor = device ? `${device.label} (#${device.id})` : `device ${select.value}`;
        setDiscoveryStatus(`${label} set to ${descriptor}. Remember to save your changes.`, 'info');
      });
    }

    syncFromStore({ updateForm: true, showDiscoveryHint: true });

    bindSelectToInput(bedroomGroupSelect, bedroomGroupIdInput, 'Bedroom lights group');
    bindSelectToInput(bedroomFan2Select, bedroomFan2IdInput, 'Bedroom fan 2');

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      try {
        const values = getFormValues();
        store.set(values);
        showStatus('Settings saved. Reload the dashboard to apply the changes.', 'success');
        syncFromStore({ updateForm: false });
      } catch (err) {
        console.error('Failed to save settings', err);
        showStatus(err.message || 'Failed to save settings.', 'error');
      }
    });

    if (copyConfigBtn) {
      copyConfigBtn.addEventListener('click', async () => {
        try {
          const config = store.get();
          await navigator.clipboard.writeText(JSON.stringify(config, null, 2));
          showStatus('Current configuration copied to clipboard.', 'success');
        } catch (err) {
          console.error('Clipboard copy failed', err);
          showStatus('Unable to copy to clipboard.', 'error');
        }
      });
    }

    if (resetDefaultsBtn) {
      resetDefaultsBtn.addEventListener('click', () => {
        const confirmation = window.confirm('Reset settings to defaults? This overwrites your saved Hubitat credentials.');
        if (!confirmation) return;
        store.reset();
        syncFromStore({ updateForm: true, showDiscoveryHint: true });
        showStatus('Settings reset to defaults. Reload the dashboard to use them.', 'success');
        setDiscoveryStatus('Discovery cache cleared. Run discovery again to refresh the device list.', 'info');
      });
    }

    if (discoverDevicesBtn) {
      discoverDevicesBtn.addEventListener('click', async () => {
        if (!apiService || typeof apiService.listDevices !== 'function') {
          setDiscoveryStatus('Device discovery is unavailable because the API service failed to load.', 'error');
          return;
        }

        const formBase = makerApiBaseInput.value.trim();
        const formToken = accessTokenInput.value.trim();
        const currentConfig = store.get();
        const makerApiBase = formBase || currentConfig.makerApiBase || '';
        const accessToken = formToken || currentConfig.accessToken || '';

        if (!makerApiBase || !accessToken) {
          setDiscoveryStatus('Enter your Maker API base URL and access token before discovering devices.', 'error');
          makerApiBaseInput.focus();
          return;
        }

        discoverDevicesBtn.disabled = true;
        setDiscoveryStatus('Discovering devices…', 'loading');

        try {
          const devices = await apiService.listDevices({ base: makerApiBase, token: accessToken });
          if (!Array.isArray(devices)) {
            throw new Error('Unexpected response format from Hubitat Maker API.');
          }

          store.set({ knownDevices: devices });
          const updatedConfig = syncFromStore({ updateForm: false });
          const count = Array.isArray(updatedConfig.knownDevices) ? updatedConfig.knownDevices.length : 0;
          if (count === 0) {
            setDiscoveryStatus('No devices were returned. Confirm your Maker API app has access to the devices you expect.', 'warning');
          } else {
            const timestamp = new Date();
            const formattedTime = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            setDiscoveryStatus(`Discovered ${count} device${count === 1 ? '' : 's'} at ${formattedTime}.`, 'success');
          }
        } catch (err) {
          console.error('Device discovery failed', err);
          setDiscoveryStatus(`Discovery failed: ${err.message || 'Unknown error.'}`, 'error');
        } finally {
          discoverDevicesBtn.disabled = false;
        }
      });
    }

    if (!apiService || typeof apiService.listDevices !== 'function') {
      if (discoverDevicesBtn) {
        discoverDevicesBtn.disabled = true;
      }
      setDiscoveryStatus('Device discovery is unavailable because the API service failed to load.', 'error');
    }

    window.addEventListener('config:updated', (event) => {
      const config = event?.detail || store.get();
      knownDevices = Array.isArray(config.knownDevices) ? config.knownDevices : [];
      updateSummary(config);
      updateDeviceSuggestions(knownDevices);
      populateRoleSelectors(config);
      renderDiscoveryResults(knownDevices, config);
    });
  });
})();
