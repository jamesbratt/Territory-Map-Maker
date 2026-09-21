const { test } = require('node:test');
const assert = require('node:assert/strict');
const { resolve } = require('node:path');
process.chdir(resolve(__dirname, '..'));
require('dotenv').config({ path: resolve(__dirname, '../../../.env') });
for (const [key, value] of Object.entries({ DB_HOST: 'localhost', DB_PORT: '5432', DB_USERNAME: 'test', DB_PASSWORD: 'test', DB_NAME: 'test' })) process.env[key] ??= value;
const { AppDataSource } = require('../dist/database/data-source');
const { CENSUS_SIGNALS, getSignal, getDistrictSignal } = require('../dist/services/census-signals.service');
const { app } = require('../dist/app');

test('signal catalogue and generic endpoint default to population and reject untrusted selectors', async () => {
  assert.equal(getSignal().key, 'population');
  assert.equal(CENSUS_SIGNALS.length, 11);
  assert.equal(getSignal('household-income').geography, 'MSOA');
  assert.throws(() => getSignal('population; DROP TABLE postcodelookup'));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const url = `http://127.0.0.1:${server.address().port}/api/demographics`;
  try {
    const catalogue = await (await fetch(`${url}/signals`)).json();
    assert.equal(catalogue.length, 11);
    const post = (query) => fetch(`${url}/districts${query}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ districts: [] }) });
    const defaults = await (await post('')).json();
    assert.equal(defaults.signal.key, 'population');
    assert.deepEqual(defaults.districts, []);
    assert.equal((await post('?signal=not-valid')).status, 400);
    assert.equal((await post('?signal=population&signal=occupation')).status, 400);
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('generic SQL allocates household counts via LSOA and averages income via MSOA district postcode counts', { skip: process.env.TEST_DEMOGRAPHICS_DB !== '1' }, async () => {
  const { Client } = require('pg');
  const client = new Client({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT), user: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, connectionTimeoutMillis: 5000 });
  await AppDataSource.buildMetadatas();
  const original = AppDataSource.query;
  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query(`CREATE TEMP TABLE postcodelookup (pcd7 text, lsoa21cd text, msoa21cd text) ON COMMIT DROP;
      CREATE TEMP TABLE household_income (id serial, updated_at timestamp DEFAULT now(), msoa21cd text, annual_income_before_costs float8, annual_income_after_costs float8) ON COMMIT DROP;
      CREATE TEMP TABLE household_size (id serial, updated_at timestamp DEFAULT now(), date int, geography_code text, household_spaces_total int, household_size_0 int, household_size_1 int, household_size_2 int, household_size_3 int, household_size_4 int, household_size_5 int, household_size_6 int, household_size_7 int, household_size_8plus int) ON COMMIT DROP;
      INSERT INTO postcodelookup VALUES
        ('ab1 1aa','L1','M1'),('AB11AB','L1','M1'),('AB1 1AA','L1','M1'),
        ('AB11AC','L1','M2'),('AB11AD','L1','MISSING'),('AB21AA','L1','M2'),
        ('AB31AA','L1','MISSING'),('AB41AA','L1',NULL);
      INSERT INTO household_income (msoa21cd, annual_income_before_costs, annual_income_after_costs) VALUES ('M1',40,30),('M2',100,60);
      INSERT INTO household_size (date,geography_code,household_spaces_total,household_size_0,household_size_1,household_size_2,household_size_3,household_size_4,household_size_5,household_size_6,household_size_7,household_size_8plus)
      VALUES (2021,'L1',700,0,700,0,0,0,0,0,0,0),(2020,'L1',9999,0,9999,0,0,0,0,0,0,0);`);
    AppDataSource.query = async (sql, args) => (await client.query(sql, args)).rows;
    const income = await getDistrictSignal(['AB1','AB2','AB3','AB4'], 'household-income');
    assert.equal(income.methodology, 'postcode-weighted-mean');
    const [first, second, missing, unmapped] = income.districts;
    assert.equal(first.metrics.length, 2);
    assert.equal(first.metrics[0].value, 60000);
    assert.equal(first.metrics[1].value, 40000);
    assert.ok(first.metrics.every(m => m.percentage === null));
    assert.equal(first.total, null);
    assert.equal(first.year, null);
    assert.equal(first.status, 'partial');
    assert.equal(first.linkedAreaCount, 3);
    assert.equal(first.matchedAreaCount, 2);
    assert.equal(second.metrics[0].value, 100000);
    assert.equal(missing.status, 'no-data');
    assert.equal(missing.metrics[0].value, null);
    assert.equal(unmapped.status, 'no-mapping');
    const alone = await getDistrictSignal(['AB1'], 'household-income');
    assert.equal(alone.districts[0].metrics[0].value, first.metrics[0].value);
    const households = await getDistrictSignal(['AB1'], 'household-size');
    assert.equal(households.signal.geography, 'LSOA');
    assert.equal(households.districts[0].total, 400);
    assert.equal(households.districts[0].year, 2021);
    assert.equal(households.districts[0].metrics.find(m => m.key === 'householdSize1').value, 400);
  } finally { AppDataSource.query = original; await client.query('ROLLBACK'); await client.end(); }
});
