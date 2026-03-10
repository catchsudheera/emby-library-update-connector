# Integration Tests

This directory contains integration tests for the Emby Library Update Connector.

These tests are **implementation-agnostic** and can run against either:
- The original Java Spring Boot server
- The migrated Node.js Fastify server

The tests serve as the **source of truth** for expected behavior during and after migration.

## Prerequisites

Before running tests, ensure:

1. **Emby server** is running and accessible at the configured `EMBY_URL`
2. **Valid `EMBY_ACCESS_TOKEN`** is configured in the server's environment
3. **The connector application** is running

## Installation

```bash
npm install
```

## Running Tests

### Against Java Spring Boot Server (default port 8080)

```bash
# Start the Java server first (in another terminal)
java -jar target/emby-library-update-connector.jar

# Run tests
npm run test:java
# OR
TEST_BASE_URL=http://localhost:8080 npx jest tests/integration
```

### Against Node.js Fastify Server (default port 3000)

```bash
# Start the Node.js server first (in another terminal)
npm start

# Run tests
npm run test:node
# OR
TEST_BASE_URL=http://localhost:3000 npx jest tests/integration
```

### Custom Server URL

```bash
TEST_BASE_URL=http://your-server:port npx jest tests/integration
```

## Test Structure

```
tests/integration/
├── setup.js        # Shared config, base URL, helper functions
├── health.test.js  # Health check endpoint tests
├── sonarr.test.js  # Sonarr webhook endpoint tests
├── radarr.test.js  # Radarr webhook endpoint tests
└── errors.test.js  # General error handling tests
```

## Test Coverage

### Health Endpoint (`/health/ping`)
- GET returns 200 with "ok" body
- Other HTTP methods return 405

### Sonarr Webhook (`/sonarr/webhook`)
- Supported event types: Download, Rename, SeriesDelete, EpisodeFileDelete
- Ignored event types: Test, Grab, Health
- Error handling: missing fields, invalid JSON, empty body
- HTTP method restrictions

### Radarr Webhook (`/radarr/webhook`)
- Supported event types: Download, Rename, MovieDelete, MovieFileDelete
- Ignored event types: Test, Grab, Health
- Error handling: missing fields, invalid JSON, empty body
- HTTP method restrictions

### General Error Handling
- 404 for unknown routes
- Large payload handling
- Special characters and unicode
- Content-type variations

## Notes

- Tests do **not** mock the backend - they hit the real running server
- Tests do **not** import any code from the application
- Each test has a comment explaining the behavior being asserted
- Tests assume Emby server is available and properly configured
