import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const G = require(path.join(root, "planner-gaps.js"));

const DAY = "2026-11-05";
const work = (extra) => Object.assign({ date: DAY, start: "08:00", end: "22:00", area: "career", id: "work", title: "Work", breaks: [] }, extra);

test("uninterrupted 14-hour work stays 14 hours", () => {
  const a = G.account({ date: DAY, start: "06:00", end: "20:00", area: "career", breaks: [] });
  assert.equal(a.workMins, 14 * 60);
  assert.equal(a.elapsed, 14 * 60);
  assert.equal(a.gapMins, 0);
  assert.equal(a.pieces.length, 1);
  assert.equal(G.usesBreaks({ area: "career", start: "06:00", end: "20:00", breaks: [] }), false);
});

test("a six-hour split-shift gap counts only the work segments", () => {
  const block = work({
    breaks: [{ id: "b1", start: "12:00", end: "18:00", acts: [] }]
  });
  const a = G.account(block);
  assert.equal(a.workMins, 8 * 60);
  assert.equal(a.elapsed, 8 * 60);
  assert.equal(a.pieces.length, 2);
  assert.deepEqual(a.pieces.map(p => p.mins), [4 * 60, 4 * 60]);
  assert.equal(a.byArea.career, 8 * 60);
  const events = G.calendarEvents(block);
  const busyWork = events.filter(e => e.role === "work");
  assert.equal(busyWork.length, 2);
  busyWork.forEach(e => assert.equal(e.start < 18 * 60 && 12 * 60 < e.end, false));
});

test("several planned and actual activities can share one gap without adding the gap to work", () => {
  const block = work({
    breaks: [{
      id: "gap", start: "12:00", end: "18:00",
      acts: [
        { id: "a1", start: "12:00", end: "14:00", area: "social", pathId: "errand", title: "Errand", when: "actual" },
        { id: "a2", start: "14:00", end: "16:00", area: "personal", pathId: "lesson", title: "Lesson", when: "planned" },
        { id: "a3", start: "16:00", end: "18:00", area: "time", pathId: "hobby", title: "Hobby", when: "planned" }
      ]
    }, {
      id: "lunch", start: "10:00", end: "10:15", acts: []
    }]
  });
  const v = G.validateBreaks(block.start, block.end, block.breaks);
  assert.equal(v.ok, true);
  const a = G.account(block);
  assert.equal(a.workMins, 14 * 60 - 6 * 60 - 15);
  assert.equal(a.gapMins, 6 * 60);
  assert.equal(a.elapsed, a.workMins + a.gapMins);
  assert.equal(a.byArea.career, a.workMins);
  assert.equal(a.byArea.social, 2 * 60);
  assert.equal(a.byArea.personal, 2 * 60);
  assert.equal(a.byArea.time, 2 * 60);
  assert.equal(a.activities.length, 3);
  const events = G.calendarEvents(block);
  assert.equal(events.filter(e => e.role === "gap").length, 3);
  assert.equal(events.some(e => e.role === "listen"), false);
});

test("midnight: an overnight break splits work onto the right days", () => {
  const block = {
    date: DAY, start: "22:00", end: "06:00", area: "career",
    breaks: [{ id: "b", start: "23:30", end: "00:30", acts: [
      { id: "a", start: "23:30", end: "00:30", area: "personal", pathId: "walk", title: "Walk", when: "actual" }
    ] }]
  };
  const a = G.account(block);
  assert.equal(a.workMins, 7 * 60);
  assert.deepEqual(a.pieces.map(p => [p.date, p.mins]), [[DAY, 90], ["2026-11-06", 330]]);
  assert.equal(a.activities.filter(p => p.date === DAY).reduce((s, p) => s + p.mins, 0), 30);
  assert.equal(a.activities.filter(p => p.date === "2026-11-06").reduce((s, p) => s + p.mins, 0), 30);
  assert.equal(a.elapsed, 8 * 60);
});

