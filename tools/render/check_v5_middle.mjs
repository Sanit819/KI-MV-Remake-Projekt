/** Actual v5 renderer: every R46/R48 frame plus visual PNG probes.
 * node tools/render/check_v5_middle.mjs [--out exports/qa-v5-middle-continuous]
 * This establishes stage timing and monotone alpha-weighted mosaic coverage.
 * It does not establish full-video playback, audio or aesthetic approval.
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright-core';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const args=process.argv.slice(2),i=args.indexOf('--out');
const out=path.resolve(root,i<0?'exports/qa-v5-middle-continuous':args[i+1]);
if(!out.startsWith(root+path.sep))throw Error('Output must remain in this repository.');
fs.mkdirSync(out,{recursive:true});
const sourcePaths=[...fs.readdirSync(path.join(root,'src/mv5')).filter(p=>/\.(js|html|css)$/.test(p)).map(p=>'src/mv5/'+p),'assets/astra/v09/manifest.json','assets/astra/v08/mid-wait.png','assets/astra/v08/mid-receive.png','data/production-v5/timeline.json','data/production-v5/lyrics.en-zh.json'];
const hashes=()=>Object.fromEntries(sourcePaths.map(p=>[p,createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex')]));
const before=hashes();
const reportFile=path.join(root,'docs/validation/astra-v5-middle-continuous.json');
fs.mkdirSync(path.dirname(reportFile),{recursive:true});
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
 const page=await browser.newPage(),errors=[];page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.address().port}/src/mv5/index.html?w=3840&h=2160`);await page.evaluate(()=>window.sample.ready);
 const report=await page.evaluate(()=>{
  const s=window.sample,frames={R46:[],R48:[]};
  for(const id of Object.keys(frames)){const shot=s.timeline.shots.find(x=>x.id===id);for(let f=shot.start_frame;f<shot.end_frame;f++){s.renderFrame(f/60);frames[id].push({frame:f,time:f/60,shot:s.currentShot,...s.sceneAudit});}}
  return{frames,width:s.canvas.width,height:s.canvas.height,renderer:s.renderer};
 });
 const stages={};for(const r of report.frames.R46)stages[r.waitStage]=(stages[r.waitStage]||0)+1;
 const m=report.frames.R48;
 report.stage_frame_counts=stages;report.errors=errors;report.hashes=before;
 report.checks={five_stages_in_requested_order:JSON.stringify(Object.keys(stages))===JSON.stringify(['1 second','1 hour','1 day','1 week','1 month']),each_stage_at_least_30_frames:Object.values(stages).every(n=>n>=30),all_shots_correct:report.frames.R46.every(r=>r.shot==='R46')&&m.every(r=>r.shot==='R48'),mosaic_starts_zero:m[0].mosaicCoverage===0,mosaic_finishes_one:m.at(-1).mosaicCoverage===1&&m.at(-1).mosaicFull,mosaic_alpha_monotone:m.every((r,i)=>!i||r.mosaicCoverage>=m[i-1].mosaicCoverage),mosaic_tiles_monotone:m.every((r,i)=>!i||r.mosaicSelectedTiles>=m[i-1].mosaicSelectedTiles),mosaic_actual_source_alpha:m.every(r=>r.mosaicUsesSourceAlpha&&r.mosaicSourceAlpha>0),no_page_errors:errors.length===0};
 report.visual_probes=[];
 for(const t of [97.1,104.8,106.7,113.8,114.95,115.45,115.98,116.48,116.99,118.5,119.15,120,121.6,122.2,123.3,143.8]){
  const data=await page.evaluate(t=>{const s=window.sample;s.renderFrame(t);return{png:s.canvas.toDataURL('image/png').split(',')[1],shot:s.currentShot,scene:s.sceneAudit,art:s.artAudit,subtitles:s.subtitleAudit};},t);
  const name='source-'+t.toFixed(3).padStart(7,'0')+'.png';fs.writeFileSync(path.join(out,name),Buffer.from(data.png,'base64'));delete data.png;report.visual_probes.push({time:t,file:name,...data});
 }
 report.checks.no_legacy_hand_in_revised_probes=report.visual_probes.every(r=>r.art.every(a=>a.name!=='hand'));
 report.checks.inputs_unchanged_during_check=JSON.stringify(before)===JSON.stringify(hashes());
 report.passed=Object.values(report.checks).every(Boolean);report.checked_at=new Date().toISOString();report.scope='Real main.js + Art at all 153 R46 and 194 R48 frames. Additional PNG probes must be viewed separately. Not audio/full-video/encoder verification.';
 fs.writeFileSync(path.join(out,'middle-runtime.json'),JSON.stringify(report,null,2)+'\n');
 fs.writeFileSync(reportFile,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({passed:report.passed,stage_frame_counts:stages,mosaic_frames:m.length,checks:report.checks,report:reportFile},null,2));if(!report.passed)process.exitCode=1;
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
