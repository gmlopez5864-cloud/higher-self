// v37: Pablo's Man and Woman icon sets (41 figure icons each). Built + listed, picked through Icon style,
// per-file fallback to classic, only the active style downloaded, sources/preview sheets never published.
// Screenshots: /workspace/v37-man-icons.png, /workspace/v37-woman-icons.png
const { puppeteer, APP, TMP } = require("./lib/env");
require("fs").mkdirSync(TMP + "/v37", { recursive: true });
const fs = require("fs"); const { execSync } = require("child_process");
const O = "http://127.0.0.1:8765";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const res = {}; let fails = 0;
const ok = (n, c, i) => { res[n] = (c ? "PASS" : "FAIL") + (i !== undefined ? " " + JSON.stringify(i) : ""); if (!c) fails++; };
const MOB = { viewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36" };
const FIG = fs.readFileSync("/workspace/figure-icons.txt", "utf8").split("Hands only")[0].split("\n").filter(l => /\.png$/.test(l)).sort();
const HANDS = ["opp-generosity.png", "opp-gratitude.png", "opp-release.png", "pull-control.png", "pull-greed.png", "steer-savoring.png", "steer-trust.png", "paths/friend.png"];
const ANIMAL0 = FIG.concat(HANDS).sort();
// v42 (Pablo, Nov 3): Addiction / Freedom / Clarity chips, the payoff money icon and the two diary icons ship in every style.
const NEW42 = ["diary/add-photo.png", "diary/voice-note.png", "money/payoff.png", "opp-clarity.png", "pull-addiction.png", "steer-freedom.png"];
// v43 (Pablo, Nov 3): the six feed glyphs ship in every style too.
const NEW43 = ["feed/feed-empty.png", "feed/feed.png", "feed/note-from-now.png", "feed/on-this-day.png", "feed/read-aloud.png", "feed/read-stop.png"];
const FIG42 = FIG.concat(NEW42, NEW43).sort(), ANIMAL = ANIMAL0.concat(NEW42, NEW43).sort();
(async () => {
  // build side: both sets match the figure list, built at 128px, listed, sources excluded from publish
  const man = execSync("cd /workspace/growth-app/icons/glyphs128-man && find . -name '*.png' | sed 's#^./##' | sort").toString().trim().split("\n");
  const woman = execSync("cd /workspace/growth-app/icons/glyphs128-woman && find . -name '*.png' | sed 's#^./##' | sort").toString().trim().split("\n");
  ok("glyphs128-man and glyphs128-woman hold exactly the 41 figure icons + the 6 v42 + 6 v43 feed icons", FIG.length === 41 && JSON.stringify(man) === JSON.stringify(FIG42) && JSON.stringify(woman) === JSON.stringify(FIG42), { fig: FIG.length, man: man.length, woman: woman.length });
  const sizes = execSync(`python3 -c "
from PIL import Image;import glob;print(sorted({Image.open(f).size for s in ('man','woman') for f in glob.glob('/workspace/growth-app/icons/glyphs128-'+s+'/**/*.png',recursive=True)}))"`).toString().trim();
  ok("built copies are 128x128", sizes === "[(128, 128)]", sizes);
  const art = JSON.parse(fs.readFileSync("/workspace/growth-app/icons/theme-art.json", "utf8")).glyphs;
  ok("theme-art.json lists man and woman (41 + 6 + 6 each, same paths)", JSON.stringify([...art.man].sort()) === JSON.stringify(FIG42) && JSON.stringify([...art.woman].sort()) === JSON.stringify(FIG42));
  for (const st of ["dog", "cat", "bird", "fish"]) {
    const l = execSync(`cd /workspace/growth-app/icons/glyphs128-${st} && find . -name '*.png' | sed 's#^./##' | sort`).toString().trim().split("\n");
    ok(`glyphs128-${st}: the 41 figures + 8 hands + 6 v42 + 6 v43 icons (61), listed in theme-art.json`, l.length === 61 && JSON.stringify(l) === JSON.stringify(ANIMAL) && JSON.stringify([...art[st]].sort()) === JSON.stringify(ANIMAL), l.length);
    const src = execSync(`cd /workspace/growth-app/icons/glyphs-${st} && find . -name '*.png' -not -path './src/*' -not -path './old/*' -not -path './raw/*' | sed 's#^./##' | sort`).toString().trim().split("\n");
    const stale = execSync(`cd /workspace/growth-app/icons && for f in $(cd glyphs-${st} && find . -name '*.png' -not -path './src/*' -not -path './old/*' -not -path './raw/*'); do [ glyphs128-${st}/$f -nt glyphs-${st}/$f ] || echo $f; done`).toString().trim();
    ok(`glyphs128-${st} is built from the current sources (none older than its 512px source)`, ANIMAL0.every(x => src.includes(x)) && stale === "", stale.split("\n").slice(0, 3));
  }
  const sizes2 = execSync(`python3 -c "
from PIL import Image;import glob;print(sorted({Image.open(f).size for s in ('dog','cat','bird','fish') for f in glob.glob('/workspace/growth-app/icons/glyphs128-'+s+'/**/*.png',recursive=True)}))"`).toString().trim();
  ok("animal built copies are 128x128", sizes2 === "[(128, 128)]", sizes2);
  const pub = execSync("tar -C /workspace/growth-app -X /workspace/hs-excludes.txt -cf - . | tar -tf - | grep -E 'glyphs-[a-z]+/|preview-sheet|/src/' || true").toString().trim();
  ok("publish/APK excludes every glyphs-<style>/ source folder (preview-sheet.jpg, src/)", pub === "", pub.split("\n").slice(0, 5));

  const browser = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: "new", args: ["--no-sandbox"] });
  const page = await browser.newPage(); await page.emulate(MOB); await page.setBypassServiceWorker(true);
  const errs = []; page.on("pageerror", e => errs.push(e.message));
  const reqs = []; await page.setRequestInterception(true);
  // per-file fallback proof: the man father icon answers 404
  let block404 = true;
  page.on("request", r => { reqs.push(r.url()); if (block404 && /icons\/glyphs128-man\/paths\/father\.png/.test(r.url())) r.respond({ status: 404, body: "" }); else r.continue(); });
  await page.goto(O + "/", { waitUntil: "networkidle0" });
  await page.evaluate(() => localStorage.clear()); await page.reload({ waitUntil: "networkidle0" });
  await page.waitForSelector("#profileName"); await page.click("#profileName", { clickCount: 3 }); await page.type("#profileName", "Guillermo");
  await page.type("#vaultPass", "guipass1"); await page.type("#vaultPass2", "guipass1"); await page.click("#vaultSetup");
  await page.waitForSelector("#appRoot:not([hidden])"); await sleep(600);
  await page.evaluate(() => { const g = document.getElementById("guideOverlay"); if (g) g.hidden = true; document.getElementById("appRoot").removeAttribute("aria-hidden"); document.querySelectorAll("dialog[open]").forEach(d => d.close()); data.guideSeen = true; save(); });
  ok("icon version 43", await page.evaluate(() => ICON_VER === "43"));
  ok("app sees both sets (41 + 6 v42 + 6 v43 each)", await page.evaluate(() => (glyphStyleSets.man || []).length === 53 && (glyphStyleSets.woman || []).length === 53));
  // paths with figure and non-figure icons
  await page.evaluate(() => {
    const P = [["father", "Father"], ["mother", "Mother"], ["athlete", "Athlete"], ["martial-artist", "Martial artist"], ["dance", "Dancer"], ["son", "Son"], ["hammer", "Builder"], ["writer", "Writer"]];
    P.forEach(([ic, name], i) => data.paths.push({ id: "p" + i, name, img: "icons/paths/" + ic + ".jpg", icon: "icons/paths/" + ic + ".jpg", created: shift(TODAY, -10), active: true, archived: false, steps: [] }));
    save(); renderDerived();
  });
  const shots = {};
  const snap = async (style, LIST = FIG) => {
    block404 = false; await page.evaluate(() => { GLYPH_FAILED.clear(); refreshGlyphs(); });
    // every figure icon as the app draws it (cream glyph on the theme tile), via the normal glyph lookup
    await page.evaluate((FIG, style) => {
      openScreen("home"); window.scrollTo(0, 0);
      const c = document.createElement("section"); c.id = "figSheet"; c.className = "card";
      c.innerHTML = '<h2 style="margin:0 0 .5rem">Icon style: ' + style + ' (' + FIG.length + ' icons)</h2><div style="display:grid;grid-template-columns:repeat(6,1fr);gap:8px">' + FIG.map(f => '<img class="glyph" data-no-glyph style="width:100%;aspect-ratio:1;border-radius:22%" src="' + gv(f) + '" alt="" />').join("") + "</div>";
      const host = document.querySelector("main") || document.getElementById("appRoot"); host.prepend(c);
    }, LIST, style[0].toUpperCase() + style.slice(1)); await sleep(1200);
    const n = await page.evaluate(() => [...document.querySelectorAll("#figSheet img")].filter(i => i.naturalWidth === 128).length);
    ok(`${style}: all ${LIST.length} icons of the set render in the app`, n === LIST.length, n);
    const home = `${TMP}/v37/${style}-home.png`; await page.screenshot({ path: home });
    await page.evaluate(() => document.getElementById("figSheet").remove());
    await page.evaluate(() => { openScreen("paths"); }); await sleep(900);
    await page.evaluate(() => { const c = [...document.querySelectorAll("img")].find(i => /paths\/father/.test(i.getAttribute("src") || "") && i.offsetParent); if (c) c.closest(".card, section, div").scrollIntoView({ block: "start" }); window.scrollBy(0, -60); }); await sleep(600);
    const paths = `${TMP}/v37/${style}-paths.png`; await page.screenshot({ path: paths });
    shots[style] = [home, paths]; block404 = true;
  };
  const look = () => page.evaluate(() => {
    const out = {}; document.querySelectorAll("img").forEach(i => { const s = i.getAttribute("src") || "", m = s.match(/icons\/glyphs128(?:-([a-z]+))?\/(paths\/[a-z-]+\.png|area-career-v2\.png|home\/goals\.png)/); if (m && i.offsetParent) out[m[2]] = [m[1] || "classic", i.naturalWidth]; });
    return out;
  });
  for (const [style, name] of [["man", "Man"], ["woman", "Woman"]]) {
    reqs.length = 0;
    const r = await page.evaluate(async (style) => {
      loadCustomEditor(null); const sel = document.getElementById("ctIcons");
      const opt = [...sel.options].find(o => o.value === style); document.getElementById("ctName").value = "My " + style; sel.value = style; document.getElementById("ctSave").click();
      await new Promise(r => setTimeout(r, 500)); const d = document.getElementById("themesDialog"); if (d && d.open) d.close();
      openSettings(); await new Promise(r => setTimeout(r, 200));
      const a = { opt: opt && opt.text, style: iconStyleFor(), sel: document.getElementById("iconStyleSel").value, wrap: !document.getElementById("iconStyleWrap").hidden };
      document.getElementById("optionsClose").click(); return a;
    }, style);
    ok(`${name}: picked in the custom theme editor, Settings shows ${name}`, r.opt === name && r.style === style && r.sel === style && r.wrap, r);
    await page.evaluate(() => { openScreen("paths"); }); await sleep(900);
    let L = await look();
    const fallbackFather = style === "man";
    ok(`${name}: figure path icons load from glyphs128-${style}`, ["paths/mother.png", "paths/athlete.png", "paths/martial-artist.png", "paths/dance.png", "paths/son.png"].every(k => L[k] && L[k][0] === style && L[k][1] === 128), L);
    ok(`${name}: non-figure path icons (hammer, writer) use classic`, L["paths/hammer.png"] && L["paths/hammer.png"][0] === "classic" && L["paths/hammer.png"][1] === 128 && L["paths/writer.png"][0] === "classic", L);
    if (fallbackFather) ok("Man: a set file that fails to load (father 404) falls back to classic on its own", L["paths/father.png"] && L["paths/father.png"][0] === "classic" && L["paths/father.png"][1] === 128, L["paths/father.png"]);
    else ok("Woman: father loads from glyphs128-woman", L["paths/father.png"] && L["paths/father.png"][0] === "woman" && L["paths/father.png"][1] === 128, L["paths/father.png"]);
    await page.evaluate(() => openScreen("areas")); await sleep(900);
    L = await look();
    const careerOk = L["area-career-v2.png"] && L["area-career-v2.png"][0] === style && L["area-career-v2.png"][1] === 128;
    await page.evaluate(() => openScreen("journal")); await sleep(600);
    const goals = await look();
    ok(`${name}: Areas Career uses the ${style} figure; Goals (no ${style} file) stays classic`, careerOk && goals["home/goals.png"] && goals["home/goals.png"][0] === "classic", { career: L["area-career-v2.png"], goals: goals["home/goals.png"] });
    const stray = reqs.filter(u => /glyphs128-([a-z]+)\//.test(u)).filter(u => { const m = u.match(/glyphs128-([a-z]+)\/([^?]+)/); return m[1] !== style || !FIG42.includes(m[2]); });
    ok(`${name}: only listed ${style} files are requested, no other style`, stray.length === 0, stray.slice(0, 5));
    await snap(style);
  }
  // ready-made Pets themes pick their animal set by default
  for (const [theme, st] of [["bold-birds", "bird"], ["bold-fish", "fish"], ["bold-small-dogs", "dog"], ["bold-big-dogs", "dog"], ["pic-dogs", "dog"], ["pic-cats", "cat"]]) {
    reqs.length = 0;
    await page.evaluate(t => { applyTheme(t); openScreen("paths"); }, theme); await sleep(900);
    const r = await page.evaluate(async () => {
      openSettings(); await new Promise(r => setTimeout(r, 200));
      const a = { style: iconStyleFor(), now: document.getElementById("iconStyleNow").innerText, sel: !document.getElementById("iconStyleWrap").hidden };
      document.getElementById("optionsClose").click();
      const hand = new Image(); hand.src = gv("opp-generosity.png"); await hand.decode().catch(() => {}); a.hand = [hand.getAttribute("src"), hand.naturalWidth];
      return a;
    });
    const L = await look();
    ok(`${theme}: Icon style defaults to ${st} ('Matches this theme.'), paths + hands use glyphs128-${st}`, r.style === st && /Matches this theme\. Change it in a custom theme\./.test(r.now) && !r.sel && ["paths/father.png", "paths/athlete.png", "paths/dance.png"].every(k => L[k] && L[k][0] === st && L[k][1] === 128) && L["paths/hammer.png"][0] === "classic" && r.hand[0].startsWith(`icons/glyphs128-${st}/opp-generosity.png`) && r.hand[1] === 128, { r, L });
    const stray = reqs.filter(u => /glyphs128-([a-z]+)\//.test(u)).filter(u => { const m = u.match(/glyphs128-([a-z]+)\/([^?]+)/); return m[1] !== st || !ANIMAL.includes(m[2]); });
    ok(`${theme}: no requests to other styles or unlisted files`, stray.length === 0, stray.slice(0, 5));
    if ((theme === "bold-birds" || theme === "bold-fish")) await snap(st, ANIMAL);
  }
  // back to a ready-made theme: classic again
  await page.evaluate(() => applyTheme("dawn")); await sleep(500);
  await page.evaluate(() => openScreen("paths")); await sleep(700);
  const L = await look();
  ok("Dawn: back to classic figures", Object.values(L).every(v => v[0] === "classic"), L);
  ok("no page errors", errs.length === 0, errs);
  await browser.close();
  // side-by-side screenshots: home | paths
  for (const s of ["man", "woman", "bird", "fish"]) execSync(`python3 -c "
from PIL import Image
a,b=[Image.open(p) for p in ['${shots[s][0]}','${shots[s][1]}']]
im=Image.new('RGB',(a.width+b.width+20,max(a.height,b.height)),(255,255,255));im.paste(a,(0,0));im.paste(b,(a.width+20,0));im.save('${TMP}/v37-${s}-icons.png')"`);
  console.log(JSON.stringify(res, null, 1));
  console.log("CHECKS " + Object.keys(res).length + " FAILS " + fails);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
