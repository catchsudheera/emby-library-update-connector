/**
 * Shared configuration and helpers for integration tests.
 *
 * These tests are implementation-agnostic and can run against either
 * the Java Spring Boot server or the Node.js Fastify server.
 */

const request = require('supertest');

// Base URL for the server under test
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:8080';

/**
 * Create a supertest request agent for the configured base URL.
 */
function getAgent() {
  return request(BASE_URL);
}

/**
 * Create a valid Sonarr webhook payload.
 * @param {string} eventType - The event type (e.g., 'Download', 'Rename')
 * @param {string} imdbId - The IMDB ID (e.g., 'tt1234567')
 * @returns {object} Valid Sonarr webhook payload
 */
function createSonarrPayload(eventType, imdbId = 'tt1234567') {
  return {
    eventType,
    series: {
      imdbId,
    },
  };
}

/**
 * Create a valid Radarr webhook payload.
 * @param {string} eventType - The event type (e.g., 'Download', 'Rename')
 * @param {string} imdbId - The IMDB ID (e.g., 'tt1234567')
 * @returns {object} Valid Radarr webhook payload
 */
function createRadarrPayload(eventType, imdbId = 'tt1234567') {
  return {
    eventType,
    remoteMovie: {
      imdbId,
    },
  };
}

module.exports = {
  BASE_URL,
  getAgent,
  createSonarrPayload,
  createRadarrPayload,
};
