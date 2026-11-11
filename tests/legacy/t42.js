// v42: debt Pay off; diary voice notes + photos (encrypted in IndexedDB, compressed, capped, in backups, backup size);
// "Turn into text" on-device only (hidden on the web / when the phone can't); shadow + steer dropdowns with
// "+ Add your own" pairs, starring, built-in Addiction (you name its steer) and shadow stories; the honor test;
// pie rows / centre / cream outlines / striped planned slices / lighter sleep; "Work ran over"; the guide lines;
// "Your month". Today is pinned to Wed 21 Oct 2026 (America/Phoenix).
const A = require("./lib/app"); const { sleep, ok, done } = Object.assign({}, A, A.suite());
const { puppeteer } = require("./lib/env");
const fs = require("fs"), { execSync } = require("child_process");
const SHOTS = process.env.HS_SHOTS || "/workspace/hs-review/v42";
const N = s => String(s || "").replace(/[\u202f\u00a0]/g, " ").replace(/\s+/g, " ").trim();
const PHOTO = A.TMP + "/big-photo.png";
execSync(`python3 -c "
from PIL import Image, ImageDraw
im=Image.new('RGB',(3000,2000),(200,120,60)); d=ImageDraw.Draw(im)
for i in range(0,3000,40): d.line((i,0,3000-i,2000),fill=(i%255,90,160),width=9)
im.save('${PHOTO}')"`);
const SPEECH_MOCK = avail => `(() => {
  window.__sp = { calls: [] };
  const HSSpeech = { available: async () => ({ available: ${avail} }), transcribe: async a => { __sp.calls.push(a); return { text: "Call mom about Sunday.", onDevice: true }; } };
  const Camera = { getPhoto: async o => { __sp.cam = o; const c = document.createElement("canvas"); c.width = 2400; c.height = 1800; const g = c.getContext("2d"); g.fillStyle = "#3a7"; g.fillRect(0, 0, 2400, 1800); return { dataUrl: c.toDataURL("image/jpeg", 0.95) }; } };
  window.Capacitor = { isNativePlatform: () => true, getPlatform: () => "android", Plugins: { HSSpeech, Camera } };
})();`;
async function launchMedia() { return puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: "new", args: ["--no-sandbox", "--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", "--autoplay-policy=no-user-gesture-required"] }); }
(async () => {
  const browser = await launchMedia(); const { page, errs } = await A.phonePage(browser);
  const tap = async sel => { await page.evaluate(s => { const e = document.querySelector(s); if (e) e.scrollIntoView({ block: "center" }); }, sel); await sleep(120); await page.click(sel); };
  await A.fresh(page); await A.setup(page, "Guillermo", "gui-pass-1");
  let r = await page.evaluate(async () => ({ v: APP_VERSION, icon: ICON_VER, sw: (await (await fetch("sw.js", { cache: "no-store" })).text()).match(/const CACHE = "([^"]+)"/)[1] }));
  ok("APP_VERSION 42, ICON_VER 42, sw cache higher-self-v43", r.v === "43" && r.icon === "43" && r.sw === "higher-self-v43", r);

  // ---------- Pay off
  await page.evaluate(() => {
    window.__acc = data.accounts.map(a => [a.id, a.name]);
    data.debts.push({ id: "visa", name: "Visa", balance: 1234.56, apr: 22, mode: "fixed", payment: 200, pct: 1, extra: 0, payFrom: data.accounts.find(a => a.name === "Checking").id, dueDay: 25, billRepeatId: "", billConfirmed: true });
    syncDebtBills(); save(); renderDerived(); openScreen("money");
  }); await sleep(500);
  r = await page.evaluate(() => { const b = document.querySelector('[data-debt-payoff="visa"]'); const i = b && b.querySelector("img"); return { txt: b && b.innerText.trim(), src: i && i.getAttribute("src"), w: i && i.naturalWidth, bill: data.repeats.find(x => x.debtId === "visa").active }; });
  ok("each debt has a 'Pay off' button with Pablo's payoff icon (money/payoff.png, loads)", r.txt === "Pay off" && /glyphs128\/money\/payoff\.png\?v=43$/.test(r.src) && r.w === 128 && r.bill === true, r);
  await page.evaluate(() => { const b = document.querySelector('[data-money-tab="debts"]'); if (b) b.click(); }); await sleep(200);
  await tap('[data-debt-payoff="visa"]'); await sleep(300);
  r = await page.evaluate(() => { const d = document.getElementById("payoffDialog"); return { open: d.open, title: document.getElementById("payoffTitle").innerText.trim(), total: document.getElementById("payoffTotal").innerText, from: d.querySelector("label").childNodes[0].textContent.trim(), opts: [...document.getElementById("payoffFrom").options].map(o => o.text), sel: document.getElementById("payoffFrom").value, btns: [...d.querySelectorAll(".actions button")].map(b => b.innerText.trim()), ico: document.getElementById("payoffIco").naturalWidth, chk: data.accounts.find(a => a.name === "Checking").id }; });
  ok("'Pay off Visa?' with the total, 'Take it from:' account picker, Pay off / Cancel", r.open && r.title === "Pay off Visa?" && /1,234\.56/.test(r.total) && r.from === "Take it from:" && r.opts.join() === "Checking,Savings,Cash" && r.sel === r.chk && JSON.stringify(r.btns) === '["Cancel","Pay off"]' && r.ico === 128, r);
  await page.screenshot({ path: SHOTS + "/v42-payoff-dialog.png" });
  const SAV = await page.evaluate(() => data.accounts.find(a => a.name === "Savings").id); await page.select("#payoffFrom", SAV); await page.click("#payoffGo"); await sleep(200);
  r = await page.evaluate(() => ({ toast: document.getElementById("toast").textContent, d: data.debts[0], pay: data.money.filter(m => m.debtId === "visa").map(m => [m.amount, m.accountId === data.accounts.find(a => a.name === "Savings").id ? "sav" : m.accountId, m.date]), bill: data.repeats.find(x => x.debtId === "visa").active, btn: !!document.querySelector('[data-debt-payoff="visa"]'), card: document.querySelector('[data-debt="visa"]').innerText }));
  ok("after: 'Visa is paid off.'", r.toast === "Visa is paid off.", r.toast);
  ok("logs the payment from Savings (full balance), marks it paid off, stops the monthly bill", JSON.stringify(r.pay) === '[[1234.56,"sav","2026-10-21"]]' && r.d.balance === 0 && r.d.paidOff === "2026-10-21" && r.bill === false && !r.btn && /Paid off/.test(r.card), r);
  r = await page.evaluate(() => { postDueRepeats(); return data.money.filter(m => m.debtId === "visa").length; });
  ok("no more bill entries after", r === 1, r);
  await page.screenshot({ path: SHOTS + "/v42-payoff-done.png" });

  // ---------- Diary: voice + photo
  await page.evaluate(() => { openScreen("diary"); diaryDay = TODAY; renderDiary(); }); await sleep(500);
  r = await page.evaluate(() => { const v = document.querySelector("#diaryVoice img"), p = document.querySelector("#diaryPhoto img"); return { v: v.getAttribute("src"), vw: v.naturalWidth, p: p.getAttribute("src"), pw: p.naturalWidth, vt: document.getElementById("diaryVoice").innerText.trim(), pt: document.getElementById("diaryPhoto").innerText.trim(), note: document.querySelector(".diary-composer").innerText, tt: document.querySelectorAll("[data-to-text]").length }; });
  ok("composer: 'Voice note' and 'Add photo' with Pablo's diary icons (load)", r.vt === "Voice note" && r.pt === "Add photo" && /glyphs128\/diary\/voice-note\.png\?v=43$/.test(r.v) && r.vw === 128 && /glyphs128\/diary\/add-photo\.png\?v=43$/.test(r.p) && r.pw === 128, r);
  ok("note: 'Voice notes and photos stay on this phone and go into your backups.'", /Voice notes and photos stay on this phone and go into your backups\./.test(r.note));
  await tap("#diaryVoice"); await sleep(1800);
  r = await page.evaluate(() => ({ t: document.getElementById("diaryVoice").innerText.trim(), pressed: document.getElementById("diaryVoice").getAttribute("aria-pressed"), time: document.getElementById("diaryRecTime").innerText }));
  ok("while recording: 'Recording… tap to stop' (with time of 3:00)", r.t === "Recording… tap to stop" && r.pressed === "true" && /^0:0\d of 3:00$/.test(r.time), r);
  await page.screenshot({ path: SHOTS + "/v42-diary-recording.png" });
  await tap("#diaryVoice"); await sleep(1200);
  r = await page.evaluate(() => ({ t: document.getElementById("diaryVoice").innerText.trim(), pend: dMedia.map(m => [m.kind, m.type, m.bytes > 0, m.secs]), li: [...document.querySelectorAll("#diaryPending li")].map(l => l.innerText.trim()) }));
  ok("tap to stop: one voice note waiting to be added", r.t === "Voice note" && r.pend.length === 1 && r.pend[0][0] === "audio" && /^audio\//.test(r.pend[0][1]) && r.pend[0][2] && r.pend[0][3] >= 1, r);
  const [chooser] = await Promise.all([page.waitForFileChooser(), tap("#diaryPhoto")]);
  await chooser.accept([PHOTO]); await sleep(1500);
  r = await page.evaluate(() => dMedia.filter(m => m.kind === "photo").map(m => ({ w: m.w, h: m.h, bytes: m.bytes, type: m.type })));
  const orig = fs.statSync(PHOTO).size;
  ok("photo is compressed: 3000x2000 → 1280x853 JPEG", r.length === 1 && r[0].w === 1280 && r[0].h === 853 && r[0].type === "image/jpeg" && r[0].bytes < 400000, { r, orig });
  await page.type("#diaryNote", "Long day. Dad called."); await page.screenshot({ path: SHOTS + "/v42-diary-pending.png" });
  await tap("#diaryAdd"); await sleep(1500);
  r = await page.evaluate(() => { const e = data.diary[data.diary.length - 1]; const li = document.querySelector("#diaryList li[data-feed-kind=note]"); const img = li.querySelector("img.diary-photo"), au = li.querySelector("audio");
    return { media: (e.media || []).map(m => m.kind), img: img && img.src.slice(0, 5), iw: img && img.naturalWidth, au: au && au.src.slice(0, 5), tt: li.querySelectorAll("[data-to-text]").length, pending: dMedia.length }; });
  ok("entry keeps the voice note and the photo; both play/show from this phone (blob URLs)", JSON.stringify(r.media) === '["audio","photo"]' && r.img === "blob:" && r.iw === 1280 && r.au === "blob:" && r.pending === 0, r);
  ok("web build: no 'Turn into text' (no on-device recognizer here, and no network fallback)", r.tt === 0, r);
  await page.evaluate(() => document.querySelector("#diaryList li[data-feed-kind=note]").scrollIntoView({ block: "center" })); await sleep(300);
  await page.screenshot({ path: SHOTS + "/v42-diary-entry-media.png" });
  // encrypted at rest
  r = await page.evaluate(async () => {
    const e = data.diary[data.diary.length - 1]; const keys = await idbKeys(KEY);
    const rec = await idbDo("readonly", st => st.get(KEY + "|" + e.media[1].id));
    const u = new Uint8Array(rec.ct); const vault = localStorage.getItem(KEY);
    return { keys: keys.length, iv: !!rec.iv, jpeg: u[0] === 0xFF && u[1] === 0xD8, len: u.length, bytes: e.media[1].bytes, vaultHasImg: /data:image|blob:/.test(vault), vaultLen: vault.length, salt: !!data.mediaSalt, saltInVaultPlain: vault.includes(data.mediaSalt) };
  });
  ok("media is encrypted (AES-GCM) in IndexedDB: no JPEG bytes, 16-byte tag added; the vault holds no image data", r.keys === 2 && r.iv && !r.jpeg && r.len === r.bytes + 16 && !r.vaultHasImg && r.salt && !r.saltInVaultPlain, r);
  // backup size
  await page.evaluate(() => { document.querySelectorAll("dialog[open]").forEach(d => d.close()); document.getElementById("btnOptions").click(); }); await sleep(400);
  r = await page.evaluate(() => ({ t: document.getElementById("backupSize").innerText, est: backupSizeEstimate().total }));
  ok("Settings shows the backup size: 'Your backup is about N KB, with 1 voice note and 1 photo.'", /^Your backup is about \d+ KB, with 1 voice note and 1 photo\.$/.test(r.t), r);
  await page.evaluate(() => document.getElementById("backupSizePanel").scrollIntoView({ block: "center" })); await sleep(200);
  await page.screenshot({ path: SHOTS + "/v42-settings-backup-size.png" });
  await page.evaluate(() => document.querySelectorAll("dialog[open]").forEach(d => d.close()));
  // backup includes the media; restore brings it back
  await A.catchDownloads(page);
  await page.evaluate(() => downloadBackup()); await page.waitForFunction(() => window.__dl.length > 0, { timeout: 20000 });
  const dl = await A.lastDownload(page);
  r = await page.evaluate(async (text, est) => { const env = JSON.parse(text); const plain = await decryptPayload(env, "gui-pass-1"); const ids = data.diary[data.diary.length - 1].media.map(m => m.id);
    return { has: ids.every(id => plain.__media && plain.__media[id] && plain.__media[id].b64.length > 100), plainText: /Long day|Dad called/.test(text), size: text.length, est }; }, dl.text, await page.evaluate(() => backupSizeEstimate().total));
  ok("the backup carries both files inside the encrypted payload (nothing readable outside)", r.has && !r.plainText, r);
  ok("the size estimate is close to the real file (±25%)", Math.abs(r.size - r.est) / r.size < 0.25, r);
  await page.evaluate(() => deleteVaultMedia(KEY)); await sleep(300);
  await page.evaluate(t => { window.__imp = importBackupFile(new File([t], "b.hsbak")); }, dl.text);
  await page.waitForSelector("#passDialog[open]", { timeout: 5000 }); await page.type("#passInput", "gui-pass-1"); await page.click("#passOk");
  await page.evaluate(() => window.__imp); await sleep(1500);
  r = await page.evaluate(async () => { const keys = await idbKeys(KEY); openScreen("diary"); diaryDay = TODAY; renderDiary(); await new Promise(r => setTimeout(r, 800)); const img = document.querySelector("#diaryList img.diary-photo"); return { keys: keys.length, iw: img && img.naturalWidth, has: !data.__media }; });
  ok("restore puts the voice note and photo back (and keeps __media out of the vault)", r.keys === 2 && r.iw === 1280 && r.has, r);
  // lock + unlock: still opens (key comes from the passphrase)
  await A.lock(page); await A.unlock(page, "Guillermo", "gui-pass-1");
  r = await page.evaluate(async () => { openScreen("diary"); diaryDay = TODAY; renderDiary(); await new Promise(r => setTimeout(r, 1200)); const img = document.querySelector("#diaryList img.diary-photo"); return img && img.naturalWidth; });
  ok("after lock + unlock the photo still shows", r === 1280, r);
  // voice cap
  await page.evaluate(() => { window.HS_VOICE_MAX_SECS = 1; }); await tap("#diaryVoice"); await sleep(2600);
  r = await page.evaluate(() => ({ rec: !!diaryRec, pend: dMedia.map(m => m.secs), toast: document.getElementById("toast").textContent }));
  ok("voice notes stop on their own at the cap (3 minutes; 1s in this test) with 'Voice notes stop at 3 minutes.'", !r.rec && r.pend.length === 1 && r.pend[0] <= 1.05 && /Voice notes stop at 3 minutes\./.test(r.toast), r);
  ok("the real cap is 3 minutes", await page.evaluate(() => VOICE_MAX_SECS === 180));
  await page.evaluate(() => { window.HS_VOICE_MAX_SECS = 0; });
  // orphans are swept; removing an entry removes its files
  r = await page.evaluate(async () => { const m = dMedia.pop(); renderPendingMedia(); const n = await sweepMedia(); return { n, keys: (await idbKeys(KEY)).length }; });
  ok("a recording that never made it into an entry is cleaned up", r.n === 1 && r.keys === 2, r);
  r = await page.evaluate(async () => { const e = data.diary[data.diary.length - 1]; removeDiaryEntry(e.id); await new Promise(r => setTimeout(r, 400)); return (await idbKeys(KEY)).length; });
  ok("removing the entry deletes its voice note and photo", r === 0, r);

  // ---------- Shadows and steers
  await page.evaluate(() => { data.paths.push({ id: "eng", name: "Engineer", img: PATH_DEFAULT_ICON, created: TODAY, active: true, archived: false, reminder: null }); save(); openScreen("paths"); openPathLog("eng"); }); await sleep(500);
  r = await page.evaluate(() => { const s = document.getElementById("plPullPick"); return { first: s.options[0].text, groups: [...s.querySelectorAll("optgroup")].map(g => g.label), book: [...(s.querySelector('optgroup[label="From the book"]') || { children: [] }).children].map(o => o.text), afterBook: (s.querySelector('optgroup[label="From the book"]') || {}).nextElementSibling && s.querySelector('optgroup[label="From the book"]').nextElementSibling.text, last: s.options[s.options.length - 1].text, steer0: document.getElementById("plSteerPick").options[0].text }; });
  ok("'Pick a shadow' dropdown, book shadows first (Pride…Fear, then Addiction on its own, v43), '+ Add your own' at the bottom", r.first === "Pick a shadow" && r.groups[0] === "From the book" && r.book.join() === "Pride,Greed,Lust,Envy,Gluttony,Wrath,Sloth,Fear" && r.afterBook === "Addiction" && r.last === "+ Add your own" && r.steer0 === "Pick a steer", r);
  const pick = async (sel, v) => { await page.evaluate((sel, v) => { const s = document.getElementById(sel); s.value = v; s.dispatchEvent(new Event("change")); }, sel, v); await sleep(200); };
  await pick("plPullPick", "pride");
  r = await page.evaluate(() => { const s = document.getElementById("plSteerPick"); return { steers: [...s.options].slice(1, 3).map(o => o.text), chip: document.querySelector("#plPulls [data-pfpull=pride]").innerText, img: document.querySelector("#plPulls [data-pfpull=pride] img").naturalWidth, story: document.querySelector("[data-pf-stories] .shadow-story").innerText.replace(/\s+/g, " ").trim(), title: document.querySelector("[data-pf-stories] .story-title").textContent, label: document.querySelector("[data-pf-stories] .story-label").textContent }; });
  ok("picking Pride: the steer list starts on Honor (then Humility)", r.steers.join() === "Honor,Humility" && /Pride/.test(r.chip) && r.img === 128, r);
  const PRIDE = { "The Emperor's New Clothes": "Written", "The Commission": "Happened", "Zuko": "Written", "The House of Iyi": "Written" };
  ok("a Pride story shows: title + its label (Happened / Handed down / Written)", PRIDE[r.title] === r.label, r);
  await pick("plSteerPick", "Honor");
  await pick("plPullPick", "addiction");
  r = await page.evaluate(() => ({ hint: document.querySelector("[data-pf-steerhint]").textContent, quote: document.querySelector("[data-addiction-quote]").innerText.replace(/\s+/g, " ").trim(), input: !document.querySelector("[data-pf-addsteer]").hidden, ph: document.querySelector('[data-pf="addSteer"]').placeholder, steers: [...document.getElementById("plSteerPick").options].map(o => o.text), story: [...document.querySelectorAll("[data-pf-stories] .shadow-story")].map(x => x.innerText.replace(/\s+/g, " ").trim()), img: document.querySelector("#plPulls [data-pfpull=addiction] img").getAttribute("src") }));
  ok("Addiction: 'What will you do instead? Pick it before the urge.'", r.hint === "What will you do instead? Pick it before the urge." && r.input, r);
  ok("Addiction: the book's two lines (Threefold Training)", r.quote === "This is not only quitting. Quitting leaves a hole, and holes pull the old habit back in. Make the list. Not when the urge arrives. Before it. Threefold Training", r.quote);
  ok("Addiction has no fixed steer: 'Freedom' is only the placeholder, not a listed steer", r.ph === "Freedom" && !r.steers.includes("Freedom"), r);
  ok("Addiction (a custom-type shadow) gets 'The Card' (Written); Pablo's pull-addiction icon", r.story.some(x => /The Card Written/.test(x)) && /pull-addiction\.png/.test(r.img), r);
  ok("v43: Addiction has no preset opposite ('Clarity' was dropped, Guillermo Nov 3)", await page.evaluate(() => typeof ADDICTION_OPPOSITE === "undefined" && pullOpposite("addiction") === null));
  await page.type('[data-pf="addSteer"]', "Call a friend"); await page.click("[data-pf-addsteer-go]"); await sleep(200);
  r = await page.evaluate(() => ({ steered: plState.steered, img: document.querySelector('#plSteered [data-pfsteer="Call a friend"] img').getAttribute("src"), saved: data.addictionSteers }));
  ok("the steer you type for Addiction is yours, with Pablo's steer-freedom icon", JSON.stringify(r.steered) === '["Honor","Call a friend"]' && /steer-freedom\.png/.test(r.img) && JSON.stringify(r.saved) === '["Call a friend"]', r);
  await page.evaluate(() => document.querySelector("[data-pf-quote]").scrollIntoView({ block: "center" })); await sleep(200);
  await page.screenshot({ path: SHOTS + "/v42-steer-addiction.png" });
  // + Add your own
  await pick("plPullPick", "__add");
  r = await page.evaluate(() => { const f = document.querySelector("[data-pf-pair]"); return { shown: !f.hidden, t: f.innerText.replace(/\s+/g, " ").trim() }; });
  ok("'+ Add your own': 'Name the pull' / hint, 'What will you steer it toward?' / hint", r.shown && /Name the pull A screen habit, worry, gossip, whatever pulls at you\. What will you steer it toward\? Name the higher version of this pull\./.test(r.t), r.t);
  await page.type('[data-pf="pairPull"]', "Doomscrolling"); await page.type('[data-pf="pairSteer"]', "Reading"); await page.click('[data-pf="pairStar"]');
  await page.evaluate(() => document.querySelector("[data-pf-pair]").scrollIntoView({ block: "center" })); await page.screenshot({ path: SHOTS + "/v42-add-your-own.png" });
  await page.click("[data-pf-pairsave]"); await sleep(300);
  r = await page.evaluate(() => { const c = data.customPulls.find(p => p.label === "Doomscrolling"); const s = document.getElementById("plPullPick"); return { c, pulls: plState.pulls, steered: plState.steered, img: document.querySelector('#plPulls [data-pfpull="' + c.id + '"] img').getAttribute("src"), star: document.querySelector('[data-pf-star="' + c.id + '"]').getAttribute("aria-pressed"), story: [...document.querySelectorAll("[data-pf-stories] .shadow-story")].pop().innerText.replace(/\s+/g, " ").trim() }; });
  ok("saved as one starred pair (Doomscrolling → Reading), both picked", r.c && r.c.steer === "Reading" && r.c.starred === true && r.pulls.includes(r.c.id) && r.steered.includes("Reading") && r.star === "true", r);
  ok("custom pair uses Pablo's custom-mark icon and 'The Card' story", /pull-custom\.png/.test(r.img) && /The Card Written/.test(r.story), r);
  r = await page.evaluate(() => { const id = data.customPulls.find(p => p.label === "Doomscrolling").id; plState.pulls = plState.pulls.filter(x => x !== id); bindPathFieldChips(document.getElementById("plFields"), plState, null); const s = document.getElementById("plPullPick"); return [...s.querySelectorAll("optgroup")].map(g => g.label + ":" + [...g.children].map(o => o.text).join("|")).find(x => /^Yours:/.test(x)); });
  ok("starred pairs list first in your own pulls (v43: after the book's shadows and Addiction)", r === "Yours:Doomscrolling", r);
  // honor test + clean-spirit story. v45 keeps this inside collapsed Details.
  await page.evaluate(() => { const d = document.querySelector("#plFields details.pf-details"); if (d) d.open = true; });
  r = await page.evaluate(() => { const h = document.querySelector("#plFields [data-pf-honor]"); return { t: h.innerText.replace(/\s+/g, " ").trim(), title: h.querySelector(".story-title").textContent, label: h.querySelector(".story-label").textContent }; });
  ok("Clean spirit: 'The honor test' with both questions and 'Answer only to yourself.'", /^The honor test Would I still do this if no one ever knew\? Can I still say I was wrong\? Answer only to yourself\./.test(r.t), r.t);
  ok("...and a clean-spirit story (The Pocket · Written or The Mast · Handed down)", (r.title === "The Pocket" && r.label === "Written") || (r.title === "The Mast" && r.label === "Handed down"), r);
  ok("every story has an empty phone-length text slot keyed by id (ready to drop in)", await page.evaluate(() => Object.keys(SHADOW_STORIES).length === 22 && Object.values(SHADOW_STORIES).every(s => s.text === "" && s.title && /^(Happened|Handed down|Written)$/.test(s.label))));
  await page.evaluate(() => document.querySelector("#plFields [data-pf-honor]").scrollIntoView({ block: "center" })); await sleep(200);
  await page.screenshot({ path: SHOTS + "/v42-honor-test.png" });
  await page.evaluate(() => document.querySelectorAll("dialog[open]").forEach(d => d.close()));

  // ---------- Pie
  await page.evaluate(() => {
    data.plans.push({ id: "cw", area: "career", pathId: "eng", title: "", start: "08:00", end: "18:00", every: 0, days: [3], from: TODAY, until: "", source: "", icsUid: "" },
      { id: "sl", area: "sleep", pathId: "", title: "", start: "20:00", end: "23:00", every: 0, days: [3], from: TODAY, until: "", source: "", icsUid: "" });
    day(TODAY).sleep = { hours: 5, source: "plan" }; // 5h already confirmed from the plan, 3h still planned tonight
    data.selected = TODAY; save(); renderDerived(); openScreen("time");
  }); await sleep(400);
  r = await page.evaluate(() => ({ rows: [...document.querySelectorAll("#legend li")].map(l => [...l.querySelectorAll("span")].slice(1).map(s => s.textContent).join(" · ")), big: document.querySelector("#pie .pie-c-big").textContent, sub: document.querySelector("#pie .pie-c-sub").textContent,
    strokes: [...document.querySelectorAll("#pie path, #pie > circle")].filter(p => p.getAttribute("data-slice")).map(p => p.getAttribute("stroke")), plan: [...document.querySelectorAll("#pie .pie-planned")].map(p => p.getAttribute("fill")), pat: [...document.querySelectorAll("#pie pattern.plan-pattern rect")].map(x => x.getAttribute("fill")), sleep: SLEEP_COLOR }));
  ok("one row per area: 'Career and responsibilities · 0h of 10h planned'", r.rows[0] === "Career and responsibilities · 0h of 10h planned", r.rows);
  ok("'Sleep · 5h done · 3h planned'", r.rows.includes("Sleep · 5h done · 3h planned"), r.rows);
  ok("centre shows open time ('6h open') with 'Done 5h · Planned 13h' under it", r.big === "6h open" && r.sub === "Done 5h · Planned 13h", r);
  ok("thin cream outline on every slice", r.strokes.length >= 3 && r.strokes.every(x => x === "#FFF8EB"), r.strokes);
  ok("planned slices: the area's full colour with diagonal stripes", r.plan.length === 2 && r.plan.every(f => /^url\(#planStripes-/.test(f)) && r.pat.includes(r.sleep), r);
  ok("lighter sleep colour", r.sleep === "#4A5C9E");
  await page.evaluate(() => document.getElementById("pie").scrollIntoView({ block: "start" })); await sleep(200);
  await page.screenshot({ path: SHOTS + "/v42-pie.png" });

  // ---------- Work ran over
  await page.evaluate(() => {
    data.plans = data.plans.filter(p => !["cw", "sl"].includes(p.id)); day(TODAY).sleep = null;
    data.plans.push({ id: "w2", area: "career", pathId: "eng", title: "", start: "09:00", end: "17:00", every: 0, days: [3], from: TODAY, until: "", source: "", icsUid: "" },
      { id: "hb", area: "time", pathId: "eng", title: "Guitar", start: "17:00", end: "18:00", every: 0, days: [3], from: TODAY, until: "", source: "", icsUid: "" },
      { id: "gy", area: "personal", pathId: "eng", title: "Gym", start: "18:00", end: "19:30", every: 0, days: [3], from: TODAY, until: "", source: "", icsUid: "" });
    save(); renderDerived();
  }); await sleep(300);
  r = await page.evaluate(() => (document.getElementById("planAsk") || {}).innerText || "");
  ok("the confirm card has 'Work ran over'", /Work ran over/.test(r), r);
  await tap("#planOver"); await sleep(300);
  await page.evaluate(() => { document.getElementById("overEnd").value = "18:30"; });
  await page.screenshot({ path: SHOTS + "/v42-work-ran-over.png" });
  await page.click("#overSave"); await sleep(300);
  r = await page.evaluate(() => ({ line: document.querySelector("#planCard .over-line").textContent, w: planOcc(data.plans.find(p => p.id === "w2"), TODAY), hb: data.planDays["hb|" + TODAY], gy: data.planDays["gy|" + TODAY], h: plannedHoursFor(TODAY) }));
  ok("'Career ran 1.5h over plan. It came out of Hobbies and Growth.' (no grade)", r.line === "Career ran 1.5h over plan. It came out of Hobbies and Growth.", r.line);
  ok("new end 6:30 PM; Guitar (covered) dropped; Gym starts 6:30 PM", r.w.end === "18:30" && r.hb.skip === true && r.gy.start === "18:30" && r.h.career === 9.5 && r.h.time === 0 && r.h.personal === 1, r);
  await page.evaluate(() => document.getElementById("planCard").scrollIntoView({ block: "center" })); await sleep(200);
  await page.screenshot({ path: SHOTS + "/v42-work-ran-over-line.png" });
  r = await page.evaluate(() => { data.plans.push({ id: "w3", area: "career", pathId: "eng", title: "", start: "09:00", end: "12:00", every: 0, days: [4], from: "2026-10-22", until: "", source: "", icsUid: "" }); return runOver("2026-10-22", "w3|2026-10-22", "13:00").text; });
  ok("nothing after it: 'Career ran 1h over plan. It came out of open time.'", r === "Career ran 1h over plan. It came out of open time.", r);

  // ---------- Your month
  r = await page.evaluate(() => { day("2026-10-05").sleep = { hours: 7, source: "hand" }; data.money.push({ id: "inc", type: "income", amount: 3000, accountId: data.accounts[0].id, category: "paycheck", label: "", date: "2026-10-01", goalId: "" }); save();
    return { early: coachCandidates("2026-11-02").find(n => n.key === "month:2026-10"), late: coachCandidates("2026-11-12").find(n => n.key === "month:2026-10"), now: coachCandidates(TODAY).some(n => /^month:/.test(n.key)) }; });
  ok("first days of a month: a Coach note 'October is done. Take a look back at your month.' with 'Your month'", r.early && r.early.text === "October is done. Take a look back at your month." && r.early.actions[0].label === "Your month" && !r.late && !r.now, r);
  await page.evaluate(() => coachAction("month", "2026-10")); await sleep(400);
  r = await page.evaluate(() => { const d = document.getElementById("monthDialog"); return { open: d.open, t: d.innerText.replace(/\s+/g, " "), stats: [...document.querySelectorAll("#monthStats li")].map(l => l.textContent), pie: document.querySelectorAll("#monthPie path, #monthPie circle").length }; });
  ok("'Your month': 'What went well?', 'What slipped?', closing 'This too shall pass. The good and the hard both.'", r.open && /^Your month/.test(r.t) && /What went well\?/.test(r.t) && /What slipped\?/.test(r.t) && /This too shall pass\. The good and the hard both\./.test(r.t) && /Your aims for November/.test(r.t), r.t.slice(0, 400));
  ok("month stats: total hours, top paths, money in/out/left, pulls, goals hit, average sleep, days logged", r.stats.length === 7 && /^Total: .*h logged$/.test(r.stats[0]) && /^Top paths: /.test(r.stats[1]) && /^Money: in .*3,000.* · out .* · left /.test(r.stats[2]) && /^Pulls you noticed/.test(r.stats[3]) && /^Goals hit: \d+$/.test(r.stats[4]) && /^Average sleep: 7h$/.test(r.stats[5]) && /^Days logged: \d+ of 21$/.test(r.stats[6]) && r.pie > 1, r.stats);
  await page.type("#monthWell", "Kept the mornings."); await page.type("#monthSlip", "Sleep."); await page.type("#monthAims", "In bed by 10.");
  await page.screenshot({ path: SHOTS + "/v42-your-month.png" });
  await page.click("#monthSave"); await sleep(300);
  r = await page.evaluate(() => ({ rv: data.monthReviews["2026-10"], gone: !coachCandidates("2026-11-02").some(n => n.key === "month:2026-10"), past: (openScreen("record"), document.getElementById("monthPast").innerText), last: document.getElementById("monthOpenLast").textContent }));
  ok("saved and kept; the Coach note goes; past reviews listed in the Record", r.rv.well === "Kept the mornings." && r.rv.slipped === "Sleep." && r.rv.aims === "In bed by 10." && r.gone && /October 2026/.test(r.past) && r.last === "Look back at September", r);
  await page.evaluate(() => document.getElementById("monthBox").scrollIntoView({ block: "center" })); await sleep(200);
  await page.screenshot({ path: SHOTS + "/v42-record-month.png" });

  // ---------- Guide lines
  r = await page.evaluate(() => GUIDE_SCREENS.slice(5).map(g => g.text));
  ok("guide: Pulls / Check-in / Diary / Record lines", r[0] === "Pulls are the shadows that tug at you, like Pride or Wrath. Name one and the app shows what to steer it toward." && r[1] === "Check-in is a quick look at your week: how each path went and which pull showed up." && r[2] === "The Diary is for whatever's on your mind. Write it, say it, or add a photo, and it stays on this phone." && /^The Record keeps everything you've logged, day by day, so you can look back honestly\./.test(r[3]), r);
  await page.evaluate(() => { openGuide(); guideIdx = 7; guideRender(); }); await sleep(500);
  await page.screenshot({ path: SHOTS + "/v42-guide-diary.png" });
  await page.evaluate(() => closeGuide(false));
  ok("no page errors, no outside requests (web)", errs.length === 0, errs);
  await browser.close();

  // ---------- Android app (mocked plugins): on-device "Turn into text" + camera
  const b2 = await launchMedia(); const P2 = await A.phonePage(b2); const page2 = P2.page;
  await page2.evaluateOnNewDocument(SPEECH_MOCK("true"));
  await A.fresh(page2); await A.setup(page2, "Guillermo", "gui-pass-1");
  await page2.evaluate(() => { openScreen("diary"); diaryDay = TODAY; renderDiary(); }); await sleep(300);
  await page2.click("#diaryVoice"); await sleep(1500); await page2.click("#diaryVoice"); await sleep(800);
  await page2.click("#diaryPhoto"); await sleep(1500);
  r = await page2.evaluate(() => ({ cam: __sp.cam && __sp.cam.source, media: dMedia.map(m => [m.kind, m.w || 0]) }));
  ok("Android: Add photo uses the phone's camera / photo picker (Capacitor Camera, PROMPT); the 2400px photo is shrunk to 1280", r.cam === "PROMPT" && r.media.some(m => m[0] === "photo" && m[1] === 1280), r);
  await page2.click("#diaryAdd"); await sleep(1200);
  r = await page2.evaluate(() => ({ ok: speechOk, btn: [...document.querySelectorAll("[data-to-text]")].map(b => b.innerText) }));
  ok("Android with an on-device recognizer: 'Turn into text' on the voice note", r.ok && JSON.stringify(r.btn) === '["Turn into text"]', r);
  await page2.evaluate(() => document.querySelector("[data-to-text]").scrollIntoView({ block: "center" })); await page2.screenshot({ path: SHOTS + "/v42-turn-into-text.png" });
  await page2.click("[data-to-text]"); await sleep(2000);
  r = await page2.evaluate(() => { const m = data.diary[data.diary.length - 1].media.find(x => x.kind === "audio"); const c = __sp.calls[0] || {}; return { text: m.text, how: m.textHow, rate: c.rate, pcm: (c.pcm || "").length, li: document.querySelector(".diary-voice").innerText.replace(/\s+/g, " "), audio: !!document.querySelector(".diary-voice audio"), btn: document.querySelectorAll("[data-to-text]").length }; });
  ok("transcribed on the phone: 16 kHz PCM handed to HSSpeech; text kept with the audio", r.text === "Call mom about Sunday." && r.how === "on-device" && r.rate === 16000 && r.pcm > 1000 && r.audio && r.btn === 0, r);
  ok("note under it: 'Transcribed on this phone.'", /Call mom about Sunday\. Transcribed on this phone\./.test(r.li), r.li);
  await page2.screenshot({ path: SHOTS + "/v42-transcribed.png" });
  ok("no page errors, no outside requests (Android mock)", P2.errs.length === 0, P2.errs);
  await b2.close();
  // phone without on-device recognition: button hidden
  const b3 = await launchMedia(); const P3 = await A.phonePage(b3); const page3 = P3.page;
  await page3.evaluateOnNewDocument(SPEECH_MOCK("false"));
  await A.fresh(page3); await A.setup(page3, "Guillermo", "gui-pass-1");
  await page3.evaluate(() => { openScreen("diary"); diaryDay = TODAY; renderDiary(); }); await sleep(300);
  await page3.click("#diaryVoice"); await sleep(1300); await page3.click("#diaryVoice"); await sleep(800); await page3.click("#diaryAdd"); await sleep(800);
  r = await page3.evaluate(() => ({ ok: speechOk, n: document.querySelectorAll("[data-to-text]").length, audio: document.querySelectorAll(".diary-voice audio").length }));
  ok("phone that can't recognize on the device: no 'Turn into text' (never falls back to the network)", r.ok === false && r.n === 0 && r.audio === 1, r);
  ok("no page errors (no recognizer)", P3.errs.length === 0, P3.errs);
  await b3.close();
  done();
})().catch(e => { console.error(e); process.exit(1); });
