'use strict';
const R = require('./rules');
const { istNow, dayLabel } = require('./time');

function finishDay(d) {
  d.tdew = R.dewPoint((d.tmax + d.tmin) / 2, d.rh);
  d.et0 = R.et0(d.tmax, d.rain);
  d.blight = R.blightActive(d.rh);
  d.spray = R.sprayRule(d.rh, d.wind);
  return d;
}

// Stateless: normalise units, aggregate to daily, derive agro indices.
function transform(raw) {
  const u = raw.units, H = raw.hourly, now = istNow();
  const T = H.temperature_2m.map((v) => (u.temp === 'K' ? R.toC(v) : v));
  const W = H.wind_speed_10m.map((v) => (u.wind === 'ms' ? R.toKmh(v) : v));
  const RH = H.relative_humidity_2m, D = H.wind_direction_10m;
  const P = H.precipitation.map((v) => v || 0), PP = H.precipitation_probability.map((v) => v || 0);
  const sum = (a) => a.reduce((x, y) => x + y, 0);
  const days = [];
  for (let d = 0; d < 7; d++) {
    const s = d * 24, e = s + 24, t = T.slice(s, e);
    days.push(finishDay({
      label: dayLabel(now, d), tmax: Math.max(...t), tmin: Math.min(...t),
      rh: sum(RH.slice(s, e)) / 24, rain: sum(P.slice(s, e)), wind: Math.max(...W.slice(s, e))
    }));
  }
  const h = now.h;
  return {
    cur: { t: T[h], rh: RH[h], wind: W[h], dir: D[h], rain: P[h], prob: Math.max(...PP.slice(0, 24)), hour: h },
    hourly: T.slice(0, 24), days
  };
}

// Optional test-bench override (used to check thresholds without waiting for weather)
function applySim(m, sim) {
  const c = JSON.parse(JSON.stringify(m));
  if (!sim) return c;
  const shift = sim.t - c.cur.t;
  c.hourly = c.hourly.map((v) => v + shift);
  c.cur.t = sim.t; c.cur.rh = sim.rh; c.cur.wind = sim.w;
  c.days[0].rh = sim.rh; c.days[0].wind = sim.w;
  finishDay(c.days[0]);
  return c;
}
module.exports = { transform, applySim, finishDay };
