'use strict';
const R = require('./rules');
// Boundary value verification matrix (Blueprint Step 5), executed against the real rule functions.
const CASES = [
  { n: 'Heat threshold', inp: 'T = 32.0°C', persona: 'public', set: { t: 32.0 }, run: () => R.heatActive(32.0), exp: false, expT: 'Alert inactive' },
  { n: 'Heat breach', inp: 'T = 32.1°C', persona: 'public', set: { t: 32.1 }, run: () => R.heatActive(32.1), exp: true, expT: 'Alert active' },
  { n: 'Kelvin input', inp: '305.15 K', persona: 'public', set: { t: 32.0 }, run: () => R.heatActive(R.toC(305.15)), exp: false, expT: 'Converts to 32.0°C, inactive' },
  { n: 'Humidity threshold', inp: 'RH = 84.9%', persona: 'farmer', set: { rh: 84.9, w: 10 }, run: () => R.blightActive(84.9), exp: false, expT: 'Blight inactive' },
  { n: 'Humidity breach', inp: 'RH = 85.0%', persona: 'farmer', set: { rh: 85.0, w: 10 }, run: () => R.blightActive(85.0), exp: true, expT: 'Blight active' },
  { n: 'Spray drift', inp: 'Wind 15.1 km/h, RH 65%', persona: 'farmer', set: { rh: 65, w: 15.1 }, run: () => R.sprayRule(65, 15.1).ok, exp: false, expT: 'Spraying poor (drift)' },
  { n: 'Spray optimal edge', inp: 'Wind 15.0 km/h, RH 84.9%', persona: 'farmer', set: { rh: 84.9, w: 15.0 }, run: () => R.sprayRule(84.9, 15.0).ok, exp: true, expT: 'Spraying optimal' }
];
function runAudit() {
  return CASES.map((c) => ({ n: c.n, inp: c.inp, persona: c.persona, set: c.set, expT: c.expT, pass: c.run() === c.exp }));
}
module.exports = { runAudit };
