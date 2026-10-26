"use strict";
// A typed, reviewable contract guard. This does not rewrite host-managed model compaction,
// authenticate who committed a contract, or grant any tool permission.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const HASH_RE = /^[a-f0-9]{64}$/;
function keysEqual(object, expected) {
  return object && typeof object === "object" && !Array.isArray(object) &&
    JSON.stringify(Object.keys(object).sort()) === JSON.stringify(expected.slice().sort());
}
function digest(value) { return crypto.createHash("sha256").update(value).digest("hex"); }
function readJson(file) { return JSON.parse(fs.readFileSync(file, "utf8")); }
function fail(reason) { return { ok: false, reason }; }
function validateContract(contract, phase) {
  if (!keysEqual(contract, ["schema", "phase", "constraints"]) ||
      contract.schema !== 1 || contract.phase !== phase ||
      !Array.isArray(contract.constraints) || !contract.constraints.length ||
      contract.constraints.length > 100) return "contract schema, phase or count invalid";
  const seen = new Set();
  for (const item of contract.constraints) {
    if (!keysEqual(item, ["id", "text", "source"]) ||
        typeof item.id !== "string" || !ID_RE.test(item.id) || seen.has(item.id) ||
        typeof item.text !== "string" || !item.text.trim() || item.text.length > 2000 ||
        !keysEqual(item.source, ["role", "ref"]) ||
        !["user", "policy"].includes(item.source.role) ||
        typeof item.source.ref !== "string" || !item.source.ref.trim() || item.source.ref.length > 512)
      return "invalid or duplicate trusted constraint";
    seen.add(item.id);
  }
  return null;
}
function verifyPhaseContext(root, phase) {
  if (typeof phase !== "string" || !ID_RE.test(phase)) return fail("invalid phase identifier");
  const contractPath = path.join(root, "docs", "task-contracts", "phase-" + phase + ".json");
  if (!fs.existsSync(contractPath)) return { ok: true, enabled: false };
  let contract, original, summary;
  try { original = fs.readFileSync(contractPath); contract = JSON.parse(original.toString("utf8")); }
  catch { return fail("unreadable authoritative contract"); }
  const invalid = validateContract(contract, phase);
  if (invalid) return fail(invalid);
  const summaryPath = path.join(root, ".phase-evidence", "phase-" + phase + "-context.json");
  try { summary = readJson(summaryPath); }
  catch { return fail("missing or invalid typed context checkpoint"); }
  if (!keysEqual(summary, ["schema", "phase", "contract_sha256", "constraints", "observations"]) ||
      summary.schema !== 1 || summary.phase !== phase ||
      typeof summary.contract_sha256 !== "string" || !HASH_RE.test(summary.contract_sha256) ||
      summary.contract_sha256 !== digest(original))
    return fail("context checkpoint contract hash/schema mismatch");
  if (!Array.isArray(summary.constraints) || summary.constraints.length !== contract.constraints.length)
    return fail("checkpoint lost or added a required constraint");
  const canonical = new Map(contract.constraints.map(c => [c.id, c]));
  const seen = new Set();
  for (const item of summary.constraints) {
    if (!keysEqual(item, ["id", "text", "source"]) ||
        !canonical.has(item.id) || seen.has(item.id) ||
        JSON.stringify(item) !== JSON.stringify(canonical.get(item.id)))
      return fail("checkpoint altered, dropped or elevated a trusted constraint");
    seen.add(item.id);
  }
  if (!Array.isArray(summary.observations) || summary.observations.length > 100)
    return fail("checkpoint observations invalid");
  for (const item of summary.observations) {
    if (!keysEqual(item, ["text", "source"]) ||
        typeof item.text !== "string" || item.text.length > 4000 ||
        !keysEqual(item.source, ["role", "ref"]) ||
        !["tool", "agent"].includes(item.source.role) ||
        typeof item.source.ref !== "string" || !item.source.ref.trim())
      return fail("untrusted observation claimed privileged origin or lost provenance");
  }
  return { ok: true, enabled: true, constraint_count: seen.size, contract_sha256: digest(original) };
}
function main() {
  if (process.argv.length !== 4 || process.argv[2] !== "verify") {
    console.error("Usage: node scripts/context-contract.js verify <phase-id>");
    process.exit(1);
  }
  const result = verifyPhaseContext(path.resolve(process.env.PHASE_GATE_ROOT || "."), process.argv[3]);
  console.log(JSON.stringify(result));
  process.exit(result.ok ? 0 : 2);
}
if (require.main === module) main();
module.exports = { verifyPhaseContext, digest };
