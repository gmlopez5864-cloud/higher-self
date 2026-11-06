// v40 overnight blocks: a block whose end is at or before its start ends the next day (+24h). Covers the math
// (22:00-07:00, 23:30-06:00, 20:00-04:00, 00:00-08:00, 13:00-14:00, start = end), the planned pie for future days,
// no double-counted sleep (hand-logged sleep + planned sleep used to show 9h + 9h), "Did {day} go as planned?",
// the weekly repeat total, .ics export/import across midnight, sleep bed/wake logging, and the live
// "Ends tomorrow at {time} · {h}h" hint under every start/end pair. Today is pinned to Wed 21 Oct 2026.
const A = require("./lib/app"); const { sleep, ok, done } = Object.assign({}, A, A.suite());
const SHOTS = process.env.HS_SHOTS || A.TMP;
const N = s => String(s || "").replace(/[\u202f\u00a0]/g, " ").replace(/\s+/g, " ").trim();
(async () => {
  const browser = await A.launch(); const { page, errs } = await A.phonePage(browser);
  const tap = async sel => { await page.evaluate(s => { const e = document.querySelector(s); if (e) e.scrollIntoView({ block: "center" }); }, sel); await sleep(150); await page.click(sel); };
  await A.fresh(page); await A.setup(page, "Guillermo", "gui-pass-1");
  // ---- math
  let r = await page.evaluate(() => {
    const seg = (s, e) => occSegments({ start: s, end: e, date: "2026-10-21" }).map(x => [x.date.slice(5), x.hours]);
    return { a: seg("22:00", "07:00"), b: seg("23:30", "06:00"), c: seg("20:00", "04:00"), d: seg("00:00", "08:00"), e: seg("13:00", "14:00"), f: seg("21:00", "00:00"),
      len: [["22:00", "07:00"], ["23:30", "06:00"], ["20:00", "04:00"], ["00:00", "08:00"], ["13:00", "14:00"]].map(([s, e]) => occHours({ start: s, end: e, date: "2026-10-21" })),
      span: [spanMins("22:00", "07:00"), spanMins("13:00", "14:00"), spanMins("07:00", "07:00"), spanMins("", "07:00"), spanMins("7:00", "08:00")],
      sleep: [sleepHours("22:00", "07:00"), sleepHours("23:30", "06:00"), sleepHours("20:00", "04:00"), sleepHours("00:00", "08:00"), sleepHours("13:00", "14:00")] };
  });
  ok("22:00-07:00 splits 2h on day 1 + 7h on day 2", JSON.stringify(r.a) === '[["10-21",2],["10-22",7]]', r.a);
  ok("23:30-06:00 splits 0.5h + 6h", JSON.stringify(r.b) === '[["10-21",0.5],["10-22",6]]', r.b);
  ok("20:00-04:00 splits 4h + 4h", JSON.stringify(r.c) === '[["10-21",4],["10-22",4]]', r.c);
  ok("00:00-08:00 stays on one day: 8h", JSON.stringify(r.d) === '[["10-21",8]]', r.d);
  ok("13:00-14:00: 1h, same day", JSON.stringify(r.e) === '[["10-21",1]]', r.e);
  ok("21:00-00:00 (ends at midnight): 3h on day 1, nothing on day 2", JSON.stringify(r.f) === '[["10-21",3]]', r.f);
  ok("block lengths 9, 6.5, 8, 8, 1 (never 24 - x)", JSON.stringify(r.len) === "[9,6.5,8,8,1]", r.len);
  ok("spanMins: end before start wraps +24h; start = end is 24h; bad input is null", r.span[0].mins === 540 && r.span[0].over && r.span[1].mins === 60 && !r.span[1].over && r.span[2].mins === 1440 && r.span[3] === null && r.span[4] === null, r.span);
  ok("sleepHours bed/wake: 9, 6.5, 8, 8, 1", JSON.stringify(r.sleep) === "[9,6.5,8,8,1]", r.sleep);
  // ---- hint text helper
  r = await page.evaluate(() => [["22:00", "07:00"], ["23:30", "06:00"], ["20:00", "04:00"], ["00:00", "08:00"], ["13:00", "14:00"], ["22:00", "06:30"], ["07:00", "07:00"]].map(([s, e]) => spanHintText(s, e, { sameMsg: PLAN_COPY.sameTimes })));
  r = r.map(N);
  ok("hint: 22:00-07:00 -> 'Ends tomorrow at 7:00 AM · 9h'", r[0] === "Ends tomorrow at 7:00 AM · 9h", r);
  ok("hint: 23:30-06:00 -> 'Ends tomorrow at 6:00 AM · 6.5h'", r[1] === "Ends tomorrow at 6:00 AM · 6.5h", r);
  ok("hint: 20:00-04:00 -> 'Ends tomorrow at 4:00 AM · 8h'", r[2] === "Ends tomorrow at 4:00 AM · 8h", r);
  ok("hint: 00:00-08:00 -> '8h' (same day)", r[3] === "8h", r);
  ok("hint: 13:00-14:00 -> '1h'", r[4] === "1h", r);
  ok("hint: 22:00-06:30 -> 'Ends tomorrow at 6:30 AM · 8.5h'", r[5] === "Ends tomorrow at 6:30 AM · 8.5h", r);
  ok("hint: start = end says to pick an end time (save rejects it)", r[6] === "Start and end are the same. Pick an end time.", r);
  // ---- plan editor: live hint, typed 12-hour input, save
  await page.evaluate(() => { document.getElementById("timeCard").scrollIntoView(); }); await sleep(200);
  await tap("#planAddHere"); await sleep(400);
  const hint = () => page.evaluate(() => { const h = document.getElementById("planTimesHint"); return { t: h.textContent, shown: !h.hidden && h.offsetParent !== null }; });
  r = await hint();
  ok("editor opens with the default 9-5 hint '8h'", N(r.t) === "8h" && r.shown, r);
  await page.select("#planArea", "sleep"); await sleep(100);
  // type 10:00 PM and 7:00 AM the way a 12-hour time field takes them
  await page.click("#planStart"); await page.keyboard.type("1000P"); await sleep(100);
  await page.click("#planEnd"); await page.keyboard.type("0700A"); await sleep(150);
  r = await page.evaluate(() => ({ s: document.getElementById("planStart").value, e: document.getElementById("planEnd").value }));
  ok("typed 10:00 PM / 7:00 AM land as 22:00 / 07:00", r.s === "22:00" && r.e === "07:00", r);
  r = await hint();
  ok("hint updates live: 'Ends tomorrow at 7:00 AM · 9h'", N(r.t) === "Ends tomorrow at 7:00 AM · 9h" && r.shown, r);
  const setT = (id, v) => page.evaluate((id, v) => { const el = document.getElementById(id); el.value = v; el.dispatchEvent(new Event("input", { bubbles: true })); }, id, v);
  await setT("planEnd", "22:00"); r = await hint();
  ok("hint: end = start -> 'Start and end are the same…'", N(r.t) === "Start and end are the same. Pick an end time.", r);
  await tap("#planSave"); await sleep(200);
  r = await page.evaluate(() => ({ err: document.getElementById("planErr").hidden ? "" : document.getElementById("planErr").textContent, n: data.plans.length, open: document.getElementById("planDialog").open }));
  ok("saving with start = end is rejected, nothing saved", r.err === "Pick a start and an end time." && r.n === 0 && r.open, r);
  await setT("planEnd", "23:00"); r = await hint();
  ok("hint: 22:00-23:00 -> '1h'", N(r.t) === "1h", r);
  await setT("planEnd", "07:00");
  await page.evaluate(() => { document.getElementById("planDate").value = "2026-10-21"; });
  await page.select("#planRepeat", "1"); await sleep(100);
  await page.evaluate(() => { planDaysPick = [0, 1, 2, 3, 4, 5, 6]; syncPlanForm(); }); await sleep(100);
  r = await hint();
  ok("hint survives a form re-render", N(r.t) === "Ends tomorrow at 7:00 AM · 9h", r);
  ok("changing a time clears the old 'Pick a start and an end time.' error", await page.evaluate(() => document.getElementById("planErr").hidden));
  await page.screenshot({ path: SHOTS + "/v40-add-overnight-sleep.png" });
  await tap("#planSave"); await sleep(400);
  r = await page.evaluate(() => data.plans.map(p => [p.area, p.start, p.end, p.every, p.days.length, p.from]));
  ok("saved: Sleep 22:00-07:00 every day from Wed Oct 21", JSON.stringify(r) === '[["sleep","22:00","07:00",1,7,"2026-10-21"]]', r);
  await page.evaluate(() => openPlanWeek()); await sleep(400);
  r = await page.evaluate(() => ({ cost: document.getElementById("planCost").textContent, row: document.getElementById("planRepeatList").innerText.replace(/[\u202f\u00a0]/g, " ").replace(/\s+/g, " ") }));
  ok("Planned week sheet: 'Sleep 10:00 PM–7:00 AM' and 'Your repeats take 63 hours a week'", /10:00 PM–7:00 AM/.test(r.row) && /^Your repeats take 63 hours a week/.test(r.cost), r);
  await page.screenshot({ path: SHOTS + "/v40-planned-week-overnight.png" });
  await page.evaluate(() => document.getElementById("planWeekDialog").close()); await sleep(200);
  // ---- weekly repeat total
  r = await page.evaluate(() => ({ h: repeatsWeeklyHours(), t: repeatsCostText() }));
  ok("weekly repeats: 9h x 7 = 63h", r.h === 63 && /^Your repeats take 63 hours a week/.test(r.t), r);
  r = await page.evaluate(() => {
    const keep = data.plans; data.plans = [{ id: "w1", area: "sleep", pathId: "", title: "", start: "23:30", end: "06:00", every: 1, days: [1], from: "2026-10-19", until: "", source: "", icsUid: "" },
      { id: "w2", area: "sleep", pathId: "", title: "", start: "20:00", end: "04:00", every: 2, days: [2], from: "2026-10-19", until: "", source: "", icsUid: "" }];
    const h = repeatsWeeklyHours(); data.plans = keep; return h;
  });
  ok("weekly repeats: 23:30-06:00 weekly (6.5) + 20:00-04:00 every 2 weeks (4) = 10.5h", r === 10.5, r);
  // ---- planned pie for future days
  const legend = () => page.evaluate(() => [...document.querySelectorAll("#legend li")].map(l => [l.classList.contains("has-plan") ? "P:" : "", ...[...l.querySelectorAll("span")].map(s => s.textContent)].join("")).filter(x => /Sleep|Open/.test(x)));
  const pieDay = async d => { await page.evaluate(d => { data.selected = d; renderDerived(); }, d); await sleep(150); return legend(); };
  r = await page.evaluate(() => ["2026-10-21", "2026-10-22", "2026-10-23", "2026-10-28"].map(d => plannedHoursFor(d).sleep));
  ok("planned sleep: first night 2h on Wed, then 9h a day (7h morning + 2h evening)", JSON.stringify(r) === "[2,9,9,9]", r);
  r = await pieDay("2026-10-23");
  ok("future day pie: Sleep (planned) 9h, open 15h, total 24h", JSON.stringify(r) === JSON.stringify(["P:Sleep0h of 9h planned", "Open time15h"]), r);
  await page.evaluate(() => { data.selected = "2026-10-22"; renderDerived(); document.getElementById("timeCard").scrollIntoView({ block: "start" }); }); await sleep(300);
  await page.screenshot({ path: SHOTS + "/v40-pie-planned-overnight.png" });
  r = await page.evaluate(() => { const out = []; for (let i = -1; i < 60; i++) { const d = shift(TODAY, i); const p = plannedHoursFor(d); const t = Object.values(p).reduce((a, b) => a + b, 0) + dayUsed(d).used; if (t > 24) out.push([d, t]); } return out; });
  ok("no day's planned + logged total passes 24h", r.length === 0, r);
  // add work 13:00-14:00 and 20:00-04:00 one-off; still <= 24 on each day
  r = await page.evaluate(() => {
    data.plans.push({ id: "pw", area: "career", pathId: "", title: "Lunch call", start: "13:00", end: "14:00", every: 1, days: [1, 2, 3, 4, 5], from: "2026-10-21", until: "", source: "", icsUid: "" });
    const a = plannedHoursFor("2026-10-22"); data.plans.pop(); return a;
  });
  ok("Thu: 9h sleep + 1h 13:00-14:00 block, kept apart", r.sleep === 9 && r.career === 1, r);
  // ---- hand-logged sleep is not counted twice
  r = await page.evaluate(() => { day("2026-10-22").sleep = { hours: 9, source: "times", bed: "22:00", wake: "07:00", acked: true }; save(); return plannedHoursFor("2026-10-22").sleep; });
  ok("a day with sleep logged by hand drops planned sleep (was 9h + 9h = 18h)", r === 0, r);
  r = await pieDay("2026-10-22");
  ok("pie on that day: Sleep 9h, no planned sleep, open 15h", JSON.stringify(r) === JSON.stringify(["Sleep9h", "Open time15h"]), r);
  await page.evaluate(() => { delete data.days["2026-10-22"].sleep; save(); });
  // ---- confirm "Did {day} go as planned?"
  r = await page.evaluate(() => {
    data.plans[0].from = "2026-10-19"; // started Monday
    day("2026-10-19").sleep = { hours: 7.5, source: "times", bed: "23:30", wake: "07:00", acked: true }; // Monday's sleep logged by hand
    save(); return pendingOccs("2026-10-20").map(o => o.date);
  });
  ok("Tue has two pending sleep pieces (Mon night's morning, Tue night's evening)", JSON.stringify(r) === '["2026-10-19","2026-10-20"]', r);
  await page.evaluate(() => { data.selected = "2026-10-20"; renderDerived(); }); await sleep(200);
  r = await page.evaluate(() => ((document.getElementById("planAsk") || {}).innerText || "").split("\n")[0]);
  ok("time card asks 'Did yesterday go as planned?'", r === "Did yesterday go as planned?", r);
  await tap("#planYes"); await sleep(400);
  r = await page.evaluate(() => ["2026-10-19", "2026-10-20", "2026-10-21"].map(d => data.days[d] && data.days[d].sleep).map(s => s ? [s.hours, s.source] : null));
  ok("confirm Tue: Mon keeps the hand-logged 7.5h, Tue = 7h + 2h = 9h, Wed gets the 7h morning", JSON.stringify(r) === '[[7.5,"times"],[9,"plan"],[7,"plan"]]', r);
  r = await pieDay("2026-10-20");
  ok("Tue pie after confirm: Sleep 9h, no planned sleep left", JSON.stringify(r) === JSON.stringify(["Sleep9h", "Open time15h"]), r);
  r = await pieDay("2026-10-21");
  ok("Wed (today) pie: 7h confirmed + 2h tonight planned = 9h, not 18h", JSON.stringify(r) === JSON.stringify(["P:Sleep7h done · 2h planned", "Open time15h"]), r);
  // confirming never overwrites hand-logged sleep on the morning day
  r = await page.evaluate(() => {
    day("2026-10-21").sleep = { hours: 8, source: "confirm", acked: true };
    const o = planOcc(data.plans[0], "2026-10-21"); confirmOcc(o);
    return [data.days["2026-10-21"].sleep, data.days["2026-10-22"].sleep];
  });
  ok("confirm Wed: Wed's 'Confirm 8h' stays 8h (no +2h), Thu gets 7h", r[0].hours === 8 && r[0].source === "confirm" && r[1].hours === 7 && r[1].source === "plan", r);
  // the first night of a plan: only the evening piece is on that day -> it is not logged as "a 2h night"
  r = await page.evaluate(() => {
    data.plans.push({ id: "pf", area: "sleep", pathId: "", title: "", start: "21:00", end: "07:00", every: 0, days: [5], from: "2026-10-16", until: "", source: "", icsUid: "" });
    const o = planOcc(data.plans[1], "2026-10-16"); confirmOcc(o);
    const out = [data.days["2026-10-16"] && data.days["2026-10-16"].sleep, data.days["2026-10-17"] && data.days["2026-10-17"].sleep];
    data.plans.pop(); return out;
  });
  ok("a lone 21:00-07:00 night: Fri isn't logged as a 3h night, Sat gets the 7h", !r[0] && r[1] && r[1].hours === 7, r);
  // ---- .ics across midnight
  r = await page.evaluate(() => {
    const ics = buildIcs([{ id: "ix", area: "sleep", pathId: "", title: "", start: "22:00", end: "07:00", every: 1, days: [3], from: "2026-10-21", until: "" },
      { id: "iy", area: "sleep", pathId: "", title: "", start: "13:00", end: "14:00", every: 0, days: [3], from: "2026-10-21", until: "" }]);
    const ev = ics.split("BEGIN:VEVENT").slice(1).map(b => [/DTSTART:(\S+)/.exec(b)[1], /DTEND:(\S+)/.exec(b)[1]]);
    const text = ["BEGIN:VCALENDAR", "BEGIN:VEVENT", "UID:a1", "DTSTART:20261021T220000", "DTEND:20261022T070000", "SUMMARY:Sleep", "END:VEVENT",
      "BEGIN:VEVENT", "UID:a2", "DTSTART:20261021T233000", "DTEND:20261022T060000", "SUMMARY:Late", "END:VEVENT",
      "BEGIN:VEVENT", "UID:a3", "DTSTART:20261021T200000", "DURATION:PT8H", "SUMMARY:Shift", "END:VEVENT",
      "BEGIN:VEVENT", "UID:a4", "DTSTART:20261022T000000", "DTEND:20261022T080000", "SUMMARY:Early", "END:VEVENT",
      "BEGIN:VEVENT", "UID:a5", "DTSTART:20261021T070000", "DTEND:20261022T070000", "SUMMARY:Day", "END:VEVENT", "END:VCALENDAR"].join("\r\n");
    const p = parseIcs(text);
    return { ev, imp: p.events.map(e => [e.date.slice(5), e.start, e.end, occSegments(e).map(s => s.hours)]), skipped: p.skipped };
  });
  ok(".ics export: 22:00-07:00 ends the next day (DTEND 20261022T070000)", JSON.stringify(r.ev[0]) === '["20261021T220000","20261022T070000"]', r.ev);
  ok(".ics export: 13:00-14:00 stays on the day", JSON.stringify(r.ev[1]) === '["20261021T130000","20261021T140000"]', r.ev);
  ok(".ics import: overnight events keep their length (9 = 2+7, 6.5 = 0.5+6, 8 = 4+4, 8)", JSON.stringify(r.imp) === JSON.stringify([["10-21", "22:00", "07:00", [2, 7]], ["10-21", "23:30", "06:00", [0.5, 6]], ["10-21", "20:00", "04:00", [4, 4]], ["10-22", "00:00", "08:00", [8]]]), r.imp);
  ok(".ics import: a 24h event is skipped, not turned into 0h or 48h", r.skipped === 1, r.skipped);
  // ---- sleep check-in bed/wake: same rule, live hint
  await page.evaluate(() => { data.selected = TODAY; delete data.days[TODAY].sleep; save(); renderCheckin(); renderDerived(); document.getElementById("checkin").scrollIntoView(); }); await sleep(300);
  const sh = async (b, w) => { await page.evaluate((b, w) => { const x = document.getElementById("bed"), y = document.getElementById("wake"); x.value = b; x.dispatchEvent(new Event("input")); y.value = w; y.dispatchEvent(new Event("input")); }, b, w); return N(await page.evaluate(() => document.getElementById("sleepPreview").textContent)); };
  r = [await sh("22:00", "07:00"), await sh("23:30", "06:00"), await sh("00:00", "08:00"), await sh("01:00", "04:00")];
  ok("sleep hint: 'Ends next day at 7:00 AM · 9h'", r[0] === "Ends next day at 7:00 AM · 9h", r);
  ok("sleep hint: 'Ends next day at 6:00 AM · 6.5h · short night.'", r[1] === "Ends next day at 6:00 AM · 6.5h · short night.", r);
  ok("sleep hint: 00:00-08:00 '8h'; 01:00-04:00 '3h · short night.'", r[2] === "8h" && r[3] === "3h · short night.", r);
  await sh("22:00", "07:00"); await page.evaluate(() => document.getElementById("saveSleep").click()); await sleep(300);
  r = await page.evaluate(() => data.days[TODAY].sleep);
  ok("saved bed 22:00 / wake 07:00 = 9h", r.hours === 9 && r.source === "times", r);
  r = await pieDay(await page.evaluate(() => TODAY));
  ok("today pie with hand-logged 9h: no extra planned sleep (9h, not 11h)", JSON.stringify(r) === JSON.stringify(["Sleep9h", "Open time15h"]), r);
  ok("no page errors", errs.length === 0, errs);
  done(); await browser.close();
})().catch(e => { console.log("CRASH " + (e && e.stack || e)); process.exit(1); });
