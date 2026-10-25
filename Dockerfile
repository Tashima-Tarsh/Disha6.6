# DISHA 6.6 — Python OSINT Backend Container
FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
  && rm -rf /var/lib/apt/lists/*

RUN useradd -m -u 10001 -s /bin/bash disha \
  && mkdir -p /app /data /app/backend/data \
  && chown -R disha:disha /app /data

WORKDIR /app

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY --chown=disha:disha . .

USER disha

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD python3 -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/tools/status', timeout=5).read()"

CMD ["python3", "backend/app.py"]
