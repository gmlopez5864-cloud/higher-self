# Higher Self 46.0.0 (Android)

Same Capacitor wrapper and native files as `native/v45`. Only `android/app/build.gradle` changes: versionCode 46, versionName 46.0.0. Sign with the same release key as v44/v45 so the app upgrades in place. The key stays on the packaging machine and is never committed.

Build steps:
1. `npm ci`
2. `npm run cap:sync`, which copies `index.html`, `planner-gaps.js`, `sw.js`, `manifest.webmanifest`, `icons` and `themes` into `www/`.
3. `cd android && ./gradlew assembleRelease`

The web build is unchanged. `APP_VERSION`, `ICON_VER` and `sw.js` stay at 43. The footer shows 46 only inside the Android shell, or with `?android=1`.

What's new in v46 (app side, all in `index.html`):
- **One inline icon dropdown.** Every `<select>` gets a label-left row with a rounded pill on the right that shows the chosen option's icon.
  - The list opens as a popover. Lists with more than 8 options open as a bottom sheet, with search for long lists.
  - Options are grouped into From the book, Yours and More. The chosen one gets a check mark. Paths is a multi-pick.
  - It is keyboard and screen-reader friendly (listbox and option roles).
  - The native `<select>` stays underneath, so every value and change handler keeps working.
- **"+ Add your own…"** opens one sheet with a name, an optional second field, an icon grid and "Star it". This covers shadows, steers, paths, accounts, income sources, goal units and expense categories.
  - The new item is saved, picked right away, and shown under Yours next time.
  - Long-press (or right-click / F2) one of your own to edit, hide or delete it.
  - New saved lists: `customSteers`, `incomeCustom`, `goalUnitsCustom`. Accounts gain `img`, `starred` and `hidden`. Expense categories gain `img` and `hidden`.
- **Migration** keeps custom shadows' `starred` and `pair` flags, which were dropped before, plus account and category icons.
- **Currency fix:** the Currency list is filled however Settings opens. Before, it was blank when opened from the side menu.
- **Gentle open/close** on every sheet (`@starting-style`), turned off under prefers-reduced-motion.
- **Layout:** rows no longer leave one item alone (money tabs, plan days, home tiles). Tap targets are at least 44px. There is one heading font.
- **Settings:** grouped into sections with icons, plus a Back up now button. The side menu has sections and icons.
- **Small fixes:**
  - "Pick up to 5" now shows once.
  - The goal percentage sits on the right.
  - "Add entry" sits under the Diary header.
  - A new planned block no longer presets a path.
  - The end date is hidden while "Until I stop it" is chosen.
- **Placeholder icons** for the new choices live in `icons/glyphs128/placeholders/` (128px, shipped) and `icons/glyphs/placeholders/` (512px masters, not shipped). Pablo's art replaces them by dropping in files with the same names. See `icons/glyphs/placeholders/README.md`.

## 46.1.0 (versionCode 47)
- **Shadow & steer:** the separate Shadow and Steer pickers are now one icon dropdown, Shadow & steer, grouped by type.
  - Groups: Shadows · from the book, Your shadows, More shadows, Steers for your shadow, Your steers, Steers.
  - After you pick a shadow, its steers come first.
  - "+ Add your own…" asks whether it's a shadow (with an optional steer) or a steer, then saves it and shows it in the same dropdown next time.
  - The two single pickers stay hidden underneath, so the chips, caps, Addiction and old pair logic are unchanged.
- **Bottom-sheet lists:** these are now capped at 86% of the screen height. Before, a long list could push the sheet's title off the top of the screen.
- **Version:** the Android footer shows 46.1.

## 46.2.0 (versionCode 48)
- **24-hour cap on Confirm day:** "That would put today at 24.8 hours" happened when an entry you had already logged by hand (Hobbies 3h) was the same time as a planned block (Hobbies 18:00–21:00). Confirm day then logged that block again on top of it. The cap now compares only real logged plus confirmed hours for that calendar day:
  - An entry tied to a block takes its minutes out of that block when the day is confirmed. The planned pie drops by the same amount.
  - Concurrent listening never counts. `dayTotal` itself now leaves out every concurrent log (`countsElapsed: false`, `alongside`, or a `#listen` plan key), including one with no area and any stray linked task. On unlock, a task left linked to a listen is dropped.
  - Overnight blocks still split at midnight. Hand-logged sleep is never stacked with planned sleep.
  - A refused save or confirm now also restores `planDone` and `planDays`, including "skip listening".
- **Entry flow ("Add entry"):**
  - "Which block?" lists the day's blocks, your own first and then calendar events, with "Open time (not in a block)" as the default.
  - Picking a block fills in what, area and path, and starts the time at 30 min. You can edit it in the same sheet.
  - A "How did it go?" note box sits under Good / Neutral / Bad. It is stored as `how`, and the block link is stored as `blockKey`.
- **24h max per entry:** "One entry can be up to 24 hours." This applies to entries and tasks.
- **Over-24h options sheet:** this replaces the lone "Change the time" button.
  - "Change this entry's time" is shown when there's an entry.
  - The sheet lists everything on that day: logged entries, tasks, sleep and the planned blocks waiting to be confirmed. Each one can be edited (hours) or cancelled / skipped for the day in place.
  - It shows how much of the day is left, and "Try again" re-runs the save.
- **Version:** the Android footer shows 46.2.
- **Tests:** `tests/legacy/t462cap.js` (36 checks). `HS_REPRO_ONLY=1 HS_ORIGIN=<46.1 page>` reproduces the 24.8h message on 46.1.
