import { feature } from 'topojson-client';
import type { LocationRow } from './locations';
import type { Topology, GeometryCollection } from 'topojson-specification';
export async function getBoundaries(signal?: AbortSignal) {
  const response = await fetch(`${import.meta.env.VITE_API_URL ?? '/api'}/boundaries`, { signal });
  if (!response.ok) throw new Error(`Unable to load postcode boundaries (${response.status}).`);
  const topology = await response.json() as Topology<{ postcodedistrict: GeometryCollection<{ district_code: string }> }>;
  if (topology.type !== 'Topology' || !topology.objects?.postcodedistrict) throw new Error('Unexpected boundary file format.');
  const collection = feature(topology, topology.objects.postcodedistrict);
  collection.features.forEach((item) => { item.id = String(item.properties?.district_code); });
  return collection;
}

export async function uploadLocations(file: File, postcode: string, signal: AbortSignal) {
  const body = new FormData();
  body.append('file', file);
  body.append('postcode', postcode);
  const response = await fetch(`${import.meta.env.VITE_API_URL ?? '/api'}/locations/upload`, { method: 'POST', body, signal });
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.message ?? `Location upload failed (${response.status}). Please try again.`);
  }
  return { rows: await response.json() as LocationRow[], skipped: Number(response.headers.get('X-Location-Rows-Skipped') ?? 0) };
}
