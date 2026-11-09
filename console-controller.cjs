const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto');
const {spawn}=require('node:child_process');
const folder=__dirname;
const {edge,profile,dataDir}=require('./runtime.cjs');
const {searchPlaces}=require('./search.cjs');
const statePath=path.join(dataDir,'status.json'),targetPath=path.join(dataDir,'target.json');
const {Route}=require('./route.cjs');
const route=new Route();
const now=()=>performance.now();
let routeTimer, ticking=false;
function routeState(){state.route=route.snapshot();}
async function moveRoute(){const position=route.position();if(position)Object.assign(state,position,{target:'路线移动',address:'',enabled:true});routeState();await applyAll();}
async function tickRoute(){if(ticking||route.status!=='running')return;ticking=true;try{route.advance(now());await moveRoute();}catch(e){route.pause(now());routeState();state.lastError=e.message;save();}finally{ticking=false;}}
const token=crypto.randomBytes(24).toString('hex'),sleep=ms=>new Promise(r=>setTimeout(r,ms));
const initial=JSON.parse(fs.readFileSync(fs.existsSync(targetPath)?targetPath:path.join(folder,'default-target.json'),'utf8'));
let previous={};try{previous=JSON.parse(fs.readFileSync(statePath,'utf8'));}catch{}
const state={status:'starting',version:4,controllerPid:process.pid,target:initial.name,address:initial.address||'',latitude:initial.wgs84[1],longitude:initial.wgs84[0],enabled:true,configuredPages:0,scope:'dedicated Edge profile only'};
let ws,server,timer,origin,stopping=false,serial=0;
const pending=new Map(),sessions=new Map();
const save=()=>{state.updatedAt=new Date().toISOString();fs.writeFileSync(statePath,JSON.stringify(state,null,2));};
function call(method,params={},sessionId){return new Promise((resolve,reject)=>{const id=++serial,deadline=setTimeout(()=>{pending.delete(id);reject(Error(method+' timeout'));},12000);pending.set(id,{resolve,reject,deadline});ws.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}));});}
async function configure(session){await call(state.enabled?'Emulation.setGeolocationOverride':'Emulation.clearGeolocationOverride',state.enabled?{latitude:state.latitude,longitude:state.longitude,accuracy:10}:{},session);}
async function attach(message){const {sessionId,targetInfo}=message.params;try{if(['page','iframe'].includes(targetInfo.type)){await configure(sessionId);sessions.set(targetInfo.targetId,sessionId);state.configuredPages=sessions.size;save();}}catch(e){state.lastError=e.message;save();}finally{try{await call('Runtime.runIfWaitingForDebugger',{},sessionId);}catch{}}}
async function applyAll(){const values=await Promise.allSettled([...sessions.values()].map(configure));if(!values.some(v=>v.status==='fulfilled'))throw Error('专用浏览器未连接，请重新打开桌面快捷方式。');state.failedPages=values.filter(v=>v.status==='rejected').length;save();}
async function stop(reason,closeBrowser=false){if(stopping)return;stopping=true;clearInterval(timer);clearInterval(routeTimer);if(ws?.readyState===WebSocket.OPEN){await Promise.allSettled([...sessions.values()].map(s=>call('Emulation.clearGeolocationOverride',{},s)));if(closeBrowser)try{await call('Browser.close');}catch{}ws.close();}state.status=reason;save();server?.close();}
function json(res,status,value){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));}
function body(req){return new Promise((resolve,reject)=>{let data='';req.on('data',chunk=>{data+=chunk;if(data.length>65536){reject(Error('输入过长。'));req.destroy();}});req.on('end',()=>{try{resolve(JSON.parse(data));}catch{reject(Error('无效的请求数据。'));}});});}
async function serve(req,res){try{
 const url=new URL(req.url,'http://localhost');
 if(req.method==='GET'&&url.pathname==='/health')return json(res,200,{app:'cdut-lab-location',version:4,status:state.status,target:state.target});
 if(req.method==='GET'&&url.pathname==='/api/state'){routeState();return json(res,200,state);}
 if(req.method==='GET'&&url.pathname==='/api/default')return json(res,200,JSON.parse(fs.readFileSync(path.join(folder,'default-target.json'),'utf8')));
 if(req.method==='GET'&&url.pathname==='/api/search'){const query=(url.searchParams.get('q')||'').trim();if(!query||query.length>160)return json(res,400,{error:'请输入 1–160 个字的地点名称。'});return json(res,200,{places:await searchPlaces(query)});}
 if(req.method==='POST'){
  if(req.headers['x-controller-token']!==token||(req.headers.origin&&req.headers.origin!==origin))return json(res,403,{error:'请从桌面快捷方式打开定位控制台。'});
  const data=await body(req);
  if(url.pathname==='/api/route'){
   // Wait for an in-flight browser update before changing the motion state.
   while(ticking)await sleep(20);
   try{
    if(data.action==='start')route.start(data.points,data.speed,data.loop,now());
    else if(data.action==='pause')route.pause(now());
    else if(data.action==='resume')route.resume(now());
    else if(data.action==='settings')route.change(data.speed,data.loop,now());
    else if(data.action==='stop')route.stop();
    else throw Error('未知路线操作。');
   }catch(e){return json(res,400,{error:e.message});}
   if(route.points.length)await moveRoute();else{routeState();save();}
   return json(res,200,state);
  }
  if(url.pathname==='/api/location'){
   const latitude=Number(data.latitude),longitude=Number(data.longitude);
   if(!Number.isFinite(latitude)||Math.abs(latitude)>90||!Number.isFinite(longitude)||Math.abs(longitude)>180)return json(res,400,{error:'请输入有效的纬度（−90 ～ 90）和经度（−180 ～ 180）。'});
   while(ticking)await sleep(20);route.stop();routeState();
   const before={...state};Object.assign(state,{latitude,longitude,target:String(data.name||'自定义位置').slice(0,100),address:String(data.address||'').slice(0,240),enabled:true});
   try{await applyAll();}catch(e){Object.assign(state,before);throw e;}
   fs.writeFileSync(targetPath,JSON.stringify({name:state.target,address:state.address,wgs84:[longitude,latitude]},null,2));
   return json(res,200,state);
  }
  if(url.pathname==='/api/pause'){while(ticking)await sleep(20);route.pause(now());routeState();state.enabled=!data.paused;await applyAll();return json(res,200,state);}
  return json(res,404,{error:'未找到此功能。'});
 }
 if(req.method==='GET'&&url.pathname==='/'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'strict-origin-when-cross-origin'});return res.end(fs.readFileSync(path.join(folder,'console.html'),'utf8').replace('__TOKEN__',JSON.stringify(token)));}
 res.writeHead(404);res.end();
}catch(e){if(!res.headersSent)json(res,500,{error:e.message||'暂时无法处理，请重试。'});else res.end();}}

