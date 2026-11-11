# Icons Pablo needs to draw for Higher Self v46

The v46 dropdowns, Settings and side menu use **44 placeholder glyphs**. They were drawn in his line style as stand-ins.
To replace one, save his art under **the same file name** in both folders below. No code changes are needed; the app picks the file up on the next build.

| Folder | Size | Used for |
|---|---|---|
| `icons/glyphs/placeholders/` | 512×512 px PNG | the source / master |
| `icons/glyphs128/placeholders/` | 128×128 px PNG | what the app shows (downscale the 512 with LANCZOS, then quantize to 64 colors, like the other glyph sets) |

Style to match: cream line art **#F6EBD9 on a transparent background**, centred, with about 12% padding. The app puts it on the theme's coloured tile (`--icon-tile`), the same way as the other glyphs. One file covers every icon style (dog, cat, bird, fish fall back to these). Pablo can add `icons/glyphs128-<style>/placeholders/<name>.png` later if he wants per-style versions.

| File | 512 master | 128 app | Where it shows |
|---|---|---|---|
| `account-cash.png` | 512×512 | 128×128 | Account: cash / wallet (account dropdowns, account cards, Add account icon grid) |
| `account-checking.png` | 512×512 | 128×128 | Account: checking / bank |
| `account-credit.png` | 512×512 | 128×128 | Account: credit card |
| `account-other.png` | 512×512 | 128×128 | Account: any other account (fallback) |
| `add-own.png` | 512×512 | 128×128 | The “New path…” row in path dropdowns |
| `calendar.png` | 512×512 | 128×128 | Calendar choices (calendar pickers, Calendar menu item) |
| `calendar-day.png` | 512×512 | 128×128 | A single day (goal-unit icon grid choice) |
| `dir-complete.png` | 512×512 | 128×128 | Goal direction: Complete |
| `dir-down.png` | 512×512 | 128×128 | Goal direction: Down toward target |
| `dir-up.png` | 512×512 | 128×128 | Goal direction: Up toward target |
| `dot.png` | 512×512 | 128×128 | Neutral “none / all” choice (e.g. “None (optional)”, “All” filters) |
| `icon-style.png` | 512×512 | 128×128 | Icon style picker (custom theme) |
| `income-refund.png` | 512×512 | 128×128 | Income source: Refund |
| `income-side-work.png` | 512×512 | 128×128 | Income source: Side work |
| `menu-arrange.png` | 512×512 | 128×128 | Menu: Arrange areas |
| `menu-backup.png` | 512×512 | 128×128 | Menu: Back up to a file; Settings › Your data |
| `menu-currency.png` | 512×512 | 128×128 | Settings › Money (currency) |
| `menu-guide.png` | 512×512 | 128×128 | Menu: Show the guide; Settings › Meaning |
| `menu-lock.png` | 512×512 | 128×128 | Menu: Lock |
| `menu-pulls.png` | 512×512 | 128×128 | Settings › Shadows (pulls) |
| `menu-reminders.png` | 512×512 | 128×128 | Menu: Reminders; Settings › Time |
| `menu-remove.png` | 512×512 | 128×128 | Menu: Remove this profile (shown on the warning tile) |
| `menu-restore.png` | 512×512 | 128×128 | Menu: Restore from a backup / Undo the duplicate merge |
| `menu-saving.png` | 512×512 | 128×128 | Spare: saving / where backups go |
| `menu-security.png` | 512×512 | 128×128 | Settings › Days and security |
| `menu-settings-all.png` | 512×512 | 128×128 | Menu: All settings |
| `menu-sounds.png` | 512×512 | 128×128 | Spare: sounds |
| `remind-off.png` | 512×512 | 128×128 | Reminder repeat: Off |
| `repeat-2weeks.png` | 512×512 | 128×128 | Repeat: every 2 weeks |
| `repeat-3weeks.png` | 512×512 | 128×128 | Repeat: every 3 weeks |
| `repeat-4weeks.png` | 512×512 | 128×128 | Repeat: every 4 weeks |
| `repeat-daily.png` | 512×512 | 128×128 | Repeat: every day |
| `repeat-monthly.png` | 512×512 | 128×128 | Repeat: every month |
| `repeat-never.png` | 512×512 | 128×128 | Repeat: never / None link (debt, project) |
| `repeat-once.png` | 512×512 | 128×128 | Repeat: once; time unit “min” |
| `repeat-twice-month.png` | 512×512 | 128×128 | Repeat: twice a month |
| `repeat-weekly.png` | 512×512 | 128×128 | Repeat: every week |
| `repeat-yearly.png` | 512×512 | 128×128 | Repeat: every year |
| `theme.png` | 512×512 | 128×128 | Theme pickers; Themes menu item; Settings › Look section |
| `theme-pictures.png` | 512×512 | 128×128 | Theme picture-set picker (custom theme) |
| `unit-custom.png` | 512×512 | 128×128 | Goal unit: Custom… and units you add |
| `unit-hours.png` | 512×512 | 128×128 | Goal unit: hours; time unit “h” |
| `unit-times.png` | 512×512 | 128×128 | Goal unit: times |
| `unit-weight.png` | 512×512 | 128×128 | Goal unit: lbs / kg |

## Icons that already come from Pablo's existing sets (no new art needed)
- Shadows, steers and opposites: `icons/pull-*.jpg`, `icons/steer-*.jpg`, `icons/opp-*.jpg` (shown as `icons/glyphs128/pull-*.png` etc.)
- Paths: `icons/paths/*.jpg`
- Areas: each area's own icon, plus `icons/sleep.jpg`
- Money: `icons/glyphs128/money/*.png` (paycheck, gifts, other, savings, investment, groceries, …)
- Goals link: `icons/glyphs128/home/goals.png`

## Optional extra art that would help
- `add-own.png`: a dashed “+” for the **+ Add your own…** row. Today that row is drawn with CSS (a dashed outline and a "+"), so this file is optional.

## Added in 46.3
| File | Master | Shipped | Where it shows |
|---|---|---|---|
| `free-time.png` | 512×512 | 128×128 | Planner block type "Free time" (dropdowns, open-time sheet) |
