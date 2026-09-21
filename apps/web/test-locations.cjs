const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const { readFileSync } = require('node:fs');
const output = ts.transpileModule(readFileSync(`${__dirname}/src/lib/locations.ts`, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const compiled = { exports: {} };
new Function('module', 'exports', output)(compiled, compiled.exports);
const { readCsvHeaders, isMappedLocation } = compiled.exports;
test('postcode mapping reads quoted, escaped, BOM and multiline headers', () => {
  assert.deepEqual(readCsvHeaders('\uFEFF"Company, name","Postcode","Say ""hello"""\r\nAcme,AB101AA,Hi'), ['Company, name', 'Postcode', 'Say "hello"']);
  assert.deepEqual(readCsvHeaders('"Customer\nname",Postcode\nA,B'), ['Customer\nname', 'Postcode']);
  assert.deepEqual(readCsvHeaders('Postcode,Postcode,Name'), ['Name']);
  assert.deepEqual(readCsvHeaders(''), []);
  assert.throws(() => readCsvHeaders('"Postcode'));
});
test('null coordinates never become markers at zero', () => {
  assert.equal(isMappedLocation({ lat: null, long: null }), false);
  assert.equal(isMappedLocation({ lat: 51.5, long: 0 }), true);
  assert.equal(isMappedLocation({ lat: NaN, long: 0 }), false);
});
