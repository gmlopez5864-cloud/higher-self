// v29: no money duplicates; edit a posted occurrence (Planned / Actual); Log payment edits this month's payment;
// duplicate review on unlock; home = greeting, pie (hours left in centre), coach, tiles. Phone width 390px.
const { puppeteer, APP, TMP } = require("./lib/env");
const O = "http://127.0.0.1:8765";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const res = {}; let fails = 0; const info = {};
const ok = (n, c, i) => { res[n] = (c ? "PASS" : "FAIL") + (i !== undefined ? " " + JSON.stringify(i) : ""); if (!c) fails++; };
const setup = async (p, name, pass) => { await p.waitForSelector("#profileName"); await p.click("#profileName", { clickCount: 3 }); await p.type("#profileName", name); await p.type("#vaultPass", pass); await p.type("#vaultPass2", pass); await p.click("#vaultSetup"); await p.waitForSelector("#appRoot:not([hidden])"); };
const unlock = async (p, name, pass) => { await p.evaluate(n => [...document.querySelectorAll("[data-profile]")].find(b => b.innerText.trim() === n).click(), name); await p.waitForSelector("#vaultPass"); await p.type("#vaultPass", pass); await p.click("#vaultUnlock"); await p.waitForSelector("#appRoot:not([hidden])"); await sleep(300); };
const clean = p => p.evaluate(() => { const g = document.getElementById("guideOverlay"); if (g) g.hidden = true; document.getElementById("appRoot").removeAttribute("aria-hidden"); document.querySelectorAll("dialog[open]").forEach(d => d.close()); });
// invariants after every action
const inv = p => p.evaluate(() => {
  const seen = new Set(), dupOcc = [];
  data.money.forEach(m => { if (m.repeatId && m.occ) { const k = m.repeatId + "|" + m.occ; if (seen.has(k)) dupOcc.push(k); seen.add(k); } });
  const dm = {}; data.money.forEach(m => { if (m.type === "expense" && m.debtId && !m.extraPayment) { const k = m.debtId + "|" + m.date.slice(0, 7); dm[k] = (dm[k] || 0) + 1; } });
  const dupDebt = Object.keys(dm).filter(k => dm[k] > 1);
  return { dupOcc, dupDebt, ok: !dupOcc.length && !dupDebt.length };
});
const check = async (p, label) => { const r = await inv(p); ok("no duplicates after: " + label, r.ok, r); return r; };
const choice = async (p, which) => { await p.waitForSelector("#choiceDialog[open]", { timeout: 3000 }); await sleep(100); await p.click(which === "a" ? "#choiceA" : "#choiceB"); await sleep(250); };
// fill the money sheet (already open) for an expense
const fillExpense = (p, o) => p.evaluate(o => {
  if (o.type) document.querySelector('#moneyTypeRow [data-mtype="' + o.type + '"]').click();
  if (o.cat) { document.getElementById("moneyExpense").value = o.cat; renderCatGrid(); syncMoneyOther(); syncMoneyDebt(); }
  if (o.amt != null) document.getElementById("moneyAmt").value = String(o.amt);
  if (o.date) { const d = document.getElementById("moneyDate"); d.value = o.date; d.onchange(); }
  if (o.repeat) { const r = document.getElementById("moneyRepeat"); r.value = o.repeat; r.onchange(); }
  if (o.day != null) { const d = document.getElementById("moneyRepeatDay"); d.value = String(o.day); d.dataset.touched = "1"; }
  if (o.start) document.getElementById("moneyRepeatStart").value = o.start;
}, o);
(async () => {
  const browser = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: "new", args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.evaluateOnNewDocument(() => {
    const fixed = Date.parse("2026-10-21T12:00:00-07:00");
    const Real = Date;
    function Fake(...args) { if (!(this instanceof Fake)) return Real(...args); if (args.length === 0) return new Real(fixed); return new Real(...args); }
    Fake.prototype = Real.prototype; Fake.now = () => fixed; Fake.parse = Real.parse; Fake.UTC = Real.UTC; window.Date = Fake;
  });
  await page.emulate({ viewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36" });
  const errs = []; page.on("pageerror", e => errs.push(e.message)); page.on("console", m => { if (m.type() === "error" && !/favicon|404/.test(m.text())) errs.push(m.text()); });
  await page.goto(O + "/", { waitUntil: "networkidle0" });
  await page.evaluate(() => localStorage.clear()); await page.reload({ waitUntil: "networkidle0" });
  await setup(page, "Guillermo", "guipass1"); await sleep(300); await clean(page);
  const T = await page.evaluate(() => { data.guideSeen = true; save(); return { today: iso(new Date()), ver: ICON_VER }; });
  const today = T.today, ym = today.slice(0, 7);
  const D = n => { const d = new Date(today + "T12:00:00"); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
  ok("icon version 43", T.ver === "43", T);
  ok("no pre-cleanup restore item on a fresh vault", await page.evaluate(() => document.getElementById("btnPreCleanup").hidden && !data.preCleanupBackup));

  // ---------- HOME
  await page.evaluate(() => { data.tasks.push({ id: "tw", area: "career", title: "Go to work", hours: 8, status: "done", date: TODAY, notes: "", repeat: "" }); save(); renderDerived(); window.scrollTo(0, 0); });
  await sleep(200);
  let r = await page.evaluate(() => {
    const top = id => { const e = document.getElementById(id); return e && e.offsetParent !== null ? Math.round(e.getBoundingClientRect().top + scrollY) : -1; };
    const t = [...document.querySelectorAll("#pie text")].map(x => x.textContent);
    return { greet: top("homeGreet"), pie: top("timeCard"), coach: top("coachNotes"), tiles: top("homeTiles"), greetText: document.getElementById("homeGreet").innerText, title: document.getElementById("pieTitle").innerText, centre: t, coachHasGreet: !!document.querySelector("#coachNotes .greet"), overflow: document.documentElement.scrollWidth > 390, statsShown: document.querySelector(".stat-row").offsetParent !== null };
  });
  info.home = r;
  ok("home order: greeting line, then pie, then coach card, then tiles", r.greet >= 0 && r.greet < r.pie && r.pie < r.coach && r.coach < r.tiles, r);
  ok("one small greeting line with name", /^Good (morning|afternoon|evening), Guillermo\. Here's where things stand\.$/.test(r.greetText.trim()) && !r.coachHasGreet, r);
  ok("pie heading 'Where your time goes'", /Where your time goes/i.test(r.title), r.title);
  ok("pie centre (v42): '16h open' / 'Done 8h'", r.centre.join("|") === "16h open|Done 8h", r.centre);
  ok("home: no sideways overflow at 390px, stat row hidden", !r.overflow && !r.statsShown, r);
  await page.screenshot({ path: TMP + "/t29-home.png" });

  // ---------- COACH CARD: sleep question, stale goals, first move; Check-in tile; aim text
  r = await page.evaluate(() => {
    const t = document.getElementById("pieNote").innerText;
    return { t, dash: /—|–\)|\(aim –/.test(t), minOnly: /\(aim \d+(\.\d+)?\+\)/.test(t) };
  });
  ok("pie note: no 'aim 2–—' glitch (min-only reads 'aim 2+')", !r.dash && r.minOnly, r.t);
  await page.evaluate(() => {
    data.tasks = data.tasks.filter(t => t.id !== "tw");
    const ago = n => shift(TODAY, -n);
    data.goals.push(
      { id: "gw", area: "personal", title: "Lose weight", start: 200, current: 195, target: 180, unit: "custom", unitCustom: "lbs", direction: "down", incomeCounts: false, accountId: "", linkStart: null, created: ago(30), touched: "", paused: false, deadline: "", progress: [{ id: "p1", date: ago(9), delta: -5, total: 195, note: "", moneyId: "" }] },
      { id: "gr", area: "personal", title: "Read 12 books", start: 0, current: 3, target: 12, unit: "custom", unitCustom: "books", direction: "up", incomeCounts: false, accountId: "", linkStart: null, created: ago(20), touched: "", paused: false, deadline: "", progress: [{ id: "p2", date: ago(8), delta: 1, total: 3, note: "", moneyId: "" }] },
      { id: "gp", area: "personal", title: "Paused one", start: 0, current: 0, target: 5, unit: "custom", unitCustom: "runs", direction: "up", incomeCounts: false, accountId: "", linkStart: null, created: ago(40), touched: "", paused: true, deadline: "", progress: [] },
      { id: "gf", area: "personal", title: "Fresh goal", start: 0, current: 0, target: 5, unit: "custom", unitCustom: "runs", direction: "up", incomeCounts: false, accountId: "", linkStart: null, created: TODAY, touched: "", paused: false, deadline: "", progress: [] },
      { id: "g6", area: "personal", title: "Six days", start: 0, current: 1, target: 5, unit: "custom", unitCustom: "runs", direction: "up", incomeCounts: false, accountId: "", linkStart: null, created: ago(30), touched: "", paused: false, deadline: "", progress: [{ id: "p3", date: ago(6), delta: 1, total: 1, note: "", moneyId: "" }] }
    );
    if (data.days[TODAY]) data.days[TODAY].sleep = null;
    save(); renderDerived(); renderCoachNotes();
  });
  await sleep(150);
  const coachState = () => page.evaluate(() => {
    const el = document.getElementById("coachNotes");
    const kids = [...el.children].map(c => c.classList.contains("coach-sleep") ? "sleep" : c.classList.contains("coach-note") ? "note:" + c.dataset.note : c.className);
    const sl = el.querySelector(".coach-sleep");
    return { kids, notes: [...el.querySelectorAll(".coach-note")].map(n => n.querySelector("p").innerText), sleepText: sl ? sl.innerText.replace(/\s+/g, " ").trim() : "", yes: (document.getElementById("coachSleepYes") || {}).className || "", hasEdit: !!document.getElementById("coachSleepEdit"), firstMove: !!document.getElementById("coachFirstMove"), btns: [...el.querySelectorAll(".coach-note .row-actions button")].map(b => b.innerText) };
  });
  r = await coachState();
  info.coach = r;
  ok("coach: sleep question first, then stale goals, then other notes", r.kids[1] === "sleep" && ["note:goal:gw", "note:goal:gr"].includes(r.kids[2]) && ["note:goal:gw", "note:goal:gr"].includes(r.kids[3]), r.kids);
  ok("sleep question copy + 'Yes' (primary) and 'Edit'", r.sleepText === "Did you get your 8 hours of sleep? Yes Edit" && /primary/.test(r.yes) && r.hasEdit, r);
  ok("stale goal copy '{goal} hasn't moved in {n} days. Where is it now?' + Update", r.notes.includes("Lose weight hasn't moved in 9 days. Where is it now?") && r.notes.includes("Read 12 books hasn't moved in 8 days. Where is it now?") && r.btns.filter(b => b === "Update").length >= 2, r);
  ok("not stale: paused, made today, moved 6 days ago", !r.notes.some(t => /Paused one|Fresh goal|Six days/.test(t) && /hasn't moved/.test(t)), r.notes);
  ok("max 3 notes; the sleep question doesn't count", r.notes.length === 3 && r.kids.filter(k => k === "sleep").length === 1, r);
  ok("coach card sits directly under the pie", await page.evaluate(() => { let n = document.getElementById("timeCard").nextElementSibling; while (n && n.offsetParent === null) n = n.nextElementSibling; return n && n.id === "coachNotes"; }));
  await page.evaluate(() => document.getElementById("coachNotes").scrollIntoView({ block: "start" })); await page.evaluate(() => window.scrollBy(0, -330)); await sleep(150);
  await page.screenshot({ path: TMP + "/t29-coach.png" });
  // Update → quick "where is it now" input
  await page.evaluate(() => document.querySelector('[data-note="goal:gw"] [data-note-act="update"]').click()); await sleep(250);
  r = await page.evaluate(() => ({ open: document.getElementById("progressDialog").open, total: document.querySelector('#progressMode [data-pmode="total"]').getAttribute("aria-pressed"), v: document.getElementById("progressAmount").value }));
  ok("'Update' opens a quick input for the current value (New total, prefilled 195)", r.open && r.total === "true" && r.v === "195", r);
  await page.evaluate(() => { document.getElementById("progressAmount").value = "193"; document.getElementById("progressSave").click(); }); await sleep(250);
  r = await page.evaluate(() => ({ cur: data.goals.find(g => g.id === "gw").current, last: goalLastMoved(data.goals.find(g => g.id === "gw")), notes: [...document.querySelectorAll("#coachNotes .coach-note p")].map(p => p.innerText) }));
  ok("goal updated to 193 today and its nudge is gone", r.cur === 193 && r.last === T.today && !r.notes.some(t => t.startsWith("Lose weight hasn't")), r);
  // Yes → logs target, pie updates, collapses, first move line
  await page.evaluate(() => { window.scrollTo(0, 0); document.getElementById("coachSleepYes").scrollIntoView({ block: "center" }); }); await sleep(100);
  await page.tap("#coachSleepYes"); await sleep(250);
  r = await coachState();
  const pie1 = await page.evaluate(() => ({ sl: data.days[TODAY].sleep, c: [...document.querySelectorAll("#pie text")].map(x => x.textContent).join("|"), ci: document.getElementById("checkinBody").innerText }));
  ok("'Yes' logs 8h to the same sleep data as the check-in", pie1.sl && pie1.sl.hours === 8 && pie1.sl.source === "confirm" && /8h/.test(pie1.ci), pie1);
  ok("pie updates (v42: 16h open · Done 8h)", pie1.c === "16h open|Done 8h", pie1.c);
  ok("collapses to 'Logged 8h of sleep. · Edit' + 'What's your first move today?'", r.sleepText === "Logged 8h of sleep. · Edit What's your first move today?" && r.firstMove, r.sleepText);
  await page.tap("#coachFirstMove"); await sleep(300);
  ok("first move opens Journal, where paths live", await page.evaluate(() => currentScreen === "journal" && getComputedStyle(document.getElementById("pathsPanel")).display !== "none" && !!document.getElementById("pathAddBtn")));
  await page.evaluate(() => { history.back(); }); await sleep(400);
  await page.evaluate(() => { data.tasks.push({ id: "tm", area: "personal", title: "Walk", hours: 0.5, status: "done", date: TODAY, notes: "", repeat: "" }); save(); renderDerived(); });
  r = await coachState();
  ok("first-move line goes once something else is logged today", !r.firstMove && r.sleepText === "Logged 8h of sleep. · Edit", r.sleepText);
  // Edit → existing check-in editor (nothing cleared), short night
  await page.tap("#coachSleepEdit"); await sleep(400);
  r = await page.evaluate(() => ({ scr: currentScreen, title: document.getElementById("screenTitle").innerText, bed: !!document.getElementById("bed"), keep: (document.getElementById("sleepKeep") || {}).innerText, still: data.days[TODAY].sleep && data.days[TODAY].sleep.hours }));
  ok("'Edit' opens the Check-in screen's bedtime/wake editor without clearing", r.scr === "week" && r.title === "Check-in" && r.bed && r.keep === "Keep 8h" && r.still === 8, r);
  await page.evaluate(() => { document.getElementById("bed").value = "01:00"; document.getElementById("wake").value = "06:00"; document.getElementById("saveSleep").click(); }); await sleep(200);
  await page.evaluate(() => openScreen("home")); await sleep(300);
  r = await coachState();
  ok("5h logged → 'Logged 5h of sleep. · Edit' + short-night line", r.sleepText === "Logged 5h of sleep. · Edit Short night. Go easy today, and protect tonight's sleep.", r.sleepText);
  // custom target
  r = await page.evaluate(() => { data.sleepTarget = 7; data.days[TODAY].sleep = null; save(); renderCoachNotes(); const t = document.querySelector(".coach-sleep p").innerText; document.getElementById("coachSleepYes").click(); return { t, h: data.days[TODAY].sleep.hours }; });
  ok("sleep target 7 → 'Did you get your 7 hours of sleep?' and Yes logs 7h", r.t === "Did you get your 7 hours of sleep?" && r.h === 7, r);
  // check-in entry point + glyphs
  r = await page.evaluate(async () => { await new Promise(res => setTimeout(res, 300)); const t = [...document.querySelectorAll("#homeTiles [data-tile]")].find(b => b.dataset.tile === "week"); const img = t && t.querySelector("img"); return { label: t && t.innerText.trim(), src: img && img.getAttribute("src"), w: img && img.naturalWidth, sleepIc: (document.querySelector(".coach-sleep-ic") || {}).naturalWidth }; });
  ok("tile is called 'Check-in' with Pablo's checkin glyph; sleep glyph loads", r.label === "Check-in" && /home\/checkin\.png\?v=43/.test(r.src || "") && r.w > 0 && r.sleepIc > 0, r);
  // paused/created survive a reload
  await sleep(500); await page.reload({ waitUntil: "networkidle0" }); await unlock(page, "Guillermo", "guipass1"); await clean(page);
  r = await page.evaluate(() => ({ p: data.goals.find(g => g.id === "gp").paused, c: data.goals.find(g => g.id === "gw").created, st: data.sleepTarget }));
  ok("goal paused/created and sleep target survive reload", r.p === true && /^\d{4}-/.test(r.c) && r.st === 7, r);
  await page.evaluate(() => { data.goals = data.goals.filter(g => !["gw", "gr", "gp", "gf", "g6"].includes(g.id)); data.tasks = data.tasks.filter(t => t.id !== "tm"); delete data.sleepTarget; if (data.days[TODAY]) data.days[TODAY].sleep = null; save(); renderDerived(); });

  // ---------- DEBT: auto bill already posted, then Log payment must edit it
  r = await page.evaluate(day => {
    const a = data.accounts[0].id;
    data.debts.push({ id: "d1", name: "Visa", balance: 9000, apr: 22, mode: "fixed", payment: 406, pct: 1, extra: 0, payFrom: a, dueDay: day, billRepeatId: "", billConfirmed: true });
    syncDebtBills(); postDueRepeats(); save(); renderDerived();
    return { pays: data.money.filter(m => m.debtId === "d1").map(m => [m.amount, m.date, !!m.repeatId]), bal: data.debts[0].balance, btn: document.querySelector('[data-debt-log="d1"]').innerText };
  }, 5);
  ok("auto bill posted once (Oct 5, $406), debt 8594", r.pays.length === 1 && r.pays[0][0] === 406 && r.bal === 8594, r);
  ok("debt card button reads \"Edit this month's payment\"", r.btn === "Edit this month's payment", r.btn);
  await page.evaluate(() => openScreen("money")); await sleep(200);
  await page.evaluate(() => { const b = document.querySelector('[data-money-tab="debts"]'); if (b) b.click(); }); await sleep(200);
  await page.evaluate(() => document.querySelector('[data-debt-log="d1"]').scrollIntoView({ block: "center" })); await sleep(100);
  await page.tap('[data-debt-log="d1"]'); await sleep(300);
  r = await page.evaluate(() => ({ open: document.getElementById("moneyDialog").open, title: document.getElementById("moneyDialogTitle").innerText, amt: document.getElementById("moneyAmt").value, planned: document.getElementById("moneyPlanned").hidden ? "" : document.getElementById("moneyPlanned").innerText, label: document.getElementById("moneyAmtLabel").innerText, another: !document.getElementById("moneyAddAnother").hidden, editing: editingMoneyId }));
  ok("Log payment opens this month's auto payment as 'Edit payment'", r.open && r.title === "Edit payment" && r.amt === "406" && !!r.editing, r);
  ok("posted occurrence shows 'Planned $406' and 'Actual'", r.planned === "Planned $406" && r.label === "Actual", r);
  ok("'Add another payment' link is offered", r.another, r);
  await page.evaluate(() => { const a = document.getElementById("moneyAmt"); a.value = "380"; }); 
  await page.evaluate(() => document.getElementById("moneyAmt").scrollIntoView({ block: "center" })); await sleep(100);
  await page.screenshot({ path: TMP + "/t29-edit.png" });
  await page.tap("#moneySave"); await sleep(250);
  r = await page.evaluate(() => ({ primary: document.getElementById("choiceA").className.includes("primary"), msg: document.getElementById("choiceMsg").innerText, focus: document.activeElement && document.activeElement.id }));
  ok("prompt kept, 'Just this one' is the default", r.msg === "Change just this one, or this and all future ones?" && r.primary && r.focus === "choiceA", r);
  await choice(page, "a");
  r = await page.evaluate(() => ({ pays: data.money.filter(m => m.debtId === "d1").map(m => m.amount), bal: data.debts[0].balance, pay: data.debts[0].payment, toast: document.getElementById("toast").innerText }));
  ok("edited in place: one payment $380, debt 8620, plan stays $406", r.pays.join() === "380" && r.bal === 8620 && r.pay === 406, r);
  ok("toast 'Edited. The repeat stays at $406.'", r.toast === "Edited. The repeat stays at $406.", r.toast);
  await check(page, "Log payment → edit this month's");
  // Add another payment, on purpose
  await page.tap('[data-debt-log="d1"]'); await sleep(300);
  await page.tap("#moneyAddAnother"); await sleep(300);
  r = await page.evaluate(() => ({ title: document.getElementById("moneyDialogTitle").innerText, editing: editingMoneyId }));
  ok("'Add another payment' opens a new payment", r.title === "Add another payment" && !r.editing, r);
  await page.evaluate(() => { document.getElementById("moneyAmt").value = "100"; }); await page.tap("#moneySave"); await sleep(300);
  r = await page.evaluate(() => ({ pays: data.money.filter(m => m.debtId === "d1").map(m => [m.amount, !!m.extraPayment]), bal: data.debts[0].balance, dlg: document.getElementById("choiceDialog").open }));
  ok("extra payment added (no look-alike prompt), debt 8520", r.pays.length === 2 && r.pays.some(x => x[0] === 100 && x[1]) && r.bal === 8520 && !r.dlg, r);
  await check(page, "Add another payment");
  // ---------- DEBT edits never post a second bill
  r = await page.evaluate(() => {
    const out = [];
    const d = data.debts[0];
    for (const [k, v] of [["dueDay", 25], ["dueDay", 1], ["dueDay", "last"], ["payment", 450], ["dueDay", 15]]) {
      openDebtDialog("d1"); if (k === "dueDay") document.getElementById("debtDueDay").value = String(v); else { document.getElementById("debtPayment").value = String(v); syncDebtForm(); }
      document.getElementById("debtSave").click();
      out.push(data.money.filter(m => m.debtId === "d1").length);
    }
    for (let i = 0; i < 5; i++) postDueRepeats();
    return { counts: out, bal: d.balance, after: data.money.filter(m => m.debtId === "d1").length };
  });
  ok("editing the debt (due day, payment) never adds a bill", r.counts.every(n => n === 2) && r.after === 2 && r.bal === 8520, r);
  await check(page, "edit debt x5 + postDueRepeats x5");
  // Stop from Coming up, then turn the bill back on: no back-fill, no second October bill
  r = await page.evaluate(() => {
    const rule = data.repeats.find(x => x.debtAuto && x.debtId === "d1");
    rule.active = false; data.debts[0].payFrom = ""; rule.lastPosted = "2026-07-05"; // stopped long ago
    openDebtDialog("d1"); document.getElementById("debtPayFrom").value = data.accounts[0].id; syncDebtBillFields(); document.getElementById("debtSave").click();
    for (let i = 0; i < 3; i++) postDueRepeats();
    return { pays: data.money.filter(m => m.debtId === "d1").map(m => m.date), active: rule.active, last: rule.lastPosted };
  });
  ok("re-enabled auto bill: no Aug/Sep back-fill, no second October bill", r.pays.length === 2 && r.pays.every(d => d.startsWith(ym)) && r.active, r);
  await check(page, "stop + re-enable auto bill");
  // Hand-made repeat for the debt stopped → auto bill comes back without back-fill
  r = await page.evaluate(() => {
    const a = data.accounts[0].id;
    data.debts.push({ id: "d2", name: "Car loan", balance: 5000, apr: 6, mode: "fixed", payment: 250, pct: 1, extra: 0, payFrom: a, dueDay: 2, billRepeatId: "", billConfirmed: true });
    data.repeats.push({ id: "rm", freq: "month", start: "2026-06-02", day: 2, type: "expense", amount: 250, accountId: a, category: "car-payment", label: "Car loan", goalId: "", debtId: "d2", applyDebt: true, lastPosted: "2026-07-02", active: true, debtAuto: false });
    syncDebtBills();
    const auto = data.repeats.find(x => x.debtAuto && x.debtId === "d2");
    data.repeats.find(x => x.id === "rm").active = false; // user stopped the manual one in July (manual never posted Aug–Oct)
    if (auto) auto.lastPosted = "2026-06-02";
    syncDebtBills(); postDueRepeats(); postDueRepeats();
    return data.money.filter(m => m.debtId === "d2").map(m => m.date);
  });
  ok("manual repeat stopped → auto bill posts this month only", r.length === 1 && r[0].startsWith(ym), r);
  await check(page, "manual stopped → auto");
  await page.evaluate(() => { document.querySelectorAll("dialog[open]").forEach(d => d.close()); });

  // ---------- GROCERIES $450 monthly (his budget): edit one posted occurrence to $300
  await page.evaluate(() => openMoneyDialog(null)); await sleep(200);
  await fillExpense(page, { type: "expense", cat: "groceries", amt: 450, date: ym + "-01", repeat: "month", day: 1 });
  await page.tap("#moneySave"); await sleep(300);
  r = await page.evaluate(() => ({ g: data.money.filter(m => m.category === "groceries").map(m => [m.amount, m.date, m.occ, m.planned]), rule: data.repeats.filter(x => x.category === "groceries").map(x => [x.amount, x.day, x.lastPosted]) }));
  ok("groceries $450 monthly: one entry this month", r.g.length === 1 && r.g[0][0] === 450 && r.g[0][2] === ym + "-01", r);
  for (let i = 0; i < 3; i++) await page.evaluate(() => postDueRepeats());
  await page.reload({ waitUntil: "networkidle0" }); await unlock(page, "Guillermo", "guipass1"); await clean(page);
  await check(page, "create groceries + reload + postDueRepeats x3");
  await page.evaluate(() => openScreen("money")); await sleep(200);
  r = await page.evaluate(() => document.querySelector("#activityPanel .hint") && document.querySelector("#activityPanel .hint").innerText);
  ok("Recent activity hint 'Tap an entry to change it.'", r === "Tap an entry to change it.", r);
  const gid = await page.evaluate(() => data.money.find(m => m.category === "groceries").id);
  await page.evaluate(id => document.querySelector('[data-money="' + id + '"]').scrollIntoView({ block: "center" }), gid); await sleep(100);
  await page.tap('#moneyList [data-money="' + gid + '"]'); await sleep(300);
  r = await page.evaluate(() => ({ title: document.getElementById("moneyDialogTitle").innerText, planned: document.getElementById("moneyPlanned").innerText, label: document.getElementById("moneyAmtLabel").innerText }));
  ok("tapping the posted groceries opens Edit entry with Planned $450 / Actual", r.title === "Edit entry" && r.planned === "Planned $450" && r.label === "Actual", r);
  await page.evaluate(() => { document.getElementById("moneyAmt").value = "300"; }); await page.tap("#moneySave"); await choice(page, "a");
  r = await page.evaluate(() => ({ g: data.money.filter(m => m.category === "groceries").map(m => m.amount), rule: data.repeats.find(x => x.category === "groceries").amount, toast: document.getElementById("toast").innerText, row: [...document.querySelectorAll("#moneyList .act-row")].map(b => b.innerText.replace(/\s+/g, " ")).find(t => t.startsWith("Groceries")) }));
  ok("just this one: $300 spent, rule stays $450", r.g.join() === "300" && r.rule === 450, r);
  ok("toast 'Edited. The repeat stays at $450.'", r.toast === "Edited. The repeat stays at $450.", r.toast);
  ok("activity row 'Groceries · Planned $450 · Spent $300'", /^Groceries · Planned \$450 · Spent \$300 · /.test(r.row || ""), r.row);
  await check(page, "edit one occurrence");
  // All future: move day 1 → 15 (this month already has one)
  await page.tap('#moneyList [data-money="' + gid + '"]'); await sleep(300);
  await fillExpense(page, { amt: 500, day: 15 }); await page.tap("#moneySave"); await choice(page, "b");
  for (let i = 0; i < 3; i++) await page.evaluate(() => postDueRepeats());
  r = await page.evaluate(() => ({ g: data.money.filter(m => m.category === "groceries").map(m => [m.amount, m.date]), rule: data.repeats.filter(x => x.category === "groceries").map(x => [x.amount, x.day, x.active]) }));
  ok("'All future' with a new day: still one groceries this month, rule $500 on the 15th", r.g.length === 1 && r.rule[0][0] === 500 && r.rule[0][1] === 15, r);
  await check(page, "all future + day change");
  // Edit the rule from Coming up: save unchanged, then change the day
  r = await page.evaluate(async () => {
    const rule = data.repeats.find(x => x.category === "groceries"); const before = rule.start, out = {};
    openRepeatEditor(rule.id); await saveMoneyDialog(); out.unchangedStart = rule.start === before; out.n1 = data.money.filter(m => m.category === "groceries").length;
    openRepeatEditor(rule.id); document.getElementById("moneyRepeatDay").value = "3"; await saveMoneyDialog();
    openRepeatEditor(rule.id); document.getElementById("moneyRepeatDay").value = "28"; await saveMoneyDialog();
    for (let i = 0; i < 4; i++) postDueRepeats();
    out.n2 = data.money.filter(m => m.category === "groceries").length; out.day = rule.day; out.start = rule.start; return out;
  });
  ok("Coming up rule edits: unchanged save keeps schedule, day changes never re-post", r.unchangedStart && r.n1 === 1 && r.n2 === 1 && r.day === 28, r);
  await check(page, "Coming up rule edits");
  // Coming up row links to the posted entry
  await page.evaluate(() => renderDerived()); await sleep(100);
  r = await page.evaluate(() => { const b = [...document.querySelectorAll("#repeatList .rep-posted")].find(x => x.innerText.includes("$300") || x.innerText.includes("$500")); if (!b) return null; b.click(); return { txt: b.innerText, title: document.getElementById("moneyDialogTitle").innerText, editing: editingMoneyId }; });
  ok("Coming up row offers 'Posted … · Edit' → opens the posted entry", r && /^Posted .* · Edit$/.test(r.txt) && r.title === "Edit entry" && r.editing, r);
  await page.evaluate(() => document.getElementById("moneyDialog").close());
  // 2-weeks rule moved to a start in the past: nothing in the past posts
  r = await page.evaluate(async t => {
    const a = data.accounts[0].id;
    const rule = { id: "rw", freq: "week", start: "2026-09-01", day: 1, type: "expense", amount: 20, accountId: a, category: "fun", label: "", goalId: "", debtId: "", applyDebt: true, lastPosted: "", active: true, debtAuto: false };
    data.repeats.push(rule); postDueRepeats(); const n0 = data.money.filter(m => m.repeatId === "rw").length;
    openRepeatEditor("rw"); const f = document.getElementById("moneyRepeat"); f.value = "2weeks"; syncRepeatUI(); document.getElementById("moneyRepeatStart").value = "2026-10-02"; await saveMoneyDialog();
    for (let i = 0; i < 3; i++) postDueRepeats();
    return { n0, n1: data.money.filter(m => m.repeatId === "rw").length, start: rule.start };
  }, today);
  ok("weekly → every 2 weeks from a past start: no extra posts", r.n1 === r.n0 && r.start > today, r);
  await check(page, "2-weeks past start");
  // One-off → repeating: hand-entered Sep/Oct stay the only ones (no back-fill copies)
  r = await page.evaluate(async t => {
    const a = data.accounts[0].id;
    const mk = (id, d) => ({ id, type: "expense", amount: 70, accountId: a, category: "internet", label: "", date: d, goalId: "" });
    data.money.push(mk("i8", "2026-08-10"), mk("i9", "2026-09-10"), mk("i10", "2026-10-10"));
    openMoneyDialog("i8"); const f = document.getElementById("moneyRepeat"); f.value = "month"; f.onchange(); document.getElementById("moneyRepeatDay").value = "10"; await saveMoneyDialog();
    for (let i = 0; i < 3; i++) postDueRepeats();
    return data.money.filter(m => m.category === "internet").map(m => m.date).sort();
  }, today);
  ok("one-off → repeating doesn't copy months already entered", r.join() === "2026-08-10,2026-09-10,2026-10-10", r);
  await check(page, "one-off → repeating");
  // ---------- Look-alike guard on a new entry
  await page.evaluate(() => openMoneyDialog(null)); await sleep(150);
  await fillExpense(page, { type: "expense", cat: "eating-out", amt: 25, date: today }); await page.tap("#moneySave"); await sleep(250);
  await page.evaluate(() => openMoneyDialog(null)); await sleep(150);
  await fillExpense(page, { type: "expense", cat: "eating-out", amt: 31, date: today }); await page.tap("#moneySave"); await sleep(250);
  r = await page.evaluate(() => ({ open: document.getElementById("choiceDialog").open, msg: document.getElementById("choiceMsg").innerText, a: document.getElementById("choiceA").innerText, b: document.getElementById("choiceB").innerText, prim: document.getElementById("choiceA").className }));
  ok("look-alike prompt copy + buttons", r.open && /^This looks like Eating out on .+\. Update that one or add a new entry\?$/.test(r.msg) && r.a === "Update it" && r.b === "Add new" && /primary/.test(r.prim), r);
  await choice(page, "a");
  r = await page.evaluate(() => data.money.filter(m => m.category === "eating-out").map(m => m.amount));
  ok("'Update it' overwrites, no second entry", r.join() === "31", r);
  await page.evaluate(() => openMoneyDialog(null)); await sleep(150);
  await fillExpense(page, { type: "expense", cat: "eating-out", amt: 12, date: today }); await page.tap("#moneySave"); await choice(page, "b");
  r = await page.evaluate(() => ({ e: data.money.filter(m => m.category === "eating-out").map(m => m.amount), flagged: findRepeatDuplicates().length }));
  ok("'Add new' adds a second one; two hand-entered same-day entries are never flagged", r.e.length === 2 && r.flagged === 0, r);

  // ---------- Duplicate review on unlock (seeded like the old bug)
  const before = await page.evaluate(() => {
    const a = data.accounts[0].id, g = data.money.find(m => m.category === "groceries");
    const copy = Object.assign({}, g, { id: "dupG" }); // same repeatId + occ
    data.money.push(copy);
    const auto = data.money.find(m => m.debtId === "d2");
    const hand = { id: "dupD", type: "expense", amount: auto.amount, accountId: a, category: "car-payment", label: "Car loan", date: auto.date, goalId: "", debtId: "d2", applyDebt: true };
    applyEntryEffects(hand); data.money.push(hand);
    save();
    return { n: data.money.length, d2: data.debts.find(d => d.id === "d2").balance, bal: accountBal(a) };
  });
  await sleep(600);
  await page.reload({ waitUntil: "networkidle0" }); await unlock(page, "Guillermo", "guipass1"); await sleep(300);
  r = await page.evaluate(() => ({ open: document.getElementById("dupDialog").open, title: document.getElementById("dupTitle").innerText, items: [...document.querySelectorAll("#dupList li")].map(li => li.innerText), merge: document.getElementById("dupMerge").innerText, keep: document.getElementById("dupKeep").innerText, money: data.money.length }));
  ok("unlock shows the duplicate review (nothing removed yet)", r.open && r.title === "We found 2 entries that look like duplicates. Check them before we merge?" && r.items.length === 2 && r.merge === "Merge them" && r.keep === "Keep all" && r.money === before.n, r);
  ok("list shows name · date · amount · account", r.items.some(t => /^Groceries · .+ · \$\d+ · Checking$/.test(t)) && r.items.some(t => /^Car loan payment · .+ · \$250 · Checking$/.test(t)), r.items);
  await page.screenshot({ path: TMP + "/t29-duplicates.png" });
  await page.tap("#dupMerge"); await sleep(300);
  r = await page.evaluate(() => ({ n: data.money.length, ids: data.money.map(m => m.id), d2: data.debts.find(d => d.id === "d2").balance, bal: accountBal(data.accounts[0].id), backup: !!(data.preCleanupBackup && data.preCleanupBackup.at && data.preCleanupBackup.data.money.length), toast: document.getElementById("toast").innerText }));
  ok("merge removes the 2 copies, keeps the first, fixes balances", r.n === before.n - 2 && !r.ids.includes("dupG") && r.d2 === before.d2 + 250, { r, before });
  ok("pre-cleanup snapshot saved in the vault", r.backup);
  ok("toast 'Merged. A backup from before is saved in Settings.' + Undo", /^Merged\. A backup from before is saved in Settings\.Undo$/.test(r.toast), r.toast);
  ok("Settings shows 'Undo the duplicate merge' after a merge", await page.evaluate(() => { const b = document.getElementById("btnPreCleanup"); return !b.hidden && b.innerText === "Undo the duplicate merge" && b.closest("#menuSettings") !== null; }));
  await check(page, "merge");
  await page.tap("#toast .toast-act"); await sleep(300);
  r = await page.evaluate(() => ({ n: data.money.length, d2: data.debts.find(d => d.id === "d2").balance }));
  ok("Undo brings everything back", r.n === before.n && r.d2 === before.d2, r);
  await sleep(600); await page.reload({ waitUntil: "networkidle0" }); await unlock(page, "Guillermo", "guipass1"); await sleep(300);
  ok("after Undo it doesn't ask again right away", await page.evaluate(() => !document.getElementById("dupDialog").open));
  // Keep all path
  await page.evaluate(() => { data.dupReviewed = []; save(); }); await sleep(500);
  await page.reload({ waitUntil: "networkidle0" }); await unlock(page, "Guillermo", "guipass1"); await sleep(300);
  ok("asks again when not reviewed", await page.evaluate(() => document.getElementById("dupDialog").open));
  await page.tap("#dupKeep"); await sleep(500);
  await page.reload({ waitUntil: "networkidle0" }); await unlock(page, "Guillermo", "guipass1"); await sleep(300);
  r = await page.evaluate(() => ({ open: document.getElementById("dupDialog").open, n: data.money.length }));
  ok("'Keep all' keeps them and never asks again", !r.open && r.n === before.n, r);
  // ---------- Settings → Restore data from before the cleanup (snapshot = state right before merge)
  const snapInfo = await page.evaluate(() => ({ n: data.preCleanupBackup.data.money.length, at: data.preCleanupBackup.at }));
  await page.evaluate(() => { const a = data.accounts[0].id; data.money.push({ id: "later", type: "expense", amount: 9, accountId: a, category: "fun", label: "", date: TODAY, goalId: "" }); save(); renderDerived(); });
  const openSettingsItem = async () => {
    await page.evaluate(() => window.scrollTo(0, 0)); await page.tap("#logoBtn"); await sleep(400);
    if (await page.evaluate(() => document.getElementById("menuSettings").hidden)) { await page.tap("#menuSettingsToggle"); await sleep(250); }
    await page.evaluate(() => document.getElementById("btnPreCleanup").scrollIntoView({ block: "center" }));
    await page.tap("#btnPreCleanup"); await sleep(900);
  };
  await openSettingsItem();
  const dateTxt = await page.evaluate(at => new Date(at).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" }), snapInfo.at);
  r = await page.evaluate(() => ({ open: document.getElementById("confirmDialog").open, msg: document.getElementById("confirmMsg").innerText, ok: document.getElementById("confirmDelete").innerText, okCls: document.getElementById("confirmDelete").className, keep: document.getElementById("confirmKeep").innerText }));
  ok("restore asks first with the snapshot's date", r.open && r.msg === "Go back to your data from " + dateTxt + "? Anything you've added since then will be lost." && /^October \d+, 2026$/.test(dateTxt), r);
  ok("buttons 'Restore' (danger) and 'Keep current'", r.ok === "Restore" && /danger/.test(r.okCls) && r.keep === "Keep current", r);
  await page.screenshot({ path: TMP + "/t29-restore-confirm.png" });
  await page.tap("#confirmKeep"); await sleep(300);
  r = await page.evaluate(() => ({ later: data.money.some(m => m.id === "later"), keepTxt: document.getElementById("confirmKeep").innerText }));
  ok("'Keep current' changes nothing (and the delete dialog's 'Keep it' label comes back)", r.later && r.keepTxt === "Keep it", r);
  await openSettingsItem();
  await page.tap("#confirmDelete"); await sleep(400);
  r = await page.evaluate(() => ({ n: data.money.length, later: data.money.some(m => m.id === "later"), toast: document.getElementById("toast").innerText, item: !document.getElementById("btnPreCleanup").hidden }));
  ok("'Restore' goes back to the snapshot", r.n === snapInfo.n && !r.later, { r, snapInfo });
  ok("toast 'Restored to {date}.'", r.toast === "Restored to " + dateTxt + ".", r.toast);
  await sleep(600); await page.reload({ waitUntil: "networkidle0" }); await unlock(page, "Guillermo", "guipass1"); await sleep(300);
  r = await page.evaluate(() => ({ n: data.money.length, dlg: document.getElementById("dupDialog").open }));
  ok("restore survives reload and doesn't re-open the duplicate review", r.n === snapInfo.n && !r.dlg, r);
  await clean(page);
  // ---------- Nothing to review on a clean vault; screens fit 390px
  r = await page.evaluate(() => { const out = {}; ["home", "money", "goals", "week", "area:career"].forEach(s => { applyScreen(s); out[s] = document.documentElement.scrollWidth <= 390; }); applyScreen("home"); return out; });
  ok("screens fit 390px", Object.values(r).every(Boolean), r);
  r = await page.evaluate(() => [...document.querySelectorAll("#menuGoList [data-menu-go]")].map(b => b.innerText.trim()));
  ok("menu: one 'Check-in' item, no duplicate 'This week'", r.filter(t => t === "Check-in").length === 1 && !r.includes("This week"), r);
  ok("no page errors", errs.length === 0, errs);
  console.log(JSON.stringify(res, null, 1)); console.log("INFO " + JSON.stringify(info)); console.log("FAILS " + fails);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
