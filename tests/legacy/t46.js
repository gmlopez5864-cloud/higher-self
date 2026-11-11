// v46: one inline icon dropdown for every choice, "+ Add your own…" saved and shown again next time,
// migration keeps stars/icons/hidden flags, and the Currency list is filled however Settings opens.
const A = require("./lib/app");
const { sleep, ok, done } = Object.assign({}, A, A.suite());
const NAME = "Sample", PASS = "sample-pass-46";
(async () => {
  const browser = await A.launch();
  const { page, errs } = await A.phonePage(browser);
  await A.fresh(page);
  await A.setup(page, NAME, PASS);
  // ---------- migration: a v45-shaped vault keeps every custom thing ----------
  let r = await page.evaluate(() => {
    const old = JSON.parse(JSON.stringify(data));
    old.customPulls = [{ id: "c-doom", label: "Doomscrolling", steer: "Reading", opposite: "", img: "icons/pull-custom.jpg", starred: true, pair: true }, { id: "c-gossip", label: "Gossip", steer: "", opposite: "", img: "icons/pull-custom.jpg" }];
    old.hiddenPulls = ["c-gossip"];
    old.accounts = [{ id: "a1", name: "Checking", openingBalance: 10 }, { id: "a2", name: "Cash jar", openingBalance: 5, img: "icons/glyphs128/placeholders/account-cash.png", starred: true }];
    old.expenseCustom = [{ id: "cat_pets", name: "Pet food", img: "icons/glyphs128/money/groceries.png" }, { id: "cat_x", name: "Old" }];
    old.expenseFavs = ["cat_pets", "groceries"];
    old.favorites = { tasks: [{ area: "career", title: "Ship it" }], goals: [{ area: "personal", title: "Read" }] };
    delete old.customSteers; delete old.incomeCustom; delete old.goalUnitsCustom;
    const d = migrateLegacy(old);
    return { pulls: d.customPulls, hidden: d.hiddenPulls, acc: d.accounts, cats: d.expenseCustom, favs: d.expenseFavs, fav: d.favorites, steers: d.customSteers, inc: d.incomeCustom, units: d.goalUnitsCustom, v46: d.migrated && d.migrated.v46 };
  });
  ok("migration: starred custom shadow keeps its star and pair flag; hidden stays hidden", r.pulls.length === 2 && r.pulls[0].starred === true && r.pulls[0].pair === true && !r.pulls[1].starred && r.hidden.join() === "c-gossip", r);
  ok("migration: accounts keep balances, icons and stars", r.acc.length === 2 && r.acc[0].openingBalance === 10 && r.acc[1].img === "icons/glyphs128/placeholders/account-cash.png" && r.acc[1].starred === true && !r.acc[0].img, r.acc);
  ok("migration: expense categories keep names and icons; favorites survive", r.cats.length === 2 && r.cats[0].img === "icons/glyphs128/money/groceries.png" && r.cats[1].name === "Old" && r.favs.join() === "cat_pets,groceries" && r.fav.tasks.length === 1 && r.fav.goals.length === 1, r);
  ok("migration: new v46 lists start empty", Array.isArray(r.steers) && !r.steers.length && Array.isArray(r.inc) && !r.inc.length && Array.isArray(r.units) && !r.units.length && r.v46 === true, r);

  // ---------- every select gets the pill ----------
  r = await page.evaluate(() => { const all = [...document.querySelectorAll("select")]; return { n: all.length, done: all.filter(s => s.__isel && s.__isel.btn && s.__isel.btn.isConnected).length, hiddenButLaidOut: all.every(s => getComputedStyle(s).display !== "none"), role: document.querySelector(".isel").getAttribute("aria-haspopup") }; });
  ok("every <select> on the page has an inline dropdown (native one kept underneath)", r.n > 20 && r.n === r.done && r.hiddenButLaidOut && r.role === "listbox", r);

  // ---------- dropdown: label left, icon on the right, opens, keyboard, picks ----------
  await page.evaluate(() => openMoneyDialog(null)); await sleep(400);
  r = await page.evaluate(() => {
    const sel = document.getElementById("moneyAccount"), btn = sel.__isel.btn, lab = sel.closest("label"), lr = lab.querySelector(".pick-label").getBoundingClientRect(), br = btn.getBoundingClientRect();
    return { row: lab.classList.contains("pick-row"), leftRight: lr.left < br.left && Math.abs((lr.top + lr.height / 2) - (br.top + br.height / 2)) < 16, icon: !!btn.querySelector("img.isel-ico"), txt: btn.querySelector(".isel-txt").textContent, h: br.height };
  });
  ok("Account: label on the left, rounded pill on the right with the account's icon", r.row && r.leftRight && r.icon && r.txt === "Checking" && r.h >= 44, r);
  await page.evaluate(() => document.getElementById("moneyAccount").__isel.btn.click()); await sleep(350);
  r = await page.evaluate(() => { const pop = document.querySelector(".isel-pop"); const opts = [...pop.querySelectorAll(".isel-opt")]; return { open: pop.classList.contains("is-open"), exp: document.getElementById("moneyAccount").__isel.btn.getAttribute("aria-expanded"), labels: opts.map(o => o.textContent.replace(/[✓★]/g, "").trim()), sel: opts.filter(o => o.getAttribute("aria-selected") === "true").map(o => o.dataset.v), check: pop.querySelector('[aria-selected="true"] .isel-check').textContent, add: opts[opts.length - 1].hasAttribute("data-isel-add"), inDialog: !!pop.closest("dialog#moneyDialog"), minH: Math.min(...opts.map(o => o.getBoundingClientRect().height)) }; });
  ok("open list: check on the chosen one, + Add your own… last, rows ≥ 44px, lives in the sheet", r.open && r.exp === "true" && r.sel.length === 1 && r.check === "✓" && r.add && /Add your own/.test(r.labels[r.labels.length - 1]) && r.inDialog && r.minH >= 44, r);
  await page.keyboard.press("ArrowDown"); await page.keyboard.press("Enter"); await sleep(300);
  r = await page.evaluate(() => ({ v: document.getElementById("moneyAccount").value, pop: !!document.querySelector(".isel-pop"), txt: document.getElementById("moneyAccount").__isel.btn.querySelector(".isel-txt").textContent, focus: document.activeElement === document.getElementById("moneyAccount").__isel.btn, id1: data.accounts[1].id, n1: data.accounts[1].name }));
  ok("keyboard: arrow + Enter picks, closes, returns focus to the pill", r.v === r.id1 && !r.pop && r.txt === r.n1 && r.focus, r);
  await page.evaluate(() => { document.getElementById("moneyAccount").value = data.accounts[0].id; }); await sleep(50);
  r = await page.evaluate(() => document.getElementById("moneyAccount").__isel.btn.querySelector(".isel-txt").textContent);
  ok("setting the value from code repaints the pill", r === "Checking", r);
  await page.evaluate(() => document.getElementById("moneyAccount").__isel.btn.click()); await sleep(300);
  await page.keyboard.press("Escape"); await sleep(300);
  r = await page.evaluate(() => ({ pop: !!document.querySelector(".isel-pop"), dlg: document.getElementById("moneyDialog").open }));
  ok("Escape closes only the list, not the sheet", !r.pop && r.dlg, r);

  // ---------- Add your own: account ----------
  await page.evaluate(() => document.getElementById("moneyAccount").__isel.btn.click()); await sleep(300);
  await page.evaluate(() => document.querySelector(".isel-pop [data-isel-add]").click()); await sleep(350);
  r = await page.evaluate(() => ({ open: document.getElementById("ownDialog").open, title: document.getElementById("ownTitle").textContent, marks: document.querySelectorAll("#ownMarks [data-mark]").length, money: document.getElementById("moneyDialog").open }));
  ok("+ Add your own… opens the one sheet: name, icon grid, Star it — on top of the money sheet", r.open && r.title === "Add your own account" && r.marks >= 8 && r.money, r);
  await page.type("#ownName", "Tip jar");
  await page.evaluate(() => document.querySelectorAll("#ownMarks [data-mark]")[2].click());
  await page.evaluate(() => { document.getElementById("ownStar").checked = true; document.getElementById("ownSave").click(); }); await sleep(350);
  r = await page.evaluate(() => { const a = data.accounts.find(x => x.name === "Tip jar"); return { a, v: document.getElementById("moneyAccount").value, txt: document.getElementById("moneyAccount").__isel.btn.querySelector(".isel-txt").textContent, img: document.getElementById("moneyAccount").__isel.btn.querySelector("img").getAttribute("src"), sheet: document.getElementById("ownDialog").open }; });
  ok("saved account is picked right away with its icon and star", r.a && r.a.starred === true && !!r.a.img && r.v === r.a.id && r.txt === "Tip jar" && r.img.indexOf(r.a.img.replace("icons/glyphs128/", "")) >= 0 && !r.sheet, r);

  // ---------- Add your own: income source, unit, steer, path, shadow, expense category ----------
  await page.evaluate(() => { document.querySelector('#moneyTypeRow [data-mtype="income"]').click(); }); await sleep(200);
  await page.evaluate(() => document.getElementById("moneySource").__isel.btn.click()); await sleep(300);
  await page.evaluate(() => document.querySelector(".isel-pop [data-isel-add]").click()); await sleep(300);
  await page.type("#ownName", "Tips");
  await page.evaluate(() => document.getElementById("ownSave").click()); await sleep(300);
  r = await page.evaluate(() => ({ list: data.incomeCustom.map(x => x.name), v: document.getElementById("moneySource").value, txt: document.getElementById("moneySource").__isel.btn.querySelector(".isel-txt").textContent }));
  ok("income source you add is saved and chosen", r.list.join() === "Tips" && /^inc:/.test(r.v) && r.txt === "Tips", r);
  await page.evaluate(() => { document.getElementById("moneyAmt").value = "12"; }); 
  await page.evaluate(() => document.getElementById("moneySave").click()); await sleep(400);
  r = await page.evaluate(() => { const m = data.money[data.money.length - 1]; return m && { cat: m.category, label: m.label, type: m.type }; });
  ok("an entry from your own source saves as Other with your name as the label", r && r.type === "income" && r.cat === "other" && r.label === "Tips", r);

  await A.clean(page);
  await page.evaluate(() => openMoneyDialog(null)); await sleep(300);
  await page.evaluate(() => { document.querySelector('#moneyTypeRow [data-mtype="expense"]').click(); }); await sleep(200);
  await page.evaluate(() => document.getElementById("moneyCatAdd").click()); await sleep(300);
  r = await page.evaluate(() => ({ open: document.getElementById("ownDialog").open, title: document.getElementById("ownTitle").textContent }));
  ok("expense '+ Add your own…' opens the same sheet", r.open && r.title === "Add your own category", r);
  await page.type("#ownName", "Gym");
  await page.evaluate(() => { document.querySelectorAll("#ownMarks [data-mark]")[1].click(); document.getElementById("ownSave").click(); }); await sleep(300);
  r = await page.evaluate(() => { const c = data.expenseCustom.find(x => x.name === "Gym"); const chip = c && document.querySelector('#moneyCatGrid [data-cat="' + c.id + '"]'); return { c, chosen: c && document.getElementById("moneyExpense").value === c.id, img: chip && chip.querySelector("img.cat-ico") && chip.querySelector("img.cat-ico").getAttribute("src") }; });
  ok("expense category gets the icon you picked and is chosen", r.c && !!r.c.img && r.chosen && !!r.img, r);
  await A.clean(page);

  await page.evaluate(() => openGoalDialog(null)); await sleep(300);
  await page.evaluate(() => document.getElementById("goalUnit").__isel.btn.click()); await sleep(300);
  await page.evaluate(() => document.querySelector(".isel-pop [data-isel-add]").click()); await sleep(300);
  await page.type("#ownName", "pages");
  await page.evaluate(() => document.getElementById("ownSave").click()); await sleep(300);
  await page.evaluate(() => { document.getElementById("goalTitle").value = "Read more"; document.getElementById("goalSave").click(); }); await sleep(300);
  r = await page.evaluate(() => { const g = data.goals.find(x => x.title === "Read more"); return { units: data.goalUnitsCustom.map(x => x.name), unit: g && g.unit, uc: g && g.unitCustom }; });
  ok("goal unit you add is saved and the goal uses it", r.units.join() === "pages" && r.unit === "custom" && r.uc === "pages", r);
  await A.clean(page);

  await page.evaluate(() => { data.paths.push({ id: "pa46", name: "Writer", img: "icons/paths/athlete.jpg", created: TODAY, active: true, archived: false }); save(); openPathLog("pa46"); });
  await page.waitForSelector("#pathLogDialog[open]"); await sleep(300);
  r = await page.evaluate(() => { const t = document.querySelector("#pathLogDialog").innerText; return { caps: (t.match(/Pick up to 5\./g) || []).length, sub: [...document.querySelectorAll("#pathLogDialog .pick-sub")].map(x => x.textContent), legacyShown: !!document.querySelector("#pathLogDialog .ss-legacy").offsetParent }; });
  ok("'Pick up to 5.' no longer repeats; one Shadow & steer row says 'Up to 5 of each' (v46.1)", r.caps === 0 && r.sub.filter(x => x === "Up to 5 of each").length === 1 && !r.legacyShown, r);
  // v46.1: shadows and steers share one dropdown, grouped by type
  await page.evaluate(() => document.getElementById("plShadowSteer").__isel.btn.click()); await sleep(300);
  r = await page.evaluate(() => [...document.querySelectorAll(".isel-pop .isel-grp")].map(g => g.textContent));
  ok("combined list: shadows from the book first, then more shadows, then steers", r[0] === "Shadows · from the book" && r.includes("More shadows") && r.includes("Steers"), r);
  await page.evaluate(() => document.querySelector(".isel-pop [data-isel-add]").click()); await sleep(300);
  r = await page.evaluate(() => ({ types: !document.getElementById("ownTypeRow").hidden, title: document.getElementById("ownTitle").textContent }));
  ok("+ Add your own… asks: a shadow or a steer", r.types && r.title === "Add your own shadow", r);
  await page.evaluate(() => document.querySelector('#ownTypeRow [data-own-type="steer"]').click()); await sleep(100);
  await page.type("#ownName", "Stillness");
  r = await page.evaluate(() => ({ title: document.getElementById("ownTitle").textContent, second: document.getElementById("ownSecondWrap").hidden }));
  await page.evaluate(() => document.getElementById("ownSave").click()); await sleep(300);
  r.after = await page.evaluate(() => ({ steers: data.customSteers.map(x => x.name), picked: plState.steered.slice(), img: steerImg("Stillness") }));
  ok("a steer can be added on its own, is picked and keeps its icon", r.title === "Add your own steer" && r.second && r.after.steers.join() === "Stillness" && r.after.picked.includes("Stillness") && !!r.after.img, r);
  await page.evaluate(() => document.getElementById("plShadowSteer").__isel.btn.click()); await sleep(300);
  await page.evaluate(() => document.querySelector(".isel-pop [data-isel-add]").click()); await sleep(300);
  r = await page.evaluate(() => ({ second: !document.getElementById("ownSecondWrap").hidden, title: document.getElementById("ownTitle").textContent }));
  ok("shadow sheet has the optional steer field", r.second && r.title === "Add your own shadow", r);
  await page.type("#ownName", "Snacking"); await page.type("#ownSecond", "Water first");
  await page.evaluate(() => { document.getElementById("ownStar").checked = true; document.getElementById("ownSave").click(); }); await sleep(350);
  r = await page.evaluate(() => { const c = data.customPulls.find(p => p.label === "Snacking"); return { c, pulls: plState.pulls.slice(), steered: plState.steered.slice() }; });
  ok("shadow you add is starred, picked, and brings its steer", r.c && r.c.starred && r.c.steer === "Water first" && r.pulls.includes(r.c.id) && r.steered.includes("Water first"), r);
  await page.evaluate(() => document.getElementById("plShadowSteer").__isel.btn.click()); await sleep(300);
  r = await page.evaluate(() => { const out = []; let g = ""; document.querySelectorAll(".isel-pop .isel-grp, .isel-pop .isel-opt").forEach(e => { if (e.classList.contains("isel-grp")) g = e.textContent; else out.push(g + ":" + e.querySelector(".isel-lbl").textContent.replace("★", "")); }); return out; });
  ok("after picking a shadow the steers come first; ones already picked are not offered twice", /^Steers/.test(r[0]) && !r.some(x => /:(Snacking|Stillness|Water first)$/.test(x)) && r.some(x => /^Shadows · from the book:/.test(x)), r.slice(0, 6));
  await page.keyboard.press("Escape"); await sleep(250);
  // Paths box is a multi-pick dropdown
  await page.evaluate(() => document.getElementById("plPaths").__isel.btn.click()); await sleep(300);
  r = await page.evaluate(() => ({ multi: document.querySelector(".isel-pop").hasAttribute("data-multi"), aria: document.querySelector(".isel-pop [role=listbox]").getAttribute("aria-multiselectable") }));
  await page.evaluate(() => document.querySelector('.isel-pop .isel-opt[data-v="pa46"]').click()); await sleep(150);
  r.still = await page.evaluate(() => !!document.querySelector(".isel-pop"));
  await page.evaluate(() => document.querySelector(".isel-pop [data-isel-done]").click()); await sleep(300);
  r.sel = await page.evaluate(() => readPathFields(document.getElementById("plFields")).pathIds);
  ok("Paths is a multi-pick dropdown (stays open, Done closes, picks are read)", r.multi && r.aria === "true" && r.still && r.sel.join() === "pa46", r);
  await A.clean(page);

  // ---------- long-press edit, hide, delete ----------
  await page.evaluate(() => openMoneyDialog(null)); await sleep(300);
  await page.evaluate(() => document.getElementById("moneyAccount").__isel.btn.click()); await sleep(300);
  await page.evaluate(() => { const el = [...document.querySelectorAll(".isel-pop .isel-opt[data-own]")].find(o => /Tip jar/.test(o.textContent)); el.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true })); }); await sleep(350);
  r = await page.evaluate(() => ({ open: document.getElementById("ownDialog").open, title: document.getElementById("ownTitle").textContent, name: document.getElementById("ownName").value, acts: !document.getElementById("ownEditActs").hidden }));
  ok("long-press (context menu) on your own item opens it to edit, hide or delete", r.open && r.title === "Edit your account" && r.name === "Tip jar" && r.acts, r);
  await page.evaluate(() => { document.getElementById("ownName").value = "Tips jar"; document.getElementById("ownSave").click(); }); await sleep(300);
  r = await page.evaluate(() => data.accounts.map(a => a.name));
  ok("editing renames it in place", r.includes("Tips jar") && !r.includes("Tip jar"), r);
  await A.clean(page);

  // ---------- persists through lock / unlock and shows under Yours next time ----------
  await A.lock(page);
  await A.unlock(page, NAME, PASS);
  r = await page.evaluate(() => ({ steers: data.customSteers.map(x => x.name), inc: data.incomeCustom.map(x => x.name), units: data.goalUnitsCustom.map(x => x.name), acc: (data.accounts.find(a => a.name === "Tips jar") || {}).starred, cat: (data.expenseCustom.find(c => c.name === "Gym") || {}).img, pull: (data.customPulls.find(p => p.label === "Snacking") || {}).starred }));
  ok("after lock + unlock every own item is still there (steer, income, unit, account star, category icon, starred shadow)", r.steers.join() === "Stillness" && r.inc.join() === "Tips" && r.units.join() === "pages" && r.acc === true && !!r.cat && r.pull === true, r);
  await page.evaluate(() => openMoneyDialog(null)); await sleep(300);
  await page.evaluate(() => document.getElementById("moneySource").__isel.btn.click()); await sleep(300);
  r = await page.evaluate(() => { const out = []; let g = ""; document.querySelectorAll(".isel-pop .isel-grp, .isel-pop .isel-opt").forEach(e => { if (e.classList.contains("isel-grp")) g = e.textContent; else out.push(g + ":" + e.querySelector(".isel-lbl").textContent); }); return out; });
  ok("next time, your income source shows under Yours", r.includes("Yours:Tips"), r);
  await page.keyboard.press("Escape"); await sleep(250);
  await page.evaluate(() => document.getElementById("moneySource").__isel.btn.click()); await sleep(300);
  await page.evaluate(() => { const el = [...document.querySelectorAll(".isel-pop .isel-opt[data-own]")].find(o => /Tips/.test(o.textContent)); el.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true })); }); await sleep(300);
  await page.evaluate(() => document.getElementById("ownHide").click()); await sleep(300);
  await page.evaluate(() => { document.getElementById("moneySource").value = "paycheck"; document.getElementById("moneySource").__isel.btn.click(); }); await sleep(300);
  r = await page.evaluate(() => ({ hidden: data.incomeCustom[0].hidden, shown: [...document.querySelectorAll(".isel-pop .isel-opt")].some(o => /Tips/.test(o.textContent)) }));
  ok("Hide keeps it saved but out of the list", r.hidden === true && !r.shown, r);
  await page.keyboard.press("Escape"); await sleep(250);
  await A.clean(page);

  // ---------- currency list: filled however Settings opens ----------
  await page.evaluate(() => { document.getElementById("curList").innerHTML = ""; document.getElementById("menuSettingsToggle").click(); }); await sleep(100);
  await page.evaluate(() => { document.getElementById("menuDrawer").showModal(); document.getElementById("menuSettings").hidden = false; document.getElementById("btnOptions").click(); }); await sleep(900);
  r = await page.evaluate(() => ({ open: document.getElementById("optionsDialog").open, n: document.querySelectorAll("#curList option").length, pill: document.getElementById("curList").__isel.btn.querySelector(".isel-txt").textContent }));
  ok("currency list is filled when Settings opens from the side menu (was blank)", r.open && r.n >= 30 && r.pill === "US dollar" || (r.open && r.n >= 30 && /US dollar/.test(r.pill)), r);
  await A.clean(page);
  await page.evaluate(() => { document.getElementById("curList").innerHTML = ""; document.getElementById("menuDrawer").showModal(); document.getElementById("menuSettings").hidden = false; document.getElementById("menuReminders").click(); }); await sleep(900);
  r = await page.evaluate(() => document.querySelectorAll("#curList option").length);
  ok("…and when it opens from Reminders", r >= 30, r);
  r = await page.evaluate(() => ({ secs: [...document.querySelectorAll("#optionsDialog .set-h")].map(h => h.textContent), backup: !!document.getElementById("optBackupNow"), menuIcons: document.querySelectorAll("#menuSettings .menu-item img.menu-ico").length, menuItems: document.querySelectorAll("#menuSettings .menu-item").length }));
  ok("Settings has clear sections, a Back up now button; every menu item has an icon", r.secs.length >= 6 && r.secs[0] === "Look" && r.backup && r.menuIcons === r.menuItems, r);
  await A.clean(page);

  // ---------- planned block defaults ----------
  await page.evaluate(() => openPlanEditor({})); await sleep(300);
  r = await page.evaluate(() => ({ path: document.getElementById("planPath").value }));
  await page.evaluate(() => { document.getElementById("planRepeat").value = "1"; document.getElementById("planRepeat").dispatchEvent(new Event("change")); document.getElementById("planUntilOff").checked = true; document.getElementById("planUntilOn").checked = false; syncPlanForm(); }); await sleep(100);
  r.endHidden = await page.evaluate(() => document.getElementById("planUntilLabel").hidden);
  await page.evaluate(() => { document.getElementById("planUntilOn").checked = true; document.getElementById("planUntilOff").checked = false; syncPlanForm(); });
  r.endShown = await page.evaluate(() => !document.getElementById("planUntilLabel").hidden);
  ok("new planned block: no path picked for you; end date hidden for 'Until I stop it'", r.path === "" && r.endHidden && r.endShown, r);
  await A.clean(page);

  // ---------- layout ----------
  await page.evaluate(() => openScreen("money")); await sleep(300);
  r = await page.evaluate(() => { const tabs = [...document.querySelectorAll(".money-tabs .chip")].filter(c => c.offsetParent); const tops = new Set(tabs.map(t => Math.round(t.getBoundingClientRect().top))); return { n: tabs.length, rows: tops.size }; });
  ok("money tabs sit on one row (no lone 'Savings')", r.n >= 4 && r.rows === 1, r);
  await page.evaluate(() => openScreen("home")); await sleep(300);
  r = await page.evaluate(() => { const t = [...document.querySelectorAll("#homeTiles .home-tile")]; const last = t[t.length - 1].getBoundingClientRect(), first = t[0].getBoundingClientRect(); return { n: t.length, w: Math.round(last.width), w0: Math.round(first.width) }; });
  ok("a lone last home tile spans the row", r.n % 2 === 0 || r.w > r.w0 * 1.5, r);
  r = await page.evaluate(() => { const fam = s => getComputedStyle(document.querySelector(s)).fontFamily; return { h2: fam("#diaryTitle"), dlg: fam("#ownTitle") }; });
  ok("one heading font", r.h2 === r.dlg && /Georgia/.test(r.h2), r);
  r = await page.evaluate(() => { const st = [...document.styleSheets].flatMap(s => { try { return [...s.cssRules]; } catch (e) { return []; } }).map(x => x.cssText).join("\n"); return { reduce: /prefers-reduced-motion: reduce[\s\S]*dialog/.test(st), start: /@starting-style/.test(st) }; });
  ok("sheets animate open/close and respect reduced motion", r.reduce && r.start, r);
  r = await page.evaluate(() => shownVersion());
  ok("web build shows 43 (Android shows 46 with ?android=1)", r === "43", r);

  ok("no page errors", errs.length === 0, errs);
  await browser.close();
  done();
})().catch(e => { console.error(e); process.exit(1); });
