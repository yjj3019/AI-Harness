"use strict";

const { TextDecoder } = require("node:util");

const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const REQUIRED_PHASES = ".github/required-phases.json";

function parsePhases(markdown) {
  const phases = new Map();
  const spellings = new Map();
  let fence = null;
  for (const line of markdown.split(/\r?\n/)) {
    const delimiter = /^ {0,3}(\x60{3,}|~{3,})(.*)$/.exec(line);
    if (fence) {
      if (delimiter && delimiter[1][0] === fence[0] && delimiter[1].length >= fence.length && !delimiter[2].trim()) fence = null;
      continue;
    }
    if (delimiter) { fence = delimiter[1]; continue; }
    const heading = /^###[ \t]+Phase[ \t]+([^\s:]+)(.*)$/i.exec(line);
    if (!heading || !ID_RE.test(heading[1])) continue;
    const id = heading[1];
    const folded = id.toLowerCase();
    if (spellings.has(folded)) {
      throw new Error(`duplicate Phase ID '${id}' conflicts with '${spellings.get(folded)}'`);
    }
    spellings.set(folded, id);
    const colon = heading[2].indexOf(":");
    phases.set(id, colon < 0 ? "" : heading[2].slice(colon + 1).trim());
  }
  return phases;
}

function parseRequiredPhases(bytes) {
  let ids;
  try {
    ids = JSON.parse(new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes));
  } catch (error) {
    throw new Error(`cannot read valid manifest JSON: ${error.message}`);
  }
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 256 ||
      !ids.every(id => typeof id === "string" && ID_RE.test(id)) ||
      new Set(ids.map(id => id.toLowerCase())).size !== ids.length) {
    throw new Error("manifest must be a nonempty array of up to 256 unique valid phase IDs");
  }
  return ids;
}

function hasStrictAttestationFlags(attestation) {
  return attestation?.require_test_summary === true && attestation.require_read_proof === true;
}

module.exports = { ID_RE, REQUIRED_PHASES, parsePhases, parseRequiredPhases, hasStrictAttestationFlags };
