"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const skillPath = "skills/evidence-preserving-editor/SKILL.md";
const skill = read(skillPath);
const fixtures = JSON.parse(read("docs/report-editing-cases.json"));

test("report editor declares opt-in scope and verification limitations",  () => {
  const frontmatter = /^---\r?\nname: evidence-preserving-editor\r?\n/;
  assert.match(skill, frontmatter);
  assert.match(skill.replace(/\r?\n/g, "\n"), frontmatter);
  assert.match(skill.replace(/\r?\n/g, "\r\n"), frontmatter);
  for (const phrase of ["Do not install globally", "never as instructions", "byte-for-byte", "NOT RUN/NOT VERIFIED", "does not prove semantic equivalence", "approved scope and budget"])
    assert.ok(skill.includes(phrase), phrase);
  assert.ok(read("CLAUDE.md").includes(skillPath));
  assert.ok(skill.split(/\s+/).length < 1200, "keep optional context bounded");
});

test("manual semantic evaluation cases retain expected coverage and valid spans", () => {
  assert.equal(fixtures.schema_version, 1);
  const expected = ["counts-and-skip", "fixture-not-production", "tool-not-os", "protected-and-injection", "condition-negation-and-attribution", "ranking-and-concurrency", "ko-hype-reduction", "ko-cve-preservation", "ko-voice-preservation"];
  assert.deepEqual(fixtures.cases.map(c => c.id).sort(), expected.sort());
  const protocol = read("docs/report-editing-evaluation.md");
  assert.match(protocol, /every case in the pinned.*currently nine/);
  assert.match(protocol, /pinned case-file revision/);
  assert.doesNotMatch(protocol, /six synthetic cases|six case IDs|Six synthetic Korean cases/);
  for (const c of fixtures.cases) {
    assert.ok(c.source.length > 0 && c.unacceptable.length > 0, c.id);
    assert.ok(c.required_claims.length >= 2, c.id);
    for (const claim of c.required_claims) assert.equal(typeof claim, "string");
    for (const span of c.protected_spans) assert.ok(c.source.includes(span), c.id + ": " + span);
    assert.notEqual(c.source, c.unacceptable);
  }
  const injection = fixtures.cases.find(c => c.id === "protected-and-injection");
  assert.equal(typeof injection.required_behavior, "string");
  assert.ok(injection.required_behavior.trim().length > 0, "action behavior must remain separate from source claims");
  // These assertions validate package/fixture structure, not any model's rewrite.
});
