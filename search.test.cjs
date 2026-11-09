const {test}=require('node:test'),assert=require('node:assert/strict');
const {searchPlaces,parsePlaces}=require('./search.cjs');
const point={name:'成都理工大学-综合实验大楼',addr:'示例地址',geo:'1|11595055.42,3569338.55'};
test('search parses a single place and converts Baidu coordinates to WGS84',()=>{
 const [p]=parsePlaces({content:point});assert.equal(p.name,point.name);assert.ok(Math.abs(p.latitude-30.676777252973892)<1e-6);assert.ok(Math.abs(p.longitude-104.15012287456355)<1e-6);
});
test('scaled coordinates, multiple results and malformed entries',()=>{
 const results=parsePlaces({content:[{...point,geo:'1|1159505542,356933855'},null,{name:'broken'},point]});assert.equal(results.length,2);assert.ok(Math.abs(results[0].latitude-results[1].latitude)<1e-6);assert.deepEqual(parsePlaces({content:null}),[]);
});
test('query is encoded and request failures produce an actionable error',async()=>{
 let seen;const results=await searchPlaces('成都 理工',async url=>{seen=url;return{ok:true,text:async()=>JSON.stringify({content:[point]})}});assert.equal(new URL(seen).searchParams.get('q'),'成都 理工');assert.equal(results.length,1);
 await assert.rejects(searchPlaces('成都',async()=>({ok:false,status:503})),/搜索暂时不可用/);await assert.rejects(searchPlaces(' '),/请输入/);
});
test('Photon results use WGS84, and built-in example needs no network',async()=>{
 const [p]=parsePlaces({features:[{properties:{name:'测试地点',city:'成都'},geometry:{coordinates:[104.1,30.6]}}]});assert.equal(p.latitude,30.6);assert.equal(p.longitude,104.1);assert.equal(p.address,'成都');
 const [example]=await searchPlaces('成都理工大学综合实验大楼',()=>{throw Error('Network should not be needed')});assert.ok(Math.abs(example.latitude-30.676777252973892)<1e-6);
});
