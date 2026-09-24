import { useEffect, useRef, useState } from 'react';
import { Map, NavigationControl, Popup, LngLatBounds, type GeoJSONSource, type ExpressionSpecification } from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';
import type { Territory } from '../lib/territories';
import { isMappedLocation, type LocationLayer } from '../lib/locations';
import { radiusCircle, type RadiusSelection } from '../lib/radius';
import { CHOROPLETH_COLORS, NO_DATA_COLOR, formatChoroplethValue, type CensusChoropleth } from '../lib/choropleth';

type Props = { choropleth: CensusChoropleth | null; boundaries: FeatureCollection; territories: Territory[]; activeId: string | null; onToggle: (district: string) => void; locations: LocationLayer | null; locationZoom: number; radius: RadiusSelection | null; drawingRadius: boolean; onStartRadius: () => void; onCancelRadius: () => void; onRadiusCenter: (center: [number, number]) => void };
export function TerritoryMap({ boundaries, territories, activeId, onToggle, locations, locationZoom, radius, drawingRadius, onStartRadius, onCancelRadius, onRadiusCenter, choropleth }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const popup = useRef<Popup | null>(null);
  const lastZoom = useRef(0);
  const latest = useRef({ activeId, onToggle, drawingRadius, onRadiusCenter });
  latest.current = { activeId, onToggle, drawingRadius, onRadiusCenter };
  const [loaded, setLoaded] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!container.current) return;
    let map: Map;
    try {
      map = new Map({ container: container.current, center: [-3.5, 55], zoom: 5, minZoom: 3, cooperativeGestures: true,
        style: { version: 8, sources: { basemap: { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256, attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' } }, layers: [{ id: 'basemap', type: 'raster', source: 'basemap', paint: { 'raster-saturation': -0.8, 'raster-opacity': 0.65 } }] } });
    } catch { setError('The map could not start. Check that WebGL is enabled in your browser.'); return; }
    mapRef.current = map;
    map.addControl(new NavigationControl(), 'top-left');
    map.on('error', () => setError('Some map content could not load. Check your connection and reload to retry.'));
    map.on('load', () => {
      map.addSource('districts', { type: 'geojson', data: boundaries });
      map.addLayer({ id: 'district-fill', type: 'fill', source: 'districts', paint: { 'fill-color': '#94a3b8', 'fill-opacity': 0.15 } });
      map.addLayer({ id: 'census-fill', type: 'fill', source: 'districts', filter: ['in', ['get', 'district_code'], ['literal', []]], paint: { 'fill-color': NO_DATA_COLOR, 'fill-opacity': 0.92 } });
      map.addLayer({ id: 'district-line', type: 'line', source: 'districts', paint: { 'line-color': '#64748b', 'line-width': 0.7, 'line-opacity': 0.65 } });
      map.addLayer({ id: 'district-hover', type: 'line', source: 'districts', filter: ['==', ['get', 'district_code'], ''], paint: { 'line-color': '#0f172a', 'line-width': 2 } });
      map.addLayer({ id: 'radius-districts', type: 'line', source: 'districts', filter: ['in', ['get', 'district_code'], ['literal', []]], paint: { 'line-color': '#7c3aed', 'line-width': 2 } });
      map.addSource('radius', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({ id: 'radius-fill', type: 'fill', source: 'radius', filter: ['==', ['geometry-type'], 'Polygon'], paint: { 'fill-color': '#7c3aed', 'fill-opacity': 0.12 } });
      map.addLayer({ id: 'radius-outline', type: 'line', source: 'radius', filter: ['==', ['geometry-type'], 'Polygon'], paint: { 'line-color': '#6d28d9', 'line-width': 3, 'line-dasharray': [3, 2] } });
      map.addLayer({ id: 'radius-center', type: 'circle', source: 'radius', filter: ['==', ['geometry-type'], 'Point'], paint: { 'circle-radius': 6, 'circle-color': '#6d28d9', 'circle-stroke-color': '#fff', 'circle-stroke-width': 2 } });
      map.addSource('locations', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({ id: 'location-markers', type: 'circle', source: 'locations', paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 4, 12, 8],
        'circle-color': '#be123c', 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2, 'circle-opacity': 0.95,
      } });
      setLoaded(true);
    });
    map.on('click', 'district-fill', (event) => {
      if (latest.current.drawingRadius) return;
      if (map.queryRenderedFeatures(event.point, { layers: ['location-markers'] }).length) return;
      const code = event.features?.[0]?.properties.district_code;
      if (code && latest.current.activeId) latest.current.onToggle(String(code));
    });
    map.on('click', 'location-markers', (event) => {
      if (latest.current.drawingRadius) return;
      const features = map.queryRenderedFeatures(event.point, { layers: ['location-markers'] });
      const feature = features[0];
      if (!feature || feature.geometry.type !== 'Point') return;
      popup.current?.remove();
      popup.current = new Popup({ offset: 10 }).setLngLat(feature.geometry.coordinates as [number, number])
        .setText(`${feature.properties.postcode} · CSV row ${feature.properties.row}${features.length > 1 ? ` · ${features.length} locations here` : ''}`)
        .addTo(map);
    });
    map.on('click', (event) => {
      if (latest.current.drawingRadius) latest.current.onRadiusCenter([event.lngLat.lng, event.lngLat.lat]);
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
    const circle = radius ? radiusCircle(radius.center) : null;
    const data: FeatureCollection = { type: 'FeatureCollection', features: circle && radius ? [circle, { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: radius.center } }] : [] };
    void (map.getSource('radius') as GeoJSONSource).setData(data).catch(() => setError('The radius could not be displayed. Please try again.'));
    map.setFilter('radius-districts', ['in', ['get', 'district_code'], ['literal', radius?.districts ?? []]]);
    if (circle) {
      const bounds = new LngLatBounds();
      const selected = new Set(radius?.districts);
      for (const feature of boundaries.features) {
        if (!selected.has(feature.properties?.district_code)) continue;
        const geometry = feature.geometry;
        const polygons = geometry.type === 'Polygon' ? [geometry.coordinates]
          : geometry.type === 'MultiPolygon' ? geometry.coordinates : [];
        for (const polygon of polygons) for (const ring of polygon) for (const point of ring) {
          bounds.extend(point as [number, number]);
        }
      }
      // Keep empty selections visible when the radius is outside district coverage.
      if (bounds.isEmpty()) {
        for (const point of circle.geometry.coordinates[0]) bounds.extend(point as [number, number]);
      }
      map.fitBounds(bounds, { padding: { top: 110, bottom: 95, left: 45, right: 45 }, maxZoom: 12 });
    }
  }, [radius, loaded, boundaries]);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    map.setFilter('census-fill', ['in', ['get', 'district_code'], ['literal', choropleth ? radius?.districts ?? [] : []]]);
    map.setPaintProperty('census-fill', 'fill-color', ['coalesce', ['get', ['get', 'district_code'], ['literal', choropleth?.colors ?? {}]], NO_DATA_COLOR]);
    // Keep the radius outline, but avoid tinting the choropleth inside the circle.
    map.setPaintProperty('radius-fill', 'fill-opacity', choropleth ? 0 : 0.12);
  }, [choropleth, radius, loaded]);
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
  return <section className={`map-panel ${drawingRadius ? 'placing-radius' : ''} ${choropleth ? 'has-choropleth' : ''}`} aria-label="UK postcode district map">
    <div className="map-canvas" ref={container} />
    <div className={`map-mode ${active ? 'editing' : ''}`} role="status"><span className="mode-dot" style={{ background: drawingRadius || radius ? '#7c3aed' : active?.color }} /><span>{drawingRadius ? 'Click the map to place your 10 km radius' : radius ? '10 km radius · District demographics' : active ? `Selecting for ${active.name}` : 'Explore UK postcode districts'}<small>{drawingRadius ? 'Choose a centre point. Press Escape to cancel.' : radius ? 'Outlined districts intersect the circle · Census signals' : active ? 'Click districts to add or remove them' : 'Select a territory or explore a 10 km radius'}</small></span></div>
    <div className="radius-map-actions">{drawingRadius ? <><button className="primary" onClick={() => { const center = mapRef.current?.getCenter(); if (center) onRadiusCenter([center.lng, center.lat]); }}>Use map centre</button><button className="radius-cancel" onClick={onCancelRadius}>Cancel</button></> : <button className="primary" disabled={!loaded} onClick={onStartRadius}>{radius ? 'Move 10 km radius' : '◎ Explore 10 km radius'}</button>}</div>
    {error && <div className="map-error" role="alert">{error}</div>}
    {!loaded && !error && <div className="map-loading" role="status">Preparing the map…</div>}
    <div className="map-info"><strong>{hover || 'United Kingdom'}</strong><span>{hover && choropleth && Object.hasOwn(choropleth.values, hover)
      ? `${choropleth.label}: ${formatChoroplethValue(choropleth.values[hover], choropleth.unit)}${choropleth.unit === 'GBP/year' ? '/year' : ` ${choropleth.unit}`}${choropleth.partial.includes(hover) ? ' (partial coverage)' : ''}`
      : hover ? owner?.name || 'Unassigned district' : `${boundaries.features.length.toLocaleString('en-GB')} postcode districts`}</span></div>
    {choropleth && <div className="choropleth-legend" aria-label="Census map legend">
      <strong>{choropleth.label}</strong>
      <span className="legend-unit">Estimated {choropleth.unit === 'GBP/year' ? 'annual income (£)' : choropleth.unit}</span>
      {choropleth.min !== null && choropleth.max !== null ? <>
        <div className="choropleth-ramp" aria-hidden="true">{(choropleth.min === choropleth.max ? [CHOROPLETH_COLORS[2]] : CHOROPLETH_COLORS).map((color) => <span key={color} style={{ background: color }} />)}</div>
        <div className="legend-range"><span>{formatChoroplethValue(choropleth.min, choropleth.unit)}</span>{choropleth.max !== choropleth.min && <span>{formatChoroplethValue(choropleth.max, choropleth.unit)}</span>}</div>
        <small>{choropleth.min === choropleth.max ? 'All available values are equal' : '5 equal intervals across radius districts'}</small>
      </> : <small>No values available in this radius</small>}
      <div className="legend-no-data"><span style={{ background: NO_DATA_COLOR }} />No data</div>
      {!!choropleth.partial.length && <small>Includes districts with partial data; hover for details.</small>}
    </div>}
    <button className="reset-map" onClick={() => mapRef.current?.flyTo({ center: [-3.5, 55], zoom: 5 })}>Reset view</button>
  </section>;
}
