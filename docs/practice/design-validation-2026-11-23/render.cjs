"use strict";
// Run with an existing playwright-core and local Chromium; consult README.md.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { chromium } = require(process.argv[2] || "playwright-core");
const buttonName = "정보보호관리체계인증심사 보완 조치 결과 다시 불러오기";
const localPage = name => pathToFileURL(path.join(__dirname, name)).href;

async function inspect(page, view, width) {
  await page.setViewportSize({ width, height: 600 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(localPage("review.html") + "?view=" + view);
  const button = page.getByRole("button", { name: buttonName, exact: true });
  assert.equal(await button.count(), 1);
  await page.keyboard.press("Tab");
  const facts = await page.evaluate(() => {
    const button = document.querySelector("button");
    const caption = document.querySelector("caption");
    const overflow = el => Math.max(0, el.scrollWidth - el.clientWidth);
    return {
      viewport: innerWidth,
      pageOverflow: overflow(document.documentElement),
      buttonOverflow: overflow(button),
      captionOverflow: overflow(caption),
      focusOnButton: document.activeElement === button,
      outline: getComputedStyle(button).outlineStyle,
      buttonColor: getComputedStyle(button).backgroundColor,
      font: getComputedStyle(button).fontFamily
    };
  });
  assert.equal(facts.focusOnButton, true);
  assert.equal(await page.locator("body").getAttribute("data-state"), "empty");
  await page.screenshot({ path: path.join(__dirname, view + "-" + width + ".png") });
  await page.keyboard.press("Enter");
  assert.equal(await page.getByRole("status").textContent(), "결과를 불러오는 중입니다.");
  facts.reducedAnimation = await page.locator("#notice").evaluate(el => getComputedStyle(el, "::before").animationName);
  await page.waitForSelector('body[data-state="error"]');
  assert.match(await page.getByRole("status").textContent(), /다시 시도/);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.keyboard.press("Space");
  assert.equal(await page.getByRole("status").textContent(), "결과를 불러오는 중입니다.");
  facts.normalAnimation = await page.locator("#notice").evaluate(el => getComputedStyle(el, "::before").animationName);
  assert.equal(facts.normalAnimation, "spin");
  await page.waitForSelector('body[data-state="ready"]');
  assert.equal(await page.getByRole("status").textContent(), "결과를 갱신했습니다.");
  if (view === "corrected") {
    for (const metric of ["pageOverflow", "buttonOverflow", "captionOverflow"]) assert.equal(facts[metric], 0);
    assert.equal(facts.outline, "solid");
    assert.equal(facts.reducedAnimation, "none");
  } else {
    assert.equal(facts.outline, "none");
    assert.equal(facts.reducedAnimation, "spin");
    if (width === 320) assert.ok(facts.pageOverflow || facts.buttonOverflow || facts.captionOverflow);
  }
  return { view, ...facts };
}

async function main() {
  const browser = await chromium.launch({ executablePath: process.argv[3], headless: true, chromiumSandbox: true });
  try {
    const page = await browser.newPage({ offline: true, deviceScaleFactor: 1 });
    const errors = [];
    page.on("pageerror", e => errors.push(e.message));
    const cases = [];
    for (const width of [320, 960]) {
      for (const view of ["defect", "corrected"]) cases.push(await inspect(page, view, width));
    }
    for (const c of cases) {
      assert.equal(c.buttonColor, "rgb(37, 75, 117)");
      assert.equal(c.font, cases[0].font);
    }
    await page.setViewportSize({ width: 600, height: 640 });
    await page.goto(localPage("dashboard-flow.html"));
    await page.emulateMedia({ media: "print" });
    const diagram = await page.locator("li").evaluateAll(rows => rows.map(row => ({
      text: row.innerText,
      fontPx: parseFloat(getComputedStyle(row).fontSize),
      contained: row.scrollWidth === row.clientWidth && row.getBoundingClientRect().bottom <= innerHeight
    })));
    assert.equal(diagram.length, 7);
    assert.ok(diagram.every(row => row.contained && row.fontPx >= 16));
    await page.screenshot({ path: path.join(__dirname, "dashboard-flow-print.png") });
    assert.deepEqual(errors, []);
    const results = { browser: browser.version(), cases, diagram, pageErrors: errors };
    fs.writeFileSync(path.join(__dirname, "observations.json"), JSON.stringify(results, null, 2) + "\n");
    console.log("4 viewport/view cases, 4 states each, 7 diagram rows", browser.version());
  } finally {
    await browser.close();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
