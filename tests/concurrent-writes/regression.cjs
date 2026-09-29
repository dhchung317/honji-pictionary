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
test("a second concurrent start is rejected before prompt generation", async () => {
 let locked=false, calls=0, finish;
 const pending = new Promise(resolve=>finish=resolve);
 const handler=load("api/start-round.ts",{
  "./_session.js":{authorize:async()=>true},
  "./_limits.js":{allowRequest:async()=>true},
  "./_mutationLock.js":{acquireRoomMutation:async()=>{if(locked)return null;locked=true;return async()=>{locked=false;};}},
  "./_roomStore.js":{getRoomById:async()=>({id:"ABCD",status:"LOBBY",drawingDurationMs:180000,promptHistory:[]}),saveRoom:async()=>{}},
  "./_playerStore.js":{listPlayers:async()=>[{id:"player"}]},
  "./_roundStore.js":{saveRound:async()=>{}},
  "./_aiGeneratePrompt.js":{genPrompt:async()=>{calls++;await pending;return {prompt:"cat"};}}
 }).default;
 const req={method:"POST",body:{roomId:"ABCD"}};const first=response();const second=response();
 const running=handler(req,first);await new Promise(resolve=>setImmediate(resolve));
 await handler(req,second);assert.equal(second.code,409);assert.equal(calls,1);
 finish();await running;assert.equal(first.code,200);assert.equal(locked,false);
});
