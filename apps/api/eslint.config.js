import { node } from '@doctor-tracker/config/eslint/node';

const config = [
  ...node,
  { languageOptions: { parserOptions: { tsconfigRootDir: import.meta.dirname } } },
];

export default config;
