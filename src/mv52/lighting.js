// Review-only v5.2 light pass. Enable explicitly with ?lighting=1.
// Time is the unpadded body timeline. Every transient comes from measured audio.
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const mix=(a,b,u)=>a+(b-a)*u;
const smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
const canvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
// [start, end, id, bloom, rim, room, motion, warmth]. These cover every shot.
export const LIGHT_SECTIONS=[
 [0,15.033333333,'boot',.58,.28,.58,.30,.36],
 [15.033333333,29.333333333,'conversation',.32,.26,.32,.08,.30],
 [29.333333333,44.566666667,'geometry',.48,.46,.44,.30,.31],
 [44.566666667,59.333333333,'approach',.64,.57,.54,.42,.37],
 [59.333333333,74.1,'chorus-one',.92,.82,.79,.75,.43],
 [74.1,88.883333333,'play',.62,.53,.48,.32,.40],
 [88.883333333,103.65,'parameter-trance',.65,.57,.52,.42,.36],
 [103.65,110.8,'resonance',.91,.70,.67,.55,.52],
 [110.8,125.566666667,'waiting',.20,.15,.19,0,.24],
 [125.566666667,147.266666667,'pressure',.72,.61,.54,.58,.27],
 [147.266666667,147.95,'breath',.10,.08,.12,0,.22],
 [147.95,161.5,'execution',.89,.79,.68,.80,.38],
 [161.5,177.166666667,'climax',1,.94,.85,1,.47],
 [177.166666667,192.266666667,'network',.58,.40,.42,.28,.31],
 [192.266666667,205.733333333,'release',.26,.25,.24,.06,.36],
 [205.733333333,212.333333333,'reply',.51,.45,.51,0,.79],
 [212.333333333,218.333333334,'quiet-coda',.28,.30,.36,0,.88],
];
const profileAt=t=>{
 let i=LIGHT_SECTIONS.findIndex(r=>t>=r[0]&&t<r[1]);if(i<0)i=LIGHT_SECTIONS.length-1;
 const row=LIGHT_SECTIONS[i],v=row.slice(3),previous=LIGHT_SECTIONS[Math.max(0,i-1)];
 // Transitions settle over 0.32 s; waiting and silence do not inherit a beat.
 const u=smooth((t-row[0])/.32);
 return {id:row[2],bloom:mix(previous[3],v[0],u),rim:mix(previous[4],v[1],u),room:mix(previous[5],v[2],u),motion:v[3]===0?0:mix(previous[6],v[3],u),warmth:mix(previous[7],v[4],u)};
};

