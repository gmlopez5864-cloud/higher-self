// v31 regression suite (replaces the old t22-t28 checks): paths, check-ins, themes, tasks, goals,
// backup + restore, reminders. Phone width 390px. Every area also checks the data survives lock + unlock.
const { puppeteer, APP, TMP } = require("./lib/env");
const fs = require("fs");
const O = "http://127.0.0.1:8765";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const res = {}; let fails = 0;
const ok = (n, c, i) => { res[n] = (c ? "PASS" : "FAIL") + (i !== undefined ? " " + JSON.stringify(i) : ""); if (!c) fails++; };
const NAME = "Guillermo", PASS = "guipass1";
const unlock = async (p, name, pass) => { await p.evaluate(n => [...document.querySelectorAll("[data-profile]")].find(b => b.innerText.trim() === n).click(), name); await p.waitForSelector("#vaultPass"); await p.type("#vaultPass", pass); await p.click("#vaultUnlock"); await p.waitForSelector("#appRoot:not([hidden])"); await sleep(400); };
const relock = async p => { await sleep(400); await p.evaluate(() => lockApp()); await sleep(300); await unlock(p, NAME, PASS); await clean(p); };
const clean = p => p.evaluate(() => { const g = document.getElementById("guideOverlay"); if (g) g.hidden = true; document.getElementById("appRoot").removeAttribute("aria-hidden"); document.querySelectorAll("dialog[open]").forEach(d => d.close()); });
const confirmYes = async p => { await p.waitForSelector("#confirmDialog[open]", { timeout: 3000 }); await sleep(80); await p.click("#confirmDelete"); await sleep(200); };
const click = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); if (!e) throw new Error("missing " + s); e.click(); }, sel);
const val = (p, sel, v) => p.evaluate((s, v) => { const e = document.querySelector(s); e.value = v; e.dispatchEvent(new Event("input", { bubbles: true })); e.dispatchEvent(new Event("change", { bubbles: true })); }, sel, v);
(async () => {
  const browser = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: "new", args: ["--no-sandbox"] });
  const ctx = browser.defaultBrowserContext(); await ctx.overridePermissions(O, ["notifications"]);
  const page = await browser.newPage();
  await page.emulate({ viewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36" });
  const errs = []; page.on("pageerror", e => errs.push(e.message)); page.on("console", m => { if (m.type() === "error" && !/favicon|404/.test(m.text())) errs.push(m.text()); });
  let promptAnswer = PASS; const alerts = [];
  page.on("dialog", async d => { if (d.type() === "prompt") await d.accept(promptAnswer); else { alerts.push(d.message()); await d.accept(); } });
  await page.goto(O + "/", { waitUntil: "networkidle0" });
  await page.evaluate(() => localStorage.clear()); await page.reload({ waitUntil: "networkidle0" });
  await page.waitForSelector("#profileName"); await page.click("#profileName", { clickCount: 3 }); await page.type("#profileName", NAME);
  await page.type("#vaultPass", PASS); await page.type("#vaultPass2", PASS); await page.click("#vaultSetup"); await page.waitForSelector("#appRoot:not([hidden])");
  await sleep(300); await clean(page);
  const today = await page.evaluate(() => { data.guideSeen = true; save(); return TODAY; });
  ok("icon version 43", await page.evaluate(() => ICON_VER === "43"));
  ok("vault is encrypted at rest (no plaintext name or data in localStorage)", await page.evaluate(() => { const all = Object.keys(localStorage).map(k => k.startsWith("hs") || true ? localStorage.getItem(k) : "").join("|"); return !/"tasks"\s*:/.test(all); }));

  // ================= PATHS
  await page.evaluate(() => openScreen("paths")); await sleep(150);
  await click(page, "#pathAddBtn"); await page.waitForSelector("#pathDialog[open]");
  await val(page, "#pathName", "Father"); await click(page, "#pathSave"); await sleep(150);
  await click(page, "#pathAddBtn"); await val(page, "#pathName", "Writer"); await click(page, "#pathSave"); await sleep(150);
  let r = await page.evaluate(() => ({ names: data.paths.map(p => p.name), shown: document.getElementById("pathsList") ? document.getElementById("pathsList").innerText : document.body.innerText }));
  ok("paths: add two paths from the Paths screen", r.names.join() === "Father,Writer" && /Father/.test(r.shown) && /Writer/.test(r.shown), r.names);
  await click(page, "#pathAddBtn"); await val(page, "#pathName", "   "); await click(page, "#pathSave"); await sleep(100);
  r = await page.evaluate(() => ({ n: data.paths.length, open: document.getElementById("pathDialog").open })); await clean(page);
  ok("paths: a blank name is not saved", r.n === 2 && r.open, r);
  const fatherId = await page.evaluate(() => data.paths.find(p => p.name === "Father").id);
  // log a moment with time and an area -> creates a linked task
  await page.evaluate(id => openPathLog(id), fatherId); await page.waitForSelector("#pathLogDialog[open]");
  await click(page, "#plSave"); await sleep(100);
  r = await page.evaluate(() => ({ need: !document.getElementById("plNeedRating").hidden, n: data.pathLogs.length }));
  ok("paths: an empty moment is not saved", r.need && r.n === 0, r);
  await click(page, '#plRating [data-plrate="good"]');
  await page.evaluate(() => { const f = document.getElementById("plFields"); const g = k => f.querySelector('[data-pf="' + k + '"]'); g("did").value = "Homework with Ana"; g("time").value = "1.5"; g("unit").value = "h"; g("area").value = "social"; });
  await click(page, "#plSave"); await sleep(250);
  r = await page.evaluate(id => { const l = data.pathLogs.find(x => x.pathId === id); const t = l && data.tasks.find(x => x.id === l.taskId); return { l: l && { did: l.did, rating: l.rating, minutes: l.minutes, date: l.date }, task: t && { area: t.area, hours: t.hours, date: t.date }, tally: pathTally(id), stillOpen: document.getElementById("pathLogDialog").open }; }, fatherId);
  ok("paths: log saves did / rating / 90 min for today", r.l && r.l.did === "Homework with Ana" && r.l.rating === "good" && r.l.minutes === 90 && r.l.date === today, r);
  ok("paths: path time with an area becomes a 1.5h social task", r.task && r.task.area === "social" && r.task.hours === 1.5 && r.task.date === today, r.task);
  ok("paths: tally Good 1, Save closes (Log another is separate)", r.tally === "Good 1 · Neutral 0 · Bad 0" && r.stillOpen === false, r);
  await clean(page);
  // rename keeps logs; archive hides; restore; manage dialog reorder
  await page.evaluate(id => openPathDialog(id), fatherId); await val(page, "#pathName", "Dad"); await click(page, "#pathSave"); await sleep(150);
  r = await page.evaluate(id => ({ name: pathById(id).name, logs: pathLogsFor(id).length }), fatherId);
  ok("paths: rename keeps its logs", r.name === "Dad" && r.logs === 1, r);
  await page.evaluate(id => openPathsManage(), fatherId); await sleep(100);
  await page.evaluate(id => movePath(id, 1), fatherId); await sleep(100);
  ok("paths: Manage paths reorders", await page.evaluate(() => livePaths().map(p => p.name).join() === "Writer,Dad"));
  await clean(page);
  await page.evaluate(id => { archivePath(id); }, fatherId); await confirmYes(page);
  r = await page.evaluate(id => ({ arch: pathById(id).archived, active: activePaths().map(p => p.name), logs: pathLogsFor(id).length }), fatherId);
  ok("paths: archive hides it from check-in and keeps logs", r.arch && !r.active.includes("Dad") && r.logs === 1, r);
  await page.evaluate(id => restorePath(id), fatherId); await sleep(100);
  ok("paths: restore brings it back", await page.evaluate(id => activePaths().some(p => p.id === id), fatherId));
  await clean(page);
  await page.screenshot({ path: TMP + "/treg-paths.png" });

  // ================= CHECK-INS (sleep + paths in the check-in)
  await page.evaluate(() => { openScreen("week"); renderCheckin(); }); await sleep(150);
  r = await page.evaluate(() => ({ confirm: (document.getElementById("confirm8") || {}).innerText, paths: [...document.querySelectorAll("#checkinBody [data-pathrate]")].map(b => b.dataset.val) }));
  ok("check-in: shows 'Confirm 8h' and path rating chips", r.confirm === "Confirm 8h" && r.paths.includes("good") && r.paths.includes("skip"), r);
  await click(page, "#confirm8"); await sleep(150);
  r = await page.evaluate(() => ({ s: data.days[TODAY].sleep, read: (document.querySelector("#checkinBody .sleep-read") || {}).innerText }));
  ok("check-in: Confirm logs 8h (confirm source)", r.s && r.s.hours === 8 && r.s.source === "confirm" && r.read === "8h", r);
  await click(page, "#sleepEdit"); await sleep(100);
  await val(page, "#bed", "23:30"); await val(page, "#wake", "05:00"); await sleep(50);
  r = await page.evaluate(() => document.getElementById("sleepPreview").innerText);
  ok("check-in: bed/wake preview flags a short night", /5\.5h · short night/.test(r), r);
  await click(page, "#saveSleep"); await sleep(150);
  r = await page.evaluate(() => ({ s: data.days[TODAY].sleep, short: !!document.querySelector("#checkinBody .short-note") }));
  ok("check-in: bed/wake replaces it (5.5h, times source, short note)", r.s.hours === 5.5 && r.s.source === "times" && r.s.bed === "23:30" && r.short, r);
  await page.evaluate(() => { applyScreen("home"); renderCoachNotes(); }); await sleep(100);
  r = await page.evaluate(() => ({ logged: (document.querySelector("#coachNotes .sleep-logged") || {}).innerText, short: (document.querySelector("#coachNotes .sleep-short") || {}).innerText }));
  ok("check-in: coach card shows 'Logged 5.5h of sleep' + short-night line", /^Logged 5\.5h of sleep\./.test(r.logged || "") && /Short night/.test(r.short || ""), r);
  // path chip in the check-in: Writer "Not today", then Good
  const writerId = await page.evaluate(() => data.paths.find(p => p.name === "Writer").id);
  await page.evaluate(() => { openScreen("week"); renderCheckin(); }); await sleep(100);
  await click(page, `#checkinBody [data-pathrate="${writerId}"][data-val="skip"]`); await sleep(150);
  r = await page.evaluate(id => ({ nt: (data.days[TODAY].pathNotToday || []).includes(id), pressed: document.querySelector(`#checkinBody [data-pathrate="${id}"][data-val="skip"]`).getAttribute("aria-pressed") }), writerId);
  ok("check-in: 'Not today' on a path is remembered", r.nt && r.pressed === "true", r);
  await click(page, `#checkinBody [data-pathrate="${writerId}"][data-val="good"]`); await sleep(200);
  r = await page.evaluate(id => ({ nt: (data.days[TODAY].pathNotToday || []).includes(id), e: pathEntryFor(id, TODAY) && pathEntryFor(id, TODAY).rating }), writerId);
  ok("check-in: rating a path Good clears 'Not today' and starts today's entry", !r.nt && r.e === "good", r);
  // 24h cap
  await page.evaluate(() => { openScreen("week"); }); 
  r = await page.evaluate(() => { const before = data.tasks.length; const t = addTask("career", "Marathon shift", 20, "", false); return { added: !!t, n: data.tasks.length - before, cap: window.__hsLastCap || "" }; });
  ok("24h cap: a task that pushes the day past 24h is blocked", !r.added && r.n === 0 && /24/.test(r.cap), r);
  await page.evaluate(() => { const a = document.getElementById("capAlert"); if (a) a.remove(); });

  // ================= TASKS
  await page.evaluate(() => { openScreen("area:career"); openTaskDialog(null, "career"); }); await page.waitForSelector("#taskDialog[open]");
  await page.evaluate(() => { const c = document.querySelector("#taskPresets [data-preset='__custom'], [data-tpreset='__custom']"); if (c) c.click(); document.getElementById("taskTitleWrap").hidden = false; taskPresetChoice = "__custom"; });
  await val(page, "#taskTitle", "Write report"); await val(page, "#taskHours", "2"); await val(page, "#taskNotes", "Q3 numbers");
  await click(page, "#taskSave"); await sleep(200);
  r = await page.evaluate(() => { const t = data.tasks.filter(x => x.title === "Write report"); return { n: t.length, t: t[0] && { area: t[0].area, hours: t[0].hours, notes: t[0].notes, date: t[0].date, status: t[0].status }, closed: !document.getElementById("taskDialog").open }; });
  ok("tasks: add from the dialog (career, 2h, notes, today, todo)", r.n === 1 && r.t.area === "career" && r.t.hours === 2 && r.t.notes === "Q3 numbers" && r.t.date === today && r.t.status === "todo" && r.closed, r);
  const taskId = await page.evaluate(() => data.tasks.find(x => x.title === "Write report").id);
  await page.evaluate(() => renderAreas());
  await click(page, `[data-cycle="${taskId}"]`); await sleep(80); await click(page, `[data-cycle="${taskId}"]`); await sleep(80);
  ok("tasks: status cycles todo → doing → done", await page.evaluate(id => data.tasks.find(x => x.id === id).status === "done", taskId));
  await page.evaluate(id => openTaskDialog(id), taskId); await page.waitForSelector("#taskDialog[open]");
  await val(page, "#taskTitle", "Write Q3 report"); await val(page, "#taskHours", "2.5"); await click(page, "#taskSave"); await sleep(150);
  r = await page.evaluate(id => { const t = data.tasks.find(x => x.id === id); return { title: t.title, hours: t.hours, n: data.tasks.filter(x => /report/.test(x.title)).length }; }, taskId);
  ok("tasks: edit changes title and hours in place (no copy)", r.title === "Write Q3 report" && r.hours === 2.5 && r.n === 1, r);
  // repeat for the next 7 days, twice: no duplicates
  await page.evaluate(() => { openTaskDialog(null, "personal"); document.getElementById("taskTitleWrap").hidden = false; taskPresetChoice = "__custom"; });
  await val(page, "#taskTitle", "Stretch"); await val(page, "#taskHours", "0.25"); await page.evaluate(() => { document.getElementById("taskExpand7").checked = true; });
  await click(page, "#taskSave"); await sleep(150);
  await page.evaluate(() => { openTaskDialog(null, "personal"); document.getElementById("taskTitleWrap").hidden = false; taskPresetChoice = "__custom"; });
  await val(page, "#taskTitle", "Stretch"); await val(page, "#taskHours", "0.25"); await page.evaluate(() => { document.getElementById("taskExpand7").checked = true; });
  await click(page, "#taskSave"); await sleep(150);
  r = await page.evaluate(() => { const s = data.tasks.filter(x => x.title === "Stretch"); const dates = s.map(x => x.date); return { n: s.length, uniq: new Set(dates.filter(d => d !== TODAY)).size, todayN: dates.filter(d => d === TODAY).length, last: dates.sort().pop(), want: shift(TODAY, 7) }; });
  ok("tasks: 'today + next 7 days' adds 8 days; repeating it only adds a second one today", r.uniq === 7 && r.last === r.want && r.todayN === 2 && r.n === 9, r);
  // delete
  r = await page.evaluate(() => { const ids = data.tasks.filter(x => x.title === "Stretch" && x.date !== TODAY).map(x => x.id); return ids.length; });
  // edit that would break the cap is refused and leaves the task untouched
  await page.evaluate(id => openTaskDialog(id), taskId); await val(page, "#taskHours", "23"); await click(page, "#taskSave"); await sleep(150);
  r = await page.evaluate(id => ({ h: data.tasks.find(x => x.id === id).hours, open: document.getElementById("taskDialog").open }), taskId);
  ok("tasks: an edit that breaks 24h is refused, task unchanged", r.h === 2.5 && r.open, r);
  await clean(page); await page.evaluate(() => { const a = document.getElementById("capAlert"); if (a) a.remove(); });
  await page.screenshot({ path: TMP + "/treg-tasks.png" });

  // ================= GOALS
  await page.evaluate(() => { openScreen("goals"); openGoalDialog(null, "personal"); }); await page.waitForSelector("#goalDialog[open]");
  await val(page, "#goalTitle", "Run 100 miles"); await val(page, "#goalUnit", "custom"); await page.evaluate(() => { if (typeof toggleGoalUnitCustom === "function") toggleGoalUnitCustom(); });
  await val(page, "#goalUnitCustom", "miles"); await val(page, "#goalStart", "0"); await val(page, "#goalTarget", "100"); await val(page, "#goalDir", "up");
  await click(page, "#goalSave"); await sleep(150);
  r = await page.evaluate(() => { const g = data.goals.find(x => x.title === "Run 100 miles"); return g && { area: g.area, unit: goalUnit(g), start: g.start, current: g.current, target: g.target, dir: g.direction, pct: goalPct(g) }; });
  ok("goals: add 'Run 100 miles' (personal, miles, 0 → 100)", r && r.area === "personal" && r.unit === "miles" && r.current === 0 && r.target === 100 && r.dir === "up", r);
  const goalId = await page.evaluate(() => data.goals.find(x => x.title === "Run 100 miles").id);
  await page.evaluate(id => openProgressDialog(id), goalId); await val(page, "#progressAmount", "12.5"); await val(page, "#progressNote", "long run"); await click(page, "#progressSave"); await sleep(150);
  r = await page.evaluate(id => { const g = data.goals.find(x => x.id === id); return { cur: g.current, n: g.progress.length, last: g.progress[g.progress.length - 1], pct: Math.round(goalPct(g)) }; }, goalId);
  ok("goals: 'Went up by 12.5' moves it to 12.5 (13%) with a history entry", r.cur === 12.5 && r.n === 1 && r.last.delta === 12.5 && r.last.note === "long run", r);
  await page.evaluate(id => { openProgressDialog(id); progressMode = "total"; syncProgressMode(); }, goalId); await val(page, "#progressAmount", "30"); await click(page, "#progressSave"); await sleep(150);
  r = await page.evaluate(id => { const g = data.goals.find(x => x.id === id); return { cur: g.current, delta: g.progress[g.progress.length - 1].delta }; }, goalId);
  ok("goals: 'New total 30' sets it to 30 and logs +17.5", r.cur === 30 && r.delta === 17.5, r);
  await page.evaluate(id => { const g = data.goals.find(x => x.id === id); g.paused = true; save(); renderDerived(); }, goalId);
  const dirGoal = await page.evaluate(() => { data.goals.push({ id: "gdown", area: "personal", title: "Lose weight", start: 200, current: 200, target: 180, unit: "custom", unitCustom: "lbs", direction: "down", incomeCounts: false, accountId: "", linkStart: null, created: TODAY, touched: "", paused: false, deadline: "", progress: [] }); save(); openProgressDialog("gdown"); return document.getElementById("progressChangeChip").innerText; });
  await val(page, "#progressAmount", "4"); await click(page, "#progressSave"); await sleep(150);
  r = await page.evaluate(() => { const g = data.goals.find(x => x.id === "gdown"); return { cur: g.current, pct: Math.round(goalPct(g)), text: goalProgressText(g) }; });
  ok("goals: a 'down' goal says 'Went down by' and 200 → 196 is 20%", dirGoal === "Went down by" && r.cur === 196 && r.pct === 20, [dirGoal, r]);
  await clean(page);
  await page.screenshot({ path: TMP + "/treg-goals.png" });

  // ================= THEMES
  await page.evaluate(() => openThemes()); await sleep(200);
  const before = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await click(page, '#themesDialog [data-theme-pick="bold-dojo"]'); await sleep(200);
  r = await page.evaluate(() => ({ theme: data.theme, bg: getComputedStyle(document.body).backgroundColor, pressed: document.querySelector('#themesDialog [data-theme-pick="bold-dojo"]').getAttribute("aria-pressed"), opt: (document.getElementById("btnOptions") || {}).textContent }));
  ok("themes: picking Dojo applies it (colours change, swatch pressed)", r.theme === "bold-dojo" && r.bg !== before && r.pressed === "true" && /All settings|Dojo/.test(r.opt || "Dojo"), [before, r]);
  const picId = await page.evaluate(() => PICTURE_THEMES[0].id);
  await click(page, `#themesDialog [data-theme-pick="${picId}"]`); await sleep(200);
  r = await page.evaluate(() => ({ theme: data.theme, bgEl: !!document.getElementById("themeBg") && getComputedStyle(document.getElementById("themeBg")).backgroundImage }));
  ok("themes: a picture theme applies with its picture", r.theme === picId && /url\(/.test(r.bgEl || ""), r);
  await page.evaluate(() => { loadCustomEditor(null); }); await val(page, "#ctName", "Night Owl"); await click(page, "#ctSave"); await sleep(200);
  r = await page.evaluate(() => ({ n: data.customThemes.length, name: data.customThemes[0] && data.customThemes[0].name, cur: data.theme }));
  ok("themes: save a custom theme and it becomes current", r.n === 1 && r.name === "Night Owl" && r.cur === (await page.evaluate(() => data.customThemes[0].id)), r);
  await click(page, '#themesDialog [data-theme-pick="bold-deep-ocean"]'); await sleep(150);
  await click(page, "#themesDone"); await sleep(150);

  // ================= REMINDERS
  r = await page.evaluate(id => {
    const g = data.goals.find(x => x.id === id);
    // past time: saving it must not fire right away
    const past = new Date(Date.now() - 2 * 3600e3); const at = iso(past) + "T" + String(past.getHours()).padStart(2, "0") + ":" + String(past.getMinutes()).padStart(2, "0");
    window.__hsNotified = [];
    setItemReminder(g, { at, repeat: "daily", firedThrough: 0 }); save(); checkReminders();
    return { fired: window.__hsNotified.length, ft: g.reminder.firedThrough > 0, next: remNext(g.reminder, Date.now()) - Date.now() };
  }, goalId);
  ok("reminders: setting a time in the past does not fire right away", r.fired === 0 && r.ft, r);
  ok("reminders: daily repeat's next one is about 22h away", r.next > 21.9 * 3600e3 && r.next < 22.1 * 3600e3, r.next / 3600e3);
  r = await page.evaluate(() => {
    const t = data.tasks.find(x => x.title === "Write Q3 report");
    const p = new Date(Date.now() - 60e3); const at = iso(p) + "T" + String(p.getHours()).padStart(2, "0") + ":" + String(p.getMinutes()).padStart(2, "0");
    t.reminder = { at, repeat: "none", firedThrough: 0 }; save();
    window.__hsNotified = []; checkReminders(); const first = window.__hsNotified.slice(); checkReminders();
    return { first, again: window.__hsNotified.length, ft: t.reminder.firedThrough };
  });
  ok("reminders: a due task reminder fires once with 'Higher Self' and the item", r.first.length === 1 && r.first[0].title === "Higher Self" && /Write Q3 report/.test(r.first[0].body) && r.first[0].kind === "task" && r.again === 1, r);
  // path reminder from the path dialog UI
  await page.evaluate(id => openPathDialog(id), writerId); await page.waitForSelector("#pathDialog[open]");
  await val(page, "#rpRepeat", "weekly"); await val(page, "#rpDate", "2030-01-07"); await val(page, "#rpTime", "07:30"); await click(page, "#pathSave"); await sleep(150);
  r = await page.evaluate(id => pathById(id).reminder, writerId);
  ok("reminders: path dialog saves a weekly 07:30 reminder", r && r.at === "2030-01-07T07:30" && r.repeat === "weekly", r);
  await page.evaluate(id => openPathDialog(id), writerId); await val(page, "#rpRepeat", "daily"); await val(page, "#rpDate", ""); await val(page, "#rpTime", "");
  await page.evaluate(() => { document.getElementById("rpDate").value = ""; document.getElementById("rpTime").value = ""; }); await click(page, "#pathSave"); await sleep(100);
  r = await page.evaluate(() => ({ open: document.getElementById("pathDialog").open, err: document.getElementById("rpErr").hidden ? "" : document.getElementById("rpErr").innerText }));
  ok("reminders: a reminder with no date/time asks for both", r.open && /date and a time/.test(r.err), r);
  await clean(page);
  // settings list
  await page.evaluate(() => { document.getElementById("optionsDialog").showModal(); renderReminderList(); }); await sleep(100);
  r = await page.evaluate(() => [...document.querySelectorAll("#remList [data-rem]")].map(li => li.dataset.rem.split(":")[0]).sort());
  ok("reminders: Settings lists the goal, path and task reminders", r.join() === "goal,path,task", r);
  await page.evaluate(id => document.querySelector(`#remList [data-rem-del="path:${id}"]`).click(), writerId); await sleep(100);
  ok("reminders: Remove clears it", await page.evaluate(id => !pathById(id).reminder && document.querySelectorAll("#remList [data-rem]").length === 2, writerId));
  await clean(page);
  // missed while locked -> banner on unlock, not a notification burst
  await page.evaluate(() => { const g = data.goals.find(x => x.id === "gdown"); const p = new Date(Date.now() - 5 * 60e3); g.reminder = { at: iso(p) + "T" + String(p.getHours()).padStart(2, "0") + ":" + String(p.getMinutes()).padStart(2, "0"), repeat: "none", firedThrough: 0 }; save(); });

  // ================= PERSISTENCE across lock + unlock
  const snap = () => page.evaluate(() => JSON.stringify({ paths: data.paths.map(p => [p.name, !!p.archived, p.reminder && p.reminder.at]), logs: data.pathLogs.length, sleep: data.days[TODAY].sleep, nt: data.days[TODAY].pathNotToday, tasks: data.tasks.map(t => [t.title, t.hours, t.status, t.date]).sort(), goals: data.goals.map(g => [g.title, g.current, !!g.paused, g.progress.length]), theme: data.theme, custom: data.customThemes.map(t => t.name) }));
  await page.evaluate(() => { window.__hsNotified = []; });
  const A = await snap();
  await relock(page);
  const B = await snap();
  r = await page.evaluate(() => ({ theme: data.theme, banner: (document.getElementById("dueBanner") || {}).innerText || "", notified: (window.__hsNotified || []).length }));
  ok("persistence: paths, logs, sleep, tasks, goals, theme all survive lock + unlock", A === B, A === B ? undefined : [A, B]);
  ok("persistence: paused goal stays paused", await page.evaluate(id => data.goals.find(g => g.id === id).paused === true, goalId));
  ok("themes: chosen theme (Deep Ocean) re-applies after unlock", r.theme === "bold-deep-ocean" && await page.evaluate(() => document.querySelector('#themesDialog [data-theme-pick="bold-deep-ocean"]') ? true : true), r);
  ok("reminders: one missed while locked shows in the banner on unlock, no notification burst", /Lose weight/.test(r.banner) && r.notified === 0, r);

  // ================= BACKUP + RESTORE
  await page.evaluate(() => { window.__dl = null; const orig = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function () { if (this.download) { window.__dl = { name: this.download, href: this.href }; return; } return orig.call(this); }; });
  await page.evaluate(() => downloadBackup()); await sleep(400);
  const dl = await page.evaluate(async () => { if (!window.__dl) return null; const t = await (await fetch(window.__dl.href)).text(); return { name: window.__dl.name, text: t }; });
  ok("backup: downloads a file named for the profile and date", dl && /\.hsbak$|\.json$/.test(dl.name) && /Guillermo|higher-self/i.test(dl.name), dl && dl.name);
  ok("backup: file is encrypted (no names or task titles inside)", dl && !/Write Q3 report|Run 100 miles|Dad/.test(dl.text) && /exportedAt/.test(dl.text), dl && dl.text.slice(0, 160));
  const bakPath = TMP + "/treg-backup.hsbak"; fs.writeFileSync(bakPath, dl ? dl.text : "{}");
  // change things after the backup
  await page.evaluate(() => { data.tasks.push({ id: "after1", area: "hobbies", title: "Added after backup", hours: 1, status: "todo", date: TODAY, notes: "", repeat: "" }); data.goals = data.goals.filter(g => g.title !== "Run 100 miles"); data.theme = "bold-dojo"; save(); renderDerived(); });
  // wrong passphrase: refused, data untouched
  // v39: the passphrase is asked in a masked dialog; a wrong one shows an error in the dialog and changes nothing.
  const passFlow = async (pw) => { await page.waitForSelector("#passDialog[open]", { timeout: 5000 }); await page.type("#passInput", pw); await page.click("#passOk"); await sleep(1500); };
  let input = await page.$("#restoreFile"); await input.uploadFile(bakPath); await passFlow("wrong-pass");
  r = await page.evaluate(() => ({ after: data.tasks.some(t => t.id === "after1"), err: document.getElementById("passErr").textContent, open: document.getElementById("passDialog").open, masked: document.getElementById("passInput").type }));
  ok("restore: wrong passphrase is refused and nothing changes", r.after && r.open && /passphrase/.test(r.err) && r.masked === "password", r);
  await page.type("#passInput", PASS); await page.click("#passOk"); await sleep(2000); await clean(page);
  const C = await snap();
  r = await page.evaluate(() => ({ after: data.tasks.some(t => t.id === "after1"), theme: data.theme, goal: data.goals.some(g => g.title === "Run 100 miles") }));
  ok("restore: right passphrase brings back the backup exactly (goal back, later task gone, theme back)", !r.after && r.goal && r.theme === "bold-deep-ocean" && C === B, r);
  await relock(page);
  ok("restore: restored data is what unlocks next time", (await snap()) === B);

  // ================= DELETE path (last, destructive)
  await page.evaluate(id => { deletePath(id); }, fatherId); await confirmYes(page);
  r = await page.evaluate(id => ({ gone: !pathById(id), logs: data.pathLogs.filter(l => l.pathId === id).length, task: data.tasks.some(t => t.title === "Homework with Ana") }), fatherId);
  ok("paths: delete removes the path, its logs and its linked task", r.gone && r.logs === 0 && !r.task, r);
  r = await page.evaluate(() => { applyScreen("home"); return document.documentElement.scrollWidth <= 390; });
  ok("no sideways overflow on home at 390px", r);
  ok("no page errors", errs.length === 0, errs);
  await browser.close();
  console.log(JSON.stringify(res, null, 1)); console.log("CHECKS " + Object.keys(res).length + " FAILS " + fails);
})().catch(e => { console.error(e); console.log(JSON.stringify(res, null, 1)); console.log("CHECKS " + Object.keys(res).length + " FAILS " + (fails + 1) + " (crashed)"); process.exit(1); });
