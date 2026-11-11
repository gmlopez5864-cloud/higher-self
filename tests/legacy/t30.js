// v30: Money months (past = actual, this month = actual + coming up, future = projected, never saved), paychecks
// (weekly / 2 weeks / twice a month / monthly), debt payoff with APR, savings targets. Phone width 390px.
const { puppeteer, APP, TMP } = require("./lib/env");
const O = "http://127.0.0.1:8765";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const res = {}; let fails = 0;
const ok = (n, c, i) => { res[n] = (c ? "PASS" : "FAIL") + (i !== undefined ? " " + JSON.stringify(i) : ""); if (!c) fails++; };
const setup = async (p, name, pass) => { await p.waitForSelector("#profileName"); await p.click("#profileName", { clickCount: 3 }); await p.type("#profileName", name); await p.type("#vaultPass", pass); await p.type("#vaultPass2", pass); await p.click("#vaultSetup"); await p.waitForSelector("#appRoot:not([hidden])"); };
const unlock = async (p, name, pass) => { await p.evaluate(n => [...document.querySelectorAll("[data-profile]")].find(b => b.innerText.trim() === n).click(), name); await p.waitForSelector("#vaultPass"); await p.type("#vaultPass", pass); await p.click("#vaultUnlock"); await p.waitForSelector("#appRoot:not([hidden])"); await sleep(300); };
const clean = p => p.evaluate(() => { const g = document.getElementById("guideOverlay"); if (g) g.hidden = true; document.getElementById("appRoot").removeAttribute("aria-hidden"); document.querySelectorAll("dialog[open]").forEach(d => d.close()); });
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
  const T = await page.evaluate(() => ({ today: iso(new Date()), ver: ICON_VER, sw: null }));
  ok("icon version 43", T.ver === "43", T);
  ok("test day is in October 2026 (fixtures assume it)", T.today.startsWith("2026-10") && T.today >= "2026-10-06" && T.today < "2026-10-29", T.today);
  const sw = await page.evaluate(async () => (await (await fetch("sw.js", { cache: "no-store" })).text()).match(/higher-self-v\d+/)[0]);
  ok("sw cache higher-self-v43", sw === "higher-self-v43", sw);

  // ---------- fixtures
  await page.evaluate(() => {
    data.guideSeen = true;
    const [chk, sav] = data.accounts; chk.openingBalance = 2000; sav.name = "Emergency"; sav.openingBalance = 7700;
    const R = (o) => Object.assign({ id: uid("r"), type: "expense", amount: 0, accountId: chk.id, category: "other", label: "", goalId: "", debtId: "", applyDebt: true, lastPosted: "", active: true, debtAuto: false, end: "" }, o);
    data.repeats.push(
      R({ id: "pw", freq: "week", start: "2026-10-02", day: 2, type: "income", amount: 800, category: "paycheck", lastPosted: "2026-10-21" }),        // Fridays
      R({ id: "p2", freq: "2weeks", start: "2026-10-09", day: 9, type: "income", amount: 300, category: "side", lastPosted: "2026-10-21" }),
      R({ id: "ps", freq: "semimonth", start: "2026-10-01", day: 1, type: "income", amount: 1000, category: "paycheck", lastPosted: "2026-10-21" }),
      R({ id: "rent", freq: "month", start: "2026-01-31", day: 31, amount: 1500, category: "rent-or-mortgage", lastPosted: "2026-09-30" }),
      R({ id: "gro", freq: "month", start: "2026-10-01", day: 1, amount: 450, category: "groceries", lastPosted: "2026-10-01" }),
      R({ id: "gym", freq: "month", start: "2026-10-03", day: 3, amount: 40, category: "subscriptions", lastPosted: "2026-10-03", end: "2026-12-31" }),
      R({ id: "old", freq: "month", start: "2026-01-10", day: 10, amount: 999, category: "fun", lastPosted: "2026-06-10", active: false }),
      R({ id: "ins", freq: "year", start: "2026-12-15", day: 15, amount: 20000, category: "insurance" })
    );
    data.money.push(
      { id: "g10", type: "expense", amount: 450, planned: 450, accountId: chk.id, category: "groceries", label: "", date: "2026-10-01", goalId: "", repeatId: "gro", occ: "2026-10-01" },
      { id: "s9", type: "expense", amount: 380, accountId: chk.id, category: "groceries", label: "", date: "2026-09-12", goalId: "" },
      { id: "i9", type: "income", amount: 2600, accountId: chk.id, category: "paycheck", label: "", date: "2026-09-15", goalId: "" }
    );
    data.debts.push(
      { id: "visa", name: "Visa", balance: 1000, apr: 24, mode: "fixed", payment: 300, pct: 1, extra: 0, payFrom: chk.id, dueDay: 5, billRepeatId: "", billConfirmed: true },
      { id: "car", name: "Car loan", balance: 380, apr: 0, mode: "fixed", payment: 0, pct: 1, extra: 0, payFrom: "", dueDay: 1, billRepeatId: "", billConfirmed: true },
      { id: "store", name: "Store card", balance: 200, apr: 20, mode: "fixed", payment: 0, pct: 1, extra: 0, payFrom: "", dueDay: 1, billRepeatId: "", billConfirmed: true },
      { id: "big", name: "Big loan", balance: 10000, apr: 24, mode: "fixed", payment: 150, pct: 1, extra: 0, payFrom: "", dueDay: 28, billRepeatId: "", billConfirmed: true }
    );
    // the car loan is paid by a weekly repeat set up by hand (Fridays from Oct 30)
    data.repeats.push(R({ id: "carw", freq: "week", start: "2026-10-30", day: 30, amount: 100, category: "car-payment", debtId: "car", label: "Car loan" }));
    syncDebtBills(); postDueRepeats(); save(); openScreen("money"); renderDerived();
  });
  await sleep(300);
  const P = () => page.evaluate(() => projectMoney().months.map(m => ({ ym: m.ym, rows: m.rows.map(x => [x.date, x.kind, x.debtId || x.repeatId || x.goalId, x.amount, x.interest || 0]), income: m.income, spent: m.spent, start: m.start, left: m.left, payoffs: m.payoffs, reached: m.reached })));
  let all = await P();
  const M = ym => all.find(m => m.ym === ym);
  const of = (ym, id) => M(ym).rows.filter(r => r[2] === id);
  let r = await page.evaluate(() => ({ visa: data.money.filter(m => m.debtId === "visa").map(m => [m.date, m.amount]), bal: data.debts[0].balance }));
  ok("Visa's October bill is a real entry ($300, Oct 5), balance $700", r.visa.length === 1 && r.visa[0][1] === 300 && r.bal === 700, r);

  // ---------- paychecks and repeat schedules
  ok("weekly paycheck: 5 Fridays in January 2027", of("2027-01", "pw").map(x => x[0]).join() === "2027-01-01,2027-01-08,2027-01-15,2027-01-22,2027-01-29", of("2027-01", "pw"));
  ok("weekly paycheck: 4 in February 2027", of("2027-02", "pw").length === 4);
  ok("every 2 weeks crosses months correctly (Dec 4, 18 · Jan 1, 15, 29)", of("2026-12", "p2").map(x => x[0]).join() === "2026-12-04,2026-12-18" && of("2027-01", "p2").map(x => x[0]).join() === "2027-01-01,2027-01-15,2027-01-29", [of("2026-12", "p2"), of("2027-01", "p2")]);
  ok("twice a month: the 1st and 15th", of("2026-11", "ps").map(x => x[0]).join() === "2026-11-01,2026-11-15");
  ok("rent on the 31st clamps (Nov 30, Feb 28, Oct 31 coming up)", of("2026-11", "rent")[0][0] === "2026-11-30" && of("2027-02", "rent")[0][0] === "2027-02-28" && of("2026-10", "rent")[0][0] === "2026-10-31", [of("2026-11", "rent"), of("2027-02", "rent")]);
  ok("repeat with an end date stops (gym in Dec, not Jan)", of("2026-12", "gym").length === 1 && of("2027-01", "gym").length === 0);
  ok("stopped repeat never projects", all.every(m => !m.rows.some(x => x[2] === "old")));
  ok("yearly insurance only in December", of("2026-12", "ins").length === 1 && of("2027-12", "ins").length === 1 && of("2027-06", "ins").length === 0);
  // ---------- this month: actual + coming up, no double counting
  const oct = M("2026-10");
  ok("October: groceries (posted Oct 1) and Visa (paid Oct 5) are not projected again", of("2026-10", "gro").length === 0 && !oct.rows.some(x => x[2] === "visa"), oct.rows);
  ok("October coming up: paychecks after today only", of("2026-10", "pw").every(x => x[0] > T.today) && of("2026-10", "pw").length >= 1);
  r = await page.evaluate(() => ({ bal: r2(data.accounts.reduce((t, a) => t + accountBal(a.id), 0)) }));
  ok("this month starts from the real account balances", oct.start === r.bal, { start: oct.start, bal: r.bal });
  ok("each month carries the last one's leftover", all.slice(1, 24).every((m, i) => m.start === all[i].left), all.slice(0, 4).map(m => [m.ym, m.start, m.left]));
  ok("left = carried + income − spent", all.slice(0, 24).every(m => Math.abs(m.left - (m.start + m.income - m.spent)) < 0.011));
  // ---------- debts: APR interest each month, payoff, stop afterwards
  const nov = of("2026-11", "visa")[0], dec = of("2026-12", "visa")[0], jan = of("2027-01", "visa")[0];
  ok("Visa Nov: $14 interest (24% APR on $700), pays $300", nov && nov[4] === 14 && nov[3] === 300, nov);
  ok("Visa Dec: $8.28 interest on $414", dec && dec[4] === 8.28 && dec[3] === 300, dec);
  ok("Visa Jan: last payment $124.73 (interest included), paid off", jan && jan[4] === 2.45 && jan[3] === 124.73 && M("2027-01").payoffs.some(p => p.debtId === "visa" && p.last === 124.73), [jan, M("2027-01").payoffs]);
  ok("Visa stops appearing after it's paid off", all.filter(m => m.ym > "2027-01").every(m => !m.rows.some(x => x[2] === "visa")));
  ok("car loan hits $0 mid-month: Nov 20 pays the last $80, no Nov 27 payment", of("2026-11", "car").map(x => x[0] + ":" + x[3]).join() === "2026-11-06:100,2026-11-13:100,2026-11-20:80" && of("2026-10", "car").map(x => x[3]).join() === "100" && M("2026-11").payoffs.some(p => p.debtId === "car" && p.date === "2026-11-20"), [of("2026-10", "car"), of("2026-11", "car")]);
  ok("debt with no payment set never projects", all.every(m => !m.rows.some(x => x[2] === "store")));
  ok("a payment below the interest keeps the debt (no payoff)", !Object.keys(await page.evaluate(() => projectMoney().payoffAt)).includes("big"));

  // ---------- UI: this month
  await page.evaluate(() => { goMoneyMonth(iso(new Date()).slice(0, 7)); document.getElementById("monthPanel").scrollIntoView({ block: "start" }); window.scrollBy(0, -60); });
  await sleep(200);
  const ui = () => page.evaluate(() => ({ title: document.getElementById("monthTitle").innerText, tag: !document.getElementById("monthTag").hidden, tagText: document.getElementById("monthTag").innerText, note: document.getElementById("monthNote").hidden ? "" : document.getElementById("monthNote").innerText, now: !document.getElementById("monthNow").hidden, status: (document.getElementById("monthStatus") || {}).innerText || "", carry: (document.getElementById("monthCarry") || {}).innerText || "", start: (document.getElementById("monthStart") || {}).innerText || "", flags: [...document.querySelectorAll("#monthTotals .month-flag")].map(f => f.innerText.trim()), flagImg: [...document.querySelectorAll("#monthTotals .month-flag img")].map(i => i.getAttribute("src")), pace: [...document.querySelectorAll("#paceList li")].map(l => l.innerText.trim()), inc: (document.getElementById("mtIncome") || {}).innerText, spent: (document.getElementById("mtSpent") || {}).innerText, left: (document.getElementById("mtLeft") || {}).innerText, act: document.getElementById("activityTitle").innerText, real: document.querySelectorAll("#moneyList li:not(.proj) [data-money]").length, proj: document.querySelectorAll("#moneyList li.proj").length, sub: [...document.querySelectorAll("#moneyList .act-sub")].map(x => x.innerText), pieProj: document.getElementById("moneyPie").classList.contains("projected"), pieCentre: [...document.querySelectorAll("#moneyPie text")].map(t => t.textContent).join("|"), overflow: document.documentElement.scrollWidth > 390 }));
  let u = await ui();
  // paychecks the fixtures leave due after Oct 21 (Friday Oct 23 onward) post on load; count them so the checks hold any day of the window
  const lateIn = await page.evaluate(() => data.money.filter(m => m.type === "income" && m.repeatId && m.date > "2026-10-21"));
  const lateSum = lateIn.reduce((t, m) => t + m.amount, 0);
  ok("this month keeps 'End of month'", await page.evaluate(() => [...document.querySelectorAll("#monthTotals .month-totals small")].map(x => x.innerText)[2] === "End of month"));
  ok("this month: title, no Projected tag, no 'This month' jump", u.title === "October 2026" && !u.tag && !u.note && !u.now, u);
  ok("this month: real entries plus a 'Coming up' group of dashed rows", u.real === 2 + lateIn.length && u.proj >= 3 && u.sub.join().toLowerCase() === "coming up", u);
  ok("this month: 'In your accounts now' + status line", /^In your accounts now: \$[\d,.]+ · coming up: /.test(u.start) && /^(On track\. Left over \$[\d,.]+\.|Short by \$[\d,.]+ this month\. Worth a look at the plan\?)$/.test(u.status), u);
  ok("at this pace: Visa Jan 2027, car Nov 2026, store card no payment, big loan not covered", u.pace.includes("Visa: paid off in January 2027") && u.pace.includes("Car loan: paid off in November 2026") && u.pace.includes("Store card: No monthly payment set yet, so it isn't in the plan. Add one to see when it's paid off.") && u.pace.includes("Big loan: This payment doesn't cover the interest, so the balance keeps growing. It takes more than $200 a month to bring it down."), u.pace);
  ok("no overflow at 390px (this month)", !u.overflow);
  await page.screenshot({ path: TMP + "/t30-month-now.png" });
  // ---------- future: tap a pace line to jump to Visa's payoff month
  await page.evaluate(() => [...document.querySelectorAll("#paceList [data-goto-month]")].find(b => b.innerText.startsWith("Visa")).click()); await sleep(200);
  u = await ui();
  ok("future month: 'Projected' tag beside the name + 'Nothing here has happened yet.'", u.title === "January 2027" && u.tag && u.tagText.toUpperCase() === "PROJECTED" && u.note === "Nothing here has happened yet." && u.now, u);
  ok("payoff flag 'Visa paid off in January 2027 · last payment $124.73' with payoff-flag glyph", u.flags.includes("Visa paid off in January 2027 · last payment $124.73") && u.flagImg.every(s => /glyphs128\/money\/payoff-flag\.png\?v=43$/.test(s)), u);
  ok("carry line 'Carried from December: $…' and status", /^Carried from December: −?\$[\d,.]+$/.test(u.carry) && /^(On track\. Left over|Short by)/.test(u.status), u);
  ok("future list: only projected rows, pie marked projected / 'Planned'", u.real === 0 && u.proj > 5 && u.pieProj && u.pieCentre.startsWith("Planned"), u);
  r = await page.evaluate(() => ({ labels: [...document.querySelectorAll("#monthTotals .month-totals small")].map(x => x.innerText), hint: document.getElementById("activityHint").innerText }));
  ok("projected month: 'Expected at end of month' + new hint copy", r.labels[2] === "Expected at end of month" && r.hint === "Projected from your repeating bills, paychecks and plans. Tap any row to change it.", r);
  const flagOk = await page.evaluate(() => { const i = document.querySelector("#monthTotals .month-flag img"); return i && i.complete && i.naturalWidth > 0; });
  ok("payoff-flag glyph loads", flagOk);
  await page.evaluate(() => { document.getElementById("monthPanel").scrollIntoView({ block: "start" }); window.scrollBy(0, -60); }); await sleep(150);
  await page.screenshot({ path: TMP + "/t30-month-future.png" });
  // December: short (the $9,000 insurance), carried shown negative next month
  await page.evaluate(() => goMoneyMonth("2026-12")); u = await ui();
  const decM = M("2026-12");
  ok("short month copy: 'Short by $X this month. Worth a look at the plan?'", decM.left < 0 && u.status === "Short by " + (await page.evaluate(v => moneyPlain(v), -decM.left)) + " this month. Worth a look at the plan?", { u: u.status, left: decM.left });
  await page.evaluate(() => goMoneyMonth("2027-01")); u = await ui();
  ok("next month carries the shortfall as a negative", u.carry === "Carried from December: " + (await page.evaluate(v => moneyPlain(v), decM.left)) && decM.left < 0, u.carry);
  const febM = M("2027-02");
  await page.evaluate(() => goMoneyMonth("2027-06")); u = await ui();
  const junM = M("2027-06");
  ok("covered month copy: 'On track. Left over $X.'", junM.left >= 0 && u.status === "On track. Left over " + (await page.evaluate(v => moneyPlain(v), junM.left)) + ".", { s: u.status, left: junM.left });
  // tap a projected row → plan editor, never an entry
  r = await page.evaluate(() => { const b = document.querySelector('#moneyList [data-proj-rep="rent"]'); b.click(); const o = { title: document.getElementById("moneyDialogTitle").innerText, editing: editingMoneyId, rep: editingRepeatId }; document.getElementById("moneyDialog").close(); return o; });
  ok("tapping a projected row opens 'Edit repeating' (the plan)", r.title === "Edit repeating entry" && !r.editing && r.rep === "rent", r);
  // ---------- past month
  await page.evaluate(() => { goMoneyMonth("2026-09"); document.getElementById("monthPanel").scrollIntoView({ block: "start" }); window.scrollBy(0, -60); }); await sleep(150);
  u = await ui();
  ok("past month keeps 'End of month'", await page.evaluate(() => [...document.querySelectorAll("#monthTotals .month-totals small")].map(x => x.innerText)[2] === "End of month"));
  ok("past month: actual totals, no tag, no projected rows", u.title === "September 2026" && !u.tag && u.proj === 0 && u.real === 2 && u.inc === "$2,600" && u.spent === "$380" && u.left === "$2,220" && !u.status, u);
  await page.screenshot({ path: TMP + "/t30-month-past.png" });
  r = await page.evaluate(() => ({ rules: document.getElementById("repeatsPanel").hidden, chips: [...document.querySelectorAll("#moneyPieToggle .chip")].map(c => c.innerText) }));
  ok("past month: the Coming up rule list is hidden; pie chips read Month / Year", r.rules && r.chips.join() === "Month,Year", r);
  await page.tap('#moneyList [data-money="s9"]'); await sleep(250);
  r = await page.evaluate(() => ({ t: document.getElementById("moneyDialogTitle").innerText, id: editingMoneyId })); await page.evaluate(() => document.getElementById("moneyDialog").close());
  ok("past entries stay editable", r.t === "Edit entry" && r.id === "s9", r);
  r = await page.evaluate(() => ({ prev: document.getElementById("monthPrev").disabled }));
  ok("can't go before the first month with entries", r.prev);
  // ---------- projections never write
  const snap = await page.evaluate(() => JSON.stringify([data.money, data.repeats, data.debts, data.goals]));
  await page.evaluate(async () => { for (let i = 0; i < 30; i++) { document.getElementById("monthNext").click(); } for (let i = 0; i < 40; i++) document.getElementById("monthPrev").click(); document.getElementById("monthNow").click(); postDueRepeats(); postDueRepeats(); });
  r = await page.evaluate(s0 => ({ same: JSON.stringify([data.money, data.repeats, data.debts, data.goals]) === s0, title: document.getElementById("monthTitle").innerText }), snap);
  ok("browsing 30 months ahead and back writes nothing; posting adds nothing", r.same && r.title === "October 2026", r);
  r = await page.evaluate(() => { for (let i = 0; i < 200; i++) document.getElementById("monthNext").click(); return { t: document.getElementById("monthTitle").innerText, dis: document.getElementById("monthNext").disabled }; });
  ok("forward stops at 10 years", r.dis && r.t === "October 2036", r);
  await page.evaluate(() => document.getElementById("monthNow").click());

  // ---------- savings target on an account (UI: Set a target)
  const sav = await page.evaluate(() => data.accounts[1].id);
  await page.evaluate(id => openAccountDialog(id), sav); await sleep(150);
  r = await page.evaluate(() => document.getElementById("accountTarget").innerText);
  ok("account sheet has 'Set a target'", r === "Set a target", r);
  await page.evaluate(() => document.getElementById("accountTarget").click()); await sleep(200);
  r = await page.evaluate(() => ({ open: document.getElementById("targetDialog").open, labels: [...document.querySelectorAll("#targetDialog label")].map(l => l.childNodes[0].textContent.trim()) }));
  ok("target sheet: Target amount, Each month, optional APY", r.open && r.labels.join("|") === "Target amount|Each month|Interest rate (APY %, optional)", r);
  await page.type("#tgtAmount", "8000"); await page.tap("#tgtSave"); await sleep(200);
  r = await page.evaluate(() => [...document.querySelectorAll("#accountTargets li p")].map(p => p.innerText));
  ok("no monthly amount: 'Add a monthly amount to see when you'll get there.'", r[0] === "Emergency · $7,700 of $8,000. Add a monthly amount to see when you'll get there.", r);
  await page.evaluate(() => document.querySelector("[data-tgt-acc]").click()); await sleep(150);
  await page.type("#tgtMonthly", "100"); await page.tap("#tgtSave"); await sleep(200);
  all = await P();
  r = await page.evaluate(() => ({ row: [...document.querySelectorAll("#accountTargets li p")].map(p => p.innerText)[0], g: data.goals.filter(g => g.accountId === data.accounts[1].id).map(g => [g.target, g.monthly, g.unit, g.direction]) }));
  const reachYm = all.find(m => m.reached.length) ? all.find(m => m.reached.length).ym : "";
  ok("one account-linked goal (not a second system)", r.g.length === 1 && r.g[0].join() === "8000,100,$,up", r.g);
  ok("savings plays forward: $100 this month + Nov → reaches $8,000 in December 2026", reachYm === "2026-12" && of("2026-10", r.g.length ? (await page.evaluate(() => data.goals.find(g => g.accountId === data.accounts[1].id).id)) : "").length === 1, { reachYm });
  ok("account row: '$7,700 of $8,000. At $100 a month, you'll get there around December 2026.'", r.row === "Emergency · $7,700 of $8,000. At $100 a month, you'll get there around December 2026.", r.row);
  const gid = await page.evaluate(() => data.goals.find(g => g.accountId === data.accounts[1].id).id);
  // ---------- choice 2: savings accounts stay out of left over / start / carry
  r = await page.evaluate(() => {
    const P = projectMoney(), m0 = P.months[0], sv = savingsAccountIds();
    const spend = r2(data.accounts.filter(a => !sv.has(a.id)).reduce((t, a) => t + accountBal(a.id), 0));
    const names = data.accounts.map(a => [a.name, isSavingsAccount(a)]);
    const probe = [{ id: "x1", name: "Rainy day savings" }, { id: "x2", name: "Cash" }, { id: "x3", name: "Wallet", type: "savings" }].map(isSavingsAccount);
    goMoneyMonth(iso(new Date()).slice(0, 7));
    const line = (document.getElementById("monthSavings") || {}).innerText;
    goMoneyMonth("2026-11"); const lineNov = (document.getElementById("monthSavings") || {}).innerText;
    return { start: m0.start, spend, names, probe, line, lineNov, novSav: P.months[1].savings, carry: P.months.slice(1, 13).every((m, i) => m.start === P.months[i].left) };
  });
  ok("savings accounts: the one with a target, or named/typed savings", JSON.stringify(r.names) === JSON.stringify([["Checking", false], ["Emergency", true], ["Cash", false]]) && r.probe.join() === "true,false,true", r);
  ok("this month starts from spending accounts only (Emergency left out)", r.start === r.spend && r.spend === 2000 + 2600 - 380 - 300 - 450 + lateSum, [r, lateSum]);
  ok("'In savings: $7,700' now; November 'In savings: $7,900' after two $100 contributions", r.line === "In savings: $7,700" && r.lineNov === "In savings: $7,900" && r.novSav === 7900, r);
  ok("carry still chains with savings left out", r.carry);
  ok("the monthly amount counts as going out (in Nov spent)", of("2026-11", gid).length === 1 && of("2026-11", gid)[0][1] === "save" && of("2026-11", gid)[0][3] === 100);
  ok("after it's reached, no more contributions", all.filter(m => m.ym > "2026-12").every(m => !m.rows.some(x => x[2] === gid)));
  await page.evaluate(() => goMoneyMonth("2026-12")); u = await ui();
  ok("flag month: 'Emergency hits $8,000 this month.'", u.flags.includes("Emergency hits $8,000 this month."), u.flags);
  await page.evaluate(() => { openScreen("goals"); renderGoalsPanel(); }); await sleep(150);
  r = await page.evaluate(id => ({ line: (document.querySelector('[data-goal-plan="' + id + '"]') || {}).innerText, btn: (document.querySelector('[data-gp-plan="' + id + '"]') || {}).innerText }), gid);
  ok("Goals screen: 'At $100 a month, you'll reach $8,000 around December 2026.' + Change plan", r.line === "At $100 a month, you'll reach $8,000 around December 2026." && r.btn === "Change plan", r);
  // APY speeds it up: a $3,000 goal tracked on its own
  r = await page.evaluate(() => {
    data.goals.push({ id: "vac", area: "personal", title: "Vacation", start: 0, current: 2800, target: 3000, unit: "$", unitCustom: "", direction: "up", incomeCounts: false, accountId: "", linkStart: null, created: TODAY, touched: "", paused: false, deadline: "", progress: [], monthly: 50, apy: 0, monthlyDay: 28, reachedAt: "" });
    const a = projectMoney().reachAt.vac; data.goals.find(g => g.id === "vac").apy = 12; const b = projectMoney().reachAt.vac;
    const line = targetPlanText(data.goals.find(g => g.id === "vac"), true); return { a, b, line };
  });
  ok("own-goal: no APY → January 2027; 12% APY → December 2026", r.a === "2027-01" && r.b === "2026-12" && r.line === "At $50 a month, you'll reach $3,000 around December 2026.", r);
  await page.evaluate(() => goMoneyMonth("2026-12")); u = await ui();
  ok("own-goal flag: 'Vacation reaches $3,000 this month.'", u.flags.includes("Vacation reaches $3,000 this month."), u.flags);
  // ---------- Coach: deposits stopped
  r = await page.evaluate(() => {
    const g = data.goals.find(x => x.accountId === data.accounts[1].id);
    g.created = shift(TODAY, -60); g.touched = ""; g.monthlyDay = 5; // plan from August, due on the 5th
    data.money.push({ id: "dep8", type: "income", amount: 100, accountId: data.accounts[1].id, category: "other", label: "Deposit", date: "2026-08-05", goalId: "" });
    data.accounts[1].openingBalance -= 100; // keep the balance at $7,700
    data.coachToday = null; save(); openScreen("home"); renderCoachNotes();
    const n = document.querySelector('[data-note^="deposit:"]');
    return n ? { text: n.querySelector("p").innerText, btns: [...n.querySelectorAll("[data-note-act]")].map(b => b.innerText) } : { none: true, stall: savingsStall(g, TODAY), notes: [...document.querySelectorAll("#coachNotes [data-note]")].map(x => x.dataset.note), g: [g.created, g.monthlyDay, g.monthly, g.reachedAt], last: lastGoalDeposit(g) };
  });
  ok("Coach: 'No deposit to Emergency since August. Still aiming for $8,000?' + Add deposit / Change plan", r && r.text === "No deposit to Emergency since August. Still aiming for $8,000?" && r.btns.join() === "Add deposit,Change plan", r);
  if (r && r.none) { console.log(JSON.stringify(res, null, 1)); console.log("DEBUG", JSON.stringify(r)); process.exit(1); }
  r = await page.evaluate(() => { document.querySelector('[data-note^="deposit:"] [data-note-act="deposit"]').click(); const o = { t: document.getElementById("moneyDialogTitle").innerText, type: moneyType, acc: document.getElementById("moneyAccount").value, amt: document.getElementById("moneyAmt").value, want: data.accounts[1].id }; return o; });
  ok("'Add deposit' opens a money entry into Emergency for $100", r.t === "Add deposit" && r.type === "income" && r.acc === r.want && r.amt === "100", r);
  r = await page.evaluate(() => ({ from: document.getElementById("moneyFrom").value, chk: data.accounts[0].id, shown: !document.getElementById("moneyFromWrap").hidden, label: document.getElementById("moneyAccountLabel").innerText }));
  ok("deposit 'From' defaults to Checking (Into: Emergency)", r.shown && r.from === r.chk && r.label === "Into", r);
  const chkBefore = await page.evaluate(() => accountBal(data.accounts[0].id));
  await page.tap("#moneySave"); await sleep(300);
  r = await page.evaluate(() => ({ dlg: document.getElementById("choiceDialog").open, n: document.querySelectorAll('[data-note^="deposit:"]').length, bal: accountBal(data.accounts[1].id) }));
  ok("after the deposit the nudge is gone ($7,800 now)", !r.dlg && r.n === 0 && r.bal === 7800, r);
  r = await page.evaluate(() => { const dep = data.money.find(m => m.accountId === data.accounts[1].id && m.date === TODAY && m.type === "income"); const out = dep && data.money.find(m => m.id === dep.pairId); return { chk: accountBal(data.accounts[0].id), out: out && [out.type, out.amount, out.category, out.label, out.accountId === data.accounts[0].id], m0: actualMonth(TODAY.slice(0, 7)) }; });
  ok("the deposit moves $100 out of Checking ('To Emergency') and counts as going out", r.chk === chkBefore - 100 && r.out && r.out.join() === "expense,100,transfer,To Emergency,true", r);
  r = await page.evaluate(() => { const dep = data.money.find(m => m.accountId === data.accounts[1].id && m.date === TODAY && m.type === "income"); openMoneyDialog(dep.id); document.getElementById("moneyAmt").value = "120"; return dep.id; });
  await page.tap("#moneySave"); await sleep(300);
  r = await page.evaluate(id => { const dep = data.money.find(m => m.id === id), out = data.money.find(m => m.id === dep.pairId); return [dep.amount, out.amount]; }, r);
  ok("editing the deposit keeps its 'To …' entry in step", r.join() === "120,120", r);
  r = await page.evaluate(() => { const g = data.goals.find(x => x.accountId === data.accounts[1].id); g.created = shift(TODAY, -5); const dep = data.money.find(m => m.accountId === data.accounts[1].id && m.date === TODAY && m.type === "income"); data.money = data.money.filter(m => m.id !== dep.id && m.id !== dep.pairId); data.accounts[1].openingBalance += 100; data.coachToday = null; renderCoachNotes(); return document.querySelectorAll('[data-note^="deposit:"]').length; });
  ok("no nag when the plan is new (no due day since it started)", r === 0);
  r = await page.evaluate(() => { const g = data.goals.find(x => x.accountId === data.accounts[1].id); g.created = shift(TODAY, -60); g.monthlyDay = Math.min(28, Number(TODAY.slice(8)) - 3); data.coachToday = null; renderCoachNotes(); return document.querySelectorAll('[data-note^="deposit:"]').length; });
  ok("no nag within 7 days of the due day", r === 0);
  r = await page.evaluate(() => { const g = data.goals.find(x => x.accountId === data.accounts[1].id); g.monthlyDay = 5; data.coachToday = null; renderCoachNotes(); document.querySelector('[data-note^="deposit:"] [data-note-act="target"]').click(); return { open: document.getElementById("targetDialog").open, title: document.getElementById("targetTitle").innerText }; });
  ok("'Change plan' opens the target editor", r.open && r.title === "Change plan · Emergency", r);
  await page.evaluate(() => document.getElementById("targetDialog").close());
  // ---------- reached (real balance): one-time note
  r = await page.evaluate(() => {
    data.money.push({ id: "dep9", type: "income", amount: 300, accountId: data.accounts[1].id, category: "other", label: "Deposit", date: TODAY, goalId: "" });
    save(); renderDerived(); openScreen("home"); data.coachToday = null; renderCoachNotes();
    const g = data.goals.find(x => x.accountId === data.accounts[1].id);
    const n = document.querySelector('[data-note^="reached:"]');
    return { at: g.reachedAt, text: n && n.querySelector("p").innerText, stall: document.querySelectorAll('[data-note^="deposit:"]').length };
  });
  ok("real balance reaches target → 'Emergency reached $8,000. You set it, you kept at it.'", r.at === T.today && r.text === "Emergency reached $8,000. You set it, you kept at it." && r.stall === 0, r);
  r = await page.evaluate(() => { const g = data.goals.find(x => x.accountId === data.accounts[1].id); g.reachedAt = shift(TODAY, -5); data.coachToday = null; renderCoachNotes(); return document.querySelectorAll('[data-note^="reached:"]').length; });
  ok("the reached note is one-time (gone later)", r === 0);
  // ---------- forms: twice a month + end date
  await page.evaluate(() => { openScreen("money"); openMoneyDialog(null); }); await sleep(150);
  r = await page.evaluate(() => {
    document.querySelector('#moneyTypeRow [data-mtype="income"]').click();
    document.getElementById("moneyAmt").value = "1200"; document.getElementById("moneyDate").value = "2026-11-01";
    const f = document.getElementById("moneyRepeat"); const opt = [...f.options].map(o => o.textContent); f.value = "semimonth"; f.onchange();
    const endShown = !document.getElementById("moneyRepeatEndWrap").hidden; document.getElementById("moneyRepeatEnd").value = "2027-03-31";
    return { opt, endShown };
  });
  ok("'Twice a month (1st and 15th)' option and an 'Ends (optional)' field", r.opt.includes("Twice a month (1st and 15th)") && r.endShown, r);
  await page.tap("#moneySave"); await sleep(300);
  r = await page.evaluate(() => { const rr = data.repeats.find(x => x.freq === "semimonth" && x.amount === 1200); return rr ? { end: rr.end, tag: repeatTag(rr), apr: projectMoney().months.find(m => m.ym === "2027-04").rows.some(x => x.repeatId === rr.id), mar: projectMoney().months.find(m => m.ym === "2027-03").rows.filter(x => x.repeatId === rr.id).length } : null; });
  ok("twice-a-month paycheck saved with its end; projects through March only", r && r.end === "2027-03-31" && r.tag === "Repeats on the 1st and 15th until Mon Mar 31".replace("Mon Mar 31", r.tag.split("until ")[1]) && r.mar === 2 && !r.apr, r);
  // reload keeps it all
  await sleep(600); await page.reload({ waitUntil: "networkidle0" }); await unlock(page, "Guillermo", "guipass1"); await clean(page);
  r = await page.evaluate(() => ({ semi: data.repeats.filter(x => x.freq === "semimonth").length, end: data.repeats.find(x => x.id === "gym").end, g: data.goals.find(x => x.accountId === data.accounts[1].id), vac: data.goals.find(x => x.id === "vac").apy }));
  ok("reload keeps twice-a-month repeats, end dates, target monthly/APY", r.semi === 2 && r.end === "2026-12-31" && r.g.monthly === 100 && r.vac === 12, r);
  // ---------- choice 1: the auto bill includes the extra (capped at balance + interest); posted payments stay
  r = await page.evaluate(() => {
    const chk = data.accounts[0].id;
    data.debts.push({ id: "amex", name: "Amex", balance: 200, apr: 0, mode: "fixed", payment: 100, pct: 1, extra: 50, payFrom: chk, dueDay: 1, billRepeatId: "", billConfirmed: true });
    syncDebtBills(); postDueRepeats();
    const amex = data.money.filter(m => m.debtId === "amex").map(m => m.amount);
    const visaBefore = data.money.filter(m => m.debtId === "visa").map(m => m.amount);
    data.debts.find(d => d.id === "visa").extra = 25; save(); postDueRepeats();
    const visaAfter = data.money.filter(m => m.debtId === "visa").map(m => m.amount);
    const nov = projectMoney().months.find(m => m.ym === "2026-11").rows.filter(x => x.debtId === "visa" || x.debtId === "amex").map(x => [x.debtId, x.amount]);
    const cap = debtBillAmount({ balance: 100, apr: 12, mode: "fixed", payment: 100, extra: 50 });
    return { amex, visaBefore, visaAfter, nov, cap };
  });
  ok("auto bill posts payment + extra ($150 for Amex)", r.amex.join() === "150", r);
  ok("payments already posted stay as they are (Visa Oct $300)", r.visaBefore.join() === "300" && r.visaAfter.join() === "300", r);
  ok("projection and bill match: Visa Nov $325, Amex Nov the last $50", JSON.stringify(r.nov) === JSON.stringify([["visa", 325], ["amex", 50]]) || JSON.stringify(r.nov) === JSON.stringify([["amex", 50], ["visa", 325]]), r.nov);
  ok("bill with extra is capped at balance + interest ($101)", r.cap === 101, r.cap);
  ok("no page errors", errs.length === 0, errs);
  console.log(JSON.stringify(res, null, 1)); console.log("FAILS " + fails);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
