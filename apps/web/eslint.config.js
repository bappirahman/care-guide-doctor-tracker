import { next } from '@doctor-tracker/config/eslint/next';

const config = [
  ...next,
  { languageOptions: { parserOptions: { tsconfigRootDir: import.meta.dirname } } },
];

export default config;
