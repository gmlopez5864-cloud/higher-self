// v46.4 (Android): tap a time block to write about it. The entry is a diary entry tied to the block (plan id + date)
// and filed under the block's path; it adds no time. Plus a free-standing "New entry" in the Journal.
// Today is pinned to Wed 21 Oct 2026.
const A = require("./lib/app"); const { sleep, ok, done } = Object.assign({}, A, A.suite());
const SHOTS = process.env.HS_SHOTS || A.TMP;
const path = require("path");
const N = s => String(s || "").replace(/[\u202f\u00a0]/g, " ").replace(/\s+/g, " ").trim();
(async () => {
  const browser = await A.launch();
  // ================= web: unchanged
  {
    const { page } = await A.phonePage(browser);
    await A.fresh(page); await A.setup(page, "Web", "web-pass-1");
    const r = await page.evaluate(() => {
      data.plans = [{ id: "wk", area: "career", pathId: "", title: "Work", start: "09:00", end: "12:00", every: 0, days: [3], from: TODAY, until: "", source: "", icsUid: "", kind: "", listen: null, breaks: [] }];
      save(); renderDerived(); openPlanDay(TODAY);
      return { je: document.querySelectorAll("[data-je]").length, pen: document.querySelectorAll(".je-pen").length, nw: document.getElementById("journalNew").hidden, v: shownVersion() };
    });
    ok("web: blocks aren't journal taps, no 'New entry' button, version stays 43", r.je === 0 && r.pen === 0 && r.nw === true && r.v === "43", r);
    await page.close();
  }
  const { page, errs } = await A.phonePage(browser);
  const tap = async sel => { await page.evaluate(s => { const e = document.querySelector(s); if (e) e.scrollIntoView({ block: "center" }); }, sel); await sleep(150); await page.click(sel); };
  await page.goto(A.ORIGIN + "/?android=1", { waitUntil: "networkidle0" }); await page.evaluate(() => localStorage.clear()); await page.reload({ waitUntil: "networkidle0" });
  await A.setup(page, "Guillermo", "gui-pass-1"); await A.clean(page);
  let r = await page.evaluate(() => shownVersion());
  ok("Android shows version 46.4", r === "46.4", r);
  await page.evaluate(() => {
    const mk = (id, name) => ({ id, name, img: PATH_DEFAULT_ICON, created: TODAY, active: true, archived: false, reminder: null });
    data.paths.push(mk("paW", "Career"), mk("paK", "Father"));
    const P = (id, area, pathId, title, start, end) => ({ id, area, pathId, title, start, end, every: 0, days: [3], from: TODAY, until: "", source: "", icsUid: "", kind: "", listen: null, breaks: [] });
    data.plans = [P("wk", "career", "paW", "Work", "09:00", "12:00"), P("kd", "social", "paK", "Spending time with my kids", "16:00", "17:30"),
      P("ft", "free", "", "", "13:00", "14:00"), P("rd", "personal", "", "Reading", "19:00", "20:00"),
      { id: "sl", area: "sleep", pathId: "", title: "", start: "23:00", end: "07:00", every: 1, days: [0, 1, 2, 3, 4, 5, 6], from: "2026-10-01", until: "", source: "", icsUid: "", kind: "", listen: null, breaks: [] }];
    data.planDone = {}; data.planDays = {}; data.selected = TODAY;
    // Reading is already logged (confirmed); the kids block has a "How did it go?" note from logging (v46.2).
    const rd = occsTouching(TODAY).find(o => o.key === "rd|" + TODAY); confirmOcc(rd);
    data.pathLogs.push({ id: uid("pl"), pathId: "paK", date: TODAY, minutes: 30, rating: "good", how: "They loved the park.", blockKey: "kd|" + TODAY, did: "Park", journal: "", pulls: [], steered: [] });
    save(); renderDerived(); openScreen("today");
  });
  const snap = () => page.evaluate(() => ({ total: Math.round(dayTotal(TODAY) * 100) / 100, planned: JSON.stringify(plannedHoursFor(TODAY)), logs: data.pathLogs.length, tasks: data.tasks.length,
    planDays: JSON.stringify(data.planDays), planDone: JSON.stringify(data.planDone), free: freeHoursFor(TODAY), pie: N0(document.getElementById("pieCentre") ? document.getElementById("pieCentre").textContent : "") }));
  await page.evaluateOnNewDocument(() => {});
  await page.evaluate(() => { window.N0 = x => String(x || "").replace(/\s+/g, " ").trim(); });
  const before = await snap();

  // ================= day planner: every block is a tap into writing
  await page.evaluate(() => openPlanDay(TODAY)); await sleep(400);
  r = await page.evaluate(() => [...document.querySelectorAll("#planDayList [data-je]")].map(x => x.dataset.je.split("|")[0]));
  ok("day planner: planned, free-time, logged and sleep blocks are all tappable to write", ["wk", "kd", "ft", "rd", "sl"].every(k => r.includes(k)), r);
  await tap('#planDayList [data-je="wk|2026-10-21"]'); await sleep(500);
  r = await page.evaluate(() => ({ open: document.getElementById("jeDialog").open, day: document.getElementById("planDayDialog").open, title: jeTitle.textContent, sub: N0(jeSub.textContent), path: jePath.value,
    focus: document.activeElement && document.activeElement.id, step: !!document.querySelector("#jeBlockBox [data-dur-wrap]"), skip: !!document.querySelector("#jeBlockBox [data-je-skip]"), edit: !!document.querySelector("#jeBlockBox [data-je-edit]"),
    hints: [...document.querySelectorAll("#jeHints [data-je-hint]")].map(b => b.textContent), hint: jePathHint.textContent }));
  ok("tapping Work opens the composer straight into writing (cursor in 'Write about this')", r.open && !r.day && r.title === "Work" && r.focus === "jeText", r);
  ok("the header shows type, time and length: 'Career and responsibilities · 9:00 AM–12:00 PM · 3 h'", /^Career and responsibilities · 9:00 AM–12:00 PM · 3 h/.test(r.sub) && /Planned/.test(r.sub), r.sub);
  ok("routing: Work goes to its Career path (preselected, can be changed)", r.path === "paW" && /under Career/.test(r.hint), r);
  ok("the block's stepper, Skip and Edit are still there in the sheet", r.step && r.skip && r.edit, r);
  ok("optional prompts: 'How did it go?', 'What happened?', 'What would you change?'", JSON.stringify(r.hints) === JSON.stringify(["How did it go?", "What happened?", "What would you change?"]), r.hints);
  // empty save is refused
  await page.click("#jeSave"); await sleep(200);
  r = await page.evaluate(() => ({ err: document.getElementById("jeErr").hidden ? "" : document.getElementById("jeErr").textContent, n: data.diary.length }));
  ok("nothing written: 'Write something, or add a voice note or photo.' and nothing saved", /Write something/.test(r.err) && r.n === 0, r);
  await page.type("#jeText", "Shipped the report before lunch.");
  await page.click('#jeHints [data-je-hint="What would you change?"]'); await page.keyboard.type("Start earlier.");
  r = await page.evaluate(() => jeText.value);
  { const h = await page.evaluate(() => document.getElementById("jeErr").hidden); ok("typing clears the 'Write something' message", h, h); }
  ok("a prompt is a hint: tapping it adds the question to the text, you keep writing", r === "Shipped the report before lunch.\n\nWhat would you change? Start earlier.", r);
  await page.evaluate(() => document.getElementById("jeText").scrollIntoView({ block: "start" })); await sleep(200);
  await page.screenshot({ path: SHOTS + "/v464-composer-work.png" });
  await page.click("#jeSave"); await sleep(600);
  r = await page.evaluate(() => { const e = data.diary[data.diary.length - 1]; return { e, day: document.getElementById("planDayDialog").open, je: document.getElementById("jeDialog").open, toast: N0(document.getElementById("toast").textContent),
    badge: N0((document.querySelector('#planDayList [data-je="wk|2026-10-21"] .je-badge') || {}).textContent) }; });
  ok("saved as a diary entry linked to the block (plan id + date) and the Career path", r.e.block && r.e.block.key === "wk|2026-10-21" && r.e.block.plan === "wk" && r.e.block.date === "2026-10-21" && JSON.stringify(r.e.path) === '["paW"]' && JSON.stringify(r.e.area) === '["career"]' && r.e.date === "2026-10-21", r.e);
  ok("after saving you're back on the day, 'Saved to your journal and Career.', and Work shows a journal count of 1", r.day && !r.je && /Saved to your journal and Career/.test(r.toast) && r.badge.startsWith("1"), r);
  let after = await snap();
  ok("no time change: day total, planned hours, logs, blocks and the pie are the same", JSON.stringify(after) === JSON.stringify(before), { before, after });
  // tap again: see the earlier one and add another
  await tap('#planDayList [data-je="wk|2026-10-21"]'); await sleep(400);
  r = await page.evaluate(() => ({ prev: [...document.querySelectorAll("#jePrev [data-je-entry]")].map(li => N0(li.textContent)), head: N0((document.querySelector("#jePrev .je-sec") || {}).textContent), text: jeText.value }));
  ok("tapping Work again shows the earlier entry ('1 entry about this block') with an empty box for another", r.prev.length === 1 && /Shipped the report/.test(r.prev[0]) && r.head === "1 entry about this block" && r.text === "", r);
  await page.type("#jeText", "Afternoon follow-up went well."); await page.click("#jeSave"); await sleep(500);
  r = await page.evaluate(() => ({ n: blockEntries("wk|2026-10-21").length, badge: N0((document.querySelector('#planDayList [data-je="wk|2026-10-21"] .je-badge') || {}).textContent) }));
  ok("more than one entry per block: Work now has 2", r.n === 2 && r.badge.startsWith("2"), r);

  // the kids block -> Father; the "How did it go?" note from logging stays and shows alongside
  await tap('#planDayList [data-je="kd|2026-10-21"]'); await sleep(400);
  r = await page.evaluate(() => ({ path: jePath.value, how: N0((document.querySelector("#jePrev .je-how") || {}).textContent) }));
  ok("routing: 'Spending time with my kids' goes to the Father path", r.path === "paK", r);
  ok("the logging note 'How did it go?' shows alongside, unchanged", /From logging · How did it go\?\s*They loved the park\./.test(r.how), r);
  await page.type("#jeText", "Swings, then ice cream.");
  // a photo, from the file picker (no camera plugin here)
  const fi = await page.$("#jePhotoFile"); await fi.uploadFile(path.join(A.APP, "icons/diary.jpg")); await sleep(1200);
  r = await page.evaluate(() => ({ je: document.querySelectorAll("#jePending li").length, diary: document.querySelectorAll("#diaryPending li").length }));
  ok("Add photo works in the composer (pending there, not in the Journal page's composer)", r.je === 1 && r.diary === 0, r);
  await page.click("#jeSave"); await sleep(600);
  r = await page.evaluate(() => { const e = blockEntries("kd|2026-10-21")[0]; return { path: e.path, media: (e.media || []).map(m => m.kind), log: data.pathLogs.find(l => l.blockKey === "kd|2026-10-21").how }; });
  ok("kids entry saved under Father with its photo; the logging note is untouched", JSON.stringify(r.path) === '["paK"]' && JSON.stringify(r.media) === '["photo"]' && r.log === "They loved the park.", r);
  // voice: no microphone in this browser -> the message shows in the composer
  await tap('#planDayList [data-je="kd|2026-10-21"]'); await sleep(400);
  await page.click("#jeVoice"); await sleep(400);
  r = await page.evaluate(() => ({ je: jeMediaErr.hidden ? "" : jeMediaErr.textContent, diary: document.getElementById("diaryMediaErr").hidden }));
  ok("Voice note is in the composer too (here: the no-microphone message shows in the composer)", r.je.length > 0 && r.diary, r);
  await page.evaluate(() => document.getElementById("jePrev").scrollIntoView({ block: "start" })); await sleep(300);
  await page.screenshot({ path: SHOTS + "/v464-composer-kids-earlier.png" });
  await page.click("#jeCancel"); await sleep(400);

  // a free-time block with no path: pick one or leave it as none
  await tap('#planDayList [data-je="ft|2026-10-21"]'); await sleep(400);
  r = await page.evaluate(() => ({ path: jePath.value, opts: [...jePath.options].map(o => o.textContent), hint: jePathHint.textContent, sub: N0(jeSub.textContent) }));
  ok("a block with no path: the path dropdown defaults to 'No path' and lists your paths", r.path === "" && r.opts[0] === "No path" && r.opts.includes("Career") && r.opts.includes("Father") && /Pick a path if it belongs to one/.test(r.hint) && /^Free time · 1:00 PM–2:00 PM · 1 h/.test(r.sub), r);
  await page.type("#jeText", "Read in the sun."); await page.click("#jeSave"); await sleep(500);
  r = await page.evaluate(() => blockEntries("ft|2026-10-21")[0]);
  ok("left as 'No path': saved to the journal only (no path, no area)", r && JSON.stringify(r.path) === "[]" && JSON.stringify(r.area) === "[]", r);
  await tap('#planDayList [data-je="ft|2026-10-21"]'); await sleep(400);
  await page.select("#jePath", "paK"); await page.type("#jeText", "Called my son."); await page.click("#jeSave"); await sleep(500);
  r = await page.evaluate(() => blockEntries("ft|2026-10-21").map(e => e.path.join()));
  ok("or pick one: the second free-time entry goes under Father", JSON.stringify(r) === '["","paK"]', r);
  await page.evaluate(() => { const l = document.getElementById("planDayList"); l.scrollIntoView({ block: "start" }); }); await sleep(300);
  await page.screenshot({ path: SHOTS + "/v464-day-planner-journal.png" });

  // a logged (confirmed) block
  await tap('#planDayList [data-je="rd|2026-10-21"]'); await sleep(400);
  r = await page.evaluate(() => ({ sub: N0(jeSub.textContent), step: !!document.querySelector("#jeBlockBox [data-dur-wrap]"), path: jePath.value }));
  ok("an already-logged block opens too ('Logged'), with no stepper since its time is counted", /Logged/.test(r.sub) && !r.step && r.path === "", r);
  await page.type("#jeText", "Finished two chapters."); await page.click("#jeSave"); await sleep(500);
  r = await page.evaluate(() => blockEntries("rd|2026-10-21").length);
  ok("and saves an entry for it", r === 1, r);
  after = await snap();
  ok("still no time change after 6 entries (total, planned, logs, pie)", JSON.stringify(after) === JSON.stringify(before), { before, after });

  // the stepper and Skip inside the composer are the same controls
  await tap('#planDayList [data-je="kd|2026-10-21"]'); await sleep(400);
  await page.click("#jeBlockBox [data-dur-up]"); await sleep(900);
  r = await page.evaluate(() => ({ m: occSpanMins(occByKey("kd|2026-10-21")), sub: N0(jeSub.textContent) }));
  ok("the stepper in the composer works as before (+ makes the kids block 1 h 45 min)", r.m === 105 && /4:00 PM–5:45 PM · 1 h 45 min/.test(r.sub), r);
  await page.click("#jeBlockBox [data-dur-dn]"); await sleep(900);
  await page.click("#jeBlockBox [data-je-skip]"); await sleep(400);
  r = await page.evaluate(() => ({ skip: !!(data.planDays["kd|2026-10-21"] || {}).skip, sub: N0(jeSub.textContent), back: !!document.querySelector("#jeBlockBox [data-je-unskip]") }));
  ok("Skip in the composer skips the block (no time) and offers Bring back", r.skip && /Skipped · no time counted/.test(r.sub) && r.back, r);
  await page.click("#jeBlockBox [data-je-unskip]"); await sleep(400);
  r = await page.evaluate(() => ({ skip: !!(data.planDays["kd|2026-10-21"] || {}).skip, m: occSpanMins(occByKey("kd|2026-10-21")) }));
  ok("Bring back restores it (1 h 30 min again)", !r.skip && r.m === 90, r);
  await page.click("#jeBlockBox [data-je-edit]"); await sleep(500);
  r = await page.evaluate(() => ({ je: document.getElementById("jeDialog").open, ed: document.getElementById("planDialog") ? document.getElementById("planDialog").open : null }));
  ok("'Edit block' opens the block editor", !r.je && r.ed === true, r);
  await A.clean(page);
  const occByKeyEnd = await page.evaluate(() => occByKey("kd|2026-10-21").end);
  after = await snap();
  { const a = Object.assign({}, after, { planDays: "" }), b = Object.assign({}, before, { planDays: "" });
    ok("hours are back exactly where they started (the kids block ends 5:30 PM again)", JSON.stringify(a) === JSON.stringify(b) && occByKeyEnd === "17:30", { before, after }); }

  // Confirm day card: the block name is a tap too
  await page.evaluate(() => { renderPlanCard(); document.getElementById("planBlocks").scrollIntoView({ block: "start" }); }); await sleep(300);
  r = await page.evaluate(() => ({ je: [...document.querySelectorAll("#planBlocks [data-je]")].map(x => x.dataset.je.split("|")[0]), badge: N0((document.querySelector('#planBlocks [data-je="wk|2026-10-21"] .je-badge') || {}).textContent) }));
  ok("Confirm day: each block's name opens the composer and shows its count (Work 2)", r.je.includes("wk") && r.je.includes("kd") && r.badge.startsWith("2"), r);
  await page.screenshot({ path: SHOTS + "/v464-confirm-card-counts.png" });
  await tap('#planBlocks [data-je="kd|2026-10-21"] b'); await sleep(400);
  r = await page.evaluate(() => ({ open: document.getElementById("jeDialog").open, title: jeTitle.textContent }));
  ok("tapping 'Spending time with my kids' on Confirm day opens its composer", r.open && r.title === "Spending time with my kids", r);
  await page.click("#jeCancel"); await sleep(300);
  r = await page.evaluate(() => ({ day: document.getElementById("planDayDialog").open, n: blockEntries("kd|2026-10-21").length }));
  ok("Cancel saves nothing and doesn't open the day sheet (it came from the card)", !r.day && r.n === 1, r);
  // confirm the day: journal entries don't block or add to it
  r = await page.evaluate(() => { const okc = confirmDay(TODAY, document.getElementById("planCard")); return { okc, total: Math.round(dayTotal(TODAY) * 100) / 100 }; });
  ok("Confirm day still works and counts only the blocks (journal adds nothing)", r.okc !== false && r.total > 0, r);
  await A.clean(page);

  // ================= Journal feed, Diary list and path cards
  await page.evaluate(() => { openScreen("feed"); renderFeed(); }); await sleep(500);
  r = await page.evaluate(() => [...document.querySelectorAll("#feedList .rf-card[data-rf-kind=diary]")].map(c => ({ chip: N0((c.querySelector(".je-chip") || {}).textContent), path: N0((c.querySelector(".rf-path") || {}).textContent) })));
  ok("Journal feed: block entries show with a chip back to the block (e.g. 'Work · 9:00 AM–12:00 PM') and their path", r.filter(x => x.chip.startsWith("Work · 9:00 AM–12:00 PM") && x.path === "Career").length === 2 && r.some(x => /^Spending time with my kids/.test(x.chip) && x.path === "Father"), r);
  await page.evaluate(() => { feedSel = "paK"; renderFeed(); }); await sleep(300);
  r = await page.evaluate(() => [...document.querySelectorAll("#feedList .rf-card[data-rf-kind=diary]")].map(c => N0(c.querySelector(".rf-text") ? c.querySelector(".rf-text").textContent : "")));
  ok("under the Father path: the kids entry and the free-time call to my son", r.includes("Swings, then ice cream.") && r.includes("Called my son.") && r.length === 2, r);
  await page.evaluate(() => { feedSel = "paW"; renderFeed(); document.getElementById("feedPanel").scrollIntoView({ block: "start" }); }); await sleep(400);
  await page.screenshot({ path: SHOTS + "/v464-journal-feed-career.png" });
  await page.evaluate(() => document.querySelector("#feedList .je-chip").click()); await sleep(400);
  r = await page.evaluate(() => ({ open: document.getElementById("jeDialog").open, title: jeTitle.textContent, prev: document.querySelectorAll("#jePrev [data-je-entry]").length }));
  ok("the chip opens the block again with its entries", r.open && r.title === "Work" && r.prev === 2, r);
  await page.click("#jeCancel"); await sleep(300);
  await page.evaluate(() => { feedSel = "all"; setDiaryDay(TODAY); openScreen("diary"); }); await sleep(300);
  r = await page.evaluate(() => [...document.querySelectorAll("#diaryList .je-chip")].length);
  ok("the Journal day list shows the block chip on each block entry (6)", r === 6, r);
  await page.evaluate(() => { openScreen("paths"); renderPaths(); }); await sleep(300);
  r = await page.evaluate(() => { const c = document.querySelector('.path-card[data-path-id="paW"]'); return { count: N0((c.querySelector("[data-je-path]") || {}).textContent), lines: c.querySelectorAll(".path-journal").length, chip: !!c.querySelector(".path-journal .je-chip") }; });
  ok("Career path card: '2 journal entries' and the entries in its history, each linking to the block", r.count === "2 journal entries" && r.lines === 2 && r.chip, r);
  await page.evaluate(() => { const c = document.querySelector('.path-card[data-path-id="paW"]'); c.querySelector("details").open = true; c.scrollIntoView({ block: "start" }); }); await sleep(300);
  await page.screenshot({ path: SHOTS + "/v464-path-card-journal.png" });

  // ================= free-standing entry from the Journal
  const pre = await snap();
  await page.evaluate(() => { openScreen("diary"); setDiaryDay(TODAY); }); await sleep(300);
  r = await page.evaluate(() => !document.getElementById("journalNew").hidden);
  ok("Journal has a 'New entry' button", r, r);
  await tap("#journalNew"); await sleep(400);
  r = await page.evaluate(() => ({ open: document.getElementById("jeDialog").open, title: jeTitle.textContent, date: !jeDateWrap.hidden && jeDate.value, path: jePath.value, block: document.getElementById("jeBlockBox").innerHTML, focus: document.activeElement.id }));
  ok("'New entry': same composer, not tied to a block, today's date, 'No path', cursor in the text", r.open && r.title === "New entry" && r.date === "2026-10-21" && r.path === "" && r.block === "" && r.focus === "jeText", r);
  await page.type("#jeText", "A quiet day. Grateful."); await page.screenshot({ path: SHOTS + "/v464-new-entry.png" });
  await page.click("#jeSave"); await sleep(400);
  r = await page.evaluate(() => data.diary[data.diary.length - 1]);
  ok("saved as a plain diary entry: no block, no path", r.note === "A quiet day. Grateful." && !r.block && JSON.stringify(r.path) === "[]", r);
  await tap("#journalNew"); await sleep(300);
  await page.select("#jePath", "paW"); await page.evaluate(() => { jeDate.value = "2026-10-20"; });
  await page.type("#jeText", "Planned the week."); await page.click("#jeSave"); await sleep(400);
  r = await page.evaluate(() => data.diary[data.diary.length - 1]);
  ok("with an optional path and another date: under Career on Oct 20, still no block", r.date === "2026-10-20" && JSON.stringify(r.path) === '["paW"]' && !r.block, r);
  after = await snap();
  ok("free-standing entries add no time either", JSON.stringify(after) === JSON.stringify(pre), { pre, after });
  // the Journal page's own composer still works
  await page.evaluate(() => { document.getElementById("diaryNote").value = "Old composer still works."; document.getElementById("diaryAdd").click(); });
  r = await page.evaluate(() => data.diary[data.diary.length - 1].note);
  ok("the Journal page's own Save still works", r === "Old composer still works.", r);

  // ================= persistence: block links survive lock / unlock
  await A.lock(page); await A.unlock(page, "Guillermo", "gui-pass-1");
  r = await page.evaluate(() => ({ wk: blockEntries("wk|2026-10-21").length, kd: blockEntries("kd|2026-10-21").map(e => e.path.join() + "/" + (e.media || []).length), all: data.diary.length, blk: data.diary.filter(e => e.block).length }));
  ok("after locking and unlocking, the block links and paths are kept", r.wk === 2 && JSON.stringify(r.kd) === '["paK/1"]' && r.blk === 6 && r.all === 9, r);
  // a removed block: the entry keeps a snapshot and the chip still opens it
  r = await page.evaluate(() => { data.plans = data.plans.filter(p => p.id !== "ft"); save(); openBlockJournal("ft|2026-10-21", {}); return { open: document.getElementById("jeDialog").open, sub: N0(jeSub.textContent), box: document.getElementById("jeBlockBox").innerHTML, prev: document.querySelectorAll("#jePrev [data-je-entry]").length }; });
  ok("a block deleted later: its entries stay, and the chip opens 'Not in your plan anymore' with them", r.open && /Not in your plan anymore/.test(r.sub) && r.box === "" && r.prev === 2, r);
  await A.clean(page);
  ok("no page errors", errs.length === 0, errs);
  await browser.close();
  done();
})().catch(e => { console.error(e); process.exit(1); });
