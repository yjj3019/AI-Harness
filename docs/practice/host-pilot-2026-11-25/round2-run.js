// Usage: node run2.js <claude|codex> <reps> [caseId ...]   (order alternates by rep to reduce order effects)
const fs = require("fs"), path = require("path"), os = require("os");
const { spawnSync } = require("child_process");
const host = process.argv[2], reps = +process.argv[3], only = process.argv.slice(4);
const REPO = process.env.HARNESS_REPO;
const OUT = path.join(__dirname, "results"); fs.mkdirSync(OUT, { recursive: true });
const BASE = path.join(os.tmpdir(), "ai-harness-pilot2-" + host);
const cases = require("./cases.js").filter(c => !only.length || only.includes(c.id));

for (let rep = 1; rep <= reps; rep++) for (const c of cases) {
  const conds = rep % 2 ? ["baseline", "candidate"] : ["candidate", "baseline"];
  for (const cond of conds) {
    const dir = path.join(BASE, `${cond}-${c.id}-r${rep}`);
    fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
    c.setup(dir);
    const d0 = c.keep ? c.keep(dir) : {};
    if (cond === "candidate") for (const f of ["AGENTS.md", "CLAUDE.md"]) fs.copyFileSync(path.join(REPO, f), path.join(dir, f));
    const tag = `${host}.${c.id}.${cond}.r${rep}`;
    const last = path.join(OUT, tag + ".last.txt");
    const t0 = Date.now(); let r, text = "", usage = null;
    if (host === "claude") {
      r = spawnSync("claude", ["-p", c.prompt, "--output-format", "json", "--no-session-persistence", "--setting-sources", "project",
        "--disable-slash-commands", "--strict-mcp-config", "--tools", "Read,Edit,Write,Bash", "--permission-mode", "acceptEdits",
        "--allowedTools", "Read", "Edit", "Write", "Bash"], { cwd: dir, encoding: "utf8", timeout: 600000 });
      try { const o = JSON.parse(r.stdout); text = o.result || ""; usage = { in: o.usage.input_tokens + o.usage.cache_creation_input_tokens + o.usage.cache_read_input_tokens, out: o.usage.output_tokens, usd: o.total_cost_usd }; } catch { }
    } else {
      r = spawnSync("codex", ["exec", "--json", "--ephemeral", "--skip-git-repo-check", "--ignore-user-config", "-C", dir, "-s", "workspace-write",
        "-m", "gpt-6.2-astra", "-c", "model_reasoning_effort=high", "-c", 'windows.sandbox="unelevated"', "-o", last, c.prompt], { cwd: dir, encoding: "utf8", timeout: 600000 });
      try { text = fs.readFileSync(last, "utf8"); } catch { }
      try { const ev = r.stdout.split("\n").filter(Boolean).map(x => { try { return JSON.parse(x); } catch { } }).filter(Boolean); const u = ev.filter(e => e.usage).pop(); if (u) usage = { in: u.usage.input_tokens, out: u.usage.output_tokens }; } catch { }
    }
    let res; try { res = c.check(dir, text, d0); } catch (e) { res = { verdict: "INVALID", reason: "grader error " + e.message }; }
    if (!text) res = { verdict: "INVALID", reason: "no output (exit " + r.status + ")" };
    const rec = { host, case: c.id, cond, rep, ms: Date.now() - t0, exit: r.status, usage, ...res, text: text.slice(0, 1500) };
    fs.writeFileSync(path.join(OUT, tag + ".json"), JSON.stringify(rec, null, 1));
    console.log(tag, rec.verdict, rec.reason || "", rec.ms + "ms");
  }
}
