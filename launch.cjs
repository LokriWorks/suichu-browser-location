const fs=require('node:fs');
const path=require('node:path');
const {spawn}=require('node:child_process');
const folder=__dirname;
const {edge,profile}=require('./runtime.cjs');
async function launch(){
  try {
    const state=JSON.parse(fs.readFileSync(path.join(folder,'status.json'),'utf8'));
    if(state.status==='verified' && state.testPage){
      const url=new URL(state.testPage);
      if(url.hostname==='127.0.0.1' && url.protocol==='http:'){
        const health=await fetch(url.origin+'/health',{signal:AbortSignal.timeout(1500)}).then(r=>r.json());
        if(health.app==='cdut-lab-location' && health.version===3 && health.status==='verified'){
          const browser=spawn(edge,['--user-data-dir='+profile,'--new-window',url.origin],{stdio:'ignore',detached:true,windowsHide:false});
          browser.unref();
          return;
        }
      }
    }
  } catch {}
  // The controller stays alive while the dedicated browser window is open.
  require('./console-controller.cjs');
}
launch().catch(e=>{
  fs.writeFileSync(path.join(folder,'launch-error.txt'),String(e));
  process.exitCode=1;
});
