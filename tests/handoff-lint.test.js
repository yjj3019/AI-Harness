"use strict";
const {test}=require("node:test");
const assert=require("node:assert/strict");
const {checkHandoff}=require("../scripts/handoff-lint.js");
const ci="jobs:\n  checks:\n    runs-on: ubuntu-latest\n  portability:\n    matrix:\n      os: [windows-latest, macos-latest]\n    runs-on: ignored\n";
test("current platform list matches multi-OS matrix",()=>{
  assert.deepEqual(checkHandoff("- **CI platforms**: ubuntu-latest, windows-latest, macos-latest",ci).ok,true);
});
test("stale Ubuntu-only handoff is rejected",()=>{
  const h="- **CI platforms**: ubuntu-latest\n- **Open Issues**: CI가 ubuntu 단일";
  assert.equal(checkHandoff(h,ci).ok,false);
});
test("platform drift in runner matrix is detected",()=>{
  const h="- **CI platforms**: ubuntu-latest, windows-latest, macos-latest";
  assert.equal(checkHandoff(h,ci.replace("macos-latest","")).ok,false);
});
test("missing verifiable runner inventory fails",()=>{
  assert.equal(checkHandoff("- **CI platforms**: ubuntu-latest","invalid config").ok,false);
});
