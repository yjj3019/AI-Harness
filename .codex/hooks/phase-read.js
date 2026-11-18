// Local MCP reader and PostToolUse recorder for Codex verify agents.
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const readline = require("node:readline");
const { ID_RE } = require("../../scripts/phase-definition.js");

const ROOT = path.resolve(__dirname, "../..");
const EVIDENCE = path.join(ROOT, ".phase-evidence");
const TOOL = "read_phase_log";
const MAX_LOG = 65 * 1024 * 1024; // gate's 64 MiB capture plus its diagnostic footer
const hash = value => crypto.createHash("sha256").update(value).digest("hex");

function readArtifact(phase) {
  if (typeof phase !== "string" || !ID_RE.test(phase)) throw new Error("Invalid Phase ID");
  if (!fs.lstatSync(EVIDENCE).isDirectory()) throw new Error("Expected a real evidence directory");
  const name = `phase-${phase}-test.log`;
  const file = path.join(EVIDENCE, name);
  const token = path.join(EVIDENCE, `phase-${phase}-read-token`);
  const stat = fs.lstatSync(file);
  const tokenStat = fs.lstatSync(token);
  if (!stat.isFile() || stat.size > MAX_LOG || !tokenStat.isFile() || tokenStat.size > 66)
    throw new Error("Expected a bounded Phase log and epoch");
  const epoch = fs.readFileSync(token, "utf8").trim();
  if (!/^[a-f0-9]{64}$/.test(epoch)) throw new Error("Invalid Phase read epoch");
  const bytes = fs.readFileSync(file);
  if (bytes.length > MAX_LOG || fs.readFileSync(token, "utf8").trim() !== epoch)
    throw new Error("Phase epoch or log changed during read");
  return { proof: { phase, path: `.phase-evidence/${name}`, sha256: hash(bytes), epoch_sha256: hash(epoch) }, epoch, bytes };
}

function withinProject(cwd) {
  const relative = path.relative(fs.realpathSync.native(ROOT), fs.realpathSync.native(cwd));
  return relative !== ".." && !relative.startsWith(".." + path.sep) && !path.isAbsolute(relative);
}

function record(event) {
  if (event?.hook_event_name !== "PostToolUse" || event.tool_name !== `mcp__harness_evidence__${TOOL}` ||
      event.agent_type !== "verify" || typeof event.agent_id !== "string" || !event.agent_id ||
      typeof event.tool_use_id !== "string" || !event.tool_use_id || typeof event.cwd !== "string" ||
      !withinProject(event.cwd) || event.tool_response?.isError === true) return;
  const metadata = event.tool_response?.content?.[0];
  if (metadata?.type !== "text" || typeof metadata.text !== "string" || metadata.text.length > 1024) return;
  const returned = JSON.parse(metadata.text);
  const { proof, epoch } = readArtifact(event.tool_input?.phase);
  if (!Object.entries(proof).every(([key, value]) => returned?.[key] === value)) return;
  const log = path.join(EVIDENCE, ".reads.jsonl");
  if (fs.existsSync(log) && !fs.lstatSync(log).isFile()) throw new Error("Expected a regular read record file");
  const { phase, path: relative, sha256 } = proof;
  fs.appendFileSync(log, JSON.stringify({
    host: "codex", phase, path: relative, sha256, token: epoch, agent_type: "verify",
    agent_id: event.agent_id, tool_use_id: event.tool_use_id, at: new Date().toISOString(),
  }) + "\n");
}

const tool = {
  name: TOOL,
  description: "Read a gate-produced Phase test log and return its head, tail and test diagnostics",
  annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  inputSchema: { type: "object", properties: { phase: { type: "string" } }, required: ["phase"], additionalProperties: false },
};

function serve() {
  const lines = readline.createInterface({ input: process.stdin });
  lines.on("line", line => {
    let request;
    try { request = JSON.parse(line); } catch { return; }
    if (request?.id === undefined) return;
    const reply = fields => process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id: request.id, ...fields }) + "\n");
    const { method, params } = request;
    if (method === "initialize") {
      return reply({ result: { protocolVersion: params?.protocolVersion || "2024-11-05", capabilities: { tools: {} }, serverInfo: { name: "harness_evidence", version: "1" } } });
    }
    if (method === "ping") return reply({ result: {} });
    if (method === "tools/list") return reply({ result: { tools: [tool] } });
    if (method !== "tools/call" || params?.name !== TOOL)
      return reply({ error: { code: -32601, message: "Unknown method or tool" } });
    try {
      const { bytes, proof } = readArtifact(params.arguments?.phase);
      const log = bytes.toString("utf8").split(/\r?\n/);
      const diagnostics = log.filter(line => /^(?:not ok\b|hooks:)|# SKIP\b/.test(line)).slice(0, 40);
      const section = lines => lines.map(line => line.slice(0, 400)).join("\n");
      const excerpt = [
        section(log.slice(0, 45)).slice(0, 5_000),
        "--- Final lines ---", section(log.slice(-120)).slice(-11_000),
        "--- Diagnostics ---", section(diagnostics).slice(0, 7_500),
      ].join("\n");
      return reply({ result: { content: [
        { type: "text", text: JSON.stringify(proof) },
        { type: "text", text: excerpt },
      ] } });
    } catch (error) {
      return reply({ result: { isError: true, content: [{ type: "text", text: error.message }] } });
    }
  });
}

function main(mode) {
  if (mode === "record") {
    try { record(JSON.parse(fs.readFileSync(0, "utf8"))); }
    catch (error) { process.stderr.write(`Codex Phase read not recorded: ${error.message}\n`); }
  } else {
    serve();
  }
}

if (require.main === module) main(process.argv[2]);
module.exports = { main };
