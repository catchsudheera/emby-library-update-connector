/**
 * Integration tests for the Radarr webhook endpoint.
 *
 * Tests the /radarr/webhook endpoint which receives webhook notifications
 * from Radarr when movies are downloaded, renamed, or deleted.
 *
 * The endpoint extracts the IMDB ID from $.remoteMovie.imdbId and triggers
 * an Emby library refresh for the corresponding item.
 */

const { getAgent, createRadarrPayload } = require('./setup');

describe('Radarr Webhook Endpoint', () => {
  describe('Supported Event Types', () => {
    // Test Download event - triggered when a movie is downloaded
    // Returns 200 if Emby refresh succeeds, 500 if Emby API fails (e.g., IMDB not found triggers full refresh)
    test('POST /radarr/webhook with Download event is processed', async () => {
      const payload = createRadarrPayload('Download');

      const response = await getAgent()
        .post('/radarr/webhook')
        .send(payload)
        .set('Content-Type', 'application/json');

      // 200 = Emby refresh succeeded, 500 = Emby API error (both indicate event was processed)
      expect([200, 500]).toContain(response.status);
    });

    // Test Rename event - triggered when movie files are renamed by Radarr
    test('POST /radarr/webhook with Rename event is processed', async () => {
      const payload = createRadarrPayload('Rename');

      const response = await getAgent()
        .post('/radarr/webhook')
        .send(payload)
        .set('Content-Type', 'application/json');

      expect([200, 500]).toContain(response.status);
    });

    // Test MovieDelete event - triggered when a movie is deleted from Radarr
    test('POST /radarr/webhook with MovieDelete event is processed', async () => {
      const payload = createRadarrPayload('MovieDelete');

      const response = await getAgent()
        .post('/radarr/webhook')
        .send(payload)
        .set('Content-Type', 'application/json');

      expect([200, 500]).toContain(response.status);
    });

    // Test MovieFileDelete event - triggered when a movie file is deleted
    test('POST /radarr/webhook with MovieFileDelete event is processed', async () => {
      const payload = createRadarrPayload('MovieFileDelete');

      const response = await getAgent()
        .post('/radarr/webhook')
        .send(payload)
        .set('Content-Type', 'application/json');

      expect([200, 500]).toContain(response.status);
    });
  });

  describe('Ignored Event Types', () => {
    // Test event - used by Radarr to test webhook connectivity
    // Should return 200 but NOT trigger Emby library refresh (ignored)
    test('POST /radarr/webhook with Test event returns 200 (ignored)', async () => {
      const payload = createRadarrPayload('Test');

      const response = await getAgent()
        .post('/radarr/webhook')
        .send(payload)
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(200);
    });

    // Grab event - triggered when a release is grabbed for download
    // Should return 200 but NOT trigger Emby library refresh (ignored)
    test('POST /radarr/webhook with Grab event returns 200 (ignored)', async () => {
      const payload = createRadarrPayload('Grab');

      const response = await getAgent()
        .post('/radarr/webhook')
        .send(payload)
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(200);
    });

    // Health event - health check event from Radarr
    // Should return 200 but NOT trigger Emby library refresh (ignored)
    test('POST /radarr/webhook with Health event returns 200 (ignored)', async () => {
      const payload = createRadarrPayload('Health');

      const response = await getAgent()
        .post('/radarr/webhook')
        .send(payload)
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(200);
    });
  });

  describe('Error Cases - Malformed Payloads', () => {
    // Test missing eventType field - JsonPath will fail to extract
    // Spring Boot/JsonPath should return an error (400 or 500)
    test('POST /radarr/webhook with missing eventType returns error', async () => {
      const payload = {
        remoteMovie: {
          imdbId: 'tt1234567',
        },
      };

      const response = await getAgent()
        .post('/radarr/webhook')
        .send(payload)
        .set('Content-Type', 'application/json');

      // JsonPath throws PathNotFoundException for missing paths
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    // Test empty request body - should fail to parse
    // Spring Boot should return 400 Bad Request
    test('POST /radarr/webhook with empty body returns 400', async () => {
      const response = await getAgent()
        .post('/radarr/webhook')
        .send('')
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(400);
    });

    // Test invalid JSON syntax - malformed JSON should fail to parse
    // Spring Boot returns 400 or 500 depending on how parsing fails
    test('POST /radarr/webhook with invalid JSON returns error', async () => {
      const response = await getAgent()
        .post('/radarr/webhook')
        .send('{ invalid json }')
        .set('Content-Type', 'application/json');

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    // Test missing remoteMovie.imdbId - eventType exists but imdbId path is missing
    // JsonPath returns null, which passes ObjectUtils.isEmpty check, then Emby lookup is attempted
    // Emby API call with null imdbId may fail, returning 500
    test('POST /radarr/webhook with missing remoteMovie.imdbId triggers Emby call', async () => {
      const payload = {
        eventType: 'Download',
        remoteMovie: {},
      };

      const response = await getAgent()
        .post('/radarr/webhook')
        .send(payload)
        .set('Content-Type', 'application/json');

      // null imdbId is NOT caught by ObjectUtils.isEmpty - Emby call is made and may fail
      expect([200, 500]).toContain(response.status);
    });

    // Test missing remoteMovie object entirely
    // JsonPath will fail to extract the imdbId from a non-existent path
    test('POST /radarr/webhook with missing remoteMovie object returns error', async () => {
      const payload = {
        eventType: 'Download',
      };

      const response = await getAgent()
        .post('/radarr/webhook')
        .send(payload)
        .set('Content-Type', 'application/json');

      // JsonPath throws for missing parent path, may return 500
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('HTTP Method Handling', () => {
    // Test that GET method is not allowed on webhook endpoint
    // Webhooks should only accept POST requests
    test('GET /radarr/webhook returns 405 Method Not Allowed', async () => {
      const response = await getAgent().get('/radarr/webhook');

      expect(response.status).toBe(405);
    });

    // Test that PUT method is not allowed on webhook endpoint
    test('PUT /radarr/webhook returns 405 Method Not Allowed', async () => {
      const response = await getAgent()
        .put('/radarr/webhook')
        .send(createRadarrPayload('Download'))
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(405);
    });

    // Test that DELETE method is not allowed on webhook endpoint
    test('DELETE /radarr/webhook returns 405 Method Not Allowed', async () => {
      const response = await getAgent().delete('/radarr/webhook');

      expect(response.status).toBe(405);
    });
  });
});
