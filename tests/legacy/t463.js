// v46.3 (Android): welcome / lock screen with fingerprint, Skip for a planned block, the duration stepper,
// Free time blocks, and tappable Open time gaps in the day planner. Today is pinned to Wed 21 Oct 2026.
const A = require("./lib/app"); const { sleep, ok, done } = Object.assign({}, A, A.suite());
const SHOTS = process.env.HS_SHOTS || A.TMP;
const N = s => String(s || "").replace(/[\u202f\u00a0]/g, " ").replace(/\s+/g, " ").trim();
const mockBio = () => {
  const st = { enabled: !!localStorage.getItem("__mockBio") };
  window.__bioCalls = []; window.__bioMode = localStorage.getItem("__bioMode") || "ok";
  window.Capacitor = { isNativePlatform: () => true, getPlatform: () => "android", Plugins: { HSBiometric: {
    available: async () => ({ hardware: true, enrolled: true, available: true, enabled: st.enabled }),
    status: async () => ({ enabled: st.enabled }),
    enable: async () => { window.__bioCalls.push("enable"); st.enabled = true; localStorage.setItem("__mockBio", "1"); return { enabled: true }; },
    unlock: async () => {
      window.__bioCalls.push("unlock");
      if (window.__bioMode === "cancel") { const e = new Error("cancelled"); e.code = "cancelled"; throw e; }
      return { passphrase: localStorage.getItem("__mockPass") || "gui-pass-1" };
    },
    disable: async () => { st.enabled = false; localStorage.removeItem("__mockBio"); return { enabled: false }; } } } };
};
(async () => {
  const browser = await A.launch();
  // ================= web: lock screen unchanged
  {
    const { page } = await A.phonePage(browser);
    await A.fresh(page);
    const r = await page.evaluate(() => ({ pop: document.getElementById("vaultGate").classList.contains("gate-pop"), bio: !!document.querySelector(".bio-btn:not([hidden])") }));
    ok("web: the plain lock screen stays (no new look, no fingerprint)", !r.pop && !r.bio, r);
    await page.close();
  }
  const { page, errs } = await A.phonePage(browser);
  await page.evaluateOnNewDocument(mockBio);
  const tap = async sel => { await page.evaluate(s => { const e = document.querySelector(s); if (e) e.scrollIntoView({ block: "center" }); }, sel); await sleep(150); await page.click(sel); };
  await page.goto(A.ORIGIN + "/?android=1", { waitUntil: "networkidle0" }); await page.evaluate(() => localStorage.clear()); await page.reload({ waitUntil: "networkidle0" });
  await sleep(500);
  let r = await page.evaluate(() => {
    const g = document.getElementById("vaultGate"), sc = g.querySelector(".vault-screen"), cs = getComputedStyle(g);
    const b = sc.getBoundingClientRect(), logo = g.querySelector(".vault-brand .app-mark").getBoundingClientRect();
    return { pop: g.classList.contains("gate-pop"), fixed: cs.position === "fixed", bg: cs.backgroundImage.indexOf("gradient") >= 0, logo: Math.round(logo.width), cx: Math.round(b.left + b.width / 2), vw: innerWidth, anim: getComputedStyle(sc).animationName };
  });
  ok("Android: the welcome screen has the deep gradient, a 96px glowing bow, and the entrance animation", r.pop && r.fixed && r.bg && r.logo === 96 && /gateIn/.test(r.anim), r);
  ok("the card is centred horizontally", Math.abs(r.cx - r.vw / 2) <= 2, r);
  await A.setup(page, "Guillermo", "gui-pass-1");
  await A.lock(page); await sleep(400);
  r = await page.evaluate(() => { const g = document.getElementById("vaultGate"); const b = g.querySelector(".vault-screen").getBoundingClientRect(); return { top: Math.round(b.top), bottom: Math.round(innerHeight - b.bottom), pickBio: !!document.querySelector("#vaultBioPick:not([hidden])"), calls: window.__bioCalls.slice() }; });
  ok("'Who's here?' is centred vertically (equal space above and below)", Math.abs(r.top - r.bottom) <= 4, r);
  ok("fingerprint not on yet: no fingerprint button, no prompt", !r.pickBio && r.calls.length === 0, r);
  await page.click("[data-profile]"); await sleep(400);
  await page.type("#vaultPass", "gui-pass-1"); await page.click("#vaultUnlock"); await sleep(600);
  r = await page.evaluate(() => ({ offer: !!document.getElementById("vaultBioEnable"), app: !document.getElementById("appRoot").hidden, title: (document.getElementById("bioOfferTitle") || {}).textContent }));
  ok("after the passphrase opens it, the same screen offers 'Use fingerprint' (one tap)", r.offer && !r.app && r.title === "Open faster next time?", r);
  await page.click("#vaultBioEnable"); await sleep(500);
  r = await page.evaluate(() => ({ app: !document.getElementById("appRoot").hidden, calls: window.__bioCalls.slice(), bound: localStorage.getItem("hs-bio-profile"), pid: currentProfile && currentProfile.id }));
  ok("'Use fingerprint' turns it on for this profile and opens the app", r.app && r.calls.includes("enable") && r.bound === r.pid, r);
  // lock: auto-prompt opens it with the fingerprint
  await page.evaluate(() => { const g = document.getElementById("guideOverlay"); if (g) g.hidden = true; window.__bioCalls = []; lockApp(); }); await sleep(900);
  r = await page.evaluate(() => ({ app: !document.getElementById("appRoot").hidden, calls: window.__bioCalls.slice(), name: currentProfile && currentProfile.name }));
  ok("on the lock screen the fingerprint prompt comes up by itself and opens Guillermo", r.app && r.calls.join() === "unlock" && r.name === "Guillermo", r);
  // cancel: stays with the passphrase as fallback, the big button is there to try again
  await page.evaluate(() => { localStorage.setItem("__bioMode", "cancel"); window.__bioMode = "cancel"; window.__bioCalls = []; lockApp(); }); await sleep(900);
  r = await page.evaluate(() => ({ app: !document.getElementById("appRoot").hidden, btn: !!document.querySelector("#vaultBio:not([hidden])"), or: !!document.querySelector("#vaultOr:not([hidden])"), err: !!document.querySelector(".vault-err"), pass: !!document.getElementById("vaultPass"), calls: window.__bioCalls.slice() }));
  ok("cancel: still locked, the fingerprint button and 'or use your passphrase' stay, no error", !r.app && r.btn && r.or && !r.err && r.pass && r.calls.length === 1, r);
  await page.evaluate(() => document.getElementById("vaultBio").scrollIntoView({ block: "center" })); await sleep(200);
  await page.screenshot({ path: SHOTS + "/v463-lock-fingerprint.png" });
  await page.click("#vaultBio"); await sleep(300);
  r = await page.evaluate(() => ({ calls: window.__bioCalls.slice(), app: !document.getElementById("appRoot").hidden }));
  ok("tapping the fingerprint button asks again (no auto loop)", r.calls.length === 2 && !r.app, r);
  await page.type("#vaultPass", "gui-pass-1"); await page.click("#vaultUnlock"); await sleep(600);
  r = await page.evaluate(() => ({ app: !document.getElementById("appRoot").hidden, offer: !!document.getElementById("vaultBioEnable") }));
  ok("the passphrase still opens it; no offer since fingerprint is already on", r.app && !r.offer, r);
  // a second profile: the fingerprint belongs to Guillermo only
  await page.evaluate(() => { localStorage.setItem("__bioMode", "ok"); window.__bioMode = "ok"; });
  r = await page.evaluate(async () => {
    const bp = bioProfile(); return { bp: bp && bp.name, shown: shownVersion() };
  });
  ok("Android shows version 46.3; the shortcut is tied to Guillermo", r.shown === "46.3" && r.bp === "Guillermo", r);
  // "Not now" is remembered
  await page.evaluate(async () => { await hsBio().disable(); bioBind(""); }); await A.lock(page);
  await page.click("[data-profile]"); await sleep(400); await page.type("#vaultPass", "gui-pass-1"); await page.click("#vaultUnlock"); await sleep(600);
  await page.click("#vaultBioSkip"); await sleep(400);
  await A.lock(page); await page.click("[data-profile]"); await sleep(400); await page.type("#vaultPass", "gui-pass-1"); await page.click("#vaultUnlock"); await sleep(600);
  r = await page.evaluate(() => ({ app: !document.getElementById("appRoot").hidden, offer: !!document.getElementById("vaultBioEnable") }));
  ok("'Not now' opens the app and isn't asked again (Settings still has the switch)", r.app && !r.offer, r);
  await A.clean(page);

  // ================= stepper math
  r = await page.evaluate(() => ({
    f: [5, 45, 60, 90, 75, 1440].map(fmtDur),
    up: [5, 50, 55, 60, 75, 80, 1430, 1440].map(m => durStep(m, 1)), dn: [60, 75, 80, 50, 47, 5].map(m => durStep(m, -1))
  }));
  ok("display: '5 min', '45 min', '1 h', '1 h 30 min', '1 h 15 min', '24 h'", JSON.stringify(r.f) === JSON.stringify(["5 min", "45 min", "1 h", "1 h 30 min", "1 h 15 min", "24 h"]), r.f);
  ok("+: 5 min steps under 1 h, 15 min from 1 h, never past 24 h", JSON.stringify(r.up) === "[10,55,60,75,90,90,1440,1440]", r.up);
  ok("−: 15 min down to 1 h, then 5 min, never under 5 min", JSON.stringify(r.dn) === "[55,60,75,45,45,5]", r.dn);

  // ================= a day with blocks
  await page.evaluate(() => {
    const mk = (id, name) => ({ id, name, img: PATH_DEFAULT_ICON, created: TODAY, active: true, archived: false, reminder: null });
    data.paths.push(mk("paW", "Work"), mk("paK", "Father"), mk("paF", "Friends"));
    const P = (id, area, pathId, title, start, end) => ({ id, area, pathId, title, start, end, every: 0, days: [3], from: TODAY, until: "", source: "", icsUid: "", kind: "", listen: null, breaks: [] });
    data.plans = [P("wk", "career", "paW", "Work", "09:00", "12:00"), P("kd", "social", "paK", "Spending time with my kids", "16:00", "17:30"), P("fr", "social", "paF", "Coffee with Sam", "13:00", "14:00"),
      { id: "sl", area: "sleep", pathId: "", title: "", start: "23:00", end: "07:00", every: 1, days: [0, 1, 2, 3, 4, 5, 6], from: "2026-10-01", until: "", source: "", icsUid: "", kind: "", listen: null, breaks: [] }];
    data.planDone = {}; data.planDays = {}; data.selected = TODAY; save(); renderDerived(); openScreen("today");
  });
  await page.evaluate(() => document.getElementById("planBlocks").scrollIntoView({ block: "start" })); await sleep(300);
  r = await page.evaluate(() => { const N0 = x => String(x || "").replace(/\s+/g, " ").trim(); return [...document.querySelectorAll("#planBlocks .pb-row")].map(li => N0(li.querySelector(".pb-name b").textContent) + "=" + N0((li.querySelector("[data-dur-val]") || {}).textContent || "")).concat([...document.querySelectorAll("#planBlocks .step-btn")].map(b => Math.round(Math.min(b.getBoundingClientRect().width, b.getBoundingClientRect().height))).slice(0, 2).map(String)); });
  ok("Confirm day lists each block with its length (Work = 3 h, kids = 1 h 30 min) and a Skip", r.includes("Work=3 h") && r.includes("Spending time with my kids=1 h 30 min") && !!r.find(x => /^Coffee with Sam=1 h$/.test(x)), r);
  ok("− and + are at least 44px", Number(r[r.length - 1]) >= 44 && Number(r[r.length - 2]) >= 44, r.slice(-2));
  // tap + on the kids block (1h30 -> 1h45), − twice on Work (3h -> 2h30)
  const rowSel = name => `#planBlocks .pb-row[data-pb="${name}|2026-10-21"]`;
  await tap(rowSel("kd") + " [data-dur-up]"); await sleep(250);
  await tap(rowSel("wk") + " [data-dur-dn]"); await sleep(150); await page.click(rowSel("wk") + " [data-dur-dn]"); await sleep(900);
  r = await page.evaluate(() => ({ kd: data.planDays["kd|2026-10-21"], wk: data.planDays["wk|2026-10-21"], txt: document.querySelector('#planBlocks .pb-row[data-pb="kd|2026-10-21"] [data-dur-val]').textContent }));
  ok("+ makes the kids block 1 h 45 min (ends 5:45 PM); − − makes Work 2 h 30 min", r.kd && r.kd.end === "17:45" && r.wk && r.wk.end === "11:30" && r.txt === "1 h 45 min", r);
  // long-press repeats
  await page.evaluate(s => document.querySelector(s).scrollIntoView({ block: "center" }), rowSel("kd") + " [data-dur-up]"); await sleep(150);
  { const bb = await (await page.$(rowSel("kd") + " [data-dur-up]")).boundingBox(); await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await page.mouse.down(); await sleep(1000); await page.mouse.up(); }
  await sleep(900);
  r = await page.evaluate(() => { const o = occsTouching(TODAY).find(x => x.key === "kd|2026-10-21"); return occSpanMins(o); });
  ok("holding + repeats (several 15 min steps in one press)", r >= 105 + 45, r);
  // exact time
  await tap(rowSel("kd") + " [data-dur-val]"); await sleep(200);
  await page.evaluate(s => { const w = document.querySelector(s); w.querySelector("[data-dur-h]").value = "2"; w.querySelector("[data-dur-m]").value = "10"; w.querySelector("[data-dur-set]").click(); }, rowSel("kd")); await sleep(900);
  r = await page.evaluate(() => { const o = occsTouching(TODAY).find(x => x.key === "kd|2026-10-21"); return { m: occSpanMins(o), end: o.end }; });
  ok("tap the value and type 2 h 10 min: the block is exactly 2 h 10 min", r.m === 130 && r.end === "18:10", r);
  await tap(rowSel("kd") + " [data-dur-val]"); await sleep(200);
  r = await page.evaluate(s => { const w = document.querySelector(s); w.querySelector("[data-dur-h]").value = "30"; w.querySelector("[data-dur-m]").value = "0"; w.querySelector("[data-dur-set]").click(); return { msg: document.querySelector(s + " [data-dur-msg]").textContent }; }, rowSel("kd")); await sleep(900);
  r.m = await page.evaluate(() => occSpanMins(occsTouching(TODAY).find(x => x.key === "kd|2026-10-21")));
  ok("a planned block stops just under 24 h (23 h 55 min, start and end can't match): 'Up to 24 hours.'", r.m === 1435 && /Up to 24 hours/.test(r.msg), r);
  await page.evaluate(() => { data.planDays["kd|2026-10-21"] = { end: "17:30" }; save(); renderDerived(); }); await sleep(300);
  // Skip the friend's coffee: no time, shown as skipped, undo
  await tap(rowSel("fr") + " [data-plan-skip]"); await sleep(400);
  r = await page.evaluate(() => { const N0 = x => String(x || "").replace(/\s+/g, " ").trim(); return { skip: !!(data.planDays["fr|2026-10-21"] || {}).skip, row: N0((document.querySelector('#planBlocks .pb-row.is-skipped[data-pb="fr|2026-10-21"]') || {}).textContent), planned: plannedHoursFor(TODAY).social, toast: document.getElementById("toast").textContent }; });
  ok("Skip: the coffee is marked skipped, no time planned for it, 'Skipped · no time counted' with Undo", r.skip && /Skipped · no time counted/.test(r.row) && /Undo/.test(r.row) && Math.abs(r.planned - 1.5) < 1e-6 && /skipped\. No time counted/.test(r.toast), r);
  await page.evaluate(() => document.getElementById("planBlocks").scrollIntoView({ block: "start" })); await sleep(200);
  await page.screenshot({ path: SHOTS + "/v463-confirm-skip-stepper.png" });
  await tap('#planBlocks [data-plan-unskip="fr|2026-10-21"]'); await sleep(300);
  r = await page.evaluate(() => ({ skip: !!(data.planDays["fr|2026-10-21"] || {}).skip, planned: plannedHoursFor(TODAY).social }));
  ok("Undo brings it back as planned", !r.skip && Math.abs(r.planned - 2.5) < 1e-6, r);
  await tap(rowSel("fr") + " [data-plan-skip]"); await sleep(300);
  await tap("#planCard [data-plan-yes]"); await sleep(500);
  r = await page.evaluate(() => ({ cap: window.__hsLastCap || "", fr: data.pathLogs.filter(l => /^fr\|/.test(l.planKey)).length, social: hoursFor(TODAY).social, career: hoursFor(TODAY).career }));
  ok("confirming the day logs nothing for the skipped block (social = kids 1.5h only; work 2.5h after the nudge)", r.fr === 0 && Math.abs(r.social - 1.5) < 1e-6 && Math.abs(r.career - 2.5) < 1e-6, r);

  // ================= entry flow: stepper + skip on a block-tied entry
  await page.evaluate(() => {
    data.plans.push({ id: "lu", area: "social", pathId: "paF", title: "Lunch with Ana", start: "12:00", end: "13:00", every: 0, days: [4], from: "2026-10-22", until: "", source: "", icsUid: "", kind: "", listen: null, breaks: [] });
    data.plans.push({ id: "k2", area: "social", pathId: "paK", title: "Spending time with my kids", start: "16:00", end: "18:00", every: 0, days: [4], from: "2026-10-22", until: "", source: "", icsUid: "", kind: "", listen: null, breaks: [] });
    data.selected = "2026-10-22"; save(); renderDerived(); openPathLog("", null);
  }); await sleep(400);
  r = await page.evaluate(() => ({ step: !document.getElementById("plStepWrap").hidden, skip: !document.getElementById("plSkipRow").hidden }));
  ok("open time: no stepper or skip", !r.step && !r.skip, r);
  await page.evaluate(() => { const s = document.getElementById("plBlock"); s.value = "k2|2026-10-22"; s.dispatchEvent(new Event("change", { bubbles: true })); }); await sleep(250);
  await tap("#plStepWrap [data-dur-up]"); await sleep(150); await page.click("#plStepWrap [data-dur-up]"); await sleep(200);
  r = await page.evaluate(() => ({ val: document.querySelector("#plStepWrap [data-dur-val]").textContent, t: document.querySelector('#plFields [data-pf="time"]').value, u: document.querySelector('#plFields [data-pf="unit"]').value }));
  ok("picking the kids block shows the stepper at 30 min; + + makes it 40 min in the Time field", r.val === "40 min" && r.t === "40" && r.u === "min", r);
  await page.evaluate(() => document.getElementById("plBlockWrap").scrollIntoView({ block: "start" })); await sleep(200);
  await page.screenshot({ path: SHOTS + "/v463-entry-stepper.png" });
  await page.evaluate(() => { const w = document.querySelector("#plStepWrap"); w.querySelector("[data-dur-val]").click(); w.querySelector("[data-dur-h]").value = "25"; w.querySelector("[data-dur-m]").value = "0"; w.querySelector("[data-dur-set]").click(); });
  r = await page.evaluate(() => ({ t: document.querySelector('#plFields [data-pf="time"]').value, msg: document.querySelector("#plStepWrap [data-dur-msg]").textContent }));
  ok("entry stepper stops at 24 h (the single-entry cap)", r.t === "1440" && /Up to 24 hours/.test(r.msg), r);
  await page.evaluate(() => { const s = document.getElementById("plBlock"); s.value = "lu|2026-10-22"; s.dispatchEvent(new Event("change", { bubbles: true })); }); await sleep(200);
  await tap("#plBlockSkip"); await sleep(300);
  r = await page.evaluate(() => ({ skip: !!(data.planDays["lu|2026-10-22"] || {}).skip, v: document.getElementById("plBlock").value, has: !![...document.getElementById("plBlock").options].find(o => o.value === "lu|2026-10-22"), toast: document.getElementById("toast").textContent }));
  ok("in the entry, 'It didn't happen: skip this block' skips Lunch (no time) and goes back to open time", r.skip && r.v === "" && !r.has && /Lunch with Ana skipped/.test(r.toast), r);
  await page.evaluate(() => { document.querySelector("#toast .toast-act") && document.querySelector("#toast .toast-act").click(); });
  r = await page.evaluate(() => !(data.planDays["lu|2026-10-22"] || {}).skip);
  ok("its Undo brings Lunch back", r, r);
  await A.clean(page);

  // ================= Free time + open time gaps
  r = await page.evaluate(() => { openPlanDay("2026-10-22"); return { gaps: openGaps("2026-10-22").map(g => minHm(g.start) + "-" + minHm(g.end % 1440)), rows: [...document.querySelectorAll("#planDayList .gap-btn")].map(b => N0(b.textContent)) }; function N0(x) { return String(x || "").replace(/[\u202f\u00a0]/g, " ").replace(/\s+/g, " ").trim(); } });
  ok("Thursday's open time between blocks: 7–12, 1–4 PM, 6–11 PM (sleep is not open time)", JSON.stringify(r.gaps) === JSON.stringify(["07:00-12:00", "13:00-16:00", "18:00-23:00"]), r.gaps);
  ok("each gap is a tappable 'Open time' row with start–end and length", r.rows.length === 3 && /^Open time\s*1:00 PM–4:00 PM\s*3 h\s*\+$/.test(r.rows[1]), r.rows);
  await sleep(300);
  await page.screenshot({ path: SHOTS + "/v463-day-open-gaps.png" });
  await page.evaluate(() => document.querySelectorAll("#planDayList .gap-btn")[1].click()); await sleep(400);
  r = await page.evaluate(() => ({ open: document.getElementById("gapDialog").open, when: document.getElementById("gapWhen").textContent.replace(/[\u202f\u00a0]/g, " "), area: document.getElementById("gapArea").value, start: document.getElementById("gapStart").value, len: document.querySelector("#gapStepBox [data-dur-val]").textContent, opts: [...document.getElementById("gapArea").options].map(o => o.textContent) }));
  ok("tapping a gap opens a sheet prefilled with 1:00 PM–4:00 PM · 3 h, Free time in the type dropdown", r.open && /1:00 PM–4:00 PM · 3 h open/.test(r.when) && r.area === "free" && r.start === "13:00" && r.len === "3 h" && r.opts.includes("Free time") && r.opts.includes("Sleep"), r);
  // partial fill: a 1h movie as Free time at 1 PM via the stepper
  await page.evaluate(() => { const w = document.querySelector("#gapStepBox"); w.querySelector("[data-dur-val]").click(); w.querySelector("[data-dur-h]").value = "1"; w.querySelector("[data-dur-m]").value = "30"; w.querySelector("[data-dur-set]").click(); document.getElementById("gapTitle2").value = "Movie"; }); await sleep(200);
  r = await page.evaluate(() => document.getElementById("gapLeft").textContent);
  ok("shorter length says what stays open ('1 h 30 min stays open time.')", r === "1 h 30 min stays open time.", r);
  await page.screenshot({ path: SHOTS + "/v463-gap-sheet.png" });
  await page.click("#gapSave"); await sleep(500);
  r = await page.evaluate(() => ({ plan: data.plans.filter(p => p.area === "free").map(p => [p.start, p.end, p.title, p.pathId]), gaps: openGaps("2026-10-22").map(g => minHm(g.start) + "-" + minHm(g.end % 1440)), dayOpen: document.getElementById("planDayDialog").open }));
  ok("partial fill: Free time 1:00–2:30 PM 'Movie' is added; 2:30–4:00 PM stays open time", JSON.stringify(r.plan) === JSON.stringify([["13:00", "14:30", "Movie", ""]]) && r.gaps.includes("14:30-16:00") && r.dayOpen, r);
  // "Make it free time" one tap on the evening gap
  await page.evaluate(() => [...document.querySelectorAll("#planDayList .gap-btn")].find(b => /6:00 PM/.test(b.textContent)).click()); await sleep(300);
  await page.click("#gapFree"); await sleep(500);
  r = await page.evaluate(() => ({ plan: data.plans.filter(p => p.area === "free").map(p => [p.start, p.end]), planned: plannedHoursFor("2026-10-22").free }));
  ok("'Make it free time' fills the whole gap (6:00–11:00 PM) in one tap", r.plan.some(x => x[0] === "18:00" && x[1] === "23:00") && Math.abs(r.planned - 6.5) < 1e-6, r);
  // another block type in a gap, with a path
  await page.evaluate(() => [...document.querySelectorAll("#planDayList .gap-btn")].find(b => /7:00 AM/.test(b.textContent)).click()); await sleep(300);
  await page.evaluate(() => { const a = document.getElementById("gapArea"); a.value = "career"; a.dispatchEvent(new Event("change")); const p = document.getElementById("gapPath"); p.value = "paW"; p.dispatchEvent(new Event("change")); }); await sleep(100);
  await page.evaluate(() => { const w = document.querySelector("#gapStepBox"); w.querySelector("[data-dur-val]").click(); w.querySelector("[data-dur-h]").value = "2"; w.querySelector("[data-dur-m]").value = "0"; w.querySelector("[data-dur-set]").click(); });
  await page.click("#gapSave"); await sleep(400);
  r = await page.evaluate(() => ({ p: data.plans.filter(p => p.area === "career" && p.from === "2026-10-22").map(p => [p.start, p.end, p.pathId]), gaps: openGaps("2026-10-22").map(g => minHm(g.start) + "-" + minHm(g.end % 1440)) }));
  ok("a Career block from the dropdown fills 7–9 AM; 9 AM–12 PM stays open", JSON.stringify(r.p) === JSON.stringify([["07:00", "09:00", "paW"]]) && r.gaps.includes("09:00-12:00"), r);
  await A.clean(page);
  // confirm free time: counts toward the day, own pie slice, note optional
  r = await page.evaluate(() => {
    const d = "2026-10-22"; data.selected = d;
    const okc = confirmDay(d, document.getElementById("planCard"));
    renderDerived();
    const free = freeHoursFor(d), tot = dayTotal(d);
    const slice = !!document.querySelector('#pie [data-slice="free"]'), legend = (document.querySelector('#legend [data-area="free"]') || {}).textContent || "";
    return { okc, free, tot, slice, legend };
  });
  ok("confirming Free time logs it (1.5h movie + 5h evening = 6.5h) and it counts toward the 24h day", r.okc && Math.abs(r.free - 6.5) < 1e-6 && r.tot >= 6.5, r);
  ok("the pie has its own 'Free time' slice and legend row", r.slice && /Free time/.test(r.legend), r);
  await page.evaluate(() => document.getElementById("timeCard").scrollIntoView({ block: "start" })); await sleep(250);
  await page.screenshot({ path: SHOTS + "/v463-pie-free-time.png" });
  r = await page.evaluate(() => { openPathLog("", null); const s = document.getElementById("plBlock"); const opt = [...s.options].find(o => /Free time|Movie/.test(o.textContent)); return { has: !!opt }; });
  await A.clean(page);
  r = await page.evaluate(() => {
    data.plans.push({ id: "ft3", area: "free", pathId: "", title: "", start: "12:00", end: "13:00", every: 0, days: [5], from: "2026-10-23", until: "", source: "", icsUid: "", kind: "", listen: null, breaks: [] });
    data.selected = "2026-10-23"; save(); openPathLog("", null);
    const s = document.getElementById("plBlock"); s.value = "ft3|2026-10-23"; s.dispatchEvent(new Event("change", { bubbles: true }));
    const area = document.querySelector('#plFields [data-pf="area"]').value;
    document.getElementById("plSave").click();
    const l = data.pathLogs.find(x => x.blockKey === "ft3|2026-10-23");
    return { area, saved: !!l, how: l && l.how, m: l && l.minutes, open: document.getElementById("pathLogDialog").open };
  });
  ok("logging on a Free time block saves with no note and no rating (note optional), counts as Free time", r.area === "free" && r.saved && r.how === undefined && r.m === 30 && !r.open, r);
  // the 24h cap and options sheet apply to free time
  r = await page.evaluate(() => {
    const d = "2026-10-24"; data.selected = d;
    data.tasks.push({ id: "satBig", area: "career", title: "Double shift", hours: 18, status: "done", date: d, notes: "", repeat: "" });
    data.plans.push({ id: "ft4", area: "free", pathId: "", title: "Beach", start: "08:00", end: "16:00", every: 0, days: [6], from: d, until: "", source: "", icsUid: "", kind: "", listen: null, breaks: [] });
    const okc = confirmDay(d, document.getElementById("planCard"));
    const a = document.getElementById("capAlert");
    return { okc, cap: window.__hsLastCap, rows: a ? [...a.querySelectorAll(".cap-row")].map(x => x.dataset.capKind + ":" + x.querySelector("b").textContent) : [] };
  });
  ok("Free time follows the 24h cap: the over-24h sheet lists it as a planned block to change or skip", r.okc === false && /would put Saturday.* at (2[5-9]|3\d)(\.\d)? hours/.test(r.cap) && r.rows.includes("plan:Beach") && r.rows.includes("task:Double shift"), r);
  await page.evaluate(() => { const a = document.getElementById("capAlert"); if (a) a.remove(); });
  // whole day free time on an empty day (sleep untouched, not counted twice)
  r = await page.evaluate(() => {
    const d = "2026-10-25"; openPlanDay(d);
    const btn = document.getElementById("planDayFree"); if (!btn) return { btn: false };
    btn.click();
    const fp = data.plans.filter(p => p.area === "free" && p.from === d).map(p => [p.start, p.end]);
    return { btn: true, fp, planned: plannedHoursFor(d), gaps: openGaps(d).length };
  });
  ok("'Make whole day free time' on an empty Sunday fills 7 AM–11 PM around sleep (16h free + 8h sleep = 24h)", r.btn && JSON.stringify(r.fp) === JSON.stringify([["07:00", "23:00"]]) && Math.abs(r.planned.free - 16) < 1e-6 && Math.abs(r.planned.free + r.planned.sleep - 24) < 1e-6 && r.gaps === 0, r);
  r = await page.evaluate(() => { const d = "2026-10-26"; data.plans = data.plans.filter(p => p.id !== "sl"); data.days[d] = Object.assign(data.days[d] || blankDay(), { sleep: { hours: 8, source: "times", bed: "22:00", wake: "06:00", acked: true } }); save(); openPlanDay(d); document.getElementById("planDayFree").click(); return data.plans.filter(p => p.area === "free" && p.from === d).map(p => [p.start, p.end]); });
  ok("with no planned sleep it uses the logged wake/bed times (6 AM–10 PM), so sleep isn't counted twice", JSON.stringify(r) === JSON.stringify([["06:00", "22:00"]]), r);
  r = await page.evaluate(() => { openPlanDay("2026-10-22"); return !document.getElementById("planDayFree"); });
  ok("'Make whole day free time' only shows on a day with no blocks", r, r);
  await A.clean(page);
  r = await page.evaluate(() => { openPlanEditor({ date: "2026-10-27" }); const a = document.getElementById("planArea"); const has = [...a.options].some(o => o.value === "free" && o.textContent === "Free time"); a.value = "free"; a.dispatchEvent(new Event("change", { bubbles: true })); syncPlanForm(); return { has, pathHidden: document.getElementById("planPathWrap").hidden, icon: areaIconSrc("free") }; });
  ok("'Free time' is a block type in the planner dropdown, with no path and its own icon", r.has && r.pathHidden && /placeholders\/free-time\.png$/.test(r.icon), r);
  await A.clean(page);
  ok("no page errors", errs.length === 0, errs);
  await browser.close(); done();
})();
