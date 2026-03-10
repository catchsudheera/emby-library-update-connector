# Migration Guide: Java Spring Boot to Node.js Fastify

This document summarizes the migration of the Emby Library Update Connector from Java Spring Boot to Node.js Fastify.

## Route Mapping

| Java Controller Method | Fastify Route | Description |
|------------------------|---------------|-------------|
| `HealthController.ping()` | `GET /health/ping` | Health check endpoint, returns "ok" |
| `SonarrController.webhook()` | `POST /sonarr/webhook` | Receives Sonarr webhook notifications |
| `RadarrController.webhook()` | `POST /radarr/webhook` | Receives Radarr webhook notifications |

## Service Mapping

| Java Class | Node.js Module | Description |
|------------|----------------|-------------|
| `ConfigProperties.java` | `src/config.js` | Environment variable configuration |
| `EmbyService.java` | `src/embyService.js` | Emby API communication |
| `EmbyConnectApplication.java` | `src/server.js` | Main application entry point |

## Behavior Parity

### Verified Behaviors (48 integration tests)

| Behavior | Java | Node.js |
|----------|------|---------|
| Health check returns "ok" | ✓ | ✓ |
| Webhook accepts supported events | ✓ | ✓ |
| Webhook ignores unsupported events | ✓ | ✓ |
| Missing eventType returns 500 | ✓ | ✓ |
| Missing parent object returns 500 | ✓ | ✓ |
| Empty body returns 400 | ✓ | ✓ |
| Invalid JSON returns 400/500 | ✓ | ✓ |
| Null imdbId returns 200 (handled gracefully) | ✓ | ✓ |
| Empty string imdbId returns 200 | ✓ | ✓ |
| Wrong HTTP methods return 405 | ✓ | ✓ |
| Unknown routes return 404 | ✓ | ✓ |
| text/plain content-type accepted | ✓ | ✓ |

### Key Implementation Notes

1. **ObjectUtils.isEmpty Behavior**: Java's `ObjectUtils.isEmpty(null)` returns `true`, so null imdbId is handled gracefully without calling Emby.

2. **JsonPath Error Handling**: Java's JsonPath throws `PathNotFoundException` when a path doesn't exist. We replicate this by returning 500 for missing `eventType` or parent objects (`series`/`remoteMovie`).

3. **Method Not Allowed**: Fastify returns 404 by default for wrong methods. We added a custom `setNotFoundHandler` to return 405 for existing routes with wrong methods.

4. **Content-Type Parsing**: Added a custom content type parser for `text/plain` to match Spring Boot's lenient parsing behavior.

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `EMBY_URL` | Yes | - | Emby server URL |
| `EMBY_ACCESS_TOKEN` | Yes | - | Emby API access token |
| `EMBY_FULL_REFRESH_TIMEOUT_MINS` | No | 30 | Rate limit for full library refresh |
| `SONARR_MEDIA_DIRECTORIES` | No | tv | Comma-separated media directories for Sonarr |
| `SONARR_TRIGGER_EVENT_TYPES` | No | Download,Rename,SeriesDelete,EpisodeFileDelete | Comma-separated event types to trigger on |
| `RADARR_MEDIA_DIRECTORIES` | No | movies | Comma-separated media directories for Radarr |
| `RADARR_TRIGGER_EVENT_TYPES` | No | Download,Rename,MovieDelete,MovieFileDelete | Comma-separated event types to trigger on |
| `PORT` | No | 8080 | Server port |

## Running Both Servers Side-by-Side

### Prerequisites
- Java 8+ with Maven
- Node.js 18+
- Running Emby server

### Start Java Server (port 8080)
```bash
# Build the Java application
mvn clean install

# Set environment variables
export EMBY_URL=http://your-emby-server:8096
export EMBY_ACCESS_TOKEN=your-token

# Run on default port 8080
java -jar target/emby-library-update-connector.jar
```

### Start Node.js Server (port 8080)
```bash
# Install dependencies
npm install

# Set environment variables
export EMBY_URL=http://your-emby-server:8096
export EMBY_ACCESS_TOKEN=your-token

# Run on default port 8080
npm start

# Or with hot reload for development
npm run dev
```

### Run Integration Tests

```bash
# Test against either server (both use port 8080 by default)
npm test

# Or explicitly
npm run test:integration

# Test against custom URL
TEST_BASE_URL=http://localhost:9000 npx jest tests/integration
```

## File Structure

```
├── src/
│   ├── server.js       # Fastify application entry point
│   ├── config.js       # Configuration from environment variables
│   └── embyService.js  # Emby API communication service
├── tests/
│   └── integration/    # Integration tests (unchanged from Java validation)
├── package.json        # Node.js dependencies and scripts
├── jest.config.js      # Jest test configuration
└── MIGRATION.md        # This file
```

## Dependencies

- **fastify** ^4.26.0 - Web framework
- **nodemon** ^3.0.3 - Development hot reload (dev dependency)
- **jest** ^29.7.0 - Testing framework (dev dependency)
- **supertest** ^6.3.4 - HTTP testing (dev dependency)
