# Higher Self (growth-app)

Private growth journal — encrypted vault, five reorderable areas, soft season reevaluate, pie coach, money, purpose, themes.

## Run locally (required for encryption + install)

From this folder:

```bash
python3 -m http.server 8765
```

Open **http://localhost:8765/** in the browser.

Do **not** open `index.html` as a `file://` URL in Chrome — Web Crypto is blocked there.

## Add to Home Screen (PWA)

Install works over **https** or **localhost** (secure contexts). The app ships `manifest.webmanifest` + `sw.js`.

### Phone via this computer (recommended)

1. Start the server on your computer: `python3 -m http.server 8765`
2. Point the phone at **localhost** (not a raw LAN IP), so the service worker can register:
   - **Android Chrome:** USB + `adb reverse tcp:8765 tcp:8765`, then open `http://localhost:8765/`
   - **Or** put the folder behind any https tunnel / host
3. Open the site → browser menu → **Add to Home Screen** / **Install app**
4. **iPhone Safari:** Share → **Add to Home Screen** (works once the page is on localhost or https)

A plain `http://192.168.x.x:8765/` URL unlocks the vault (encryption works) but browsers will **not** register the service worker; use localhost-forwarding or https for install.

## Soft reevaluate

When a season end date arrives, Coach shows a soft check-in — not failure badges:

> A quiet season isn't a failure. You gave it an end date, and now you get to look again.

Actions: **Keep the range** / **Change the range** / **Feed this area again**.

## Icons not shipped

`icons/logo-options/`, `icons/logo-options-sheet.jpg`, and the old flower mark (`icons/app-mark.jpg`, `icons/icon-*.png`) stay on disk but are not referenced or precached. Leave them out of any upload/zip. Used copies: `icons/paths-section.jpg` (option 1), `icons/area-career-v2.jpg` (option 3), `icons/paths/wolf.jpg` (option 4). Old `career.jpg` is retired, not shipped.
