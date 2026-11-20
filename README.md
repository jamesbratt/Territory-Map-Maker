# UK Territory Map Maker

Draw territories by grouping UK postcode districts on an interactive map. Upload a CSV to plot customer or sales locations, or explore estimated local demographics with a 10 km radius.

Created using OpenAI Codex.

## Tech and data

The frontend uses React, TypeScript, Vite and MapLibre. The API uses Express and TypeORM with PostgreSQL and PostGIS.

The map uses bundled UK postcode district boundaries (TopoJSON) and OpenStreetMap tiles. The database supplies postcode coordinates, Census 2021 data and household income estimates.

## Run locally

1. Install Node.js and Docker with Docker Compose.
2. Copy `.env.example` to `.env`. For the local Docker database, set `DB_PORT=5433`, `DB_USERNAME=postgres` and `DB_PASSWORD=postgres`.
3. Run `npm install`, then `npm run db:up`.
4. For a fresh database, run `npm run build --workspace @segment/api` followed by `npm run migration:run`. CSV uploads require a populated postcode lookup. Demographic queries also require census and income data.
5. Run `npm run dev` and open [http://localhost:5173](http://localhost:5173).
