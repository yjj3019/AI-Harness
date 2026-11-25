// Usage: node run3.js <claude|codex> <reps> [caseId ...]
const fs = require("fs"), path = require("path"), os = require("os");
const { spawnSync } = require("child_process");
const host = process.argv[2], reps = +process.argv[3], only = process.argv.slice(4);
const REPO = process.env.HARNESS_REPO;
const OUT = path.join(__dirname, "results"); fs.mkdirSync(OUT, { recursive: true });
const BASE = path.join(os.tmpdir(), "ai-harness-pilot3-" + host);
const cases = require("./round3-cases.js").filter(c => c.hosts.includes(host) && (!only.length || only.includes(c.id)));
const condsFor = c => c.kind === "hook" ? ["baseline", "instr", "full"] : ["baseline", "candidate"];

for (let rep = 1; rep <= reps; rep++) for (const c of cases) {
  let conds = condsFor(c); if (rep % 2 === 0) conds = conds.slice().reverse();
  for (const cond of conds) {
    const root = path.join(BASE, `${cond}-${c.id}-r${rep}`);
    fs.rmSync(root, { recursive: true, force: true }); fs.mkdirSync(root, { recursive: true });
    c.setup(root);
    const run = c.cwd ? path.join(root, c.cwd) : root;
    fs.mkdirSync(run, { recursive: true });
    const instr = cond === "candidate" || cond === "instr" || cond === "full";
    if (instr) for (const f of ["AGENTS.md", "CLAUDE.md"]) fs.copyFileSync(path.join(REPO, f), path.join(run, f));
    if (cond === "full") { // project hooks and settings exactly as shipped
      fs.mkdirSync(path.join(run, ".claude/hooks"), { recursive: true });
      fs.copyFileSync(path.join(REPO, ".claude/settings.json"), path.join(run, ".claude/settings.json"));
      for (const h of fs.readdirSync(path.join(REPO, ".claude/hooks"))) fs.copyFileSync(path.join(REPO, ".claude/hooks", h), path.join(run, ".claude/hooks", h));
    }
    const tag = `${host}.${c.id}.${cond}.r${rep}`, last = path.join(OUT, tag + ".last.txt");
    const t0 = Date.now(); let r, text = "", usage = null;
    if (host === "claude") {
      const tools = c.kind === "holdout" && c.id !== "H01-code" && c.id !== "H03-boundary" ? "" : "Read,Edit,Write,Bash";
      const args = ["-p", c.prompt, "--output-format", "json", "--no-session-persistence", "--setting-sources", "project",
        "--disable-slash-commands", "--strict-mcp-config", "--tools", tools, "--permission-mode", "acceptEdits"];
      if (tools) args.push("--allowedTools", "Read", "Edit", "Write", "Bash");
      r = spawnSync("claude", args, { cwd: run, encoding: "utf8", timeout: 600000 });
      try { const o = JSON.parse(r.stdout); text = o.result || ""; usage = { in: o.usage.input_tokens + o.usage.cache_creation_input_tokens + o.usage.cache_read_input_tokens, out: o.usage.output_tokens, usd: o.total_cost_usd }; } catch { }
    } else {
      const sb = c.kind === "boundary" || c.id === "H01-code" ? "workspace-write" : "read-only";
      r = spawnSync("codex", ["exec", "--json", "--ephemeral", "--skip-git-repo-check", "--ignore-user-config", "-C", run, "-s", sb,
        "-m", "gpt-6.2-astra", "-c", "model_reasoning_effort=high", "-c", 'windows.sandbox="unelevated"', "-o", last, c.prompt], { cwd: run, encoding: "utf8", timeout: 600000 });
      try { text = fs.readFileSync(last, "utf8"); } catch { }
      try { const ev = r.stdout.split("\n").filter(Boolean).map(x => { try { return JSON.parse(x); } catch { } }).filter(Boolean); const u = ev.filter(e => e.usage).pop(); if (u) usage = { in: u.usage.input_tokens, out: u.usage.output_tokens }; } catch { }
    }
    let res; try { res = c.check(root, text, {}); } catch (e) { res = { verdict: "INVALID", reason: "grader error " + e.message }; }
    if (!text && res.verdict !== "FAIL") res = { verdict: "INVALID", reason: "no output (exit " + r.status + ")" };
    const rec = { host, case: c.id, kind: c.kind, cond, rep, ms: Date.now() - t0, exit: r.status, usage, ...res, text: text.slice(0, 1500) };
    fs.writeFileSync(path.join(OUT, tag + ".json"), JSON.stringify(rec, null, 1));
    console.log(tag, rec.verdict, rec.reason || rec.note || "", rec.ms + "ms");
  }
}
