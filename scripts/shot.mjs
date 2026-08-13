import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const url = process.argv[2];
const out = process.argv[3];
const w = Number(process.argv[4] || 1280);
const h = Number(process.argv[5] || 800);

mkdirSync("/workspace/screenshots", { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage({ viewport: { width: w, height: h } });
const errors = [];
page.on("pageerror", (err) => errors.push(String(err.message || err)));
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(msg.text());
});
const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
await page.waitForTimeout(1500);
await page.screenshot({ path: out, fullPage: false });
const text = (await page.locator("body").innerText().catch(() => "")).trim();
console.log(JSON.stringify({ url, status: resp?.status(), textLen: text.length, errors, out }, null, 2));
await browser.close();
if (errors.length) process.exit(2);
