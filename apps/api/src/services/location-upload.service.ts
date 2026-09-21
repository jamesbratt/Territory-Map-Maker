import csv from 'csv-parser';
import { Readable } from 'node:stream';

export const MAX_LOCATION_ROWS = 1_000;
export const MAX_LOCATION_BYTES = 5 * 1024 * 1024;
export class LocationCsvError extends Error {}
export type PostcodeCoordinates = { pcd7: string; lat: string | null; long: string | null };
export type LocationResult = { row: number; postcode: string; lat: number | null; long: number | null };
export const normalizePostcode = (value: string) => value.replace(/\s+/g, '').toUpperCase();

export async function readLocationCsv(buffer: Buffer, column: string) {
  const parser = Readable.from([buffer.toString('utf8').replace(/^\uFEFF/, '')]).pipe(csv({
    strict: true,
    maxRowBytes: MAX_LOCATION_BYTES,
    mapHeaders: ({ header }) => header.trim(),
  }));
  let headers: string[] = [];
  parser.on('headers', (value: string[]) => { headers = value; });
  const rows: { row: number; postcode: string }[] = [];
  let total = 0;
  try {
    for await (const record of parser) {
      if (Object.values(record).every((value) => String(value).trim() === '')) continue;
      total++;
      if (rows.length < MAX_LOCATION_ROWS) rows.push({ row: total + 1, postcode: String(record[column] ?? '').trim() });
    }
  } catch { throw new LocationCsvError('Invalid CSV. Check that every row has the same columns as the header.'); }
  if (!headers.length) throw new LocationCsvError('CSV file is empty');
  if (headers.filter((header) => header === column).length !== 1) {
    throw new LocationCsvError(`Choose a unique postcode column present in the CSV headers: "${column}".`);
  }
  if (!total) throw new LocationCsvError('CSV must contain at least one data row');
  const missing = rows.find((row) => !row.postcode);
  if (missing) throw new LocationCsvError(`Row ${missing.row} is missing postcode value`);
  return { rows, skipped: Math.max(0, total - MAX_LOCATION_ROWS) };
}

// Support compact, standard spaced and fixed-width pcd7 values with indexed lookups.
export function postcodeCandidates(postcodes: string[]) {
  return [...new Set(postcodes.flatMap((value) => {
    const compact = normalizePostcode(value);
    const outward = compact.slice(0, -3);
    const inward = compact.slice(-3);
    return [compact, `${outward} ${inward}`, `${outward.padEnd(4, ' ')}${inward}`];
  }))];
}

export function matchLocations(rows: { row: number; postcode: string }[], matches: PostcodeCoordinates[]): LocationResult[] {
  const coordinates = new Map(matches.map((match) => [normalizePostcode(match.pcd7), match]));
  return rows.map((row) => {
    const match = coordinates.get(normalizePostcode(row.postcode));
    const lat = match?.lat?.trim() ? Number(match.lat) : NaN;
    const long = match?.long?.trim() ? Number(match.long) : NaN;
    const valid = Number.isFinite(lat) && Number.isFinite(long) && lat >= -90 && lat <= 90 && long >= -180 && long <= 180;
    return { ...row, lat: valid ? lat : null, long: valid ? long : null };
  });
}
