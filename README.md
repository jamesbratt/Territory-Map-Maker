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

Use **Explore 10 km radius** on the map to start a catchment search. Click a centre
point (or choose **Use map centre**); the map draws a fixed 10 km circle and the
sidebar switches to district demographics. Districts intersecting the circle are
included, even if only part of a district overlaps. Results currently come from a
the age-population API as postcode-weighted estimates for each district.
**Move radius** places a replacement; **Cancel** or Escape cancels
placement; **Back to workspace** clears the radius and restores the sidebar.
Territories, uploaded locations and upload form state are preserved.

The **Census signal** selector defaults to Population and also offers Occupation,
Household composition, Car & van availability, Socio-economic classification,
Household size, Household tenure, Economic activity, Accommodation type,
Qualifications and Household income. Switching signals retains the radius and
cancels the previous browser request. Some census categories include overlapping
subtotals, so their rows must not all be summed together.

`GET /api/demographics/signals` lists the available signals and their geography,
units and aggregation type. `POST /api/demographics/districts?signal=household-income`
accepts the same JSON district list as the age endpoint. Omitting `signal` defaults
to `population`. Only registered signals are accepted; database identifiers come
from the server's registry and entity metadata. Responses contain `signal`,
`methodology` and `districts`, each with `total`, `metrics` (key, label, value and
percentage), year, status and geography-neutral linked/matched/missing area counts.
The existing `/districts/age` endpoint remains available.

Count signals use postcode-weighted LSOA allocations and the latest year in each
signal's table. Household income uses `postcodelookup.msoa21cd` and the MSOA income
table. Before/after housing cost values are averaged, weighted by the number of
unique district postcodes in each MSOA with income data. They are annual GBP
estimates, not additive totals or household-weighted averages. Stored income is in
GBP thousands and is multiplied by 1,000 for the API and UI (34.333 becomes £34,333).
The source data is unchanged. Income returns no
total or percentages, and year is null because the table has no date column.
Missing MSOA mappings and income records appear as missing or partial coverage.

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

`POST /api/demographics/districts/age` accepts JSON such as
`{"districts":["SW1A","M1"]}` (maximum 300 district entries). It normalizes and
deduplicates the requested district codes, derives each postcode's district by
removing its last three characters, and allocates each LSOA's age populations using
each district's share of its unique mapped postcodes. Denominators include all
districts, including those outside the request. It returns `districts` containing
the data year, estimated population, eight estimated `ageBands`
(label, count and percentage), linked/matched/missing LSOA counts and a coverage
status (`complete`, `partial`, `no-mapping` or `no-data`). Missing data is `null`,
not zero. Empty requests return an empty list.

The latest year in `population_by_age_band` is used for all districts; older years
are not mixed in to fill gaps. Duplicate rows for the same LSOA/year use the most
recently updated record, with ID as a tie-breaker. Duplicate postcode/LSOA mappings
are removed after normalizing postcode case and whitespace. Each LSOA's population
is split among districts rather than repeated in every linked district. This
assumes equal residents per postcode, and the same age distribution throughout
each LSOA. The API identifies the methodology as `postcode-weighted-estimates`
and retains fractional counts; the sidebar rounds to whole people for display,
so displayed figures may not add up exactly. Estimates cover whole postcode
districts, not just the area inside the 10 km radius. Missing age data stays
missing and its share is not redistributed to other LSOAs or districts.
Bands follow the database schema: Under 18, 18–24, 25–34, 35–44, 45–54, 55–64,
65–74 and 75+. No demographic data or existing upload endpoints are modified.

After `npm run build`, run the focused checks with:

```sh
node --test apps/web/test-territories.cjs apps/web/test-locations.cjs apps/web/test-territory-counts.cjs apps/web/test-radius.cjs apps/api/scripts/test-boundaries.cjs apps/api/scripts/test-location-upload.cjs apps/api/scripts/test-district-demographics.cjs apps/api/scripts/test-census-signals.cjs
```

Set `TEST_DEMOGRAPHICS_DB=1` to include the PostgreSQL aggregation test using your
configured database. It uses temporary tables inside a rolled-back transaction;
existing application tables and data are not changed.

## Commands

- `npm run dev` — run every workspace in development mode
- `npm run dev:api` — run only the API
- `npm run dev:web` — run only the UI
- `npm run build` — build every workspace
- `npm run typecheck` — type-check every workspace
- `npm run db:up` / `npm run db:down` — manage the local database
