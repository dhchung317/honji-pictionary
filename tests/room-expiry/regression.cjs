const { readFileSync } = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const assert = require("node:assert/strict");
const { test } = require("node:test");
const crypto = require("node:crypto");
const root = path.resolve(__dirname, "../..");
function load(file, mocks = {}) {
  const source = readFileSync(path.join(root, file), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  const sandbox = { module, exports: module.exports, require: id => id in mocks ? mocks[id] : require(id), crypto: crypto.webcrypto, Date, console: { ...console, error() {} }, setTimeout, clearTimeout, URL };
  vm.runInNewContext(code, sandbox, { filename: file });
  return module.exports;
}
function response() { return { code: 200, headersSent: false, status(n) { this.code=n; return this; }, json(body) { this.body=body; this.headersSent=true; return this; }, setHeader() {} }; }
test("an expired room cannot be resurrected by a delayed update", async()=>{
 const {saveRoom}=load("api/_roomStore.ts",{"./redis.js":{redis:{eval:async()=>0},TTL_SECONDS:3600}});
 await assert.rejects(saveRoom({id:"ABCD"}),/expired/);
});
