"use strict";
const fs = require("node:fs");
const path = require("node:path");
function checkHandoff(handoff, workflow) {
  const supported = new Set();
  for (const hit of workflow.matchAll(/^\s*runs-on:\s*([a-z]+-latest)\s*$/gm)) supported.add(hit[1]);
  for (const hit of workflow.matchAll(/^\s*os:\s*\[([^\]]+)\]\s*$/gm)) {
    for (const os of hit[1].split(",")) if (/^[a-z]+-latest$/.test(os.trim())) supported.add(os.trim());
  }
  if (!supported.size) return { ok: false, reason: "CI runner inventory cannot be determined" };
  const found = handoff.match(/^\s*-\s*\*\*CI platforms\*\*:\s*([^\n]+)$/m);
  if (!found) return { ok: false, reason: "HANDOFF CI platforms field missing" };
  const declared = found[1].trim().split(",").map(x => x.trim()).sort();
  const actual = [...supported].sort();
  if (JSON.stringify(declared) !== JSON.stringify(actual))
    return { ok: false, reason: "HANDOFF/CI platform mismatch", actual, declared };
  if (/ubuntu 단일|macOS 미검증|Windows 회귀를 못 잡는다|ubuntu.only/i.test(handoff))
    return { ok: false, reason: "stale single-platform claim remains in HANDOFF" };
  return { ok: true, platforms: actual };
}
function main() {
  const root = path.resolve(process.env.PHASE_GATE_ROOT || ".");
  try {
    const r=checkHandoff(fs.readFileSync(path.join(root,"docs/HANDOFF.md"),"utf8"),
      fs.readFileSync(path.join(root,".github/workflows/ci.yml"),"utf8"));
    console.log(JSON.stringify(r));
    process.exit(r.ok ? 0 : 2);
  } catch (e) { console.error("HANDOFF lint error: " + e.message); process.exit(2); }
}
if(require.main===module) main();
module.exports={checkHandoff};
