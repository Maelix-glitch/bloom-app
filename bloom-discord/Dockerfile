# syntax=docker/dockerfile:1.7
#
# One image, three bots.
#
# The applications share every dependency and differ only in which entry point
# runs, so building three images would mean three copies of the same layers and
# three chances for them to drift apart. `BOT` selects the entry point at run
# time; `docker compose` sets it per service.
#
#   docker build -t bloom-discord .
#   docker run --env-file .env -e BOT=guardian bloom-discord

ARG NODE_VERSION=24.21.0

# ── Stage 1: dependencies ────────────────────────────────────────────────────
# Split from the build so a source-only change does not re-resolve the tree.
FROM node:${NODE_VERSION}-bookworm-slim AS deps

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable

WORKDIR /app

# Only the manifests, so this layer caches until a dependency actually changes.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared-types/package.json  packages/shared-types/
COPY packages/utils/package.json         packages/utils/
COPY packages/validation/package.json    packages/validation/
COPY packages/logging/package.json       packages/logging/
COPY packages/config/package.json        packages/config/
COPY packages/database/package.json      packages/database/
COPY packages/security/package.json      packages/security/
COPY packages/permissions/package.json   packages/permissions/
COPY packages/embeds/package.json        packages/embeds/
COPY packages/commands/package.json      packages/commands/
COPY packages/events/package.json        packages/events/
COPY packages/discord/package.json       packages/discord/
COPY packages/testing/package.json       packages/testing/
COPY apps/guardian/package.json          apps/guardian/
COPY apps/companion/package.json         apps/companion/
COPY apps/labs/package.json              apps/labs/

# --frozen-lockfile: a build that quietly resolves a different tree than the one
# tested is not a reproducible build.
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# ── Stage 2: build ───────────────────────────────────────────────────────────
FROM deps AS build

WORKDIR /app
COPY tsconfig.base.json tsconfig.json ./
COPY packages/ packages/
COPY apps/ apps/

RUN pnpm exec tsc --build

# Drop dev dependencies from the tree that will be copied into the runtime.
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm prune --prod

# ── Stage 3: runtime ─────────────────────────────────────────────────────────
FROM node:${NODE_VERSION}-bookworm-slim AS runtime

ENV NODE_ENV=production
ENV BLOOM_ENVIRONMENT=production
ENV HEALTH_PORT=8080

# Stamped at build time, surfaced by /health and every log line.
#
# Without this the platform reports the version hard-coded in package.json,
# which is the same string for every build ever made — so the one question an
# incident always starts with, "which build is actually running", could not be
# answered from the running system. CI passes the commit SHA.
ARG BLOOM_VERSION=unknown
ENV BLOOM_VERSION=${BLOOM_VERSION}

# tini reaps zombies and, more importantly, forwards SIGTERM to the process so
# the graceful shutdown path actually runs. Without an init, PID 1 ignores
# SIGTERM by default and the container is killed after the grace period.
RUN apt-get update \
 && apt-get install --no-install-recommends -y tini \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# node:*-slim ships a non-root `node` user. Running as root inside a container
# that holds three bot tokens is not a risk worth taking for zero benefit.
COPY --from=build --chown=node:node /app/node_modules  ./node_modules
COPY --from=build --chown=node:node /app/packages      ./packages
COPY --from=build --chown=node:node /app/apps          ./apps
COPY --from=build --chown=node:node /app/package.json  ./package.json
COPY --chown=node:node database/                       ./database/
COPY --chown=node:node scripts/                        ./scripts/

USER node
EXPOSE 8080

# Liveness only — readiness is /ready, which orchestrators query separately.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.HEALTH_PORT||8080)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ARG BOT=guardian
ENV BOT=${BOT}

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["sh", "-c", "exec node apps/${BOT}/dist/main.js"]
