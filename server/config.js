const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const projectRoot = path.resolve(__dirname, '..');

// Load environment variables from local .env if present
const envPath = path.join(projectRoot, '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

function toNumber(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getRuntimeConfig(overrides = {}) {
  const cfg = {
    backendHost: process.env.BACKEND_HOST || '0.0.0.0',
    backendPort: toNumber(process.env.BACKEND_PORT, 4711),
    backendProtocol: process.env.BACKEND_PROTOCOL || 'http',
    websocketHost: process.env.WEBSOCKET_HOST || process.env.BACKEND_HOST || '0.0.0.0',
    websocketPort: toNumber(process.env.WEBSOCKET_PORT, 4712),
    websocketProtocol: process.env.WEBSOCKET_PROTOCOL || '',
    publicHost: process.env.PUBLIC_HOST || '',
    makerApiBase: process.env.MAKER_API_BASE || 'http://192.168.4.44/apps/api/37',
    accessToken: process.env.ACCESS_TOKEN || 'b9846a66-8bf8-457a-8353-fd16d511a0af',
    go2rtcUrl: process.env.GO2RTC_URL || 'http://192.168.4.145:1984',
    homeAssistantUrl: process.env.HOME_ASSISTANT_URL || 'http://192.168.4.145:8123',
    homeAssistantToken: process.env.HOME_ASSISTANT_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJhNzU0MDhhNTYxYmQ0NTVjOTA3NTFmZDg0OTQ2MzMzOCIsImlhdCI6MTc1NTE5OTg1NywiZXhwIjoyMDcwNTU5ODU3fQ.NMPxvnz0asFM66pm7LEH80BIGR9dU8pj6IZEX5v3WB4',
    wledBedroom1: process.env.WLED_BEDROOM1 || '192.168.4.137',
    wledBedroom2: process.env.WLED_BEDROOM2 || '192.168.4.52'
  };

  return { ...cfg, ...overrides };
}

function buildClientConfig(config) {
  const backendProtocol = config.backendProtocol || 'http';
  const publicHost = config.publicHost || '';
  const rawBackendHost = publicHost || config.backendHost || 'localhost';
  const backendHost = (rawBackendHost === '0.0.0.0' || rawBackendHost === '::') ? 'localhost' : rawBackendHost;
  const backendPort = config.backendPort || 4711;

  const backendBaseUrl = config.backendBaseUrl
    || `${backendProtocol}://${backendHost}${backendPort ? `:${backendPort}` : ''}`;

  const wsProtocol = config.websocketProtocol
    || (backendProtocol === 'https' ? 'wss' : 'ws');
  const rawWsHost = publicHost || config.websocketHost || backendHost;
  const wsHost = (rawWsHost === '0.0.0.0' || rawWsHost === '::') ? backendHost : rawWsHost;
  const wsPort = config.websocketPort || 4712;
  const websocketUrl = config.websocketUrl
    || `${wsProtocol}://${wsHost}${wsPort ? `:${wsPort}` : ''}`;

  return {
    makerApiBase: config.makerApiBase,
    accessToken: config.accessToken,
    backendBaseUrl,
    websocketUrl,
    go2rtcUrl: config.go2rtcUrl,
    homeAssistantUrl: config.homeAssistantUrl,
    homeAssistantToken: config.homeAssistantToken,
    wledDevices: {
      bedroom1: config.wledBedroom1,
      bedroom2: config.wledBedroom2,
    },
  };
}

function writeClientConfig(config, destination) {
  const targetPath = destination || path.join(projectRoot, 'config', 'runtime-config.js');
  const clientConfig = buildClientConfig(config);
  const contents = `window.CONFIG = Object.assign({}, window.CONFIG || {}, ${JSON.stringify(clientConfig, null, 2)});\n`;
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, contents);
  return targetPath;
}

module.exports = {
  getRuntimeConfig,
  buildClientConfig,
  writeClientConfig,
};
