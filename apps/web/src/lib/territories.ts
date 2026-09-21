export type Territory = { id: string; name: string; color: string; districts: string[] };
export const STORAGE_KEY = 'segment-territories-v1';
export const COLORS = ['#2563eb', '#0d9488', '#9333ea', '#ea580c', '#db2777', '#65a30d'];

export function parseTerritories(raw: string | null): Territory[] {
  if (!raw) return [];
  const value: unknown = JSON.parse(raw);
  if (!Array.isArray(value) || !value.every((t) => t && typeof t.id === 'string' &&
    typeof t.name === 'string' && t.name.trim() && /^#[0-9a-f]{6}$/i.test(t.color) &&
    Array.isArray(t.districts) && t.districts.every((d: unknown) => typeof d === 'string'))) {
    throw new Error('Saved territories could not be read.');
  }
  return value;
}

// A district has one owner. Clicking an owned district again removes it.
export function toggleDistrict(territories: Territory[], activeId: string, district: string): Territory[] {
  const active = territories.find((t) => t.id === activeId);
  if (!active) return territories;
  const removing = active.districts.includes(district);
  return territories.map((t) => ({ ...t, districts: t.id === activeId && !removing
    ? [...t.districts, district] : t.districts.filter((d) => d !== district) }));
}
