// Native single-frame review stage: generated portrait + openwork SVG jewelry.
// The portrait PNG is never painted over or modified in place.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const dir=path.join(root,'assets/astra/v02');
const review=path.join(root,'exports/qa-v02');
fs.mkdirSync(review,{recursive:true});
const body='data:image/png;base64,'+fs.readFileSync(path.join(dir,'portrait-base.png')).toString('base64');
const mark='data:image/svg+xml;base64,'+fs.readFileSync(path.join(dir,'openai-openwork.svg')).toString('base64');
const layout={head:{x:858,y:477,width:116,rotation:-8},shoulder:{x:953,y:1130,width:65,rotation:-10}};
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
try{
  const page=await browser.newPage();
  await page.setContent('<!doctype html><canvas id="review"></canvas>');
  const result=await page.evaluate(async({body,mark,layout})=>{
    function load(src){return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=reject;im.src=src;});}
    const [portrait,jewel]=await Promise.all([load(body),load(mark)]);
    const canvas=document.getElementById('review');
    canvas.width=portrait.naturalWidth;canvas.height=portrait.naturalHeight;
    const ctx=canvas.getContext('2d');ctx.imageSmoothingQuality='high';
    function render(background){
      ctx.clearRect(0,0,canvas.width,canvas.height);
      if(background){ctx.fillStyle=background;ctx.fillRect(0,0,canvas.width,canvas.height);}
      ctx.drawImage(portrait,0,0);
      for(const p of Object.values(layout)){
        ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rotation*Math.PI/180);
        const h=p.width*jewel.naturalHeight/jewel.naturalWidth;
        ctx.drawImage(jewel,-p.width/2,-h/2,p.width,h);ctx.restore();
      }
      return canvas.toDataURL('image/png').split(',')[1];
    }
    const icon=document.createElement('canvas');icon.width=jewel.naturalWidth;icon.height=jewel.naturalHeight;
    icon.getContext('2d').drawImage(jewel,0,0);
    return{transparent:render(null),dark:render('#17151d'),icon:icon.toDataURL('image/png').split(',')[1],width:canvas.width,height:canvas.height};
  },{body,mark,layout});
  fs.writeFileSync(path.join(dir,'portrait-review.png'),Buffer.from(result.transparent,'base64'));
  fs.writeFileSync(path.join(review,'portrait-dark.png'),Buffer.from(result.dark,'base64'));
  fs.writeFileSync(path.join(dir,'openai-openwork.png'),Buffer.from(result.icon,'base64'));
  fs.writeFileSync(path.join(dir,'review-layout.json'),JSON.stringify({canvas:[result.width,result.height],layout,layer_order:['portrait-base.png','openai-openwork.svg'],note:'No circle or backing plate; the underlying hair and fabric remain visible through SVG negative spaces.'},null,2)+'\n');
  console.log(JSON.stringify({width:result.width,height:result.height,transparent:path.join(dir,'portrait-review.png'),dark:path.join(review,'portrait-dark.png')}));
}finally{await browser.close();}
