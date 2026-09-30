const { readFileSync } = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const assert = require("node:assert/strict");
const { test } = require("node:test");
function entry(registerPlayer, storage) {
 const source = readFileSync(path.resolve(__dirname,"../../src/lib/gameEntry.ts"),"utf8");
 const code = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const module={exports:{}};
 vm.runInNewContext(code,{module,exports:module.exports,require:()=>({registerPlayer}),localStorage:{setItem:(k,v)=>storage.set(k,v)},Error});
 return module.exports.joinGame;
}
test("join normalizes inputs and saves server-assigned identity",async()=>{
 const storage=new Map();let received;
 const join=entry(async(roomId,name)=>{received={roomId,name};return {roomId,id:"player",name:"Pat 2"};},storage);
 await join(" Pat "," abcd ");assert.deepEqual(received,{roomId:"ABCD",name:"Pat"});
 assert.equal(storage.get("playerId:ABCD"),"player");assert.equal(storage.get("playerName:ABCD"),"Pat 2");
});
test("invalid names/codes never register and failed registration never saves identity",async()=>{
 let calls=0;const storage=new Map();
 const join=entry(async()=>{calls++;throw Error("Room is full");},storage);
 for(const [name,code]of [[" ","ABCD"],["a".repeat(16),"ABCD"],["Pat","ABC"],["Pat","AB!D"]])await assert.rejects(join(name,code));
 assert.equal(calls,0);await assert.rejects(join("Pat","ABCD"),/Room is full/);assert.equal(storage.size,0);
});
