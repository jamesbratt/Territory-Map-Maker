# Segment MVP

A TypeScript monorepo for the Segment API and web application.

## Structure

```text
apps/
  api/   Express, TypeORM, PostgreSQL and PostGIS
  web/   React, TypeScript, Vite and Chakra UI
```

Root-level `uploads/` and `census_data/` hold application data. Workspace scripts
keep development commands in one place.

## Getting started

1. Copy `.env.example` to `.env` and set the database values.
2. Install dependencies with `npm install`.
3. Start PostgreSQL with `npm run db:up`.
4. Start the API and UI together with `npm run dev`.

The UI runs at `http://localhost:5173` and proxies `/api` requests to the API at
`http://localhost:3000`.

## Commands

- `npm run dev` — run every workspace in development mode
- `npm run dev:api` — run only the API
- `npm run dev:web` — run only the UI
- `npm run build` — build every workspace
- `npm run typecheck` — type-check every workspace
- `npm run db:up` / `npm run db:down` — manage the local database
