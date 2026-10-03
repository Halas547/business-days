# Business Days

A small, zero-dependency TypeScript-free ESM library for counting working days between two dates, with UK public holidays (New Year's Day, Good Friday, Easter Monday, Christmas Day, Boxing Day) built in.

## Usage

```js
import {
  businessDaysBetween,
  isBusinessDay,
  shiftBusinessDays,
} from 'business-days';

// Count working days in a half-open [start, end) range.
const days = businessDaysBetween('2024-01-01', '2024-01-08'); // 4

// Check whether a specific date is a working day.
isBusinessDay('2024-01-06'); // false (Saturday)

// Shift a date by N business days (forward or backward).
shiftBusinessDays('2024-01-06', 1); // 2024-01-08 (next Monday)
```

## Why this exists

The problem: compute the number of working days between two dates, accounting for weekends and a fixed set of public holidays, without pulling in a heavyweight date library. The trade-off is that the holiday calendar is baked in (UK set: New Year, Good Friday, Easter Monday, Christmas, Boxing Day). If you need a different jurisdiction, vendor this library and edit `FIXED_HOLIDAYS`.

## Edge cases

- The range `businessDaysBetween(start, end)` is **half-open on the end date**: a Monday-to-Monday span yields 5 working days, not 6. This matches the convention used by most date-range libraries but catches people who expect inclusive ranges.
- All date comparisons use the **UTC date component** and discard the time of day. `2024-01-06T23:59Z` and `2024-01-06T00:00Z` are the same business day. If your inputs carry local-time semantics, normalise them yourself first.
- `shiftBusinessDays` does **not** normalise the start date. Shifting a Saturday by 0 returns that Saturday; shifting by 1 returns the next Monday (skipping the weekend). If you need the start date itself normalised to a business day, do that explicitly before calling.
- `businessDaysBetween` with `start > end` returns 0 rather than throwing.
