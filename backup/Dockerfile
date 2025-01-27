# syntax = docker/dockerfile:1

FROM node:20-alpine as base

# Node.js app lives here
WORKDIR /app

# Set production environment
ENV NODE_ENV="production"

# Install pnpm
RUN corepack enable

# Throw-away build stage to reduce size of final image
FROM base as build

# Install node modules
COPY --link package.json pnpm-lock.yaml ./
RUN --mount=type=cache,target=/root/.local/share/pnpm/store/v3 pnpm install --frozen-lockfile --prod=false

# Copy application code
COPY --link . .

# Build application
RUN pnpm run build

# Remove development dependencies
RUN pnpm prune --prod


# Final stage for app image
FROM base

RUN apk add --no-cache postgresql16-client

# Copy built application
COPY --from=build /app /app

# Start the server by default, this can be overwritten at runtime
EXPOSE 3000
ENV HOST=0.0.0.0 PORT=3000
CMD [ "pnpm", "run", "start" ]
