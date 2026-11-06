// Isolated review only. Scene-attached finishing for sparse shots; no new text,
// periodic flashes, camera motion, or edits to the approved 17-section Lighting.
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
const p=(x,a,b)=>clamp((x-a)/(b-a));
const mix=(a,b,u)=>a+(b-a)*u;
const ease=x=>1-(1-clamp(x))**3;
const COLOR={purple:'#ba92ee',gold:'#edc087',cyan:'#8ccdd8'};
export const EXTRA_LIGHT_SHOTS=['R02','R04','R05','R06','R08','R09','R14','R25','R31','R39','R44','R52'];
export const EXTRA_LIGHT_PRESERVED={R47:'Isolation retains the empty dark room',R50:'Grey eye close-up retains stillness and the deep face'};
const enabled=new URLSearchParams(location.search).get('extraLight')!=='0';
const surfaces=new WeakMap();

// Called AFTER lighting.apply(ctx), BEFORE subtitles. e uses body time.
// Returns an audit even when inactive. No canvas writes for all non-target shots.
export function applyExtraLight(ctx,e,lighting){
 const id=e.shot.id,u=e.u,t=e.t;
 const audit={enabled,active:false,shot:id,mode:'scene-attached-lines',source:'existing scene geometry; no beat generator',paths:0,nodes:0,particles:0,subtitleClip:933,characterMaskExcluded:false};
 if(!enabled){audit.reason='extraLight=0';return audit;}
 if(EXTRA_LIGHT_PRESERVED[id]){audit.reason=EXTRA_LIGHT_PRESERVED[id];return audit;}
 if(!EXTRA_LIGHT_SHOTS.includes(id)){audit.reason='outside targeted sparse shots';return audit;}
 if(!lighting?.enabled||!lighting.mask){audit.reason='requires approved lighting and its character mask';return audit;}
 // All three accepted preview ranges are outside the target set. Guard the
 // exact body intervals as well so a later timeline change cannot alter them.
 if((t>=0&&t<3.95)||(t>=164&&t<171)||(t>=201.5&&t<209.5)){
  audit.reason='accepted preview interval protected';return audit;
 }
 let layer=surfaces.get(ctx.canvas);
 if(!layer||layer.width!==ctx.canvas.width||layer.height!==ctx.canvas.height){layer=document.createElement('canvas');layer.width=ctx.canvas.width;layer.height=ctx.canvas.height;surfaces.set(ctx.canvas,layer);}
 const c=layer.getContext('2d'),scale=layer.width/1920;
 c.reset();c.clearRect(0,0,layer.width,layer.height);c.setTransform(scale,0,0,scale,0,0);
 c.save();c.translate(960+lighting.shift[0],466+lighting.shift[1]);c.scale(lighting.zoom,lighting.zoom);c.translate(-960,-466);
 const envelope=smooth(p(u,0,.09))*smooth(p(1-u,0,.10));
 const line=(pts,color=COLOR.purple,alpha=.6,width=1.8)=>{
  if(pts.length<2||alpha<=0)return;
  audit.paths++;c.save();c.lineCap='round';c.lineJoin='round';
  c.beginPath();c.moveTo(...pts[0]);for(const xy of pts.slice(1))c.lineTo(...xy);
  c.strokeStyle=color;c.lineWidth=width+4;c.shadowColor=color;c.shadowBlur=14*scale;c.globalAlpha=alpha*envelope*.23;c.stroke();
  c.lineWidth=width;c.shadowBlur=5*scale;c.globalAlpha=alpha*envelope;c.stroke();c.restore();
 };
 const node=(x,y,color=COLOR.purple,alpha=.5,r=3)=>{
  audit.nodes++;c.save();c.fillStyle=color;c.globalAlpha=alpha*envelope;c.shadowColor=color;c.shadowBlur=13*scale;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();c.restore();
 };
 const pointOn=(pts,q)=>{
  const lens=pts.slice(1).map((a,i)=>Math.hypot(a[0]-pts[i][0],a[1]-pts[i][1])),len=lens.reduce((a,b)=>a+b,0);let d=clamp(q)*len;
  for(let i=0;i<lens.length;i++){if(d<=lens[i]||i===lens.length-1){const v=lens[i]?d/lens[i]:0;return[mix(pts[i][0],pts[i+1][0],v),mix(pts[i][1],pts[i+1][1],v)];}d-=lens[i];}return pts[0];
 };
 // Single progress-driven packet, never a looping or rhythmic brightness pulse.
 const packet=(pts,q,color=COLOR.gold,alpha=.75)=>{if(q<=0||q>=1)return;audit.particles++;node(...pointOn(pts,q),color,alpha,3.2);};
 const partial=(pts,q)=>{const result=[pts[0]],lens=pts.slice(1).map((a,i)=>Math.hypot(a[0]-pts[i][0],a[1]-pts[i][1])),len=lens.reduce((a,b)=>a+b,0);let d=clamp(q)*len;for(let i=0;i<lens.length;i++){if(d>=lens[i]){result.push(pts[i+1]);d-=lens[i];}else{result.push(pointOn([pts[i],pts[i+1]],lens[i]?d/lens[i]:0));break;}}return result;};
 switch(id){
  case 'R02':{
   // Assembly scaffold follows the same settling matrix as the workspace parts.
   const settle=smooth(p(u,.57,.95)),tilt=1-settle,a=.62*smooth(p(u,.18,.48));
   c.save();c.translate(960,500);c.scale(1-.30*tilt,1-.22*tilt);c.transform(1,.12*tilt,-.25*tilt,1,0,0);c.translate(-960,-500);
   line([[60,36],[60,906],[1860,906],[1860,36]],COLOR.purple,a,2);
   line([[350,905],[350,115],[430,115]],COLOR.cyan,a*.7,1.4);
   for(const xy of [[60,36],[60,906],[1860,906],[1860,36]])node(...xy,COLOR.gold,a,3.4);
   packet([[60,906],[1860,906],[1860,36]],p(u,.24,.91),COLOR.cyan,a);c.restore();
   audit.design='assembling workspace rim and panel junctions';break;
  }
  case 'R04':{
   line([[60,180],[60,906],[1860,906],[1860,180]],COLOR.purple,.52,1.7);
   line([[390,884],[1810,884],[1810,755]],COLOR.cyan,.38,1.4);
   if(u>.72){const path=[[1100,600],[1100,660],[1550,660]];line(partial(path,p(u,.72,.78)),COLOR.purple,.65,2);packet(path,p(u,.73,.94));}
   audit.design='workspace and composer rim; existing submit route';break;
  }
  case 'R05':{
   // Radial rails end outside the emblem; no extra symbol or new UI is drawn.
   line([[180,780],[410,450],[690,345]],COLOR.purple,.42,1.6);
   line([[1740,780],[1510,450],[1230,345]],COLOR.cyan,.34,1.5);
   line([[330,640],[330,795],[1590,795],[1590,640]],COLOR.purple,.65,2);
   packet([[330,795],[1590,795]],p(u,.2,.84),COLOR.gold,.65);
   audit.design='title grid depth rails and composer lower edge';break;
  }
  case 'R06':{
   const zoom=smooth(p(u,0,.19)),[x,y,w,h]=e.sceneAudit.inputCloseup?.composer||[mix(390,170,zoom),mix(755,342,zoom),mix(1420,1580,zoom),mix(125,262,zoom)];
   line([[x,y+16],[x,y+h],[x+w,y+h],[x+w,y+16]],COLOR.purple,.48,1.7);
   line([[210,805],[1710,805]],COLOR.cyan,.23,1.1);
   node(x,y+h,COLOR.purple,.45,2.5);node(x+w,y+h,COLOR.purple,.45,2.5);
   audit.design='moving input-box lower rim; no reply or signal arriving';break;
  }
  case 'R08':{
   const pull=smooth(p(u,.4,1)),x=mix(760,960,pull),r=mix(82,134,pull),focus=[x,430-r],a=p(u,.67,.93);
   line([focus,[focus[0]+420,focus[1]]],COLOR.purple,.65*a,1.8);
   line([focus,[focus[0],800]],COLOR.cyan,.4*a,1.4);
   for(const d of [140,280,420])node(focus[0]+d,focus[1],COLOR.purple,.45*a,2.3);
   audit.design='existing first-mark vertex extends into geometry axes';break;
  }
  case 'R09':{
   const spread=smooth(p(u,.05,.25)),ln=smooth(p(u,.16,.40)),plane=smooth(p(u,.35,.59)),volume=smooth(p(u,.55,.78)),flat=smooth(p(u,.82,1));
   const pts=Array.from({length:8},(_,i)=>{const xx=(i&1?1:-1)*205,yy=(i&2?1:-1)*205,zz=(i&4?1:-1)*150*volume*(1-flat);return[mix(mix(960,960+(i-3.5)*104,ln),1015+xx+zz*.55,plane),mix(mix(296,296+Math.sin(i*.8)*40*spread,ln),410+yy-zz*.36,plane)];});
   for(let i=0;i<8;i++)for(const bit of [1,2,4])if(!(i&bit))line(partial([pts[i],pts[i|bit]],bit===4?volume:plane),bit===4?COLOR.gold:COLOR.purple,bit===4?.54:.42,bit===4?1.5:2);
   audit.design='same point-line-plane-volume vertices; local edge glow';break;
  }
  case 'R14':{
   // Stay outside the vision shutter: glowing the hidden inner waveform would
   // defeat the shot's loss-of-vision action.
   line([[70,70],[70,855],[1850,855],[1850,70]],COLOR.purple,.54,1.7);
   line([[70,855],[100,882],[1805,882],[1850,855]],COLOR.cyan,.34,1.3);
   node(70,855,COLOR.purple,.6);node(1850,855,COLOR.gold,.5);
   audit.design='settings enclosure exterior; vision shutter remains opaque';break;
  }
  case 'R25':case 'R31':{
   const n=id==='R25'?0:3,x=[225,705,300,600][n],y=[245,180,355,235][n],w=[1470,1110,1460,1210][n],q=ease(p(u,0,.65));
   const route=[[x+w-35,y+160],[x+w-35,y+205],[960,760]];
   line(partial(route,q),COLOR.gold,.62,2);packet(route,q,COLOR.gold,.78);
   line([[80,y+185],[x-15,y+185]],COLOR.purple,.36,1.6);
   audit.design='existing request output route; source figure masked';break;
  }
  case 'R39':{
   const q=ease(p(u,.02,.73)),path=[[130,350],[770,350]];
   line(partial(path,q),COLOR.gold,.68,2.4);packet(path,q,COLOR.gold,.82);
   const n=Math.min(5,1+Math.floor(u*5));for(let i=0;i<n;i++)node(610+i*80,655,COLOR.gold,.55,3.2);
   // Downstream stays dark until the original shot reports connected.
   if(u>.73)line(partial([[770,350],[1020,540],[1700,540]],p(u,.73,1)),COLOR.purple,.52,1.8);
   audit.design='same reconnect path and five existing progress nodes';break;
  }
  case 'R44':{
   const z=mix(1.14,1,ease(u));c.save();c.translate(960,455);c.scale(z,z);c.translate(-960,-455);
   line([[390,572],[1500,490],[1790,755],[530,855],[390,572]],COLOR.purple,.22,1.4);
   line([[530,855],[535,921]],COLOR.purple,.15,1.2);line([[1790,755],[1790,895]],COLOR.purple,.15,1.2);c.restore();
   audit.design='quiet desk silhouette only; empty seat and absent input preserved';break;
  }
  case 'R52':{
   const color=u>.26?'#d783ac':COLOR.purple;
   line([[170,235],[170,425],[1750,425],[1750,235]],color,.46,1.7);
   line([[170,485],[170,635],[1750,635],[1750,485]],COLOR.purple,.38,1.5);
   line([[96,450],[96,688],[370,688]],COLOR.cyan,.31,1.4);
   audit.design='request/system panel edges; no invented successful reply';break;
  }
 }
 c.restore();
 // Mask after blur, in physical pixels, so no glow leaks onto deep faces or
 // source anatomy. The original light mask already inherits scene clips.
 c.setTransform(1,0,0,1,0,0);c.globalAlpha=1;c.globalCompositeOperation='destination-out';
 // Faded actors still own their whole silhouette: using their opacity here
 // would let the added light cross a .42-alpha face in R31. Threshold only
 // this temporary light mask, never the original raster or production art.
 const cut=layer.extraActorCut??=document.createElement('canvas');
 if(cut.width!==lighting.mask.width||cut.height!==lighting.mask.height){cut.width=lighting.mask.width;cut.height=lighting.mask.height;}
 const cutCtx=cut.getContext('2d'),maskData=lighting.mc.getImageData(0,0,cut.width,cut.height);
 const originalAlpha=new Uint8Array(cut.width*cut.height);
 for(let i=0;i<originalAlpha.length;i++)originalAlpha[i]=maskData.data[i*4+3];
 // One low-resolution pixel expansion also protects the antialiased support
 // when the 960px mask is bilinearly scaled back to the 4K stage.
 for(let y=0;y<cut.height;y++)for(let x=0;x<cut.width;x++){
  let occupied=false;
  for(let dy=-1;dy<=1&&!occupied;dy++)for(let dx=-1;dx<=1;dx++){
   const xx=x+dx,yy=y+dy;if(xx>=0&&xx<cut.width&&yy>=0&&yy<cut.height&&originalAlpha[yy*cut.width+xx]>0){occupied=true;break;}
  }
  maskData.data[(y*cut.width+x)*4+3]=occupied?255:0;
 }
 cutCtx.putImageData(maskData,0,0);c.drawImage(cut,0,0,layer.width,layer.height);
 // The R14 loss-of-vision shutter is a deliberate foreground occluder.
 // Keep its entire interior unchanged, including soft-glow spill from outside.
 if(id==='R14'){
  c.save();c.setTransform(scale,0,0,scale,0,0);c.translate(960+lighting.shift[0],466+lighting.shift[1]);c.scale(lighting.zoom,lighting.zoom);c.translate(-960,-466);c.fillStyle='#fff';c.fillRect(80,60,1760,780);c.restore();
  audit.visionShutterExcluded=true;
 }
 c.globalCompositeOperation='source-over';
 ctx.save();ctx.setTransform(scale,0,0,scale,0,0);ctx.beginPath();ctx.rect(0,0,1920,933);ctx.clip();ctx.globalAlpha=1;ctx.globalCompositeOperation='screen';ctx.drawImage(layer,0,0,1920,1080);ctx.restore();
 audit.active=true;audit.envelope=envelope;audit.characterMaskExcluded=true;audit.fadedActorSilhouetteExcluded=true;audit.actorCount=lighting.actorCount||0;audit.cameraMatched=true;
 return audit;
}
