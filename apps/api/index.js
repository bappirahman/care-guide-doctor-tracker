// Vercel entrypoint. Vercel picks a root-level file that imports express over
// src/server.ts, so it runs the output of `pnpm build` instead of type-checking
// the sources again with its own settings (which mis-resolve helmet's types).
import 'express';
import './dist/server.js';
