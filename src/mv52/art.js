import {outline,smoothPath} from '../full/vendor/trace.js';
const INKS=['#15101d','#614187','#b88ce8'],GREY=['#15101d','#51465f','#b3a6c1'];
const make=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
const loadImage=src=>new Promise((res,rej)=>{const im=new Image();im.onload=()=>res(im);im.onerror=()=>rej(Error('Missing artwork '+src));im.src=src});
const blur=(f,w,h)=>{const a=new Uint8Array(w*h),b=new Uint8Array(w*h);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x;a[i]=((x?f[i-1]:0)+2*f[i]+(x+1<w?f[i+1]:0))/4}for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x;b[i]=((y?a[i-w]:0)+2*a[i]+(y+1<h?a[i+w]:0))/4}return b};
export class Art {
 constructor(ctx){this.ctx=ctx;this.items={};this.audit=[];}
 async load(manifest=null){
  const man=manifest||await fetch('/assets/astra/v12-approved-cat/manifest.json').then(r=>{if(!r.ok)throw Error('v09 manifest missing');return r.json()});
  for(const [name,e] of Object.entries(man.assets)){
   const im=await loadImage(e.path), w=im.naturalWidth,h=im.naturalHeight;
   const raw=make(w,h),c=raw.getContext('2d',{willReadFrequently:true});c.drawImage(im,0,0);const rgba=c.getImageData(0,0,w,h).data,fields=[new Uint8Array(w*h),new Uint8Array(w*h),new Uint8Array(w*h)];
   let l=w,r=0,top=h,b=0;const levels=e.tonalThresholds||[65,16,125,22];
   for(let i=0;i<w*h;i++){const j=i*4,alpha=rgba[j+3];if(alpha<16)continue;const y=rgba[j]*.2126+rgba[j+1]*.7152+rgba[j+2]*.0722;fields[0][i]=alpha;fields[1][i]=alpha*Math.max(0,Math.min(1,(y-levels[0])/levels[1]));fields[2][i]=alpha*Math.max(0,Math.min(1,(y-levels[2])/levels[3]));if(alpha>=128){const xx=i%w,yy=Math.floor(i/w);l=Math.min(l,xx);r=Math.max(r,xx);top=Math.min(top,yy);b=Math.max(b,yy)}}
   const paths=fields.map(f=>smoothPath(outline(blur(f,w,h),w,h,{eps:.65,minArea:5}),new Path2D()));
   const paint=cols=>{const cv=make(w,h),cx=cv.getContext('2d');for(let n=0;n<3;n++){cx.fillStyle=cols[n];cx.fill(paths[n],'evenodd')}return cv};
   const dark=new Path2D();dark.addPath(paths[0]);dark.addPath(paths[1]);
   this.items[name]={...e,w,h,paths,dark,canvas:paint(INKS),gray:paint(GREY),bounds:e.bounds||{x:l,y:top,w:r-l+1,h:b-top+1}};
  }
  const svg=await fetch('/assets/astra/v07/interface-openai.svg').then(r=>r.text());const d=svg.match(/<path[^>]+d="([^"]+)"/)?.[1];if(!d)throw Error('UI knot path missing');this.logoPath=new Path2D(d);
  const cv=make(80,80),cx=cv.getContext('2d');cx.scale(80/513,80/509);cx.translate(-104,-105);cx.fill(this.logoPath);const px=cx.getImageData(0,0,80,80).data;this.logoDots=[];for(let y=0;y<80;y+=2)for(let x=0;x<80;x+=2)if(px[(y*80+x)*4+3]>90)this.logoDots.push([x/80,y/80]);
 }
 layout(name,x,y,w,h,mode='contain'){const a=this.items[name];if(!a)throw Error('Unknown artwork '+name);const b=a.bounds,s=(mode==='cover'?Math.max:Math.min)(w/b.w,h/b.h);return {a,b,s,tx:x+w/2-(b.x+b.w/2)*s,ty:y+h/2-(b.y+b.h/2)*s,x,y,w,h};}
 actionName(group,u,o={}){const entries=Object.entries(this.items).filter(([name,a])=>a.actionGroup===group).sort((a,b)=>a[1].phase-b[1].phase);if(!entries.length)throw Error('Missing action group '+group);let cuts=o.phases;if(cuts){cuts=[...cuts];if(cuts[0]===0)cuts.shift();if(cuts.at(-1)===1)cuts.pop();if(cuts.length!==entries.length-1||cuts.some((v,i)=>!Number.isFinite(v)||v<=0||v>=1||(i&&v<=cuts[i-1])))throw Error('Invalid phase thresholds for '+group);}else cuts=entries.slice(1).map((_,i)=>(i+1)/entries.length);const t=Math.max(0,Math.min(1,Number(u)||0)),index=cuts.filter(v=>t>=v).length;return entries[index][0];}
 actionLayout(group,u,x,y,w,h,o={}){const name=this.actionName(group,u,o);let rect={x,y,w,h};if(o.anchor&&o.target){const q=this.anchorRect(name,x,y,w,h,o.anchor),angle=o.rotation||0,cx=x+w/2,cy=y+h/2,dx=q[0]-cx,dy=q[1]-cy;const rotated=[cx+dx*Math.cos(angle)-dy*Math.sin(angle),cy+dx*Math.sin(angle)+dy*Math.cos(angle)];rect={x:x+o.target[0]-rotated[0],y:y+o.target[1]-rotated[1],w,h};}const anchors={};for(const key of Object.keys(this.items[name].anchors||{})){const q=this.anchorRect(name,rect.x,rect.y,w,h,key),angle=o.rotation||0,cx=rect.x+w/2,cy=rect.y+h/2,dx=q[0]-cx,dy=q[1]-cy;anchors[key]=[cx+dx*Math.cos(angle)-dy*Math.sin(angle),cy+dx*Math.sin(angle)+dy*Math.cos(angle)];}return {name,phase:this.items[name].phase,rect,anchors};}
 action(group,u,x,y,w,h,o={}){const out=this.actionLayout(group,u,x,y,w,h,o),r=out.rect;this.place(out.name,r.x,r.y,r.w,r.h,o);Object.assign(this.audit.at(-1),{actionGroup:group,phase:out.phase});return out;}
 actionAnchor(group,u,x,y,w,h,key='hands',o={}){const out=this.actionLayout(group,u,x,y,w,h,o);if(!out.anchors[key])throw Error('Missing action anchor '+out.name+'.'+key);return out.anchors[key];}
 place(name,x,y,w,h,o={}){const p=this.layout(name,x,y,w,h,o.mode),c=this.ctx;c.save();c.globalAlpha*=o.alpha??1;c.translate(x+w/2,y+h/2);c.rotate(o.rotation||0);c.translate(-x-w/2,-y-h/2);let lightClip=null;if(o.mode==='cover'){lightClip={rect:[x,y,w,h],transform:c.getTransform()};c.beginPath();c.rect(x,y,w,h);c.clip()}c.translate(p.tx,p.ty);c.scale(p.s,p.s);this.lighting?.artwork(c,p.a,{clip:lightClip});if(p.s>1.1){const cols=o.grey?GREY:INKS;for(let n=0;n<3;n++){c.fillStyle=cols[n];c.fill(p.a.paths[n],'evenodd')}}else c.drawImage(o.grey?p.a.gray:p.a.canvas,0,0);c.restore();this.audit.push({name,x,y,w,h});}
 anchorRect(name,x,y,w,h,key='hands'){const p=this.layout(name,x,y,w,h),q=p.a.anchors?.[key];if(!q)throw Error('Missing artwork anchor '+name+'.'+key);return [p.tx+q[0]*p.s,p.ty+q[1]*p.s];}
 withDarkMask(name,x,y,w,h,callback){const p=this.layout(name,x,y,w,h),c=this.ctx;c.save();c.translate(p.tx,p.ty);c.scale(p.s,p.s);c.clip(p.a.dark,'evenodd');c.scale(1/p.s,1/p.s);c.translate(-p.tx,-p.ty);callback();c.restore();}
 draw(name,x,y,height,o={}){const a=this.items[name],b=a.bounds,w=height*b.w/b.h;this.place(name,x-w/2,y-height,w,height,{...o,grey:o.mode==='grey'});}
 anchor(name,x,y,height,key='hands'){const a=this.items[name],b=a.bounds,w=height*b.w/b.h;return this.anchorRect(name,x-w/2,y-height,w,height,key);}
 portrait(name,x,y,w,h,o={}){const a=this.items[name],f=a.face||{x:a.bounds.x,y:a.bounds.y,w:a.bounds.w,h:a.bounds.h*.5},c=this.ctx,s=Math.max(w/f.w,h/f.h);c.save();c.globalAlpha*=o.alpha??1;const lightClip={rect:[x,y,w,h],transform:c.getTransform()};c.beginPath();c.rect(x,y,w,h);c.clip();c.translate(x+w/2,y+h/2);c.scale(s,s);c.translate(-f.x-f.w/2,-f.y-f.h/2);this.lighting?.artwork(c,a,{portrait:true,clip:lightClip});for(let n=0;n<3;n++){c.fillStyle=(o.mode==='grey'?GREY:INKS)[n];c.fill(a.paths[n],'evenodd')}c.restore();}
}
