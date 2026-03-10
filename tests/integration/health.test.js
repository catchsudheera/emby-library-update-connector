/**
 * Integration tests for the health check endpoint.
 *
 * Tests the /health/ping endpoint which provides a simple
 * liveness check for the application.
 */

const { getAgent } = require('./setup');

describe('Health Check Endpoint', () => {
  // Test that the health endpoint returns 200 OK with "ok" body
  // This is the primary liveness check used by Docker healthchecks
  test('GET /health/ping returns 200 with "ok" body', async () => {
    const response = await getAgent().get('/health/ping');

    expect(response.status).toBe(200);
    expect(response.text).toBe('ok');
  });

  // Test that POST method is not allowed on the health endpoint
  // Spring Boot should return 405 Method Not Allowed
  test('POST /health/ping returns 405 Method Not Allowed', async () => {
    const response = await getAgent().post('/health/ping');

    expect(response.status).toBe(405);
  });

  // Test that PUT method is not allowed on the health endpoint
  test('PUT /health/ping returns 405 Method Not Allowed', async () => {
    const response = await getAgent().put('/health/ping');

    expect(response.status).toBe(405);
  });

  // Test that DELETE method is not allowed on the health endpoint
  test('DELETE /health/ping returns 405 Method Not Allowed', async () => {
    const response = await getAgent().delete('/health/ping');

    expect(response.status).toBe(405);
  });
});
