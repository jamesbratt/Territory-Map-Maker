const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const { readFileSync } = require('node:fs');
const output = ts.transpileModule(readFileSync(`${__dirname}/src/lib/territory-counts.ts`, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const compiled = { exports: {} };
new Function('module', 'exports', output)(compiled, compiled.exports);
const { indexDistrictPolygons, locateMarkers, countTerritoryMarkers } = compiled.exports;
const square = (x, y, size) => [[x, y], [x + size, y], [x + size, y + size], [x, y + size], [x, y]];
const feature = (district, type, coordinates) => ({ type: 'Feature', properties: { district_code: district }, geometry: { type, coordinates } });
const boundaries = { type: 'FeatureCollection', features: [
  feature('A', 'Polygon', [square(0, 0, 4), square(1, 1, 1)]),
  feature('B', 'MultiPolygon', [[square(4, 0, 4)], [square(10, 0, 1)]]),
] };
const territory = (id, districts) => ({ id, name: id, color: '#2563eb', districts });
const locations = (points) => points.map(([long, lat], index) => ({ row: index + 2, postcode: 'IGNORED', lat, long }));

test('geometry handles holes, disjoint multipolygons, outside points and missing coordinates', () => {
  const markers = locateMarkers(indexDistrictPolygons(boundaries), locations([
    [0.5, 0.5], [1.5, 1.5], [10.5, 0.5], [20, 20], [null, null], [NaN, 2],
  ]));
  assert.deepEqual(markers.map((districts) => [...districts]), [['A'], [], ['B'], [], [], []]);
  assert.deepEqual(countTerritoryMarkers([territory('west', ['A']), territory('east', ['B'])], markers), { west: 1, east: 1 });
});

test('duplicates count separately and territory changes reuse district matches', () => {
  const markers = locateMarkers(indexDistrictPolygons(boundaries), locations([[0.5, 0.5], [0.5, 0.5], [5, 1]]));
  assert.deepEqual(countTerritoryMarkers([territory('one', ['A']), territory('two', ['B'])], markers), { one: 2, two: 1 });
  assert.deepEqual(countTerritoryMarkers([territory('one', []), territory('two', ['A', 'B'])], markers), { one: 0, two: 3 });
  assert.deepEqual(countTerritoryMarkers([territory('one', ['A'])], []), { one: 0 });
  assert.deepEqual(locateMarkers(indexDistrictPolygons(null), locations([[0.5, 0.5]])), [new Set()]);
});

test('edges and vertices are included, but shared districts never double-count within a territory', () => {
  const markers = locateMarkers(indexDistrictPolygons(boundaries), locations([[4, 2], [0, 0], [1, 1.5]]));
  assert.deepEqual(markers.map((districts) => [...districts]), [['A', 'B'], ['A'], ['A']]);
  assert.deepEqual(countTerritoryMarkers([territory('both', ['A', 'B'])], markers), { both: 3 });
  // A point exactly on a shared territory border belongs to both touching polygons.
  assert.deepEqual(countTerritoryMarkers([territory('west', ['A']), territory('east', ['B'])], markers), { west: 3, east: 1 });
});
