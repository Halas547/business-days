/**
 * Core business-day calculations.
 *
 * A "business day" is any Monday through Friday that is not a holiday in
 * the configured calendar. Saturday and Sunday are always non-business days.
 *
 * Date arguments may be Date instances or strings accepted by the Date
 * constructor. All comparisons use the UTC date component, ignoring the time
 * of day. This keeps behaviour identical regardless of the host's local
 * timezone, which is the only sane default for a library that may be invoked
 * from servers in different regions. Callers needing local-time semantics
 * should normalise their own inputs before calling these functions.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_WEEK = 7 * MS_PER_DAY;

/**
 * A fixed-date holiday (month/day) such as Christmas on 25 December.
 * Year-independent; the date is the same every year.
 */
const FIXED_HOLIDAYS = [
  { month: 1, day: 1 },    // New Year's Day
  { month: 12, day: 25 },  // Christmas Day
  { month: 12, day: 26 },  // Boxing Day
];

// Good Friday is the Friday before Easter Sunday; Easter Monday is the day
// after Easter Sunday. Both are computed via the Anonymous Gregorian
// algorithm, which is exact for all Gregorian-calendar years.
export const GOOD_FRIDAY = 'good-friday';
export const EASTER_MONDAY = 'easter-monday';

/**
 * Returns the UTC midnight timestamp for a given year, month (1-12) and day.
 * Using Date.UTC avoids any local-timezone drift in the comparison logic.
 */
function utcMidnight(year, month, day) {
  return Date.UTC(year, month - 1, day);
}

/**
 * Compute the timestamp of Easter Sunday at UTC midnight for a given year.
 *
 * Uses the Anonymous Gregorian algorithm (Meeus). It is pure arithmetic with
 * no calendar library, returns a UTC midnight timestamp, and is exact for all
 * years in the proleptic Gregorian calendar. We choose UTC midnight so that
 * Easter-derived holidays slot directly into the same comparison basis as the
 * fixed-date holidays.
 */
function easterTimestamp(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return utcMidnight(year, month, day);
}

/**
 * Build the complete set of holiday timestamps for a given year.
 *
 * The set is built lazily per year and cached for the lifetime of the
 * process. In a long-running server this avoids recomputing Easter on every
 * call; in a short-lived script the cost is negligible either way.
 */
const holidayCache = new Map();
function holidaysForYear(year) {
  if (holidayCache.has(year)) return holidayCache.get(year);
  const set = new Set();
  for (const { month, day } of FIXED_HOLIDAYS) {
    set.add(utcMidnight(year, month, day));
  }
  const easter = easterTimestamp(year);
  set.add(easter - 2 * MS_PER_DAY); // Good Friday
  set.add(easter + 1 * MS_PER_DAY); // Easter Monday
  holidayCache.set(year, set);
  return set;
}

/**
 * Normalise a date-like input to a numeric UTC midnight timestamp.
 *
 * Any time component is discarded: two Date objects on the same calendar day
 * (UTC) are treated as the same day, regardless of their wall-clock times.
 */
function toMidnight(input) {
  const d = input instanceof Date ? input : new Date(input);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/**
 * Determine whether a given date is a business day.
 *
 * Saturday and Sunday are never business days. Monday through Friday are
 * business days unless the date is a holiday in the configured calendar.
 */
export function isBusinessDay(date) {
  const midnight = toMidnight(date);
  const dayOfWeek = new Date(midnight).getUTCDay(); // 0=Sun, 6=Sat
  if (dayOfWeek === 0 || dayOfWeek === 6) return false;
  const year = new Date(midnight).getUTCFullYear();
  return !holidaysForYear(year).has(midnight);
}

/**
 * Count business days in the half-open interval [start, end).
 *
 * The interval is half-open on the end date: a task starting on start and
 * finishing before end contributes businessDaysBetween(start, end) working
 * days. Passing the same date for both yields 0; a one-week span Monday to
 * Monday yields 5 (assuming no holidays). This mirrors the convention used by
 * most date-range libraries and avoids the off-by-one ambiguity of inclusive
 * ranges.
 */
export function businessDaysBetween(start, end) {
  let s = toMidnight(start);
  const e = toMidnight(end);
  if (s > e) return 0;
  let count = 0;
  while (s < e) {
    if (isBusinessDay(new Date(s))) count++;
    s += MS_PER_DAY;
  }
  return count;
}

/**
 * Shift a date by a given number of business days.
 *
 * Positive counts move forward, negative counts move backward. The original
 * date is never business-day-normalised: if the caller starts on a Saturday,
 * shiftBusinessDays(1) returns the next business day (the following Monday,
 * unless that Monday is a holiday). Zero returns the same calendar day.
 */
export function shiftBusinessDays(date, count) {
  let cursor = toMidnight(date);
  const step = count >= 0 ? 1 : -1;
  let remaining = Math.abs(count);
  while (remaining > 0) {
    cursor += step * MS_PER_DAY;
    if (isBusinessDay(new Date(cursor))) remaining--;
  }
  return new Date(cursor);
}
