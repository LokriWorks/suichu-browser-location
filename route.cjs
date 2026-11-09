const radians=n=>n*Math.PI/180;
function distance(a,b){const p=radians(b.latitude-a.latitude),q=radians(b.longitude-a.longitude),h=Math.sin(p/2)**2+Math.cos(radians(a.latitude))*Math.cos(radians(b.latitude))*Math.sin(q/2)**2;return 6371008.8*2*Math.atan2(Math.sqrt(h),Math.sqrt(Math.max(0,1-h)));}
function validateSpeed(speed){if(typeof speed!=='number'||!Number.isFinite(speed)||speed<0.1||speed>300)throw Error('速度范围为 0.1–300 km/h。');return speed;}
class Route {
 constructor(){this.status='idle';this.points=[];this.speed=5;this.loop=false;this.travelled=0;this.total=0;this.last=0;}
 start(points,speed,loop,now){validateSpeed(speed);if(!Array.isArray(points)||points.length<2||points.length>500)throw Error('请选择 2–500 个路线点。');const clean=points.map(p=>{if(!p||typeof p.latitude!=='number'||typeof p.longitude!=='number'||!Number.isFinite(p.latitude)||!Number.isFinite(p.longitude)||Math.abs(p.latitude)>85||Math.abs(p.longitude)>180)throw Error('路线坐标无效（纬度限 ±85°）。');return{latitude:p.latitude,longitude:p.longitude};});const segments=clean.slice(1).map((p,i)=>distance(clean[i],p));const total=segments.reduce((a,b)=>a+b,0);if(total<1)throw Error('路线总长度至少为 1 米。');Object.assign(this,{points:clean,segments,total,speed,loop:!!loop,travelled:0,last:now,status:'running'});return this.position();}
 advance(now){if(this.status==='running'){this.travelled+=Math.max(0,now-this.last)/1000*this.speed/3.6;this.last=now;if(this.travelled>=this.total){if(this.loop)this.travelled%=this.total;else{this.travelled=this.total;this.status='completed';}}}return this.position();}
 position(){if(!this.points.length)return null;if(this.travelled>=this.total)return{...this.points.at(-1)};let remaining=this.travelled;for(let i=0;i<this.segments.length;i++){const length=this.segments[i];if(remaining<=length&&length>0){const a=this.points[i],b=this.points[i+1],t=remaining/length;let delta=b.longitude-a.longitude;if(delta>180)delta-=360;if(delta< -180)delta+=360;return{latitude:a.latitude+(b.latitude-a.latitude)*t,longitude:((a.longitude+delta*t+540)%360)-180};}remaining-=length;}return{...this.points.at(-1)};}
 pause(now){this.advance(now);if(this.status==='running')this.status='paused';}
 resume(now){if(this.status!=='paused')throw Error('当前没有可继续的路线。');this.last=now;this.status='running';}
 change(speed,loop,now){validateSpeed(speed);this.advance(now);this.speed=speed;this.loop=!!loop;}
 stop(){this.status='idle';}
 snapshot(){return{status:this.status,points:this.points,speed:this.speed,loop:this.loop,travelled:this.travelled,total:this.total,remainingSeconds:(this.total-this.travelled)/this.speed*3.6};}
}
module.exports={Route,distance};
