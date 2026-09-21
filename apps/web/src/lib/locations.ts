export type LocationRow = { row: number; postcode: string; lat: number | null; long: number | null };
export type LocationLayer = { name: string; rows: LocationRow[]; skipped: number; visible: boolean };
export const isMappedLocation = (row: LocationRow): row is LocationRow & { lat: number; long: number } =>
  row.lat !== null && row.long !== null && Number.isFinite(row.lat) && Number.isFinite(row.long);

// Read only the header record, including quoted commas, escaped quotes and newlines.
export function readCsvHeaders(text: string): string[] {
  const headers: string[] = [];
  let field = '';
  let quoted = false;
  const source = text.replace(/^\uFEFF/, '');
  for (let index = 0; index < source.length; index++) {
    const char = source[index];
    if (char === '"') {
      if (quoted && source[index + 1] === '"') { field += '"'; index++; }
      else quoted = !quoted;
    } else if (char === ',' && !quoted) { headers.push(field.trim()); field = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) break;
    else field += char;
  }
  if (quoted) throw new Error('The CSV header has an unclosed quote.');
  headers.push(field.trim());
  return headers.filter((header, index, all) => header && all.indexOf(header) === index && all.lastIndexOf(header) === index);
}
