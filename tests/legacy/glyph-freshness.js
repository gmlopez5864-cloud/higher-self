// The t37figs failures are this mtime check, not a pixel compare:
//   [ glyphs128-<style>/$f -nt glyphs-<style>/$f ] || echo $f
// "none older than its 512px source" means the built file must be strictly newer.
// Render checks in the same attached run passed. This script keeps that check when the
// local 512px sources exist, and does not rewrite Pablo's art.
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const APP = process.env.HS_APP || path.resolve(__dirname, "../..");
const icons = path.join(APP, "icons");
const styles = ["dog", "cat", "bird", "fish"];
const missing = styles.filter(st => !fs.existsSync(path.join(icons, "glyphs-" + st)));
if (missing.length) {
  console.log(JSON.stringify({
    sourcesPresent: false,
    missing: missing.map(st => "icons/glyphs-" + st),
    check: "mtime: glyphs128-<style> file must be strictly newer than icons/glyphs-<style> (512px). Not a pixel diff.",
    attachedFails: {
      "glyphs128-dog": ["./feed/on-this-day.png"],
      "glyphs128-cat": ["./feed/on-this-day.png"],
      "glyphs128-bird": ["./feed/on-this-day.png"],
      "glyphs128-fish": ["./feed/read-stop.png", "./feed/on-this-day.png"]
    },
    note: "Those 512px source folders are not in git. The shipped 128px files in this branch match main byte for byte, so the same local sources fail the same way on main."
  }, null, 2));
  process.exit(0);
}
let fails = 0;
for (const st of styles) {
  const stale = execSync(`cd ${JSON.stringify(icons)} && for f in $(cd glyphs-${st} && find . -name '*.png' -not -path './src/*' -not -path './old/*' -not -path './raw/*'); do [ glyphs128-${st}/$f -nt glyphs-${st}/$f ] || echo $f; done`, { encoding: "utf8" }).trim();
  const bad = stale ? stale.split("\n").filter(Boolean) : [];
  console.log(JSON.stringify({ style: st, stale: bad }));
  if (bad.length) fails++;
}
process.exit(fails ? 1 : 0);
