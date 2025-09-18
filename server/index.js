const path = require('path');
const { startBackend } = require('./backend');
const { getRuntimeConfig } = require('./config');

function main() {
  const config = getRuntimeConfig();
  const staticDir = path.resolve(__dirname, '..');
  const instance = startBackend({ config, staticDir });

  const shutdown = () => {
    console.log('Shutting down backend...');
    instance.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

if (require.main === module) {
  main();
}

module.exports = { main };
