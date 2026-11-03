#!/usr/bin/env node
// Rebuilds src/data/prayer-times.json from the masjid's Google Sheet.
// Read-only: it downloads a CSV export and never writes to the sheet.
// Background and setup: docs/AUTOMATE_PRAYER_TIMES.md
//
//   node scripts/update-prayer-times.mjs [--month YYYY-MM] [--csv FILE] [--out FILE]
//                                        [--dry-run] [--allow-dst-mismatch]
//
// The sheet comes from --csv, or else the PRAYER_SHEET_CSV_URL environment variable.
// If anything fails validation, nothing is written and the exit code is 1.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_OUT = 'src/data/prayer-times.json';
const TIME_ZONE = 'America/Vancouver';
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// The sheet stores 12-hour times with no AM/PM, so each column's period is fixed here.
// `increment` is the label used in the sheet's auto-increment table.
const PRAYERS = [
  { key: 'fajr', adhan: 'fajr_adhan', iqamah: 'fajr_iqamah', increment: 'Fajr', period: 'AM' },
  { key: 'sunrise', adhan: 'sunrise', period: 'AM' },
  { key: 'dhuhr', adhan: 'dhuhr_adhan', iqamah: 'dhuhr_iqamah', increment: 'Dhuhr', period: 'PM' },
  { key: 'asr', adhan: 'asr_adhan', iqamah: 'asr_iqamah', increment: 'Asr', period: 'PM' },
  { key: 'maghrib', adhan: 'maghrib_adhan', iqamah: 'maghrib_iqamah', increment: 'Maghrib', period: 'PM' },
  { key: 'isha', adhan: 'isha_adhan', iqamah: 'isha_iqamah', increment: 'Isha', period: 'PM' },
];

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  const src = text.replace(/^﻿/, '');

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') {
        quoted = false;
      } else {
        cell += c;
      }
    } else if (c === '"') {
      quoted = true;
    } else if (c === ',') {
      row.push(cell);
      cell = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += c;
    }
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

/** Finds the header row, the day rows and the auto-increment table. Throws if the layout changed. */
export function parseSheet(rows) {
  const headerIndex = rows.findIndex((r) => r[0]?.trim().toLowerCase() === 'date');
  if (headerIndex === -1) throw new Error('Sheet layout changed: no header row starting with "date".');

  const header = rows[headerIndex].map((h) => h.trim());
  const required = PRAYERS.flatMap((p) => (p.iqamah ? [p.adhan, p.iqamah] : [p.adhan]));
  const missing = required.filter((name) => !header.includes(name));
  if (missing.length) throw new Error(`Sheet layout changed: missing columns ${missing.join(', ')}.`);

  const days = new Map();
  for (const r of rows.slice(headerIndex + 1)) {
    const label = r[0]?.trim().toLowerCase();
    if (!label) continue;
    if (days.has(label)) throw new Error(`Sheet has two rows for "${r[0].trim()}".`);
    days.set(label, Object.fromEntries(header.map((name, i) => [name, (r[i] ?? '').trim()])));
  }

  const labels = PRAYERS.filter((p) => p.increment).map((p) => p.increment);
  const labelRowIndex = rows
    .slice(0, headerIndex)
    .findIndex((r) => labels.every((l) => r.some((c) => c.trim() === l)));
  if (labelRowIndex === -1) throw new Error('Sheet layout changed: auto-increment table not found.');

  const increments = {};
  for (const label of labels) {
    const column = rows[labelRowIndex].findIndex((c) => c.trim() === label);
    const raw = (rows[labelRowIndex + 1]?.[column] ?? '').trim();
    if (raw !== '' && !/^\d+$/.test(raw)) {
      throw new Error(`Auto-increment for ${label} must be a whole number of minutes, got "${raw}".`);
    }
    increments[label] = raw === '' ? null : Number(raw);
  }

  return { days, increments };
}

/** Converts a sheet cell to minutes after midnight. Any AM/PM in the cell is ignored: the column decides. */
export function toMinutes(cell, period) {
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?(?:\s*[ap]\.?m\.?)?$/i.exec(cell.trim());
  if (!match) throw new Error(`"${cell}" is not a time`);
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 1 || hour > 12 || minute > 59) throw new Error(`"${cell}" is not a 12-hour time`);
  return ((hour % 12) + (period === 'PM' ? 12 : 0)) * 60 + minute;
}

/** Formats minutes after midnight the way prayer-times.json stores them, e.g. "6:17:00 AM". */
export function formatMinutes(total) {
  const hour = Math.floor(total / 60);
  const minute = String(total % 60).padStart(2, '0');
  return `${hour % 12 || 12}:${minute}:00 ${hour >= 12 ? 'PM' : 'AM'}`;
}

