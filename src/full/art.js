import {outline,smoothPath} from './vendor/trace.js';

// Ornaments are already drawn in the source artwork. Never add logo overlays.
const COLORS=['#292135','#71558c','#aa8cc4'];
const GRAY=['#292135','#61596c','#aaa3b1'];
const image=src=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(Error('Missing art: '+src));im.src=src;});
const make=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
function coverage(src,w,h){
 const tmp=new Uint8Array(w*h),out=new Uint8Array(w*h);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x;tmp[i]=((x?src[i-1]:0)+2*src[i]+(x+1<w?src[i+1]:0))/4;}
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x;out[i]=((y?tmp[i-w]:0)+2*tmp[i]+(y+1<h?tmp[i+w]:0))/4;}
 return out;
}
export class Art {
 constructor(ctx){this.ctx=ctx;this.items={};}
 async load(){
  const manifest=await fetch('/assets/astra/final/manifest.json').then(r=>{if(!r.ok)throw Error('Final art manifest missing');return r.json();});
  if(manifest.status!=='active-v05-derived')throw Error('Final artwork has not been reviewed');
  for(const [name,entry] of Object.entries(manifest.assets)){
   if(entry.alias){if(!this.items[entry.alias])throw Error('Invalid alias '+name);this.items[name]={...this.items[entry.alias],...entry};continue;}
   const im=await image(entry.path),w=im.naturalWidth,h=im.naturalHeight;
   const raw=make(w,h),g=raw.getContext('2d',{willReadFrequently:true});g.drawImage(im,0,0);
   const p=g.getImageData(0,0,w,h).data,fields=[new Uint8Array(w*h),new Uint8Array(w*h),new Uint8Array(w*h)];
   for(let i=0;i<w*h;i++){
    const j=i*4,a=p[j+3];if(a<16)continue;
    const luminance=p[j]*.2126+p[j+1]*.7152+p[j+2]*.0722;
    fields[0][i]=a;
    fields[1][i]=a*Math.max(0,Math.min(1,(luminance-65)/16));
    fields[2][i]=a*Math.max(0,Math.min(1,(luminance-120)/18));
   }
   const paths=fields.map(f=>smoothPath(outline(coverage(f,w,h),w,h,{eps:.55,minArea:3}),new Path2D()));
   const paint=colors=>{const c=make(w,h),cx=c.getContext('2d');for(let i=0;i<3;i++){cx.fillStyle=colors[i];cx.fill(paths[i],'evenodd');}return c;};
   const canvas=paint(COLORS),gray=paint(GRAY),px=canvas.getContext('2d').getImageData(0,0,w,h).data;
   let l=w,r=0,top=h,b=0;
   for(let i=0;i<w*h;i++)if(px[i*4+3]>=128){const x=i%w,y=Math.floor(i/w);l=Math.min(l,x);r=Math.max(r,x);top=Math.min(top,y);b=Math.max(b,y);}
   this.items[name]={canvas,gray,w,h,bounds:{x:l,y:top,w:r-l+1,h:b-top+1},paths,...entry};
  }
  for(const name of ['stand','reach','protect','sit','sitSmile','surprise','sleep'])if(!this.items[name])throw Error('Pose not ready: '+name);
 }
 anchor(name,x,y,height,key='hands'){
  const a=this.items[name];if(!a)throw Error('Unknown pose '+name);
  const b=a.bounds,s=height/b.h,p=a.anchors?.[key];if(!p)throw Error('Missing '+key+' anchor for '+name);
  return [x+(p[0]-b.x-b.w/2)*s,y+(p[1]-b.y-b.h)*s];
 }
 draw(name,x,y,height,opts={}){
  const a=this.items[name];if(!a)throw Error('Unknown pose '+name);const c=this.ctx,b=a.bounds,s=height/b.h;
  c.save();c.globalAlpha*=opts.alpha??1;c.translate(x,y);c.rotate(opts.rotation||0);c.scale(s,s);c.translate(-b.x-b.w/2,-b.y-b.h);
  if((opts.reveal??1)<1){c.beginPath();c.rect(b.x,b.y,b.w,b.h*(opts.reveal??1));c.clip();}
  c.drawImage(opts.mode==='grey'?a.gray:a.canvas,0,0);c.restore();
 }
 portrait(name,x,y,w,h,opts={}){
  const a=this.items[name];if(!a)throw Error('Unknown portrait '+name);const f=a.face,c=this.ctx,s=Math.max(w/f.w,h/f.h);
  c.save();c.globalAlpha*=opts.alpha??1;c.beginPath();c.rect(x,y,w,h);c.clip();c.translate(x+w/2,y+h/2);c.scale(s,s);c.translate(-f.x-f.w/2,-f.y-f.h/2);
  for(let i=0;i<3;i++){c.fillStyle=(opts.mode==='grey'?GRAY:COLORS)[i];c.fill(a.paths[i],'evenodd');}c.restore();
 }
}
