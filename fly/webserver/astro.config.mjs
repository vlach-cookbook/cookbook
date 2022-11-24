import { defineConfig } from 'astro/config';
import node from "@astrojs/node";

// https://astro.build/config
import solidJs from "@astrojs/solid-js";

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: node(),
  integrations: [solidJs()]
});