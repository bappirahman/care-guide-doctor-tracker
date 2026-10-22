# Doctor Tracker Web

The Next.js 16 client for Doctor Tracker: sign-in, the dashboard, and the doctors and patients pages. It holds no data of its own. Everything comes from the [API](../api/README.md), which the Next server proxies under `/api/*`.

**Live:** [doctortracker.boringdocs.dev](https://doctortracker.boringdocs.dev) · demo login `admin@example.com` / `DemoAdmin#2026`

This is one app in a monorepo. The [root README](../../README.md) covers setup with Docker, the system architecture and the technical decisions in depth.

## Running it

From the repo root, with the API running on port 4000:

```bash
cp apps/web/.env.example apps/web/.env
pnpm install
pnpm --filter web dev                       # http://localhost:3000
```

`pnpm dev` at the root starts this, the API and a watch build of `packages/shared` together.

## Scripts

Run with `pnpm --filter web <script>`.

| Script        | What it does                                                                               |
| ------------- | ------------------------------------------------------------------------------------------ |
| `dev`         | Next dev server on port 3000                                                               |
| `build`       | Production build (`output: 'standalone'`)                                                  |
| `start`       | Serves the production build on port 3000                                                   |
| `lint`        | ESLint with the Next.js and type-aware rules                                               |
| `typecheck`   | Generates Next's route types, then `tsc --noEmit`                                          |
| `screenshots` | Captures the desktop, mobile and dark screenshots in `docs/screenshots` from a running app |

## Environment

| Variable  | Notes                                                                                                                        |
| --------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `API_URL` | Where `/api/*` is proxied. Default `http://localhost:4000`. Read at **build** time, so rebuild or redeploy after changing it |

## How it talks to the API

The browser only ever calls this app's own origin. `next.config.ts` rewrites `/api/:path*` to `API_URL`, so the session cookies the API sets come back as first-party, `HttpOnly`, `SameSite=Lax` cookies, and the browser never needs CORS. The [root README](../../README.md#1-auth-cookies-across-a-separate-nextjs-client-and-express-api) explains the tradeoffs.

- **Route guard:** `src/proxy.ts` sends visitors without an access cookie to `/login`. When the access token has expired it redirects through `/api/v1/auth/resume`, which refreshes the session and comes straight back, so pages never flash a logged-out state. Express still verifies every request.
- **Data fetching:** TanStack Query, one `api.ts` of query and mutation hooks per feature. On a 401, `src/lib/api-client.ts` runs a single shared refresh and retries once.
- **URL state:** search, filters, sorting, pagination and date ranges live in the URL through `nuqs`, so every view can be shared and survives a reload.
- **Forms:** React Hook Form with the same Zod schemas the API validates against (`packages/shared`). Server-side field errors are mapped back onto the form fields.

## Layout

```
src/
  app/
    login/              sign-in page
    (portal)/           signed-in shell: sidebar, header, theme toggle
      dashboard/
      doctors/  doctors/[id]/
      patients/
  features/             one folder per area: api.ts hooks, views, dialogs, URL params
    auth/ dashboard/ doctors/ patients/
  components/
    ui/                 shadcn/ui primitives
    data-table/         the shared table, its search, filter and date-range controls, pagination
    layout/             sidebar, header, breadcrumbs, user menu, theme toggle
    shared/             confirm and responsive dialogs, empty, error and loading states
  lib/                  API client, date and number formatting, search-param parsers
  proxy.ts              route guard
```

Pages under `app/` stay thin and render a view from `features/`. UI is Tailwind CSS 4 with shadcn/ui on Radix, charts are Recharts, and light and dark themes come from `next-themes`.

## Deployment

Deployed to Vercel as its own project with Root Directory `apps/web` (see [`vercel.json`](vercel.json)). Set `API_URL` to the API's public URL before the build. [`Dockerfile`](Dockerfile) builds a standalone production image, taking `API_URL` as a build argument. Steps are in the [root README](../../README.md#deploying-to-vercel).
