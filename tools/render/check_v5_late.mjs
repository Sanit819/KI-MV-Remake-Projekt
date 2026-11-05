/** Targeted real-renderer checks for volume cells and the two connected pens.
 * This is not full-film/audio validation. Native 4K visual probes are separate.
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright-core';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const tracked=['src/mv5/late.js','src/mv5/spatial-neural.js','assets/astra/v09/manifest.json','assets/astra/v09/late-assets.json'];
const hashes=()=>Object.fromEntries(tracked.map(p=>[p,createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex')]));
const before=hashes(),mime={'.js':'text/javascript','.json':'application/json','.png':'image/png','.html':'text/html','.svg':'image/svg+xml','.m4a':'audio/mp4','.jpg':'image/jpeg','.css':'text/css'};
const server=http.createServer((req,res)=>{
 const p=decodeURIComponent(new URL(req.url,'http://localhost').pathname),file=path.resolve(root,'.'+p);
 if(p==='/favicon.ico'){res.writeHead(204);res.end();return;}
 if(req.method!=='GET'||!file.startsWith(root+path.sep)||!['/src/','/assets/','/data/','/media/'].some(x=>p.startsWith(x))||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
 res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.setHeader('Cache-Control','no-store');fs.createReadStream(file).pipe(res);
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
 browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--ignore-gpu-blocklist','--use-angle=d3d11']});
 const page=await browser.newPage(),errors=[];page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.address().port}/src/mv5/index.html?w=3840&h=2160`);await page.evaluate(()=>window.sample.ready);
 const report=await page.evaluate(()=>{
  const s=window.sample,cages=[],waiting=[],drawing=[],snap=t=>{s.renderFrame(t);return{t,shot:s.currentShot,scene:s.sceneAudit,art:s.artAudit};};
  for(let n=64;n<=69;n++){const q=s.timeline.shots.find(x=>x.id===`R${n}`);for(const u of [0,.45,.98])cages.push({...snap(q.start_s+(q.end_s-q.start_s)*u),u});}
  const q=s.timeline.shots.find(x=>x.id==='R85');for(const u of [.05,.15,.3,.45,.55,.75])waiting.push({...snap(q.start_s+(q.end_s-q.start_s)*u),u});
  const duration=(13100/60-211)/8;for(let i=0;i<8;i++)for(const u of [.2,.8])drawing.push({...snap(211+(i+u)*duration),step:i,u});
  return{width:s.canvas.width,height:s.canvas.height,cages,waiting,drawing};
 });
 const eq=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1])<1e-7;
 const endCages=report.cages.filter(x=>x.u===.98).map(x=>x.scene.imprisonment);
 const violet=report.drawing.filter(x=>x.step%2===0),gold=report.drawing.filter(x=>x.step%2===1),shoulder=report.drawing[0].scene.seatedShoulder;
 report.checks={native_4k:report.width===3840&&report.height===2160,no_page_errors:errors.length===0,
  six_unique_guests:new Set(endCages.map(x=>x.guest)).size===6,six_door_directions:new Set(endCages.map(x=>x.doorDirection)).size===6,
  cells_start_open:report.cages.filter(x=>x.u===0).every(x=>x.scene.imprisonment.closureProgress===0),cells_finish_locked:endCages.every(x=>x.closureProgress===1&&x.lockProgress===1),
  true_depth_and_front_occlusion:endCages.every(x=>x.cellDepth>0&&x.sideWalls===2&&x.backWall&&x.floor&&x.frontDrawnAfterGuest&&x.foregroundBars>=7&&x.frontOcclusion>0),
  r85_source_nib_on_mark:report.waiting.filter(x=>x.scene.writingDetail).every(x=>eq(x.scene.violetPen,x.scene.violetContact)),
  coda_source_nib_on_mark:violet.every(x=>eq(x.scene.violetPen,x.scene.violetContact)),
  coda_seated_shoulder_fixed:report.drawing.every(x=>eq(x.scene.seatedShoulder,shoulder)),
  coda_pen_lifted_for_other_author:gold.every(x=>x.scene.penPausesForOtherAuthor&&!eq(x.scene.violetPen,x.scene.violetContact)),
  coda_grows_bridge:report.drawing.at(-1).scene.bridgeFraction>.98&&report.drawing.at(-1).scene.terrainCount===3,
  coda_uses_new_a14_actions:report.drawing.every(x=>x.art.filter(a=>a.actionGroup).every(a=>a.name.startsWith('A14_'))),
  inputs_unchanged_during_check:JSON.stringify(before)===JSON.stringify(hashes())};
 report.hashes=before;report.errors=errors;report.passed=Object.values(report.checks).every(Boolean);report.checked_at=new Date().toISOString();report.scope='40 selected real renderer instants at 3840x2160. Verifies scene geometry metadata and actual source mapped pen contacts. Native PNG probes separately inspected. Front occlusion is analytic bar coverage, not measured pixels. Not full-frame continuity, audio or final export validation.';
 const out=path.join(root,'docs/validation/astra-v5-late-runtime.json');fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({passed:report.passed,checks:report.checks,report:out},null,2));if(!report.passed)process.exitCode=1;
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