export class Lighting {
 constructor(stage,params){
  this.stage=stage;this.enabled=['1','on','true'].includes(params.get('lighting'));
  this.dynamics=params.get('dynamics')!=='0';this.events=[];this.audio=null;
  this.w=960;this.h=540;this.ratio=this.w/stage.width;
  this.base=canvas(this.w,this.h);this.mask=canvas(this.w,this.h);this.dark=canvas(this.w,this.h);
  this.bright=canvas(this.w,this.h);this.glow=canvas(this.w,this.h);this.room=canvas(this.w,this.h);
  this.bc=this.base.getContext('2d',{willReadFrequently:true});this.mc=this.mask.getContext('2d');this.dc=this.dark.getContext('2d');
  this.ec=this.bright.getContext('2d');this.gc=this.glow.getContext('2d');this.rc=this.room.getContext('2d');
  this.audit={enabled:this.enabled};this.p=profileAt(0);this.pulse=0;this.kick=0;
  this.trackClips(stage.getContext('2d'));
 }
 trackClips(ctx){
  // Scene split-screen, fold shutters and portrait windows must constrain the
  // light masks too. Mirror the current path without changing source drawing.
  this.clips=[];let saves=[],currentPath=new Path2D(),pathTransform=null,stable=true;
  const wrap=(name,fn)=>{const native=ctx[name].bind(ctx);ctx[name]=(...args)=>{fn(...args);return native(...args);};};
  const resetPath=()=>{currentPath=new Path2D();pathTransform=null;stable=true;};
  wrap('reset',()=>{this.clips=[];saves=[];resetPath();});
  wrap('save',()=>saves.push([...this.clips]));
  wrap('restore',()=>{if(saves.length)this.clips=saves.pop();});
  wrap('beginPath',resetPath);
  for(const method of ['rect','roundRect','moveTo','lineTo','arc','arcTo','ellipse','bezierCurveTo','quadraticCurveTo','closePath'])wrap(method,(...args)=>{
   const m=ctx.getTransform();if(pathTransform&&['a','b','c','d','e','f'].some(k=>m[k]!==pathTransform[k]))stable=false;
   pathTransform??=m;currentPath[method](...args);
  });
  wrap('clip',(path,rule)=>{
   if(path instanceof Path2D)this.clips.push({path:new Path2D(path),transform:ctx.getTransform(),rule:rule||'nonzero'});
   else if(pathTransform&&stable)this.clips.push({path:new Path2D(currentPath),transform:pathTransform,rule:path||'nonzero'});
   else if(this.enabled)throw Error('Lighting needs a stable-transform scene clip path');
  });
 }
 async load(){
  if(!this.enabled||!this.dynamics)return;
  const r=await fetch('/data/production-v52/audio-accents.json');
  if(!r.ok)throw Error('Measured audio accents are required for lighting preview');
  this.audio=await r.json();
  if(this.audio.schema_version!==1||!Array.isArray(this.audio.events))throw Error('Unknown measured-audio schema');
  this.events=this.audio.events;
  if(this.events.some((e,i)=>!Number.isFinite(e.time_body)||e.strength<0||e.strength>1||(i&&e.time_body<this.events[i-1].time_body)))throw Error('Invalid measured audio events');
 }
 begin(t,shot){
  if(!this.enabled){this.audit={enabled:false};return;}
  this.p=profileAt(t);this.pulse=0;this.kick=0;this.actorCount=0;this.active=[];
  for(const c of [this.mc,this.dc]){c.reset();c.clearRect(0,0,this.w,this.h);}
  const audioSection=this.audio?.sections?.find(s=>t>=s.start_body&&t<s.end_body);
  const quiet=this.audio?.quiet_intervals?.some(s=>t>=s.start_body&&t<s.end_body)||audioSection?.mode==='quiet';
  const audioGain=quiet?0:clamp(audioSection?.suggested_gain??1);
  this.p.motion*=audioGain;
  const allow=this.dynamics&&this.p.motion>0;
  if(allow)for(const event of this.events){
   const dt=t-event.time_body;if(dt<0)break;if(dt>.28)continue;
   // No grid, periodic sin(t), or fabricated beats. Smooth, short event envelope.
   const attack=smooth(dt/.022),decay=Math.exp(-Math.max(0,dt-.022)/.075),env=attack*decay*event.strength;
   this.pulse=Math.max(this.pulse,env);
   if(event.accent==='strong'&&event.confidence==='high'&&['kick','combined'].includes(event.type))this.kick=Math.max(this.kick,env);
   if(env>.005)this.active.push(event.id);
  }
  const amount=this.p.motion*this.kick;
  this.zoom=1+.007*amount;this.shift=[.9*amount,-1.25*amount];
  this.audit={enabled:true,section:this.p.id,profile:{...this.p},audioGain,quiet:Boolean(quiet),events:this.active,pulse:this.pulse,strongKick:this.kick,zoom:this.zoom,shift:this.shift,source:'measured current-master frequency-band onset candidates; not isolated drums',subtitlePass:'after lighting; excluded below y=933',darkCharacterMask:true,chromaticAberration:false};
 }
 camera(ctx){
  if(!this.enabled)return;
  // The exact same matrix moves actors, hand anchors and signal curves together.
  ctx.beginPath();ctx.rect(0,0,1920,933);ctx.clip();
  ctx.translate(960+this.shift[0],466+this.shift[1]);ctx.scale(this.zoom,this.zoom);ctx.translate(-960,-466);
 }
 artwork(ctx,a,{portrait=false,clip=null}={}){
  if(!this.enabled)return;
  this.actorCount++;
  const m=ctx.getTransform(),scale=Math.max(.001,Math.hypot(m.a,m.b)/(this.stage.width/1920));
  // Add a fine external rim under the untouched three-ink source rendering.
  // Filling the original silhouette afterwards covers every internal stroke.
  if(!portrait){
   ctx.save();ctx.globalAlpha*=.30+.23*this.p.rim;
   const b=a.bounds,g=ctx.createLinearGradient(b.x,b.y,b.x+b.w,b.y+b.h*.6);
   g.addColorStop(0,'#edc087');g.addColorStop(.38,'#d2b0fa');g.addColorStop(1,'#b88ce8');
   ctx.strokeStyle=g;ctx.lineWidth=(.9+1.5*this.p.rim)/scale;
   ctx.shadowColor=this.p.warmth>.6?'#dcae68':'#b88ce8';ctx.shadowBlur=(5+7*this.p.rim)*(this.stage.width/1920);
   ctx.stroke(a.paths[0]);ctx.restore();
  }
  for(const [c,path] of [[this.mc,a.paths[0]],[this.dc,a.dark]]){
   c.save();
   for(const clip of this.clips){const q=clip.transform;c.setTransform(q.a*this.ratio,q.b*this.ratio,q.c*this.ratio,q.d*this.ratio,q.e*this.ratio,q.f*this.ratio);c.clip(clip.path,clip.rule);}
   // Canvas clips are not exposed by getTransform. Explicit portrait/cover bounds
   // keep the post-pass mask from creating an invisible actor outside its window.
   if(clip){const q=clip.transform;c.setTransform(q.a*this.ratio,q.b*this.ratio,q.c*this.ratio,q.d*this.ratio,q.e*this.ratio,q.f*this.ratio);c.beginPath();c.rect(...clip.rect);c.clip();}
   c.setTransform(m.a*this.ratio,m.b*this.ratio,m.c*this.ratio,m.d*this.ratio,m.e*this.ratio,m.f*this.ratio);
   c.globalAlpha=ctx.globalAlpha;c.fillStyle='#fff';c.fill(path,'evenodd');c.restore();
  }
 }
 apply(ctx){
  if(!this.enabled)return;
  const p=this.p,pulse=this.pulse*p.motion;
  this.bc.reset();this.bc.drawImage(this.stage,0,0,this.w,this.h);
  const image=this.bc.getImageData(0,0,this.w,this.h),rgba=image.data;
  let extracted=0;
  // Only saturated gold/purple/cyan highlights enter bloom. Cream text does not.
  // Thresholding happens on a quarter-resolution 4K sample, never on source art.
  for(let i=0;i<rgba.length;i+=4){
   const hi=Math.max(rgba[i],rgba[i+1],rgba[i+2]),lo=Math.min(rgba[i],rgba[i+1],rgba[i+2]),sat=hi?(hi-lo)/hi:0;
   const a=smooth((hi-108)/100)*smooth((sat-.18)/.22);
   rgba[i+3]=Math.round(a*255);if(a>.1)extracted++;
  }
  this.ec.reset();this.ec.putImageData(image,0,0);
  // The post pass is clipped above the subtitle band in physical output pixels.
  this.gc.reset();this.gc.clearRect(0,0,this.w,this.h);
  for(const [radius,gain] of [[3.4,.42],[13,.48],[29,.24]]){
   this.gc.save();this.gc.filter=`blur(${radius}px)`;this.gc.globalAlpha=gain*(p.bloom+.23*pulse);this.gc.drawImage(this.bright,0,0);this.gc.restore();
  }
  // Keep the flat source inks vivid; most added luminance belongs outside the
  // silhouette. The deep-ink face is excluded completely from the soft bloom.
  this.gc.globalCompositeOperation='destination-out';this.gc.globalAlpha=.52;this.gc.drawImage(this.mask,0,0);this.gc.globalAlpha=1;this.gc.drawImage(this.dark,0,0);
  this.gc.globalCompositeOperation='source-over';
  // Broad separated light pools add room depth. Actors are cut out of this pass.
  this.rc.reset();this.rc.clearRect(0,0,this.w,this.h);
  const pool=(x,y,r,color,alpha)=>{const g=this.rc.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color+Math.round(alpha*255).toString(16).padStart(2,'0'));g.addColorStop(1,color+'00');this.rc.fillStyle=g;this.rc.fillRect(0,0,this.w,467);};
  pool(690,175,375,'#bd8ff0',(.11+.06*pulse)*p.room*(1-.35*p.warmth));
  pool(250,305,360,'#edc087',(.09+.05*pulse)*p.room*(.45+p.warmth));
  this.rc.globalCompositeOperation='destination-out';this.rc.drawImage(this.mask,0,0);this.rc.globalCompositeOperation='source-over';
  ctx.save();ctx.setTransform(this.stage.width/1920,0,0,this.stage.height/1080,0,0);ctx.beginPath();ctx.rect(0,0,1920,933);ctx.clip();
  ctx.globalCompositeOperation='screen';ctx.drawImage(this.room,0,0,1920,1080);ctx.drawImage(this.glow,0,0,1920,1080);
  // A very small highlight pulse follows measured transients, with no white flash.
  if(pulse>.01){ctx.globalAlpha=.09*pulse;ctx.drawImage(this.bright,0,0,1920,1080);ctx.globalAlpha=1;}
  ctx.globalCompositeOperation='source-over';
  const shade=ctx.createRadialGradient(960,430,420,960,430,1140);shade.addColorStop(0,'#100b1800');shade.addColorStop(1,'#100b1829');ctx.fillStyle=shade;ctx.fillRect(0,0,1920,933);
  ctx.restore();
  this.audit.actorCount=this.actorCount;this.audit.bloomPixels=extracted;this.audit.bloomFraction=extracted/(this.w*this.h);
 }
}
