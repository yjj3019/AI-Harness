"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { checkPackage } = require("../scripts/package-lint.js");
const source = path.resolve(__dirname, "..");
const skill = "skills/example/SKILL.md";

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "package-lint-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const write = (file, text) => {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), text);
  };
  for (const name of ["coding", "test", "verify", "review", "compound"])
    write(".claude/agents/" + name + ".md", "---\nname: " + name + "\ndescription: Test agent\ntools:\n- Read\n---\nBody\n");
  write(".claude/commands/phase-harness.md", "---\ndescription: Run a phase\n---\nBody\n");
  write(skill, "---\nname: example\ndescription: Example skill\n---\n[Guide](../../docs/guide.md#section)\n");
  write("docs/guide.md", "# Guide\n");
  return { root, write };
}

test("repository package definitions pass without executing hooks", () => {
  const result = checkPackage(source);
  assert.equal(result.ok, true, result.errors.join("\n"));
  assert.ok(result.checked >= 8);
});

test("command needs no name; CRLF, quoted scalars and unrelated metadata are accepted", t => {
  const { root, write } = fixture(t);
  write(skill, "---\r\nname: 'example'\r\ndescription: \"Example skill\"\r\nlicense: MIT\r\n---\r\nBody\r\n");
  assert.deepEqual(checkPackage(root), { ok: true, checked: 7, errors: [] });
});

for (const [label, text] of [
  ["no delimiter", "name: example\ndescription: Example\nBody\n"],
  ["no closing delimiter", "---\nname: example\ndescription: Example\nBody\n"],
  ["empty body", "---\nname: example\ndescription: Example\n---\n  \n"],
  ["wrong name", "---\nname: other\ndescription: Example\n---\nBody\n"],
  ["duplicate description", "---\nname: example\ndescription: One\ndescription: Two\n---\nBody\n"],
  ...["", "''", '""', "'  '", "# comment", ">", "|", "[]", "null"].map(value =>
    ["invalid description " + JSON.stringify(value), "---\nname: example\ndescription: " + value + "\n---\nBody\n"]),
]) {
  test("rejects " + label, t => {
    const { root, write } = fixture(t);
    write(skill, text);
    const result = checkPackage(root);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some(error => error.startsWith(skill + ":")), result.errors.join("\n"));
  });
}

for (const directory of [".claude/agents", ".claude/commands", "skills"]) {
  test("empty inventory fails: " + directory, t => {
    const { root } = fixture(t);
    fs.rmSync(path.join(root, directory), { recursive: true });
    fs.mkdirSync(path.join(root, directory));
    assert.ok(checkPackage(root).errors.some(error => error === directory + ": no definitions found"));
  });
}

test("removing one required role or a SKILL.md fails", t => {
  const { root } = fixture(t);
  fs.unlinkSync(path.join(root, ".claude/agents/review.md"));
  fs.unlinkSync(path.join(root, skill));
  const result = checkPackage(root);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some(error => error.includes("required workflow definition")));
  assert.ok(result.errors.some(error => error.startsWith(skill + ":")));
});

test("local links require repository files; URL, fragment and fenced examples are ignored", t => {
  const { root, write } = fixture(t);
  const header = "---\nname: example\ndescription: Example\n---\n";
  write(skill, header + "[URL](https://example.invalid/missing) [fragment](#missing)\n~~~md\n[example](absent.md)\n~~~\n");
  assert.equal(checkPackage(root).ok, true);
  write(skill, header + "[missing](../../docs/missing.md)\n");
  assert.equal(checkPackage(root).ok, false);
  write(skill, header + "[directory](../../docs)\n");
  assert.ok(checkPackage(root).errors.some(error => error.includes("not a regular file")));
  write(skill, header + "[absolute](/etc/passwd)\n");
  assert.ok(checkPackage(root).errors.some(error => error.includes("repository-relative")));
  write(skill, header + "[absolute](C:/private/guide.md)\n");
  assert.ok(checkPackage(root).errors.some(error => error.includes("repository-relative")));
});

test("existing paths outside root, including a sibling with the same prefix, fail", t => {
  const { root, write } = fixture(t);
  const outside = root + "-outside.md";
  fs.writeFileSync(outside, "Outside\n");
  t.after(() => fs.rmSync(outside, { force: true }));
  write(skill, "---\nname: example\ndescription: Example\n---\n[escape](../../../" + path.basename(outside) + ")\n");
  assert.ok(checkPackage(root).errors.some(error => error.includes("outside repository")));
});

test("symlink escape fails before reading the target", t => {
  const { root, write } = fixture(t);
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "package-outside-"));
  t.after(() => fs.rmSync(outside, { recursive: true, force: true }));
  fs.writeFileSync(path.join(outside, "guide.md"), "Outside\n");
  // Directory junctions do not require Windows Developer Mode or administrator rights.
  fs.symlinkSync(outside, path.join(root, "linked"), process.platform === "win32" ? "junction" : "dir");
  write(skill, "---\nname: example\ndescription: Example\n---\n[escape](../../linked/guide.md)\n");
  assert.ok(checkPackage(root).errors.some(error => error.includes("outside repository")));
});

test("CLI returns 2 for invalid definitions, not a vacuous success", t => {
  const { root } = fixture(t);
  fs.mkdirSync(path.join(root, "scripts"));
  fs.copyFileSync(path.join(source, "scripts/package-lint.js"), path.join(root, "scripts/package-lint.js"));
  const run = () => spawnSync(process.execPath, [path.join(root, "scripts/package-lint.js")], { encoding: "utf8" });
  assert.equal(run().status, 0);
  fs.unlinkSync(path.join(root, skill));
  const result = run();
  assert.ifError(result.error);
  assert.equal(result.status, 2);
  assert.equal(JSON.parse(result.stdout).ok, false);
});
