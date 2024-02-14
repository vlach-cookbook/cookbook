import node from "@astrojs/node";
import solidJs from "@astrojs/solid-js";
import sentry from "@sentry/astro";
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: node({
    mode: 'standalone'
  }),
  integrations: [solidJs(), sentry({
    dsn: process.env.SENTRY_DSN,
    release: process.env.SENTRY_RELEASE,
    environment: process.env.SENTRY_ENVIRONMENT ?? "development",
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    sourceMapsUploadOptions: {
      org: "jeffrey-yasskin",
      project: "vlach-cookbook",
      authToken: process.env.SENTRY_AUTH_TOKEN,
    },
  })]
});
