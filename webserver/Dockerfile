# syntax=docker/dockerfile:1
FROM node:20-alpine

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,target=/root/.local/share/pnpm/store/v3 pnpm i --frozen-lockfile --prod

COPY prisma ./prisma
RUN pnpm prisma generate

RUN apk add --no-cache postgresql14-client

COPY . .
ARG GOOGLE_SITE_VERIFICATION
RUN if [ -n "${GOOGLE_SITE_VERIFICATION}" ]; then mkdir -p public; echo "google-site-verification: ${GOOGLE_SITE_VERIFICATION}" > public/${GOOGLE_SITE_VERIFICATION}; fi
ARG SENTRY_DSN
ARG SENTRY_ORG
ARG SENTRY_RELEASE
ARG SENTRY_ENVIRONMENT
RUN --mount=type=secret,id=SENTRY_AUTH_TOKEN \
    SENTRY_AUTH_TOKEN=$(cat /run/secrets/SENTRY_AUTH_TOKEN) \
    pnpm run build

# Setting HOST is really important so the server listens to external connections.
EXPOSE 4321
ENV HOST=0.0.0.0 PORT=4321
CMD ["pnpm", "run", "start"]
