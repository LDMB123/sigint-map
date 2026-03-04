# Docker Deployment

Last updated: 2026-03-03

This directory contains the static container build for serving `dist/` with NGINX.

## Build Image
```bash
npm run build:release
docker build -f deploy/docker/Dockerfile -t blaires-kind-heart:latest .
```

## Publish to GHCR
```bash
npm run deploy:publish-image
```

Published image repository: `ghcr.io/ldmb123/blaires-kind-heart`

Auth requirement: token used for `docker login ghcr.io` must be able to publish packages for this repository owner.

## Run Locally
```bash
docker run --rm -p 8080:8080 blaires-kind-heart:latest
```

## Validate
1. Open `http://localhost:8080/`.
2. Open `http://localhost:8080/offline.html`.
3. Confirm service worker and static assets load correctly.

## Navigation
- Deploy docs hub: `deploy/README.md`
