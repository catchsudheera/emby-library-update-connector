/**
 * Emby Service - mirrors Java EmbyService.java
 * Handles communication with the Emby server API.
 */

const https = require('https');
const { config } = require('./config');

const ACCESS_TOKEN_HEADER = 'X-Emby-Token';

// Track last full library refresh time for rate limiting
let lastFullLibraryRefreshTime = null;
let scheduledRefreshTimeout = null;

// Create custom HTTPS agent for self-signed certificates
const httpsAgent = config.insecureSSL
  ? new https.Agent({ rejectUnauthorized: false })
  : undefined;

/**
 * Wrapper around fetch that handles SSL configuration and logging
 */
async function embyFetch(url, options = {}) {
  const method = options.method || 'GET';
  console.log(`Emby API request: ${method} ${url}`);

  const fetchOptions = { ...options };
  if (httpsAgent && url.startsWith('https://')) {
    fetchOptions.agent = httpsAgent;
  }
  return fetch(url, fetchOptions);
}

/**
 * Check if a value is empty (mirrors Spring's ObjectUtils.isEmpty behavior)
 * ObjectUtils.isEmpty returns true for: null, empty string "", empty array, empty collection
 */
function isEmpty(value) {
  return value === null || value === '' || value === undefined;
}

/**
 * Handle error responses from Emby API
 * Throws if status doesn't start with 2
 */
async function handleErrorResponse(response, url) {
  if (!String(response.status).startsWith('2')) {
    let errorBody = '';
    try {
      errorBody = await response.text();
    } catch (e) {
      errorBody = '(unable to read response body)';
    }
    console.error(`Emby API error: ${response.status} ${response.statusText}`);
    console.error(`  URL: ${url}`);
    console.error(`  Response: ${errorBody}`);
    throw new Error(`Error response from emby: ${response.status} ${response.statusText}`);
  }
}

/**
 * Get directory set item IDs from Emby
 */
async function getDirectorySetItemIds(directorySet) {
  const url = `${config.embyUrl}/Items?IsFolder=1`;
  const response = await embyFetch(url, {
    headers: { [ACCESS_TOKEN_HEADER]: config.embyAccessToken },
  });
  await handleErrorResponse(response, url);

  const data = await response.json();
  const itemList = data.Items || [];

  return new Set(
    itemList
      .filter((item) => directorySet.has(item.Name))
      .map((item) => item.Id)
  );
}

/**
 * Get item IDs with matching IMDB ID within parent directory
 */
async function getItemIdsWithImdbIdsInParentDir(parentId, imdbId) {
  const url = `${config.embyUrl}/Items?Recursive=1&ParentId=${parentId}&Fields=ProviderIds&IsFolder=1&HasImdbId=1`;
  const response = await embyFetch(url, {
    headers: { [ACCESS_TOKEN_HEADER]: config.embyAccessToken },
  });
  await handleErrorResponse(response, url);

  const data = await response.json();
  const itemList = data.Items || [];

  return itemList
    .filter((item) => {
      const providerIds = item.ProviderIds || {};
      return imdbId === providerIds.Imdb;
    })
    .map((item) => item.Id);
}

/**
 * Get item IDs by IMDB ID within directory set
 */
async function getItemIdsByImdbId(imdbId, directorySet) {
  const url = `${config.embyUrl}/Items?IsFolder=1`;
  const response = await embyFetch(url, {
    headers: { [ACCESS_TOKEN_HEADER]: config.embyAccessToken },
  });
  await handleErrorResponse(response, url);

  const data = await response.json();
  const itemList = data.Items || [];

  const matchingDirs = itemList.filter((item) => directorySet.has(item.Name));

  const results = await Promise.all(
    matchingDirs.map((item) => getItemIdsWithImdbIdsInParentDir(item.Id, imdbId))
  );

  return new Set(results.flat());
}

/**
 * Refresh a specific item in Emby
 */
async function refreshItem(id) {
  console.log(`Refresh request : Item ${id}`);
  const url = `${config.embyUrl}/emby/Items/${id}/Refresh?Recursive=true`;
  const response = await embyFetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      [ACCESS_TOKEN_HEADER]: config.embyAccessToken,
    },
  });
  await handleErrorResponse(response, url);
  console.log(`Refresh request sent : Item ${id}`);
}

/**
 * Refresh the entire library
 * Includes rate limiting to prevent too frequent refreshes
 */
async function refreshLibrary() {
  console.log('Refresh request : Library');

  const now = Date.now();
  const timeoutMs = config.embyFullRefreshTimeoutMins * 60 * 1000;

  if (lastFullLibraryRefreshTime && now - lastFullLibraryRefreshTime < timeoutMs) {
    console.warn(
      `Last library refresh request sent at: ${new Date(lastFullLibraryRefreshTime).toISOString()}. ` +
        `Too soon for another refresh. Scheduling a full refresh in ${config.embyFullRefreshTimeoutMins} minutes`
    );

    if (!scheduledRefreshTimeout) {
      scheduledRefreshTimeout = setTimeout(() => {
        scheduledRefreshTimeout = null;
        refreshLibrary().catch((err) => console.error('Scheduled refresh failed:', err));
      }, timeoutMs);
    } else {
      console.log('There is already a scheduled full library refresh. Skip scheduling more refresh jobs.');
    }
    return;
  }

  const url = `${config.embyUrl}/Library/Refresh`;
  const response = await embyFetch(url, {
    method: 'POST',
    headers: { [ACCESS_TOKEN_HEADER]: config.embyAccessToken },
  });
  await handleErrorResponse(response, url);

  lastFullLibraryRefreshTime = now;
  console.log('Refresh request sent : Library');
}

/**
 * Update library path - main entry point for webhook handlers
 * Mirrors Java EmbyService.updateLibraryPath()
 */
async function updateLibraryPath(imdbId, mediaDirs) {
  // Note: Java's ObjectUtils.isEmpty returns true for "" but false for null
  if (isEmpty(imdbId)) {
    console.error('Given imdbId is empty');
    return;
  }

  const directorySet = new Set(mediaDirs);
  const itemIds = await getItemIdsByImdbId(imdbId, directorySet);

  if (itemIds.size === 0) {
    const directorySetItemIds = await getDirectorySetItemIds(directorySet);
    if (directorySetItemIds.size === 0) {
      await refreshLibrary();
    } else {
      for (const id of directorySetItemIds) {
        await refreshItem(id);
      }
    }
  } else {
    for (const id of itemIds) {
      await refreshItem(id);
    }
  }
}

/**
 * Schedule initial library refresh (mirrors Java @PostConstruct)
 */
function scheduleInitialRefresh() {
  setTimeout(() => {
    refreshLibrary().catch((err) => console.error('Initial refresh failed:', err));
  }, 2 * 60 * 1000); // 2 minutes
  console.log('Scheduled an initial full library scan in 2 Minutes');
}

/**
 * Cleanup scheduled tasks (mirrors Java @PreDestroy)
 */
function tearDown() {
  if (scheduledRefreshTimeout) {
    clearTimeout(scheduledRefreshTimeout);
    scheduledRefreshTimeout = null;
  }
}

module.exports = {
  updateLibraryPath,
  scheduleInitialRefresh,
  tearDown,
};
