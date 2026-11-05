import {outline,smoothPath} from '../full/vendor/trace.js';
const INKS=['#15101d','#614187','#b88ce8'],GREY=['#15101d','#51465f','#b3a6c1'];
const make=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
const loadImage=src=>new Promise((res,rej)=>{const im=new Image();im.onload=()=>res(im);im.onerror=()=>rej(Error('Missing artwork '+src));im.src=src});
const blur=(f,w,h)=>{const a=new Uint8Array(w*h),b=new Uint8Array(w*h);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x;a[i]=((x?f[i-1]:0)+2*f[i]+(x+1<w?f[i+1]:0))/4}for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x;b[i]=((y?a[i-w]:0)+2*a[i]+(y+1<h?a[i+w]:0))/4}return b};
export class Art {
 constructor(ctx){this.ctx=ctx;this.items={};this.audit=[];}
 async load(){
  const man=await fetch('/assets/astra/v08/manifest.json').then(r=>{if(!r.ok)throw Error('v08 manifest missing');return r.json()});
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
 place(name,x,y,w,h,o={}){const p=this.layout(name,x,y,w,h,o.mode),c=this.ctx;c.save();c.globalAlpha*=o.alpha??1;c.translate(x+w/2,y+h/2);c.rotate(o.rotation||0);c.translate(-x-w/2,-y-h/2);if(o.mode==='cover'){c.beginPath();c.rect(x,y,w,h);c.clip()}c.translate(p.tx,p.ty);c.scale(p.s,p.s);if(p.s>1.1){const cols=o.grey?GREY:INKS;for(let n=0;n<3;n++){c.fillStyle=cols[n];c.fill(p.a.paths[n],'evenodd')}}else c.drawImage(o.grey?p.a.gray:p.a.canvas,0,0);c.restore();this.audit.push({name,x,y,w,h});}
 anchorRect(name,x,y,w,h,key='hands'){const p=this.layout(name,x,y,w,h),q=p.a.anchors?.[key];if(!q)throw Error('Missing artwork anchor '+name+'.'+key);return [p.tx+q[0]*p.s,p.ty+q[1]*p.s];}
 withDarkMask(name,x,y,w,h,callback){const p=this.layout(name,x,y,w,h),c=this.ctx;c.save();c.translate(p.tx,p.ty);c.scale(p.s,p.s);c.clip(p.a.dark,'evenodd');c.scale(1/p.s,1/p.s);c.translate(-p.tx,-p.ty);callback();c.restore();}
 draw(name,x,y,height,o={}){const a=this.items[name],b=a.bounds,w=height*b.w/b.h;this.place(name,x-w/2,y-height,w,height,{...o,grey:o.mode==='grey'});}
 anchor(name,x,y,height,key='hands'){const a=this.items[name],b=a.bounds,w=height*b.w/b.h;return this.anchorRect(name,x-w/2,y-height,w,height,key);}
 portrait(name,x,y,w,h,o={}){const a=this.items[name],f=a.face||{x:a.bounds.x,y:a.bounds.y,w:a.bounds.w,h:a.bounds.h*.5},c=this.ctx,s=Math.max(w/f.w,h/f.h);c.save();c.globalAlpha*=o.alpha??1;c.beginPath();c.rect(x,y,w,h);c.clip();c.translate(x+w/2,y+h/2);c.scale(s,s);c.translate(-f.x-f.w/2,-f.y-f.h/2);for(let n=0;n<3;n++){c.fillStyle=(o.mode==='grey'?GREY:INKS)[n];c.fill(a.paths[n],'evenodd')}c.restore();}
}
