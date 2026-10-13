/* Higher Self — offline shell for install / Add to Home Screen */
const CACHE = "higher-self-v19";
const ICON_VER = "19";
// Plain URLs: shell + manifest/link icons. Versioned (?v=) URLs: every icon the page renders.
const PRECACHE_PLAIN = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/app-mark.jpg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-512-maskable.png",
  "./icons/icon-180.png",
  "./icons/notify/badge.png"
];
const PRECACHE_ICONS = [
  "./icons/app-mark.jpg",
  "./icons/career.jpg",
  "./icons/personal-development.jpg",
  "./icons/social.jpg",
  "./icons/spirit.jpg",
  "./icons/time-pie.jpg",
  "./icons/trophies.jpg",
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
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE.map((u) => new Request(u, { cache: "reload" })))).then(() => self.skipWaiting())
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
