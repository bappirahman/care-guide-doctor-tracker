// Each package lints with its own eslint.config.js (type-aware, rooted at that
// package), so staged files go to ESLint inside the package they belong to.
const eslintIn = (pkg) => (files) =>
  `pnpm --filter ${pkg} exec eslint --max-warnings=0 --no-warn-ignored ${files
    .map((file) => JSON.stringify(file))
    .join(' ')}`;

export default {
  '*': 'prettier --write --ignore-unknown',
  'apps/api/**/*.{js,ts}': eslintIn('api'),
  'apps/web/**/*.{js,mjs,ts,tsx}': eslintIn('web'),
  'packages/shared/**/*.{js,ts}': eslintIn('@doctor-tracker/shared'),
};
