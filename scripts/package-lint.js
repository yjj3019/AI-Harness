"use strict";
const fs = require("node:fs");
const path = require("node:path");

// Repository conventions only: single-line name/description and simple inline links,
// not a general YAML/Markdown parser or a host permission check.
function checkPackage(root) {
  // Native realpath expands Windows 8.3 short names (for example RUNNER~1); mixing a short spelling with a
  // long one would compute a spurious ".." and reject a legitimate file.
  root = fs.realpathSync.native(root);
  const errors = [];
  let checked = 0;
  function localFile(file) {
    const relative = path.relative(root, fs.realpathSync.native(file));
    if (relative === ".." || relative.startsWith(".." + path.sep) || path.isAbsolute(relative))
      throw new Error("file resolves outside repository");
    if (!fs.statSync(file).isFile()) throw new Error("not a regular file");
    return fs.readFileSync(file, "utf8");
  }
  function inspect(relative, kind) {
    checked++;
    try {
      const file = path.join(root, relative);
      const text = localFile(file).replace(/\r\n/g, "\n");
      const frontmatter = /^---\n([\s\S]*?)\n---(?:\n|$)([\s\S]*)$/.exec(text);
      if (!frontmatter) throw new Error("missing or unclosed frontmatter");
      if (!frontmatter[2].trim()) throw new Error("empty body");
      for (const key of kind === "command" ? ["description"] : ["name", "description"]) {
        const values = [...frontmatter[1].matchAll(new RegExp("^" + key + ":[ \\t]*(.*)$", "gm"))];
        if (values.length !== 1) throw new Error("expected exactly one " + key);
        let value = values[0][1].trim();
        if (/^["']/.test(value)) {
          const quote = value[0];
          if (value.length < 2 || !value.endsWith(quote)) throw new Error("invalid quoted " + key);
          value = value.slice(1, -1).trim();
        } else if (/^[#>|\[\]{}&*!]/.test(value) || /^(null|true|false|~)$/i.test(value)) {
          throw new Error(key + " must be a single-line text scalar");
        }
        if (!value) throw new Error("empty " + key);
        const expected = kind === "skill" ? path.basename(path.dirname(file)) : path.basename(file, ".md");
        if (key === "name" && value !== expected) throw new Error("name must match " + expected);
      }
      // Ignore examples in fenced code; do not fetch URLs or validate fragment IDs.
      const prose = frontmatter[2].replace(/^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1[^\n]*(?:\n|$)/gm, "");
      for (const link of prose.matchAll(/\[[^\]\n]*\]\(([^\s()]+)\)/g)) {
        const target = link[1];
        if (/^[A-Za-z]:[\\/]/.test(target)) throw new Error("link must be repository-relative: " + target);
        if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(target)) continue;
        const destination = decodeURIComponent(target.split(/[?#]/)[0]);
        if (!destination) continue;
        if (path.isAbsolute(destination) || path.win32.isAbsolute(destination))
          throw new Error("link must be repository-relative: " + target);
        localFile(path.resolve(path.dirname(file), destination));
      }
    } catch (error) { errors.push(relative + ": " + error.message); }
  }
  for (const [directory, kind] of [[".claude/agents", "agent"], [".claude/commands", "command"], ["skills", "skill"]]) {
    try {
      const entries = fs.readdirSync(path.join(root, directory), { withFileTypes: true });
      const files = kind === "skill"
        ? entries.filter(entry => entry.isDirectory() || entry.isSymbolicLink()).map(entry => directory + "/" + entry.name + "/SKILL.md")
        : entries.filter(entry => entry.name.endsWith(".md")).map(entry => directory + "/" + entry.name);
      if (!files.length) errors.push(directory + ": no definitions found");
      for (const file of files.sort()) inspect(file, kind);
    } catch (error) { errors.push(directory + ": " + error.message); }
  }
  for (const relative of ["coding", "test", "verify", "review", "compound"].map(name => ".claude/agents/" + name + ".md").concat(".claude/commands/phase-harness.md")) {
    try { localFile(path.join(root, relative)); }
    catch (error) { errors.push(relative + ": required workflow definition missing or invalid: " + error.message); }
  }
  return { ok: errors.length === 0, checked, errors };
}
if (require.main === module) {
  try {
    const result = checkPackage(path.resolve(__dirname, ".."));
    console.log(JSON.stringify(result));
    process.exitCode = result.ok ? 0 : 2;
  } catch (error) { console.error("Package lint error: " + error.message); process.exitCode = 2; }
}
module.exports = { checkPackage };
