/**
 * Configuration module - mirrors Java ConfigProperties.java
 * Reads from environment variables with defaults matching the Java implementation.
 */

const config = {
  // Required
  embyUrl: process.env.EMBY_URL,
  embyAccessToken: process.env.EMBY_ACCESS_TOKEN,

  // Optional with defaults
  embyFullRefreshTimeoutMins: parseInt(process.env.EMBY_FULL_REFRESH_TIMEOUT_MINS, 10) || 30,
  sonarrMediaDirectories: process.env.SONARR_MEDIA_DIRECTORIES || 'tv',
  sonarrEventTypes: process.env.SONARR_TRIGGER_EVENT_TYPES || 'Download,Rename,SeriesDelete,EpisodeFileDelete',
  radarrMediaDirectories: process.env.RADARR_MEDIA_DIRECTORIES || 'movies',
  radarrEventTypes: process.env.RADARR_TRIGGER_EVENT_TYPES || 'Download,Rename,MovieDelete,MovieFileDelete',

  // Server config
  port: parseInt(process.env.PORT, 10) || 8080,

  // SSL config - set to 'true' to skip SSL certificate verification (for self-signed certs)
  insecureSSL: process.env.INSECURE_SSL === 'true',
};

function validateConfig() {
  if (!config.embyUrl) {
    throw new Error('EMBY_URL environment variable is required');
  }
  if (!config.embyAccessToken) {
    throw new Error('EMBY_ACCESS_TOKEN environment variable is required');
  }
}

function logConfig() {
  console.log(' == EMBY_ACCESS_TOKEN  ->  ' + config.embyAccessToken);
  console.log(' == EMBY_URL  ->  ' + config.embyUrl);
  console.log(' == EMBY_FULL_REFRESH_TIMEOUT_MINS  ->  ' + config.embyFullRefreshTimeoutMins);
  console.log(' == SONARR_MEDIA_DIRECTORIES  ->  ' + config.sonarrMediaDirectories);
  console.log(' == SONARR_TRIGGER_EVENT_TYPES  ->  ' + config.sonarrEventTypes);
  console.log(' == RADARR_MEDIA_DIRECTORIES  ->  ' + config.radarrMediaDirectories);
  console.log(' == RADARR_TRIGGER_EVENT_TYPES  ->  ' + config.radarrEventTypes);
  console.log(' == INSECURE_SSL  ->  ' + config.insecureSSL);
}

module.exports = {
  config,
  validateConfig,
  logConfig,
};
