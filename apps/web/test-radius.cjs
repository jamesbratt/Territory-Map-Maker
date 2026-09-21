const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const ts = require('typescript');
function load(name) {
  const result = { exports: {} };
  const source = readFileSync(`${__dirname}/src/lib/${name}.ts`, 'utf8').replaceAll('import.meta.env.VITE_API_URL', 'undefined');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function('module', 'exports', 'require', code)(result, result.exports, (path) => load(path.replace('./', '')));
  return result.exports;
}
const { radiusCircle, districtsInRadius } = load('radius');
const { indexDistrictPolygons } = load('territory-counts');
const { getRadiusDemographics } = load('demographics');
const { getDistrictCensus, getCensusSignals, POPULATION_SIGNAL } = load('demographics');
const square = (x, y, size) => [[x,y],[x+size,y],[x+size,y+size],[x,y+size],[x,y]];
const polygon = (district, rings) => ({ type: 'Feature', properties: { district_code: district }, geometry: { type: 'Polygon', coordinates: rings } });
test('circle is closed and its vertices are 10 km from a UK centre', () => {
  const center = [-2, 54];
  const ring = radiusCircle(center).geometry.coordinates[0];
  assert.deepEqual(ring[0], ring.at(-1));
  for (const [lng, lat] of ring) {
    const rad = (n) => n * Math.PI / 180;
    const a = Math.sin(rad(lat-center[1])/2)**2 + Math.cos(rad(lat))*Math.cos(rad(center[1]))*Math.sin(rad(lng-center[0])/2)**2;
    const distance = 6371.0088 * 2 * Math.asin(Math.sqrt(a));
    assert.ok(Math.abs(distance-10) < 0.000001);
  }
});
test('radius includes enclosed districts, containing districts and crossing edges; excludes holes and distant districts', () => {
  const index = indexDistrictPolygons({ type: 'FeatureCollection', features: [
    polygon('inside', [square(.01,.01,.01)]),
    polygon('contains', [square(-1,-1,2)]),
    polygon('crosses', [[[-1,.05],[1,.05],[1,.2],[-1,.2],[-1,.05]]]),
    polygon('hole', [square(-1,-1,2), square(-.2,-.2,.4)]),
    polygon('outside', [square(1,1,1)]),
  ] });
  assert.deepEqual(districtsInRadius(index, [0,0]), ['contains','crosses','inside']);
  assert.deepEqual(districtsInRadius(index, [10,10]), []);
});
test('demographic adapter sends district list and cancellation signal, handles API errors and skips empty selections', async () => {
  const selection = { center: [-2,54], districts: ['AB10','AB11'] };
  const original = global.fetch;
  const signal = new AbortController().signal;
  const records = [{ district: 'AB10', population: 100 }];
  try {
    global.fetch = async (url, options) => {
      assert.equal(url, '/api/demographics/districts/age');
      assert.equal(options.method, 'POST');
      assert.equal(options.signal, signal);
      assert.deepEqual(JSON.parse(options.body), { districts: selection.districts });
      return { ok: true, json: async () => ({ districts: records }) };
    };
    assert.deepEqual(await getRadiusDemographics(selection, signal), records);
    global.fetch = async () => ({ ok: false, status: 400, json: async () => ({ message: 'Invalid districts' }) });
    await assert.rejects(getRadiusDemographics(selection, signal), /Invalid districts/);
    global.fetch = async () => { throw new Error('No request expected'); };
    assert.deepEqual(await getRadiusDemographics({ ...selection, districts: [] }, signal), []);
  } finally { global.fetch = original; }
});

test('census requests use selected signal, propagate cancellation, and handle catalogue failures', async () => {
  const original = global.fetch;
  const signal = new AbortController().signal;
  try {
    global.fetch = async (url, options) => {
      assert.equal(options.signal, signal);
      if (url.endsWith('/signals')) return { ok: true, json: async () => [POPULATION_SIGNAL] };
      assert.equal(url, '/api/demographics/districts?signal=household-income');
      assert.deepEqual(JSON.parse(options.body), { districts: ['M1'] });
      return { ok: true, json: async () => ({ signal: { key: 'household-income' }, districts: [] }) };
    };
    assert.deepEqual(await getCensusSignals(signal), [POPULATION_SIGNAL]);
    assert.equal((await getDistrictCensus({ districts: ['M1'] }, { key: 'household-income' }, signal)).signal.key, 'household-income');
    global.fetch = async () => ({ ok: false });
    await assert.rejects(getCensusSignals(signal), /Unable to load/);
    global.fetch = async () => { throw new DOMException('Aborted', 'AbortError'); };
    await assert.rejects(getDistrictCensus({ districts: ['M1'] }, POPULATION_SIGNAL, signal), { name: 'AbortError' });
  } finally { global.fetch = original; }
});
