# syntax=docker/dockerfile:1.7

# --------------------------------------------------------------------------
# Stage 1 — build the static site.
#
# Uses the Node version pinned by the monorepo's `engines` field (>=20.11)
# and the exact pnpm version declared in `packageManager`. Workspace
# packages and tooling are built first (the root `build` script handles
# that), then the Vite-based web app is built against those fresh dists.
# --------------------------------------------------------------------------
# `--platform=$BUILDPLATFORM` pins the heavy Node build stage to the
# native architecture of the build host (the GitHub runner is amd64).
# The downstream nginx stage is the only one that respects the target
# platform, so cross-arch builds (e.g. linux/arm64 for Raspberry Pi)
# stay fast — we never run pnpm + tsc + Vite under QEMU emulation.
FROM --platform=$BUILDPLATFORM node:20.11-alpine AS builder

# Corepack ships with Node 20 and can activate the project's pnpm version
# without a global install. Pin the version explicitly so the build is
# reproducible even if upstream Node images ship newer Corepack lanes.
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

WORKDIR /app

# Copy the full source. `.dockerignore` drops node_modules, dist, .git,
# etc., so the context stays small. We deliberately don't try to
# pre-copy every workspace's package.json for layer caching — the full
# monorepo is small enough that the simple path wins on maintenance
# cost, and BuildKit's cache mount below keeps rebuilds fast.
COPY . .

# pnpm's content-addressable store benefits massively from a cache mount
# on repeat builds. --frozen-lockfile keeps the install deterministic.
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# Build library packages + tooling first (tsc emits the dists the web
# app imports), then the web app (tsc --noEmit + vite build).
RUN pnpm build \
 && pnpm --filter @nanovnaweb/web build

# --------------------------------------------------------------------------
# Stage 2 — serve the static build.
#
# nginx is stateless, small, and handles the SPA fallback + PWA cache
# headers the Vite build expects. No Node runtime in the final image.
# --------------------------------------------------------------------------
FROM nginx:1.27-alpine AS runtime

# Drop the default "welcome to nginx" site.
RUN rm -f /etc/nginx/conf.d/default.conf

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# Healthcheck: fetch the SPA entrypoint. Uses wget because it's already
# present in nginx:alpine; no curl dependency.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ > /dev/null || exit 1

EXPOSE 80

# The base image's CMD (`nginx -g "daemon off;"`) is correct — inherit.
