const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
process.chdir(resolve(__dirname, '..'));

// Importing the existing upload routes requires DB configuration, but this endpoint
// must serve the file without querying or opening a database connection.
for (const [key, value] of Object.entries({ DB_HOST: 'localhost', DB_PORT: '5432', DB_USERNAME: 'test', DB_PASSWORD: 'test', DB_NAME: 'test' })) process.env[key] ??= value;
const { app } = require('../dist/app');
test('GET /api/boundaries returns the exact source file without a database connection', async () => {
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/boundaries`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /application\/json/);
    const body = await response.text();
    assert.equal(body, readFileSync(resolve(__dirname, '../src/boundaries/pcdistricts.json'), 'utf8'));
    assert.equal(JSON.parse(body).objects.postcodedistrict.geometries.length, 2736);
  } finally { await new Promise((resolve) => server.close(resolve)); }
});
