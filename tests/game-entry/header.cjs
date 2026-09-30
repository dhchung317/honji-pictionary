const { readFileSync } = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const assert = require("node:assert/strict");
const { test } = require("node:test");
const React = require("react");
const { StaticRouter } = require("react-router-dom");
const { renderToStaticMarkup } = require("react-dom/server");
function component(file, mocks={}) {
 const source=readFileSync(path.resolve(__dirname,"../../",file),"utf8");
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
 const module={exports:{}};
 vm.runInNewContext(code,{module,exports:module.exports,require:id=>id.endsWith(".css")?{default:new Proxy({},{get:(_target,key)=>key})}:id in mocks?mocks[id]:require(id)});
 return module.exports;
}
const {GameHeader}=component("src/components/GameHeader/GameHeader.tsx", {"../../hooks/useAsyncAction":{useAsyncAction:()=>({run:()=>{},loading:false,error:null})},"../../lib/roomsApi":{quit:async()=>{}}});
test("header follows host, player lobby, drawing and results room routes",()=>{
 for(const route of ["/host/ABCD","/room/ABCD/lobby","/room/ABCD","/room/ABCD/playerresults","/room/ABCD/results"]){
  const html=renderToStaticMarkup(React.createElement(StaticRouter,{location:route},React.createElement(GameHeader)));
  assert.match(html,/Room ABCD/);assert.match(html,/Honji home/);assert.match(html,/href="\/"/);
 }
 const home=renderToStaticMarkup(React.createElement(StaticRouter,{location:"/"},React.createElement(GameHeader)));
 assert.equal(home,"");
});
test("home exposes hosting without a name and joining with required name/code",()=>{
 const Home=component("src/routes/Home.tsx",{"../hooks/useGameEntry":{useGameEntry:()=>({busy:null,error:null,hostGame:()=>{},joinRoom:()=>{}})}}).default;
 const html=renderToStaticMarkup(React.createElement(Home));
 const host=html.indexOf("Host a new game");const form=html.indexOf("<form");assert.ok(host>=0&&host<form);
 assert.match(html,/id="player-name"[^>]*maxLength="15"[^>]*required/);
 assert.match(html,/id="room-code"[^>]*maxLength="4"[^>]*required/);
 assert.ok(!html.includes('href="/join"'));
});

test("quit appears only in the host results header",()=>{
 for (const route of ["/room/ABCD/results", "/room/ABCD/playerresults", "/host/ABCD"]) {
  const html=renderToStaticMarkup(React.createElement(StaticRouter,{location:route},React.createElement(GameHeader)));
  assert.equal(html.includes(">Quit</button>"), route.endsWith("/results"));
  assert.match(html,/honji-wordmark.svg/);
 }
});
