'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { createServer } = require('../server');
const R = require('../src/rules');

let server, base;
test.before(async () => {
  server = createServer();
  await new Promise((r) => server.listen(0, r));
  base = 'http://127.0.0.1:' + server.address().port;
});
test.after(() => server.close());
const get = async (p) => { const r = await fetch(base + p); return { status: r.status, body: await r.json() }; };

test('rules: heat boundary 32.0 vs 32.1', () => {
  assert.strictEqual(R.heatActive(32.0), false);
  assert.strictEqual(R.heatActive(32.1), true);
  assert.strictEqual(R.heatActive(R.toC(305.15)), false);
});
test('rules: humidity boundary 84.9 vs 85.0', () => {
  assert.strictEqual(R.blightActive(84.9), false);
  assert.strictEqual(R.blightActive(85.0), true);
});
test('rules: spraying window', () => {
  assert.strictEqual(R.sprayRule(65, 15.1).ok, false);
  assert.strictEqual(R.sprayRule(84.9, 15.0).ok, true);
  assert.strictEqual(R.sprayRule(85, 5).ok, false);
});
test('GET /api/health', async () => { assert.strictEqual((await get('/api/health')).body.ok, true); });
test('GET /api/locations', async () => { assert.ok((await get('/api/locations')).body.locations.length >= 10); });
test('GET /api/public returns public fields only', async () => {
  const { status, body } = await get('/api/public?city=Mandya');
  assert.strictEqual(status, 200);
  assert.ok('feels' in body.data && 'hourly' in body.data);
  assert.ok(!('days' in body.data) && !('tdew' in body.data));
  assert.strictEqual(body.data.hourly.length, 24);
});
test('GET /api/farmer returns farmer fields only', async () => {
  const { status, body } = await get('/api/farmer?city=Mandya');
  assert.strictEqual(status, 200);
  assert.strictEqual(body.data.days.length, 7);
  assert.ok(!('feels' in body.data));
  assert.ok('tdew' in body.data.days[0] && 'et0' in body.data.days[0]);
});
test('simulator boundary via API: heat', async () => {
  assert.strictEqual((await get('/api/public?city=Delhi&simT=32.0&simRh=60&simW=8')).body.data.hot, false);
  assert.strictEqual((await get('/api/public?city=Delhi&simT=32.1&simRh=60&simW=8')).body.data.hot, true);
});
test('simulator boundary via API: blight and spraying', async () => {
  const a = (await get('/api/farmer?city=Mandya&simT=30&simRh=84.9&simW=10')).body.data.days[0];
  const b = (await get('/api/farmer?city=Mandya&simT=30&simRh=85.0&simW=10')).body.data.days[0];
  const c = (await get('/api/farmer?city=Mandya&simT=30&simRh=65&simW=15.1')).body.data.days[0];
  assert.strictEqual(a.blight, false); assert.strictEqual(b.blight, true);
  assert.strictEqual(c.spray.ok, false);
});
test('GET /api/audit all pass', async () => {
  const { body } = await get('/api/audit');
  assert.ok(body.cases.length >= 5);
  assert.ok(body.cases.every((c) => c.pass));
});
test('errors are clean JSON', async () => {
  assert.strictEqual((await get('/api/public?city=Atlantis')).status, 404);
  assert.strictEqual((await get('/api/public?city=Mandya&simT=abc&simRh=1&simW=1')).status, 400);
  assert.strictEqual((await get('/api/nope')).status, 404);
  assert.strictEqual((await get('/api/geocode?q=a')).status, 400);
});
test('serves frontend and blocks path traversal', async () => {
  const r = await fetch(base + '/');
  assert.strictEqual(r.status, 200);
  assert.ok((await r.text()).includes('Dualcast'));
  const t = await fetch(base + '/..%2fserver.js');
  assert.notStrictEqual(t.status, 200);
});
