import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

const dirname =
  typeof __dirname !== 'undefined'
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: [
      {
        find: /^@gaia-tools\/aphrodite-shared\/(.*)$/,
        replacement: path.resolve(dirname, '../aphrodite-shared/src/$1'),
      },
      {
        find: '@gaia-tools/aphrodite-shared',
        replacement: path.resolve(dirname, '../aphrodite-shared/src'),
      },
      {
        find: /^@gaia-tools\/iris-core\/(.*)$/,
        replacement: path.resolve(dirname, '../iris-core/src/$1'),
      },
      {
        find: '@gaia-tools/iris-core',
        replacement: path.resolve(dirname, '../iris-core/src'),
      },
    ],
  },
});

