const {test}=require('node:test'),assert=require('node:assert/strict');
const {searchPlaces,parsePlaces}=require('./search.cjs');
const point={name:'公开测试点',addr:'示例地址',geo:'1|1000000,1000000'};
test('search parses a single place and converts Baidu coordinates to WGS84',()=>{
 const [p]=parsePlaces({content:point});assert.equal(p.name,point.name);assert.ok(p.latitude>8&&p.latitude<10);assert.ok(p.longitude>8&&p.longitude<10);
});
test('scaled coordinates, multiple results and malformed entries',()=>{
 const results=parsePlaces({content:[{...point,geo:'1|100000000,100000000'},null,{name:'broken'},point]});assert.equal(results.length,2);assert.ok(Math.abs(results[0].latitude-results[1].latitude)<1e-6);assert.deepEqual(parsePlaces({content:null}),[]);
});
test('query is encoded and request failures produce an actionable error',async()=>{
 let seen;const results=await searchPlaces('巴黎 地标',async url=>{seen=url;return{ok:true,text:async()=>JSON.stringify({content:[point]})}});assert.equal(new URL(seen).searchParams.get('q'),'巴黎 地标');assert.equal(results.length,1);
 await assert.rejects(searchPlaces('巴黎',async()=>({ok:false,status:503})),/搜索暂时不可用/);await assert.rejects(searchPlaces(' '),/请输入/);
});
test('Photon results use WGS84, and built-in example needs no network',async()=>{
 const [p]=parsePlaces({features:[{properties:{name:'测试地点',city:'巴黎'},geometry:{coordinates:[2.3,48.8]}}]});assert.equal(p.latitude,48.8);assert.equal(p.longitude,2.3);assert.equal(p.address,'巴黎');
 const [example]=await searchPlaces('巴黎埃菲尔铁塔',()=>{throw Error('Network should not be needed')});assert.ok(Math.abs(example.latitude-48.8582599)<1e-6);
});
