// Copies the web app into www/ for Capacitor.
// Packaging machine (unchanged outcome): leave HS_APP and HS_EXCLUDES unset.
//   src defaults to /workspace/growth-app and excludes to /workspace/hs-excludes.txt.
// Cloud staging: set HS_APP to this repo and omit HS_EXCLUDES when that file is not on the machine.
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const src = process.env.HS_APP || "/workspace/growth-app";
const dest = path.join(__dirname, "..", "www");
const excludesFile = process.env.HS_EXCLUDES || "/workspace/hs-excludes.txt";
const useExcludes = fs.existsSync(excludesFile);
fs.rmSync(dest, { recursive: true, force: true });
fs.mkdirSync(dest, { recursive: true });
const ex = useExcludes ? `-X "${excludesFile}"` : "";
execSync(`tar -C "${src}" ${ex} -cf - ./index.html ./planner-gaps.js ./sw.js ./manifest.webmanifest ./icons ./themes | tar -C "${dest}" -xf -`, { stdio: "inherit", shell: "/bin/bash" });
console.log("Synced " + src + " → www/" + (useExcludes ? " (publish excludes applied)" : " (no excludes file on this machine)"));
