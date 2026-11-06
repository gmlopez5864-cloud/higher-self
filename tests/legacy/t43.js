// v43: "Your road", the feed of diary entries and path logs (newest first, date breaks, filters, lazy pages, photos and
// voice notes, On this day, Note from now, the empty states), Read aloud (phone's own voices only), Addiction with no
// preset opposite/steer, the planned-block hint, Pablo's feed glyphs. Today is pinned to Wed 21 Oct 2026 (Phoenix).
const A = require("./lib/app"); const { sleep, ok, done } = Object.assign({}, A, A.suite());
const { puppeteer } = require("./lib/env");
const fs = require("fs"), path = require("path"), { execSync } = require("child_process");
const SHOTS = process.env.HS_SHOTS || "/workspace/hs-review/v43";
fs.mkdirSync(SHOTS, { recursive: true });
const FX = A.TMP + "/fx"; fs.mkdirSync(FX, { recursive: true });
execSync(`python3 ${path.join(__dirname, "lib/v43fixtures.py")} ${FX}`);
const b64f = f => fs.readFileSync(FX + "/" + f).toString("base64");
const FILES = { sunset: b64f("sunset.jpg"), trail: b64f("trail.jpg"), coffee: b64f("coffee.jpg"), dojo: b64f("dojo.jpg"), v1: b64f("voice1.wav"), v2: b64f("voice2.wav") };
const N = s => String(s || "").replace(/[\u202f\u00a0]/g, " ").replace(/\s+/g, " ").trim();
async function launchMedia() { return puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: "new", args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"] }); }
async function phone(browser, pre) {
  const page = await browser.newPage();
  await page.emulate({ viewport: { width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36" });
  try { await page.emulateTimezone("America/Phoenix"); } catch (e) {}
  // The history cases are written for Wed 21 Oct 2026. The file said that pin; this is where it is applied.
  await page.evaluateOnNewDocument(() => {
    const fixed = Date.parse("2026-10-21T12:00:00-07:00");
    const Real = Date;
    function Fake(...args) { if (!(this instanceof Fake)) return Real(...args); if (args.length === 0) return new Real(fixed); return new Real(...args); }
    Fake.prototype = Real.prototype; Fake.now = () => fixed; Fake.parse = Real.parse; Fake.UTC = Real.UTC; window.Date = Fake;
  });
  if (pre) await page.evaluateOnNewDocument(pre);
  const errs = [];
  page.on("pageerror", e => errs.push("pageerror: " + e.message));
  page.on("console", m => { if (m.type() === "error" && !/favicon|404|persist failed/.test(m.text())) errs.push(m.text()); });
  page.on("request", r => { const u = r.url(); if (!/^(http:\/\/127\.0\.0\.1:8765|blob:|data:|chrome)/.test(u)) errs.push("outside request " + u); });
  page.on("response", r => { if (r.status() === 404 && /127\.0\.0\.1/.test(r.url()) && !/favicon/.test(r.url())) errs.push("404 " + r.url()); });
  return { page, errs };
}
// Realistic sample data for a throwaway profile ("Sample").
async function seed(page) {
  await page.evaluate(async F => {
    const blob = (b, type) => new Blob([Uint8Array.from(atob(b), c => c.charCodeAt(0))], { type });
    const photo = async k => { const c = await compressPhoto(blob(F[k], "image/jpeg")); return storeMedia(c.blob, { kind: "photo", w: c.w, h: c.h }); };
    const voice = async (k, secs, text) => { const m = await storeMedia(blob(F[k], "audio/wav"), { kind: "audio", secs }); if (text) { m.text = text; m.textAt = new Date().toISOString(); m.textHow = "on-device"; } return m; };
    const at = (d, h, mi) => { const [y, m, dd] = d.split("-").map(Number); return new Date(y, m - 1, dd, h, mi).getTime(); };
    const id = (pre, d, h, mi) => pre + at(d, h, mi).toString(36) + Math.random().toString(36).slice(2, 7).padEnd(5, "x");
    const P = (pid, name, img) => ({ id: pid, name, img, created: "2025-09-14", active: true, archived: false, reminder: null });
    data.paths = [P("pw", "Writer", "icons/paths/pen.jpg"), P("pf", "Father", "icons/paths/father.jpg"), P("pm", "Martial artist", "icons/paths/martial-artist.jpg"), P("pr", "Runner", "icons/paths/running-shoes.jpg"), P("pu", "Musician", "icons/paths/musician.jpg")];
    const D = (date, h, mi, note, o) => data.diary.push(Object.assign({ id: id("d", date, h, mi), date, note, offered: "", full: false, area: [], path: [], pulls: [], steered: [] }, o || {}));
    const L = (date, h, mi, pathId, did, journal, o) => data.pathLogs.push(Object.assign({ id: id("pl", date, h, mi), pathId, date, did, better: "", rating: "good", reps: null, repsUnit: "", pulls: [], steered: [], journal, motive: "", clean: "", minutes: 45, area: "personal", taskId: "", source: "log", logged: true, planKey: "" }, o || {}));
    // this week
    D("2026-10-21", 9, 12, "Wrote 600 words before work. The opening finally sounds like me.", { path: ["pw"], media: [await photo("coffee")] });
    L("2026-10-21", 13, 40, "pm", "Morning class, worked guard passes.", "Kept breathing when I got stuck under side control.");
    D("2026-10-20", 20, 30, "Built a blanket fort with Mateo. He named it the castle of no bedtime.", { path: ["pf"], area: ["social"], media: [await voice("v1", 6, "Mateo asked if the fort can stay up all week. I said we'd see.")] });
    L("2026-10-20", 18, 5, "pf", "Picked him up from school and walked the long way home.", "");
    D("2026-10-19", 22, 10, "Hard day. Snapped at Ana over nothing. Took a walk and said sorry after.", { area: ["spiritual"], pulls: ["wrath"], steered: ["Patience"] });
    D("2026-10-18", 17, 45, "Long trail with my brother. Didn't check my phone once.", { path: ["pr"], media: [await photo("trail"), await photo("sunset")] });
    D("2026-10-16", 7, 30, "", { path: ["pw"], media: [await voice("v2", 4, "")] });
    L("2026-10-15", 6, 50, "pr", "Easy 5k by the canal.", "Legs heavy, head clear.");
    // a month ago, and filler back to the start
    D("2026-09-21", 19, 0, "First class back at the dojo after the injury. Scared. Went anyway.", { path: ["pm"], media: [await photo("dojo")] });
    const lines = ["Read two chapters before bed.", "Quiet morning. Coffee on the porch, no phone.", "Practiced the bridge section until it stopped fighting me.", "Long call with Dad. He sounded tired.", "Didn't feel like training. Did ten minutes. Then twenty.", "Wrote badly for an hour. Still counts as showing up.", "Took Mateo to the park. He's braver on the slide than I am.", "Felt envy scrolling. Closed the app and went outside."];
    const ps = ["pw", "pf", "pm", "pr", ""];
    for (let i = 0; i < 46; i++) {
      const d = iso(new Date(2026, 8, 18 - i * 7)); const p = ps[i % 5];
      if (i % 3 === 0 && p) L(d, 7 + (i % 5), 15, p, lines[i % lines.length], i % 2 ? "Small, but it's mine." : "");
      else D(d, 20, 5 + (i % 40), lines[i % lines.length], p ? { path: [p] } : { area: ["personal"] });
    }
    // a year ago (one day off: the nearest that exists) and the very first entry
    D("2025-10-22", 21, 0, "Started this journal. I want to be the kind of father who's actually there.", { path: ["pf"], media: [await photo("sunset")] });
    D("2025-09-14", 10, 0, "Day one. Named my paths: writer, father, martial artist, runner.", {});
    // notes from now: separate records, oldest first
    const hard = data.diary.find(e => e.date === "2026-10-19"), first = data.diary.find(e => e.date === "2025-10-22");
    data.lookBacks = [
      { id: "nb1", ref: "d:" + hard.id, text: "I know it was a hard day but we made it.", at: new Date(2026, 9, 20, 8, 0).toISOString() },
      { id: "nb2", ref: "d:" + first.id, text: "You were scared you'd quit by November. You didn't.", at: new Date(2025, 11, 2, 21, 0).toISOString() },
      { id: "nb3", ref: "d:" + first.id, text: "A year in. He still asks for the castle every Friday.", at: new Date(2026, 9, 21, 7, 30).toISOString() }
    ];
    data.guideSeen = true; save(); renderDerived();
  }, FILES);
}
const feedState = page => page.evaluate(() => {
  const L = document.getElementById("feedList");
  return {
    title: document.getElementById("screenTitle").textContent, chips: [...document.querySelectorAll("#feedChips .chip")].map(b => b.innerText.trim()),
    on: (document.querySelector('#feedChips [aria-pressed="true"]') || {}).innerText, sub: [...document.querySelectorAll("#feedSub .chip")].map(b => b.innerText.trim()),
    days: [...L.querySelectorAll(".rf-day h3")].map(h => h.textContent), cards: [...L.querySelectorAll(".rf-card")].map(c => c.dataset.rfItem),
    kinds: [...L.querySelectorAll(".rf-card")].map(c => c.dataset.rfKind), none: !document.getElementById("feedNone").hidden, noneT: document.getElementById("feedNone").textContent,
    start: document.getElementById("feedStart").hidden ? "" : document.getElementById("feedStart").textContent, more: !document.getElementById("feedMore").hidden,
    otd: [...document.querySelectorAll("#feedOtd .rf-otd-card")].map(b => N2(b.querySelector(".rf-otd-k").textContent)), text: document.getElementById("feedPanel").innerText
  };
  function N2(s) { return String(s).replace(/[\u202f\u00a0]/g, " "); }
});
(async () => {
  const browser = await launchMedia();
  let { page, errs } = await phone(browser);
  const tap = async sel => { await page.evaluate(s => { const e = document.querySelector(s); if (e) e.scrollIntoView({ block: "center" }); }, sel); await sleep(120); await page.click(sel); };
  await A.fresh(page); await A.setup(page, "Sample", "sample-pass-1");
  let r = await page.evaluate(async () => ({ v: APP_VERSION, icon: ICON_VER, sw: (await (await fetch("sw.js", { cache: "no-store" })).text()) }));
  ok("APP_VERSION 43, ICON_VER 43, sw cache higher-self-v43 / ICON_VER 43", r.v === "43" && r.icon === "43" && /const CACHE = "higher-self-v43"/.test(r.sw) && /const ICON_VER = "43"/.test(r.sw), { v: r.v, icon: r.icon });
  const SEVEN = ["feed/feed.png", "feed/note-from-now.png", "feed/on-this-day.png", "feed/feed-empty.png", "feed/read-aloud.png", "feed/read-stop.png"].map(x => "./icons/glyphs128/" + x).concat(["./icons/feed-empty.jpg"]);
  ok("sw.js precaches Pablo's 6 feed glyphs + the painted empty-feed picture", SEVEN.every(u => r.sw.includes('"' + u + '"')));
  r = await page.evaluate(async () => { const j = await (await fetch("icons/theme-art.json?v=" + ICON_VER)).json(); const st = ["ink", "man", "woman", "dog", "cat", "bird", "fish"]; return st.every(s => ["feed.png", "note-from-now.png", "on-this-day.png", "feed-empty.png", "read-aloud.png", "read-stop.png"].every(f => j.glyphs[s].includes("feed/" + f))); });
  ok("theme-art.json lists feed/* for all 7 icon styles", r);

  // ---- empty feed
  r = await page.evaluate(() => { const t = document.querySelector('[data-tile="journal"]'); return t && { label: t.innerText.trim(), src: t.querySelector("img") && t.querySelector("img").getAttribute("src") }; });
  ok("home opens Journal; Your road stays inside it", r && r.label === "Journal", r);
  await tap('[data-tile="journal"]'); await sleep(400);
  r = await page.evaluate(() => ({ scr: currentScreen, title: document.getElementById("screenTitle").textContent, road: document.getElementById("feedTitle").textContent.trim(), empty: !document.getElementById("feedEmpty").hidden, filters: document.getElementById("feedFilters").hidden,
    t: document.getElementById("feedEmpty").innerText.replace(/\s+/g, " ").trim(), img: (document.querySelector("#feedEmptyArt img") || {}).src || "", w: (document.querySelector("#feedEmptyArt img") || {}).naturalWidth, glyph: (document.querySelector("#feedTitle img") || {}).getAttribute && document.querySelector("#feedTitle img").getAttribute("src") }));
  ok("empty feed: gentle empty state with Pablo's painted picture (feed-empty.jpg), no chips", r.scr === "journal" && r.title === "Journal" && /Your road/.test(r.road) && r.empty && r.filters && /icons\/feed-empty\.jpg\?v=43$/.test(r.img) && r.w === 800 && r.t === "Your road starts with your first entry. Write in the Diary or log a moment on a path, and it shows up here. Open the Diary" && /feed\/feed\.png\?v=43/.test(r.glyph || ""), r);
  await page.screenshot({ path: SHOTS + "/v43-feed-empty.png" });

  // ---- sample data
  await seed(page); await page.evaluate(() => renderFeed()); await sleep(800);
  let f = await feedState(page);
  ok("chips: Everything, Diary, then one per path", JSON.stringify(f.chips) === '["Everything","Diary","Writer","Father","Martial artist","Runner","Musician"]' && f.on === "Everything", f.chips);
  ok("second row: All / Photos / Voice notes / Text", JSON.stringify(f.sub) === '["All","Photos","Voice notes","Text"]', f.sub);
  ok("date breaks: Today, Yesterday, then 'Mon, Oct 19'", f.days[0] === "Today" && f.days[1] === "Yesterday" && f.days[2] === "Mon, Oct 19" && f.days[3] === "Sun, Oct 18", f.days.slice(0, 5));
  r = await page.evaluate(() => { const all = feedItems(); return { first: all[0].date, ok: all.every((x, i) => !i || all[i - 1].date >= x.date), todayOrder: all.filter(x => x.date === TODAY).map(x => x.kind) }; });
  ok("newest first; today's path log (1:40 PM) above the 9:12 AM diary entry", r.ok && JSON.stringify(r.todayOrder) === '["path","diary"]', r);
  ok("only the first page renders (25 cards), with 'Show older'", f.cards.length === 25 && f.more && !f.start, { n: f.cards.length, more: f.more });
  r = await page.evaluate(() => [...document.querySelectorAll("#feedList .rf-card")].slice(0, 3).map(c => ({ meta: c.querySelector(".rf-meta").innerText.replace(/[\u202f\u00a0]/g, " ").replace(/\s+/g, " "), pic: c.querySelector(".rf-pic").className, src: c.querySelector(".rf-pic").getAttribute("src") || "" })));
  ok("cards: path + date/time ('Martial artist Oct 21 · 1:40 PM'), path tile when no photo, the photo when there is one", r[0].meta === "Martial artist Oct 21 · 1:40 PM" && /glyphs128\/paths\/martial-artist\.png/.test(r[0].src) && /glyph/.test(r[0].pic) && r[1].meta === "Writer Oct 21 · 9:12 AM" && /is-photo/.test(r[1].pic), r);
  await page.evaluate(() => document.querySelector("#feedList .rf-pic.is-photo").scrollIntoView({ block: "center" })); await sleep(700);
  r = await page.evaluate(() => { const img = document.querySelector("#feedList .rf-card .rf-pic.is-photo"); return { src: img.src.slice(0, 5), w: img.naturalWidth }; });
  ok("photo in view is decrypted and shown (blob:)", r.src === "blob:" && r.w > 0, r);
  r = await page.evaluate(() => { const imgs = [...document.querySelectorAll("#feedList img[data-rf-media]")]; return { total: imgs.length, asked: imgs.filter(i => i.dataset.rfAsked).length }; });
  ok("photos further down wait until they scroll near (lazy)", r.total >= 4 && r.asked < r.total, r);
  ok("On this day: 'One month ago · Mon, Sep 21' and 'One year ago · Wed, Oct 22, 2025' (nearest day that has one)", JSON.stringify(f.otd) === '["One month ago · Mon, Sep 21","One year ago · Wed, Oct 22, 2025"]', f.otd);
  r = await page.evaluate(() => document.querySelector("#feedOtd .rf-otd-h img").getAttribute("src"));
  ok("On this day header uses Pablo's on-this-day glyph", /glyphs128\/feed\/on-this-day\.png\?v=43$/.test(r), r);
  await page.screenshot({ path: SHOTS + "/v43-feed-top.png" });
  // voice
  r = await page.evaluate(() => { const c = [...document.querySelectorAll(".rf-card")].find(x => x.querySelector(".rf-voice")); c.scrollIntoView({ block: "center" }); return { btn: c.querySelector("[data-rf-play]").innerText.replace(/\s+/g, " ").trim(), k: c.querySelector(".rf-voice-k").textContent, tr: (c.querySelector(".rf-transcript") || {}).textContent }; });
  ok("voice note: Play button, length, and its transcript", r.btn === "▶ Play" && r.k === "Voice note · 0:06" && r.tr === "Mateo asked if the fort can stay up all week. I said we'd see.", r);
  await page.evaluate(() => document.querySelector(".rf-card [data-rf-play]").click()); await sleep(700);
  r = await page.evaluate(() => { const b = document.querySelector(".rf-card [data-rf-play]"); return { p: b.getAttribute("aria-pressed"), t: b.innerText.replace(/\s+/g, " ").trim(), playing: !!feedAudio && !feedAudio.paused, src: feedAudio && feedAudio.src.slice(0, 5) }; });
  ok("Play plays the decrypted voice note and turns into Pause", r.p === "true" && r.t === "❚❚ Pause" && r.playing && r.src === "blob:", r);
  await page.screenshot({ path: SHOTS + "/v43-feed-voice.png" });
  await page.evaluate(() => document.querySelector(".rf-card [data-rf-play]").click()); await sleep(200);
  ok("tap again: paused, back to Play", await page.evaluate(() => feedAudio.paused && document.querySelector(".rf-card [data-rf-play]").getAttribute("aria-pressed") === "false"));
  // notes from now
  r = await page.evaluate(() => { const c = [...document.querySelectorAll(".rf-card")].find(x => /Snapped at Ana/.test(x.innerText)); c.scrollIntoView({ block: "center" }); const n = c.querySelectorAll(".nfn");
    return { n: n.length, from: N(n[0].querySelector(".nfn-from").textContent), text: n[0].querySelector(".nfn-text").textContent, ico: n[0].querySelector(".nfn-ico").getAttribute("src"), add: (c.querySelector("[data-nfn-add]") || {}).textContent };
    function N(s) { return s.replace(/[\u202f\u00a0]/g, " "); } });
  ok("a note from now shows under the old entry: 'From you, Oct 20, 2026:' + text, Pablo's note-from-now glyph", r.n === 1 && r.from === "From you, Oct 20, 2026:" && r.text === "I know it was a hard day but we made it." && /glyphs128\/feed\/note-from-now\.png\?v=43$/.test(r.ico) && r.add === "Note from now", r);
  ok("today's entries have no 'Note from now' button (only older ones), and nothing prompts for one", await page.evaluate(() => [...document.querySelectorAll(".rf-card")].filter(c => c.querySelector("time").getAttribute("datetime") === TODAY).every(c => !c.querySelector("[data-nfn-add]"))));
  await page.screenshot({ path: SHOTS + "/v43-feed-days.png" });
  const hardRef = await page.evaluate(() => "d:" + data.diary.find(e => e.date === "2026-10-19").id);
  const before = await page.evaluate(ref => JSON.stringify(data.diary.find(e => "d:" + e.id === ref)), hardRef);
  await page.evaluate(ref => document.querySelector('[data-nfn-for="' + ref + '"] [data-nfn-add]').click(), hardRef); await sleep(200);
  r = await page.evaluate(ref => { const ta = document.querySelector('[data-nfn-for="' + ref + '"] textarea'); return { ph: ta.placeholder, focus: document.activeElement === ta }; }, hardRef);
  ok("'Note from now' opens a box: 'What would you tell yourself now?'", r.ph === "What would you tell yourself now?" && r.focus, r);
  await page.keyboard.type("Two days later and you're still kind to her. Keep that.");
  await page.evaluate(ref => document.querySelector('[data-nfn-for="' + ref + '"] [data-nfn-save]').click(), hardRef); await sleep(200);
  r = await page.evaluate(ref => ({ notes: [...document.querySelectorAll('[data-nfn-for="' + ref + '"] .nfn')].map(n => [n.className, n.querySelector(".nfn-text").textContent]), saved: data.lookBacks.filter(n => n.ref === ref).length, entry: JSON.stringify(data.diary.find(e => "d:" + e.id === ref)) }), hardRef);
  ok("a second note stacks under the first (oldest first, one step further in); the old one stays", r.notes.length === 2 && r.notes[0][0] === "nfn nfn-0" && r.notes[1][0] === "nfn nfn-1" && r.notes[1][1] === "Two days later and you're still kind to her. Keep that." && r.saved === 2, r.notes);
  ok("the original entry is unchanged (notes are separate records)", r.entry === before);
  r = await page.evaluate(ref => { const ns = document.querySelectorAll('[data-nfn-for="' + ref + '"] .nfn'); const cs = [...ns].map(n => getComputedStyle(n)); return { ml: cs.map(c => c.marginLeft), bg: cs.map(c => c.backgroundColor), card: getComputedStyle(ns[0].closest(".rf-card")).backgroundColor }; }, hardRef);
  ok("each later note is further in and a different (warmer) shade than the entry and the one before", parseFloat(r.ml[1]) > parseFloat(r.ml[0]) && r.bg[0] !== r.bg[1] && r.bg[0] !== r.card, r);
  // edit + delete
  const nid = await page.evaluate(ref => data.lookBacks.filter(n => n.ref === ref).pop().id, hardRef);
  await page.evaluate(id => document.querySelector('[data-nfn-edit="' + id + '"]').click(), nid); await sleep(150);
  await page.evaluate(() => { const t = document.querySelector("[data-nfn-editing] textarea"); t.value = "Two days later you're still kind to her. Keep that."; document.querySelector("[data-nfn-editing] [data-nfn-save]").click(); }); await sleep(150);
  r = await page.evaluate(id => { const n = data.lookBacks.find(x => x.id === id); return { text: n.text, edited: !!n.editedAt, at: n.at.slice(0, 10) }; }, nid);
  ok("Edit changes the note's words and keeps the day it was written", r.text === "Two days later you're still kind to her. Keep that." && r.edited, r);
  await page.evaluate(ref => { const c = document.querySelector('[data-nfn-for="' + ref + '"]'); c.scrollIntoView({ block: "center" }); }, hardRef); await sleep(150);
  await page.screenshot({ path: SHOTS + "/v43-note-from-now.png" });
  await page.evaluate(id => document.querySelector('[data-nfn-del="' + id + '"]').click(), nid); await sleep(250);
  r = await page.evaluate(() => ({ open: document.getElementById("confirmDialog").open, msg: document.getElementById("confirmMsg").textContent }));
  ok("Delete asks first: 'Delete this note? The entry above it stays as it was.'", r.open && r.msg === "Delete this note? The entry above it stays as it was.", r);
  await page.click("#confirmDelete"); await sleep(250);
  ok("...then only that note goes", await page.evaluate(ref => data.lookBacks.filter(n => n.ref === ref).map(n => n.id).join() === "nb1" && document.querySelectorAll('[data-nfn-for="' + ref + '"] .nfn').length === 1, hardRef));
  // indent caps at three steps
  r = await page.evaluate(() => { const first = data.diary.find(e => e.date === "2025-10-22"); for (let i = 0; i < 3; i++) data.lookBacks.push({ id: "cap" + i, ref: "d:" + first.id, text: "Later note " + i, at: new Date(2026, 9, 21, 9, i).toISOString() }); return lookBacksHtml("d:" + first.id, first.date, true); });
  ok("indent and warmth stop at the third step (nfn-0, nfn-1, nfn-2, nfn-2, ...)", (r.match(/class="nfn nfn-(\d)"/g) || []).map(x => x.match(/\d/)[0]).join("") === "01222", r.match(/nfn-\d/g));
  await page.evaluate(() => { data.lookBacks = data.lookBacks.filter(n => !/^cap/.test(n.id)); save(); });
  // pagination to the end
  for (let i = 0; i < 8; i++) { await page.evaluate(() => { const more = document.getElementById("feedMore"); if (more && !more.hidden) more.scrollIntoView({ block: "end" }); }); await sleep(400); }
  f = await feedState(page);
  const total = await page.evaluate(() => feedItems().length);
  ok("scrolling down loads older pages until the first entry", f.cards.length === total && !f.more, { n: f.cards.length, total });
  ok("bottom: 'This is where you started. September 14, 2025.'", f.start === "This is where you started. September 14, 2025.", f.start);
  ok("older years get the year in the date break", f.days.includes("Sun, Sep 14, 2025"), f.days.slice(-3));
  await page.evaluate(() => document.getElementById("feedStart").scrollIntoView({ block: "end" })); await sleep(500);
  await page.screenshot({ path: SHOTS + "/v43-feed-end.png" });
  ok("no likes, counts, streaks or scores anywhere in the feed", !/\b(likes|liked|♥|streaks?|score|scores|points|\d+ (entries|days|times|notes|photos|day streak))\b/i.test(f.text) && !/♥|❤/.test(f.text) && !/Good|Neutral|Bad/.test(f.text), f.text.match(/\b(likes|streaks?|score|points|Good|Neutral|Bad)\b/i));
  // filters
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.evaluate(() => document.querySelector('#feedChips [data-rf-sel="diary"]').click()); await sleep(300);
  f = await feedState(page);
  ok("Diary: only diary entries", f.kinds.length > 0 && f.kinds.every(k => k === "diary") && f.on.trim() === "Diary", f.kinds.slice(0, 5));
  await page.evaluate(() => document.querySelector('#feedChips [data-rf-sel="pf"]').click()); await sleep(300);
  r = await page.evaluate(() => [...document.querySelectorAll("#feedList .rf-card")].map(c => c.querySelector(".rf-path").textContent));
  ok("a path chip: that path's logs and the diary entries tagged to it", r.length > 0 && r.every(x => /Father/.test(x)) && (await page.evaluate(() => document.querySelectorAll('#feedList .rf-card[data-rf-kind="path"]').length)) > 0, r.slice(0, 4));
  await page.evaluate(() => document.querySelector('#feedSub [data-rf-sub="voice"]').click()); await sleep(300);
  f = await feedState(page);
  ok("Father + Voice notes: just the fort entry", f.cards.length === 1 && /Mateo asked/.test(f.text), f.cards);
  r = await page.evaluate(() => ({ start: document.getElementById("feedStart").textContent, first: feedItems().filter(it => it.paths.includes("pf")).pop().date }));
  ok("with a second filter on, the bottom still names where this path started", r.start === "This is where you started. " + new Date(r.first + "T12:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) + ".", r);
  await page.screenshot({ path: SHOTS + "/v43-filter-father-voice.png" });
  await page.evaluate(() => { document.querySelector('#feedChips [data-rf-sel="all"]').click(); }); await sleep(200);
  await page.evaluate(() => document.querySelector('#feedSub [data-rf-sub="photos"]').click()); await sleep(600);
  f = await feedState(page);
  ok("Everything + Photos: only entries with a photo", f.cards.length === 4 && (await page.evaluate(() => [...document.querySelectorAll("#feedList .rf-card")].every(c => c.querySelector(".rf-pic.is-photo")))), f.cards.length);
  ok("filters keep 'On this day' to what's showing (both have photos)", f.otd.length === 2, f.otd);
  await page.screenshot({ path: SHOTS + "/v43-filter-photos.png" });
  await page.evaluate(() => document.querySelector('#feedSub [data-rf-sub="text"]').click()); await sleep(300);
  ok("Text: entries with written words (the voice-only note is out)", await page.evaluate(() => feedList.every(it => it.text) && !feedList.some(it => it.date === "2026-10-16")));
  await page.evaluate(() => { document.querySelector('#feedSub [data-rf-sub="all"]').click(); }); await sleep(100);
  await page.evaluate(() => document.querySelector('#feedChips [data-rf-sel="pu"]').click()); await sleep(300);
  f = await feedState(page);
  ok("a path with nothing yet: 'Nothing on this path yet.'", f.none && f.noneT === "Nothing on this path yet." && f.cards.length === 0 && !f.start, f);
  await page.screenshot({ path: SHOTS + "/v43-filter-empty.png" });
  await page.evaluate(() => document.querySelector('#feedChips [data-rf-sel="all"]').click()); await sleep(300);
  // open entries
  await page.evaluate(() => [...document.querySelectorAll(".rf-otd-card")][1].click()); await sleep(500);
  r = await page.evaluate(() => { const d = document.getElementById("feedEntryDialog"); return { open: d.open, t: document.getElementById("feedEntryBody").innerText, notes: [...d.querySelectorAll(".nfn-text")].map(x => x.textContent), photo: !!d.querySelector(".diary-photo") }; });
  ok("tapping 'On this day' opens that entry (full text, photo, its notes oldest first)", r.open && /Started this journal/.test(r.t) && r.photo && JSON.stringify(r.notes) === JSON.stringify(["You were scared you'd quit by November. You didn't.", "A year in. He still asks for the castle every Friday."]), r);
  await sleep(500); await page.screenshot({ path: SHOTS + "/v43-entry-open.png" });
  await page.click("#feedEntryEdit"); await sleep(200);
  await page.evaluate(() => { document.getElementById("feedEntryText").value = "Started this journal. I want to be the kind of father who's actually there. (Fixed a typo.)"; document.getElementById("feedEntrySave").click(); }); await sleep(200);
  ok("Edit in the open entry saves the entry's own text", await page.evaluate(() => /Fixed a typo/.test(data.diary.find(e => e.date === "2025-10-22").note)));
  await page.click("#feedEntryClose"); await sleep(200);
  await page.evaluate(() => document.querySelector('#feedList .rf-card[data-rf-kind="path"] .rf-main').click()); await sleep(400);
  r = await page.evaluate(() => ({ open: document.getElementById("pathLogDialog").open, did: document.getElementById("plDid").value }));
  ok("tapping a path log opens it in the path log editor", r.open && r.did === "Morning class, worked guard passes.", r);
  await page.evaluate(() => document.getElementById("plCancel").click()); await sleep(200);
  // menu + Record
  r = await page.evaluate(() => { openScreen("journal"); const img = document.querySelector("#feedTitle img"); const go = getComputedStyle(document.getElementById("menuGoTitle")).display; return { cls: img && img.className, src: img && img.getAttribute("src"), go }; });
  ok("Journal's Your road heading uses the feed glyph; Go to is not a destination", r && /glyph/.test(r.cls) && /feed\/feed\.png/.test(r.src) && r.go === "none", r);
  await page.evaluate(() => openScreen("record")); await sleep(300);
  r = await page.evaluate(() => document.getElementById("recordRoad").innerText.trim());
  await tap("#recordRoad"); await sleep(300);
  ok("The Record links to it: 'See your road'", r === "See your road" && await page.evaluate(() => currentScreen === "journal" && !!document.getElementById("feedList")), r);
  // diary shows notes from now too
  await page.evaluate(() => { openScreen("diary"); setDiaryDay("2026-10-19"); }); await sleep(300);
  r = await page.evaluate(() => [...document.querySelectorAll("#diaryList .nfn")].map(n => n.innerText.replace(/[\u202f\u00a0]/g, " ").replace(/\s+/g, " ").trim()));
  ok("the Diary shows notes from now under the entry too", r.length === 1 && /^From you, Oct 20, 2026: I know it was a hard day but we made it\./.test(r[0]), r);
  // reload: media + notes survive
  await A.lock(page); ok("unlock again", await A.unlock(page, "Sample", "sample-pass-1"));
  await page.evaluate(() => openScreen("feed")); await sleep(400);
  await page.evaluate(() => { const img = document.querySelector("#feedList .rf-pic.is-photo"); if (img) img.scrollIntoView({ block: "center" }); }); await sleep(700);
  r = await page.evaluate(() => { const img = document.querySelector("#feedList .rf-pic.is-photo"); return { w: img && img.naturalWidth, notes: data.lookBacks.length }; });
  ok("after lock + unlock: photos load and notes are still there", r.w > 0 && r.notes === 3, r);
  await page.reload({ waitUntil: "networkidle0" }); await A.unlock(page, "Sample", "sample-pass-1"); await A.clean(page);
  await page.evaluate(() => openScreen("feed")); await sleep(400);
  await page.evaluate(() => { const img = document.querySelector("#feedList .rf-pic.is-photo"); if (img) img.scrollIntoView({ block: "center" }); }); await sleep(700);
  r = await page.evaluate(async () => { const img = document.querySelector("#feedList .rf-pic.is-photo"); const v = data.diary.find(e => e.date === "2026-10-20").media[0]; const got = await loadMediaBytes(v.id); return { w: img && img.naturalWidth, voice: got && got.bytes.length, notes: data.lookBacks.length }; });
  ok("after a full reload: photos and voice notes decrypt, notes are there", r.w > 0 && r.voice > 1000 && r.notes === 3, r);
  // backup + restore into another profile
  await A.catchDownloads(page);
  await page.evaluate(() => downloadBackup()); await sleep(1500);
  const dl = await A.lastDownload(page);
  const bak = A.TMP + "/sample.hsbak"; fs.writeFileSync(bak, dl.text);
  ok("backup envelope says v43", JSON.parse(dl.text).appVersion === "43");
  await A.lock(page);
  await page.evaluate(() => document.getElementById("profileAdd").click()); await sleep(300);
  await A.setup(page, "Restored", "other-pass-2");
  await page.evaluate(() => document.getElementById("btnRestore").click()); await sleep(300);
  let [chooser] = await Promise.all([page.waitForFileChooser(), page.click("#confirmDelete")]);
  await chooser.accept([bak]); await page.waitForSelector("#passDialog[open]", { timeout: 5000 });
  await page.type("#passInput", "sample-pass-1"); await page.click("#passOk"); await sleep(3000); await A.clean(page);
  await page.evaluate(() => openScreen("feed")); await sleep(400);
  await page.evaluate(() => { const img = document.querySelector("#feedList .rf-pic.is-photo"); if (img) img.scrollIntoView({ block: "center" }); }); await sleep(800);
  r = await page.evaluate(async () => { const img = document.querySelector("#feedList .rf-pic.is-photo"); const v = data.diary.find(e => e.date === "2026-10-20").media[0]; const got = await loadMediaBytes(v.id); return { w: img && img.naturalWidth, voice: got && got.bytes.length, notes: data.lookBacks.map(n => n.text), items: feedItems().length }; });
  ok("restored profile: the feed, its photos, voice notes and notes from now all came back", r.w > 0 && r.voice > 1000 && r.notes.length === 3 && r.notes.includes("I know it was a hard day but we made it.") && r.items === total, r);
  // themes: dark + picture background stay legible
  const contrastOf = () => page.evaluate(() => {
    const px = s => { const m = s.match(/[\d.]+/g).map(Number); return { r: m[0], g: m[1], b: m[2], a: m.length > 3 ? m[3] : 1 }; };
    const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
    const card = document.querySelector("#feedList .rf-card"), t = card.querySelector(".rf-text") || card.querySelector(".rf-path");
    const bg = px(getComputedStyle(card).backgroundColor), fg = px(getComputedStyle(t).color);
    const L1 = lum(fg), L2 = lum(bg); return { ratio: (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05), alpha: bg.a, blur: getComputedStyle(document.getElementById("feedPanel")).backdropFilter };
  });
  await page.evaluate(() => { applyTheme("dusk"); renderFeed(); window.scrollTo(0, 0); }); await sleep(700);
  r = await contrastOf(); ok("Dusk (dark): card text contrast ≥ 7", r.ratio >= 7, r);
  await page.screenshot({ path: SHOTS + "/v43-feed-dusk.png" });
  await page.evaluate(() => { applyTheme("pic-flowers"); renderFeed(); window.scrollTo(0, 0); }); await sleep(900);
  r = await contrastOf(); ok("Flowers (picture background): cards nearly opaque, frosted, text contrast ≥ 4.5", r.ratio >= 4.5 && r.alpha >= 0.9 && /blur/.test(r.blur), r);
  await page.screenshot({ path: SHOTS + "/v43-feed-picture-theme.png" });
  r = await page.evaluate(() => { data.customThemes = data.customThemes || []; data.customThemes.push({ id: "custom-bg", name: "Mine", bg: "#1b1b1b", card: "#fdf6e3", accent: "#b5651d", text: "#222222", photo: "themes/flowers.jpg", veil: false, icons: "ink" }); applyTheme("custom-bg"); renderFeed(); return document.querySelector("#feedList .nfn-ico, #feedOtd .rf-h-ico").getAttribute("src"); }); await sleep(900);
  const cr = await contrastOf(); ok("custom theme with a background picture: legible cards", cr.ratio >= 4.5 && cr.alpha >= 0.9, cr);
  ok("ink icon style: feed glyphs switch to icons/glyphs128-ink/feed/", /glyphs128-ink\/feed\//.test(await page.evaluate(() => document.querySelector("#feedOtd .rf-h-ico").getAttribute("src"))));
  await page.screenshot({ path: SHOTS + "/v43-feed-custom-bg.png" });
  await page.evaluate(() => { applyTheme("dawn"); });
  ok("Read aloud stays hidden when this browser has no on-device voice", await page.evaluate(() => sayOk === !!sayLocalVoice() && (sayOk || getComputedStyle(document.querySelector(".say-btn") || document.body).display === "none" || !document.querySelector(".say-btn"))));

  // ---- Addiction, pull/steer dropdowns, custom pulls
  r = await page.evaluate(() => ({ opp: pullOpposite("addiction"), up: pullUpgrade("addiction"), clarity: steerOptions(["addiction"], []).some(o => /clarity/i.test(o.label)), def: typeof ADDICTION_OPPOSITE }));
  ok("Addiction has no preset opposite or steer, and 'Clarity' is gone from the defaults", r.opp === null && !r.up && !r.clarity && r.def === "undefined", r);
  await page.evaluate(() => openPathLog("pm")); await sleep(300);
  r = await page.evaluate(() => { const s = document.getElementById("plPullPick"); return [...s.children].map(c => c.tagName === "OPTGROUP" ? c.label + ":" + [...c.children].map(o => o.text).join("|") : c.text); });
  ok("pull dropdown: the book's shadows, then Addiction, then '+ Add your own' (other groups between)", r[0] === "Pick a shadow" && /^From the book:Pride\|Greed\|Lust\|Envy\|Gluttony\|Wrath\|Sloth\|Fear$/.test(r[1]) && r[2] === "Addiction" && r[r.length - 1] === "+ Add your own", r);
  await page.select("#plPullPick", "addiction"); await sleep(200);
  r = await page.evaluate(() => ({ steered: plState.steered.slice(), opts: [...document.getElementById("plSteerPick").options].map(o => o.text), box: !document.querySelector("#plFields [data-pf-addsteer]").hidden, ph: document.querySelector('#plFields [data-pf="addSteer"]').placeholder }));
  ok("picking Addiction presets nothing; you name the steer yourself (optional box)", r.steered.length === 0 && r.box && !r.opts.includes("Clarity") && r.opts[r.opts.length - 1] === "+ Add your own", r);
  await page.select("#plSteerPick", "__add"); await sleep(150);
  ok("steer '+ Add your own' with Addiction goes to the name-it box", await page.evaluate(() => document.activeElement === document.querySelector('#plFields [data-pf="addSteer"]')));
  await page.type('#plFields [data-pf="addSteer"]', "Clarity"); await page.click("#plFields [data-pf-addsteer-go]"); await sleep(150);
  ok("typing your own (even 'Clarity') adds it as your steer", await page.evaluate(() => JSON.stringify(plState.steered) === '["Clarity"]'));
  // custom pull through the dropdowns
  await page.select("#plPullPick", "__add"); await sleep(150);
  await page.type('#plFields [data-pf="pairPull"]', "Doomscrolling"); await page.type('#plFields [data-pf="pairSteer"]', "Reading"); await page.click("#plFields [data-pf-pairsave]"); await sleep(250);
  const cid = await page.evaluate(() => data.customPulls.find(p => p.label === "Doomscrolling").id);
  r = await page.evaluate(id => ({ pulls: plState.pulls.slice(), steered: plState.steered.slice(), opp: pullOpposite(id) }), cid);
  ok("custom pull (+ Add your own): saved and picked with the steer you named; no preset opposite", r.pulls.includes(cid) && r.steered.includes("Reading") && r.opp === null, r);
  await page.evaluate(id => { plState.pulls = []; plState.steered = []; bindPathFieldChips(document.getElementById("plFields"), plState, null); }, cid);
  r = await page.evaluate(() => [...document.getElementById("plPullPick").children].map(c => c.tagName === "OPTGROUP" ? c.label : c.text));
  ok("your pulls get their own group after Addiction", r[1] === "From the book" && r[2] === "Addiction" && r[3] === "Yours" && r[r.length - 1] === "+ Add your own", r);
  await page.select("#plPullPick", cid); await sleep(150);
  r = await page.evaluate(() => ({ steered: plState.steered.slice(), first: [...document.getElementById("plSteerPick").options].map(o => o.text) }));
  ok("picking the saved shadow does not record its steer; the list still offers Reading", r.steered.length === 0 && r.first[0] === "Pick a steer" && r.first.includes("Reading") && r.first.includes("Patience"), r);
  await page.select("#plSteerPick", "Patience"); await sleep(100);
  ok("a steer is recorded only when it is chosen from the dropdown", await page.evaluate(() => JSON.stringify(plState.steered) === '["Patience"]'));
  await page.evaluate(() => document.getElementById("plCancel").click()); await sleep(150);

  // ---- planned block hint
  await page.evaluate(() => openPlanEditor({ date: TODAY })); await sleep(200);
  r = await page.evaluate(() => ({ t: document.getElementById("planDialogTitle").textContent, h: document.getElementById("planPickHint").textContent }));
  ok("'Add a planned block': 'Pick one. Where will your attention go?'", r.t === "Add a planned block" && r.h === "Pick one. Where will your attention go?", r);
  await page.evaluate(() => { document.getElementById("planDialog").close(); openPlanEditor({ log: true, date: TODAY }); }); await sleep(200);
  r = await page.evaluate(() => ({ t: document.getElementById("planDialogTitle").textContent, h: document.getElementById("planPickHint").textContent }));
  ok("logging what happened keeps 'Pick one. Where did your attention actually go?'", r.t === "Log time" && r.h === "Pick one. Where did your attention actually go?", r);
  await page.evaluate(() => document.getElementById("planDialog").close());
  ok("no page errors (main run)", errs.length === 0, errs);
  await page.close();

  // ---- Read aloud inside the APK (mocked HSSay plugin: Android TextToSpeech, offline voices)
  const NATIVE = `(() => { window.__say = { calls: [], stops: 0, ls: [] };
    const HSSay = { available: async () => ({ available: true }), speak: async o => { __say.calls.push(o); return { id: o.id }; }, stop: async () => { __say.stops++; }, addListener: (n, fn) => { __say.ls.push(fn); return { remove() {} }; } };
    window.Capacitor = { isNativePlatform: () => true, getPlatform: () => "android", Plugins: { HSSay } }; })();`;
  ({ page, errs } = await phone(browser, NATIVE));
  await A.fresh(page); await A.setup(page, "Sample", "sample-pass-1"); await seed(page);
  await page.evaluate(() => { openScreen("feed"); }); await sleep(800);
  r = await page.evaluate(() => { const b = document.querySelector("#feedList .rf-card .say-btn"); return { can: document.documentElement.classList.contains("can-say"), vis: b && getComputedStyle(b).display !== "none", t: b && b.innerText.trim(), ico: b && b.querySelector("img").getAttribute("src") }; });
  ok("APK: 'Read aloud' shows (phone has an on-device voice), with Pablo's read-aloud glyph", r.can && r.vis && r.t === "Read aloud" && /feed\/read-aloud\.png/.test(r.ico), r);
  r = await page.evaluate(() => ({ entries: !!document.querySelector(".rf-card .rf-acts .say-btn"), transcript: !!document.querySelector(".rf-voice .say-btn"), notes: !!document.querySelector(".nfn .say-btn") }));
  ok("Read aloud on entries, transcripts and notes from now", r.entries && r.transcript && r.notes, r);
  await page.evaluate(() => document.querySelector(".nfn .say-btn").scrollIntoView({ block: "center" }));
  await page.evaluate(() => document.querySelector(".nfn .say-btn").click()); await sleep(200);
  r = await page.evaluate(() => { const b = document.querySelector(".nfn .say-btn"); return { t: b.innerText.trim(), p: b.getAttribute("aria-pressed"), ico: b.querySelector("img").getAttribute("src"), call: __say.calls[0] }; });
  ok("tap: reads it with the phone's voice; button says 'Stop' with the read-stop glyph", r.t === "Stop" && r.p === "true" && /feed\/read-stop\.png/.test(r.ico) && r.call && r.call.text === "I know it was a hard day but we made it.", r);
  await page.screenshot({ path: SHOTS + "/v43-read-aloud-stop.png" });
  await page.evaluate(() => document.querySelector(".nfn .say-btn").click()); await sleep(150);
  r = await page.evaluate(() => ({ t: document.querySelector(".nfn .say-btn").innerText.trim(), stops: __say.stops }));
  ok("tap again: stops, back to 'Read aloud'", r.t === "Read aloud" && r.stops >= 1, r);
  await page.evaluate(() => document.querySelector(".rf-card .rf-acts .say-btn").click()); await sleep(100);
  await page.evaluate(() => { const id = __say.calls[__say.calls.length - 1].id; __say.ls.forEach(fn => fn({ id })); }); await sleep(100);
  ok("when the phone finishes reading, the button goes back by itself", await page.evaluate(() => document.querySelector(".rf-card .rf-acts .say-btn").innerText.trim() === "Read aloud"));
  r = await page.evaluate(() => { openScreen("diary"); setDiaryDay("2026-10-20"); const t = document.querySelector("#diaryList .diary-say .say-btn"); const tr = document.querySelector("#diaryList .diary-voice .say-btn"); return { t: !!t, tr: !!tr }; });
  ok("Read aloud in the Diary too (entry text and transcript)", r.t && r.tr, r);
  r = await page.evaluate(() => { SHADOW_STORIES[Object.keys(SHADOW_STORIES)[0]].text = "A short story."; const sid = Object.keys(SHADOW_STORIES)[0]; return { withText: /data-say-text="[^"]*A short story\./.test(storyLineHtml(sid, "Pride")), empty: !/say-btn/.test(storyLineHtml(Object.keys(SHADOW_STORIES)[1], "Pride")) }; });
  ok("shadow stories get Read aloud once their text is in (empty slots don't)", r.withText && r.empty, r);
  ok("no page errors (APK run)", errs.length === 0, errs);
  await page.close();

  // ---- Browser speechSynthesis: only on-device (localService) voices
  const WEB = local => `(() => { window.__u = []; const vs = [{ name: "Net", lang: "en-US", localService: false }].concat(${local} ? [{ name: "Local", lang: "en-US", localService: true }] : []);
    Object.defineProperty(window, "speechSynthesis", { value: { getVoices: () => vs, speak: u => __u.push(u), cancel: () => {}, addEventListener: () => {} }, configurable: true });
    window.SpeechSynthesisUtterance = function (t) { this.text = t; }; })();`;
  ({ page, errs } = await phone(browser, WEB(false)));
  await A.fresh(page); await A.setup(page, "Web", "web-pass-11"); await sleep(2300);
  ok("browser with only network voices: Read aloud hidden (text never leaves the phone)", await page.evaluate(() => !sayOk && !document.documentElement.classList.contains("can-say")));
  await page.close();
  ({ page, errs } = await phone(browser, WEB(true)));
  await A.fresh(page); await A.setup(page, "Web", "web-pass-11"); await seed(page); await page.evaluate(() => openScreen("feed")); await sleep(800);
  await page.evaluate(() => document.querySelector(".rf-card .rf-acts .say-btn").click()); await sleep(100);
  r = await page.evaluate(() => ({ can: sayOk, n: __u.length, voice: __u[0] && __u[0].voice.name, t: document.querySelector(".rf-card .rf-acts .say-btn").innerText.trim() }));
  ok("browser with an on-device voice: reads with that voice, button says Stop", r.can && r.n === 1 && r.voice === "Local" && r.t === "Stop", r);
  await page.evaluate(() => __u[0].onend()); await sleep(50);
  ok("...and goes back to 'Read aloud' when done", await page.evaluate(() => document.querySelector(".rf-card .rf-acts .say-btn").innerText.trim() === "Read aloud"));
  ok("no page errors (web voices run)", errs.length === 0, errs);
  await browser.close(); done();
})().catch(e => { console.error(e); done(); process.exit(1); });