test("invalid, outside, and overlapping intervals are rejected", () => {
  const outside = G.validateBreaks("08:00", "17:00", [{ id: "b", start: "07:00", end: "09:00", acts: [] }]);
  assert.equal(outside.ok, false);
  assert.match(outside.error, /outside|inside/);
  const edge = G.validateBreaks("08:00", "17:00", [{ id: "b", start: "08:00", end: "09:00", acts: [] }]);
  assert.equal(edge.ok, false);
  assert.match(edge.error, /inside/);
  const same = G.validateBreaks("08:00", "17:00", [{ id: "b", start: "12:00", end: "12:00", acts: [] }]);
  assert.equal(same.ok, false);
  const overlap = G.validateBreaks("08:00", "22:00", [
    { id: "b1", start: "12:00", end: "15:00", acts: [] },
    { id: "b2", start: "14:00", end: "16:00", acts: [] }
  ]);
  assert.equal(overlap.ok, false);
  assert.match(overlap.error, /overlap/);
  const actOut = G.validateBreaks("08:00", "18:00", [{
    id: "b", start: "12:00", end: "14:00",
    acts: [{ id: "a", start: "11:00", end: "13:00", area: "social", pathId: "p", title: "Errand", when: "planned" }]
  }]);
  assert.equal(actOut.ok, false);
  assert.match(actOut.error, /outside the break/);
  const actOverlap = G.validateBreaks("08:00", "19:00", [{
    id: "b", start: "12:00", end: "18:00",
    acts: [
      { id: "a1", start: "12:00", end: "15:00", area: "social", pathId: "p", title: "A", when: "planned" },
      { id: "a2", start: "14:00", end: "16:00", area: "time", pathId: "q", title: "B", when: "actual" }
    ]
  }]);
  assert.equal(actOverlap.ok, false);
  assert.match(actOverlap.error, /activities overlap/);
  const overnightOut = G.validateBreaks("22:00", "06:00", [{ id: "b", start: "05:00", end: "07:00", acts: [] }]);
  assert.equal(overnightOut.ok, false);
});

test("breaks can be edited and removed", () => {
  let breaks = [];
  breaks = G.upsertBreak(breaks, { id: "b1", start: "12:00", end: "13:00", acts: [] });
  breaks = G.upsertBreak(breaks, { id: "b2", start: "15:00", end: "15:30", acts: [] });
  breaks = G.upsertBreak(breaks, { id: "b1", start: "12:00", end: "12:20", acts: [] });
  assert.equal(breaks.length, 2);
  assert.equal(breaks[0].end, "12:20");
  breaks = G.removeBreak(breaks, "b1");
  assert.deepEqual(breaks.map(b => b.id), ["b2"]);
  const v = G.validateBreaks("08:00", "17:00", breaks);
  assert.equal(v.ok, true);
});

test("sleep overnight is unchanged when a stray break is present, and all-day or free events use no hours", () => {
  const sleep = G.account({
    date: DAY, start: "22:00", end: "07:00", area: "sleep",
    breaks: [{ id: "b", start: "01:00", end: "02:00", acts: [] }]
  });
  assert.equal(sleep.workMins, 9 * 60);
  assert.equal(sleep.elapsed, 9 * 60);
  assert.deepEqual(sleep.pieces.map(p => p.mins), [2 * 60, 7 * 60]);
  assert.equal(G.usesBreaks({ area: "sleep", start: "22:00", end: "07:00", breaks: [{ id: "b", start: "01:00", end: "02:00" }] }), false);
  assert.equal(G.calendarEvents({ date: DAY, start: "22:00", end: "07:00", area: "sleep" }).length, 1);
  assert.equal(G.untimedMinutes({ kind: "allday", title: "Holiday" }), 0);
  assert.equal(G.untimedMinutes({ kind: "free", start: "10:00", end: "11:00", title: "Hold" }), 0);
  assert.equal(G.untimedMinutes({ allDay: true }), 0);
  assert.equal(G.untimedMinutes({ free: true }), 0);
  assert.equal(G.untimedMinutes({ kind: "timed", start: "09:00", end: "10:00" }), null);
});

