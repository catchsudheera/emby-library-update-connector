#!/bin/bash

rm -rf node_modules && npm install

# Build multi-arch Docker image for Node.js application
docker buildx build \
  --push \
  --platform linux/arm/v7,linux/arm64/v8,linux/amd64 \
  --tag catchsudheera/emby-library-update-connector:2.0.0 .
