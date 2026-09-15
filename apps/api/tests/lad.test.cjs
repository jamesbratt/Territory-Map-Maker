const { test } = require('node:test');
const assert = require('node:assert/strict');
for (const key of ['DB_HOST', 'DB_PORT', 'DB_USERNAME', 'DB_PASSWORD', 'DB_NAME']) {
  process.env[key] = key === 'DB_PORT' ? '5432' : 'test';
}
const express = require('express');
const { AppDataSource } = require('../src/database/data-source');
const { PostcodeLookup } = require('../src/database/entities/Postcodelookup');
const { LadNameLookup } = require('../src/database/entities/LadNameLookup');
const { rankPostcodes } = require('../src/services/ranking.service');
const router = require('../src/routes/lad.routes').default;
const { calculatePercentile } = require('../src/services/census.config');

test('binary-search percentiles match the original scan, including ties and missing values', () => {
  const datasets = [[], [5], [-10, -10, 0, 5, 5, 5, 20],
    Array.from({ length: 35000 }, (_, i) => Math.floor(i / 7))];
  for (const values of datasets) {
    for (const value of [null, undefined, -20, -10, 0, 1.5, 5, 20, 4999, 90000]) {
      const expected = value == null ? null
        : Math.round(values.filter(v => v < value).length / values.length * 100);
      assert.equal(calculatePercentile(value, values), expected);
    }
  }
});

test('percentile search reads logarithmically many national values', () => {
  let reads = 0;
  const values = new Proxy(Array.from({ length: 65536 }, (_, i) => i), {
    get(target, key) {
      if (/^\d+$/.test(String(key))) reads++;
      return Reflect.get(target, key);
    },
  });
  assert.equal(calculatePercentile(32768, values), 50);
  assert.ok(reads <= 17, `Expected at most 17 reads, received ${reads}`);
});

test('LAD endpoints and shared CSV scoring', async () => {
  const postcodes = Array.from({ length: 1005 }, (_, i) => ({
    pcd7: `P${i}`, lsoa21cd: i === 0 ? 'missing' : 'L1', msoa21cd: null,
    lat: '51', long: '0', lad25cd: 'E123', lad25nm: 'Example',
  }));
  const original = AppDataSource.getRepository;
  const query = (data) => new Proxy({}, { get: (_, key) =>
    key === 'getRawMany' ? async () => data : () => query(data) });
  AppDataSource.getRepository = entity => {
    if (entity === LadNameLookup) return {
      findOneBy: async ({ lad25cd }) => lad25cd === 'E123' ? { lad25cd } : null,
      createQueryBuilder: () => query([{ code: 'E123', name: 'Example' }]),
    };
    if (entity === PostcodeLookup) return { createQueryBuilder: () => query(postcodes) };
    return { find: async options => options.where
      ? [{ geographyCode: 'L1', under18: 20 }]
      : [{ under18: 10 }, { under18: 20 }, { under18: 30 }] };
  };
  const app = express();
  app.use(express.json()); app.use('/lads', router);
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const url = `http://127.0.0.1:${server.address().port}/lads`;
  const rank = (code, body) => fetch(`${url}/${code}/rank`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  try {
    assert.equal((await rank('E123', {})).status, 400);
    assert.equal((await rank('E123', { censusVariables: ['invalid'] })).status, 400);
    assert.equal((await rank('unknown', { censusVariables: ['under_18'] })).status, 404);
    assert.equal((await fetch(`${url}?q[x]=bad`)).status, 400);
    assert.deepEqual(await (await fetch(`${url}?q=exam`)).json(), [{ code: 'E123', name: 'Example' }]);
    const response = await rank('E123', { censusVariables: ['under_18'] });
    assert.equal(response.status, 200);
    const rows = await response.json();
    assert.equal(rows.length, 1005);
    assert.equal(typeof rows[0].segment_affinity_score, "number");
    assert.equal(rows.at(-1).postcode, "P0");
    const csv = await rankPostcodes([{ postcode: 'P1', data: { customer: 'retained' } }], ['under_18']);
    assert.equal(csv[0].customer, 'retained');
    assert.deepEqual(csv[0].censusValues, rows.find(row => row.postcode === 'P1').censusValues);
    assert.equal(rows.at(-1).segment_affinity_score, null);
  } finally {
    AppDataSource.getRepository = original;
    await new Promise(resolve => server.close(resolve));
  }
});
