// Review composition using the generated cutout and the existing native knot path.
// Keep the source PNG unchanged; all ornament holes show the underpainting.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const dir=path.join(root,'assets/astra/v04');
const qa=path.join(root,'exports/qa-v04');
fs.mkdirSync(qa,{recursive:true});
const body='data:image/png;base64,'+fs.readFileSync(path.join(dir,'standing-base.png')).toString('base64');
const svg=fs.readFileSync(path.join(dir,'openai-openwork.svg'),'utf8').replace('stroke-width="20"','stroke-width="12"');
fs.writeFileSync(path.join(dir,'openai-openwork.svg'),svg);
const mark='data:image/svg+xml;base64,'+Buffer.from(svg).toString('base64');
const layout={head:{x:600,y:211,width:80,rotation:-10},waist:{x:483,y:650,width:78,rotation:6}};
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
try {
 const page=await browser.newPage();
 await page.setContent('<!doctype html><canvas id="stage"></canvas>');
 const result=await page.evaluate(async({body,mark,layout})=>{
  const load=src=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=reject;im.src=src;});
  const [figure,jewel]=await Promise.all([load(body),load(mark)]);
  const pad=80;
  const stage=document.getElementById('stage');
  stage.width=figure.naturalWidth+pad*2;stage.height=figure.naturalHeight+pad*2;
  const ctx=stage.getContext('2d');ctx.imageSmoothingQuality='high';
  // Stage asset preparation: discard near-invisible residue and make the
  // originally opaque ink regions opaque. Preserve antialiasing at the edge.
  const prepared=document.createElement('canvas');
  prepared.width=figure.naturalWidth;prepared.height=figure.naturalHeight;
  const fctx=prepared.getContext('2d');fctx.drawImage(figure,0,0);
  const pixels=fctx.getImageData(0,0,prepared.width,prepared.height);
  let cleared=0,solidified=0;
  for(let i=0;i<pixels.data.length;i+=4){
   const a=pixels.data[i+3];
   if(a<16){if(a>0)cleared++;pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=pixels.data[i+3]=0;}
   else if(a>=240){if(a<255)solidified++;pixels.data[i+3]=255;}
  }
  fctx.putImageData(pixels,0,0);
  ctx.drawImage(prepared,pad,pad);
  for(const p of Object.values(layout)){
   ctx.save();ctx.translate(p.x+pad,p.y+pad);ctx.rotate(p.rotation*Math.PI/180);
   const h=p.width*jewel.naturalHeight/jewel.naturalWidth;
   ctx.drawImage(jewel,-p.width/2,-h/2,p.width,h);ctx.restore();
  }
  const png=c=>c.toDataURL('image/png').split(',')[1];
  const backgrounds=['#17151d','#f4efe5','checker'];
  const panel=document.createElement('canvas');panel.width=1500;panel.height=750;
  const pctx=panel.getContext('2d');
  const scale=Math.min(480/stage.width,710/stage.height);
  backgrounds.forEach((bg,i)=>{
   if(bg==='checker'){
    for(let y=0;y<750;y+=20)for(let x=0;x<500;x+=20){pctx.fillStyle=((x/20+y/20)%2===0)?'#b6b1ba':'#ded9e3';pctx.fillRect(i*500+x,y,20,20);}
   }else{pctx.fillStyle=bg;pctx.fillRect(i*500,0,500,750);}
   pctx.drawImage(stage,i*500+(500-stage.width*scale)/2,20,stage.width*scale,stage.height*scale);
  });
  const detail=document.createElement('canvas');detail.width=1100;detail.height=550;
  const dctx=detail.getContext('2d');dctx.fillStyle='#e9e3ee';dctx.fillRect(0,0,1100,550);
  dctx.imageSmoothingQuality='high';
  dctx.drawImage(stage,430+pad,90+pad,270,300,0,0,495,550);
  dctx.drawImage(stage,390+pad,560+pad,240,270,600,0,489,550);
  return {transparent:png(stage),backgrounds:png(panel),detail:png(detail),canvas:[stage.width,stage.height],pad,alpha_cleanup:{below16:'clear RGBA',atLeast240:'opaque',cleared,solidified}};
 },{body,mark,layout});
 fs.writeFileSync(path.join(dir,'standing-review.png'),Buffer.from(result.transparent,'base64'));
 fs.writeFileSync(path.join(qa,'backgrounds.png'),Buffer.from(result.backgrounds,'base64'));
 fs.writeFileSync(path.join(qa,'ornament-details.png'),Buffer.from(result.detail,'base64'));
 fs.writeFileSync(path.join(dir,'review-layout.json'),JSON.stringify({canvas:result.canvas,padding:result.pad,layout,alpha_cleanup:result.alpha_cleanup,layer_order:['standing-base.png','openai-openwork.svg'],note:'Native review stage. Original generated PNG remains unchanged; exact six-loop SVG has no outer circle, backing, or disk.'},null,2)+'\n');
 console.log(JSON.stringify({output:path.join(dir,'standing-review.png'),qa,canvas:result.canvas}));
} finally {await browser.close();}
