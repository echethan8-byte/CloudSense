'use strict';
// Indian locations with seasonal climate parameters used by the offline model
const ATLAS = [
  { name: 'Mandya', st: 'Karnataka', lat: 12.52, lon: 76.89, tx: 30, tn: 21, rh: 80, w: 14 },
  { name: 'Bengaluru', st: 'Karnataka', lat: 12.97, lon: 77.59, tx: 28, tn: 20, rh: 80, w: 13 },
  { name: 'Mysuru', st: 'Karnataka', lat: 12.30, lon: 76.64, tx: 29, tn: 20, rh: 80, w: 12 },
  { name: 'Raichur', st: 'Karnataka', lat: 16.21, lon: 77.36, tx: 34, tn: 23, rh: 62, w: 15 },
  { name: 'Chennai', st: 'Tamil Nadu', lat: 13.08, lon: 80.27, tx: 34, tn: 26, rh: 72, w: 14 },
  { name: 'Kochi', st: 'Kerala', lat: 9.93, lon: 76.27, tx: 31, tn: 24, rh: 86, w: 10 },
  { name: 'Hyderabad', st: 'Telangana', lat: 17.39, lon: 78.49, tx: 31, tn: 22, rh: 70, w: 12 },
  { name: 'Mumbai', st: 'Maharashtra', lat: 19.08, lon: 72.88, tx: 32, tn: 26, rh: 80, w: 15 },
  { name: 'Nagpur', st: 'Maharashtra', lat: 21.15, lon: 79.09, tx: 34, tn: 23, rh: 70, w: 10 },
  { name: 'Ahmedabad', st: 'Gujarat', lat: 23.02, lon: 72.57, tx: 35, tn: 25, rh: 62, w: 12 },
  { name: 'Jaipur', st: 'Rajasthan', lat: 26.91, lon: 75.79, tx: 35, tn: 24, rh: 58, w: 11 },
  { name: 'Delhi', st: 'Delhi', lat: 28.61, lon: 77.21, tx: 34, tn: 24, rh: 65, w: 9 },
  { name: 'Lucknow', st: 'Uttar Pradesh', lat: 26.85, lon: 80.95, tx: 34, tn: 24, rh: 68, w: 8 },
  { name: 'Ludhiana', st: 'Punjab', lat: 30.90, lon: 75.86, tx: 34, tn: 23, rh: 66, w: 8 },
  { name: 'Kolkata', st: 'West Bengal', lat: 22.57, lon: 88.36, tx: 33, tn: 26, rh: 82, w: 10 }
];
const byName = (q) => {
  q = String(q || '').trim().toLowerCase();
  if (!q) return null;
  return ATLAS.find((a) => a.name.toLowerCase() === q) || ATLAS.find((a) => a.name.toLowerCase().includes(q)) || null;
};
module.exports = { ATLAS, byName };
