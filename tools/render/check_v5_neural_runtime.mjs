/** Check the production v5 canvas, not a separate network mock.
 * node tools/render/check_v5_neural_runtime.mjs
 * Verifies six shots at seven frame-aligned progress points, their numerical
 * audit data, and SHA-256 equality of raw RGBA after an intervening seek.
 * This supplements check_neural_v5.mjs; it is not a complete MV visual review.
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright-core';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const resetContext=process.argv.includes('--reset-context');
const reportFile=path.join(root,resetContext?'docs/validation/astra-v5-neural-runtime-reset-experiment.json':'docs/validation/astra-v5-neural-runtime.json');
const diagnosticDir=path.join(root,resetContext?'exports/qa-v5-neural-runtime-reset-experiment':'exports/qa-v5-neural-runtime');
const sourcePaths=[...fs.readdirSync(path.join(root,'src/mv5')).filter(p=>/\.(js|html|css)$/.test(p)).map(p=>'src/mv5/'+p),
 'data/production-v5/timeline.json','data/production-v5/lyrics.en-zh.json','assets/astra/v09/manifest.json'];
const hashes=()=>Object.fromEntries(sourcePaths.map(p=>[p,createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex')]));
const before=hashes(),expected={R03:'fc',R30:'cnn',R35:'rnn',R78:'fc',R79:'cnn',R80:'rnn'};
const report={checked_at:new Date().toISOString(),experimentalContextReset:resetContext,scope:'Real v5 canvas at 42 sampled frames; source numerics, audit and same-time raw RGBA determinism after intervening seeks. Not all-frame playback, audio, encoded output, trained networks, or actual GPT architecture.',hashes:before,expected,errors:[],samples:[]};
const mime={'.js':'text/javascript','.json':'application/json','.png':'image/png','.html':'text/html','.svg':'image/svg+xml','.m4a':'audio/mp4','.jpg':'image/jpeg','.css':'text/css'};
const server=http.createServer((req,res)=>{
 const p=decodeURIComponent(new URL(req.url,'http://localhost').pathname),file=path.resolve(root,'.'+p);
 if(p==='/favicon.ico'){res.writeHead(204);res.end();return;}
 if(req.method!=='GET'||!file.startsWith(root+path.sep)||!['/src/','/assets/','/data/','/media/'].some(x=>p.startsWith(x))||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
 res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.setHeader('Cache-Control','no-store');fs.createReadStream(file).pipe(res);
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
let browser;
try{
 browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--ignore-gpu-blocklist','--use-angle=d3d11']});
 const page=await browser.newPage({viewport:{width:3840,height:2160}});page.setDefaultTimeout(60000);page.on('pageerror',e=>report.errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.address().port}/src/mv5/index.html?w=3840&h=2160`);await page.evaluate(()=>window.sample.ready);
 if(resetContext)await page.evaluate(()=>{const s=window.sample,original=s.renderFrame;s.renderFrame=t=>{s.canvas.getContext('2d').reset();return original(t);};});
 report.renderer=await page.evaluate(()=>window.sample.renderer);
 report.canvas=await page.evaluate(()=>[window.sample.canvas.width,window.sample.canvas.height]);
 for(const [id,type] of Object.entries(expected)){
  const rows=await page.evaluate(async ({id,type})=>{
   const s=window.sample,shot=s.timeline.shots.find(x=>x.id===id),rows=[];
   const finite=(value)=>typeof value==='number'?Number.isFinite(value):Array.isArray(value)?value.every(finite):value&&typeof value==='object'?Object.values(value).every(finite):true;
   const digest=async()=>{const pixels=s.canvas.getContext('2d').getImageData(0,0,s.canvas.width,s.canvas.height).data;const bytes=await crypto.subtle.digest('SHA-256',pixels);return {pixels,sha256:Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('')};};
   const png=pixels=>{const c=document.createElement('canvas');c.width=s.canvas.width;c.height=s.canvas.height;c.getContext('2d').putImageData(new ImageData(pixels,c.width,c.height),0,0);return c.toDataURL('image/png').split(',')[1];};
   for(const fraction of [0,.10,.25,.50,.75,.90,1]){
    const frame=shot.start_frame+Math.floor((shot.end_frame-shot.start_frame-1)*fraction),time=frame/60;
    s.renderFrame(time);const scene=structuredClone(s.sceneAudit),neural=scene.neural??[],firstShot=s.currentShot;
    const first=await digest();
    // A different, non-neural shot tests state reset rather than consecutive capture.
    s.renderFrame(1);s.renderFrame(time);const second=await digest();
    let difference=null,comparisonImages=null;
    if(first.sha256!==second.sha256){
     let count=0,channels=0,maxDelta=0,totalDelta=0,minX=s.canvas.width,minY=s.canvas.height,maxX=-1,maxY=-1;const diff=new Uint8ClampedArray(first.pixels.length);
     for(let j=0;j<first.pixels.length;j+=4){let changed=false;for(let c=0;c<4;c++){const d=Math.abs(first.pixels[j+c]-second.pixels[j+c]);if(d){changed=true;channels++;totalDelta+=d;maxDelta=Math.max(maxDelta,d);}diff[j+c]=c===3?255:Math.min(255,d*24);}if(changed){count++;const index=j/4,x=index%s.canvas.width,y=Math.floor(index/s.canvas.width);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}}
     difference={pixels:count,channels,maxDelta,totalDelta,bounds:[minX,minY,maxX-minX+1,maxY-minY+1],displayAmplification:24};comparisonImages={first:png(first.pixels),repeated:png(second.pixels),difference:png(diff)};
    }
    const geometry=neural.every(n=>Array.isArray(n.bounds)&&n.bounds.length===4&&n.bounds.every(Number.isFinite)&&n.bounds[0]>=0&&n.bounds[1]>=0&&n.bounds[2]>0&&n.bounds[3]>0&&n.bounds[0]+n.bounds[2]<=1920&&n.bounds[1]+n.bounds[3]<=940);
    rows.push({shot:id,frame,time,requestedFraction:fraction,actualFraction:(time-shot.start_s)/(shot.end_s-shot.start_s),neural,scene,
     checks:{correctShot:firstShot===id&&s.currentShot===id,exactlyOneNetwork:neural.length===1,expectedType:neural.length===1&&neural[0].type===type,
      allNumericsFinite:finite(scene),legalProgress:neural.every(n=>typeof n.progress==='number'&&Number.isFinite(n.progress)&&n.progress>=0&&n.progress<=1),
      networkWithinPicture:geometry,pixelsIdentical:first.sha256===second.sha256,auditIdentical:JSON.stringify(scene)===JSON.stringify(s.sceneAudit)},pixels:{sha256:first.sha256,repeatedSha256:second.sha256,format:'RGBA8',width:s.canvas.width,height:s.canvas.height},difference,comparisonImages});
   }
   return rows;
  },{id,type});
  for(const row of rows){if(row.comparisonImages){fs.mkdirSync(diagnosticDir,{recursive:true});row.imageFiles={};for(const [part,png] of Object.entries(row.comparisonImages)){const file=path.join(diagnosticDir,`${id}-${row.frame}-${part}.png`);fs.writeFileSync(file,Buffer.from(png,'base64'));row.imageFiles[part]=path.relative(root,file).replaceAll('\\','/');}}delete row.comparisonImages;}
  report.samples.push(...rows);console.log(`${id} ${type}: ${rows.length} frame probes, raw RGBA comparison complete`);
 }
 const groups=Object.keys(expected).map(id=>report.samples.filter(s=>s.shot===id));
 report.checks={allSixShots:groups.every(rows=>rows.length===7),allRuntimeChecks:report.samples.every(row=>Object.values(row.checks).every(Boolean)),
  progressMonotone:groups.every(rows=>rows.every((r,i)=>!i||r.neural[0].progress>=rows[i-1].neural[0].progress)),
  eachNetworkHasEarlyAndCompletedStates:groups.every(rows=>rows[0].neural[0].progress===0&&rows.at(-1).neural[0].progress===1),
  animationChangesPixels:groups.every(rows=>new Set(rows.map(r=>r.pixels.sha256)).size>1),
  positiveTeachingScope:report.samples.every(r=>r.neural.every(n=>n.scope==='computed educational toy model; not GPT architecture')),
  latePredictionsNotNewReplies:report.samples.filter(r=>['R78','R79','R80'].includes(r.shot)).every(r=>r.scene.predictedOutput===true&&r.scene.independentReply===false),
  rnnStatesAndSharedWeights:report.samples.filter(r=>r.neural[0].type==='rnn').every(r=>r.neural[0].sharedWeights&&r.neural[0].zeroInputRetainsState&&r.neural[0].steps.length===3),
  noPageErrors:report.errors.length===0,inputsUnchangedDuringCheck:JSON.stringify(before)===JSON.stringify(hashes())};
 report.passed=Object.values(report.checks).every(Boolean);
}catch(error){report.errors.push(error.stack||String(error));report.passed=false;}
finally{
 if(browser)await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));
 fs.mkdirSync(path.dirname(reportFile),{recursive:true});fs.writeFileSync(reportFile,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({passed:report.passed,samples:report.samples.length,checks:report.checks,errors:report.errors,report:reportFile},null,2));
 if(!report.passed)process.exitCode=1;
}
