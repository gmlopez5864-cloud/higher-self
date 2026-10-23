/* Higher Self — offline shell for install / Add to Home Screen */
const CACHE = "higher-self-v38";
const ICON_VER = "38";
// Plain URLs: shell + manifest/link icons. Versioned (?v=) URLs: every icon the page renders.
const PRECACHE_PLAIN = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/logo.jpg",
  "./icons/logo-180.png",
  "./icons/logo-192.png",
  "./icons/logo-512.png",
  "./icons/logo-maskable-192.png",
  "./icons/logo-maskable-512.png",
  "./icons/notify/badge.png"
];
// Not shipped: icons/glyphs/ and icons/glyphs-<style>/ (v36 icon style sources; the built icons/glyphs128-<style>/ ship and are fetched only for the active style, never precached) (Pablo's 512px glyph sources; the app ships icons/glyphs128/ built by /workspace/make-glyphs128.sh), themes/picture-themes-sheet.jpg, icons/spirit-options/, icons/spirit-options-sheet.jpg (candidate spirit icons; icons/spirit.jpg is the chosen one), icons/logo-options/ (candidate logos), logo-options-sheet.jpg, app-mark.jpg and icon-*.png (old flower mark).
// Used copies of logo-options: paths-section.jpg (1), area-career-v2.jpg (3), paths/wolf.jpg (4). career.jpg retired.
const PRECACHE_ICONS = [
  "./icons/glyphs128/money/index.json",
  "./icons/theme-art.json",
  "./icons/glyphs128/area-career-v2.png",
  "./icons/glyphs128/area-note.png",
  "./icons/glyphs128/diary.png",
  "./icons/glyphs128/hobbies.png",
  "./icons/glyphs128/library/chain.png",
  "./icons/glyphs128/library/crack.png",
  "./icons/glyphs128/library/empty-cup.png",
  "./icons/glyphs128/library/flame.png",
  "./icons/glyphs128/library/knot.png",
  "./icons/glyphs128/library/mask.png",
  "./icons/glyphs128/library/maze.png",
  "./icons/glyphs128/library/screen.png",
  "./icons/glyphs128/library/spiral.png",
  "./icons/glyphs128/library/storm.png",
  "./icons/glyphs128/library/wave.png",
  "./icons/glyphs128/library/weight.png",
  "./icons/glyphs128/money.png",
  "./icons/glyphs128/opp-belonging.png",
  "./icons/glyphs128/opp-boundary.png",
  "./icons/glyphs128/opp-calm.png",
  "./icons/glyphs128/opp-chastity.png",
  "./icons/glyphs128/opp-custom.png",
  "./icons/glyphs128/opp-ease.png",
  "./icons/glyphs128/opp-endurance.png",
  "./icons/glyphs128/opp-generosity.png",
  "./icons/glyphs128/opp-gratitude.png",
  "./icons/glyphs128/opp-humility.png",
  "./icons/glyphs128/opp-patience.png",
  "./icons/glyphs128/opp-presence.png",
  "./icons/glyphs128/opp-release.png",
  "./icons/glyphs128/opp-temperance.png",
  "./icons/glyphs128/opp-zeal.png",
  "./icons/glyphs128/paths-section.png",
  "./icons/glyphs128/paths/athlete.png",
  "./icons/glyphs128/paths/boots.png",
  "./icons/glyphs128/paths/builder.png",
  "./icons/glyphs128/paths/custom.png",
  "./icons/glyphs128/paths/dance.png",
  "./icons/glyphs128/paths/daughter.png",
  "./icons/glyphs128/paths/father.png",
  "./icons/glyphs128/paths/friend.png",
  "./icons/glyphs128/paths/hammer.png",
  "./icons/glyphs128/paths/kitchen.png",
  "./icons/glyphs128/paths/lover.png",
  "./icons/glyphs128/paths/martial-artist.png",
  "./icons/glyphs128/paths/mother.png",
  "./icons/glyphs128/paths/musician.png",
  "./icons/glyphs128/paths/paintbrush.png",
  "./icons/glyphs128/paths/parent.png",
  "./icons/glyphs128/paths/partner.png",
  "./icons/glyphs128/paths/pen.png",
  "./icons/glyphs128/paths/running-shoes.png",
  "./icons/glyphs128/paths/sandals.png",
  "./icons/glyphs128/paths/son.png",
  "./icons/glyphs128/paths/video.png",
  "./icons/glyphs128/paths/weights.png",
  "./icons/glyphs128/paths/wolf.png",
  "./icons/glyphs128/paths/wrench.png",
  "./icons/glyphs128/paths/wrestling.png",
  "./icons/glyphs128/paths/writer.png",
  "./icons/glyphs128/personal-development.png",
  "./icons/glyphs128/pull-anxiety.png",
  "./icons/glyphs128/pull-control.png",
  "./icons/glyphs128/pull-custom.png",
  "./icons/glyphs128/pull-despair.png",
  "./icons/glyphs128/pull-envy.png",
  "./icons/glyphs128/pull-fear.png",
  "./icons/glyphs128/pull-gluttony.png",
  "./icons/glyphs128/pull-greed.png",
  "./icons/glyphs128/pull-lust.png",
  "./icons/glyphs128/pull-numbness.png",
  "./icons/glyphs128/pull-people-pleasing.png",
  "./icons/glyphs128/pull-pride.png",
  "./icons/glyphs128/pull-shame.png",
  "./icons/glyphs128/pull-sloth.png",
  "./icons/glyphs128/pull-wrath.png",
  "./icons/glyphs128/purpose.png",
  "./icons/glyphs128/settings.png",
  "./icons/glyphs128/shadow.png",
  "./icons/glyphs128/sleep.png",
  "./icons/glyphs128/social.png",
  "./icons/glyphs128/spirit.png",
  "./icons/glyphs128/steer-admiration.png",
  "./icons/glyphs128/steer-aspiration.png",
  "./icons/glyphs128/steer-courage.png",
  "./icons/glyphs128/steer-custom.png",
  "./icons/glyphs128/steer-dignity.png",
  "./icons/glyphs128/steer-discipline.png",
  "./icons/glyphs128/steer-feeling.png",
  "./icons/glyphs128/steer-fortitude.png",
  "./icons/glyphs128/steer-honesty.png",
  "./icons/glyphs128/steer-honor.png",
  "./icons/glyphs128/steer-hope.png",
  "./icons/glyphs128/steer-respect.png",
  "./icons/glyphs128/steer-savoring.png",
  "./icons/glyphs128/steer-steadiness.png",
  "./icons/glyphs128/steer-trust.png",
  "./icons/glyphs128/time-pie.png",
  "./themes/flowers.jpg",
  "./themes/cats.jpg",
  "./themes/dogs.jpg",
  "./icons/logo.jpg",
  "./icons/paths-section.jpg",
  "./icons/settings.jpg",
  "./icons/area-career-v2.jpg",
  "./icons/personal-development.jpg",
  "./icons/social.jpg",
  "./icons/spirit.jpg",
  "./icons/time-pie.jpg",
  "./icons/hobbies.jpg",
  "./icons/money.jpg",
  "./icons/sleep.jpg",
  "./icons/diary.jpg",
  "./icons/purpose.jpg",
  "./icons/area-note.jpg",
  "./icons/shadow.jpg",
  "./icons/pull-pride.jpg",
  "./icons/pull-greed.jpg",
  "./icons/pull-lust.jpg",
  "./icons/pull-envy.jpg",
  "./icons/pull-gluttony.jpg",
  "./icons/pull-wrath.jpg",
  "./icons/pull-sloth.jpg",
  "./icons/pull-custom.jpg",
  "./icons/steer-custom.jpg",
  "./icons/opp-custom.jpg",
  "./icons/pull-fear.jpg",
  "./icons/pull-anxiety.jpg",
  "./icons/pull-shame.jpg",
  "./icons/pull-despair.jpg",
  "./icons/pull-control.jpg",
  "./icons/pull-people-pleasing.jpg",
  "./icons/pull-numbness.jpg",
  "./icons/opp-belonging.jpg",
  "./icons/opp-boundary.jpg",
  "./icons/opp-calm.jpg",
  "./icons/opp-chastity.jpg",
  "./icons/opp-ease.jpg",
  "./icons/opp-generosity.jpg",
  "./icons/opp-gratitude.jpg",
  "./icons/opp-humility.jpg",
  "./icons/opp-patience.jpg",
  "./icons/opp-presence.jpg",
  "./icons/opp-release.jpg",
  "./icons/opp-temperance.jpg",
  "./icons/opp-zeal.jpg",
  "./icons/steer-admiration.jpg",
  "./icons/steer-aspiration.jpg",
  "./icons/steer-courage.jpg",
  "./icons/steer-dignity.jpg",
  "./icons/steer-discipline.jpg",
  "./icons/steer-feeling.jpg",
  "./icons/steer-fortitude.jpg",
  "./icons/steer-honesty.jpg",
  "./icons/steer-honor.jpg",
  "./icons/steer-hope.jpg",
  "./icons/steer-respect.jpg",
  "./icons/steer-savoring.jpg",
  "./icons/steer-steadiness.jpg",
  "./icons/steer-trust.jpg",
  "./icons/opp-endurance.jpg",
  "./icons/library/chain.jpg",
  "./icons/library/crack.jpg",
  "./icons/library/empty-cup.jpg",
  "./icons/library/flame.jpg",
  "./icons/library/knot.jpg",
  "./icons/library/mask.jpg",
  "./icons/library/maze.jpg",
  "./icons/library/screen.jpg",
  "./icons/library/spiral.jpg",
  "./icons/library/storm.jpg",
  "./icons/library/wave.jpg",
  "./icons/library/weight.jpg",
  "./icons/paths/athlete.jpg",
  "./icons/paths/builder.jpg",
  "./icons/paths/custom.jpg",
  "./icons/paths/wolf.jpg",
  "./icons/paths/martial-artist.jpg",
  "./icons/paths/musician.jpg",
  "./icons/paths/parent.jpg",
  "./icons/paths/partner.jpg",
  "./icons/paths/wrestling.jpg",
  "./icons/paths/writer.jpg",
  "./icons/paths/pen.jpg",
  "./icons/paths/hammer.jpg",
  "./icons/paths/weights.jpg",
  "./icons/paths/running-shoes.jpg",
  "./icons/paths/boots.jpg",
  "./icons/paths/sandals.jpg",
  "./icons/paths/kitchen.jpg",
  "./icons/paths/wrench.jpg",
  "./icons/paths/paintbrush.jpg",
  "./icons/paths/dance.jpg",
  "./icons/paths/video.jpg",
  "./icons/paths/mother.jpg",
  "./icons/paths/father.jpg",
  "./icons/paths/son.jpg",
  "./icons/paths/daughter.jpg",
  "./icons/paths/friend.jpg",
  "./icons/paths/lover.jpg",
  "./icons/guide/guide-1.jpg",
  "./icons/guide/guide-2.jpg",
  "./icons/guide/guide-3.jpg",
  "./icons/guide/guide-4.jpg",
  "./icons/guide/guide-5.jpg",
  "./icons/notify/nudge-social.png",
  "./icons/notify/nudge-work.png",
  "./icons/notify/nudge-sleep.png"
];
const PRECACHE = PRECACHE_PLAIN.concat(PRECACHE_ICONS.map((u) => u + "?v=" + ICON_VER));

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE.map((u) => new Request(u, { cache: "reload" })))
      // Money category glyphs Pablo has drawn so far (listed by make-glyphs128.sh); best effort so a missing file never blocks install.
      .then(() => fetch("./icons/glyphs128/money/index.json?v=" + ICON_VER, { cache: "reload" }).then((r) => r.json()).catch(() => []))
      .then((slugs) => Promise.all((Array.isArray(slugs) ? slugs : []).map((s) => cache.add(new Request("./icons/glyphs128/money/" + s + ".png?v=" + ICON_VER, { cache: "reload" })).catch(() => {}))))
      // Home tile glyphs (goals, diary, week, record) once Pablo's are in; same best-effort rule.
      .then(() => cache.add(new Request("./icons/glyphs128/home/index.json?v=" + ICON_VER, { cache: "reload" })).catch(() => {}))
      .then(() => fetch("./icons/glyphs128/home/index.json?v=" + ICON_VER, { cache: "reload" }).then((r) => r.json()).catch(() => []))
      .then((slugs) => Promise.all((Array.isArray(slugs) ? slugs : []).map((s) => cache.add(new Request("./icons/glyphs128/home/" + s + ".png?v=" + ICON_VER, { cache: "reload" })).catch(() => {}))))
      // v32 theme picture sets (icons/<folder>/<set>/<file>, listed in icons/theme-art.json by make-theme-art.py), e.g. the Dojo guide pictures.
      .then(() => fetch("./icons/theme-art.json?v=" + ICON_VER, { cache: "reload" }).then((r) => r.json()).catch(() => ({})))
      .then((j) => {
        const art = (j && j.art) || {}, urls = [];
        Object.keys(art).forEach((dir) => Object.keys(art[dir] || {}).forEach((set) => (art[dir][set] || []).forEach((f) => urls.push("./" + dir + "/" + set + "/" + f + "?v=" + ICON_VER))));
        return Promise.all(urls.map((u) => cache.add(new Request(u, { cache: "reload" })).catch(() => {})));
      })
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Navigations: network first, fall back to cached shell
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put("./index.html", copy));
        return res;
      }).catch(() => caches.match("./index.html").then((r) => r || caches.match("./")))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res && res.ok && (url.pathname.includes("/icons/") || url.pathname.endsWith(".webmanifest"))) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      });
    })
  );
});

// v19: reminder taps open the app on the item.
self.addEventListener("notificationclick", (event) => {
  const n = event.notification;
  const d = n.data || {};
  n.close();
  const target = new URL(d.url || "./", self.registration.scope).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url.indexOf(self.registration.scope) === 0 && "focus" in c) {
          c.postMessage({ type: "open-reminder", kind: d.kind, id: d.id });
          return c.focus();
        }
      }
      return self.clients.openWindow ? self.clients.openWindow(target) : null;
    })
  );
});