function utcOffsetMinutes(year, month, day) {
  // 17:00 UTC is mid-morning in Vancouver, safely after a 2 AM clock change.
  const part = new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, timeZoneName: 'shortOffset' })
    .formatToParts(new Date(Date.UTC(year, month - 1, day, 17)))
    .find((p) => p.type === 'timeZoneName').value;
  const match = /GMT([+-])(\d+)(?::(\d+))?/.exec(part);
  return (match[1] === '-' ? -1 : 1) * (Number(match[2]) * 60 + Number(match[3] ?? 0));
}

/** Sunrise only moves a few minutes a day, so a clock change must show up as a jump of about an hour. */
function findDstMismatches(sheet, year, month, daysInMonth) {
  const problems = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const previous = new Date(Date.UTC(year, month - 1, day - 1));
    const previousYear = previous.getUTCFullYear();
    const previousMonth = previous.getUTCMonth() + 1;
    const previousDay = previous.getUTCDate();
    const expected = utcOffsetMinutes(year, month, day) - utcOffsetMinutes(previousYear, previousMonth, previousDay);
    if (expected === 0) continue;

    const todayRow = sheet.days.get(`${MONTHS[month - 1]} ${day}`.toLowerCase());
    const previousRow = sheet.days.get(`${MONTHS[previousMonth - 1]} ${previousDay}`.toLowerCase());
    if (!todayRow?.sunrise || !previousRow?.sunrise) continue;

    const actual = toMinutes(todayRow.sunrise, 'AM') - toMinutes(previousRow.sunrise, 'AM');
    if (Math.abs(actual - expected) > 15) {
      problems.push(
        `${MONTHS[month - 1]} ${day}: clocks change by ${expected} minutes in ${TIME_ZONE}, but sunrise in the sheet ` +
          `moves ${actual} minutes (${previousRow.sunrise} to ${todayRow.sunrise}). The times may be an hour off. ` +
          'Correct the sheet, or pass --allow-dst-mismatch to publish anyway.',
      );
    }
  }
  return problems;
}

/** Builds one month of JSON entries, collecting every problem rather than stopping at the first. */
export function buildMonth(sheet, year, month, { allowDstMismatch = false } = {}) {
  const errors = [];
  const warnings = [];
  const entries = {};
  const monthName = MONTHS[month - 1];
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const rowFor = (day) => sheet.days.get(`${monthName} ${day}`.toLowerCase());

  const hasAnyTime = Array.from({ length: daysInMonth }, (_, i) => rowFor(i + 1)).some(
    (row) => row && PRAYERS.some((p) => row[p.adhan]),
  );
  if (!hasAnyTime) {
    errors.push(`The sheet has no times for ${monthName} yet.`);
    return { entries, errors, warnings };
  }

  const noIqamah = {};
  for (let day = 1; day <= daysInMonth; day++) {
    const label = `${monthName} ${day}`;
    const row = rowFor(day);
    if (!row) {
      errors.push(`${label}: no row in the sheet.`);
      continue;
    }

    const key = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const entry = {};
    const times = [];
    for (const prayer of PRAYERS) {
      const cell = prayer.key;
      try {
        if (!row[prayer.adhan]) throw new Error('adhan time is blank');
        const start = toMinutes(row[prayer.adhan], prayer.period);
        const time = { key: cell, start };

        if (row[prayer.iqamah]) {
          time.iqamah = toMinutes(row[prayer.iqamah], prayer.period);
        } else if (prayer.iqamah && sheet.increments[prayer.increment] !== null) {
          time.iqamah = start + sheet.increments[prayer.increment];
        } else if (prayer.iqamah) {
          (noIqamah[prayer.increment] ??= []).push(day);
        }

        times.push(time);
      } catch (err) {
        errors.push(`${label}, ${cell}: ${err.message}.`);
      }
    }
    if (times.length !== PRAYERS.length) continue;

    let valid = true;
    times.forEach((time, i) => {
      const next = times[i + 1];
      if (next && next.start <= time.start) {
        errors.push(`${label}: ${next.key} (${formatMinutes(next.start)}) is not after ${time.key} (${formatMinutes(time.start)}).`);
        valid = false;
      }
      if (time.iqamah === undefined) return;
      if (time.iqamah < time.start || time.iqamah >= 24 * 60) {
        errors.push(`${label}: ${time.key} iqamah is outside that prayer's day or before its adhan.`);
        valid = false;
      } else if (next && time.iqamah > next.start) {
        errors.push(`${label}: ${time.key} iqamah (${formatMinutes(time.iqamah)}) is after ${next.key} starts (${formatMinutes(next.start)}).`);
        valid = false;
      }
    });
    if (!valid) continue;

    for (const time of times) {
      entry[time.key] = { start: formatMinutes(time.start) };
      if (time.iqamah !== undefined) entry[time.key].iqamah = formatMinutes(time.iqamah);
    }
    entries[key] = entry;
  }

  for (const [prayer, days] of Object.entries(noIqamah)) {
    warnings.push(
      `${monthName}: ${prayer} has no iqamah and no auto-increment on ${days.length} day(s) ` +
        `(${days.join(', ')}). The site will show no iqamah on those days.`,
    );
  }

  const dstProblems = findDstMismatches(sheet, year, month, daysInMonth);
  (allowDstMismatch ? warnings : errors).push(...dstProblems);

  return { entries, errors, warnings };
}

