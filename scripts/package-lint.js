"use strict";
const fs = require("node:fs");
const path = require("node:path");

// Repository conventions only: single-line name/description and simple inline links,
// not a general YAML/Markdown parser or a host permission check.
function checkPackage(root, { installedSkill = false } = {}) {
  // Native realpath expands Windows 8.3 short names (for example RUNNER~1); mixing a short spelling with a
  // long one would compute a spurious ".." and reject a legitimate file.
  root = fs.realpathSync.native(root);
  const errors = [];
  const warnings = [];
  let checked = 0;
  function outside(directory, file) {
    const relative = path.relative(directory, file);
    return relative === ".." || relative.startsWith(".." + path.sep) || path.isAbsolute(relative);
  }
  function localFile(file) {
    if (outside(root, file)) throw new Error(installedSkill ? "path outside installed skill" : "path outside repository");
    const real = fs.realpathSync.native(file);
    if (outside(root, real)) throw new Error(installedSkill ? "file resolves outside installed skill" : "file resolves outside repository");
    if (!fs.statSync(real).isFile()) throw new Error("not a regular file");
    return real;
  }
  function inspectReferences(file, body, skillDir, visited) {
    let fence = "";
    const prose = body.split("\n").filter(line => {
      const marker = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
      if (!marker) return !fence;
      if (!fence) fence = marker[1];
      else if (marker[1].startsWith(fence) && !marker[2].trim()) fence = "";
      return false;
    }).join("\n");
    function checkTarget(destination, target, type) {
      const absolute = path.resolve(destination);
      let real;
      try {
        real = localFile(absolute);
      } catch (error) {
        const sourceFile = path.relative(root, file).split(path.sep).join("/");
        if (error.code === "ENOENT") throw new Error("missing referenced file: " + target + " (from " + sourceFile + ")");
        throw new Error(sourceFile + " -> " + target + ": " + error.message);
      }
      if (skillDir && outside(skillDir, real))
        warnings.push(path.relative(root, file).split(path.sep).join("/") + ": " + type + " outside skill package (absent from a distributed copy): " + target);
      if (installedSkill && path.extname(real).toLowerCase() === ".md" && !visited.has(real)) {
        visited.add(real);
        inspectReferences(real, fs.readFileSync(real, "utf8").replace(/\r\n/g, "\n"), skillDir, visited);
      }
    }
    for (const link of prose.matchAll(/\[[^\]\n]*\]\(([^\s()]+)\)/g)) {
      const target = link[1];
      if (/^[A-Za-z]:/.test(target)) throw new Error("link must be repository-relative: " + target);
      if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(target)) continue;
      const destination = decodeURIComponent(target.split(/[?#]/)[0]);
      if (!destination) continue;
      if (path.isAbsolute(destination) || path.win32.isAbsolute(destination))
        throw new Error("link must be repository-relative: " + target);
      checkTarget(path.resolve(path.dirname(file), destination), target, "link");
    }
    for (const code of prose.matchAll(/`([^`\n]+)`/g)) {
      const target = code[1].trim();
      // Directory mentions, glob patterns and placeholders are not literal filenames.
      if (target.endsWith("/") || /[<>*?]/.test(target)) continue;
      if (target.startsWith("references/") || /^channel-[^/]+\.md$/.test(target))
        checkTarget(path.resolve(skillDir || path.dirname(file), target), target, "reference");
      else if (/^scripts\/.+\.(?:js|sh|py)$/.test(target)) {
        const base = skillDir && fs.existsSync(path.join(skillDir, target)) ? skillDir : root;
        checkTarget(path.resolve(base, target), target, "reference");
      }
    }
  }
  function inspect(relative, kind) {
    checked++;
    try {
      const file = path.join(root, relative);
      const definition = localFile(file);
      const text = fs.readFileSync(definition, "utf8").replace(/\r\n/g, "\n");
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
      inspectReferences(definition, frontmatter[2], kind === "skill" ? path.dirname(definition) : null, new Set([definition]));
    } catch (error) { errors.push(relative + ": " + error.message); }
  }
  if (installedSkill) {
    inspect("SKILL.md", "skill");
    return { ok: errors.length === 0, checked, errors, warnings };
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
  return { ok: errors.length === 0, checked, errors, warnings };
}
if (require.main === module) {
  try {
    const args = process.argv.slice(2);
    if (args.length && (args.length !== 2 || args[0] !== "--installed-skill" || !args[1]))
      throw new Error("usage: node scripts/package-lint.js [--installed-skill <copied skill directory>]");
    const result = args.length ? checkPackage(args[1], { installedSkill: true }) : checkPackage(path.resolve(__dirname, ".."));
    console.log(JSON.stringify(result));
    process.exitCode = result.ok ? 0 : 2;
  } catch (error) { console.error("Package lint error: " + error.message); process.exitCode = 2; }
}
module.exports = { checkPackage };
