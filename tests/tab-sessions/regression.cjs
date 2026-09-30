const {readFileSync}=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ts=require('typescript');
const assert=require('node:assert/strict');
const {test}=require('node:test');
function tab(initial=new Map()) {
 const storage=initial;
 const sessionStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
 const cache=new Map();const requests=[];
 function load(file) {
  if(cache.has(file))return cache.get(file);
  const module={exports:{}};
  const code=ts.transpileModule(readFileSync(path.resolve(__dirname,'../..',file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(code,{module,exports:module.exports,sessionStorage,
   localStorage:{getItem:()=> 'shared-legacy-identity'},Error,crypto:require('node:crypto').webcrypto,
   require:id=>load(path.posix.join(path.posix.dirname(file),id)+'.ts'),
   fetch:async(url,options)=>{
    const body=JSON.parse(options.body);requests.push({url,body,headers:options.headers});
    const player={id:'player-'+body.name,name:body.name,roomId:body.roomId,sessionToken:'token-'+body.name};
    return {ok:true,json:async()=>url==='/api/join-room'?player:body};
   }
  });cache.set(file,module.exports);return module.exports;
 }
 return {load,storage,requests};
}
test('two tabs join and submit as separate players in the same room',async()=>{
 const a=tab();const b=tab();
 await a.load('src/lib/gameEntry.ts').joinGame('Danny','ABCD');
 await b.load('src/lib/gameEntry.ts').joinGame('Pat','ABCD');
 for(const [current,name]of [[a,'Danny'],[b,'Pat']]) {
  assert.equal(current.storage.get('playerId:ABCD'),'player-'+name);
  assert.equal(current.storage.get('playerName:ABCD'),name);
  await current.load('src/lib/submissionsApi.ts').createSubmission({roomId:'ABCD',playerId:current.storage.get('playerId:ABCD'),playerName:name,imageUrl:'/drawing.png'});
  const saved=current.requests.at(-1);
  assert.equal(saved.headers.Authorization,'Bearer token-'+name);
  assert.equal(saved.body.playerId,'player-'+name);
 }
});
test('player role takes precedence in a tab opened from the host; reload retains its identity',async()=>{
 const host=tab();await host.load('src/lib/roomsApi.ts').createRoom();
 const hostId=host.storage.get('hostId');
 const room={id:'ABCD',hostId};
 assert.equal(host.load('src/lib/viewer.ts').getViewerRole(room),'HOST');
 const player=tab(new Map(host.storage));
 await player.load('src/lib/gameEntry.ts').joinGame('Pat','ABCD');
 assert.equal(player.load('src/lib/viewer.ts').getViewerRole(room),'PLAYER');
 assert.equal(host.load('src/lib/viewer.ts').getViewerRole(room),'HOST');
 const reloaded=tab(player.storage);
 assert.equal(reloaded.load('src/lib/viewer.ts').getViewerRole(room),'PLAYER');
 assert.equal(reloaded.load('src/lib/session.ts').sessionHeaders('ABCD','PLAYER').Authorization,'Bearer token-Pat');
 assert.equal(tab().load('src/lib/viewer.ts').getViewerRole(room),'SPECTATOR');
});
