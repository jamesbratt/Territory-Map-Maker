# UK Territory Maker

A UK postcode district territory editor built with React and MapLibre. Create a
territory in the right sidebar, then click districts to assign them. Click an
assigned district again to remove it. Selecting a district owned by another
territory transfers it. Rename, recolour, or delete territories in the sidebar;
press Escape or Done to leave selection mode.

Territories are saved in local storage in the current browser, not in the API.
The existing backend, upload routes, database and migration commands are retained.

Use **Customer / sales locations** in the sidebar to choose a CSV and its postcode
column. Markers appear above territories, with matched/unmatched counts, a list of
unmatched postcodes, and controls to zoom, show/hide, replace or remove the layer.
Clicking a marker shows its postcode and CSV record number without selecting the
district beneath it. Locations are held in the current tab only and clear on refresh.
Duplicate postcodes remain separate records and their markers overlap.

Each territory list item shows its marker total, calculated in the browser from
the uploaded coordinates and assigned district polygons. Counts update when the
upload or district assignments change, including when the layer is hidden. Polygon
holes are excluded; border points are included (a marker exactly on a shared
territory border counts in both territories, but only once within each territory).

## Structure

```text
apps/
  api/   Express, TypeORM, PostgreSQL and PostGIS
  web/   React, TypeScript, Vite and MapLibre
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

`GET /api/boundaries` returns `apps/api/src/boundaries/pcdistricts.json` unchanged.
This is TopoJSON; the web client converts it to GeoJSON for MapLibre. The API build
copies the file into `dist/boundaries` for production. The existing API startup
still requires the configured database. The basemap uses OpenStreetMap tiles and
requires an internet connection. Only districts present in the supplied file are
available for selection.

`POST /api/locations/upload` accepts multipart fields `file` (CSV) and `postcode`
(the column header). Like the original upload, it accepts up to 5 MB and processes
the first 1,000 non-empty data records. It reads only `pcd7`, `lat`, and `long` from
`postcodelookup`; no census enrichment or database writes are performed. The lookup
table must already be populated. Postcodes are normalized to uppercase and matched
against compact, spaced and fixed-width forms.

The response is an array of `{ row, postcode, lat, long }` in CSV order. Unknown
postcodes or unusable coordinates return `null` for both coordinates and are not
plotted. `X-Location-Rows-Skipped` reports rows beyond the 1,000-record limit. Missing
postcodes, missing or ambiguous column mappings and invalid CSV row lengths return
400; non-CSV files return 415; oversized files return 413. Files are processed in
memory and are not saved. The existing `/api/upload/bulk` endpoint is unchanged.

After `npm run build`, run the focused checks with:

```sh
node --test apps/web/test-territories.cjs apps/web/test-locations.cjs apps/web/test-territory-counts.cjs apps/api/scripts/test-boundaries.cjs apps/api/scripts/test-location-upload.cjs
```

## Commands

- `npm run dev` — run every workspace in development mode
- `npm run dev:api` — run only the API
- `npm run dev:web` — run only the UI
- `npm run build` — build every workspace
- `npm run typecheck` — type-check every workspace
- `npm run db:up` / `npm run db:down` — manage the local database
