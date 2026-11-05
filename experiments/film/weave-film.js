// Films weaver.html scene by scene: each scene is a function of the frame number, driving the page's own controls; one JPEG per frame.
const {chromium}=require('playwright');const fs=require('fs');
const OUT='/home/claude/stelline-work/film/weave/';const only=process.argv[2];const every=+(process.argv[3]||1);
(async()=>{const b=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const p=await b.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://127.0.0.1:8095/weaver.html');await p.waitForTimeout(3000);
await p.evaluate(()=>{const F=FORGE,S=F.S,V=THREE.Vector3;F.manual();S.orbit.dist=.74;S.orbit.pitch=-.36;S.orbit.yaw=.35;S.orbit.tgt.set(0,.83,0);S.tool=2;
 window.D={V,F,S,
  xy(lp){return F.worldToRoom(F.local(new V(...lp)));},
  aim(lp){const [x,y]=this.xy(lp);F.setAim(x,y);return [x,y];},
  // a stroke drawn over frames: call each frame with the point for that frame
  st(lp,first,last,dab){const [x,y]=this.aim(lp);const h=F.hitAt(x,y);if(first){F.snapshot();if(h)F.strokeStart(h);} if(h&&(dab==null||dab))F.strokeMove(h,x,y); if(last)F.strokeEnd();},
  ring(r,n){F.turn(r,n);},
  toolTo(name){const i=['SPAWN','GRAB','PULL','PUSH','SMOOTH','FLATTEN','PAINT','PIPE','PLACE'].indexOf(name);if(i!==S.tool)F.turn(1,i-S.tool);},
  optTo(i){const t=F.rings()[4];const v=t.v();if(i!==v)F.turn(4,i-v);},
  radTo(mm){const d=Math.round((mm/1000-S.radius)/.0025);if(d)F.turn(2,d);},
  strTo(pc){const d=Math.round((pc/100-S.strength)/.05);if(d)F.turn(3,d);},
  every(f,a,b,k,fn){if(f>=a&&f<=b&&(f-a)%k===0)fn(Math.round((f-a)/k));}};});
const SC={
 A:{n:150,fn:`(f)=>{const{S,F}=D; S.orbit.yaw+=.0012; if(f===10)D.toolTo('SPAWN'); if(f>=24)D.aim([0,0,0]);
   if(f===40)D.optTo(1); if(f===55)D.optTo(3); if(f===75)D.optTo(2); if(f===105)F.press('CAPTURE');}`},
 B:{n:240,fn:`(f)=>{const{S,F}=D; S.orbit.yaw+=.0012; if(f===6)D.toolTo('PULL'); if(f===10)D.optTo(3); if(f===13)D.radTo(30); if(f===16)D.strTo(40);
   if(f>=20&&f<=92){const u=(f-20)/72;D.st([.131*Math.cos(.35),.025+.025*Math.sin(u*Math.PI*2)**2,.131*Math.sin(.35)],f===20,f===92,f%6===0);}
   if(f===98)D.toolTo('SMOOTH'); if(f>=106&&f<=138){const u=(f-106)/32;D.st([.13*Math.cos(.3),.02+.03*u,.13*Math.sin(.3)],f===106,f===138,f%3===0);}
   if(f===146)D.toolTo('PAINT'); if(f===150)D.optTo(1); if(f===153)D.radTo(17); if(f===156)D.strTo(95);
   if(f>=160&&f<=234){const u=(f-160)/74,a=.35+u*Math.PI*2.05;D.st([.133*Math.cos(a),.034,.133*Math.sin(a)],f===160,f===234);}}`},
 C:{n:270,fn:`(f)=>{const{S,F}=D; S.orbit.yaw+=.0012; if(f===4)D.toolTo('PIPE'); if(f===8)D.optTo(0); if(f===11)D.radTo(26);
   if(f>=16&&f<=112){const u=(f-16)/96,a=.4+u*Math.PI*2.02;D.st([.129*Math.cos(a),.0705,.129*Math.sin(a)],f===16,f===112);}
   if(f>=120&&f<=190){const u=(f-120)/70,a=.4+u*Math.PI*2.02;D.st([.089*Math.cos(a),.1355,.089*Math.sin(a)],f===120,f===190);}
   if(f===198)D.optTo(6); if(f===204)D.radTo(17);
   if(f>=214&&f<=262){const u=(f-214)/48;D.st([-.045+u*.09,.1362,.012*Math.sin(u*Math.PI*3)],f===214,f===262);}}`},
 D:{n:180,fn:`(f)=>{const{S,F}=D; S.orbit.yaw+=.0012; if(f===4)D.toolTo('PLACE'); if(f===8)D.optTo(0);
   D.every(f,16,76,10,i=>{const a=i/7*Math.PI*2+.6;D.aim([.062*Math.cos(a),.1362,.062*Math.sin(a)]);}); D.every(f,20,80,10,()=>F.press('CAPTURE'));
   if(f===90)D.optTo(1); D.every(f,96,150,6,i=>{const a=i/10*Math.PI*2+.2;D.aim([.111*Math.cos(a),.0712,.111*Math.sin(a)]);}); D.every(f,98,152,6,()=>F.press('CAPTURE'));
   if(f===158)D.optTo(2); if(f===161){D.radTo(32);} if(f===164)D.strTo(70); if(f===165)D.aim([-.012,.1362,-.028]); if(f===170)F.press('CAPTURE');}`},
 S:{n:300,fn:`(f)=>{const{S,F}=D; S.orbit.yaw+=.0010; if(f===4){F.setAim(null);F.press('MODE');}
   D.every(f,10,28,2,()=>D.ring(3,1)); D.every(f,36,50,2,()=>D.ring(2,1)); D.every(f,56,70,2,()=>D.ring(1,3));
   if(f===80||f===110||f===140)F.press('CAPTURE'); if(f===170)D.ring(0,-2); D.every(f,178,190,4,()=>D.ring(1,1));
   D.every(f,210,248,2,()=>D.ring(4,1)); if(f===258)D.ring(0,-1); D.every(f,266,294,2,()=>D.ring(4,-1));}`},
 E:{n:240,fn:`(f)=>{const{S,F}=D; S.orbit.yaw+=.0012; if(f===4){F.press('MODE');}
   D.every(f,24,84,20,()=>{F.press('CAPTURE');}); D.every(f,30,90,20,()=>D.ring(3,2)); if(f===98)D.ring(1,1); if(f===104)D.ring(1,-1);
   if(f===110)D.ring(4,3); if(f===128)F.press('PLAY');}`},
 F:{n:330,fn:`(f)=>{const{S,F}=D; S.orbit.yaw+=.0012; if(f===2)F.press('PLAY'); if(f===8)F.press('MODE'); if(f===12)D.ring(1,-20);
   D.every(f,24,114,5,()=>D.ring(1,1)); D.every(f,124,172,4,()=>D.ring(2,1)); if(f>=124&&f<=200)S.orbit.dist+= (1.05-S.orbit.dist)*.04; D.every(f,180,200,4,()=>D.ring(3,1)); if(f===210)F.press('PLAY');
   D.every(f,262,320,4,()=>D.ring(1,-1));}`}
};for(const k of Object.keys(SC)){ if(only&&!only.includes(k)){ // run silently to keep state, without screenshots
   await p.evaluate(([fn,n])=>{const g=eval(fn);for(let f=0;f<n;f++){g(f);FORGE.step(1/30);}},[SC[k].fn,SC[k].n]);continue;}
 const dir=OUT+'s'+k+'/';fs.mkdirSync(dir,{recursive:true});
 await p.evaluate(fn=>{window.G=eval(fn);},SC[k].fn);
 for(let f=0;f<SC[k].n;f++){await p.evaluate(f=>{G(f);FORGE.advance(1/30);},f);
   if(f%every===0)await p.screenshot({path:dir+String(f).padStart(5,'0')+'.jpg',type:'jpeg',quality:92,timeout:180000});}
 console.log('scene',k,'done',errs.slice(0,3));}
await b.close();})();