(async()=>{
 fs.mkdirSync(profile,{recursive:true});const marker=path.join(dataDir,'stop.request');if(fs.existsSync(marker))fs.unlinkSync(marker);
 server=http.createServer(serve);await new Promise(r=>server.listen(0,'127.0.0.1',r));origin='http://127.0.0.1:'+server.address().port;state.testPage=origin;
 const active=path.join(profile,'DevToolsActivePort');let info;
 if(fs.existsSync(active)){try{const p=fs.readFileSync(active,'utf8').trim().split(/\r?\n/);info=await fetch('http://127.0.0.1:'+p[0]+'/json/version',{signal:AbortSignal.timeout(1500)}).then(r=>r.json());}catch{}}
 if(!info?.webSocketDebuggerUrl){
  if(fs.existsSync(active))fs.unlinkSync(active);
  const child=spawn(edge,['--user-data-dir='+profile,'--remote-debugging-port=0','--remote-debugging-address=127.0.0.1',...(process.env.SUICHU_HEADLESS==='1'?['--headless=new','--disable-gpu']:[]),'--no-first-run','--no-default-browser-check','--disable-background-mode','--new-window','about:blank'],{stdio:'ignore',windowsHide:false});
  child.on('error',e=>{state.error=e.message;stop('failed');});
  for(let i=0;i<100;i++){if(fs.existsSync(active)){const p=fs.readFileSync(active,'utf8').trim().split(/\r?\n/);if(p[1]){info={webSocketDebuggerUrl:'ws://127.0.0.1:'+p[0]+p[1]};break;}}await sleep(200);}
 }
 if(!info?.webSocketDebuggerUrl)throw Error('专用 Edge 没有启动成功，请关闭其窗口后重试。');
 ws=new WebSocket(info.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.addEventListener('open',r,{once:true});ws.addEventListener('error',j,{once:true});});
 ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);if(!p)return;pending.delete(m.id);clearTimeout(p.deadline);m.error?p.reject(Error(m.error.message)):p.resolve(m.result);}else if(m.method==='Target.attachedToTarget')attach(m);else if(m.method==='Target.detachedFromTarget'){for(const[id,s]of sessions)if(s===m.params.sessionId)sessions.delete(id);}});
 ws.addEventListener('close',()=>{if(!stopping)stop('browser_closed');});
 await call('Target.setAutoAttach',{autoAttach:true,waitForDebuggerOnStart:false,flatten:true});
 await call('Browser.grantPermissions',{origin,permissions:['geolocation']});
 const {targetInfos}=await call('Target.getTargets');let page=targetInfos.find(t=>t.type==='page'&&previous.testPage&&t.url===previous.testPage+'/');
 if(!page)page=await call('Target.createTarget',{url:'about:blank'});
 for(let i=0;i<60&&!sessions.has(page.targetId);i++)await sleep(100);
 const session=sessions.get(page.targetId);if(!session)throw Error('无法连接专用 Edge 页面。');
 await call('Page.navigate',{url:origin},session);
 let observed;for(let i=0;i<60;i++){await sleep(250);const r=await call('Runtime.evaluate',{expression:'window.geoResult || null',returnByValue:true},session);observed=r.result.value;if(observed)break;}
 if(!observed||observed.error||Math.abs(observed.latitude-state.latitude)>1e-6||Math.abs(observed.longitude-state.longitude)>1e-6)throw Error('网页定位验证失败：'+JSON.stringify(observed));
 state.status='verified';state.observed=observed;save();
 const shot=await call('Page.captureScreenshot',{format:'png'},session);fs.writeFileSync(path.join(dataDir,'verification.png'),Buffer.from(shot.data,'base64'));
 routeState();save();routeTimer=setInterval(tickRoute,500);console.log(JSON.stringify(state));timer=setInterval(()=>{if(fs.existsSync(marker))stop('stopped',true);},1000);
})().catch(async e=>{state.error=e.message;await stop('failed');console.error(e.message);process.exitCode=1;});
process.on('SIGINT',()=>stop('stopped',false));process.on('SIGTERM',()=>stop('stopped',false));