test("a 90-minute drive plus 90 minutes of learning uses 90 elapsed minutes", () => {
  const drive = {
    id: "drv", date: DAY, start: "08:00", end: "09:30", area: "career", kind: "drive", title: "Commute",
    listen: { area: "personal", pathId: "book", title: "Audiobook", minutes: 90 }
  };
  const a = G.account(drive);
  assert.equal(a.elapsed, 90);
  assert.equal(a.workMins, 90);
  assert.equal(a.learningMinutes, 90);
  assert.equal(a.byArea.career, 90);
  assert.equal(a.byArea.personal, undefined);
  const logged = G.loggedPlan(drive);
  assert.equal(logged.elapsed, 90);
  assert.equal(logged.learning, 90);
  assert.equal(logged.rows.filter(r => r.countsElapsed).reduce((s, r) => s + r.minutes, 0), 90);
  assert.equal(logged.rows.some(r => r.role === "listen" && r.countsElapsed === false && r.minutes === 90), true);
  const events = G.calendarEvents(drive);
  assert.equal(events.length, 1);
  assert.equal(events[0].role, "work");
  assert.equal(events.some(e => e.role === "listen" || e.role === "gap"), false);
});

test("quiet driving is valid, and a shorter lesson does not have to fill the drive", () => {
  const quiet = G.account({ date: DAY, start: "08:00", end: "09:30", area: "career", kind: "drive", listen: null });
  assert.equal(quiet.elapsed, 90);
  assert.equal(quiet.learningMinutes, 0);
  assert.equal(G.loggedPlan({ date: DAY, start: "08:00", end: "09:30", area: "career", kind: "drive" }).rows.some(r => r.role === "listen"), false);
  const partial = G.account({
    date: DAY, start: "08:00", end: "09:30", area: "personal", kind: "drive",
    listen: { area: "personal", pathId: "lesson", title: "Spanish", minutes: 30 }
  });
  assert.equal(partial.elapsed, 90);
  assert.equal(partial.learningMinutes, 30);
  assert.equal(partial.byArea.personal, 90);
  const tooLong = G.validateListen({ area: "personal", pathId: "lesson", title: "Spanish", minutes: 120 }, 90);
  assert.equal(tooLong.ok, false);
  const blank = G.validateListen({ area: "personal", pathId: "lesson", title: "Spanish", minutes: null }, 90);
  assert.equal(blank.ok, true);
  assert.equal(blank.listen.minutes, null);
});

test("intentional listen concurrency is not a conflict; a real competing block still is", () => {
  const drive = { id: "drv", date: DAY, start: "08:00", end: "09:30", area: "career", kind: "drive" };
  const listen = { id: "lsn", alongside: "drv", date: DAY, start: "08:00", end: "09:30", area: "personal" };
  const meeting = { id: "mtg", date: DAY, start: "08:15", end: "09:00", area: "career" };
  assert.equal(G.competes(drive, listen), false);
  assert.equal(G.competes(listen, drive), false);
  assert.equal(G.competes(drive, meeting), true);
  const gapped = work({
    breaks: [{ id: "b", start: "12:00", end: "14:00", acts: [
      { id: "a", start: "12:00", end: "14:00", area: "social", pathId: "p", title: "Errand", when: "actual" }
    ] }]
  });
  const duringWork = { id: "call", date: DAY, start: "09:00", end: "10:00", area: "career" };
  const duringErrand = { id: "visit", date: DAY, start: "12:30", end: "13:00", area: "social" };
  const duringEmpty = { id: "quiet", date: DAY, start: "16:00", end: "17:00", area: "time" };
  assert.equal(G.competes(gapped, duringWork), true);
  assert.equal(G.competes(gapped, duringErrand), true);
  assert.equal(G.competes(Object.assign({}, gapped, { breaks: [{ id: "b", start: "12:00", end: "18:00", acts: [] }] }), duringEmpty), false);
});

test("a drive can count toward work or another area", () => {
  const asWork = G.account({ date: DAY, start: "07:00", end: "08:00", area: "career", kind: "drive" });
  const asHobby = G.account({ date: DAY, start: "07:00", end: "08:00", area: "time", kind: "drive" });
  assert.equal(asWork.byArea.career, 60);
  assert.equal(asHobby.byArea.time, 60);
  assert.equal(asHobby.byArea.career, undefined);
});

