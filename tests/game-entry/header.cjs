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

test("room-ending controls live in results rather than the shared header",()=>{
 for (const route of ["/room/ABCD/results", "/room/ABCD/playerresults", "/host/ABCD"]) {
  const html=renderToStaticMarkup(React.createElement(StaticRouter,{location:route},React.createElement(GameHeader)));
  assert.equal(html.includes(">Quit</button>"), false);
  assert.match(html,/honji-wordmark.svg/);
 }
});

test("score medals follow rank rather than score thresholds, with ribbons only for the podium",()=>{
 const {GameScore}=component("src/components/GameScore/GameScore.tsx");
 for (const [rank, expected] of [[1,"gold"],[2,"silver"],[3,"bronze"],[4,"burst"],[10,"burst"]]) {
  const html=renderToStaticMarkup(React.createElement(GameScore,{score:100,rank}));
  assert.match(html,new RegExp(`game-score--${expected}`));
  assert.equal(html.includes('class="game-score__ribbon"'),rank<=3);
  assert.match(html,new RegExp(`rank ${rank}, score 100`));
  assert.match(html,/score-font\/1.png/);
 }
 const lowWinner=renderToStaticMarkup(React.createElement(GameScore,{score:0,rank:1}));
 assert.match(lowWinner,/game-score--gold/);
 assert.match(lowWinner,/score-font\/0.png/);
});
test("submission cards pass awarded rank into their score badge",()=>{
 const {SubmissionCard}=component("src/components/SubmissionCard/SubmissionCard.tsx", {
  "../GameScore/GameScore":{GameScore:({score,rank})=>React.createElement("span",null,`rank:${rank},score:${score}`)}
 });
 const html=renderToStaticMarkup(React.createElement(SubmissionCard,{submission:{id:"s",playerName:"Artist",imageUrl:"/test-img/cat.png"},result:{rank:2,score:90}}));
 assert.match(html,/rank:2,score:90/);
});

test("score numeral thresholds change independently of medal rank",()=>{
 const {GameScore}=component("src/components/GameScore/GameScore.tsx");
 for (const [score,color] of [[0,"bronze"],[49,"bronze"],[50,"silver"],[74,"silver"],[75,"gold"],[100,"gold"]]) {
  for (const [rank,medal] of [[1,"gold"],[2,"silver"],[3,"bronze"],[4,"burst"]]) {
   const html=renderToStaticMarkup(React.createElement(GameScore,{score,rank}));
   assert.match(html,new RegExp(`game-score--${medal}`));
   assert.match(html,new RegExp(`game-score__number--${color}`));
  }
 }
});

test("result image and frame explicitly preserve the natural image ratio",()=>{
 const {SubmissionCard}=component("src/components/SubmissionCard/SubmissionCard.tsx", {
  "../GameScore/GameScore":{GameScore:()=>null}
 });
 const html=renderToStaticMarkup(React.createElement(SubmissionCard,{submission:{id:"s",playerName:"Artist",imageUrl:"/drawing.png"},result:{rank:1,score:89},variant:"host"}));
 assert.match(html,/class="imageFrame" style="aspect-ratio:1"/);
 assert.match(html,/class="submissionImage" style="width:100%;height:auto;aspect-ratio:1"/);
});
