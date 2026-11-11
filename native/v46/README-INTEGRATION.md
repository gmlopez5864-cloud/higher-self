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

## 46.3.0 (versionCode 49)
- **Lock / welcome screen (Android only; the web gate is unchanged):**
  - Full-screen deep indigo/violet gradient with soft teal and pink glows, and a frosted card centered both ways.
  - Pablo's bow logo is 96px with a gold glow; "Higher Self" has a gold gradient. The entrance fades and rises in, and the logo glow pulses. All motion is off under `prefers-reduced-motion`.
  - Profile tiles are centered.
- **Fingerprint on the lock screen** (uses the v45 `HSBiometric` Keystore plugin, which is unchanged):
  - When fingerprint is on, the screen shows a large "Unlock with fingerprint" button and prompts once by itself when the screen opens. The passphrase is under "or use your passphrase".
  - On the profile picker, "Open {name} with fingerprint" is shown for the profile that fingerprint is tied to. The native slot holds one passphrase, so this is the one profile it is tied to (`hs-bio-profile`).
  - Cancelling is quiet and puts the cursor in the passphrase box. Lockout or a changed fingerprint shows a short message, and you use the passphrase instead (a changed fingerprint also clears the tie).
  - If fingerprint isn't on, after a passphrase unlock you see "Open faster next time?" with "Use fingerprint" or "Not now". "Not now" is remembered per profile (`hs-bio-skip:<id>`). Settings → enable/disable still works.
- **Skip a planned block:** this is on Confirm day ("Skip" on each block row; skipped rows show "Skipped · no time counted" with Undo) and in Add entry ("It didn't happen: skip this block"). A toast with Undo appears. Skipped blocks count no time.
- **Duration stepper:** this is on each Confirm day block, in Add entry when a block is picked, and in the open-time sheet. The −/+ buttons are 48px.
  - It steps 5 min under 1 h and 15 min from 1 h up, and holding a button repeats.
  - Tap the value to type exact hours and minutes.
  - It shows "45 min" or "1 h 30 min". A planned block stops at 23 h 55 min, because a block can't start and end at the same time. An entry stops at 24 h. The 24h cap and the over-24h sheet are unchanged.
- **Free time block type** (`area: "free"`, color #21A89A, placeholder icon `placeholders/free-time.png`):
  - It is in the block-type dropdowns and has no path. The note is optional.
  - Confirmed free time is logged as a general entry with `area: "free"`. It counts toward the 24h total and the cap, and it has its own pie slice and legend row.
- **Open time in the day planner:** gaps of 15 min or more between blocks, inside the waking window, show as tappable "Open time" rows with start–end and length.
  - Tapping one opens a sheet prefilled with the gap. It has "Make it free time" (one tap), or you can pick any block type, start and length (stepper). Whatever you don't use stays open time.
  - "Make whole day free time" shows on a day with no non-sleep blocks. It fills only open waking time, so it never overlaps blocks or sleep.
- **Version:** the Android footer shows 46.3.
- **Tests:** `tests/legacy/t463.js` (46 checks).

## 46.4.0 (versionCode 50)
- **Write about a block (Android only; the web is unchanged):**
  - Tap any block's name in the day planner (planned, free time, sleep, logged or skipped) or on the Confirm day card. The journal composer opens on that block with the cursor in "Write about this".
  - A small pen marks the tap. Once a block has entries, it shows a journal count.
- **Composer (`#jeDialog`):**
  - The header shows the block's type, time, length, date and status (Planned / Logged / Skipped · no time counted).
  - "How did it go?", "What happened?" and "What would you change?" are optional starters. Tapping one adds the question to the text.
  - Voice note and Add photo use the diary's existing recorder and picker. "Turn into text" works on saved voice notes as before.
  - The Path dropdown starts on the block's own path. A block with no path starts on "No path", and you can pick any path.
  - "This block" keeps the same stepper, Skip / Bring back and Edit block. A logged block has no stepper.
  - Earlier entries for the block are listed with the "How did it go?" notes from logging. Those notes are shown, not changed.
  - A block can have any number of entries.
- **Data:** an entry is a normal `data.diary` entry with `path: [pathId]` (or `[]`), `area: [area]` for the five areas, and `block: { key: "planId|YYYY-MM-DD", plan, date, label, area, start, end }`.
  - The snapshot keeps the chip working if the block is deleted later ("Not in your plan anymore").
  - The vault loader now keeps `block`.
- **Where entries show:**
  - In the Journal feed, under the path's chip in "Your road", in the Journal day list and in the path card (a "N journal entries" button plus the entries in its history).
  - Each entry has a chip such as "Work · 9:00 AM–12:00 PM" that opens the block again.
- **No time:** diary entries don't count toward hours. Totals, planned hours, the stepper, Skip, the 24h cap and the over-24h sheet are unchanged.
- **"New entry" in the Journal** opens the same composer with no block, a date and an optional path. The Journal page's own composer and Save still work.
- **Version:** the Android footer shows 46.4.
- **Tests:** `tests/legacy/t464.js` (50 checks).
