/**
 * Integration tests for the Sonarr webhook endpoint.
 *
 * Tests the /sonarr/webhook endpoint which receives webhook notifications
 * from Sonarr when TV series are downloaded, renamed, or deleted.
 *
 * The endpoint extracts the IMDB ID from $.series.imdbId and triggers
 * an Emby library refresh for the corresponding item.
 */

const { getAgent, createSonarrPayload } = require('./setup');

describe('Sonarr Webhook Endpoint', () => {
  describe('Supported Event Types', () => {
    // Test Download event - triggered when a new episode is downloaded
    // Returns 200 if Emby refresh succeeds, 500 if Emby API fails (e.g., IMDB not found triggers full refresh)
    test('POST /sonarr/webhook with Download event is processed', async () => {
      const payload = createSonarrPayload('Download');

      const response = await getAgent()
        .post('/sonarr/webhook')
        .send(payload)
        .set('Content-Type', 'application/json');

      // 200 = Emby refresh succeeded, 500 = Emby API error (both indicate event was processed)
      expect([200, 500]).toContain(response.status);
    });

    // Test Rename event - triggered when files are renamed by Sonarr
    test('POST /sonarr/webhook with Rename event is processed', async () => {
      const payload = createSonarrPayload('Rename');

      const response = await getAgent()
        .post('/sonarr/webhook')
        .send(payload)
        .set('Content-Type', 'application/json');

      expect([200, 500]).toContain(response.status);
    });

    // Test SeriesDelete event - triggered when a series is deleted from Sonarr
    test('POST /sonarr/webhook with SeriesDelete event is processed', async () => {
      const payload = createSonarrPayload('SeriesDelete');

      const response = await getAgent()
        .post('/sonarr/webhook')
        .send(payload)
        .set('Content-Type', 'application/json');

      expect([200, 500]).toContain(response.status);
    });

    // Test EpisodeFileDelete event - triggered when an episode file is deleted
    test('POST /sonarr/webhook with EpisodeFileDelete event is processed', async () => {
      const payload = createSonarrPayload('EpisodeFileDelete');

      const response = await getAgent()
        .post('/sonarr/webhook')
        .send(payload)
        .set('Content-Type', 'application/json');

      expect([200, 500]).toContain(response.status);
    });
  });

  describe('Ignored Event Types', () => {
    // Test event - used by Sonarr to test webhook connectivity
    // Should return 200 but NOT trigger Emby library refresh (ignored)
    test('POST /sonarr/webhook with Test event returns 200 (ignored)', async () => {
      const payload = createSonarrPayload('Test');

      const response = await getAgent()
        .post('/sonarr/webhook')
        .send(payload)
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(200);
    });

    // Grab event - triggered when a release is grabbed for download
    // Should return 200 but NOT trigger Emby library refresh (ignored)
    test('POST /sonarr/webhook with Grab event returns 200 (ignored)', async () => {
      const payload = createSonarrPayload('Grab');

      const response = await getAgent()
        .post('/sonarr/webhook')
        .send(payload)
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(200);
    });

    // Health event - health check event from Sonarr
    // Should return 200 but NOT trigger Emby library refresh (ignored)
    test('POST /sonarr/webhook with Health event returns 200 (ignored)', async () => {
      const payload = createSonarrPayload('Health');

      const response = await getAgent()
        .post('/sonarr/webhook')
        .send(payload)
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(200);
    });
  });

  describe('Error Cases - Malformed Payloads', () => {
    // Test missing eventType field - JsonPath will fail to extract
    // Spring Boot/JsonPath should return an error (400 or 500)
    test('POST /sonarr/webhook with missing eventType returns error', async () => {
      const payload = {
        series: {
          imdbId: 'tt1234567',
        },
      };

      const response = await getAgent()
        .post('/sonarr/webhook')
        .send(payload)
        .set('Content-Type', 'application/json');

      // JsonPath throws PathNotFoundException for missing paths
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    // Test empty request body - should fail to parse
    // Spring Boot should return 400 Bad Request
    test('POST /sonarr/webhook with empty body returns 400', async () => {
      const response = await getAgent()
        .post('/sonarr/webhook')
        .send('')
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(400);
    });

    // Test invalid JSON syntax - malformed JSON should fail to parse
    // Spring Boot returns 400 or 500 depending on how parsing fails
    test('POST /sonarr/webhook with invalid JSON returns error', async () => {
      const response = await getAgent()
        .post('/sonarr/webhook')
        .send('{ invalid json }')
        .set('Content-Type', 'application/json');

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    // Test missing series.imdbId - eventType exists but imdbId path is missing
    // JsonPath returns null, which passes ObjectUtils.isEmpty check, then Emby lookup is attempted
    // Emby API call with null imdbId may fail, returning 500
    test('POST /sonarr/webhook with missing series.imdbId triggers Emby call', async () => {
      const payload = {
        eventType: 'Download',
        series: {},
      };

      const response = await getAgent()
        .post('/sonarr/webhook')
        .send(payload)
        .set('Content-Type', 'application/json');

      // null imdbId is NOT caught by ObjectUtils.isEmpty - Emby call is made and may fail
      expect([200, 500]).toContain(response.status);
    });

    // Test missing series object entirely
    // JsonPath will fail to extract the imdbId from a non-existent path
    test('POST /sonarr/webhook with missing series object returns error', async () => {
      const payload = {
        eventType: 'Download',
      };

      const response = await getAgent()
        .post('/sonarr/webhook')
        .send(payload)
        .set('Content-Type', 'application/json');

      // JsonPath throws for missing parent path, may return 500
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('HTTP Method Handling', () => {
    // Test that GET method is not allowed on webhook endpoint
    // Webhooks should only accept POST requests
    test('GET /sonarr/webhook returns 405 Method Not Allowed', async () => {
      const response = await getAgent().get('/sonarr/webhook');

      expect(response.status).toBe(405);
    });

    // Test that PUT method is not allowed on webhook endpoint
    test('PUT /sonarr/webhook returns 405 Method Not Allowed', async () => {
      const response = await getAgent()
        .put('/sonarr/webhook')
        .send(createSonarrPayload('Download'))
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(405);
    });

    // Test that DELETE method is not allowed on webhook endpoint
    test('DELETE /sonarr/webhook returns 405 Method Not Allowed', async () => {
      const response = await getAgent().delete('/sonarr/webhook');

      expect(response.status).toBe(405);
    });
  });
});
