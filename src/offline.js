'use strict';
const { istNow } = require('./time');
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
function hash(s) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// Emits a RAW payload in Kelvin and m/s, like a gridded model would.
function offlineIngest(c) {
  const n = istNow();
  const r = rng(hash(c.name + n.y + '-' + n.m + '-' + n.d));
  const H = { temperature_2m: [], relative_humidity_2m: [], wind_speed_10m: [], wind_direction_10m: [], precipitation: [], precipitation_probability: [] };
  const tx0 = c.tx ?? 32, tn0 = c.tn ?? 23, rh0 = c.rh ?? 70, w0 = c.w ?? 11;
  let wet = r() < 0.4;
  for (let d = 0; d < 7; d++) {
    wet = r() < (wet ? 0.6 : 0.25);
    const rhm = clamp(rh0 + (wet ? 9 : -4) + (r() - 0.5) * 8, 42, 96);
    const tx = tx0 + (wet ? -2 : 1) + (r() - 0.5) * 3;
    const tn = tn0 + (r() - 0.5) * 2.5;
    const wd = clamp(w0 + (r() - 0.5) * 8, 3, 30);
    const rain = wet ? 2 + r() * 16 : r() < 0.15 ? r() * 2 : 0;
    const dir = 230 + (r() - 0.5) * 70;
    for (let h = 0; h < 24; h++) {
      const k = Math.cos((2 * Math.PI * (h - 15)) / 24);
      H.temperature_2m.push((tn + tx) / 2 + ((tx - tn) / 2) * k + (r() - 0.5) * 0.6 + 273.15);
      H.relative_humidity_2m.push(clamp(rhm - 13 * k + (r() - 0.5) * 3, 25, 100));
      H.wind_speed_10m.push(clamp(wd * (0.75 + 0.3 * (k + 1) / 2) + (r() - 0.5) * 2, 0.5, 40) / 3.6);
      H.wind_direction_10m.push((dir + (r() - 0.5) * 20 + 360) % 360);
      H.precipitation.push(wet ? (rain / 24) * (0.4 + r() * 1.2) : 0);
      H.precipitation_probability.push(wet ? 60 + r() * 30 : 3 + r() * 15);
    }
  }
  return { units: { temp: 'K', wind: 'ms' }, hourly: H, source: 'offline' };
}
module.exports = { offlineIngest };
