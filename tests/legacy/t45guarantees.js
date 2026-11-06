// v45 equivalents for the suites that navigated the old home doors.
// Confirms the data rules, not the removed tiles: one plan log, one elapsed block for
// several paths, no auto-steer, neutral grace copy, and goals/paths/diary surviving a lock.
const A = require("./lib/app");
const { sleep, ok, done } = Object.assign({}, A, A.suite());
(async () => {
  const browser = await A.launch();
  const { page, errs } = await A.phonePage(browser);
  await A.fresh(page);
  await A.setup(page, "Sample", "sample-pass-1");
  let r = await page.evaluate(() => ({
    tiles: [...document.querySelectorAll("#homeTiles [data-tile]")].map(b => b.dataset.tile),
    tabs: [...document.querySelectorAll('[role="tab"]')].map(t => t.getAttribute("aria-selected")),
    version: APP_VERSION,
    shown: shownVersion()
  }));
  ok("web version stays 43; day strip is the only tab set and one day is selected", r.version === "43" && r.shown === "43" && r.tabs.filter(x => x === "true").length === 1 && r.tabs.length === 7, r);
  ok("home doors are Journal, Areas, Check-in, Money, Settings", r.tiles.join() === "journal,areas,week,money,settings", r.tiles);

  r = await page.evaluate(() => {
    const goal = { id: "g45", area: "personal", title: "Keep the garden", start: 0, current: 3, target: 10, unit: "custom", unitCustom: "beds", direction: "up", incomeCounts: false, accountId: "", linkStart: null, created: "2026-01-01", touched: "", paused: false, deadline: "", progress: [{ id: "gp1", date: "2026-10-01", delta: 3, total: 3, note: "beds", moneyId: "" }] };
    data.goals.push(goal);
    data.paths.push({ id: "pa", name: "Gardener", img: "icons/paths/wrench.jpg", created: TODAY, active: true, archived: false });
    data.paths.push({ id: "pb", name: "Cook", img: "icons/paths/kitchen.jpg", created: TODAY, active: true, archived: false });
    data.diary.push({ id: "d45", date: TODAY, note: "Photo of the beds", offered: "", full: false, area: ["personal"], path: ["pa"], pulls: [], steered: [], media: [{ id: "m45", kind: "photo", bytes: 12 }] });
    const close = Date.UTC(2026, 9, 22) - (-420) * 60000;
    const grace = 48 * 3600000;
    const stand = (now, extra) => HSGaps.dayStanding(Object.assign({ date: "2026-10-21", nowMs: now, graceHours: 48, tzOffsetMinutes: -420 }, extra));
    save();
    return {
      goals: data.goals.filter(g => g.id === "g45").length,
      open: stand(close + grace - 1, { hasRecord: false }),
      edge: stand(close + grace, { hasRecord: false }),
      logged: stand(close + grace + 1, { hasRecord: true }),
      none: stand(close + grace + 1, { explicitNone: true }),
      copy: HSGaps.UNKNOWN_DAY
    };
  });
  ok("a goal is stored and grace boundaries stay neutral", r.goals === 1 && r.open === "open" && r.edge === "unknown" && r.logged === "logged" && r.none === "none" && r.copy.title === "Not logged" && r.copy.body === "Nothing recorded for this day.", r);

  await page.evaluate(id => openPathLog(id), "pa");
  await page.waitForSelector("#pathLogDialog[open]");
  await page.select("#plFields [aria-label='Shadow']", "wrath");
  r = await page.evaluate(() => ({ pulls: plState.pulls.slice(), steered: plState.steered.slice() }));
  ok("choosing Wrath does not record a steer", r.pulls.join() === "wrath" && r.steered.length === 0, r);
  await page.evaluate(() => document.querySelector("[data-pf-pullsel]").value = "__add");
  await page.evaluate(() => document.querySelector("[data-pf-pullsel]").dispatchEvent(new Event("change")));
  await page.type('[data-pf="pairPull"]', "Doomscrolling");
  await page.type('[data-pf="pairSteer"]', "Reading");
  await page.click("[data-pf-pairsave]");
  await sleep(200);
  r = await page.evaluate(() => ({ pulls: plState.pulls.slice(), steered: plState.steered.slice(), pair: (data.customPulls || []).some(p => p.label === "Doomscrolling" && p.steer === "Reading") }));
  ok("a pair the person typed stores both the shadow and the steer", r.pair && r.steered.map(s => s.toLowerCase()).includes("reading"), r);
  await page.evaluate(() => closePathLog());

  await page.evaluate(() => openPathLog("pa"));
  await page.waitForSelector("#pathLogDialog[open]");
  const customId = await page.evaluate(() => (data.customPulls.find(p => p.label === "Doomscrolling") || {}).id);
  await page.select("#plFields [aria-label='Shadow']", customId);
  r = await page.evaluate(() => plState.steered.slice());
  ok("selecting that saved shadow later does not auto-steer", r.length === 0, r);
  await page.evaluate(() => closePathLog());

  r = await page.evaluate(() => {
    const l = { id: "pl45", pathId: "pa", pathIds: ["pa", "pb"], date: TODAY, did: "Both", minutes: 60, area: "personal", rating: "good", pulls: [], steered: [], logged: true, source: "log", taskId: "", journal: "", motive: "", clean: "", reps: null, repsUnit: "", better: "" };
    data.pathLogs.push(l);
    syncPathTask(l);
    const tasks = data.tasks.filter(t => t.pathLogId === "pl45");
    return { tasks: tasks.length, hours: tasks[0] && tasks[0].hours, mins: HSGaps.elapsedOnce([l, l]) };
  });
  ok("two linked paths own one 1 hour task", r.tasks === 1 && r.hours === 1 && r.mins === 60, r);

  r = await page.evaluate(() => {
    data.plans.push({ id: "v45p", area: "career", pathId: "pa", title: "Shift", start: "09:00", end: "11:00", every: 0, days: [parseISO(TODAY).getDay()], from: TODAY, until: "", source: "" });
    save(); renderDerived();
    confirmDay(TODAY, document.getElementById("planCard"));
    const mid = data.pathLogs.filter(l => l.planKey === "v45p|" + TODAY);
    const id = mid[0] && mid[0].id;
    delete data.planDone["v45p|" + TODAY];
    data.plans.find(x => x.id === "v45p").end = "12:00";
    confirmDay(TODAY, document.getElementById("planCard"));
    const after = data.pathLogs.filter(l => l.planKey === "v45p|" + TODAY);
    return { n: after.length, same: after[0] && after[0].id === id, minutes: after[0] && after[0].minutes, tasks: data.tasks.filter(t => t.pathLogId === (after[0] && after[0].id)).length };
  });
  ok("confirming a changed block updates the same log and one task", r.n === 1 && r.same && r.minutes === 180 && r.tasks === 1, r);

  await A.lock(page);
  await A.unlock(page, "Sample", "sample-pass-1");
  r = await page.evaluate(() => ({
    goal: data.goals.some(g => g.id === "g45" && g.current === 3 && g.progress.length === 1),
    paths: data.paths.map(p => p.name).sort().join(),
    note: (data.diary.find(e => e.id === "d45") || {}).note,
    media: ((data.diary.find(e => e.id === "d45") || {}).media || []).map(m => m.id).join(),
    plan: data.pathLogs.filter(l => l.planKey === "v45p|" + TODAY).length
  }));
  ok("goals, paths, diary note, media id, and the plan log survive lock and unlock", r.goal && r.paths === "Cook,Gardener" && r.note === "Photo of the beds" && r.media === "m45" && r.plan === 1, r);

  r = await page.evaluate(() => {
    data.customThemes = data.customThemes || [];
    data.customThemes.push({ id: "custom-mantest", name: "Man test", icons: "man", bg: "#111111", card: "#222222", accent: "#8888ff", text: "#eeeeee" });
    applyTheme("custom-mantest");
    if (typeof refreshGlyphs === "function") refreshGlyphs();
    if (typeof paintMediaIcons === "function") paintMediaIcons();
    openScreen("areas");
    const career = document.querySelector('#areas [data-area-id="career"] img');
    openScreen("journal");
    const goals = document.querySelector("#goalsTitle img");
    return { career: career && career.getAttribute("src"), goals: goals && goals.getAttribute("src") };
  });
  ok("Areas Career uses the man figure; the Goals glyph has no man file so it stays classic", /glyphs128-man\/area-career-v2\.png/.test(r.career || "") && /glyphs128\/home\/goals\.png/.test(r.goals || ""), r);

  ok("no page errors", errs.length === 0, errs);
  await browser.close();
  done();
})().catch(e => { console.error(e); process.exit(1); });