test("older plans and logs keep their own keys; empty drive fields are not invented", () => {
  const sleep = { id: "slp", area: "sleep", pathId: "", title: "", start: "22:30", end: "06:30", every: 1, days: [0, 1, 2, 3, 4, 5, 6], from: "2026-10-20", until: "", source: "", icsUid: "" };
  const rec = Object.assign({}, sleep);
  G.keepPlanMeta(rec, sleep, G.migrateBlock(sleep));
  assert.deepEqual(Object.keys(rec).sort(), Object.keys(sleep).sort());
  assert.equal("breaks" in rec, false);
  assert.equal("kind" in rec, false);
  assert.equal("listen" in rec, false);
  const again = Object.assign({}, rec);
  G.keepPlanMeta(again, rec, G.migrateBlock(rec));
  assert.deepEqual(again, rec);

  const drive = {
    id: "drv", area: "career", kind: "drive", start: "08:00", end: "09:30", from: DAY,
    listen: { area: "personal", pathId: "book", title: "Audiobook", minutes: 90 },
    breaks: [{ id: "b", start: "08:20", end: "08:40", acts: [] }]
  };
  const kept = {};
  G.keepPlanMeta(kept, drive, G.migrateBlock(drive));
  assert.equal(kept.kind, "drive");
  assert.equal(kept.listen.title, "Audiobook");
  assert.equal(kept.listen.minutes, 90);
  assert.equal(kept.breaks.length, 1);
  assert.equal(kept.breaks[0].id, "b");

  const oldLog = { id: "pl1", pathId: "pw", date: DAY, minutes: 90, area: "personal", source: "log" };
  const log = Object.assign({}, oldLog);
  G.keepLogMeta(log, oldLog);
  assert.equal("countsElapsed" in log, false);
  assert.equal("alongside" in log, false);
  assert.equal("gap" in log, false);
  assert.equal("segment" in log, false);
  const lesson = { id: "pl2", pathId: "book", date: DAY, minutes: 90, countsElapsed: false, alongside: "drv|" + DAY };
  const lessonRow = {};
  G.keepLogMeta(lessonRow, lesson);
  assert.equal(lessonRow.countsElapsed, false);
  assert.equal(lessonRow.alongside, "drv|" + DAY);
  assert.equal("gap" in lessonRow, false);
});

test("old plans and logs migrate, and new metadata survives a second pass", () => {
  const old = { id: "p1", area: "career", start: "09:00", end: "17:00", from: "2020-01-06", title: "Work" };
  const migrated = G.migrateBlock(old);
  assert.equal(migrated.kind, "");
  assert.equal(migrated.listen, null);
  assert.deepEqual(migrated.breaks, []);
  assert.equal(old.start, "09:00");
  assert.equal(old.end, "17:00");
  const fresh = {
    id: "p2", area: "career", kind: "drive", start: "08:00", end: "18:00",
    listen: { area: "personal", pathId: "book", title: "Audiobook", minutes: 90 },
    breaks: [{ id: "keep", start: "12:00", end: "13:00", acts: [] }, { id: "bad", start: "07:00", end: "07:30", acts: [] }]
  };
  const once = G.migrateBlock(fresh);
  assert.equal(once.kind, "drive");
  assert.equal(once.listen.title, "Audiobook");
  assert.equal(once.listen.minutes, 90);
  assert.deepEqual(once.breaks.map(b => b.id), ["keep"]);
  const twice = G.migrateBlock(Object.assign({}, fresh, once));
  assert.deepEqual(twice, once);
  const oldLog = { id: "pl1", pathId: "p", date: DAY, minutes: 30, area: "career" };
  assert.deepEqual(G.migrateLogMeta(oldLog), { countsElapsed: true, alongside: "", gap: false, segment: "" });
  const listenLog = { countsElapsed: false, alongside: "drv|2026-11-05", gap: false, segment: "", minutes: 90 };
  const meta = G.migrateLogMeta(listenLog);
  assert.equal(meta.countsElapsed, false);
  assert.equal(meta.alongside, "drv|2026-11-05");
  assert.deepEqual(G.migrateLogMeta(meta), meta);
});

