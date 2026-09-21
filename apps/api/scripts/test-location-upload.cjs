const { test } = require('node:test');
const assert = require('node:assert/strict');
const { resolve } = require('node:path');
process.chdir(resolve(__dirname, '..'));
for (const [key, value] of Object.entries({ DB_HOST: 'localhost', DB_PORT: '5432', DB_USERNAME: 'test', DB_PASSWORD: 'test', DB_NAME: 'test' })) process.env[key] ??= value;
const { readLocationCsv, matchLocations, postcodeCandidates } = require('../dist/services/location-upload.service');
const { AppDataSource } = require('../dist/database/data-source');
const { app } = require('../dist/app');

test('CSV supports BOM, CRLF, quoted fields and multiline records; caps at 1,000', async () => {
  const result = await readLocationCsv(Buffer.from('\uFEFF"Customer, name",Postcode\r\n"Example\r\nCompany",sw1a 1aa\r\n'), 'Postcode');
  assert.deepEqual(result.rows, [{ row: 2, postcode: 'sw1a 1aa' }]);
  const capped = await readLocationCsv(Buffer.from('Postcode\n' + 'AB10 1AA\n'.repeat(1002)), 'Postcode');
  assert.equal(capped.rows.length, 1000);
  assert.equal(capped.skipped, 2);
  for (const [csv, column] of [['', 'Postcode'], ['Postcode\n', 'Postcode'], ['Name\nA', 'Postcode'], ['Name,Postcode\nA,', 'Postcode'], ['Postcode,Postcode\nA,B', 'Postcode'], ['Postcode,Name\nA,B,C', 'Postcode']]) {
    await assert.rejects(readLocationCsv(Buffer.from(csv), column));
  }
});

test('matching normalizes postcodes, preserves duplicates and excludes invalid coordinates', () => {
  const rows = ['sw1a 1aa', 'SW1A1AA', 'NOPE', 'AB101AA', 'AB111AA'].map((postcode, index) => ({ row: index + 2, postcode }));
  const result = matchLocations(rows, [
    { pcd7: 'SW1A 1AA', lat: '51.5', long: '-0.14' },
    { pcd7: 'AB101AA', lat: '', long: '0' },
    { pcd7: 'AB111AA', lat: '99.999999', long: '0' },
  ]);
  assert.deepEqual(result.map(({ lat, long }) => [lat, long]), [[51.5, -0.14], [51.5, -0.14], [null, null], [null, null], [null, null]]);
  assert.ok(postcodeCandidates(['m1 1aa']).includes('M1  1AA'));
});

test('new upload endpoint validates requests, uses only postcode coordinates and reports truncation', async () => {
  let query;
  const original = AppDataSource.getRepository;
  AppDataSource.getRepository = () => ({ find: async (options) => {
    query = options;
    return [{ pcd7: 'SW1A1AA', lat: '51.5', long: '-0.14' }];
  } });
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  async function upload(csv, name = 'customers.csv', column = 'Postcode') {
    const body = new FormData();
    if (csv !== null) body.append('file', new Blob([csv], { type: 'text/csv' }), name);
    if (column !== null) body.append('postcode', column);
    return fetch(`http://127.0.0.1:${server.address().port}/api/locations/upload`, { method: 'POST', body });
  }
  try {
    const response = await upload('Postcode\nsw1a 1aa\nUNKNOWN');
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), [{ row: 2, postcode: 'sw1a 1aa', lat: 51.5, long: -0.14 }, { row: 3, postcode: 'UNKNOWN', lat: null, long: null }]);
    assert.deepEqual(query.select, { pcd7: true, lat: true, long: true });
    assert.equal((await upload(null)).status, 400);
    assert.equal((await upload('Postcode\nA', 'a.txt')).status, 415);
    assert.equal((await upload('Postcode\nA', 'a.csv', null)).status, 400);
    assert.equal((await upload('Postcode\nA', 'a.csv', 'Missing')).status, 400);
    assert.equal((await upload('x'.repeat(5 * 1024 * 1024 + 1))).status, 413);
    const capped = await upload('Postcode\n' + 'SW1A1AA\n'.repeat(1002));
    assert.equal((await capped.json()).length, 1000);
    assert.equal(capped.headers.get('X-Location-Rows-Skipped'), '2');
  } finally {
    AppDataSource.getRepository = original;
    await new Promise(resolve => server.close(resolve));
  }
});
