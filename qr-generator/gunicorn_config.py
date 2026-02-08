# gunicorn_config.py
import os

workers = int(os.environ.get('GUNICORN_WORKERS', '2'))
threads = int(os.environ.get('GUNICORN_THREADS', '4'))
bind = f"0.0.0.0:{os.environ.get('PORT', '5000')}"
worker_class = 'sync'
loglevel = 'info'
accesslog = '-'
errorlog = '-'