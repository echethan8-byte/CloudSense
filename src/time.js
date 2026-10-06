'use strict';
function istNow() {
  const p = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23'
  }).formatToParts(new Date());
  const g = (t) => Number(p.find((x) => x.type === t).value);
  return { y: g('year'), m: g('month'), d: g('day'), h: g('hour') };
}
function dayLabel(n, i) {
  if (i === 0) return 'Today';
  const d = new Date(Date.UTC(n.y, n.m - 1, n.d + i));
  return new Intl.DateTimeFormat('en-IN', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' }).format(d);
}
module.exports = { istNow, dayLabel };
