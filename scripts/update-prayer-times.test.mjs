import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  assertCsvResponse,
  buildMonth,
  formatMinutes,
  mergeMonth,
  parseCsv,
  parseSheet,
  toMinutes,
} from './update-prayer-times.mjs';

const HEADER =
  'date,fajr_adhan,fajr_iqamah,sunrise,zawal,dhuhr_adhan,dhuhr_iqamah,asr_adhan,asr_iqamah,' +
  'maghrib_adhan,maghrib_iqamah,isha_adhan,isha_iqamah,tmrw_fajr_adhan,tmrw_fajr_iqamah,jummah1,jummah2,jummah3';
const DEFAULT_TIMES = '6:15,6:30,8:07,,12:23,12:40,2:11,3:00,4:26,4:31,6:11,7:30,,,12:30,,';

// Mirrors the top of the real sheet: quoted notes with commas, then the increment table.
function sheetFrom(dayRows, { maghrib = '5', isha = '10', fajr = '' } = {}) {
  const csv = [
    '"Please use 12 hour format, NOT 24 hour.",,,,,,,,,"To use auto increment, leave Iqamah blank",,,,,,,,',
    `Please address any changes,,,,,,,,,Fajr,Dhuhr,Asr,Maghrib,Isha,,,,`,
    `"Fill feb 29th on leap years only, refill sheet",,,,,,,,,${fajr},,,${maghrib},${isha},,,,`,
    ',,,,,,,,,,,,,,,,,',
    HEADER,
    ...dayRows,
  ].join('\r\n');
  return parseSheet(parseCsv(csv));
}

function monthRows(name, days, times = DEFAULT_TIMES) {
  return Array.from({ length: days }, (_, i) => `${name} ${i + 1},${times}`);
}

test('parseCsv handles quoted commas, escaped quotes and CRLF', () => {
  assert.deepEqual(parseCsv('"a, b",c\r\n"say ""hi""",\r\n'), [['a, b', 'c'], ['say "hi"', '']]);
});

test('the column decides AM or PM, including 12:xx and zero-padded cells', () => {
  const { entries, errors } = buildMonth(sheetFrom(monthRows('January', 31)), 2027, 1);
  assert.deepEqual(errors, []);
  assert.deepEqual(entries['2027-01-01'], {
    fajr: { start: '6:15:00 AM', iqamah: '6:30:00 AM' },
    sunrise: { start: '8:07:00 AM' },
    dhuhr: { start: '12:23:00 PM', iqamah: '12:40:00 PM' },
    asr: { start: '2:11:00 PM', iqamah: '3:00:00 PM' },
    maghrib: { start: '4:26:00 PM', iqamah: '4:31:00 PM' },
    isha: { start: '6:11:00 PM', iqamah: '7:30:00 PM' },
  });
  assert.equal(toMinutes('06:15', 'AM'), toMinutes('6:15', 'AM'));
});

test('a wrong AM/PM in a cell is overridden by the column', () => {
  assert.equal(formatMinutes(toMinutes('6:17:00 PM', 'AM')), '6:17:00 AM');
});

test('24-hour times are rejected, as the sheet instructions require', () => {
  assert.throws(() => toMinutes('13:03', 'PM'), /12-hour/);
  assert.throws(() => toMinutes('00:15', 'AM'), /12-hour/);
});

test('blank iqamah uses the auto-increment value', () => {
  const times = '6:15,6:30,8:07,,12:23,12:40,2:11,3:00,4:26,,6:11,,,,12:30,,';
  const { entries, errors } = buildMonth(sheetFrom(monthRows('January', 31, times)), 2027, 1);
  assert.deepEqual(errors, []);
  assert.equal(entries['2027-01-01'].maghrib.iqamah, '4:31:00 PM');
  assert.equal(entries['2027-01-01'].isha.iqamah, '6:21:00 PM');
});

test('blank iqamah with no auto-increment is omitted and warned about', () => {
  const times = '6:15,,8:07,,12:23,12:40,2:11,3:00,4:26,4:31,6:11,7:30,,,12:30,,';
  const { entries, errors, warnings } = buildMonth(sheetFrom(monthRows('January', 31, times)), 2027, 1);
  assert.deepEqual(errors, []);
  assert.deepEqual(entries['2027-01-01'].fajr, { start: '6:15:00 AM' });
  assert.match(warnings[0], /Fajr has no iqamah/);
});

test('a month with no times gives one clear error', () => {
  const { errors } = buildMonth(sheetFrom(monthRows('December', 31, ',,,,,,,,,,,,,,,,')), 2027, 12);
  assert.deepEqual(errors, ['The sheet has no times for December yet.']);
});

