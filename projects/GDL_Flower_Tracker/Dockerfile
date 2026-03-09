# syntax=docker/dockerfile:1

FROM node:22-slim AS frontend-build

ENV NEXT_TELEMETRY_DISABLED=1

WORKDIR /app/frontend

COPY frontend/package.json ./package.json
COPY frontend/package-lock.json ./package-lock.json
RUN npm ci

COPY frontend/ ./
RUN npm run build

FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    NEXT_TELEMETRY_DISABLED=1

WORKDIR /app

# System deps (small set for TLS + wheels)
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
COPY --from=frontend-build /app/frontend/out ./frontend/out

# Default runtime env
# - DB is stored in /data so you can mount a persistent volume
# - AUTO_BOOTSTRAP_IF_EMPTY=false keeps production startup read-only/safe
ENV APP_ENV=production \
    PORT=8000 \
    DB_PATH=/data/gdl_data.db \
    AUTO_BOOTSTRAP_IF_EMPTY=false \
    SCHEDULER_ENABLED=false \
    SENTRY_ENVIRONMENT=production \
    RELEASE_SHA=dev

VOLUME ["/data"]

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/healthz', timeout=3)" || exit 1

CMD ["gunicorn", "-c", "gunicorn_conf.py", "api_server:app"]
