import type { Feature, Polygon, Position } from 'geojson';
import { indexDistrictPolygons, locateMarkers } from './territory-counts';

export type RadiusSelection = { center: [number, number]; districts: string[] };
export const RADIUS_KM = 10;
const EARTH_KM = 6371.0088;
const radians = (degrees: number) => degrees * Math.PI / 180;

export function radiusCircle(center: [number, number]): Feature<Polygon> {
  const [lng, lat] = center.map(radians);
  const angle = RADIUS_KM / EARTH_KM;
  const ring: Position[] = [];
  for (let step = 0; step < 128; step++) {
    const bearing = step / 128 * 2 * Math.PI;
    const y = Math.asin(Math.sin(lat) * Math.cos(angle) + Math.cos(lat) * Math.sin(angle) * Math.cos(bearing));
    const x = lng + Math.atan2(Math.sin(bearing) * Math.sin(angle) * Math.cos(lat), Math.cos(angle) - Math.sin(lat) * Math.sin(y));
    ring.push([x * 180 / Math.PI, y * 180 / Math.PI]);
  }
  ring.push([...ring[0]]);
  return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [ring] } };
}

// Local azimuthal projection preserves distance from the chosen centre. Check
// edges as well as containment so partially intersecting districts are included.
function project(point: Position, center: [number, number]): [number, number] {
  const lat = radians(point[1]), originLat = radians(center[1]), delta = radians(point[0] - center[0]);
  const a = Math.sin((lat - originLat) / 2) ** 2 + Math.cos(originLat) * Math.cos(lat) * Math.sin(delta / 2) ** 2;
  const distance = 2 * EARTH_KM * Math.asin(Math.sqrt(Math.min(1, a)));
  const bearing = Math.atan2(Math.sin(delta) * Math.cos(lat), Math.cos(originLat) * Math.sin(lat) - Math.sin(originLat) * Math.cos(lat) * Math.cos(delta));
  return [distance * Math.sin(bearing), distance * Math.cos(bearing)];
}

export function districtsInRadius(index: ReturnType<typeof indexDistrictPolygons>, center: [number, number]): string[] {
  const matches = locateMarkers(index, [{ row: 0, postcode: '', long: center[0], lat: center[1] }])[0];
  const ring = radiusCircle(center).geometry.coordinates[0];
  const west = Math.min(...ring.map((p) => p[0])), east = Math.max(...ring.map((p) => p[0]));
  const south = Math.min(...ring.map((p) => p[1])), north = Math.max(...ring.map((p) => p[1]));
  for (const polygon of index) {
    const [w, s, e, n] = polygon.bounds;
    if (matches.has(polygon.district) || w > east || e < west || s > north || n < south) continue;
    const intersects = polygon.rings.some((boundary) => {
      const points = boundary.map((point) => project(point, center));
      return points.some(([x, y], i) => {
        const [bx, by] = points[(i + 1) % points.length];
        const dx = bx - x, dy = by - y, lengthSquared = dx * dx + dy * dy;
        const t = lengthSquared ? Math.max(0, Math.min(1, -(x * dx + y * dy) / lengthSquared)) : 0;
        return Math.hypot(x + t * dx, y + t * dy) <= RADIUS_KM;
      });
    });
    if (intersects) matches.add(polygon.district);
  }
  return [...matches].sort((a, b) => a.localeCompare(b, 'en-GB', { numeric: true }));
}
