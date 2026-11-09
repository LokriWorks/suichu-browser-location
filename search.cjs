const {fromBaiduMercator}=require('./geo.cjs');
const example=require('./default-target.json');
let queue=Promise.resolve(),lastRequest=0;const cache=new Map();
function nativeRequest(url){
  return new Promise((resolve,reject)=>{
    const child=require('node:child_process').execFile(process.env.SUICHU_NATIVE_HTTP_EXE,['--search-http'],{timeout:18000,maxBuffer:2*1024*1024,encoding:'utf8',windowsHide:true},(error,stdout)=>error?reject(error):resolve({ok:true,text:async()=>stdout}));
    child.stdin.on('error',reject);child.stdin.end(url);
  });
}

function parsePlaces(data){
  if(Array.isArray(data?.features))return data.features.map(feature=>{
    const p=feature.properties||{},c=feature.geometry?.coordinates;
    return Array.isArray(c)&&typeof p.name==='string'?{name:p.name,address:[p.country,p.state,p.city,p.district,p.street,p.housenumber].filter(Boolean).join(' · '),longitude:c[0],latitude:c[1]}:null;
  }).filter(p=>p&&Number.isFinite(p.latitude)&&Math.abs(p.latitude)<=90&&Number.isFinite(p.longitude)&&Math.abs(p.longitude)<=180).slice(0,8);
  const content=Array.isArray(data?.content)?data.content:(data?.content&&typeof data.content==='object'?[data.content]:[]);
  return content.filter(p=>p&&typeof p.name==='string'&&typeof p.geo==='string').slice(0,8).map(p=>{
    const match=p.geo.match(/\|(-?[\d.]+),(-?[\d.]+)/);if(!match)return null;
    let x=Number(match[1]),y=Number(match[2]);if(Math.abs(x)>21000000){x/=100;y/=100;}
    const [longitude,latitude]=fromBaiduMercator(x,y);
    return {name:p.name,address:String(p.addr||''),latitude,longitude};
  }).filter(p=>p&&Number.isFinite(p.latitude)&&Math.abs(p.latitude)<=90&&Number.isFinite(p.longitude)&&Math.abs(p.longitude)<=180);
}

async function searchPlaces(query,request=fetch){
  const value=String(query).trim();if(!value||value.length>160)throw Error('请输入 1–160 个字的地点名称。');
  const aliases=['巴黎埃菲尔铁塔','埃菲尔铁塔','TourEiffel','EiffelTower'];
  if(aliases.includes(value.replace(/[-\s]/g,'')))return[{name:example.name,address:'内置示例地点',longitude:example.wgs84[0],latitude:example.wgs84[1]}];
  const task=async()=>{try{
    const saved=cache.get(value);if(request===fetch&&saved&&saved.expires>Date.now())return saved.places;
    if(request===fetch){await new Promise(r=>setTimeout(r,Math.max(0,1000-(Date.now()-lastRequest))));lastRequest=Date.now();}
    const url=new URL(process.env.SUICHU_SEARCH_URL||'https://photon.komoot.io/api/');
    if(url.protocol!=='https:'&&!(url.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(url.hostname)))throw Error('Invalid search endpoint');
    url.searchParams.set('q',value);url.searchParams.set('limit','8');
    const response=request===fetch&&process.platform==='win32'&&process.env.SUICHU_NATIVE_HTTP_EXE?await nativeRequest(url.href):await request(url.href,{signal:AbortSignal.timeout(15000),headers:{'User-Agent':'SuichuBrowserLocation/1.2.0 (+https://github.com/LokriWorks/suichu-browser-location)'}});
    if(!response.ok)throw Error('HTTP '+response.status);
    const text=await response.text();if(text.length>2*1024*1024)throw Error('Response too large');
    const places=parsePlaces(JSON.parse(text));
    if(request===fetch){if(cache.size>=100)cache.delete(cache.keys().next().value);cache.set(value,{places,expires:Date.now()+600000});}
    return places;
  }catch{throw Error('地点搜索暂时不可用，请稍后重试，或直接输入经纬度。');}};
  const result=queue.then(task);queue=result.catch(()=>{});return result;
}
module.exports={searchPlaces,parsePlaces};
