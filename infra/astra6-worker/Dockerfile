FROM node:22-alpine AS node-deps
WORKDIR /app
COPY web/package.json web/package-lock.json ./
RUN npm ci --omit=dev

FROM golang:alpine AS go-tools
ENV CGO_ENABLED=0 \
    GOBIN=/out
RUN apk add --no-cache git ca-certificates
RUN go install github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest \
 && go install github.com/zricethezav/gitleaks/v8@latest \
 && go install github.com/hueristiq/xurlfind3r/cmd/xurlfind3r@latest

FROM node:22-bookworm-slim AS worker
WORKDIR /opt/disha-worker

ENV NODE_ENV=production \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/disha-tools/bin:/usr/local/bin:/usr/bin:/bin"

RUN apt-get update \
 && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    bash \
    ca-certificates \
    curl \
    git \
    perl \
    python3 \
    python3-pip \
    python3-venv \
    tar \
    unzip \
 && rm -rf /var/lib/apt/lists/*

COPY --from=node-deps /app/node_modules ./node_modules
COPY web/package.json ./package.json
COPY web/scripts ./scripts
COPY --from=go-tools /out/subfinder /usr/local/bin/subfinder
COPY --from=go-tools /out/gitleaks /usr/local/bin/gitleaks
COPY --from=go-tools /out/xurlfind3r /usr/local/bin/xurlfind3r

RUN curl -fsSL https://github.com/sundowndev/phoneinfoga/releases/download/v2.11.0/phoneinfoga_Linux_x86_64.tar.gz \
  | tar -xz -C /usr/local/bin phoneinfoga \
 && curl -fsSL https://github.com/trufflesecurity/trufflehog/releases/download/v3.99.2/trufflehog_3.99.2_linux_amd64.tar.gz \
  | tar -xz -C /usr/local/bin trufflehog \
 && curl -fsSL https://github.com/owasp-amass/amass/releases/download/v5.1.1/amass_linux_amd64.tar.gz \
  | tar -xz -C /tmp \
 && find /tmp -type f -name amass -exec mv {} /usr/local/bin/amass \; \
 && chmod +x /usr/local/bin/phoneinfoga /usr/local/bin/trufflehog /usr/local/bin/amass

RUN mkdir -p /opt/venvs /opt/osint /opt/disha-tools/bin \
 && python3 -m venv /opt/venvs/sherlock \
 && /opt/venvs/sherlock/bin/pip install --no-cache-dir --upgrade pip sherlock-project \
 && python3 -m venv /opt/venvs/maigret \
 && /opt/venvs/maigret/bin/pip install --no-cache-dir --upgrade pip maigret \
 && python3 -m venv /opt/venvs/holehe \
 && /opt/venvs/holehe/bin/pip install --no-cache-dir --upgrade pip holehe \
 && python3 -m venv /opt/venvs/instaloader \
 && /opt/venvs/instaloader/bin/pip install --no-cache-dir --upgrade pip instaloader \
 && python3 -m venv /opt/venvs/telethon \
 && /opt/venvs/telethon/bin/pip install --no-cache-dir --upgrade pip telethon \
 && python3 -m venv /opt/venvs/theharvester \
 && /opt/venvs/theharvester/bin/pip install --no-cache-dir --upgrade pip \
 && python3 -m venv /opt/venvs/photon \
 && /opt/venvs/photon/bin/pip install --no-cache-dir --upgrade pip requests tld \
 && python3 -m venv /opt/venvs/toutatis \
 && /opt/venvs/toutatis/bin/pip install --no-cache-dir --upgrade pip toutatis \
 && python3 -m venv /opt/venvs/onionsearch \
 && /opt/venvs/onionsearch/bin/pip install --no-cache-dir --upgrade pip onionsearch

RUN git clone --depth 1 --branch 4.7.0 https://github.com/laramies/theHarvester.git /opt/osint/theHarvester \
 && /opt/venvs/theharvester/bin/pip install --no-cache-dir -r /opt/osint/theHarvester/requirements/base.txt \
 && printf '#!/usr/bin/env sh\ncd /opt/osint/theHarvester && exec /opt/venvs/theharvester/bin/python /opt/osint/theHarvester/theHarvester.py "$@"\n' > /usr/local/bin/theHarvester \
 && chmod +x /usr/local/bin/theHarvester \
 && git clone --depth 1 https://github.com/s0md3v/Photon.git /opt/osint/photon \
 && git clone --depth 1 https://github.com/smicallef/spiderfoot.git /opt/osint/spiderfoot \
 && python3 -m venv /opt/venvs/spiderfoot \
 && /opt/venvs/spiderfoot/bin/pip install --no-cache-dir --upgrade pip \
 && /opt/venvs/spiderfoot/bin/pip install --no-cache-dir -r /opt/osint/spiderfoot/requirements.txt \
 && git clone --depth 1 https://github.com/lanmaster53/recon-ng.git /opt/osint/recon-ng \
 && python3 -m venv /opt/venvs/recon \
 && /opt/venvs/recon/bin/pip install --no-cache-dir --upgrade pip \
 && /opt/venvs/recon/bin/pip install --no-cache-dir -r /opt/osint/recon-ng/REQUIREMENTS \
 && git clone --depth 1 https://github.com/lanmaster53/recon-ng-marketplace.git /opt/osint/recon-ng-marketplace

RUN ln -sf /opt/venvs/sherlock/bin/sherlock /opt/disha-tools/bin/sherlock \
 && ln -sf /opt/venvs/maigret/bin/maigret /opt/disha-tools/bin/maigret \
 && ln -sf /opt/venvs/holehe/bin/holehe /opt/disha-tools/bin/holehe \
 && ln -sf /opt/venvs/instaloader/bin/instaloader /opt/disha-tools/bin/instaloader \
 && ln -sf /opt/venvs/toutatis/bin/toutatis /opt/disha-tools/bin/toutatis \
 && ln -sf /opt/venvs/onionsearch/bin/onionsearch /opt/disha-tools/bin/onionsearch \
 && ln -sf /usr/local/bin/phoneinfoga /opt/disha-tools/bin/phoneinfoga \
 && ln -sf /usr/local/bin/amass /opt/disha-tools/bin/amass \
 && ln -sf /usr/local/bin/subfinder /opt/disha-tools/bin/subfinder \
 && ln -sf /usr/local/bin/xurlfind3r /opt/disha-tools/bin/xurlfind3r \
 && ln -sf /usr/local/bin/gitleaks /opt/disha-tools/bin/gitleaks \
 && ln -sf /usr/local/bin/trufflehog /opt/disha-tools/bin/trufflehog \
 && ln -sf /usr/local/bin/theHarvester /opt/disha-tools/bin/theHarvester

USER node
CMD ["node", "scripts/astra6-worker.mjs"]
