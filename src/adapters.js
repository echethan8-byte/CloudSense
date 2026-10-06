'use strict';
const R = require('./rules');

// Consumer 1: public. Contains NO agronomic fields (no dew point, ET0, spray advice).
function publicAdapter(m) {
  const c = m.cur;
  return {
    t: c.t, feels: R.apparent(c.t, c.rh, c.wind), rh: c.rh, wind: c.wind, dir: c.dir,
    rain: c.rain, prob: c.prob, hourly: m.hourly, hour: c.hour,
    hot: R.heatActive(c.t), peak: Math.max(...m.hourly)
  };
}
// Consumer 2: farmer. Contains NO real-time civilian metrics (feels-like, thermometer).
function farmerAdapter(m) {
  const risk = m.days.filter((d) => d.blight);
  const next = m.days.find((d) => d.spray.ok);
  return {
    days: m.days,
    summary: { riskDayCount: risk.length, riskDayLabels: risk.map((d) => d.label), nextWindowLabel: next ? next.label : null }
  };
}
module.exports = { publicAdapter, farmerAdapter };
