"use strict";
// Standalone shape validation only; it neither authorizes nor executes a task.
const fs = require("node:fs");
const { TextDecoder } = require("node:util");
const MAX_BYTES = 256 * 1024;
const MAX_ITEMS = 50;
const MAX_TEXT = 2000;

function exactKeys(value, keys) {
  return value !== null && typeof value === "object" && !Array.isArray(value) &&
    Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
}
function text(value) {
  return typeof value === "string" && value.trim().length > 0 && value.length <= MAX_TEXT;
}
function list(value) {
  return Array.isArray(value) && value.length >= 1 && value.length <= MAX_ITEMS && Array.from(value).every(text);
}
function validateTaskContract(value) {
  const keys = ["schema", "goal", "scope", "non_goals", "deliverables", "success_criteria", "restrictions", "risk", "execution_limits"];
  if (!exactKeys(value, keys)) return { ok: false, error: "root must contain exactly the required fields" };
  if (value.schema !== 1) return { ok: false, error: "schema must be 1" };
  for (const key of ["goal", "risk"]) {
    if (!text(value[key])) return { ok: false, error: `${key} must be nonempty text of at most ${MAX_TEXT} characters` };
  }
  for (const key of ["scope", "non_goals", "deliverables", "success_criteria", "restrictions"]) {
    if (!list(value[key])) return { ok: false, error: `${key} must be an array of 1-${MAX_ITEMS} nonempty text items, each at most ${MAX_TEXT} characters` };
  }
  const limits = value.execution_limits;
  if (!exactKeys(limits, ["max_steps", "max_duration_seconds"]))
    return { ok: false, error: "execution_limits must contain exactly max_steps and max_duration_seconds" };
  if (!Number.isSafeInteger(limits.max_steps) || limits.max_steps < 1 || limits.max_steps > 1000 ||
      !Number.isSafeInteger(limits.max_duration_seconds) || limits.max_duration_seconds < 1 || limits.max_duration_seconds > 86400)
    return { ok: false, error: "execution_limits values must be integers: max_steps 1-1000, max_duration_seconds 1-86400" };
  return { ok: true };
}
function readBounded(file) {
  if (!fs.statSync(file).isFile()) throw new Error("input must be a regular file");
  const fd = fs.openSync(file, fs.constants.O_RDONLY | (fs.constants.O_NONBLOCK || 0));
  try {
    const stat = fs.fstatSync(fd);
    if (!stat.isFile()) throw new Error("input must be a regular file");
    if (stat.size > MAX_BYTES) throw new Error("input exceeds 262144 bytes");
    const chunks = [];
    let total = 0;
    while (total <= MAX_BYTES) {
      const chunk = Buffer.allocUnsafe(Math.min(65536, MAX_BYTES + 1 - total));
      const n = fs.readSync(fd, chunk, 0, chunk.length, null);
      if (!n) break;
      chunks.push(chunk.subarray(0, n));
      total += n;
    }
    if (total > MAX_BYTES) throw new Error("input exceeds 262144 bytes");
    return Buffer.concat(chunks, total);
  } finally { fs.closeSync(fd); }
}
function validateFile(file) {
  let bytes;
  try { bytes = readBounded(file); }
  catch (error) { return { ok: false, error: `cannot read input: ${error.message}` }; }
  try {
    // Reject a BOM rather than silently dropping it.
    if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf)
      throw new Error("UTF-8 BOM is not allowed");
    const decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return validateTaskContract(JSON.parse(decoded));
  } catch { return { ok: false, error: "input must be valid UTF-8 JSON without a BOM" }; }
}
function main(args) {
  if (args.length !== 2 || args[0] !== "validate") {
    console.error("Usage: node scripts/task-contract.js validate <contract.json>");
    return 1;
  }
  const result = validateFile(args[1]);
  console.log(JSON.stringify(result));
  return result.ok ? 0 : 2;
}
if (require.main === module) process.exitCode = main(process.argv.slice(2));
module.exports = { validateTaskContract, validateFile, MAX_BYTES };
