FROM node:22-slim AS build

WORKDIR /app

COPY shared ./shared
COPY web ./web

RUN npm --prefix shared ci
RUN npm --prefix web ci
RUN npm --prefix web run build
RUN npm --prefix web prune --omit=dev

FROM node:22-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
ENV PENNY_REPO_ROOT=/app

COPY --from=build /app/web/build ./web/build
COPY --from=build /app/web/package.json ./web/package.json
COPY --from=build /app/web/node_modules ./web/node_modules
COPY --from=build /app/shared ./shared

COPY workspace ./workspace
COPY database/data/funding/curated ./database/data/funding/curated

EXPOSE 3000

CMD ["node", "web/build"]
