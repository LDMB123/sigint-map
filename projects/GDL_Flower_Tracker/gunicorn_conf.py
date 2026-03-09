"""Gunicorn config for GDL Flower Tracker.

This keeps deployment flexible across platforms:
- PORT controls bind port
- WEB_CONCURRENCY controls worker count
- LOG_LEVEL controls logging

Example:
  WEB_CONCURRENCY=2 PORT=8000 gunicorn -c gunicorn_conf.py api_server:app
"""

import multiprocessing
import os

bind = f"0.0.0.0:{os.getenv('PORT', '8000')}"

workers = int(os.getenv("WEB_CONCURRENCY", str(max(1, multiprocessing.cpu_count() // 2))))
worker_class = "uvicorn.workers.UvicornWorker"

# Keep workers healthy for slow third-party APIs
timeout = int(os.getenv("GUNICORN_TIMEOUT", "120"))
keepalive = int(os.getenv("GUNICORN_KEEPALIVE", "5"))

loglevel = os.getenv("LOG_LEVEL", "info").lower()
accesslog = "-"
errorlog = "-"
