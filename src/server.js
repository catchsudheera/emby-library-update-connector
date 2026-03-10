/**
 * Fastify server - mirrors Java Spring Boot application
 * Emby Library Update Connector
 */

const fastify = require('fastify');
const { config, validateConfig, logConfig } = require('./config');
const embyService = require('./embyService');

function buildApp(opts = {}) {
  const app = fastify({
    logger: opts.logger !== false,
    ...opts,
  });

  // Add content type parser for text/plain to match Spring Boot behavior
  // Spring Boot accepts text/plain and parses it as JSON
  app.addContentTypeParser('text/plain', { parseAs: 'string' }, (req, body, done) => {
    try {
      const json = JSON.parse(body);
      done(null, json);
    } catch (err) {
      done(err, undefined);
    }
  });

  // Custom 404 handler that returns 405 for existing routes with wrong method
  const routePaths = new Set();

  app.addHook('onRoute', (routeOptions) => {
    routePaths.add(routeOptions.url);
  });

  app.setNotFoundHandler((request, reply) => {
    // Check if the path exists but method is wrong
    if (routePaths.has(request.url)) {
      reply.code(405).send({
        statusCode: 405,
        error: 'Method Not Allowed',
        message: `${request.method} method is not allowed for this route`,
      });
    } else {
      reply.code(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: `Route ${request.method}:${request.url} not found`,
      });
    }
  });

  // Health endpoint - mirrors HealthController.java
  app.get('/health/ping', async (request, reply) => {
    return 'ok';
  });

  // Sonarr webhook - mirrors SonarrController.java
  app.post('/sonarr/webhook', async (request, reply) => {
    const body = request.body;
    console.log('sonarr:', JSON.stringify(body));

    // Java's JsonPath.read throws PathNotFoundException if path doesn't exist
    // We need to mimic this behavior - throw error if eventType is missing
    if (body === null || body === undefined || typeof body !== 'object') {
      reply.code(500).send({ error: 'Invalid request body' });
      return;
    }

    const eventType = body.eventType;

    // If eventType is missing, Java throws PathNotFoundException (results in 500)
    if (eventType === undefined) {
      reply.code(500).send({ error: 'Missing eventType' });
      return;
    }

    const eventTypes = new Set(
      config.sonarrEventTypes.split(',').map((t) => t.toLowerCase())
    );

    if (eventType && eventTypes.has(eventType.toLowerCase())) {
      // If series object is missing, Java throws PathNotFoundException
      if (body.series === undefined) {
        reply.code(500).send({ error: 'Missing series object' });
        return;
      }

      const imdbId = body.series?.imdbId;
      const mediaDirs = config.sonarrMediaDirectories.split(',');
      await embyService.updateLibraryPath(imdbId, mediaDirs);
    }

    return '';
  });

  // Radarr webhook - mirrors RadarrController.java
  app.post('/radarr/webhook', async (request, reply) => {
    const body = request.body;
    console.log('radarr:', JSON.stringify(body));

    // Java's JsonPath.read throws PathNotFoundException if path doesn't exist
    if (body === null || body === undefined || typeof body !== 'object') {
      reply.code(500).send({ error: 'Invalid request body' });
      return;
    }

    const eventType = body.eventType;

    // If eventType is missing, Java throws PathNotFoundException (results in 500)
    if (eventType === undefined) {
      reply.code(500).send({ error: 'Missing eventType' });
      return;
    }

    const eventTypes = new Set(
      config.radarrEventTypes.split(',').map((t) => t.toLowerCase())
    );

    if (eventType && eventTypes.has(eventType.toLowerCase())) {
      // If remoteMovie object is missing, Java throws PathNotFoundException
      if (body.remoteMovie === undefined) {
        reply.code(500).send({ error: 'Missing remoteMovie object' });
        return;
      }

      const imdbId = body.remoteMovie?.imdbId;
      const mediaDirs = config.radarrMediaDirectories.split(',');
      await embyService.updateLibraryPath(imdbId, mediaDirs);
    }

    return '';
  });

  return app;
}

async function start() {
  validateConfig();
  logConfig();

  const app = buildApp();

  // Schedule initial library refresh like Java @PostConstruct
  embyService.scheduleInitialRefresh();

  // Graceful shutdown
  const shutdown = async () => {
    console.log('Shutting down...');
    embyService.tearDown();
    await app.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  try {
    await app.listen({ port: config.port, host: '0.0.0.0' });
    console.log(`Server listening on port ${config.port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

module.exports = { buildApp, start };

// Run if executed directly
if (require.main === module) {
  start();
}
