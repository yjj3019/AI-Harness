"use strict";
// Drift guard between the instruction files and the skills directory. CLAUDE.md carries a hand-kept
// skill catalog; this test keeps it from silently diverging from skills/ (a generated replacement
// is not used because tests/report-editing.test.js expects a literal skill path in CLAUDE.md).
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

function shippedSkills() {
  const dir = path.join(root, "skills");
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && fs.existsSync(path.join(dir, e.name, "SKILL.md")))
    .map((e) => e.name)
    .sort();
}

function referencedSkills(text) {
  return [...new Set([...text.matchAll(/skills\/([A-Za-z0-9._-]+)\/SKILL\.md/g)].map((m) => m[1]))].sort();
}

test("the repository ships a nonempty skill set", () => {
  assert.ok(shippedSkills().length > 0);
});

test("CLAUDE.md lists every shipped skill", () => {
  const listed = new Set(referencedSkills(read("CLAUDE.md")));
  const missing = shippedSkills().filter((name) => !listed.has(name));
  assert.deepEqual(missing, [], `skills missing from the CLAUDE.md document map: ${missing.join(", ")}`);
});

test("CLAUDE.md and AGENTS.md reference only skills that exist", () => {
  const shipped = new Set(shippedSkills());
  for (const file of ["CLAUDE.md", "AGENTS.md"]) {
    const dangling = referencedSkills(read(file)).filter((name) => !shipped.has(name));
    assert.deepEqual(dangling, [], `${file} references skills that do not exist: ${dangling.join(", ")}`);
  }
});

test("the drift check detects a missing and a dangling reference", () => {
  const shipped = new Set(["real-skill"]);
  const text = "see skills/real-skill/SKILL.md and skills/ghost-skill/SKILL.md";
  assert.deepEqual(referencedSkills(text).filter((n) => !shipped.has(n)), ["ghost-skill"]);
  assert.deepEqual([...shipped].filter((n) => !referencedSkills("nothing here").includes(n)), ["real-skill"]);
});

test('every documented gate test command carries --require-bound-tree (agents, commands, constitutions)', () => {
  const files = ['CLAUDE.md', 'AGENTS.md', '.claude/agents/test.md', '.codex/agents/test.toml', '.claude/commands/phase-harness.md'];
  let seen = 0;
  for (const rel of files) {
    const text = fs.readFileSync(path.join(root, rel), 'utf8');
    for (const m of text.matchAll(/run <[a-z-]+> test[^\n`]*/g)) {
      seen++;
      assert.match(m[0], /--require-bound-tree/, rel + ' documents a gate test command without --require-bound-tree: ' + m[0]);
    }
  }
  assert.ok(seen >= 4, 'the check must see the documented commands (saw ' + seen + ')');
});
