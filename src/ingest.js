'use strict';
const { offlineIngest } = require('./offline');

const cache = new Map();            // key -> { at, raw }
const TTL_MS = 10 * 60 * 1000;
let upstreamDownUntil = 0;          // back-off so a dead network does not slow every request

async function fetchLive(c) {
  const key = process.env.OPEN_METEO_API_KEY;
  const baseUrl = key ? 'https://customer-api.open-meteo.com' : 'https://api.open-meteo.com';
  const url = baseUrl + '/v1/forecast?' + (key ? 'apikey=' + key + '&' : '') + 'latitude=' + c.lat + '&longitude=' + c.lon +
    '&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,precipitation,precipitation_probability' +
    '&forecast_days=7&timezone=Asia%2FKolkata&wind_speed_unit=kmh';
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 4000);
  try {
    const res = await fetch(url, { signal: ctl.signal });
    if (!res.ok) throw new Error('Upstream HTTP ' + res.status);
    const j = await res.json();
    return { units: { temp: 'C', wind: 'kmh' }, hourly: j.hourly, source: 'live' };
  } finally { clearTimeout(t); }
}

function validate(raw) {
  const need = ['temperature_2m', 'relative_humidity_2m', 'wind_speed_10m', 'wind_direction_10m', 'precipitation', 'precipitation_probability'];
  for (const k of need) {
    if (!raw || !raw.hourly || !Array.isArray(raw.hourly[k]) || raw.hourly[k].length < 168) {
      throw new Error('Payload is missing ' + k);
    }
  }
  return raw;
}

async function getRaw(c) {
  const key = c.name + '|' + c.lat + '|' + c.lon;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return { raw: hit.raw, cached: true };
  let raw = null;
  if (Date.now() >= upstreamDownUntil) {
    try { raw = validate(await fetchLive(c)); }
    catch (e) { upstreamDownUntil = Date.now() + 60 * 1000; raw = null; }
  }
  if (!raw) raw = validate(offlineIngest(c));
  cache.set(key, { at: Date.now(), raw });
  return { raw, cached: false };
}

async function geocode(q) {
  if (Date.now() < upstreamDownUntil) return null;
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 4000);
  try {
    const key = process.env.OPEN_METEO_API_KEY;
    const baseUrl = key ? 'https://customer-geocoding-api.open-meteo.com' : 'https://geocoding-api.open-meteo.com';
    const res = await fetch(baseUrl + '/v1/search?' + (key ? 'apikey=' + key + '&' : '') + 'name=' + encodeURIComponent(q) + '&count=5&country_code=IN&language=en', { signal: ctl.signal });
    if (!res.ok) return null;
    const j = await res.json();
    return (j.results || []).map((g) => ({ name: g.name, st: g.admin1 || 'India', lat: g.latitude, lon: g.longitude }));
  } catch (e) { upstreamDownUntil = Date.now() + 60 * 1000; return null; }
  finally { clearTimeout(t); }
}

module.exports = { getRaw, validate, geocode };
