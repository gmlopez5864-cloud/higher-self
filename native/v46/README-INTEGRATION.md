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
