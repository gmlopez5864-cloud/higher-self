// v39 tester contact + accessibility: "Version 39" and a "Report a problem" mailto (version + browser only)
// in Settings and the menu, "Updated to v39" once, <main> landmark, aria-selected day tabs, 44px week arrows,
// 4.5:1 muted/orange text on Dawn, and the floating logo bar never covers the COACH heading.
const A = require("./lib/app"); const { sleep, ok, done } = Object.assign({}, A, A.suite());
const ratio = (a, b) => { const L = c => { const v = c.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number).map(x => x / 255).map(x => x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4)); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; }; const [x, y] = [L(a), L(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
(async () => {
  const browser = await A.launch(); const { page, errs } = await A.phonePage(browser);
  await A.fresh(page); await A.setup(page, "Guillermo", "gui-pass-1");
  let r = await page.evaluate(() => ({ app: APP_VERSION, icon: ICON_VER, mail: REPORT_EMAIL, seen: localStorage.getItem("higherSelf.seenVersion") }));
  ok("APP_VERSION 43, ICON_VER 43", r.app === "43" && r.icon === "43", r);
  ok("report address is gmlopez5864@gmail.com", r.mail === "gmlopez5864@gmail.com", r);
  ok("first open records the version without an 'Updated' toast", r.seen === "43" && !/Updated to/.test(await page.evaluate(() => (document.getElementById("toast") || {}).textContent || "")), r);
  // footers
  await page.evaluate(() => document.getElementById("btnOptions").click()); await sleep(400);
  r = await page.evaluate(() => { const f = document.querySelector("#optionsDialog [data-version-footer]"); const a = f && f.querySelector("a[data-report-link]"); return f && { text: f.innerText.replace(/\s+/g, " ").trim(), href: a && a.getAttribute("href"), vis: f.offsetParent !== null }; });
  ok("Settings footer: 'Version 43' + 'Report a problem'", r && r.text === "Version 43 Report a problem", r);
  const u = r && new URL(r.href.replace(/^mailto:/, "mailto://x/"));
  const href = r && r.href;
  ok("mailto goes to gmlopez5864@gmail.com with subject 'Higher Self v43: a problem'", /^mailto:gmlopez5864@gmail\.com\?/.test(href) && decodeURIComponent(href.match(/subject=([^&]*)/)[1]) === "Higher Self v43: a problem", href);
  const body = href ? decodeURIComponent(href.match(/body=([^&]*)/)[1]) : "";
  ok("mail body has only the version and the phone/browser (no names, no data)", /Version 43/.test(body) && /Android 14; Pixel 8/.test(body) && !/Guillermo|gui-pass/.test(body) && body.split("\n").filter(Boolean).length <= 4, body);
  await page.evaluate(() => { const f = document.querySelector("#optionsDialog [data-version-footer]"); f.scrollIntoView({ block: "end" }); }); await sleep(200);
  await page.screenshot({ path: A.TMP + "/v42-settings-footer.png" });
  await page.evaluate(() => document.querySelectorAll("dialog[open]").forEach(d => d.close())); await sleep(200);
  r = await page.evaluate(() => { const f = document.querySelector("#menuDrawer [data-version-footer]"); return f && [...f.querySelectorAll("p")].map(x => x.textContent.trim()).join(" "); });
  ok("menu has the same footer", r === "Version 43 Report a problem", r);
  // Updated toast once, after an older version was seen
  await page.evaluate(() => localStorage.setItem("higherSelf.seenVersion", "38")); await A.lock(page);
  await A.unlock(page, "Guillermo", "gui-pass-1"); await sleep(700);
  r = await page.evaluate(() => ({ toast: (document.getElementById("toast") || {}).textContent || "", seen: localStorage.getItem("higherSelf.seenVersion") }));
  ok("after an update: 'Updated to v43' toast", /Updated to v43/.test(r.toast) && r.seen === "43", r);
  await sleep(4500); await A.lock(page); await A.unlock(page, "Guillermo", "gui-pass-1"); await sleep(700);
  ok("...shown only once", await page.evaluate(() => { const t = document.getElementById("toast"); return !t || t.hidden || !/Updated to v43/.test(t.textContent); }));
  // a11y
  r = await page.evaluate(() => ({ main: document.querySelectorAll("main").length, mainId: (document.querySelector("main") || {}).id,
    tabs: [...document.querySelectorAll('[role="tab"]')].map(t => [t.getAttribute("aria-selected"), t.hasAttribute("aria-pressed")]) }));
  ok("one <main> landmark (the app root)", r.main === 1 && r.mainId === "appRoot", r);
  ok("day tabs use aria-selected (one true), not aria-pressed", r.tabs.length === 7 && r.tabs.filter(t => t[0] === "true").length === 1 && r.tabs.every(t => (t[0] === "true" || t[0] === "false") && !t[1]), r.tabs);
  r = await page.evaluate(() => ["weekPrev", "weekNext", "pieDayPrev", "pieDayNext"].map(id => { const b = document.getElementById(id); const q = b && b.getBoundingClientRect(); return [id, q && Math.round(q.width), q && Math.round(q.height)]; }));
  ok("week and day arrows are at least 44×44", r.every(x => x[1] >= 44 && x[2] >= 44), r);
  await page.evaluate(() => { applyTheme("dawn"); }); await sleep(300);
  r = await page.evaluate(() => { const cs = getComputedStyle(document.body); const card = document.querySelector(".card") || document.body;
    const bg = getComputedStyle(document.body).backgroundColor, cbg = getComputedStyle(card).backgroundColor;
    const mute = document.createElement("span"); mute.style.color = "var(--muted)"; document.body.appendChild(mute); const m = getComputedStyle(mute).color; mute.remove();
    const k = document.querySelector(".coach .kicker"); return { bg, cbg, muted: m, kicker: k && getComputedStyle(k).color }; });
  ok("Dawn: muted text ≥4.5:1 on the page and on cards", ratio(r.muted, r.bg) >= 4.5 && ratio(r.muted, r.cbg) >= 4.5, [r, ratio(r.muted, r.bg).toFixed(2), ratio(r.muted, r.cbg).toFixed(2)]);
  ok("Dawn: orange COACH kicker ≥4.5:1", r.kicker && ratio(r.kicker, r.cbg) >= 4.5, [r.kicker, r.kicker && ratio(r.kicker, r.cbg).toFixed(2)]);
  // floating logo bar vs COACH
  await page.evaluate(() => window.scrollTo(0, 400)); await sleep(300);
  await page.evaluate(() => { const k = document.querySelector(".coach .kicker"); k.closest(".coach").scrollIntoView({ block: "start" }); }); await sleep(400);
  r = await page.evaluate(() => { const k = document.querySelector(".coach .kicker").getBoundingClientRect(); const logo = document.querySelector(".logo-btn").getBoundingClientRect(); return { kTop: Math.round(k.top), logoBottom: Math.round(logo.bottom), floating: document.body.classList.contains("logo-floating"), y: scrollY }; });
  ok("scrolled to the Coach card, the COACH heading sits below the floating logo bar", r.kTop >= 54 && (r.kTop >= r.logoBottom || !r.floating), r);
  ok("no page errors", errs.length === 0, errs);
  await browser.close(); done();
})().catch(e => { console.error(e); done(); process.exit(1); });
