"use strict";
// Positive controls for scripts/design-channel-check.js (design-omniskill P6).
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const SCRIPT = path.join(__dirname, "..", "scripts", "design-channel-check.js");
function run(args) {
  const r = spawnSync(process.execPath, [SCRIPT, ...args], { encoding: "utf8" });
  return { status: r.status, out: r.stdout, err: r.stderr };
}
function tmp(t, name, content) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `dcc-${name}-`));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const f = path.join(dir, name);
  fs.writeFileSync(f, content);
  return f;
}

test("design channel html: flags off-scale gaps, off-axis font sizes, single families, inline styles, missing alt", (t) => {
  const f = tmp(t, "bad.html", `<html><body>
    <div style="margin: 6px">x</div>
    <p style="font-size: 13px; font-family: Arial">t</p>
    <span style="padding: 2px 5px">s</span>
    <img src="a.png">
    <img src="b.png" alt="ok">
  </body></html>`);
  const r = run(["html", f]);
  assert.equal(r.status, 1);
  assert.match(r.out, /off-scale gap/);
  assert.match(r.out, /off-axis font-size/);
  assert.match(r.out, /single-family/);
  assert.match(r.out, /inline style/);
  assert.match(r.out, /missing alt/);
});

test("design channel html: clean page passes with scale and fallback stacks", (t) => {
  const f = tmp(t, "good.html", `<html><head><style>
    .a { margin: 8px; font-size: 14px; font-family: Arial, 'Noto Sans KR', sans-serif; }
  </style></head><body>
    <div class="a">x</div>
    <img src="a.png" alt="ok">
  </body></html>`);
  const r = run(["html", f]);
  assert.equal(r.status, 0, r.out);
  assert.match(r.out, /clean/);
});

test("design channel code: flags off-scale values and bare hex colors, tolerates tokens", (t) => {
  const f = tmp(t, "ui.css", `:root { --accent: #ff00aa; }
.box { margin: 9px; color: #ff00aa; border-color: var(--accent); padding: 4px; }`);
  const r = run(["code", f]);
  assert.equal(r.status, 1);
  assert.match(r.out, /off-scale gap: .*9px/);
  assert.doesNotMatch(r.out, /var\(--accent\)/);
});

test("design channel evidence: rejects a contract missing required fields or an invalid status, accepts complete one", (t) => {
  const bad = tmp(t, "bad.json", JSON.stringify({ engine: "lo", input: "a.pptx" }));
  const badStatus = tmp(t, "badstatus.json", JSON.stringify({ status: "DONE", engine: "lo", input: "a.pptx", pdf: "a.pdf", raster: "r.png", width: 1920, height: 1080, sha256: "abc" }));
  const good = tmp(t, "good.json", JSON.stringify({ status: "SUCCESS", engine: "lo", input: "a.pptx", pdf: "a.pdf", raster: "r.png", width: 1920, height: 1080, sha256: "abc" }));
  const r1 = run(["evidence", "pptx", bad]);
  assert.equal(r1.status, 1);
  assert.match(r1.out, /missing status/);
  assert.match(r1.out, /missing sha256/);
  const r2 = run(["evidence", "pptx", badStatus]);
  assert.equal(r2.status, 1);
  assert.match(r2.out, /invalid status "DONE"/);
  const r3 = run(["evidence", "pptx", good]);
  assert.equal(r3.status, 0, r3.out);
});

test("design channel scorecard: measured metric + evidence passes", (t) => {
  const f = tmp(t, "good.json", JSON.stringify({ items: [
    { item: "contrast", metric: "4.6:1", evidence: "docs/design-cases/case-contrast.md" },
    { item: "overflow", metric: "0 clipped", evidence: "render/r1.png" },
    { item: "tokens", unknown: true, reason: "측정 대상 폰트 정의 없음", evidence: "docs/design-cases/case-font-fallback.md" },
  ] }));
  const r = run(["scorecard", f]);
  assert.equal(r.status, 0, r.out);
  assert.match(r.out, /3 items/);
  const rArr = run(["scorecard", tmp(t, "arr.json", JSON.stringify([{ item: "x", metric: "1", evidence: "e" }]))]);
  assert.equal(rArr.status, 0, rArr.out);
});

test("design channel scorecard: item without metric/UNKNOWN or without evidence is rejected", (t) => {
  const noMetric = run(["scorecard", tmp(t, "nometric.json", JSON.stringify({ items: [{ item: "looks", evidence: "x" }] }))]);
  assert.equal(noMetric.status, 1);
  assert.match(noMetric.out, /without measured metric/);
  const noEvidence = run(["scorecard", tmp(t, "noev.json", JSON.stringify({ items: [{ item: "contrast", metric: "4.6:1" }] }))]);
  assert.equal(noEvidence.status, 1);
  assert.match(noEvidence.out, /without evidence/);
  const badJson = run(["scorecard", tmp(t, "bad.json", "{ nope")]);
  assert.equal(badJson.status, 1);
});

test("design channel scorecard (C3 v1.7.0): UNKNOWN requires reason, metric must be numeric, empty items rejected", (t) => {
  // 1. UNKNOWN without reason -> rejected
  const noReason = run(["scorecard", tmp(t, "noreason.json", JSON.stringify({ items: [{ item: "tokens", unknown: true }] }))]);
  assert.equal(noReason.status, 1);
  assert.match(noReason.out, /UNKNOWN item without reason/);
  // 2. UNKNOWN with reason -> passes
  const withReason = run(["scorecard", tmp(t, "reason.json", JSON.stringify({ items: [{ item: "tokens", unknown: true, reason: "색상 정의 없음" }] }))]);
  assert.equal(withReason.status, 0, withReason.out);
  assert.match(withReason.out, /1 items/);
  // 3. non-numeric (prose) metric -> rejected
  const textMetric = run(["scorecard", tmp(t, "textmetric.json", JSON.stringify({ items: [{ item: "contrast", metric: "좋음", evidence: "e" }] }))]);
  assert.equal(textMetric.status, 1);
  assert.match(textMetric.out, /metric must be a measured number/);
  // 4. unit/ratio/integer metrics (string and number) -> pass
  const unitMetric = run(["scorecard", tmp(t, "unitmetric.json", JSON.stringify({ items: [
    { item: "contrast", metric: "4.5:1", evidence: "e" },
    { item: "width", metric: 1920, evidence: "e" },
    { item: "overflow", metric: "0 clipped", evidence: "e" },
  ] }))]);
  assert.equal(unitMetric.status, 0, unitMetric.out);
  // 5. empty items array -> rejected (array form and object form)
  const emptyArr = run(["scorecard", tmp(t, "empty1.json", JSON.stringify({ items: [] }))]);
  assert.equal(emptyArr.status, 1);
  assert.match(emptyArr.out, /no items/);
  const emptyBare = run(["scorecard", tmp(t, "empty2.json", JSON.stringify([]))]);
  assert.equal(emptyBare.status, 1);
  assert.match(emptyBare.out, /no items/);
});
