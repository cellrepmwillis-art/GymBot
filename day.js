// The tracking "day" runs from midnight to midnight, local time.
export const RESET_HOUR = 0;

const pad = (n) => String(n).padStart(2, "0");

// Key for the tracking day that contains `date`, e.g. "2026-10-23".
export function dayKey(date = new Date()) {
  const shifted = new Date(date.getTime());
  shifted.setHours(shifted.getHours() - RESET_HOUR);
  return `${shifted.getFullYear()}-${pad(shifted.getMonth() + 1)}-${pad(shifted.getDate())}`;
}

// The next moment the day rolls over (the next local midnight after `date`).
export function nextReset(date = new Date()) {
  const next = new Date(date.getTime());
  next.setHours(RESET_HOUR, 0, 0, 0);
  if (next <= date) next.setDate(next.getDate() + 1);
  return next;
}

// The day before a day key: "2026-03-01" -> "2026-02-28".
export function previousDay(key) {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d - 1, 12);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
