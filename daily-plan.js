/* Date-based rotation in Shanghai local days, independent of UTC midnight. */
(function (root) {
  const dateKey = (date = new Date()) => new Intl.DateTimeFormat('sv-SE', {timeZone:'Asia/Shanghai'}).format(date);
  function dayNumber(key) {
    const [year, month, day] = key.split('-').map(Number);
    return Math.floor(Date.UTC(year, month - 1, day) / 86400000);
  }
  function select(pool, count, key = dateKey()) {
    if (!pool.length) return [];
    const size = Math.min(pool.length, Math.max(1, Math.floor(count) || 1));
    const elapsed = dayNumber(key) - dayNumber('2026-10-13');
    const start = ((elapsed * size) % pool.length + pool.length) % pool.length;
    return Array.from({length:size}, (_, i) => pool[(start + i) % pool.length]);
  }
  const api = {dateKey, dayNumber, select};
  root.YunaDailyPlan = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
