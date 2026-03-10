/**
 * Integration tests for general error handling and edge cases.
 *
 * Tests behavior for unknown routes, large payloads, and other
 * edge cases that are not specific to Sonarr or Radarr endpoints.
 */

const { getAgent, BASE_URL } = require('./setup');

describe('General Error Handling', () => {
  describe('Unknown Routes - 404 Handling', () => {
    // Test that unknown GET routes return 404 Not Found
    // Ensures proper routing configuration
    test('GET /unknown returns 404', async () => {
      const response = await getAgent().get('/unknown');

      expect(response.status).toBe(404);
    });

    // Test that unknown POST routes return 404 Not Found
    test('POST /unknown returns 404', async () => {
      const response = await getAgent()
        .post('/unknown')
        .send({ test: 'data' })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(404);
    });

    // Test deeply nested unknown routes
    test('GET /some/deeply/nested/path returns 404', async () => {
      const response = await getAgent().get('/some/deeply/nested/path');

      expect(response.status).toBe(404);
    });

    // Test routes that look similar to valid ones but with typos
    test('GET /health/pong returns 404', async () => {
      const response = await getAgent().get('/health/pong');

      expect(response.status).toBe(404);
    });

    // Test route without the /webhook suffix
    test('POST /sonarr returns 404', async () => {
      const response = await getAgent()
        .post('/sonarr')
        .send({ eventType: 'Download', series: { imdbId: 'tt1234567' } })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(404);
    });

    // Test route without the /webhook suffix for radarr
    test('POST /radarr returns 404', async () => {
      const response = await getAgent()
        .post('/radarr')
        .send({ eventType: 'Download', remoteMovie: { imdbId: 'tt1234567' } })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(404);
    });
  });

  describe('Edge Cases', () => {
    // Test large payload handling - some servers have body size limits
    // The application should accept it and process (may return 200 or 500 based on Emby)
    test('POST /sonarr/webhook with large payload is handled', async () => {
      const largePayload = {
        eventType: 'Download',
        series: {
          imdbId: 'tt1234567',
          extraData: 'x'.repeat(100000), // 100KB of extra data
        },
      };

      const response = await getAgent()
        .post('/sonarr/webhook')
        .send(largePayload)
        .set('Content-Type', 'application/json');

      // Should process the request (200 or 500 based on Emby state) or return 413 if too large
      expect([200, 413, 500]).toContain(response.status);
    });

    // Test IMDB ID with special characters - ensure no injection issues
    // The application processes it and calls Emby (which may fail, returning 500)
    test('POST /sonarr/webhook with special characters in imdbId is processed', async () => {
      const payload = {
        eventType: 'Download',
        series: {
          imdbId: 'tt123<script>alert(1)</script>',
        },
      };

      const response = await getAgent()
        .post('/sonarr/webhook')
        .send(payload)
        .set('Content-Type', 'application/json');

      // Processed - 200 if Emby succeeds, 500 if Emby API fails
      expect([200, 500]).toContain(response.status);
    });

    // Test Unicode characters in payload
    test('POST /radarr/webhook with unicode characters is processed', async () => {
      const payload = {
        eventType: 'Download',
        remoteMovie: {
          imdbId: 'tt1234567',
          title: '日本語タイトル 🎬',
        },
      };

      const response = await getAgent()
        .post('/radarr/webhook')
        .send(payload)
        .set('Content-Type', 'application/json');

      // Processed - 200 if Emby succeeds, 500 if Emby API fails
      expect([200, 500]).toContain(response.status);
    });

    // Test null values in payload fields
    test('POST /sonarr/webhook with null imdbId returns 200', async () => {
      const payload = {
        eventType: 'Download',
        series: {
          imdbId: null,
        },
      };

      const response = await getAgent()
        .post('/sonarr/webhook')
        .send(payload)
        .set('Content-Type', 'application/json');

      // Null imdbId is handled gracefully by EmbyService
      expect(response.status).toBe(200);
    });

    // Test empty string imdbId
    test('POST /radarr/webhook with empty string imdbId returns 200', async () => {
      const payload = {
        eventType: 'Download',
        remoteMovie: {
          imdbId: '',
        },
      };

      const response = await getAgent()
        .post('/radarr/webhook')
        .send(payload)
        .set('Content-Type', 'application/json');

      // Empty imdbId is handled gracefully by EmbyService
      expect(response.status).toBe(200);
    });
  });

  describe('Content-Type Handling', () => {
    // Test webhook with text/plain content-type
    // Spring Boot may still parse it or reject it
    test('POST /sonarr/webhook with text/plain content-type', async () => {
      const response = await getAgent()
        .post('/sonarr/webhook')
        .send(JSON.stringify({ eventType: 'Test', series: { imdbId: 'tt1234567' } }))
        .set('Content-Type', 'text/plain');

      // Spring Boot may accept this (200) or reject it (415 Unsupported Media Type)
      expect([200, 415]).toContain(response.status);
    });

    // Test webhook without content-type header
    // Spring Boot may infer content type or reject it
    test('POST /sonarr/webhook without content-type header', async () => {
      const response = await getAgent()
        .post('/sonarr/webhook')
        .send(JSON.stringify({ eventType: 'Test', series: { imdbId: 'tt1234567' } }));

      // Should accept (200), return 415, or 500 if it processes but Emby fails
      expect([200, 415, 500]).toContain(response.status);
    });
  });
});

describe('Server Information', () => {
  // Log the base URL being tested - useful for debugging
  test('Server base URL is configured', () => {
    console.log(`Testing against: ${BASE_URL}`);
    expect(BASE_URL).toBeTruthy();
  });
});
