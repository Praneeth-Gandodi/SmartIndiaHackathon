# AGNI DRISHTI — PS 26162 selection demo
#
# Multi-stage build: compile the Create React App bundle with Node, then serve
# the static output with nginx. The final image contains no Node, no npm and
# no source, just the built assets.
#
# Build and run:
#   docker build -t agni-drishti .
#   docker run --rm -p 3000:80 agni-drishti
#   open http://localhost:3000

# ---------- Stage 1: build ----------
# Node 24 (npm 11) because the checked-in package-lock.json is only in sync
# with npm 11. Under npm 10 the same lockfile fails `npm ci` with
# "Missing: yaml@2.9.1 from lock file". It also satisfies concurrently@10.0.5,
# which declares node >=22.
FROM node:24-alpine AS build

WORKDIR /app

# Dependencies are copied first so the install layer is cached and only
# re-runs when package.json changes, not on every source edit.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# CI=true makes react-scripts treat warnings as errors off and skips the
# interactive prompt, so the build is non-interactive in a container.
ENV CI=true
ENV GENERATE_SOURCEMAP=false
RUN npm run build

# ---------- Stage 2: serve ----------
FROM nginx:1.27-alpine AS runtime

# The build stage already runs as a non-root user, so copy with --chown to
# avoid a pointless root-owned layer.
COPY --from=build --chown=nginx:nginx /app/build /usr/share/nginx/html
COPY --chown=nginx:nginx nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# Probe 127.0.0.1 rather than localhost: on Alpine, localhost resolves to
# IPv6 ::1 first and nginx here listens on IPv4 only, so a localhost probe
# fails with "connection refused" while the published port works fine.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
