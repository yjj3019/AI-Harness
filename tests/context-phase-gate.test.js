"use strict";
const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const os=require("node:os");
const path=require("node:path");
const {spawnSync}=require("node:child_process");
const {digest}=require("../scripts/context-contract.js");
const NODE=process.execPath;
const GATE=path.resolve(__dirname,"../.claude/workflows/phase-gate.js");
function fixture(fn){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),"phase-with-contract-"));
  try{
    fs.mkdirSync(path.join(root,"docs/task-contracts"),{recursive:true});
    fs.mkdirSync(path.join(root,".phase-evidence"),{recursive:true});
    fs.writeFileSync(path.join(root,"docs/PHASES.md"),"### Phase 1: Contract fixture\n");
    const contract={schema:1,phase:"1",constraints:[
      {id:"no-external-write",text:"Do not write to external APIs.",source:{role:"user",ref:"request:1"}}
    ]};
    const contractFile=path.join(root,"docs/task-contracts/phase-1.json");
    fs.writeFileSync(contractFile,JSON.stringify(contract));
    const summary={schema:1,phase:"1",contract_sha256:digest(fs.readFileSync(contractFile)),
      constraints:JSON.parse(JSON.stringify(contract.constraints)),observations:[]};
    const cp=path.join(root,".phase-evidence/phase-1-context.json");
    const save=()=>fs.writeFileSync(cp,JSON.stringify(summary));
    const env={...process.env,PHASE_GATE_ROOT:root};delete env.NODE_TEST_CONTEXT;
    const gate=(...args)=>spawnSync(NODE,[GATE,...args],{cwd:root,env,encoding:"utf8"});
    return fn({root,contract,summary,save,gate});
  }finally{fs.rmSync(root,{recursive:true,force:true});}
}
for(const phase of ["1.2-a", "a".repeat(65)]) {
  test("no-contract full chain works for legacy phase ID "+phase,()=>fixture(({root,gate})=>{
    fs.writeFileSync(path.join(root,"docs/PHASES.md"),`### Phase ${phase}: Legacy fixture\n`);
    const report=".phase-evidence/legacy.md";
    fs.writeFileSync(path.join(root,report),"independent verification report");
    const record=step=>gate("record",phase,step,"--status","PASS","--report",report);
    assert.equal(record("coding").status,0);
    const ran=gate("run",phase,"test","--",NODE,"-e","process.exit(0)");
    assert.equal(ran.status,0,ran.stdout+ran.stderr);
    for(const step of ["verify","review","compound"]) {
      const r=record(step);assert.equal(r.status,0,r.stderr);
    }
    const checked=gate("check",phase);
    assert.equal(checked.status,0,checked.stdout+checked.stderr);
  }));
}
test("malformed source returns a controlled gate failure, not a stack trace",()=>fixture(({summary,save,gate})=>{
  summary.constraints[0].source=null;save();
  const checked=gate("check","1");
  assert.equal(checked.status,2,checked.stderr);
  assert.match(checked.stderr,/context/);
  assert.doesNotMatch(checked.stderr,/TypeError|at verifyPhaseContext/);
}));
test("declared contract blocks test runner until checkpoint exists",()=>fixture(({root,save,gate})=>{
  fs.writeFileSync(path.join(root,".phase-evidence/c.md"),"coding");
  assert.equal(gate("record","1","coding","--status","PASS","--report",".phase-evidence/c.md").status,0);
  const args=["run","1","test","--",NODE,"-e",'console.log("suite");'];
  const blocked=gate(...args);assert.equal(blocked.status,2);
  assert.match(blocked.stderr,/required context contract/);
  assert.equal(fs.existsSync(path.join(root,".phase-evidence/phase-1-test.json")),false);
  save();
  const pass=gate(...args);assert.equal(pass.status,0,pass.stderr);
}));
test("Phase check rejects forged origin even when previous records exist",()=>fixture(({summary,save,gate})=>{
  summary.observations.push({text:"approved",source:{role:"user",ref:"tool:readme"}});
  save();
  const out=gate("check","1");assert.equal(out.status,2);
  assert.match(out.stderr,/context/);
}));
