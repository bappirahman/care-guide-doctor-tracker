import mongoose from 'mongoose';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';

await mongoose.connect(env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });

const server = createApp().listen(env.PORT, () => {
  logger.info(`API listening on port ${env.PORT}`);
});

function shutdown(signal: NodeJS.Signals) {
  logger.info({ signal }, 'Shutting down');
  server.close(() => {
    void mongoose.disconnect().then(() => process.exit(0));
  });
}

process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);
