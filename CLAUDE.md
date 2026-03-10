# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Spring Boot webhook connector that triggers Emby media server library updates when Sonarr or Radarr send webhook notifications. When media is downloaded/renamed/deleted, the connector refreshes the corresponding Emby library item by IMDB ID.

## Build Commands

```bash
# Build the project
mvn clean install

# Build multi-arch Docker image and push
./build-docker-image.sh

# Run locally (requires environment variables set)
java -jar target/emby-library-update-connector.jar
```

## Architecture

**Request Flow:**
1. Sonarr/Radarr sends webhook POST to `/sonarr/webhook` or `/radarr/webhook`
2. Controllers filter by configured event types (Download, Rename, Delete, etc.)
3. `EmbyService` looks up item in Emby by IMDB ID within configured media directories
4. If found, refreshes specific item; otherwise falls back to full library refresh

**Key Components:**
- `ConfigProperties` - All configuration via Spring `@Value` annotations, mapped from environment variables (e.g., `EMBY_URL` -> `emby.url`)
- `EmbyService` - Handles Emby API calls (item lookup, refresh). Includes rate limiting for full library refreshes via `embyFullRefreshTimeoutMins`
- Controllers use JsonPath to extract `eventType` and `imdbId` from webhook payloads

## Configuration (Environment Variables)

| Variable | Required | Default |
|----------|----------|---------|
| `EMBY_URL` | Yes | - |
| `EMBY_ACCESS_TOKEN` | Yes | - |
| `EMBY_FULL_REFRESH_TIMEOUT_MINS` | No | 30 |
| `SONARR_MEDIA_DIRECTORIES` | No | tv |
| `RADARR_MEDIA_DIRECTORIES` | No | movies |
| `SONARR_TRIGGER_EVENT_TYPES` | No | Download,Rename,SeriesDelete,EpisodeFileDelete |
| `RADARR_TRIGGER_EVENT_TYPES` | No | Download,Rename,MovieDelete,MovieFileDelete |

## Dependencies

- Java 8
- Spring Boot 2.4.4
- Unirest (HTTP client for Emby API)
- JsonPath (webhook payload parsing)
- Lombok
