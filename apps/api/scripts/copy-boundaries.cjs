const { mkdirSync, copyFileSync } = require('node:fs');
const { resolve } = require('node:path');
const destination = resolve(__dirname, '../dist/boundaries');
mkdirSync(destination, { recursive: true });
copyFileSync(resolve(__dirname, '../src/boundaries/pcdistricts.json'), resolve(destination, 'pcdistricts.json'));
