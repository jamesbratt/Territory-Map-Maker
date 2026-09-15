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

## District ranking

The UI searches local authority districts (LADs), then ranks every postcode in
the selected district using the chosen persona's census variables. Results can
still be filtered, mapped, exported, and re-ranked with another persona.

- `GET /api/lads?q=Manchester` returns up to 30 `{ "code", "name" } options,
  ordered by name. Search matches names or codes, case-insensitively. Only LADs
  with postcode mappings are offered. An empty query returns the first 30.
- `POST /api/lads/:code/rank` accepts JSON such as
  `{ "censusVariables": ["age_25_34", "age_35_44"] }`. Personas use the same
  variable lists as before. It returns the existing enriched postcode array,
  sorted by descending affinity with unscored postcodes last. All matching
  postcodes are included; the CSV row limit does not apply. Unknown LAD codes
  return 404, invalid variables return 400, and districts without postcodes
  return an empty array.
- `POST /api/upload/bulk` remains available with its existing multipart fields
  (`file`, `postcode`, `censusVariables`), 5 MB limit, and 1,000-row limit.
  CSV input is no longer exposed in the UI; the API and upload client remain.

Both workflows share the same national percentile and affinity calculations.
The database must contain `lad_name_lookup`, `postcodelookup`, and census data.
Build the API before running migrations (the data source loads compiled
migrations): `npm run build`, then `npm run migration:run`. The new migration
adds an index on postcode LAD codes for district queries.

Run API regression checks with `npm run test --workspace @segment/api`.

## Command reference

- `npm run dev` — run every workspace in development mode
- `npm run dev:api` — run only the API
- `npm run dev:web` — run only the UI
- `npm run build` — build every workspace
- `npm run typecheck` — type-check every workspace
- `npm run db:up` / `npm run db:down` — manage the local database
