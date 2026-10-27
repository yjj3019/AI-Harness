"use strict";
// Offline manifest checker only: no translation, authorization, PDF inspection or filesystem sandbox.
const fs = require("node:fs");
const crypto = require("node:crypto");
const exact = (v, keys) => v !== null && typeof v === "object" && !Array.isArray(v) &&
  Object.keys(v).length === keys.length && keys.every(key => Object.hasOwn(v, key));
const text = v => typeof v === "string" && v.trim().length > 0 && v.length <= 2048;
const count = v => Number.isSafeInteger(v) && v > 0;
const hash = v => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);
const id = v => typeof v === "string" && /^[a-zA-Z0-9_-]{1,64}$/.test(v);
const digest = v => crypto.createHash("sha256").update(v).digest("hex");
function validateJob(j) {
  if (!exact(j, ["schema", "job_id", "engine", "capabilities", "limits", "inputs"]) || j.schema !== 1 || !id(j.job_id)) return "invalid job schema/id";
  if (!exact(j.engine, ["name", "version", "endpoint"]) || !text(j.engine.name) || !text(j.engine.version) || !text(j.engine.endpoint)) return "invalid engine identity";
  const c = j.capabilities;
  if (!exact(c, ["read_root", "write_root", "outbound_text", "cache", "asset_download", "package_install"]) || !text(c.read_root) || !text(c.write_root) ||
      typeof c.outbound_text !== "boolean" || !["no-store", "job-local"].includes(c.cache) || c.asset_download !== false || c.package_install !== false) return "invalid capabilities; provision assets/packages separately";
  if (!exact(j.limits, ["deadline_seconds", "max_attempts", "max_parallel", "max_input_bytes"]) || !Object.values(j.limits).every(count) ||
      j.limits.max_attempts > 10 || j.limits.max_parallel > 16) return "invalid bounded limits";
  if (!Array.isArray(j.inputs) || !j.inputs.length || j.inputs.length > 100) return "invalid input count";
  const ids = new Set();
  for (const input of j.inputs) {
    if (!exact(input, ["id", "sha256", "kind", "pages", "protected_tokens"]) || !id(input.id) || ids.has(input.id) || !hash(input.sha256) ||
        !["native", "scanned", "mixed"].includes(input.kind) || !count(input.pages) || !Array.isArray(input.protected_tokens) ||
        input.protected_tokens.length > 10000 || !input.protected_tokens.every(text)) return "invalid or duplicate input";
    ids.add(input.id);
  }
  return null;
}
function sameTokens(a, b) {
  return Array.isArray(b) && b.every(text) && JSON.stringify(a.slice().sort()) === JSON.stringify(b.slice().sort());
}
function verifyResult(job, result, jobDigest) {
  const fail = reason => ({ ok: false, reason });
  const error = validateJob(job);
  if (error) return fail(error);
  if (!hash(jobDigest) || !exact(result, ["schema", "job_sha256", "items"]) || result.schema !== 1 || result.job_sha256 !== jobDigest ||
      !Array.isArray(result.items) || result.items.length !== job.inputs.length) return fail("result schema/binding/input count mismatch");
  const inputs = new Map(job.inputs.map(i => [i.id, i]));
  const seen = new Set(), artifacts = new Set();
  for (const item of result.items) {
    if (!exact(item, ["id", "status", "source_sha256", "pages", "protected_tokens", "artifacts", "checks"]) || !inputs.has(item.id) || seen.has(item.id)) return fail("unexpected/duplicate result item");
    seen.add(item.id);
    const input = inputs.get(item.id);
    if (item.status !== "success" || item.source_sha256 !== input.sha256 || item.pages !== input.pages) return fail("failed/partial/unbound input result");
    if (!sameTokens(input.protected_tokens, item.protected_tokens)) return fail("protected token multiset changed");
    if (!exact(item.artifacts, ["translated", "comparison"])) return fail("missing translated/comparison artifact");
    for (const artifact of Object.values(item.artifacts)) {
      // Portable job-relative paths only. Actual symlink/root enforcement belongs to the runner.
      if (!exact(artifact, ["path", "sha256"]) || !text(artifact.path) || !/^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_.-]+)*\.pdf$/.test(artifact.path) ||
          artifact.path.split("/").some(p => p === "." || p === ".." || p.endsWith(".") || /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(p)) || !hash(artifact.sha256)) return fail("invalid/colliding artifact descriptor");
      const normalized = artifact.path.toLowerCase();
      if ([...artifacts].some(other => other === normalized || other.startsWith(normalized + "/") || normalized.startsWith(other + "/"))) return fail("invalid/colliding artifact descriptor");
      artifacts.add(normalized);
    }
    if (!exact(item.checks, ["coverage", "semantics", "visual"]) || !Object.values(item.checks).every(v => v === "pass")) return fail("required review failed or unverified");
  }
  return { ok: true, scope: "manifest-consistency-only", input_count: seen.size };
}
function main() {
  if (process.argv.length !== 5 || process.argv[2] !== "verify") {
    console.error("Usage: node scripts/document-job.js verify <job.json> <result.json>"); process.exitCode = 1; return;
  }
  try {
    const bytes = fs.readFileSync(process.argv[3]);
    const result = verifyResult(JSON.parse(bytes.toString("utf8")), JSON.parse(fs.readFileSync(process.argv[4], "utf8")), digest(bytes));
    console.log(JSON.stringify(result)); process.exitCode = result.ok ? 0 : 2;
  } catch { console.log(JSON.stringify({ ok: false, reason: "unreadable or invalid JSON manifests" })); process.exitCode = 2; }
}
if (require.main === module) main();
module.exports = { validateJob, verifyResult, digest };
