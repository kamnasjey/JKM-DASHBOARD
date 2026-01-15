import { chromium } from "playwright";

const url = process.argv[2] ?? "https://www.jkmcopilot.com";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

const messages = [];

page.on("console", (msg) => {
  const type = msg.type();
  const text = msg.text();
  messages.push({ kind: "console", type, text });
  // Print immediately for fast feedback
  console.log(`[console.${type}] ${text}`);
});

page.on("pageerror", (err) => {
  messages.push({ kind: "pageerror", message: String(err?.message ?? err), stack: err?.stack });
  console.log("[pageerror]", err?.stack ?? String(err));
});

page.on("requestfailed", (req) => {
  const failure = req.failure();
  const info = {
    kind: "requestfailed",
    url: req.url(),
    method: req.method(),
    failure: failure?.errorText,
  };
  messages.push(info);
  console.log(`[requestfailed] ${info.method} ${info.url} :: ${info.failure}`);
});

try {
  const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
  console.log("[goto] status=", resp?.status());

  // Give hydration/runtime a moment.
  await page.waitForTimeout(5_000);

  // Try navigating to Strategy Maker (now nested under Strategies) as well.
  const smUrl = url.replace(/\/$/, "") + "/strategies/maker";
  const resp2 = await page.goto(smUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
  console.log("[goto] strategies/maker status=", resp2?.status());
  await page.waitForTimeout(5_000);

  const hasPageErrors = messages.some((m) => m.kind === "pageerror");
  if (hasPageErrors) {
    process.exitCode = 2;
  } else {
    process.exitCode = 0;
  }
} finally {
  await browser.close();
}
