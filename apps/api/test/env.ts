// Placeholder URI: each test file starts its own in-memory server and connects to it.
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';
process.env.MONGO_URI = 'mongodb://127.0.0.1:1/unused';
process.env.WEB_ORIGIN = 'http://localhost:3000';
process.env.JWT_ACCESS_SECRET = 'test-secret-that-is-long-enough-for-hs256-signing';
process.env.COOKIE_SECURE = 'false';
// Google is "configured" so the callback route runs; the code exchange itself is mocked.
process.env.GOOGLE_CLIENT_ID = 'test-client-id.apps.googleusercontent.com';
process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
process.env.ADMIN_EMAILS = 'allowed.admin@example.com';
