import { createServer } from 'node:http';
import { createApp } from './app.js';

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? '0.0.0.0';
if (!Number.isInteger(port) || port < 1 || port > 65_535) {
  throw new TypeError('PORT must be an integer between 1 and 65535');
}

const server = createServer(createApp());
server.listen(port, host, () => {
  process.stdout.write('task-api listening on ' + host + ':' + port + '\n');
});

function shutdown() {
  const forceClose = setTimeout(() => server.closeAllConnections(), 10_000);
  forceClose.unref();
  server.close((error) => {
    clearTimeout(forceClose);
    if (error) {
      process.stderr.write('graceful shutdown failed: ' + error.message + '\n');
      process.exitCode = 1;
    }
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
