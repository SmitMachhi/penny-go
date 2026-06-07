FROM node:22-slim AS build

WORKDIR /app

COPY shared ./shared
COPY plugin ./plugin
COPY web ./web

RUN npm --prefix shared ci
RUN npm --prefix plugin ci
RUN npm --prefix web ci
RUN npm --prefix plugin run build
RUN npm --prefix web run build
RUN npm --prefix web prune --omit=dev
RUN npm --prefix plugin prune --omit=dev

FROM node:22-slim AS runtime

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    python3 \
    python3-pip \
    python3-venv \
  && rm -rf /var/lib/apt/lists/*

RUN npm install -g openclaw@2026.5.22

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
ENV PENNY_REPO_ROOT=/app
ENV PENNY_CORPUS_PATH=/app/database/data/funding/curated/verified-programs.jsonl
ENV PENNY_PYTHON=/app/.venv/bin/python
ENV OPENCLAW_CONFIG_PATH=/app/config/openclaw.fly.json5
ENV OPENCLAW_STATE_DIR=/app/workspace/.openclaw-state

COPY --from=build /app/web/build ./web/build
COPY --from=build /app/web/package.json ./web/package.json
COPY --from=build /app/web/node_modules ./web/node_modules
COPY --from=build /app/shared ./shared
COPY --from=build /app/plugin ./plugin

COPY config ./config
COPY tools ./tools
COPY workspace ./workspace.seed
COPY database/data/funding/curated ./database/data/funding/curated
COPY scripts/fly-start.sh ./scripts/fly-start.sh

RUN python3 -m venv /app/.venv \
  && /app/.venv/bin/pip install --no-cache-dir -r /app/tools/requirements-read-official-source.txt \
  && /app/.venv/bin/python -m playwright install --with-deps chromium \
  && chmod +x /app/scripts/fly-start.sh

EXPOSE 3000

CMD ["/app/scripts/fly-start.sh"]
