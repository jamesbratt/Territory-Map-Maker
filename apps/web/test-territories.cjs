const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const { readFileSync } = require('node:fs');
const output = ts.transpileModule(readFileSync(`${__dirname}/src/lib/territories.ts`, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const compiled = { exports: {} };
new Function('module', 'exports', output)(compiled, compiled.exports);
const { toggleDistrict, parseTerritories } = compiled.exports;
const initial = [
  { id: 'a', name: 'North', color: '#2563eb', districts: ['AB10'] },
  { id: 'b', name: 'South', color: '#0d9488', districts: [] },
];
test('districts transfer exclusively, toggle off, and leave the input intact', () => {
  const moved = toggleDistrict(initial, 'b', 'AB10');
  assert.deepEqual(moved.map(t => t.districts), [[], ['AB10']]);
  assert.deepEqual(toggleDistrict(moved, 'b', 'AB10').map(t => t.districts), [[], []]);
  assert.deepEqual(initial[0].districts, ['AB10']);
  assert.equal(toggleDistrict(initial, 'missing', 'AB10'), initial);
});
test('saved territories round-trip and invalid saves are rejected', () => {
  assert.deepEqual(parseTerritories(JSON.stringify(initial)), initial);
  assert.deepEqual(parseTerritories(null), []);
  assert.throws(() => parseTerritories('{broken'));
  assert.throws(() => parseTerritories('[{"id":1}]'));
});
