'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const { ATLAS, byName } = require('./src/atlas');
const { getRaw, geocode } = require('./src/ingest');
const { transform, applySim } = require('./src/transform');
const { publicAdapter, farmerAdapter } = require('./src/adapters');
const { runAudit } = require('./src/audit');

const PUBLIC_DIR = path.join(__dirname, 'public');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }

function send(res, status, body, type) {
  res.writeHead(status, { 'Content-Type': type || 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

function resolveLocation(q) {
  const named = byName(q.get('city'));
  if (named) return named;
  const lat = Number(q.get('lat')), lon = Number(q.get('lon'));
  if (q.get('lat') !== null && q.get('lon') !== null && Number.isFinite(lat) && Number.isFinite(lon) && lat >= 6 && lat <= 38 && lon >= 68 && lon <= 98) {
    return { name: (q.get('name') || 'Custom location').slice(0, 60), st: (q.get('st') || 'India').slice(0, 60), lat, lon, custom: true };
  }
  throw new HttpError(404, 'Unknown location. Use ?city=<name> from /api/locations, or ?lat=&lon= inside India.');
}

function parseSim(q) {
  if (!q.has('simT') && !q.has('simRh') && !q.has('simW')) return null;
  const t = Number(q.get('simT')), rh = Number(q.get('simRh')), w = Number(q.get('simW'));
  if (![t, rh, w].every(Number.isFinite) || t < -10 || t > 60 || rh < 0 || rh > 100 || w < 0 || w > 200) {
    throw new HttpError(400, 'simT (-10..60), simRh (0..100) and simW (0..200) must all be valid numbers.');
  }
  return { t, rh, w };
}

async function weather(q, adapter) {
  const loc = resolveLocation(q);
  const sim = parseSim(q);
  const trace = [];
  let t0 = process.hrtime.bigint();
  const lap = (n) => { const t = process.hrtime.bigint(); trace.push([n, Math.max(0, Math.round(Number(t - t0) / 1e6))]); t0 = t; };

  const { raw, cached } = await getRaw(loc); lap(cached ? 'Ingest (cached)' : 'Ingest');
  lap('Validate');
  const model = transform(raw); lap('Transform');
  const shown = applySim(model, sim);
  const data = adapter(shown); lap('Adapt');
  return {
    meta: {
      source: raw.source, simulated: Boolean(sim), trace,
      location: { name: loc.name, st: loc.st, lat: loc.lat, lon: loc.lon },
      current: { t: model.cur.t, rh: model.cur.rh, wind: model.cur.wind }
    },
    data
  };
}

async function handleApi(pathname, q) {
  switch (pathname) {
    case '/api/health': return { ok: true, time: new Date().toISOString() };
    case '/api/locations': return { locations: ATLAS.map(({ name, st, lat, lon }) => ({ name, st, lat, lon })) };
    case '/api/geocode': {
      const term = (q.get('q') || '').trim();
      if (term.length < 2) throw new HttpError(400, 'Query must be at least 2 characters.');
      const local = ATLAS.filter((a) => a.name.toLowerCase().includes(term.toLowerCase())).map(({ name, st, lat, lon }) => ({ name, st, lat, lon }));
      if (local.length) return { results: local, source: 'atlas' };
      const remote = await geocode(term);
      if (remote === null) return { results: [], source: 'unavailable' };
      return { results: remote, source: 'open-meteo' };
    }
    case '/api/public': return weather(q, publicAdapter);
    case '/api/farmer': return weather(q, farmerAdapter);
    case '/api/audit': return { cases: runAudit() };
    default: throw new HttpError(404, 'Unknown API route.');
  }
}

function serveStatic(pathname, res) {
  const rel = pathname === '/' ? 'index.html' : decodeURIComponent(pathname).replace(/^\/+/, '');
  const file = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!file.startsWith(PUBLIC_DIR + path.sep)) return send(res, 403, 'Forbidden', 'text/plain');
  fs.readFile(file, (err, buf) => {
    if (err) return send(res, 404, 'Not found', 'text/plain');
    send(res, 200, buf, MIME[path.extname(file)] || 'application/octet-stream');
  });
}

function createServer() {
  return http.createServer(async (req, res) => {
    try {
      if (req.method === 'OPTIONS') return send(res, 204, '');
      if (req.method !== 'GET') throw new HttpError(405, 'Only GET is supported.');
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname.startsWith('/api/')) return send(res, 200, await handleApi(url.pathname, url.searchParams));
      return serveStatic(url.pathname, res);
    } catch (e) {
      const status = e.status || 500;
      if (status === 500) console.error(e);
      send(res, status, { error: status === 500 ? 'Internal server error.' : e.message });
    }
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  createServer().listen(port, () => console.log('Dualcast running at http://localhost:' + port));
}
module.exports = { createServer };
