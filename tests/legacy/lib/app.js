// Enough of the local harness to run the plan suites against this repo.
// Today is pinned to Wed 21 Oct 2026 so the v39 plan cases keep their dates.
const fs = require("fs");
const { puppeteer, APP, TMP, ORIGIN, CHROME } = require("./env");
fs.mkdirSync(TMP, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const MOB = {
  viewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36"
};
function suite() {
  const res = {};
  let fails = 0;
  const ok = (n, c, i) => {
    res[n] = (c ? "PASS" : "FAIL") + (i !== undefined ? " " + JSON.stringify(i) : "");
    if (!c) fails++;
  };
  const done = () => {
    console.log(JSON.stringify(res, null, 1));
    console.log("CHECKS " + Object.keys(res).length + " FAILS " + fails);
    if (fails) process.exitCode = 1;
  };
  return { sleep, ok, done };
}
async function launch() {
  return puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox", "--disable-dev-shm-usage"] });
}
async function phonePage(browser) {
  const page = await browser.newPage();
  await page.emulate(MOB);
  try { await page.emulateTimezone("America/Phoenix"); } catch (e) {}
  await page.evaluateOnNewDocument(() => {
    const fixed = Date.parse("2026-10-21T12:00:00-07:00");
    const Real = Date;
    function Fake(...args) {
      if (!(this instanceof Fake)) return Real(...args);
      if (args.length === 0) return new Real(fixed);
      return new Real(...args);
    }
    Fake.prototype = Real.prototype;
    Fake.now = () => fixed;
    Fake.parse = Real.parse;
    Fake.UTC = Real.UTC;
    window.Date = Fake;
  });
  const errs = [];
  page.on("pageerror", e => errs.push(String(e && e.message || e)));
  return { page, errs };
}
async function fresh(page) {
  await page.goto(ORIGIN + "/", { waitUntil: "networkidle0" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle0" });
}
async function setup(page, name, pass) {
  await page.waitForSelector("#profileName");
  await page.click("#profileName", { clickCount: 3 });
  await page.type("#profileName", name);
  await page.type("#vaultPass", pass);
  await page.type("#vaultPass2", pass);
  await page.click("#vaultSetup");
  await page.waitForSelector("#appRoot:not([hidden])");
  await page.evaluate(() => {
    const g = document.getElementById("guideOverlay");
    if (g) g.hidden = true;
    document.getElementById("appRoot").removeAttribute("aria-hidden");
    if (data) { data.guideSeen = true; save(); }
  });
  await sleep(400);
}
async function lock(page) {
  await page.evaluate(() => { if (typeof lockApp === "function") lockApp(); });
  await page.waitForSelector("#vaultGate:not([hidden])");
  await sleep(300);
}
async function unlock(page, name, pass) {
  await page.evaluate(n => {
    const b = [...document.querySelectorAll("[data-profile]")].find(el => (el.innerText || "").trim() === n);
    if (b) b.click();
  }, name);
  await page.waitForSelector("#vaultPass");
  await page.click("#vaultPass", { clickCount: 3 });
  await page.type("#vaultPass", pass);
  await page.click("#vaultUnlock");
  try {
    await page.waitForSelector("#appRoot:not([hidden])", { timeout: 8000 });
  } catch (e) { return false; }
  await page.evaluate(() => {
    const g = document.getElementById("guideOverlay");
    if (g) g.hidden = true;
    document.getElementById("appRoot").removeAttribute("aria-hidden");
    document.querySelectorAll("dialog[open]").forEach(d => { try { d.close(); } catch (err) {} });
  });
  await sleep(300);
  return true;
}
async function clean(page) {
  await page.evaluate(() => {
    const g = document.getElementById("guideOverlay");
    if (g) g.hidden = true;
    const root = document.getElementById("appRoot");
    if (root) root.removeAttribute("aria-hidden");
    document.querySelectorAll("dialog[open]").forEach(d => { try { d.close(); } catch (e) {} });
  });
  await sleep(150);
}
async function catchDownloads(page) {
  await page.evaluate(() => {
    window.__dl = window.__dl || [];
    if (window.__dlHook) return;
    window.__dlHook = true;
    const orig = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () {
      const name = this.download || "";
      const href = this.href || "";
      if (name && href.indexOf("blob:") === 0) {
        fetch(href).then(r => r.text()).then(text => window.__dl.push({ name, text })).catch(() => {});
      }
      return orig.apply(this, arguments);
    };
  });
}
async function lastDownload(page) {
  return page.evaluate(() => window.__dl[window.__dl.length - 1]);
}
module.exports = { APP, TMP, ORIGIN, sleep, suite, launch, phonePage, fresh, setup, lock, unlock, clean, catchDownloads, lastDownload };
