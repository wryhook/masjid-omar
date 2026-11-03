# Automating prayer times

The site's prayer times live in a Google Sheet. A scheduled GitHub Action copies each new month into [src/data/prayer-times.json](../src/data/prayer-times.json), and the host redeploys from that commit.

**Status (2026-11-02): built and tested locally, but not running yet.** See [Setup](#setup) and [Open issues](#open-issues).

The script only reads the sheet. Nothing in this system writes to it.

## How it works

```
Google Sheet (CSV export)
  -> scripts/update-prayer-times.mjs   converts and validates
  -> src/data/prayer-times.json        committed to main by the Action
  -> host rebuilds the static site
  -> pages pick today's times in the browser
```

The site is static, so new data only appears after a rebuild. One rebuild a month is enough because the page script looks up the visitor's current date in the embedded JSON and updates the display as the day changes.

| File | Purpose |
| --- | --- |
| [scripts/update-prayer-times.mjs](../scripts/update-prayer-times.mjs) | Downloads, converts, validates and writes the data. No npm dependencies. |
| [scripts/update-prayer-times.test.mjs](../scripts/update-prayer-times.test.mjs) | Unit tests. |
| [.github/workflows/update-prayer-times.yml](../.github/workflows/update-prayer-times.yml) | The schedule, which also commits the result. |

### Schedule

| Run (UTC) | Purpose |
| --- | --- |
| 1st, 00:07 | Main run. This is the evening before the 1st in Ontario, so the new month is live before local midnight. |
| 1st, 12:07 | Retry, in case the sheet was filled in late. |
| 2nd, 00:07 | Final retry. |

A run that finds no change makes no commit. The file also keeps the previous month, because visitors still need the old month's times during that last evening. Anything older is removed.

## Setup

Steps 1 to 3 have not been done yet.

1. **Give the Action read access to the sheet.** The sheet currently returns HTTP 401 without a Google login, so the Action can't read it. The simplest fix is to set link sharing to **Anyone with the link: Viewer**. Don't choose Editor. Keeping the sheet fully private would need a Google service account, which the script doesn't support yet.
2. **Add the repo secret.** In GitHub, go to Settings > Secrets and variables > Actions and add `PRAYER_SHEET_CSV_URL`:

   ```
   https://docs.google.com/spreadsheets/d/<SHEET_ID>/export?format=csv&gid=0
   ```

   This repo is public, so keep the real sheet URL out of the code and docs.
3. **Merge to `main`.** GitHub only runs schedules from the default branch, and the Run workflow button only appears once the file is there.
4. **Test it.** Go to Actions > Update prayer times > Run workflow and set `month` to the current month. Confirm the commit lands and the site redeploys.

Also check these once it's running, as neither has been tested:

- **Branch protection:** if `main` is protected, the Action needs permission to push.
- **Deploys:** confirm the host deploys commits made by `github-actions[bot]`. Commits pushed with the Action's default token don't trigger other GitHub workflows, so a deploy that runs as a GitHub workflow would need a different token.

## What the script expects from the sheet

| Part of the sheet | How it's handled |
| --- | --- |
| One tab for the whole year | The month is selected by the `date` column. |
| Dates like `January 1`, with no year | The year comes from the month being built. |
| Times like `06:15` or `6:13`, with no AM/PM | The column decides. Fajr and Sunrise are AM, everything else is PM. An AM/PM typed into a cell is ignored. |
| Blank iqamah | Adhan plus the auto-increment value from the table above the header. |
| `February 29` | Required in leap years, ignored otherwise. |
| `zawal`, `tmrw_fajr_*`, `jummah*` | Not used. |

The header row and increment table are found by their labels, so adding rows above them is safe. Renaming or removing a required column stops the run with an error.

Output matches the format the pages already read:

```json
"2026-11-01": {
  "fajr": { "start": "6:17:00 AM", "iqamah": "6:45:00 AM" },
  "sunrise": { "start": "8:00:00 AM" }
}
```

## Validation

There's no human review before publishing, so the script checks the data first. If any check fails, nothing is written and the current data stays in place.

**These stop the run:**

- The download fails or returns a login page instead of a CSV.
- The sheet layout changed.
- The month has no times yet, or any day or adhan is missing.
- A time isn't valid 12-hour format, such as `13:03`.
- Adhans are out of order for the day.
- An iqamah is before its adhan, after the next prayer starts, or past midnight.
- Clocks change that day in `America/Toronto`, but sunrise in the sheet doesn't move by about an hour.

**This only warns:** a blank iqamah with no auto-increment value. The month still publishes and the site shows no iqamah for that prayer.

## Running it manually

To publish a sheet edit before the next scheduled run, use **Actions > Update prayer times > Run workflow**, or run it locally:

```bash
# Run the tests
npm run prayer-times:test

# Check a downloaded CSV without writing anything
node scripts/update-prayer-times.mjs --month 2026-12 --csv "path/to/sheet.csv" --dry-run

# Download from the sheet and update prayer-times.json
PRAYER_SHEET_CSV_URL="..." npm run prayer-times:update -- --month 2026-12
```

`--allow-dst-mismatch` (also an option on Run workflow) publishes despite a failed clock-change check. Only use it if the sheet is confirmed correct or someone has accepted the risk.

## Troubleshooting

GitHub sends failure emails for a schedule to whoever last changed it. Every failed retry sends another email.

| Error | Fix |
| --- | --- |
| `HTTP 401` or `login page` | Check the sheet's sharing setting and the secret. |
| `The sheet has no times for <month> yet` | Fill in the sheet, then wait for a retry or use Run workflow. |
| `clocks change by ...` | Ask whoever maintains the sheet to correct the times after the clock change. |
| `Sheet layout changed` | Restore the column, or update `PRAYERS` in the script. |
| Push rejected | Check branch protection on `main`. |

## Known limitations

- **Mid-month edits:** changes made to the sheet after the 1st don't reach the site until someone uses Run workflow.
- **The new year:** the sheet has no year, so last year's January rows look just like this year's. The sheet must be refilled before the January run. The clock-change check can't catch this.
- **Time zone:** `America/Toronto` is an assumption based on the `.ca` domain and the sunrise times. To change it, edit `TIME_ZONE` in the script.
- **Late or skipped runs:** GitHub can delay scheduled runs. Repeated failures with no commits could also let GitHub disable the schedule on a public repo after 60 days without activity.

## Open issues

Found on 2026-11-02. None of these have been fixed.

1. **November times in the repo have the wrong AM/PM.** All 30 days store Fajr and Sunrise as PM, so the countdown is wrong even though the table shows AM. To fix it, regenerate November with the script.
2. **November times in the sheet look an hour late.** Clocks went back on 2026-11-01, but sunrise goes from 7:59 on Oct 31 to 8:00 on Nov 1. The March 8 change does show its one-hour jump. Nov 30 has Dhuhr at 1:08, while Jan 1 has 12:23. November therefore fails the clock-change check until the sheet is corrected or `--allow-dst-mismatch` is used.
3. **December is blank in the sheet.** It needs filling in before the main run on the evening of Nov 30 (Ontario time).
4. **Possible typo:** the Nov 2 Fajr iqamah is 6:30, while Nov 1 and Nov 3 are 6:45.

## Work log

### 2026-11-02: initial build

**Findings**

- Monthly updates were manual commits. There were no scripts or workflows.
- The Oct data was correct. The Nov commit introduced the PM values in open issue 1.
- The sheet has one tab, with no years and no AM/PM.
- A direct CSV download returned HTTP 401.

**Decisions**

- Run on the evening before the 1st and keep the previous month, so there's no gap at midnight.
- Use GitHub Actions rather than a runtime fetch, so the site stays static and doesn't depend on Google when pages load.
- Refuse to publish on bad data, rather than guess at corrections.
- Keep the sheet URL in a secret, because the repo is public.

**Tested**

- All 18 unit tests pass.
- A local copy of the sheet was run through a dry run for every month of 2026. Jan to Oct passed. Feb and Mar warned about a blank Fajr iqamah from Feb 18 to Mar 19. Nov failed the clock-change check and Dec failed as blank, both as described in the open issues.
- November was generated with `--allow-dst-mismatch` and compared with the repo. Of 330 values, the only differences were the 90 Fajr and Sunrise values changing from PM to AM.

**Not tested**

- A live download from the sheet, which is blocked by the 401.
- The workflow on GitHub, including the commit, push and schedule.
- A deploy triggered by the Action's commit.
