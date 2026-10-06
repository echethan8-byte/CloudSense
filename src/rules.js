'use strict';
// Deterministic alert rules and agro formulas (Blueprint Step 3)
const RULES = { HEAT: 32.0, RH: 85.0, WIND: 15.0 };
const r1 = (x) => Math.round(x * 10) / 10;
const toC = (k) => k - 273.15;
const toKmh = (ms) => ms * 3.6;

const heatActive = (t) => r1(t) > RULES.HEAT;           // strictly above 32.0 C
const blightActive = (rh) => r1(rh) >= RULES.RH;        // 85.0 % or more

function sprayRule(rh, wind) {
  const drift = r1(wind) > RULES.WIND;
  const wash = blightActive(rh);
  if (!drift && !wash) return { ok: true, label: 'OPTIMAL', short: 'Optimal', why: 'Calm air and dry enough for foliar sprays.' };
  if (drift && wash) return { ok: false, label: 'POOR: DRIFT + WASH-OFF', short: 'Poor: both', why: 'Wind above 15 km/h and humidity at 85% or more.' };
  if (drift) return { ok: false, label: 'POOR: HIGH DRIFT', short: 'Poor: drift', why: 'Wind above 15 km/h carries spray off target.' };
  return { ok: false, label: 'POOR: WASH-OFF RISK', short: 'Poor: wash-off', why: 'Humidity at 85% or more keeps leaves wet; spray washes off.' };
}

const dewPoint = (t, rh) => t - (100 - rh) / 5;
const et0 = (tmax, rain) => Math.max(0, tmax * 0.16 - rain * 0.08);
function apparent(t, rh, kmh) {
  const e = (rh / 100) * 6.105 * Math.exp((17.27 * t) / (237.7 + t));
  return t + 0.33 * e - 0.7 * (kmh / 3.6) - 4.0;
}

module.exports = { RULES, r1, toC, toKmh, heatActive, blightActive, sprayRule, dewPoint, et0, apparent };
