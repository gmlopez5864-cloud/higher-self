// v36: currency (display only, Intl, encrypted), icon styles (per-file fallback, active style only), coin symbol overlay,
// UI sounds (off by default, never when off), Coach page. Screenshots: /workspace/v36-*.png
const { puppeteer, APP, TMP } = require("./lib/env");
const O = "http://127.0.0.1:8765";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const res = {}; let fails = 0; const info = {};
const ok = (n, c, i) => { res[n] = (c ? "PASS" : "FAIL") + (i !== undefined ? " " + JSON.stringify(i) : ""); if (!c) fails++; };
const MOB = { viewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36" };
const clean = p => p.evaluate(() => { const g = document.getElementById("guideOverlay"); if (g) g.hidden = true; document.getElementById("appRoot").removeAttribute("aria-hidden"); document.querySelectorAll("dialog[open]").forEach(d => d.close()); data.guideSeen = true; save(); });
(async () => {
  const browser = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: "new", args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"] });
  const page = await browser.newPage(); await page.emulate(MOB); await page.setBypassServiceWorker(true); // see every request (and the 404) directly
  // count AudioContext constructions and oscillator starts
  await page.evaluateOnNewDocument(() => {
    window.__acNew = 0; window.__oscStart = 0; const AC = window.AudioContext;
    if (AC) { window.AudioContext = function (...a) { window.__acNew++; return new AC(...a); }; const st = OscillatorNode.prototype.start; OscillatorNode.prototype.start = function (...a) { window.__oscStart++; return st.apply(this, a); }; }
  });
  const errs = []; page.on("pageerror", e => errs.push(e.message)); page.on("console", m => { if (m.type() === "error" && !/favicon|404|Failed to load resource/.test(m.text())) errs.push(m.text()); });
  const reqs = []; page.on("request", r => reqs.push(r.url()));
  // A broken styled file, to prove per-file fallback: ink settings.png answers 404.
  await page.setRequestInterception(true);
  page.on("request", r => { if (/icons\/glyphs128-ink\/settings\.png/.test(r.url())) r.respond({ status: 404, body: "" }); else r.continue(); });
  await page.goto(O + "/", { waitUntil: "networkidle0" });
  await page.evaluate(() => localStorage.clear()); await page.reload({ waitUntil: "networkidle0" });
  await page.waitForSelector("#profileName"); await page.click("#profileName", { clickCount: 3 }); await page.type("#profileName", "Guillermo");
  await page.type("#vaultPass", "guipass1"); await page.type("#vaultPass2", "guipass1"); await page.click("#vaultSetup");
  await page.waitForSelector("#appRoot:not([hidden])"); await sleep(600); await clean(page);
  ok("icon version 43", await page.evaluate(() => ICON_VER === "43"));
  ok("sw cache higher-self-v43", await page.evaluate(async () => /higher-self-v43/.test(await (await fetch("sw.js", { cache: "no-store" })).text())));

  // ---------- currency
  let r = await page.evaluate(() => ({ cur: data.currency, a: moneyPlain(1234.5), b: moneyFmt(-20), c: moneyFmt(15), d: moneyWhole(1999.6), e: moneyPlain(0.1 + 0.2) }));
  ok("default USD, same look as before: $1,234.5 · −$20 · +$15 · $2,000 · $0.3", r.cur === "USD" && r.a === "$1,234.5" && r.b === "−$20" && r.c === "+$15" && r.d === "$2,000" && r.e === "$0.3", r);
  r = await page.evaluate(() => { const out = {}; for (const c of ["PYG", "JPY", "EUR", "GBP", "BRL", "INR", "MXN", "CAD", "CHF", "KRW"]) { data.currency = c; out[c] = [moneyPlain(1234.56), moneyPlain(50000), moneyFmt(-7.5)]; } data.currency = "USD"; return out; });
  info.formats = r;
  ok("PYG has 0 decimals with ₲: ₲1,235 · ₲50,000 · −₲8", JSON.stringify(r.PYG) === JSON.stringify(["₲1,235", "₲50,000", "−₲8"]), r.PYG);
  ok("JPY has 0 decimals with ¥", JSON.stringify(r.JPY) === JSON.stringify(["¥1,235", "¥50,000", "−¥8"]), r.JPY);
  ok("EUR/GBP/BRL/INR keep 2 decimals with their symbols", r.EUR[0] === "€1,234.56" && r.GBP[0] === "£1,234.56" && r.BRL[0] === "R$1,234.56" && r.INR[0] === "₹1,234.56" && r.EUR[2] === "−€7.5", r);
  ok("MXN, CAD and CHF are told apart (MX$, CA$, CHF); KRW whole won", r.MXN[0] === "MX$1,234.56" && r.CAD[0] === "CA$1,234.56" && /^CHF\s?1,234.56$/.test(r.CHF[0]) && r.KRW[0] === "₩1,235", r);
  ok("currency list has at least 30 currencies incl. the requested ones", await page.evaluate(() => CURRENCIES.length >= 30 && ["USD", "PYG", "EUR", "MXN", "GBP", "JPY", "CAD", "BRL", "ARS", "INR"].every(c => CURRENCY_BY[c])));
  // money fixtures
  await page.evaluate(() => {
    const [chk] = data.accounts; chk.openingBalance = 2500000;
    data.money.push({ id: "e1", type: "expense", amount: 85000, accountId: chk.id, category: "groceries", label: "", date: TODAY, goalId: "" },
      { id: "i1", type: "income", amount: 3200000, accountId: chk.id, category: "paycheck", label: "", date: TODAY, goalId: "" });
    data.debts.push({ id: "visa", name: "Visa", balance: 1500000, apr: 24, mode: "fixed", payment: 300000, pct: 1, extra: 0, payFrom: chk.id, dueDay: Number(TODAY.slice(8, 10)) % 28 + 1, billRepeatId: "", billConfirmed: true });
    data.goals.push({ id: "gs", area: "personal", title: "Trip fund", start: 0, current: 400000, target: 2000000, unit: "$", unitCustom: "", direction: "up", incomeCounts: false, created: shift(TODAY, -20), touched: shift(TODAY, -10) });
    data.repeats.push({ id: "rent", freq: "month", start: TODAY, day: Number(TODAY.slice(8, 10)), type: "expense", amount: 1800000, accountId: chk.id, category: "rent-or-mortgage", label: "Rent", goalId: "", debtId: "", applyDebt: true, lastPosted: "", active: true, debtAuto: false, end: "" });
    syncDebtBills(); save(); renderDerived();
  });
  // coach copy: ${amount} placeholders take the whole formatted amount
  r = await page.evaluate(() => { const out = {}; for (const c of ["USD", "PYG", "EUR"]) { data.currency = c; out[c] = [fillCopy(COACH_COPY.billSoon, { bill: "Rent", day: "today", amount: amt(50000), account: "Checking" }), fillCopy(COACH_COPY.targetReached, { account: "Trip", target: moneyWhole(2000000) }), fillCopy(COACH_COPY.debtPaid, { debt: "Visa", payment: 300000, next: "Car" })]; } data.currency = "USD"; return out; });
  ok("coach copy: USD reads as before ('$50,000 from Checking')", r.USD[0] === "Rent is due today, $50,000 from Checking." && r.USD[1] === "Trip reached $2,000,000. You set it, you kept at it.", r.USD);
  ok("coach copy in PYG/EUR: no doubled symbols ('₲50,000', '€50,000')", r.PYG[0] === "Rent is due today, ₲50,000 from Checking." && r.EUR[0] === "Rent is due today, €50,000 from Checking." && r.PYG[2].includes("Its ₲300,000 can go") && ![...r.PYG, ...r.EUR].some(t => /\$[₲€]|[₲€]\$|\$\$|\$\{/.test(t)), r);
  // rendered screens: no doubled / stray symbols
  const DOUBLED = /\$\s?[₲€]|[₲€]\s?\$|₲₲|€€|\$\$|\$\{/;
  for (const c of ["PYG", "EUR"]) {
    r = await page.evaluate(async c => {
      setCurrency(c); openScreen("money"); renderDerived(); await new Promise(r => setTimeout(r, 200));
      const money = document.getElementById("moneySection").innerText;
      openScreen("home"); await new Promise(r => setTimeout(r, 300)); renderCoachNotes();
      const coach = document.getElementById("coachNotes").innerText;
      openScreen("goals"); await new Promise(r => setTimeout(r, 200)); const goals = document.getElementById("goalsPanel").innerText; openScreen("home"); await new Promise(r => setTimeout(r, 300));
      return { money: money.slice(0, 4000), coach, goals, sym: curSymbol() };
    }, c);
    const all = r.money + "\n" + r.coach + "\n" + r.goals;
    ok(`${c}: money, coach and goals screens show ${r.sym} and no doubled symbols or $ amounts`, all.includes(r.sym) && !DOUBLED.test(all) && !/\$\s?\d/.test(all), { bad: (all.match(/.{0,20}(\$\s?[₲€]|[₲€]\s?\$|\$\s?\d).{0,20}/g) || []).slice(0, 5), sym: r.sym });
  }
  r = await page.evaluate(() => { setCurrency("PYG"); return { step: document.getElementById("moneyAmt").step, unit: document.getElementById("goalUnitMoney").textContent, floor: document.querySelector("[data-money-amt]").textContent }; });
  ok("PYG: money inputs step 1, goal unit shows ₲, '$25 floor' hint shows ₲25", r.step === "1" && r.unit === "₲" && r.floor === "₲25", r);
  // settings picker: search, pick, persists encrypted
  await page.evaluate(() => { setCurrency("USD"); openSettings(); }); await sleep(400);
  r = await page.evaluate(() => ({ label: document.getElementById("curTitle").innerText, hint: document.getElementById("curHint").innerText, n: document.querySelectorAll("#curList option").length, first: document.querySelector("#curList option").textContent }));
  ok("Settings: 'Currency' with the hint, list shows symbol + name ('$ US dollar')", r.label === "Currency" && /^Pick the money you use\. Amounts will show in it everywhere\./.test(r.hint) && /convert/.test(r.hint) && r.n >= 30 && r.first === "$ US dollar", r);
  await page.type("#curSearch", "guarani"); await sleep(150);
  r = await page.evaluate(() => [...document.querySelectorAll("#curList option")].map(o => o.textContent));
  ok("search 'guarani' (no accent) finds '₲ Paraguayan guaraní'", r.length === 1 && r[0] === "₲ Paraguayan guaraní", r);
  await page.evaluate(() => { document.getElementById("curSearch").value = ""; renderCurrencyList(); document.getElementById("curSearch").value = "guar"; renderCurrencyList(); }); await sleep(100);
  await page.evaluate(() => { const l = document.getElementById("curList"); l.value = "PYG"; l.dispatchEvent(new Event("change")); }); await sleep(200);
  ok("picking PYG stores it and updates the 'Now' line", await page.evaluate(() => data.currency === "PYG" && /Now: ₲ Paraguayan guaraní \(PYG\) · e\.g\. ₲1,235/.test(document.getElementById("curNow").textContent)));
  await page.evaluate(() => { document.getElementById("curSearch").value = ""; renderCurrencyList(); document.getElementById("currencyPanel").scrollIntoView({ block: "start" }); }); await sleep(250);
  await page.screenshot({ path: TMP + "/v36-settings-currency.png" });
  ok("currency is not in plaintext storage (encrypted with the rest)", await page.evaluate(() => Object.keys(localStorage).every(k => !/"currency"|PYG/.test(localStorage.getItem(k) || ""))));
  await page.evaluate(() => document.getElementById("optionsClose").click());
  // money screenshots
  for (const c of ["USD", "PYG"]) {
    await page.evaluate(c => { setCurrency(c); openScreen("money"); renderDerived(); window.scrollTo(0, 0); }, c); await sleep(500);
    await page.screenshot({ path: `${TMP}/v36-money-${c.toLowerCase()}.png` });
  }
  // home money tile coin
  await page.evaluate(() => { setCurrency("PYG"); openScreen("home"); }); await sleep(600);
  r = await page.evaluate(() => { const c = document.querySelector('[data-tile="money"] .coin-glyph'); if (!c) return null; const s = c.querySelector(".coin-sym"), b = s.querySelector("b"), img = c.querySelector("img"); const W = c.clientWidth, sr = s.getBoundingClientRect(), cr = c.getBoundingClientRect(), br = b.getBoundingClientRect(); return { sym: b.textContent, src: img.getAttribute("src"), w: img.naturalWidth, cx: (sr.left + sr.width / 2 - cr.left) / W, cy: (sr.top + sr.height / 2 - cr.top) / W, d: sr.width / W, bw: br.width / sr.width }; });
  ok("home Money tile: blank coin with ₲ centred in its 188px circle", r && r.sym === "₲" && /icons\/glyphs128\/home\/money-plain\.png/.test(r.src) && r.w === 128 && Math.abs(r.cx - 0.5) < 0.01 && Math.abs(r.cy - 0.5) < 0.01 && Math.abs(r.d - 188 / 512) < 0.01 && r.bw <= 0.8, r);
  await page.evaluate(() => document.getElementById("homeTiles").scrollIntoView({ block: "center" })); await sleep(300);
  await page.evaluate(() => document.querySelector('#homeTiles [data-tile="money"]').scrollIntoView({ block: "center" })); await sleep(400);
  info.tileRect = await page.evaluate(() => { const x = document.querySelector('#homeTiles [data-tile="money"]').getBoundingClientRect(); return [x.left, x.top, x.width, x.height]; });
  await page.screenshot({ path: TMP + "/v36-home-pyg-full.png" });
  r = await page.evaluate(async () => { const out = {}; for (const c of ["BRL", "CHF", "AED"]) { setCurrency(c); await new Promise(r => setTimeout(r, 120)); const s = document.querySelector('[data-tile="money"] .coin-sym'), b = s.querySelector("b"); out[c] = Math.round(b.getBoundingClientRect().width / s.getBoundingClientRect().width * 100) / 100; } setCurrency("PYG"); return out; });
  ok("multi-character symbols (R$, CHF, AED) shrink to fit the circle", Object.values(r).every(v => v > 0.3 && v <= 0.8), r);

  // ---------- icon styles
  r = await page.evaluate(() => ({ g: Object.keys(glyphStyleSets), ink: (glyphStyleSets.ink || []).length, map: ["bold-dojo", "bold-ink-light", "bold-ink-forest", "bold-koi", "bold-small-dogs", "bold-big-dogs", "pic-cats", "bold-birds", "bold-fish", "dawn", "bold-neon-city", "bold-mexico"].map(iconStyleFor).join() }));
  ok("theme-art.json lists classic + ink glyphs", r.g.includes("classic") && r.g.includes("ink") && r.ink >= 20, r);
  ok("default icon styles: ink themes ink, Small/Big Dogs dog, Cats cat, Birds bird, Reef fish, others classic", r.map === "ink,ink,ink,ink,dog,dog,cat,bird,fish,classic,classic,classic", r.map);
  ok("on Dawn no styled icon was requested", !reqs.some(u => /glyphs128-/.test(u)), reqs.filter(u => /glyphs128-/.test(u)).slice(0, 3));
  reqs.length = 0;
  await page.evaluate(() => { applyTheme("bold-ink-light"); openScreen("home"); }); await sleep(900);
  r = await page.evaluate(() => { const src = sel => { const i = document.querySelector(sel); return i ? i.getAttribute("src") : null; }; const im = sel => { const i = document.querySelector(sel); return i ? i.naturalWidth : 0; };
    openScreen("areas");
    const careerImg = document.querySelector('#areas [data-area-id="career"] img');
    openScreen("home");
    return { goals: src('[data-tile="week"] img'), goalsW: im('[data-tile="week"] img'), settings: src('[data-tile="settings"] img'), settingsW: im('[data-tile="settings"] img'), career: careerImg && careerImg.getAttribute("src"), coin: src('[data-tile="money"] img'), tile: getComputedStyle(document.querySelector('[data-tile="week"] img')).backgroundColor }; });
  info.inkLight = r;
  ok("Ink Light: home tiles use the ink set (check-in, coin)", /^icons\/glyphs128-ink\/home\/checkin\.png\?v=43$/.test(r.goals) && r.goalsW === 128 && /glyphs128-ink\/home\/money-plain\.png/.test(r.coin), r);
  ok("per-file fallback: a missing ink file (settings.png, 404) shows the classic icon", /^icons\/glyphs128\/settings\.png\?v=43$/.test(r.settings) && r.settingsW === 128, r);
  ok("icons the ink set doesn't have stay classic (Career = area-career-v2)", /^icons\/glyphs128\/area-career-v2\.png/.test(r.career || ""), r.career);
  ok("Ink Light: cream ink icons sit on a dark tile (contrast ≥ 2.4)", await page.evaluate(() => { const c = cssColorHex(getComputedStyle(document.querySelector('[data-tile="week"] img')).backgroundColor); return contrast("#F6EBD9", c) >= 2.4; }));
  ok("only ink files were requested (no other style)", reqs.filter(u => /glyphs128-/.test(u)).every(u => /glyphs128-ink\//.test(u)) && reqs.some(u => /glyphs128-ink\//.test(u)), reqs.filter(u => /glyphs128-/.test(u)).length);
  r = await page.evaluate(() => { const c = document.querySelector('[data-tile="money"] .coin-glyph'), s = c.querySelector(".coin-sym"), sr = s.getBoundingClientRect(), cr = c.getBoundingClientRect(), W = c.clientWidth; return { cy: (sr.top + sr.height / 2 - cr.top) / W, d: sr.width / W }; });
  ok("ink coin: symbol in the ink circle (centre 253/512, 146px)", Math.abs(r.cy - 253 / 512) < 0.01 && Math.abs(r.d - 146 / 512) < 0.01, r);
  await page.evaluate(() => { document.querySelector(".home-tiles").scrollIntoView({ block: "start" }); window.scrollBy(0, -10); }); await sleep(400);
  await page.screenshot({ path: TMP + "/v36-ink-light-icons.png" });
  await page.evaluate(() => { applyTheme("bold-dojo"); }); await sleep(800);
  await page.evaluate(() => { document.querySelector(".home-tiles").scrollIntoView({ block: "start" }); window.scrollBy(0, -10); }); await sleep(300);
  await page.screenshot({ path: TMP + "/v36-dojo-icons.png" });
  ok("Dojo shows ink too", await page.evaluate(() => /glyphs128-ink\/home\/checkin/.test(document.querySelector('[data-tile="week"] img').getAttribute("src"))));
  await page.evaluate(() => applyTheme("dawn")); await sleep(500);
  ok("back to Dawn: classic icons again", await page.evaluate(() => /^icons\/glyphs128\/home\/checkin\.png/.test(document.querySelector('[data-tile="week"] img').getAttribute("src"))));
  // settings icon style
  await page.evaluate(() => { applyTheme("bold-koi"); openSettings(); }); await sleep(300);
  r = await page.evaluate(() => ({ t: document.getElementById("iconStyleTitle").innerText, now: document.getElementById("iconStyleNow").innerText, sel: !document.getElementById("iconStyleWrap").hidden }));
  ok("Settings (Koi): 'Icon style' Ink · 'Matches this theme. Change it in a custom theme.'", r.t === "Icon style" && /^Ink\s+Matches this theme\. Change it in a custom theme\.$/.test(r.now) && !r.sel, r);
  await page.evaluate(() => document.getElementById("iconStylePanel").scrollIntoView({ block: "start" })); await sleep(200);
  await page.screenshot({ path: TMP + "/v36-settings-iconstyle.png" });
  await page.evaluate(() => document.getElementById("optionsClose").click());
  r = await page.evaluate(() => { loadCustomEditor(null); return [...document.getElementById("ctIcons").options].map(o => o.text).join(); });
  ok("custom theme editor offers Classic, Ink, Dog, Cat, Bird, Fish, Man, Woman", r === "Classic,Ink,Dog,Cat,Bird,Fish,Man,Woman", r);
  r = await page.evaluate(async () => {
    loadCustomEditor(null); document.getElementById("ctName").value = "My ink"; document.getElementById("ctIcons").value = "ink"; document.getElementById("ctSave").click();
    await new Promise(r => setTimeout(r, 500)); document.getElementById("themesDialog").close && document.getElementById("themesDialog").open && document.getElementById("themesDialog").close();
    const id = data.theme, t = data.customThemes.find(x => x.id === id);
    const a = { icons: t && t.icons, style: iconStyleFor(), goals: document.querySelector('[data-tile="journal"] img').getAttribute("src") };
    openSettings(); await new Promise(r => setTimeout(r, 200));
    a.sel = !document.getElementById("iconStyleWrap").hidden; a.hint = document.getElementById("iconStyleHint").innerText; a.val = document.getElementById("iconStyleSel").value;
    const s = document.getElementById("iconStyleSel"); s.value = "dog"; s.dispatchEvent(new Event("change")); a.after = t.icons; a.style2 = iconStyleFor();
    document.getElementById("optionsClose").click(); return a;
  });
  ok("custom theme with Ink icons uses the ink set; Settings lets it change ('Pick who walks your path.')", r.icons === "ink" && r.style === "ink" && /glyphs128-ink/.test(r.goals) && r.sel && r.hint === "Pick who walks your path." && r.val === "ink" && r.after === "dog" && r.style2 === "dog", r);
  await sleep(500);
  r = await page.evaluate(() => { const g = document.querySelector('[data-tile="journal"] img'); return { src: g.getAttribute("src"), w: g.naturalWidth }; });
  ok("Dog style without a dog file for this tile: classic diary glyph, not a broken icon", /^icons\/glyphs128\/diary\.png/.test(r.src) && r.w === 128, r);
  await page.evaluate(() => applyTheme("dawn")); await sleep(300);

  // ---------- sounds
  r = await page.evaluate(() => ({ on: data.sounds, box: (openSettings(), document.getElementById("optSounds").checked), hint: document.getElementById("optSounds").closest(".subpanel").querySelector(".hint").innerText }));
  await page.evaluate(() => document.getElementById("optionsClose").click());
  ok("Sounds: off by default, hint 'Soft clicks when you tap.'", r.on === false && r.box === false && r.hint === "Soft clicks when you tap.", r);
  await page.evaluate(() => { window.__acNew = 0; window.__oscStart = 0; window.__hsSounds = 0; });
  for (const sel of ['[data-tile="journal"]', "#screenBack", '[data-tile="week"]', "#screenBack"]) { await page.click(sel).catch(() => {}); await sleep(150); }
  await page.evaluate(() => { openScreen("home"); });
  r = await page.evaluate(() => ({ played: window.__hsSounds, ctx: window.__acNew, osc: window.__oscStart }));
  ok("with Sounds off, taps play nothing (no AudioContext, no oscillator)", r.played === 0 && r.ctx === 0 && r.osc === 0, r);
  await page.evaluate(() => { openSettings(); const b = document.getElementById("optSounds"); b.click(); document.getElementById("optionsClose").click(); }); await sleep(200);
  await page.evaluate(() => { window.__hsSounds = 0; });
  await page.click('[data-tile="journal"]'); await sleep(150); await page.click("#screenBack"); await sleep(150);
  r = await page.evaluate(() => ({ on: data.sounds, played: window.__hsSounds, fam: ["dawn", "bold-dojo", "bold-neon-city", "bold-retro-arcade", "bold-koi"].map(soundFamily).join() }));
  ok("Sounds on: taps play; family variants click / wood / blip", r.on === true && r.played >= 2 && r.fam === "click,wood,blip,blip,wood", r);
  await page.evaluate(() => { data.sounds = false; save(); window.__hsSounds = 0; window.__oscStart = 0; });
  await page.click('[data-tile="journal"]'); await sleep(150); await page.click("#screenBack"); await sleep(150);
  ok("turned off again: silent", await page.evaluate(() => window.__hsSounds === 0 && window.__oscStart === 0));

  // ---------- Coach page
  const D = await page.evaluate(() => {
    const p1 = { id: "pw", name: "Writer", created: shift(TODAY, -40) }, p2 = { id: "pr", name: "Runner", created: shift(TODAY, -40) }, p3 = { id: "pm", name: "Musician", created: shift(TODAY, -40) };
    [p1, p2, p3].forEach(p => data.paths.push(Object.assign({ icon: "icons/paths/writer.jpg", active: true, archived: false, steps: [] }, p)));
    data.pathLogs = (data.pathLogs || []).concat([{ id: "l1", pathId: "pw", date: shift(TODAY, -9), rating: "good", pulls: [], steered: [], logged: true }, { id: "l2", pathId: "pr", date: shift(TODAY, -12), rating: "good", pulls: [], steered: [], logged: true }, { id: "l3", pathId: "pm", date: shift(TODAY, -1), rating: "good", pulls: [], steered: [], logged: true }]);
    data.tasks = data.tasks.filter(t => false);
    const T = (id, title, late, area) => ({ id, area: area || "personal", title, hours: 0.5, status: "todo", date: shift(TODAY, -late), notes: "", repeat: "", pathLogId: "", reminder: null, dropped: false });
    data.tasks.push(T("t1", "Practice a skill", 1), T("t2", "Call Mom", 2, "social"), T("t3", "Clean the garage", 5, "time"), T("t4", "Read 20 pages", 0), T("t5", "Old one", 4), T("t6", "Older", 6), T("t7", "Oldest", 8), T("t8", "Way old", 40));
    data.goals.forEach(g => { g.paused = false; });
    save(); renderDerived(); openScreen("home"); return true;
  });
  await sleep(400);
  ok("home Coach box has 'Open Coach'", await page.evaluate(() => !!document.querySelector("#coachNotes #openCoachPage")));
  await page.click("#openCoachPage"); await sleep(500);
  r = await page.evaluate(() => { const el = document.getElementById("coachPage"); const sec = [...el.querySelectorAll("[data-cp-sec]")].map(s => s.dataset.cpSec); const items = id => [...el.querySelectorAll('[data-cp-sec="' + id + '"] .cp-item')].map(i => i.innerText.replace(/\s+/g, " ").trim());
    return { screen: currentScreen, title: document.getElementById("coachPageTitle").textContent, sub: el.querySelector(".cp-sub").innerText, sec, paths: items("paths"), today: items("today"), undone: items("undone"), goals: items("goals"), undoneSub: (el.querySelector('[data-cp-sec="undone"] .hint') || {}).innerText, more: [...el.querySelectorAll("[data-cp-more]")].map(b => b.dataset.cpMore + ":" + b.innerText) }; });
  info.coach = r;
  ok("Coach page from the home box: title, subtitle", r.screen === "coach" && r.title === "Coach" && r.sub === "Everything waiting on you, longest-waiting first.", r);
  ok("Coach header uses Pablo's coach icon (scaled to fill the width); Undone uses coach/undone.png", await page.evaluate(() => { const h = document.querySelector("#coachPage .cp-portrait.wide img"), u = document.querySelector('[data-cp-sec="undone"] h3 img'); return !!h && /icons\/glyphs128\/home\/coach\.png/.test(h.getAttribute("src")) && h.naturalWidth === 128 && getComputedStyle(h).transform !== "none" && /icons\/glyphs128\/coach\/undone\.png/.test(u.getAttribute("src")) && u.naturalWidth === 128; }));
  ok("sections in order Paths, Goals, Today, Undone", r.sec.join() === "paths,goals,today,undone", r.sec);
  ok("Paths first, quietest first: Runner (12 days) leads with the final copy", r.paths[0].startsWith("You're walking as a Runner, but nothing's been logged in 12 days. What's one move today?") && /Log it Not today$/.test(r.paths[0]) && r.paths[1].startsWith("You're walking as a Writer, but nothing's been logged in 9 days.") && r.paths[2].startsWith("Musician: logged yesterday."), r.paths);
  ok("Today: 'Last reminder: did you call Mom?' (day 2) then 'Did you practice a skill yesterday?' (day 1), then today's task", r.today[0].startsWith("Last reminder: did you call Mom?") && /Done Not today$/.test(r.today[0]) && r.today[1].startsWith("Did you practice a skill yesterday?") && r.today[2].startsWith("Read 20 pages"), r.today);
  ok("Undone: title, subtitle, oldest first, 'Asked twice', Done / Drop it, no put-off counter; >30 days left out; top 3 + See all", r.undoneSub === "Tasks you didn't mark. Tap any you did." && r.undone.length === 3 && r.undone[0].startsWith("Oldest") && r.undone.every(t => /Asked twice\. No more reminders\. Done Drop it$/.test(t) && !/Put off|Not today/.test(t)) && r.more.includes("undone:See all (4)") && !r.undone.join().includes("Way old"), r);
  ok("Goals: each goal with progress and tied tasks", r.goals.some(g => g.startsWith("Trip fund") && /20%/.test(g) && /Update$/.test(g)), r.goals);
  ok("no task mentions on day 3+ outside Undone, and no 'after three' prompt", !r.today.join().includes("garage") && !JSON.stringify(r).includes("put this off"), r.today);
  await page.evaluate(() => document.querySelector('[data-cp-more="undone"]').click()); await sleep(150);
  ok("See all shows all 4 undone", await page.evaluate(() => document.querySelectorAll('[data-cp-sec="undone"] .cp-item').length === 4 && document.querySelector('[data-cp-more="undone"]').innerText === "Show less"));
  // Drop it
  await page.evaluate(() => document.querySelector('[data-cp-item="cundone:t7"] [data-cp-act="drop"]').click()); await sleep(250);
  r = await page.evaluate(() => ({ t: data.tasks.find(x => x.id === "t7"), h: data.coachHistory.slice(-1)[0], toast: (document.querySelector(".toast") || {}).innerText || "", still: !!document.querySelector('[data-cp-item="cundone:t7"]') }));
  ok("Drop it: 'Dropped. That was your call.', history says dropped (not missed), item leaves", r.t.dropped === true && r.h.outcome === "dropped" && r.h.taskId === "t7" && /Dropped\. That was your call\./.test(r.toast) && !r.still, r);
  await page.evaluate(() => document.querySelector('[data-cp-item="cundone:t6"] [data-cp-act="done"]').click()); await sleep(250);
  ok("Done on an undone task marks it done and records it", await page.evaluate(() => data.tasks.find(x => x.id === "t6").status === "done" && data.coachHistory.slice(-1)[0].outcome === "done"));
  // Not today on a path counts
  await page.evaluate(() => document.querySelector('[data-cp-item="cpath:pr"] [data-cp-act="pathNot"]').click()); await sleep(200);
  r = await page.evaluate(() => ({ n: data.coachPage.pathNotToday.pr, shown: !!document.querySelector('[data-cp-item="cpath:pr"]') }));
  ok("path Not today: hidden for today, counter 1", r.n.n === 1 && !r.shown, r);
  r = await page.evaluate(() => { data.coachPage.snoozed = { date: "", keys: [] }; data.coachPage.pathNotToday.pr = { n: 2, date: shift(TODAY, -1) }; renderCoachPage(); return document.querySelector('[data-cp-item="cpath:pr"]').innerText; });
  ok("next day the path shows 'Not today, 2 times.'", /Not today, 2 times\./.test(r), r);
  await page.evaluate(() => document.querySelector('[data-cp-item="cask:t2:2"] [data-cp-act="snooze"]').click()); await sleep(150);
  ok("task Not today hides it for today only", await page.evaluate(() => !document.querySelector('[data-cp-item="cask:t2:2"]') && data.tasks.find(x => x.id === "t2").status === "todo"));
  await page.evaluate(() => { data.coachPage.snoozed = { date: "", keys: [] }; renderCoachPage(); window.scrollTo(0, 0); document.getElementById("toast").hidden = true; }); await sleep(300);
  await page.screenshot({ path: TMP + "/v36-coach-page.png", fullPage: true });
  await page.evaluate(() => applyTheme("bold-ink-light")); await sleep(500);
  ok("Ink Light: Coach page icons come from the ink set", await page.evaluate(() => /glyphs128-ink\/home\/coach\.png/.test(document.querySelector("#coachPage .cp-portrait img").getAttribute("src")) && /glyphs128-ink\/coach\/undone\.png/.test(document.querySelector('[data-cp-sec="undone"] h3 img').getAttribute("src"))));
  await page.evaluate(() => { window.scrollTo(0, 0); document.getElementById("toast").hidden = true; }); await sleep(300);
  await page.screenshot({ path: TMP + "/v36-coach-page-ink-light.png", fullPage: true });
  await page.evaluate(() => applyTheme("dawn")); await sleep(300);
  r = await page.evaluate(() => { data.tasks = []; data.paths.forEach(p => { p.archived = true; }); data.goals.forEach(g => { g.paused = true; }); renderCoachPage(); return document.getElementById("coachPage").innerText; });
  ok("empty Coach: 'Nothing waiting on you today.'", /Nothing waiting on you today\./.test(r), r.slice(0, 200));
  await page.screenshot({ path: TMP + "/v36-coach-empty.png" });
  ok("no overflow at 390px", await page.evaluate(() => document.documentElement.scrollWidth <= 391));
  ok("no page errors", errs.length === 0, errs);
  await browser.close();
  console.log(JSON.stringify(res, null, 1)); console.log("INFO " + JSON.stringify(info)); console.log("CHECKS " + Object.keys(res).length + " FAILS " + fails);
})().catch(e => { console.error(e); console.log(JSON.stringify(res, null, 1)); process.exit(1); });
