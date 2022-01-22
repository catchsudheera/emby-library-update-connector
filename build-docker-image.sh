#!/bin/bash
mvn clean install && \
docker buildx build \
--push \
--platform linux/arm/v6,linux/arm/v7,linux/arm64/v8,linux/amd64 \
--tag catchsudheera/emby-library-update-connector:1.0.4-SNAPSHOT .
