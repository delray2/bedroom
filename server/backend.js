const path = require('path');
const express = require('express');
const { WebSocketServer } = require('ws');
const compression = require('compression');
const { getRuntimeConfig, writeClientConfig } = require('./config');

function createWebSocketServer(config) {
  const host = config.websocketHost || config.backendHost || '0.0.0.0';
  const port = config.websocketPort || 4712;
  const wss = new WebSocketServer({ host, port });

  wss.on('connection', socket => {
    socket.on('error', err => {
      console.error('WebSocket client error', err);
    });
  });

  function broadcast(data) {
    if (!data) return;
    const payload = typeof data === 'string' ? data : JSON.stringify(data);
    for (const client of wss.clients) {
      if (client.readyState === 1) {
        try {
          client.send(payload);
        } catch (error) {
          console.error('Failed to broadcast to client', error);
        }
      }
    }
  }

  return { wss, broadcast };
}

function startBackend(options = {}) {
  const config = options.config ? { ...options.config } : getRuntimeConfig(options.overrides);
  const staticDir = options.staticDir || path.resolve(__dirname, '..');

  writeClientConfig(config, options.clientConfigPath);

  const app = express();
  app.use(compression());
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));

  const { wss, broadcast } = createWebSocketServer(config);

  app.use((req, res, next) => {
    try {
      const raw = [
        req.originalUrl || '',
        JSON.stringify(req.body || {}),
        JSON.stringify(req.query || {}),
        JSON.stringify(req.headers || {}),
      ].join(' ').toLowerCase();
      if (raw.includes('reolink')) {
        broadcast({
          type: 'reolink_webhook',
          note: 'Detected keyword reolink in incoming request',
          url: req.originalUrl,
        });
      }
    } catch (error) {
      console.error('Webhook keyword detection failed', error);
    }
    next();
  });

  app.post('/api/hubitat/webhook', (req, res) => {
    try {
      let deviceId;
      let attributes = {};

      if (req.body && typeof req.body === 'object' && req.body.content) {
        const content = req.body.content;
        deviceId = content.deviceId;
        if (content.name && content.value !== undefined) {
          attributes[content.name] = content.value;
        }
      } else if (req.body && typeof req.body === 'object') {
        deviceId = req.body.deviceId;
        attributes = req.body.attributes || {};
        const name = req.body.name;
        const value = req.body.value ?? req.body.currentValue;
        if (name && value !== undefined) {
          attributes[name] = value;
        }
      }

      if (deviceId) {
        const payload = {
          type: 'device_state_update',
          deviceId: String(deviceId),
          attributes,
          event: 'attribute_change',
          timestamp: Date.now(),
        };
        broadcast(payload);
      }

      res.sendStatus(200);
    } catch (error) {
      console.error('Error processing Hubitat webhook', error);
      res.sendStatus(500);
    }
  });

  app.post('/api/notify', (req, res) => {
    const content = req.body?.content || req.body || {};

    if (content.deviceId) {
      broadcast({
        type: 'device_notification',
        payload: content,
        timestamp: Date.now(),
      });
    } else if (content.type === 'lrgroup_update') {
      broadcast({
        type: 'lrgroup_update',
        payload: content,
        timestamp: Date.now(),
      });
    } else {
      broadcast({
        type: 'general_notification',
        payload: content,
        timestamp: Date.now(),
      });
    }

    res.sendStatus(200);
  });

  app.post('/api/refresh-device/:deviceId', (req, res) => {
    try {
      const { deviceId } = req.params;
      broadcast({
        type: 'device_refresh_request',
        deviceId: String(deviceId),
        timestamp: Date.now(),
      });
      res.json({ success: true, message: `Refresh requested for device ${deviceId}` });
    } catch (error) {
      console.error('Error requesting device refresh', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/refresh-devices', (req, res) => {
    try {
      const ids = Array.isArray(req.body?.deviceIds) ? req.body.deviceIds.map(String) : null;
      if (!ids) {
        res.status(400).json({ error: 'deviceIds must be an array' });
        return;
      }
      broadcast({
        type: 'bulk_device_refresh_request',
        deviceIds: ids,
        timestamp: Date.now(),
      });
      res.json({ success: true, message: `Refresh requested for ${ids.length} devices` });
    } catch (error) {
      console.error('Error requesting bulk device refresh', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: Date.now(),
      websocketClients: wss.clients.size,
    });
  });

  const staticCacheMs = 1000 * 60 * 10; // 10 minutes
  app.use('/config', express.static(path.join(staticDir, 'config'), { maxAge: staticCacheMs }));
  app.use(express.static(staticDir, { maxAge: staticCacheMs, extensions: ['html'] }));

  app.get('/', (req, res) => {
    res.sendFile(path.join(staticDir, 'index.html'));
  });

  const server = app.listen(config.backendPort, config.backendHost, () => {
    console.log(`Backend listening on http://${config.backendHost}:${config.backendPort}`);
    console.log(`WebSocket server on ws://${config.websocketHost || config.backendHost}:${config.websocketPort}`);
  });

  function stop() {
    try {
      server.close();
    } catch (error) {
      console.error('Error closing HTTP server', error);
    }
    try {
      wss.close();
    } catch (error) {
      console.error('Error closing WebSocket server', error);
    }
  }

  return { app, server, config, wss, broadcast, stop };
}

module.exports = { startBackend };
