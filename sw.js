/* Higher Self — offline shell for install / Add to Home Screen */
const CACHE = "higher-self-v10";
const PRECACHE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/app-mark.jpg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-512-maskable.png",
  "./icons/icon-180.png",
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
  "./icons/pull-fear.jpg",
  "./icons/pull-anxiety.jpg",
  "./icons/pull-shame.jpg",
  "./icons/pull-despair.jpg",
  "./icons/pull-control.jpg",
  "./icons/pull-people-pleasing.jpg",
  "./icons/pull-numbness.jpg",
  "./icons/opp-acceptance.jpg",
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
  "./icons/opp-endurance.jpg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
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