/**
 * Adds a month to the existing data. The previous month stays because this runs on the evening
 * before the 1st local time, when visitors still need the last day of the old month.
 */
export function mergeMonth(existing, entries, year, month) {
  const previous = new Date(Date.UTC(year, month - 2, 1));
  const cutoff = `${previous.getUTCFullYear()}-${String(previous.getUTCMonth() + 1).padStart(2, '0')}-01`;
  const merged = { ...existing, ...entries };
  return Object.fromEntries(
    Object.keys(merged)
      .filter((date) => date >= cutoff)
      .sort()
      .map((date) => [date, merged[date]]),
  );
}

/** Rejects anything that is not a CSV, because a sheet without link access returns a login page. */
export function assertCsvResponse(status, contentType, body) {
  if (status !== 200) {
    throw new Error(`Could not download the sheet (HTTP ${status}). Check PRAYER_SHEET_CSV_URL and the sheet's sharing setting.`);
  }
  if (/html/i.test(contentType ?? '') || /^\s*</.test(body)) {
    throw new Error("The sheet returned a web page instead of a CSV, most likely a login page. Check the sheet's sharing setting.");
  }
}

async function readSheetCsv(csvPath) {
  if (csvPath) return readFileSync(csvPath, 'utf8');
  const url = process.env.PRAYER_SHEET_CSV_URL;
  if (!url) throw new Error('Set PRAYER_SHEET_CSV_URL or pass --csv FILE.');
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  const body = await response.text();
  assertCsvResponse(response.status, response.headers.get('content-type'), body);
  return body;
}

function parseArgs(argv) {
  const options = { out: DEFAULT_OUT, dryRun: false, allowDstMismatch: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--month') options.month = argv[++i];
    else if (arg === '--csv') options.csv = argv[++i];
    else if (arg === '--out') options.out = argv[++i];
    else if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--allow-dst-mismatch') options.allowDstMismatch = true;
    else throw new Error(`Unknown option: ${arg}`);
  }
  return options;
}

function targetMonth(value) {
  // Defaults to the UTC month, because the schedule runs just after midnight UTC on the 1st,
  // when it is still the last day of the old month in Vancouver.
  const text = value || new Date().toISOString().slice(0, 7);
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(text);
  if (!match) throw new Error(`--month must look like 2026-12, got "${text}".`);
  return { year: Number(match[1]), month: Number(match[2]) };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const { year, month } = targetMonth(options.month);
  const prefix = process.env.GITHUB_ACTIONS ? { error: '::error::', warning: '::warning::' } : { error: 'ERROR: ', warning: 'WARNING: ' };

  const sheet = parseSheet(parseCsv(await readSheetCsv(options.csv)));
  const { entries, errors, warnings } = buildMonth(sheet, year, month, options);

  warnings.forEach((message) => console.log(prefix.warning + message));
  if (errors.length) {
    errors.forEach((message) => console.error(prefix.error + message));
    console.error(`${errors.length} problem(s) found. Nothing was written.`);
    process.exitCode = 1;
    return;
  }

  const count = Object.keys(entries).length;
  if (options.dryRun) {
    console.log(`OK: ${MONTHS[month - 1]} ${year} has ${count} valid days. Dry run, nothing written.`);
    return;
  }

  const existing = existsSync(options.out) ? JSON.parse(readFileSync(options.out, 'utf8')) : {};
  const merged = mergeMonth(existing, entries, year, month);
  writeFileSync(options.out, `${JSON.stringify(merged, null, 2)}\n`);
  console.log(`OK: wrote ${count} days for ${MONTHS[month - 1]} ${year} to ${options.out}.`);
}

if (process.argv[1] && resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase()) {
  main().catch((err) => {
    console.error(`ERROR: ${err.message}`);
    process.exitCode = 1;
  });
}
