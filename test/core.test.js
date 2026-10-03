import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  businessDaysBetween,
  isBusinessDay,
  shiftBusinessDays,
} from '../src/index.js';

// All test dates use UTC midnight strings to avoid timezone-dependent results.
// A test that depended on the host's local timezone would be non-deterministic.

const D = (s) => new Date(s + 'T00:00:00.000Z');

// Reference: 2024-01-01 was a Monday and also New Year's Day (holiday).
// 2024-03-29 was Good Friday; 2024-04-01 was Easter Monday.

let assertions = 0;

function check(name, fn) {
  test(name, () => { fn(); assertions++; });
}

check('weekday with no holiday is a business day', () => {
  assert.equal(isBusinessDay(D('2024-01-02')), true); // Tuesday
});

check('Saturday is not a business day', () => {
  assert.equal(isBusinessDay(D('2024-01-06')), false);
});

check('Sunday is not a business day', () => {
  assert.equal(isBusinessDay(D('2024-01-07')), false);
});

check('fixed-date holiday (New Year\'s Day) is not a business day', () => {
  assert.equal(isBusinessDay(D('2024-01-01')), false);
});

check('Christmas Day is not a business day', () => {
  assert.equal(isBusinessDay(D('2024-12-25')), false); // Wednesday
});

check('Good Friday is not a business day', () => {
  assert.equal(isBusinessDay(D('2024-03-29')), false);
});

check('Easter Monday is not a business day', () => {
  assert.equal(isBusinessDay(D('2024-04-01')), false);
});

check('half-open interval: same start and end yields 0', () => {
  assert.equal(businessDaysBetween(D('2024-01-02'), D('2024-01-02')), 0);
});

check('full ordinary week Monday to Monday yields 5', () => {
  assert.equal(businessDaysBetween(D('2024-01-08'), D('2024-01-15')), 5);
});

check('week with a holiday counts fewer days', () => {
  // 2024-01-01 (Mon, holiday) through 2024-01-08 (Mon) exclusive: Tue-Fri = 4
  assert.equal(businessDaysBetween(D('2024-01-01'), D('2024-01-08')), 4);
});

check('reversed range yields 0', () => {
  assert.equal(businessDaysBetween(D('2024-01-15'), D('2024-01-08')), 0);
});

check('shiftBusinessDays by 0 returns the same calendar day', () => {
  const result = shiftBusinessDays(D('2024-01-06'), 0); // Saturday
  assert.equal(result.getTime(), D('2024-01-06').getTime());
});

check('shiftBusinessDays by 1 from Saturday returns Monday', () => {
  const result = shiftBusinessDays(D('2024-01-06'), 1);
  assert.equal(result.getTime(), D('2024-01-08').getTime());
});

check('shiftBusinessDays by 1 from Friday returns next Monday', () => {
  const result = shiftBusinessDays(D('2024-01-05'), 1); // Friday -> Monday
  assert.equal(result.getTime(), D('2024-01-08').getTime());
});

check('shiftBusinessDays skips holidays when shifting forward', () => {
  // 2024-03-28 (Thursday) + 1 = Good Friday (holiday), so skip to Tuesday
  // (Monday is also a holiday: Easter Monday 2024-04-01).
  const result = shiftBusinessDays(D('2024-03-28'), 1);
  assert.equal(result.getTime(), D('2024-04-02').getTime());
});

check('shiftBusinessDays by negative count moves backward', () => {
  // 2024-01-09 (Tuesday) - 1 = Monday 2024-01-08
  const result = shiftBusinessDays(D('2024-01-09'), -1);
  assert.equal(result.getTime(), D('2024-01-08').getTime());
});