test('a partly filled month is rejected', () => {
  const rows = monthRows('January', 31);
  rows[9] = 'January 10,,,,,,,,,,,,,,,,,';
  const { errors } = buildMonth(sheetFrom(rows), 2027, 1);
  assert.ok(errors.some((e) => e.startsWith('January 10, fajr: adhan time is blank')));
});

test('February 29 is required in leap years and ignored otherwise', () => {
  const rows = [...monthRows('February', 28), 'February 29,,,,,,,,,,,,,,,,,'];
  const normal = buildMonth(sheetFrom(rows), 2027, 2);
  assert.deepEqual(normal.errors, []);
  assert.equal(Object.keys(normal.entries).length, 28);
  assert.ok(buildMonth(sheetFrom(rows), 2028, 2).errors.some((e) => e.startsWith('February 29')));
});

test('times out of order are rejected', () => {
  const times = '6:15,6:30,8:07,,12:23,12:40,7:00,8:00,4:26,4:31,6:11,7:30,,,12:30,,';
  const { errors } = buildMonth(sheetFrom(monthRows('January', 31, times)), 2027, 1);
  assert.ok(errors.some((e) => /maghrib .* is not after asr/.test(e)));
});

test('an iqamah before its adhan is rejected', () => {
  const times = '6:15,6:00,8:07,,12:23,12:40,2:11,3:00,4:26,4:31,6:11,7:30,,,12:30,,';
  const { errors } = buildMonth(sheetFrom(monthRows('January', 31, times)), 2027, 1);
  assert.ok(errors.some((e) => /fajr iqamah/.test(e)));
});

test('an auto-increment that passes midnight is rejected', () => {
  const times = '6:15,6:30,8:07,,12:23,12:40,2:11,3:00,4:26,4:31,11:55,,,,12:30,,';
  const { errors } = buildMonth(sheetFrom(monthRows('January', 31, times)), 2027, 1);
  assert.ok(errors.some((e) => /isha iqamah/.test(e)));
});

test('a clock change with no matching jump is an error unless explicitly allowed', () => {
  const rows = [...monthRows('October', 31), ...monthRows('November', 30)];
  const blocked = buildMonth(sheetFrom(rows), 2026, 11);
  assert.ok(blocked.errors.some((e) => /November 1: clocks change/.test(e)));
  const allowed = buildMonth(sheetFrom(rows), 2026, 11, { allowDstMismatch: true });
  assert.deepEqual(allowed.errors, []);
  assert.ok(allowed.warnings.some((w) => /November 1: clocks change/.test(w)));
});

test('a clock change with the matching jump passes', () => {
  const after = '5:15,5:30,7:07,,11:23,11:40,1:11,2:00,3:26,3:31,5:11,6:30,,,11:30,,';
  const rows = [
    ...monthRows('October', 31),
    ...monthRows('November', 30, after).map((r) => r.replace(/11:(23|40|30)/g, '12:$1')),
  ];
  const { errors } = buildMonth(sheetFrom(rows), 2026, 11);
  assert.deepEqual(errors.filter((e) => /clocks change/.test(e)), []);
});

test('mergeMonth keeps the previous month, drops older ones and sorts', () => {
  const merged = mergeMonth(
    { '2026-10-31': 'old', '2026-11-30': 'prev', '2026-12-01': 'stale' },
    { '2026-12-01': 'new' },
    2026,
    12,
  );
  assert.deepEqual(merged, { '2026-11-30': 'prev', '2026-12-01': 'new' });
});

test('mergeMonth keeps December when building January', () => {
  const merged = mergeMonth({ '2026-11-30': 'old', '2026-12-31': 'prev' }, { '2027-01-01': 'new' }, 2027, 1);
  assert.deepEqual(Object.keys(merged), ['2026-12-31', '2027-01-01']);
});

test('login pages and failed downloads are rejected', () => {
  assert.throws(() => assertCsvResponse(401, 'text/html', ''), /HTTP 401/);
  assert.throws(() => assertCsvResponse(200, 'text/html; charset=utf-8', '<!DOCTYPE html>'), /login page/);
  assert.throws(() => assertCsvResponse(200, 'text/csv', '<!DOCTYPE html>'), /login page/);
  assert.doesNotThrow(() => assertCsvResponse(200, 'text/csv', 'date,fajr_adhan'));
});

test('layout changes are rejected', () => {
  assert.throws(() => parseSheet(parseCsv('nothing,here\n')), /no header row/);
  assert.throws(() => parseSheet(parseCsv('date,fajr_adhan\nJanuary 1,6:15\n')), /missing columns/);
});
