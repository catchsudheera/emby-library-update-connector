# Emby Library Update Connector

A lightweight webhook connector that automatically triggers Emby media server library updates when Sonarr or Radarr download, rename, or delete media files.

## How It Works

1. Sonarr/Radarr sends a webhook notification when media changes occur
2. The connector extracts the IMDB ID from the webhook payload
3. It searches Emby for the matching item and triggers a targeted refresh
4. If no match is found, it falls back to refreshing the entire media directory or library

## Quick Start

### Docker (Recommended)

```bash
docker run -d \
  --name emby-connector \
  -p 8080:8080 \
  -e EMBY_URL=http://your-emby-server:8096 \
  -e EMBY_ACCESS_TOKEN=your-emby-api-token \
  catchsudheera/emby-library-update-connector:2.0.0
```

### Docker Compose

```yaml
version: "3"
services:
  emby-connector:
    image: catchsudheera/emby-library-update-connector:2.0.0
    container_name: emby-connector
    environment:
      - EMBY_URL=http://your-emby-server:8096
      - EMBY_ACCESS_TOKEN=your-emby-api-token
    ports:
      - 8080:8080
    restart: unless-stopped
```

### From Source

```bash
# Clone the repository
git clone https://github.com/catchsudheera/emby-library-update-connector.git
cd emby-library-update-connector

# Install dependencies
npm install

# Set environment variables
export EMBY_URL=http://your-emby-server:8096
export EMBY_ACCESS_TOKEN=your-emby-api-token

# Start the server
npm start
```

## Configuration

| Environment Variable | Required | Default | Description |
|---------------------|----------|---------|-------------|
| `EMBY_URL` | Yes | - | URL of your Emby server (e.g., `http://192.168.1.100:8096`) |
| `EMBY_ACCESS_TOKEN` | Yes | - | Emby API token (Settings → API Keys in Emby) |
| `EMBY_FULL_REFRESH_TIMEOUT_MINS` | No | `30` | Minimum minutes between full library refreshes |
| `SONARR_MEDIA_DIRECTORIES` | No | `tv` | Comma-separated Emby library names for TV shows |
| `RADARR_MEDIA_DIRECTORIES` | No | `movies` | Comma-separated Emby library names for movies |
| `SONARR_TRIGGER_EVENT_TYPES` | No | `Download,Rename,SeriesDelete,EpisodeFileDelete` | Sonarr events that trigger refresh |
| `RADARR_TRIGGER_EVENT_TYPES` | No | `Download,Rename,MovieDelete,MovieFileDelete` | Radarr events that trigger refresh |
| `PORT` | No | `8080` | Server port |

## Setting Up Webhooks

### Sonarr

1. Go to Settings → Connect → Add → Webhook
2. Set the URL to: `http://your-connector-host:8080/sonarr/webhook`
3. Select the events you want to trigger on (Download, Rename, etc.)
4. Save

### Radarr

1. Go to Settings → Connect → Add → Webhook
2. Set the URL to: `http://your-connector-host:8080/radarr/webhook`
3. Select the events you want to trigger on (Download, Rename, etc.)
4. Save

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health/ping` | Health check endpoint, returns `ok` |
| `POST` | `/sonarr/webhook` | Receives Sonarr webhook notifications |
| `POST` | `/radarr/webhook` | Receives Radarr webhook notifications |

## Development

```bash
# Install dependencies
npm install

# Run with hot reload
npm run dev

# Run tests
npm test
```

## Building Docker Image

```bash
# Build locally
docker build -t emby-library-update-connector .

# Build multi-arch and push
./build-docker-image.sh
```

## License

MIT
