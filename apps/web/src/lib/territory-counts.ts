import type { FeatureCollection, Position } from 'geojson';
import type { LocationRow } from './locations';
import type { Territory } from './territories';

type IndexedPolygon = { district: string; rings: Position[][]; bounds: [number, number, number, number] };

export function indexDistrictPolygons(boundaries: FeatureCollection | null): IndexedPolygon[] {
  return (boundaries?.features ?? []).flatMap((feature) => {
    const district = feature.properties?.district_code;
    const geometry = feature.geometry;
    if (typeof district !== 'string' || !geometry) return [];
    const polygons = geometry.type === 'Polygon' ? [geometry.coordinates]
      : geometry.type === 'MultiPolygon' ? geometry.coordinates : [];
    return polygons.filter((rings) => rings[0]?.length >= 3).map((rings) => {
      const bounds: IndexedPolygon['bounds'] = [Infinity, Infinity, -Infinity, -Infinity];
      for (const [x, y] of rings[0]) {
        bounds[0] = Math.min(bounds[0], x); bounds[1] = Math.min(bounds[1], y);
        bounds[2] = Math.max(bounds[2], x); bounds[3] = Math.max(bounds[3], y);
      }
      return { district, rings, bounds };
    });
  });
}

// Ray casting: 0 = outside, 1 = inside, 2 = on the ring boundary.
function inRing(x: number, y: number, ring: Position[]): 0 | 1 | 2 {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [ax, ay] = ring[j];
    const [bx, by] = ring[i];
    const cross = (x - ax) * (by - ay) - (y - ay) * (bx - ax);
    if (Math.abs(cross) <= Number.EPSILON * 16 * Math.max(1, Math.abs(bx - ax), Math.abs(by - ay)) &&
      x >= Math.min(ax, bx) && x <= Math.max(ax, bx) && y >= Math.min(ay, by) && y <= Math.max(ay, by)) return 2;
    if ((ay > y) !== (by > y) && x < (bx - ax) * (y - ay) / (by - ay) + ax) inside = !inside;
  }
  return inside ? 1 : 0;
}

function inPolygon(x: number, y: number, rings: Position[][]): boolean {
  const outer = inRing(x, y, rings[0]);
  if (!outer) return false;
  if (outer === 2) return true;
  for (const hole of rings.slice(1)) {
    const result = inRing(x, y, hole);
    if (result === 2) return true;
    if (result === 1) return false;
  }
  return true;
}

// Cache matching districts separately from territory assignments. Visibility, map
// zoom, renaming and district reassignment never require another geometry pass.
export function locateMarkers(index: IndexedPolygon[], rows: LocationRow[]): Set<string>[] {
  const coordinateCache = new Map<string, Set<string>>();
  return rows.map(({ lat, long }) => {
    if (lat === null || long === null || !Number.isFinite(lat) || !Number.isFinite(long)) return new Set<string>();
    const key = `${long},${lat}`;
    const cached = coordinateCache.get(key);
    if (cached) return cached;
    const districts = new Set<string>();
    for (const { district, rings, bounds: [west, south, east, north] } of index) {
      if (long < west || long > east || lat < south || lat > north || districts.has(district)) continue;
      if (inPolygon(long, lat, rings)) districts.add(district);
    }
    coordinateCache.set(key, districts);
    return districts;
  });
}

export function countTerritoryMarkers(territories: Territory[], markerDistricts: Set<string>[]): Record<string, number> {
  return Object.fromEntries(territories.map((territory) => {
    const assigned = new Set(territory.districts);
    // A marker can touch two districts of the same territory: count it only once.
    const count = markerDistricts.filter((districts) => [...districts].some((district) => assigned.has(district))).length;
    return [territory.id, count];
  }));
}
