import { fileURLToPath } from 'node:url';

/** @type {import("prettier").Config} */
export default {
  printWidth: 100,
  singleQuote: true,
  trailingComma: 'all',
  // Resolved from this package: Prettier would otherwise look for the plugin at the repo root.
  plugins: [fileURLToPath(import.meta.resolve('prettier-plugin-tailwindcss'))],
  tailwindFunctions: ['cn', 'cva'],
};
