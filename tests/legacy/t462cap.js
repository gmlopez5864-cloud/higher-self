// v46.2: the 24-hour cap and the new entry flow.
// Repro of Guillermo's screenshot: "Did today go as planned?" with "Listening: Learn about something" checked said
// "That would put today at 24.8 hours." The day had Sleep 8h and Hobbies 3h logged by hand, and the Hobbies entry was
// the planned Hobbies block (so Confirm added those 3h a second time). The 48 min of listening during the drive is
// concurrent and must never count. Also: overnight sleep split by calendar day, a day still open in grace, the entry flow
// ("Which block?", 30 min seed, "How did it go?" note), a 24h max per entry, and the over-24h options sheet.
// Today is pinned to Wed 21 Oct 2026 (America/Phoenix).
const A = require("./lib/app"); const { sleep, ok, done } = Object.assign({}, A, A.suite());
const SHOTS = process.env.HS_SHOTS || A.TMP;
const N = s => String(s || "").replace(/[\u202f\u00a0]/g, " ").replace(/\s+/g, " ").trim();
(async () => {
  const browser = await A.launch(); const { page, errs } = await A.phonePage(browser);
  const tap = async sel => { await page.evaluate(s => { const e = document.querySelector(s); if (e) e.scrollIntoView({ block: "center" }); }, sel); await sleep(150); await page.click(sel); };
  await page.goto(A.ORIGIN + "/?android=1", { waitUntil: "networkidle0" }); await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle0" }); await A.setup(page, "Guillermo", "gui-pass-1");
  // ---- the screenshot's day
  const seed = () => page.evaluate(() => {
    const mk = (id, name) => ({ id, name, img: PATH_DEFAULT_ICON, created: TODAY, active: true, archived: false, reminder: null });
    data.paths = [mk("paL", "Learn about something"), mk("paH", "Hobbies"), mk("paW", "Work"), mk("paK", "Father")];
    const all = [0, 1, 2, 3, 4, 5, 6];
    const P = (id, area, pathId, title, start, end, extra) => Object.assign({ id, area, pathId, title, start, end, every: 1, days: all, from: "2026-10-01", until: "", source: "", icsUid: "", kind: "", listen: null, breaks: [] }, extra || {});
    data.plans = [
      P("slp", "sleep", "", "", "22:00", "06:00"),
      P("drv", "career", "paW", "Drive to work", "07:00", "07:48", { kind: "drive", listen: { area: "personal", pathId: "paL", title: "Learn about something", minutes: 48 } }),
      P("wrk", "career", "paW", "Work", "08:00", "18:00"),
      P("hob", "time", "paH", "Hobbies", "18:00", "21:00")
    ];
    data.planDone = {}; data.planDays = {}; data.tasks = []; data.pathLogs = [];
    data.days[TODAY] = Object.assign(data.days[TODAY] || blankDay(), { sleep: { hours: 8, source: "confirm", acked: true } });
    // Hobbies 3h logged by hand, on the planned Hobbies block
    const l = { id: "plHob", pathId: "paH", pathIds: ["paH"], date: TODAY, did: "Hobbies", better: "", rating: "good", reps: null, repsUnit: "", pulls: [], steered: [], journal: "", motive: "", clean: "",
      minutes: 180, area: "time", taskId: "", source: "log", logged: true, blockKey: "hob|" + TODAY };
    data.pathLogs.push(l); syncPathTask(l);
    data.selected = TODAY; save(); renderDerived(); renderPlanCard();
    return dayTotal(TODAY);
  });
  let r = await seed();
  ok("setup: today has Sleep 8h + Hobbies 3h logged (11h)", r === 11, r);
  await page.evaluate(() => { openScreen("today"); document.getElementById("timeCard").scrollIntoView(); }); await sleep(300);
  r = await page.evaluate(() => { const b = document.querySelector("#planCard [data-plan-listen]"); return { box: !!b, on: b && b.checked, text: N0(document.getElementById("planCard").innerText) }; function N0(s) { return String(s || "").replace(/\s+/g, " "); } });
  ok("check-in asks 'Did today go as planned?' with 'Listening: Learn about something' checked", r.box && r.on && /Did today go as planned\?/.test(r.text) && /Listening: Learn about something/.test(r.text), r);
  await tap("#planCard [data-plan-yes]"); await sleep(500);
  r = await page.evaluate(() => ({ cap: window.__hsLastCap || "", total: dayTotal(TODAY), done: Object.keys(data.planDone).length,
    listen: data.pathLogs.filter(l => /#listen$/.test(l.planKey)).map(l => ({ m: l.minutes, c: l.countsElapsed, t: l.taskId, a: l.alongside })),
    hob: data.pathLogs.filter(l => l.planKey === "hob|" + TODAY).length, work: hoursFor(TODAY).career }));
  ok("REPRO: Confirm day no longer says 'That would put today at 24.8 hours'", !/24\.8/.test(r.cap) && r.cap === "", r);
  ok("confirmed: 8 sleep + 3 hobbies (logged once) + 0.8 drive + 10 work = 21.8h; listening adds nothing", Math.abs(r.total - 21.8) < 1e-6, r);
  ok("the Hobbies block was not logged a second time on top of the 3h entry", r.hob === 0, r);
  ok("listening is recorded on its path (48 min), counts once: countsElapsed false, no task, alongside the drive", r.listen.length === 1 && r.listen[0].m === 48 && r.listen[0].c === false && !r.listen[0].t && /^drv\|/.test(r.listen[0].a), r);
  ok("drive + work count toward Career (10.8h)", Math.abs(r.work - 10.8) < 1e-6, r.work);
  if (process.env.HS_REPRO_ONLY) { await browser.close(); return done(); } // run against the 46.1 page to see the bug
  // ---- listening never counts, even for an old record that lost its area or kept a linked task
  r = await page.evaluate(() => {
    const before = dayTotal(TODAY);
    const l = { id: "plOld", pathId: "paL", date: TODAY, did: "Podcast", minutes: 120, area: "", taskId: "tOld", source: "plan", logged: true, planKey: "old|" + TODAY + "#listen", countsElapsed: false, alongside: "old|" + TODAY };
    data.pathLogs.push(l); data.tasks.push({ id: "tOld", area: "personal", title: "Podcast", hours: 2, status: "done", date: TODAY, notes: "", repeat: "", pathLogId: "plOld" });
    const mid = dayTotal(TODAY);
    const pie = hoursFor(TODAY).personal;
    save();
    return { before, mid, pie };
  });
  ok("an area-less listen record and a stray linked task add 0h to the 24h total", Math.abs(r.mid - r.before) < 1e-6, r);
  await A.lock(page); await A.unlock(page, "Guillermo", "gui-pass-1");
  r = await page.evaluate(() => ({ t: data.tasks.filter(t => t.pathLogId === "plOld").length, l: !!data.pathLogs.find(l => l.id === "plOld") }));
  ok("on unlock the stray task linked to a listen is dropped (the listen moment stays)", r.t === 0 && r.l, r);
  // ---- overnight split + no double sleep
  r = await page.evaluate(() => ({ today: data.days[TODAY].sleep, next: (data.days[shift(TODAY, 1)] || {}).sleep, prev: (data.days[shift(TODAY, -1)] || {}).sleep,
    segs: occSegments(planOcc(data.plans[0], TODAY)) }));
  ok("overnight 22:00-06:00 splits 2h today + 6h tomorrow", JSON.stringify(r.segs) === JSON.stringify([{ date: "2026-10-21", hours: 2 }, { date: "2026-10-22", hours: 6 }]), r.segs);
  ok("hand-logged 8h sleep today is kept (planned sleep doesn't stack on it); tomorrow gets only its 6h", r.today.hours === 8 && r.today.source === "confirm" && r.next && r.next.hours === 6, r);
  // ---- grace: yesterday (still open) only compares yesterday's own hours
  r = await page.evaluate(() => {
    const y = shift(TODAY, -1);
    data.tasks.push({ id: "yBig", area: "social", title: "Long visit", hours: 15, status: "done", date: y, notes: "", repeat: "" });
    const st = standingFor(y);
    const ok1 = confirmDay(y, document.getElementById("planCard"));
    const cap1 = window.__hsLastCap; const tot = dayTotal(y);
    return { st, ok1, cap1, tot };
  });
  ok("a day in grace confirms against its own calendar day only (15 + 0.8 + 10 + 3 + 8 sleep = 36.8 > 24 is refused for Tuesday; nothing logged)", r.ok1 === false && /Tuesday/.test(r.cap1) && /36\.8/.test(r.cap1) && r.tot === 17, r);
  // ---- the over-24h options sheet (Confirm day)
  r = await page.evaluate(() => { const a = document.getElementById("capAlert"); return a ? { rows: [...a.querySelectorAll(".cap-row")].map(x => x.dataset.capKind + ":" + N0(x.querySelector(".cap-name b").textContent)), retry: !!a.querySelector("#capRetry"), listen: /Listening during a drive doesn't count/.test(a.textContent), room: N0(a.querySelector(".cap-room").textContent) } : null; function N0(s) { return String(s || "").replace(/\s+/g, " ").trim(); } });
  ok("over 24h shows options: make room on that day, list of entries and planned blocks, Try again", r && r.retry && r.listen && /Or make room on Tuesday/.test(r.room) && r.rows.some(x => x === "task:Long visit") && r.rows.some(x => /^plan:/.test(x)), r);
  await page.evaluate(() => { document.getElementById("capAlert").scrollIntoView({ block: "center" }); }); await sleep(200);
  await page.screenshot({ path: SHOTS + "/v462-over24-confirm.png" });
  // edit "Long visit" to 4h in place, then Try again
  r = await page.evaluate(() => {
    const a = document.getElementById("capAlert"); const row = [...a.querySelectorAll(".cap-row")].find(x => x.dataset.capId === "yBig");
    row.querySelector("[data-cap-h]").value = "1"; row.querySelector("[data-cap-save]").click();
    const a2 = document.getElementById("capAlert");
    return { h: data.tasks.find(t => t.id === "yBig").hours, status: a2.querySelector(".cap-status").textContent };
  });
  ok("an entry's hours can be changed right in the sheet; it shows what's left", r.h === 1 && /Tuesday.*has .*h logged/.test(r.status), r);
  r = await page.evaluate(() => { document.getElementById("capRetry").click(); return { y: dayTotal(shift(TODAY, -1)), alert: !!document.getElementById("capAlert"), done: Object.keys(data.planDone).filter(k => k.endsWith(shift(TODAY, -1))).length }; });
  ok("Try again confirms Tuesday once it fits (≤ 24h) and closes the sheet", r.y <= 24 + 1e-6 && !r.alert && r.done >= 3, r);
  // cancel a planned block from the sheet
  r = await page.evaluate(() => {
    const d2 = shift(TODAY, -2);
    data.tasks.push({ id: "mBig", area: "social", title: "Trip", hours: 12, status: "done", date: d2, notes: "", repeat: "" });
    const ok1 = confirmDay(d2, document.getElementById("planCard"));
    const a = document.getElementById("capAlert"); if (!a) return { ok1, noAlert: true, cap: window.__hsLastCap }; const row = [...a.querySelectorAll(".cap-row")].find(x => x.dataset.capKind === "plan" && /Work/.test(x.textContent)); if (!row) return { ok1, rows: a.innerText };
    row.querySelector("[data-cap-cancel]").click();
    const skipped = !!(data.planDays["wrk|" + d2] && data.planDays["wrk|" + d2].skip);
    document.getElementById("capRetry").click();
    return { ok1, skipped, tot: dayTotal(d2), work: hoursFor(d2).career };
  });
  ok("a planned block can be skipped from the sheet, then the day confirms (Work not logged)", r.ok1 === false && r.skipped && r.tot <= 24 + 1e-6 && Math.abs(r.work - 0.8) < 1e-6, r);
  // ---- entry flow: Which block?
  await page.evaluate(() => {
    data.plans.push({ id: "kids", area: "social", pathId: "paK", title: "Spending time with my kids", start: "16:00", end: "19:00", every: 0, days: [3], from: "2026-10-22", until: "", source: "", icsUid: "", kind: "", listen: null, breaks: [] });
    data.plans.push({ id: "dent", area: "personal", pathId: "paL", title: "Dentist", start: "10:00", end: "11:00", every: 0, days: [3], from: "2026-10-22", until: "", source: "phone", icsUid: "x1", kind: "", listen: null, breaks: [] });
    data.selected = shift(TODAY, 1); save(); renderDerived();
    openPathLog("", null);
  });
  await sleep(400);
  r = await page.evaluate(() => {
    const sel = document.getElementById("plBlock");
    return { v: sel.value, groups: [...sel.querySelectorAll("optgroup")].map(g => g.label + ":" + [...g.querySelectorAll("option")].map(o => o.textContent.split(" · ")[0]).join("|")),
      first: sel.options[0].textContent, hint: document.getElementById("plBlockHint").textContent, how: !!document.getElementById("plHow"), pill: !!(sel.__isel && sel.__isel.btn) };
  });
  ok("entry opens on 'Open time (not in a block)' with the hint 'This goes into open time.'", r.v === "" && r.first === "Open time (not in a block)" && r.hint === "This goes into open time.", r);
  ok("'Which block?' lists your own blocks first, then calendar events", r.groups[0] && /^Your blocks:/.test(r.groups[0]) && /Spending time with my kids/.test(r.groups[0]) && /^From your calendar:Dentist/.test(r.groups[1] || ""), r.groups);
  ok("'Which block?' is the same inline dropdown pill as the others; 'How did it go?' has a note box", r.pill && r.how, r);
  await page.evaluate(() => { const s = document.getElementById("plBlock"); s.value = [...s.options].find(o => /kids/.test(o.textContent)).value; s.dispatchEvent(new Event("change", { bubbles: true })); }); await sleep(250);
  r = await page.evaluate(() => { const g = k => document.querySelector('#plFields [data-pf="' + k + '"]'); return { did: g("did").value, area: g("area").value, paths: [...g("paths").selectedOptions].map(o => o.value), t: g("time").value, u: g("unit").value, hint: N0(document.getElementById("plBlockHint").textContent) }; function N0(s) { return String(s || "").replace(/[\u202f\u00a0]/g, " ").replace(/\s+/g, " ").trim(); } });
  ok("picking 'Spending time with my kids' fills what/area/path and starts at 30 min", r.did === "Spending time with my kids" && r.area === "social" && r.paths.join() === "paK" && r.t === "30" && r.u === "min", r);
  ok("the hint names the block and its times", /Spending time with my kids · 4:00 PM–7:00 PM\. Starts at 30 min/.test(r.hint), r.hint);
  await page.evaluate(() => { const t = document.querySelector('#plFields [data-pf="time"]'); t.value = "45"; document.getElementById("plHow").value = "We built a fort. Good talk."; document.querySelector('#plRating [data-plrate="good"]').click(); }); await sleep(150);
  await page.evaluate(() => document.getElementById("plBlockWrap").scrollIntoView({ block: "start" })); await sleep(200);
  await page.screenshot({ path: SHOTS + "/v462-entry-block.png" });
  await page.evaluate(() => document.getElementById("plHow").scrollIntoView({ block: "center" })); await sleep(200);
  await page.screenshot({ path: SHOTS + "/v462-entry-how.png" });
  await tap("#plSave"); await sleep(400);
  r = await page.evaluate(() => { const l = data.pathLogs.find(x => x.blockKey === "kids|2026-10-22"); return l ? { m: l.minutes, how: l.how, area: l.area, date: l.date, planned: plannedHoursFor("2026-10-22").social } : null; });
  ok("saved: 45 min on the kids block, with the 'How did it go?' note", r && r.m === 45 && r.how === "We built a fort. Good talk." && r.area === "social" && r.date === "2026-10-22", r);
  ok("the block's planned time drops by what you logged (3h → 2.25h left)", r && Math.abs(r.planned - 2.25) < 1e-6, r);
  await A.lock(page); await A.unlock(page, "Guillermo", "gui-pass-1");
  r = await page.evaluate(() => { const l = data.pathLogs.find(x => x.blockKey === "kids|2026-10-22"); return l ? { how: l.how, bk: l.blockKey } : null; });
  ok("block link and note survive lock/unlock", r && r.how === "We built a fort. Good talk." && r.bk === "kids|2026-10-22", r);
  r = await page.evaluate(() => { const l = data.pathLogs.find(x => x.blockKey === "kids|2026-10-22"); openPathLog(l.pathId, l.id); return { v: document.getElementById("plBlock").value, how: document.getElementById("plHow").value }; });
  ok("editing the entry shows its block and note again", r.v === "kids|2026-10-22" && r.how === "We built a fort. Good talk.", r);
  await A.clean(page);
  // confirm that day: kids block logs only the rest (2.25h)
  r = await page.evaluate(() => { const d = "2026-10-22"; ["drv", "wrk", "hob"].forEach(id => { data.planDays[id + "|" + d] = { skip: true }; }); const before = hoursFor(d).social; const okc = confirmDay(d, document.getElementById("planCard")); return { okc, social: hoursFor(d).social, before, cap: window.__hsLastCap }; });
  ok("Confirm day then logs only the rest of the kids block: 0.75 + 2.25 = 3h social, not 3.75", Math.abs(r.social - 3) < 1e-6, r);
  // open time: no block
  r = await page.evaluate(() => { openPathLog("", null); const g = k => document.querySelector('#plFields [data-pf="' + k + '"]'); g("did").value = "Walk"; g("time").value = "20"; g("area").value = "personal"; document.getElementById("plSave").click(); const l = data.pathLogs.find(x => x.did === "Walk"); return l ? { bk: l.blockKey, m: l.minutes } : null; });
  ok("an entry with no block goes into open time (no block link)", r && r.bk === undefined && r.m === 20, r);
  // ---- 24h max for a single entry
  r = await page.evaluate(() => { openPathLog("", null); const g = k => document.querySelector('#plFields [data-pf="' + k + '"]'); g("did").value = "Too long"; g("time").value = "25"; g("unit").value = "h"; g("area").value = "career"; document.getElementById("plSave").click();
    return { saved: !!data.pathLogs.find(x => x.did === "Too long"), msg: document.getElementById("plNeedRating").textContent, open: document.getElementById("pathLogDialog").open }; });
  ok("an entry over 24h is refused: 'One entry can be up to 24 hours.'", !r.saved && r.msg === "One entry can be up to 24 hours." && r.open, r);
  await A.clean(page);
  r = await page.evaluate(() => { const n = data.tasks.length; const t = addTask("career", "Huge", 30, "", false); return { t: !!t, n: data.tasks.length - n, cap: window.__hsLastCap }; });
  ok("a task over 24h is refused with the same message", !r.t && r.n === 0 && r.cap === "One entry can be up to 24 hours.", r);
  r = await page.evaluate(() => { document.getElementById("capAlert") && document.getElementById("capAlert").remove(); const n = data.tasks.length; const t = addTask("career", "Exactly a day", 24, "", false); return { n: data.tasks.length - n, cap: window.__hsLastCap }; });
  ok("24h itself is allowed by the per-entry rule (the day cap still decides)", !/One entry can be up/.test(r.cap), r);
  await page.evaluate(() => { const a = document.getElementById("capAlert"); if (a) a.remove(); data.tasks = data.tasks.filter(t => t.title !== "Exactly a day"); save(); });
  // ---- over-24h sheet from an entry: change this entry's time / change others
  await page.evaluate(() => { data.selected = "2026-10-23"; if (data.days["2026-10-23"]) delete data.days["2026-10-23"].sleep; data.tasks.push({ id: "fri1", area: "career", title: "Overtime", hours: 14, status: "done", date: "2026-10-23", notes: "", repeat: "" }, { id: "fri2", area: "time", title: "Gaming", hours: 6, status: "done", date: "2026-10-23", notes: "", repeat: "" }); save(); renderDerived(); openPathLog("", null); });
  await sleep(300);
  await page.evaluate(() => { const g = k => document.querySelector('#plFields [data-pf="' + k + '"]'); g("did").value = "Reading"; g("time").value = "5"; g("unit").value = "h"; g("area").value = "personal"; });
  await tap("#plSave"); await sleep(400);
  r = await page.evaluate(() => { const a = document.getElementById("capAlert"); return a ? { inDialog: !!a.closest("#pathLogDialog"), msg: a.querySelector(".cap-msg").textContent, edit: (a.querySelector("#capChange") || {}).textContent, rows: [...a.querySelectorAll(".cap-row")].map(x => x.dataset.capId), saved: !!data.pathLogs.find(x => x.did === "Reading") } : null; });
  ok("entry that pushes Friday past 24h: options sheet inside the entry, 'Change this entry's time' + the day's entries", r && r.inDialog && /would put Friday.* at 25 hours/.test(r.msg) && r.edit === "Change this entry's time" && r.rows.join() === "fri1,fri2" && !r.saved, r);
  await page.evaluate(() => document.getElementById("capAlert").scrollIntoView({ block: "start" })); await sleep(200);
  await page.screenshot({ path: SHOTS + "/v462-over24-entry.png" });
  r = await page.evaluate(() => { const a = document.getElementById("capAlert"); [...a.querySelectorAll(".cap-row")].find(x => x.dataset.capId === "fri2").querySelector("[data-cap-cancel]").click();
    return { gone: !data.tasks.find(t => t.id === "fri2"), status: document.querySelector("#capAlert .cap-status").textContent }; });
  ok("cancel another entry inline (Gaming 6h) and the sheet updates", r.gone && /14h logged\. 10h left/.test(r.status), r);
  r = await page.evaluate(() => { document.getElementById("capRetry").click(); return { saved: !!data.pathLogs.find(x => x.did === "Reading"), tot: dayTotal("2026-10-23"), open: document.getElementById("pathLogDialog").open }; });
  ok("Try again saves the entry once it fits (19h)", r.saved && Math.abs(r.tot - 19) < 1e-6 && !r.open, r);
  // 'Change this entry's time' focuses the time field
  await page.evaluate(() => { openPathLog("", null); const g = k => document.querySelector('#plFields [data-pf="' + k + '"]'); g("did").value = "More"; g("time").value = "8"; g("unit").value = "h"; g("area").value = "personal"; document.getElementById("plSave").click(); });
  await sleep(300);
  r = await page.evaluate(() => { document.getElementById("capChange").click(); return { focus: document.activeElement && document.activeElement.dataset.pf, alert: !!document.getElementById("capAlert") }; });
  ok("'Change this entry's time' closes the sheet and puts you on the time field", r.focus === "time" && !r.alert, r);
  await A.clean(page);
  r = await page.evaluate(() => shownVersion());
  ok("Android shows version 46.2", r === "46.2", r);
  ok("no page errors", errs.length === 0, errs);
  await browser.close(); done();
})();
