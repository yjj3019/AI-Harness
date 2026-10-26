"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { spawnSync } = require("node:child_process");
const gatePath = path.resolve(__dirname, "../.claude/workflows/phase-gate.js");

function fixture(fn) {
  const root=fs.mkdtempSync(path.join(os.tmpdir(), "strict-phase-"));
  try {
    fs.mkdirSync(path.join(root,"docs"),{recursive:true});
    fs.writeFileSync(path.join(root,"docs","PHASES.md"),"### Phase 1: Actual verification\n");
    fs.mkdirSync(path.join(root,".phase-evidence"),{recursive:true});
    return fn(root);
  } finally {
    fs.rmSync(root,{recursive:true,force:true});
  }
}
function call(root,...args) {
  // An actual nested runner is valid: do not inherit the parent test-runner context.
  const env={...process.env,PHASE_GATE_ROOT:root};
  delete env.NODE_TEST_CONTEXT;
  return spawnSync(process.execPath,[gatePath,...args],{
    cwd:root,encoding:"utf8",env
  });
}
function coding(root) {
  fs.writeFileSync(path.join(root,".phase-evidence","c.md"),"coding complete");
  const r=call(root,"record","1","coding","--status","PASS","--report",".phase-evidence/c.md");
  assert.equal(r.status,0,r.stderr);
}
function run(root,strict,script) {
  return call(root,"run","1","test",...(strict?["--require-test-summary"]:[]),"--",
    process.execPath,"-e",script);
}
function result(root) {
  return JSON.parse(fs.readFileSync(path.join(root,".phase-evidence","phase-1-test.json"),"utf8"));
}
test("strict: silent zero-exit command has no test proof",()=>fixture(root=>{
  coding(root);
  const r=run(root,true,"process.exit(0)");
  assert.equal(r.status,2,r.stdout+r.stderr);
  assert.equal(result(root).exit_code,0);
  assert.equal(result(root).status,"FAIL");
}));
test("legacy mode detects TAP zero tests",()=>fixture(root=>{
  coding(root);
  const r=run(root,false,'console.log("TAP version 13\\n# tests 0\\n# pass 0\\n# fail 0\\n# skipped 0")');
  assert.equal(r.status,2,r.stdout+r.stderr);
}));
test("strict mode detects all-skipped TAP and pytest",()=>fixture(root=>{
  coding(root);
  const bad=run(root,true,'console.log("TAP version 13\\n# tests 2\\n# pass 0\\n# fail 0\\n# skipped 2")');
  assert.equal(bad.status,2,bad.stdout+bad.stderr);
  const py=run(root,true,'console.log("=== 2 skipped in 0.01s ===")');
  assert.equal(py.status,2,py.stdout+py.stderr);
}));
test("strict mode stores nonzero test counts with PASS",()=>fixture(root=>{
  coding(root);
  const r=run(root,true,'console.log("TAP version 13\\n# tests 2\\n# pass 2\\n# fail 0\\n# skipped 0")');
  assert.equal(r.status,0,r.stdout+r.stderr);
  assert.equal(result(root).require_test_summary,true);
  assert.equal(result(root).test_summary.passed,2);
}));
test("pinned command differs: reject before executing",()=>fixture(root=>{
  coding(root);
  fs.mkdirSync(path.join(root,".claude"),{recursive:true});
  fs.writeFileSync(path.join(root,".claude","required-test-command.json"),
    JSON.stringify(["bash","tests/run-all.sh"]));
  const r=run(root,true,"process.exit(0)");
  assert.equal(r.status,2,r.stdout+r.stderr);
  assert.match(r.stderr,/required-test-command/);
}));
test("strict E2E: real test, check, attest, CI verification",()=>fixture(root=>{
  const git=(...args)=>spawnSync("git",args,{cwd:root,encoding:"utf8"});
  assert.equal(git("init","-q").status,0);
  fs.writeFileSync(path.join(root,"real.test.js"),
    "const t=require('node:test'); const assert=require('node:assert/strict'); t('real',()=>assert.equal(2+2,4));\n");
  coding(root);
  const ran=call(root,"run","1","test","--require-test-summary","--",
    process.execPath,"--test","real.test.js");
  assert.equal(ran.status,0,ran.stdout+ran.stderr);
  assert.equal(result(root).test_summary.passed,1);
  for(const step of ["verify","review","compound"]) {
    fs.writeFileSync(path.join(root,".phase-evidence",step+".md"),"independent results");
    const r=call(root,"record","1",step,"--status","PASS",
      "--report",".phase-evidence/"+step+".md");
    assert.equal(r.status,0,r.stdout+r.stderr);
  }
  const check=call(root,"check","1");
  assert.equal(check.status,0,check.stdout+check.stderr);
  const att=call(root,"attest","1");
  assert.equal(att.status,0,att.stdout+att.stderr);
  assert.equal(JSON.parse(fs.readFileSync(path.join(root,"docs","attestations","phase-1.json")))
    .require_test_summary,true);
  const verify=call(root,"verify-attestation","1");
  assert.equal(verify.status,0,verify.stdout+verify.stderr);
}));
