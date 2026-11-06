// Shared paths for the legacy suites. HS_APP is the folder that contains index.html.
const path = require("path");
const puppeteer = require("puppeteer-core");
const APP = process.env.HS_APP || path.resolve(__dirname, "../../..");
const TMP = process.env.HS_TMP || path.join(APP, "tests", "legacy", "tmp");
const ORIGIN = process.env.HS_ORIGIN || "http://127.0.0.1:8765";
const CHROME = process.env.CHROME || "/usr/bin/google-chrome";
module.exports = { puppeteer, APP, TMP, ORIGIN, CHROME };
