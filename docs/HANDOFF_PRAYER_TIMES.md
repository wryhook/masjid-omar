# Handoff: prayer times automation

Last checked: 2026-11-03.

The automation is built and pushed to `araja24-updates`, but it won't run until it's merged to `main`. After that, the main risk is December, which is still blank in the sheet.

For how the system works, see [AUTOMATE_PRAYER_TIMES.md](AUTOMATE_PRAYER_TIMES.md).

## To do

Work through these in order.

### 1. Merge the automation to `main`

GitHub only runs scheduled workflows from the default branch. At the last check, no workflow was registered on the repo.

Commit `adefa33` on `araja24-updates` is mislabelled: its message says "Update prayer times for December 2026", but it added an unwanted design skill (`.agents/` and `skills-lock.json`) and no prayer data. Those files have since been removed. Squash merge the branch to keep them out of `main`'s history.

### 2. Test the connection

Go to **Actions > Update prayer times > Run workflow**. During November, leave `month` blank and **leave the mismatch box unticked**.

| Result | What it means |
| --- | --- |
| Fails with `clocks change by ...` | **This is the expected result.** The secret and the download both work. |
| Fails with `HTTP` or `login page` | Check the `PRAYER_SHEET_CSV_URL` secret. It must be the `/export?format=csv&gid=0` link, not the `/edit` link. |

Ticking the box would overwrite November, which has been deliberately left as it is.

### 3. Get December into the sheet

December is blank in the live sheet, which imports from another sheet. Someone needs to confirm when the source sheet will have it.

| Run | Ontario time |
| --- | --- |
| Main run | Nov 30, 7:07 PM |
| First retry | Dec 1, 7:07 AM |
| Final retry | Dec 1, 7:07 PM |

If December is still blank after the final retry, someone will have to start the workflow manually once it's filled in. Until December is published, the site has no times for it.

### 4. Check the first real run

Once December is filled in, you can run the workflow with `month` set to `2026-12` instead of waiting. Publishing early is safe because November stays in the file.

Confirm that:

- [ ] The Action passes and `github-actions[bot]` commits to `main`.
- [ ] `src/data/prayer-times.json` contains November and December.
- [ ] The site redeploys from that commit.
- [ ] `/daily-times` and `/bigscreen` show the right times on Dec 1.

### 5. Confirm the deploy path

None of this has been tested. Response headers suggest the site runs on DigitalOcean App Platform behind Cloudflare. Check that:

- [ ] DigitalOcean deploys automatically from `main`.
- [ ] A commit from `github-actions[bot]` starts a deploy.
- [ ] Visitors get the new page after a deploy. `/daily-times` returned a Cloudflare cache `HIT`, so a stale page could hide the new month.

### 6. Make sure someone sees failure emails

GitHub emails failures of a scheduled workflow to whoever last changed the schedule. After the merge, confirm that person is the right contact, or that they'll pass failures on.

## Coming up later

| When | What to do |
| --- | --- |
| Before Dec 31, 2026, 7:07 PM Ontario time | Refill the sheet for 2027 before the January run. The sheet has no years, so the script can't detect last year's rows. |
| March 14 and November 7, 2027 | The clock-change check runs for these months. See the decision below. |
| Any time the sheet changes after the 1st | Run the workflow manually. Scheduled runs only happen on the 1st and 2nd. |

## Decision for later: the clock-change check

The script stops if clocks change but sunrise in the sheet doesn't move by about an hour. November 2026 fails this check, and the owner has confirmed those times are correct.

If next year's sheet follows the same pattern, the March or November 2027 run will stop. Either tick the mismatch box on that run, or remove the check from the script.

## Already settled

Please don't reopen these without checking with the owner.

- **The sheet isn't edited.** The automation only reads it, and it stays in sync by importing from another sheet.
- **The times in the sheet are correct.** The owner has confirmed this.
- **November stays as it is.** Don't regenerate it. It keeps its current values until the January run removes it from the file.
- **`docs/UI_PLAN.md` was removed on purpose.**
- **No Google service account is needed.** The sheet is shared by link.

## Done

- [x] Script, tests, workflow and notes committed in `b31311c` and pushed to `araja24-updates`.
- [x] The sheet downloads as a CSV without a login (checked 2026-11-03).
- [x] The `PRAYER_SHEET_CSV_URL` secret was added by the owner. Its value can't be viewed, so step 2 is what tests it.
- [x] All 18 unit tests pass, and `main` isn't protected, so the Action should be able to push to it.
