const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const assert = require('node:assert/strict');
const { test } = require('node:test');
test('host schedules the exact server deadline even when the displayed countdown has rounded to zero', async () => {
 let delay, callback, cleared = false, starts = 0;
 const effects = [];
 const now = 100000;
 class Clock extends Date { static now() { return now; } }
 const room = { id: 'ABCD', status: 'LOBBY', lobbyVersion: 2, autoStartAt: new Date(now+500).toISOString() };
 const module = { exports: {} };
 const code = ts.transpileModule(readFileSync(path.resolve(__dirname,'../../src/routes/HostRoom.tsx'),'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
 const mocks = {
  react: { useState: initial => [initial,()=>{}], useRef: initial => ({current:initial}), useEffect: effect => effects.push(effect) },
  'react-router-dom': { useParams:()=>({roomId:'ABCD'}), useNavigate:()=>()=>{} },
  '../hooks/useAsync': {useAsync:()=>({data:{room,round:null},loading:false,error:null})},
  '../hooks/useCountdown': {useCountdown:()=>({secondsLeft:0})},
  '../hooks/useAsyncAction': {useAsyncAction:()=>({run:()=>{},loading:false,error:null})},
  '../lib/roomsApi': {startRound:async (id, options)=>{assert.equal(id,'ABCD');assert.equal(options.lobbyVersion,2);starts++;}},
  '../lib/playersApi': {}, '../lib/viewer': {}, '../components/GameError': {},
  '../components/GameLoading/GameLoading': {}, '../components/PlayerAvatar/PlayerAvatar': {}
 };
 vm.runInNewContext(code,{module,exports:module.exports,require:id=>id.endsWith('.css')?{default:{}}:id in mocks?mocks[id]:require(id),Date:Clock,window:{location:{hostname:'localhost'}},setTimeout:(fn,ms)=>{callback=fn;delay=ms;return 1;},clearTimeout:()=>{cleared=true;}});
 module.exports.default();
 const cleanup=effects[0]();
 assert.equal(delay,500); assert.equal(starts,0);
 callback(); await Promise.resolve(); assert.equal(starts,1);
 callback(); await Promise.resolve(); assert.equal(starts,1);
 cleanup(); assert.equal(cleared,true);
});
