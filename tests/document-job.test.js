"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { validateJob, verifyResult, digest } = require("../scripts/document-job");
const H = "a".repeat(64), binding = digest("fixture bytes");
function fixtures() {
  const job = { schema: 1, job_id: "paper-1", engine: { name: "fixture", version: "1", endpoint: "local" },
    capabilities: { read_root: "scratch/input", write_root: "scratch/output", outbound_text: false, cache: "no-store", asset_download: false, package_install: false },
    limits: { deadline_seconds: 60, max_attempts: 2, max_parallel: 2, max_input_bytes: 1000000 },
    inputs: [{ id: "paper", sha256: H, kind: "native", pages: 2, protected_tokens: ["{v0}", "{v0}", "{v1}"] }] };
  const result = { schema: 1, job_sha256: binding, items: [{ id: "paper", status: "success", source_sha256: H, pages: 2,
    protected_tokens: ["{v1}", "{v0}", "{v0}"], artifacts: { translated: { path: "job/mono.pdf", sha256: H }, comparison: { path: "job/dual.pdf", sha256: H } },
    checks: { coverage: "pass", semantics: "pass", visual: "pass" } }] };
  return { job, result };
}
test("accept complete bound manifest without invoking any engine", () => {
  const { job, result } = fixtures();
  assert.equal(validateJob(job), null);
  assert.deepEqual(verifyResult(job, result, binding), { ok: true, scope: "manifest-consistency-only", input_count: 1 });
});
test("reject unbounded work, implicit provisioning and malformed jobs", () => {
  for (const change of [j => j.limits.max_attempts = 0, j => j.limits.max_attempts = 11, j => j.limits.max_parallel = 17,
    j => j.limits.deadline_seconds = Infinity, j => j.capabilities.package_install = true, j => j.capabilities.asset_download = true,
    j => j.capabilities.cache = "global", j => j.inputs.push(j.inputs[0]), j => j.inputs[0].pages = 0, j => j.engine.extra = true]) {
    const { job } = fixtures(); change(job); assert.notEqual(validateJob(job), null);
  }
  assert.notEqual(validateJob(null), null);
});
test("reject missing, partial, duplicate and wrongly bound results", () => {
  for (const change of [r => r.items = [], r => r.items.push(r.items[0]), r => r.items[0].id = "other", r => r.job_sha256 = H,
    r => r.items[0].status = "partial", r => r.items[0].status = "failed", r => r.items[0].pages = 1,
    r => r.items[0].source_sha256 = "b".repeat(64)]) {
    const { job, result } = fixtures(); change(result); assert.equal(verifyResult(job, result, binding).ok, false);
  }
});
test("multiple inputs allow reordered results but reject same-length duplicates and shared outputs", () => {
  const { job, result } = fixtures();
  job.inputs.push({ ...job.inputs[0], id: "second" });
  const second = structuredClone(result.items[0]); second.id = "second";
  second.artifacts.translated.path = "second/mono.pdf"; second.artifacts.comparison.path = "second/dual.pdf";
  result.items.unshift(second);
  assert.equal(verifyResult(job, result, binding).ok, true);
  result.items[1].id = "second";
  assert.equal(verifyResult(job, result, binding).ok, false);
  result.items[1].id = "paper";
  result.items[1].artifacts.translated.path = "second/mono.pdf";
  assert.equal(verifyResult(job, result, binding).ok, false);
});
test("reject file-versus-directory conflicts across artifacts and inputs in either order", () => {
  for (const paths of [["job/a.pdf", "job/A.pdf/b.pdf"], ["job/A.pdf/b.pdf", "job/a.pdf"]]) {
    const { job, result } = fixtures();
    result.items[0].artifacts.translated.path = paths[0];
    result.items[0].artifacts.comparison.path = paths[1];
    assert.equal(verifyResult(job, result, binding).ok, false);
    result.items[0].artifacts.comparison.path = "job/dual.pdf";
    job.inputs.push({ ...job.inputs[0], id: "second" });
    const second = structuredClone(result.items[0]); second.id = "second";
    second.artifacts.translated.path = paths[1]; second.artifacts.comparison.path = "second/dual.pdf";
    result.items.push(second);
    assert.equal(verifyResult(job, result, binding).ok, false);
  }
});
test("comma-containing keys cannot replace required schema fields",   () => {
  const { job } = fixtures();
  job.limits = { "deadline_seconds,max_attempts,max_input_bytes,max_parallel": 1 };
  assert.notEqual(validateJob(job), null);
  for (const change of [r => r.items[0].artifacts = { "comparison,translated": { path: "job/con.pdf", sha256: H } },
    r => r.items[0].checks = { "coverage,semantics,visual": "pass" }]) {
    const f = fixtures(); change(f.result); assert.equal(verifyResult(f.job, f.result, binding).ok, false);
  }
});
test("token multiset detects omissions and duplicate replacements",  () => {
  for (const tokens of [["{v0}", "{v1}"], ["{v0}", "{v1}", "{v1}"], ["{v0}", "{v0}", "{v9}"], null]) {
    const { job, result } = fixtures(); result.items[0].protected_tokens = tokens;
    assert.equal(verifyResult(job, result, binding).ok, false);
  }
});
test("CLI binds exact job bytes and fails closed on malformed JSON", () => {
  const fs = require("node:fs"), os = require("node:os"), path = require("node:path");
  const { spawnSync } = require("node:child_process");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "document-manifest-"));
  try {
    const { job, result } = fixtures(), bytes = JSON.stringify(job);
    result.job_sha256 = digest(bytes);
    const jp = path.join(dir, "job.json"), rp = path.join(dir, "result.json");
    fs.writeFileSync(jp, bytes); fs.writeFileSync(rp, JSON.stringify(result));
    const run = () => spawnSync(process.execPath, [path.resolve(__dirname, "../scripts/document-job.js"), "verify", jp, rp], { encoding: "utf8", timeout: 30000 });
    let output = run(); assert.equal(output.status, 0, output.stderr); assert.equal(JSON.parse(output.stdout).scope, "manifest-consistency-only");
    fs.appendFileSync(jp, "\n"); output = run(); assert.equal(output.status, 2);
    fs.writeFileSync(rp, "{"); output = run(); assert.equal(output.status, 2); assert.equal(JSON.parse(output.stdout).ok, false);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
test("CLI bounds each manifest and rejects non-regular files", t => {
  const fs = require("node:fs"), os = require("node:os"), path = require("node:path");
  const { spawnSync } = require("node:child_process");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "document-limit-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const { job, result } = fixtures();
  const jp = path.join(dir, "job.json"), rp = path.join(dir, "result.json");
  const max = 16 * 1024 * 1024;
  const run = () => spawnSync(process.execPath, [path.resolve(__dirname, "../scripts/document-job.js"), "verify", jp, rp], { encoding: "utf8", timeout: 30000 });
  for (const target of [jp, rp]) {
    const jobBytes = target === jp ? JSON.stringify(job).padEnd(max) : JSON.stringify(job);
    result.job_sha256 = digest(jobBytes);
    fs.writeFileSync(jp, jobBytes);
    const resultBytes = JSON.stringify(result);
    fs.writeFileSync(rp, target === rp ? resultBytes.padEnd(max) : resultBytes);
    assert.equal(run().status, 0);
    fs.appendFileSync(target, " ");
    const out = run(); assert.equal(out.status, 2); assert.equal(JSON.parse(out.stdout).ok, false);
  }
  fs.rmSync(jp); fs.mkdirSync(jp);
  assert.equal(run().status, 2);
});
test("reject unverified review and unsafe/colliding artifact descriptors",  () => {
  for (const change of [r => r.items[0].checks.visual = "not_run", r => r.items[0].checks.semantics = "fail",
    r => delete r.items[0].artifacts.comparison, r => r.items[0].artifacts.translated.sha256 = "bad",
    ...["../out.pdf", "C:/out.pdf", "/out.pdf", "a/../out.pdf", "a\\out.pdf", "https://x/out.pdf", "job/DUAL.pdf", "job/b./out.pdf", "job/CON.pdf", "job/lpt1/out.pdf", "job/COM9.txt/out.pdf"].map(p => r => r.items[0].artifacts.translated.path = p)]) {
    const { job, result } = fixtures(); change(result); assert.equal(verifyResult(job, result, binding).ok, false);
  }
});
