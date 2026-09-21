const { test } = require('node:test');
const assert = require('node:assert/strict');
const { resolve } = require('node:path');
process.chdir(resolve(__dirname, '..'));
require('dotenv').config({ path: resolve(__dirname, '../../../.env') });
for (const [key, value] of Object.entries({ DB_HOST: 'localhost', DB_PORT: '5432', DB_USERNAME: 'test', DB_PASSWORD: 'test', DB_NAME: 'test' })) process.env[key] ??= value;
const { validateDistricts, getDistrictAgePopulation } = require('../dist/services/district-demographics.service');
const { AppDataSource } = require('../dist/database/data-source');
const { app } = require('../dist/app');

test('district validation normalizes, deduplicates, bounds requests and rejects full postcodes', () => {
  assert.deepEqual(validateDistricts([' ab10 ', 'AB10', 'SW1A', 'GIR']), ['AB10', 'SW1A', 'GIR']);
  assert.deepEqual(validateDistricts([]), []);
  for (const input of [null, 'AB10', [null], [''], ['AB10 1AA'], ["AB1'); DROP TABLE x;--"], Array(301).fill('AB10')]) assert.throws(() => validateDistricts(input));
});

test('endpoint validation and unavailable coverage preserve nulls and schema bands', async () => {
  const original = AppDataSource.query;
  AppDataSource.query = async (_sql, parameters) => {
    assert.deepEqual(parameters, [['AB10']]);
    return [{ district: 'AB10', year: 2021, linkedLsoaCount: 1, matchedLsoaCount: 0, population: null,
      under18: null, age1824: null, age2534: null, age3544: null, age4554: null, age5564: null, age6574: null, age75Plus: null }];
  };
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const post = (body) => fetch(`http://127.0.0.1:${server.address().port}/api/demographics/districts/age`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  try {
    assert.equal((await post({ districts: ['bad'] })).status, 400);
    assert.equal((await post({})).status, 400);
    const response = await post({ districts: [' ab10 ', 'AB10'] });
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.methodology, 'postcode-weighted-estimates');
    assert.equal(data.districts[0].status, 'no-data');
    assert.equal(data.districts[0].population, null);
    assert.deepEqual(data.districts[0].ageBands.map(band => band.label), ['Under 18','18–24','25–34','35–44','45–54','55–64','65–74','75+']);
    assert.ok(data.districts[0].ageBands.every(band => band.count === null && band.percentage === null));
    assert.deepEqual((await (await post({ districts: [] })).json()).districts, []);
  } finally { AppDataSource.query = original; await new Promise(resolve => server.close(resolve)); }
});

test('PostgreSQL aggregation deduplicates LSOAs, isolates district prefixes and years, and reports partial coverage', { skip: process.env.TEST_DEMOGRAPHICS_DB !== '1' }, async () => {
  const { Client } = require('pg');
  const client = new Client({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT), user: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, connectionTimeoutMillis: 5000 });
  const original = AppDataSource.query;
  await client.connect();
  try {
    await client.query('BEGIN');
    // Temporary tables shadow production tables only for this connection.
    await client.query(`CREATE TEMP TABLE postcodelookup (pcd7 text, lsoa21cd text) ON COMMIT DROP;
      CREATE TEMP TABLE population_by_age_band (id serial, updated_at timestamp DEFAULT now(), geography_code text, date int, total int, under_18 int, age_18_24 int, age_25_34 int, age_35_44 int, age_45_54 int, age_55_64 int, age_65_74 int, age_75_plus int) ON COMMIT DROP;
      INSERT INTO postcodelookup VALUES ('ab1 1aa','A'),('AB11AB','A'),('AB1 1AA','A'),('AB101AA','B'),('AB2 1AA','A'),('AB2 1AB','B'),('AB2 1AC','C'),('AB31AA','C'),('AB41AA','Z'),('AB51AA','OLD');
      INSERT INTO population_by_age_band (geography_code,date,total,under_18,age_18_24,age_25_34,age_35_44,age_45_54,age_55_64,age_65_74,age_75_plus) VALUES
        ('A',2021,999,1,1,1,1,1,1,1,1),('A',2022,100,10,10,20,20,10,10,10,10),
        ('A',2022,100,10,10,20,20,10,10,10,10),('B',2022,200,20,20,40,40,20,20,20,20),
        ('Z',2022,0,0,0,0,0,0,0,0,0),('OLD',2021,500,50,50,100,100,50,50,50,50);`);
    AppDataSource.query = async (sql, parameters) => (await client.query(sql, parameters)).rows;
    const { districts } = await getDistrictAgePopulation(['AB1','AB10','AB2','AB3','AB4','AB5','ZZ9']);
    const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} should equal ${expected}`);
    near(districts[0].population, 100 * 2 / 3);
    near(districts[1].population, 100);
    near(districts[2].population, 100 / 3 + 100);
    assert.deepEqual(districts.slice(3).map(d => d.population), [null,0,null,null]);
    near(districts.slice(0,3).reduce((sum, d) => sum + d.population, 0), 300);
    // Selecting just one district must not redistribute the other districts' shares.
    const single = await getDistrictAgePopulation(['AB1']);
    near(single.districts[0].population, districts[0].population);
    // Keep fractions in the API. Only presentation rounds to whole people.
    assert.notEqual(single.districts[0].population, Math.round(single.districts[0].population));
    for (let band = 0; band < 8; band++) {
      const total = districts.slice(0,3).reduce((sum, d) => sum + d.ageBands[band].count, 0);
      near(total, band === 2 || band === 3 ? 60 : 30);
    }
    assert.deepEqual(districts.map(d => d.status), ['complete','complete','partial','no-data','complete','no-data','no-mapping']);
    assert.equal(districts[0].linkedLsoaCount, 1);
    assert.equal(districts[2].missingLsoaCount, 1);
    near(districts[2].ageBands[0].count, 10 / 3 + 10);
    assert.equal(districts[2].ageBands[0].percentage, 10);
    assert.equal(districts[4].ageBands[0].percentage, null);
    assert.ok(districts.every(d => d.year === 2022));
  } finally { AppDataSource.query = original; await client.query('ROLLBACK'); await client.end(); }
});
