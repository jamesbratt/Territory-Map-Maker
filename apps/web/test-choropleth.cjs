const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const { readFileSync } = require('node:fs');
const output = ts.transpileModule(readFileSync(`${__dirname}/src/lib/choropleth.ts`, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const compiled = { exports: {} };
new Function('module', 'exports', output)(compiled, compiled.exports);
const { createChoropleth, CHOROPLETH_COLORS, NO_DATA_COLOR, formatChoroplethValue } = compiled.exports;
const selection = { center: [-2, 54], districts: ['A', 'B', 'C', 'D'] };
const row = (district, value, status = 'complete') => ({ district, status, metrics: [{ key: 'age', label: 'Under 18', value }, { key: 'other', label: 'Other', value: 99999 }] });
const response = (districts) => ({ signal: { unit: 'people' }, districts });

test('selected variable drives scale, zero remains data, and out-of-radius districts are excluded', () => {
  const map = createChoropleth(selection, response([row('A', 0), row('B', 50), row('C', 100), row('D', null), row('OUTSIDE', 999999)]), 'age');
  assert.equal(map.min, 0);
  assert.equal(map.max, 100);
  assert.equal(map.colors.A, CHOROPLETH_COLORS[0]);
  assert.equal(map.colors.B, CHOROPLETH_COLORS[2]);
  assert.equal(map.colors.C, CHOROPLETH_COLORS[4]);
  assert.equal(map.colors.D, NO_DATA_COLOR);
  assert.equal(map.values.OUTSIDE, undefined);
});
test('equal, missing and partial data have explicit stable representations', () => {
  const map = createChoropleth(selection, response([row('A', 10), row('B', 10, 'partial'), row('C', NaN), row('D', 123, 'no-data')]), 'age');
  assert.equal(map.min, map.max);
  assert.equal(map.colors.A, map.colors.B);
  assert.deepEqual(map.partial, ['B']);
  assert.equal(map.values.C, null);
  assert.equal(map.values.D, null);
  const empty = createChoropleth(selection, response([row('A', null)]), 'age');
  assert.equal(empty.min, null);
  assert.equal(empty.max, null);
  assert.ok(Object.values(empty.colors).every(color => color === NO_DATA_COLOR));
});
test('all variables and invalid variables clear map styling; income uses annual currency', () => {
  const data = response([row('A', 100)]);
  assert.equal(createChoropleth(selection, data, ''), null);
  assert.equal(createChoropleth(selection, data, 'missing'), null);
  assert.equal(formatChoroplethValue(34333.4, 'GBP/year'), '£34,333');
  assert.equal(formatChoroplethValue(0, 'people'), '0');
  assert.equal(formatChoroplethValue(null, 'people'), 'No data');
});
