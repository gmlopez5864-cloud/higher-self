/* Higher Self — work breaks and drives.
   Phone-local time math only. No network and no AI.
   The Android package loads this file beside index.html.
   Web APP_VERSION and the service-worker cache stay on 43; this is not a web release. */
(function (root) {
  "use strict";
  const HM = /^([01]\d|2[0-3]):([0-5]\d)$/;
  const DRIVE_SAFE = "Choose audio before you leave. Keep your attention on the road.";

  function hm(s) {
    const m = HM.exec(String(s || ""));
    if (!m) return null;
    return Number(m[1]) * 60 + Number(m[2]);
  }
  function pad(n) { return String(n).padStart(2, "0"); }
  function shift(date, n) {
    const [y, m, d] = String(date || "1970-01-01").split("-").map(Number);
    const dt = new Date(y, (m || 1) - 1, d || 1);
    dt.setDate(dt.getDate() + n);
    return dt.getFullYear() + "-" + pad(dt.getMonth() + 1) + "-" + pad(dt.getDate());
  }
  // End at or before start finishes the next day. Equal clocks are not a span.
  function spanAbs(start, end) {
    const s = hm(start), e = hm(end);
    if (s == null || e == null) return null;
    if (e === s) return null;
    return { start: s, end: e > s ? e : e + 1440 };
  }
  // A clock time lands once on a span that is shorter than 24h.
  function toAbs(span, clock) {
    const m = hm(clock);
    if (m == null || !span) return null;
    const hits = [m, m + 1440].filter(t => t >= span.start && t <= span.end);
    return hits.length === 1 ? hits[0] : null;
  }
  function splitRange(date, a, b) {
    const out = [];
    let t = a;
    while (t < b) {
      const dayOff = Math.floor(t / 1440);
      const boundary = (dayOff + 1) * 1440;
      const u = Math.min(b, boundary);
      out.push({ date: shift(date, dayOff), start: t - dayOff * 1440, end: u - dayOff * 1440, mins: u - t });
      t = u;
    }
    return out;
  }
  function subtract(ranges, cuts) {
    let parts = ranges.map(r => r.slice());
    cuts.forEach(c => {
      const next = [];
      parts.forEach(([a, b]) => {
        if (c[1] <= a || c[0] >= b) { next.push([a, b]); return; }
        if (c[0] > a) next.push([a, Math.min(b, c[0])]);
        if (c[1] < b) next.push([Math.max(a, c[1]), b]);
      });
      parts = next;
    });
    return parts.filter(([a, b]) => b > a);
  }
  function overlaps(list) {
    const sorted = list.slice().sort((x, y) => x.a - y.a);
    for (let i = 1; i < sorted.length; i++) if (sorted[i].a < sorted[i - 1].b) return true;
    return false;
  }
  function normWhen(w) { return w === "actual" ? "actual" : "planned"; }
  function cleanAct(raw) {
    if (!raw || typeof raw !== "object") return null;
    const start = String(raw.start || ""), end = String(raw.end || "");
    if (!HM.test(start) || !HM.test(end)) return null;
    return {
      id: String(raw.id || ""), start, end,
      area: String(raw.area || ""), pathId: String(raw.pathId || ""),
      title: String(raw.title || "").slice(0, 120), when: normWhen(raw.when)
    };
  }
  function cleanBreak(raw) {
    if (!raw || typeof raw !== "object") return null;
    const start = String(raw.start || ""), end = String(raw.end || "");
    if (!HM.test(start) || !HM.test(end)) return null;
    return { id: String(raw.id || ""), start, end, acts: Array.isArray(raw.acts) ? raw.acts.map(cleanAct).filter(Boolean) : [] };
  }
  function persistBreak(br) {
    return {
      id: br.id, start: br.start, end: br.end,
      acts: (br.acts || []).map(a => ({ id: a.id, start: a.start, end: a.end, area: a.area, pathId: a.pathId, title: a.title, when: a.when === "actual" ? "actual" : "planned" }))
    };
  }
  function placeClock(span, start, end, outsideMsg, badMsg) {
    if (!HM.test(String(start || "")) || !HM.test(String(end || ""))) return { error: badMsg || "Pick a start and an end for the break." };
    if (start === end) return { error: "Pick a start and an end that aren't the same." };
    const a = toAbs(span, start), b = toAbs(span, end);
    if (a == null || b == null || b <= a) return { error: outsideMsg || "That break sits outside this block." };
    return { a, b };
  }
  // Keep well-formed breaks that sit inside the block. Drop the rest. Later overlaps lose.
  function salvageBreaks(start, end, breaks) {
    const span = spanAbs(start, end);
    if (!span) return [];
    const kept = [];
    (Array.isArray(breaks) ? breaks : []).forEach(raw => {
      const br = cleanBreak(raw);
      if (!br) return;
      const placed = placeClock(span, br.start, br.end);
      if (placed.error || placed.a <= span.start || placed.b >= span.end) return;
      if (kept.some(k => placed.a < k.b && k.a < placed.b)) return;
      const acts = [];
      br.acts.forEach(act => {
        if (!act.area || !act.pathId) return;
        const ap = placeClock(span, act.start, act.end, "That activity sits outside the break.", "Pick a start and an end for what you did during this break.");
        if (ap.error || ap.a < placed.a || ap.b > placed.b) return;
        if (acts.some(k => ap.a < k.b && k.a < ap.b)) return;
        acts.push(Object.assign({}, act, { a: ap.a, b: ap.b }));
      });
      kept.push(Object.assign({}, br, { a: placed.a, b: placed.b, acts }));
    });
    return kept;
  }
  function validateBreaks(start, end, breaks) {
    const span = spanAbs(start, end);
    if (!span) return { ok: false, error: "Pick a start and an end for the block.", breaks: [] };
    const list = Array.isArray(breaks) ? breaks : [];
    const norm = [];
    for (let i = 0; i < list.length; i++) {
      const br = cleanBreak(list[i]);
      if (!br) return { ok: false, error: "Pick a start and an end for the break.", breaks: [] };
      const placed = placeClock(span, br.start, br.end);
      if (placed.error) return { ok: false, error: placed.error, breaks: [] };
      if (placed.a <= span.start || placed.b >= span.end) return { ok: false, error: "That break has to sit inside the block, with work on both sides.", breaks: [] };
      const acts = [];
      for (let j = 0; j < br.acts.length; j++) {
        const act = br.acts[j];
        if (!act.area || !act.pathId) return { ok: false, error: "Pick an area and a path for what you did during this break.", breaks: [] };
        const ap = placeClock(span, act.start, act.end, "That activity sits outside the break.", "Pick a start and an end for what you did during this break.");
        if (ap.error) return { ok: false, error: ap.error, breaks: [] };
        if (ap.a < placed.a || ap.b > placed.b) return { ok: false, error: "That activity sits outside the break.", breaks: [] };
        acts.push(Object.assign({}, act, { a: ap.a, b: ap.b }));
      }
      if (overlaps(acts)) return { ok: false, error: "Those activities overlap.", breaks: [] };
      norm.push(Object.assign({}, br, { a: placed.a, b: placed.b, acts }));
    }
    if (overlaps(norm)) return { ok: false, error: "Breaks can't overlap.", breaks: [] };
    return { ok: true, error: "", breaks: norm.map(persistBreak) };
  }
  function ignoresBreaks(block) { return !!(block && (block.area === "sleep" || block.kind === "drive")); }
  function usesBreaks(block) {
    if (!block || ignoresBreaks(block)) return false;
    return salvageBreaks(block.start, block.end, block.breaks).length > 0;
  }
  function account(block) {
    block = block || {};
    const empty = { elapsed: 0, workMins: 0, gapMins: 0, learningMinutes: 0, byArea: {}, pieces: [], activities: [], breaks: [] };
    const span = spanAbs(block.start, block.end);
    if (!span) return empty;
    const breaks = ignoresBreaks(block) ? [] : salvageBreaks(block.start, block.end, block.breaks);
    const ranges = subtract([[span.start, span.end]], breaks.map(b => [b.a, b.b]));
    const date = block.date || "1970-01-01";
    const pieces = ranges.flatMap(([a, b]) => splitRange(date, a, b));
    const activities = [];
    breaks.forEach(br => br.acts.forEach(act => {
      splitRange(date, act.a, act.b).forEach(p => activities.push({
        date: p.date, start: p.start, end: p.end, mins: p.mins,
        area: act.area, pathId: act.pathId, title: act.title, when: act.when, id: act.id
      }));
    }));
    const workMins = pieces.reduce((s, p) => s + p.mins, 0);
    const gapMins = activities.reduce((s, p) => s + p.mins, 0);
    const learningMinutes = block.kind === "drive" && block.listen && Number(block.listen.minutes) > 0 ? Math.round(Number(block.listen.minutes)) : 0;
    const byArea = {};
    const add = (area, mins) => { if (!area || area === "sleep" || !(mins > 0)) return; byArea[area] = (byArea[area] || 0) + mins; };
    pieces.forEach(p => add(block.area, p.mins));
    activities.forEach(p => add(p.area, p.mins));
    return { elapsed: workMins + gapMins, workMins, gapMins, learningMinutes, byArea, pieces, activities, breaks: breaks.map(persistBreak) };
  }
  // One busy block for a plain span or a drive (the lesson is not its own block).
  // A block with breaks becomes the work segments plus each gap activity. Nothing is emitted twice.
  function calendarEvents(block) {
    block = block || {};
    const span = spanAbs(block.start, block.end);
    if (!span) return [];
    if (!usesBreaks(block)) {
      return [{
        role: "work", whole: true, overnight: span.end > 1440,
        date: block.date || "", start: span.start, end: span.end > 1440 ? span.end - 1440 : span.end,
        mins: span.end - span.start, area: block.area || "", pathId: block.pathId || "", title: block.title || ""
      }];
    }
    const a = account(block);
    return a.pieces.map(p => ({
      role: "work", whole: false, date: p.date, start: p.start, end: p.end, mins: p.mins,
      area: block.area || "", pathId: block.pathId || "", title: block.title || ""
    })).concat(a.activities.map(p => ({
      role: "gap", whole: false, date: p.date, start: p.start, end: p.end, mins: p.mins,
      area: p.area || "", pathId: p.pathId || "", title: p.title || "", when: p.when
    })));
  }
  function rangesOn(block) {
    const span = spanAbs(block && block.start, block && block.end);
    if (!span) return [];
    if (!usesBreaks(block)) return [[span.start, span.end]];
    const breaks = salvageBreaks(block.start, block.end, block.breaks);
    const work = subtract([[span.start, span.end]], breaks.map(b => [b.a, b.b]));
    const gaps = [];
    breaks.forEach(b => b.acts.forEach(act => gaps.push([act.a, act.b])));
    return work.concat(gaps);
  }
  // Listen attached to a drive is intentional concurrency, not a second claim on the hour.
  function competes(a, b) {
    if (!a || !b) return false;
    if ((a.alongside && a.alongside === b.id) || (b.alongside && b.alongside === a.id)) return false;
    if (a.date && b.date && a.date !== b.date) return false;
    const ra = rangesOn(a), rb = rangesOn(b);
    return ra.some(x => rb.some(y => x[0] < y[1] && y[0] < x[1]));
  }
  function validateListen(listen, driveMins) {
    if (!listen) return { ok: true, listen: null };
    const area = String(listen.area || ""), pathId = String(listen.pathId || ""), title = String(listen.title || "").slice(0, 120);
    if (!area || !pathId) return { ok: false, error: "Pick an area and a path for the lesson." };
    let minutes = listen.minutes == null || listen.minutes === "" ? null : Number(listen.minutes);
    if (minutes != null && !(minutes > 0)) return { ok: false, error: "Lesson minutes need to be more than zero, or left blank." };
    if (minutes != null) {
      minutes = Math.round(minutes);
      if (driveMins && minutes > driveMins) return { ok: false, error: "That lesson is longer than the drive. Keep it within the drive, or leave it for later." };
    }
    return { ok: true, listen: { area, pathId, title, minutes } };
  }
  function migrateListen(raw, kind) {
    if (kind !== "drive" || !raw || typeof raw !== "object") return null;
    const title = String(raw.title || "").slice(0, 120);
    const area = String(raw.area || ""), pathId = String(raw.pathId || "");
    const minutes = raw.minutes == null || raw.minutes === "" || !(Number(raw.minutes) > 0) ? null : Math.round(Number(raw.minutes));
    if (!area && !pathId && !title && minutes == null) return null;
    return { area, pathId, title, minutes };
  }
  function migrateBlock(p) {
    p = p && typeof p === "object" ? p : {};
    const kind = p.kind === "drive" ? "drive" : "";
    return { kind, listen: migrateListen(p.listen, kind), breaks: salvageBreaks(p.start, p.end, p.breaks).map(persistBreak) };
  }
  // Copy new fields only when the saved record already has them. An older plan or path log
  // must come back with the same keys it was stored with (no empty breaks / kind / listen).
  function hasOwn(raw, key) { return !!raw && Object.prototype.hasOwnProperty.call(raw, key); }
  function keepPlanMeta(rec, raw, meta) {
    meta = meta || migrateBlock(raw);
    if (hasOwn(raw, "kind")) rec.kind = raw.area === "sleep" ? "" : meta.kind;
    if (hasOwn(raw, "listen")) rec.listen = raw.area === "sleep" ? null : meta.listen;
    if (hasOwn(raw, "breaks")) rec.breaks = meta.breaks;
    return rec;
  }
  function keepLogMeta(rec, raw) {
    const meta = migrateLogMeta(raw);
    if (hasOwn(raw, "countsElapsed")) rec.countsElapsed = meta.countsElapsed;
    if (hasOwn(raw, "alongside")) rec.alongside = meta.alongside;
    if (hasOwn(raw, "gap")) rec.gap = meta.gap;
    if (hasOwn(raw, "segment")) rec.segment = meta.segment;
    return rec;
  }
  function migrateLogMeta(l) {
    l = l && typeof l === "object" ? l : {};
    return {
      countsElapsed: l.countsElapsed === false ? false : true,
      alongside: typeof l.alongside === "string" ? l.alongside : "",
      gap: l.gap === true,
      segment: typeof l.segment === "string" ? l.segment.slice(0, 40) : ""
    };
  }
  // All-day and free events use no hours. Anything else is not this case.
  function untimedMinutes(item) {
    if (!item || typeof item !== "object") return null;
    if (item.kind === "allday" || item.kind === "free" || item.allDay === true || item.free === true) return 0;
    return null;
  }
  function upsertBreak(breaks, br) {
    const list = (Array.isArray(breaks) ? breaks : []).map(b => JSON.parse(JSON.stringify(b)));
    const i = list.findIndex(b => b && b.id === br.id);
    const copy = JSON.parse(JSON.stringify(br));
    if (i >= 0) list[i] = copy; else list.push(copy);
    return list;
  }
  function removeBreak(breaks, id) { return (Array.isArray(breaks) ? breaks : []).filter(b => b && b.id !== id); }
  function cloneBreaks(breaks) { return JSON.parse(JSON.stringify(Array.isArray(breaks) ? breaks : [])); }
  // What confirm writes: work and gap activities count, a lesson beside a drive does not.
  function loggedPlan(block) {
    const a = account(block);
    const rows = [];
    a.pieces.forEach((p, i) => rows.push({ role: "work", date: p.date, minutes: p.mins, area: block.area || "", countsElapsed: block.area !== "sleep", segment: String(i) }));
    a.activities.forEach(p => rows.push({ role: "gap", date: p.date, minutes: p.mins, area: p.area, countsElapsed: true, gap: true, when: p.when }));
    if (block && block.kind === "drive" && block.listen && (block.listen.pathId || block.listen.title)) {
      rows.push({
        role: "listen", date: block.date || "", area: block.listen.area || "",
        minutes: block.listen.minutes > 0 ? Math.round(Number(block.listen.minutes)) : 0,
        countsElapsed: false, alongside: block.id || "drive"
      });
    }
    const elapsed = rows.filter(r => r.countsElapsed).reduce((s, r) => s + r.minutes, 0);
    const learning = rows.filter(r => r.role === "listen").reduce((s, r) => s + r.minutes, 0);
    return { rows, elapsed, learning };
  }

  const api = {
    DRIVE_SAFE, hm, shift, spanAbs, validateBreaks, salvageBreaks, usesBreaks, account, calendarEvents,
    competes, validateListen, migrateListen, migrateBlock, migrateLogMeta, keepPlanMeta, keepLogMeta, untimedMinutes,
    upsertBreak, removeBreak, cloneBreaks, loggedPlan, persistBreak
  };
  if (typeof module === "object" && module && module.exports) module.exports = api;
  root.HSGaps = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