test("metadata survives reload and an encrypted backup round trip", async () => {
  const payload = {
    plans: [
      { id: "old", area: "career", start: "09:00", end: "17:00", from: "2024-01-01" },
      {
        id: "new", area: "career", kind: "drive", start: "08:00", end: "09:30", from: DAY,
        listen: { area: "personal", pathId: "book", title: "Audiobook", minutes: 90 },
        breaks: [{ id: "b", start: "12:00", end: "18:00", acts: [
          { id: "a", start: "12:00", end: "18:00", area: "time", pathId: "hobby", title: "Garden", when: "planned" }
        ] }]
      }
    ],
    pathLogs: [{ id: "pl", pathId: "book", date: DAY, minutes: 90, area: "personal", countsElapsed: false, alongside: "new|" + DAY }]
  };
  const reloaded = JSON.parse(JSON.stringify(payload));
  assert.equal(reloaded.plans[1].listen.minutes, 90);
  assert.equal(reloaded.plans[1].breaks[0].acts[0].when, "planned");
  assert.equal(G.migrateBlock(reloaded.plans[0]).kind, "");
  assert.equal(G.migrateBlock(reloaded.plans[1]).listen.title, "Audiobook");
  assert.equal(G.migrateLogMeta(reloaded.pathLogs[0]).countsElapsed, false);

  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const base = await crypto.subtle.importKey("raw", enc.encode("test-passphrase"), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 210000, hash: "SHA-256" },
    base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]
  );
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(JSON.stringify(payload))));
  const envelope = { v: 2, alg: "AES-GCM", kdf: "PBKDF2-SHA256", iter: 210000, salt: Buffer.from(salt).toString("base64"), iv: Buffer.from(iv).toString("base64"), ciphertext: Buffer.from(ct).toString("base64"), app: "higher-self" };
  const opened = JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: Buffer.from(envelope.iv, "base64") },
    key,
    Buffer.from(envelope.ciphertext, "base64")
  )));
  assert.equal(opened.plans[1].kind, "drive");
  assert.equal(opened.plans[1].breaks[0].end, "18:00");
  assert.equal(opened.pathLogs[0].countsElapsed, false);
  assert.equal(G.migrateBlock(opened.plans[0]).breaks.length, 0);
  assert.equal(G.account(opened.plans[1]).learningMinutes, 90);
  assert.equal(G.account(opened.plans[1]).elapsed, 90);
});

test("the shared page keeps web version 43 and wires the Android planner copy", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  assert.match(html, /const APP_VERSION = "43"/);
  assert.match(sw, /const CACHE = "higher-self-v43"/);
  assert.match(html, /planner-gaps\.js/);
  assert.match(html, /Add a break/);
  assert.match(html, /What did you do during this break\?/);
  assert.match(html, /Listen during this drive/);
  assert.match(html, /Choose audio before you leave\. Keep your attention on the road\./);
  assert.equal(html.includes(G.DRIVE_SAFE), true);
  assert.match(html, /HSGaps\.account/);
  assert.match(html, /HSGaps\.keepPlanMeta/);
  assert.match(html, /HSGaps\.keepLogMeta/);
  assert.equal(/kind: p\.area === SLEEP_AREA \? "" : meta\.kind, listen: p\.area === SLEEP_AREA \? null : meta\.listen, breaks: meta\.breaks/.test(html), false);
  assert.match(html, /plannerAndroid\(/);
  assert.match(html, /s\.allDay/);
  assert.match(html, /e\.free/);
  const gaps = fs.readFileSync(path.join(root, "planner-gaps.js"), "utf8");
  assert.equal(/fetch\s*\(|XMLHttpRequest|WebSocket|openai|anthropic/i.test(gaps), false);
});

test("shipped icon bytes and the web cache are unchanged from main", () => {
  const diff = execSync("git diff --name-only main -- icons sw.js manifest.webmanifest", { cwd: root, encoding: "utf8" }).trim();
  assert.equal(diff, "");
  const files = [
    "icons/glyphs128-dog/feed/on-this-day.png",
    "icons/glyphs128-cat/feed/on-this-day.png",
    "icons/glyphs128-bird/feed/on-this-day.png",
    "icons/glyphs128-fish/feed/on-this-day.png",
    "icons/glyphs128-fish/feed/read-stop.png"
  ];
  for (const f of files) {
    const head = execSync(`git rev-parse HEAD:${f}`, { cwd: root, encoding: "utf8" }).trim();
    const base = execSync(`git rev-parse main:${f}`, { cwd: root, encoding: "utf8" }).trim();
    assert.equal(head, base, f);
  }
});
