# Doctor Tracker API

The Express 5 REST API behind Doctor Tracker. It owns all data and all authorization: sessions, doctors, patients and the dashboard aggregation, stored in MongoDB through Mongoose.

**Live:** [api.doctortracker.boringdocs.dev](https://api.doctortracker.boringdocs.dev/health)

This is one app in a monorepo. The [root README](../../README.md) covers setup with Docker, the system architecture and the technical decisions in depth.

## Running it

From the repo root, with MongoDB running (`docker compose up -d mongo`):

```bash
cp apps/api/.env.example apps/api/.env      # set JWT_ACCESS_SECRET to 32+ random characters
pnpm install
pnpm seed                                   # admin, 50 doctors, 5,000 patients
pnpm --filter api dev                       # http://localhost:4000, reloads on change
```

`pnpm dev` at the root runs this together with the web app and rebuilds `packages/shared` on change.

## Scripts

Run with `pnpm --filter api <script>`, or the root shortcuts noted below.

| Script       | What it does                                                                                 |
| ------------ | -------------------------------------------------------------------------------------------- |
| `dev`        | Starts the API with `tsx watch`, reading `.env`                                              |
| `build`      | Compiles `src/` to `dist/` with `tsc`                                                        |
| `start`      | Runs the compiled server (`node dist/server.js`)                                             |
| `test`       | Integration tests with Vitest and Supertest against an in-memory MongoDB. No database needed |
| `lint`       | ESLint with type-aware rules                                                                 |
| `typecheck`  | `tsc --noEmit`                                                                               |
| `seed`       | Creates the admin and, if there are no doctors yet, the demo data. Root: `pnpm seed`         |
| `db:reset`   | Drops the database in `MONGO_URI`, then seeds. Root: `pnpm db:reset`                         |
| `seed:admin` | Creates one admin, or resets a password with `--reset-password`. Root: `pnpm seed:admin`     |
| `explain`    | Prints the query plans for the list and dashboard queries, to confirm they use their indexes |

`seed:admin` takes `--name`, `--email` and `--password`, falling back to the `SEED_ADMIN_*` variables:

```bash
pnpm seed:admin -- --email ops@example.com --name "Ops Admin" --password 'Choose#AStrong1'
```

## Environment

Validated with Zod on startup (`src/config/env.ts`). The process exits with a list of problems if anything is missing or malformed. See [`.env.example`](.env.example).

| Variable                    | Required | Notes                                                                                   |
| --------------------------- | -------- | --------------------------------------------------------------------------------------- |
| `MONGO_URI`                 | yes      | Include the database name, e.g. `.../doctor-tracker`. Without one, MongoDB uses `test`  |
| `JWT_ACCESS_SECRET`         | yes      | At least 32 characters. `openssl rand -base64 48`                                       |
| `WEB_ORIGIN`                | yes      | The web app's origin. Used for CORS and to build the Google redirect URI                |
| `NODE_ENV`                  | no       | `production` turns on `Secure` cookies                                                  |
| `PORT`                      | no       | Default `4000`                                                                          |
| `LOG_LEVEL`                 | no       | Pino level, default `info`                                                              |
| `JWT_ACCESS_TTL_SECONDS`    | no       | Default `900` (15 minutes)                                                              |
| `REFRESH_TOKEN_TTL_SECONDS` | no       | Default `604800` (7 days)                                                               |
| `COOKIE_SECURE`             | no       | Overrides the `NODE_ENV` default. Safari refuses `Secure` cookies on `http://localhost` |
| `GOOGLE_CLIENT_ID`          | no       | With the secret, enables "Continue with Google"                                         |
| `GOOGLE_CLIENT_SECRET`      | no       |                                                                                         |
| `GOOGLE_REDIRECT_URI`       | no       | Defaults to `${WEB_ORIGIN}/api/v1/auth/google/callback`. Leave unset in production      |
| `ADMIN_EMAILS`              | no       | Comma-separated. Google accounts allowed to sign in without an existing user            |
| `SEED_ADMIN_*`              | no       | Name, email and password of the admin the seed creates. Quote values containing `#`     |

## Endpoints

Everything is under `/api/v1`. Apart from the auth routes, every endpoint needs a valid session and the `admin` role, so unknown paths return 401 to anonymous callers rather than 404.

| Method                 | Path                                    | Notes                                                                                            |
| ---------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `GET`                  | `/health` (no prefix)                   | Pings MongoDB. `{ "status": "ok" }` or 503                                                       |
| `POST`                 | `/auth/login`                           | Email and password. Sets the session cookies. Failed attempts are rate limited                   |
| `POST`                 | `/auth/refresh`                         | Rotates the refresh token                                                                        |
| `GET`                  | `/auth/resume`                          | Refreshes and redirects back to `next`. Used by the web app's route guard                        |
| `POST`                 | `/auth/logout`                          | Revokes the whole session                                                                        |
| `GET`                  | `/auth/me`                              | The signed-in user                                                                               |
| `GET`                  | `/auth/providers`                       | Which sign-in methods are configured                                                             |
| `GET`                  | `/auth/google`, `/auth/google/callback` | Google OAuth with PKCE                                                                           |
| `GET` `POST`           | `/doctors`                              | List: `search`, `specialization`, `hospital`, `from`, `to`, `sort`, `page`, `limit`              |
| `GET`                  | `/doctors/filters`                      | Specializations and hospitals in use, for filter menus                                           |
| `GET` `PATCH` `DELETE` | `/doctors/:id`                          | Detail includes patient counts by condition                                                      |
| `GET` `POST`           | `/patients`                             | List: `search`, `condition`, `doctorId` (or `unassigned`), `from`, `to`, `sort`, `page`, `limit` |
| `GET` `PATCH` `DELETE` | `/patients/:id`                         |                                                                                                  |
| `GET`                  | `/stats/overview`                       | Dashboard: `from`, `to`, `interval` (`day` or `week`), `top`                                     |

Filters that accept several values take repeated keys, e.g. `?condition=critical&condition=recovering`. `limit` defaults to 20 and is capped at 100.

Responses:

- lists: `{ data: [...], meta: { page, limit, total, totalPages } }`
- single items: `{ data: {...} }`
- errors: `{ error: { code, message, details? } }`, where `details` carries field-level validation messages

## Layout

```
src/
  server.ts          connects to MongoDB, starts listening, shuts down cleanly
  app.ts             middleware (helmet, cors, pino-http, cookies), routers, error handler
  config/env.ts      environment schema
  middleware/        Zod request validation and the central error handler
  lib/               HttpError, logger, list-query and search helpers
  modules/
    auth/            sessions, tokens, cookies, Google OAuth, requireAuth / requireRole
    doctors/         routes → controller → service → model
    patients/
    stats/           the dashboard aggregation
    users/
  scripts/           seed, seed:admin, explain
test/                integration tests, one in-memory MongoDB per file
```

Each module is layered routes → controller → service → model. Controllers have no `try`/`catch`: Express 5 forwards rejected promises to the one error handler.

## Deployment

Deployed to Vercel as its own project with Root Directory `apps/api` (see [`vercel.json`](vercel.json)). Vercel builds `packages/shared` and this app, then runs `index.js`, which loads the compiled `dist/server.js`. [`Dockerfile`](Dockerfile) builds a production image for Docker or any container host. Steps for both are in the [root README](../../README.md#deploying-to-vercel).
