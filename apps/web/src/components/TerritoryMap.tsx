import { useEffect, useRef, useState } from 'react';
import { Map, NavigationControl, Popup, LngLatBounds, type GeoJSONSource, type ExpressionSpecification } from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';
import type { Territory } from '../lib/territories';
import { isMappedLocation, type LocationLayer } from '../lib/locations';

type Props = { boundaries: FeatureCollection; territories: Territory[]; activeId: string | null; onToggle: (district: string) => void; locations: LocationLayer | null; locationZoom: number };
export function TerritoryMap({ boundaries, territories, activeId, onToggle, locations, locationZoom }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const popup = useRef<Popup | null>(null);
  const lastZoom = useRef(0);
  const latest = useRef({ activeId, onToggle });
  latest.current = { activeId, onToggle };
  const [loaded, setLoaded] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!container.current) return;
    let map: Map;
    try {
      map = new Map({ container: container.current, center: [-3.5, 55], zoom: 5, minZoom: 3,
        style: { version: 8, sources: { basemap: { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256, attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' } }, layers: [{ id: 'basemap', type: 'raster', source: 'basemap', paint: { 'raster-saturation': -0.8, 'raster-opacity': 0.65 } }] } });
    } catch { setError('The map could not start. Check that WebGL is enabled in your browser.'); return; }
    mapRef.current = map;
    map.addControl(new NavigationControl(), 'top-left');
    map.on('error', () => setError('Some map content could not load. Check your connection and reload to retry.'));
    map.on('load', () => {
      map.addSource('districts', { type: 'geojson', data: boundaries });
      map.addLayer({ id: 'district-fill', type: 'fill', source: 'districts', paint: { 'fill-color': '#94a3b8', 'fill-opacity': 0.15 } });
      map.addLayer({ id: 'district-line', type: 'line', source: 'districts', paint: { 'line-color': '#64748b', 'line-width': 0.7, 'line-opacity': 0.65 } });
      map.addLayer({ id: 'district-hover', type: 'line', source: 'districts', filter: ['==', ['get', 'district_code'], ''], paint: { 'line-color': '#0f172a', 'line-width': 2 } });
      map.addSource('locations', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({ id: 'location-markers', type: 'circle', source: 'locations', paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 4, 12, 8],
        'circle-color': '#be123c', 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2, 'circle-opacity': 0.95,
      } });
      setLoaded(true);
    });
    map.on('click', 'district-fill', (event) => {
      if (map.queryRenderedFeatures(event.point, { layers: ['location-markers'] }).length) return;
      const code = event.features?.[0]?.properties.district_code;
      if (code && latest.current.activeId) latest.current.onToggle(String(code));
    });
    map.on('click', 'location-markers', (event) => {
      const features = map.queryRenderedFeatures(event.point, { layers: ['location-markers'] });
      const feature = features[0];
      if (!feature || feature.geometry.type !== 'Point') return;
      popup.current?.remove();
      popup.current = new Popup({ offset: 10 }).setLngLat(feature.geometry.coordinates as [number, number])
        .setText(`${feature.properties.postcode} · CSV row ${feature.properties.row}${features.length > 1 ? ` · ${features.length} locations here` : ''}`)
        .addTo(map);
    });
    map.on('mouseenter', 'location-markers', () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', 'location-markers', () => { map.getCanvas().style.cursor = ''; });
    map.on('mousemove', 'district-fill', (event) => {
      const code = String(event.features?.[0]?.properties.district_code ?? '');
      setHover(code);
      map.setFilter('district-hover', ['==', ['get', 'district_code'], code]);
      const overLocation = map.queryRenderedFeatures(event.point, { layers: ['location-markers'] }).length > 0;
      map.getCanvas().style.cursor = latest.current.activeId || overLocation ? 'pointer' : 'grab';
    });
    map.on('mouseleave', 'district-fill', () => { setHover(null); map.setFilter('district-hover', ['==', ['get', 'district_code'], '']); map.getCanvas().style.cursor = ''; });
    const resize = new ResizeObserver(() => map.resize()); resize.observe(container.current);
    return () => { resize.disconnect(); popup.current?.remove(); map.remove(); mapRef.current = null; setLoaded(false); };
  }, [boundaries]);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    popup.current?.remove();
    const rows = locations?.rows.filter(isMappedLocation) ?? [];
    const source = map.getSource('locations') as GeoJSONSource;
    void source.setData({ type: 'FeatureCollection', features: rows.map((row) => ({
      type: 'Feature', id: row.row, geometry: { type: 'Point', coordinates: [row.long, row.lat] },
      properties: { postcode: row.postcode, row: row.row },
    })) }).catch(() => setError('Location markers could not be displayed. Reload and try uploading again.'));
    map.setLayoutProperty('location-markers', 'visibility', locations?.visible ? 'visible' : 'none');
    if (locationZoom !== lastZoom.current) {
      lastZoom.current = locationZoom;
      if (rows.length) {
        const bounds = rows.reduce((bounds, row) => bounds.extend([row.long, row.lat]), new LngLatBounds());
        map.fitBounds(bounds, { padding: { top: 110, bottom: 90, left: 50, right: 50 }, maxZoom: 13 });
      }
    }
  }, [locations, locationZoom, loaded]);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    const colors: Record<string, string> = {};
    const selected: string[] = [];
    for (const territory of territories) for (const district of territory.districts) {
      colors[district] = territory.color;
      if (territory.id === activeId) selected.push(district);
    }
    const color: ExpressionSpecification = ['coalesce', ['get', ['get', 'district_code'], ['literal', colors]], '#94a3b8'];
    map.setPaintProperty('district-fill', 'fill-color', color);
    map.setPaintProperty('district-fill', 'fill-opacity', ['case', ['in', ['get', 'district_code'], ['literal', selected]], 0.65, ['has', ['get', 'district_code'], ['literal', colors]], 0.4, 0.08]);
    map.setPaintProperty('district-line', 'line-color', color);
  }, [territories, activeId, loaded]);
  const active = territories.find((t) => t.id === activeId);
  const owner = territories.find((t) => hover && t.districts.includes(hover));
  return <section className="map-panel" aria-label="UK postcode district map">
    <div className="map-canvas" ref={container} />
    <div className={`map-mode ${active ? 'editing' : ''}`} role="status"><span className="mode-dot" style={{ background: active?.color }} /><span>{active ? `Selecting for ${active.name}` : 'Explore UK postcode districts'}<small>{active ? 'Click districts to add or remove them' : 'Select a territory to start assigning districts'}</small></span>{active && <kbd>Click to select</kbd>}</div>
    {error && <div className="map-error" role="alert">{error}</div>}
    {!loaded && !error && <div className="map-loading" role="status">Preparing the map…</div>}
    <div className="map-info"><strong>{hover || 'United Kingdom'}</strong><span>{hover ? owner?.name || 'Unassigned district' : `${boundaries.features.length.toLocaleString('en-GB')} postcode districts`}</span></div>
    <button className="reset-map" onClick={() => mapRef.current?.flyTo({ center: [-3.5, 55], zoom: 5 })}>Reset view</button>
  </section>;
}
