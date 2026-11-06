// v39 planned week: first-log button, planned blocks (one area + one path, start/end, weekdays, repeat every
// 1-4 weeks, until), lighter "Planned" slices in the pie that never count as logged, "Did {day} go as planned?"
// confirm, skip / bring back, edit one day vs every time, overnight blocks, the cost line, 24h cap.
// Today is pinned to Wed 21 Oct 2026. Screenshots in TMP: v39-home-first-log, v39-add-planned, v39-pie-planned, v39-confirm-day.
const A = require("./lib/app"); const { sleep, ok, done } = Object.assign({}, A, A.suite());
(async () => {
  const browser = await A.launch(); const { page, errs } = await A.phonePage(browser);
  const tap = async sel => { await page.evaluate(s => { const e = document.querySelector(s); if (e) e.scrollIntoView({ block: "center" }); }, sel); await sleep(150); await page.click(sel); };
  await A.fresh(page); await A.setup(page, "Guillermo", "gui-pass-1");
  let r = await page.evaluate(() => ({ today: TODAY, plans: data.plans, share: data.calShare, b: (document.getElementById("coachFirstLog") || {}).textContent }));
  ok("today is pinned to 2026-10-21", r.today === "2026-10-21", r.today);
  ok("new profile: empty plans, every area + sleep starts as Busy only", Array.isArray(r.plans) && !r.plans.length && Object.keys(r.share).length === 6 && Object.values(r.share).every(v => v === "busy"), r.share);
  ok("Coach card: 'Log your first block of time' when nothing's logged", r.b === "Log your first block of time", r.b);
  await page.screenshot({ path: A.TMP + "/v39-home-first-log.png" });
  // first log: area + path picker
  await tap("#coachFirstLog"); await sleep(400);
  r = await page.evaluate(() => { const d = document.getElementById("planDialog"); return { open: d.open, title: document.getElementById("planDialogTitle").textContent, hint: d.innerText.includes("Pick one. Where did your attention actually go?"), hours: !document.getElementById("planHoursWrap").hidden, repeat: document.getElementById("planRepeatWrap").hidden, sleep: [...document.getElementById("planArea").options].some(o => o.value === "sleep"), path: document.getElementById("planPath").value }; });
  ok("it opens the area + path picker ('Log time', one-area hint, hours, no repeat, no sleep)", r.open && r.title === "Log time" && r.hint && r.hours && r.repeat && !r.sleep && r.path === "__new", r);
  await tap("#planSave"); await sleep(200);
  ok("saving without an area asks for one", await page.evaluate(() => !document.getElementById("planErr").hidden && document.getElementById("planErr").textContent === "Pick an area."));
  await page.select("#planArea", "career"); await sleep(100);
  await page.type("#planNewPath", "Engineer"); await page.click("#planHours", { clickCount: 3 }); await page.type("#planHours", "2");
  await tap("#planSave"); await sleep(500);
  r = await page.evaluate(() => ({ open: document.getElementById("planDialog").open, logs: data.pathLogs.map(l => [l.minutes, l.area, l.source, pathById(l.pathId).name]), h: hoursFor(TODAY).career, btn: !!document.getElementById("coachFirstLog") }));
  ok("first log saved: 2h Career on the new 'Engineer' path, button gone", !r.open && r.logs.length === 1 && r.logs[0][0] === 120 && r.logs[0][1] === "career" && r.logs[0][3] === "Engineer" && r.h === 2 && !r.btn, r);
  // add a planned block through the time card
  await page.evaluate(() => document.getElementById("timeCard").scrollIntoView()); await sleep(200);
  r = await page.evaluate(() => [...document.querySelectorAll("#planCard button")].map(b => b.textContent));
  ok("time card offers 'Planned week' and 'Add a planned block'", r.includes("Planned week") && r.includes("Add a planned block"), r);
  await page.evaluate(() => document.getElementById("planAddHere").scrollIntoView({ block: "center" })); await sleep(300);
  await tap("#planAddHere"); await sleep(400);
  r = await page.evaluate(() => ({ title: document.getElementById("planDialogTitle").textContent, rep: [...document.getElementById("planRepeat").options].map(o => o.textContent), val: document.getElementById("planRepeat").value, until: document.getElementById("planUntilWrap").innerText.replace(/\s+/g, " ").trim(), days: [...document.querySelectorAll("[data-plan-day]")].map(b => b.getAttribute("aria-pressed")) }));
  ok("editor: Repeat Never / Every week / Every 2 / 3 / 4 weeks", JSON.stringify(r.rep) === JSON.stringify(["Never", "Every week", "Every 2 weeks", "Every 3 weeks", "Every 4 weeks"]) && r.val === "1", r.rep);
  ok("editor: 'Until I stop it' / 'Until {date}', today's weekday picked", /^Until Until I stop it Until a date End date/.test(r.until) || /Until I stop it Until a date/.test(r.until), r);
  ok("editor: today's weekday (Wed) pre-picked", r.days[3] === "true" && r.days.filter(x => x === "true").length === 1, r.days);
  await page.select("#planArea", "career"); await page.select("#planPath", await page.evaluate(() => data.paths.find(p => p.name === "Engineer").id));
  await page.type("#planTitle", "Work");
  await page.evaluate(() => { document.getElementById("planStart").value = "09:00"; document.getElementById("planEnd").value = "17:00"; });
  await page.select("#planRepeat", "2"); await sleep(100);
  await tap('[data-plan-day="1"]'); await sleep(100);
  await page.evaluate(() => { document.getElementById("planDate").value = "2026-10-19"; }); // starting Monday
  await tap("#planUntilOn"); await sleep(50);
  await page.evaluate(() => { const u = document.getElementById("planUntil"); u.value = "2026-12-31"; u.dispatchEvent(new Event("input")); }); await sleep(100);
  r = await page.evaluate(() => document.getElementById("planUntilDateText").textContent);
  ok("'Until {date}' shows the picked date", /^Until (Thu,? )?(Dec 31|31 Dec)/.test(r), r);
  await page.screenshot({ path: A.TMP + "/v39-add-planned.png" });
  await tap("#planSave"); await sleep(400);
  r = await page.evaluate(() => data.plans.map(p => ({ area: p.area, title: p.title, start: p.start, end: p.end, every: p.every, days: p.days, from: p.from, until: p.until, path: pathById(p.pathId).name })));
  ok("saved: Work 9-5, every 2 weeks Mon+Wed from Oct 19 until Dec 31, Engineer path", r.length === 1 && JSON.stringify(r[0]) === JSON.stringify({ area: "career", title: "Work", start: "09:00", end: "17:00", every: 2, days: [1, 3], from: "2026-10-19", until: "2026-12-31", path: "Engineer" }), r);
  // repeat intervals
  r = await page.evaluate(() => {
    const p = data.plans[0]; const on = d => planOccursOn(p, d);
    const mk = (every, days, from, until) => ({ id: "x", area: "career", pathId: p.pathId, title: "", start: "09:00", end: "10:00", every, days, from, until: until || "" });
    const list = (q, n) => { const out = []; for (let i = 0; i < n; i++) { const d = shift(q.from, i); if (planOccursOn(q, d)) out.push(d.slice(5)); } return out; };
    return { two: ["2026-10-19", "2026-10-21", "2026-10-26", "2026-10-28", "2026-11-02", "2026-11-04", "2026-12-28", "2027-01-11"].map(on),
      never: list(mk(0, [3], "2026-10-21"), 40), one: list(mk(1, [3], "2026-10-21"), 22), three: list(mk(3, [3], "2026-10-21"), 50), four: list(mk(4, [5], "2026-10-23"), 60),
      until: list(mk(1, [3], "2026-10-21", "2026-11-04"), 60), before: planOccursOn(mk(1, [3], "2026-10-21"), "2026-10-14") };
  });
  ok("every 2 weeks: on in the start week and every other week, off between, off after Until", JSON.stringify(r.two) === JSON.stringify([true, true, false, false, true, true, true, false]), r.two);
  ok("Never = only that one day", JSON.stringify(r.never) === '["10-21"]', r.never);
  ok("every week", JSON.stringify(r.one) === '["10-21","10-28","11-04","11-11"]', r.one);
  ok("every 3 weeks", JSON.stringify(r.three) === '["10-21","11-11","12-02"]', r.three);
  ok("every 4 weeks (Fridays)", JSON.stringify(r.four) === '["10-23","11-20","12-18"]', r.four);
  ok("Until: last one on the Until date, none before the start", JSON.stringify(r.until) === '["10-21","10-28","11-04"]' && !r.before, r.until);
  // pie: planned slices, never counted as logged
  r = await page.evaluate(() => { renderDerived(); return { leg: [...document.querySelectorAll("#legend li.has-plan")].map(li => li.innerText.replace(/\s+/g, " ").trim()), centre: document.getElementById("pieCentre").textContent, slices: document.querySelectorAll("#pie .pie-planned").length, tasks: data.tasks.length, logged: hoursFor(TODAY).career, used: document.getElementById("hoursUsed").textContent, ask: (document.getElementById("planAsk") || {}).innerText }; });
  ok("today's unconfirmed block shows as a lighter 'Planned' slice (8h Career)", r.slices === 1 && r.leg.length === 1 && /Career/.test(r.leg[0]) && /8h/.test(r.leg[0]) && /Planned 8h/.test(r.centre), r);
  ok("planned time isn't logged: tasks and Hours used unchanged (2h)", r.tasks === 1 && r.logged === 2 && /Done 2h/.test(r.centre), r);
  ok("confirm prompt: 'Did today go as planned?' with 'Confirm day' / 'Change something' (+ v42 'Work ran over')", /^Did today go as planned\?\s+Confirm day\s+Change something\s+Work ran over$/.test((r.ask || "").trim()), r.ask);
  await page.evaluate(() => document.getElementById("timeCard").scrollIntoView()); await sleep(200);
  await page.screenshot({ path: A.TMP + "/v39-pie-planned.png" });
  // future days: pie can go ahead and labels them Planned
  await page.evaluate(() => { goToDay("2026-11-02", true); }); await sleep(300);
  r = await page.evaluate(() => ({ sel: data.selected, label: document.getElementById("pieDayLabel").textContent, leg: [...document.querySelectorAll("#legend li.has-plan")].length, ask: !!document.getElementById("planAsk"), next: document.getElementById("pieDayNext").disabled }));
  ok("a future day (Nov 2) shows its planned slice, labelled Planned, no confirm yet", r.sel === "2026-11-02" && /Planned/.test(r.label) && r.leg === 1 && !r.ask && !r.next, r);
  await page.evaluate(() => goToDay(TODAY)); await sleep(200);
  // overnight sleep block
  r = await page.evaluate(() => {
    data.plans.push({ id: "slp", area: "sleep", pathId: "", title: "", start: "22:30", end: "06:30", every: 1, days: [0, 1, 2, 3, 4, 5, 6], from: "2026-10-20", until: "", source: "", icsUid: "" }); save();
    const ph = d => plannedHoursFor(d).sleep;
    return { first: ph("2026-10-20"), today: ph("2026-10-21"), seg: occSegments(planOcc(data.plans[1], "2026-10-21")) };
  });
  ok("overnight 22:30-06:30 splits at midnight: 1.5h + 6.5h", JSON.stringify(r.seg) === JSON.stringify([{ date: "2026-10-21", hours: 1.5 }, { date: "2026-10-22", hours: 6.5 }]), r.seg);
  ok("first night only has its evening part; the next day gets tail + evening (8h)", r.first === 1.5 && r.today === 8, r);
  r = await page.evaluate(() => ({ cost: repeatsCostText(), h: repeatsWeeklyHours() }));
  ok("cost line: Work 8h×2÷2 + sleep 8h×7 = 64h/week → 64×52÷730 ≈ 4.6 months", r.h === 64 && r.cost === "Your repeats take 64 hours a week. That's about 4.6 months a year.", r);
  // 24h cap: today has 2h logged + 8h work + 8h sleep (planned) = fine; push it over with an extra logged block
  await page.evaluate(() => { data.tasks.push({ id: "big", area: "social", title: "Big day", hours: 13, status: "done", date: TODAY, notes: "", repeat: "" }); save(); renderDerived(); });
  await tap("[data-plan-yes]"); await sleep(400);
  r = await page.evaluate(() => ({ logs: data.pathLogs.filter(l => l.source === "plan").length, done: Object.keys(data.planDone).length, ask: !!document.getElementById("planAsk"), cap: window.__hsLastCap || "" }));
  ok("over 24h: confirming is refused, nothing logged, still planned", r.logs === 0 && r.done === 0 && r.ask && /24/.test(r.cap), r);
  await page.evaluate(() => { data.tasks = data.tasks.filter(t => t.id !== "big"); document.querySelectorAll(".cap-blocked,[data-cap-blocked]").forEach(x => x.remove()); save(); renderDerived(); });
  await page.screenshot({ path: A.TMP + "/v39-confirm-day.png" });
  await tap("[data-plan-yes]"); await sleep(500);
  r = await page.evaluate(() => ({ logs: data.pathLogs.filter(l => l.source === "plan").map(l => [l.date, l.minutes, l.planKey]), sleep: data.days["2026-10-21"].sleep, sleepNext: (data.days["2026-10-22"] || {}).sleep, career: hoursFor(TODAY).career, planned: plannedHoursFor(TODAY), ask: !!document.getElementById("planAsk"), toast: document.getElementById("toast").textContent }));
  ok("Yes, as planned: Work becomes 8h logged on Engineer (with its plan key)", r.logs.length === 1 && r.logs[0][0] === "2026-10-21" && r.logs[0][1] === 480 && /\|2026-10-21$/.test(r.logs[0][2]) && r.career === 10, r);
  ok("...sleep logged on both days: last night's tail 6.5h + tonight's 1.5h today, 6.5h tomorrow", r.sleep && r.sleep.hours === 8 && r.sleep.source === "plan" && r.sleepNext && r.sleepNext.hours === 6.5, { sleep: r.sleep, next: r.sleepNext });
  ok("...nothing planned left today, prompt gone, 'Logged.'", Object.values(r.planned).every(v => v === 0) && !r.ask && /Logged\./.test(r.toast), r);
  // yesterday: skip / bring back
  r = await page.evaluate(() => { data.plans.push({ id: "gym", area: "personal", pathId: data.paths[0].id, title: "Gym", start: "18:00", end: "19:00", every: 1, days: [2], from: "2026-10-06", until: "", source: "", icsUid: "" }); save(); openPlanDay("2026-10-20"); return { title: document.getElementById("planDayTitle").textContent, items: [...document.querySelectorAll("#planDayList li")].map(li => li.innerText.replace(/\s+/g, " ").trim()) }; });
  ok("yesterday's sheet lists Gym (Confirm / Edit / Skip / Add to calendar) and last night's sleep", r.items.some(t => /^Gym .*Confirm Edit Skip Add to calendar$/.test(t)) && r.items.some(t => /Sleep/.test(t)), r);
  await tap('[data-occ-skip="gym|2026-10-20"]'); await sleep(300);
  r = await page.evaluate(() => ({ skip: data.planDays["gym|2026-10-20"], ph: plannedHoursFor("2026-10-20").personal, other: plannedHoursFor("2026-10-27").personal, btn: !!document.querySelector('[data-occ-unskip="gym|2026-10-20"]') }));
  ok("Skip: that one day drops out (next week's stays), with 'Bring back'", r.skip && r.skip.skip && r.ph === 0 && r.other === 1 && r.btn, r);
  await tap('[data-occ-unskip="gym|2026-10-20"]'); await sleep(300);
  ok("Bring back restores it", await page.evaluate(() => !data.planDays["gym|2026-10-20"] && plannedHoursFor("2026-10-20").personal === 1));
  // edit just this day
  await tap('[data-occ-edit="gym|2026-10-20"]'); await sleep(300);
  r = await page.evaluate(() => ({ msg: document.getElementById("choiceMsg").textContent, a: document.getElementById("choiceA").textContent, b: document.getElementById("choiceB").textContent }));
  ok("editing a repeat asks 'Change just this day, or every week?' This day / Every time", r.msg === "Change just this day, or every week?" && r.a === "This day" && r.b === "Every time", r);
  await tap("#choiceA"); await sleep(400);
  ok("This day opens 'Change this day'", await page.evaluate(() => document.getElementById("planDialogTitle").textContent === "Change this day" && document.getElementById("planRepeatWrap").hidden));
  await page.evaluate(() => { document.getElementById("planEnd").value = "20:00"; }); await tap("#planSave"); await sleep(400);
  r = await page.evaluate(() => ({ y: plannedHoursFor("2026-10-20").personal, next: plannedHoursFor("2026-10-27").personal, plan: data.plans.find(p => p.id === "gym").end }));
  ok("...only that day changes (2h), the repeat stays 1h", r.y === 2 && r.next === 1 && r.plan === "19:00", r);
  // confirm a single past block from the sheet
  await tap('[data-occ-confirm="gym|2026-10-20"]'); await sleep(400);
  r = await page.evaluate(() => ({ h: hoursFor("2026-10-20").personal, done: !!data.planDone["gym|2026-10-20"] }));
  ok("Confirm on yesterday's Gym logs its changed 2h", r.h === 2 && r.done, r);
  // every time
  await page.evaluate(() => { document.querySelectorAll("dialog[open]").forEach(d => d.close()); openPlanDay("2026-10-27"); }); await sleep(300);
  await tap('[data-occ-edit="gym|2026-10-27"]'); await sleep(300); await tap("#choiceB"); await sleep(400);
  ok("Every time opens the whole repeat", await page.evaluate(() => document.getElementById("planDialogTitle").textContent === "Edit planned block" && !document.getElementById("planRepeatWrap").hidden && document.getElementById("planRepeat").value === "1"));
  await page.evaluate(() => { document.getElementById("planStart").value = "17:00"; }); await tap("#planSave"); await sleep(300);
  ok("...and changes every week", await page.evaluate(() => plannedHoursFor("2026-10-27").personal === 2 && plannedHoursFor("2026-11-03").personal === 2));
  // hand-logged sleep is never overwritten by a confirm
  r = await page.evaluate(() => { data.days["2026-10-23"] = { sleep: { hours: 5, source: "confirm", acked: true } }; const o = planOcc(data.plans.find(p => p.id === "slp"), "2026-10-23"); confirmOcc(o); save(); return data.days["2026-10-23"].sleep; });
  ok("confirming planned sleep keeps sleep you logged by hand", r.hours === 5 && r.source === "confirm", r);
  // Planned week sheet: list, cost, calendar section
  await page.evaluate(() => { document.querySelectorAll("dialog[open]").forEach(d => d.close()); }); await page.evaluate(() => document.getElementById("planWeekOpen").click()); await sleep(400);
  r = await page.evaluate(() => document.getElementById("planWeekDialog").innerText.replace(/\s+/g, " "));
  ok("Planned week sheet: cost line and a Calendar button (v41: calendar options moved to Settings > Calendar)", /Your repeats take \d+(\.\d)? hours a week\. That's about \d+(\.\d)? months a year\./.test(r) && await page.evaluate(() => !!document.getElementById("planWeekCal")), r.slice(0, 600));
  await page.evaluate(() => document.getElementById("planWeekCal").click()); await sleep(400);
  r = await page.evaluate(() => document.getElementById("calDialog").innerText.replace(/\s+/g, " "));
  ok("Calendar sheet: Export / Import, the file note, 'What your calendar shows'", /Export to calendar/.test(r) && /Import from calendar/.test(r) && /Uses a calendar file\. Nothing goes to a server\./.test(r) && /What your calendar shows/.test(r) && /Busy only shows the time as busy, with no name\./.test(r), r.slice(0, 600));
  r = await page.evaluate(() => [...document.querySelectorAll("#calShareRows .cal-share-row")].map(x => x.innerText.replace(/\s+/g, " ").trim() + "|" + [...x.querySelectorAll("[aria-checked=true]")].map(b => b.textContent).join()));
  ok("one row per area (+ Sleep), each 'Show details' / 'Busy only' / 'Leave off', all on Busy only, no 'Don't share'", r.length === 6 && r.every(x => /Show details Busy only Leave off\|Busy only$/.test(x)) && !/Don't share/.test(r.join()), r);
  // survives lock + unlock (normalizer keeps plan logs)
  await page.evaluate(() => document.querySelectorAll("dialog[open]").forEach(d => d.close())); await sleep(600);
  const before = await page.evaluate(() => (() => { const canon = v => Array.isArray(v) ? v.map(canon) : v && typeof v === "object" ? Object.keys(v).sort().reduce((o, k) => (o[k] = canon(v[k]), o), {}) : v; return JSON.stringify(canon({ plans: data.plans, planDays: data.planDays, planDone: data.planDone, logs: data.pathLogs.map(l => [l.source, l.planKey || "", l.minutes]) })); })());
  await A.lock(page); await A.unlock(page, "Guillermo", "gui-pass-1");
  const after = await page.evaluate(() => (() => { const canon = v => Array.isArray(v) ? v.map(canon) : v && typeof v === "object" ? Object.keys(v).sort().reduce((o, k) => (o[k] = canon(v[k]), o), {}) : v; return JSON.stringify(canon({ plans: data.plans, planDays: data.planDays, planDone: data.planDone, logs: data.pathLogs.map(l => [l.source, l.planKey || "", l.minutes]) })); })());
  ok("plans, skips, confirms and plan-logged moments survive lock + unlock unchanged", before === after, [before, after]);
  ok("no page errors", errs.length === 0, errs);
  await browser.close(); done();
})().catch(e => { console.error(e); done(); process.exit(1); });
